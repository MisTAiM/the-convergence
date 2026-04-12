const https = require('https');
const http = require('http');

function fetchRaw(url, timeout = 10000) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    try {
      const req = client.get(url, {
        headers: { 'User-Agent': 'TheConvergence/3.0 (globe-data)' }
      }, (res) => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      });
      req.on('error', () => resolve(null));
      req.setTimeout(timeout, () => { req.destroy(); resolve(null); });
    } catch { resolve(null); }
  });
}

function fetchJSON(url) {
  return fetchRaw(url).then(d => { try { return JSON.parse(d); } catch { return null; } });
}

/* ─── USGS EARTHQUAKES ──────────────────────────── */
async function fetchEarthquakes() {
  const events = [];
  // Significant month + M5+ month
  const [sig, m5] = await Promise.all([
    fetchJSON('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson'),
    fetchJSON('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/5.0_month.geojson'),
  ]);

  const seen = new Set();
  for (const src of [sig, m5]) {
    if (!src?.features) continue;
    for (const f of src.features) {
      const id = f.id || f.properties?.place;
      if (seen.has(id)) continue;
      seen.add(id);
      const p = f.properties;
      const [lng, lat, depth] = f.geometry?.coordinates || [0, 0, 0];
      const mag = p.mag || 0;
      if (!lat || !lng || mag < 4.5) continue;
      events.push({
        id,
        type: 'earthquake',
        lat: +lat.toFixed(4),
        lng: +lng.toFixed(4),
        name: p.place || 'Unknown',
        title: `M${mag.toFixed(1)} Earthquake`,
        desc: `${p.place} — Magnitude ${mag.toFixed(1)}, depth ${Math.round(depth)}km`,
        detail: `${p.felt ? p.felt + ' people felt this. ' : ''}${p.tsunami ? '⚠️ Tsunami warning issued. ' : ''}${p.alert ? 'Alert level: ' + p.alert + '.' : ''}`,
        severity: mag >= 7 ? 'red' : mag >= 6 ? 'orange' : mag >= 5.5 ? 'yellow' : 'green',
        magnitude: mag,
        depth: Math.round(depth),
        time: p.time,
        url: p.url,
        tsunami: !!p.tsunami,
        size: Math.max(0.4, Math.min(2.5, (mag - 4) * 0.5)),
      });
    }
  }
  return events;
}

/* ─── NASA EONET NATURAL EVENTS ─────────────────── */
async function fetchEONET() {
  const d = await fetchJSON('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=100');
  if (!d?.events) return [];

  const CAT_MAP = {
    'Wildfires': { type: 'wildfire', color: 'orange', icon: '🔥' },
    'Severe Storms': { type: 'storm', color: 'violet', icon: '🌀' },
    'Volcanoes': { type: 'volcano', color: 'red', icon: '🌋' },
    'Sea and Lake Ice': { type: 'ice', color: 'blue', icon: '🧊' },
    'Floods': { type: 'flood', color: 'blue', icon: '🌊' },
    'Drought': { type: 'drought', color: 'yellow', icon: '☀️' },
    'Dust and Haze': { type: 'dust', color: 'yellow', icon: '💨' },
    'Landslides': { type: 'landslide', color: 'orange', icon: '⛰️' },
    'Manmade': { type: 'manmade', color: 'red', icon: '⚠️' },
    'Snow': { type: 'snow', color: 'blue', icon: '❄️' },
    'Temperature Extremes': { type: 'temperature', color: 'red', icon: '🌡️' },
  };

  const events = [];
  for (const event of d.events) {
    const geo = event.geometry;
    if (!geo?.length) continue;
    const latest = geo[geo.length - 1];
    const coords = latest.coordinates;
    if (!coords) continue;

    const isPoint = latest.type === 'Point';
    const [lng, lat] = isPoint ? coords : (coords[0] || [0, 0]);
    if (!lat || !lng || (lat === 0 && lng === 0)) continue;

    const cats = event.categories || [];
    const catTitle = cats[0]?.title || 'Other';
    const meta = CAT_MAP[catTitle] || { type: 'event', color: 'gold', icon: '⚡' };

    const sources = (event.sources || []).map(s => s.id).join(', ');
    const dateStr = new Date(latest.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    events.push({
      id: event.id,
      type: meta.type,
      lat: +lat.toFixed(4),
      lng: +lng.toFixed(4),
      name: event.title,
      title: meta.icon + ' ' + event.title,
      desc: `${catTitle} — Active since ${dateStr}`,
      detail: `Source: ${sources || 'NASA EONET'} · ${geo.length} data point${geo.length > 1 ? 's' : ''} tracked`,
      severity: meta.color,
      size: catTitle === 'Volcanoes' ? 1.2 : catTitle === 'Severe Storms' ? 1.0 : 0.6,
      url: event.link || `https://eonet.gsfc.nasa.gov/events/${event.id}`,
    });
  }
  return events;
}

/* ─── GDACS DISASTERS ───────────────────────────── */
async function fetchGDACS() {
  const xml = await fetchRaw('https://www.gdacs.org/xml/rss.xml', 8000);
  if (!xml) return [];

  const events = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const get = tag => {
      const r = block.match(new RegExp(`<(?:[^:>]+:)?${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/(?:[^:>]+:)?${tag}>|<(?:[^:>]+:)?${tag}[^>]*>([^<]*)<\\/(?:[^:>]+:)?${tag}>`));
      return r ? (r[1] || r[2] || '').trim() : '';
    };

    const georssPoint = block.match(/<georss:point>([^<]+)<\/georss:point>/);
    if (!georssPoint) continue;
    const [lat, lng] = georssPoint[1].trim().split(/\s+/).map(Number);
    if (!lat || !lng) continue;

    const title = get('title');
    const alertLevel = block.match(/<gdacs:alertlevel>([^<]+)<\/gdacs:alertlevel>/)?.[1] || 'Green';
    const eventType = block.match(/<gdacs:eventtype>([^<]+)<\/gdacs:eventtype>/)?.[1] || '';
    const country = block.match(/<gdacs:country>([^<]+)<\/gdacs:country>/)?.[1] || '';
    const severity = block.match(/<gdacs:severity>([^<]+)<\/gdacs:severity>/)?.[1] || '';
    const population = block.match(/<gdacs:population>([^<]+)<\/gdacs:population>/)?.[1] || '';
    const link = get('link');
    const pubDate = get('pubDate');

    // Only show Orange + Red alerts for globe (filter noise)
    if (alertLevel === 'Green' && !['TC', 'EQ', 'FL'].includes(eventType)) continue;

    const TYPE_MAP = {
      'TC': { type: 'cyclone', icon: '🌀' },
      'EQ': { type: 'earthquake', icon: '🪨' },
      'FL': { type: 'flood', icon: '🌊' },
      'DR': { type: 'drought', icon: '☀️' },
      'WF': { type: 'wildfire', icon: '🔥' },
      'VO': { type: 'volcano', icon: '🌋' },
      'TS': { type: 'tsunami', icon: '🌊' },
    };
    const typeInfo = TYPE_MAP[eventType] || { type: 'disaster', icon: '⚠️' };

    events.push({
      id: 'gdacs-' + Date.now() + Math.random(),
      type: typeInfo.type,
      lat: +lat.toFixed(4),
      lng: +lng.toFixed(4),
      name: country || title,
      title: typeInfo.icon + ' ' + title.slice(0, 70),
      desc: `GDACS ${alertLevel} Alert — ${country}`,
      detail: `${severity}. ${population}. Reported: ${pubDate?.slice(0,16) || ''}`,
      severity: alertLevel.toLowerCase() === 'red' ? 'red' : alertLevel.toLowerCase() === 'orange' ? 'orange' : 'green',
      size: alertLevel === 'Red' ? 1.1 : alertLevel === 'Orange' ? 0.8 : 0.5,
      url: link,
      alert: alertLevel,
    });
  }
  return events;
}

/* ─── MAIN HANDLER ──────────────────────────────── */
module.exports = async (req, res) => {
  const [earthquakes, eonet, gdacs] = await Promise.all([
    fetchEarthquakes().catch(() => []),
    fetchEONET().catch(() => []),
    fetchGDACS().catch(() => []),
  ]);

  const allEvents = [
    ...earthquakes,
    ...eonet,
    ...gdacs,
  ];

  // Stats
  const stats = {
    earthquakes: earthquakes.length,
    naturalEvents: eonet.length,
    disasters: gdacs.length,
    total: allEvents.length,
    significant: earthquakes.filter(e => e.magnitude >= 6).length,
    active: allEvents.filter(e => e.severity === 'red' || e.severity === 'orange').length,
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=120');
  res.end(JSON.stringify({
    fetchedAt: new Date().toISOString(),
    events: allEvents,
    stats,
  }));
};
