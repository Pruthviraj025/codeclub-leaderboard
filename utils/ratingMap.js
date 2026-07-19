// Fixed CF rating -> points mapping. Unrated problems now score a flat 100.
const RATING_MAP = {
  800: 200, 900: 300, 1000: 600, 1100: 700, 1200: 1000,
  1300: 1100, 1400: 1400, 1500: 1500, 1600: 1800, 1700: 1900,
  1800: 2200, 1900: 2300, 2000: 2600, 2100: 2700, 2200: 3000,
  2300: 3100, 2400: 3400, 2500: 3500, 2600: 3800, 2700: 3900,
  2800: 4200, 2900: 4300, 3000: 4600, 3100: 4700, 3200: 5000,
  3300: 5100, 3400: 5400, 3500: 5500
};

const UNRATED_POINTS = 100;

/**
 * Resolves points for a given CF problem rating.
 * Unrated (undefined/null rating) now scores UNRATED_POINTS.
 * Returns null only for an out-of-range/non-standard rating — caller must skip these.
 */
function resolvePoints(rating) {
  if (rating == null) return UNRATED_POINTS; // unrated problem
  if (!Object.prototype.hasOwnProperty.call(RATING_MAP, rating)) return null; // outside 800-3500 or non-standard step
  return RATING_MAP[rating];
}

module.exports = { RATING_MAP, UNRATED_POINTS, resolvePoints };
