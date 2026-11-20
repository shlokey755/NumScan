// Scan history: the last 50 things NumScan copied, newest first. It is one JSON file in
// the app's private storage. Nothing is sent anywhere.
// The file system module is loaded only when used, so a build without it still opens.
export const MAX_HISTORY = 50;
const FILE_NAME = 'numscan-history.json';

// Adds an entry to the front and keeps only the last MAX_HISTORY.
export function pushEntry(list, entry) {
  return [entry, ...list].slice(0, MAX_HISTORY);
}

export function removeEntry(list, id) {
  return list.filter((entry) => entry.id !== id);
}

// Reads stored JSON. Anything that isn't a valid entry is dropped, so a damaged
// file never breaks the screen.
export function parseHistory(text) {
  let list;
  try {
    list = JSON.parse(text);
  } catch (e) {
    return [];
  }
  if (!Array.isArray(list)) return [];
  return list
    .filter((entry) => entry && typeof entry.id === 'string' && typeof entry.text === 'string')
    .slice(0, MAX_HISTORY);
}

function historyFile() {
  const FileSystem = require('expo-file-system');
  return new FileSystem.File(FileSystem.Paths.document, FILE_NAME);
}

// Writes are queued so that quick batch scans can't overwrite each other.
let queue = Promise.resolve();
let cache = null;

function serial(task) {
  const run = queue.then(task, task);
  queue = run.catch(() => {});
  return run;
}

async function load() {
  if (cache) return cache;
  const file = historyFile();
  cache = file.exists ? parseHistory(await file.text()) : [];
  return cache;
}

async function store(list) {
  const file = historyFile();
  file.create({ overwrite: true });
  file.write(JSON.stringify(list));
  cache = list;
}

// Records one copied item. Fire and forget: a failure here must never block a copy.
export function rememberScan(label, text) {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label,
    text,
    at: Date.now(),
  };
  return serial(async () => store(pushEntry(await load(), entry))).catch(() => {});
}

export function getHistory() {
  return serial(async () => [...(await load())]);
}

export function deleteHistoryEntry(id) {
  return serial(async () => {
    const next = removeEntry(await load(), id);
    await store(next);
    return next;
  });
}

export function clearHistory() {
  return serial(async () => {
    await store([]);
    return [];
  });
}
