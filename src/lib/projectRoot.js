// Pure helpers for the save folder and the files in projects. No React Native or native
// imports, so the same code runs in the app and in plain Node tests.

// The small file in the app's private storage that remembers the folder the user chose.
export const ROOT_FILE_NAME = 'numscan-projects-root.json';

const FORBIDDEN_CHARS = /[\/\\:*?"<>|\x00-\x1f\x7f]/;

// True when the name is safe as one path segment: no slashes or reserved characters,
// no dot-only names (such as '..'), and no spaces at either end.
export function isPlainName(name) {
  return (
    typeof name === 'string' &&
    name.length > 0 &&
    name.trim() === name &&
    !FORBIDDEN_CHARS.test(name) &&
    !/^\.+$/.test(name)
  );
}

// The lower-case form of each name, for checks that ignore case. iPhone storage and most
// Android storage treat 'Scan.pdf' and 'scan.pdf' as the same file.
export function takenNames(names) {
  return new Set(names.map((name) => name.toLowerCase()));
}

// Returns the name, or 'scan (2).pdf', 'scan (3).pdf'... when `taken` already has it.
// `taken` holds lower-case names (see takenNames). The chosen name is added to it, so a loop
// that passes the same set gets a different name for each file.
export function uniqueFileName(name, taken) {
  const dot = name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  let candidate = name;
  for (let n = 2; taken.has(candidate.toLowerCase()); n += 1) {
    candidate = `${stem} (${n})${ext}`;
  }
  taken.add(candidate.toLowerCase());
  return candidate;
}

// Reads the saved folder from the JSON text. Returns { uri, name }, or null when the text is
// missing, is not JSON, or does not hold a content:// or file:// address.
export function parseStoredRoot(text) {
  if (typeof text !== 'string') return null;
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const { uri, name } = data;
  if (typeof uri !== 'string' || !/^(content|file):\/\/./.test(uri)) return null;
  return { uri, name: typeof name === 'string' ? name : '' };
}

// The JSON text saved for a folder: its address and its display name.
export function storedRootText({ uri, name }) {
  return `${JSON.stringify({ version: 1, uri, name: name ?? '' }, null, 2)}\n`;
}

// Extension to MIME type. Used for the share sheet and when a file is created in the folder.
const MIME_BY_EXT = new Map([
  ['pdf', 'application/pdf'],
  ['txt', 'text/plain'],
  ['csv', 'text/csv'],
  ['json', 'application/json'],
  ['html', 'text/html'],
  ['htm', 'text/html'],
  ['png', 'image/png'],
  ['jpg', 'image/jpeg'],
  ['jpeg', 'image/jpeg'],
  ['webp', 'image/webp'],
  ['heic', 'image/heic'],
  ['mp4', 'video/mp4'],
  ['mov', 'video/quicktime'],
  ['zip', 'application/zip'],
]);

// The MIME type from the file name's extension. Unknown or missing extensions give a generic type.
export function mimeFor(name) {
  const dot = name.lastIndexOf('.');
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
  return MIME_BY_EXT.get(ext) ?? 'application/octet-stream';
}
