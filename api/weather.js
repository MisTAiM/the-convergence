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

module.exports = async (req, res) => {
  const cities = await Promise.all(CITIES.map(fetchCity));
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 's-maxage=600');
  res.end(JSON.stringify({ fetchedAt: new Date().toISOString(), cities }));
};
