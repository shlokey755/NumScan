// Solves a x² + b x + c = 0. Pure logic: no React, so Node can test it.
import { roundTo } from './round';

function checkNumbers(a, b, c) {
  [['a', a], ['b', b], ['c', c]].forEach(([name, value]) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(`${name} must be a number.`);
    }
  });
}

// Returns { kind, roots, discriminant, vertex }.
// kind is 'two', 'one', 'complex', 'linear', 'every' (0 = 0) or 'none' (0 = 5).
// Real roots are numbers. Complex roots are { real, imag } pairs, read as real ± imag·i.
// A zero a is solved as a linear equation, and vertex is left out.
export function solveQuadratic(a, b, c) {
  checkNumbers(a, b, c);
  if (a === 0) {
    if (b === 0) return { kind: c === 0 ? 'every' : 'none', roots: [] };
    return { kind: 'linear', roots: [roundTo(-c / b)] };
  }

  const discriminant = b * b - 4 * a * c;
  const vertex = { x: roundTo(-b / (2 * a)), y: roundTo(c - (b * b) / (4 * a)) };

  if (discriminant > 0) {
    const root = Math.sqrt(discriminant);
    const roots = [roundTo((-b - root) / (2 * a)), roundTo((-b + root) / (2 * a))].sort((x, y) => x - y);
    return { kind: 'two', roots, discriminant: roundTo(discriminant), vertex };
  }
  if (discriminant === 0) {
    return { kind: 'one', roots: [roundTo(-b / (2 * a))], discriminant: 0, vertex };
  }

  const real = roundTo(-b / (2 * a));
  const imag = roundTo(Math.sqrt(-discriminant) / (2 * Math.abs(a)));
  return {
    kind: 'complex',
    roots: [{ real, imag }, { real, imag: -imag }],
    discriminant: roundTo(discriminant),
    vertex,
  };
}
