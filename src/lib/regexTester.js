// Runs a regular expression over text and collects the matches.
// Pure logic: no React or React Native imports, so Node can run it.

const ALLOWED_FLAGS = 'ims';
const DEFAULT_LIMIT = 200;

// Removes the "Invalid regular expression: /.../: " part that the engine puts first.
function plainMessage(error) {
  const detail = error.message.replace(/^Invalid regular expression: \/[\s\S]*\/[a-z]*: /, '');
  return `Not a valid pattern: ${detail}.`;
}

// flags uses i, m and s only. The g flag is always added here, so matching goes on
// through the whole text. An empty pattern is not an error; it finds nothing.
// Returns { error, matches, total }. total counts every match, while matches holds at
// most `limit` of them. Never throws.
export function runRegex(pattern, flags = '', text = '', options = {}) {
  const limit = Number.isFinite(options?.limit) ? Math.max(0, options.limit) : DEFAULT_LIMIT;
  const none = { error: null, matches: [], total: 0 };
  if (!pattern) return none;

  const flagList = [...new Set(String(flags))];
  const badFlag = flagList.find((flag) => !ALLOWED_FLAGS.includes(flag));
  if (badFlag) {
    return { ...none, error: `Flag "${badFlag}" is not available. Use i, m or s.` };
  }

  let regex;
  try {
    regex = new RegExp(String(pattern), `g${flagList.join('')}`);
  } catch (error) {
    return { ...none, error: plainMessage(error) };
  }

  const input = String(text ?? '');
  const matches = [];
  let total = 0;
  let found;
  while ((found = regex.exec(input)) !== null) {
    total += 1;
    if (matches.length < limit) {
      matches.push({
        index: found.index,
        match: found[0],
        groups: found.slice(1),
        named: { ...(found.groups ?? {}) },
      });
    }
    // A zero-length match would be found again at the same place, so step past it.
    if (found[0] === '') regex.lastIndex += 1;
  }
  return { error: null, matches, total };
}
