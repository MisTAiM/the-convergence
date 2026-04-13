// /api/conflictzones.js - Live weather at 12 active conflict/tension zones
const https = require('https');

function fetch(url) {
  return new Promise((res, rej) => {
    const req = https.get(url, { timeout: 8000, headers: { 'User-Agent': 'TheConvergence/3.0' } }, r => {
      let buf = [];
      r.on('data', d => buf.push(d));
      r.on('end', () => res({ status: r.statusCode, body: Buffer.concat(buf).toString() }));
    });
    req.on('error', rej);
    req.on('timeout', () => { req.destroy(); rej(new Error('timeout')); });
  });
}

const ZONES = [
  { name: 'Gaza', lat: 31.35, lon: 34.30, status: 'ACTIVE WAR', color: '#ff4444' },
  { name: 'Kyiv, Ukraine', lat: 50.45, lon: 30.52, status: 'ACTIVE WAR', color: '#ff4444' },
  { name: 'Tehran, Iran', lat: 35.69, lon: 51.39, status: 'HIGH TENSION', color: '#c04a28' },
  { name: 'Khartoum, Sudan', lat: 15.55, lon: 32.53, status: 'CIVIL WAR', color: '#ff4444' },
  { name: 'Taipei, Taiwan', lat: 25.03, lon: 121.56, status: 'HIGH TENSION', color: '#c04a28' },
  { name: 'Islamabad, Pakistan', lat: 33.72, lon: 73.06, status: 'ELEVATED', color: '#d4b26a' },
  { name: 'Mogadishu, Somalia', lat: 2.05, lon: 45.34, status: 'CONFLICT', color: '#c04a28' },
  { name: 'Port-au-Prince, Haiti', lat: 18.54, lon: -72.34, status: 'CRISIS', color: '#c04a28' },
  { name: 'Bamako, Mali', lat: 12.65, lon: -8.00, status: 'CONFLICT', color: '#c04a28' },
  { name: 'Yangon, Myanmar', lat: 16.87, lon: 96.19, status: 'CIVIL WAR', color: '#ff4444' },
  { name: 'Moscow, Russia', lat: 55.75, lon: 37.62, status: 'BELLIGERENT', color: '#c04a28' },
  { name: 'Beijing, China', lat: 39.91, lon: 116.39, status: 'MONITORING', color: '#d4b26a' },
];

const WX_CODES = {
  0:'Clear',1:'Clear',2:'Partly cloudy',3:'Overcast',
  45:'Fog',48:'Icy fog',51:'Light drizzle',53:'Drizzle',55:'Heavy drizzle',
  61:'Light rain',63:'Rain',65:'Heavy rain',71:'Light snow',73:'Snow',75:'Heavy snow',
  80:'Rain showers',81:'Rain showers',82:'Violent showers',
  85:'Snow showers',86:'Heavy snow showers',
  95:'Thunderstorm',96:'Thunderstorm+hail',99:'Severe thunderstorm'
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=1800'); // 30 min cache

  try {
    const lats = ZONES.map(z => z.lat).join(',');
    const lons = ZONES.map(z => z.lon).join(',');
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,wind_speed_10m,precipitation,weather_code,apparent_temperature&hourly=temperature_2m&forecast_days=1&timezone=auto`;

    const { status, body } = await fetch(url);

    let zones = ZONES.map(z => ({ ...z, temp: null, wind: null, precip: null, condition: 'Unknown' }));

    if (status === 200) {
      try {
        // Open Meteo returns array when multiple lat/lons given
        const data = JSON.parse(body);
        const arr = Array.isArray(data) ? data : [data];
        arr.forEach((d, i) => {
          if (!zones[i]) return;
          const c = d.current || {};
          zones[i].temp = c.temperature_2m;
          zones[i].apparent = c.apparent_temperature;
          zones[i].wind = c.wind_speed_10m;
          zones[i].precip = c.precipitation;
          zones[i].condition = WX_CODES[c.weather_code] || 'Unknown';
          zones[i].code = c.weather_code;
          zones[i].timezone = d.timezone_abbreviation || '';
        });
      } catch (_) {}
    }

    res.json({ zones, updated: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message, zones: ZONES });
  }
};
