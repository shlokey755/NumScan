// PDF helpers built on pdf-lib, which is pure JavaScript and runs offline.
// Nothing here reads files or touches the screen, so it can be tested in plain Node.
import { PDFDocument, PageSizes, StandardFonts, degrees, rgb } from 'pdf-lib';

const MARGIN = 56;
const FONT_SIZE = 12;
const LINE_HEIGHT = 17;
const GAP = 12;

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

// Keeps, drops, reorders and turns pages. `pages` gives the result in order:
// [{ index (0-based), rotation (0, 90, 180 or 270, added to the page's own), keep }].
// Entries with keep set to false are dropped. Fixes sideways scans and blank pages.
export async function editPages(bytes, pages) {
  const src = await PDFDocument.load(bytes);
  const count = src.getPageCount();
  const kept = pages.filter((p) => p.keep !== false);
  if (kept.length === 0) throw new Error('Keep at least one page.');
  for (const p of kept) {
    if (!Number.isInteger(p.index) || p.index < 0 || p.index >= count) {
      throw new Error('A page is out of range.');
    }
  }

  const out = await PDFDocument.create();
  const copied = await out.copyPages(
    src,
    kept.map((p) => p.index)
  );
  copied.forEach((page, i) => {
    const turn = (((kept[i].rotation ?? 0) % 360) + 360) % 360;
    if (turn) page.setRotation(degrees((page.getRotation().angle + turn) % 360));
    out.addPage(page);
  });
  return out.save();
}

// Pages per sheet for photos, as [columns, rows].
const LAYOUTS = { 1: [1, 1], 2: [1, 2], 4: [2, 2] };

// Puts 1, 2 or 4 photos on each A4 page. Photos keep their proportions and are
// centred in their cell. Optional header text and "Page N" numbers, with no watermark.
// Each item is { bytes: Uint8Array, kind: 'jpg' | 'png' }.
export async function createPdfFromImages(
  items,
  { perPage = 1, pageNumbers = false, header = '', margin = 36 } = {}
) {
  const layout = LAYOUTS[perPage];
  if (!layout) throw new Error('Choose 1, 2 or 4 photos per page.');
  if (items.length === 0) throw new Error('Add at least one photo.');
  const [columns, rows] = layout;

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const [pageWidth, pageHeight] = PageSizes.A4;
  const headerText = toPdfText(header).trim();
  const headerSpace = headerText ? 26 : 0;
  const footerSpace = pageNumbers ? 24 : 0;

  const images = [];
  for (const item of items) {
    images.push(item.kind === 'png' ? await doc.embedPng(item.bytes) : await doc.embedJpg(item.bytes));
  }

  const areaTop = pageHeight - margin - headerSpace;
  const areaBottom = margin + footerSpace;
  const cellWidth = (pageWidth - margin * 2 - GAP * (columns - 1)) / columns;
  const cellHeight = (areaTop - areaBottom - GAP * (rows - 1)) / rows;

  for (let start = 0; start < images.length; start += perPage) {
    const page = doc.addPage(PageSizes.A4);
    if (headerText) {
      page.drawText(headerText, {
        x: margin,
        y: pageHeight - margin - 12,
        size: 11,
        font,
        color: rgb(0, 0, 0),
      });
    }

    images.slice(start, start + perPage).forEach((image, i) => {
      const cellLeft = margin + (i % columns) * (cellWidth + GAP);
      const cellTop = areaTop - Math.floor(i / columns) * (cellHeight + GAP);
      const scale = Math.min(cellWidth / image.width, cellHeight / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      page.drawImage(image, {
        x: cellLeft + (cellWidth - width) / 2,
        y: cellTop - cellHeight + (cellHeight - height) / 2,
        width,
        height,
      });
    });

    if (pageNumbers) {
      const label = `Page ${start / perPage + 1}`;
      page.drawText(label, {
        x: pageWidth / 2 - font.widthOfTextAtSize(label, 10) / 2,
        y: margin / 2,
        size: 10,
        font,
        color: rgb(0.2, 0.2, 0.2),
      });
    }
  }
  return doc.save();
}

// Adds a faint diagonal stamp (such as DRAFT), a header line and a signature.
// `pages` is 'all' or 'last'. The signature goes bottom right on those pages.
// `signature` is { path, width, height }: an SVG path in a width x height box, with y
// going down, as the signature pad produces. It is drawn as ink strokes, not a filled shape.
export async function stampPdf(bytes, { stamp = '', header = '', signature = null, pages = 'all' } = {}) {
  const doc = await PDFDocument.load(bytes);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const all = doc.getPages();
  const targets = pages === 'last' ? [all[all.length - 1]] : all;
  const stampText = toPdfText(stamp).trim();
  const headerText = toPdfText(header).trim();

  for (const page of targets) {
    const { width, height } = page.getSize();

    if (stampText) {
      const size = 64;
      const angle = (35 * Math.PI) / 180;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const textWidth = bold.widthOfTextAtSize(stampText, size);
      const capHeight = size * 0.7;
      // Start the text so its centre lands on the page centre, after rotation.
      const x = width / 2 - (textWidth / 2) * cos + (capHeight / 2) * sin;
      const y = height / 2 - (textWidth / 2) * sin - (capHeight / 2) * cos;
      page.drawText(stampText, {
        x,
        y,
        size,
        font: bold,
        color: rgb(0.5, 0.5, 0.5),
        opacity: 0.25,
        rotate: degrees(35),
      });
    }

    if (headerText) {
      page.drawText(headerText, {
        x: 36,
        y: height - 28,
        size: 10,
        font: regular,
        color: rgb(0, 0, 0),
      });
    }

    if (signature?.path) {
      const target = Math.min(180, width * 0.3);
      const scale = target / signature.width;
      const signatureHeight = signature.height * scale;
      page.drawSvgPath(signature.path, {
        x: width - 36 - target,
        y: 36 + signatureHeight, // top edge of the signature box
        scale,
        borderColor: rgb(0.05, 0.05, 0.05),
        borderWidth: 1.6,
      });
    }
  }
  return doc.save();
}
