// /api/weather.js — Open Meteo: city weather + conflict zone conditions (merged)
const https = require('https');

const CITIES = [
  { name: 'New York', lat: 40.7128, lon: -74.006 },
  { name: 'London', lat: 51.5074, lon: -0.1278 },
  { name: 'Tehran', lat: 35.6892, lon: 51.389 },
  { name: 'Jerusalem', lat: 31.7683, lon: 35.2137 },
  { name: 'Beijing', lat: 39.9042, lon: 116.4074 },
  { name: 'Moscow', lat: 55.7558, lon: 37.6176 },
  { name: 'Islamabad', lat: 33.6844, lon: 73.0479 },
  { name: 'Kyiv', lat: 50.4501, lon: 30.5234 },
  { name: 'Tel Aviv', lat: 32.0853, lon: 34.7818 },
  { name: 'Khartoum', lat: 15.5007, lon: 32.5599 },
];

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
  80:'Showers',81:'Showers',82:'Violent showers',95:'Thunderstorm',96:'Thunderstorm',99:'Severe storm'
};

function fetchCity(city) {
  return new Promise((resolve) => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&temperature_unit=fahrenheit&timezone=auto`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const d = JSON.parse(data);
          const c = d.current;
          resolve({ ...city, tempF: Math.round(c.temperature_2m * 10) / 10, wind: Math.round(c.wind_speed_10m), humidity: c.relative_humidity_2m, code: c.weather_code });
        } catch { resolve({ ...city, error: true }); }
      });
    }).on('error', () => resolve({ ...city, error: true })).setTimeout(6000, function() { this.destroy(); resolve({ ...city, error: true }); });
  });
}

function fetchZone(zone) {
  return new Promise((resolve) => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${zone.lat}&longitude=${zone.lon}&current=temperature_2m,apparent_temperature,wind_speed_10m,precipitation,weather_code&timezone=auto`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const d = JSON.parse(data);
          const c = d.current || {};
          resolve({ ...zone, temp: c.temperature_2m, apparent: c.apparent_temperature, wind: c.wind_speed_10m, precip: c.precipitation, condition: WX_CODES[c.weather_code] || 'Unknown', code: c.weather_code });
        } catch { resolve({ ...zone, temp: null, condition: 'Unknown' }); }
      });
    }).on('error', () => resolve({ ...zone, temp: null, condition: 'Unknown' })).setTimeout(6000, function() { this.destroy(); resolve({ ...zone, temp: null, condition: 'Unknown' }); });
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=1200');

  const [cityResults, zoneResults] = await Promise.all([
    Promise.all(CITIES.map(c => fetchCity(c))),
    Promise.all(ZONES.map(z => fetchZone(z)))
  ]);

  res.json({
    cities: cityResults,
    zones: zoneResults,
    updated: new Date().toISOString()
  });
};
