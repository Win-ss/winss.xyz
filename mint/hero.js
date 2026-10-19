// leaf bursts for the mint home page: the title sprays mint leaves when you hover or tap it,
// and window.mintFx.burst(x, y, n) lets other things puff a few out too.
(() => {
  const canvas = document.getElementById('fx');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const rand = (a, b) => a + Math.random() * (b - a);
  const PAL = [
    ['#1f9d6a', '#36c98c', '#8ff5c8', '#127048'],
    ['#2bb47c', '#55e2a5', '#c2fbe0', '#178456'],
    ['#178a5b', '#2fbf83', '#6ee7b7', '#0e5e3d'],
  ];

  let PX = 3, W = 0, H = 0, parts = [], running = false, last = 0;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    PX = Math.max(2, Math.round(innerWidth * dpr / 560)) / dpr;
    W = canvas.width = Math.ceil(innerWidth / PX);
    H = canvas.height = Math.ceil(innerHeight / PX);
  }

  function leaf(cx, cy, ang, len, flip, pal, alpha) {
    const col = PAL[pal];
    const wid = len * 0.52 * (0.3 + 0.7 * Math.abs(flip));
    const c = Math.cos(ang), s = Math.sin(ang), r = Math.ceil(len) + 1;
    ctx.globalAlpha = alpha;
    for (let py = -r; py <= r; py++) {
      for (let px = -r; px <= r; px++) {
        const u = px * c + py * s, v = -px * s + py * c;
        if (u < -len || u > len) continue;
        const k = u / len;
        const half = wid * (1 - k * k) * (k < 0 ? 1 : 0.85);
        if (Math.abs(v) > half) continue;
        ctx.fillStyle = Math.abs(v) < 0.5 && u < len * 0.85 && Math.abs(flip) > 0.4 ? col[3]
          : flip < 0 ? col[0] : v < -half * 0.3 ? col[2] : v > half * 0.45 ? col[0] : col[1];
        ctx.fillRect(Math.round(cx + px), Math.round(cy + py), 1, 1);
      }
    }
  }

  function spark(x, y, k) {
    ctx.globalAlpha = k;
    ctx.fillStyle = '#e3fff2';
    x = Math.round(x); y = Math.round(y);
    ctx.fillRect(x, y, 1, 1);
    if (k > 0.4) { ctx.fillRect(x - 1, y, 1, 1); ctx.fillRect(x + 1, y, 1, 1); ctx.fillRect(x, y - 1, 1, 1); ctx.fillRect(x, y + 1, 1, 1); }
  }

  // x, y in CSS pixels
  function burst(x, y, n, { spread = 1, up = 1, sparks = 0.3 } = {}) {
    const ax = x / PX, ay = y / PX;
    for (let i = 0; i < n; i++) {
      const isSpark = Math.random() < sparks;
      parts.push({
        spark: isSpark,
        x: ax + rand(-3, 3) * spread, y: ay + rand(-2, 2),
        vx: rand(-34, 34) * spread, vy: -rand(26, 62) * up,
        ang: rand(0, 6.3), spin: rand(-5, 5), len: Math.round(rand(3, 6)),
        flipPh: rand(0, 6.3), flipRate: rand(3, 7), pal: Math.floor(rand(0, 3)),
        life: 0, dur: isSpark ? rand(0.5, 0.9) : rand(1.4, 2.6),
      });
    }
    if (parts.length > 260) parts.splice(0, parts.length - 260);
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
  }

  function frame(t) {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    ctx.clearRect(0, 0, W, H);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life += dt / p.dur;
      if (p.life >= 1 || p.y > H + 10) { parts.splice(i, 1); continue; }
      if (p.spark) {
        p.x += p.vx * dt * 0.4; p.y += p.vy * dt * 0.4;
        spark(p.x, p.y, Math.sin(p.life * Math.PI));
        continue;
      }
      // leaves pop up, then drift down swaying like they're catching air
      p.vy += 70 * dt;
      p.vy = Math.min(p.vy, 22);
      p.vx += (Math.sin(t * 0.004 + p.flipPh) * 30 - p.vx) * dt * 1.4;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.ang += p.spin * dt;
      const fade = p.life > 0.7 ? (1 - p.life) / 0.3 : Math.min(1, p.life * 8);
      leaf(p.x, p.y, p.ang, p.len, Math.cos(t * 0.001 * p.flipRate + p.flipPh), p.pal, fade);
    }
    ctx.globalAlpha = 1;
    if (parts.length) requestAnimationFrame(frame);
    else running = false;
  }

  addEventListener('resize', resize);
  resize();
  window.mintFx = { burst };

  // ---- title ----
  const title = document.getElementById('title');
  if (!title) return;
  const letters = [...title.querySelectorAll('span')];
  const topOf = (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height * 0.18]; };

  function pop(el) {
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
  }

  letters.forEach((el) => {
    el.addEventListener('pointerenter', () => {
      pop(el);
      const [x, y] = topOf(el);
      burst(x, y, 7, { spread: 0.8 });
    });
    el.addEventListener('animationend', () => el.classList.remove('pop'));
  });

  // while hovered, the title keeps sprouting a leaf or two
  let spray = null;
  title.addEventListener('pointerenter', () => {
    title.classList.add('live');
    clearInterval(spray);
    spray = setInterval(() => {
      const [x, y] = topOf(letters[Math.floor(Math.random() * letters.length)]);
      burst(x, y, 2, { spread: 0.6, up: 0.8, sparks: 0.4 });
    }, 120);
  });
  title.addEventListener('pointerleave', () => { title.classList.remove('live'); clearInterval(spray); });

  // a tap or click throws a big handful
  title.addEventListener('click', () => {
    letters.forEach((el, i) => setTimeout(() => {
      pop(el);
      const [x, y] = topOf(el);
      burst(x, y, 12, { spread: 1.2, up: 1.2 });
    }, i * 70));
  });

  // and one small hello when the page opens
  setTimeout(() => letters.forEach((el, i) => setTimeout(() => {
    pop(el);
    const [x, y] = topOf(el);
    burst(x, y, 4, { spread: 0.7, up: 0.9 });
  }, i * 110)), 450);
})();
