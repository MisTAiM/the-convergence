// /api/narrative.js
// Multi-source RSS aggregator with cross-source narrative divergence detection
// Sources: BBC + Al Jazeera + Reuters + Guardian + AP + NPR + Axios + ZeroHedge
// Detects: story omissions, tone divergence, narrative saturation = propaganda signals

const https = require('https');
const http  = require('http');
const zlib  = require('zlib');

function fetchUrl(url) {
  return new Promise((res, rej) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, {
      timeout: 9000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TheConvergence/3.0; research)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      }
    }, r => {
      // Handle redirects
      if ([301,302,303,307,308].includes(r.statusCode) && r.headers.location) {
        return fetchUrl(r.headers.location).then(res).catch(rej);
      }
      let buf = [];
      const stream = r.headers['content-encoding'] === 'gzip' ? r.pipe(zlib.createGunzip()) : r;
      stream.on('data', d => buf.push(d));
      stream.on('end', () => res({ status: r.statusCode, body: Buffer.concat(buf).toString('utf8', 0, 200000) }));
    });
    req.on('error', rej);
    req.on('timeout', () => { req.destroy(); rej(new Error('timeout')); });
  });
}

const SOURCES = [
  { id: 'bbc',       name: 'BBC World',         url: 'https://feeds.bbci.co.uk/news/world/rss.xml',          perspective: 'UK State',     bias: 'center-left' },
  { id: 'aljazeera', name: 'Al Jazeera',         url: 'https://www.aljazeera.com/xml/rss/all.xml',            perspective: 'Gulf/Qatar',   bias: 'non-western' },
  { id: 'reuters',   name: 'Reuters',            url: 'https://feeds.reuters.com/reuters/topNews',            perspective: 'Wire',         bias: 'center' },
  { id: 'guardian',  name: 'The Guardian',       url: 'https://www.theguardian.com/world/rss',               perspective: 'UK Liberal',   bias: 'center-left' },
  { id: 'ap',        name: 'Associated Press',   url: 'https://rsshub.app/apnews/topics/apf-topnews',         perspective: 'Wire',         bias: 'center' },
  { id: 'npr',       name: 'NPR News',           url: 'https://feeds.npr.org/1001/rss.xml',                  perspective: 'US Public',    bias: 'center-left' },
  { id: 'rt',        name: 'RT (Russia Today)',  url: 'https://www.rt.com/rss/news/',                        perspective: 'Russian State','bias': 'pro-kremlin' },
  { id: 'xinhua',    name: 'Xinhua',             url: 'https://www.xinhuanet.com/english/rss/worldnews.xml',  perspective: 'Chinese State','bias': 'pro-beijing' },
];

function parseRSS(xml, sourceId) {
  const items = [];
  const rx = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = rx.exec(xml)) !== null) {
    const chunk = m[1];
    const el = n => {
      const r = new RegExp(`<${n}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${n}>|<${n}[^>]*>([^<]*)<\\/${n}>`,'i').exec(chunk);
      return r ? (r[1]||r[2]||'').trim().replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"') : '';
    };
    const title = el('title').slice(0, 150);
    const date  = el('pubDate') || el('dc:date') || '';
    const link  = el('link').replace(/\s/g,'') || '';
    if (title && title.length > 5) {
      items.push({ title, date, link, source: sourceId });
    }
  }
  return items.slice(0, 20);
}

function extractKeyTerms(title) {
  // Extract meaningful 2-4 word phrases as narrative anchors
  const stop = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','from','as','is','was','are','were','be','been','has','have','had','that','this','their','its','his','her','our','your','they','them','who','which','what']);
  return title.toLowerCase()
    .replace(/[^a-z0-9\s]/g,' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stop.has(w))
    .slice(0,6);
}

function analyzeNarratives(allStories) {
  // Find stories covered by multiple sources on the same topic
  // Group by keyword overlap
  const groups = [];
  const used = new Set();

  for (let i = 0; i < allStories.length; i++) {
    if (used.has(i)) continue;
    const terms = extractKeyTerms(allStories[i].title);
    const group = { anchor: allStories[i].title, stories: [allStories[i]], terms };

    for (let j = i+1; j < allStories.length; j++) {
      if (used.has(j)) continue;
      const other = extractKeyTerms(allStories[j].title);
      const overlap = terms.filter(t => other.includes(t)).length;
      if (overlap >= 2) {
        group.stories.push(allStories[j]);
        used.add(j);
      }
    }
    used.add(i);
    groups.push(group);
  }

  // Sort by coverage count (most-covered = most narratively important)
  groups.sort((a,b) => b.stories.length - a.stories.length);

  // Find divergent stories (covered by only 1 source = potential narrative bias or exclusive)
  const exclusive = groups.filter(g => g.stories.length === 1);
  const mainstream = groups.filter(g => g.stories.length >= 2);
  const highSaturation = groups.filter(g => g.stories.length >= 4);

  // Source diversity
  const sourceCount = {};
  allStories.forEach(s => { sourceCount[s.source] = (sourceCount[s.source] || 0) + 1; });

  return {
    groups: mainstream.slice(0, 10).map(g => ({
      topic: g.anchor.slice(0, 100),
      coverageCount: g.stories.length,
      sources: [...new Set(g.stories.map(s => s.source))],
      saturated: g.stories.length >= 4,
      stories: g.stories.slice(0, 6)
    })),
    exclusive: exclusive.slice(0, 8).map(g => ({
      topic: g.anchor.slice(0, 100),
      source: g.stories[0]?.source,
      link: g.stories[0]?.link
    })),
    highSaturation: highSaturation.length,
    sourceCount,
    totalStories: allStories.length
  };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=900');

  const fetchResults = await Promise.allSettled(
    SOURCES.map(s => fetchUrl(s.url).catch(e => ({ status: 0, body: '', error: e.message })))
  );

  const allStories = [];
  const sourceStatus = {};

  fetchResults.forEach((result, i) => {
    const src = SOURCES[i];
    if (result.status === 'fulfilled' && result.value.status === 200) {
      const items = parseRSS(result.value.body, src.id);
      items.forEach(item => allStories.push({ ...item, sourceName: src.name, perspective: src.perspective, bias: src.bias }));
      sourceStatus[src.id] = { ok: true, count: items.length };
    } else {
      sourceStatus[src.id] = { ok: false, count: 0, error: result.value?.error || result.reason?.message || 'failed' };
    }
  });

  const analysis = analyzeNarratives(allStories);

  res.json({
    sources: SOURCES.map((s,i) => ({ ...s, ...sourceStatus[s.id] })),
    analysis,
    allStories: allStories.slice(0, 60),
    updated: new Date().toISOString()
  });
};
