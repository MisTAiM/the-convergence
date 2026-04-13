// /api/markets.js
// Market data via Stooq (OHLCV, no API key) + CoinGecko (crypto) + Alternative.me (Fear&Greed)

const https = require('https');

// Stooq CSV fetch — returns {price, open, high, low, changePct, date}
function stooq(sym) {
  return new Promise((resolve) => {
    const url = `https://stooq.com/q/l/?s=${encodeURIComponent(sym)}&f=sd2t2ohlcv&h&e=csv`;
    const req = https.get(url, {
      timeout: 9000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const lines = d.trim().split('\n').filter(l => l && !l.startsWith('Symbol'));
          if (!lines.length) return resolve(null);
          const p = lines[0].trim().split(',');
          if (p.length < 7) return resolve(null);
          const [,date,,open,high,low,close] = p;
          const o = parseFloat(open), h = parseFloat(high), l2 = parseFloat(low), c = parseFloat(close);
          if (isNaN(c) || c === 0) return resolve(null);
          const changePct = o ? +((c - o) / o * 100).toFixed(2) : 0;
          resolve({ price: +c.toFixed(2), open: +o.toFixed(2), high: +h.toFixed(2), low: +l2.toFixed(2), changePct, date });
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
    }).on('error', () => resolve(null)).on('timeout', function() { this.destroy(); resolve(null); });
  });
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

  // Fetch everything in parallel
  const [spy, qqq, gold, oil, soxx, btcData, ethData, fearData, ...sectorData] = await Promise.all([
    stooq('spy.us'),
    stooq('qqq.us'),
    stooq('gld.us'),
    stooq('cl.f'),       // WTI crude futures on Stooq
    stooq('soxx.us'),
    fetchJSON('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true&include_market_cap=true'),
    fetchJSON('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=30&interval=daily'),
    fetchJSON('https://api.alternative.me/fng/?limit=7'),
    ...SECTOR_SYMS.map(s => stooq(s.sym)),
  ]);

  // Build sectors array
  const sectors = SECTOR_SYMS.map((s, i) => {
    const d = sectorData[i];
    return {
      sym: s.ticker,
      name: s.name,
      color: s.color,
      icon: s.icon,
      price: d?.price ?? null,
      changePct: d?.changePct ?? null,
      open: d?.open ?? null,
      date: d?.date ?? null,
    };
  });

  // Rotation signal
  const goldSec   = sectors.find(s => s.sym === 'GLD');
  const energySec = sectors.find(s => s.sym === 'XLE');
  const techSec   = sectors.find(s => s.sym === 'XLK');
  const goldUp    = (goldSec?.changePct ?? 0) > 0;
  const energyUp  = (energySec?.changePct ?? 0) > 0;
  const techDown  = (techSec?.changePct ?? 0) < -0.5;
  const rotationSignal =
    goldUp && energyUp && techDown ? 'FLIGHT TO SAFETY — war/crisis premium. Gold+Energy up, Tech down.' :
    goldUp && !energyUp            ? 'MONETARY STRESS — gold rising without energy: dollar/inflation concern' :
    !goldUp && !energyUp && techDown ? 'RISK-OFF — broad selloff. No safe-haven buying yet.' :
    'RISK-ON — growth sectors leading. Calm market conditions.';

  // Crypto
  const crypto = btcData || {};
  const btcChart = (ethData?.prices || []).map(p => +p[1].toFixed(2));
  const fearGreedHistory = fearData?.data || [];

  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    fetchedAt: new Date().toISOString(),
    indices: {
      spy:  spy  ? { price: spy.price,  change: spy.changePct,  ...spy  } : null,
      qqq:  qqq  ? { price: qqq.price,  change: qqq.changePct,  ...qqq  } : null,
      gold: gold ? { price: gold.price, change: gold.changePct, ...gold } : null,
      oil:  oil  ? { price: oil.price,  change: oil.changePct,  ...oil  } : null,
      soxx: soxx ? { price: soxx.price, change: soxx.changePct, ...soxx } : null,
      btc:  crypto.bitcoin  ? { price: crypto.bitcoin.usd,  change: +(crypto.bitcoin.usd_24h_change||0).toFixed(2)  } : null,
      eth:  crypto.ethereum ? { price: crypto.ethereum.usd, change: +(crypto.ethereum.usd_24h_change||0).toFixed(2) } : null,
    },
    crypto,
    charts: { btc: btcChart },
    fearGreed: {
      latest: fearGreedHistory[0] || null,
      history: fearGreedHistory,
    },
    sectors,
    rotationSignal,
    dataSource: 'stooq.com + coingecko.com + alternative.me',
    note: 'changePct = intraday (close vs open), not vs previous close',
  }));
};
