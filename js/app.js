/* ============================================================
   THE CONVERGENCE — APP v3
   Module loader, clock, nav, status bar
   ============================================================ */

/* ---------- LIVE CLOCK ---------- */
function startClock() {
  function update() {
    const now = new Date();
    const clock = document.getElementById('live-clock');
    if (!clock) return;
    const opts = { weekday:'short', year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit', timeZoneName:'short' };
    clock.textContent = now.toLocaleString('en-US', opts);
  }
  update();
  setInterval(update, 1000);
}

/* ---------- STATUS BAR ---------- */
function updateStatus(state, message, next) {
  const dot = document.getElementById('status-dot');
  const text = document.getElementById('status-text');
  const nextEl = document.getElementById('next-update');
  if (!dot || !text) return;
  dot.className = 'status-dot ' + state;
  text.textContent = message;
  if (nextEl && next) {
    const ms = new Date(next) - Date.now();
    const mins = Math.max(0, Math.round(ms / 60000));
    nextEl.textContent = `Next update: ${mins}m`;
  }
}

/* ---------- INTERSECTION OBSERVER ---------- */
function initObserver() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
    });
  }, { threshold: .01, rootMargin: '0px 0px -5% 0px' });
  document.querySelectorAll('.mod').forEach(m => io.observe(m));
}

// Force-reveal a section immediately (for anchor nav + direct URL load)
function revealSection(id) {
  const el = id ? document.getElementById(id) : null;
  if (!el) return;

  // 1. Make target visible immediately
  el.classList.add('visible');

  // 2. Mark all sections above target as visible too
  document.querySelectorAll('.mod, section').forEach(m => {
    if (m !== el && (m.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)) {
      m.classList.add('visible');
    }
  });

  // 3. Close any open dropdowns
  document.querySelectorAll('.nav-dropdown').forEach(d => {
    d.style.opacity = '0';
    d.style.pointerEvents = 'none';
    d.style.transform = 'translateY(-4px)';
  });

  // 4. Scroll to section — short delay lets CSS apply first
  setTimeout(() => {
    const navH = document.getElementById('nav')?.offsetHeight || 55;
    const top = el.getBoundingClientRect().top + window.scrollY - navH - 8;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }, 30);
}

/* ---------- PREDICTION BAR ANIMATIONS ---------- */
function animatePredBars() {
  const pio = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.querySelectorAll('.pred-bar-fill').forEach(b => {
          const w = b.dataset.w;
          b.style.width = '0%';
          requestAnimationFrame(() => setTimeout(() => b.style.width = w + '%', 50));
        });
        pio.unobserve(e.target);
      }
    });
  }, { threshold: .15 });
  document.querySelectorAll('.pred-item').forEach(el => pio.observe(el));
}

/* ---------- NAV ACTIVE ---------- */
function initNav() {
  const links = document.querySelectorAll('.nav-links a');
  const sections = document.querySelectorAll('.mod, #hero, section');

  // Active state via IntersectionObserver
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        links.forEach(l => {
          l.classList.toggle('active', l.getAttribute('href') === '#' + e.target.id);
        });
      }
    });
  }, { threshold: .1 });
  sections.forEach(s => io.observe(s));

  // On every nav link click: immediately reveal target section
  links.forEach(link => {
    link.addEventListener('click', () => {
      const hash = link.getAttribute('href');
      if (hash && hash.startsWith('#')) {
        revealSection(hash.slice(1));
      }
    });
  });

  // On direct URL load with hash — reveal that section immediately
  if (location.hash) {
    // Delay so DOM + CSS are fully painted before scrolling
    setTimeout(() => {
      revealSection(location.hash.slice(1));
    }, 350);
  }

  // Handle browser back/forward hash changes
  window.addEventListener('hashchange', () => {
    if (location.hash) revealSection(location.hash.slice(1));
  });
}

/* ---------- MAIN INIT ---------- */
async function initApp() {
  startClock();
  initObserver();
  initNav();

  // Status bar
  updateStatus('stale', 'Initializing data engine...', null);

  // Data engine events
  DataEngine.on('cached', db => {
    renderAll(db);
    if (db.lastUpdate) {
      const age = Math.round((Date.now() - new Date(db.lastUpdate)) / 60000);
      updateStatus('stale', `Cached data (${age}m old) — refreshing...`, db.nextUpdate);
    }
  });

  DataEngine.on('updating', () => {
    updateStatus('stale', 'Fetching live data...', null);
    const btn = document.getElementById('update-btn');
    if (btn) { btn.textContent = '↻ Updating...'; btn.classList.add('spinning'); }
  });

  DataEngine.on('updated', db => {
    renderAll(db);
    updateStatus('live', `Live · Updated ${new Date(db.lastUpdate).toLocaleTimeString()}`, db.nextUpdate);
    const btn = document.getElementById('update-btn');
    if (btn) { btn.textContent = '↻ Refresh'; btn.classList.remove('spinning'); }
    animatePredBars();
  });

  // Init data
  await DataEngine.init();

  // Manual refresh button (desktop + mobile)
  document.getElementById('update-btn')?.addEventListener('click', () => {
    DataEngine.forceUpdate();
  });
}

/* ---------- RENDER ALL MODULES ---------- */
function renderAll(db) {
  try { renderTicker(db); } catch(e) { console.error('ticker', e); }
  try { renderHeroStats(db); } catch(e) { console.error('heroStats', e); }
  try { renderLiveFeed(db); } catch(e) { console.error('feed', e); }
  try { renderCSI(db); } catch(e) { console.error('csi', e); }
  try { renderHorsemen(db); } catch(e) { console.error('horsemen', e); }
  try { renderProphecyMatcher(db); } catch(e) { console.error('matcher', e); }
  try { renderFinance(db); } catch(e) { console.error('finance', e); }
  try { renderWeather(db); } catch(e) { console.error('weather', e); }
  try { renderPredictions(db); } catch(e) { console.error('predictions', e); }
  try { renderHistoryLog(db); } catch(e) { console.error('history', e); }
  try { renderPatternEngine(db); } catch(e) { console.error('patterns', e); }
  try { renderDataTable(db); } catch(e) { console.error('datatable', e); }
  try { renderCharts(db); } catch(e) { console.error('charts', e); }
  try { initTippingSimulator(); } catch(e) { console.error('tipping', e); }
  try { initSurvivalProfile(); } catch(e) { console.error('survival', e); }
  try { initOracle(db); } catch(e) { console.error('oracle', e); }
  try { updateLastUpdated(db); } catch(e) {}
}

function updateLastUpdated(db) {
  document.querySelectorAll('.last-updated').forEach(el => {
    el.textContent = db.lastUpdate ? `Updated: ${new Date(db.lastUpdate).toLocaleTimeString()}` : 'Pending...';
  });
}

/* ---- TICKER ---- */
function renderTicker(db) {
  const el = document.getElementById('ticker-inner');
  if (!el || !db.news.length) return;
  const text = db.news.slice(0, 30).map(n => `  ◆  [${n.source}] ${n.title}`).join('');
  el.textContent = text + text;
  // Adjust animation speed
  const spd = Math.max(40, text.length / 20);
  el.style.animationDuration = spd + 's';
}

/* ---- HERO STATS ---- */
function renderHeroStats(db) {
  const csi = db.csi[0];
  if (csi) {
    const el = document.getElementById('hero-csi');
    if (el) el.textContent = csi.composite + '/100';
  }
  const wb = db.worldbank;
  if (wb.lifeExpectancy) {
    const el = document.getElementById('hero-life');
    if (el) el.textContent = DataEngine.getLatest(wb.lifeExpectancy)?.toFixed(1) + 'yr';
  }
}

window.addEventListener('DOMContentLoaded', initApp);

// Extend renderAll for new modules
const _baseRenderAll = renderAll;
window.renderAll = function(db) {
  _baseRenderAll(db);
  try { renderDeadReckoning(db); } catch(e) { console.error('deadreckoning', e); }
  try { renderSignalNoise(db); } catch(e) { console.error('signalnoise', e); }
  try { renderNarrativeLens(db); } catch(e) { console.error('narrative', e); }
};

// Save survival score to sessionStorage when calculated
const _baseSurv = window.calcSurvival;
window.calcSurvival = function() {
  if (_baseSurv) _baseSurv();
  const vals = [1,2,3,4,5,6].map(i => parseInt(document.getElementById('surv'+i)?.value || 1));
  const tot = vals.reduce((a,b) => a+b, 0);
  const pct = Math.round(tot/18*100);
  sessionStorage.setItem('convergence_surv_score', pct);
  // Re-render dead reckoning with updated score
  const db = DataEngine.getDB();
  try { renderDeadReckoning(db); } catch(e) {}
};

/* ============ GLOBE + MARKETS INIT ============ */

// Markets — fetch once on load, then every 20min with the main cycle
async function initMarkets() {
  try { await renderMarkets(); } catch(e) { console.error('Markets init:', e); }
}

// Globe — init after page loads, then update pins with data
function initGlobeWhenReady(db) {
  if (typeof Globe === 'undefined') {
    setTimeout(() => initGlobeWhenReady(db), 500);
    return;
  }
  initGlobe(db).catch(e => console.error('Globe init error:', e));
}

// Hook into main data cycle
DataEngine.on('updated', db => {
  // Globe — refresh live data + pins
  if (globeInitialized) refreshGlobeData(db).catch(() => {});
  else initGlobeWhenReady(db);
  // Markets refresh
  renderMarkets().catch(e => console.error('Markets update:', e));
});

DataEngine.on('cached', db => {
  initGlobeWhenReady(db);
});

// Initial markets load (independent of WB/news cycle)
setTimeout(initMarkets, 1500);

// Repeat markets every 5 minutes for price freshness
setInterval(() => { renderMarkets().catch(() => {}); }, 5 * 60 * 1000);

/* ============ YOUTUBE INIT ============ */
// Initialize YouTube section when it becomes visible
(function() {
  const ytSection = document.getElementById('livevideo');
  if (!ytSection) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        initYouTube();
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.05 });
  io.observe(ytSection);

  // Also init if direct URL hash
  if (location.hash === '#livevideo') {
    setTimeout(initYouTube, 500);
  }
})();

/* ─── HERO v2 LIVE UPDATES ─── */
function updateHeroStats(db) {
  const csi = db.csi?.[0];
  const wb  = db.worldbank || {};

  if (csi) {
    const score = csi.composite || 74;
    const el = document.getElementById('hero-csi');
    const bar = document.getElementById('hero-csi-bar');
    if (el) { el.textContent = score + '/100'; el.style.color = score >= 80 ? 'var(--ebrt)' : score >= 70 ? 'var(--gld)' : 'var(--jbrt)'; }
    if (bar) bar.style.width = score + '%';
  }

  const life = wb.lifeExpectancy ? Object.values(wb.lifeExpectancy).filter(Boolean).pop() : null;
  if (life) { const el = document.getElementById('hero-life'); if (el) el.textContent = life.toFixed(1) + 'yr'; }
}

DataEngine.on('updated', db => { updateHeroStats(db); });
DataEngine.on('cached',  db => { updateHeroStats(db); });

/* ─── NAV DROPDOWN keyboard support ─── */
document.querySelectorAll('.nav-group-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const group = btn.closest('.nav-group');
    const drop  = group?.querySelector('.nav-dropdown');
    if (!drop) return;
    const isOpen = drop.style.pointerEvents === 'all';
    // Close all
    document.querySelectorAll('.nav-dropdown').forEach(d => { d.style.opacity = '0'; d.style.pointerEvents = 'none'; });
    if (!isOpen) { drop.style.opacity = '1'; drop.style.pointerEvents = 'all'; drop.style.transform = 'translateY(0)'; }
  });
});
document.addEventListener('click', e => {
  if (!e.target.closest('.nav-group')) {
    document.querySelectorAll('.nav-dropdown').forEach(d => { d.style.opacity = ''; d.style.pointerEvents = ''; d.style.transform = ''; });
  }
});
