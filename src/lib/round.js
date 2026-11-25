// Rounds away floating-point noise (0.1 + 0.2 shows as 0.3) and turns -0 into 0.
export function roundTo(value, places = 8) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor + 0;
}
