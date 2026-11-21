// Level 2 – "Pościg za Milą": a three-lane chase down a village lane. Łatka runs by herself; the player changes lanes,
// jumps and slides. Catch Mila the cat three times to win.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createTextures, sm, lerp, clamp, rng, fbm } from './textures.js';
import { buildDog } from './dog.js';
import { buildCat } from './cat.js';
import { Particles, fogUniforms } from './fx.js';
import { AudioSys } from './audio.js';

const $ = (id) => document.getElementById(id);
const TXT = {
  pl: {
    over: 'Poziom 2', title: 'Pościg za Milą', start: 'Biegnij!', again: 'Jeszcze raz', menu: 'Menu',
    story: 'Kotka Mila zwiała ulicą Miłą! Biegnij za nią, zbieraj kości i omijaj przeszkody. Złap ją trzy razy, zanim stracisz wszystkie łapki.',
    keys: '← → zmiana toru · ↑ / Spacja — skok · ↓ — ślizg · M — muzyka',
    keys_t: 'Przesuń palcem: w lewo / w prawo — tor · w górę — skok · w dół — ślizg',
    hint: 'Kości przybliżają cię do Mili. Każde potknięcie daje jej przewagę!',
    mila: (m) => `Mila: ${m} m`, stage: (n) => `Etap ${n}/3`, bones: (n) => `Kości: ${n}`,
    k_street: 'Ulica', caught: (p) => `Mam cię! +${p}`, away: 'Mila ucieka dalej!', ouch: 'Auć!',
    winT: 'Mila złapana!', winX: (s, b, best) => `Mila ma dość uciekania — od dziś biegacie razem. Wynik: ${s} · kości: ${b} · rekord: ${best}`,
    loseT: 'Mila uciekła…', loseX: (s, b, best) => `Tym razem była szybsza. Wynik: ${s} · kości: ${b} · rekord: ${best}`,
    r_sock: 'Feeeeee! Skarpeta Lesława! +100', r_mirror: 'Lustro Oli! +100', r_brush: 'Zmiotka Agaty! +100', r_diaper: 'Ojej! Pielucha Jasia! +100',
  },
  en: {
    over: 'Level 2', title: 'Chasing Mila', start: 'Run!', again: 'Again', menu: 'Menu',
    story: 'Mila the cat has bolted down Miła Street! Run after her, collect bones and dodge what is in the way. Catch her three times before you lose all your paws.',
    keys: '← → change lane · ↑ / Space — jump · ↓ — slide · M — music',
    keys_t: 'Swipe: left / right — lane · up — jump · down — slide',
    hint: 'Bones bring you closer to Mila. Every stumble gives her a head start!',
    mila: (m) => `Mila: ${m} m`, stage: (n) => `Stage ${n}/3`, bones: (n) => `Bones: ${n}`,
    k_street: 'Street', caught: (p) => `Gotcha! +${p}`, away: 'Mila is off again!', ouch: 'Ouch!',
    winT: 'Mila is caught!', winX: (s, b, best) => `Mila is done running — from now on you run together. Score: ${s} · bones: ${b} · best: ${best}`,
    loseT: 'Mila got away…', loseX: (s, b, best) => `She was faster this time. Score: ${s} · bones: ${b} · best: ${best}`,
    r_sock: 'Yuck! Skarpeta Lesława! +100', r_mirror: 'Lustro Oli! +100', r_brush: 'Zmiotka Agaty! +100', r_diaper: 'Oh my! Pielucha Jasia! +100',
  },
};
let lang = 'pl';
const isTouch = matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && matchMedia('(hover: none)').matches);
const T = (k, ...a) => { const v = (isTouch && TXT[lang][k + '_t']) || TXT[lang][k]; return typeof v === 'function' ? v(...a) : v; };
const STREETS = ['Miła', 'Słoneczna', 'Zacisze'];

// ------------------------------------------------------------------ renderer
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
let pixelRatio = Math.min(window.devicePixelRatio || 1, 1.6);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 900);
function resize() { const w = Math.max(2, window.innerWidth), h = Math.max(2, window.innerHeight); camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setPixelRatio(pixelRatio); renderer.setSize(w, h, false); }
window.addEventListener('resize', resize); resize();

// ------------------------------------------------------------------ constants / state
const LANE = 1.7, LX = [-LANE, 0, LANE], CL = 24, NC = 8, ROADW = 5.9;
const STAGE_GAP = [30, 34, 38], STAGE_SPEED = [9.5, 11.5, 13.3];
const G = { mode: 'load', t: 0, dist: 0, speed: 0, stage: 0, gap: 30, lives: 3, score: 0, bones: 0, inv: 0, slow: 0, ct: 0, stageT: 0, shake: 0, streak: 0, streakT: 0, blend: 0, bot: false, genMin: 0, endT: 0, best: 0 };
const Pl = { lane: 1, x: 0, y: 0, vy: 0, slide: 0, grounded: true };
const Mi = { lane: 1, x: 0, y: 0, vy: 0, crouch: 0 };
let R = rng(7);
const audio = new AudioSys();
let dog, cat, pAdd, pAlpha, sun, hemi, skyU, tex;
try { G.best = +localStorage.getItem('latka-run-best') || 0; } catch (_) { /* private mode */ }

// ------------------------------------------------------------------ geometry helpers (everything is vertex-coloured and merged)
const worldMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, side: THREE.DoubleSide });
class Builder {
  constructor(seed) { this.g = []; this.r = rng(seed); }
  add(geo, color, x = 0, y = 0, z = 0, ry = 0, jit = 0.07) {
    const g = geo.index ? geo.toNonIndexed() : geo; g.deleteAttribute('uv');
    if (ry) g.rotateY(ry); g.translate(x, y, z);
    const n = g.attributes.position.count, c = new Float32Array(n * 3), col = new THREE.Color(color), k = 1 + (this.r() - 0.5) * 2 * jit;
    for (let i = 0; i < n; i++) { c[i * 3] = col.r * k; c[i * 3 + 1] = col.g * k; c[i * 3 + 2] = col.b * k; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3)); this.g.push(g); return g;
  }
  box(w, h, d, x, y, z, color, ry = 0, jit) { return this.add(new THREE.BoxGeometry(w, h, d), color, x, y + h / 2, z, ry, jit); }
  cyl(rt, rb, h, x, y, z, color, seg = 8) { return this.add(new THREE.CylinderGeometry(rt, rb, h, seg), color, x, y + h / 2, z); }
  cone(r, h, x, y, z, color, seg = 7) { return this.add(new THREE.ConeGeometry(r, h, seg), color, x, y + h / 2, z, this.r() * 3); }
  blob(r, x, y, z, color, sy = 1) { const g = new THREE.IcosahedronGeometry(r, 1); g.scale(1, sy, 1); return this.add(g, color, x, y, z, this.r() * 3, 0.12); }
  mesh() { const m = new THREE.Mesh(mergeGeometries(this.g), worldMat); m.castShadow = true; m.receiveShadow = true; this.g = []; return m; }
}
function roofGeo(w, h, d) {       // gable prism, ridge along z
  const a = w / 2, b = d / 2, p = [-a, 0, -b, 0, h, -b, 0, h, b, -a, 0, -b, 0, h, b, -a, 0, b, a, 0, -b, a, 0, b, 0, h, b, a, 0, -b, 0, h, b, 0, h, -b, -a, 0, -b, a, 0, -b, 0, h, -b, -a, 0, b, 0, h, b, a, 0, b];
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.computeVertexNormals();
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(p.length / 3 * 2), 2)); return g;
}
function canvasTex(w, h, draw, rx, ry) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8; return t;
}

// ------------------------------------------------------------------ scenery
const chunks = [];
function buildScenery() {
  // sky
  skyU = { uTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uSun: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3() }, uTime: { value: 0 } };
  const dome = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), new THREE.ShaderMaterial({ uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uTop, uHor, uSun, uSunDir; uniform float uTime; varying vec3 vDir;
      float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
      float fb(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vn(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }
      void main(){ vec3 d = normalize(vDir); float h = max(d.y, 0.0); vec3 c = mix(uHor, uTop, pow(h, 0.55));
        float sd = max(dot(d, uSunDir), 0.0); c += uSun * (pow(sd, 90.0) * 0.9 + pow(sd, 9.0) * 0.18);
        if (d.y > 0.0) { vec2 p = d.xz / (d.y + 0.14) * 0.85 + vec2(uTime * 0.008, 0.0); float n = fb(p) * 0.7 + fb(p * 2.6 + 3.0) * 0.3;
          float cov = smoothstep(0.66, 0.88, n) * smoothstep(0.0, 0.13, d.y); c = mix(c, mix(vec3(1.0), uHor, 0.3) + uSun * 0.12, cov * 0.88); }
        c = mix(c, uHor, exp(-h * 9.0) * 0.75); gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` }));
  dome.frustumCulled = false; dome.renderOrder = -10; scene.add(dome); G.dome = dome;
  sun = new THREE.DirectionalLight(0xffffff, 3); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  const sc = sun.shadow.camera; sc.left = -15; sc.right = 15; sc.top = 24; sc.bottom = -16; sc.near = 1; sc.far = 120; sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.05;
  scene.add(sun); scene.add(sun.target);
  hemi = new THREE.HemisphereLight(0xffffff, 0x6f7a55, 1); scene.add(hemi);
  scene.fog = new THREE.FogExp2(0xffffff, 0.0115);

  const roadT = canvasTex(256, 256, (c, w, h) => {
    const im = c.createImageData(w, h), d = im.data, r = rng(3);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = x / w, n = fbm(x * 0.09, y * 0.09, 4, 5) * 0.5 + r() * 0.5;
      let track = 0; for (const l of [1 / 6, 0.5, 5 / 6]) track = Math.max(track, 1 - sm(0.05, 0.13, Math.abs(u - l)));    // paler worn strip down every lane
      const edge = sm(0.44, 0.5, Math.abs(u - 0.5)), v = 118 + n * 46 + track * 20 - edge * 26, i = (y * w + x) * 4;
      d[i] = v * 1.05; d[i + 1] = v * 0.99; d[i + 2] = v * 0.9 - edge * 14; d[i + 3] = 255;
    }
    c.putImageData(im, 0, 0);
    for (let i = 0; i < 260; i++) { c.fillStyle = `rgba(${r() < 0.5 ? '70,66,60' : '215,208,196'},${0.25 + r() * 0.4})`; c.fillRect(r() * w, r() * h, 1 + r() * 2.2, 1 + r() * 2.2); }
  }, 1, CL / ROADW);
  const grassT = canvasTex(256, 256, (c, w, h) => {
    const im = c.createImageData(w, h), d = im.data, r = rng(4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const n = fbm(x * 0.05, y * 0.05, 4, 9), k = 0.7 + n * 0.45 + r() * 0.22, i = (y * w + x) * 4; d[i] = 74 * k; d[i + 1] = 128 * k; d[i + 2] = 48 * k; d[i + 3] = 255; }
    c.putImageData(im, 0, 0);
  }, 22, 6);
  const roadM = new THREE.MeshStandardMaterial({ map: roadT, roughness: 0.95 }), grassM = new THREE.MeshStandardMaterial({ map: grassT, roughness: 1 });
  const roadG = new THREE.PlaneGeometry(ROADW, CL); roadG.rotateX(-Math.PI / 2);
  const grassG = new THREE.PlaneGeometry(190, CL); grassG.rotateX(-Math.PI / 2);

  const WALLS = [0xeadcbe, 0xf3efe4, 0xe7c98c, 0xdcc0a2, 0xcfd8cf], ROOFS = [0x9a3b2e, 0x80402f, 0x55565c, 0x6f3a2c];
  const GREENS = [0x3f7a2c, 0x4f8a34, 0x356b2a, 0x5c9440];
  for (let ci = 0; ci < NC; ci++) {
    const b = new Builder(100 + ci), r = b.r, grp = new THREE.Group();
    const road = new THREE.Mesh(roadG, roadM); road.position.set(0, 0, -CL / 2); road.receiveShadow = true; grp.add(road);
    const grass = new THREE.Mesh(grassG, grassM); grass.position.set(0, -0.03, -CL / 2); grass.receiveShadow = true; grp.add(grass);
    const spruce = (x, z, h) => { b.cyl(0.1 * h / 5, 0.14 * h / 5, h * 0.25, x, 0, z, 0x5a4030); for (let i = 0; i < 4; i++) b.cone(h * (0.26 - i * 0.045), h * 0.36, x, h * (0.16 + i * 0.2), z, i % 2 ? 0x2f5d33 : 0x27502d, 8); };
    const tree = (x, z, s) => { b.cyl(0.13 * s, 0.2 * s, 2.3 * s, x, 0, z, 0x5d4632); b.blob(1.5 * s, x, 3.2 * s, z, GREENS[(r() * 4) | 0], 0.9); b.blob(1.1 * s, x + 0.9 * s, 2.7 * s, z + 0.4 * s, GREENS[(r() * 4) | 0]); b.blob(1.0 * s, x - 0.8 * s, 2.9 * s, z - 0.5 * s, GREENS[(r() * 4) | 0]); };
    for (const s of [-1, 1]) {
      const fx = s * (ROADW / 2 + 0.75);
      // two 12 m plots per side, each with its own boundary
      for (let seg = 0; seg < 2; seg++) {
        const z0 = -seg * 12, zc = z0 - 6, kind = (r() * 4) | 0;
        if (kind === 0) {                                      // dark picket fence
          for (let i = 0; i < 74; i++) b.box(0.115, 1.0 + (i % 2) * 0.0, 0.03, fx, 0.08, z0 - 0.08 - i * 0.162, 0x4a342a, 0, 0.1);
          for (const y of [0.32, 0.86]) b.box(0.05, 0.07, 12, fx - s * 0.03, y, zc, 0x3e2b22);
          for (let i = 0; i <= 4; i++) b.box(0.12, 1.2, 0.12, fx - s * 0.02, 0, z0 - i * 3, 0x3a2820);
        } else if (kind === 1) {                               // clipped hedge
          b.box(0.95, 1.35 + r() * 0.5, 12, fx + s * 0.25, 0, zc, 0x3d6f2b, 0, 0.1);
          for (let i = 0; i < 9; i++) b.blob(0.62, fx + s * 0.25, 1.45 + r() * 0.4, z0 - 0.7 - i * 1.32, GREENS[(r() * 4) | 0], 0.7);
        } else if (kind === 2) {                               // thuja row
          for (let i = 0; i < 9; i++) b.cone(0.55 + r() * 0.12, 2.3 + r() * 1.3, fx + s * 0.2, 0, z0 - 0.7 - i * 1.32, i % 2 ? 0x3c7030 : 0x4a8036, 9);
        } else {                                               // wire fence on a concrete footing
          b.box(0.2, 0.3, 12, fx, 0, zc, 0xa9a59c);
          for (let i = 0; i <= 4; i++) b.box(0.07, 1.25, 0.07, fx, 0.3, z0 - i * 3, 0x33543c);
          for (const y of [0.55, 0.95, 1.45]) b.box(0.03, 0.03, 12, fx, y, zc, 0x3f6447);
          for (let i = 0; i < 6; i++) b.blob(0.5 + r() * 0.3, fx + s * 0.8, 0.5, z0 - 1 - i * 2, GREENS[(r() * 4) | 0], 0.8);
        }
        // what stands on the plot
        const hx = s * (ROADW / 2 + 6.2 + r() * 2.5), q = r();
        if (q < 0.62) {
          const w = 6 + r() * 2.5, d = 6.5 + r() * 2.5, h = 2.9 + (r() < 0.35 ? 2.4 : 0), wall = WALLS[(r() * WALLS.length) | 0], roof = ROOFS[(r() * ROOFS.length) | 0];
          b.box(w, 0.35, d, hx, 0, zc, 0x8f8a82); b.box(w - 0.1, h, d - 0.1, hx, 0.35, zc, wall, 0, 0.03);
          const turn = r() < 0.5, rg = roofGeo((turn ? d : w) + 0.9, 2.3 + r(), (turn ? w : d) + 0.9); b.add(rg, roof, hx, h + 0.35, zc, turn ? Math.PI / 2 : 0, 0.04);
          b.box(0.55, 1.1, 0.55, hx + (r() - 0.5) * 2, h + 1.2, zc + (r() - 0.5) * 2, 0x8a5a48);                    // chimney
          const face = hx - s * (w / 2 + 0.02);
          for (const wz of [-d * 0.27, d * 0.27]) for (let fl = 0; fl < (h > 4 ? 2 : 1); fl++) { b.box(0.06, 1.25, 1.15, face - s * 0.01, 1.25 + fl * 2.4, zc + wz, 0xf4f1ea, 0, 0); b.box(0.07, 1.05, 0.95, face - s * 0.03, 1.35 + fl * 2.4, zc + wz, 0x2c3f52, 0, 0); }
          b.box(0.07, 2.0, 0.95, face - s * 0.02, 0.35, zc, 0x6b4630, 0, 0);                                           // door
          b.box(Math.abs(face - fx) - 0.3, 0.04, 1.6, (face + fx) / 2, 0, zc, 0xa8a49b, 0, 0.03);                     // path to the gate
          if (r() < 0.6) tree(hx + s * (1 + r() * 3), zc + (r() < 0.5 ? -5 : 5), 0.8 + r() * 0.4);
        } else if (q < 0.82) { tree(hx - s * 1.5, zc + 2, 1 + r() * 0.5); spruce(hx + s * 2, zc - 3, 6 + r() * 3); tree(hx + s * 4, zc + 4, 0.9); }
        else { spruce(hx - s, zc + 3, 5 + r() * 3); spruce(hx + s * 2.5, zc - 2, 7 + r() * 3); for (let i = 0; i < 5; i++) b.blob(0.6 + r() * 0.5, hx + (r() - 0.5) * 7, 0.45, zc + (r() - 0.5) * 9, GREENS[(r() * 4) | 0], 0.75); }
        // far tree line that closes the view
        for (let i = 0; i < 3; i++) { const tx = s * (24 + r() * 16), tz = z0 - r() * 12; if (r() < 0.6) spruce(tx, tz, 9 + r() * 6); else tree(tx, tz, 1.6 + r() * 0.9); }
      }
      // verge: tufts and flowers along the edge of the road
      for (let i = 0; i < 16; i++) { const z = -r() * CL, x = s * (ROADW / 2 + 0.12 + r() * 0.45); if (r() < 0.75) b.cone(0.09 + r() * 0.07, 0.22 + r() * 0.2, x, 0, z, 0x5f9a3c, 5); else b.blob(0.07, x, 0.2, z, [0xf2d24a, 0xf5f5f0, 0xd95f8a][(r() * 3) | 0]); }
    }
    if (ci % 2 === 0) { const s = ci % 4 === 0 ? 1 : -1, x = s * (ROADW / 2 + 0.38); b.cyl(0.05, 0.07, 5.2, x, 0, -6, 0x6d7278); b.box(0.9, 0.06, 0.08, x - s * 0.4, 5.15, -6, 0x6d7278); b.box(0.36, 0.1, 0.18, x - s * 0.82, 5.05, -6, 0xe8e2c8); }
    grp.add(b.mesh()); grp.userData.k = ci; grp.position.z = -(ci - 1) * CL; scene.add(grp); chunks.push(grp);
  }
}
// time of day drifts from a bright afternoon to a warm sunset over the three stages
const MOODS = [
  { top: [0.04, 0.24, 0.95], hor: [0.5, 0.74, 1.0], sun: [1.0, 0.96, 0.86], si: 3.3, hi: 1.05, el: 0.9, fog: 0.0105 },
  { top: [0.2, 0.36, 0.76], hor: [0.99, 0.82, 0.58], sun: [1.0, 0.82, 0.55], si: 3.1, hi: 0.9, el: 0.5, fog: 0.012 },
  { top: [0.16, 0.2, 0.52], hor: [1.0, 0.56, 0.36], sun: [1.0, 0.56, 0.3], si: 2.8, hi: 0.9, el: 0.28, fog: 0.0135 },
];
const mood = { k: 0 }, sunDir = new THREE.Vector3(), tmpC = new THREE.Color();
function updateMood(dt) {
  mood.k += (Math.min(2, G.stage + (G.mode === 'play' ? sm(0, 1, G.stageT / 60) * 0.6 : 0)) - mood.k) * Math.min(1, dt * 0.6);
  const i = Math.min(1, Math.floor(mood.k)), f = mood.k - i, a = MOODS[i], b = MOODS[i + 1], L3 = (p, q) => [lerp(p[0], q[0], f), lerp(p[1], q[1], f), lerp(p[2], q[2], f)];
  skyU.uTop.value.setRGB(...L3(a.top, b.top)); skyU.uHor.value.setRGB(...L3(a.hor, b.hor)); skyU.uSun.value.setRGB(...L3(a.sun, b.sun));
  const el = lerp(a.el, b.el, f); sunDir.set(-0.55 * Math.cos(el), Math.sin(el), -0.84 * Math.cos(el)).normalize(); skyU.uSunDir.value.copy(sunDir); skyU.uTime.value = G.t;
  sun.color.setRGB(...L3(a.sun, b.sun)); sun.intensity = lerp(a.si, b.si, f); hemi.intensity = lerp(a.hi, b.hi, f);
  hemi.color.setRGB(...L3(a.top, b.top)).lerp(tmpC.setRGB(1, 1, 1), 0.55); scene.fog.color.setRGB(...L3(a.hor, b.hor)); scene.fog.density = lerp(a.fog, b.fog, f);
  fogUniforms.uFogColor.value.copy(scene.fog.color); fogUniforms.uFogDensity.value = scene.fog.density;
  const pz = -G.dist; sun.target.position.set(0, 0, pz - 6); sun.position.copy(sun.target.position).addScaledVector(sunDir, 60); sun.target.updateMatrixWorld();
  G.dome.position.copy(camera.position);
}

// ------------------------------------------------------------------ obstacles and pickups
const PROTO = {}, pools = {}, rows = [], items = [];
function buildProtos() {
  const mk = (name, fn) => { const b = new Builder(name.length * 31 + 5); fn(b); PROTO[name] = b.mesh().geometry; };
  const lying = (len, r) => { const g = new THREE.CylinderGeometry(r, r * 1.08, len, 12); g.rotateZ(Math.PI / 2); return g; };
  mk('log', (b) => { b.add(lying(1.5, 0.25), 0x6b4a32, 0, 0.25, 0); b.add(lying(1.52, 0.2), 0xc9a877, 0, 0.25, 0); b.cyl(0.05, 0.07, 0.3, 0.3, 0.42, 0, 0x5c3f2a); b.blob(0.16, -0.45, 0.5, 0.05, 0x4f8a34); });
  mk('crate', (b) => { for (const x of [-0.37, 0.37]) { b.box(0.66, 0.46, 0.6, x, 0, 0, 0xb98a55); for (const y of [0.05, 0.36]) b.box(0.7, 0.07, 0.64, x, y, 0, 0x8a6238); for (let i = 0; i < 4; i++) b.blob(0.11, x - 0.2 + (i % 2) * 0.36, 0.5, -0.14 + (i >> 1) * 0.28, i % 2 ? 0xc8402f : 0x9fbf3a); } });
  mk('gate', (b) => { for (const x of [-0.78, 0.78]) b.box(0.11, 1.3, 0.11, x, 0, 0, 0xe9e6df); for (let i = 0; i < 6; i++) b.box(0.262, 0.2, 0.09, -0.655 + i * 0.262, 0.82, 0, i % 2 ? 0xf2f0ea : 0xc7352b, 0, 0.02); b.box(1.5, 0.05, 0.05, 0, 1.2, 0, 0xc7352b); });
  for (const [n, col] of [['binG', 0x3f7d45], ['binB', 0x6a5142], ['binY', 0xd6b23a]]) mk(n, (b) => { b.box(0.66, 1.0, 0.72, 0, 0.08, 0, col); b.box(0.74, 0.1, 0.8, 0, 1.08, 0, col); b.box(0.5, 0.05, 0.1, 0, 1.12, 0.42, 0x2b2b2e); for (const x of [-0.3, 0.3]) b.add(lying(0.08, 0.11), 0x222224, x, 0.11, 0.3); });
  mk('planter', (b) => { b.box(1.3, 0.55, 0.7, 0, 0, 0, 0xb5b0a6); b.box(1.38, 0.08, 0.78, 0, 0.55, 0, 0x9d988e); b.blob(0.5, -0.3, 0.95, 0, 0x3f7a2c); b.blob(0.55, 0.3, 1.02, 0.05, 0x4f8a34); b.blob(0.4, 0, 1.35, -0.05, 0x5c9440); for (let i = 0; i < 6; i++) b.blob(0.08, -0.5 + i * 0.2, 1.05 + (i % 3) * 0.16, 0.36, i % 2 ? 0xe85d8f : 0xf4d44a); });
  mk('biglog', (b) => { b.add(lying(ROADW + 0.5, 0.27), 0x66472f, 0, 0.27, 0); b.add(lying(ROADW + 0.54, 0.21), 0xc9a877, 0, 0.27, 0); for (const x of [-1.9, 0.6, 2.2]) { b.cyl(0.05, 0.08, 0.35, x, 0.45, 0.02, 0x5c3f2a); b.blob(0.2, x + 0.1, 0.78, 0, 0x4f8a34); } });
  mk('line', (b) => {
    for (const x of [-ROADW / 2 - 0.1, ROADW / 2 + 0.1]) { b.box(0.1, 2.05, 0.1, x, 0, 0, 0x8a8f96); b.box(0.5, 0.06, 0.06, x, 1.95, 0, 0x8a8f96); }
    b.box(ROADW + 0.2, 0.025, 0.025, 0, 1.93, 0, 0xe8e4da);
    const cols = [0xf4f1ea, 0xd9534f, 0x4f86c6, 0xf2c94c, 0xf4f1ea, 0x69a86b, 0xe58fb0]; let x = -ROADW / 2 + 0.5;
    for (let i = 0; i < 7; i++) { const w = 0.6 + (i % 3) * 0.1; b.box(w, 1.12 + (i % 2) * 0.06, 0.03, x + w / 2, 0.8 - (i % 2) * 0.06, 0, cols[i], 0, 0.02); x += w + 0.1; }
  });
}
const KIND = { log: 'low', crate: 'low', gate: 'high', binG: 'full', binB: 'full', binY: 'full', planter: 'full', biglog: 'low', line: 'high' };
function getObj(kind) { const p = pools[kind] || (pools[kind] = []); let m = p.pop(); if (!m) { m = new THREE.Mesh(PROTO[kind], worldMat); m.castShadow = true; m.receiveShadow = true; m.userData.kind = kind; scene.add(m); } m.visible = true; return m; }
function freeRow(row) { for (const m of row.objs) { m.visible = false; pools[m.userData.kind].push(m); } row.objs.length = 0; }

const BONES = 110; let boneMesh, relicMeshes = {}; const dummy = new THREE.Object3D();
function buildPickups() {
  const parts = [], cg = new THREE.CylinderGeometry(0.045, 0.045, 0.26, 8); cg.rotateZ(Math.PI / 2); parts.push(cg.toNonIndexed());
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) { const s = new THREE.SphereGeometry(0.07, 8, 6); s.translate(sx * 0.14, sy * 0.05, 0); parts.push(s.toNonIndexed()); }
  boneMesh = new THREE.InstancedMesh(mergeGeometries(parts), new THREE.MeshStandardMaterial({ color: 0xffd257, emissive: 0x9a5a00, emissiveIntensity: 0.9, roughness: 0.35 }), BONES);
  boneMesh.frustumCulled = false; boneMesh.castShadow = true; scene.add(boneMesh);
  for (const [id, col] of [['sock', 0x9fbf5a], ['mirror', 0x8fd8ff], ['brush', 0xff8a2e], ['diaper', 0xff8fd0]]) {
    const g = new THREE.Group(), c = new THREE.Color(col);
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.3, roughness: 0.3 })); g.add(core);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 6, 24), new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(1.6) })); g.add(halo);
    g.visible = false; g.userData.col = c; scene.add(g); relicMeshes[id] = g;
  }
}
const RELICS = ['sock', 'mirror', 'brush', 'diaper'];

// ------------------------------------------------------------------ level generation
const gen = { z: 40, safe: 1, relicAt: 260, relicI: 0 };
function difficulty() { return clamp(G.stage * 0.3 + sm(0, 50, G.stageT) * 0.25, 0, 1); }
function speedNow() { return STAGE_SPEED[Math.min(2, G.stage)] + sm(0, 45, G.stageT) * 1.6; }
function genRow() {
  const d = difficulty(), sp = speedNow(), prev = gen.safe;
  let safe = clamp(prev + (R() < 0.6 ? (R() < 0.5 ? -1 : 1) : 0), 0, 2);
  let dz = sp * lerp(1.2, 0.82, d) + R() * sp * 0.4; if (safe !== prev) dz += sp * 0.22;
  const z = Math.max(gen.z + dz, G.genMin), row = { z, cells: [null, null, null], safe, objs: [], hit: false, wide: null };
  const q = R(), pick = (a) => a[(R() * a.length) | 0];
  if (q < 0.12 + d * 0.05) { row.wide = 'biglog'; row.cells = ['low', 'low', 'low']; safe = row.safe = prev; }
  else if (q < 0.24 + d * 0.1) { row.wide = 'line'; row.cells = ['high', 'high', 'high']; safe = row.safe = prev; }
  else {
    let n = 0;
    for (let l = 0; l < 3; l++) {
      if (l === safe) { if (R() < 0.18 + d * 0.3) row.cells[l] = R() < 0.55 ? 'low' : 'high'; continue; }
      const k = R(); row.cells[l] = k < 0.5 ? 'full' : k < 0.68 ? 'low' : k < 0.82 ? 'high' : null; if (row.cells[l]) n++;
    }
    if (!n) row.cells[(safe + 1) % 3] = 'full';
  }
  if (row.wide) { const m = getObj(row.wide); m.position.set(0, 0, -z); row.objs.push(m); }
  else row.cells.forEach((c, l) => { if (!c) return; const m = getObj(c === 'low' ? pick(['log', 'crate']) : c === 'high' ? 'gate' : pick(['binG', 'binB', 'binY', 'planter'])); m.position.set(LX[l], 0, -z); m.rotation.y = c === 'full' ? (R() - 0.5) * 0.3 : 0; row.objs.push(m); });
  rows.push(row);
  // bones lead along the safe lane; they arc over things to jump and stay low under things to slide beneath
  const act = row.cells[safe];
  if (R() < 0.78) for (let i = 0; i < 5; i++) {
    const off = act ? (i - 2) * 1.5 : -7.6 + i * 1.45, y = act === 'low' ? 0.5 + 0.95 * Math.cos((i - 2) / 2 * 1.35) ** 2 * (i === 0 || i === 4 ? 0.35 : 1) : act === 'high' ? 0.3 : 0.55;
    if (z + off > gen.z + 1.2) items.push({ x: LX[safe], y, z: z + off, kind: 'bone' });
  }
  if (z > gen.relicAt) { items.push({ x: LX[safe], y: 0.75, z: z - dz * 0.5 - (act ? 2 : 0), kind: RELICS[gen.relicI++ % 4] }); gen.relicAt = z + 230 + R() * 90; }
  gen.z = z; gen.safe = safe;
}
function clearAhead(from, to) {
  for (let i = rows.length - 1; i >= 0; i--) if (rows[i].z > from && rows[i].z < to) { freeRow(rows[i]); rows.splice(i, 1); }
  for (let i = items.length - 1; i >= 0; i--) if (items[i].z > from && items[i].z < to) items.splice(i, 1);
  const last = rows[rows.length - 1]; gen.z = Math.max(last ? last.z : 0, from); G.genMin = to;
}

// ------------------------------------------------------------------ HUD
let hintT = 0, pickT = 0;
function hint(text, secs = 5) { $('hint').textContent = text; $('hint').style.opacity = 1; hintT = secs; }
function pick(text) { $('pick').textContent = text; $('pick').style.opacity = 1; pickT = 1.7; }
function place(name) { const el = $('place'); $('placeKind').textContent = T('k_street'); $('placeName').textContent = name; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); if (audio.on) audio.placeChime(); }
function applyLang() {
  $('title').querySelector('h1').innerHTML = `<small>${T('over')}</small>${T('title')}`;
  $('title').querySelector('.story').textContent = T('story'); $('start').textContent = T('start'); $('title').querySelector('.keys').textContent = T('keys');
  $('again').textContent = T('again'); $('menu').textContent = T('menu'); $('lang').textContent = lang === 'pl' ? 'EN' : 'PL'; hud(true);
}
const paw = '<svg viewBox="0 0 32 32"><ellipse cx="16" cy="21.5" rx="7.2" ry="6"/><ellipse cx="6.6" cy="14" rx="3" ry="3.9"/><ellipse cx="12.4" cy="8.4" rx="3" ry="4"/><ellipse cx="19.6" cy="8.4" rx="3" ry="4"/><ellipse cx="25.4" cy="14" rx="3" ry="3.9"/></svg>';
const shown = {};
function hud(force) {
  const set = (id, v, html) => { if (!force && shown[id] === v) return; shown[id] = v; if (html) $(id).innerHTML = v; else $(id).textContent = v; };
  set('rScore', String(Math.floor(G.score)));
  set('rSub', T('bones', G.bones) + ' · ' + T('stage', Math.min(3, G.stage + 1)));
  set('rLives', [0, 1, 2].map((i) => `<span class="${i < G.lives ? '' : 'lost'}">${paw}</span>`).join(''), true);
  set('rLabel', T('mila', Math.max(0, Math.round(G.gap))));
  $('rCat').style.left = clamp(G.gap / 42, 0, 1) * 100 + '%';
}

// ------------------------------------------------------------------ input
function act(a) {
  if (G.mode !== 'play') return;
  if (a === 'left' && Pl.lane > 0) { Pl.lane--; audio.whoosh(); }
  else if (a === 'right' && Pl.lane < 2) { Pl.lane++; audio.whoosh(); }
  else if (a === 'up') { if (Pl.grounded) { Pl.vy = 6.7; Pl.grounded = false; Pl.slide = 0; audio.jump(); } else Pl.jumpBuf = 0.14; }
  else if (a === 'down') { Pl.slide = 0.72; if (!Pl.grounded) Pl.vy = Math.min(Pl.vy, -9); else audio.scrape(); }
}
const KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', Space: 'up', ArrowDown: 'down', KeyS: 'down' };
window.addEventListener('keydown', (e) => {
  if (e.repeat) return; const a = KEYMAP[e.code];
  if (a) { act(a); e.preventDefault(); }
  if (e.code === 'KeyM' && audio.on) audio.toggleMusic();
  if (e.code === 'KeyP') document.body.classList.toggle('clean');
  if ((e.code === 'Enter' || e.code === 'Space') && G.mode === 'title') startGame();
});
{
  let ts = null; const NP = { passive: false };
  window.addEventListener('touchstart', (e) => { if (e.target.closest && e.target.closest('button')) return; const t = e.changedTouches[0]; ts = { id: t.identifier, x: t.clientX, y: t.clientY, done: false }; if (G.mode === 'play') e.preventDefault(); }, NP);
  window.addEventListener('touchmove', (e) => {
    if (G.mode === 'play') e.preventDefault(); if (!ts || ts.done) return;
    for (const t of e.changedTouches) if (t.identifier === ts.id) { const dx = t.clientX - ts.x, dy = t.clientY - ts.y; if (Math.max(Math.abs(dx), Math.abs(dy)) > 20) { ts.done = true; act(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy < 0 ? 'up' : 'down')); } }
  }, NP);
  window.addEventListener('touchend', () => { ts = null; });
  for (const g of ['gesturestart', 'gesturechange']) document.addEventListener(g, (e) => e.preventDefault());
}

// ------------------------------------------------------------------ game flow
function reset() {
  for (const r of rows) freeRow(r); rows.length = 0; items.length = 0; R = rng(G.bot ? G.seed || 7 : 7 + ((Math.random() * 1e6) | 0));
  Object.assign(G, { t: 0, dist: 0, speed: 0, stage: 0, gap: STAGE_GAP[0], lives: 3, score: 0, bones: 0, inv: 0, slow: 0, ct: 0, stageT: 0, shake: 0, streak: 0, blend: 0, genMin: 0, endT: 0 });
  Object.assign(Pl, { lane: 1, x: 0, y: 0, vy: 0, slide: 0, grounded: true }); Object.assign(Mi, { lane: 1, x: 0, y: 0, vy: 0, crouch: 0 });
  Object.assign(gen, { z: 38, safe: 1, relicAt: 240, relicI: 0 }); mood.k = 0;
  for (const c of chunks) c.position.z = -(c.userData.k - 1) * CL;
  for (const id in relicMeshes) relicMeshes[id].visible = false;
  dog.root.visible = true;
}
function startGame() {
  if (G.mode !== 'title') return;
  audio.start(); G.mode = 'play'; G.blend = 0;
  $('title').classList.add('hidden'); for (const id of ['rTop', 'rLives', 'rMila']) $(id).style.opacity = 1;
  setTimeout(() => { if (G.mode === 'play') { place(STREETS[0]); hint(T('hint')); } }, 600);
  audio.bark(); dog.bark(); setTimeout(() => audio.meow(), 500);
}
function toTitle() { reset(); G.mode = 'title'; $('end').classList.add('hidden'); $('title').classList.remove('hidden'); for (const id of ['rTop', 'rLives', 'rMila']) $(id).style.opacity = 0; }
function finish(win) {
  const s = Math.floor(G.score); if (s > G.best) { G.best = s; try { localStorage.setItem('latka-run-best', String(s)); } catch (_) { /* private mode */ } }
  $('endTitle').textContent = T(win ? 'winT' : 'loseT'); $('endText').textContent = T(win ? 'winX' : 'loseX', s, G.bones, G.best);
  $('end').classList.remove('hidden'); $('menu').style.display = ''; for (const id of ['rTop', 'rLives', 'rMila', 'hint', 'pick']) $(id).style.opacity = 0;
}
function stumble(row) {
  row.hit = true; if (G.inv > 0) return;
  G.lives--; G.inv = 1.5; G.slow = 1; G.gap += 7; G.shake = 0.6; G.streak = 0; audio.yelp(); pick(T('ouch'));
  $('flash').style.opacity = 1; setTimeout(() => { $('flash').style.opacity = 0; }, 180);
  for (let i = 0; i < 14; i++) pAlpha.spawn(Pl.x + (Math.random() - 0.5) * 0.6, 0.2 + Math.random() * 0.5, -G.dist - 0.4, (Math.random() - 0.5) * 3, 1 + Math.random() * 2, (Math.random() - 0.5) * 2 - 2, 0.7 + Math.random() * 0.5, 0.3, 1.2, 0.75, 0.7, 0.62, 0.4, 0, 1.5);
  if (G.lives <= 0) { G.mode = 'over'; G.endT = 0; audio.night(); }
}
function sparkle(x, y, z, c, n) { for (let i = 0; i < n; i++) pAdd.spawn(x, y, z, (Math.random() - 0.5) * 3, Math.random() * 3, (Math.random() - 0.5) * 3 - G.speed * 0.5, 0.4 + Math.random() * 0.5, 0.2, 0.02, c.r * 4, c.g * 4, c.b * 4, 1, 4, 1); }
const GOLD = new THREE.Color(1, 0.75, 0.25);

function step(dt) {
  G.t += dt;
  const play = G.mode === 'play', moving = play || G.mode === 'catch';
  // ---- speed and distance
  let target = 0;
  if (moving) { G.stageT += play ? dt : 0; target = speedNow() * (1 - 0.45 * G.slow); }
  G.slow = Math.max(0, G.slow - dt * 1.4); G.inv = Math.max(0, G.inv - dt);
  G.speed += (target - G.speed) * Math.min(1, dt * (moving ? 3.2 : 2.2));
  const prevDist = G.dist; G.dist += G.speed * dt; if (play) G.score += G.speed * dt;
  if (G.bot && play) botPlay();
  // ---- player
  Pl.x += (LX[Pl.lane] - Pl.x) * Math.min(1, dt * 15);
  if (!Pl.grounded) { Pl.vy -= 21 * dt; Pl.y += Pl.vy * dt; if (Pl.y <= 0) { Pl.y = 0; Pl.vy = 0; Pl.grounded = true; audio.land(); if (Pl.jumpBuf > 0 && play) { Pl.jumpBuf = 0; act('up'); } } }
  Pl.jumpBuf = Math.max(0, (Pl.jumpBuf || 0) - dt); Pl.slide = Math.max(0, Pl.slide - dt);
  const sliding = Pl.slide > 0 && Pl.grounded;
  // ---- world generation / recycling
  while (moving && gen.z < G.dist + 150) genRow();
  while (rows.length && rows[0].z < G.dist - 1.3) { freeRow(rows[0]); rows.shift(); }      // gone as soon as it is behind Łatka, so nothing ever hides her from the camera
  for (const c of chunks) if (-c.position.z + CL < G.dist - 8) c.position.z -= NC * CL;
  // ---- collisions
  if (play) {
    const lane = clamp(Math.round(Pl.x / LANE) + 1, 0, 2);
    for (const row of rows) {
      if (row.z > G.dist + 1) break; if (row.hit || row.z < prevDist - 0.3 || row.z > G.dist + 0.35) continue;
      const c = row.cells[lane]; if (!c) continue;
      if (c === 'full' || (c === 'low' && Pl.y < 0.36) || (c === 'high' && !sliding)) { stumble(row); break; }
    }
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i]; if (it.z < G.dist - 3) { if (it.mesh) it.mesh.visible = false; items.splice(i, 1); continue; }
      if (Math.abs(it.z - G.dist) < 0.75 && Math.abs(it.x - Pl.x) < 0.75 && Math.abs(it.y - (Pl.y + 0.45)) < 0.85) {
        if (it.kind === 'bone') { G.bones++; G.score += 10; G.gap -= 0.13; G.streak = G.streakT > 0 ? G.streak + 1 : 0; G.streakT = 0.45; audio.coin(G.streak); sparkle(it.x, it.y, -it.z, GOLD, 5); }
        else { G.score += 100; G.gap -= 2; audio.pickup(it.kind); pick(T('r_' + it.kind)); sparkle(it.x, it.y, -it.z, relicMeshes[it.kind].userData.col, 40); it.mesh.visible = false; }
        items.splice(i, 1);
      }
    }
    G.streakT -= dt;
    G.gap -= dt * 0.27;
    if (G.gap <= 2.3) catchMila();
  }
  // ---- stage transition / endings
  if (G.mode === 'catch') {
    G.ct += dt; const last = G.stage >= 2;
    if (!last) { G.gap = lerp(2.3, STAGE_GAP[G.stage + 1], sm(0.5, 2.6, G.ct)); if (G.ct > 2.7) { G.stage++; G.stageT = 0; G.mode = 'play'; place(STREETS[G.stage]); } }
    else if (G.ct > 0.9) { G.mode = 'win'; G.endT = 0; audio.fanfare(); }
  }
  if (G.mode === 'win' || G.mode === 'over') {
    G.endT += dt; if (G.mode === 'over') G.gap += dt * 9; else G.gap += (2.6 - G.gap) * Math.min(1, dt * 3);
    if (G.endT > (G.mode === 'win' ? 3.4 : 1.7) && $('end').classList.contains('hidden')) finish(G.mode === 'win');
  }
  // ---- Mila: follows the safe lane, hops and ducks like a pro
  const mz = G.dist + 2.3 + (G.gap - 2.3) * 0.5,          // drawn at half the real lead, so she stays in sight
     sitM = G.mode === 'win' || G.mode === 'title' ? 1 : 0;
  if (moving) {
    for (const row of rows) { if (row.z < mz - 0.3) continue; Mi.lane = row.safe; const c = row.cells[row.safe], dz = row.z - mz;
      if (c === 'low' && dz < G.speed * 0.27 && Mi.y === 0) Mi.vy = 5.6; Mi.crouch = c === 'high' && dz < G.speed * 0.3 ? 1 : 0; break; }
  }
  Mi.x += (LX[Mi.lane] - Mi.x) * Math.min(1, dt * 9);
  if (Mi.vy !== 0 || Mi.y > 0) { Mi.vy -= 19 * dt; Mi.y += Mi.vy * dt; if (Mi.y <= 0) { Mi.y = 0; Mi.vy = 0; } }
  if (G.mode === 'title') { cat.root.position.set(-1.0, 0, -G.dist - 1.3); cat.root.rotation.y = Math.PI + 0.5; cat.root.visible = true; }
  else { cat.root.position.set(Mi.x, Mi.y, -mz); cat.root.rotation.y = sitM ? 0 : Math.PI; cat.root.visible = G.gap < 75; }
  cat.animate(dt, { speed: sitM ? 0 : Math.max(G.speed, moving ? 8 : G.mode === 'over' ? 9 : 0), grounded: Mi.y === 0, vy: Mi.vy, sit: sitM, crouch: Mi.crouch });
  // ---- Łatka
  const sitD = G.mode === 'title' || ((G.mode === 'win' || G.mode === 'over') && G.speed < 1.5) ? 1 : 0;
  dog.root.position.set(Pl.x, Pl.y, -G.dist); dog.root.rotation.y = Math.PI; dog.root.rotation.z = (LX[Pl.lane] - Pl.x) * 0.22;
  dog.root.visible = G.inv <= 0 || Math.floor(G.t * 14) % 2 === 0;
  dog.animate(dt, { speed: G.speed, grounded: Pl.grounded, vy: Pl.vy, sit: sitD, slide: sliding ? 1 : 0, happy: G.mode === 'win' ? 1 : 0.15, pant: true });
  if (sliding && Math.random() < dt * 40) pAlpha.spawn(Pl.x + (Math.random() - 0.5) * 0.4, 0.08, -G.dist + 0.3, (Math.random() - 0.5), 0.6, 1.5, 0.5, 0.2, 0.8, 0.78, 0.74, 0.66, 0.35, 0, 1.5);
  if (moving && Pl.grounded && !sliding && Math.random() < dt * 9) pAlpha.spawn(Pl.x + (Math.random() - 0.5) * 0.3, 0.06, -G.dist + 0.35, (Math.random() - 0.5) * 0.6, 0.5, 1.2, 0.45, 0.14, 0.55, 0.78, 0.74, 0.66, 0.22, 0, 1.5);
  // ---- pickups
  let n = 0;
  for (const it of items) {
    if (it.z > G.dist + 120) continue;
    if (it.kind === 'bone') { if (n < BONES) { dummy.position.set(it.x, it.y + Math.sin(G.t * 3 + it.z) * 0.05, -it.z); dummy.rotation.set(0.3, G.t * 3.2 + it.z * 0.5, 0.5); dummy.scale.setScalar(1.55); dummy.updateMatrix(); boneMesh.setMatrixAt(n++, dummy.matrix); } }
    else { const m = it.mesh || (it.mesh = relicMeshes[it.kind]); m.visible = true; m.position.set(it.x, it.y + Math.sin(G.t * 2.5) * 0.08, -it.z); m.rotation.y = G.t * 2.4; m.children[1].rotation.x = G.t * 1.7; }
  }
  boneMesh.count = n; boneMesh.instanceMatrix.needsUpdate = true;
  pAdd.update(dt); pAlpha.update(dt);
  // ---- camera
  G.blend = Math.min(1, G.blend + dt * (G.mode === 'title' ? -3 : 0.9)); if (G.mode === 'title') G.blend = 0;
  const k = sm(0, 1, G.blend), pz = -G.dist, wide = camera.aspect < 1 ? 1 : 0, end = G.mode === 'win' ? sm(0.2, 2.2, G.endT) : 0;
  G.shake = Math.max(0, G.shake - dt * 1.8); const sh = G.shake * G.shake * 0.25;
  camP.set(lerp(2.3, Pl.x * 0.6, k) + end * 2.6, lerp(1.25, 2.45 + wide * 0.5 + Pl.y * 0.3, k) - end * 1.1, pz + lerp(-3.4 - wide * 2.4, 4.4 + wide * 0.8, k) - end * 4.5);
  camL.set(lerp(-0.2, Pl.x * 0.8, k), lerp(-0.25 - wide * 0.9, 1.05 - wide * 0.8, k) - end * 0.4, pz + lerp(-1.5, -7.5, k) + end * 6);
  camera.position.copy(camP); camera.position.x += (Math.random() - 0.5) * sh; camera.position.y += (Math.random() - 0.5) * sh; camera.lookAt(camL);
  const fov = 62 + (wide ? 8 : 0) + clamp((G.speed - 9) * 1.3, 0, 9); if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 3); camera.updateProjectionMatrix(); }
  updateMood(dt);
  // ---- HUD and sound
  hud(); if (hintT > 0) { hintT -= dt; if (hintT <= 0) $('hint').style.opacity = 0; } if (pickT > 0) { pickT -= dt; if (pickT <= 0) $('pick').style.opacity = 0; }
  audio.musicRun({ play: moving, soft: G.mode === 'win', stage: G.stage });
  if (audio.on && moving && Pl.grounded && !sliding) { stepAcc -= dt * (2 + G.speed * 0.75); if (stepAcc <= 0) { stepAcc = 1; audio.step(false); } }
}
let stepAcc = 0; const camP = new THREE.Vector3(), camL = new THREE.Vector3();
function catchMila() {
  const pts = 500 * (G.stage + 1); G.score += pts; G.mode = 'catch'; G.ct = 0; G.gap = 2.3;
  audio.bark(); dog.bark(); audio.meow(1.25); setTimeout(() => audio.hiss(), 250); Mi.vy = 7.2; Mi.y = 0.01;
  pick(T('caught', pts)); if (G.stage < 2) setTimeout(() => { if (G.mode === 'catch') pick(T('away')); }, 1300);
  sparkle(Mi.x, 0.6, -(G.dist + 2.3), GOLD, 50); clearAhead(G.dist, G.dist + 62);
}
// plays the level by itself (used for testing): heads for the safe lane and jumps / slides when needed
function botPlay() {
  let prev = null;
  for (const row of rows) {
    if (row.z < G.dist - 0.4) { prev = row; continue; }
    if (!prev || G.dist > prev.z + 0.9) { if (Pl.lane < row.safe) act('right'); else if (Pl.lane > row.safe) act('left'); }
    const c = row.cells[row.safe], dz = row.z - G.dist;
    if (Pl.lane === row.safe && Pl.grounded) { if (c === 'low' && dz < G.speed * 0.3 && dz > 0.3) act('up'); if (c === 'high' && dz < G.speed * 0.26 && Pl.slide <= 0.2) act('down'); }
    break;
  }
}

// ------------------------------------------------------------------ boot
let last = 0, fpsAcc = 0, fpsN = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
  if (document.hidden) return;
  step(dt); renderer.render(scene, camera);
  fpsAcc += dt; fpsN++; if (fpsAcc > 2.5) { if (fpsAcc / fpsN > 0.03 && pixelRatio > 0.7) { pixelRatio = Math.max(0.7, pixelRatio * 0.85); resize(); } fpsAcc = 0; fpsN = 0; }
}
async function boot() {
  document.body.classList.add('run'); if (isTouch) document.body.classList.add('touch');
  await new Promise((r) => setTimeout(r, 30));
  tex = createTextures();
  buildScenery(); buildProtos(); buildPickups();
  dog = buildDog(tex, {}); scene.add(dog.root);
  cat = buildCat({ scale: 1.45 }); scene.add(cat.root);
  pAdd = new Particles(500, true); pAlpha = new Particles(400, false); scene.add(pAdd.mesh); scene.add(pAlpha.mesh);
  reset(); G.mode = 'title'; applyLang();
  $('start').addEventListener('click', startGame);
  $('lang').addEventListener('click', () => { lang = lang === 'pl' ? 'en' : 'pl'; applyLang(); });
  $('again').addEventListener('click', () => { const bot = G.bot; toTitle(); G.bot = bot; startGame(); });
  $('menu').addEventListener('click', toTitle);
  // put every obstacle on the graphics card once, behind the loading screen
  const warm = Object.keys(PROTO).map((k) => { const m = getObj(k); m.position.set(0, 0, -8); return m; });
  step(0.016); renderer.compile(scene, camera); renderer.render(scene, camera);
  for (const m of warm) { m.visible = false; pools[m.userData.kind].push(m); }
  window.__run = { G, Pl, Mi, rows, items, gen, audio, step, startGame, reset, toTitle, renderer, scene, camera, act,
    sim: (secs, dt = 1 / 60) => { for (let t = 0; t < secs; t += dt) step(dt); renderer.render(scene, camera); return { mode: G.mode, dist: +G.dist.toFixed(1), gap: +G.gap.toFixed(1), stage: G.stage, lives: G.lives, score: Math.floor(G.score), bones: G.bones, t: +G.t.toFixed(1) }; } };
  $('title').classList.remove('hidden'); $('loading').style.opacity = 0; setTimeout(() => $('loading').remove(), 1100);
  last = performance.now(); requestAnimationFrame(frame);
}
boot().catch((e) => { console.error(e); $('loading').textContent = 'Błąd: ' + e.message; });
