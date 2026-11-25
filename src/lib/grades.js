// Pure grade helpers: weighted average, the score still needed, and GPA.
// No platform imports, so the same module runs in Node tests and in the app.

const SCORE_WEIGHT = [
  { key: 'score', label: 'Score' },
  { key: 'weight', label: 'Weight' },
];

const POINTS_CREDITS = [
  { key: 'points', label: 'Grade points' },
  { key: 'credits', label: 'Credits' },
];

// Throws unless value is a finite number that is not negative.
function checkNumber(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label} must be a number. Got ${value}.`);
  }
  if (value < 0) {
    throw new Error(`${label} must not be negative. Got ${value}.`);
  }
  return value;
}

// Returns checked copies of the rows, so callers get clear errors instead of NaN.
function checkRows(rows, fields) {
  if (!Array.isArray(rows)) throw new Error('Rows must be a list.');
  return rows.map((row) => {
    const out = {};
    for (const { key, label } of fields) out[key] = checkNumber(row?.[key], label);
    return out;
  });
}

// Rounds to 2 decimals, half away from zero.
function round2(value) {
  return (Math.sign(value) * Math.round(Math.abs(value) * 100)) / 100;
}

// Weighted average of [{ score, weight }]. Weights do not need to add to 100:
// the total is divided by the total weight. With no weight at all, average is null.
export function weightedAverage(rows) {
  const valid = checkRows(rows, SCORE_WEIGHT);
  let totalWeight = 0;
  let total = 0;
  for (const { score, weight } of valid) {
    totalWeight += weight;
    total += score * weight;
  }
  return {
    average: totalWeight === 0 ? null : total / totalWeight,
    totalWeight,
  };
}

// The score needed on the remaining weight to finish at targetPercent.
// done: [{ score, weight }], where weight is a percent of the whole course.
// Returns { required, possible }. required is a percent, rounded to 2 decimals.
// possible is false when the required score is over 100 or when no weight remains.
export function neededScore({ done = [], targetPercent, remainingWeight } = {}) {
  const finished = checkRows(done, SCORE_WEIGHT);
  const target = checkNumber(targetPercent, 'Target');
  const remaining = checkNumber(remainingWeight, 'Remaining weight');

  // Points already earned, as a percent of the whole course.
  let earned = 0;
  for (const { score, weight } of finished) earned += (score * weight) / 100;

  if (remaining === 0) return { required: null, possible: false };

  const required = round2((target - earned) / (remaining / 100));
  return { required, possible: required <= 100 };
}

// Grade point average: points times credits, summed, over total credits.
// Throws when total credits is 0, because the average is undefined.
export function gpa(rows) {
  const valid = checkRows(rows, POINTS_CREDITS);
  let credits = 0;
  let weighted = 0;
  for (const row of valid) {
    credits += row.credits;
    weighted += row.points * row.credits;
  }
  if (credits === 0) {
    throw new Error('Total credits must be more than 0 to work out a GPA.');
  }
  return { gpa: weighted / credits, credits };
}
