// Largest text one QR code can hold at error correction level M, in UTF-8 bytes.
export const MAX_QR_BYTES = 2331;

// Plain JavaScript with no React Native imports, so it can be tested in Node.

export function utf8Length(text) {
  let bytes = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0);
    bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
  }
  return bytes;
}

// Accepts any text. It is encoded exactly as typed: nothing is trimmed,
// and no https:// is added.
export function toQrText(raw) {
  const text = raw ?? '';
  if (!text.trim()) {
    return { error: 'Type or paste something first.' };
  }
  if (utf8Length(text) > MAX_QR_BYTES) {
    return { error: `Too long for one QR code. The limit is ${MAX_QR_BYTES} bytes.` };
  }
  return { text };
}
