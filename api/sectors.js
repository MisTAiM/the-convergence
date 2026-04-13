// /api/sectors.js - Sector ETF rotation + energy prices (Yahoo Finance)
const https = require('https');

function fetch(url) {
  return new Promise((res, rej) => {
    const req = https.get(url, {
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    }, r => {
      let buf = [];
      r.on('data', d => buf.push(d));
      r.on('end', () => res({ status: r.statusCode, body: Buffer.concat(buf).toString() }));
    });
    req.on('error', rej);
    req.on('timeout', () => { req.destroy(); rej(new Error('timeout')); });
  });
}

const SYMBOLS = [
  { sym: 'XLK',  name: 'Technology',    color: '#4090d8', icon: '💻' },
  { sym: 'XLE',  name: 'Energy',        color: '#c04a28', icon: '⚡' },
  { sym: 'XLF',  name: 'Financials',    color: '#d4b26a', icon: '🏦' },
  { sym: 'XLV',  name: 'Healthcare',    color: '#28b088', icon: '💊' },
  { sym: 'XLU',  name: 'Utilities',     color: '#7860c0', icon: '🔌' },
  { sym: 'XLI',  name: 'Industrials',   color: '#a0a0a0', icon: '🏭' },
  { sym: 'GLD',  name: 'Gold',          color: '#f5c518', icon: '🥇' },
  { sym: 'SLV',  name: 'Silver',        color: '#c0c0c0', icon: '🥈' },
  { sym: 'VNQ',  name: 'Real Estate',   color: '#ff6b6b', icon: '🏠' },
  { sym: 'BNO',  name: 'Brent Oil',     color: '#8B4513', icon: '🛢️' },
  { sym: 'UNG',  name: 'Natural Gas',   color: '#4fc3f7', icon: '🔥' },
  { sym: 'URA',  name: 'Uranium',       color: '#b39ddb', icon: '☢️' },
];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=300'); // 5 min

  const results = await Promise.allSettled(
    SYMBOLS.map(s =>
      fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${s.sym}?interval=1d&range=5d`)
    )
  );

  const sectors = SYMBOLS.map((s, i) => {
    const r = results[i];
    if (r.status !== 'fulfilled' || r.value.status !== 200) {
      return { ...s, price: null, change: null, changePct: null, error: true };
    }
    try {
      const d = JSON.parse(r.value.body);
      const meta = d?.chart?.result?.[0]?.meta || {};
      const price = meta.regularMarketPrice || 0;
      const prev  = meta.previousClose || meta.chartPreviousClose || 1;
      const change = price - prev;
      const changePct = (change / prev) * 100;
      return { ...s, price: parseFloat(price.toFixed(2)), change: parseFloat(change.toFixed(2)), changePct: parseFloat(changePct.toFixed(2)) };
    } catch (_) {
      return { ...s, price: null, change: null, changePct: null };
    }
  });

  // Money-flow signal: most +ve sector is where money is flowing TO
  // Most -ve is where it's fleeing FROM
  const valid = sectors.filter(s => s.changePct !== null);
  const best  = valid.reduce((a, b) => b.changePct > a.changePct ? b : a, valid[0]);
  const worst = valid.reduce((a, b) => b.changePct < a.changePct ? b : a, valid[0]);

  // Rotation signal interpretation
  const goldUp = sectors.find(s => s.sym === 'GLD')?.changePct > 0;
  const energyUp = sectors.find(s => s.sym === 'XLE')?.changePct > 0;
  const techDown = sectors.find(s => s.sym === 'XLK')?.changePct < -1;
  
  let rotationSignal = 'NEUTRAL — balanced sector flows';
  if (goldUp && energyUp && techDown) rotationSignal = 'FLIGHT TO SAFETY — war/crisis premium. Gold+Energy up, Tech down.';
  else if (goldUp && !energyUp) rotationSignal = 'MONETARY STRESS — gold rising without energy suggests dollar/inflation concern';
  else if (!goldUp && !energyUp && techDown) rotationSignal = 'RISK-OFF — broad selloff, no safe-haven buying yet';
  else if (!goldUp && !energyUp && !techDown) rotationSignal = 'RISK-ON — growth sectors leading, calm conditions';

  res.json({ sectors, best, worst, rotationSignal, updated: new Date().toISOString() });
};
