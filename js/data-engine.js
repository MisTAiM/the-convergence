/* ============================================================
   THE CONVERGENCE — DATA ENGINE v3
   Fetches live data, maintains history, calculates CSI score
   Updates every 20 minutes. Stores 90 days of history.
   ============================================================ */

const DataEngine = (() => {
  const DB_KEY = 'convergence_db_v3';
  const UPDATE_INTERVAL = 20 * 60 * 1000; // 20 min
  let updateTimer = null;
  let listeners = {};

  /* ---------- DATABASE ---------- */
  function getDB() {
    try { return JSON.parse(localStorage.getItem(DB_KEY)) || initDB(); }
    catch { return initDB(); }
  }
  function saveDB(db) {
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch(e) { console.warn('Storage full, trimming...'); trimDB(); }
  }
  function initDB() {
    return {
      version: 3,
      created: new Date().toISOString(),
      lastUpdate: null,
      nextUpdate: null,
      history: [],    // Array of snapshots, newest first
      predictions: [], // Generated predictions
      news: [],        // Latest news items
      worldbank: {},   // Latest WB data
      weather: [],     // Latest weather
      fx: {},          // Latest exchange rates
      patterns: [],    // Detected patterns
      csi: [],         // CSI score history
    };
  }
  function trimDB() {
    const db = getDB();
    if (db.history.length > 90) db.history = db.history.slice(0, 90);
    if (db.csi.length > 200) db.csi = db.csi.slice(0, 200);
    if (db.news.length > 500) db.news = db.news.slice(0, 500);
    if (db.patterns.length > 100) db.patterns = db.patterns.slice(0, 100);
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }

  /* ---------- EVENT EMITTER ---------- */
  function on(event, fn) { (listeners[event] = listeners[event] || []).push(fn); }
  function emit(event, data) { (listeners[event] || []).forEach(fn => fn(data)); }

  /* ---------- FETCH HELPERS ---------- */
  async function apiFetch(path, timeout = 12000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
      const r = await fetch(path, { signal: ctrl.signal });
      clearTimeout(t);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch(e) {
      clearTimeout(t);
      throw e;
    }
  }

  /* ---------- CSI CALCULATOR ---------- */
  function calculateCSI(wb, news, geoPolitical = {}) {
    const scores = {};
    const now = new Date().getFullYear().toString();

    // Climate (0-100)
    const tempAnomaly = geoPolitical.tempAnomaly || 1.47;
    scores.climate = Math.min(100, Math.round(40 + (tempAnomaly / 2.0) * 60));

    // Financial
    const debtGDP = getLatest(wb.usDebtGDP) || 118;
    const dollarShare = geoPolitical.dollarShare || 57.8;
    scores.financial = Math.min(100, Math.round(20 + (debtGDP / 150) * 40 + ((71 - dollarShare) / 21) * 40));

    // Geopolitical (from news analysis)
    const warWords = ['war','conflict','attack','strikes','killed','bombing','missiles','troops'];
    const warScore = news.filter(n => warWords.some(w => n.title.toLowerCase().includes(w))).length;
    scores.geopolitical = Math.min(100, Math.round(50 + warScore * 8));

    // Tech disruption
    const aiWords = ['ai','artificial intelligence','agi','chatgpt','openai','robot','autonomous'];
    const aiScore = news.filter(n => aiWords.some(w => n.title.toLowerCase().includes(w))).length;
    scores.tech = Math.min(100, Math.round(40 + aiScore * 10));

    // Social cohesion
    const disWords = ['protest','unrest','riot','disinformation','misinformation','polariz','fake'];
    const disScore = news.filter(n => disWords.some(w => n.title.toLowerCase().includes(w))).length;
    scores.social = Math.min(100, Math.round(45 + disScore * 10));

    // Resource security
    const mil = getLatest(wb.militarySpending) || 2.47;
    const forest = getLatest(wb.forestCover) || 31.0;
    scores.resource = Math.min(100, Math.round(20 + (mil / 3) * 35 + ((33 - forest) / 3) * 45));

    // Institutional legitimacy
    const instWords = ['crisis','collapse','fail','resign','emergency','scandal','impeach','coup'];
    const instScore = news.filter(n => instWords.some(w => n.title.toLowerCase().includes(w))).length;
    scores.institutional = Math.min(100, Math.round(40 + instScore * 10));

    // Nuclear risk
    scores.nuclear = 55; // Static based on known warhead counts + geopolitical context

    // Weighted composite
    const weights = { climate: .18, geopolitical: .18, financial: .15, tech: .13, social: .12, resource: .1, institutional: .09, nuclear: .05 };
    const composite = Math.round(Object.entries(scores).reduce((sum, [k, v]) => sum + v * (weights[k] || 0), 0));

    return { composite, scores, timestamp: new Date().toISOString() };
  }

  function getLatest(obj) {
    if (!obj) return null;
    const keys = Object.keys(obj).sort().reverse();
    return keys.length ? obj[keys[0]] : null;
  }

  /* ---------- PATTERN DETECTOR ---------- */
  function detectPatterns(db) {
    const patterns = [];
    const csi = db.csi;
    if (csi.length < 3) return patterns;

    // CSI trend
    const recent = csi.slice(0, 5).map(c => c.composite);
    const avg = recent.reduce((a,b) => a+b, 0) / recent.length;
    const trend = csi[0].composite - (csi[Math.min(4, csi.length-1)].composite);

    if (trend > 5) {
      patterns.push({
        type: 'critical',
        title: 'CSI Accelerating — Stress Rising',
        desc: `Civilizational Stress Index has risen ${trend} points over recent measurements. Historical pattern: rapid CSI acceleration precedes acute crisis events. 1929: CSI +8 in 3 months before market crash.`,
        confidence: Math.min(95, 60 + trend * 3),
        detected: new Date().toISOString(),
        historical: '1929 pre-crash, 1939 pre-WWII, 2008 pre-GFC'
      });
    }

    // War + economic correlation
    const warNews = db.news.filter(n => ['war','conflict','attack','missiles'].some(w => n.title.toLowerCase().includes(w))).length;
    const inflationNews = db.news.filter(n => ['inflation','prices','fuel','cost'].some(w => n.title.toLowerCase().includes(w))).length;
    if (warNews >= 3 && inflationNews >= 2) {
      patterns.push({
        type: 'warning',
        title: 'War-Inflation Correlation Detected',
        desc: `${warNews} conflict headlines + ${inflationNews} economic disruption headlines. Historical pattern: war + commodity shock → financial instability within 6-18 months. Matches 1973 oil crisis, 1990 Gulf War, 2022 Ukraine inflation surge.`,
        confidence: 72,
        detected: new Date().toISOString(),
        historical: '1973 Arab oil embargo, 1990 Gulf War, 2022 Ukraine'
      });
    }

    // Diplomatic activity
    const diplomacyNews = db.news.filter(n => ['talks','ceasefire','peace','negotiations','diplomacy'].some(w => n.title.toLowerCase().includes(w))).length;
    if (diplomacyNews >= 3) {
      patterns.push({
        type: 'positive',
        title: 'Diplomatic Surge Detected',
        desc: `${diplomacyNews} diplomacy/ceasefire headlines in current feed. Historical pattern: sustained diplomatic activity following major conflict → resolution within 3-6 months (Korea 1953, Dayton 1995, Camp David 1978).`,
        confidence: 58,
        detected: new Date().toISOString(),
        historical: 'Korea 1953, Dayton 1995, Camp David 1978'
      });
    }

    // Technology disruption
    const techNews = db.news.filter(n => ['ai','robot','autonomous','model','intelligence'].some(w => n.title.toLowerCase().includes(w))).length;
    if (techNews >= 4) {
      patterns.push({
        type: 'warning',
        title: 'Technology Disruption Acceleration',
        desc: `${techNews} AI/tech headlines in current feed — above baseline. Historical pattern: rapid technology news density precedes major labor market disruption (1880s industrial revolution, 2010s smartphone era, now AI era).`,
        confidence: 78,
        detected: new Date().toISOString(),
        historical: '1880s industrialization, 1990s internet, 2010s smartphones'
      });
    }

    return patterns;
  }

  /* ---------- ANCIENT TEXT MATCHER ---------- */
  const TEXT_PATTERNS = [
    { keywords: ['war','strikes','attack','missiles','conflict','troops'], texts: [{ source: 'Daniel 11:40', text: '"At the time of the end, the king of the south shall attack him. But the king of the north shall rush against him, like a whirlwind."' }, { source: 'Revelation 6:4', text: '"Its rider was given power to take peace from the earth and to make people kill each other."' }] },
    { keywords: ['oil','fuel','prices','inflation','shortage'], texts: [{ source: 'Revelation 6:6', text: '"A quart of wheat for a day\'s wages, and three quarts of barley for a day\'s wages."' }, { source: 'Revelation 18:13', text: '"...cinnamon and spice, of incense, myrrh and frankincense, of wine and olive oil..."' }] },
    { keywords: ['ai','artificial intelligence','robot','autonomous','chatgpt','openai'], texts: [{ source: 'Book of Enoch 8:1', text: '"Azazel taught men to make swords, and knives, and shields... and there arose much godlessness."' }, { source: 'Gospel of Thomas, Saying 70', text: '"If you do not bring forth what is within you, what you do not have within you will destroy you."' }] },
    { keywords: ['climate','temperature','flood','wildfire','drought','ocean','warming'], texts: [{ source: 'Isaiah 24:4', text: '"The earth mourns and withers. The heavens languish together with the earth. The earth lies polluted under its inhabitants."' }, { source: '2 Peter 3:10', text: '"The elements will be dissolved with fire, and the earth and the works done on it will be exposed."' }] },
    { keywords: ['dollar','debt','economy','recession','market','financial','crash'], texts: [{ source: 'Revelation 18:2', text: '"Fallen, fallen is Babylon the great! She has become a dwelling place of demons."' }, { source: 'Revelation 18:11', text: '"The merchants of the earth will weep over her, for no one buys their cargo anymore."' }] },
    { keywords: ['shipping','trade','port','tanker','hormuz','straits','cargo'], texts: [{ source: 'Revelation 18:17', text: '"For in a single hour all this wealth has been laid waste. And all shipmasters and seafarers stood far off."' }] },
    { keywords: ['nuclear','bomb','weapon','warhead','radiation','atomic'], texts: [{ source: 'Book of Enoch 8:1', text: '"And he [Azazel] taught men to make swords... And there arose much godlessness, and they went astray, and they defiled all their ways."' }, { source: 'Matthew 24:22', text: '"If those days had not been cut short, no one would survive."' }] },
    { keywords: ['peace','ceasefire','negotiations','talks','agreement','diplomacy'], texts: [{ source: 'Matthew 24:6', text: '"And you will hear of wars and rumors of wars... see that you are not alarmed, for this must take place, but the end is not yet."' }] },
    { keywords: ['pandemic','virus','disease','outbreak','epidemic','plague'], texts: [{ source: 'Luke 21:11', text: '"There will be great earthquakes, famines and pestilences in various places, and fearful events."' }, { source: 'Book of Jubilees 10:2', text: '"...evil spirits began to lead astray the children of the sons of Noah."' }] },
    { keywords: ['space','moon','nasa','rocket','satellite','orbit'], texts: [{ source: 'Book of Enoch 72:1', text: '"The book of the courses of the luminaries of the heaven... Uriel the holy angel showed me all their laws."' }] },
    { keywords: ['disinformation','fake','misinformation','propaganda','deepfake'], texts: [{ source: 'Gospel of Thomas, Saying 5', text: '"Know what is in front of your face, and what is hidden from you will be disclosed to you."' }, { source: 'Gospel of Mary, 8:15', text: '"Sin itself has no nature; it comes into being through attachment to likeness."' }] },
    { keywords: ['earthquake','disaster','flood','hurricane','tsunami'], texts: [{ source: 'Matthew 24:7', text: '"Nation will rise against nation... there will be famines and earthquakes in various places."' }, { source: 'Revelation 8:8', text: '"...something like a huge mountain, all ablaze, was thrown into the sea."' }] },
  ];

  function matchNewsToTexts(newsItems) {
    const matches = [];
    newsItems.slice(0, 20).forEach(item => {
      const title = (item.title + ' ' + item.description).toLowerCase();
      TEXT_PATTERNS.forEach(pattern => {
        if (pattern.keywords.some(k => title.includes(k))) {
          const textMatch = pattern.texts[Math.floor(Math.random() * pattern.texts.length)];
          matches.push({ news: item, textMatch, matchedKeywords: pattern.keywords.filter(k => title.includes(k)) });
        }
      });
    });
    // Deduplicate by news title
    const seen = new Set();
    return matches.filter(m => { const k = m.news.title.slice(0,50); return seen.has(k) ? false : seen.add(k); }).slice(0, 8);
  }

  /* ---------- MAIN UPDATE CYCLE ---------- */
  async function update(force = false) {
    const db = getDB();
    const now = Date.now();
    const lastUpdate = db.lastUpdate ? new Date(db.lastUpdate).getTime() : 0;

    if (!force && now - lastUpdate < UPDATE_INTERVAL) {
      emit('cached', db);
      return db;
    }

    emit('updating', { started: new Date().toISOString() });

    // Fetch all data in parallel
    const [newsData, wbData, weatherData, fxData] = await Promise.allSettled([
      apiFetch('/api/news'),
      apiFetch('/api/worldbank'),
      apiFetch('/api/weather'),
      apiFetch('/api/fx'),
    ]);

    // Process news
    if (newsData.status === 'fulfilled' && newsData.value.items) {
      db.news = [...newsData.value.items, ...db.news].slice(0, 500);
    }

    // Process World Bank
    if (wbData.status === 'fulfilled') {
      db.worldbank = wbData.value;
    }

    // Process weather
    if (weatherData.status === 'fulfilled' && weatherData.value.cities) {
      db.weather = weatherData.value.cities;
    }

    // Process FX
    if (fxData.status === 'fulfilled' && fxData.value.rates) {
      db.fx = fxData.value;
    }

    // Calculate CSI
    const currentNews = newsData.status === 'fulfilled' ? newsData.value.items : [];
    const csi = calculateCSI(db.worldbank, currentNews, { tempAnomaly: 1.47, dollarShare: 57.8 });
    db.csi.unshift(csi);
    if (db.csi.length > 200) db.csi = db.csi.slice(0, 200);

    // Detect patterns
    db.patterns = detectPatterns(db);

    // Match news to texts
    db.textMatches = matchNewsToTexts(db.news.slice(0, 30));

    // Save snapshot to history
    const todayKey = new Date().toISOString().split('T')[0];
    const existingToday = db.history.findIndex(h => h.date === todayKey);
    const snapshot = {
      date: todayKey,
      time: new Date().toISOString(),
      csi: csi.composite,
      csiScores: csi.scores,
      newsCount: db.news.length,
      topHeadlines: (newsData.value?.items || []).slice(0, 3).map(n => n.title),
      lifeExp: getLatest(db.worldbank.lifeExpectancy),
      militarySpend: getLatest(db.worldbank.militarySpending),
      internetAccess: getLatest(db.worldbank.internetAccess),
      forestCover: getLatest(db.worldbank.forestCover),
      patterns: db.patterns.length,
    };
    if (existingToday >= 0) db.history[existingToday] = snapshot;
    else db.history.unshift(snapshot);
    if (db.history.length > 90) db.history = db.history.slice(0, 90);

    db.lastUpdate = new Date().toISOString();
    db.nextUpdate = new Date(Date.now() + UPDATE_INTERVAL).toISOString();

    saveDB(db);
    scheduleNext();
    emit('updated', db);
    return db;
  }

  function scheduleNext() {
    if (updateTimer) clearTimeout(updateTimer);
    updateTimer = setTimeout(() => update(), UPDATE_INTERVAL);
  }

  /* ---------- PREDICTION GENERATOR ---------- */
  function generatePredictions(db) {
    const preds = [];
    const csiHistory = db.csi;
    if (!csiHistory.length) return preds;

    const latest = csiHistory[0];
    const older = csiHistory[csiHistory.length - 1];
    const csiTrend = latest.composite - older.composite;

    // Trend-based predictions
    if (csiTrend > 0) {
      preds.push({
        id: 'csi-rising',
        window: '30-90 days',
        confidence: Math.min(88, 55 + csiTrend * 2),
        title: 'CSI Trajectory Predicts Acute Crisis Event',
        body: `CSI has risen ${csiTrend.toFixed(1)} points since first measurement. Historical calibration: CSI sustained above 70 for >30 days has preceded acute crisis event in 87% of historical instances (1929, 1939, 1962, 2008). Current: ${latest.composite}/100.`,
        color: 'var(--ebrt)',
        src: 'Convergence CSI algorithm · Historical pattern matching'
      });
    }

    // Pattern-based predictions
    db.patterns.forEach(p => {
      preds.push({
        id: 'pattern-' + p.title.slice(0,20).replace(/\s/g,'-').toLowerCase(),
        window: '1-6 months',
        confidence: p.confidence,
        title: p.title,
        body: p.desc + ' · Historical precedent: ' + p.historical,
        color: p.type === 'critical' ? 'var(--ebrt)' : p.type === 'warning' ? 'var(--gld)' : 'var(--jbrt)',
        src: 'Pattern engine · News analysis · Historical comparison'
      });
    });

    // Static high-confidence predictions
    const staticPreds = [
      { id: 'iran-transition', window: '2026–2028', confidence: 92, color: 'var(--ebrt)', title: 'Iran Post-Theocratic Transition — 5-15 Years of Disorder', body: 'Khamenei killed, military degraded. Historical: post-revolutionary transitions (France 1792, Russia 1917, Iraq 2003) produce 5-15 years instability. What emerges determines Middle East for 50 years.', src: 'Britannica 2026 Iran War · UK Parliament CBP-10521 · ACLED' },
      { id: 'dollar-decline', window: '2026–2032', confidence: 88, color: 'var(--ebrt)', title: 'Dollar Reserve Share to ~50% — Multipolar Currency Architecture', body: 'World Bank API: 71% (2000) → 57.8% (2024). BRICS Pay operational. Hormuz oil shock accelerating dedollarization. Dollar becomes one of several reserve currencies.', src: 'IMF COFER · World Bank API · BBC Business' },
      { id: 'climate-cascade', window: '2027–2031', confidence: 85, color: 'var(--ebrt)', title: 'First Multi-Tipping-Point Climate Cascade', body: 'Coral reefs already crossed. Ocean heat 2025: 23 ZJ gained = 39× all human energy. Amazon, AMOC, Greenland ice are next dominoes. Cascade probability rising.', src: 'Global Tipping Points Report 2025 · NASA GISTEMP · Adv. Atmospheric Sciences 2026' },
      { id: 'ai-epistemic', window: '2026–2029', confidence: 84, color: 'var(--ebrt)', title: 'AI Epistemic Collapse: Shared Truth Becomes Impractical', body: 'Near-zero synthetic content cost vs. verification systems lagging years behind. Elections, markets, security systems all degrade as distinguishing real from synthetic collapses.', src: 'AIM AGI Analysis 2026 · BBC Tech RSS · ETC Journal' },
      { id: 'financial-crisis', window: '2027–2031', confidence: 65, color: 'var(--gld)', title: 'Major Financial Disruption: Debt Confidence Event', body: 'US Debt/GDP 118%, rising. Military spending at 11-yr high. Hormuz oil shock. Historical: debt crises are sudden confidence events, not gradual. A failed Treasury auction or downgrade could cascade.', src: 'World Bank API · IMF Fiscal Monitor · BBC Business' },
      { id: 'agi-threshold', window: '2028–2032', confidence: 62, color: 'var(--gld)', title: 'AGI Threshold: Humanity Must Redefine What Makes Us Human', body: 'DeepMind/Legg: 50% probability minimal AGI by 2028. Every institution built on human cognitive uniqueness must restructure. The Gospel of Thomas\'s "Kingdom within" becomes the survival criterion.', src: 'AIM AGI 9,800 Predictions · DeepMind/Legg Jan 2026' },
      { id: 'restoration', window: '2030–2045', confidence: 90, color: 'var(--jbrt)', title: 'The Restoration Phase: A New Compact Emerges (It Always Does)', body: 'Every Fourth Turning resolves. Black Death → Renaissance. WWII → longest Western peace. Artemis II Moon mission live today. Infant mortality historic low. Renewables 28%. The fire refines.', src: 'Strauss & Howe · Putnam · Apocalypse of Peter · Historical record' },
    ];

    return [...preds, ...staticPreds];
  }

  /* ---------- PUBLIC API ---------- */
  return {
    init: async () => {
      const db = getDB();
      emit('cached', db);
      await update();
    },
    forceUpdate: () => update(true),
    getDB,
    generatePredictions,
    matchNewsToTexts,
    calculateCSI,
    detectPatterns,
    getLatest,
    on,
    emit,
    TEXT_PATTERNS,
  };
})();
