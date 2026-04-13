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
    z-index: 0; pointer-events: none;
    opacity: 0; transition: opacity 1.8s ease;
  `;
  document.body.insertBefore(canvas, document.body.firstChild);

  const ctx = canvas.getContext('2d');
  let W, H, particles, animId, mouse = { x: -9999, y: -9999 };

  // Config
  const CFG = {
    count:      isMobile ? 55 : 110,
    maxDist:    isMobile ? 120 : 160,
    speed:      isMobile ? 0.18 : 0.22,
    mouseRange: 140,
    mouseForce: 0.012,
    pulseEvery: 220,   // frames between random pulses
    colors: [
      { r: 212, g: 178, b: 106, w: 40 },  // gold — dominant
      { r: 192, g: 74,  b: 40,  w: 18 },  // ember
      { r: 40,  g: 176, b: 136, w: 14 },  // teal
      { r: 64,  g: 144, b: 216, w: 12 },  // ice blue
      { r: 200, g: 190, b: 170, w: 16 },  // dim white
    ],
    auroras: isMobile ? 2 : 4,
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
      this.sz = 0.5 + Math.random() * 1.4;
      this.alpha = 0.3 + Math.random() * 0.65;
      this.twinkleSpeed = 0.008 + Math.random() * 0.018;
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
      this.vx = (Math.random() - 0.5) * 0.15;
      this.vy = (Math.random() - 0.5) * 0.06;
      // Pick aurora color
      const cols = [
        [192, 74, 40, 0.025],    // ember
        [212, 178, 106, 0.02],   // gold
        [40, 176, 136, 0.018],   // teal
        [64, 144, 216, 0.015],   // ice
      ];
      const c = cols[Math.floor(Math.random() * cols.length)];
      this.col = `rgba(${c[0]},${c[1]},${c[2]},${c[3]})`;
      this.phase = Math.random() * Math.PI * 2;
      this.phaseSpeed = 0.003 + Math.random() * 0.004;
    }
    update() {
      this.phase += this.phaseSpeed;
      this.x += this.vx + Math.sin(this.phase * 0.7) * 0.3;
      this.y += this.vy + Math.cos(this.phase * 0.5) * 0.15;
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
          const alpha = (1 - dist / CFG.maxDist) * 0.18;
          // Blend the two particle colors
          const r = Math.round((particles[i].r + particles[j].r) / 2);
          const g = Math.round((particles[i].g + particles[j].g) / 2);
          const b = Math.round((particles[i].b + particles[j].b) / 2);
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
          ctx.lineWidth = 0.5;
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
  let frame   = 0;

  function init() {
    resize();
    particles = Array.from({ length: CFG.count }, () => new Particle());
    auroras   = Array.from({ length: CFG.auroras }, () => new Aurora());
  }

  function render() {
    animId = requestAnimationFrame(render);
    frame++;

    // Clear with slight trail for star-trail effect
    ctx.fillStyle = 'rgba(5,5,4,0.88)';
    ctx.fillRect(0, 0, W, H);

    // Auroras first (background)
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
      pulses.push(new Pulse(p.x, p.y, `rgba(${p.r},${p.g},${p.b},0.7)`));
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
  window.addEventListener('resize', () => { resize(); });

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
