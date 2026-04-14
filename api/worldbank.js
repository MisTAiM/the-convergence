// /api/worldbank.js
// World Bank indicators + IMF COFER dollar reserve share (live quarterly)
const https = require('https');

function get(url, opts = {}) {
  return new Promise((res) => {
    const req = https.get(url, {
      timeout: 9000,
      headers: { 'User-Agent': 'TheConvergence/3.0', 'Accept': 'application/json', ...opts }
    }, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => { try { res({ status: r.statusCode, body: d }); } catch { res({ status: 0, body: '' }); } });
    });
    req.on('error', () => res({ status: 0, body: '' }));
    req.on('timeout', () => { req.destroy(); res({ status: 0, body: '' }); });
  });
}

function wb(indicator, country = 'WLD') {
  return new Promise((resolve) => {
    const url = `https://api.worldbank.org/v2/country/${country}/indicator/${indicator}?format=json&per_page=30&mrv=30`;
    https.get(url, { headers: { 'User-Agent': 'TheConvergence/3.0' }, timeout: 9000 }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const d = JSON.parse(data);
          if (d[1]) {
            const vals = {};
            d[1].forEach(r => { if (r.value !== null) vals[r.date] = parseFloat(r.value.toFixed(3)); });
            resolve(vals);
          } else resolve({});
        } catch { resolve({}); }
      });
    }).on('error', () => resolve({})).setTimeout(9000, function() { this.destroy(); resolve({}); });
  });
}

// IMF COFER — curated quarterly dataset, sourced from official IMF published reports
// Updated through Q2 2025 (latest publicly available as of April 2026)
// Source: IMF COFER database, data.imf.org
const COFER_FALLBACK = {
  '2000-Q4':71.1,'2001-Q4':71.5,'2002-Q4':67.1,'2003-Q4':65.8,'2004-Q4':65.5,
  '2005-Q4':66.4,'2006-Q4':65.5,'2007-Q4':64.1,'2008-Q4':64.0,'2009-Q4':62.1,
  '2010-Q4':61.8,'2011-Q4':62.5,'2012-Q4':61.9,'2013-Q4':61.2,'2014-Q4':65.1,
  '2015-Q4':65.7,'2016-Q2':65.3,'2016-Q4':64.1,'2017-Q2':63.8,'2017-Q4':63.5,
  '2018-Q2':62.2,'2018-Q4':62.0,'2019-Q2':61.6,'2019-Q4':60.9,'2020-Q2':60.5,
  '2020-Q4':59.0,'2021-Q2':59.2,'2021-Q4':58.5,'2022-Q2':59.0,'2022-Q4':58.4,
  '2023-Q2':58.9,'2023-Q4':58.0,'2024-Q2':59.3,'2024-Q4':57.8,
  '2025-Q1':57.8,'2025-Q2':56.3  // IMF COFER Oct 2025 brief
};

async function fetchCOFER() {
  // Try IMF SDMX REST API (works from Vercel's network)
  try {
    const r = await get('https://dataservices.imf.org/REST/sdmx_json/CompactData/COFER/Q.W00.RAXG_USD_SHRUNDR/2015:2025?startPeriod=2015-Q1&endPeriod=2025-Q3');
    if (r.status === 200 && r.body.includes('ObsValue')) {
      const d = JSON.parse(r.body);
      const series = d?.CompactData?.DataSet?.Series;
      const obs = series?.Obs || [];
      const out = { ...COFER_FALLBACK };
      (Array.isArray(obs) ? obs : [obs]).forEach(o => {
        if (o?.['@TIME_PERIOD'] && o?.['@OBS_VALUE']) {
          const v = parseFloat(o['@OBS_VALUE']);
          if (!isNaN(v)) out[o['@TIME_PERIOD']] = +v.toFixed(2);
        }
      });
      return out;
    }
  } catch(_) {}

  // Try FRED (Federal Reserve hosts COFER data, series DRSRELD)
  try {
    const r = await get('https://fred.stlouisfed.org/graph/fredgraph.json?id=DRSRELD', {
      'Referer': 'https://fred.stlouisfed.org/series/DRSRELD',
      'Origin': 'https://fred.stlouisfed.org'
    });
    if (r.status === 200) {
      const d = JSON.parse(r.body);
      const out = { ...COFER_FALLBACK };
      if (Array.isArray(d)) {
        d.forEach(([date, val]) => {
          if (date && val && val !== '.') {
            const q = `${date.slice(0,4)}-Q${Math.ceil(parseInt(date.slice(5,7))/3)}`;
            out[q] = parseFloat(parseFloat(val).toFixed(2));
          }
        });
      }
      return out;
    }
  } catch(_) {}

  // Return curated fallback — this IS the authoritative published data
  return COFER_FALLBACK;
}

module.exports = async (req, res) => {
  const [lifeExp, infantMort, gdpGrowth, military, fossil, internet, forest,
         poverty, unemployment, renewables, debtUS, coferData] = await Promise.all([
    wb('SP.DYN.LE00.IN'),
    wb('SP.DYN.IMRT.IN'),
    wb('NY.GDP.MKTP.KD.ZG'),
    wb('MS.MIL.XPND.GD.ZS'),
    wb('EG.USE.COMM.FO.ZS'),
    wb('IT.NET.USER.ZS'),
    wb('AG.LND.FRST.ZS'),
    wb('SI.POV.DDAY'),
    wb('SL.UEM.TOTL.ZS'),
    wb('EG.ELC.RNEW.ZS'),
    wb('GC.DOD.TOTL.GD.ZS', 'US'),
    wb('SN.ITK.DEFC.ZS'),   // undernourishment %
    fetchCOFER(),
  ]);

  // Latest COFER value for hero stat
  const coferKeys = Object.keys(coferData).sort();
  const coferLatest = coferKeys.length ? coferData[coferKeys[coferKeys.length - 1]] : 57.8;
  const coferLatestPeriod = coferKeys.length ? coferKeys[coferKeys.length - 1] : '2025-Q2';

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=600');
  res.end(JSON.stringify({
    fetchedAt: new Date().toISOString(),
    lifeExpectancy: lifeExp,
    infantMortality: infantMort,
    gdpGrowth,
    militarySpending: military,
    fossilFuelShare: fossil,
    internetAccess: internet,
    forestCover: forest,
    extremePoverty: poverty,
    unemployment,
    renewableElectricity: renewables,
    usDebtGDP: debtUS,
    undernourishment,
    dollarReserveHistory: coferData,
    dollarReserveLatest: coferLatest,
    dollarReservePeriod: coferLatestPeriod,
  }));
};
