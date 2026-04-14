/**
 * THE CONVERGENCE — COSMIC INTELLIGENCE BACKGROUND
 * Custom canvas animation: dark space, particle network, event pulses, aurora
 * No external libraries. Pure canvas. ~60fps with RAF.
 * Colors: gold (#d4b26a), ember (#c04a28), teal (#28b088), ice (#4090d8), white
 */

(function() {
  'use strict';

  // Respect reduced motion
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.innerWidth < 768;

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.id = 'bg-canvas';
  canvas.style.cssText = `
    position: fixed; top: 0; left: 0;
    width: 100%; height: 100%;
    z-index: -1; pointer-events: none;
    opacity: 0; transition: opacity 2s ease;
  `;
  document.body.insertBefore(canvas, document.body.firstChild);

  const ctx = canvas.getContext('2d');
  let W, H, particles, animId, mouse = { x: -9999, y: -9999 };

  // Config
  const CFG = {
    count:      isMobile ? 80 : 160,
    maxDist:    isMobile ? 130 : 170,
    speed:      isMobile ? 0.22 : 0.28,
    mouseRange: 150,
    mouseForce: 0.014,
    pulseEvery: 180,   // frames between random pulses
    colors: [
      { r: 212, g: 178, b: 106, w: 40 },  // gold — dominant
      { r: 224, g: 96,  b: 64,  w: 20 },  // ember bright
      { r: 40,  g: 200, b: 160, w: 16 },  // teal bright
      { r: 80,  g: 160, b: 240, w: 14 },  // ice blue bright
      { r: 220, g: 210, b: 190, w: 20 },  // warm white
      { r: 255, g: 220, b: 140, w: 10 },  // bright gold highlight
    ],
    auroras: isMobile ? 3 : 6,
    starCount: isMobile ? 120 : 280,  // fixed stars in background
  };

  function pickColor() {
    const total = CFG.colors.reduce((s, c) => s + c.w, 0);
    let r = Math.random() * total;
    for (const c of CFG.colors) { r -= c.w; if (r <= 0) return c; }
    return CFG.colors[0];
  }

  class Particle {
    constructor() { this.reset(true); }
    reset(init = false) {
      this.x  = Math.random() * W;
      this.y  = init ? Math.random() * H : (Math.random() < 0.5 ? -2 : H + 2);
      const a = Math.random() * Math.PI * 2;
      const sp = CFG.speed * (0.3 + Math.random() * 0.7);
      this.vx = Math.cos(a) * sp;
      this.vy = Math.sin(a) * sp;
      const col = pickColor();
      this.r  = col.r; this.g = col.g; this.b = col.b;
      this.sz = 0.8 + Math.random() * 1.8;
      this.alpha = 0.5 + Math.random() * 0.5;
      this.twinkleSpeed = 0.01 + Math.random() * 0.02;
      this.twinklePhase = Math.random() * Math.PI * 2;
      this.life = 0;
      this.maxLife = 400 + Math.random() * 800;
    }
    update(frame) {
      this.life++;
      if (this.life > this.maxLife) { this.reset(); return; }

      // Gentle mouse attraction
      if (!isMobile) {
        const dx = mouse.x - this.x, dy = mouse.y - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < CFG.mouseRange && dist > 1) {
          this.vx += (dx / dist) * CFG.mouseForce;
          this.vy += (dy / dist) * CFG.mouseForce;
        }
      }

      // Speed cap
      const speed = Math.sqrt(this.vx*this.vx + this.vy*this.vy);
      if (speed > CFG.speed * 2.5) {
        this.vx *= CFG.speed * 2.5 / speed;
        this.vy *= CFG.speed * 2.5 / speed;
      }

      this.x += this.vx;
      this.y += this.vy;

      // Wrap
      if (this.x < -10) this.x = W + 10;
      if (this.x > W + 10) this.x = -10;
      if (this.y < -10) this.y = H + 10;
      if (this.y > H + 10) this.y = -10;

      // Twinkle
      this.twinklePhase += this.twinkleSpeed;
      this._alpha = this.alpha * (0.6 + 0.4 * Math.sin(this.twinklePhase));
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.sz, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.r},${this.g},${this.b},${this._alpha || this.alpha})`;
      ctx.fill();
    }
  }

  // Aurora bands — slow drifting gradient overlays
  class Aurora {
    constructor() { this.reset(); }
    reset() {
      this.x  = Math.random() * W;
      this.y  = H * (0.1 + Math.random() * 0.8);
      this.w  = W * (0.4 + Math.random() * 0.6);
      this.h  = H * (0.15 + Math.random() * 0.25);
      this.vx = (Math.random() - 0.5) * 0.18;
      this.vy = (Math.random() - 0.5) * 0.07;
      // Pick aurora color — boosted opacity
      const cols = [
        [192, 74, 40, 0.055],    // ember
        [212, 178, 106, 0.048],  // gold
        [40, 176, 136, 0.042],   // teal
        [64, 144, 216, 0.038],   // ice
        [180, 60, 180, 0.030],   // violet
      ];
      const c = cols[Math.floor(Math.random() * cols.length)];
      this.col = `rgba(${c[0]},${c[1]},${c[2]},${c[3]})`;
      this.phase = Math.random() * Math.PI * 2;
      this.phaseSpeed = 0.004 + Math.random() * 0.005;
    }
    update() {
      this.phase += this.phaseSpeed;
      this.x += this.vx + Math.sin(this.phase * 0.7) * 0.35;
      this.y += this.vy + Math.cos(this.phase * 0.5) * 0.18;
      if (this.x < -this.w) this.x = W + this.w;
      if (this.x > W + this.w) this.x = -this.w;
    }
    draw() {
      const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.w * 0.6);
      grad.addColorStop(0, this.col);
      grad.addColorStop(1, 'transparent');
      ctx.save();
      ctx.scale(1, this.h / this.w * 0.6);
      ctx.beginPath();
      ctx.ellipse(this.x, this.y / (this.h / this.w * 0.6), this.w * 0.6, this.w * 0.4, 0, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
    }
  }

  // Fixed star field — rendered once to offscreen canvas, drawn each frame
  class StarField {
    constructor() {
      this.offscreen = document.createElement('canvas');
      this.offscreen.width = 1;
      this.offscreen.height = 1;
      this.built = false;
    }
    build() {
      this.offscreen.width  = W;
      this.offscreen.height = H;
      const oc = this.offscreen.getContext('2d');
      oc.clearRect(0, 0, W, H);

      const n = CFG.starCount;
      for (let i = 0; i < n; i++) {
        const x = Math.random() * W;
        const y = Math.random() * H;
        const r = Math.random();
        // Three tiers: tiny dim, medium, rare bright
        let size, alpha, col;
        if (r < 0.65) {
          // Tiny background stars
          size  = 0.3 + Math.random() * 0.5;
          alpha = 0.2 + Math.random() * 0.35;
          col   = `rgba(200,190,170,${alpha.toFixed(2)})`;
        } else if (r < 0.90) {
          // Medium stars — gold/white tint
          size  = 0.6 + Math.random() * 0.7;
          alpha = 0.45 + Math.random() * 0.35;
          const g = Math.random() < 0.5;
          col = g ? `rgba(212,178,106,${alpha.toFixed(2)})` : `rgba(220,210,195,${alpha.toFixed(2)})`;
        } else {
          // Bright stars — cross-shaped glint
          size  = 1.0 + Math.random() * 1.2;
          alpha = 0.7 + Math.random() * 0.3;
          const hue = Math.random();
          if (hue < 0.4)      col = `rgba(212,178,106,${alpha.toFixed(2)})`;
          else if (hue < 0.65) col = `rgba(64,160,240,${alpha.toFixed(2)})`;
          else                 col = `rgba(255,220,180,${alpha.toFixed(2)})`;

          // Draw cross glint
          oc.strokeStyle = col;
          oc.lineWidth = 0.4;
          oc.globalAlpha = alpha * 0.6;
          oc.beginPath();
          oc.moveTo(x - size * 2.5, y); oc.lineTo(x + size * 2.5, y);
          oc.stroke();
          oc.beginPath();
          oc.moveTo(x, y - size * 2.5); oc.lineTo(x, y + size * 2.5);
          oc.stroke();
          oc.globalAlpha = 1;
        }

        oc.beginPath();
        oc.arc(x, y, size, 0, Math.PI * 2);
        oc.fillStyle = col;
        oc.fill();
      }
      this.built = true;
    }
    draw() {
      if (!this.built) this.build();
      ctx.drawImage(this.offscreen, 0, 0);
    }
    rebuild() { this.built = false; }
  }

  // Event pulse rings — expand from random particles
  const pulses = [];
  class Pulse {
    constructor(x, y, col) {
      this.x = x; this.y = y;
      this.r = 0; this.maxR = 80 + Math.random() * 60;
      this.col = col; this.alpha = 0.7;
    }
    update() {
      this.r += 1.2; this.alpha -= 0.012;
    }
    draw() {
      if (this.alpha <= 0) return;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.strokeStyle = this.col.replace(/[\d.]+\)$/, `${this.alpha.toFixed(3)})`);
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
    done() { return this.alpha <= 0; }
  }

  function drawConnections() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < CFG.maxDist) {
          const alpha = (1 - dist / CFG.maxDist) * 0.28;
          const r = Math.round((particles[i].r + particles[j].r) / 2);
          const g = Math.round((particles[i].g + particles[j].g) / 2);
          const b = Math.round((particles[i].b + particles[j].b) / 2);
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }
  }

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  let auroras = [];
  let starField;
  let frame   = 0;

  function init() {
    resize();
    particles = Array.from({ length: CFG.count }, () => new Particle());
    auroras   = Array.from({ length: CFG.auroras }, () => new Aurora());
    starField = new StarField();
  }

  function render() {
    animId = requestAnimationFrame(render);
    frame++;

    // Clear with slight trail for star-trail effect
    ctx.fillStyle = 'rgba(5,5,4,0.82)';
    ctx.fillRect(0, 0, W, H);

    // Fixed star field (rendered to offscreen, cheap to draw)
    starField.draw();

    // Auroras (background glow layers)
    if (!prefersReduced) {
      for (const a of auroras) { a.update(); a.draw(); }
    }

    // Connections
    if (!prefersReduced) drawConnections();

    // Particles
    for (const p of particles) { p.update(frame); p.draw(); }

    // Pulses
    if (!prefersReduced && frame % CFG.pulseEvery === 0 && particles.length > 0) {
      const p = particles[Math.floor(Math.random() * particles.length)];
      pulses.push(new Pulse(p.x, p.y, `rgba(${p.r},${p.g},${p.b},0.8)`));
    }
    for (let i = pulses.length - 1; i >= 0; i--) {
      pulses[i].update();
      pulses[i].draw();
      if (pulses[i].done()) pulses.splice(i, 1);
    }
  }

  // Mouse tracking
  document.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
  document.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });

  // Resize
  window.addEventListener('resize', () => {
    resize();
    if (starField) starField.rebuild();
  });

  // Pause when tab hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(animId);
    else render();
  });

  // Kick off
  init();
  render();
  setTimeout(() => { canvas.style.opacity = '1'; }, 300);
})();
