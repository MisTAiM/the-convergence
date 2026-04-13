// /api/markets.js — Stooq (ETFs/indices) + CoinGecko (crypto) + Alternative.me (F&G)
// Stooq requests batched in groups of 4 with 180ms delay to avoid rate limiting

const https = require('https');

function stooq(sym) {
  return new Promise((resolve) => {
    const url = `https://stooq.com/q/l/?s=${encodeURIComponent(sym)}&f=sd2t2ohlcv&h&e=csv`;
    const req = https.get(url, {
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const line = d.split('\n').find(l => l && !l.startsWith('Symbol') && !l.startsWith('Get'));
          if (!line) return resolve(null);
          const p = line.trim().split(',');
          if (p.length < 7) return resolve(null);
          const o = parseFloat(p[3]), c2 = parseFloat(p[6]);
          if (isNaN(c2) || c2 === 0) return resolve(null);
          resolve({
            price: +c2.toFixed(2),
            open: +o.toFixed(2),
            high: +parseFloat(p[4]).toFixed(2),
            low: +parseFloat(p[5]).toFixed(2),
            changePct: o ? +((c2 - o) / o * 100).toFixed(2) : 0,
            date: p[1]
          });
        } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

function fetchJSON(url) {
  return new Promise((resolve) => {
    https.get(url, { timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(null); } });
    }).on('error', () => resolve(null)).on('timeout', function () { this.destroy(); resolve(null); });
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Batch fetch — groups of 4 with 180ms gap to avoid Stooq rate limit
async function batchStooq(syms) {
  const results = [];
  const BATCH = 4, DELAY = 180;
  for (let i = 0; i < syms.length; i += BATCH) {
    const chunk = syms.slice(i, i + BATCH);
    const chunk_results = await Promise.all(chunk.map(s => stooq(s)));
    results.push(...chunk_results);
    if (i + BATCH < syms.length) await sleep(DELAY);
  }
  return results;
}

const SECTOR_SYMS = [
  { sym: 'xlk.us', ticker: 'XLK', name: 'Technology',   color: '#4090d8', icon: '💻' },
  { sym: 'xle.us', ticker: 'XLE', name: 'Energy',        color: '#c04a28', icon: '⚡' },
  { sym: 'xlf.us', ticker: 'XLF', name: 'Financials',    color: '#d4b26a', icon: '🏦' },
  { sym: 'xlv.us', ticker: 'XLV', name: 'Healthcare',    color: '#28b088', icon: '💊' },
  { sym: 'xlu.us', ticker: 'XLU', name: 'Utilities',     color: '#7860c0', icon: '🔌' },
  { sym: 'xli.us', ticker: 'XLI', name: 'Industrials',   color: '#a0a0a0', icon: '🏭' },
  { sym: 'gld.us', ticker: 'GLD', name: 'Gold',          color: '#f5c518', icon: '🥇' },
  { sym: 'slv.us', ticker: 'SLV', name: 'Silver',        color: '#c0c0c0', icon: '🥈' },
  { sym: 'vnq.us', ticker: 'VNQ', name: 'Real Estate',   color: '#ff6b6b', icon: '🏠' },
  { sym: 'bno.us', ticker: 'BNO', name: 'Brent Oil',     color: '#8B4513', icon: '🛢️' },
  { sym: 'ung.us', ticker: 'UNG', name: 'Natural Gas',   color: '#4fc3f7', icon: '🔥' },
  { sym: 'ura.us', ticker: 'URA', name: 'Uranium',       color: '#b39ddb', icon: '☢️' },
];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');

  // Fetch indices + crypto in parallel while sectors batch sequentially
  const mainSyms  = ['spy.us', 'qqq.us', 'gld.us', 'cl.f', 'soxx.us'];
  const [mainData, sectorData, cryptoData, btcChart, fearData] = await Promise.all([
    batchStooq(mainSyms),
    batchStooq(SECTOR_SYMS.map(s => s.sym)),
    fetchJSON('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true&include_market_cap=true'),
    fetchJSON('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=30&interval=daily'),
    fetchJSON('https://api.alternative.me/fng/?limit=7'),
  ]);

  const [spy, qqq, gold, oil, soxx] = mainData;
  const crypto = cryptoData || {};

  const sectors = SECTOR_SYMS.map((s, i) => {
    const d = sectorData[i];
    return { sym: s.ticker, name: s.name, color: s.color, icon: s.icon,
      price: d?.price ?? null, changePct: d?.changePct ?? null,
      open: d?.open ?? null, date: d?.date ?? null };
  });

  const goldSec   = sectors.find(s => s.sym === 'GLD');
  const energySec = sectors.find(s => s.sym === 'XLE');
  const techSec   = sectors.find(s => s.sym === 'XLK');
  const goldUp    = (goldSec?.changePct ?? 0) > 0;
  const energyUp  = (energySec?.changePct ?? 0) > 0;
  const techDown  = (techSec?.changePct ?? 0) < -0.5;
  const rotationSignal =
    goldUp && energyUp && techDown ? 'FLIGHT TO SAFETY — war/crisis premium. Gold+Energy up, Tech down.' :
    goldUp && !energyUp ? 'MONETARY STRESS — gold rising without energy: dollar/inflation concern' :
    !goldUp && !energyUp && techDown ? 'RISK-OFF — broad selloff. No safe-haven buying yet.' :
    'RISK-ON — growth sectors leading. Calm market conditions.';

  const mkIdx = d => d ? { price: d.price, change: d.changePct, high: d.high, low: d.low, date: d.date } : null;

  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    fetchedAt: new Date().toISOString(),
    indices: {
      spy: mkIdx(spy), qqq: mkIdx(qqq), gold: mkIdx(gold), oil: mkIdx(oil), soxx: mkIdx(soxx),
      btc:  crypto.bitcoin  ? { price: crypto.bitcoin.usd,  change: +(crypto.bitcoin.usd_24h_change||0).toFixed(2)  } : null,
      eth:  crypto.ethereum ? { price: crypto.ethereum.usd, change: +(crypto.ethereum.usd_24h_change||0).toFixed(2) } : null,
    },
    crypto,
    charts: { btc: (btcChart?.prices || []).map(p => +p[1].toFixed(2)) },
    fearGreed: { latest: fearData?.data?.[0] || null, history: fearData?.data || [] },
    sectors, rotationSignal,
    dataSource: 'stooq.com + coingecko.com + alternative.me',
    note: 'changePct = intraday (close vs open)',
  }));
};
