// Procedural textures + noise helpers. Everything in the game is generated here – no image files.
import * as THREE from 'three';

export const sm = (a, b, x) => { let t = (x - a) / (b - a); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash(ix, iy, s = 0) {
  let h = Math.imul(ix | 0, 374761393) ^ Math.imul(iy | 0, 668265263) ^ Math.imul((s | 0) + 1, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function vnoise(x, y, s = 0) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy, s), b = hash(ix + 1, iy, s), c = hash(ix, iy + 1, s), d = hash(ix + 1, iy + 1, s);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

export function fbm(x, y, oct = 4, s = 0) {
  let a = 0.5, f = 1, sum = 0, norm = 0;
  for (let i = 0; i < oct; i++) { sum += a * vnoise(x * f, y * f, s + i * 17); norm += a; a *= 0.5; f *= 2.03; }
  return sum / norm;
}

// ---- tileable noise (for textures) ----
function tnoise(x, y, px, py, s) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const x0 = ((ix % px) + px) % px, x1 = (x0 + 1) % px;
  const y0 = ((iy % py) + py) % py, y1 = (y0 + 1) % py;
  const a = hash(x0, y0, s), b = hash(x1, y0, s), c = hash(x0, y1, s), d = hash(x1, y1, s);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function tfbm(u, v, fx, fy, oct, s) {
  let a = 0.5, sum = 0, norm = 0;
  for (let i = 0; i < oct; i++) { sum += a * tnoise(u * fx, v * fy, fx, fy, s + i * 31); norm += a; a *= 0.5; fx *= 2; fy *= 2; }
  return sum / norm;
}

function finish(t, srgb, aniso = 8) {
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = aniso;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

function normalFromHeight(h, w, hh, strength) {
  const c = document.createElement('canvas'); c.width = w; c.height = hh;
  const ctx = c.getContext('2d'); const img = ctx.createImageData(w, hh); const d = img.data;
  for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) {
    const xl = (x + w - 1) % w, xr = (x + 1) % w, yu = (y + hh - 1) % hh, yd = (y + 1) % hh;
    const dx = (h[y * w + xr] - h[y * w + xl]) * strength;
    const dy = (h[yd * w + x] - h[yu * w + x]) * strength;
    const l = 1 / Math.sqrt(dx * dx + dy * dy + 1);
    const i = (y * w + x) * 4;
    d[i] = (-dx * l * 0.5 + 0.5) * 255; d[i + 1] = (dy * l * 0.5 + 0.5) * 255; d[i + 2] = (l * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return finish(new THREE.CanvasTexture(c), false);
}

// fn(u, v, out) -> out = [r,g,b,height] in display (sRGB) space
function build(size, fn, normalStrength = 3) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d'); const img = ctx.createImageData(size, size); const d = img.data;
  const h = new Float32Array(size * size); const o = [0, 0, 0, 0];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    fn(x / size, y / size, o);
    const i = y * size + x;
    d[i * 4] = o[0] * 255; d[i * 4 + 1] = o[1] * 255; d[i * 4 + 2] = o[2] * 255; d[i * 4 + 3] = 255;
    h[i] = o[3];
  }
  ctx.putImageData(img, 0, 0);
  return { map: finish(new THREE.CanvasTexture(c), true), normalMap: normalFromHeight(h, size, size, normalStrength * size / 512) };
}

// canvas with transparency -> DataTexture whose transparent texels keep a foliage colour (no dark fringes in mips)
function alphaTex(c, fill) {
  const ctx = c.getContext('2d'); const img = ctx.getImageData(0, 0, c.width, c.height); const p = img.data;
  for (let i = 0; i < p.length; i += 4) if (p[i + 3] < 8) { p[i] = fill[0]; p[i + 1] = fill[1]; p[i + 2] = fill[2]; p[i + 3] = 0; }
  const t = new THREE.DataTexture(new Uint8Array(p.buffer.slice(0)), c.width, c.height, THREE.RGBAFormat);
  return finish(t, true, 4);
}

function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

function leaf(ctx, x, y, len, wid, ang, col, rib) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.45, -wid, len, 0); ctx.quadraticCurveTo(len * 0.45, wid, 0, 0);
  ctx.fillStyle = col; ctx.fill();
  ctx.strokeStyle = rib; ctx.lineWidth = Math.max(1, wid * 0.08); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len * 0.94, 0); ctx.stroke();
  ctx.restore();
}

function paw(ctx, x, y, s, col) {
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.ellipse(x, y + s * 0.25, s * 0.52, s * 0.42, 0, 0, 7); ctx.fill();
  const toes = [[-0.55, -0.28, -0.35], [-0.2, -0.62, -0.1], [0.2, -0.62, 0.1], [0.55, -0.28, 0.35]];
  for (const [tx, ty, r] of toes) { ctx.beginPath(); ctx.ellipse(x + tx * s, y + ty * s, s * 0.17, s * 0.24, r, 0, 7); ctx.fill(); }
}
function boneShape(ctx, x, y, len, th, col, ang = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.fillStyle = col;
  ctx.fillRect(-len / 2, -th / 2, len, th);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * len / 2, sy * th * 0.62, th * 0.78, 0, 7); ctx.fill(); }
  ctx.restore();
}
function fret(ctx, x, y, s, col) {
  ctx.strokeStyle = col; ctx.lineWidth = s * 0.14; ctx.lineJoin = 'miter';
  ctx.beginPath();
  ctx.moveTo(x, y + s); ctx.lineTo(x, y); ctx.lineTo(x + s, y); ctx.lineTo(x + s, y + s * 0.75);
  ctx.lineTo(x + s * 0.3, y + s * 0.75); ctx.lineTo(x + s * 0.3, y + s * 0.35); ctx.lineTo(x + s * 0.7, y + s * 0.35);
  ctx.stroke();
}

// carved stone: draw() paints a grey height image (128 = surface, darker = groove, lighter = raised)
function carve(w, h, draw, strength, seed) {
  const c = mkCanvas(w, h); const ctx = c.getContext('2d');
  ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, w, h); draw(ctx);
  const b = mkCanvas(w, h); const bctx = b.getContext('2d'); bctx.filter = 'blur(1.6px)'; bctx.drawImage(c, 0, 0);
  const src = bctx.getImageData(0, 0, w, h).data;
  const hgt = new Float32Array(w * h);
  const out = mkCanvas(w, h); const octx = out.getContext('2d'); const img = octx.createImageData(w, h); const d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; const u = x / w, v = y / h;
    const hv = src[i * 4] / 255;
    const n = tfbm(u, v, 5, Math.max(2, Math.round(5 * h / w)), 5, seed), fine = tfbm(u, v, 48, Math.round(48 * h / w), 2, seed + 1);
    const groove = sm(0.47, 0.22, hv), raised = sm(0.52, 0.8, hv);
    let k = (0.62 + 0.5 * n) * (0.8 + 0.4 * fine) * (1 - groove * 0.5) * (1 + raised * 0.14);
    let r = 0.56 * k, g = 0.52 * k, bl = 0.44 * k;
    const moss = (groove * 0.8 + 0.12) * sm(0.42, 0.66, tfbm(u, v, 4, Math.max(2, Math.round(4 * h / w)), 3, seed + 2));
    r = lerp(r, 0.2, moss * 0.75); g = lerp(g, 0.3, moss * 0.75); bl = lerp(bl, 0.1, moss * 0.75);
    d[i * 4] = r * 255; d[i * 4 + 1] = g * 255; d[i * 4 + 2] = bl * 255; d[i * 4 + 3] = 255;
    hgt[i] = hv + n * 0.07 + fine * 0.03;
  }
  octx.putImageData(img, 0, 0);
  const map = finish(new THREE.CanvasTexture(out), true); const normalMap = normalFromHeight(hgt, w, h, strength);
  return { map, normalMap };
}

export function createTextures() {
  const T = {};

  T.rock = build(512, (u, v, o) => {
    const n = tfbm(u, v, 4, 4, 6, 1);
    const r = 1 - Math.abs(tfbm(u, v, 6, 6, 5, 2) * 2 - 1);
    const c = Math.abs(tfbm(u, v, 5, 5, 4, 3) - 0.5);
    const crack = 1 - sm(0.0, 0.035, c);
    const fine = tfbm(u, v, 48, 48, 3, 4);
    const warm = tfbm(u, v, 3, 3, 3, 5);
    let R = lerp(0.3, 0.6, n) + (warm - 0.5) * 0.12, G = lerp(0.28, 0.54, n), B = lerp(0.25, 0.46, n) - (warm - 0.5) * 0.08;
    const sh = (0.72 + 0.56 * fine) * (1 - crack * 0.3) * (0.8 + 0.3 * r);
    o[0] = R * sh; o[1] = G * sh; o[2] = B * sh; o[3] = n * 0.5 + r * 0.32 + fine * 0.18 - crack * 0.22;
  }, 4.5);

  T.ground = build(512, (u, v, o) => {
    const n = tfbm(u, v, 5, 5, 5, 11), f = tfbm(u, v, 40, 40, 3, 12), m = tfbm(u, v, 7, 7, 4, 13);
    const moss = sm(0.44, 0.62, m), k = 0.55 + 0.9 * f;
    let R = lerp(0.27, 0.2, moss) * k, G = lerp(0.19, 0.31, moss) * k, B = lerp(0.11, 0.08, moss) * k;
    const sp = tnoise(u * 110, v * 110, 110, 110, 14);
    if (sp > 0.84) { const q = (sp - 0.84) * 6; R = lerp(R, 0.46, q); G = lerp(G, 0.33, q); B = lerp(B, 0.13, q); }
    o[0] = R; o[1] = G; o[2] = B; o[3] = n * 0.45 + f * 0.55;
  }, 3);

  T.moss = build(256, (u, v, o) => {
    const n = tfbm(u, v, 6, 6, 5, 21), f = tfbm(u, v, 36, 36, 3, 22);
    const k = 0.6 + 0.8 * f;
    o[0] = lerp(0.12, 0.34, n) * k; o[1] = lerp(0.23, 0.45, n) * k; o[2] = lerp(0.04, 0.1, n) * k; o[3] = n * 0.4 + f * 0.6;
  }, 3);

  T.blocks = build(512, (u, v, o) => {
    const ry = v * 8, row = Math.floor(ry), fy = ry - row;
    const rx = u * 4 + (row % 2) * 0.5, col = Math.floor(rx), fx = rx - col;
    const e = Math.min(Math.min(fx, 1 - fx) * 2, Math.min(fy, 1 - fy));
    const bevel = sm(0.0, 0.085, e);
    const id = hash(((col % 4) + 4) % 4, row, 31), id2 = hash(((col % 4) + 4) % 4, row, 37);
    const n = tfbm(u, v, 8, 8, 5, 32), fine = tfbm(u, v, 64, 64, 2, 33), mn = tfbm(u, v, 5, 5, 3, 34);
    const streak = tfbm(u, v, 24, 3, 3, 35);
    let k = (0.8 + 0.3 * id) * (0.68 + 0.5 * n) * (0.5 + 0.5 * bevel) * (0.85 + 0.3 * fine) * (0.82 + 0.3 * streak);
    let R = lerp(0.56, 0.47, id2) * k, G = lerp(0.52, 0.45, id2) * k, B = lerp(0.43, 0.41, id2) * k;
    const moss = clamp((1 - bevel) * sm(0.38, 0.6, mn) + sm(0.6, 0.76, n) * 0.7, 0, 1) * 0.85;
    R = lerp(R, 0.19 * (0.6 + 0.8 * fine), moss); G = lerp(G, 0.3 * (0.6 + 0.8 * fine), moss); B = lerp(B, 0.08, moss);
    o[0] = R; o[1] = G; o[2] = B; o[3] = bevel * 0.75 + n * 0.17 + fine * 0.08;
  }, 5);

  T.wood = build(256, (u, v, o) => {
    const g = tfbm(u, v, 3, 40, 4, 41), f = tfbm(u, v, 30, 90, 2, 42), w = tfbm(u, v, 3, 3, 3, 43);
    const dark = sm(0.56, 0.7, tfbm(u, v, 2, 26, 3, 44));
    let R = lerp(0.24, 0.5, g), G = lerp(0.16, 0.37, g), B = lerp(0.09, 0.22, g);
    R = lerp(R, 0.42, w * 0.5); G = lerp(G, 0.4, w * 0.5); B = lerp(B, 0.36, w * 0.5);
    const k = (0.75 + 0.5 * f) * (1 - dark * 0.45);
    o[0] = R * k; o[1] = G * k; o[2] = B * k; o[3] = g * 0.7 + f * 0.3 - dark * 0.4;
  }, 4);

  T.bark = build(256, (u, v, o) => {
    const g = tfbm(u, v, 10, 3, 4, 51), f = tfbm(u, v, 40, 20, 2, 52), m = tfbm(u, v, 4, 4, 3, 53);
    const crack = sm(0.42, 0.3, g);
    let k = (0.6 + 0.7 * f) * (1 - crack * 0.55);
    let R = 0.3 * k, G = 0.24 * k, B = 0.17 * k;
    const moss = sm(0.5, 0.68, m) * 0.7;
    R = lerp(R, 0.17, moss); G = lerp(G, 0.28, moss); B = lerp(B, 0.07, moss);
    o[0] = R; o[1] = G; o[2] = B; o[3] = g * 0.8 + f * 0.2;
  }, 5);

  // linear noise lookup (3 independent fbm channels)
  {
    const s = 256; const data = new Uint8Array(s * s * 4);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const u = x / s, v = y / s, i = (y * s + x) * 4;
      data[i] = sm(0.15, 0.85, tfbm(u, v, 4, 4, 6, 61)) * 255;
      data[i + 1] = sm(0.15, 0.85, tfbm(u, v, 5, 5, 6, 62)) * 255;
      data[i + 2] = sm(0.15, 0.85, tfbm(u, v, 8, 8, 5, 63)) * 255;
      data[i + 3] = 255;
    }
    T.noise = finish(new THREE.DataTexture(data, s, s, THREE.RGBAFormat), false, 4);
  }

  // water normals
  {
    const s = 256; const h = new Float32Array(s * s);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const u = x / s, v = y / s;
      h[y * s + x] = tfbm(u, v, 5, 5, 5, 71) + 0.5 * (1 - Math.abs(tfbm(u, v, 9, 9, 3, 72) * 2 - 1));
    }
    T.waterN = normalFromHeight(h, s, s, 7);
  }

  // ---- foliage (alpha) ----
  {
    const c = mkCanvas(256, 256), ctx = c.getContext('2d'), R = rng(7);
    for (let i = 0; i < 70; i++) {
      const a = R() * 6.283, d = Math.sqrt(R()) * 84;
      const x = 128 + Math.cos(a) * d, y = 128 + Math.sin(a) * d;
      const li = 14 + i * 0.36 + R() * 8, hue = 78 + R() * 44, sat = 42 + R() * 24;
      leaf(ctx, x - Math.cos(a) * 12, y - Math.sin(a) * 12, 34 + R() * 26, 9 + R() * 8, a + (R() - 0.5) * 1.4,
        `hsl(${hue},${sat}%,${li}%)`, `hsl(${hue},${sat}%,${li + 9}%)`);
    }
    T.leaves = alphaTex(c, [52, 92, 30]);
  }
  {
    // atlas: left = fern clump, right = broad-leaf plant
    const c = mkCanvas(512, 256), ctx = c.getContext('2d'), R = rng(9);
    for (let b = 0; b < 13; b++) {
      const ang = -1.2 + (b / 12) * 2.4 + (R() - 0.5) * 0.2, len = 150 + R() * 85;
      const hue = 85 + R() * 30, li = 20 + R() * 16;
      const bx = 128, by = 254;
      const ex = bx + Math.sin(ang) * len, ey = by - Math.cos(ang) * len * (0.75 + 0.25 * Math.cos(ang));
      const mx = bx + Math.sin(ang) * len * 0.45, my = by - Math.cos(ang) * len * 0.75;
      ctx.strokeStyle = `hsl(${hue},45%,${li - 6}%)`; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
      for (let k = 1; k <= 20; k++) {
        const t = k / 21, it = 1 - t;
        const px = it * it * bx + 2 * it * t * mx + t * t * ex, py = it * it * by + 2 * it * t * my + t * t * ey;
        const tx = 2 * it * (mx - bx) + 2 * t * (ex - mx), ty = 2 * it * (my - by) + 2 * t * (ey - my);
        const ta = Math.atan2(ty, tx), ll = 25 * Math.sin(Math.PI * Math.min(1, t * 1.15 + 0.08)) + 3;
        for (const sgn of [-1, 1]) leaf(ctx, px, py, ll, ll * 0.2, ta + sgn * 1.05, `hsl(${hue + R() * 8},${50 + R() * 12}%,${li + R() * 8}%)`, `hsl(${hue},40%,${li + 12}%)`);
      }
    }
    for (let b = 0; b < 8; b++) {
      const ang = -1.25 + (b / 7) * 2.5 + (R() - 0.5) * 0.25, len = 150 + R() * 80;
      const hue = 95 + R() * 28, li = 20 + R() * 14;
      leaf(ctx, 384, 254, len, 26 + R() * 16, ang - Math.PI / 2, `hsl(${hue},52%,${li}%)`, `hsl(${hue},45%,${li + 12}%)`);
    }
    T.plants = alphaTex(c, [44, 88, 28]);
  }
  {
    const c = mkCanvas(256, 96), ctx = c.getContext('2d'), R = rng(11);
    for (let x = 4; x < 250; x += 4) {
      const t = x / 256, ll = 44 * Math.sin(Math.PI * Math.min(1, t * 0.9 + 0.12)) * (0.85 + R() * 0.3);
      for (const sgn of [-1, 1]) leaf(ctx, x, 48, ll, 3.4, sgn * (1.05 - t * 0.35) , `hsl(${92 + R() * 20},48%,${19 + R() * 12}%)`, 'hsl(95,40%,34%)');
    }
    ctx.strokeStyle = 'hsl(80,35%,30%)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 48); ctx.lineTo(252, 48); ctx.stroke();
    T.frond = alphaTex(c, [40, 84, 30]);
    T.frond.wrapS = T.frond.wrapT = THREE.ClampToEdgeWrapping;
  }
  {
    const c = mkCanvas(64, 256), ctx = c.getContext('2d'), R = rng(13);
    const sx = (y) => 32 + 9 * Math.sin((y / 128) * 6.283) + 4 * Math.sin((y / 64) * 6.283 + 1);
    ctx.strokeStyle = 'hsl(70,30%,20%)'; ctx.lineWidth = 2.6; ctx.beginPath();
    for (let y = 0; y <= 256; y += 4) { if (y === 0) ctx.moveTo(sx(y), y); else ctx.lineTo(sx(y), y); } ctx.stroke();
    for (let y = 6; y < 256; y += 11) {
      const sgn = (y / 11) % 2 < 1 ? -1 : 1;
      leaf(ctx, sx(y), y, 15 + R() * 8, 6 + R() * 3, Math.PI / 2 - sgn * (1.0 + R() * 0.4), `hsl(${88 + R() * 30},50%,${20 + R() * 15}%)`, 'hsl(95,40%,36%)');
    }
    T.vine = alphaTex(c, [42, 86, 28]);
  }

  // ---- dalmatian coat (liver / chocolate spots, modelled on the real Łatka) ----
  {
    const coat = (seed, n, rMin, rMax, big) => {
      const c = mkCanvas(256, 256), ctx = c.getContext('2d'), R = rng(seed);
      ctx.fillStyle = '#f4f1eb'; ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 300; i++) { ctx.fillStyle = `rgba(${205 + R() * 30},${198 + R() * 30},${188 + R() * 30},0.1)`; ctx.beginPath(); ctx.arc(R() * 256, R() * 256, 4 + R() * 14, 0, 7); ctx.fill(); }
      ctx.filter = 'blur(0.6px)';
      const placed = [];
      for (let i = 0, tries = 0; i < n && tries < n * 30; tries++) {
        const x = R() * 256, y = R() * 256; let r = rMin + R() * R() * (rMax - rMin); if (R() < big) r *= 1.5;
        let ok = true; for (const q of placed) { let dx = Math.abs(x - q[0]), dy = Math.abs(y - q[1]); dx = Math.min(dx, 256 - dx); dy = Math.min(dy, 256 - dy); if (dx * dx + dy * dy < (r + q[2]) * (r + q[2]) * 0.72) { ok = false; break; } }
        if (!ok) continue; placed.push([x, y, r]); i++;
        const l = 11 + R() * 7; ctx.fillStyle = `hsl(${18 + R() * 8},${42 + R() * 12}%,${l}%)`;
        const a = R() * 3.14, el = 0.72 + R() * 0.3, lobes = R() < 0.35 ? 2 : 1;
        for (let k = 0; k < lobes; k++) { const ox = k ? (R() - 0.5) * r * 1.1 : 0, oy = k ? (R() - 0.5) * r * 1.1 : 0, rr = k ? r * 0.7 : r;
          for (const wx of [-256, 0, 256]) for (const wy of [-256, 0, 256]) { ctx.beginPath(); ctx.ellipse(x + ox + wx, y + oy + wy, rr, rr * el, a, 0, 7); ctx.fill(); } }
      }
      return finish(new THREE.CanvasTexture(c), true);
    };
    T.spots = coat(21, 150, 3.2, 9.5, 0.12);      // body: dense, mixed sizes
    T.spotsFine = coat(22, 120, 1.6, 4.6, 0.05);  // legs, muzzle, tail: small freckles
  }

  // ---- temple carvings ----
  T.door = carve(512, 1024, (ctx) => {
    const G = '#3a3a3a', Hc = '#c8c8c8';
    ctx.strokeStyle = G; ctx.lineWidth = 12; ctx.strokeRect(20, 20, 472, 984);
    ctx.lineWidth = 5; ctx.strokeRect(46, 46, 420, 932);
    for (let i = 0; i < 6; i++) { fret(ctx, 66 + i * 64, 62, 48, G); fret(ctx, 66 + i * 64, 914, 48, G); }
    // setting sun
    ctx.fillStyle = Hc; ctx.beginPath(); ctx.arc(256, 250, 62, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = G; ctx.lineWidth = 7;
    for (let i = 0; i < 9; i++) { const a = Math.PI + (i + 0.5) * Math.PI / 9; ctx.beginPath(); ctx.moveTo(256 + Math.cos(a) * 78, 250 + Math.sin(a) * 78); ctx.lineTo(256 + Math.cos(a) * 120, 250 + Math.sin(a) * 120); ctx.stroke(); }
    ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(90, 258); ctx.lineTo(422, 258); ctx.stroke();
    // medallion with paw
    ctx.strokeStyle = G; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(256, 480, 168, 0, 7); ctx.stroke();
    ctx.fillStyle = '#9c9c9c'; ctx.beginPath(); ctx.arc(256, 480, 150, 0, 7); ctx.fill();
    ctx.strokeStyle = G; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(256, 480, 128, 0, 7); ctx.stroke();
    paw(ctx, 256, 482, 104, '#484848');
    // bone + little paws
    boneShape(ctx, 256, 720, 210, 34, Hc);
    ctx.strokeStyle = G; ctx.lineWidth = 5; ctx.strokeRect(100, 670, 312, 100);
    for (let i = 0; i < 3; i++) paw(ctx, 146 + i * 110, 838, 34, G);
  }, 5, 91);

  T.frieze = carve(1024, 128, (ctx) => {
    const G = '#3a3a3a', Hc = '#c4c4c4';
    ctx.strokeStyle = G; ctx.lineWidth = 6; ctx.strokeRect(6, 8, 1012, 112);
    for (let i = 0; i < 8; i++) {
      const x = 64 + i * 128;
      if (i % 2 === 0) boneShape(ctx, x, 64, 64, 14, Hc); else paw(ctx, x, 62, 30, G);
      ctx.strokeStyle = G; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x + 64, 18); ctx.lineTo(x + 64, 110); ctx.stroke();
    }
  }, 4, 95);

  // glyphs for the three relic sockets (white on black, used as emissive masks)
  const glyph = (draw) => { const c = mkCanvas(128, 128), ctx = c.getContext('2d'); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 128, 128); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff'; draw(ctx); return finish(new THREE.CanvasTexture(c), true); };
  T.glyphBone = glyph((ctx) => boneShape(ctx, 64, 64, 58, 14, '#fff', -0.6));
  T.glyphSock = glyph((ctx) => { ctx.lineWidth = 26; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(52, 30); ctx.lineTo(52, 84); ctx.lineTo(88, 92); ctx.stroke(); });
  T.glyphBrush = glyph((ctx) => { ctx.save(); ctx.translate(64, 64); ctx.rotate(-0.6); ctx.fillRect(-7, -52, 14, 46); ctx.fillRect(-26, -8, 52, 16); for (let i = -3; i <= 3; i++) ctx.fillRect(i * 7.5 - 2.5, 10, 5, 34); ctx.restore(); });
  T.glyphDiaper = glyph((ctx) => { ctx.beginPath(); ctx.moveTo(22, 36); ctx.lineTo(106, 36); ctx.lineTo(102, 60); ctx.quadraticCurveTo(84, 66, 78, 96); ctx.lineTo(50, 96); ctx.quadraticCurveTo(44, 66, 26, 60); ctx.closePath(); ctx.fill(); });
  T.glyphMirror = glyph((ctx) => { ctx.beginPath(); ctx.arc(64, 48, 28, 0, 7); ctx.fill(); ctx.fillRect(58, 72, 12, 40); });

  return T;
}
