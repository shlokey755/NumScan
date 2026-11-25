// Changes letter case, and joins words into code-style names such as camelCase and snake_case.
// Pure logic: no React, so Node can test it.

export const CASE_STYLES = [
  { value: 'upper', label: 'UPPER CASE' },
  { value: 'lower', label: 'lower case' },
  { value: 'title', label: 'Title Case' },
  { value: 'sentence', label: 'Sentence case' },
  { value: 'camel', label: 'camelCase' },
  { value: 'pascal', label: 'PascalCase' },
  { value: 'snake', label: 'snake_case' },
  { value: 'kebab', label: 'kebab-case' },
  { value: 'constant', label: 'CONSTANT_CASE' },
];

// Splits text into words. Breaks at spaces, ASCII punctuation (including _ and -),
// and between camelCase humps. Letters beyond basic Latin stay inside words.
export function splitWords(text) {
  return String(text ?? '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .split(/[\s!-\/:-@\[-`{-~]+/)
    .filter(Boolean);
}

const cap = (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

// Converts text to one of CASE_STYLES. Prose styles keep the original line breaks and
// punctuation; code styles work on the words only. An unknown style throws.
export function convertCase(text, style) {
  const source = String(text ?? '');
  switch (style) {
    case 'upper':
      return source.toUpperCase();
    case 'lower':
      return source.toLowerCase();
    case 'title':
      return source.toLowerCase().replace(/(^|\s)(\S)/g, (_, lead, ch) => lead + ch.toUpperCase());
    case 'sentence':
      return source.toLowerCase().replace(/(^|[.!?]\s+)(\S)/g, (_, lead, ch) => lead + ch.toUpperCase());
    case 'camel':
      return splitWords(source).map((w, i) => (i === 0 ? w.toLowerCase() : cap(w))).join('');
    case 'pascal':
      return splitWords(source).map(cap).join('');
    case 'snake':
      return splitWords(source).map((w) => w.toLowerCase()).join('_');
    case 'kebab':
      return splitWords(source).map((w) => w.toLowerCase()).join('-');
    case 'constant':
      return splitWords(source).map((w) => w.toUpperCase()).join('_');
    default:
      throw new Error('Unknown case style.');
  }
}
