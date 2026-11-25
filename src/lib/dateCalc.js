// Date helpers for due dates and deadlines. Pure JavaScript, offline.
// Dates are kept as UTC milliseconds at midnight, so daylight saving never shifts a day.
// Formatting uses our own names, not Intl, because Hermes may not support Intl.
const DAY = 86400000;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function daysInMonth(year, month) {
  // Day 0 of the next month is the last day of this one. `month` is 1 to 12.
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// "2026-03-31" -> UTC milliseconds. Throws a plain message for a bad or impossible date.
export function parseDate(text) {
  const match = /^\s*(\d{4})-(\d{2})-(\d{2})\s*$/.exec(text ?? '');
  if (!match) throw new Error('Use the form 2026-03-31 (year, month, day).');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    throw new Error(`${text.trim()} is not a real date.`);
  }
  return Date.UTC(year, month - 1, day);
}

// Today on the device's clock, as UTC milliseconds at midnight.
export function todayMs(now = new Date()) {
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

// UTC milliseconds -> "2026-03-31", for filling a text field.
export function toIso(ms) {
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

// Calendar days from a to b. Negative when b is earlier.
export function daysBetween(a, b) {
  return Math.round((b - a) / DAY);
}

export function addDays(ms, n) {
  return ms + n * DAY;
}

export function isWeekend(ms) {
  const weekday = new Date(ms).getUTCDay();
  return weekday === 0 || weekday === 6;
}

// Moves n working days (Monday to Friday) forward, or back when n is negative.
export function addWorkingDays(ms, n) {
  const step = n < 0 ? -DAY : DAY;
  let date = ms;
  let left = Math.abs(n);
  while (left > 0) {
    date += step;
    if (!isWeekend(date)) left--;
  }
  return date;
}

// Working days from a to b, counting b but not a. Negative when b is earlier.
export function workingDaysBetween(a, b) {
  if (a === b) return 0;
  const step = b > a ? DAY : -DAY;
  const sign = step > 0 ? 1 : -1;
  let count = 0;
  for (let d = a + step; sign > 0 ? d <= b : d >= b; d += step) {
    if (!isWeekend(d)) count += sign;
  }
  return count;
}

// "Mon 2 Mar 2026"
export function formatDate(ms) {
  const d = new Date(ms);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
