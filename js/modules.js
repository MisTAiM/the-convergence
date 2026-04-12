/* ============================================================
   THE CONVERGENCE — MODULES v3
   All module render functions
   ============================================================ */

/* ============ LIVE FEED ============ */
function renderLiveFeed(db) {
  const news = db.news || [];
  const top = news.slice(0, 6);
  const biz = news.filter(n => n.source === 'BBC Business').slice(0, 4);
  const nasa = news.filter(n => n.source === 'NASA').slice(0, 4);
  const science = news.filter(n => n.source === 'BBC Science').slice(0, 4);
  const tech = news.filter(n => n.source === 'BBC Tech').slice(0, 4);
  const aj = news.filter(n => n.source === 'Al Jazeera').slice(0, 4);

  function card(n) {
    const d = new Date(n.pubDate);
    const age = d.getTime() ? Math.round((Date.now() - d.getTime()) / 3600000) : '';
    const ageStr = age ? (age < 1 ? 'just now' : age < 24 ? age + 'h ago' : Math.round(age/24) + 'd ago') : '';
    return `<div class="news-card" onclick="window.open('${n.link}','_blank')">
      <div class="news-src">${n.source} · ${ageStr}</div>
      <div class="news-title">${n.title}</div>
      <div class="news-desc">${(n.description || '').slice(0, 120)}${n.description?.length > 120 ? '...' : ''}</div>
    </div>`;
  }
  function line(n) {
    return `<div style="padding:.7rem 0;border-bottom:1px solid var(--bdr);cursor:pointer" onclick="window.open('${n.link}','_blank')">
      <div style="font-size:.85rem;color:var(--pch);line-height:1.4;margin-bottom:.2rem">${n.title}</div>
      <div style="font-size:.75rem;color:var(--smk)">${(n.description || '').slice(0, 100)}</div>
      <div style="font-family:var(--fm);font-size:7.5px;color:var(--ash);margin-top:.2rem">${n.source} · ${n.pubDate?.slice(0, 16) || ''}</div>
    </div>`;
  }

  const topEl = document.getElementById('feed-top');
  if (topEl && top.length) topEl.innerHTML = top.map(card).join('');

  const bizEl = document.getElementById('feed-biz');
  if (bizEl) bizEl.innerHTML = (biz.length ? biz : news.slice(0, 4)).map(line).join('');

  const nasaEl = document.getElementById('feed-nasa');
  if (nasaEl) nasaEl.innerHTML = (nasa.length ? nasa : news.slice(4, 8)).map(line).join('');

  const sciEl = document.getElementById('feed-science');
  if (sciEl) sciEl.innerHTML = (science.length ? science : news.slice(8, 12)).map(line).join('');

  const techEl = document.getElementById('feed-tech');
  if (techEl) techEl.innerHTML = (tech.length ? tech : news.slice(12, 16)).map(line).join('');

  const ajEl = document.getElementById('feed-aj');
  if (ajEl) ajEl.innerHTML = (aj.length ? aj : news.slice(16, 20)).map(line).join('');
}

/* ============ CSI ============ */
function renderCSI(db) {
  const csi = db.csi[0];
  if (!csi) return;
  const el = document.getElementById('csi-score');
  const lbl = document.getElementById('csi-label');
  const trend = document.getElementById('csi-trend');
  if (el) el.textContent = csi.composite;
  if (lbl) {
    const label = csi.composite >= 80 ? 'CRITICAL' : csi.composite >= 70 ? 'HIGH STRESS' : csi.composite >= 55 ? 'ELEVATED' : 'MODERATE';
    lbl.textContent = `/ 100 — ${label}`;
  }
  if (trend && db.csi.length > 1) {
    const prev = db.csi[Math.min(4, db.csi.length - 1)].composite;
    const delta = csi.composite - prev;
    trend.textContent = (delta > 0 ? '↑ +' : delta < 0 ? '↓ ' : '→ ') + delta.toFixed(1) + ' pts vs 5 snapshots ago';
    trend.style.color = delta > 0 ? 'var(--ebrt)' : delta < 0 ? 'var(--jbrt)' : 'var(--ash)';
  }

  // Factor bars
  const s = csi.scores;
  const factors = { climate: s.climate, geopolitical: s.geopolitical, financial: s.financial, tech: s.tech, social: s.social, resource: s.resource, institutional: s.institutional, nuclear: s.nuclear };
  Object.entries(factors).forEach(([k, v]) => {
    const bar = document.getElementById('csi-' + k);
    if (bar) bar.style.width = v + '%';
    const val = document.getElementById('csiv-' + k);
    if (val) val.textContent = v + '/100';
  });

  // Rotate gauge needle
  const needle = document.getElementById('csi-needle');
  if (needle) {
    const angle = -130 + (csi.composite / 100) * 260;
    needle.setAttribute('transform', `rotate(${angle}, 150, 150)`);
  }
  const arc = document.getElementById('csi-arc');
  if (arc) {
    const dashOffset = 440 - (csi.composite / 100) * 440 * 0.77;
    arc.setAttribute('stroke-dashoffset', dashOffset.toFixed(1));
  }
}

/* ============ HORSEMEN ============ */
function renderHorsemen(db) {
  const wb = db.worldbank;
  const news = db.news || [];

  const warCount = news.filter(n => ['war','conflict','attack','strikes','missiles','troops','killed'].some(w => n.title.toLowerCase().includes(w))).length;
  const warSev = Math.min(100, 50 + warCount * 8);

  const famineCount = news.filter(n => ['famine','hunger','food','shortage','starv'].some(w => n.title.toLowerCase().includes(w))).length;
  const povertyPct = DataEngine.getLatest(wb.extremePoverty) || 10.4;
  const famineSev = Math.min(100, 30 + famineCount * 8 + (povertyPct > 10 ? 20 : 10));

  const plagueCount = news.filter(n => ['virus','outbreak','pandemic','disease','epidemic','covid'].some(w => n.title.toLowerCase().includes(w))).length;
  const plagueSev = Math.min(100, 20 + plagueCount * 15);

  const lifeExp = DataEngine.getLatest(wb.lifeExpectancy) || 73.5;
  const infantMort = DataEngine.getLatest(wb.infantMortality) || 27.7;
  const deathSev = Math.min(100, Math.max(10, 100 - Math.round(lifeExp - 50)));

  const setHorse = (id, sev, stat) => {
    const el = document.getElementById(id + '-sev');
    if (el) el.style.width = sev + '%';
    const sv = document.getElementById(id + '-score');
    if (sv) sv.textContent = sev + '/100';
    const st = document.getElementById(id + '-stat');
    if (st && stat) st.textContent = stat;
  };

  setHorse('war', warSev, warCount + ' conflict headlines');
  setHorse('famine', famineSev, Math.round(povertyPct * 80) + 'M extreme poverty');
  setHorse('plague', plagueSev, plagueCount ? plagueCount + ' outbreak headlines' : 'Monitor only');
  setHorse('death', deathSev, lifeExp.toFixed(1) + 'yr life expectancy');

  const infantEl = document.getElementById('infant-mort');
  if (infantEl) infantEl.textContent = infantMort.toFixed(1) + '/1,000';
}

/* ============ PROPHECY MATCHER ============ */
function renderProphecyMatcher(db) {
  const matches = db.textMatches || [];
  const container = document.getElementById('matcher-list');
  if (!container) return;

  if (!matches.length) {
    container.innerHTML = '<div style="padding:2rem;color:var(--smk);font-style:italic">Loading live matches...</div>';
    return;
  }

  container.innerHTML = matches.slice(0, 8).map(m => `
    <div class="match-row match-auto">
      <div class="match-news">
        <span class="match-src">${m.news.source} · LIVE</span>
        ${m.news.title}
        <div style="font-family:var(--fm);font-size:7.5px;color:var(--gdim);margin-top:.4rem">Keywords: ${m.matchedKeywords.join(', ')}</div>
      </div>
      <div class="match-arrow">↔</div>
      <div class="match-text">
        <span class="match-cite">${m.textMatch.source}</span>
        ${m.textMatch.text}
      </div>
    </div>
  `).join('');
}

/* ============ FINANCE ============ */
function renderFinance(db) {
  const fx = db.fx;
  if (!fx?.rates) return;

  const PAIRS = [
    { code: 'EUR', flag: '🇪🇺', name: 'Euro' },
    { code: 'GBP', flag: '🇬🇧', name: 'Pound' },
    { code: 'JPY', flag: '🇯🇵', name: 'Yen' },
    { code: 'CNY', flag: '🇨🇳', name: 'Yuan' },
    { code: 'INR', flag: '🇮🇳', name: 'Rupee' },
    { code: 'BRL', flag: '🇧🇷', name: 'Real' },
    { code: 'ZAR', flag: '🇿🇦', name: 'Rand' },
    { code: 'CHF', flag: '🇨🇭', name: 'Franc' },
    { code: 'AUD', flag: '🇦🇺', name: 'AUD' },
    { code: 'RUB', flag: '🇷🇺', name: 'Ruble' },
  ];

  const fxEl = document.getElementById('fx-grid');
  if (fxEl) {
    fxEl.innerHTML = PAIRS.map(p => {
      const rate = fx.rates[p.code];
      if (!rate) return '';
      return `<div class="fx-card">
        <div style="font-size:1.2rem;margin-bottom:.3rem">${p.flag}</div>
        <div style="font-family:var(--fm);font-size:8px;color:var(--ash);letter-spacing:.15em">${p.code}</div>
        <div style="font-family:var(--fd);font-size:1.6rem;font-weight:700;color:var(--pch);line-height:1.1;margin:.3rem 0">${rate > 100 ? Math.round(rate) : rate.toFixed(3)}</div>
        <div style="font-family:var(--fm);font-size:7px;color:var(--ash)">${p.name}</div>
      </div>`;
    }).join('');
  }

  const fxDate = document.getElementById('fx-date');
  if (fxDate && fx.date) fxDate.textContent = 'Live · ' + new Date(fx.date).toLocaleString();
}

/* ============ WEATHER ============ */
function renderWeather(db) {
  const cities = db.weather || [];
  if (!cities.length) return;

  const WEATHER_CODES = {
    0: 'Clear', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Foggy', 48: 'Fog', 51: 'Drizzle', 53: 'Drizzle', 55: 'Drizzle',
    61: 'Rain', 63: 'Rain', 65: 'Heavy rain', 71: 'Snow', 73: 'Snow',
    80: 'Showers', 81: 'Showers', 82: 'Heavy showers',
    85: 'Snow', 86: 'Snow', 95: 'Thunderstorm', 99: 'Hail'
  };

  const el = document.getElementById('weather-grid');
  if (!el) return;

  const CITY_NOTES = {
    'Tehran': '◆ Iran talks active',
    'Islamabad': '◆ US-Iran ceasefire talks',
    'Kyiv': '◆ Easter truce',
    'Tel Aviv': '◆ Lebanon negotiations',
    'Khartoum': '◆ Worst humanitarian crisis',
  };

  el.innerHTML = cities.map(c => {
    if (c.error) return '';
    const note = CITY_NOTES[c.name] || '';
    const tempColor = c.tempF > 90 ? 'var(--ebrt)' : c.tempF < 32 ? 'var(--ibrt)' : 'var(--gld)';
    return `<div class="wx-card">
      <div class="wx-city">${c.name}</div>
      <div class="wx-temp" style="color:${tempColor}">${c.tempF}°F</div>
      <div class="wx-detail">${WEATHER_CODES[c.code] || 'Unknown'}</div>
      <div class="wx-detail">Wind ${c.wind} km/h · ${c.humidity}% RH</div>
      ${note ? `<div style="font-family:var(--fm);font-size:7px;color:var(--ebrt);margin-top:.3rem">${note}</div>` : ''}
    </div>`;
  }).join('');

  const wDate = document.getElementById('weather-date');
  if (wDate) wDate.textContent = 'Live · Open-Meteo · ' + new Date().toLocaleTimeString();
}

/* ============ PREDICTIONS ============ */
function renderPredictions(db) {
  const preds = DataEngine.generatePredictions(db);
  const el = document.getElementById('pred-list');
  if (!el) return;

  el.innerHTML = preds.map(p => {
    const confColor = p.confidence >= 80 ? 'badge-r' : p.confidence >= 60 ? 'badge-g' : 'badge-i';
    const confLabel = p.confidence >= 80 ? 'HIGH' : p.confidence >= 60 ? 'MEDIUM' : 'LOW-MED';
    return `<div class="pred-item">
      <div style="padding-right:1.5rem">
        <div class="pred-window">${p.window}</div>
        <span class="badge ${confColor}">${confLabel}</span>
        <div class="pred-bar-bg">
          <div class="pred-bar-fill" data-w="${p.confidence}" style="width:0%;background:${p.color}"></div>
        </div>
      </div>
      <div class="pred-content">
        <h4>${p.title}</h4>
        <p>${p.body}</p>
        <div class="pred-src">${p.src}</div>
      </div>
    </div>`;
  }).join('');
}

/* ============ HISTORY LOG ============ */
function renderHistoryLog(db) {
  const el = document.getElementById('history-list');
  if (!el) return;
  const history = db.history || [];

  if (!history.length) {
    el.innerHTML = '<div style="padding:2rem;color:var(--smk);font-style:italic">Building history log... check back after first full data cycle.</div>';
    return;
  }

  el.innerHTML = history.map((h, i) => {
    const prev = history[i + 1];
    const csiDelta = prev ? (h.csi - prev.csi) : 0;
    const deltaColor = csiDelta > 0 ? 'var(--ebrt)' : csiDelta < 0 ? 'var(--jbrt)' : 'var(--ash)';
    const deltaStr = csiDelta !== 0 ? ` (${csiDelta > 0 ? '+' : ''}${csiDelta.toFixed(1)})` : '';
    return `<div class="history-entry">
      <div>
        <div class="history-date">${h.date}</div>
        <div style="font-family:var(--fm);font-size:8px;color:var(--ash);margin-top:2px">${h.time?.slice(11,19) || ''} UTC</div>
        <div style="font-family:var(--fm);font-size:9px;font-weight:600;margin-top:.4rem;color:${h.csi >= 70 ? 'var(--ebrt)' : h.csi >= 55 ? 'var(--gld)' : 'var(--jbrt)'}">
          CSI: ${h.csi}/100<span style="color:${deltaColor};font-size:8px">${deltaStr}</span>
        </div>
      </div>
      <div class="history-data">
        ${h.topHeadlines ? h.topHeadlines.slice(0,2).map(t => `<div style="margin-bottom:.3rem;font-size:.82rem">◆ ${t}</div>`).join('') : ''}
        <div style="font-family:var(--fm);font-size:7.5px;color:var(--ash);margin-top:.4rem">
          ${h.patterns ? h.patterns + ' patterns detected · ' : ''}
          ${h.militarySpend ? 'Mil: ' + h.militarySpend.toFixed(2) + '% GDP · ' : ''}
          ${h.internetAccess ? 'Internet: ' + h.internetAccess.toFixed(1) + '% · ' : ''}
          ${h.lifeExp ? 'Life exp: ' + h.lifeExp.toFixed(1) + 'yr' : ''}
        </div>
      </div>
    </div>`;
  }).join('');
}

/* ============ PATTERN ENGINE ============ */
function renderPatternEngine(db) {
  const el = document.getElementById('patterns-list');
  if (!el) return;
  const patterns = db.patterns || [];

  if (!patterns.length) {
    el.innerHTML = '<div style="padding:2rem;color:var(--smk);font-style:italic">Analyzing patterns across data streams... requires at least one data cycle.</div>';
    return;
  }

  el.innerHTML = patterns.map(p => {
    const typeClass = p.type === 'critical' ? 'critical' : p.type === 'warning' ? 'warning' : 'positive';
    const tagClass = p.type === 'critical' ? 'badge-r' : p.type === 'warning' ? 'badge-g' : 'badge-t';
    const confColor = p.type === 'critical' ? 'var(--ebrt)' : p.type === 'warning' ? 'var(--gld)' : 'var(--jbrt)';
    const det = p.detected ? new Date(p.detected).toLocaleString() : '';
    return `<div class="pattern-card ${typeClass}">
      <span class="badge ${tagClass}">${p.type.toUpperCase()} PATTERN</span>
      <h4 style="font-size:1.05rem;font-weight:600;margin-bottom:.5rem">${p.title}</h4>
      <p style="font-size:.85rem;color:var(--smk);line-height:1.7">${p.desc}</p>
      <div class="pattern-confidence">
        <div class="pattern-conf-bar"><div class="pattern-conf-fill" style="width:${p.confidence}%;background:${confColor}"></div></div>
        <span>${p.confidence}% confidence</span>
        <span style="margin-left:auto;font-size:7.5px;color:var(--ash)">${det}</span>
      </div>
    </div>`;
  }).join('');
}

/* ============ DATA TABLE ============ */
function renderDataTable(db) {
  const wb = db.worldbank;
  const el = document.getElementById('data-table-body');
  if (!el || !wb) return;
  const G = (obj) => DataEngine.getLatest(obj);

  const rows = [
    { ind: 'Global Extreme Poverty (<$2.15/day)', val: G(wb.extremePoverty)?.toFixed(1) + '%', trend: '↓', color: 'var(--jbrt)', src: 'World Bank API' },
    { ind: 'Global Internet Access', val: G(wb.internetAccess)?.toFixed(1) + '%', trend: '↑', color: 'var(--jbrt)', src: 'World Bank API' },
    { ind: 'Global Military Spending (% GDP)', val: G(wb.militarySpending)?.toFixed(2) + '%', trend: '↑', color: 'var(--ebrt)', src: 'World Bank API' },
    { ind: 'Global Fossil Fuel Energy Share', val: G(wb.fossilFuelShare)?.toFixed(1) + '%', trend: '↓', color: 'var(--gld)', src: 'World Bank API' },
    { ind: 'Global Forest Cover (% land)', val: G(wb.forestCover)?.toFixed(2) + '%', trend: '↓', color: 'var(--ebrt)', src: 'World Bank API' },
    { ind: 'Global Unemployment', val: G(wb.unemployment)?.toFixed(2) + '%', trend: '→', color: 'var(--gld)', src: 'World Bank API' },
    { ind: 'Global Life Expectancy', val: G(wb.lifeExpectancy)?.toFixed(1) + ' yr', trend: '↑', color: 'var(--jbrt)', src: 'World Bank API' },
    { ind: 'Renewable Electricity Share', val: G(wb.renewableElectricity)?.toFixed(1) + '%', trend: '↑', color: 'var(--jbrt)', src: 'World Bank API' },
    { ind: 'US Debt-to-GDP', val: G(wb.usDebtGDP)?.toFixed(1) + '%', trend: '↑', color: 'var(--ebrt)', src: 'World Bank API' },
    { ind: 'US GDP Growth', val: G(wb.gdpGrowth)?.toFixed(2) + '%', trend: '→', color: 'var(--gld)', src: 'World Bank API' },
    { ind: 'Dollar Reserve Share', val: '57.8%', trend: '↓', color: 'var(--ebrt)', src: 'IMF COFER' },
    { ind: 'Global Temp Anomaly', val: '1.47°C', trend: '↑', color: 'var(--ebrt)', src: 'NASA GISTEMP' },
  ];

  el.innerHTML = rows.map(r => `<tr>
    <td>${r.ind}</td>
    <td style="font-family:var(--fm);color:var(--pch)">${r.val || 'Loading...'}</td>
    <td style="color:${r.color};font-family:var(--fm)">${r.trend}</td>
    <td style="font-family:var(--fm);font-size:8px;color:var(--ash)">${r.src}</td>
  </tr>`).join('');
}

/* ============ CHARTS ============ */
let chartsInited = false;
function renderCharts(db) {
  if (chartsInited) return;
  chartsInited = true;

  const wb = db.worldbank;
  const CDef = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: '#6a6458', font: { family: "'JetBrains Mono'", size: 9 }, maxRotation: 45 }, grid: { color: 'rgba(212,178,106,0.06)' }, border: { color: 'rgba(212,178,106,0.1)' } },
      y: { ticks: { color: '#6a6458', font: { family: "'JetBrains Mono'", size: 9 } }, grid: { color: 'rgba(212,178,106,0.07)' }, border: { color: 'rgba(212,178,106,0.1)' } }
    }
  };

  const mkChart = (id, type, labels, data, opts) => {
    const el = document.getElementById(id);
    if (!el) return;
    try { new Chart(el, { type, data: { labels, datasets: [{ data, ...opts }] }, options: CDef }); }
    catch(e) { console.warn('Chart fail', id, e); }
  };

  // Temperature
  mkChart('chart-temp', 'bar', ['00','01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25'],
    [0.34,0.48,0.56,0.55,0.49,0.62,0.54,0.62,0.44,0.57,0.65,0.54,0.57,0.62,0.68,0.83,0.99,0.90,0.81,0.95,1.01,0.84,0.89,1.17,1.28,1.19],
    { backgroundColor: (ctx) => { const v = ctx.raw; return v >= 1.0 ? '#c04a28' : v >= 0.8 ? '#c8913a' : v >= 0.6 ? '#a07030' : '#6a6458'; }, borderWidth: 0 });

  // Dollar share
  mkChart('chart-dollar', 'line', ['2000','02','04','06','08','10','12','14','16','18','20','22','24'],
    [71.1,67.0,65.5,65.7,64.0,61.7,61.4,65.2,65.3,62.0,59.0,58.4,57.8],
    { borderColor: '#d4b26a', backgroundColor: 'rgba(212,178,106,0.07)', borderWidth: 2, tension: .4, fill: true, pointRadius: 4, pointBackgroundColor: '#d4b26a' });

  // US Debt
  const debtData = wb.usDebtGDP ? Object.entries(wb.usDebtGDP).sort().map(([y,v]) => ({ x: y, y: v })) : null;
  if (debtData) {
    mkChart('chart-debt', 'line', debtData.map(d => d.x.slice(2)), debtData.map(d => d.y),
      { borderColor: '#c04a28', backgroundColor: 'rgba(192,74,40,0.07)', borderWidth: 2, tension: .4, fill: true, pointRadius: 3, pointBackgroundColor: '#c04a28' });
  }

  // Military
  const milData = wb.militarySpending ? Object.entries(wb.militarySpending).sort().map(([y,v]) => ({ x: y, y: v })) : null;
  if (milData) {
    mkChart('chart-mil', 'line', milData.map(d => d.x.slice(2)), milData.map(d => d.y),
      { borderColor: '#7860c0', backgroundColor: 'rgba(120,96,192,0.07)', borderWidth: 2, tension: .4, fill: true, pointRadius: 3, pointBackgroundColor: '#7860c0' });
  }

  // Life expectancy
  const lifeData = wb.lifeExpectancy ? Object.entries(wb.lifeExpectancy).sort().map(([y,v]) => ({ x: y, y: v })) : null;
  if (lifeData) {
    mkChart('chart-life', 'line', lifeData.map(d => d.x.slice(2)), lifeData.map(d => d.y),
      { borderColor: '#28b088', backgroundColor: 'rgba(40,176,136,0.07)', borderWidth: 2, tension: .4, fill: true, pointRadius: 3, pointBackgroundColor: '#28b088' });
  }

  // AGI timeline — multi-dataset, must NOT call mkChart first (would corrupt the canvas)
  const agiEl = document.getElementById('chart-agi');
  if (agiEl) {
    try {
      new Chart(agiEl, {
        type: 'line',
        data: {
          labels: ['2026','2027','2028','2029','2030','2032','2035','2040'],
          datasets: [
            {
              label: 'Musk/Aggressive (2026)',
              data: [45,65,78,86,91,95,98,99],
              borderColor: '#c04a28',
              borderWidth: 2,
              borderDash: [5,4],
              tension: .4,
              pointRadius: 4,
              pointBackgroundColor: '#c04a28',
              fill: false
            },
            {
              label: 'DeepMind/Legg (50% by 2028)',
              data: [10,28,50,65,76,88,95,98],
              borderColor: '#d4b26a',
              backgroundColor: 'rgba(212,178,106,0.08)',
              borderWidth: 3,
              tension: .4,
              fill: true,
              pointRadius: 5,
              pointBackgroundColor: '#d4b26a',
              pointBorderColor: '#d4b26a'
            },
            {
              label: 'Metaculus Community',
              data: [9,18,33,47,60,78,90,96],
              borderColor: '#7860c0',
              borderWidth: 2,
              borderDash: [3,3],
              tension: .4,
              pointRadius: 4,
              pointBackgroundColor: '#7860c0',
              fill: false
            },
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'bottom',
              labels: {
                color: '#a09880',
                font: { family: "'JetBrains Mono'", size: 9 },
                boxWidth: 24,
                padding: 12,
                usePointStyle: true
              }
            },
            tooltip: {
              callbacks: {
                label: ctx => `${ctx.dataset.label}: ${ctx.raw}% probability`
              }
            }
          },
          scales: {
            x: {
              ticks: { color: '#6a6458', font: { family: "'JetBrains Mono'", size: 9 } },
              grid: { color: 'rgba(212,178,106,0.06)' },
              border: { color: 'rgba(212,178,106,0.1)' }
            },
            y: {
              min: 0, max: 100,
              ticks: { color: '#6a6458', font: { family: "'JetBrains Mono'", size: 9 }, callback: v => v + '%' },
              grid: { color: 'rgba(212,178,106,0.07)' },
              border: { color: 'rgba(212,178,106,0.1)' }
            }
          }
        }
      });
    } catch(e) { console.error('AGI chart error:', e); }
  }

  // CSI history chart
  if (db.csi.length > 1) {
    const csiHistory = db.csi.slice(0, 30).reverse();
    const csiEl = document.getElementById('chart-csi');
    if (csiEl) {
      try {
        new Chart(csiEl, {
          type: 'line',
          data: {
            labels: csiHistory.map(c => new Date(c.timestamp).toLocaleDateString()),
            datasets: [{
              data: csiHistory.map(c => c.composite),
              borderColor: '#c04a28', backgroundColor: 'rgba(192,74,40,0.1)',
              borderWidth: 2, tension: .4, fill: true, pointRadius: 4, pointBackgroundColor: '#c04a28'
            }]
          },
          options: { ...CDef, scales: { ...CDef.scales, y: { ...CDef.scales.y, min: 0, max: 100 } } }
        });
      } catch(e) {}
    }
  }
}

/* ============ TIPPING SIMULATOR ============ */
function initTippingSimulator() {
  if (document.getElementById('tip-inited')) return;
  const TIPS = [
    { n: 'Warm-water coral reefs', temp: 1.0, c: 'var(--ebrt)' },
    { n: 'Greenland ice sheet (destabilization)', temp: 1.5, c: 'var(--ebrt)' },
    { n: 'West Antarctic ice sheet', temp: 1.5, c: 'var(--ebrt)' },
    { n: 'Boreal permafrost abrupt thaw', temp: 1.5, c: 'var(--gld)' },
    { n: 'Amazon rainforest dieback', temp: 2.0, c: 'var(--gld)' },
    { n: 'Atlantic circulation (AMOC) collapse', temp: 2.0, c: 'var(--gld)' },
    { n: 'Sahel / W. African monsoon shift', temp: 2.5, c: 'var(--gld)' },
    { n: 'East Antarctic ice sheet regions', temp: 3.0, c: 'var(--vbrt)' },
    { n: 'Boreal forest dieback', temp: 3.0, c: 'var(--vbrt)' },
  ];

  const nodesEl = document.getElementById('tip-nodes');
  if (!nodesEl) return;
  nodesEl.setAttribute('id', 'tip-nodes');
  document.body.setAttribute('data-tip-inited', '1');

  nodesEl.innerHTML = TIPS.map((s, i) => `
    <div class="tip-node" id="tipn${i}">
      <div class="tip-indicator" id="tipi${i}"></div>
      <div class="tip-label">${s.n}</div>
      <div class="tip-temp">&gt;${s.temp}°C</div>
    </div>
  `).join('');

  const slider = document.getElementById('tip-slider');
  const valEl = document.getElementById('tip-val');
  const resEl = document.getElementById('tip-result');
  if (!slider) return;

  const update = () => {
    const v = parseFloat(slider.value);
    if (valEl) valEl.textContent = v.toFixed(1) + '°C';
    let triggered = 0;
    TIPS.forEach((s, i) => {
      const nd = document.getElementById('tipn' + i);
      const ind = document.getElementById('tipi' + i);
      if (v >= s.temp) { nd?.classList.add('triggered'); if (ind) { ind.style.background = s.c; ind.style.borderColor = s.c; } triggered++; }
      else { nd?.classList.remove('triggered'); if (ind) { ind.style.background = ''; ind.style.borderColor = ''; } }
    });
    if (!resEl) return;
    let msg = '';
    if (v < 1.2) msg = '<span style="color:var(--jbrt)">Pre-current levels.</span> The 2024 peak was already 1.47°C.';
    else if (v < 1.5) msg = `<span style="color:var(--gld)">${triggered} system(s) triggered.</span> Coral reefs past tipping. Greenland approaching threshold.`;
    else if (v < 2.0) msg = `<span style="color:var(--gld)">${triggered} systems triggered.</span> Greenland/W. Antarctic destabilizing. Permafrost releasing methane. Feedback loops active.`;
    else if (v < 2.5) msg = `<span style="color:var(--ebrt)">${triggered} systems triggered.</span> AMOC collapse likely. Amazon converting to savanna. 500M+ displaced.`;
    else msg = `<span style="color:var(--ebrt)">${triggered}/${TIPS.length} SYSTEMS TRIGGERED.</span> Cascade mode. Civilizational reorganization forced at unprecedented speed.`;
    resEl.innerHTML = `<strong style="font-family:var(--fm);font-size:8.5px;letter-spacing:.1em;text-transform:uppercase">At ${v.toFixed(1)}°C:</strong><br><br>${msg}`;
  };

  slider.addEventListener('input', update);
  update();
}

/* ============ SURVIVAL PROFILE ============ */
function initSurvivalProfile() {
  window.calcSurvival = function() {
    const vals = [1,2,3,4,5,6].map(i => parseInt(document.getElementById('surv' + i)?.value || 1));
    const tot = vals.reduce((a,b) => a+b, 0);
    const pct = Math.round(tot / 18 * 100);
    const res = document.getElementById('surv-out');
    const score = document.getElementById('surv-score');
    const lbl = document.getElementById('surv-lbl');
    const txt = document.getElementById('surv-txt');
    const act = document.getElementById('surv-act');
    if (!res) return;
    let col, label, desc, action;
    if (pct >= 80) { col = 'var(--jbrt)'; label = 'RESILIENT'; desc = "Your profile reflects high social capital, practical skills, and information independence. Putnam's research: communities like yours have the highest crisis survival rates. You are Tobit. Keep building."; action = 'Deepen community ties. Document your skills. Help others build resilience. You are ahead of the curve.'; }
    else if (pct >= 60) { col = 'var(--gld)'; label = 'MODERATE'; desc = "Meaningful resilience in some areas but dependencies that could become critical in major disruption. You have the foundation — now build on it."; action = 'Expand your immediate community network. Add one practical skill this year. Diversify your information sources.' }
    else if (pct >= 40) { col = 'var(--gld)'; label = 'VULNERABLE'; desc = "Significant dependencies on complex systems that may not function during disruption. This is fixable now."; action = 'Urgent: identify 5 neighbors by name this month. Learn one practical skill. Reduce one major financial dependency.' }
    else { col = 'var(--ebrt)'; label = 'HIGH RISK'; desc = "Deep system dependency. One real relationship is worth more than a thousand digital connections."; action = 'Start here: introduce yourself to your immediate neighbors this week. Everything follows from that.' }
    if (score) { score.textContent = pct + '%'; score.style.color = col; }
    if (lbl) lbl.textContent = '/ 100 — ' + label;
    if (txt) txt.textContent = desc;
    if (act) act.innerHTML = `<div style="font-family:var(--fm);font-size:8.5px;color:var(--gld);letter-spacing:.12em;text-transform:uppercase;margin-bottom:.6rem">Recommended Action</div><p style="font-size:.82rem;color:var(--smk);line-height:1.65">${action}</p>`;
    res.style.display = 'block';
  };
}

/* ============ ORACLE ============ */
const ORACLE_DB = {
  war: [{ e: 'Iran war / active conflict', t: '"At the time of the end, the king of the south shall attack him. But the king of the north shall rush against him, like a whirlwind."', c: 'Daniel 11:40' }, { e: 'Earth filled with violence', t: '"And the earth was filled with violence."', c: 'Genesis 6:11 / Book of Enoch 9:1' }],
  ai: [{ e: 'AI / technology before readiness', t: '"Azazel taught men to make swords, and knives, and shields... and there arose much godlessness."', c: 'Book of Enoch 8:1' }, { e: 'Inner knowing vs external systems', t: '"If you do not bring forth what is within you, what you do not have within you will destroy you."', c: 'Gospel of Thomas, Saying 70' }],
  debt: [{ e: 'US debt / dollar hegemony eroding', t: '"The borrower is slave to the lender."', c: 'Proverbs 22:7' }, { e: 'Commercial empire failing', t: '"Fallen, fallen is Babylon the great!"', c: 'Revelation 18:2' }],
  climate: [{ e: 'Ocean heat / climate tipping', t: '"The earth mourns and withers. The heavens languish together with the earth."', c: 'Isaiah 24:4' }, { e: 'Tipping point cascade', t: '"The elements will be dissolved with fire, and the earth and the works done on it will be exposed."', c: 'Apocalypse of Peter / 2 Peter 3:10' }],
  empire: [{ e: 'US empire 250yr mark', t: '"You are the head of gold. After you shall arise another kingdom inferior to you."', c: 'Daniel 2:38-39' }, { e: 'Dollar reserve declining', t: '"Fallen, fallen is Babylon the great!"', c: 'Revelation 18:2' }],
  trade: [{ e: 'Hormuz / shipping disruption', t: '"All shipmasters and seafarers stood far off."', c: 'Revelation 18:17' }, { e: 'Commodity price shock', t: '"A quart of wheat for a day\'s wages."', c: 'Revelation 6:6' }],
  fire: [{ e: 'War strikes / burning', t: '"I will send fire on Magog and on those who live securely in the coastlands."', c: 'Ezekiel 39:6' }, { e: 'Purifying fire', t: '"The elements will be dissolved with fire... and the works done on it will be exposed."', c: 'Apocalypse of Peter' }],
  knowledge: [{ e: 'Forbidden knowledge / AGI / CRISPR', t: '"Azazel taught men to make swords... Semjaza taught enchantments. And there arose much godlessness."', c: 'Book of Enoch 8:1-2' }, { e: 'Knowledge without wisdom', t: '"The man has become like one of us, knowing good and evil."', c: 'Genesis 3:22' }],
  babylon: [{ e: 'Commercial empire / luxury economy', t: '"The merchants of the earth have grown rich from the power of her luxury."', c: 'Revelation 18:3' }, { e: 'Trade routes disrupted', t: '"And the fruit for which your soul longed has gone from you."', c: 'Revelation 18:14' }],
  moon: [{ e: 'NASA / space mission / Artemis', t: '"The book of the courses of the luminaries of the heaven... Uriel the holy angel showed me all their laws."', c: 'Book of Enoch 72:1' }],
  plague: [{ e: 'Pandemic / outbreak', t: '"There will be great earthquakes, famines and pestilences in various places."', c: 'Luke 21:11' }],
  iran: [{ e: 'Iran war / ceasefire / diplomacy', t: '"At the time of the end... the king of the north shall rush against him like a whirlwind, with chariots and horsemen."', c: 'Daniel 11:40' }],
  nuclear: [{ e: 'Nuclear weapons / warheads', t: '"And he taught men to make swords, knives, shields... and there arose much godlessness."', c: 'Book of Enoch 8:1' }],
  food: [{ e: 'Food prices / hunger / famine', t: '"A quart of wheat for a day\'s wages, and three quarts of barley for a day\'s wages."', c: 'Revelation 6:6' }],
  truth: [{ e: 'Disinformation / fake news / AI content', t: '"Know what is in front of your face, and what is hidden from you will be disclosed."', c: 'Gospel of Thomas, Saying 5' }, { e: 'Loss of inner discernment', t: '"If you do not bring forth what is within you, it will destroy you."', c: 'Gospel of Thomas, Saying 70' }],
  community: [{ e: 'Community / mutual aid / social capital', t: '"When you give a feast, invite the poor, the crippled, the lame, the blind."', c: 'Luke 14:13' }, { e: 'Ordinary faithfulness', t: '"Thus he did year by year... and the Lord listened to him."', c: 'Book of Tobit 1:6-7' }],
  cycle: [{ e: 'Historical cycles / patterns', t: '"And there shall be a great pestilence, and much distress upon the earth."', c: 'Book of Jubilees 23:13' }, { e: 'Generational cycles', t: '"When the years are fulfilled... they will return to right conduct."', c: 'Book of Jubilees 23:29' }],
  restoration: [{ e: 'Recovery / rebuilding / hope', t: '"And there will be no old men nor those who are not satisfied with their days."', c: 'Book of Jubilees 23:28' }, { e: 'Refinement not destruction', t: '"The fire tests the work of each one, and the fire will disclose it."', c: 'Apocalypse of Peter / 1 Cor 3:13' }],
};

function initOracle(db) {
  const presets = document.getElementById('oracle-presets');
  if (presets && !presets.dataset.inited) {
    presets.dataset.inited = '1';
    const keys = Object.keys(ORACLE_DB);
    presets.innerHTML = '<span style="font-family:var(--fm);font-size:8px;color:var(--ash);align-self:center">Quick:</span>' +
      keys.map(k => `<button onclick="queryOracle('${k}')" style="background:transparent;border:1px solid var(--bdr);color:var(--ash);font-family:var(--fm);font-size:8px;letter-spacing:.1em;padding:3px 10px;cursor:pointer;transition:all .15s" onmouseover="this.style.borderColor='var(--gld)';this.style.color='var(--gld)'" onmouseout="this.style.borderColor='var(--bdr)';this.style.color='var(--ash)'">${k}</button>`).join('');
  }

  window.queryOracle = function(q) {
    const input = document.getElementById('oracle-input');
    if (input) input.value = q;
    runOracle();
  };

  window.runOracle = function() {
    const q = (document.getElementById('oracle-input')?.value || '').toLowerCase().trim();
    const res = document.getElementById('oracle-results');
    if (!res) return;
    let matches = [];
    Object.entries(ORACLE_DB).forEach(([k, v]) => {
      if (q.includes(k) || k.includes(q)) matches = [...matches, ...v];
    });
    res.style.display = 'flex';
    res.style.flexDirection = 'column';
    if (!matches.length) {
      res.innerHTML = `<div style="padding:2rem;background:var(--surf);color:var(--smk);font-size:.88rem;font-style:italic">No match for "${q}". Try: ${Object.keys(ORACLE_DB).slice(0,8).join(', ')}...</div>`;
      return;
    }
    // Also auto-search news
    const newsMatches = (db.news || []).filter(n => n.title.toLowerCase().includes(q)).slice(0, 3);
    const newsSection = newsMatches.length ? `<div style="background:rgba(212,178,106,0.04);padding:1rem;margin-bottom:2px;border-left:2px solid var(--gdim)"><div style="font-family:var(--fm);font-size:8px;color:var(--gld);margin-bottom:.5rem">LIVE NEWS MATCHING "${q}":</div>${newsMatches.map(n => `<div style="font-size:.82rem;color:var(--smk);margin-bottom:.3rem">◆ [${n.source}] ${n.title}</div>`).join('')}</div>` : '';
    res.innerHTML = newsSection + matches.slice(0, 6).map(m => `
      <div class="oracle-result">
        <div class="oracle-event">${m.e}</div>
        <div class="oracle-sep">↔</div>
        <div class="oracle-passage">${m.t}<cite>${m.c}</cite></div>
      </div>
    `).join('');
  };

  document.getElementById('oracle-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') runOracle(); });
}

/* ============ DEAD RECKONING ENGINE ============ */
function renderDeadReckoning(db) {
  const posEl = document.getElementById('dr-position');
  const headEl = document.getElementById('dr-heading');
  if (!posEl || !headEl) return;

  const csi = db.csi[0];
  const history = db.history || [];
  const patterns = db.patterns || [];
  const wb = db.worldbank || {};

  // Need survival data from session storage (set when user runs calcSurvival)
  const survData = sessionStorage.getItem('convergence_surv_score');
  const survScore = survData ? parseInt(survData) : null;

  // Calculate CSI trajectory
  const csiScore = csi ? csi.composite : 74;
  const csiTrend = history.length > 1 ? (history[0].csi || 74) - (history[Math.min(4, history.length-1)].csi || 72) : 0;
  const csiLabel = csiScore >= 80 ? 'CRITICAL' : csiScore >= 70 ? 'HIGH STRESS' : csiScore >= 55 ? 'ELEVATED' : 'MODERATE';

  // Build position assessment
  const warNews = (db.news || []).filter(n => ['war','attack','missiles','conflict'].some(w => n.title.toLowerCase().includes(w))).length;
  const lifeExp = DataEngine.getLatest(wb.lifeExpectancy) || 73.5;

  posEl.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:1rem">
      <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--bdr);padding-bottom:.8rem">
        <span style="font-family:var(--fm);font-size:8.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ash)">CSI Score (Now)</span>
        <span style="font-family:var(--fm);color:${csiScore >= 70 ? 'var(--ebrt)' : 'var(--gld)'}"><strong>${csiScore}/100</strong> — ${csiLabel}</span>
      </div>
      <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--bdr);padding-bottom:.8rem">
        <span style="font-family:var(--fm);font-size:8.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ash)">CSI Trajectory</span>
        <span style="color:${csiTrend > 0 ? 'var(--ebrt)' : csiTrend < 0 ? 'var(--jbrt)' : 'var(--ash)'};font-family:var(--fm)">${csiTrend > 0 ? '↑ Rising +' + csiTrend.toFixed(1) : csiTrend < 0 ? '↓ Falling ' + csiTrend.toFixed(1) : '→ Stable'}</span>
      </div>
      <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--bdr);padding-bottom:.8rem">
        <span style="font-family:var(--fm);font-size:8.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ash)">Active Conflict Headlines</span>
        <span style="font-family:var(--fm);color:${warNews >= 5 ? 'var(--ebrt)' : warNews >= 2 ? 'var(--gld)' : 'var(--jbrt)'}">${warNews} in current feed</span>
      </div>
      <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--bdr);padding-bottom:.8rem">
        <span style="font-family:var(--fm);font-size:8.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ash)">Patterns Detected</span>
        <span style="font-family:var(--fm);color:var(--gld)">${patterns.length} active pattern${patterns.length !== 1 ? 's' : ''}</span>
      </div>
      <div style="display:flex;justify-content:space-between">
        <span style="font-family:var(--fm);font-size:8.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ash)">Your Resilience Score</span>
        <span style="font-family:var(--fm);color:${!survScore ? 'var(--ash)' : survScore >= 70 ? 'var(--jbrt)' : survScore >= 50 ? 'var(--gld)' : 'var(--ebrt)'}">${survScore ? survScore + '%' : 'Run Survival Profile ↑'}</span>
      </div>
    </div>
  `;

  // Build heading recommendation
  const highStress = csiScore >= 70;
  const rising = csiTrend > 2;
  const communityWeak = survScore && survScore < 50;
  const communityStrong = survScore && survScore >= 70;

  let heading = '';
  if (communityStrong && !rising) {
    heading = `<div style="color:var(--jbrt);font-size:1rem;font-weight:600;margin-bottom:.8rem">✓ Maintain & Extend</div>
      <p style="font-size:.92rem;color:var(--smk);line-height:1.85">Your resilience profile is strong. The Pattern Engine shows elevated but stable stress. Your heading for the next 12 months: <strong style="color:var(--pch)">deepen what you have built and begin extending your network outward</strong>. Identify three people in your community with lower resilience scores and begin building genuine relationships with them. The Thomas principle: you cannot bring forth what you haven't cultivated. In a high-resilience position, cultivation means community expansion.</p>`;
  } else if (highStress && rising && communityWeak) {
    heading = `<div style="color:var(--ebrt);font-size:1rem;font-weight:600;margin-bottom:.8rem">⚠ Immediate Course Correction</div>
      <p style="font-size:.92rem;color:var(--smk);line-height:1.85">CSI is high and rising. Your resilience profile shows significant vulnerabilities. Your heading for the next 12 months: <strong style="color:var(--pch)">treat community building as your primary project, not a secondary one</strong>. The Pattern Engine's war-inflation correlation makes the next 6 months a critical window for building the relationships that function as your actual safety net. One concrete action this week: introduce yourself to five neighbors you don't know by name.</p>`;
  } else if (rising) {
    heading = `<div style="color:var(--gld);font-size:1rem;font-weight:600;margin-bottom:.8rem">→ Consolidate & Prepare</div>
      <p style="font-size:.92rem;color:var(--smk);line-height:1.85">The CSI trend is rising. The Pattern Engine has detected active stress patterns. Your heading: <strong style="color:var(--pch)">focus on consolidation over expansion for the next 12 months</strong>. Reduce financial leverage where possible. Strengthen the relationships you already have before building new ones. Add at least one practical skill to your repertoire. The Jubilees principle: preparation during the rising period, not during the crisis itself.</p>`;
  } else {
    heading = `<div style="color:var(--gld);font-size:1rem;font-weight:600;margin-bottom:.8rem">→ Build Systematically</div>
      <p style="font-size:.92rem;color:var(--smk);line-height:1.85">The CSI score is elevated but the pattern engine shows no acute acceleration. Your heading: <strong style="color:var(--pch)">use this window to build deliberately</strong>. This is the Infancy Gospel of James period — the quiet preparation before the crisis makes preparation necessary. Identify your three largest vulnerabilities from the Survival Profile and address one per quarter over the next year.</p>`;
  }

  headEl.innerHTML = heading;
}

// Hook into renderAll
const _origRenderAll = window.renderAll;
