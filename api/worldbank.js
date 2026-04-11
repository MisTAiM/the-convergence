const https = require('https');

function wb(indicator, country = 'WLD') {
  return new Promise((resolve) => {
    const url = `https://api.worldbank.org/v2/country/${country}/indicator/${indicator}?format=json&per_page=25&mrv=25`;
    https.get(url, { headers: { 'User-Agent': 'TheConvergence/3.0' } }, (res) => {
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
    }).on('error', () => resolve({})).setTimeout(8000, function() { this.destroy(); resolve({}); });
  });
}

module.exports = async (req, res) => {
  const [lifeExp, infantMort, gdpGrowth, military, fossil, internet, forest, poverty, unemployment, renewables, debtUS] = await Promise.all([
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
  ]);

  const result = {
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
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 's-maxage=3600');
  res.end(JSON.stringify(result));
};
