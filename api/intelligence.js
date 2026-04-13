// /api/intelligence.js
// FBI charges/sentences + Federal Register executive orders + HN tech feed
// All free, no API keys, no auth

const https = require('https');
const http  = require('http');
const zlib  = require('zlib');

function fetch(url, opts = {}) {
  return new Promise((res, rej) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, {
      timeout: 9000,
      headers: {
        'User-Agent': 'TheConvergence-Intelligence/3.0 research',
        'Accept': 'application/rss+xml, application/xml, application/json, text/xml, text/html, */*',
        ...opts.headers
      }
    }, r => {
      let buf = [];
      const stream = r.headers['content-encoding'] === 'gzip'
        ? r.pipe(zlib.createGunzip())
        : r;
      stream.on('data', d => buf.push(d));
      stream.on('end', () => res({ status: r.statusCode, body: Buffer.concat(buf).toString('utf8') }));
    });
    req.on('error', rej);
    req.on('timeout', () => { req.destroy(); rej(new Error('timeout')); });
  });
}

function parseRSS(xml) {
  const items = [];
  const itemRx = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRx.exec(xml)) !== null) {
    const el = n => { const r = new RegExp(`<${n}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${n}>|<${n}[^>]*>([\\s\\S]*?)<\\/${n}>`,'i').exec(m[1]); return r ? (r[1]||r[2]||'').trim() : ''; };
    const title = el('title');
    const desc  = el('description').replace(/<[^>]+>/g,'').slice(0,200);
    const date  = el('pubDate') || el('dc:date') || '';
    const link  = el('link') || '';
    if (title) items.push({ title, desc, date, link });
  }
  return items;
}

// HIGH-VALUE keywords for charges/corruption filtering
const CHARGES_KW = ['sentenced','charged','indicted','convicted','guilty','fraud','bribery','corruption',
  'conspiracy','laundering','embezzl','scheme','arrest','insider','SEC charges','DOJ','federal charges',
  'pleaded guilty','prison','official','executive','politician','senator','congressman','governor','mayor',
  'million','billion','wire fraud','tax evasion','extortion','racketeering','obstruction'];

const POWER_KW = ['executive order','national emergency','proclamation','regulation','tariff','ban',
  'sanction','trade','military','intelligence','surveillance','deportation','fired','dismissed',
  'whistleblower','classified','pentagon','CIA','NSA','FBI director'];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=900'); // 15 min cache

  try {
    const [fbiRes, fedRegRes, hnRes] = await Promise.allSettled([
      // 1. FBI News RSS
      fetch('https://www.fbi.gov/feeds/fbi-in-the-news/rss.xml'),
      // 2. Federal Register - executive docs
      fetch('https://www.federalregister.gov/api/v1/documents.json?conditions[type][]=PRESDOCU&per_page=20&order=newest', { headers: { 'Accept': 'application/json' } }),
      // 3. Hacker News top 30 stories
      fetch('https://hacker-news.firebaseio.com/v0/topstories.json'),
    ]);

    // --- FBI ---
    const charges = [];
    if (fbiRes.status === 'fulfilled' && fbiRes.value.status === 200) {
      const items = parseRSS(fbiRes.value.body);
      for (const item of items) {
        const combined = (item.title + ' ' + item.desc).toLowerCase();
        const hits = CHARGES_KW.filter(k => combined.includes(k));
        if (hits.length > 0) {
          // Classify
          const isHighProfile = combined.includes('official') || combined.includes('senator') ||
            combined.includes('congressman') || combined.includes('million') || combined.includes('billion') ||
            combined.includes('mayor') || combined.includes('governor') || combined.includes('executive') ||
            combined.includes('police chief') || combined.includes('federal agent');
          charges.push({
            title: item.title,
            desc: item.desc,
            date: item.date,
            link: item.link,
            keywords: hits.slice(0, 4),
            highProfile: isHighProfile,
            source: 'FBI'
          });
        }
      }
      charges.sort((a, b) => b.highProfile - a.highProfile);
    }

    // --- Federal Register ---
    const powerMoves = [];
    if (fedRegRes.status === 'fulfilled' && fedRegRes.value.status === 200) {
      try {
        const data = JSON.parse(fedRegRes.value.body);
        const docs = data.results || [];
        for (const doc of docs) {
          const title = doc.title || '';
          const sub   = doc.subtype || doc.type || 'DOCUMENT';
          const combined = title.toLowerCase();
          const hits = POWER_KW.filter(k => combined.includes(k));
          powerMoves.push({
            title,
            subtype: sub,
            date: doc.publication_date || '',
            url: doc.html_url || '',
            agencies: (doc.agencies || []).map(a => a.raw_name || a.name || '').filter(Boolean).slice(0, 2),
            significance: hits.length,
            keywords: hits.slice(0, 3)
          });
        }
      } catch (_) {}
    }

    // --- Hacker News ---
    const techIntel = [];
    if (hnRes.status === 'fulfilled' && hnRes.value.status === 200) {
      try {
        const ids = JSON.parse(hnRes.value.body).slice(0, 20);
        const fetches = ids.slice(0, 15).map(id =>
          fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
        );
        const results = await Promise.allSettled(fetches);
        const techKW = ['ai','gpt','claude','llm','china','government','military','nsa','cia','surveillance',
          'crypto','regulation','ban','court','patent','monopoly','antitrust','nuclear','war','hack','breach','leak'];
        for (const r of results) {
          if (r.status !== 'fulfilled' || r.value.status !== 200) continue;
          try {
            const s = JSON.parse(r.value.body);
            const t = (s.title || '').toLowerCase();
            if (techKW.some(k => t.includes(k))) {
              techIntel.push({
                title: s.title,
                url: s.url || `https://news.ycombinator.com/item?id=${s.id}`,
                score: s.score || 0,
                comments: s.descendants || 0,
                time: s.time
              });
            }
          } catch (_) {}
        }
        techIntel.sort((a, b) => b.score - a.score);
      } catch (_) {}
    }

    res.json({
      charges: charges.slice(0, 20),
      powerMoves: powerMoves.slice(0, 15),
      techIntel: techIntel.slice(0, 10),
      updated: new Date().toISOString()
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
