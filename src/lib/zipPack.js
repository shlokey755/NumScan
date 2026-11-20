// Packs scanned files into one zip for sharing. Pure JavaScript with no React Native
// imports, so the same code runs in the app and in plain Node tests.
import { unzipSync, zipSync } from 'fflate';

// Characters that some file system rejects, plus control characters.
export function sanitizeName(name) {
  const clean = String(name ?? '')
    .replace(/[\/\\:*?"<>|\x00-\x1f\x7f]/g, '')
    .trim();
  return clean || 'file';
}

// Returns the name, or 'a (2).pdf', 'a (3).pdf'... when the name is already taken.
function uniqueName(name, taken) {
  const dot = name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  let candidate = name;
  for (let n = 2; taken.has(candidate); n += 1) {
    candidate = `${stem} (${n})${ext}`;
  }
  taken.add(candidate);
  return candidate;
}

export function zipFiles(entries) {
  const files = {};
  // fflate cannot store a file named '__proto__' (it sets the prototype), so reserve
  // that key and any such file gets a suffix instead.
  const taken = new Set(['__proto__']);
  for (const { name, bytes } of entries) {
    files[uniqueName(sanitizeName(name), taken)] = bytes;
  }
  return zipSync(files, { level: 6 });
}

export function unzipNames(bytes) {
  return Object.keys(unzipSync(bytes));
}
