// Pure lab helpers: unit conversion, dilution, error and statistics.
// No platform imports, so the same module runs in Node tests and in the app.

// Each factor converts a unit to its category base (m, kg or L).
const FACTORS = {
  length: { m: 1, cm: 0.01, mm: 0.001, um: 1e-6, nm: 1e-9, km: 1000, in: 0.0254, ft: 0.3048 },
  mass: { kg: 1, g: 1e-3, mg: 1e-6, ug: 1e-9, lb: 0.45359237, oz: 0.028349523125 },
  volume: { L: 1, mL: 1e-3, uL: 1e-6 },
};

// Temperature is an offset scale, not a factor, so each unit maps to and from kelvin.
const TEMPERATURE = {
  C: { toK: (v) => v + 273.15, fromK: (k) => k - 273.15 },
  F: { toK: (v) => ((v - 32) * 5) / 9 + 273.15, fromK: (k) => ((k - 273.15) * 9) / 5 + 32 },
  K: { toK: (v) => v, fromK: (k) => k },
};

// A Map avoids prototype keys such as "constructor" matching as units.
const UNIT_CATEGORY = new Map();
for (const [category, table] of Object.entries(FACTORS)) {
  for (const unit of Object.keys(table)) UNIT_CATEGORY.set(unit, category);
}
for (const unit of Object.keys(TEMPERATURE)) UNIT_CATEGORY.set(unit, 'temperature');

function categoryOf(unit) {
  const category = UNIT_CATEGORY.get(unit);
  if (category === undefined) {
    throw new Error(`convertUnits: unknown unit "${unit}". Supported: ${[...UNIT_CATEGORY.keys()].join(', ')}`);
  }
  return category;
}

export function convertUnits(value, from, to) {
  if (!Number.isFinite(value)) {
    throw new Error(`convertUnits: value must be a finite number, got ${value}`);
  }
  const category = categoryOf(from);
  const toCategory = categoryOf(to);
  if (category !== toCategory) {
    throw new Error(`convertUnits: cannot convert ${from} (${category}) to ${to} (${toCategory}); units must share a category`);
  }
  if (category === 'temperature') {
    return TEMPERATURE[to].fromK(TEMPERATURE[from].toK(value));
  }
  // Route through the base unit so one factor table covers every pair.
  const table = FACTORS[category];
  return (value * table[from]) / table[to];
}

const DILUTION_FIELDS = ['c1', 'v1', 'c2', 'v2'];

export function solveDilution(input = {}) {
  const missing = DILUTION_FIELDS.filter((key) => input[key] === null || input[key] === undefined);
  if (missing.length !== 1) {
    throw new Error(`solveDilution: exactly one of c1, v1, c2, v2 must be missing, got ${missing.length}`);
  }
  const field = missing[0];
  for (const key of DILUTION_FIELDS) {
    if (key !== field && !(Number.isFinite(input[key]) && input[key] > 0)) {
      throw new Error(`solveDilution: ${key} must be a positive finite number, got ${input[key]}`);
    }
  }
  // C1*V1 = C2*V2, so each term is the product of the other pair over the remaining one.
  const { c1, v1, c2, v2 } = input;
  const solved = {
    c1: (c2 * v2) / v1,
    v1: (c2 * v2) / c1,
    c2: (c1 * v1) / v2,
    v2: (c1 * v1) / c2,
  }[field];
  // Overflow or underflow can make the result unusable even with valid inputs.
  if (!Number.isFinite(solved)) {
    throw new Error(`solveDilution: solved ${field} is not finite (${solved})`);
  }
  return { field, value: solved };
}

export function percentError(measured, accepted) {
  if (!Number.isFinite(measured) || !Number.isFinite(accepted)) {
    throw new Error('percentError: measured and accepted must be finite numbers');
  }
  if (accepted === 0) {
    throw new Error('percentError: accepted value must not be 0');
  }
  return (Math.abs(measured - accepted) / Math.abs(accepted)) * 100;
}

export function summarize(values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error('summarize: need a non-empty array of numbers');
  }
  const n = values.length;
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  // Index loop, not forEach, so sparse holes are caught as non-finite too.
  for (let i = 0; i < n; i++) {
    const v = values[i];
    if (!Number.isFinite(v)) {
      throw new Error(`summarize: value at index ${i} is not a finite number (${v})`);
    }
    sum += v;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const mean = sum / n;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(n / 2);
  const median = n % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  // Two-pass sum of squares around the mean, which is more stable than E[x^2] - mean^2.
  let sampleSd = null;
  if (n >= 2) {
    let ss = 0;
    for (let i = 0; i < n; i++) ss += (values[i] - mean) ** 2;
    sampleSd = Math.sqrt(ss / (n - 1));
  }
  const sem = sampleSd === null ? null : sampleSd / Math.sqrt(n);
  return { n, mean, median, min, max, sampleSd, sem };
}

export function linearFit(xs, ys) {
  if (!Array.isArray(xs) || !Array.isArray(ys) || xs.length !== ys.length) {
    throw new Error('linearFit: xs and ys must be arrays of the same length');
  }
  const n = xs.length;
  if (n < 2) {
    throw new Error('linearFit: need at least 2 points');
  }
  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(xs[i]) || !Number.isFinite(ys[i])) {
      throw new Error(`linearFit: point ${i} is not a finite number`);
    }
  }
  // Checked directly: centred sums can be tiny but non-zero for equal xs after rounding.
  if (xs.every((x) => x === xs[0])) {
    throw new Error('linearFit: all xs are equal, so the slope is undefined');
  }

  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += xs[i];
    sumY += ys[i];
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    sxx += dx * dx;
    sxy += dx * (ys[i] - meanY);
  }
  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;

  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const predicted = intercept + slope * xs[i];
    ssRes += (ys[i] - predicted) ** 2;
    ssTot += (ys[i] - meanY) ** 2;
  }
  // With no spread in ys the line fits exactly, so r2 is defined as 1.
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  return { slope, intercept, r2 };
}

// Plain decimal or scientific notation only, so Infinity, NaN and hex are rejected.
const NUMBER_TOKEN = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

export function parseNumbers(text) {
  if (typeof text !== 'string') {
    throw new TypeError('parseNumbers: text must be a string');
  }
  const values = [];
  const bad = [];
  for (const token of text.split(/[\s,;]+/)) {
    // Leading or trailing separators produce empty tokens, which are skipped.
    if (token === '') continue;
    const n = Number(token);
    if (NUMBER_TOKEN.test(token) && Number.isFinite(n)) {
      values.push(n);
    } else {
      bad.push(token);
    }
  }
  return { values, bad };
}
