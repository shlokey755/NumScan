// Pure table helpers: parse pasted text, export CSV, and export a minimal XLSX.
// No React or Expo imports, so the module also runs under plain Node tests.
import { zipSync, strToU8 } from 'fflate';

const MAX_SHEET_NAME_LENGTH = 31;
// Excel keeps 15 significant digits; longer numbers would be silently rounded.
const MAX_NUMERIC_DIGITS = 15;
const NUMERIC_PATTERN = /^-?(0|[1-9]\d*)(\.\d+)?$/;
// Control characters that XML 1.0 cannot represent at all.
const INVALID_XML_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const NS_MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const NS_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const NS_PKG_REL = 'http://schemas.openxmlformats.org/package/2006/relationships';

const CONTENT_TYPES = `${XML_HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
  + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
  + '<Default Extension="xml" ContentType="application/xml"/>'
  + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
  + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
  + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
  + '</Types>';

const ROOT_RELS = `${XML_HEADER}<Relationships xmlns="${NS_PKG_REL}">`
  + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
  + '</Relationships>';

const WORKBOOK_RELS = `${XML_HEADER}<Relationships xmlns="${NS_PKG_REL}">`
  + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
  + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
  + '</Relationships>';

// Smallest styles part Excel accepts: one default font, fill, border and cell format.
const STYLES_XML = `${XML_HEADER}<styleSheet xmlns="${NS_MAIN}">`
  + '<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>'
  + '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'
  + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
  + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
  + '<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>'
  + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
  + '</styleSheet>';

export function parseTable(text) {
  const source = typeof text === 'string' ? text : '';
  if (source.trim() === '') return [];

  // One tab anywhere in the paste means the user copied from a spreadsheet.
  const separator = source.includes('\t') ? '\t' : ',';
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  // Quotes only open a quoted field at its very start, so "a"b stays literal.
  let fieldStart = true;

  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];

    if (inQuotes) {
      if (ch === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else if (ch === '\r' && source[i + 1] === '\n') {
        // Store line breaks inside quotes as \n so CRLF pastes match LF pastes.
        field += '\n';
        i += 1;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"' && fieldStart) {
      inQuotes = true;
      fieldStart = false;
    } else if (ch === separator) {
      row.push(field);
      field = '';
      fieldStart = true;
    } else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && source[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      fieldStart = true;
    } else {
      field += ch;
      fieldStart = false;
    }
  }

  // Keep the last line unless the text ended exactly on a line break.
  if (row.length > 0 || field !== '') {
    row.push(field);
    rows.push(row);
  }

  // Trailing blank lines are paste noise. Blank rows in the middle are data.
  while (rows.length > 0 && rows[rows.length - 1].every((cell) => cell.trim() === '')) {
    rows.pop();
  }

  const width = rows.reduce((max, r) => Math.max(max, r.length), 0);
  return rows.map((r) => (r.length === width ? r : r.concat(Array(width - r.length).fill(''))));
}

export function toCsv(rows) {
  if (!Array.isArray(rows)) return '';
  return rows
    .map((row) => (Array.isArray(row) ? row : []).map(csvField).join(','))
    .join('\n');
}

function csvField(value) {
  const text = value == null ? '' : String(value);
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

export function toXlsxBytes(rows, sheetName = 'Sheet1') {
  const name = cleanSheetName(sheetName);
  const files = {
    '[Content_Types].xml': CONTENT_TYPES,
    '_rels/.rels': ROOT_RELS,
    'xl/workbook.xml': buildWorkbookXml(name),
    'xl/_rels/workbook.xml.rels': WORKBOOK_RELS,
    'xl/styles.xml': STYLES_XML,
    'xl/worksheets/sheet1.xml': buildSheetXml(Array.isArray(rows) ? rows : []),
  };
  const encoded = {};
  for (const [path, xml] of Object.entries(files)) {
    encoded[path] = strToU8(xml);
  }
  return zipSync(encoded, { level: 6 });
}

function cleanSheetName(sheetName) {
  // Excel rejects these characters in sheet names. Clip before trimming so
  // the 31-character limit is applied to the final text.
  const stripped = String(sheetName ?? '').replace(/[[\]:*?\/\\]/g, '');
  const clipped = Array.from(stripped).slice(0, MAX_SHEET_NAME_LENGTH).join('');
  // Excel also rejects a leading or trailing apostrophe.
  const cleaned = clipped.trim().replace(/^'+|'+$/g, '');
  return cleaned || 'Sheet1';
}

function buildWorkbookXml(name) {
  return `${XML_HEADER}<workbook xmlns="${NS_MAIN}" xmlns:r="${NS_REL}">`
    + `<sheets><sheet name="${escapeXml(name)}" sheetId="1" r:id="rId1"/></sheets>`
    + '</workbook>';
}

function buildSheetXml(rows) {
  const body = rows
    .map((row, rowIndex) => {
      const rowNumber = rowIndex + 1;
      const cells = [];
      // forEach skips holes in sparse rows, which are empty cells anyway.
      (Array.isArray(row) ? row : []).forEach((value, colIndex) => {
        if (value == null) return;
        const text = String(value);
        if (text === '') return;
        const ref = `${columnLetters(colIndex)}${rowNumber}`;
        cells.push(isPlainNumber(text)
          ? `<c r="${ref}"><v>${text}</v></c>`
          : `<c r="${ref}" t="inlineStr"><is>${textElement(text)}</is></c>`);
      });
      return cells.length > 0
        ? `<row r="${rowNumber}">${cells.join('')}</row>`
        : `<row r="${rowNumber}"/>`;
    })
    .join('');
  return `${XML_HEADER}<worksheet xmlns="${NS_MAIN}" xmlns:r="${NS_REL}">`
    + `<sheetData>${body}</sheetData>`
    + '</worksheet>';
}

function isPlainNumber(text) {
  // Leading zeros (IDs, codes) and long digit runs stay text so they are not altered.
  if (!NUMERIC_PATTERN.test(text)) return false;
  const significant = text.replace(/[-.]/g, '').replace(/^0+/, '');
  return significant.length <= MAX_NUMERIC_DIGITS && Number.isFinite(Number(text));
}

function textElement(text) {
  // Without xml:space, Excel trims leading and trailing whitespace.
  const preserve = text !== text.trim() ? ' xml:space="preserve"' : '';
  return `<t${preserve}>${escapeXml(text)}</t>`;
}

function escapeXml(text) {
  return text
    .replace(INVALID_XML_CHARS, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    // XML parsers turn a raw carriage return into a newline, so keep it as a reference.
    .replace(/\r/g, '&#13;');
}

function columnLetters(index) {
  // Bijective base-26: A..Z, then AA, AB, ... (index 26 is AA).
  let n = index + 1;
  let letters = '';
  while (n > 0) {
    letters = String.fromCharCode(65 + ((n - 1) % 26)) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}
