// /api/spaceweather.js - NOAA Space Weather: K-index + solar wind + alerts
const https = require('https');
const zlib  = require('zlib');

function fetch(url) {
  return new Promise((res, rej) => {
    const req = https.get(url, {
      timeout: 8000,
      headers: { 'User-Agent': 'TheConvergence/3.0', 'Accept': 'application/json' }
    }, r => {
      let buf = [];
      const stream = r.headers['content-encoding'] === 'gzip' ? r.pipe(zlib.createGunzip()) : r;
      stream.on('data', d => buf.push(d));
      stream.on('end', () => res({ status: r.statusCode, body: Buffer.concat(buf).toString() }));
    });
    req.on('error', rej);
    req.on('timeout', () => { req.destroy(); rej(new Error('timeout')); });
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=600'); // 10 min cache

  try {
    const [kpRes, windRes, alertsRes, forecastRes] = await Promise.allSettled([
      fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json'),
      fetch('https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json'),
      fetch('https://services.swpc.noaa.gov/products/alerts.json'),
      fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json'),
    ]);

    // K-index (geomagnetic activity)
    let kpCurrent = null, kpHistory = [];
    if (kpRes.status === 'fulfilled' && kpRes.value.status === 200) {
      const rows = JSON.parse(kpRes.value.body);
      // First row is header dict now
      kpHistory = rows.slice(-24).map(r => ({
        time: r.time_tag || r[0],
        kp: parseFloat(r.Kp ?? r[1] ?? 0)
      })).filter(r => !isNaN(r.kp));
      kpCurrent = kpHistory[kpHistory.length - 1] || null;
    }

    // Solar wind speed
    let solarWind = null;
    if (windRes.status === 'fulfilled' && windRes.value.status === 200) {
      const rows = JSON.parse(windRes.value.body);
      // rows[0] is header array
      const latest = rows[rows.length - 1];
      if (Array.isArray(latest)) {
        solarWind = {
          time: latest[0],
          density: parseFloat(latest[1]) || 0,
          speed: parseFloat(latest[2]) || 0,
          temp: parseFloat(latest[3]) || 0
        };
      }
    }

    // Active alerts
    let alerts = [];
    if (alertsRes.status === 'fulfilled' && alertsRes.value.status === 200) {
      const raw = JSON.parse(alertsRes.value.body);
      alerts = (Array.isArray(raw) ? raw : []).slice(0, 10).map(a => ({
        issued: a.issue_datetime || '',
        code: (a.message || '').match(/Message Code:\s*(\w+)/)?.[1] || 'ALERT',
        message: (a.message || '').split('\n').slice(0,4).join(' ').slice(0, 200)
      }));
    }

    // 3-day forecast
    let forecast = [];
    if (forecastRes.status === 'fulfilled' && forecastRes.value.status === 200) {
      const rows = JSON.parse(forecastRes.value.body);
      // rows[0] is header object
      forecast = rows.slice(1, 13).map(r => ({
        time: r.time_tag || r[0],
        kp: parseFloat(r.kp ?? r[1] ?? 0),
        observed: r.observed === 'observed'
      })).filter(r => !isNaN(r.kp) && !r.observed); // only future predictions
    }

    // Determine storm level
    const kp = kpCurrent?.kp || 0;
    const stormLevel = kp >= 8 ? 'G4-G5 SEVERE/EXTREME'
      : kp >= 7 ? 'G3 STRONG'
      : kp >= 6 ? 'G2 MODERATE'
      : kp >= 5 ? 'G1 MINOR STORM'
      : kp >= 4 ? 'UNSETTLED'
      : kp >= 3 ? 'ACTIVE'
      : 'QUIET';

    res.json({
      kpCurrent,
      kpHistory,
      solarWind,
      alerts,
      forecast,
      stormLevel,
      stormColor: kp >= 7 ? '#ff4444' : kp >= 5 ? '#c04a28' : kp >= 3 ? '#d4b26a' : '#28b088',
      updated: new Date().toISOString()
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
