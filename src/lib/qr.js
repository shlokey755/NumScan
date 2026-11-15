import { isUrl, normalizeUrl } from './text';

// Checks what the user typed or pasted and returns the link the QR code should open.
// Returns { link } on success, or { error } with a message to show the user.
// Plain JavaScript with no React Native imports, so it can be tested in Node.
export function toQrLink(raw) {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) {
    return { error: 'Type or paste a link first.' };
  }
  if (!isUrl(trimmed)) {
    return { error: "That doesn't look like a link. Try something like example.com." };
  }
  return { link: normalizeUrl(trimmed) };
}
