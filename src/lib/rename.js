// Builds new file names from a template such as '{name}_{nnn}.pdf'. Pure JavaScript
// with no React Native imports, so the same code runs in the app and in plain Node tests.

// Only these tokens are replaced. Anything else in braces stays as typed.
const TOKEN = /\{(nnn|nn|n|name|date|ext)\}/g;
const MAX_LENGTH = 120;

// Splits 'IMG.pdf' into { stem: 'IMG', ext: 'pdf' }. A dot at either end is not an extension.
function splitName(original) {
  const dot = original.lastIndexOf('.');
  if (dot <= 0 || dot === original.length - 1) return { stem: original, ext: '' };
  return { stem: original.slice(0, dot), ext: original.slice(dot + 1) };
}

// Uses the local calendar date, so a photo taken late in the evening keeps the day shown on the phone.
function formatDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const pad = (n, width = 2) => String(n).padStart(width, '0');
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Makes the expanded template safe as a file name. Whitespace becomes '_' before the
// bad characters are removed, so a tab between two words does not join them.
function cleanStem(text) {
  const safe = text
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[\/\\:*?"<>|\x00-\x1f\x7f]/g, '');
  // Cap before trimming, so a cut that lands on a dot does not leave one at the end.
  return Array.from(safe).slice(0, MAX_LENGTH).join('').replace(/^[. ]+|[. ]+$/g, '');
}

// Returns the name, or 'IMG (2).pdf', 'IMG (3).pdf'... when the name is already taken.
function uniqueName(name, ext, taken) {
  const suffix = ext ? `.${ext}` : '';
  const hasSuffix = suffix !== '' && name.toLowerCase().endsWith(suffix.toLowerCase());
  const stem = hasSuffix ? name.slice(0, -suffix.length) : name;
  let candidate = name;
  for (let n = 2; taken.has(candidate); n += 1) {
    candidate = `${stem} (${n})${suffix}`;
  }
  taken.add(candidate);
  return candidate;
}

export function applyTemplate(template, info) {
  const { stem, ext } = splitName(info.original);
  const number = info.index;
  const values = {
    n: String(number),
    nn: String(number).padStart(2, '0'),
    nnn: String(number).padStart(3, '0'),
    name: stem,
    date: formatDate(info.date),
    ext,
  };
  // One pass, so text inside a substituted value (such as a name with '{n}') is not expanded again.
  const expanded = template.replace(TOKEN, (token, key) => values[key]);
  let result = cleanStem(expanded) || 'file';
  // The template may already end with the extension, so only add it when missing.
  const suffix = `.${ext}`;
  if (ext && !result.toLowerCase().endsWith(suffix.toLowerCase())) {
    result += suffix;
  }
  return result;
}

// Previews the names a batch would get. Date is unknown here, so {date} is empty.
export function previewNames(template, originals) {
  const taken = new Set();
  return originals.map((original, i) => {
    const name = applyTemplate(template, { index: i + 1, original, date: null });
    return uniqueName(name, splitName(original).ext, taken);
  });
}
