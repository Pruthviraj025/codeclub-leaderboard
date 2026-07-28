const express = require('express');
const axios = require('axios');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

let cache = { data: null, fetchedAt: 0 };
const CACHE_MS = 5 * 60 * 1000; // CF contest list barely changes — 5min cache is plenty

function detectDivision(name) {
  const n = name.toLowerCase();
  if (/div\.?\s*1\s*\+?\s*2|div\.?\s*1\.5/.test(n)) return 'Div. 1 + 2';
  if (/div\.?\s*1\b/.test(n)) return 'Div. 1';
  if (/div\.?\s*2\b/.test(n)) return 'Div. 2';
  if (/div\.?\s*3\b/.test(n)) return 'Div. 3';
  if (/div\.?\s*4\b/.test(n)) return 'Div. 4';
  if (/educational/.test(n)) return 'Educational';
  if (/global/.test(n)) return 'Global';
  return 'Other';
}

// GET /api/contests — recent + upcoming CF contests, grouped by division
router.get('/', requireAuth, async (req, res) => {
  try {
    if (cache.data && Date.now() - cache.fetchedAt < CACHE_MS) {
      return res.json(cache.data);
    }

    const response = await axios.get('https://codeforces.com/api/contest.list', { timeout: 10000 });
    if (response.data.status !== 'OK') throw new Error('CF API returned non-OK status');

    const contests = response.data.result
      .filter(c => c.phase === 'BEFORE' || c.phase === 'CODING' || c.phase === 'FINISHED')
      .slice(0, 60) // most recent/relevant slice — CF returns newest first
      .map(c => ({
        id: c.id,
        name: c.name,
        phase: c.phase,
        startTimeSeconds: c.startTimeSeconds,
        durationSeconds: c.durationSeconds,
        division: detectDivision(c.name),
        url: `https://codeforces.com/contest/${c.id}`
      }));

    const grouped = {};
    for (const c of contests) {
      if (!grouped[c.division]) grouped[c.division] = [];
      grouped[c.division].push(c);
    }

    const payload = { contests, grouped };
    cache = { data: payload, fetchedAt: Date.now() };
    res.json(payload);
  } catch (err) {
    res.status(502).json({ error: 'Could not fetch contests from Codeforces: ' + err.message });
  }
});

module.exports = router;
