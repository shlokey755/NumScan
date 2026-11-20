// PDF helpers built on pdf-lib, which is pure JavaScript and runs offline.
// Nothing here reads files or touches the screen, so it can be tested in plain Node.
import { PDFDocument, PageSizes, StandardFonts, rgb } from 'pdf-lib';

const MARGIN = 56;
const FONT_SIZE = 12;
const LINE_HEIGHT = 17;

// "1-3, 5" -> one group of page indexes (0-based) per comma-separated part.
// Returns { groups } or { error } with a message to show the user.
export function parsePageRanges(text, pageCount) {
  const parts = (text ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return { error: 'Type page numbers, such as 1-3, 5.' };

  const groups = [];
  for (const part of parts) {
    const match = part.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) return { error: `"${part}" is not a page or range. Use numbers like 2 or 1-3.` };
    const from = Number(match[1]);
    const to = match[2] === undefined ? from : Number(match[2]);
    if (from < 1 || to < from) return { error: `"${part}" is not a valid range.` };
    if (to > pageCount) {
      return { error: `This PDF has ${pageCount} page${pageCount === 1 ? '' : 's'}.` };
    }
    const pages = [];
    for (let page = from; page <= to; page++) pages.push(page - 1);
    groups.push(pages);
  }
  return { groups };
}

// Joins PDFs in the order given. Returns the new PDF as bytes.
export async function mergePdfs(sources) {
  const out = await PDFDocument.create();
  for (const bytes of sources) {
    const src = await PDFDocument.load(bytes);
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((page) => out.addPage(page));
  }
  return out.save();
}

// Returns one PDF (as bytes) per group of page indexes.
export async function splitPdf(bytes, groups) {
  const src = await PDFDocument.load(bytes);
  const outputs = [];
  for (const pages of groups) {
    const out = await PDFDocument.create();
    const copied = await out.copyPages(src, pages);
    copied.forEach((page) => out.addPage(page));
    outputs.push(await out.save());
  }
  return outputs;
}

export async function countPages(bytes) {
  const doc = await PDFDocument.load(bytes);
  return doc.getPageCount();
}

// Helvetica only covers Latin characters. Tabs become spaces, and anything else
// it can't draw becomes "?", so the PDF never fails to build.
export function toPdfText(text) {
  return (text ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/\t/g, '    ')
    .replace(/[^\n\x20-\x7E\xA0-\xFF]/g, '?');
}

// Splits text into lines that fit maxWidth. `measure` returns a string's width.
// Words that are too long for one line are broken by character.
export function wrapText(text, measure, maxWidth) {
  const lines = [];
  for (const paragraph of text.split('\n')) {
    if (paragraph.trim() === '') {
      lines.push('');
      continue;
    }
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      let rest = word;
      while (measure(rest) > maxWidth) {
        let cut = 1;
        while (cut < rest.length && measure(rest.slice(0, cut + 1)) <= maxWidth) cut++;
        lines.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      line = rest;
    }
    lines.push(line);
  }
  return lines;
}

// A4 pages with plain text, wrapped and continued onto new pages as needed.
export async function createPdfFromText(text) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const maxWidth = PageSizes.A4[0] - MARGIN * 2;
  const measure = (s) => font.widthOfTextAtSize(s, FONT_SIZE);
  const lines = wrapText(toPdfText(text), measure, maxWidth);

  let page = null;
  let y = 0;
  for (const line of lines) {
    if (!page || y < MARGIN) {
      page = doc.addPage(PageSizes.A4);
      y = PageSizes.A4[1] - MARGIN;
    }
    if (line) {
      page.drawText(line, { x: MARGIN, y, size: FONT_SIZE, font, color: rgb(0, 0, 0) });
    }
    y -= LINE_HEIGHT;
  }
  if (!page) doc.addPage(PageSizes.A4); // empty text still gives one blank page
  return doc.save();
}

// One A4 page per image, scaled to fit inside the margins.
// Each item is { bytes: Uint8Array, kind: 'jpg' | 'png' }.
export async function createPdfFromImages(items) {
  const doc = await PDFDocument.create();
  const [pageWidth, pageHeight] = PageSizes.A4;
  for (const item of items) {
    const image = item.kind === 'png' ? await doc.embedPng(item.bytes) : await doc.embedJpg(item.bytes);
    const page = doc.addPage(PageSizes.A4);
    const scale = Math.min(
      (pageWidth - MARGIN * 2) / image.width,
      (pageHeight - MARGIN * 2) / image.height
    );
    const width = image.width * scale;
    const height = image.height * scale;
    page.drawImage(image, {
      x: (pageWidth - width) / 2,
      y: (pageHeight - height) / 2,
      width,
      height,
    });
  }
  return doc.save();
}
