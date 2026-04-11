const https = require('https');
const http = require('http');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 TheConvergence/3.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function parseRSS(xml, source) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const get = (tag) => {
      const m = block.match(new RegExp(`<${tag}(?:[^>]*)><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\/${tag}>|<${tag}(?:[^>]*)>([^<]*)<\/${tag}>`));
      return m ? (m[1] || m[2] || '').trim() : '';
    };
    const title = get('title');
    const desc = get('description').replace(/<[^>]+>/g, '').slice(0, 200);
    const pubDate = get('pubDate');
    const link = get('link') || block.match(/<link>([^<]+)<\/link>/)?.[1] || '';
    if (title) items.push({ title, description: desc, pubDate, link, source });
    if (items.length >= 6) break;
  }
  return items;
}

const FEEDS = [
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC World' },
  { url: 'https://feeds.bbci.co.uk/news/business/rss.xml', source: 'BBC Business' },
  { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', source: 'BBC Tech' },
  { url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', source: 'BBC Science' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', source: 'Al Jazeera' },
  { url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss', source: 'NASA' },
];

module.exports = async (req, res) => {
  const results = { items: [], fetchedAt: new Date().toISOString(), sources: [] };
  
  const promises = FEEDS.map(async ({ url, source }) => {
    try {
      const xml = await fetchUrl(url);
      const items = parseRSS(xml, source);
      results.sources.push({ source, count: items.length, ok: true });
      return items;
    } catch (e) {
      results.sources.push({ source, count: 0, ok: false, error: e.message });
      return [];
    }
  });

  const allItems = await Promise.allSettled(promises);
  allItems.forEach(r => {
    if (r.status === 'fulfilled') results.items.push(...r.value);
  });

  // Sort by date desc
  results.items.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  results.totalItems = results.items.length;

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 's-maxage=300');
  res.end(JSON.stringify(results));
};
