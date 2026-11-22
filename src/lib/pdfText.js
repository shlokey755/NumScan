// Reads the text of a PDF on the phone. Pure JavaScript: no native code, no network.
//
// The file is parsed here rather than with pdf.js, because pdf.js reads text through
// a web worker, which Hermes does not provide, and its bundle is large. This reader
// finds the objects, decodes object streams and content streams, and follows fonts
// (ToUnicode maps, encodings and widths) to turn each text operator into positioned
// text. Forms are followed. A scanned page has no text operators, so it gives no text.
import { inflateSync, unzlibSync, Unzlib } from 'fflate';
import { PDFDocument, StandardFonts } from 'pdf-lib';

const MAX_DEPTH = 8;
const IDENTITY = [1, 0, 0, 1, 0, 0];

// ---------------------------------------------------------------- object model

class PdfName {
  constructor(name) {
    this.name = name;
  }
}

class PdfRef {
  constructor(num, gen) {
    this.num = num;
    this.gen = gen;
  }
}

// `bytes` is a string with one character per byte (latin-1).
class PdfString {
  constructor(bytes) {
    this.bytes = bytes;
  }
}

class PdfStream {
  constructor(dict, start, end) {
    this.dict = dict;
    this.start = start;
    this.end = end;
  }
}

const isDict = (v) =>
  v !== null &&
  typeof v === 'object' &&
  !Array.isArray(v) &&
  !(v instanceof PdfName) &&
  !(v instanceof PdfRef) &&
  !(v instanceof PdfString) &&
  !(v instanceof PdfStream);
const nameOf = (v) => (v instanceof PdfName ? v.name : undefined);
const numberOf = (v, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

// ---------------------------------------------------------------- bytes and text

function bytesToLatin1(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 4096) {
    out += String.fromCharCode.apply(null, bytes.subarray(i, i + 4096));
  }
  return out;
}

function latin1ToBytes(text, start, end) {
  const out = new Uint8Array(Math.max(0, end - start));
  for (let i = start; i < end; i++) out[i - start] = text.charCodeAt(i) & 255;
  return out;
}

// "41 4a" or "414a" -> the bytes as a latin-1 string.
function hexToLatin1(hex) {
  let clean = hex.replace(/[^0-9A-Fa-f]/g, '');
  if (clean.length % 2) clean += '0';
  let out = '';
  for (let i = 0; i < clean.length; i += 2) out += String.fromCharCode(parseInt(clean.slice(i, i + 2), 16));
  return out;
}

const decodeName = (s) =>
  s.indexOf('#') < 0 ? s : s.replace(/#([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));

// ---------------------------------------------------------------- lexer and objects

const NUMBER_RE = /^[+-]?(\d+\.?\d*|\.\d+)$/;
const ESCAPES = { 110: '\n', 114: '\r', 116: '\t', 98: '\b', 102: '\f' };

function isWs(c) {
  return c === 32 || c === 10 || c === 13 || c === 9 || c === 12 || c === 0;
}

function isDelim(c) {
  return c === 40 || c === 41 || c === 60 || c === 62 || c === 91 || c === 93 || c === 123 || c === 125 || c === 47 || c === 37;
}

class Lexer {
  constructor(src, pos = 0) {
    this.src = src;
    this.pos = pos;
  }

  skip() {
    const s = this.src;
    let p = this.pos;
    while (p < s.length) {
      const c = s.charCodeAt(p);
      if (isWs(c)) {
        p++;
      } else if (c === 37) {
        while (p < s.length && s.charCodeAt(p) !== 10 && s.charCodeAt(p) !== 13) p++;
      } else {
        break;
      }
    }
    this.pos = p;
  }

  // The next token: a number, PdfName, PdfString, or a keyword or delimiter as a string.
  // Returns undefined at the end of the text.
  next() {
    this.skip();
    const s = this.src;
    const n = s.length;
    const start = this.pos;
    if (start >= n) return undefined;
    const c = s.charCodeAt(start);
    if (c === 47) {
      let p = start + 1;
      while (p < n && !isWs(s.charCodeAt(p)) && !isDelim(s.charCodeAt(p))) p++;
      this.pos = p;
      return new PdfName(decodeName(s.slice(start + 1, p)));
    }
    if (c === 40) return this.readString();
    if (c === 60) {
      if (s.charCodeAt(start + 1) === 60) {
        this.pos = start + 2;
        return '<<';
      }
      const end = s.indexOf('>', start + 1);
      this.pos = end < 0 ? n : end + 1;
      return new PdfString(hexToLatin1(s.slice(start + 1, end < 0 ? n : end)));
    }
    if (c === 62) {
      if (s.charCodeAt(start + 1) === 62) {
        this.pos = start + 2;
        return '>>';
      }
      this.pos = start + 1;
      return '';
    }
    if (c === 91 || c === 93 || c === 123 || c === 125 || c === 41) {
      this.pos = start + 1;
      return s[start];
    }
    let p = start;
    while (p < n && !isWs(s.charCodeAt(p)) && !isDelim(s.charCodeAt(p))) p++;
    if (p === start) {
      this.pos = start + 1;
      return '';
    }
    this.pos = p;
    const word = s.slice(start, p);
    return NUMBER_RE.test(word) ? Number(word) : word;
  }

  readString() {
    const s = this.src;
    const n = s.length;
    let p = this.pos + 1;
    let depth = 1;
    let out = '';
    while (p < n) {
      const c = s.charCodeAt(p);
      if (c === 92) {
        p++;
        const e = s.charCodeAt(p);
        if (e >= 48 && e <= 55) {
          let v = 0;
          for (let k = 0; k < 3 && p < n && s.charCodeAt(p) >= 48 && s.charCodeAt(p) <= 55; k++) {
            v = v * 8 + (s.charCodeAt(p) - 48);
            p++;
          }
          out += String.fromCharCode(v & 255);
          continue;
        }
        if (e === 13) {
          p++;
          if (s.charCodeAt(p) === 10) p++;
          continue;
        }
        if (e === 10) {
          p++;
          continue;
        }
        out += ESCAPES[e] ?? s.charAt(p);
        p++;
        continue;
      }
      if (c === 40) {
        depth++;
      } else if (c === 41) {
        depth--;
        if (depth === 0) {
          this.pos = p + 1;
          return new PdfString(out);
        }
      }
      out += s[p];
      p++;
    }
    this.pos = n;
    return new PdfString(out);
  }
}

// Reads one object, given its first token. Arrays and dictionaries are read whole.
// Stops before a keyword that ends an object, so a broken object cannot run on.
function readObject(lex, tok) {
  if (typeof tok === 'number') {
    if (Number.isInteger(tok) && tok >= 0) {
      const save = lex.pos;
      const gen = lex.next();
      if (Number.isInteger(gen) && gen >= 0 && lex.next() === 'R') return new PdfRef(tok, gen);
      lex.pos = save;
    }
    return tok;
  }
  if (tok === '[') {
    const arr = [];
    for (;;) {
      const at = lex.pos;
      const t = lex.next();
      if (t === undefined || t === ']') return arr;
      if (t === 'endobj' || t === 'stream' || t === 'endstream') {
        lex.pos = at;
        return arr;
      }
      arr.push(readObject(lex, t));
    }
  }
  if (tok === '<<') {
    const dict = {};
    for (;;) {
      const at = lex.pos;
      const key = lex.next();
      if (key === undefined || key === '>>') return dict;
      if (key === 'endobj' || key === 'stream' || key === 'endstream') {
        lex.pos = at;
        return dict;
      }
      if (!(key instanceof PdfName)) continue;
      const at2 = lex.pos;
      const vt = lex.next();
      if (vt === undefined || vt === '>>') return dict;
      if (vt === 'endobj' || vt === 'stream' || vt === 'endstream') {
        lex.pos = at2;
        return dict;
      }
      dict[key.name] = readObject(lex, vt);
    }
  }
  if (tok === 'true') return true;
  if (tok === 'false') return false;
  if (tok === 'null') return null;
  return tok;
}

// ---------------------------------------------------------------- filters

function concatBytes(parts, total) {
  const out = new Uint8Array(total);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

// Inflates zlib data. A damaged stream keeps the part that did inflate.
function inflate(data) {
  try {
    return unzlibSync(data);
  } catch (error) {
    // Fall through to the partial and raw attempts.
  }
  const parts = [];
  let total = 0;
  try {
    const stream = new Unzlib((chunk) => {
      parts.push(chunk);
      total += chunk.length;
    });
    stream.push(data, true);
  } catch (error) {
    // Keep whatever came out before the damage.
  }
  if (total > 0) return concatBytes(parts, total);
  try {
    return inflateSync(data);
  } catch (error) {
    return null;
  }
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

// Undoes PNG-style predictors (10 to 15), which the xref and object streams can use.
function unpredict(data, params) {
  const predictor = params.Predictor ?? 1;
  if (!(predictor >= 10)) return data;
  const colors = params.Colors ?? 1;
  const bits = params.BitsPerComponent ?? 8;
  const columns = params.Columns ?? 1;
  const bpp = Math.max(1, Math.ceil((colors * bits) / 8));
  const rowLen = Math.ceil((columns * colors * bits) / 8);
  const rows = Math.floor(data.length / (rowLen + 1));
  const out = new Uint8Array(rows * rowLen);
  for (let r = 0; r < rows; r++) {
    const type = data[r * (rowLen + 1)];
    const src = r * (rowLen + 1) + 1;
    const dst = r * rowLen;
    for (let i = 0; i < rowLen; i++) {
      const x = data[src + i];
      const a = i >= bpp ? out[dst + i - bpp] : 0;
      const b = r > 0 ? out[dst - rowLen + i] : 0;
      const c = r > 0 && i >= bpp ? out[dst - rowLen + i - bpp] : 0;
      let v = x;
      if (type === 1) v = x + a;
      else if (type === 2) v = x + b;
      else if (type === 3) v = x + ((a + b) >> 1);
      else if (type === 4) v = x + paeth(a, b, c);
      out[dst + i] = v & 255;
    }
  }
  return out;
}

function asciiHex(data) {
  const hex = hexToLatin1(bytesToLatin1(data).split('>')[0]);
  return latin1ToBytes(hex, 0, hex.length);
}

function ascii85(data) {
  const text = bytesToLatin1(data).split('~>')[0];
  const out = [];
  let group = [];
  const flush = (count) => {
    while (group.length < 5) group.push(84);
    let value = 0;
    for (const d of group) value = value * 85 + d;
    const bytes = [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255];
    for (let i = 0; i < count - 1; i++) out.push(bytes[i]);
    group = [];
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    if (isWs(ch)) continue;
    if (ch === 122 && group.length === 0) {
      out.push(0, 0, 0, 0);
      continue;
    }
    if (ch < 33 || ch > 117) continue;
    group.push(ch - 33);
    if (group.length === 5) flush(5);
  }
  if (group.length > 1) flush(group.length);
  return Uint8Array.from(out);
}

// ---------------------------------------------------------------- CMaps

// Parses a ToUnicode CMap: code -> text, plus the code space ranges that say how many
// bytes one code has.
function parseCMap(text) {
  const map = new Map();
  const ranges = [];
  const tokens = text.match(/<[0-9A-Fa-f\s]*>|\[|\]|\/[^\s/[\]<>(){}]*|[A-Za-z_][A-Za-z0-9_.]*/g) ?? [];
  const isHex = (t) => typeof t === 'string' && t[0] === '<';
  const hexDigits = (t) => t.slice(1, -1).replace(/\s/g, '');
  const codeOf = (t) => (isHex(t) && hexDigits(t).length > 0 ? parseInt(hexDigits(t), 16) : null);
  const textOf = (t) => {
    if (!isHex(t)) return '';
    const hex = hexDigits(t);
    let out = '';
    if (hex.length % 4 === 0 && hex.length > 0) {
      for (let i = 0; i < hex.length; i += 4) out += String.fromCharCode(parseInt(hex.slice(i, i + 4), 16));
    } else {
      for (let i = 0; i + 1 < hex.length; i += 2) out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
    }
    return out;
  };
  const bump = (base, k) => (k === 0 || !base ? base : base.slice(0, -1) + String.fromCharCode(base.charCodeAt(base.length - 1) + k));

  for (let i = 0; i < tokens.length; ) {
    const t = tokens[i++];
    if (t === 'begincodespacerange') {
      while (i + 1 < tokens.length && tokens[i] !== 'endcodespacerange') {
        const lo = tokens[i];
        const hi = tokens[i + 1];
        i += 2;
        if (!isHex(lo) || !isHex(hi)) continue;
        const loBytes = hexToLatin1(hexDigits(lo));
        const hiBytes = hexToLatin1(hexDigits(hi));
        if (loBytes.length === 0 || loBytes.length !== hiBytes.length) continue;
        ranges.push({
          len: loBytes.length,
          lo: Array.from(loBytes, (ch) => ch.charCodeAt(0)),
          hi: Array.from(hiBytes, (ch) => ch.charCodeAt(0)),
        });
      }
    } else if (t === 'beginbfchar') {
      while (i + 1 < tokens.length && tokens[i] !== 'endbfchar') {
        const code = codeOf(tokens[i]);
        const dst = tokens[i + 1];
        i += 2;
        if (code !== null) map.set(code, textOf(dst));
      }
    } else if (t === 'beginbfrange') {
      while (i + 2 < tokens.length && tokens[i] !== 'endbfrange') {
        const lo = codeOf(tokens[i]);
        const hi = codeOf(tokens[i + 1]);
        const dst = tokens[i + 2];
        i += 3;
        if (dst === '[') {
          const list = [];
          while (i < tokens.length && tokens[i] !== ']') list.push(textOf(tokens[i++]));
          i++;
          if (lo !== null) for (let c = lo; c - lo < list.length; c++) map.set(c, list[c - lo]);
        } else if (lo !== null && hi !== null) {
          const base = textOf(dst);
          for (let c = lo; c <= hi && c - lo < 65536; c++) map.set(c, bump(base, c - lo));
        }
      }
    }
  }
  return { map, ranges };
}

// The code length at position i, from the code space ranges. Falls back to `fallback`.
function codeLengthAt(s, i, ranges, fallback) {
  for (const r of ranges) {
    if (i + r.len > s.length) continue;
    let ok = true;
    for (let k = 0; k < r.len; k++) {
      const b = s.charCodeAt(i + k);
      if (b < r.lo[k] || b > r.hi[k]) {
        ok = false;
        break;
      }
    }
    if (ok) return r.len;
  }
  return Math.min(fallback, s.length - i);
}

// ---------------------------------------------------------------- encodings and metrics

// WinAnsi, the encoding of Helvetica, Times and Courier in pdf-lib.
const WIN_ANSI_HIGH = {
  128: '€', 130: '‚', 131: 'ƒ', 132: '„', 133: '…', 134: '†', 135: '‡', 136: 'ˆ',
  137: '‰', 138: 'Š', 139: '‹', 140: 'Œ', 142: 'Ž', 145: '‘', 146: '’', 147: '“',
  148: '”', 149: '•', 150: '–', 151: '—', 152: '˜', 153: '™', 154: 'š', 155: '›',
  156: 'œ', 158: 'ž', 159: 'Ÿ',
};
const WIN_ANSI = Array.from({ length: 256 }, (_, c) => {
  if (c >= 32 && c < 127) return String.fromCharCode(c);
  if (c >= 160) return String.fromCharCode(c);
  return WIN_ANSI_HIGH[c] ?? '';
});
// Standard encoding, approximated by ASCII with the two curly quotes it has.
const STANDARD = Array.from({ length: 256 }, (_, c) => {
  if (c === 39) return '’';
  if (c === 96) return '‘';
  return c >= 32 && c < 127 ? String.fromCharCode(c) : '';
});

const GLYPHS = {
  space: ' ', exclam: '!', quotedbl: '"', numbersign: '#', dollar: '$', percent: '%', ampersand: '&',
  quotesingle: '’', parenleft: '(', parenright: ')', asterisk: '*', plus: '+', comma: ',', hyphen: '-',
  period: '.', slash: '/', zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6',
  seven: '7', eight: '8', nine: '9', colon: ':', semicolon: ';', less: '<', equal: '=', greater: '>',
  question: '?', at: '@', bracketleft: '[', backslash: '\\', bracketright: ']', asciicircum: '^',
  underscore: '_', grave: '`', braceleft: '{', bar: '|', braceright: '}', asciitilde: '~',
  quoteleft: '‘', quoteright: '’', quotedblleft: '“', quotedblright: '”', quotedblbase: '„',
  quotesinglbase: '‚', endash: '–', emdash: '—', bullet: '•', ellipsis: '…', dagger: '†',
  daggerdbl: '‡', perthousand: '‰', trademark: '™', copyright: '©', registered: '®', degree: '°',
  plusminus: '±', multiply: '×', divide: '÷', minus: '−', section: '§', paragraph: '¶', cent: '¢',
  sterling: '£', currency: '¤', yen: '¥', Euro: '€', florin: 'ƒ', fi: 'fi', fl: 'fl', ff: 'ff',
  ffi: 'ffi', ffl: 'ffl', nbspace: ' ', nonbreakingspace: ' ', sfthyphen: '­',
  guillemotleft: '«', guillemotright: '»', guilsinglleft: '‹', guilsinglright: '›',
  onesuperior: '¹', twosuperior: '²', threesuperior: '³', onehalf: '½', onequarter: '¼',
  threequarters: '¾', mu: 'µ', ordfeminine: 'ª', ordmasculine: 'º', exclamdown: '¡',
  questiondown: '¿', OE: 'Œ', oe: 'œ', Scaron: 'Š', scaron: 'š', Zcaron: 'Ž', zcaron: 'ž',
  Ydieresis: 'Ÿ', dotlessi: 'ı', AE: 'Æ', ae: 'æ', Oslash: 'Ø', oslash: 'ø', germandbls: 'ß',
  Eth: 'Ð', eth: 'ð', Thorn: 'Þ', thorn: 'þ', brokenbar: '¦', macron: '¯', acute: '´',
  cedilla: '¸', dieresis: '¨', periodcentered: '·', logicalnot: '¬',
};
const ACCENTS = {
  acute: '́', grave: '̀', circumflex: '̂', dieresis: '̈', tilde: '̃',
  cedilla: '̧', caron: '̌', ring: '̊', macron: '̄', breve: '̆',
  dotaccent: '̇', ogonek: '̨', hungarumlaut: '̋',
};

// The text for a glyph name in a /Differences array. Unknown names give "?".
function glyphText(name) {
  if (GLYPHS[name] !== undefined) return GLYPHS[name];
  const accented = /^([A-Za-z])([a-z]+)$/.exec(name);
  if (accented && ACCENTS[accented[2]]) return accented[1] + ACCENTS[accented[2]];
  const uni = /^uni([0-9A-Fa-f]{4})/.exec(name);
  if (uni) return String.fromCharCode(parseInt(uni[1], 16));
  const u = /^u([0-9A-Fa-f]{4,6})$/.exec(name);
  if (u) return String.fromCodePoint(parseInt(u[1], 16));
  if (name.length === 1) return name;
  return '?';
}

function fontTraits(name, flags, weight) {
  const mono = (flags & 1) !== 0 || /Courier|Mono|Consol|Typewriter/i.test(name);
  const serif = !mono && ((flags & 2) !== 0 || /Times|Serif|Georgia|Garamond|Cambria|Palatino|Roman|Minion|Caslon|Bodoni|Century|Book/i.test(name));
  const bold = /Bold|Black|Heavy|Semibold|Demi/i.test(name) || (flags & 0x40000) !== 0 || weight >= 600;
  const italic = /Italic|Oblique/i.test(name) || (flags & 64) !== 0;
  const family = mono ? 'Courier' : serif ? 'Times' : 'Helvetica';
  return { family, bold, italic, mono };
}

const styleKey = ({ family, bold, italic }) => `${family}|${bold ? 1 : 0}${italic ? 1 : 0}`;

const STANDARD_ROWS = [
  ['Helvetica', false, false, StandardFonts.Helvetica],
  ['Helvetica', true, false, StandardFonts.HelveticaBold],
  ['Helvetica', false, true, StandardFonts.HelveticaOblique],
  ['Helvetica', true, true, StandardFonts.HelveticaBoldOblique],
  ['Times', false, false, StandardFonts.TimesRoman],
  ['Times', true, false, StandardFonts.TimesRomanBold],
  ['Times', false, true, StandardFonts.TimesRomanItalic],
  ['Times', true, true, StandardFonts.TimesRomanBoldItalic],
  ['Courier', false, false, StandardFonts.Courier],
  ['Courier', true, false, StandardFonts.CourierBold],
  ['Courier', false, true, StandardFonts.CourierOblique],
  ['Courier', true, true, StandardFonts.CourierBoldOblique],
];

// Glyph widths (per 1000 units) of the standard fonts, by WinAnsi code. Used for PDFs
// that name a standard font but give no /Widths. Loaded once.
let standardPromise = null;

function standardWidths() {
  if (!standardPromise) {
    standardPromise = (async () => {
      const doc = await PDFDocument.create();
      const out = {};
      for (const [family, bold, italic, enumName] of STANDARD_ROWS) {
        const font = await doc.embedFont(enumName);
        const widths = new Array(256).fill(500);
        for (let code = 0; code < 256; code++) {
          const ch = WIN_ANSI[code];
          if (!ch) continue;
          try {
            widths[code] = font.widthOfTextAtSize(ch, 1000);
          } catch (error) {
            // Keep the default width for a character the font cannot draw.
          }
        }
        out[styleKey({ family, bold, italic })] = widths;
      }
      return out;
    })();
  }
  return standardPromise;
}

// ---------------------------------------------------------------- fonts

function parseWidths(reader, array) {
  const widths = new Map();
  if (!Array.isArray(array)) return widths;
  const items = array.map((v) => reader.resolve(v));
  let i = 0;
  while (i < items.length) {
    const first = items[i];
    const second = items[i + 1];
    if (typeof first !== 'number') {
      i++;
      continue;
    }
    if (Array.isArray(second)) {
      second.forEach((w, k) => {
        if (typeof w === 'number' && widths.size < 500000) widths.set(first + k, w);
      });
      i += 2;
    } else if (typeof second === 'number' && typeof items[i + 2] === 'number') {
      for (let c = first; c <= second && c - first < 65536; c++) widths.set(c, items[i + 2]);
      i += 3;
    } else {
      i++;
    }
  }
  return widths;
}

function loadToUnicode(reader, ref) {
  const stream = reader.resolve(ref);
  if (!(stream instanceof PdfStream)) return null;
  const bytes = reader.decodeStream(stream);
  return bytes ? parseCMap(bytesToLatin1(bytes)) : null;
}

function encodingTable(reader, encodingRef) {
  const enc = reader.resolve(encodingRef);
  let base = nameOf(enc);
  let diffs = null;
  if (isDict(enc)) {
    base = nameOf(reader.resolve(enc.BaseEncoding));
    diffs = reader.resolve(enc.Differences);
  }
  const basis = base === 'WinAnsiEncoding' || base === 'MacRomanEncoding' ? WIN_ANSI : STANDARD;
  const table = Array.from(basis);
  if (Array.isArray(diffs)) {
    let code = 0;
    for (const item of diffs) {
      const v = reader.resolve(item);
      if (typeof v === 'number') code = v;
      else if (v instanceof PdfName) {
        if (code >= 0 && code < 256) table[code] = glyphText(v.name);
        code++;
      }
    }
  }
  return table;
}

function makeSimpleFont(reader, dict, std) {
  const baseName = nameOf(reader.resolve(dict.BaseFont)) ?? '';
  const desc = reader.resolve(dict.FontDescriptor);
  const flags = numberOf(reader.resolve(isDict(desc) ? desc.Flags : undefined));
  const weight = numberOf(reader.resolve(isDict(desc) ? desc.FontWeight : undefined));
  const traits = fontTraits(baseName, flags, weight);
  const toUnicode = loadToUnicode(reader, dict.ToUnicode);
  const table = encodingTable(reader, dict.Encoding);
  const firstChar = numberOf(reader.resolve(dict.FirstChar));
  const widthsRef = reader.resolve(dict.Widths);
  const widths = Array.isArray(widthsRef) ? widthsRef.map((w) => numberOf(reader.resolve(w), NaN)) : null;
  const standard = std[styleKey(traits)] ?? std[styleKey({ ...traits, family: 'Helvetica' })];

  return {
    ...traits,
    codes(bytes) {
      const out = [];
      for (let i = 0; i < bytes.length; i++) out.push([bytes.charCodeAt(i), 1]);
      return out;
    },
    glyph(code) {
      const t = toUnicode?.map.get(code) ?? table[code] ?? '';
      let w = widths && code >= firstChar && code - firstChar < widths.length ? widths[code - firstChar] : NaN;
      if (!Number.isFinite(w)) w = standard[code] ?? 500;
      return { t, w };
    },
  };
}

function makeCompositeFont(reader, dict) {
  const descendants = reader.resolve(dict.DescendantFonts);
  const cid = reader.resolve(Array.isArray(descendants) ? descendants[0] : undefined);
  const cidDict = isDict(cid) ? cid : {};
  const desc = reader.resolve(cidDict.FontDescriptor);
  const baseName = nameOf(reader.resolve(dict.BaseFont)) ?? '';
  const flags = numberOf(reader.resolve(isDict(desc) ? desc.Flags : undefined));
  const weight = numberOf(reader.resolve(isDict(desc) ? desc.FontWeight : undefined));
  const traits = fontTraits(baseName, flags, weight);
  const toUnicode = loadToUnicode(reader, dict.ToUnicode);
  const ranges = toUnicode && toUnicode.ranges.length ? toUnicode.ranges : [{ len: 2, lo: [0, 0], hi: [255, 255] }];
  const widths = parseWidths(reader, reader.resolve(cidDict.W));
  const dw = numberOf(reader.resolve(cidDict.DW), 1000);

  return {
    ...traits,
    codes(bytes) {
      const out = [];
      for (let i = 0; i < bytes.length; ) {
        const len = codeLengthAt(bytes, i, ranges, 2);
        let code = 0;
        for (let k = 0; k < len; k++) code = code * 256 + bytes.charCodeAt(i + k);
        out.push([code, len]);
        i += len;
      }
      return out;
    },
    glyph(code) {
      return { t: toUnicode?.map.get(code) ?? '', w: widths.get(code) ?? dw };
    },
  };
}

// ---------------------------------------------------------------- the file

class PdfReader {
  constructor(src) {
    this.src = src;
    this.offsets = new Map(); // object number -> offset of "N G obj"
    this.cache = new Map();
    this.inStreams = null; // object number -> { text, at } for objects inside object streams
    this.fontCache = new Map();
  }

  scan() {
    const re = /(\d+)\s+(\d+)\s+obj\b/g;
    let m;
    while ((m = re.exec(this.src)) !== null) this.offsets.set(Number(m[1]), m.index);
  }

  resolve(v) {
    return v instanceof PdfRef ? this.get(v.num) : v;
  }

  get(num) {
    if (this.cache.has(num)) return this.cache.get(num);
    this.cache.set(num, null); // stops a reference cycle from looping
    let value = null;
    const off = this.offsets.get(num);
    if (off !== undefined) {
      value = this.parseAt(off);
    } else {
      this.indexObjectStreams();
      const loc = this.inStreams.get(num);
      if (loc) {
        const lex = new Lexer(loc.text, loc.at);
        value = readObject(lex, lex.next());
      }
    }
    this.cache.set(num, value);
    return value;
  }

  parseAt(off) {
    const lex = new Lexer(this.src, off);
    lex.next();
    lex.next();
    if (lex.next() !== 'obj') return null;
    const value = readObject(lex, lex.next());
    if (!isDict(value)) return value;
    lex.skip();
    if (!this.src.startsWith('stream', lex.pos)) return value;
    let p = lex.pos + 6;
    if (this.src.charCodeAt(p) === 13) p++;
    if (this.src.charCodeAt(p) === 10) p++;
    return new PdfStream(value, p, p + this.streamLength(value, p));
  }

  streamLength(dict, start) {
    const s = this.src;
    const declared = this.resolve(dict.Length);
    if (typeof declared === 'number' && declared >= 0 && /^\s*endstream/.test(s.slice(start + declared, start + declared + 32))) {
      return declared;
    }
    const end = s.indexOf('endstream', start);
    if (end < 0) return Math.max(0, s.length - start);
    let e = end;
    if (s.charCodeAt(e - 1) === 10) e--;
    if (s.charCodeAt(e - 1) === 13) e--;
    return Math.max(0, e - start);
  }

  indexObjectStreams() {
    if (this.inStreams) return;
    this.inStreams = new Map();
    for (const [, off] of this.offsets) {
      if (!this.src.slice(off, off + 500).includes('/ObjStm')) continue;
      const stm = this.parseAt(off);
      if (!(stm instanceof PdfStream)) continue;
      const bytes = this.decodeStream(stm);
      if (!bytes) continue;
      const text = bytesToLatin1(bytes);
      const count = numberOf(this.resolve(stm.dict.N));
      const first = numberOf(this.resolve(stm.dict.First));
      const lex = new Lexer(text, 0);
      for (let i = 0; i < count; i++) {
        const num = lex.next();
        const at = lex.next();
        if (typeof num !== 'number' || typeof at !== 'number') break;
        if (!this.offsets.has(num) && !this.inStreams.has(num)) this.inStreams.set(num, { text, at: first + at });
      }
    }
  }

  // The decoded bytes of a stream, or null when a filter is not supported (LZW, images, ...).
  decodeStream(stream) {
    const dict = stream.dict;
    let filters = this.resolve(dict.Filter);
    if (filters === undefined || filters === null) filters = [];
    filters = (Array.isArray(filters) ? filters : [filters]).map((f) => nameOf(this.resolve(f)));
    let parms = this.resolve(dict.DecodeParms);
    parms = Array.isArray(parms) ? parms.map((p) => this.resolve(p)) : [parms];

    let data = latin1ToBytes(this.src, stream.start, stream.end);
    for (let i = 0; i < filters.length; i++) {
      const p = this.params(parms[i]);
      switch (filters[i]) {
        case 'FlateDecode':
        case 'Fl':
          data = inflate(data);
          if (!data) return null;
          data = unpredict(data, p);
          break;
        case 'ASCIIHexDecode':
        case 'AHx':
          data = asciiHex(data);
          break;
        case 'ASCII85Decode':
        case 'A85':
          data = ascii85(data);
          break;
        default:
          return null;
      }
    }
    return data;
  }

  params(v) {
    const out = {};
    if (!isDict(v)) return out;
    for (const key of ['Predictor', 'Colors', 'BitsPerComponent', 'Columns']) {
      const value = this.resolve(v[key]);
      if (typeof value === 'number') out[key] = value;
    }
    return out;
  }

  catalog() {
    let num = null;
    const re = /\/Root\s+(\d+)\s+\d+\s+R/g;
    let m;
    while ((m = re.exec(this.src)) !== null) num = Number(m[1]);
    if (num !== null) {
      const cat = this.get(num);
      if (isDict(cat) && cat.Pages !== undefined) return cat;
    }
    for (const num2 of this.offsets.keys()) {
      const v = this.get(num2);
      if (isDict(v) && nameOf(v.Type) === 'Catalog') return v;
    }
    return null;
  }

  pages() {
    let out = [];
    try {
      const catalog = this.catalog();
      if (catalog) out = this.walkPages(catalog.Pages);
    } catch (error) {
      out = [];
    }
    if (out.length === 0) out = this.scanPages();
    return out;
  }

  walkPages(root) {
    const out = [];
    const seen = new Set();
    const walk = (ref, inherited, depth) => {
      const node = this.resolve(ref);
      if (!isDict(node) || seen.has(node) || depth > 64) return;
      seen.add(node);
      const resources = node.Resources !== undefined ? this.resolve(node.Resources) : inherited;
      const kids = this.resolve(node.Kids);
      if (Array.isArray(kids)) {
        for (const kid of kids) walk(kid, resources, depth + 1);
        return;
      }
      if (nameOf(node.Type) === 'Pages') return;
      out.push({ dict: node, resources: isDict(resources) ? resources : {} });
    };
    walk(root, null, 0);
    return out;
  }

  // Used when the page tree is missing or broken: every object that is a page.
  scanPages() {
    this.indexObjectStreams();
    const nums = [...new Set([...this.offsets.keys(), ...this.inStreams.keys()])].sort((a, b) => a - b);
    const out = [];
    for (const num of nums) {
      const v = this.get(num);
      if (isDict(v) && nameOf(v.Type) === 'Page') {
        out.push({ dict: v, resources: isDict(v.Resources) ? this.resolve(v.Resources) : {} });
      }
    }
    return out;
  }

  pageContent(dict) {
    const contents = this.resolve(dict.Contents);
    const parts = Array.isArray(contents) ? contents : [dict.Contents];
    const out = [];
    for (const part of parts) {
      const stream = this.resolve(part);
      if (!(stream instanceof PdfStream)) continue;
      const bytes = this.decodeStream(stream);
      if (bytes) out.push(bytesToLatin1(bytes));
    }
    return out.join('\n');
  }

  // Helvetica with WinAnsi, for text that names no usable font.
  defaultFont() {
    if (!this.fallback) {
      this.fallback = this.font({ BaseFont: new PdfName('Helvetica'), Encoding: new PdfName('WinAnsiEncoding') });
    }
    return this.fallback;
  }

  // The font for a font dictionary, cached for the whole file.
  font(dict) {
    let font = this.fontCache.get(dict);
    if (!font) {
      const subtype = nameOf(this.resolve(dict.Subtype));
      font = subtype === 'Type0' ? makeCompositeFont(this, dict) : makeSimpleFont(this, dict, this.std);
      this.fontCache.set(dict, font);
    }
    return font;
  }
}

// ---------------------------------------------------------------- content streams

// Text state and graphics state that the text operators read.
function newState() {
  return { ctm: IDENTITY, font: null, fontSize: 1, hScale: 1, charSpace: 0, wordSpace: 0, leading: 0 };
}

const mul = (m, n) => [
  m[0] * n[0] + m[1] * n[2],
  m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2],
  m[2] * n[1] + m[3] * n[3],
  m[4] * n[0] + m[5] * n[2] + n[4],
  m[4] * n[1] + m[5] * n[3] + n[5],
];

const nums = (args, count) => Array.from({ length: count }, (_, i) => numberOf(args[i]));

class PageRunner {
  constructor(reader) {
    this.reader = reader;
    this.pieces = [];
    this.gs = newState();
    this.gstack = [];
    this.tm = IDENTITY;
    this.tlm = IDENTITY;
    this.defaultFont = reader.defaultFont();
  }

  // Runs one content stream. `resources` is the dictionary the names in it refer to.
  run(text, resources, depth) {
    const lex = new Lexer(text, 0);
    const operands = [];
    for (;;) {
      const tok = lex.next();
      if (tok === undefined) return;
      if (typeof tok === 'number' || tok instanceof PdfName || tok instanceof PdfString) {
        operands.push(tok);
        continue;
      }
      if (tok === '[') {
        operands.push(this.readArray(lex));
        continue;
      }
      if (tok === '<<') {
        operands.push(readObject(lex, tok));
        continue;
      }
      if (tok === 'true' || tok === 'false') {
        operands.push(tok === 'true');
        continue;
      }
      if (tok === 'null') {
        operands.push(null);
        continue;
      }
      if (tok === 'BI') {
        this.skipInlineImage(lex);
        operands.length = 0;
        continue;
      }
      if (tok === '' || tok === ']' || tok === '>>' || tok === '{' || tok === '}' || tok === ')') continue;
      try {
        this.op(tok, operands, resources, depth);
      } catch (error) {
        // A bad operator is skipped. The rest of the page still reads.
      }
      operands.length = 0;
    }
  }

  readArray(lex) {
    const arr = [];
    for (;;) {
      const at = lex.pos;
      const t = lex.next();
      if (t === undefined || t === ']') return arr;
      if (typeof t === 'number' || t instanceof PdfString || t instanceof PdfName) arr.push(t);
      else if (t === '[') arr.push(this.readArray(lex));
      else if (typeof t === 'string' && t !== '' && t !== '>>' && t !== '<<') {
        lex.pos = at;
        return arr;
      }
    }
  }

  skipInlineImage(lex) {
    const s = lex.src;
    const id = s.indexOf('ID', lex.pos);
    if (id < 0) {
      lex.pos = s.length;
      return;
    }
    const re = /\sEI(?=\s|$)/g;
    re.lastIndex = id + 2;
    const m = re.exec(s);
    lex.pos = m ? m.index + m[0].length : s.length;
  }

  moveText(tx, ty) {
    this.tlm = mul([1, 0, 0, 1, tx, ty], this.tlm);
    this.tm = this.tlm;
  }

  op(name, a, res, depth) {
    const gs = this.gs;
    switch (name) {
      case 'q':
        this.gstack.push({ ...gs });
        break;
      case 'Q':
        if (this.gstack.length) this.gs = this.gstack.pop();
        break;
      case 'cm':
        if (a.length >= 6) gs.ctm = mul(nums(a, 6), gs.ctm);
        break;
      case 'BT':
        this.tm = IDENTITY;
        this.tlm = IDENTITY;
        break;
      case 'Tf':
        gs.font = this.fontFor(res, nameOf(a[0]));
        gs.fontSize = numberOf(a[1], 1);
        break;
      case 'Tc':
        gs.charSpace = numberOf(a[0]);
        break;
      case 'Tw':
        gs.wordSpace = numberOf(a[0]);
        break;
      case 'Tz':
        gs.hScale = numberOf(a[0], 100) / 100;
        break;
      case 'TL':
        gs.leading = numberOf(a[0]);
        break;
      case 'Td':
        this.moveText(numberOf(a[0]), numberOf(a[1]));
        break;
      case 'TD':
        gs.leading = -numberOf(a[1]);
        this.moveText(numberOf(a[0]), numberOf(a[1]));
        break;
      case 'Tm':
        if (a.length >= 6) this.tlm = this.tm = nums(a, 6);
        break;
      case 'T*':
        this.moveText(0, -gs.leading);
        break;
      case 'Tj':
        if (a[0] instanceof PdfString) this.show(a[0]);
        break;
      case 'TJ':
        if (Array.isArray(a[0])) {
          for (const item of a[0]) {
            if (item instanceof PdfString) this.show(item);
            else if (typeof item === 'number') this.kern(item);
          }
        }
        break;
      case "'":
        this.moveText(0, -gs.leading);
        if (a[0] instanceof PdfString) this.show(a[0]);
        break;
      case '"':
        if (a.length >= 3) {
          gs.wordSpace = numberOf(a[0]);
          gs.charSpace = numberOf(a[1]);
          this.moveText(0, -gs.leading);
          if (a[2] instanceof PdfString) this.show(a[2]);
        }
        break;
      case 'Do':
        this.doForm(nameOf(a[0]), res, depth);
        break;
      default:
        break;
    }
  }

  fontFor(res, name) {
    const fonts = this.reader.resolve(res?.Font);
    const dict = isDict(fonts) && name ? this.reader.resolve(fonts[name]) : null;
    return isDict(dict) ? this.reader.font(dict) : this.defaultFont;
  }

  // Moves the text position by a TJ number, which is in thousandths of a text-space unit.
  kern(n) {
    const gs = this.gs;
    this.tm = mul([1, 0, 0, 1, (-n / 1000) * gs.fontSize * gs.hScale, 0], this.tm);
  }

  // Shows one string. Each string becomes one piece of text, placed on the page.
  show(str) {
    const gs = this.gs;
    const font = gs.font ?? this.defaultFont;
    const start = mul(this.tm, gs.ctm);
    let text = '';
    for (const [code, len] of font.codes(str.bytes)) {
      const g = font.glyph(code);
      text += g.t;
      const word = len === 1 && code === 32 ? gs.wordSpace : 0;
      const advance = ((g.w / 1000) * gs.fontSize + gs.charSpace + word) * gs.hScale;
      this.tm = mul([1, 0, 0, 1, Number.isFinite(advance) ? advance : 0, 0], this.tm);
    }
    if (!text) return;
    const end = mul(this.tm, gs.ctm);
    this.pieces.push({
      t: text,
      x: start[4],
      x1: end[4],
      y: start[5],
      size: gs.fontSize * Math.hypot(start[2], start[3]),
      bold: font.bold,
      italic: font.italic,
      mono: font.mono,
    });
  }

  // Runs a form XObject with its own matrix and resources.
  doForm(name, res, depth) {
    if (!name || depth >= MAX_DEPTH) return;
    const xobjects = this.reader.resolve(res?.XObject);
    const stream = isDict(xobjects) ? this.reader.resolve(xobjects[name]) : null;
    if (!(stream instanceof PdfStream) || nameOf(this.reader.resolve(stream.dict.Subtype)) !== 'Form') return;
    const m = this.reader.resolve(stream.dict.Matrix);
    const matrix = Array.isArray(m) && m.length === 6 ? m.map((v) => numberOf(this.reader.resolve(v))) : IDENTITY;
    const formRes = this.reader.resolve(stream.dict.Resources) ?? res;
    const bytes = this.reader.decodeStream(stream);
    if (!bytes) return;
    const saved = { gs: this.gs, stack: this.gstack.length, tm: this.tm, tlm: this.tlm };
    this.gs = { ...this.gs, ctm: mul(matrix, this.gs.ctm) };
    this.run(bytesToLatin1(bytes), formRes, depth + 1);
    this.gs = saved.gs;
    this.gstack.length = saved.stack;
    this.tm = saved.tm;
    this.tlm = saved.tlm;
  }
}

// ---------------------------------------------------------------- public API

// Reads the text of every page. Resolves to:
//   { pageCount, pages: [{ pieces: [{ t, x, x1, y, size, bold, italic, mono }] }], failedPages }
// Each piece is one string as drawn, with its start and end x and its baseline y in points.
// Throws an Error with a message for files that are not PDFs or are encrypted.
export async function readPdfText(bytes) {
  const src = bytesToLatin1(bytes);
  const header = src.indexOf('%PDF-');
  if (header < 0 || header > 1024) throw new Error('This file is not a PDF.');
  if (/\/Encrypt\s*(\d+\s+\d+\s+R|<<)/.test(src)) {
    throw new Error('This PDF is encrypted. NumScan cannot read the text of encrypted PDFs.');
  }

  const reader = new PdfReader(src);
  reader.scan();
  reader.std = await standardWidths();

  const pages = reader.pages();
  const out = [];
  let failedPages = 0;
  for (const page of pages) {
    const runner = new PageRunner(reader);
    try {
      runner.run(reader.pageContent(page.dict), page.resources, 0);
    } catch (error) {
      failedPages++;
    }
    out.push({ pieces: runner.pieces });
  }
  return { pageCount: pages.length, pages: out, failedPages };
}
