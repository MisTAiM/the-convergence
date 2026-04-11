const https = require('https');

module.exports = async (req, res) => {
  const p = new Promise((resolve) => {
    https.get('https://open.er-api.com/v6/latest/USD', (r) => {
      let data = '';
      r.on('data', c => data += c);
      r.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(null); }
      });
    }).on('error', () => resolve(null)).setTimeout(6000, function() { this.destroy(); resolve(null); });
  });

  const d = await p;
  const rates = d ? {
    fetchedAt: new Date().toISOString(),
    date: d.time_last_update_utc,
    rates: d.rates
  } : { error: true, fetchedAt: new Date().toISOString() };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 's-maxage=900');
  res.end(JSON.stringify(rates));
};
