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

/* ============================================================
   WORLD EVENTS GLOBE v2 — LIVE DATA
   Sources: USGS Earthquakes + NASA EONET + GDACS + News Feed
   Globe.gl + Three.js
   ============================================================ */

let globeInstance = null;
let globeInitialized = false;
let globeAllEvents = []; // all events (static + live)
let globeCurrentFilter = 'all';
let globeAutoRotate = true;
let globeLiveData = null; // cached /api/globe response

/* ─── COLOR SYSTEM ─────────────────────────────── */
const GLOBE_COLORS = {
  // Geopolitical
  war:       '#c04a28',
  economic:  '#d4b26a',
  climate:   '#28b088',
  tech:      '#7860c0',
  diplomacy: '#4090d8',
  // Natural
  earthquake_red:    '#FF2222',
  earthquake_orange: '#FF8800',
  earthquake_yellow: '#FFD700',
  earthquake_green:  '#44CC66',
  wildfire:  '#FF4500',
  storm:     '#8B5CF6',
  cyclone:   '#8B5CF6',
  volcano:   '#FF6B00',
  flood:     '#06B6D4',
  tsunami:   '#0EA5E9',
  drought:   '#F59E0B',
  ice:       '#BAE6FD',
  landslide: '#92400E',
  disaster:  '#F97316',
  snow:      '#E0F2FE',
  event:     '#d4b26a',
};

function getEventColor(event) {
  const type = event.type || '';
  const sev = event.severity || '';
  if (type === 'earthquake') {
    const mag = event.magnitude || 4.5;
    if (mag >= 7) return GLOBE_COLORS.earthquake_red;
    if (mag >= 6) return GLOBE_COLORS.earthquake_orange;
    if (mag >= 5.5) return GLOBE_COLORS.earthquake_yellow;
    return GLOBE_COLORS.earthquake_green;
  }
  return GLOBE_COLORS[type] || GLOBE_COLORS[sev] || GLOBE_COLORS.event;
}

function getEventSize(event) {
  if (event.type === 'earthquake') {
    const mag = event.magnitude || 4.5;
    return Math.max(0.25, Math.min(2.8, (mag - 4) * 0.65));
  }
  return event.size || 0.5;
}

function getEventAltitude(event) {
  if (event.type === 'earthquake') {
    const mag = event.magnitude || 4.5;
    return Math.max(0.02, Math.min(0.18, (mag - 4) * 0.03));
  }
  if (['war', 'economic'].includes(event.type)) return 0.06;
  return 0.04;
}

/* ─── STATIC GEOPOLITICAL EVENTS ───────────────── */
const STATIC_EVENTS = [
  // Active conflicts
  { lat:35.69, lng:51.39, name:'Tehran', event:'🔴 Iran War Epicenter', type:'war', size:1.3, desc:'US/Israel strikes Feb 28, 2026. 900+ strikes in 12 hours. Khamenei killed. Day 43 — ceasefire talks in Islamabad.', source:'Britannica 2026' },
  { lat:33.68, lng:73.05, name:'Islamabad', event:'🔵 Iran-US Peace Talks', type:'diplomacy', size:1.0, desc:'Day 43 ceasefire negotiations. Pakistan PM: "make or break." Senior officials from 6 nations present.', source:'Al Jazeera Live' },
  { lat:50.45, lng:30.52, name:'Kyiv', event:'⚔️ Ukraine War — Easter Truce', type:'war', size:0.9, desc:'Russia-Ukraine Orthodox Easter ceasefire active. 800+ days of full-scale war. 204M+ under armed group control globally (ICRC).', source:'BBC World Live' },
  { lat:31.52, lng:34.46, name:'Gaza Strip', event:'⚔️ Active Conflict Zone', type:'war', size:0.95, desc:'2.3M population. Ongoing humanitarian crisis. IHL violations documented by UN.', source:'UN OCHA 2026' },
  { lat:15.50, lng:32.56, name:'Khartoum', event:'🔴 Sudan Civil War', type:'war', size:0.95, desc:'Worst humanitarian crisis globally. RSF vs SAF. 25M+ displaced — largest displacement crisis on Earth.', source:'ACLED March 2026' },
  { lat:34.00, lng:36.00, name:'Lebanon', event:'⚔️ Lebanon-Israel Tensions', type:'war', size:0.7, desc:'Lebanon-Israel officials meeting in Washington. Fragile ceasefire holding. Reconstruction talks ongoing.', source:'BBC World' },
  { lat:15.55, lng:44.00, name:'Sanaa', event:'⚔️ Yemen Conflict Zone', type:'war', size:0.7, desc:'Houthi drone/missile campaign active. Red Sea shipping disrupted. Coalition operations ongoing.', source:'UN Security Council 2026' },
  { lat:9.03, lng:38.74, name:'Addis Ababa', event:'⚔️ Horn of Africa Conflict', type:'war', size:0.65, desc:'Ethiopia-Sudan border tensions. Tigray post-conflict reconstruction. AU-mediated negotiations.', source:'AU 2026' },

  // Economic chokepoints
  { lat:26.57, lng:56.25, name:'Strait of Hormuz', event:'💰 Global Oil Chokepoint — CONTESTED', type:'economic', size:1.4, desc:'20% of global oil transits here. Iranian toll system. EU aviation fuel shortage warning. Tankers refusing Iranian levies. Trump: "reopening soon."', source:'BBC Business Live' },
  { lat:12.50, lng:43.35, name:'Bab el-Mandeb', event:'💰 Red Sea Chokepoint', type:'economic', size:1.0, desc:'Houthi attacks forcing rerouting around Africa. 12% of global trade. Container shipping rates +300% since Jan 2024.', source:'Lloyd\'s List 2026' },
  { lat:30.00, lng:32.57, name:'Suez Canal', event:'💰 Trade Route Stress', type:'economic', size:0.9, desc:'Traffic down 42% from Houthi attacks in Red Sea. Egypt losing $2B+ monthly in canal revenue.', source:'Suez Canal Authority 2026' },
  { lat:9.35, lng:-79.92, name:'Panama Canal', event:'💰 Drought Restrictions', type:'economic', size:0.8, desc:'Record low water levels 2024 forced traffic restrictions. Climate change threatens long-term viability of this 6% global trade route.', source:'ACP 2026' },

  // Geopolitical hubs
  { lat:40.71, lng:-74.01, name:'New York', event:'📊 US Debt Clock — $36T', type:'economic', size:0.9, desc:'Federal debt at 118% GDP. Fastest peacetime debt growth in US history. Dollar reserve share at 57.8% (down from 71% in 2000).', source:'World Bank API Live' },
  { lat:39.90, lng:116.41, name:'Beijing', event:'📊 BRICS Pay + Yuan Reserve Push', type:'economic', size:0.95, desc:'Yuan reserve share rising. BRICS Pay operational in 44 countries. China buying gold at record pace. Dollar reserve dominance structurally challenged.', source:'IMF COFER 2026' },
  { lat:55.75, lng:37.62, name:'Moscow', event:'📊 Non-Dollar Trade Hub', type:'economic', size:0.8, desc:'Russia conducting 90%+ of trade in non-dollar currencies. Ruble-yuan settlement expanding. Sanctions accelerating global dedollarization.', source:'Bank of Russia 2026' },
  { lat:28.61, lng:77.21, name:'New Delhi', event:'📊 India: Alternative Reserve', type:'economic', size:0.8, desc:'Rupee internationalization accelerating. Digital rupee CBDC launched. India now largest global oil buyer, negotiating in non-dollar terms.', source:'RBI 2026' },
  { lat:-23.55, lng:-46.63, name:'São Paulo', event:'📊 BRICS+ Financial Hub', type:'economic', size:0.75, desc:'Brazil hosting BRICS+ summit 2026. G20 presidency pushing "global south" financial architecture. Dollar alternative settlement systems expanding.', source:'BRICS 2026' },

  // Technology / AI
  { lat:37.42, lng:-122.09, name:'Mountain View', event:'🤖 AGI Development Race', type:'tech', size:1.0, desc:'Google DeepMind HQ. 50% AGI probability by 2028 (Shane Legg). AI capability doubling every 18 months. Governance 3-5 years behind.', source:'DeepMind/Legg Jan 2026' },
  { lat:37.78, lng:-122.40, name:'San Francisco', event:'🤖 OpenAI + Anthropic Hub', type:'tech', size:0.95, desc:'OpenAI paused UK data center over energy costs (BBC Tech Apr 9). AI epistemic crisis active. First cities banning social media for minors.', source:'BBC Tech Live' },
  { lat:51.50, lng:-0.13, name:'London', event:'🤖 Disinformation Blizzard', type:'tech', size:0.85, desc:'Mayor warns of targeted disinformation campaign portraying city "in decline." AI-generated synthetic content at city scale. Greece banned social media under-15.', source:'BBC Tech Live' },
  { lat:37.57, lng:127.00, name:'Seoul', event:'🤖 Korea AI Semiconductor Hub', type:'tech', size:0.75, desc:'Samsung + SK Hynix dominate HBM memory critical for AI training. Korea controls 60%+ of global HBM market. AI supply chain chokepoint.', source:'KITA 2026' },
  { lat:24.80, lng:120.97, name:'Hsinchu', event:'🤖 TSMC — AI Chip Monopoly', type:'tech', size:1.0, desc:'TSMC fabricates 90%+ of advanced AI chips. Geopolitical flashpoint — US+China both dependent on Taiwan. Existential supply chain vulnerability.', source:'SIA 2026' },

  // Climate critical zones
  { lat:-18.00, lng:-52.00, name:'Amazon Basin', event:'🌡️ Dieback Risk Zone', type:'climate', size:1.1, desc:'Eastern Amazon already shifting to savanna. Tipping point: 2.0°C. 10% already deforested beyond recovery threshold. Ecosystem collapse would release 90GT CO2.', source:'Global Tipping Points 2025' },
  { lat:72.00, lng:-42.00, name:'Greenland', event:'🌡️ Ice Sheet Tipping Point', type:'climate', size:1.0, desc:'Tipping point crossed at 1.5°C (2024 peak: 1.47°C). Irreversible ice loss now occurring. Full melt = 7m sea level rise over centuries.', source:'Global Tipping Points 2025' },
  { lat:-60.00, lng:-65.00, name:'West Antarctica', event:'🌡️ Ice Sheet Destabilization', type:'climate', size:0.95, desc:'Thwaites "Doomsday Glacier" — unstable. Full collapse = 65cm sea level rise. Process now likely irreversible at current temperatures.', source:'BAS/NSIDC 2025' },
  { lat:0.00, lng:-28.00, name:'Atlantic (AMOC)', event:'🌡️ Ocean Circulation Weakening', type:'climate', size:1.1, desc:'AMOC at weakest in 1,600 years. Tipping point at 2.0°C. Collapse would cool Europe dramatically, disrupt global rainfall patterns.', source:'Nature Climate Change 2025' },
  { lat:-18.00, lng:147.00, name:'Great Barrier Reef', event:'🌡️ First Tipping Point Crossed', type:'climate', size:1.0, desc:'Warm-water coral reefs declared past tipping point. 91% bleaching event 2024. Global Tipping Points Report 2025: first irreversible system loss.', source:'Global Tipping Points 2025' },
  { lat:64.00, lng:-19.00, name:'Iceland', event:'🌋 Volcanic Activity', type:'volcano', size:0.8, desc:'Reykjanes Peninsula eruptions ongoing since 2021. Multiple fissures. Disrupting European air travel periodically. Grindavik evacuated repeatedly.', source:'IMO Iceland 2026' },
  { lat:60.00, lng:150.00, name:'North Pacific', event:'🌡️ Permafrost Thaw Zone', type:'climate', size:0.95, desc:'Boreal permafrost abrupt thaw tipping point: 1.5°C. Methane release could accelerate global warming by 0.3-0.5°C. Carbon time bomb.', source:'Global Tipping Points 2025' },

  // Space
  { lat:28.52, lng:-80.65, name:'Cape Canaveral', event:'🚀 Artemis II — Returned Apr 11', type:'climate', size:0.85, desc:'NASA Artemis II: First crewed Moon mission in 53 years completed April 11, 2026. First Earthset images from lunar far side. Human reach expanding beyond collapse.', source:'NASA RSS Live' },
  { lat:5.23, lng:-52.77, name:'Kourou', event:'🚀 Ariane 6 Launch Site', type:'climate', size:0.65, desc:'European Space Agency launch facility. Ariane 6 rocket operational 2024. European space sovereignty — independent of US/Russia/China launch providers.', source:'ESA 2026' },

  // Nuclear
  { lat:34.05, lng:131.86, name:'Hiroshima', event:'☢️ Nuclear Memory Site', type:'war', size:0.6, desc:'FAS Nuclear Notebook 2024: 10,929 warheads globally. Russia: 5,580. USA: 5,044. 9 nuclear states. Multipolar deterrence increasingly unstable.', source:'FAS Nuclear Notebook 2024' },
  { lat:37.60, lng:127.15, name:'Seoul', event:'☢️ Nuclear Proximity Zone', type:'war', size:0.75, desc:'DPRK estimated 50 nuclear warheads. Intercontinental range achieved. Seoul 35km from border. Densest nuclear standoff zone outside Europe.', source:'FAS 2024' },
  { lat:30.00, lng:70.00, name:'Pakistan-India Border', event:'☢️ Nuclear Flashpoint', type:'war', size:0.85, desc:'India: 180 warheads, Pakistan: 170. Both modernizing rapidly. Kashmir tensions perennial. Only nuclear-armed states with active territorial dispute and documented near-exchanges.', source:'FAS Nuclear Notebook 2024' },

  // Diplomacy / Recovery
  { lat:46.95, lng:7.45, name:'Bern', event:'🔵 Swiss Neutrality Hub', type:'diplomacy', size:0.65, desc:'Switzerland hosting multiple track-2 diplomacy channels. Iran backchannels. Ukraine peace initiative. Neutral ground increasingly rare in multipolar world.', source:'FDFA Switzerland 2026' },
  { lat:48.85, lng:2.35, name:'Paris', event:'🔵 COP30 Preparation', type:'diplomacy', size:0.7, desc:'France coordinating post-COP29 climate implementation. ICJ ruling July 2025 legally binding on emissions. First binding international climate obligation.', source:'UNFCCC 2026' },
];

/* ─── NEWS → GEO MAPPING ────────────────────────── */
const NEWS_GEO = [
  { kw:['iran','tehran','khamenei'], lat:35.69, lng:51.39, type:'war' },
  { kw:['islamabad','pakistan'], lat:33.68, lng:73.05, type:'diplomacy' },
  { kw:['ukraine','kyiv','kiev'], lat:50.45, lng:30.52, type:'war' },
  { kw:['gaza','hamas','west bank','palestine'], lat:31.52, lng:34.46, type:'war' },
  { kw:['sudan','khartoum','rsf'], lat:15.50, lng:32.56, type:'war' },
  { kw:['hormuz','straits','tanker','oil price'], lat:26.57, lng:56.25, type:'economic' },
  { kw:['red sea','houthi','suez','shipping'], lat:13.00, lng:44.00, type:'economic' },
  { kw:['openai','anthropic','chatgpt','agi'], lat:37.78, lng:-122.40, type:'tech' },
  { kw:['london','uk','britain','bbc'], lat:51.50, lng:-0.13, type:'tech' },
  { kw:['fed','wall street','nasdaq','s&p','dow'], lat:40.71, lng:-74.01, type:'economic' },
  { kw:['china','beijing','yuan','brics','ccp'], lat:39.90, lng:116.41, type:'economic' },
  { kw:['russia','moscow','putin','ruble'], lat:55.75, lng:37.62, type:'war' },
  { kw:['nasa','space','moon','artemis','webb'], lat:28.52, lng:-80.65, type:'climate' },
  { kw:['climate','temperature','warming','flood','wildfire'], lat:-1.00, lng:20.00, type:'climate' },
  { kw:['amazon','brazil','deforestation'], lat:-3.47, lng:-62.22, type:'climate' },
  { kw:['taiwan','tsmc','chip'], lat:25.04, lng:121.56, type:'tech' },
  { kw:['inflation','interest rate','fed','treasury'], lat:40.71, lng:-74.01, type:'economic' },
  { kw:['india','modi','rupee'], lat:28.61, lng:77.21, type:'economic' },
  { kw:['north korea','dprk','kim'], lat:39.03, lng:125.75, type:'war' },
  { kw:['europe','eu','brussels'], lat:50.85, lng:4.35, type:'diplomacy' },
];

/* ─── FILTER ────────────────────────────────────── */
window.setGlobeFilter = function(btn) {
  document.querySelectorAll('.gf-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  globeCurrentFilter = btn.dataset.filter;
  applyGlobeFilter();
};

window.resetGlobeView = function() {
  if (globeInstance) globeInstance.pointOfView({ lat: 25, lng: 15, altitude: 2.8 }, 1200);
};

window.toggleGlobeRotate = function() {
  if (!globeInstance) return;
  globeAutoRotate = !globeAutoRotate;
  globeInstance.controls().autoRotate = globeAutoRotate;
  document.getElementById('rotate-btn').textContent = globeAutoRotate ? '⏸ Pause' : '▶ Resume';
};

function matchesFilter(event) {
  if (globeCurrentFilter === 'all') return true;
  const filters = globeCurrentFilter.split(',');
  return filters.some(f => event.type === f || (event.subtype || '') === f);
}

function applyGlobeFilter() {
  if (!globeInstance) return;
  const filtered = globeAllEvents.filter(matchesFilter);
  globeInstance.pointsData(filtered);
  renderGlobeEventList(filtered);
}

/* ─── BUILD EVENT LIST ───────────────────────────── */
function buildAllEvents(db, liveData) {
  const events = [...STATIC_EVENTS];
  const seen = new Set(events.map(e => e.name + e.type));

  // Add live API events (earthquakes, EONET, GDACS)
  if (liveData?.events) {
    for (const e of liveData.events) {
      const key = `${e.lat.toFixed(1)},${e.lng.toFixed(1)},${e.type}`;
      if (!seen.has(key)) {
        seen.add(key);
        events.push(e);
      }
    }
  }

  // Add news-derived events
  const news = db.news || [];
  news.slice(0, 50).forEach(item => {
    const title = (item.title + ' ' + (item.description || '')).toLowerCase();
    for (const rule of NEWS_GEO) {
      if (rule.kw.some(k => title.includes(k))) {
        const key = `${rule.lat},${rule.lng},news`;
        if (!seen.has(key)) {
          seen.add(key);
          events.push({
            lat: rule.lat + (Math.random() - 0.5) * 0.3,
            lng: rule.lng + (Math.random() - 0.5) * 0.3,
            name: item.source,
            event: item.title.slice(0, 80),
            title: item.title.slice(0, 80),
            desc: `[${item.source}] ${(item.description || '').slice(0, 150)}`,
            detail: `Published: ${item.pubDate || 'Recent'} · Source: ${item.source}`,
            type: rule.type,
            size: 0.5,
            isLive: true,
            url: item.link,
            source: item.source,
          });
        }
        break;
      }
    }
  });

  return events;
}

/* ─── GLOBE INIT ────────────────────────────────── */
async function initGlobe(db) {
  if (globeInitialized) { await refreshGlobeData(db); return; }

  const container = document.getElementById('globeViz');
  if (!container || typeof Globe === 'undefined') {
    setTimeout(() => initGlobe(db), 600);
    return;
  }
  globeInitialized = true;

  // Update loading text
  const loadText = document.getElementById('globe-load-text');
  const loadSub = document.getElementById('globe-load-sub');
  if (loadText) loadText.textContent = 'Fetching Live Events';
  if (loadSub) loadSub.textContent = 'USGS Earthquakes · NASA EONET · GDACS Disasters...';

  // Fetch live data
  try {
    const resp = await fetch('/api/globe');
    if (resp.ok) {
      globeLiveData = await resp.json();
      updateGlobeStats(globeLiveData.stats);
    }
  } catch(e) { console.warn('Globe API failed, using static data'); }

  if (loadText) loadText.textContent = 'Rendering Globe';
  if (loadSub) loadSub.textContent = 'Building 3D scene...';

  globeAllEvents = buildAllEvents(db, globeLiveData);
  const filtered = globeAllEvents.filter(matchesFilter);

  // ARCS — geopolitical connections
  const ARCS = [
    { startLat:40.71, startLng:-74.01, endLat:35.69, endLng:51.39, color:'rgba(192,74,40,0.7)', label:'🇺🇸 US strikes → Iran', dash:0.4 },
    { startLat:35.69, startLng:51.39, endLat:33.68, endLng:73.05, color:'rgba(64,144,216,0.7)', label:'🕊️ Iran → Islamabad talks', dash:0.6 },
    { startLat:26.57, startLng:56.25, endLat:51.50, endLng:-0.13, color:'rgba(212,178,106,0.7)', label:'⛽ Hormuz → EU fuel crisis', dash:0.4 },
    { startLat:39.90, startLng:116.41, endLat:40.71, endLng:-74.01, color:'rgba(120,96,192,0.6)', label:'🀄 China → USD reserve challenge', dash:0.3 },
    { startLat:55.75, startLng:37.62, endLat:50.45, endLng:30.52, color:'rgba(192,74,40,0.5)', label:'🇷🇺 Russia → Ukraine war', dash:0.5 },
    { startLat:25.04, startLng:121.56, endLat:37.42, endLng:-122.09, color:'rgba(120,96,192,0.5)', label:'💾 TSMC → Silicon Valley AI chips', dash:0.5 },
    { startLat:26.57, startLng:56.25, endLat:28.61, endLng:77.21, color:'rgba(212,178,106,0.5)', label:'🛢️ Oil → India (non-dollar)', dash:0.4 },
    { startLat:28.52, startLng:-80.65, endLat:0, endLng:0, color:'rgba(40,176,136,0.4)', label:'🚀 Artemis II Moon mission return', dash:0.6 },
    { startLat:13.00, startLng:44.00, endLat:51.50, endLng:-0.13, color:'rgba(212,178,106,0.4)', label:'🚢 Red Sea → EU shipping disruption', dash:0.3 },
  ];

  // RINGS — critical hotspots
  const RINGS = [
    { lat:26.57, lng:56.25, maxR:5, color:'#d4b26a', speed:3, repeat:1000 },
    { lat:35.69, lng:51.39, maxR:4, color:'#c04a28', speed:2.5, repeat:900 },
    { lat:-18.00, lng:147.00, maxR:3.5, color:'#28b088', speed:2, repeat:1400 },
    { lat:50.45, lng:30.52, maxR:3, color:'#c04a28', speed:2, repeat:1100 },
    { lat:15.50, lng:32.56, maxR:3, color:'#c04a28', speed:1.8, repeat:1300 },
    { lat:72.00, lng:-42.00, maxR:3, color:'#4090d8', speed:1.5, repeat:1800 },
    { lat:0.00, lng:-28.00, maxR:3, color:'#4090d8', speed:1.5, repeat:2000 },
    { lat:25.04, lng:121.56, maxR:2.5, color:'#7860c0', speed:2, repeat:1200 },
  ];

  // Add earthquake rings for M6+
  if (globeLiveData?.events) {
    for (const e of globeLiveData.events) {
      if (e.type === 'earthquake' && e.magnitude >= 6) {
        RINGS.push({ lat:e.lat, lng:e.lng, maxR: e.magnitude - 3, color:'#FF4444', speed:2.5, repeat:1500 });
      }
    }
  }

  const globe = Globe()
    .globeImageUrl('https://unpkg.com/three-globe@2.32.0/example/img/earth-blue-marble.jpg')
    .bumpImageUrl('https://unpkg.com/three-globe@2.32.0/example/img/earth-topology.png')
    .backgroundImageUrl('https://unpkg.com/three-globe@2.32.0/example/img/night-sky.png')
    .atmosphereColor('#d4b26a')
    .atmosphereAltitude(0.22)

    // POINTS
    .pointsData(filtered)
    .pointColor(d => getEventColor(d))
    .pointRadius(d => getEventSize(d) * 0.42)
    .pointAltitude(d => getEventAltitude(d))
    .pointLabel(d => buildGlobeTooltip(d))
    .onPointClick(d => showGlobeDetail(d))
    .onPointHover(d => { container.style.cursor = d ? 'pointer' : 'grab'; })

    // ARCS
    .arcsData(ARCS)
    .arcColor('color')
    .arcDashLength('dash')
    .arcDashGap(0.15)
    .arcDashAnimateTime(d => 1500 + Math.random() * 1000)
    .arcStroke(0.55)
    .arcAltitude(0.22)
    .arcLabel('label')

    // RINGS
    .ringsData(RINGS)
    .ringColor(d => t => {
      const hex = d.color;
      const alpha = Math.round((1 - t) * 200).toString(16).padStart(2, '0');
      return hex + alpha;
    })
    .ringMaxRadius('maxR')
    .ringPropagationSpeed('speed')
    .ringRepeatPeriod('repeat')

    (container);

  globeInstance = globe;

  // Controls
  globe.controls().autoRotate = true;
  globe.controls().autoRotateSpeed = 0.28;
  globe.controls().enableZoom = true;
  globe.controls().zoomSpeed = 0.8;
  globe.controls().minDistance = 130;
  globe.controls().maxDistance = 700;

  // Pause on interaction
  ['mousedown','touchstart'].forEach(ev =>
    container.addEventListener(ev, () => { globe.controls().autoRotate = false; }, { passive: true })
  );
  ['mouseup','touchend'].forEach(ev =>
    container.addEventListener(ev, () => { setTimeout(() => { if (globeAutoRotate) globe.controls().autoRotate = true; }, 4000); }, { passive: true })
  );

  // Start view: Middle East / global view
  globe.pointOfView({ lat: 25, lng: 40, altitude: 2.6 }, 1800);

  // Resize
  const resize = () => { globe.width(container.offsetWidth); globe.height(container.offsetHeight); };
  window.addEventListener('resize', resize);

  // Hide loading
  const loading = document.getElementById('globe-loading');
  if (loading) setTimeout(() => { loading.style.transition = 'opacity .5s'; loading.style.opacity = 0; setTimeout(() => loading.remove(), 600); }, 1000);

  // Render event list
  renderGlobeEventList(filtered);

  // Total pin count
  const countEl = document.getElementById('event-count');
  if (countEl) countEl.textContent = `${filtered.length} events · ${globeAllEvents.length} total`;
}

/* ─── TOOLTIP BUILDER ───────────────────────────── */
function buildGlobeTooltip(d) {
  const color = getEventColor(d);
  const typeLabel = (d.type || 'event').toUpperCase();
  const mag = d.magnitude ? ` · M${d.magnitude.toFixed(1)}` : '';
  const depth = d.depth ? ` · Depth: ${d.depth}km` : '';
  return `
    <div style="background:rgba(2,2,1,.92);border:1px solid ${color};padding:10px 13px;max-width:240px;font-family:'JetBrains Mono',monospace;border-radius:3px">
      <div style="font-size:8px;letter-spacing:.15em;text-transform:uppercase;color:${color};margin-bottom:4px">${typeLabel}${mag}${depth}</div>
      <div style="font-size:11px;color:#DBDEE1;font-weight:600;margin-bottom:4px;line-height:1.3">${d.name || ''}</div>
      <div style="font-size:10px;color:#80848E;line-height:1.5">${(d.event || d.title || '').slice(0,80)}</div>
      ${d.isLive ? '<div style="font-size:9px;color:#28b088;margin-top:4px">● LIVE</div>' : ''}
      ${d.source ? `<div style="font-size:8px;color:#4E5058;margin-top:3px">${d.source}</div>` : ''}
    </div>`;
}

/* ─── DETAIL PANEL ──────────────────────────────── */
function showGlobeDetail(d) {
  const panel = document.getElementById('globe-detail');
  const content = document.getElementById('globe-detail-content');
  if (!panel || !content) return;
  const color = getEventColor(d);
  const mag = d.magnitude ? `<div style="font-family:var(--fm);font-size:8px;color:${color};margin-top:.4rem">MAGNITUDE ${d.magnitude.toFixed(1)} · DEPTH ${d.depth || '?'}km${d.tsunami ? ' · ⚠️ TSUNAMI WARNING' : ''}</div>` : '';
  content.innerHTML = `
    <div style="font-family:var(--fm);font-size:7.5px;letter-spacing:.18em;text-transform:uppercase;color:${color};margin-bottom:.5rem">${(d.type||'').toUpperCase()} EVENT</div>
    <div style="font-size:1rem;font-weight:600;color:var(--pch);margin-bottom:.4rem;line-height:1.3">${d.name || d.title || ''}</div>
    <div style="font-size:.85rem;color:var(--gld);margin-bottom:.6rem">${d.event || d.title || ''}</div>
    ${mag}
    <div style="font-size:.83rem;color:var(--smk);line-height:1.75;margin:.6rem 0">${d.desc || ''}</div>
    ${d.detail ? `<div style="font-size:.78rem;color:var(--ash);line-height:1.65;padding:.5rem;background:var(--abyss);border-radius:2px;margin-top:.4rem">${d.detail}</div>` : ''}
    <div style="font-family:var(--fm);font-size:7.5px;color:var(--ash);margin-top:.6rem;display:flex;gap:.5rem;flex-wrap:wrap">
      <span>Lat: ${d.lat?.toFixed(3)}, Lng: ${d.lng?.toFixed(3)}</span>
      ${d.isLive ? '<span style="color:var(--jbrt)">● LIVE NEWS</span>' : ''}
      ${d.alert ? `<span style="color:${d.alert==='Red'?'var(--ebrt)':d.alert==='Orange'?'var(--gld)':'var(--jbrt)'}">GDACS ${d.alert} Alert</span>` : ''}
    </div>
    ${d.source ? `<div style="font-family:var(--fm);font-size:7.5px;color:var(--gdim);margin-top:.3rem">Source: ${d.source}</div>` : ''}
    ${d.url ? `<a href="${d.url}" target="_blank" style="display:inline-block;margin-top:.7rem;font-family:var(--fm);font-size:8px;color:var(--gld);text-decoration:none;border:1px solid var(--gdim);padding:3px 10px;border-radius:2px">View Source ↗</a>` : ''}
  `;
  panel.style.display = 'block';

  // Fly to event
  if (globeInstance) globeInstance.pointOfView({ lat: d.lat, lng: d.lng, altitude: 1.5 }, 1000);
}

/* ─── EVENT LIST ─────────────────────────────────── */
function renderGlobeEventList(events) {
  const el = document.getElementById('globe-event-list');
  if (!el) return;
  const countEl = document.getElementById('event-count');
  if (countEl) countEl.textContent = `${events.length} events shown · ${globeAllEvents.length} total`;

  // Sort: severity first (red > orange > war > everything else)
  const sorted = [...events].sort((a, b) => {
    const sevScore = { red: 3, orange: 2, war: 1 };
    const as = sevScore[a.severity] || sevScore[a.type] || 0;
    const bs = sevScore[b.severity] || sevScore[b.type] || 0;
    return bs - as;
  }).slice(0, 24);

  el.innerHTML = sorted.map(e => {
    const color = getEventColor(e);
    const mag = e.magnitude ? ` M${e.magnitude.toFixed(1)}` : '';
    const typeIcon = { earthquake:'🪨', wildfire:'🔥', storm:'🌀', cyclone:'🌀', volcano:'🌋', flood:'🌊', tsunami:'🌊', war:'⚔️', economic:'📊', tech:'🤖', climate:'🌡️', diplomacy:'🔵', disaster:'⚠️' }[e.type] || '◆';
    return `
      <div style="background:var(--surf);padding:.85rem 1rem;border-left:2px solid ${color};cursor:pointer;transition:background .15s"
        onclick="if(globeInstance){globeInstance.pointOfView({lat:${e.lat},lng:${e.lng},altitude:1.5},900);showGlobeDetail(${JSON.stringify(e).replace(/"/g,'&quot;')})}"
        onmouseover="this.style.background='var(--raised)'" onmouseout="this.style.background='var(--surf)'">
        <div style="font-family:var(--fm);font-size:7px;letter-spacing:.12em;text-transform:uppercase;color:${color};margin-bottom:.25rem">${typeIcon} ${e.type?.toUpperCase()}${mag}</div>
        <div style="font-size:.82rem;color:var(--pch);line-height:1.35;font-weight:500">${(e.name || '').slice(0,30)}</div>
        <div style="font-size:.76rem;color:var(--smk);line-height:1.4;margin-top:.2rem">${(e.event || e.title || '').slice(0,65)}${(e.event||e.title||'').length>65?'...':''}</div>
        ${e.isLive ? '<div style="font-family:var(--fm);font-size:7px;color:var(--jbrt);margin-top:.25rem">● LIVE</div>' : ''}
      </div>`;
  }).join('');
}

/* ─── STATS UPDATE ───────────────────────────────── */
function updateGlobeStats(stats) {
  if (!stats) return;
  const s = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  s('gstat-eq', stats.earthquakes || 0);
  s('gstat-nat', stats.naturalEvents || 0);
  s('gstat-dis', stats.disasters || 0);
  s('gstat-crit', stats.active || 0);
  s('gstat-total', stats.total || 0);
}

/* ─── REFRESH ────────────────────────────────────── */
async function refreshGlobeData(db) {
  try {
    const resp = await fetch('/api/globe');
    if (resp.ok) {
      globeLiveData = await resp.json();
      updateGlobeStats(globeLiveData.stats);
    }
  } catch(e) {}
  globeAllEvents = buildAllEvents(db, globeLiveData);
  applyGlobeFilter();
}

/* ============================================================
   MARKETS MODULE
   ============================================================ */
let chartsMarketInited = false;
let sparkCharts = {};

async function renderMarkets() {
  let data;
  try {
    const resp = await fetch('/api/markets');
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    data = await resp.json();
  } catch(e) {
    console.error('Markets fetch failed:', e);
    return;
  }

  const { indices, charts, fearGreed, crypto } = data;

  // Fear & Greed
  if (fearGreed?.latest) {
    const fg = fearGreed.latest;
    const score = parseInt(fg.value);
    const el = document.getElementById('fng-score');
    const lblEl = document.getElementById('fng-label');
    const inlineEl = document.getElementById('fng-inline');
    const arcEl = document.getElementById('fng-arc');
    const needleEl = document.getElementById('fng-needle');
    if (el) el.textContent = score;
    if (lblEl) lblEl.textContent = fg.value_classification?.toUpperCase();
    if (inlineEl) { inlineEl.textContent = `${score} (${fg.value_classification})`; inlineEl.style.color = score < 25 ? 'var(--ebrt)' : score < 50 ? 'var(--gld)' : 'var(--jbrt)'; }
    if (el) el.style.color = score < 25 ? 'var(--ebrt)' : score < 50 ? 'var(--gld)' : 'var(--jbrt)';
    // Animate gauge — 226 = full arc. score 0-100 maps to offset 226→0
    if (arcEl) arcEl.setAttribute('stroke-dashoffset', (226 - score * 2.26).toFixed(1));
    if (needleEl) needleEl.setAttribute('transform', `rotate(${-128 + score * 2.56},80,86)`);

    // History badges
    const histEl = document.getElementById('fng-history');
    if (histEl && fearGreed.history) {
      histEl.innerHTML = fearGreed.history.map((h,i) => {
        const s = parseInt(h.value);
        const c = s < 25 ? '#c04a28' : s < 50 ? '#d4b26a' : '#28b088';
        const d = i === 0 ? 'Today' : i === 1 ? 'Yesterday' : `${i}d ago`;
        return `<div style="text-align:center;flex:1"><div style="font-family:var(--fm);font-size:9px;color:${c};font-weight:600">${s}</div><div style="font-family:var(--fm);font-size:7px;color:var(--ash)">${d}</div></div>`;
      }).join('');
    }
  }

  // VIX
  if (indices?.vix) {
    const vix = indices.vix;
    const vixEl = document.getElementById('vix-price');
    const vixChg = document.getElementById('vix-change');
    if (vixEl) { vixEl.textContent = vix.price; vixEl.style.color = vix.price > 30 ? 'var(--ebrt)' : vix.price > 20 ? 'var(--gld)' : 'var(--jbrt)'; }
    if (vixChg) { vixChg.textContent = (vix.change >= 0 ? '+' : '') + vix.change + '%'; vixChg.style.color = vix.change > 0 ? 'var(--ebrt)' : 'var(--jbrt)'; }
  }

  // Market cards with sparklines
  const MARKET_DEFS = [
    { key: 'spy', label: 'S&P 500 (SPY)', icon: '📈', desc: 'Broad US market. Bellwether for global risk appetite.', colorPos: 'var(--jbrt)', colorNeg: 'var(--ebrt)' },
    { key: 'qqq', label: 'Nasdaq 100 (QQQ)', icon: '💻', desc: 'Tech-heavy. Sensitive to AI disruption + rate changes.', colorPos: 'var(--vbrt)', colorNeg: 'var(--ebrt)' },
    { key: 'gold', label: 'Gold Futures (GC=F)', icon: '🥇', desc: 'Reserve currency hedge. $4,787 = near all-time real high.', colorPos: 'var(--gld)', colorNeg: 'var(--ebrt)' },
    { key: 'oil', label: 'Crude Oil WTI (CL=F)', icon: '🛢️', desc: 'Hormuz premium embedded. Key inflation driver.', colorPos: 'var(--ebrt)', colorNeg: 'var(--jbrt)' },
    { key: 'soxx', label: 'Semiconductors (SOXX)', icon: '🔬', desc: 'AI infrastructure. GPU + chip supply chain bellwether.', colorPos: 'var(--vbrt)', colorNeg: 'var(--ebrt)' },
    { key: 'btc', label: 'Bitcoin (BTC-USD)', icon: '₿', desc: 'Digital gold. Non-sovereign store of value.', colorPos: 'var(--gld)', colorNeg: 'var(--ebrt)' },
  ];

  const cardsEl = document.getElementById('market-cards');
  if (cardsEl) {
    cardsEl.innerHTML = MARKET_DEFS.map(def => {
      const m = indices[def.key];
      if (!m) return '';
      const chgColor = m.change >= 0 ? def.colorPos : def.colorNeg;
      const chgIcon = m.change >= 0 ? '▲' : '▼';
      return `<div style="background:var(--surf);border:1px solid var(--bdr);padding:1rem;margin-bottom:2px;display:grid;grid-template-columns:1fr 1fr auto;gap:1rem;align-items:center">
        <div><div style="font-family:var(--fm);font-size:7.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--ash);margin-bottom:.2rem">${def.icon} ${def.label}</div><div style="font-size:.8rem;color:var(--smk)">${def.desc}</div></div>
        <div><canvas id="spark-${def.key}" width="120" height="40" style="display:block"></canvas></div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-family:var(--fd);font-size:1.4rem;font-weight:700;color:var(--pch)">${m.currency === 'USD' ? '$' : ''}${m.price?.toLocaleString('en-US', {minimumFractionDigits:2,maximumFractionDigits:2})}</div>
          <div style="font-family:var(--fm);font-size:9px;color:${chgColor}">${chgIcon} ${Math.abs(m.change)}%</div>
        </div>
      </div>`;
    }).join('');

    // Draw sparklines
    setTimeout(() => {
      MARKET_DEFS.forEach(def => {
        const m = indices[def.key];
        if (!m?.closes?.length) return;
        const canvas = document.getElementById('spark-' + def.key);
        if (!canvas) return;
        drawSparkline(canvas, m.closes, m.change >= 0 ? '#28b088' : '#c04a28');
      });
    }, 100);
  }

  // Crypto
  const btcData = indices?.btc;
  const ethData = indices?.eth;
  const cgBtc = crypto?.bitcoin;
  const cgEth = crypto?.ethereum;

  if (btcData || cgBtc) {
    const price = btcData?.price || cgBtc?.usd;
    const change = btcData?.change ?? cgBtc?.usd_24h_change;
    const mcap = cgBtc?.usd_market_cap;
    const btcPriceEl = document.getElementById('btc-price');
    const btcChgEl = document.getElementById('btc-change');
    const btcMcapEl = document.getElementById('btc-mcap');
    if (btcPriceEl) btcPriceEl.textContent = '$' + (price||0).toLocaleString();
    if (btcChgEl) { btcChgEl.textContent = (change>=0?'+':'') + (change||0).toFixed(2) + '% 24h'; btcChgEl.style.color = change>=0?'var(--jbrt)':'var(--ebrt)'; }
    if (btcMcapEl && mcap) btcMcapEl.textContent = '$' + (mcap/1e12).toFixed(2) + 'T';
    if (charts?.btc?.length) {
      const canvas = document.getElementById('chart-btc-spark');
      if (canvas) drawLargeSparkline(canvas, charts.btc);
    }
  }

  if (ethData || cgEth) {
    const price = ethData?.price || cgEth?.usd;
    const change = ethData?.change ?? cgEth?.usd_24h_change;
    const mcap = cgEth?.usd_market_cap;
    const ethPriceEl = document.getElementById('eth-price');
    const ethChgEl = document.getElementById('eth-change');
    const ethMcapEl = document.getElementById('eth-mcap');
    if (ethPriceEl) ethPriceEl.textContent = '$' + (price||0).toLocaleString();
    if (ethChgEl) { ethChgEl.textContent = (change>=0?'+':'') + (change||0).toFixed(2) + '% 24h'; ethChgEl.style.color = change>=0?'var(--jbrt)':'var(--ebrt)'; }
    if (ethMcapEl && mcap) ethMcapEl.textContent = '$' + (mcap/1e9).toFixed(0) + 'B';
    if (charts?.eth?.length) {
      const canvas = document.getElementById('chart-eth-spark');
      if (canvas) drawLargeSparkline(canvas, charts.eth);
    }
  }
}

function drawSparkline(canvas, data, color) {
  if (!data?.length || !canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 4;
  ctx.shadowColor = color;
  ctx.beginPath();
  data.forEach((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h * 0.8) - h * 0.1;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();
}

function drawLargeSparkline(canvas, data) {
  if (!data?.length || !canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.offsetWidth || 300, h = canvas.height || 80;
  canvas.width = w;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const isUp = data[data.length-1] >= data[0];
  const color = isUp ? '#28b088' : '#c04a28';
  ctx.clearRect(0, 0, w, h);
  // Fill
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, color + '40');
  grad.addColorStop(1, color + '04');
  ctx.fillStyle = grad;
  ctx.beginPath();
  data.forEach((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h * 0.75) - h * 0.1;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
  // Line
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.shadowBlur = 6; ctx.shadowColor = color;
  ctx.beginPath();
  data.forEach((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h * 0.75) - h * 0.1;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();
}

/* ============================================================
   LIVE VIDEO INTELLIGENCE — YouTube Module
   VAULT.GG pattern: thumbnail-first onclick → youtube-nocookie embed
   12 channels, RSS-fed video IDs, region filter
   ============================================================ */

let ytData = null;
let ytFilter = 'all';
let ytInited = false;

window.setYTFilter = function(btn) {
  document.querySelectorAll('#yt-filters .gf-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  ytFilter = btn.dataset.filter;
  if (ytData) renderYTGrid(ytData);
};

window.closeYTPlayer = function() {
  const wrap = document.getElementById('yt-player-wrap');
  const iframe = document.getElementById('yt-player-iframe');
  if (iframe) iframe.src = '';  // Stop video
  if (wrap) wrap.style.display = 'none';
};

function launchYTEmbed(embedUrl, label) {
  const wrap = document.getElementById('yt-player-wrap');
  const iframe = document.getElementById('yt-player-iframe');
  const labelEl = document.getElementById('yt-player-label');
  if (!wrap || !iframe) return;
  if (labelEl) labelEl.textContent = '▶ ' + label;
  iframe.src = embedUrl;
  wrap.style.display = 'block';
  // Smooth scroll to player
  wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function buildYTCard(ch) {
  const accentColor = ch.color || '#d4b26a';
  const hasVideo = ch.latestVideoId && ch.latestThumb;
  const videoEmbed = hasVideo
    ? `https://www.youtube-nocookie.com/embed/${ch.latestVideoId}?autoplay=1&rel=0&modestbranding=1`
    : null;
  const liveEmbed = `https://www.youtube-nocookie.com/embed/live_stream?channel=${ch.id}&autoplay=1&rel=0&modestbranding=1`;

  // Thumb image or branded fallback
  const thumbSection = hasVideo
    ? `<div class="yt-thumb-wrap" onclick="launchYTEmbed('${videoEmbed}','${ch.icon} ${ch.name} — ${(ch.latestTitle||'').replace(/'/g,"\\'")}')">
        <img
          src="${ch.latestThumb}"
          alt="${ch.name}"
          loading="lazy"
          onerror="this.onerror=null;this.src='https://img.youtube.com/vi/${ch.latestVideoId}/mqdefault.jpg'"
          style="width:100%;height:100%;object-fit:cover;display:block;transition:transform .3s"
        >
        <div class="yt-play-overlay">
          <div class="yt-play-btn">▶</div>
        </div>
        <div class="yt-thumb-title">${(ch.latestTitle || '').slice(0, 60)}${(ch.latestTitle||'').length > 60 ? '...' : ''}</div>
      </div>`
    : `<div class="yt-thumb-wrap yt-thumb-fallback" style="background:linear-gradient(135deg,${accentColor}22,#000)" onclick="launchYTEmbed('${liveEmbed}','${ch.icon} ${ch.name} — Live Stream')">
        <div class="yt-fallback-icon">${ch.icon}</div>
        <div class="yt-fallback-name">${ch.name}</div>
        <div class="yt-fallback-desc">${ch.desc}</div>
        <div class="yt-play-overlay"><div class="yt-play-btn">▶ LIVE</div></div>
      </div>`;

  const pubDate = ch.latestPublished ? `<span style="color:var(--ash)">${ch.latestPublished}</span>` : '';

  return `
    <div class="yt-card" data-region="${ch.region}" style="--ch-color:${accentColor}">
      <div class="yt-card-header" style="background:${accentColor}18;border-bottom:2px solid ${accentColor}">
        <span class="yt-icon">${ch.icon}</span>
        <div class="yt-channel-info">
          <div class="yt-channel-name">${ch.name}</div>
          <div class="yt-channel-region" style="color:${accentColor}">${ch.region.toUpperCase()} · ${ch.tags?.slice(0,2).join(' · ')}</div>
        </div>
        <div class="yt-live-dot"></div>
      </div>
      ${thumbSection}
      <div class="yt-card-footer">
        <button class="yt-btn-latest" onclick="launchYTEmbed('${videoEmbed || liveEmbed}','${ch.icon} ${ch.name}')" ${!hasVideo?'disabled':''}>
          ${hasVideo ? '▶ Latest' : '📡 Feed'}
        </button>
        <button class="yt-btn-live" onclick="launchYTEmbed('${liveEmbed}','${ch.icon} ${ch.name} — LIVE')">
          🔴 LIVE
        </button>
        <a href="https://www.youtube.com/channel/${ch.id}/live" target="_blank" class="yt-btn-out">↗</a>
      </div>
    </div>`;
}

function renderYTGrid(data) {
  const grid = document.getElementById('yt-grid');
  if (!grid) return;
  const channels = data.channels.filter(ch => ytFilter === 'all' || ch.region === ytFilter);
  if (!channels.length) { grid.innerHTML = '<div style="padding:2rem;color:var(--smk);font-style:italic">No channels match this filter.</div>'; return; }
  grid.innerHTML = channels.map(buildYTCard).join('');

  // Update status
  const statusEl = document.getElementById('yt-status');
  if (statusEl) {
    const withVideos = data.channels.filter(c => c.latestVideoId).length;
    statusEl.textContent = `${withVideos}/${data.channels.length} channels loaded · Last fetched ${new Date(data.fetchedAt).toLocaleTimeString()} · ${channels.length} showing`;
  }
}

async function initYouTube() {
  if (ytInited) return;
  ytInited = true;
  try {
    const resp = await fetch('/api/youtube');
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    ytData = await resp.json();
    renderYTGrid(ytData);
  } catch(e) {
    console.warn('YouTube API error:', e);
    // Render fallback cards without video IDs
    const statusEl = document.getElementById('yt-status');
    if (statusEl) statusEl.textContent = 'Using channel live streams (RSS unavailable)';
    // Build fallback data
    ytData = {
      fetchedAt: new Date().toISOString(),
      channels: [
        { name:'DW News', id:'UCknLrEdhRCp1aegoMqRaCZg', color:'#C5102E', icon:'🇩🇪', region:'europe', desc:"Germany's international broadcaster 24/7.", tags:['world','europe'], latestVideoId:null },
        { name:'France 24', id:'UCQfwfsi5VrQ8yKZ-UWmAEFg', color:'#003F87', icon:'🇫🇷', region:'europe', desc:"France's 24/7 English news channel.", tags:['world','europe'], latestVideoId:null },
        { name:'Sky News', id:'UCoMdktPbSTixAyNGwb-UYkQ', color:'#E4003B', icon:'🇬🇧', region:'europe', desc:"UK breaking news around the clock.", tags:['uk','world'], latestVideoId:null },
        { name:'Bloomberg', id:'UCIALMKvObZNtJ6AmdCLP7Lg', color:'#5C5CFF', icon:'📈', region:'finance', desc:"Global financial news and markets.", tags:['finance','markets'], latestVideoId:null },
        { name:'NASA TV', id:'UCLA_DiR1FfKNvjuUpBHmylQ', color:'#0B3D91', icon:'🚀', region:'space', desc:"Space missions, ISS live, launches.", tags:['space','science'], latestVideoId:null },
        { name:'CNA', id:'UCLgOAd9oU1ICQN5JdivQs7g', color:'#E30713', icon:'🌏', region:'asia', desc:"Asia-Pacific news from Singapore.", tags:['asia','singapore'], latestVideoId:null },
        { name:'CGTN', id:'UChjNX55Y7F64VnLM4ld71uA', color:'#D40010', icon:'🇨🇳', region:'asia', desc:"China Global TV Network, English.", tags:['china','asia'], latestVideoId:null },
        { name:'WION', id:'UCp7KGFbMPthqnpMRKFvA2WA', color:'#F26722', icon:'🇮🇳', region:'asia', desc:"India's global news network.", tags:['india','asia'], latestVideoId:null },
        { name:'TRT World', id:'UC7fWeaHhqgM4Ry-RMpM2YYw', color:'#E31E24', icon:'🇹🇷', region:'mideast', desc:"Turkey's international broadcaster.", tags:['turkey','mideast'], latestVideoId:null },
        { name:'i24 NEWS', id:'UCLHRdqHAEjhFCu6VJT2PCQQ', color:'#0066B3', icon:'🇮🇱', region:'mideast', desc:"Israel-based Middle East coverage.", tags:['israel','mideast'], latestVideoId:null },
        { name:'Euronews', id:'UCg4QGMrFOh9FBnEp7RTVeRw', color:'#003399', icon:'🇪🇺', region:'europe', desc:"Pan-European multilingual news.", tags:['europe','eu'], latestVideoId:null },
        { name:'Arirang', id:'UCeoiYd6MDHoGiNmBnCxOG0Q', color:'#00AEEF', icon:'🇰🇷', region:'asia', desc:"South Korea international news.", tags:['korea','asia'], latestVideoId:null },
      ]
    };
    renderYTGrid(ytData);
  }
}

// Refresh every 10 minutes
setInterval(() => { ytInited = false; initYouTube(); }, 10 * 60 * 1000);
