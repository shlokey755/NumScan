// Base64 and percent (URL) encoding for text. Text is handled as UTF-8, so accents and emoji
// survive a round trip. Pure logic: no React, so Node can test it. Nothing leaves the phone.

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// Decoding also accepts the URL-safe letters - and _ in place of + and /.
const VALUE = new Map([...ALPHABET].map((ch, i) => [ch, i]));
VALUE.set('-', 62);
VALUE.set('_', 63);

// Text to UTF-8 bytes. encodeURIComponent already does the UTF-8 work; its %XX escapes are read back as bytes.
function utf8Bytes(text) {
  let escaped;
  try {
    escaped = encodeURIComponent(text);
  } catch {
    throw new Error('The text has a broken character that cannot be encoded.');
  }
  const bytes = [];
  for (let i = 0; i < escaped.length; i++) {
    if (escaped[i] === '%') {
      bytes.push(parseInt(escaped.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(escaped.charCodeAt(i));
    }
  }
  return bytes;
}

// UTF-8 bytes back to text. Bytes that are not valid UTF-8 throw.
function bytesToText(bytes) {
  const escaped = bytes.map((b) => `%${b.toString(16).padStart(2, '0')}`).join('');
  try {
    return decodeURIComponent(escaped);
  } catch {
    throw new Error('These bytes are not UTF-8 text.');
  }
}

function base64FromBytes(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const n = (bytes[i] << 16) | (b1 << 8) | b2;
    out += ALPHABET[(n >> 18) & 63] + ALPHABET[(n >> 12) & 63];
    out += i + 1 < bytes.length ? ALPHABET[(n >> 6) & 63] : '=';
    out += i + 2 < bytes.length ? ALPHABET[n & 63] : '=';
  }
  return out;
}

// Whitespace and padding are optional. A single leftover character cannot be valid Base64.
function bytesFromBase64(text) {
  const clean = text.replace(/\s+/g, '').replace(/=+$/, '');
  if (clean.length % 4 === 1) {
    throw new Error('This is not valid Base64. A character may be missing.');
  }
  const bytes = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of clean) {
    const value = VALUE.get(ch);
    if (value === undefined) throw new Error(`"${ch}" is not a Base64 character.`);
    buffer = ((buffer << 6) | value) & 0xffffff;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return bytes;
}

export function toBase64(text) {
  return base64FromBytes(utf8Bytes(String(text ?? '')));
}

export function fromBase64(text) {
  return bytesToText(bytesFromBase64(String(text ?? '')));
}

export function toUrl(text) {
  try {
    return encodeURIComponent(String(text ?? ''));
  } catch {
    throw new Error('The text has a broken character that cannot be encoded.');
  }
}

export function fromUrl(text) {
  try {
    return decodeURIComponent(String(text ?? ''));
  } catch {
    throw new Error('This has a bad % sequence. Check the text after each %.');
  }
}
