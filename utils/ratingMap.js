const RATING_MAP = {
  800: 200, 900: 300, 1000: 600, 1100: 700, 1200: 1000,
  1300: 1100, 1400: 1400, 1500: 1500, 1600: 1800, 1700: 1900,
  1800: 2200, 1900: 2300, 2000: 2600, 2100: 2700, 2200: 3000,
  2300: 3100, 2400: 3400, 2500: 3500, 2600: 3800, 2700: 3900,
  2800: 4200, 2900: 4300, 3000: 4600, 3100: 4700, 3200: 5000,
  3300: 5100, 3400: 5400, 3500: 5500
};

const UNRATED_POINTS = 100;

function resolvePoints(rating) {
  if (rating == null || rating === 0) return UNRATED_POINTS; 
  if (!Object.prototype.hasOwnProperty.call(RATING_MAP, rating)) return null; 
  return RATING_MAP[rating];
}

module.exports = { RATING_MAP, UNRATED_POINTS, resolvePoints };
