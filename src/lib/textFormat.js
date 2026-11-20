// Helpers for the text viewer. C, Python and HTML get cleaning only (cleanText), not full
// reformatting. Do not add a reformatter for them.
// Pure JavaScript with no React Native imports, so the same code runs in plain Node tests.

const KINDS = new Map([
  ['json', 'json'],
  ['csv', 'csv'],
  ['html', 'html'],
  ['htm', 'html'],
  ['py', 'python'],
  ['c', 'c'],
  ['h', 'c'],
]);

export function detectKind(name) {
  const text = String(name ?? '');
  const dot = text.lastIndexOf('.');
  const ext = dot >= 0 ? text.slice(dot + 1).toLowerCase() : '';
  return KINDS.get(ext) ?? 'text';
}

// Converts line endings and tabs, strips trailing spaces, and ends with one newline.
export function cleanText(text) {
  const lines = text
    .replace(/\r\n?/g, '\n')
    .replace(/\t/g, '    ')
    .split('\n')
    .map((line) => line.trimEnd());
  // Trailing blank lines go, so the file ends with exactly one newline.
  while (lines.length && lines[lines.length - 1] === '') {
    lines.pop();
  }
  return lines.length ? `${lines.join('\n')}\n` : '';
}

// Walks the text the way a JSON parser does and returns the index where it first breaks.
// Engines word JSON.parse errors differently, and some leave out the position, so this
// finds it the same way everywhere. It runs only after JSON.parse has already failed.
function firstBadIndex(text) {
  let i = 0;
  // Throwing the index is the simplest way out of the nested calls below.
  const fail = () => {
    throw i;
  };
  const skip = () => {
    while (i < text.length && ' \t\n\r'.includes(text[i])) i += 1;
  };
  const expect = (ch) => {
    skip();
    if (text[i] !== ch) fail();
    i += 1;
  };
  const word = (w) => {
    for (const ch of w) {
      if (text[i] !== ch) fail();
      i += 1;
    }
  };
  const digits = () => {
    const start = i;
    while (text[i] >= '0' && text[i] <= '9') i += 1;
    return i > start;
  };
  const number = () => {
    if (text[i] === '-') i += 1;
    if (text[i] === '0') i += 1;
    else if (!digits()) fail();
    if (text[i] === '.') {
      i += 1;
      if (!digits()) fail();
    }
    if (text[i] === 'e' || text[i] === 'E') {
      i += 1;
      if (text[i] === '+' || text[i] === '-') i += 1;
      if (!digits()) fail();
    }
  };
  const string = () => {
    i += 1; // opening quote
    for (;;) {
      const ch = text[i];
      if (ch === undefined) fail();
      if (ch === '"') {
        i += 1;
        return;
      }
      if (ch < ' ') fail(); // raw control characters are not allowed in strings
      if (ch !== '\\') {
        i += 1;
        continue;
      }
      i += 1;
      const esc = text[i];
      if (esc === 'u') {
        for (let k = 0; k < 4; k += 1) {
          i += 1;
          if (!/[0-9a-fA-F]/.test(text[i] ?? '')) fail();
        }
        i += 1;
      } else if (esc !== undefined && '"\\/bfnrt'.includes(esc)) {
        i += 1;
      } else {
        fail();
      }
    }
  };
  const value = () => {
    skip();
    const ch = text[i];
    if (ch === '{') {
      i += 1;
      skip();
      if (text[i] === '}') {
        i += 1;
        return;
      }
      for (;;) {
        skip();
        if (text[i] !== '"') fail();
        string();
        expect(':');
        value();
        skip();
        if (text[i] !== ',') break;
        i += 1;
      }
      expect('}');
    } else if (ch === '[') {
      i += 1;
      skip();
      if (text[i] === ']') {
        i += 1;
        return;
      }
      for (;;) {
        value();
        skip();
        if (text[i] !== ',') break;
        i += 1;
      }
      expect(']');
    } else if (ch === '"') {
      string();
    } else if (ch === 't') {
      word('true');
    } else if (ch === 'f') {
      word('false');
    } else if (ch === 'n') {
      word('null');
    } else if (ch === '-' || (ch >= '0' && ch <= '9')) {
      number();
    } else {
      fail();
    }
  };
  try {
    value();
    skip();
    if (i < text.length) fail(); // content after the top-level value
    return text.length; // only reached if JSON.parse failed for a reason this scanner misses
  } catch (at) {
    if (typeof at === 'number') return at;
    throw at;
  }
}

function parseJson(text) {
  const source = String(text);
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new Error(`Invalid JSON at position ${firstBadIndex(source)}: ${error.message}`);
  }
}

export function formatJson(text, indent = 2) {
  return JSON.stringify(parseJson(text), null, indent);
}

export function minifyJson(text) {
  return JSON.stringify(parseJson(text));
}

export function numberLines(text) {
  const clean = cleanText(text);
  // cleanText ends with a newline. Dropping it stops an extra empty last line.
  const body = clean.endsWith('\n') ? clean.slice(0, -1) : clean;
  return body.split('\n').map((line, index) => ({ no: index + 1, text: line }));
}
