// Counts for a piece of text: words, characters, sentences, paragraphs and reading time.
// Pure logic: no React or React Native imports, so Node can run it.

const WORDS_PER_MINUTE = 200;
const HAS_LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;
const EDGE_PUNCTUATION = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;

// Counts code points, so an emoji counts as one character.
function countChars(text) {
  return Array.from(text).length;
}

// A word is a run of non-space characters with at least one letter or digit.
// So "don't" and "well-known" are one word each, and "--" is not a word.
// Sentences end at . ! or ? (a run of them counts once). Paragraphs are blocks
// separated by a blank line. Reading time is 200 words a minute, rounded up.
export function textStats(text) {
  // A byte-order mark is not text. Windows line endings count as one line break.
  const clean = String(text ?? '').replace(/^﻿/, '').replace(/\r\n?/g, '\n');

  const words = clean
    .split(/\s+/)
    .filter((token) => HAS_LETTER_OR_DIGIT.test(token));

  // Length is measured from the first letter or digit to the last, so "Hello," is 5.
  const wordLength = words.reduce(
    (total, word) => total + countChars(word.replace(EDGE_PUNCTUATION, '')),
    0,
  );

  const sentences = clean
    .split(/[.!?]+/)
    .filter((part) => HAS_LETTER_OR_DIGIT.test(part)).length;

  const paragraphs = clean
    .split(/\n\s*\n/)
    .filter((block) => block.trim() !== '').length;

  return {
    words: words.length,
    characters: countChars(clean),
    charactersNoSpaces: countChars(clean.replace(/\s/g, '')),
    sentences,
    paragraphs,
    readingMinutes: Math.ceil(words.length / WORDS_PER_MINUTE),
    averageWordLength:
      words.length === 0 ? 0 : Math.round((wordLength / words.length) * 10) / 10,
  };
}
