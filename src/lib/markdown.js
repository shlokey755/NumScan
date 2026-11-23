// PDF <-> Markdown. Pure JavaScript: runs on the phone, offline.
// PDF text comes from pdfText.js as positioned pieces (size, bold, mono). Markdown is
// rebuilt from line positions and font sizes, so headings, bullets, code and paragraphs
// come back. Markdown is drawn to A4 pages with pdf-lib.
import { PDFDocument, PageSizes, StandardFonts, rgb } from 'pdf-lib';
import { toPdfText, wrapText } from './pdf';
import { readPdfText } from './pdfText';

const MARGIN = 56;
const BODY_SIZE = 11;
const HEADING_SIZE = { 1: 20, 2: 16, 3: 13 };
const CODE_SIZE = 9.5;

// ---------- PDF -> Markdown ----------

// Font size for a run of text: the size that covers most of its characters.
function dominantSize(pieces) {
  const weight = new Map();
  for (const piece of pieces) {
    const key = Math.round((piece.size || 0) * 2) / 2;
    weight.set(key, (weight.get(key) || 0) + (piece.t || '').length);
  }
  let best = 0;
  let bestWeight = -1;
  for (const [size, chars] of weight) {
    if (chars > bestWeight) {
      best = size;
      bestWeight = chars;
    }
  }
  return best;
}

// Joins the pieces of one line left to right, adding a space where there is a real gap.
function finishLine(pieces) {
  const sorted = [...pieces].sort((a, b) => a.x - b.x);
  let text = '';
  let prev = null;
  for (const piece of sorted) {
    const t = piece.t ?? '';
    if (!t) continue;
    if (prev) {
      const prevEnd = prev.x1 ?? prev.x + prev.t.length * prev.size * 0.5;
      if (piece.x - prevEnd > prev.size * 0.15 && !text.endsWith(' ')) text += ' ';
    }
    text += t;
    prev = piece;
  }
  return {
    y: sorted[0]?.y ?? 0,
    text: text.replace(/\s+/g, ' ').trim(),
    size: dominantSize(sorted),
    mono: sorted.every((p) => p.mono),
    chars: text.trim().length,
  };
}

// Groups one page's pieces into lines, top to bottom.
function pageLines(pieces) {
  const sorted = [...pieces].sort((a, b) => b.y - a.y || a.x - b.x);
  const groups = [];
  for (const piece of sorted) {
    const last = groups[groups.length - 1];
    if (last && Math.abs(last.y - piece.y) < (piece.size || 10) * 0.5) {
      last.pieces.push(piece);
    } else {
      groups.push({ y: piece.y, pieces: [piece] });
    }
  }
  return groups.map((group) => finishLine(group.pieces)).filter((line) => line.text);
}

// The most common size across the document is the body text.
function bodySizeOf(lines) {
  const pieces = lines.map((line) => ({ size: line.size, t: 'x'.repeat(line.chars) }));
  return dominantSize(pieces) || BODY_SIZE;
}

const BULLET = /^[•·▪●◦\-–*]\s+/;
const NUMBERED = /^(\d{1,3})[.)]\s+/;

// Joins a paragraph's lines, repairing words split at a line end with a hyphen.
function joinParagraph(lines) {
  return lines.reduce((acc, line) => {
    if (acc.endsWith('-') && /^\p{Ll}/u.test(line)) return acc.slice(0, -1) + line;
    return `${acc} ${line}`;
  });
}

// Turns one page's lines into Markdown blocks.
function linesToBlocks(lines, body) {
  const blocks = [];
  let mode = null; // 'para' | 'list' | 'code'
  let buf = [];
  let prev = null;

  const close = () => {
    if (mode === 'para') blocks.push(joinParagraph(buf));
    if (mode === 'list') blocks.push(buf.join('\n'));
    if (mode === 'code') blocks.push(`\`\`\`\n${buf.join('\n')}\n\`\`\``);
    mode = null;
    buf = [];
  };

  // Monospace counts as code only in a run of two or more lines. One monospace
  // line (a styled header, say) is ordinary text.
  const inCodeRun = lines.map((line, i) => line.mono && (!!lines[i - 1]?.mono || !!lines[i + 1]?.mono));

  for (const [i, line] of lines.entries()) {
    const gap = prev ? prev.y - line.y : 0;
    const ratio = line.size / body;
    const text = line.text;
    const isCode = inCodeRun[i];

    if (!isCode && ratio >= 1.12 && text.length <= 140) {
      close();
      const level = ratio >= 1.7 ? 1 : ratio >= 1.35 ? 2 : 3;
      blocks.push(`${'#'.repeat(level)} ${text}`);
    } else if (isCode) {
      if (mode !== 'code' || gap > body * 1.8) {
        close();
        mode = 'code';
      }
      buf.push(line.text);
    } else if (BULLET.test(text) || NUMBERED.test(text)) {
      if (mode !== 'list') close();
      mode = 'list';
      buf.push(BULLET.test(text) ? `- ${text.replace(BULLET, '')}` : text);
    } else if (mode === 'list' && gap <= body * 1.8) {
      buf[buf.length - 1] += ` ${text}`;
    } else {
      if (mode !== 'para' || gap > body * 1.8) {
        close();
        mode = 'para';
      }
      buf.push(text);
    }
    prev = line;
  }
  close();
  return blocks;
}

// Converts the pieces from readPdfText (one entry per page) into Markdown.
// Pages are separated by a horizontal rule. Returns '' when there is no text.
export function piecesToMarkdown(pages) {
  const perPage = pages.map((page) => pageLines(page.pieces ?? []));
  const body = bodySizeOf(perPage.flat());
  return perPage
    .map((lines) => linesToBlocks(lines, body).join('\n\n'))
    .filter(Boolean)
    .join('\n\n---\n\n');
}

// Reads a PDF and returns its Markdown. A PDF with no text (for example a scan) gives hasText false.
export async function pdfToMarkdown(bytes) {
  const result = await readPdfText(bytes);
  const markdown = piecesToMarkdown(result.pages ?? []).trim();
  return {
    markdown,
    pageCount: result.pageCount ?? 0,
    failedPages: result.failedPages ?? 0,
    hasText: markdown.length > 0,
  };
}

// ---------- Markdown -> PDF ----------

// Removes the inline markers we do not draw (bold, code ticks, link targets).
function stripInline(text) {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

// Reads Markdown into blocks: headings, paragraphs, list items, code and rules.
export function parseMarkdown(source) {
  const blocks = [];
  let para = [];
  let code = null;

  const flushPara = () => {
    if (para.length) {
      blocks.push({ type: 'p', text: stripInline(para.join(' ')) });
      para = [];
    }
  };

  for (const raw of source.replace(/\r\n?/g, '\n').split('\n')) {
    if (code !== null) {
      if (/^\s*```/.test(raw)) {
        blocks.push({ type: 'code', lines: code });
        code = null;
      } else {
        code.push(raw);
      }
      continue;
    }
    if (/^\s*```/.test(raw)) {
      flushPara();
      code = [];
      continue;
    }
    const line = raw.replace(/\s+$/, '');
    if (!line.trim()) {
      flushPara();
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flushPara();
      blocks.push({ type: 'h', level: heading[1].length, text: stripInline(heading[2]) });
      continue;
    }
    const bullet = line.match(/^\s*[-*+•]\s+(.*)$/);
    if (bullet) {
      flushPara();
      blocks.push({ type: 'li', marker: '•', text: stripInline(bullet[1]) });
      continue;
    }
    const numbered = line.match(/^\s*(\d{1,3})[.)]\s+(.*)$/);
    if (numbered) {
      flushPara();
      blocks.push({ type: 'li', marker: `${numbered[1]}.`, text: stripInline(numbered[2]) });
      continue;
    }
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      flushPara();
      blocks.push({ type: 'hr' });
      continue;
    }
    para.push(line.trim());
  }
  if (code !== null) blocks.push({ type: 'code', lines: code });
  flushPara();
  return blocks;
}

// Splits one code line into pieces that fit the width, keeping its spaces.
function chunkCode(line, font, size, maxWidth) {
  const out = [];
  let current = '';
  for (const ch of toPdfText(line)) {
    if (current && font.widthOfTextAtSize(current + ch, size) > maxWidth) {
      out.push(current);
      current = ch;
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out;
}

// Draws Markdown as A4 pages: headings, paragraphs, lists, code and rules.
export async function markdownToPdf(source) {
  const blocks = parseMarkdown(source);
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const mono = await doc.embedFont(StandardFonts.Courier);
  const black = rgb(0, 0, 0);
  const [width, height] = PageSizes.A4;
  const maxWidth = width - MARGIN * 2;

  let page = null;
  let y = 0;
  const newPage = () => {
    page = doc.addPage(PageSizes.A4);
    y = height - MARGIN;
  };
  const room = (needed) => {
    if (!page || y - needed < MARGIN) newPage();
  };
  // Draws one wrapped line at the current height, moving down by its leading.
  const drawLine = (text, { font, size, x, lead = 1.4 }) => {
    room(size * lead);
    if (text) page.drawText(text, { x, y: y - size, size, font, color: black });
    y -= size * lead;
  };
  const wrap = (text, font, size, fit) =>
    wrapText(toPdfText(text), (s) => font.widthOfTextAtSize(s, size), fit);

  newPage();
  for (const block of blocks) {
    if (block.type === 'h') {
      const size = HEADING_SIZE[block.level] ?? HEADING_SIZE[3];
      y -= 6;
      for (const line of wrap(block.text, bold, size, maxWidth)) {
        drawLine(line, { font: bold, size, x: MARGIN });
      }
      y -= 4;
    } else if (block.type === 'p') {
      for (const line of wrap(block.text, regular, BODY_SIZE, maxWidth)) {
        drawLine(line, { font: regular, size: BODY_SIZE, x: MARGIN });
      }
      y -= 8;
    } else if (block.type === 'li') {
      const indent = 18;
      const lines = wrap(block.text, regular, BODY_SIZE, maxWidth - indent);
      lines.forEach((line, i) => {
        if (i === 0) {
          room(BODY_SIZE * 1.4);
          // The marker is drawn as-is: toPdfText would turn the bullet into '?'.
          page.drawText(block.marker, { x: MARGIN + 2, y: y - BODY_SIZE, size: BODY_SIZE, font: regular, color: black });
        }
        drawLine(line, { font: regular, size: BODY_SIZE, x: MARGIN + indent });
      });
      y -= 2;
    } else if (block.type === 'code') {
      for (const raw of block.lines) {
        for (const piece of chunkCode(raw, mono, CODE_SIZE, maxWidth - 12)) {
          drawLine(piece, { font: mono, size: CODE_SIZE, x: MARGIN + 6, lead: 1.35 });
        }
      }
      y -= 8;
    } else if (block.type === 'hr') {
      room(16);
      page.drawLine({ start: { x: MARGIN, y: y - 6 }, end: { x: width - MARGIN, y: y - 6 }, thickness: 0.8, color: black });
      y -= 16;
    }
  }
  if (!page) newPage();
  return doc.save();
}
