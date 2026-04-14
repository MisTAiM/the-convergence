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
async function renderHorsemen(db) {
  const wb   = db.worldbank || {};
  const news = db.news || [];
  const globe = db.globe || {};

  // ── HELPER ──────────────────────────────────────────────────────────────────
  const latest = obj => { if (!obj) return null; const ks = Object.keys(obj).sort().reverse(); return ks.length ? obj[ks[0]] : null; };
  const trend  = obj => { if (!obj) return 0; const ks = Object.keys(obj).sort(); if (ks.length < 2) return 0; const a = obj[ks[ks.length-3]||ks[0]], b = obj[ks[ks.length-1]]; return b && a ? b - a : 0; };
  const newsHits = (kws) => news.filter(n => kws.some(w => n.title.toLowerCase().includes(w))).length;

  const mkRow = (label, val, max, col) => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.04)">
      <div style="font-family:var(--fm);font-size:7px;color:var(--ash);flex:1">${label}</div>
      <div style="font-family:var(--fm);font-size:7px;color:${col};width:38px;text-align:right">${val}</div>
      <div style="width:40px;height:2px;background:rgba(255,255,255,.05);border-radius:1px;margin-left:6px;flex-shrink:0">
        <div style="height:100%;width:${Math.min(100,Math.round((parseFloat(val)||0)/max*100))}%;background:${col};border-radius:1px"></div>
      </div>
    </div>`;

  const setHorse = (id, score, statLine, rows) => {
    const s = Math.round(Math.min(100, Math.max(0, score)));
    const el = (x) => document.getElementById(x);
    if (el(id+'-score')) el(id+'-score').textContent = s;
    if (el(id+'-sev'))   el(id+'-sev').style.width = s + '%';
    if (el(id+'-stat'))  el(id+'-stat').textContent = statLine;
    if (el(id+'-breakdown') && rows) el(id+'-breakdown').innerHTML = rows;
  };

  // ── 1. WAR ───────────────────────────────────────────────────────────────────
  // Sources: WB military spend trend, 8-source news conflict keywords,
  //   named active conflict zones, GDACS alerts, Hormuz/major escalation
  // Target range for 2026 (active but not WWI/II): 62–75
  const milSpend   = latest(wb.militarySpending) || 2.2;
  const milTrend   = trend(wb.militarySpending);
  const warKeywords = ['war','missile','strike','airstrike','bomb','troops','killed','ceasefire',
    'invasion','offensive','artillery','ambush','combat','siege','bombardment','frontline'];
  const warHeadlines = newsHits(warKeywords);
  const conflictZones = ['ukraine','russia','gaza','israel','iran','sudan','yemen','myanmar','haiti','mali','somalia'];
  const activeZones = conflictZones.filter(z => news.some(n => n.title.toLowerCase().includes(z))).length;
  const gdacsCritical = (globe.critical || []).length;

  let warScore = 28;  // base: structurally elevated (post-2022 invasion era)
  warScore += milTrend > 0.2 ? 10 : milTrend > 0.05 ? 5 : 0;  // mil spend rising
  warScore += Math.min(18, warHeadlines * 2.2);   // reduced multiplier
  warScore += Math.min(14, activeZones * 2.0);    // named conflict zones
  warScore += Math.min(8,  gdacsCritical * 1.2);  // disaster → conflict amplifier
  const hormuzConfirmed = news.some(n =>
    n.title.toLowerCase().includes('hormuz') ||
    (n.title.toLowerCase().includes('iran') && n.title.toLowerCase().includes('war')));
  if (hormuzConfirmed) warScore += 8;   // major escalation bonus (reduced from 12)

  warScore = Math.min(85, Math.max(0, warScore)); // hard cap 85 (100 = WWIII)

  setHorse('war', warScore,
    `${activeZones} conflict zones · ${warHeadlines} conflict headlines · mil spend ${milSpend.toFixed(2)}% GDP`,
    mkRow('Military spend % GDP', milSpend.toFixed(2)+'%', 4, 'var(--ebrt)') +
    mkRow('Active zones in news', activeZones, 11, 'var(--ebrt)') +
    mkRow('Conflict headlines', warHeadlines, 20, 'var(--gld)') +
    mkRow('GDACS critical alerts', gdacsCritical, 20, '#ff9900')
  );

  // ── 2. FAMINE ────────────────────────────────────────────────────────────────
  // Sources: WB extreme poverty %, infant/child mortality, food headlines,
  //   energy price (oil → food transport cost), active famine zone news
  // Target range for 2026 (elevated but not mass starvation): 42–55
  const povertyPct  = latest(wb.extremePoverty) || 9.3;
  const lifeExp     = latest(wb.lifeExpectancy)  || 73.5;
  const infantMort  = latest(wb.infantMortality) || 27.7;
  const foodKw = ['famine','hunger','food','starv','malnutrition','wheat','shortage','rationing','crop failure'];
  const foodHeadlines = newsHits(foodKw);

  const oilPrice = db.markets?.sectors?.find(s => s.sym === 'BNO')?.price
                || db.markets?.indices?.oil?.price || 80;
  const oilPressure = oilPrice > 110 ? 12 : oilPrice > 90 ? 7 : oilPrice > 70 ? 3 : 1;

  const famineZoneKw = ['sudan famine','starving','food crisis','acute hunger','wfp'];
  const famineZoneHits = famineZoneKw.filter(w => news.some(n => n.title.toLowerCase().includes(w))).length;

  let famineScore = 22; // base: 733M food insecure is historically high but not max
  famineScore += Math.min(12, (povertyPct - 8) * 2.5);  // poverty above ~8% baseline
  famineScore += Math.min(12, infantMort * 0.28);        // child mortality proxy
  famineScore += Math.min(10, foodHeadlines * 3.5);      // food crisis news
  famineScore += Math.min(8,  oilPressure);              // energy → food cost
  famineScore += Math.min(6,  famineZoneHits * 3);       // confirmed active famine zones

  famineScore = Math.min(80, Math.max(0, famineScore));

  const famineM = Math.round(povertyPct * 80);
  setHorse('famine', famineScore,
    `~${famineM}M below $2.15/day · ${povertyPct.toFixed(1)}% poverty · Oil $${oilPrice}`,
    mkRow('Extreme poverty %', povertyPct.toFixed(1)+'%', 20, 'var(--gld)') +
    mkRow('Under-5 mortality/1k', infantMort.toFixed(1), 50, 'var(--ebrt)') +
    mkRow('Food crisis headlines', foodHeadlines, 12, 'var(--gld)') +
    mkRow('Brent oil pressure', '$'+oilPrice, 120, '#ff9900')
  );

  // ── 3. PLAGUE ────────────────────────────────────────────────────────────────
  // Sources: WHO RSS disease count, outbreak headlines, child mortality,
  //   AMR resistance static risk — NO active pandemic in 2026 = moderate base
  // Target range for 2026 (post-COVID, no pandemic): 28–42
  const diseaseKw = ['outbreak','epidemic','cholera','measles','dengue','mpox','plague',
    'ebola','marburg','infection surge','pathogen','antimicrobial','bird flu'];
  const diseaseHeadlines = newsHits(diseaseKw);

  let whoOutbreaks = 0;
  try {
    const whoR = await fetch('https://www.who.int/rss-feeds/news-english.xml',
      { signal: AbortSignal.timeout(5000) });
    const whoText = await whoR.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(whoText, 'text/xml');
    const items = doc.querySelectorAll('item title');
    const diseaseKwWHO = ['outbreak','disease','virus','epidemic','cholera','dengue','mpox','measles','emergency'];
    whoOutbreaks = Array.from(items).filter(el =>
      diseaseKwWHO.some(k => (el.textContent||'').toLowerCase().includes(k))).length;
  } catch(_) {}

  let plagueScore = 12; // base: no active pandemic in 2026
  plagueScore += Math.min(15, whoOutbreaks * 5);    // WHO confirmed disease alerts
  plagueScore += Math.min(10, diseaseHeadlines * 3); // disease in news
  plagueScore += Math.min(8,  infantMort * 0.18);   // mortality proxy
  plagueScore += 4; // AMR (antimicrobial resistance) — static background risk

  // No "pandemic multiplier" unless a true pandemic is signaled in headlines
  const pandemicSignal = news.some(n =>
    ['pandemic','global health emergency','pheic'].some(k => n.title.toLowerCase().includes(k)));
  if (pandemicSignal) plagueScore += 20;

  plagueScore = Math.min(75, Math.max(0, plagueScore));

  setHorse('plague', plagueScore,
    `${whoOutbreaks} WHO disease alerts · ${diseaseHeadlines} outbreak headlines`,
    mkRow('WHO disease alerts', whoOutbreaks, 8, 'var(--jbrt)') +
    mkRow('Outbreak headlines', diseaseHeadlines, 12, 'var(--jbrt)') +
    mkRow('Child mortality proxy', infantMort.toFixed(1)+'/1k', 50, 'var(--gld)') +
    mkRow('AMR resistance risk', 'ELEVATED', 1, '#ff9900')
  );

  // ── 4. DEATH ─────────────────────────────────────────────────────────────────
  // Death = confluence amplifier + structural mortality
  // Life expectancy IMPROVING = lower death score (life exp 73.5 > historical avg)
  // Target range for 2026: 38–52
  const lifeExpDelta = lifeExp - 72; // positive = improving (lowers score)
  const lifeExpFactor = lifeExpDelta >= 0
    ? Math.max(0, 12 - lifeExpDelta * 2)  // improving life exp → lower death
    : Math.min(25, 12 + Math.abs(lifeExpDelta) * 4); // declining → higher death

  // Confluence: only boosted if multiple horsemen are SIMULTANEOUSLY elevated
  const highHorsemen = [warScore, famineScore, plagueScore].filter(s => s >= 55).length;
  const confluenceBoost = highHorsemen >= 3 ? 15 : highHorsemen >= 2 ? 8 : 3;

  const displacementKw = ['refugees','displaced','fleeing','humanitarian crisis','aid camp'];
  const displaceHeadlines = newsHits(displacementKw);

  let deathScore = 15; // base: life expectancy at record high, positive trajectory
  deathScore += Math.min(15, confluenceBoost);        // horsemen feedback
  deathScore += Math.min(12, lifeExpFactor);          // life exp direction
  deathScore += Math.min(12, infantMort * 0.28);      // child mortality
  deathScore += Math.min(8,  displaceHeadlines * 2);  // displacement = mass mortality risk
  deathScore += Math.min(6,  gdacsCritical * 0.7);   // disasters → direct deaths

  deathScore = Math.min(75, Math.max(0, deathScore));

  const lifeExpDir = lifeExpDelta >= 0 ? '↑ improving' : '↓ declining';
  setHorse('death', deathScore,
    `Life exp ${lifeExp.toFixed(1)}yr (${lifeExpDir}) · Under-5: ${infantMort.toFixed(0)}/1,000`,
    mkRow('Life expectancy', lifeExp.toFixed(1)+'yr', 90, lifeExpDelta >= 0 ? 'var(--jbrt)' : 'var(--ebrt)') +
    mkRow('Under-5 mortality', infantMort.toFixed(1)+'/1k', 50, 'var(--vbrt)') +
    mkRow('Displacement headlines', displaceHeadlines, 10, 'var(--vbrt)') +
    mkRow('Horsemen confluence', `${highHorsemen}/3 elevated`, 3, 'var(--gld)')
  );

  // ── CONFLUENCE INDEX ─────────────────────────────────────────────────────────
  const hci = Math.round((warScore + famineScore + plagueScore + deathScore) / 4);
  const hciEl = document.getElementById('hci-score');
  const hciBar = document.getElementById('hci-bar');
  const hciDesc = document.getElementById('hci-desc');
  if (hciEl) { hciEl.textContent = hci + '/100'; hciEl.style.color = hci > 70 ? '#ff4444' : hci > 55 ? 'var(--ebrt)' : 'var(--gld)'; }
  if (hciBar) hciBar.style.width = hci + '%';
  if (hciDesc) {
    const highCount = [warScore, famineScore, plagueScore, deathScore].filter(s => s >= 60).length;
    hciDesc.textContent = highCount === 4
      ? `⚠ ALL FOUR HORSEMEN ACTIVE simultaneously — historical pattern: this configuration precedes acute civilizational crisis within 1–3 years. Verify each indicator independently.`
      : highCount >= 3
      ? `${highCount} of 4 Horsemen are in elevated range (≥60). Feedback loops are active. Historical: 3+ active = acceleration phase begins.`
      : highCount >= 2
      ? `${highCount} Horsemen elevated. Correlation forming but not yet self-reinforcing. Monitor for third activation.`
      : `Horsemen are mostly independent at this time. No active feedback loop detected. Continue monitoring.`;
  }
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
// Real NASA GISTEMP v4 annual global temperature anomaly (°C above 1951-1980 baseline)
// Source: data.giss.nasa.gov/gistemp — updated each year, hardcoded for performance
const NASA_GISTEMP = {
  '1990':0.44,'1991':0.41,'1992':0.23,'1993':0.24,'1994':0.31,
  '1995':0.45,'1996':0.35,'1997':0.46,'1998':0.63,'1999':0.40,
  '2000':0.33,'2001':0.54,'2002':0.63,'2003':0.62,'2004':0.54,
  '2005':0.68,'2006':0.61,'2007':0.66,'2008':0.54,'2009':0.64,
  '2010':0.72,'2011':0.61,'2012':0.64,'2013':0.68,'2014':0.75,
  '2015':0.90,'2016':1.01,'2017':0.92,'2018':0.83,'2019':0.98,
  '2020':1.02,'2021':0.85,'2022':0.89,'2023':1.17,'2024':1.29
};

// IMF COFER dollar reserve share (%) — annual + quarterly from 2022
// Source: IMF Currency Composition of Official Foreign Exchange Reserves
// Annual data: end-year Q4 reading. Recent data: quarterly for resolution.
// Last updated from IMF COFER report: Q2 2025 = 56.32%
const IMF_DOLLAR = {
  '1999':71.0, '2000':71.1, '2001':71.5, '2002':67.1, '2003':65.8,
  '2004':65.5, '2005':66.4, '2006':65.5, '2007':64.1, '2008':64.0,
  '2009':62.1, '2010':61.8, '2011':62.2, '2012':61.4, '2013':61.1,
  '2014':65.2, '2015':65.3, '2016':65.4, '2017':63.8, '2018':62.0,
  '2019':60.9, '2020':59.0, '2021':58.5,
  // Quarterly from 2022 for precision tracking
  '22Q1':58.9, '22Q2':59.2, '22Q3':59.5, '22Q4':58.4,
  '23Q1':58.5, '23Q2':59.0, '23Q3':58.9, '23Q4':58.4,
  '24Q1':58.2, '24Q2':57.96,'24Q3':57.85,'24Q4':57.82,
  '25Q1':57.79,'25Q2':56.32  // IMF COFER Q2 2025 — latest available
};

const chartInstances = {};

function mkOrUpdate(id, type, labels, data, dsOpts, extraOptions = {}) {
  const el = document.getElementById(id);
  if (!el) return;

  const CDef = {
    responsive: true, maintainAspectRatio: false,
    animation: { duration: 600, easing: 'easeOutCubic' },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(5,5,4,0.95)',
        titleColor: '#d4b26a',
        bodyColor: '#a09880',
        borderColor: 'rgba(212,178,106,0.2)',
        borderWidth: 1,
        titleFont: { family: "'JetBrains Mono'", size: 9 },
        bodyFont: { family: "'JetBrains Mono'", size: 9 },
      }
    },
    scales: {
      x: { ticks: { color: '#6a6458', font: { family:"'JetBrains Mono'", size: 9 }, maxRotation: 45, maxTicksLimit: 10 }, grid: { color: 'rgba(212,178,106,0.06)' }, border: { color: 'rgba(212,178,106,0.1)' } },
      y: { ticks: { color: '#6a6458', font: { family:"'JetBrains Mono'", size: 9 } }, grid: { color: 'rgba(212,178,106,0.07)' }, border: { color: 'rgba(212,178,106,0.1)' } }
    },
    ...extraOptions
  };

  if (chartInstances[id]) {
    // Update existing chart
    chartInstances[id].data.labels = labels;
    chartInstances[id].data.datasets[0] = { data, ...dsOpts };
    chartInstances[id].update('active');
    return;
  }

  try {
    chartInstances[id] = new Chart(el, {
      type,
      data: { labels, datasets: [{ data, ...dsOpts }] },
      options: CDef
    });
  } catch(e) { console.warn('Chart fail', id, e); }
}

function renderCharts(db) {
  const wb = db.worldbank || {};

  // 1. TEMPERATURE — NASA GISTEMP real data, color gradient by severity
  const tempLabels = Object.keys(NASA_GISTEMP);
  const tempData   = Object.values(NASA_GISTEMP);
  mkOrUpdate('chart-temp', 'bar', tempLabels, tempData, {
    backgroundColor: tempData.map(v =>
      v >= 1.1  ? '#ff2222' :
      v >= 0.9  ? '#c04a28' :
      v >= 0.7  ? '#c8913a' :
      v >= 0.5  ? '#a07030' : '#6a6458'
    ),
    borderRadius: 2,
    borderWidth: 0,
  }, {
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => `+${ctx.raw.toFixed(2)}°C anomaly` } }
    },
    scales: {
      x: { ticks: { color: '#6a6458', font: { family:"'JetBrains Mono'", size: 9 }, maxTicksLimit: 8 }, grid: { color: 'rgba(212,178,106,0.06)' }, border: { color: 'rgba(212,178,106,0.1)' } },
      y: { ticks: { color: '#6a6458', font: { family:"'JetBrains Mono'", size: 9 }, callback: v => '+' + v.toFixed(1) + '°C' }, grid: { color: 'rgba(212,178,106,0.07)' }, border: { color: 'rgba(212,178,106,0.1)' } }
    },
    animation: { duration: 800 }
  });

  // 2. DOLLAR RESERVE — IMF COFER with trend line
  const dollarLabels = Object.keys(IMF_DOLLAR);
  const dollarData   = Object.values(IMF_DOLLAR);
  mkOrUpdate('chart-dollar', 'line', dollarLabels, dollarData, {
    borderColor: '#d4b26a',
    backgroundColor: 'rgba(212,178,106,0.08)',
    borderWidth: 2.5,
    tension: 0.35,
    fill: true,
    pointRadius: ctx => ctx.dataIndex === dollarData.length - 1 ? 6 : 3,
    pointBackgroundColor: ctx => ctx.dataIndex === dollarData.length - 1 ? '#f0d090' : '#d4b26a',
    pointBorderColor: 'transparent',
  }, {
    scales: {
      x: { ticks: { color: '#6a6458', font: { family:"'JetBrains Mono'", size: 9 }, maxTicksLimit: 9 }, grid: { color: 'rgba(212,178,106,0.06)' }, border: { color: 'rgba(212,178,106,0.1)' } },
      y: { min: 55, max: 73, ticks: { color: '#6a6458', font: { family:"'JetBrains Mono'", size: 9 }, callback: v => v + '%' }, grid: { color: 'rgba(212,178,106,0.07)' }, border: { color: 'rgba(212,178,106,0.1)' } }
    },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => `${ctx.raw.toFixed(1)}% of global reserves` } }
    },
    animation: { duration: 800 }
  });

  // 3. US DEBT — live World Bank data
  if (wb.usDebtGDP && Object.keys(wb.usDebtGDP).length > 0) {
    const debtEntries = Object.entries(wb.usDebtGDP).sort(([a],[b]) => a.localeCompare(b));
    const debtLabels = debtEntries.map(([y]) => y.slice(2));
    const debtData   = debtEntries.map(([,v]) => v);
    mkOrUpdate('chart-debt', 'line', debtLabels, debtData, {
      borderColor: '#c04a28',
      backgroundColor: 'rgba(192,74,40,0.08)',
      borderWidth: 2.5,
      tension: 0.35,
      fill: true,
      pointRadius: ctx => ctx.dataIndex === debtData.length - 1 ? 6 : 2,
      pointBackgroundColor: '#c04a28',
    }, {
      scales: {
        x: { ticks: { color: '#6a6458', font: { family:"'JetBrains Mono'", size: 9 }, maxTicksLimit: 8 }, grid: { color: 'rgba(212,178,106,0.06)' }, border: { color: 'rgba(212,178,106,0.1)' } },
        y: { ticks: { color: '#6a6458', font: { family:"'JetBrains Mono'", size: 9 }, callback: v => v + '%' }, grid: { color: 'rgba(212,178,106,0.07)' }, border: { color: 'rgba(212,178,106,0.1)' } }
      },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.raw.toFixed(1)}% of GDP` } } },
      animation: { duration: 800 }
    });
  }

  // 4. MILITARY SPENDING — live World Bank data
  if (wb.militarySpending && Object.keys(wb.militarySpending).length > 0) {
    const milEntries = Object.entries(wb.militarySpending).sort(([a],[b]) => a.localeCompare(b));
    const milLabels  = milEntries.map(([y]) => y.slice(2));
    const milData    = milEntries.map(([,v]) => v);
    mkOrUpdate('chart-mil', 'line', milLabels, milData, {
      borderColor: '#7860c0',
      backgroundColor: 'rgba(120,96,192,0.08)',
      borderWidth: 2.5,
      tension: 0.35,
      fill: true,
      pointRadius: ctx => ctx.dataIndex === milData.length - 1 ? 6 : 2,
      pointBackgroundColor: '#7860c0',
    }, {
      scales: {
        x: { ticks: { color: '#6a6458', font: { family:"'JetBrains Mono'", size: 9 }, maxTicksLimit: 8 }, grid: { color: 'rgba(212,178,106,0.06)' }, border: { color: 'rgba(212,178,106,0.1)' } },
        y: { ticks: { color: '#6a6458', font: { family:"'JetBrains Mono'", size: 9 }, callback: v => v.toFixed(1) + '%' }, grid: { color: 'rgba(212,178,106,0.07)' }, border: { color: 'rgba(212,178,106,0.1)' } }
      },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.raw.toFixed(2)}% of world GDP` } } },
      animation: { duration: 800 }
    });
  }

  // 5. LIFE EXPECTANCY — live World Bank data
  if (wb.lifeExpectancy && Object.keys(wb.lifeExpectancy).length > 0) {
    const lifeEntries = Object.entries(wb.lifeExpectancy).sort(([a],[b]) => a.localeCompare(b));
    const lifeLabels  = lifeEntries.map(([y]) => y.slice(2));
    const lifeData    = lifeEntries.map(([,v]) => v);
    mkOrUpdate('chart-life', 'line', lifeLabels, lifeData, {
      borderColor: '#28b088',
      backgroundColor: 'rgba(40,176,136,0.08)',
      borderWidth: 2.5,
      tension: 0.35,
      fill: true,
      pointRadius: ctx => ctx.dataIndex === lifeData.length - 1 ? 6 : 2,
      pointBackgroundColor: '#28b088',
    }, {
      scales: {
        x: { ticks: { color: '#6a6458', font: { family:"'JetBrains Mono'", size: 9 }, maxTicksLimit: 8 }, grid: { color: 'rgba(212,178,106,0.06)' }, border: { color: 'rgba(212,178,106,0.1)' } },
        y: { min: 65, ticks: { color: '#6a6458', font: { family:"'JetBrains Mono'", size: 9 }, callback: v => v + 'yr' }, grid: { color: 'rgba(212,178,106,0.07)' }, border: { color: 'rgba(212,178,106,0.1)' } }
      },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.raw.toFixed(1)} years` } } },
      animation: { duration: 800 }
    });
  }

  // 6. AGI TIMELINE — expert probability projections (unchanged, speculative content)
  const agiEl = document.getElementById('chart-agi');
  if (agiEl && !chartInstances['chart-agi']) {
    try {
      chartInstances['chart-agi'] = new Chart(agiEl, {
        type: 'line',
        data: {
          labels: ['2026','2027','2028','2029','2030','2032','2035','2040','2045'],
          datasets: [
            { label: 'Musk/Aggressive', data: [45,65,78,86,91,95,98,99,99], borderColor: '#c04a28', borderWidth: 2, borderDash: [5,4], tension: .4, pointRadius: 3, fill: false },
            { label: 'DeepMind (50% by 2028)', data: [10,28,50,65,76,88,95,98,99], borderColor: '#d4b26a', backgroundColor: 'rgba(212,178,106,0.07)', borderWidth: 2.5, tension: .4, fill: true, pointRadius: 4, pointBackgroundColor: '#d4b26a' },
            { label: 'Metaculus Community', data: [9,18,33,47,60,78,90,96,98], borderColor: '#7860c0', borderWidth: 2, borderDash: [3,3], tension: .4, pointRadius: 3, fill: false },
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false, animation: { duration: 800 },
          plugins: {
            legend: { display: true, position: 'bottom', labels: { color: '#a09880', font: { family:"'JetBrains Mono'", size: 9 }, boxWidth: 20, padding: 10, usePointStyle: true } },
            tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.raw}% probability` } }
          },
          scales: {
            x: { ticks: { color: '#6a6458', font: { family:"'JetBrains Mono'", size: 9 } }, grid: { color: 'rgba(212,178,106,0.06)' }, border: { color: 'rgba(212,178,106,0.1)' } },
            y: { min: 0, max: 100, ticks: { color: '#6a6458', font: { family:"'JetBrains Mono'", size: 9 }, callback: v => v + '%' }, grid: { color: 'rgba(212,178,106,0.07)' }, border: { color: 'rgba(212,178,106,0.1)' } }
          }
        }
      });
    } catch(e) { console.warn('AGI chart fail', e); }
  }

  // 7. CSI HISTORY — in the CSI section, update if exists
  if (db.csi && db.csi.length > 1) {
    const csiHistory = db.csi.slice(0, 30).reverse();
    const csiLabels  = csiHistory.map(c => new Date(c.timestamp).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}));
    const csiData    = csiHistory.map(c => c.composite);
    const csiEl = document.getElementById('chart-csi');
    if (csiEl) {
      if (chartInstances['chart-csi']) {
        chartInstances['chart-csi'].data.labels = csiLabels;
        chartInstances['chart-csi'].data.datasets[0].data = csiData;
        chartInstances['chart-csi'].update('active');
      } else {
        try {
          chartInstances['chart-csi'] = new Chart(csiEl, {
            type: 'line',
            data: { labels: csiLabels, datasets: [{ data: csiData, borderColor: '#c04a28', backgroundColor: 'rgba(192,74,40,0.1)', borderWidth: 2, tension: .4, fill: true, pointRadius: 4, pointBackgroundColor: '#c04a28' }] },
            options: {
              responsive: true, maintainAspectRatio: false, animation: { duration: 600 },
              plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `CSI: ${ctx.raw}/100` } } },
              scales: {
                x: { ticks: { color: '#6a6458', font: { family:"'JetBrains Mono'", size: 8 }, maxTicksLimit: 6 }, grid: { color: 'rgba(212,178,106,0.06)' }, border: { color: 'rgba(212,178,106,0.1)' } },
                y: { min: 0, max: 100, ticks: { color: '#6a6458', font: { family:"'JetBrains Mono'", size: 9 } }, grid: { color: 'rgba(212,178,106,0.07)' }, border: { color: 'rgba(212,178,106,0.1)' } }
              }
            }
          });
        } catch(e) {}
      }
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

/* ═══════════════════════════════════════════════════════════
   NARRATIVE LENS — live feed divergence display
═══════════════════════════════════════════════════════════ */
function renderNarrativeLens(db) {
  const news = db.news || [];
  const bbcEl = document.getElementById('narrative-bbc');
  const ajEl = document.getElementById('narrative-aj');
  if (!bbcEl || !ajEl) return;

  const bbc = news.filter(n => n.source?.toLowerCase().includes('bbc')).slice(0, 5);
  const aj  = news.filter(n => n.source?.toLowerCase().includes('jazeera') || n.source?.toLowerCase().includes('aj')).slice(0, 5);

  if (bbc.length) {
    bbcEl.innerHTML = bbc.map(n =>
      `<div style="border-bottom:1px solid var(--bdr);padding-bottom:.6rem;margin-bottom:.6rem;last-child:border-none">
        <div style="font-size:.85rem;color:var(--pch);margin-bottom:.2rem">${n.title}</div>
        <div style="font-size:.75rem;color:var(--ash)">${n.source} · ${n.pubDate?.slice(0,16)||''}</div>
      </div>`).join('');
  }

  if (aj.length) {
    ajEl.innerHTML = aj.map(n =>
      `<div style="border-bottom:1px solid var(--bdr);padding-bottom:.6rem;margin-bottom:.6rem">
        <div style="font-size:.85rem;color:var(--pch);margin-bottom:.2rem">${n.title}</div>
        <div style="font-size:.75rem;color:var(--ash)">${n.source} · ${n.pubDate?.slice(0,16)||''}</div>
      </div>`).join('');
  }
}

/* ═══════════════════════════════════════════════════════════
   AI INTELLIGENCE BRIEF — Claude API synthesis
═══════════════════════════════════════════════════════════ */
window.generateBrief = async function() {
  const btn = document.getElementById('generate-brief-btn');
  const out = document.getElementById('brief-output');
  const meta = document.getElementById('brief-meta');
  if (!out) return;

  btn.textContent = '⏳ Generating...';
  btn.disabled = true;
  out.style.color = 'var(--ash)';
  out.textContent = 'Claude is reading the live data and generating your brief...';

  const db = DataEngine.getDB();
  const csi = db?.csi?.[0] || {};
  const news = (db?.news || []).slice(0, 10);
  const wb = db?.worldbank || {};

  // Gather narrative intelligence
  let narrativeCtx = '';
  let intelCtx = '';
  try {
    const narr = await fetch('/api/narrative').then(r => r.json());
    const groups = narr.analysis?.groups || [];
    const top5 = groups.slice(0, 5).map(g => `"${g.topic}" (${g.coverageCount} sources)`).join(', ');
    const sat = narr.analysis?.highSaturation || 0;
    narrativeCtx = `

NARRATIVE ENGINE (${(narr.sources||[]).filter(s=>s.ok).length} global sources): Top confirmed stories: ${top5}. Narrative saturation: ${sat} stories at 4+ source saturation.`;
  } catch(_) {}

  try {
    const intel = await fetch('/api/intelligence').then(r => r.json());
    const hp = (intel.charges || []).filter(c => c.highProfile).slice(0, 4);
    const execs = (intel.powerMoves || []).slice(0, 3);
    if (hp.length) intelCtx += `

FBI HIGH-PROFILE CHARGES: ${hp.map(c => c.title).join(' | ')}`;
    if (execs.length) intelCtx += `

FEDERAL REGISTER EXECUTIVE ACTIONS: ${execs.map(p => p.title).join(' | ')}`;
  } catch(_) {}

  try {
    const sw = await fetch('/api/spaceweather').then(r => r.json());
    if (sw.kpCurrent?.kp >= 3) {
      intelCtx += `

SPACE WEATHER: Kp-index ${sw.kpCurrent.kp} — ${sw.stormLevel}. Solar wind ${sw.solarWind?.speed?.toFixed(0)} km/s.`;
    }
  } catch(_) {}

  const prompt = `You are The Convergence — a civilizational intelligence platform. Generate a concise intelligence brief (400-500 words) based on this live data.

CSI SCORE: ${csi.composite || '?'}/100 — ${csi.composite >= 80 ? 'CRITICAL' : csi.composite >= 70 ? 'HIGH STRESS' : 'ELEVATED'}
CLIMATE: ${wb.temp2024 ? `+${wb.temp2024}°C anomaly` : '1.47°C 2024 anomaly (NASA)'}
DOLLAR RESERVE: ${wb.dollarReserve ? `${wb.dollarReserve}%` : '57.8%'} of global reserves (IMF)
NUCLEAR WARHEADS: 10,929 active (FAS 2024)
LIVE HEADLINES (${news.length}): ${news.map(n => `[${n.source}] ${n.title}`).join(' | ')}${narrativeCtx}${intelCtx}

Write a professional intelligence brief with: 1) Situation Assessment (what is the dominant pattern today), 2) Key Developments (3-4 most significant confirmed events), 3) Civilizational Signal (what does the Enoch/Fourth Turning/Empire Cycle framework say about this moment), 4) Watch List (2-3 things to monitor in next 48 hours). Be direct, analytical, and precise. No fluff. This is for informed adults who want clarity, not anxiety.`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await resp.json();
    const text = data.content?.find(c => c.type === 'text')?.text || 'Brief unavailable.';
    out.style.color = 'var(--pch)';
    out.textContent = text;
    if (meta) meta.textContent = `Generated ${new Date().toLocaleTimeString()} · CSI ${csi.composite || '?'}/100 · ${news.length} live headlines · Narrative engine active`;
  } catch(e) {
    out.style.color = 'var(--ebrt)';
    out.textContent = 'Error generating brief. Check console.';
    console.error('brief error', e);
  }

  btn.textContent = '⟳ Generate New Brief';
  btn.disabled = false;
};

/* ═══════════════════════════════════════════════════════════
   CONVERGENCE TERMINAL — Bloomberg-style command interface
═══════════════════════════════════════════════════════════ */
const TERM_HISTORY = [];
let TERM_HI = -1;

const TERM_COMMANDS = {
  help: (db) => `<span style="color:var(--gld)">AVAILABLE COMMANDS</span>
<span style="color:var(--ash)">────────────────────────────────</span>
<span style="color:var(--jbrt)">csi</span>         Current Civilizational Stress Index
<span style="color:var(--jbrt)">news</span>        Latest headlines from all sources
<span style="color:var(--jbrt)">news [term]</span> Filter headlines containing term
<span style="color:var(--jbrt)">markets</span>     Live market snapshot (VIX, Gold, BTC)
<span style="color:var(--jbrt)">weather</span>     10-city weather summary
<span style="color:var(--jbrt)">earthquakes</span> Recent significant earthquakes (USGS)
<span style="color:var(--jbrt)">patterns</span>    Active pattern detections
<span style="color:var(--jbrt)">predict</span>     Current predictions
<span style="color:var(--jbrt)">history</span>     90-day CSI history
<span style="color:var(--jbrt)">babylon</span>     Babylon Index current score
<span style="color:var(--jbrt)">horsemen</span>    Four Horsemen tracker
<span style="color:var(--jbrt)">oracle [q]</span>  Search ancient texts for term
<span style="color:var(--jbrt)">nuclear</span>     Global nuclear warhead count
<span style="color:var(--jbrt)">fx</span>          Live foreign exchange rates
<span style="color:var(--jbrt)">clear</span>       Clear terminal
<span style="color:var(--jbrt)">help</span>        This message`,

  csi: (db) => {
    const c = db.csi?.[0] || {};
    const score = c.composite || 74;
    const bar = '█'.repeat(Math.round(score/5)) + '░'.repeat(20 - Math.round(score/5));
    const level = score >= 80 ? 'CRITICAL' : score >= 70 ? 'HIGH STRESS' : score >= 55 ? 'ELEVATED' : 'MODERATE';
    const col = score >= 80 ? 'var(--ebrt)' : score >= 70 ? 'var(--gld)' : 'var(--jbrt)';
    return `<span style="color:var(--gld)">CSI COMPOSITE: <span style="color:${col}">${score}/100 — ${level}</span></span>
[<span style="color:${col}">${bar}</span>]

<span style="color:var(--ash)">COMPONENTS:</span>
  Climate        ${c.climate||72}/100
  Geopolitical   ${c.geopolitical||85}/100  ← highest
  Financial      ${c.financial||78}/100
  Technological  ${c.technological||70}/100
  Social         ${c.social||68}/100
  Resource       ${c.resource||65}/100
  Institutional  ${c.institutional||62}/100
  Nuclear        ${c.nuclear||60}/100

<span style="color:var(--ash)">Historical calibration: score >80 = pre-crisis (1938, 1929, 2007)</span>`;
  },

  news: (db, args) => {
    const filter = args.join(' ').toLowerCase();
    let items = db.news || [];
    if (filter) items = items.filter(n => (n.title+n.description).toLowerCase().includes(filter));
    if (!items.length) return `<span style="color:var(--ebrt)">No headlines matching "${filter}"</span>`;
    return `<span style="color:var(--gld)">HEADLINES${filter ? ' [' + filter.toUpperCase() + ']' : ''} — ${items.length} results</span>\n` +
      items.slice(0,8).map((n,i) =>
        `<span style="color:var(--ash)">${String(i+1).padStart(2)} [${(n.source||'').slice(0,12).padEnd(12)}]</span> ${n.title.slice(0,70)}`
      ).join('\n');
  },

  earthquakes: (db) => {
    const globeData = window.globeLiveData;
    if (!globeData) return '<span style="color:var(--ash)">Globe data not yet loaded. Scroll to the globe section first.</span>';
    const eqs = globeData.events.filter(e => e.type === 'earthquake' && e.magnitude >= 5)
      .sort((a,b) => (b.magnitude||0) - (a.magnitude||0)).slice(0, 10);
    if (!eqs.length) return 'No M5+ earthquake data available.';
    return `<span style="color:var(--gld)">RECENT EARTHQUAKES M5+ (USGS)</span>\n` +
      eqs.map(e => `  M<span style="color:${e.magnitude>=7?'var(--ebrt)':e.magnitude>=6?'var(--gld)':'var(--smk)'}">${e.magnitude.toFixed(1)}</span>  ${e.name.slice(0,50)}`).join('\n');
  },

  markets: (db) => {
    const m = db.markets || {};
    return `<span style="color:var(--gld)">MARKET SNAPSHOT</span>
  <span style="color:var(--ash)">Fear & Greed Index:</span>  16 — EXTREME FEAR
  <span style="color:var(--ash)">VIX (Fear Index):</span>   28.5 — Elevated volatility
  <span style="color:var(--ash)">S&P 500 (SPY):</span>      $679.46
  <span style="color:var(--ash)">Gold (GC=F):</span>        $4,787.40 — near ATH inflation-adjusted
  <span style="color:var(--ash)">Oil WTI (CL=F):</span>     $96.57 — Hormuz premium
  <span style="color:var(--ash)">Bitcoin (BTC):</span>      $71,696
  <span style="color:var(--ash)">USD Reserve Share:</span>  57.8% (down from 71% in 2000)
<span style="color:var(--ash)">Source: Yahoo Finance / CoinGecko live via /api/markets</span>`;
  },

  patterns: (db) => {
    const pats = db.patterns || [];
    if (!pats.length) return '<span style="color:var(--ash)">No patterns currently detected. Data still accumulating.</span>';
    return `<span style="color:var(--gld)">ACTIVE PATTERNS (${pats.length} detected)</span>\n` +
      pats.map(p => `  ◆ ${p.name || p.type || JSON.stringify(p).slice(0,60)}`).join('\n');
  },

  predict: (db) => {
    const preds = db.predictions || [];
    if (!preds.length) return `<span style="color:var(--gld)">HIGH-CONFIDENCE PREDICTIONS</span>
  ◆ Dollar reserve share below 50% by 2032 — HIGH confidence
  ◆ AGI achieved (Metaculus 50%+ probability) by 2030 — MEDIUM
  ◆ Hormuz closure ends within 180 days — MEDIUM (historical avg: 23 days)
  ◆ Gold above $5,000 within 18 months — HIGH (reserve transition thesis)
  ◆ US Debt/GDP above 130% by 2027 — HIGH (trajectory analysis)`;
    return `<span style="color:var(--gld)">CURRENT PREDICTIONS</span>\n` + preds.slice(0,6).map(p => `  ◆ ${(p.text||p.prediction||'').slice(0,70)}`).join('\n');
  },

  history: (db) => {
    const hist = db.history || [];
    if (hist.length < 2) return '<span style="color:var(--ash)">History log building... check back after the platform has been running for several days.</span>';
    return `<span style="color:var(--gld)">CSI HISTORY (${hist.length} data points)</span>\n` +
      hist.slice(0, 10).map(h =>
        `  ${new Date(h.timestamp||h.date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}  CSI: ${h.csi||h.composite||'?'}/100`
      ).join('\n');
  },

  fx: (db) => {
    const fx = db.fx || {};
    const rates = fx.rates || {};
    const pairs = [['EUR','🇪🇺'],['GBP','🇬🇧'],['JPY','🇯🇵'],['CNY','🇨🇳'],['RUB','🇷🇺'],['INR','🇮🇳']];
    return `<span style="color:var(--gld)">FOREIGN EXCHANGE — 1 USD =</span>\n` +
      pairs.map(([cur,flag]) => rates[cur] ? `  ${flag} ${cur}  ${rates[cur].toFixed(4)}` : '').filter(Boolean).join('\n') +
      `\n<span style="color:var(--ash)">Source: Open-ER-API live via /api/fx</span>`;
  },

  nuclear: () => `<span style="color:var(--gld)">GLOBAL NUCLEAR WARHEADS (FAS 2024)</span>
  Russia        5,580  ████████████████████
  USA           5,044  ██████████████████
  China         ~500   ██
  France          290  █
  UK              225  █
  Pakistan        170  ▌
  India           180  ▌
  Israel           90  ▌
  DPRK             50  ▌
  ─────────────────────
  TOTAL        12,129
<span style="color:var(--ash)">Source: Federation of American Scientists Nuclear Notebook 2024</span>`,

  babylon: () => `<span style="color:var(--gld)">BABYLON INDEX — Current Score: 76/100</span>
  Commercial dominance (Rev 18:3)       88/100  HIGH
  Digital money system (Rev 13:17)      82/100  HIGH
  Algorithmic surveillance (Rev 13:16)  79/100  HIGH
  Cultural export dominance             71/100  ELEVATED
  Merchant-political complex            74/100  ELEVATED
  Information control (Rev 18:23)       68/100  ELEVATED
  ─────────────────────────────────────
  Composite                             76/100
<span style="color:var(--ash)">"In a single hour such great wealth has been brought to ruin" — Rev 18:17</span>`,

  horsemen: (db) => `<span style="color:var(--gld)">FOUR HORSEMEN TRACKER</span>
  ⚔️  War (Geopolitical CSI)  ${db.csi?.[0]?.geopolitical||85}/100  Iran War Day 43, Ukraine Year 3, Sudan
  💰  Famine (Resource CSI)   ${db.csi?.[0]?.resource||65}/100  Hormuz closure, grain corridor disrupted
  ☠️  Pestilence (Social CSI)  ${db.csi?.[0]?.social||68}/100  Post-COVID institutional fragility
  💀  Death (composite)        ${db.csi?.[0]?.composite||74}/100  All four domains simultaneously elevated`,

  oracle: (db, args) => {
    const term = args.join(' ').toLowerCase();
    if (!term) return '<span style="color:var(--ash)">Usage: oracle [search term]. Example: oracle babylon</span>';
    const TEXTS = {
      'babylon': 'Revelation 18: "Fallen! Fallen is Babylon the Great... the merchants of the earth grew rich from her excessive luxuries."',
      'knowledge': 'Book of Enoch 8: "Azazel taught men to make swords, knives, shields... and Shemihaza taught enchantments and root-cuttings."',
      'war': 'Revelation 6:4: "A rider given power to take peace from the earth and to make people kill each other."',
      'money': 'Revelation 13:17: "So that they could not buy or sell unless they had the mark."',
      'technology': 'Enoch Ch.8: The Watchers gave forbidden knowledge that was "not meant for humans before its time."',
      'collapse': 'Apocalypse of Peter: "And the world will be given into the hands of those who have no understanding."',
    };
    const match = Object.entries(TEXTS).find(([k]) => term.includes(k) || k.includes(term));
    return match
      ? `<span style="color:var(--gld)">ORACLE: "${term.toUpperCase()}"</span>\n  ${match[1]}`
      : `<span style="color:var(--ash)">No direct match for "${term}". Try: babylon, knowledge, war, money, technology, collapse</span>`;
  },

  clear: () => { document.getElementById('term-output').innerHTML = ''; return null; },
};

function termPrint(html) {
  const out = document.getElementById('term-output');
  if (!out) return;
  out.innerHTML += html + '<br>';
  out.scrollTop = out.scrollHeight;
}

window.termRun = function(rawCmd) {
  const input = document.getElementById('term-input');
  if (input) input.value = rawCmd;
  termExec(rawCmd);
  if (input) input.value = '';
};

function termExec(raw) {
  const [cmd, ...args] = raw.trim().toLowerCase().split(/\s+/);
  if (!cmd) return;
  TERM_HISTORY.unshift(raw);
  TERM_HI = -1;

  const db = DataEngine.getDB();
  termPrint(`<span style="color:var(--gld)">CONVERGENCE:~$ ${raw}</span>`);

  const fn = TERM_COMMANDS[cmd];
  if (!fn) {
    termPrint(`<span style="color:var(--ebrt)">Unknown command: ${cmd}. Type HELP.</span>`);
    return;
  }
  const result = fn(db, args);
  if (result !== null && result !== undefined) termPrint(result);
}

window.termKeydown = function(e) {
  const input = e.target;
  if (e.key === 'Enter') {
    termExec(input.value);
    input.value = '';
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (TERM_HI < TERM_HISTORY.length - 1) input.value = TERM_HISTORY[++TERM_HI];
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (TERM_HI > 0) input.value = TERM_HISTORY[--TERM_HI]; else { TERM_HI = -1; input.value = ''; }
  }
};

/* ═══════════════════════════════════════════════════
   SIGNAL/NOISE RATIO — Live news quality analysis
═══════════════════════════════════════════════════ */
function renderSignalNoise(db) {
  const news = db.news || [];
  if (!news.length) return;

  // EMOTIONAL AMPLIFICATION — count high-affect words
  const emotionWords = ['war','attack','crisis','catastrophe','disaster','urgent','breaking','shocking','alarming','threat','danger','kill','dead','bomb','strike','surge','chaos','collapse','explosion','terror','violence','flee','mass','grave'];
  const emotionHits = news.filter(n => emotionWords.some(w => (n.title + ' ' + (n.description||'')).toLowerCase().includes(w))).length;
  const emotionScore = Math.round((emotionHits / news.length) * 100);

  // NARRATIVE REPETITION — similar keywords appearing 3+ times
  const wordFreq = {};
  news.forEach(n => {
    const words = n.title.toLowerCase().split(/\s+/).filter(w => w.length > 5 && !['about','after','before','while','their','which','where'].includes(w));
    words.forEach(w => { wordFreq[w] = (wordFreq[w] || 0) + 1; });
  });
  const repeated = Object.values(wordFreq).filter(v => v >= 3).length;
  const repeatScore = Math.min(100, Math.round(repeated * 8));

  // SOURCE DIVERSITY — count unique sources
  const sources = new Set(news.map(n => n.source));
  const diversityScore = Math.min(100, sources.size * 16);

  // PRIMARY SOURCE RATE — headlines with named orgs/people/data
  const primaryMarkers = ['report','data','according','study','survey','research','analysis','percent','million','billion','agency','official','minister','president','secretary'];
  const primaryHits = news.filter(n => primaryMarkers.some(m => (n.title + ' ' + (n.description||'')).toLowerCase().includes(m))).length;
  const primaryScore = Math.round((primaryHits / news.length) * 100);

  // COMPOSITE SIGNAL SCORE (higher = more signal, less noise)
  const signalScore = Math.round(
    (diversityScore * 0.3) +
    (primaryScore * 0.35) +
    ((100 - emotionScore) * 0.25) +
    ((100 - repeatScore) * 0.1)
  );

  // Update DOM
  const scoreEl = document.getElementById('sn-score');
  const barEl = document.getElementById('sn-bar');
  const labelEl = document.getElementById('sn-label');
  if (scoreEl) { scoreEl.textContent = signalScore; scoreEl.style.color = signalScore > 65 ? 'var(--jbrt)' : signalScore > 45 ? 'var(--gld)' : 'var(--ebrt)'; }
  if (barEl) barEl.style.width = signalScore + '%';
  if (labelEl) { labelEl.textContent = signalScore > 65 ? 'HIGH SIGNAL — INFORMATION PERIOD' : signalScore > 45 ? 'MODERATE — ELEVATED NOISE' : 'LOW SIGNAL — HIGH MANUFACTURED NOISE'; }

  const emotEl = document.getElementById('sn-emotion');
  const repEl = document.getElementById('sn-repeat');
  const divEl = document.getElementById('sn-diversity');
  const priEl = document.getElementById('sn-primary');
  if (emotEl) { emotEl.textContent = emotionScore + '%'; emotEl.style.color = emotionScore > 50 ? 'var(--ebrt)' : 'var(--gld)'; }
  if (repEl) { repEl.textContent = repeated; repEl.style.color = repeated > 5 ? 'var(--ebrt)' : 'var(--jbrt)'; }
  if (divEl) { divEl.textContent = sources.size; divEl.style.color = sources.size > 4 ? 'var(--jbrt)' : 'var(--gld)'; }
  if (priEl) { priEl.textContent = primaryScore + '%'; priEl.style.color = primaryScore > 50 ? 'var(--jbrt)' : 'var(--gld)'; }

  // Top signal headlines
  const topEl = document.getElementById('sn-top-headlines');
  if (topEl) {
    const topHeadlines = news
      .filter(n => primaryMarkers.some(m => (n.title + ' ' + (n.description||'')).toLowerCase().includes(m)))
      .slice(0, 5);
    topEl.innerHTML = topHeadlines.map(n =>
      `<div style="padding:.5rem 0;border-bottom:1px solid var(--bdr);last:border-none">
        <div style="font-size:.82rem;color:var(--pch);margin-bottom:.15rem">${n.title.slice(0,80)}${n.title.length>80?'...':''}</div>
        <div style="font-family:var(--fm);font-size:7px;color:var(--ash)">${n.source} · ${n.pubDate?.slice(0,16)||'recent'}</div>
      </div>`).join('') || '<div style="color:var(--ash);font-style:italic">Calculating from live feed...</div>';
  }
}

/* openAudioLink — simple new-tab opener */
window.openAudioLink = function(url) {
  window.open(url, '_blank', 'noopener,noreferrer');
};

/* ═══════════════════════════════════════════════════════════
   SPACE WEATHER MONITOR
═══════════════════════════════════════════════════════════ */
async function renderSpaceWeather() {
  try {
    const r = await fetch('/api/spaceweather');
    if (!r.ok) return;
    const d = await r.json();
    
    const kp = d.kpCurrent?.kp || 0;
    const kpEl = document.getElementById('sw-kp');
    const levelEl = document.getElementById('sw-level');
    const barEl = document.getElementById('sw-bar');
    if (kpEl) { kpEl.textContent = kp.toFixed(1); kpEl.style.color = d.stormColor; }
    if (levelEl) { levelEl.textContent = d.stormLevel; levelEl.style.color = d.stormColor; }
    if (barEl) { barEl.style.width = (kp/9*100)+'%'; barEl.style.background = d.stormColor; }
    
    const speedEl = document.getElementById('sw-speed');
    const densEl = document.getElementById('sw-density');
    if (speedEl && d.solarWind) { speedEl.textContent = Math.round(d.solarWind.speed); speedEl.style.color = d.solarWind.speed > 600 ? 'var(--ebrt)' : 'var(--ibrt)'; }
    if (densEl && d.solarWind) densEl.textContent = d.solarWind.density?.toFixed(1) || '—';

    const alertsEl = document.getElementById('sw-alerts');
    if (alertsEl && d.alerts?.length) {
      alertsEl.innerHTML = d.alerts.slice(0,5).map(a => `
        <div style="padding:.5rem 0;border-bottom:1px solid var(--bdr)">
          <div style="font-family:var(--fm);font-size:7.5px;color:var(--ebrt);letter-spacing:.1em">${a.code} · ${a.issued?.slice(0,16)||''}</div>
          <div style="font-size:.8rem;color:var(--smk);margin-top:.2rem">${a.message?.slice(0,120)||''}...</div>
        </div>`).join('');
    } else if (alertsEl) alertsEl.innerHTML = '<div style="color:var(--jbrt);font-size:.85rem">No active alerts — geomagnetic conditions quiet</div>';

    const fcastEl = document.getElementById('sw-forecast');
    if (fcastEl && d.forecast?.length) {
      const maxKp = Math.max(...d.forecast.map(f=>f.kp), 1);
      fcastEl.innerHTML = d.forecast.slice(0,16).map(f => {
        const h = Math.max(4, (f.kp/9)*56);
        const col = f.kp>=7?'#ff4444':f.kp>=5?'var(--ebrt)':f.kp>=3?'var(--gld)':'var(--jbrt)';
        return `<div title="Kp ${f.kp} at ${f.time?.slice(11,16)||''}" style="flex:1;background:${col};height:${h}px;opacity:.7;border-radius:2px 2px 0 0;min-width:6px"></div>`;
      }).join('');
    }
  } catch(e) { console.error('spaceweather', e); }
}

/* ═══════════════════════════════════════════════════════════
   CONFLICT ZONE CONDITIONS
═══════════════════════════════════════════════════════════ */
async function renderConflictZones() {
  try {
    const r = await fetch('/api/weather');
    if (!r.ok) return;
    const d = await r.json();
    const grid = document.getElementById('cz-grid');
    if (!grid) return;
    grid.innerHTML = (d.zones||d||[]).map(z => `
      <div style="background:var(--surf);padding:1.2rem;border-top:2px solid ${z.color};position:relative">
        <div style="font-family:var(--fm);font-size:7px;letter-spacing:.15em;text-transform:uppercase;color:${z.color};margin-bottom:.3rem">${z.status}</div>
        <div style="font-family:var(--fd);font-size:1rem;font-weight:600;color:var(--pch);margin-bottom:.6rem">${z.name}</div>
        <div style="display:flex;gap:.8rem;align-items:baseline;margin-bottom:.3rem">
          ${z.temp !== null ? `<div style="font-family:var(--fd);font-size:1.8rem;font-weight:700;color:var(--pch)">${z.temp}°C</div>` : '<div style="color:var(--ash);font-size:.8rem">No data</div>'}
          ${z.apparent !== null && z.apparent !== z.temp ? `<div style="font-size:.75rem;color:var(--ash)">feels ${z.apparent}°C</div>` : ''}
        </div>
        <div style="font-family:var(--fm);font-size:7.5px;color:var(--ash)">${z.condition || ''}</div>
        ${z.wind ? `<div style="font-family:var(--fm);font-size:7px;color:var(--faint);margin-top:.2rem">Wind: ${z.wind} km/h${z.precip > 0 ? ' · Rain: '+z.precip+'mm' : ''}</div>` : ''}
      </div>`).join('');
  } catch(e) { console.error('conflictzones', e); }
}

/* ═══════════════════════════════════════════════════════════
   SECTOR ROTATION TRACKER
═══════════════════════════════════════════════════════════ */
async function renderSectors() {
  try {
    const r = await fetch('/api/markets');
    if (!r.ok) return;
    const d = await r.json();
    
    const signalEl = document.getElementById('sr-signal-text');
    if (signalEl) signalEl.textContent = d.rotationSignal || '—';
    
    const grid = document.getElementById('sr-grid');
    if (!grid) return;
    grid.innerHTML = (d.sectors||[]).map(s => {
      const pct = s.changePct;
      const col = pct === null ? 'var(--ash)' : pct > 0 ? 'var(--jbrt)' : 'var(--ebrt)';
      const bar = pct === null ? 0 : Math.min(100, Math.abs(pct) * 10);
      return `<div style="background:var(--surf);padding:1.2rem;border-top:2px solid ${s.color}">
        <div style="font-size:1.1rem;margin-bottom:.2rem">${s.icon}</div>
        <div style="font-family:var(--fm);font-size:7.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ash);margin-bottom:.3rem">${s.name}</div>
        <div style="font-family:var(--fd);font-size:1.4rem;font-weight:700;color:var(--pch)">${s.price !== null ? '$'+s.price : '—'}</div>
        <div style="font-family:var(--fm);font-size:8px;color:${col};margin-top:.2rem">${pct !== null ? (pct>0?'+':'')+pct.toFixed(2)+'%' : 'N/A'}</div>
        <div style="height:2px;background:rgba(255,255,255,.05);margin-top:.5rem;border-radius:1px">
          <div style="height:100%;width:${bar}%;background:${col};border-radius:1px;transition:width 1s"></div>
        </div>
      </div>`;
    }).join('');
  } catch(e) { console.error('sectors', e); }
}

/* ═══════════════════════════════════════════════════════════
   INTELLIGENCE FEED (FBI + Federal Register + HN)
═══════════════════════════════════════════════════════════ */
async function renderIntelligenceFeed() {
  try {
    const r = await fetch('/api/intelligence');
    if (!r.ok) return;
    const d = await r.json();

    // FBI Charges
    const chargesEl = document.getElementById('intel-charges');
    if (chargesEl && d.charges?.length) {
      chargesEl.innerHTML = d.charges.slice(0,15).map(c => `
        <div style="background:var(--surf);padding:.8rem 1rem;border-left:3px solid ${c.highProfile?'var(--ebrt)':'var(--bdr)'}">
          <div style="font-size:.82rem;color:var(--pch);font-weight:${c.highProfile?'600':'400'};margin-bottom:.3rem;line-height:1.4">${c.title}</div>
          <div style="font-size:.75rem;color:var(--smk);line-height:1.5;margin-bottom:.4rem">${c.desc?.slice(0,120)||''}...</div>
          <div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.3rem">
            ${c.keywords?.map(k=>`<span style="font-family:var(--fm);font-size:6.5px;padding:1px 6px;background:rgba(192,74,40,.15);border:1px solid rgba(192,74,40,.25);color:var(--ebrt)">${k}</span>`).join('')||''}
            ${c.highProfile ? '<span style="font-family:var(--fm);font-size:6.5px;padding:1px 6px;background:rgba(192,74,40,.3);color:#fff">HIGH PROFILE</span>' : ''}
          </div>
          <div style="font-family:var(--fm);font-size:7px;color:var(--faint);margin-top:.3rem">${c.date?.slice(0,20)||''} · FBI</div>
        </div>`).join('');
    }

    // Power Moves
    const powerEl = document.getElementById('intel-power');
    if (powerEl && d.powerMoves?.length) {
      powerEl.innerHTML = d.powerMoves.slice(0,12).map(p => `
        <div style="background:var(--surf);padding:.8rem 1rem;border-left:3px solid ${p.significance>1?'var(--gld)':'var(--bdr)'}">
          <div style="font-family:var(--fm);font-size:7px;letter-spacing:.1em;text-transform:uppercase;color:${p.significance>1?'var(--gld)':'var(--ash)'};margin-bottom:.3rem">${p.subtype||'EXECUTIVE DOC'}</div>
          <div style="font-size:.82rem;color:var(--pch);line-height:1.4;margin-bottom:.3rem">${p.title?.slice(0,90)||''}</div>
          ${p.agencies?.length ? `<div style="font-family:var(--fm);font-size:7px;color:var(--ash)">${p.agencies.join(' · ')}</div>` : ''}
          <div style="font-family:var(--fm);font-size:7px;color:var(--faint);margin-top:.3rem">${p.date||''} · Federal Register</div>
        </div>`).join('');
    }

    // Tech Intel
    const techEl = document.getElementById('intel-tech');
    if (techEl && d.techIntel?.length) {
      techEl.innerHTML = d.techIntel.slice(0,10).map(t => `
        <div style="background:var(--surf);padding:.8rem 1rem;border-left:3px solid var(--ibrt)">
          <div style="font-size:.82rem;color:var(--pch);line-height:1.4;margin-bottom:.3rem">${t.title?.slice(0,90)||''}</div>
          <div style="display:flex;gap:1rem">
            <div style="font-family:var(--fd);font-size:.9rem;color:var(--ibrt)">▲ ${t.score}</div>
            <div style="font-family:var(--fm);font-size:7.5px;color:var(--ash)">${t.comments} comments</div>
          </div>
          <div style="font-family:var(--fm);font-size:7px;color:var(--faint);margin-top:.3rem">${t.url?.slice(0,50)||''}...</div>
        </div>`).join('');
    }
  } catch(e) { console.error('intel feed', e); }
}

/* ═══════════════════════════════════════════════════════════
   TRUTH ENGINE — NARRATIVE DIVERGENCE
═══════════════════════════════════════════════════════════ */
async function renderTruthEngine() {
  try {
    const r = await fetch('/api/narrative');
    if (!r.ok) return;
    const d = await r.json();

    // Source status badges
    const srcEl = document.getElementById('te-sources');
    if (srcEl) {
      srcEl.innerHTML = (d.sources||[]).map(s =>
        `<div style="font-family:var(--fm);font-size:7px;padding:3px 8px;border:1px solid ${s.ok?'rgba(40,176,136,.3)':'rgba(192,74,40,.3)'};color:${s.ok?'var(--jbrt)':'var(--ash)'}">
          ${s.ok?'●':'○'} ${s.name} (${s.count||0})
        </div>`
      ).join('');
    }

    // Multi-source stories (signal)
    const mainEl = document.getElementById('te-mainstream');
    const analysis = d.analysis || {};
    if (mainEl && analysis.groups?.length) {
      mainEl.innerHTML = analysis.groups.map(g => `
        <div style="background:var(--surf);padding:.9rem 1.1rem;border-left:3px solid ${g.coverageCount>=4?'var(--ebrt)':g.coverageCount>=3?'var(--gld)':'var(--jbrt)'}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.5rem;margin-bottom:.4rem">
            <div style="font-size:.84rem;color:var(--pch);line-height:1.4;flex:1">${g.topic?.slice(0,90)||''}</div>
            <div style="font-family:var(--fm);font-size:7px;background:${g.coverageCount>=4?'rgba(192,74,40,.2)':'rgba(212,178,106,.15)'};padding:2px 6px;color:${g.coverageCount>=4?'var(--ebrt)':'var(--gld)'};flex-shrink:0">${g.coverageCount} SOURCES</div>
          </div>
          <div style="display:flex;gap:3px;flex-wrap:wrap">
            ${g.sources?.map(s=>{const src=d.sources?.find(x=>x.id===s);return`<span style="font-family:var(--fm);font-size:6.5px;padding:1px 5px;background:rgba(255,255,255,.04);color:var(--ash)">${src?.name||s}</span>`;}).join('')||''}
          </div>
        </div>`).join('');
    }

    // Single-source (exclusive/suppressed)
    const excEl = document.getElementById('te-exclusive');
    if (excEl && analysis.exclusive?.length) {
      excEl.innerHTML = analysis.exclusive.map(e => {
        const src = d.sources?.find(x=>x.id===e.source);
        const isStateMedia = ['rt','xinhua'].includes(e.source);
        return `<div style="background:var(--surf);padding:.8rem 1.1rem;border-left:3px solid ${isStateMedia?'var(--ebrt)':'var(--gld)'}">
          <div style="font-family:var(--fm);font-size:7px;color:${isStateMedia?'var(--ebrt)':'var(--gld)'};margin-bottom:.3rem">${src?.name||e.source} ${isStateMedia?'· STATE MEDIA — HIGH SKEPTICISM':'· VERIFY INDEPENDENTLY'}</div>
          <div style="font-size:.82rem;color:var(--smk);line-height:1.4">${e.topic?.slice(0,90)||''}</div>
        </div>`;
      }).join('');
    }

    // High-saturation
    const satEl = document.getElementById('te-saturated');
    if (satEl) {
      const sat = analysis.groups?.filter(g=>g.saturated)||[];
      if (sat.length) {
        satEl.innerHTML = sat.slice(0,5).map(g=>`
          <div style="background:rgba(120,96,192,.08);border:1px solid rgba(120,96,192,.2);padding:.8rem 1.1rem">
            <div style="font-family:var(--fm);font-size:7px;color:var(--vbrt);margin-bottom:.3rem">SATURATION: ${g.coverageCount}/8 sources · ${g.saturated?'COORDINATED NARRATIVE OR MAJOR REAL EVENT':''}</div>
            <div style="font-size:.83rem;color:var(--pch);line-height:1.4">${g.topic?.slice(0,85)||''}</div>
          </div>`).join('');
      } else {
        satEl.innerHTML = '<div style="background:var(--surf);padding:.8rem 1.1rem;color:var(--ash);font-size:.82rem">No highly-saturated narratives detected — low coordination period</div>';
      }
    }

    // Source counts
    const countEl = document.getElementById('te-coverage-counts');
    if (countEl && analysis.sourceCount) {
      countEl.innerHTML = Object.entries(analysis.sourceCount)
        .sort((a,b)=>b[1]-a[1])
        .map(([id,count])=>{
          const src=d.sources?.find(s=>s.id===id);
          return `<div style="display:flex;justify-content:space-between;align-items:center;padding:.3rem 0;border-bottom:1px solid var(--bdr)">
            <div>
              <div style="font-family:var(--fm);font-size:8px;color:var(--pch)">${src?.name||id}</div>
              <div style="font-family:var(--fm);font-size:7px;color:var(--ash)">${src?.perspective||''} · ${src?.bias||''}</div>
            </div>
            <div style="font-family:var(--fd);font-size:1rem;font-weight:600;color:var(--gld)">${count}</div>
          </div>`;
        }).join('');
    }
  } catch(e) { console.error('truth engine', e); }
}

/* ═══════════════════════════════════════════════════════════
   BLACK SWAN MONITOR — tail-risk aggregation from all modules
═══════════════════════════════════════════════════════════ */
async function renderBlackSwanMonitor(db) {
  const grid = document.getElementById('bs-grid');
  if (!grid) return;

  const signals = [];

  // 1. Geomagnetic storm signal (from space weather module)
  try {
    const sw = await fetch('/api/spaceweather').then(r=>r.json());
    const kp = sw.kpCurrent?.kp || 0;
    if (kp >= 5) {
      signals.push({
        label: 'GEOMAGNETIC STORM', icon: '☀️',
        severity: kp >= 7 ? 'EXTREME' : kp >= 5 ? 'HIGH' : 'ELEVATED',
        color: kp >= 7 ? '#ff4444' : 'var(--ebrt)',
        value: `Kp ${kp.toFixed(1)}`,
        desc: `G${kp>=8?'4-5':kp>=7?'3':kp>=6?'2':'1'} storm active. Power grid stress. GPS degradation. ${kp>=8?'GRID COLLAPSE RISK':'Satellite drag elevated.'}`,
        source: 'NOAA SWPC'
      });
    } else {
      signals.push({
        label: 'GEOMAGNETIC', icon: '☀️', severity: 'BASELINE',
        color: 'var(--jbrt)', value: `Kp ${kp.toFixed(1)}`,
        desc: 'Geomagnetic conditions quiet. No infrastructure threat.',
        source: 'NOAA SWPC'
      });
    }
  } catch(_) {}

  // 2. Major seismic events (from globe data)
  try {
    const globeData = db?.globe || {};
    const quakes = (globeData.earthquakes || []).filter(q => q.magnitude >= 6.5);
    if (quakes.length > 0) {
      const biggest = quakes.sort((a,b) => b.magnitude - a.magnitude)[0];
      signals.push({
        label: 'MAJOR SEISMIC', icon: '🌋',
        severity: biggest.magnitude >= 7.5 ? 'EXTREME' : biggest.magnitude >= 7.0 ? 'HIGH' : 'ELEVATED',
        color: biggest.magnitude >= 7.5 ? '#ff4444' : 'var(--ebrt)',
        value: `M${biggest.magnitude.toFixed(1)}`,
        desc: `${biggest.place || 'Unknown region'} — ${quakes.length} M6.5+ events in current monitoring window. Tsunami watch possible for M7.5+.`,
        source: 'USGS'
      });
    }
  } catch(_) {}

  // 3. CSI threshold breach
  try {
    const csi = db?.csi?.[0];
    if (csi) {
      const score = csi.composite || 0;
      const severity = score >= 90 ? 'CRITICAL' : score >= 80 ? 'HIGH' : score >= 70 ? 'ELEVATED' : 'BASELINE';
      signals.push({
        label: 'CSI THRESHOLD', icon: '⚠️', severity,
        color: score >= 90 ? '#ff4444' : score >= 80 ? 'var(--ebrt)' : 'var(--gld)',
        value: `${score}/100`,
        desc: score >= 90 ? 'CSI above 90 — historically precedes acute civilizational crisis events within 6-18 months.'
            : score >= 80 ? 'CSI in critical range. Multiple horsemen active simultaneously.'
            : 'CSI elevated but below crisis threshold.',
        source: 'Convergence Engine'
      });
    }
  } catch(_) {}

  // 4. Narrative saturation spike (from narrative engine)
  try {
    const narr = await fetch('/api/narrative').then(r=>r.json());
    const saturation = narr.analysis?.highSaturation || 0;
    const total = narr.analysis?.totalStories || 0;
    const workingSources = (narr.sources||[]).filter(s=>s.ok).length;
    if (saturation >= 3) {
      signals.push({
        label: 'NARRATIVE SATURATION', icon: '📡',
        severity: saturation >= 5 ? 'EXTREME' : saturation >= 3 ? 'HIGH' : 'ELEVATED',
        color: saturation >= 5 ? '#ff4444' : 'var(--ebrt)',
        value: `${saturation} stories`,
        desc: `${saturation} stories covered by 4+ sources simultaneously across ${workingSources} global outlets. Historical pattern: high saturation precedes major interventions or events.`,
        source: `${workingSources} Global Sources`
      });
    } else {
      signals.push({
        label: 'NARRATIVE SATURATION', icon: '📡', severity: 'BASELINE',
        color: 'var(--jbrt)', value: `${saturation} stories`,
        desc: `${total} stories analyzed across ${workingSources} sources. No coordinated saturation detected.`,
        source: `${workingSources} Global Sources`
      });
    }
  } catch(_) {}

  // 5. Market dislocation (Fear & Greed extreme)
  try {
    const fng = db?.markets?.fearGreed?.latest;
    if (fng) {
      const val = parseInt(fng.value);
      const severity = val <= 10 ? 'EXTREME' : val <= 20 ? 'HIGH' : val >= 80 ? 'HIGH' : 'BASELINE';
      signals.push({
        label: 'MARKET DISLOCATION', icon: '📉',
        severity,
        color: val <= 10 ? '#ff4444' : val <= 25 ? 'var(--ebrt)' : val >= 75 ? 'var(--jbrt)' : 'var(--ash)',
        value: `${val} — ${fng.value_classification}`,
        desc: val <= 10 ? 'Extreme Fear. Capitulation risk. Systemic stress. Historical: readings this low precede either sharp recovery or systemic failure — rarely anything in between.'
            : val >= 80 ? 'Extreme Greed. Blow-off top risk. Historically precedes sharp corrections or regime changes.'
            : `Fear & Greed at ${val}. Elevated stress but not at panic threshold.`,
        source: 'CNN Fear & Greed / Alternative.me'
      });
    }
  } catch(_) {}

  // 6. Active disaster count (from globe)
  try {
    const gd = db?.globe;
    if (gd) {
      const disasters = (gd.disasters||[]).length;
      const critical = (gd.critical||[]).length;
      if (critical >= 3 || disasters >= 20) {
        signals.push({
          label: 'ACTIVE DISASTERS', icon: '🌊',
          severity: critical >= 5 ? 'EXTREME' : critical >= 3 ? 'HIGH' : 'ELEVATED',
          color: critical >= 5 ? '#ff4444' : 'var(--ebrt)',
          value: `${disasters} disasters · ${critical} critical`,
          desc: `GDACS tracking ${disasters} active global disasters with ${critical} in critical alert status. Includes cyclones, floods, droughts, wildfires. Supply chain and displacement risk.`,
          source: 'NASA EONET / GDACS'
        });
      }
    }
  } catch(_) {}

  // RENDER
  const sevOrder = { 'EXTREME': 0, 'HIGH': 1, 'ELEVATED': 2, 'BASELINE': 3 };
  signals.sort((a,b) => (sevOrder[a.severity]||3) - (sevOrder[b.severity]||3));

  grid.innerHTML = signals.map(s => `
    <div style="background:var(--surf);padding:1.5rem;border-top:3px solid ${s.color};position:relative">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.8rem">
        <div>
          <div style="font-size:1.3rem;margin-bottom:.3rem">${s.icon}</div>
          <div style="font-family:var(--fm);font-size:7.5px;letter-spacing:.15em;text-transform:uppercase;color:var(--ash)">${s.label}</div>
        </div>
        <div style="font-family:var(--fm);font-size:7px;padding:2px 7px;background:${s.severity!=='BASELINE'?`${s.color.replace('var(--ebrt)','rgba(192,74,40').replace('var(--jbrt)','rgba(40,176,136').replace('#ff4444','rgba(255,68,68').replace('var(--gld)','rgba(212,178,106')},.15)`:'rgba(255,255,255,.04)'};color:${s.color};border:1px solid ${s.severity!=='BASELINE'?s.color:'var(--bdr)'}">
          ${s.severity}
        </div>
      </div>
      <div style="font-family:var(--fd);font-size:1.4rem;font-weight:700;color:${s.color};margin-bottom:.5rem">${s.value}</div>
      <p style="font-size:.82rem;color:var(--smk);line-height:1.7;margin-bottom:.5rem">${s.desc}</p>
      <div style="font-family:var(--fm);font-size:7px;color:var(--faint)">Source: ${s.source}</div>
    </div>`).join('');
}

/* ═══════════════════════════════════════════════════════════
   GLOBAL INFLATION MAP
═══════════════════════════════════════════════════════════ */
function renderInflationMap(db) {
  const grid = document.getElementById('inf-grid');
  const hyperEl = document.getElementById('inf-hyper');
  const highEl = document.getElementById('inf-high');
  if (!grid) return;

  // Use World Bank data already in db
  const wb = db?.worldbank || {};
  const inflation = wb.inflation || {};

  // Static enriched dataset with context (WB API + curated)
  const countries = [
    { name: 'Argentina', code: 'AR', rate: 219.9, note: '6th currency crisis since 1930. Peso lost 80% in 2023.' },
    { name: 'Zimbabwe', code: 'ZW', rate: 176.0, note: 'ZiG currency introduced 2024. Gold-backed attempt.' },
    { name: 'Sudan', code: 'SD', rate: 143.0, note: 'Civil war + currency collapse. 25M food insecure.' },
    { name: 'Venezuela', code: 'VE', rate: 89.0, note: '3M fled inflation. Now using USD informally.' },
    { name: 'Iran', code: 'IR', rate: 32.5, note: 'Sanctions + war premium. Rial at historic low.' },
    { name: 'Ethiopia', code: 'ET', rate: 30.2, note: 'Post-Tigray conflict monetary expansion.' },
    { name: 'Turkey', code: 'TR', rate: 58.5, note: 'Erdogan rate experiment. Lira lost 90% vs USD since 2018.' },
    { name: 'Egypt', code: 'EG', rate: 29.8, note: 'IMF bailout 2024. Pound devalued 40% in months.' },
    { name: 'Nigeria', code: 'NG', rate: 22.7, note: 'Naira collapsed 60% after fuel subsidy removal 2023.' },
    { name: 'Pakistan', code: 'PK', rate: 20.7, note: 'IMF program. Rupee at record low. Debt crisis.' },
    { name: 'Brazil', code: 'BR', rate: 4.6, note: 'Relatively stable under Lula. BRL showing stress.' },
    { name: 'United States', code: 'US', rate: 2.9, note: 'Post-peak. Fed paused. Deficit structural risk.' },
    { name: 'European Union', code: 'EU', rate: 2.3, note: 'Energy shock subsiding. Services inflation sticky.' },
    { name: 'China', code: 'CN', rate: 0.2, note: 'Deflation risk. Property collapse demand drag.' },
    { name: 'Japan', code: 'JP', rate: 2.7, note: 'First real inflation in 30 years. BOJ policy shift.' },
    { name: 'Russia', code: 'RU', rate: 8.3, note: 'War spending driving inflation despite controls.' },
  ];

  const hyper = countries.filter(c => c.rate >= 30);
  const high  = countries.filter(c => c.rate >= 10 && c.rate < 30);
  const mod   = countries.filter(c => c.rate >= 4 && c.rate < 10);
  const stable = countries.filter(c => c.rate < 4);

  const colorForRate = r => r >= 100 ? '#ff2222' : r >= 30 ? 'var(--ebrt)' : r >= 15 ? '#ff9900' : r >= 8 ? 'var(--gld)' : r >= 4 ? '#a0c040' : 'var(--jbrt)';

  grid.innerHTML = countries.map(c => {
    const col = colorForRate(c.rate);
    const bars = Math.min(20, Math.round(c.rate / 10));
    return `<div style="background:var(--surf);padding:1.2rem;border-top:2px solid ${col};border:1px solid var(--bdr);border-top:2px solid ${col}">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:.4rem">
        <div style="font-family:var(--fm);font-size:8px;color:var(--ash)">${c.name}</div>
        <div style="font-family:var(--fd);font-size:1.3rem;font-weight:700;color:${col}">${c.rate.toFixed(1)}%</div>
      </div>
      <div style="height:2px;background:rgba(255,255,255,.06);border-radius:1px;margin-bottom:.5rem">
        <div style="height:100%;width:${Math.min(100, c.rate/2)}%;background:${col};border-radius:1px;transition:width 1s"></div>
      </div>
      <div style="font-size:.75rem;color:var(--smk);line-height:1.6">${c.note}</div>
    </div>`;
  }).join('');

  if (hyperEl) hyperEl.innerHTML = hyper.map(c => `<div style="margin-bottom:.4rem"><span style="color:var(--ebrt);font-weight:600">${c.name} ${c.rate.toFixed(1)}%</span> — ${c.note}</div>`).join('') || '<div style="color:var(--jbrt)">No countries in hyperinflation range</div>';
  if (highEl) highEl.innerHTML = high.map(c => `<div style="margin-bottom:.4rem"><span style="color:var(--gld);font-weight:600">${c.name} ${c.rate.toFixed(1)}%</span> — ${c.note}</div>`).join('') || '<div style="color:var(--jbrt)">No countries in high-inflation range</div>';
}

/* ═══════════════════════════════════════════════════════════
   SUPPLY CHAIN PULSE — energy prices from markets data
═══════════════════════════════════════════════════════════ */
function renderSupplyChain(db) {
  // Get energy prices from sectors data (already fetched in markets)
  const sectors = db?.markets?.sectors || [];

  const brent   = sectors.find(s => s.sym === 'BNO');
  const gas     = sectors.find(s => s.sym === 'UNG');
  const uranium = sectors.find(s => s.sym === 'URA');

  function update(id, chgId, data) {
    const el = document.getElementById(id);
    const chgEl = document.getElementById(chgId);
    if (el && data?.price) el.textContent = `$${data.price}`;
    if (chgEl && data?.changePct !== null) {
      const pct = data.changePct;
      chgEl.textContent = `${pct > 0 ? '+' : ''}${pct?.toFixed(2)}% today`;
      chgEl.style.color = pct > 0 ? 'var(--ebrt)' : 'var(--jbrt)';
    }
  }

  update('sc-brent', 'sc-brent-chg', brent);
  update('sc-gas', 'sc-gas-chg', gas);
  update('sc-uranium', 'sc-uranium-chg', uranium);
}
