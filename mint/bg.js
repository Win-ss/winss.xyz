// pixel mint patch: green bands, light shafts, wind gusts, tumbling leaves, menthol sparkles,
// mint sprigs along the bottom that bend with the wind and the cursor.
// Draws into <canvas id="bg"> at a low resolution and lets CSS scale it up pixelated.
(() => {
  const canvas = document.getElementById('bg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: false });

  const BANDS = ['#1d7556', '#186649', '#13573e', '#0e4833', '#0a3928', '#062a1d', '#031a12'];
  const LEAVES = [
    ['#1f9d6a', '#36c98c', '#7ff0bd', '#127048'], // shade, body, highlight, vein
    ['#2bb47c', '#4fdc9f', '#a6f7cf', '#178456'],
    ['#178a5b', '#28b07a', '#5fe0a8', '#0e5e3d'],
  ];
  const STEM = '#14774d';
  const SPARK = '#e3fff2';
  const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  const rand = (a, b) => a + Math.random() * (b - a);

  let PX = 3, W = 0, H = 0;
  let specks = [], leaves = [], sprigs = [], sparks = [], streaks = [], ground = [];
  let soil = null, veil = null;

  // wind: a soft breeze plus gusts that roll in every few seconds
  let wind = 0, gust = 0, gustTarget = 0, nextGust = 2500;

  // cursor in art pixels, with velocity so leaves get brushed aside
  const mouse = { x: -999, y: -999, vx: 0, vy: 0, t: 0 };
  addEventListener('pointermove', (e) => {
    const x = e.clientX / PX, y = e.clientY / PX;
    if (mouse.t) { mouse.vx = (x - mouse.x) * 0.6 + mouse.vx * 0.4; mouse.vy = (y - mouse.y) * 0.6 + mouse.vy * 0.4; }
    mouse.x = x; mouse.y = y; mouse.t = performance.now();
  }, { passive: true });
  addEventListener('pointerleave', () => { mouse.x = mouse.y = -999; });

  function artScale() {
    const dpr = window.devicePixelRatio || 1;
    return Math.max(2, Math.round(innerWidth * dpr / 560)) / dpr;
  }

  function resize() {
    PX = artScale();
    const nw = Math.ceil(innerWidth / PX), nh = Math.ceil(innerHeight / PX);
    if (nw === W && nh === H && soil) { buildVeil(); return; }
    W = canvas.width = nw;
    H = canvas.height = nh;
    specks = Array.from({ length: Math.round(W * H / 260) }, () => ({
      x: rand(0, W), y: rand(0, H), vx: rand(-0.5, 0.5), vy: rand(-1.5, -0.3), a: rand(0.15, 0.55),
    }));
    leaves = Array.from({ length: Math.min(48, Math.max(10, Math.round(W * H / 4800))) }, () => newLeaf(true));
    sparks = [];
    streaks = [];
    buildSoil();
    buildVeil();
  }

  // ---- leaf sprites, cached by size, angle and flip so each frame is just drawImage calls ----
  const ANGLES = 24, FLIPS = 4;
  const spriteCache = new Map();

  function leafSprite(len, ang, flip, pal) {
    const wid = len * 0.52;
    const ai = ((Math.round(ang / (Math.PI * 2) * ANGLES) % ANGLES) + ANGLES) % ANGLES;
    const fi = Math.min(FLIPS - 1, Math.round(Math.abs(flip) * (FLIPS - 1)));
    const back = flip < 0;
    const key = len + '|' + ai + '|' + fi + '|' + back + '|' + pal;
    let c = spriteCache.get(key);
    if (c) return c;
    const a = ai / ANGLES * Math.PI * 2;
    const w = Math.max(0.6, wid * (0.25 + 0.75 * fi / (FLIPS - 1)));
    const r = Math.ceil(len) + 2;
    c = document.createElement('canvas');
    c.width = c.height = r * 2 + 1;
    const g = c.getContext('2d');
    const col = LEAVES[pal];
    const cs = Math.cos(a), sn = Math.sin(a);
    for (let py = -r; py <= r; py++) {
      for (let px = -r; px <= r; px++) {
        const u = px * cs + py * sn, v = -px * sn + py * cs;
        if (u < -len || u > len) continue;
        const k = u / len;
        // rounded base, gently pointed tip, a little serration along the edge
        const half = w * (1 - k * k) * (k < 0 ? 1 : 0.85) + (Math.abs(Math.round(u)) % 2 ? 0.2 : 0);
        if (Math.abs(v) > half) continue;
        let fill;
        if (Math.abs(v) < 0.5 && u < len * 0.85 && fi > 1) fill = col[3];
        else if (back) fill = v > 0 ? col[0] : col[1];
        else fill = v < -half * 0.3 ? col[2] : v > half * 0.45 ? col[0] : col[1];
        g.fillStyle = fill;
        g.fillRect(px + r, py + r, 1, 1);
      }
    }
    c.r = r;
    spriteCache.set(key, c);
    return c;
  }

  function drawLeaf(cx, cy, ang, len, flip, pal, alpha) {
    const s = leafSprite(Math.max(2, Math.round(len)), ang, flip, pal);
    ctx.globalAlpha = alpha;
    ctx.drawImage(s, Math.round(cx) - s.r, Math.round(cy) - s.r);
    ctx.globalAlpha = 1;
  }

  // ---- scene pieces ----
  function buildSoil() {
    soil = document.createElement('canvas');
    soil.width = W; soil.height = H;
    const s = soil.getContext('2d');
    const p1 = rand(0, 6.3), p2 = rand(0, 6.3);
    for (let x = 0; x < W; x++) {
      ground[x] = Math.round(5 + Math.sin(x * 0.04 + p1) * 2 + Math.sin(x * 0.011 + p2) * 3);
      const g = ground[x];
      s.fillStyle = '#021009';
      s.fillRect(x, H - g, 1, g);
      s.fillStyle = '#0a3020';
      s.fillRect(x, H - g, 1, 1);
      if (g > 3 && (x * 7 + g) % 5 === 0) { s.fillStyle = '#06200f'; s.fillRect(x, H - g + 2, 1, 1); }
    }
    sprigs = [];
    const n = Math.max(6, Math.round(W / 40));
    for (let i = 0; i < n; i++) {
      const x = Math.round((i + rand(0.15, 0.85)) * W / n);
      sprigs.push({
        x, base: H - ground[x] + 1, h: Math.round(rand(22, 52)), ph: rand(0, 6.3),
        gap: 6 + Math.floor(rand(0, 2)), pal: Math.floor(rand(0, 3)), bend: 0, bendV: 0,
      });
    }
  }

  // darkens the middle so the page content reads cleanly over the scene
  function buildVeil() {
    veil = document.createElement('canvas');
    veil.width = W; veil.height = H;
    const v = veil.getContext('2d');
    v.fillStyle = '#010805';
    const wrap = document.querySelector('[data-veil]') || document.querySelector('.wrap');
    const rect = wrap ? wrap.getBoundingClientRect() : null;
    const half = rect ? rect.width / 2 + 24 : 260;
    const inner = Math.min(W * 0.45, half / PX);
    const outer = Math.min(W * 0.5, inner + 140 / PX);
    const cx = W / 2, cy = H / 2;
    for (let y = 0; y < H; y++) {
      const dy = Math.abs(y - cy) / (H * 0.64);
      for (let x = 0; x < W; x++) {
        const dx = Math.abs(x - cx);
        let k = dx <= inner ? 1 : Math.max(0, 1 - (dx - inner) / (outer - inner));
        k *= Math.max(0, 1 - dy * dy);
        if (BAYER[y & 3][x & 3] / 16 < Math.round(k * 5) / 5 * 0.74) v.fillRect(x, y, 1, 1);
      }
    }
  }

  function newLeaf(anywhere) {
    const big = Math.random() < 0.25;
    return {
      x: rand(-10, W + 10), y: anywhere ? rand(-10, H) : rand(-24, -6),
      vx: 0, vy: rand(3, 7),
      len: Math.round(big ? rand(6, 8) : rand(4, 5.5)),
      fall: rand(4, 9), ph: rand(0, 6.3),
      ang: rand(0, 6.3), spin: rand(-1.2, 1.2), flipPh: rand(0, 6.3), flipRate: rand(1.2, 3.2),
      pal: Math.floor(rand(0, 3)), a: rand(0.55, 0.95),
    };
  }

  function bands() {
    const bh = H / BANDS.length;
    for (let i = 0; i < BANDS.length; i++) {
      ctx.fillStyle = BANDS[i];
      ctx.fillRect(0, Math.floor(i * bh), W, Math.ceil(bh) + 1);
      if (i + 1 < BANDS.length) {
        ctx.fillStyle = BANDS[i + 1];
        const y = Math.floor((i + 1) * bh) - 1;
        for (let x = i & 1; x < W; x += 2) ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  function shafts(t) {
    for (let i = 0; i < 5; i++) {
      const base = (i / 5) * (W + H * 0.5) - H * 0.25;
      const x = base + Math.sin(t * 0.00012 + i * 1.9) * W * 0.05;
      const a = 0.035 + 0.03 * Math.sin(t * 0.0005 + i * 2.3);
      ctx.fillStyle = `rgba(150, 255, 205, ${Math.max(0, a)})`;
      const w = 5 + (i % 3) * 6;
      for (let y = 0; y < H * 0.8; y++) ctx.fillRect(Math.round(x - y * 0.3), y, w, 1);
    }
  }

  function updateWind(t, dt) {
    if (t > nextGust) {
      gustTarget = (Math.random() < 0.5 ? -1 : 1) * rand(10, 20);
      nextGust = t + rand(3500, 7000);
      setTimeout(() => { gustTarget = 0; }, rand(1400, 2600));
    }
    gust += (gustTarget - gust) * Math.min(1, dt * 1.6);
    wind = Math.sin(t * 0.0005) * 5 + Math.sin(t * 0.0017) * 2 + gust;
    // streaks of air while a gust is blowing
    if (Math.abs(gust) > 8 && Math.random() < Math.abs(gust) / 60) {
      streaks.push({ x: gust > 0 ? rand(-40, W * 0.6) : rand(W * 0.4, W + 40), y: rand(0, H * 0.85), len: rand(8, 22), life: 1 });
    }
  }

  function drawStreaks(dt) {
    ctx.fillStyle = 'rgba(200, 255, 230, 0.22)';
    for (let i = streaks.length - 1; i >= 0; i--) {
      const s = streaks[i];
      s.x += (wind * 3.2) * dt;
      s.life -= dt * 0.9;
      if (s.life <= 0) { streaks.splice(i, 1); continue; }
      ctx.globalAlpha = Math.min(1, s.life * 2) * 0.9;
      const dashes = Math.round(s.len);
      for (let d = 0; d < dashes; d += 3) ctx.fillRect(Math.round(s.x + d), Math.round(s.y), 2, 1);
    }
    ctx.globalAlpha = 1;
  }

  function drawSparks(dt) {
    if (sparks.length < W / 14 && Math.random() < 0.5) {
      sparks.push({ x: rand(0, W), y: rand(0, H * 0.9), life: 0, dur: rand(0.7, 1.6) });
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.life += dt / s.dur;
      s.x += wind * 0.3 * dt;
      if (s.life >= 1) { sparks.splice(i, 1); continue; }
      const k = Math.sin(s.life * Math.PI);
      const x = Math.round(s.x), y = Math.round(s.y);
      ctx.globalAlpha = k;
      ctx.fillStyle = SPARK;
      ctx.fillRect(x, y, 1, 1);
      if (k > 0.45) {
        ctx.globalAlpha = k * 0.6;
        ctx.fillRect(x - 1, y, 1, 1); ctx.fillRect(x + 1, y, 1, 1);
        ctx.fillRect(x, y - 1, 1, 1); ctx.fillRect(x, y + 1, 1, 1);
      }
      if (k > 0.85) {
        ctx.globalAlpha = 0.3;
        ctx.fillRect(x - 2, y, 1, 1); ctx.fillRect(x + 2, y, 1, 1);
        ctx.fillRect(x, y - 2, 1, 1); ctx.fillRect(x, y + 2, 1, 1);
      }
    }
    ctx.globalAlpha = 1;
  }

  function stepLeaves(t, dt) {
    const near = mouse.x > -500 && t - mouse.t < 400;
    for (let i = 0; i < leaves.length; i++) {
      const l = leaves[i];
      const flutter = Math.sin(t * 0.0013 + l.ph) * 6;
      const targetVx = wind * (0.8 + l.len * 0.08) + flutter;
      l.vx += (targetVx - l.vx) * Math.min(1, dt * 1.8);
      l.vy += (l.fall + Math.sin(t * 0.002 + l.ph) * 2 - l.vy) * Math.min(1, dt * 1.5);
      if (near) {
        const dx = l.x - mouse.x, dy = l.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 400) {
          const f = (1 - d2 / 400);
          l.vx += (mouse.vx * 22 + dx * 2) * f * dt * 6;
          l.vy += (mouse.vy * 22 + dy * 2) * f * dt * 6;
          l.spin += (Math.random() - 0.5) * f * 4 * dt;
        }
      }
      l.x += l.vx * dt;
      l.y += l.vy * dt;
      l.ang += (l.spin + l.vx * 0.04) * dt;
      const flip = Math.cos(t * 0.001 * l.flipRate + l.flipPh);
      drawLeaf(l.x, l.y, l.ang, l.len, flip, l.pal, l.a);
      if (l.y > H + 10 || l.x < -30 || l.x > W + 30) {
        leaves[i] = newLeaf(false);
        if (l.x < -30) leaves[i].x = W + rand(0, 10), leaves[i].y = rand(-10, H * 0.6);
        else if (l.x > W + 30) leaves[i].x = rand(-10, 0), leaves[i].y = rand(-10, H * 0.6);
      }
    }
    mouse.vx *= 0.85; mouse.vy *= 0.85;
  }

  // mint grows in opposite pairs up a square stem; the stem bends with wind and the cursor
  function drawSprigs(t, dt) {
    for (const sp of sprigs) {
      let push = wind * 0.26;
      if (mouse.x > -500) {
        const dx = sp.x - mouse.x, dy = (sp.base - sp.h / 2) - mouse.y;
        if (Math.abs(dx) < 16 && Math.abs(dy) < sp.h) push += Math.sign(dx || 1) * (16 - Math.abs(dx)) * 0.35 + mouse.vx * 0.6;
      }
      // spring toward the push so stems wobble back after a gust
      sp.bendV += ((push - sp.bend) * 18 - sp.bendV * 4) * dt;
      sp.bend += sp.bendV * dt;
      let x = sp.x;
      for (let j = 0; j < sp.h; j++) {
        const k = j / sp.h;
        const sway = (Math.sin(t * 0.0016 + sp.ph - j * 0.08) * 2.2 + sp.bend) * Math.pow(k, 1.6) * 2.4;
        x = sp.x + Math.round(sway);
        ctx.fillStyle = STEM;
        ctx.fillRect(x, sp.base - j, 1, 1);
        if (j > 3 && j % sp.gap === 0) {
          const size = 1 - k * 0.4;
          const flap = Math.sin(t * 0.003 + sp.ph + j) * 0.22 + sp.bend * 0.06;
          const len = Math.round(4.8 * size);
          drawLeaf(x - len - 0.5, sp.base - j - 1, Math.PI + 0.3 + flap, len, 1, sp.pal, 0.95);
          drawLeaf(x + len + 0.5, sp.base - j - 1, -0.3 + flap, len, 1, sp.pal, 0.95);
        }
      }
      drawLeaf(x - 2.4, sp.base - sp.h - 1, Math.PI + 1.1, 3, 1, sp.pal, 1);
      drawLeaf(x + 2.4, sp.base - sp.h - 1, -1.1, 3, 1, sp.pal, 1);
    }
  }

  let last = 0;
  function frame(t) {
    requestAnimationFrame(frame);
    if (t - last < 1000 / 30) return;
    const dt = Math.min(0.1, (t - last) / 1000);
    last = t;

    updateWind(t, dt);
    bands();
    shafts(t);

    ctx.fillStyle = '#8ff5c8';
    for (const p of specks) {
      p.x = (p.x + (p.vx + wind * 0.25) * dt + W) % W;
      p.y = (p.y + p.vy * dt + H) % H;
      ctx.globalAlpha = p.a * (0.6 + 0.4 * Math.sin(t * 0.003 + p.x));
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    }
    ctx.globalAlpha = 1;

    drawStreaks(dt);
    stepLeaves(t, dt);
    drawSparks(dt);
    drawSprigs(t, dt);
    if (soil) ctx.drawImage(soil, 0, 0);
    if (veil) ctx.drawImage(veil, 0, 0);
  }

  let rt = null;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 120); });
  resize();
  requestAnimationFrame(frame);
})();
