const express = require('express');
const axios = require('axios');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

let cache = { data: null, fetchedAt: 0 };
const CACHE_MS = 5 * 60 * 1000; 

const DIVISION_ORDER = ['Div. 1', 'Div. 2', 'Div. 3', 'Div. 4', 'Div. 1 + 2', 'Educational', 'Global', 'Other'];
const LEETCODE_CATEGORIES = ['Upcoming & Live', 'Weekly Contest', 'Biweekly Contest', 'Past Contests'];
const CODECHEF_CATEGORIES = ['Upcoming & Live', 'Starters', 'Cook-Off', 'Lunchtime', 'DSA Challenges', 'Other Contests'];
const ATCODER_CATEGORIES = ['Upcoming & Live', 'ABC', 'ARC', 'AGC', 'AHC', 'Other Contests'];

function detectCFDivision(name) {
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

function detectLCGroup(name, phase) {
  if (phase === 'BEFORE' || phase === 'CODING') return 'Upcoming & Live';
  if (/biweekly/i.test(name)) return 'Biweekly Contest';
  if (/weekly/i.test(name)) return 'Weekly Contest';
  return 'Past Contests';
}

function detectCCGroup(name, code, phase) {
  if (phase === 'BEFORE' || phase === 'CODING') return 'Upcoming & Live';
  const n = (name || '').toLowerCase();
  const c = (code || '').toUpperCase();
  if (/starter/i.test(n) || c.startsWith('START')) return 'Starters';
  if (/cook/i.test(n) || c.startsWith('COOK')) return 'Cook-Off';
  if (/lunch/i.test(n) || c.startsWith('LTIME')) return 'Lunchtime';
  if (/dsa|munch|prep|placement/i.test(n) || c.startsWith('DSAMONDAY') || c.startsWith('PLACEPREP')) return 'DSA Challenges';
  return 'Other Contests';
}

function detectACGroup(name, id, phase) {
  if (phase === 'BEFORE' || phase === 'CODING') return 'Upcoming & Live';
  const i = (id || '').toLowerCase();
  const n = (name || '').toLowerCase();
  if (i.startsWith('abc') || n.includes('beginner')) return 'ABC';
  if (i.startsWith('arc') || n.includes('regular')) return 'ARC';
  if (i.startsWith('agc') || n.includes('grand')) return 'AGC';
  if (i.startsWith('ahc') || n.includes('heuristic')) return 'AHC';
  return 'Other Contests';
}

async function fetchCodeforcesContests() {
  try {
    const response = await axios.get('https://codeforces.com/api/contest.list', { timeout: 8000 });
    if (response.data?.status !== 'OK') throw new Error('CF API returned non-OK status');

    const contests = (response.data.result || [])
      .filter(c => c.phase === 'BEFORE' || c.phase === 'CODING' || c.phase === 'FINISHED')
      .slice(0, 50)
      .map(c => ({
        id: `cf-${c.id}`,
        rawId: c.id,
        name: c.name,
        platform: 'codeforces',
        phase: c.phase,
        startTimeSeconds: c.startTimeSeconds,
        durationSeconds: c.durationSeconds,
        division: detectCFDivision(c.name),
        url: c.phase === 'BEFORE'
          ? `https://codeforces.com/contestRegistration/${c.id}`
          : `https://codeforces.com/contest/${c.id}`
      }));

    const grouped = {};
    for (const c of contests) {
      if (!grouped[c.division]) grouped[c.division] = [];
      grouped[c.division].push(c);
    }

    return { contests, grouped };
  } catch (err) {
    console.error('Error fetching CF contests:', err.message);
    return { contests: [], grouped: {} };
  }
}

async function fetchLeetCodeContests() {
  try {
    const query = `
      query {
        allContests {
          title
          titleSlug
          startTime
          duration
          isVirtual
        }
      }
    `;

    const response = await axios.post(
      'https://leetcode.com/graphql',
      { query },
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Content-Type': 'application/json'
        },
        timeout: 8000
      }
    );

    const raw = response.data?.data?.allContests || [];
    const nowSec = Math.floor(Date.now() / 1000);

    const contests = raw
      .filter(c => c && c.title && c.titleSlug && !c.isVirtual)
      .slice(0, 50) 
      .map(c => {
        const start = Number(c.startTime) || 0;
        const duration = Number(c.duration) || 5400; 
        let phase = 'FINISHED';

        if (nowSec < start) {
          phase = 'BEFORE';
        } else if (nowSec >= start && nowSec <= start + duration) {
          phase = 'CODING';
        }

        const category = detectLCGroup(c.title, phase);

        return {
          id: `lc-${c.titleSlug}`,
          name: c.title,
          titleSlug: c.titleSlug,
          platform: 'leetcode',
          phase,
          startTimeSeconds: start,
          durationSeconds: duration,
          division: category,
          url: `https://leetcode.com/contest/${c.titleSlug}`
        };
      });

    const grouped = {};
    for (const c of contests) {
      if (!grouped[c.division]) grouped[c.division] = [];
      grouped[c.division].push(c);
    }

    return { contests, grouped };
  } catch (err) {
    console.error('Error fetching LeetCode contests:', err.message);
    return { contests: [], grouped: {} };
  }
}

async function fetchCodeChefContests() {
  try {
    const response = await axios.get('https://www.codechef.com/api/list/contests/all', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01'
      },
      timeout: 8000
    });

    if (!response.data || (response.data.status !== 'success' && !response.data.future_contests)) {
      throw new Error('CodeChef API returned invalid status');
    }

    const { present_contests = [], future_contests = [], past_contests = [] } = response.data;
    const nowSec = Math.floor(Date.now() / 1000);

    const rawList = [
      ...present_contests.map(c => ({ ...c, _defaultPhase: 'CODING' })),
      ...future_contests.map(c => ({ ...c, _defaultPhase: 'BEFORE' })),
      ...past_contests.slice(0, 40).map(c => ({ ...c, _defaultPhase: 'FINISHED' }))
    ];

    const seen = new Set();
    const contests = [];

    for (const c of rawList) {
      const code = c.contest_code;
      if (!code || seen.has(code)) continue;
      seen.add(code);

      const start = c.contest_start_date_iso || c.contest_start_date
        ? Math.floor(new Date(c.contest_start_date_iso || c.contest_start_date).getTime() / 1000)
        : 0;
      const durationSeconds = (Number(c.contest_duration) || 0) * 60;
      const end = c.contest_end_date_iso || c.contest_end_date
        ? Math.floor(new Date(c.contest_end_date_iso || c.contest_end_date).getTime() / 1000)
        : (start + durationSeconds);

      let phase = c._defaultPhase || 'FINISHED';
      if (start > 0) {
        if (nowSec < start) {
          phase = 'BEFORE';
        } else if (nowSec >= start && (end ? nowSec <= end : false)) {
          phase = 'CODING';
        } else {
          phase = 'FINISHED';
        }
      }

      const division = detectCCGroup(c.contest_name, c.contest_code, phase);

      contests.push({
        id: `cc-${code}`,
        rawId: c.contest_id,
        code,
        name: c.contest_name || code,
        platform: 'codechef',
        phase,
        startTimeSeconds: start,
        durationSeconds,
        division,
        url: `https://www.codechef.com/${code}`
      });
    }

    const grouped = {};
    for (const c of contests) {
      if (!grouped[c.division]) grouped[c.division] = [];
      grouped[c.division].push(c);
    }

    return { contests, grouped };
  } catch (err) {
    console.error('Error fetching CodeChef contests:', err.message);
    return { contests: [], grouped: {} };
  }
}

async function fetchAtCoderContests() {
  try {
    const response = await axios.get('https://kenkoooo.com/atcoder/resources/contests.json', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });

    if (!Array.isArray(response.data)) {
      return { contests: [], grouped: {} };
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const sorted = response.data
      .filter(c => c && c.id && c.start_epoch_second)
      .sort((a, b) => b.start_epoch_second - a.start_epoch_second);

    const relevant = sorted.filter(c => {
      const end = c.start_epoch_second + (c.duration_second || 0);
      return end >= nowSec - 30 * 24 * 3600;
    }).slice(0, 60);

    const contests = relevant.map(c => {
      const start = c.start_epoch_second;
      const durationSeconds = c.duration_second || 0;
      const end = start + durationSeconds;
      let phase = 'FINISHED';
      if (nowSec < start) {
        phase = 'BEFORE';
      } else if (nowSec >= start && nowSec <= end) {
        phase = 'CODING';
      }

      const division = detectACGroup(c.title, c.id, phase);

      return {
        id: `ac-${c.id}`,
        rawId: c.id,
        code: c.id,
        name: c.title || c.id,
        platform: 'atcoder',
        phase,
        startTimeSeconds: start,
        durationSeconds,
        division,
        url: `https://atcoder.jp/contests/${c.id}`
      };
    });

    const grouped = {};
    for (const c of contests) {
      if (!grouped[c.division]) grouped[c.division] = [];
      grouped[c.division].push(c);
    }

    return { contests, grouped };
  } catch (err) {
    console.error('Error fetching AtCoder contests:', err.message);
    return { contests: [], grouped: {} };
  }
}

router.get('/', requireAuth, async (req, res) => {
  try {
    if (cache.data && Date.now() - cache.fetchedAt < CACHE_MS) {
      return res.json(cache.data);
    }

    const [cfRes, lcRes, ccRes, acRes] = await Promise.allSettled([
      fetchCodeforcesContests(),
      fetchLeetCodeContests(),
      fetchCodeChefContests(),
      fetchAtCoderContests()
    ]);

    const cfData = cfRes.status === 'fulfilled' ? cfRes.value : { contests: [], grouped: {} };
    const lcData = lcRes.status === 'fulfilled' ? lcRes.value : { contests: [], grouped: {} };
    const ccData = ccRes.status === 'fulfilled' ? ccRes.value : { contests: [], grouped: {} };
    const acData = acRes.status === 'fulfilled' ? acRes.value : { contests: [], grouped: {} };

    const allContests = [...cfData.contests, ...lcData.contests, ...ccData.contests, ...acData.contests];

    const stats = {
      totalCount: allContests.length,
      cfCount: cfData.contests.length,
      lcCount: lcData.contests.length,
      ccCount: ccData.contests.length,
      acCount: acData.contests.length,
      upcomingCount: allContests.filter(c => c.phase === 'BEFORE').length,
      liveCount: allContests.filter(c => c.phase === 'CODING').length
    };

    const payload = {
      codeforces: cfData,
      leetcode: lcData,
      codechef: ccData,
      atcoder: acData,
      allContests,
      stats
    };

    cache = { data: payload, fetchedAt: Date.now() };
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch contests: ' + err.message });
  }
});

module.exports = router;
