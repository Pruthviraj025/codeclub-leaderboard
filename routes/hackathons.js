const express = require('express');
const axios = require('axios');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

let cache = {
  data: null,
  fetchedAt: 0
};
const CACHE_MS = 5 * 60 * 1000; // 5 minute cache

// Curated high-quality fallbacks if external APIs fail or timeout
const FALLBACK_HACKATHONS = [
  {
    id: 'unstop-fallback-1',
    title: 'Smart India Hackathon (SIH)',
    tagline: 'World\'s biggest open innovation model for university students',
    platform: 'unstop',
    url: 'https://unstop.com/hackathons/smart-india-hackathon',
    banner: 'https://d8it4huxumps7.cloudfront.net/uploads/images/150x150/uploadedManual-687b9de5a100d.png',
    logo: 'https://d8it4huxumps7.cloudfront.net/uploads/images/150x150/uploadedManual-687b9de5a100d.png',
    organizer: 'Ministry of Education & Unstop',
    mode: 'Hybrid',
    location: 'India',
    regEndsAt: new Date(Date.now() + 15 * 86400000).toISOString(),
    daysLeft: '15 days left',
    status: 'OPEN',
    participantsCount: 150000,
    prizes: '₹1,00,000 per problem statement',
    tags: ['AI/ML', 'Web', 'Government', 'Open Innovation']
  },
  {
    id: 'devfolio-fallback-1',
    title: 'ETHIndia 2026',
    tagline: 'Asia\'s Largest Web3 Hackathon for Developers & Innovators',
    platform: 'devfolio',
    url: 'https://ethindia.devfolio.co',
    banner: 'https://assets.devfolio.co/hackathons/c163f2c5e7bb4c7bb7acbdb3c572bfa3/assets/cover/283.jpeg',
    logo: 'https://assets.devfolio.co/hackathons/c163f2c5e7bb4c7bb7acbdb3c572bfa3/assets/logo/25.jpeg',
    organizer: 'Devfolio & ETHGlobal',
    mode: 'Offline',
    location: 'Bengaluru, Karnataka, India',
    regEndsAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    daysLeft: '30 days left',
    status: 'OPEN',
    participantsCount: 2000,
    prizes: '$100,000 in Prizes',
    tags: ['Web3', 'Blockchain', 'Solidity', 'In-Person']
  }
];

function formatUnstopPrize(item) {
  if (item.prizes_total && !isNaN(Number(item.prizes_total)) && Number(item.prizes_total) > 0) {
    return `₹${Number(item.prizes_total).toLocaleString()}`;
  }
  if (!item.prizes) return null;
  if (typeof item.prizes === 'string') return item.prizes;
  if (typeof item.prizes === 'object') {
    const cash = item.prizes.cash || item.prizes.max_cash;
    const curr = item.prizes.currencyCode || item.prizes.currency || '₹';
    if (cash && !isNaN(Number(cash)) && Number(cash) > 0) {
      return `${curr} ${Number(cash).toLocaleString()}`;
    }
    if (item.prizes.others && typeof item.prizes.others === 'string') {
      return item.prizes.others;
    }
  }
  return null;
}

async function fetchUnstopHackathons() {
  try {
    const res = await axios.get(
      'https://unstop.com/api/public/opportunity/search-result?opportunity=hackathons&per_page=25&oppstatus=open',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        },
        timeout: 8000
      }
    );

    const raw = res.data?.data?.data || [];
    return raw.map(item => {
      const banner = item.banner_mobile?.image_url || item.banner_desktop?.image_url || item.logoUrl2 || '';
      const rawUrl = item.public_url || '';
      const url = rawUrl
        ? (rawUrl.startsWith('http') ? rawUrl : `https://unstop.com/${rawUrl.replace(/^\//, '')}`)
        : 'https://unstop.com/hackathons';

      const isOnline = item.region === 'online' ||
                       item.subtype === 'online_coding_challenge' ||
                       (item.filters && item.filters.some(f => f.name && f.name.toLowerCase().includes('online')));

      const tags = [];
      if (item.subtype && typeof item.subtype === 'string') tags.push(item.subtype.replace(/_/g, ' '));
      tags.push(isOnline ? 'Online' : 'In-Person');
      if (item.opportunity_type && typeof item.opportunity_type === 'string') tags.push(item.opportunity_type);

      const regEndsAt = item.reg_end_date || item.start_date || item.updated_at || null;
      const prizeAmount = formatUnstopPrize(item);

      const daysLeftVal = (item.remainingDaysArray && typeof item.remainingDaysArray.text === 'string')
        ? item.remainingDaysArray.text
        : (typeof item.remain_days === 'string' ? item.remain_days : '');

      return {
        id: `unstop-${item.id}`,
        title: typeof item.title === 'string' ? item.title : 'Untitled Hackathon',
        tagline: item.seo_detail?.meta_description || item.organisation?.name || 'Exciting hackathon opportunity on Unstop',
        platform: 'unstop',
        url,
        banner: typeof banner === 'string' ? banner : '',
        logo: item.logoUrl2 || banner || '',
        organizer: item.organisation?.name || 'Unstop Partner',
        mode: isOnline ? 'Online' : 'Offline',
        location: isOnline ? 'Online' : (item.city || item.region || 'India'),
        regEndsAt: typeof regEndsAt === 'string' ? regEndsAt : null,
        daysLeft: daysLeftVal,
        status: 'OPEN',
        participantsCount: Number(item.registerations_count || item.viewsCount || 0),
        prizes: prizeAmount,
        tags: Array.from(new Set(tags.filter(t => typeof t === 'string')))
      };
    });
  } catch (err) {
    console.error('Error fetching Unstop hackathons:', err.message);
    return [];
  }
}

async function fetchDevfolioHackathons() {
  try {
    const res = await axios.get(
      'https://api.devfolio.co/api/hackathons?type=open&page=1&limit=25',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        },
        timeout: 8000
      }
    );

    const raw = res.data?.result || [];
    return raw.map(item => {
      const slug = item.slug || '';
      const devfolioUrl = slug ? `https://${slug}.devfolio.co` : 'https://devfolio.co/hackathons';
      const siteUrl = item.hackathon_setting?.site;
      const url = (siteUrl && siteUrl.startsWith('http')) ? siteUrl : devfolioUrl;

      const isOnline = item.is_online !== false;
      const isHybrid = item.hackathon_setting?.is_hybrid || false;
      const mode = isHybrid ? 'Hybrid' : (isOnline ? 'Online' : 'Offline');

      const locParts = [item.city, item.state, item.country].filter(Boolean);
      const location = isOnline ? 'Online' : (locParts.length ? locParts.join(', ') : 'Offline');

      const themes = (item.themes || []).map(t => t.name).filter(t => typeof t === 'string');
      const tags = [...themes];
      if (mode) tags.push(mode);

      const regEndsAt = item.hackathon_setting?.reg_ends_at || item.starts_at || item.ends_at || null;

      let tagline = item.tagline;
      if (!tagline && item.desc && typeof item.desc === 'string') {
        tagline = item.desc.replace(/#|\*|`|<[^>]*>/g, '').trim().slice(0, 140) + '...';
      }

      return {
        id: `devfolio-${item.uuid || slug || Math.random().toString(36).slice(2)}`,
        title: typeof item.name === 'string' ? item.name : 'Untitled Hackathon',
        tagline: typeof tagline === 'string' ? tagline : 'Build & showcase your projects on Devfolio',
        platform: 'devfolio',
        url,
        devfolioUrl,
        banner: item.cover_img || item.hackathon_setting?.logo || '',
        logo: item.hackathon_setting?.logo || item.favicon || item.cover_img || '',
        organizer: item.city || item.location || 'Devfolio Host',
        mode,
        location,
        regEndsAt: typeof regEndsAt === 'string' ? regEndsAt : null,
        daysLeft: '',
        status: 'OPEN',
        participantsCount: Number(item.participants_count || 0),
        prizes: null,
        tags: Array.from(new Set(tags.filter(t => typeof t === 'string')))
      };
    });
  } catch (err) {
    console.error('Error fetching Devfolio hackathons:', err.message);
    return [];
  }
}

async function fetchHackerEarthHackathons() {
  try {
    const res = await axios.get(
      'https://www.hackerearth.com/api/events/upcoming/',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        },
        timeout: 8000
      }
    );

    const raw = res.data?.response || [];
    return raw
      .filter(item => item && item.title && item.url)
      .map(item => {
        const title = String(item.title);
        const url = String(item.url);
        const tagline = item.description ? String(item.description).replace(/#|\*|`|<[^>]*>/g, '').trim().slice(0, 140) + '...' : 'HackerEarth Challenge & Hackathon';
        const banner = item.thumbnail || item.cover_image || '';
        const endDateStr = item.end_date ? `Ends ${item.end_date}` : '';

        return {
          id: `hackerearth-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          title,
          tagline,
          platform: 'hackerearth',
          url,
          banner: typeof banner === 'string' ? banner : '',
          logo: typeof banner === 'string' ? banner : '',
          organizer: 'HackerEarth',
          mode: 'Online',
          location: 'Online',
          regEndsAt: item.end_date || item.date || null,
          daysLeft: endDateStr,
          status: 'OPEN',
          participantsCount: 0,
          prizes: null,
          tags: ['HackerEarth', 'Online', 'Challenge']
        };
      });
  } catch (err) {
    console.error('Error fetching HackerEarth hackathons:', err.message);
    return [];
  }
}

async function getAllHackathons() {
  if (cache.data && Date.now() - cache.fetchedAt < CACHE_MS) {
    return cache.data;
  }

  const [unstopRes, devfolioRes, hackerEarthRes] = await Promise.allSettled([
    fetchUnstopHackathons(),
    fetchDevfolioHackathons(),
    fetchHackerEarthHackathons()
  ]);

  const unstopList = unstopRes.status === 'fulfilled' ? unstopRes.value : [];
  const devfolioList = devfolioRes.status === 'fulfilled' ? devfolioRes.value : [];
  const hackerEarthList = hackerEarthRes.status === 'fulfilled' ? hackerEarthRes.value : [];

  let combined = [...unstopList, ...devfolioList, ...hackerEarthList];

  if (combined.length === 0) {
    combined = [...FALLBACK_HACKATHONS];
  }

  cache = {
    data: combined,
    fetchedAt: Date.now()
  };

  return combined;
}

// GET /api/hackathons
router.get('/', requireAuth, async (req, res) => {
  try {
    const { platform = 'all', search = '', mode = 'all' } = req.query;
    const fullList = await getAllHackathons();

    // Global stats across all platforms
    const stats = {
      total: fullList.length,
      unstopCount: fullList.filter(h => h.platform === 'unstop').length,
      devfolioCount: fullList.filter(h => h.platform === 'devfolio').length,
      hackerEarthCount: fullList.filter(h => h.platform === 'hackerearth').length,
      onlineCount: fullList.filter(h => h.mode === 'Online').length,
      offlineCount: fullList.filter(h => h.mode === 'Offline' || h.mode === 'Hybrid').length
    };

    let list = fullList;

    // Filter by platform
    if (platform !== 'all') {
      list = list.filter(h => h.platform.toLowerCase() === platform.toLowerCase());
    }

    // Filter by mode
    if (mode !== 'all') {
      if (mode === 'online') {
        list = list.filter(h => h.mode === 'Online');
      } else if (mode === 'offline') {
        list = list.filter(h => h.mode === 'Offline' || h.mode === 'Hybrid');
      }
    }

    // Search query filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(h =>
        String(h.title || '').toLowerCase().includes(q) ||
        String(h.tagline || '').toLowerCase().includes(q) ||
        String(h.organizer || '').toLowerCase().includes(q) ||
        String(h.location || '').toLowerCase().includes(q) ||
        (Array.isArray(h.tags) && h.tags.some(t => String(t || '').toLowerCase().includes(q)))
      );
    }

    res.json({
      total: list.length,
      stats,
      hackathons: list
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch hackathons: ' + err.message });
  }
});

module.exports = router;
