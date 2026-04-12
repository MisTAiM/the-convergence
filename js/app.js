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
  }, { threshold: .05 });
  document.querySelectorAll('.mod').forEach(m => io.observe(m));
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
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        links.forEach(l => {
          l.classList.toggle('active', l.getAttribute('href') === '#' + e.target.id);
        });
      }
    });
  }, { threshold: .3 });
  sections.forEach(s => io.observe(s));
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
