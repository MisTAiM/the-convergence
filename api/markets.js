const https = require('https');

function fetch(url, hdrs = {}) {
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      const req = https.request({
        hostname: u.hostname,
        path: u.pathname + u.search,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Origin': 'https://finance.yahoo.com',
          'Referer': 'https://finance.yahoo.com/',
          ...hdrs
        },
      }, (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(null); } });
      });
      req.on('error', () => resolve(null));
      req.setTimeout(10000, () => { req.destroy(); resolve(null); });
      req.end();
    } catch { resolve(null); }
  });
}

async function yf(sym) {
  const d = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1mo`);
  if (!d) return null;
  const r = d?.chart?.result?.[0];
  if (!r) return null;
  const meta = r.meta || {};
  const raw = r.indicators?.quote?.[0]?.close || [];
  const closes = raw.filter(Boolean).map(x => +x.toFixed(2));
  const curr = meta.regularMarketPrice;
  const prev = meta.previousClose || (closes.length > 1 ? closes[closes.length - 2] : null);
  const chg = (curr && prev) ? +((curr - prev) / prev * 100).toFixed(2) : 0;
  return {
    symbol: sym,
    name: meta.shortName || meta.longName || sym,
    price: curr ? +curr.toFixed(2) : 0,
    prevClose: prev ? +prev.toFixed(2) : 0,
    change: chg,
    high52: meta.fiftyTwoWeekHigh ? +meta.fiftyTwoWeekHigh.toFixed(2) : 0,
    low52: meta.fiftyTwoWeekLow ? +meta.fiftyTwoWeekLow.toFixed(2) : 0,
    currency: meta.currency || 'USD',
    closes,
  };
}

async function cg() {
  return fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true&include_market_cap=true');
}

async function cgChart(id) {
  const d = await fetch(`https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=30&interval=daily`);
  return d?.prices?.map(p => +p[1].toFixed(2)) || [];
}

async function fng() {
  const d = await fetch('https://api.alternative.me/fng/?limit=7');
  return d?.data || [];
}

module.exports = async (req, res) => {
  const [spy, qqq, gold, oil, btcY, ethY, vix, soxx, cryptoP, btcC, ethC, fear] = await Promise.all([
    yf('SPY'), yf('QQQ'), yf('GC=F'), yf('CL=F'), yf('BTC-USD'), yf('ETH-USD'),
    yf('^VIX'), yf('SOXX'), cg(), cgChart('bitcoin'), cgChart('ethereum'), fng(),
  ]);

  // Sector ETFs for rotation tracker
  const SECTOR_SYMS = [
    { sym:'XLK',name:'Technology',color:'#4090d8',icon:'💻'},
    { sym:'XLE',name:'Energy',color:'#c04a28',icon:'⚡'},
    { sym:'XLF',name:'Financials',color:'#d4b26a',icon:'🏦'},
    { sym:'XLV',name:'Healthcare',color:'#28b088',icon:'💊'},
    { sym:'XLU',name:'Utilities',color:'#7860c0',icon:'🔌'},
    { sym:'XLI',name:'Industrials',color:'#a0a0a0',icon:'🏭'},
    { sym:'GLD',name:'Gold',color:'#f5c518',icon:'🥇'},
    { sym:'SLV',name:'Silver',color:'#c0c0c0',icon:'🥈'},
    { sym:'VNQ',name:'Real Estate',color:'#ff6b6b',icon:'🏠'},
    { sym:'BNO',name:'Brent Oil',color:'#8B4513',icon:'🛢️'},
    { sym:'UNG',name:'Natural Gas',color:'#4fc3f7',icon:'🔥'},
    { sym:'URA',name:'Uranium',color:'#b39ddb',icon:'☢️'},
  ];
  const sectorResults = await Promise.allSettled(SECTOR_SYMS.map(s => yf(s.sym)));
  const sectors = SECTOR_SYMS.map((s,i) => {
    const r = sectorResults[i];
    if (r.status !== 'fulfilled' || !r.value) return { ...s, price:null, changePct:null };
    const { last, closes } = r.value;
    const prev = closes?.[closes.length-2] || last;
    const changePct = prev ? +((last-prev)/prev*100).toFixed(2) : null;
    return { ...s, price: last, changePct };
  });

  // Rotation signal
  const goldSec = sectors.find(s=>s.sym==='GLD');
  const energySec = sectors.find(s=>s.sym==='XLE');
  const techSec = sectors.find(s=>s.sym==='XLK');
  const goldUp = goldSec?.changePct > 0;
  const energyUp = energySec?.changePct > 0;
  const techDown = techSec?.changePct < -1;
  const rotationSignal = goldUp && energyUp && techDown ? 'FLIGHT TO SAFETY — war/crisis premium. Gold+Energy up, Tech down.'
    : goldUp && !energyUp ? 'MONETARY STRESS — gold rising without energy suggests dollar/inflation concern'
    : !goldUp && !energyUp && techDown ? 'RISK-OFF — broad selloff, no safe-haven buying yet'
    : 'RISK-ON — growth sectors leading, calm market conditions';

  const out = {
    fetchedAt: new Date().toISOString(),
    indices: { spy, qqq, gold, oil, btc: btcY, eth: ethY, vix, soxx },
    crypto: cryptoP || {},
    charts: { btc: btcC, eth: ethC },
    fearGreed: { latest: fear[0] || null, history: fear },
    sectors, rotationSignal,
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
  res.end(JSON.stringify(out));
};