// Everyday percentage questions. Pure logic: no React, so Node can test it.
import { roundTo } from './round';

function number(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${name} must be a number.`);
  }
  return value;
}

// What is a percent of a number? percentOf(15, 80) is 12.
export function percentOf(percent, value) {
  return roundTo((number(percent, 'The percent') * number(value, 'The number')) / 100);
}

// What percent is a part of a whole? whatPercent(12, 80) is 15.
export function whatPercent(part, whole) {
  number(part, 'The part');
  if (number(whole, 'The whole') === 0) throw new Error('The whole cannot be zero.');
  return roundTo((part * 100) / whole);
}

// The change from one value to another, as a percent of the starting value.
// percentChange(80, 100) is 25, and percentChange(100, 75) is -25.
export function percentChange(from, to) {
  number(from, 'The starting value');
  number(to, 'The new value');
  if (from === 0) throw new Error('The starting value cannot be zero.');
  return roundTo(((to - from) * 100) / Math.abs(from));
}
