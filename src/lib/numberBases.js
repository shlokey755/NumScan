// Number bases, two's complement and bitwise logic for the bench.
// Pure logic: no React or React Native imports, so Node can run it.

const BASES = [2, 8, 10, 16];
const WIDTHS = [8, 16, 32, 64];
const DIGITS = '0123456789ABCDEF';
const BASE_NAMES = { 2: 'binary', 8: 'octal', 10: 'decimal', 16: 'hex' };

function assertBigInt(value) {
  if (typeof value !== 'bigint') throw new TypeError('Expected a BigInt.');
}

// Reads text in a base (2, 8, 10 or 16). Spaces and underscores are ignored and one
// leading minus is allowed. Returns a BigInt. Throws, naming the digit, if one is not valid.
export function parseInBase(text, base) {
  if (!BASES.includes(base)) throw new Error('Base must be 2, 8, 10 or 16.');
  const cleaned = String(text ?? '').replace(/[\s_]/g, '');
  const negative = cleaned.startsWith('-');
  const digits = negative ? cleaned.slice(1) : cleaned;
  if (digits === '') throw new Error('Enter a number.');

  const big = BigInt(base);
  let value = 0n;
  for (const ch of digits) {
    const d = DIGITS.indexOf(ch.toUpperCase());
    if (d < 0 || d >= base) {
      throw new Error(`"${ch}" is not a valid ${BASE_NAMES[base]} digit.`);
    }
    value = value * big + BigInt(d);
  }
  return negative ? -value : value;
}

// The value in binary, octal, decimal and hex. Hex is uppercase. Negatives keep a minus sign.
export function toBases(value) {
  assertBigInt(value);
  return {
    binary: value.toString(2),
    octal: value.toString(8),
    decimal: value.toString(10),
    hex: value.toString(16).toUpperCase(),
  };
}

// The unsigned bit pattern of a value in a width (8, 16, 32 or 64), as a BigInt.
// Accepts -2^(bits-1) up to 2^bits - 1. Throws when the value does not fit.
export function toTwosComplement(value, bits) {
  assertBigInt(value);
  if (!WIDTHS.includes(bits)) throw new Error('Width must be 8, 16, 32 or 64 bits.');
  const size = 1n << BigInt(bits);
  const min = -(size >> 1n);
  const max = size - 1n;
  if (value < min || value > max) {
    throw new Error(`${value} does not fit in ${bits} bits. Use ${min} to ${max}.`);
  }
  return value < 0n ? value + size : value;
}

const OPERATIONS = {
  AND: (x, y) => x & y,
  OR: (x, y) => x | y,
  XOR: (x, y) => x ^ y,
};

// AND, OR or XOR on two numbers in a width. Each number is first turned into its
// two's-complement pattern for that width, so the result is an unsigned BigInt.
// The width is optional and defaults to 64.
export function bitwise(a, b, op, bits = 64) {
  if (!Object.prototype.hasOwnProperty.call(OPERATIONS, op)) {
    throw new Error('Operation must be AND, OR or XOR.');
  }
  return OPERATIONS[op](toTwosComplement(a, bits), toTwosComplement(b, bits));
}

// Groups binary digits in fours from the right: '11111011' becomes '1111 1011'.
export function groupBinary(text) {
  const digits = String(text ?? '').replace(/[\s_]/g, '');
  const groups = [];
  for (let end = digits.length; end > 0; end -= 4) {
    groups.unshift(digits.slice(Math.max(0, end - 4), end));
  }
  return groups.join(' ');
}
