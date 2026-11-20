// Pure logic for batch scanning, with no React Native imports, so it can be tested in Node.

export const REPEAT_GAP_MS = 1500;

// Decides whether a scan joins the batch. A code that stays in view keeps being
// reported, so repeats are ignored until it has been out of view for REPEAT_GAP_MS
// or a different code is read.
// `last` is { data, seenAt } from the previous event, or null.
export function trackScan(last, data, now) {
  const repeat = Boolean(last) && last.data === data && now - last.seenAt < REPEAT_GAP_MS;
  return { accept: !repeat, last: { data, seenAt: now } };
}

// The clipboard always holds the whole batch, one code per line.
export function batchClipboardText(items) {
  return items.map((item) => item.data).join('\n');
}
