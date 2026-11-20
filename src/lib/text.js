// Pure helpers with no React Native imports, so they can be tested in plain Node.

export function isUrl(text) {
  const t = text.trim();
  if (/\s/.test(t)) return false;
  return /^(https?:\/\/|www\.)\S+$/i.test(t) || /^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}(\/\S*)?$/i.test(t);
}

export function normalizeUrl(text) {
  const trimmed = text.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

// ML Kit returns blocks > lines > elements, each with a frame in photo pixels.
// The camera preview fills the scan box ("cover" style), so only the centre of
// the photo is visible inside it. Keep only the text whose centre falls there.
// Returns one string per line that has visible text.
export function getTextInsideBox(result, photo, boxWidth, boxHeight) {
  const scale = Math.max(boxWidth / photo.width, boxHeight / photo.height);
  const visibleW = boxWidth / scale;
  const visibleH = boxHeight / scale;
  const left = (photo.width - visibleW) / 2;
  const top = (photo.height - visibleH) / 2;
  const right = left + visibleW;
  const bottom = top + visibleH;

  const lines = [];
  for (const block of result?.blocks ?? []) {
    for (const line of block.lines ?? []) {
      const words = [];
      const pieces = line.elements?.length ? line.elements : [line];
      for (const piece of pieces) {
        const f = piece.frame;
        if (!f || !piece.text) continue;
        const cx = f.left + f.width / 2;
        const cy = f.top + f.height / 2;
        if (cx >= left && cx <= right && cy >= top && cy <= bottom) {
          words.push(piece.text);
        }
      }
      if (words.length > 0) lines.push(words.join(' '));
    }
  }
  return lines;
}

// Letters that OCR often reads in place of digits, and the digit they stand for.
const LOOK_ALIKE = { O: '0', o: '0', I: '1', l: '1', S: '5' };

// Fixes look-alike letters only in a token that already has a digit and whose
// letters are all look-alikes. "4O1" -> "401", "SO5" -> "505".
// "IBAN" and "A1O" are left alone.
export function fixLookAlikes(token) {
  if (!/\d/.test(token)) return token;
  const letters = token.match(/[A-Za-z]/g) ?? [];
  if (!letters.every((ch) => LOOK_ALIKE[ch] !== undefined)) return token;
  return token.replace(/[A-Za-z]/g, (ch) => LOOK_ALIKE[ch]);
}

// Each run of digits becomes one entry, so "Item 123 Price 456" -> ["123", "456"].
// Look-alike letters inside number tokens are corrected first.
export function extractDigitGroups(text) {
  return text
    .split(/\s+/)
    .map(fixLookAlikes)
    .flatMap((token) => token.match(/\d+/g) ?? []);
}
