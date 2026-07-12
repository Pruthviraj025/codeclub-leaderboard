// Fixed CF rating -> points mapping. Unrated problems are excluded entirely (never scored).
const RATING_MAP = {
  800: 100, 900: 200, 1000: 500, 1100: 600, 1200: 900,
  1300: 1000, 1400: 1300, 1500: 1400, 1600: 1700, 1700: 1800,
  1800: 2100, 1900: 2200, 2000: 2500, 2100: 2600, 2200: 2900,
  2300: 3000, 2400: 3300, 2500: 3400, 2600: 3700, 2700: 3800,
  2800: 4100, 2900: 4200, 3000: 4500, 3100: 4600, 3200: 4900,
  3300: 5000, 3400: 5300, 3500: 5400
};

/**
 * Resolves points for a given CF problem rating.
 * Returns null for unrated (undefined) or out-of-range ratings — caller must skip these.
 */
function resolvePoints(rating) {
  if (rating == null) return null; // unrated problem
  if (!Object.prototype.hasOwnProperty.call(RATING_MAP, rating)) return null; // outside 800-3500 or non-standard step
  return RATING_MAP[rating];
}

module.exports = { RATING_MAP, resolvePoints };
