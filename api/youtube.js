const https = require('https');

// Permanent channel IDs - these never change
const CHANNELS = [
  { name: 'DW News',       id: 'UCknLrEdhRCp1aegoMqRaCZg', color: '#C5102E', icon: '🇩🇪', region: 'europe',  desc: 'Germany\'s international broadcaster. Independent global news 24/7.', tags: ['world','politics','europe'] },
  { name: 'France 24 EN',  id: 'UCQfwfsi5VrQ8yKZ-UWmAEFg', color: '#003F87', icon: '🇫🇷', region: 'europe',  desc: 'France\'s 24/7 English international news. Europe + Middle East + Africa.', tags: ['world','europe','mideast'] },
  { name: 'Sky News',      id: 'UCoMdktPbSTixAyNGwb-UYkQ', color: '#E4003B', icon: '🇬🇧', region: 'europe',  desc: 'UK\'s 24/7 breaking news. Global events, politics, business.', tags: ['world','uk','politics'] },
  { name: 'Bloomberg',     id: 'UCIALMKvObZNtJ6AmdCLP7Lg', color: '#5C5CFF', icon: '📈', region: 'finance', desc: 'Global financial news, market data, economic analysis 24/7.', tags: ['finance','markets','economy'] },
  { name: 'NASA TV',       id: 'UCLA_DiR1FfKNvjuUpBHmylQ', color: '#0B3D91', icon: '🚀', region: 'space',   desc: 'NASA Public Television — missions, ISS live, launches, Earth science.', tags: ['space','science','nasa'] },
  { name: 'CNA',           id: 'UCLgOAd9oU1ICQN5JdivQs7g', color: '#E30713', icon: '🌏', region: 'asia',    desc: 'Channel NewsAsia. Asia-Pacific 24/7 English international news.', tags: ['asia','pacific','singapore'] },
  { name: 'CGTN',          id: 'UChjNX55Y7F64VnLM4ld71uA', color: '#D40010', icon: '🇨🇳', region: 'asia',    desc: 'China Global TV Network. Asia news, Chinese perspective.', tags: ['china','asia','economy'] },
  { name: 'Euronews',      id: 'UCg4QGMrFOh9FBnEp7RTVeRw', color: '#003399', icon: '🇪🇺', region: 'europe',  desc: 'Pan-European multilingual news. EU politics, economy, culture.', tags: ['europe','eu','politics'] },
  { name: 'WION',          id: 'UCp7KGFbMPthqnpMRKFvA2WA', color: '#F26722', icon: '🇮🇳', region: 'asia',    desc: 'India\'s global news. Strong South Asia and emerging markets coverage.', tags: ['india','asia','emerging'] },
  { name: 'TRT World',     id: 'UC7fWeaHhqgM4Ry-RMpM2YYw', color: '#E31E24', icon: '🇹🇷', region: 'mideast', desc: 'Turkey\'s international broadcaster. Middle East conflict coverage.', tags: ['turkey','mideast','world'] },
  { name: 'Arirang News',  id: 'UCeoiYd6MDHoGiNmBnCxOG0Q', color: '#00AEEF', icon: '🇰🇷', region: 'asia',    desc: 'South Korea\'s international broadcaster. Northeast Asia, K-culture.', tags: ['korea','asia','northeast'] },
  { name: 'i24 NEWS',      id: 'UCLHRdqHAEjhFCu6VJT2PCQQ', color: '#0066B3', icon: '🇮🇱', region: 'mideast', desc: 'Israel-based English news. Middle East conflict reporting from ground.', tags: ['israel','mideast','conflict'] },
];

function fetchXML(channelId) {
  return new Promise((resolve) => {
    const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    https.get(url, { headers: { 'User-Agent': 'TheConvergence/3.0' } }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    }).on('error', () => resolve(null)).setTimeout(8000, function() { this.destroy(); resolve(null); });
  });
}

function parseRSS(xml) {
  if (!xml) return [];
  const entries = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = entryRegex.exec(xml)) !== null && entries.length < 4) {
    const block = m[1];
    const getId = tag => { const r = block.match(new RegExp(`<yt:videoId>([^<]+)<\/yt:videoId>`)); return r ? r[1] : null; };
    const getTag = tag => { const r = block.match(new RegExp(`<${tag}(?:[^>]*)><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}(?:[^>]*)>([^<]*)<\\/${tag}>`)); return r ? (r[1] || r[2] || '').trim() : ''; };

    const videoId = block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
    const title = getTag('title');
    const published = block.match(/<published>([^<]+)<\/published>/)?.[1];
    const updated = block.match(/<updated>([^<]+)<\/updated>/)?.[1];
    const viewCount = block.match(/<media:statistics views="(\d+)"/)?.[1];

    if (videoId) {
      entries.push({
        videoId,
        title: title.slice(0, 120),
        published: published?.split('T')[0],
        updated: updated?.split('T')[0],
        views: viewCount ? parseInt(viewCount) : null,
        thumb: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        thumbHigh: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`,
        watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
      });
    }
  }
  return entries;
}

module.exports = async (req, res) => {
  const results = await Promise.all(
    CHANNELS.map(async (ch) => {
      const xml = await fetchXML(ch.id);
      const videos = parseRSS(xml);
      return {
        ...ch,
        videos,
        latestVideoId: videos[0]?.videoId || null,
        latestTitle: videos[0]?.title || null,
        latestThumb: videos[0]?.thumb || null,
        latestPublished: videos[0]?.published || null,
        // Live stream embed using channel ID (always points to current live)
        liveEmbedUrl: `https://www.youtube-nocookie.com/embed/live_stream?channel=${ch.id}&autoplay=1&rel=0`,
        channelUrl: `https://www.youtube.com/channel/${ch.id}/live`,
      };
    })
  );

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=120');
  res.end(JSON.stringify({
    fetchedAt: new Date().toISOString(),
    channels: results,
    total: results.length,
  }));
};
