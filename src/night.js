// Level 3 – "Nocna wyprawa po szczeniaki": a night-time sneak through the neighbours' gardens. Five puppies have
// wandered off; Łatka finds them by their yapping and leads them home to the kennel without waking anybody.
// Seen from above. Sensor lamps, a patrolling mower's headlight and a bedroom window fill the "noticed" meter while
// Łatka stands in their light (bushes hide her); sprinklers and squeaky toys add to it in one go.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createTextures, sm, lerp, clamp, rng, fbm } from './textures.js';
import { buildDog } from './dog.js';
import { HQ, addFur, DOG_FUR, CAT_FUR } from './fur.js';
import { buildCat } from './cat.js';
import { Particles, fogUniforms, glowMaterial } from './fx.js';
import { AudioSys } from './audio.js';
import { makeUniforms, patchMat, plantTrees, leafBlob } from './real.js';

const $ = (id) => document.getElementById(id);
const TXT = {
  pl: {
    over: 'Poziom 3', title: 'Nocna wyprawa po szczeniaki', start: 'W drogę!', again: 'Jeszcze raz', menu: 'Menu',
    story: 'Pięć szczeniaków wymknęło się nocą do ogrodów sąsiadów. Znajdź je po szczekaniu i odprowadź do budy, zanim zacznie świtać — i nie obudź nikogo!',
    keys: 'WASD / strzałki — ruch · H lub Spacja — hau! (szczeniak odpowie) · M — muzyka',
    keys_t: 'Lewy kciuk — ruch · przycisk Hau! — zawołaj szczeniaka',
    dawn: 'Do świtu', count: (f, h) => `Szczeniaki w budzie: ${h}/5`, sub: (n) => (n ? `idą za tobą: ${n}` : 'nasłuchuj szczekania'),
    h_start: 'Szczeniaki piszczą w ogrodach. Zaszczekaj (H), a najbliższy odpowie. Mila na płocie patrzy w jego stronę.',
    h_light: 'Unikaj światła lamp! W krzakach nikt cię nie zobaczy.', h_found: 'Jest! Teraz odprowadź go do budy.', h_home: 'Bezpieczny w budzie!',
    h_water: 'Brrr! Zraszacz!', h_toy: 'Piiiisk! Gumowa kaczka!', h_bush: 'Ukryta w krzakach', h_all: 'Masz wszystkie! Wracaj do budy.',
    caught: (o) => `„Kto tam?!” — ${o}. Uciekaj do furtki!`, garden: 'Ogród',
    winT: 'Wszystkie szczeniaki w budzie!', winX: (t, s) => `Nikt się nie obudził na dobre. Do świtu zostało ${t}. ${s}`,
    loseT: 'Świta…', loseX: (n) => `Sąsiedzi wstają, a w budzie jest dopiero ${n} z 5 szczeniaków. Spróbuj jeszcze raz!`,
  },
  en: {
    over: 'Level 3', title: 'The night puppy hunt', start: 'Off we go!', again: 'Again', menu: 'Menu',
    story: 'Five puppies slipped out at night into the neighbours\' gardens. Find them by their yapping and lead them back to the kennel before dawn — and do not wake anyone!',
    keys: 'WASD / arrows — move · H or Space — woof! (a puppy answers) · M — music',
    keys_t: 'Left thumb — move · Woof button — call a puppy',
    dawn: 'Until dawn', count: (f, h) => `Puppies in the kennel: ${h}/5`, sub: (n) => (n ? `following you: ${n}` : 'listen for yapping'),
    h_start: 'Puppies are whining in the gardens. Bark (H) and the nearest one answers. Mila on the fence looks its way.',
    h_light: 'Stay out of the lamp light! Nobody sees you in the bushes.', h_found: 'There! Now lead it back to the kennel.', h_home: 'Safe in the kennel!',
    h_water: 'Brrr! A sprinkler!', h_toy: 'Squeeeak! A rubber duck!', h_bush: 'Hidden in the bushes', h_all: 'You have them all! Back to the kennel.',
    caught: (o) => `"Who is there?!" — ${o}. Run for the gate!`, garden: 'Garden of',
    winT: 'All the puppies are in the kennel!', winX: (t, s) => `Nobody woke up for good. ${t} left until dawn. ${s}`,
    loseT: 'Dawn is breaking…', loseX: (n) => `The neighbours are getting up and only ${n} of 5 puppies are in the kennel. Try again!`,
  },
};
let lang = 'pl';
const isTouch = matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && matchMedia('(hover: none)').matches);
const T = (k, ...a) => { const v = (isTouch && TXT[lang][k + '_t']) || TXT[lang][k]; return typeof v === 'function' ? v(...a) : v; };

// ------------------------------------------------------------------ renderer
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
let pixelRatio = Math.min(window.devicePixelRatio || 1, 1.6);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.45;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x050814);
const camera = new THREE.PerspectiveCamera(46, 1, 0.5, 300);
// the picture goes through a soft glow around everything bright and a gentle darkening towards the corners
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 }));
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.65, 0.82); composer.addPass(bloom);
composer.addPass(new ShaderPass({ uniforms: { tDiffuse: { value: null } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); vec2 q = vUv - 0.5; float v = 1.0 - dot(q, q) * 1.15; c.rgb *= v * v; float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722)); c.rgb = mix(vec3(l), c.rgb, 1.12) * vec3(0.96, 1.0, 1.06); gl_FragColor = vec4(max(c.rgb, 0.0), 1.0); }' }));
composer.addPass(new OutputPass());
const draw = () => composer.render();
function resize() { const w = Math.max(2, window.innerWidth), h = Math.max(2, window.innerHeight); camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setPixelRatio(pixelRatio); renderer.setSize(w, h, false); composer.setPixelRatio(pixelRatio); composer.setSize(w, h); }
window.addEventListener('resize', resize); resize();

// ------------------------------------------------------------------ state
const NIGHT = 480;                                    // seconds until dawn
const HOME = { x: 0, z: 9.2 }, START = { x: 0, z: 5.6 };
const G = { mode: 'load', t: 0, time: 0, alert: 0, seen: 0, stun: 0, wet: 0, fade: 0, home: 0, barkCd: 0, hidden: false, cur: -1, hints: new Set(), noDetect: false };
const P = { x: START.x, z: START.z, yaw: Math.PI, speed: 0 };
const input = { x: 0, y: 0 }, keys = {};
const audio = new AudioSys();
let dog, cat, tex, pAdd, pAlpha, moon, RU;
const TREES = [], SMOKE = [], MOTHS = [], bats = []; let hog, tvGlow;
const boxes = [], circles = [], bushes = [], sectors = [], toys = [], windows = [], mowers = [], puppies = [], rings = [], trail = [], arrows = []; let glow;

// ------------------------------------------------------------------ geometry helpers (vertex-coloured, merged)
const worldMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93, side: THREE.DoubleSide });
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
  mesh(mat = worldMat) { const m = new THREE.Mesh(mergeGeometries(this.g), mat); m.castShadow = true; m.receiveShadow = true; this.g = []; return m; }
}
function roofGeo(w, h, d) {
  const a = w / 2, b = d / 2, p = [-a, 0, -b, 0, h, -b, 0, h, b, -a, 0, -b, 0, h, b, -a, 0, b, a, 0, -b, a, 0, b, 0, h, b, a, 0, -b, 0, h, b, 0, h, -b, -a, 0, -b, a, 0, -b, 0, h, -b, -a, 0, b, 0, h, b, a, 0, b];
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.computeVertexNormals();
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(p.length / 3 * 2), 2)); return g;
}
// a gable roof with real tiles: ridge along z before the turn, uv's that run along the eaves and up the slope
let tileT;
function tiledRoof(w, h, d, color, x, y, z, ry) {
  if (!tileT) tileT = canvasTex(256, 256, (c, W, H) => {
    c.fillStyle = '#8a8a8a'; c.fillRect(0, 0, W, H); const q = rng(7);
    for (let row = 0; row < 8; row++) for (let i = -1; i < 8; i++) { const x0 = (i + (row % 2) * 0.5) * 32, y0 = row * 32, v = 150 + q() * 70; const g = c.createLinearGradient(0, y0, 0, y0 + 32); g.addColorStop(0, `rgb(${v * 0.45},${v * 0.45},${v * 0.45})`); g.addColorStop(0.25, `rgb(${v},${v},${v})`); g.addColorStop(1, `rgb(${v * 0.82},${v * 0.82},${v * 0.82})`); c.fillStyle = g; c.beginPath(); c.moveTo(x0 + 1, y0); c.lineTo(x0 + 31, y0); c.lineTo(x0 + 31, y0 + 24); c.quadraticCurveTo(x0 + 16, y0 + 36, x0 + 1, y0 + 24); c.closePath(); c.fill(); }
  });
  const a = w / 2, b = d / 2, sl = Math.hypot(a, h), U = d / 1.6, V = sl / 1.6, p = [], uv = [];
  for (const sd of [-1, 1]) { const q = [[sd * a, 0, -b, 0, 0], [0, h, -b, 0, V], [0, h, b, U, V], [sd * a, 0, b, U, 0]], o = sd < 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]; for (const i of o) { p.push(q[i][0], q[i][1], q[i][2]); uv.push(q[i][3], q[i][4]); } }
  for (const sz of [-1, 1]) { const q = sz < 0 ? [[-a, 0, -b], [a, 0, -b], [0, h, -b]] : [[-a, 0, b], [0, h, b], [a, 0, b]]; for (const v of q) { p.push(...v); uv.push(0.02, 0.4); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, patchMat(new THREE.MeshStandardMaterial({ map: tileT, bumpMap: tileT, bumpScale: 1.4, color, roughness: 0.82, side: THREE.DoubleSide }), RU, { cloud: 0.32, cs: 0.012 }));
  m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; scene.add(m); return m;
}
function canvasTex(w, h, draw, rx = 1, ry = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8; return t;
}
// a flat pie slice on the ground, pointing along +z: used for every beam of light and jet of water
function sectorMesh(r, half, mat) {
  const p = [0, 0, 0], c = [1.5, 1.5, 1.5], idx = [], n = 16;
  for (let i = 0; i <= n; i++) { const a = -half + (2 * half * i) / n, e = 0.4 + 0.25 * Math.cos((i / n - 0.5) * Math.PI); p.push(Math.sin(a) * r, 0, Math.cos(a) * r); c.push(e, e, e); if (i < n) idx.push(0, i + 1, i + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); g.setIndex(idx);
  const m = new THREE.Mesh(g, mat); m.position.y = 0.23; m.renderOrder = 5; return m;
}
const lightM = new THREE.MeshBasicMaterial({ color: 0xffe08a, vertexColors: true, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
const waterM = new THREE.MeshBasicMaterial({ color: 0x8fd4ff, vertexColors: true, transparent: true, opacity: 0.34, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
const glowM = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.6, 1.5) });

// ------------------------------------------------------------------ the neighbourhood
// Five gardens around a lane. u runs across a garden (0..1), v from its gate (0) to the house at the back (1).
const GARD = [
  { owner: 'Dziadek Lesław', of: 'Dziadka Lesława', x0: -33, x1: -11, z0: -25, z1: -3, gx: -22, north: true },
  { owner: 'Babcia Małgosia', of: 'Babci Małgosi', x0: -11, x1: 11, z0: -25, z1: -3, gx: 0, north: true },
  { owner: 'dr Alicja', of: 'dr. Alicji', x0: 11, x1: 33, z0: -25, z1: -3, gx: 22, north: true },
  { owner: 'Agata', of: 'Agaty', x0: -33, x1: -9, z0: 4, z1: 26, gx: -21, north: false },
  { owner: 'Tomek', of: 'Tomka', x0: 9, x1: 33, z0: 4, z1: 26, gx: 21, north: false },
];
const at = (g, u, v) => ({ x: lerp(g.x0, g.x1, u), z: g.north ? lerp(g.z1, g.z0, v) : lerp(g.z0, g.z1, v) });
const fwd = (g) => (g.north ? Math.PI : 0);            // the direction from the gate into the garden

function buildWorld() {
  const b = new Builder(11), r = b.r;
  RU = makeUniforms(); patchMat(worldMat, RU, { grain: 0.4, cloud: 0.32, cs: 0.012 });
  // ground: grass everywhere, a gravel lane between the two rows of gardens
  const grassT = canvasTex(256, 256, (c, w, h) => {
    const im = c.createImageData(w, h), d = im.data, q = rng(4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const n = fbm(x * 0.05, y * 0.05, 4, 9), k = 0.72 + n * 0.4 + q() * 0.2, i = (y * w + x) * 4; d[i] = 70 * k; d[i + 1] = 124 * k; d[i + 2] = 52 * k; d[i + 3] = 255; }
    c.putImageData(im, 0, 0);
  }, 26, 20);
  const laneT = canvasTex(256, 256, (c, w, h) => {
    const im = c.createImageData(w, h), d = im.data, q = rng(3);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = 112 + fbm(x * 0.09, y * 0.09, 4, 5) * 30 + q() * 30, i = (y * w + x) * 4; d[i] = v * 1.04; d[i + 1] = v * 0.98; d[i + 2] = v * 0.9; d[i + 3] = 255; }
    c.putImageData(im, 0, 0);
  }, 22, 2);
  const flat = (w, d, x, z, t, y) => { const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, patchMat(new THREE.MeshStandardMaterial({ map: t, roughness: 1 }), RU, { grain: 0.75, cloud: 0.32, cs: 0.012 })); m.position.set(x, y, z); m.receiveShadow = true; scene.add(m); return m; };
  flat(170, 130, 0, 0, grassT, 0); flat(96, 6.2, 0, 0.5, laneT, 0.012);
  boxes.push({ x0: -60, x1: -40, z0: -40, z1: 40 }, { x0: 40, x1: 60, z0: -40, z1: 40 }, { x0: -60, x1: 60, z0: -40, z1: -27.5 }, { x0: -60, x1: 60, z0: 28.5, z1: 40 });      // the edge of the map
  for (const x of [-40, 40]) for (let z = -27; z < 29; z += 1.6) b.cone(0.75 + r() * 0.2, 2.6 + r() * 1.2, x, 0, z, z % 3 ? 0x1f4a2a : 0x265832, 8);
  for (let x = -38; x < 39; x += 2.2) { for (const sd of [-1, 1]) { const w = r(), h = 6 + r() * 4, z = sd < 0 ? -30 - r() * 3 : 31 + r() * 3; r(); TREES.push([x + (w - 0.5) * 1.2, 0, z, (x / 2.2 | 0) % 4 === 0 ? 2 : 1, h / 12]); } }

  const fence = (xa, za, xb, zb) => {       // axis-aligned run of picket fence, with its collision box
    const len = Math.hypot(xb - xa, zb - za), alongX = Math.abs(xb - xa) > Math.abs(zb - za), n = Math.max(1, Math.round(len / 0.3));
    for (let i = 0; i <= n; i++) { const k = i / n; b.box(alongX ? 0.14 : 0.04, i % 4 === 0 ? 1.25 : 1.05, alongX ? 0.04 : 0.14, lerp(xa, xb, k), 0.05, lerp(za, zb, k), i % 4 === 0 ? 0x3a2820 : 0x4a342a, 0, 0.1); }
    for (const y of [0.35, 0.85]) b.box(alongX ? len : 0.06, 0.07, alongX ? 0.06 : len, (xa + xb) / 2, y, (za + zb) / 2, 0x3e2b22);
    boxes.push({ x0: Math.min(xa, xb) - 0.12, x1: Math.max(xa, xb) + 0.12, z0: Math.min(za, zb) - 0.12, z1: Math.max(za, zb) + 0.12 });
  };
  const WALLS = [0xe9dcc0, 0xf1ede2, 0xe6c98f, 0xd9c0a4, 0xcfd8cf], ROOFS = [0x8a3528, 0x6f3a2c, 0x4a4b52, 0x7a3a2c, 0x55565c];
  GARD.forEach((g, gi) => {
    const i = 0.07, zg = g.north ? g.z1 : g.z0, zb = g.north ? g.z0 : g.z1, s = g.north ? -1 : 1;
    fence(g.x0 + i, zb - s * i, g.x1 - i, zb - s * i); fence(g.x0 + i, g.z0 + i, g.x0 + i, g.z1 - i); fence(g.x1 - i, g.z0 + i, g.x1 - i, g.z1 - i);
    fence(g.x0 + i, zg + s * i, g.gx - 1.6, zg + s * i); fence(g.gx + 1.6, zg + s * i, g.x1 - i, zg + s * i);                    // a 3.2 m gateway
    for (const x of [g.gx - 1.6, g.gx + 1.6]) b.box(0.22, 1.5, 0.22, x, 0, zg + s * i, 0x5a4a3c);
    // the house at the back of the plot; one bedroom window that lights up when somebody wakes
    const hc = at(g, 0.5, 0.84), hw = 10, hd = 5.6, face = hc.z - s * hd / 2;
    b.box(hw + 0.4, 0.3, hd + 0.4, hc.x, 0, hc.z, 0x7d786f); b.box(hw, 3.0, hd, hc.x, 0.3, hc.z, WALLS[gi], 0, 0.03); tiledRoof(hd + 1.2, 2.4, hw + 1.2, new THREE.Color(ROOFS[gi]).multiplyScalar(1.9), hc.x, 3.3, hc.z, Math.PI / 2);
    b.box(0.6, 1.1, 0.6, hc.x + 2.5, 5.0, hc.z, 0x7a4a3c);
    for (const dx of [-3.2, 3.2]) { b.box(1.3, 1.3, 0.08, hc.x + dx, 1.3, face - s * 0.02, 0xf4f1ea, 0, 0); b.box(1.1, 1.1, 0.1, hc.x + dx, 1.4, face - s * 0.04, 0x1c2836, 0, 0); }
    b.box(1.0, 2.0, 0.1, hc.x, 0.3, face - s * 0.03, 0x5b3b28, 0, 0); b.box(1.25, 2.15, 0.06, hc.x, 0.3, face - s * 0.01, 0xf4f1ea, 0, 0); b.box(1.8, 0.2, 0.9, hc.x, 0, face - s * 0.55, 0x8c887f, 0, 0.03);
    for (const dx of [-3.2, 3.2]) { for (const q of [-0.84, 0.84]) b.box(0.34, 1.3, 0.07, hc.x + dx + q, 1.3, face - s * 0.04, [0x2f5d4a, 0x6a2f2a, 0x2c4a6a, 0x5a4a2a, 0x3a3f46][gi], 0, 0.03); b.box(1.5, 0.2, 0.28, hc.x + dx, 1.08, face - s * 0.2, 0x5a3b28, 0, 0.03); for (let k = 0; k < 6; k++) b.blob(0.11, hc.x + dx - 0.6 + k * 0.24, 1.36, face - s * 0.2, [0xe85d8f, 0xf2f2f2, 0xd8342c][k % 3]); }
    b.box(hw + 1.3, 0.12, 0.14, hc.x, 3.22, face - s * 0.55, 0x4a4d52, 0, 0);
    { const lp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), glowM); lp.position.set(hc.x + 0.95, 2.45, face - s * 0.14); scene.add(lp); const gl = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 5.5).rotateX(-Math.PI / 2), glowMaterial(0xffb060, 0.2)); gl.position.set(hc.x + 0.95, 0.21, face - s * 1.5); gl.renderOrder = 4; scene.add(gl); }
    boxes.push({ x0: hc.x - hw / 2 - 0.2, x1: hc.x + hw / 2 + 0.2, z0: hc.z - hd / 2 - 0.2, z1: hc.z + hd / 2 + 0.2 });
    const wg = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ color: 0x000000 })); wg.position.set(hc.x - 3.2, 1.95, face - s * 0.1); if (g.north) wg.rotation.y = 0; else wg.rotation.y = Math.PI; scene.add(wg); g.win = wg; g.wake = 0;
    // a path from the gate to the door, and the owner's name on the gatepost
    b.box(1.3, 0.03, Math.abs(face - zg) - 0.4, g.gx, 0, (face + zg) / 2, 0x8c887f, 0, 0.04);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.06), new THREE.MeshBasicMaterial({ map: canvasTex(416, 100, (c, w, h) => { c.fillStyle = '#f4f4f0'; c.fillRect(0, 0, w, h); c.fillStyle = '#1d4e9e'; c.fillRect(6, 6, w - 12, h - 12); c.fillStyle = '#f4f4f0'; c.font = 'bold 38px Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Ogród ' + g.of, w / 2, h / 2 + 2, w - 30); }) }));
    sign.rotation.x = -Math.PI / 2; sign.position.set(g.gx, 0.05, zg - s * 1.7); scene.add(sign);
    g.gate = { x: g.gx, z: zg + s * 1.2 }; g.out = { x: g.gx, z: zg - s * 1.4 };
  });
  // Łatka's own yard with the kennel
  b.box(1.9, 1.15, 2.2, HOME.x, 0, HOME.z + 1.4, 0xb5653a); b.add(roofGeo(2.5, 0.9, 2.7), 0x8a2f24, HOME.x, 1.15, HOME.z + 1.4, 0, 0.04); b.box(0.8, 0.8, 0.06, HOME.x, 0, HOME.z + 0.28, 0x1a1210, 0, 0);
  boxes.push({ x0: HOME.x - 1.05, x1: HOME.x + 1.05, z0: HOME.z + 0.35, z1: HOME.z + 2.6 });
  b.box(0.9, 0.1, 0.9, HOME.x - 1.9, 0, HOME.z + 0.2, 0xd8d0c0); b.cyl(0.32, 0.24, 0.16, HOME.x - 1.9, 0.1, HOME.z + 0.2, 0xc7352b, 12);          // a rug and a bowl
  for (let x = -8; x <= 8; x += 1.25) { b.add(leafBlob(0.85, 0.9, x + 20, 1), 0x2a5a2f, x, 0.7, 14.2, r() * 3, 0.12); } boxes.push({ x0: -9, x1: 9, z0: 13.6, z1: 15 });
  const home = new THREE.Mesh(new THREE.RingGeometry(2.2, 2.45, 40), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); home.rotation.x = -Math.PI / 2; home.position.set(HOME.x, 0.22, HOME.z - 0.4); scene.add(home); G.homeRing = home;
  { const pm = new THREE.MeshStandardMaterial({ color: 0x1a202c, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.6 });
    for (const [px, pz, pr] of [[-27, 1.6, 1.3], [-14.5, -0.6, 0.9], [-9, 2.0, 1.1], [3, 0.2, 1.5], [9.5, 2.3, 0.8], [20, -0.9, 1.2], [27, 1.4, 1.0], [-35, -0.4, 1.1]]) { const g = new THREE.CircleGeometry(pr, 22), q = g.attributes.position; for (let i = 1; i < q.count; i++) { const a = Math.atan2(q.getY(i), q.getX(i)), k = 0.7 + 0.5 * fbm(Math.cos(a) * 1.3 + px, Math.sin(a) * 1.3 + pz, 2, 3); q.setXY(i, q.getX(i) * k * 1.5, q.getY(i) * k * 0.8); } g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, pm); m.position.set(px, 0.02, pz); m.receiveShadow = true; scene.add(m); } }
  for (const x of [-30, -12, 6, 24]) { b.cyl(0.05, 0.07, 4.2, x, 0, 3.3, 0x6d7278); const l = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), glowM); l.position.set(x, 4.2, 3.3); scene.add(l); const pl = new THREE.PointLight(0xffc27a, 34, 15, 1.7); pl.position.set(x, 3.9, 3.3); scene.add(pl); }

  // ---- what stands in each garden
  const tree = (x, z, sc = 1) => { r(); r(); r(); r(); r(); r(); TREES.push([x, 0, z, 0, sc * 0.5]); circles.push({ x, z, r: 0.35 * sc }); };
  const bush = (g, u, v) => { const p = at(g, u, v); for (let k = 0; k < 6; k++) b.add(leafBlob(0.6 + r() * 0.25, 0.8, k + 2, 1), k % 2 ? 0x2c5f31 : 0x366f38, p.x + (r() - 0.5) * 1.4, 0.45 + r() * 0.2, p.z + (r() - 0.5) * 1.4, r() * 3, 0.12); bushes.push({ x: p.x, z: p.z, r: 1.25 }); };
  const lamp = (g, u, v, ang, amp, sp, rad = 7.5, half = 0.42) => {
    const p = at(g, u, v); b.cyl(0.05, 0.07, 2.6, p.x, 0, p.z, 0x6d7278); b.box(0.3, 0.14, 0.3, p.x, 2.6, p.z, 0x3a3d42); circles.push({ x: p.x, z: p.z, r: 0.2 });
    const m = sectorMesh(rad, half, lightM); m.position.set(p.x, 0.23, p.z); scene.add(m); const hd = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), glowM); hd.position.set(p.x, 2.55, p.z); scene.add(hd);
    sectors.push({ kind: 'lamp', x: p.x, z: p.z, base: fwd(g) + ang, amp, sp, ph: r() * 6, a: 0, half, r: rad, m, gi: GARD.indexOf(g) });
  };
  const sprinkler = (g, u, v, sp, rad = 5.6) => {
    const p = at(g, u, v); b.cyl(0.07, 0.1, 0.22, p.x, 0, p.z, 0x8a8f96);
    const m = sectorMesh(rad, 0.17, waterM); m.position.set(p.x, 0.24, p.z); scene.add(m);
    sectors.push({ kind: 'water', x: p.x, z: p.z, base: r() * 6, amp: 0, sp, ph: 0, a: 0, half: 0.17, r: rad, m, gi: GARD.indexOf(g) });
  };
  const mower = (g, pts, sp = 1.7) => {
    const grp = new THREE.Group(), mb = new Builder(77); mb.box(0.8, 0.2, 0.95, 0, 0.07, 0, 0xf07a1a); mb.box(0.64, 0.13, 0.64, 0, 0.27, -0.05, 0xf59a3a); mb.box(0.84, 0.07, 1.0, 0, 0.03, 0, 0x2a2a2e); grp.add(mb.mesh());
    const beam = sectorMesh(5.2, 0.5, lightM); beam.position.set(0, 0.23, 0.4); grp.add(beam); const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), glowM); eye.position.set(0, 0.3, 0.46); grp.add(eye); scene.add(grp);
    const path = pts.map(([u, v]) => at(g, u, v)); grp.position.set(path[0].x, 0, path[0].z);
    const s = { kind: 'mower', x: path[0].x, z: path[0].z, a: 0, half: 0.5, r: 5.4, gi: GARD.indexOf(g) }; sectors.push(s); mowers.push({ grp, path, i: 1, sp, s });
  };
  const toyG = new THREE.SphereGeometry(0.2, 10, 8), toyM = new THREE.MeshStandardMaterial({ color: 0xffd21f, emissive: 0x6a5200, roughness: 0.5 }), beakM = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.5 });
  const toy = (g, u, v) => { const p = at(g, u, v), d = new THREE.Group(), body = new THREE.Mesh(toyG, toyM), head = new THREE.Mesh(toyG, toyM), beak = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.14, 6), beakM); body.scale.set(1, 0.8, 1.25); body.position.y = 0.16; head.scale.setScalar(0.62); head.position.set(0, 0.36, 0.14); beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.35, 0.3); d.add(body, head, beak); d.position.set(p.x, 0, p.z); d.rotation.y = r() * 6; d.traverse((o) => { o.castShadow = true; }); scene.add(d); toys.push({ x: p.x, z: p.z, d, cd: 0 }); };
  const windowLight = (g, u0, u1, v0, v1, period, phase) => {
    const a = at(g, u0, v0), c = at(g, u1, v1), w = Math.abs(c.x - a.x), d = Math.abs(c.z - a.z), geo = new THREE.PlaneGeometry(w, d); geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); m.position.set((a.x + c.x) / 2, 0.22, (a.z + c.z) / 2); m.renderOrder = 5; scene.add(m);
    windows.push({ x0: Math.min(a.x, c.x), x1: Math.max(a.x, c.x), z0: Math.min(a.z, c.z), z1: Math.max(a.z, c.z), m, period, phase, on: 0, gi: GARD.indexOf(g) });
  };
  const spot = (g, u, v) => { const p = at(g, u, v); g.spot = p; };
  const [g1, g2, g3, g4, g5] = GARD;
  // 1. Dziadek Lesław: two sensor lamps sweeping the lawn; the puppy is behind the shed
  lamp(g1, 0.2, 0.34, 0.9, 0.85, 0.75); lamp(g1, 0.8, 0.14, -0.5, 0.9, 0.6, 8);
  bush(g1, 0.1, 0.12); bush(g1, 0.5, 0.36); bush(g1, 0.14, 0.62); bush(g1, 0.62, 0.62);
  { const p = at(g1, 0.86, 0.5); b.box(2.6, 2.0, 2.2, p.x, 0, p.z, 0x6b5a48); b.add(roofGeo(3, 0.7, 2.6), 0x3f3a36, p.x, 2.0, p.z, 0, 0.04); boxes.push({ x0: p.x - 1.4, x1: p.x + 1.4, z0: p.z - 1.2, z1: p.z + 1.2 }); }
  spot(g1, 0.87, 0.66); tree(at(g1, 0.36, 0.6).x, at(g1, 0.36, 0.6).z); tree(at(g1, 0.62, 0.1).x, at(g1, 0.62, 0.1).z, 0.8);
  // 2. Babcia Małgosia: three sprinklers turning over the flowerbeds
  sprinkler(g2, 0.28, 0.3, 1.25); sprinkler(g2, 0.72, 0.3, -1.05); sprinkler(g2, 0.5, 0.56, 0.85, 6);
  bush(g2, 0.08, 0.5); bush(g2, 0.92, 0.5); bush(g2, 0.5, 0.1);
  for (const [u, v] of [[0.3, 0.64], [0.5, 0.67], [0.7, 0.64]]) { const p = at(g2, u, v); b.box(3.2, 0.14, 1.2, p.x, 0, p.z, 0x4a3524); for (let k = 0; k < 9; k++) b.blob(0.14, p.x - 1.3 + k * 0.33, 0.34, p.z + (r() - 0.5) * 0.7, [0xe85d8f, 0xf4d44a, 0xf2f2f2, 0xc77dff][k % 4]); }
  spot(g2, 0.5, 0.63); tree(at(g2, 0.12, 0.14).x, at(g2, 0.12, 0.14).z, 0.9); tree(at(g2, 0.9, 0.16).x, at(g2, 0.9, 0.16).z);
  // 3. dr Alicja: a robot mower with a headlight on its rounds, and one lamp
  mower(g3, [[0.2, 0.18], [0.8, 0.18], [0.8, 0.58], [0.2, 0.58]]); lamp(g3, 0.12, 0.66, -2.2, 0.7, 0.55, 7);
  bush(g3, 0.5, 0.38); bush(g3, 0.08, 0.1); bush(g3, 0.92, 0.36); bush(g3, 0.5, 0.05);
  { const p = at(g3, 0.86, 0.66); b.box(2.0, 0.1, 0.5, p.x, 0.42, p.z, 0x7a5a3a); for (const dx of [-0.85, 0.85]) b.box(0.1, 0.42, 0.5, p.x + dx, 0, p.z, 0x3a3d42); }
  spot(g3, 0.86, 0.62); tree(at(g3, 0.3, 0.64).x, at(g3, 0.3, 0.64).z);
  // 4. Agata: squeaky ducks everywhere, and a bedroom light that keeps coming on
  for (const [u, v] of [[0.3, 0.14], [0.52, 0.2], [0.72, 0.12], [0.18, 0.32], [0.42, 0.36], [0.64, 0.34], [0.86, 0.3], [0.3, 0.5], [0.7, 0.5], [0.5, 0.38], [0.12, 0.54], [0.9, 0.52]]) toy(g4, u + (r() - 0.5) * 0.05, v + (r() - 0.5) * 0.04);
  windowLight(g4, 0.26, 0.74, 0.3, 0.6, 8.5, 0);
  bush(g4, 0.16, 0.4); bush(g4, 0.84, 0.4); bush(g4, 0.5, 0.06);
  { const p = at(g4, 0.5, 0.5); b.box(2.6, 0.22, 2.6, p.x, 0, p.z, 0x8a6a45); b.box(2.3, 0.2, 2.3, p.x, 0.06, p.z, 0xe2cf9a, 0, 0.03); }
  spot(g4, 0.5, 0.5); tree(at(g4, 0.08, 0.16).x, at(g4, 0.08, 0.16).z); tree(at(g4, 0.92, 0.14).x, at(g4, 0.92, 0.14).z, 0.85);
  // 5. Tomek: a bit of everything
  lamp(g5, 0.26, 0.24, 0.6, 0.9, 0.7); sprinkler(g5, 0.7, 0.34, 1.1, 5.2); mower(g5, [[0.36, 0.42], [0.9, 0.42], [0.9, 0.58], [0.36, 0.58]], 1.5); toy(g5, 0.5, 0.14); toy(g5, 0.62, 0.22); toy(g5, 0.2, 0.5); toy(g5, 0.3, 0.42);
  bush(g5, 0.5, 0.28); bush(g5, 0.9, 0.12); bush(g5, 0.1, 0.34); bush(g5, 0.62, 0.5);
  { const p = at(g5, 0.17, 0.52); b.cyl(1.5, 1.5, 0.1, p.x, 0.55, p.z, 0x1c1c22, 18); for (let k = 0; k < 6; k++) b.cyl(0.04, 0.04, 0.55, p.x + Math.cos(k) * 1.4, 0, p.z + Math.sin(k) * 1.4, 0x4a6fb5, 6); }
  spot(g5, 0.17, 0.52); tree(at(g5, 0.9, 0.3).x, at(g5, 0.9, 0.3).z, 0.9);
  // ---- everything that makes the street look lived in (kept to the corners and the fence lines, clear of the routes)
  const solidC = (p, rad) => circles.push({ x: p.x, z: p.z, r: rad }), solidB = (x, z, w, d) => boxes.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
  GARD.forEach((g, gi) => {                                                                          // wheelie bins and a letter box at every gate, smoke from two chimneys
    const zg = g.north ? g.z1 : g.z0, s = g.north ? 1 : -1, hc = at(g, 0.5, 0.84);
    [[0, 0x2f6b3a], [1, 0xd9b233]].forEach(([k, col]) => { const x = g.gx + 2.7 + k * 0.75, z = zg + s * 0.6; b.box(0.55, 0.95, 0.6, x, 0, z, col, 0, 0.04); b.box(0.6, 0.07, 0.66, x, 0.95, z, 0x1f2a22, 0, 0); });
    solidB(g.gx + 3.07, zg + s * 0.6, 1.45, 0.75); b.box(0.36, 0.26, 0.22, g.gx - 1.6, 1.0, zg + s * 0.28, [0xc0392b, 0x2c5f8a, 0xd8d8d2, 0x2f6b3a, 0x8a5a2a][gi], 0, 0.02);
    if (gi === 1 || gi === 3) SMOKE.push({ x: hc.x + 2.5, z: hc.z });
  });
  for (const x of [-30, -12, 6, 24]) MOTHS.push({ x, y: 4.1, z: 3.3 });
  for (const [x, z, col, ry] of [[-35.6, -1.25, 0x7a1f1f, 0], [36.2, 2.25, 0x2f4a6a, Math.PI]]) {                   // two parked cars at the ends of the lane
    const car = new Builder(90 + x), c = Math.cos(ry); car.box(4.3, 0.62, 1.8, 0, 0.3, 0, col, 0, 0.02); car.box(2.3, 0.56, 1.62, -0.25 * c, 0.92, 0, col, 0, 0.02); car.box(2.34, 0.4, 1.66, -0.25 * c, 0.98, 0, 0x10161e, 0, 0);
    for (const sx of [-1.35, 1.35]) for (const sz of [-0.86, 0.86]) { const wg = new THREE.CylinderGeometry(0.33, 0.33, 0.22, 12); wg.rotateX(Math.PI / 2); car.add(wg, 0x15151a, sx, 0.33, sz, 0, 0); }
    for (const sz of [-0.6, 0.6]) { car.box(0.06, 0.16, 0.34, 2.15 * c, 0.6, sz, 0xf2ecd0, 0, 0); car.box(0.06, 0.14, 0.34, -2.15 * c, 0.62, sz, 0x8a1818, 0, 0); }
    const m = car.mesh(); m.position.set(x, 0, z); scene.add(m); solidB(x, z, 4.5, 2.0);
  }
  { b.cyl(0.46, 0.46, 0.03, 8, 0.0, 0.6, 0x34363a, 16); b.box(0.5, 0.03, 0.34, -19, 0.0, 3.4, 0x2c2e32, 0, 0);                        // a manhole, a drain, a bench, a hydrant, fallen leaves
    b.box(1.8, 0.08, 0.5, -6, 0.44, 3.35, 0x7a5a3a); b.box(1.8, 0.5, 0.08, -6, 0.5, 3.6, 0x7a5a3a); for (const dx of [-0.8, 0.8]) b.box(0.08, 0.44, 0.5, -6 + dx, 0, 3.35, 0x3a3d42); solidB(-6, 3.4, 1.9, 0.6);
    b.cyl(0.13, 0.16, 0.6, 14.5, 0, 3.45, 0xc0392b, 10); b.blob(0.15, 14.5, 0.66, 3.45, 0xc0392b, 0.8); solidC({ x: 14.5, z: 3.45 }, 0.22);
    for (let i = 0; i < 90; i++) { const lg = new THREE.CircleGeometry(0.07 + r() * 0.05, 5); lg.rotateX(-Math.PI / 2); b.add(lg, [0x9a5a22, 0xb8862e, 0x7a4a1e, 0xc9a23a][i % 4], -38 + r() * 76, 0.02, -2.5 + r() * 6, r() * 6, 0.1); } }
  { const p = at(g1, 0.075, 0.88);                                                                 // Dziadek Lesław: a wood pile, a rain barrel, a vegetable patch
    b.box(1.0, 1.1, 2.6, p.x, 0, p.z, 0x6b4a32, 0, 0.05); for (let i = 0; i < 12; i++) { const lg = new THREE.CylinderGeometry(0.15, 0.15, 0.06, 8); lg.rotateZ(Math.PI / 2); b.add(lg, 0xc9a877, p.x + 0.52, 0.2 + ((i / 4) | 0) * 0.33, p.z - 0.95 + (i % 4) * 0.62 + (((i / 4) | 0) % 2) * 0.2, 0, 0.08); } solidB(p.x, p.z, 1.2, 2.8);
    const q = at(g1, 0.2, 0.95); b.cyl(0.42, 0.38, 0.95, q.x, 0, q.z, 0x2c5f8a, 12); b.cyl(0.4, 0.4, 0.02, q.x, 0.9, q.z, 0x0c1420, 12); solidC(q, 0.5);
    const v = at(g1, 0.15, 0.73); b.box(3.6, 0.12, 2.2, v.x, 0, v.z, 0x3d2c1e, 0, 0.04); for (let i = 0; i < 4; i++) for (let k = 0; k < 7; k++) b.add(leafBlob(0.16, 0.8, i + k, 1), i % 2 ? 0x4f8a34 : 0x6a9a3a, v.x - 1.5 + k * 0.5, 0.24, v.z - 0.8 + i * 0.53, r() * 3, 0.12); }
  { const a = at(g2, 0.06, 0.8), c = at(g2, 0.22, 0.8);                                             // Babcia Małgosia: washing on the line, garden gnomes, a bird bath, a bench
    for (const q of [a, c]) { b.cyl(0.05, 0.06, 2.1, q.x, 0, q.z, 0xb8b8b8, 6); solidC(q, 0.12); } b.box(c.x - a.x, 0.02, 0.02, (a.x + c.x) / 2, 2.0, a.z, 0xd8d8d8, 0, 0);
    [[0.18, 0xf4f1ea, 1.2], [0.5, 0x9ec4e8, 0.9], [0.8, 0xf0b6c8, 1.05]].forEach(([k, col, h]) => b.box(0.9, h, 0.03, lerp(a.x, c.x, k), 2.0 - h, a.z, col, 0, 0.02));
    for (const [u, v] of [[0.2, 0.58], [0.8, 0.58], [0.6, 0.74]]) { const q = at(g2, u, v); b.cyl(0.1, 0.13, 0.26, q.x, 0, q.z, 0x2c5f8a, 8); b.blob(0.1, q.x, 0.36, q.z, 0xe8b890); b.cone(0.1, 0.26, q.x, 0.4, q.z, 0xc0392b, 8); }
    const bb = at(g2, 0.87, 0.84); b.cyl(0.1, 0.16, 0.7, bb.x, 0, bb.z, 0xa8a49a, 10); b.cyl(0.5, 0.3, 0.14, bb.x, 0.7, bb.z, 0xb5b0a6, 14); b.cyl(0.42, 0.42, 0.02, bb.x, 0.83, bb.z, 0x1a2836, 14); solidC(bb, 0.5);
    const bn = at(g2, 0.9, 0.7); b.box(0.5, 0.08, 1.7, bn.x, 0.42, bn.z, 0x7a5a3a); b.box(0.08, 0.5, 1.7, bn.x + 0.26, 0.46, bn.z, 0x7a5a3a); solidB(bn.x, bn.z, 0.7, 1.8); }
  { const q = at(g3, 0.13, 0.85);                                                                  // dr Alicja: a patio with a table, chairs and a barbecue
    b.box(3.6, 0.06, 3.6, q.x, 0, q.z, 0x8f8b82, 0, 0.04); b.cyl(0.7, 0.7, 0.06, q.x, 0.72, q.z, 0xe8e2d4, 16); b.cyl(0.06, 0.08, 0.72, q.x, 0, q.z, 0x3a3d42, 8); solidC(q, 0.8);
    for (let k = 0; k < 4; k++) { const a = k * 1.571 + 0.4, x = q.x + Math.cos(a) * 1.2, z = q.z + Math.sin(a) * 1.2; b.box(0.45, 0.05, 0.45, x, 0.42, z, 0xf1ede2, a); b.box(0.45, 0.5, 0.05, x + Math.cos(a) * 0.2, 0.46, z + Math.sin(a) * 0.2, 0xf1ede2, -a + Math.PI / 2); for (const d of [-0.18, 0.18]) b.box(0.04, 0.42, 0.04, x + d, 0, z + d, 0x9a968d, 0, 0); }
    const g = at(g3, 0.22, 0.74); b.cyl(0.32, 0.2, 0.26, g.x, 0.62, g.z, 0x1c1c20, 12); for (const d of [-0.18, 0.18]) b.box(0.04, 0.62, 0.04, g.x + d, 0, g.z + d * 0.6, 0x3a3d42, 0, 0); b.cyl(0.33, 0.33, 0.03, g.x, 0.88, g.z, 0x55585c, 12); solidC(g, 0.4); }
  { const q = at(g4, 0.88, 0.84);                                                                  // Agata: a swing, bikes against the fence
    for (const dx of [-1.3, 1.3]) { for (const dz of [-0.5, 0.5]) b.box(0.08, 2.2, 0.08, q.x + dx, 0, q.z + dz, 0xc0392b, 0, 0.02); solidC({ x: q.x + dx, z: q.z }, 0.35); } b.box(2.8, 0.09, 0.09, q.x, 2.15, q.z, 0xc0392b, 0, 0.02);
    for (const dx of [-0.55, 0.55]) { b.box(0.5, 0.05, 0.22, q.x + dx, 0.55, q.z, 0xf2c230, 0, 0.02); for (const d of [-0.22, 0.22]) b.box(0.02, 1.6, 0.02, q.x + dx + d, 0.57, q.z, 0x9a9a9a, 0, 0); }
    [[0.045, 0.78, 0x2c7fb8], [0.045, 0.9, 0xd9483b]].forEach(([u, v, col]) => { const k = at(g4, u, v); for (const dz of [-0.5, 0.5]) { const wg = new THREE.TorusGeometry(0.3, 0.03, 6, 16); wg.rotateY(Math.PI / 2); b.add(wg, 0x1a1a1e, k.x, 0.33, k.z + dz, 0, 0); } b.box(0.04, 0.04, 1.0, k.x, 0.55, k.z, col, 0, 0); b.box(0.04, 0.4, 0.04, k.x, 0.45, k.z - 0.15, col, 0, 0); b.box(0.3, 0.04, 0.04, k.x, 0.9, k.z + 0.45, 0x22222a, 0, 0); b.box(0.12, 0.05, 0.22, k.x, 0.82, k.z - 0.18, 0x22222a, 0, 0); }); }
  { const q = at(g5, 0.12, 0.92), gh = at(g5, 0.87, 0.85);                                         // Tomek: a football goal, a greenhouse
    for (const dx of [-1.5, 1.5]) { b.box(0.08, 1.9, 0.08, q.x + dx, 0, q.z, 0xf2f2f2, 0, 0); solidC({ x: q.x + dx, z: q.z }, 0.14); } b.box(3.08, 0.08, 0.08, q.x, 1.86, q.z, 0xf2f2f2, 0, 0); b.blob(0.13, q.x + 0.7, 0.13, q.z - 1.6, 0xf4f4f0);
    b.box(2.6, 1.7, 3.6, gh.x, 0, gh.z, 0xbfd8cf, 0, 0.02); b.add(roofGeo(2.8, 0.9, 3.8), 0xcfe6dc, gh.x, 1.7, gh.z, 0, 0.02); for (const dz of [-1.8, -0.6, 0.6, 1.8]) b.box(2.66, 1.74, 0.06, gh.x, 0, gh.z + dz, 0xf1f1ee, 0, 0); solidB(gh.x, gh.z, 2.9, 3.9); }
  { TREES.push([6.5, 0, 10.5, 0, 0.62]); circles.push({ x: 6.5, z: 10.5, r: 0.3 }); const tg = new THREE.TorusGeometry(0.3, 0.1, 8, 16); b.add(tg, 0x17171a, 5.1, 0.85, 10.2, 0.5, 0); b.box(0.025, 2.2, 0.025, 5.1, 1.15, 10.2, 0xb9a57a, 0, 0);      // Łatka's own yard: a tyre swing, flower pots, a ball
    for (const dx of [-1.6, 1.5, 2.1]) { b.cyl(0.2, 0.14, 0.3, HOME.x + dx, 0, HOME.z + 2.4, 0xb5583a, 10); b.add(leafBlob(0.24, 0.9, 5 + dx, 1), 0x4f8a34, HOME.x + dx, 0.5, HOME.z + 2.4, 0, 0.1); b.blob(0.08, HOME.x + dx + 0.08, 0.7, HOME.z + 2.4, [0xe85d8f, 0xf4d44a, 0xf2f2f2][((dx + 2) | 0) % 3]); }
    b.blob(0.14, HOME.x + 2.6, 0.14, HOME.z - 0.9, 0xd9483b); }
  scene.add(b.mesh());
  // the hedgehog that patrols the lane, the bats, the flicker of a television behind Tomek's window
  { const hb = new Builder(404), body = new THREE.SphereGeometry(0.17, 10, 8); body.scale(1, 0.8, 1.45); hb.add(body, 0x5a4634, 0, 0.13, 0, 0, 0.05); for (let i = 0; i < 26; i++) hb.cone(0.03, 0.12, (hb.r() - 0.5) * 0.26, 0.2 + hb.r() * 0.06, -0.15 + hb.r() * 0.3, 0x3a2c20, 4); hb.cone(0.06, 0.14, 0, 0.06, 0.26, 0xcbb089, 6); hb.blob(0.02, 0, 0.1, 0.34, 0x111111); hog = hb.mesh(); scene.add(hog); }
  for (let i = 0; i < 3; i++) { const g = new THREE.Group(), wm = new THREE.MeshBasicMaterial({ color: 0x07080c, side: THREE.DoubleSide }), mk = (sd) => { const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.12, sd * 0.5, 0, -0.02, 0, 0, 0.14, sd * 0.5, 0, -0.02, sd * 0.42, 0, 0.2, 0, 0, 0.14], 3)); return new THREE.Mesh(wg, wm); }, wl = mk(-1), wr = mk(1); g.add(wl, wr); scene.add(g); bats.push({ g, wl, wr, ph: i * 2.1, cx: -18 + i * 18, cz: i % 2 ? 12 : -12 }); }
  { const h5 = at(g5, 0.5, 0.84), f5 = h5.z - 5.6 / 2; tvGlow = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.6).rotateX(-Math.PI / 2), glowMaterial(0xa890ff, 0.2)); tvGlow.position.set(h5.x + 3.2, 0.21, f5 - 1.5); tvGlow.renderOrder = 4; scene.add(tvGlow);
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.05), new THREE.MeshBasicMaterial({ color: 0x9a86ff })); pane.position.set(h5.x + 3.2, 1.95, f5 - 0.1); pane.rotation.y = Math.PI; scene.add(pane); tvGlow.userData.pane = pane; }
  plantTrees(scene, TREES, patchMat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94 }), RU, { cloud: 0.32, cs: 0.012 }), rng(77), 0.85);
}

// Tufts of real blades over every lawn; they sway a little in the night breeze.
function buildGrass() {
  const R = rng(123), n = isTouch ? 12000 : 34000, pos = [], col = [], tip = [], nor = [];
  const inBox = (x, z) => boxes.some((q) => x > q.x0 - 0.15 && x < q.x1 + 0.15 && z > q.z0 - 0.15 && z < q.z1 + 0.15);
  for (let i = 0; i < n; i++) {
    const x = -39 + R() * 78, z = -27 + R() * 55; if ((z > -2.95 && z < 3.95) || inBox(x, z) || GARD.some((g) => Math.abs(x - g.gx) < 0.85 && z > g.z0 && z < g.z1)) continue;
    const k = 0.55 + R() * 0.6 + fbm(x * 0.25, z * 0.25, 2, 5) * 0.4;
    for (let j = 0; j < 3; j++) { const a = R() * 6.28, h = 0.09 + R() * 0.12, w = 0.02 + R() * 0.02, bx = x + (R() - 0.5) * 0.18, bz = z + (R() - 0.5) * 0.18, lx = (R() - 0.5) * 0.1, lz = (R() - 0.5) * 0.1, c = Math.cos(a) * w, s = Math.sin(a) * w, r = 0.062 * k, g = 0.2 * k, b = 0.04 * k;
      for (const fl of [0, 1]) { if (fl) pos.push(bx + c, 0, bz + s, bx - c, 0, bz - s, bx + lx, h, bz + lz); else pos.push(bx - c, 0, bz - s, bx + c, 0, bz + s, bx + lx, h, bz + lz); col.push(r * 0.6, g * 0.6, b * 0.6, r * 0.6, g * 0.6, b * 0.6, r * 1.35, g * 1.4, b * 1.2); tip.push(0, 0, 1); nor.push(0, 1, 0, 0, 1, 0, 0, 1, 0); } }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('aTip', new THREE.Float32BufferAttribute(tip, 1));
  const mat = patchMat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }), RU, { cloud: 0.32, cs: 0.012 }), base = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh) => { base(sh); sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aTip; uniform float uTime;').replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.xz += aTip * 0.04 * vec2(sin(uTime * 1.7 + position.x * 0.9 + position.z * 0.6), cos(uTime * 1.3 + position.z * 0.8 - position.x * 0.4));'); };
  mat.customProgramCacheKey = () => 'blades';
  const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.frustumCulled = false; scene.add(m);
}

// ------------------------------------------------------------------ helpers
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
function blocked(x, z, rad = 0.34) {
  for (const b of boxes) if (x > b.x0 - rad && x < b.x1 + rad && z > b.z0 - rad && z < b.z1 + rad) return true;
  for (const c of circles) if ((x - c.x) ** 2 + (z - c.z) ** 2 < (c.r + rad) ** 2) return true;
  return false;
}
const gardenAt = (x, z) => GARD.findIndex((g) => x > g.x0 && x < g.x1 && z > g.z0 && z < g.z1);
let hintT = 0, pickT = 0;
function hint(key, once = true, ...a) { if (once) { if (G.hints.has(key)) return; G.hints.add(key); } $('hint').textContent = T(key, ...a); $('hint').style.opacity = 1; hintT = 4.5; }
function pick(text) { $('pick').textContent = text; $('pick').style.opacity = 1; pickT = 2; }
function place(kind, name) { const el = $('place'); $('placeKind').textContent = kind; $('placeName').textContent = name; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); if (audio.on) audio.placeChime(); }
function ring(x, z, col = 0xffd27a) { const m = rings.find((q) => q.t <= 0); if (!m) return; m.t = 1; m.m.position.set(x, 0.25, z); m.m.material.color.setHex(col); m.m.visible = true; }
const buzz = (p) => { try { if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(p); } catch (_) { /* not supported */ } };

// ------------------------------------------------------------------ HUD
const shown = {};
function hud(force) {
  const set = (id, v) => { if (!force && shown[id] === v) return; shown[id] = v; $(id).textContent = v; };
  const fol = puppies.filter((p) => p.state === 'follow').length;
  set('nCount', T('count', 0, G.home)); set('nSub', G.hidden ? T('h_bush') : T('sub', fol));
  const a = Math.round(clamp(G.alert, 0, 1) * 50) * 2; if (shown.alert !== a) { shown.alert = a; $('nBar').style.width = a + '%'; $('nAlert').className = 'ui' + (a > 66 ? ' hot' : a > 5 ? ' warm' : ''); }
  const k = clamp(G.time / NIGHT, 0, 1); $('sundot').style.left = k * 100 + '%';
}
function applyLang() {
  $('title').querySelector('h1').innerHTML = `<small>${T('over')}</small>${T('title')}`;
  $('title').querySelector('.story').textContent = T('story'); $('start').textContent = T('start'); $('title').querySelector('.keys').textContent = T('keys');
  $('again').textContent = T('again'); $('menu').textContent = T('menu'); $('lang').textContent = lang === 'pl' ? 'EN' : 'PL'; $('sunlabel').textContent = T('dawn'); hud(true);
}

// ------------------------------------------------------------------ input
function bark() {
  if (G.mode !== 'play' || G.barkCd > 0) return; G.barkCd = 1.6; audio.bark(); dog.bark(); ring(P.x, P.z, 0xffffff);
  let best = null, bd = 1e9; for (const p of puppies) if (p.state === 'hidden') { const d = Math.hypot(p.x - P.x, p.z - P.z); if (d < bd) { bd = d; best = p; } }
  if (best) setTimeout(() => { if (best.state === 'hidden') { audio.yip(1.7 + best.i * 0.08); ring(best.x, best.z); setTimeout(() => { audio.yip(1.9 + best.i * 0.08); ring(best.x, best.z); }, 260); } }, 450);
}
window.addEventListener('keydown', (e) => {
  if (e.repeat) return; keys[e.code] = true;
  if (e.code === 'KeyH' || e.code === 'Space') { if (G.mode === 'title') startGame(); else bark(); e.preventDefault(); }
  if (e.code === 'Enter' && G.mode === 'title') startGame();
  if (e.code === 'KeyM' && audio.on) audio.toggleMusic();
  if (e.code === 'KeyP') document.body.classList.toggle('clean');
  if (e.code.startsWith('Arrow')) e.preventDefault();
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
const touch = { x: 0, y: 0 };
{
  const zone = $('joyZone'), base = $('joy'), knob = $('joyKnob'), R = 50, NP = { passive: false }; let id = null, ox = 0, oy = 0;
  const each = (e, fn) => { e.preventDefault(); for (const t of e.changedTouches) fn(t); };
  const set = (dx, dy) => { const l = Math.hypot(dx, dy), k = l > R ? R / l : 1, m = Math.min(1, l / R); dx *= k; dy *= k; knob.style.transform = `translate(${dx}px, ${dy}px)`; touch.x = m < 0.15 ? 0 : dx / R; touch.y = m < 0.15 ? 0 : -dy / R; };
  zone.addEventListener('touchstart', (e) => each(e, (t) => { if (id !== null) return; id = t.identifier; const r = zone.getBoundingClientRect(); ox = t.clientX; oy = t.clientY; base.style.left = (ox - r.left) + 'px'; base.style.top = (oy - r.top) + 'px'; base.classList.add('act'); set(0, 0); }), NP);
  zone.addEventListener('touchmove', (e) => each(e, (t) => { if (t.identifier === id) set(t.clientX - ox, t.clientY - oy); }), NP);
  const end = (e) => each(e, (t) => { if (t.identifier !== id) return; id = null; base.classList.remove('act'); base.style.left = base.style.top = ''; set(0, 0); });
  zone.addEventListener('touchend', end, NP); zone.addEventListener('touchcancel', end, NP);
  $('bBark').addEventListener('touchstart', (e) => { e.preventDefault(); bark(); }, NP);
  $('bMusic').addEventListener('touchstart', (e) => { e.preventDefault(); if (audio.on) $('bMusic').classList.toggle('off', !audio.toggleMusic()); }, NP);
  for (const g of ['gesturestart', 'gesturechange']) document.addEventListener(g, (e) => e.preventDefault());
}

// ------------------------------------------------------------------ game flow
function reset() {
  Object.assign(G, { t: 0, time: 0, alert: 0, seen: 0, stun: 0, wet: 0, fade: 0, home: 0, barkCd: 0, hidden: false, cur: -1, endT: 0, hop: 0, hopV: 0, party: 0, meowed: false }); G.hints.clear();
  Object.assign(P, { x: START.x, z: START.z, yaw: Math.PI, speed: 0 }); trail.length = 0;
  puppies.forEach((p, i) => { const s = GARD[i].spot; Object.assign(p, { x: s.x, z: s.z, state: 'hidden', yipT: 2 + i * 1.3, vy: 0, y: 0, slot: -1 }); p.d.root.visible = false; });
  for (const g of GARD) { g.wake = 0; g.win.material.color.setHex(0x000000); }
  for (const t of toys) { t.cd = 0; t.d.scale.y = 1; }
  cam.x = P.x; cam.z = P.z;
}
function startGame() {
  if (G.mode !== 'title') return;
  audio.start(); G.mode = 'play'; $('title').classList.add('hidden'); for (const id of ['nTop', 'nAlert', 'sun']) $(id).style.opacity = 1;
  setTimeout(() => hint('h_start'), 900); audio.bark(); dog.bark();
}
function toTitle() { reset(); G.mode = 'title'; $('end').classList.add('hidden'); $('title').classList.remove('hidden'); for (const id of ['nTop', 'nAlert', 'sun']) $(id).style.opacity = 0; }
function finish(win) {
  const left = Math.max(0, NIGHT - G.time), mm = Math.floor(left / 60), ss = String(Math.floor(left % 60)).padStart(2, '0'), stars = left > 240 ? '★★★' : left > 120 ? '★★☆' : '★☆☆';
  $('endTitle').textContent = T(win ? 'winT' : 'loseT'); $('endText').textContent = win ? T('winX', `${mm}:${ss}`, stars) : T('loseX', G.home);
  $('end').classList.remove('hidden'); $('menu').style.display = ''; for (const id of ['nTop', 'nAlert', 'sun', 'hint', 'pick', 'nCat']) $(id).style.opacity = 0;
}
// somebody woke up: the puppies following Łatka bolt back to where they were hiding and she is shooed out to the gate
function caught(gi) {
  const g = GARD[gi >= 0 ? gi : 0]; G.alert = 0; G.fade = 1; G.stun = 0.9; G.time += 12; g.wake = 4; buzz([120, 60, 120]);
  pick(T('caught', g.owner)); if (audio.on) { audio.yelp(); audio.tone(196, 0.5, 'sawtooth', 0.12, 0.8, 0.15); }
  for (const p of puppies) if (p.state === 'follow') p.state = 'flee';
  const o = gi >= 0 ? g.out : START; P.x = o.x; P.z = o.z; trail.length = 0; $('flash').style.opacity = 1; setTimeout(() => { $('flash').style.opacity = 0; }, 250);
}

const cam = { x: 0, z: 0 }, tmpV = new THREE.Vector3();
function step(dt) {
  G.t += dt; const play = G.mode === 'play';
  // ---- Łatka
  let ix = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + touch.x + input.x, iy = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) + touch.y + input.y;
  const il = Math.hypot(ix, iy); if (il > 1) { ix /= il; iy /= il; }
  G.stun = Math.max(0, G.stun - dt); G.wet = Math.max(0, G.wet - dt); G.barkCd = Math.max(0, G.barkCd - dt);
  G.hidden = false; for (const b of bushes) if ((P.x - b.x) ** 2 + (P.z - b.z) ** 2 < (b.r - 0.15) ** 2) G.hidden = true;
  let sp = 0;
  if (play && G.stun <= 0 && il > 0.05) {
    sp = (G.hidden ? 3.0 : 4.8) * Math.min(1, il); const dx = ix / Math.max(il, 1e-3) * sp * dt, dz = -iy / Math.max(il, 1e-3) * sp * dt;
    if (!blocked(P.x + dx, P.z)) P.x += dx; if (!blocked(P.x, P.z + dz)) P.z += dz;
    const want = Math.atan2(ix, -iy); P.yaw += angDiff(want, P.yaw) * Math.min(1, dt * 12);
    const last = trail[0]; if (!last || Math.hypot(last.x - P.x, last.z - P.z) > 0.16) { trail.unshift({ x: P.x, z: P.z }); if (trail.length > 80) trail.pop(); }
  }
  P.speed += (sp - P.speed) * Math.min(1, dt * 10); if (G.mode === 'win') {
    P.yaw += angDiff(Math.PI, P.yaw) * Math.min(1, dt * 4);
    // Łatka jumps for joy and barks; sparks burst overhead, every window in the street lights up, Mila calls from the roof
    G.hopV -= 16 * dt; G.hop = Math.max(0, G.hop + G.hopV * dt); G.party -= dt;
    if (G.endT < 6 && G.party <= 0) { G.party = 0.85; G.hopV = 4.4; G.hop = 0.01; audio.bark(0.95 + Math.random() * 0.2); dog.bark();
      const c = [[5, 3.5, 1], [5, 1.2, 1.6], [1.4, 3, 5], [2, 5, 1.5]][(Math.random() * 4) | 0], fx = P.x + (Math.random() - 0.5) * 7, fz = P.z + 1.5 + Math.random() * 3.5, fy = 2.2 + Math.random() * 1.6;
      for (let k = 0; k < 46; k++) { const a = Math.random() * 6.28, b = Math.acos(2 * Math.random() - 1), v = 2.2 + Math.random() * 1.4; pAdd.spawn(fx, fy, fz, Math.sin(b) * Math.cos(a) * v, Math.cos(b) * v, Math.sin(b) * Math.sin(a) * v, 1.2 + Math.random() * 0.6, 0.34, 0.04, c[0], c[1], c[2], 1, 1.6, 1.2); } }
    if (G.endT > 1.2 && !G.meowed) { G.meowed = true; audio.meow(1.1); }
    if (G.endT > 0.4 && Math.random() < dt * 5) pAdd.spawn(P.x + (Math.random() - 0.5) * 3, 0.8, P.z + (Math.random() - 0.5) * 3, 0, 0.9, 0, 1.3, 0.16, 0.3, 5, 0.6, 1.6, 1, -0.2, 0.3);
    for (const g of GARD) g.win.material.color.setRGB(2.2 * Math.min(1, G.endT), 1.7 * Math.min(1, G.endT), 0.8 * Math.min(1, G.endT));
  }
  dog.root.position.set(P.x, G.mode === 'win' ? G.hop : 0, P.z); dog.root.rotation.y = P.yaw; dog.root.rotation.z = G.stun > 0 ? Math.sin(G.t * 40) * 0.12 : 0;
  dog.animate(dt, { speed: P.speed, grounded: !(G.mode === 'win' && G.hop > 0), vy: G.hopV, sit: G.mode === 'title' || (G.mode === 'win' && G.endT > 6.4) ? 1 : 0, happy: G.mode === 'win' ? 1 : 0.2, pant: G.mode !== 'play' });
  if (G.hidden && P.speed > 1 && Math.random() < dt * 14) pAlpha.spawn(P.x + (Math.random() - 0.5), 0.6 + Math.random() * 0.4, P.z + (Math.random() - 0.5), (Math.random() - 0.5), 0.8, (Math.random() - 0.5), 0.6, 0.12, 0.05, 0.25, 0.55, 0.25, 0.8, 3, 1);

  // ---- lights, water and other trouble
  let danger = 0, src = -1;
  for (const s of sectors) {
    if (s.kind === 'lamp') { s.a = s.base + Math.sin(G.t * s.sp + s.ph) * s.amp; s.m.rotation.y = s.a; }
    else if (s.kind === 'water') { s.a = s.base + G.t * s.sp; s.m.rotation.y = s.a; if (Math.random() < dt * 40) { const d = 1 + Math.random() * (s.r - 1), a = s.a + (Math.random() - 0.5) * 0.3; pAlpha.spawn(s.x + Math.sin(a) * d, 0.3 + Math.random() * 0.6, s.z + Math.cos(a) * d, Math.sin(a) * 2, 1.5, Math.cos(a) * 2, 0.5, 0.08, 0.16, 0.6, 0.8, 1, 0.7, 8, 0.5); } }
    const dx = P.x - s.x, dz = P.z - s.z, d = Math.hypot(dx, dz);
    if (!play || G.noDetect || d > s.r || d < 0.25 || Math.abs(angDiff(Math.atan2(dx, dz), s.a)) > s.half) continue;
    if (s.kind === 'water') { if (G.wet <= 0) { G.wet = 2.2; G.stun = 0.8; G.alert += 0.3; src = s.gi; hint('h_water', false); buzz(60); if (audio.on) audio.splash(0.3); for (let k = 0; k < 24; k++) pAlpha.spawn(P.x, 0.5, P.z, (Math.random() - 0.5) * 4, 1 + Math.random() * 3, (Math.random() - 0.5) * 4, 0.6, 0.1, 0.2, 0.6, 0.8, 1, 0.8, 9, 0.5); } }
    else if (!G.hidden) { danger = Math.max(danger, s.kind === 'mower' ? 1.35 : 1.0); src = s.gi; }
  }
  for (const m of mowers) {
    const t = m.path[m.i], dx = t.x - m.grp.position.x, dz = t.z - m.grp.position.z, d = Math.hypot(dx, dz);
    if (d < 0.08) m.i = (m.i + 1) % m.path.length; else { const k = Math.min(1, m.sp * dt / d); m.grp.position.x += dx * k; m.grp.position.z += dz * k; m.s.a += angDiff(Math.atan2(dx, dz), m.s.a) * Math.min(1, dt * 3); }
    m.grp.rotation.y = m.s.a; m.s.x = m.grp.position.x + Math.sin(m.s.a) * 0.4; m.s.z = m.grp.position.z + Math.cos(m.s.a) * 0.4;
    if (play && !G.noDetect && Math.hypot(P.x - m.grp.position.x, P.z - m.grp.position.z) < 0.75) { G.alert += 0.5; src = m.s.gi; G.stun = 0.4; const nx = P.x + Math.sin(m.s.a) * 1.1, nz = P.z + Math.cos(m.s.a) * 1.1; if (!blocked(nx, nz)) { P.x = nx; P.z = nz; } }       // bumped by the mower
  }
  for (const w of windows) {
    const ph = (G.t + w.phase) % w.period, on = ph < 1.2 ? ph / 1.2 * 0.25 : ph < 4 ? 1 : 0; w.on += (on - w.on) * Math.min(1, dt * 8); w.m.material.opacity = w.on * 0.3;
    const g = GARD[w.gi]; if (g.wake <= 0) g.win.material.color.setRGB(1.6 * w.on, 1.25 * w.on, 0.6 * w.on);
    if (play && !G.noDetect && !G.hidden && w.on > 0.6 && P.x > w.x0 && P.x < w.x1 && P.z > w.z0 && P.z < w.z1) { danger = Math.max(danger, 1.3); src = w.gi; }
  }
  for (const t of toys) {
    t.cd = Math.max(0, t.cd - dt); t.d.scale.y += ((t.cd > 2.6 ? 0.45 : 1) - t.d.scale.y) * Math.min(1, dt * 14);
    if (play && !G.noDetect && t.cd <= 0 && (P.x - t.x) ** 2 + (P.z - t.z) ** 2 < 0.2) { t.cd = 3; G.alert += 0.28; src = gardenAt(t.x, t.z); hint('h_toy', false); buzz(30); ring(t.x, t.z, 0xffe14a); if (audio.on) { audio.tone(1500, 0.14, 'square', 0.1, 1.5); audio.tone(1100, 0.16, 'square', 0.08, 0.6, 0.13); } }
  }
  if (play) {
    if (danger > 0) { G.alert += danger * dt; G.seen = 0.4; hint('h_light'); } else { G.seen = Math.max(0, G.seen - dt); if (G.seen <= 0) G.alert = Math.max(0, G.alert - dt * 0.14); }
    if (src >= 0) G.src = src;
    if (G.alert >= 1) caught(G.src === undefined ? gardenAt(P.x, P.z) : G.src);
    G.time += dt; if (G.time >= NIGHT) { G.mode = 'lose'; G.endT = 0; if (audio.on) audio.night(); }
    const gi = gardenAt(P.x, P.z); if (gi !== G.cur) { G.cur = gi; if (gi >= 0) place(T('garden'), GARD[gi].of); }
  }
  for (const g of GARD) if (g.wake > 0) { g.wake -= dt; const k = Math.min(1, g.wake); g.win.material.color.setRGB(2.4 * k, 1.9 * k, 0.9 * k); }
  const vig = play ? clamp(G.alert * 1.15, 0, 1) * (danger > 0 ? 1 : 0.55) : 0; if (Math.abs((shown.vig || 0) - vig) > 0.03 && G.fade <= 0) { shown.vig = vig; $('flash').style.opacity = vig; }
  G.fade = Math.max(0, G.fade - dt * 2);

  // ---- puppies
  let fi = 0;
  for (const p of puppies) {
    const d = Math.hypot(p.x - P.x, p.z - P.z);
    if (p.state === 'hidden') {
      p.yipT -= dt; if (p.yipT <= 0 && play) { p.yipT = 5 + Math.random() * 4; if (d < 24) { ring(p.x, p.z); if (audio.on) audio.yip(1.7 + p.i * 0.08); } }
      if (play && d < 1.5) { p.state = 'follow'; p.d.root.visible = true; p.vy = 4.5; p.y = 0.01; hint('h_found'); pick('Hau!'); buzz(40); if (audio.on) { audio.yip(1.8); audio.pickup('bone'); } for (let k = 0; k < 30; k++) pAdd.spawn(p.x, 0.5, p.z, (Math.random() - 0.5) * 3, Math.random() * 3, (Math.random() - 0.5) * 3, 0.7, 0.2, 0.02, 4, 3, 1, 1, 4, 1);
        if (puppies.every((q) => q.state !== 'hidden')) setTimeout(() => hint('h_all'), 2500); }
    } else if (p.state === 'follow') {
      const tp = trail[Math.min(trail.length - 1, 5 + fi * 5)] || P; fi++;
      const dx = tp.x - p.x, dz = tp.z - p.z, dd = Math.hypot(dx, dz), v = dd > 0.25 ? Math.min(6.5, dd * 5) : 0;
      if (v > 0) { p.x += dx / dd * v * dt; p.z += dz / dd * v * dt; p.yaw = Math.atan2(dx, dz); } p.sp = v;
      const inRing = (q) => Math.hypot(q.x - HOME.x, q.z - (HOME.z - 0.4)) < 2.4;                  // home as soon as Łatka steps into the ring by the kennel
      if (play && (inRing(p) || (inRing(P) && dd < 7))) { p.state = 'home'; p.slot = G.home++; hint('h_home', false); buzz(50); if (audio.on) audio.chime(p.slot); ring(HOME.x, HOME.z - 0.4);
        if (G.home >= 5) { G.mode = 'win'; G.endT = 0; G.party = 0; pick('Hau! Hau! Hau!'); pickT = 3; for (const id of ['nTop', 'nAlert', 'sun', 'hint', 'nCat']) $(id).style.opacity = 0; buzz([60, 40, 60, 40, 120]); if (audio.on) audio.fanfare(); } }
    } else if (p.state === 'flee') {
      const s = GARD[p.i].spot, dx = s.x - p.x, dz = s.z - p.z, dd = Math.hypot(dx, dz);
      if (dd < 0.3) { p.state = 'hidden'; p.d.root.visible = false; p.yipT = 3; } else { p.x += dx / dd * 9 * dt; p.z += dz / dd * 9 * dt; p.yaw = Math.atan2(dx, dz); p.sp = 9; }
    } else if (G.mode === 'win' && G.endT < 6.4) {            // everybody is home: the puppies race round Łatka, hopping and yapping
      const a = G.endT * 2.6 + p.i * 1.2566, tx = P.x + Math.sin(a) * 1.7, tz = P.z + Math.cos(a) * 1.7, dx = tx - p.x, dz = tz - p.z, dd = Math.hypot(dx, dz) || 1, v = Math.min(8, dd * 6);
      p.x += dx / dd * v * dt; p.z += dz / dd * v * dt; p.yaw = a + Math.PI / 2; p.sp = 5;
      if (p.y <= 0 && Math.random() < dt * 2.2) { p.vy = 3.6 + Math.random() * 1.5; p.y = 0.01; if (audio.on) audio.yip(1.5 + Math.random() * 0.7); p.d.bark(); }
    } else {                                                  // home: trot to a place beside the kennel and settle down
      const tx = HOME.x + 1.5 + (p.slot % 3) * 0.75, tz = HOME.z - 0.5 + Math.floor(p.slot / 3) * 0.8, dx = tx - p.x, dz = tz - p.z, dd = Math.hypot(dx, dz);
      if (dd > 0.12) { p.x += dx / dd * Math.min(4, dd * 4) * dt; p.z += dz / dd * Math.min(4, dd * 4) * dt; p.yaw = Math.atan2(dx, dz); p.sp = 3; } else { p.sp = 0; p.yaw += angDiff(Math.PI, p.yaw) * Math.min(1, dt * 4); }
    }
    if (p.y > 0 || p.vy > 0) { p.vy -= 18 * dt; p.y = Math.max(0, p.y + p.vy * dt); }
    p.d.root.position.set(p.x, p.y, p.z); p.d.root.rotation.y = p.yaw || 0;
    if (p.d.root.visible) p.d.animate(dt, { speed: p.sp || 0, grounded: p.y <= 0, vy: p.vy, sit: p.state === 'home' && !p.sp ? 1 : 0, happy: 0.8, pant: true });
  }
  // ---- Mila: on top of the nearest fence to the puppy Łatka should look for next, facing it
  {
    let best = null, bd = 1e9; for (const p of puppies) if (p.state === 'hidden') { const d = Math.hypot(p.x - P.x, p.z - P.z); if (d < bd) { bd = d; best = p; } }
    if (best) { const g = GARD[best.i], inside = gardenAt(P.x, P.z) === best.i, tx = inside ? clamp(best.x, g.x0 + 1, g.x1 - 1) : g.gx + 1.6, tz = inside ? (g.north ? g.z0 : g.z1) + (g.north ? 0.07 : -0.07) : (g.north ? g.z1 - 0.07 : g.z0 + 0.07);
      if (Math.hypot(tx - Mi.tx, tz - Mi.tz) > 0.5) { Mi.tx = tx; Mi.tz = tz; Mi.hop = 1; }
      Mi.look = Math.atan2(best.x - Mi.x, best.z - Mi.z); const reach = Math.min(7, Math.hypot(best.x - Mi.x, best.z - Mi.z) - 1);
      Mi.sparkT -= dt; if (Mi.sparkT <= 0 && play && reach > 1) { Mi.sparkT = 0.045; Mi.sk = ((Mi.sk || 0) + 0.045) % 1.25; if (Mi.sk < 1) { const d = 0.5 + Mi.sk * reach; pAdd.spawn(Mi.x + Math.sin(Mi.look) * d, lerp(1.5, 0.45, Mi.sk), Mi.z + Math.cos(Mi.look) * d, 0, 0.15, 0, 0.75, 0.26, 0.04, 5, 3.8, 1.2, 1, 0, 1); } }
      arrows.forEach((m, i) => { const d = 1.3 + i * 1.0, on = play && Mi.hop < 0.05 && reach > d; m.visible = on; if (on) { m.position.set(Mi.x + Math.sin(Mi.look) * d, 0.24, Mi.z + Math.cos(Mi.look) * d); m.rotation.y = Mi.look; m.material.opacity = 0.25 + 0.6 * Math.max(0, Math.sin(G.t * 5 - i * 1.1)); } });
    } else { Mi.tx = HOME.x; Mi.tz = HOME.z + 1.4; Mi.look = Math.PI; for (const m of arrows) m.visible = false; }
    glow.visible = !!best && play; if (glow.visible) { glow.position.copy(cat.root.position); glow.position.y += 0.3; glow.scale.setScalar(1 + Math.sin(G.t * 4) * 0.18); }
    // a little cat marker on the edge of the screen when she is out of view
    { camera.updateMatrixWorld(); camera.matrixWorldInverse.copy(camera.matrixWorld).invert(); tmpV.set(Mi.x, 1.4, Mi.z).project(camera); const off = !!best && play && (Math.abs(tmpV.x) > 0.93 || Math.abs(tmpV.y) > 0.9 || tmpV.z > 1), el = $('nCat');
      if (off !== shown.catOn) { shown.catOn = off; el.style.opacity = off ? 1 : 0; }
      if (off) { const k = 0.86 / Math.max(Math.abs(tmpV.x), Math.abs(tmpV.y), 1e-3), bx = (tmpV.z > 1 ? -tmpV.x : tmpV.x) * k, by = (tmpV.z > 1 ? -tmpV.y : tmpV.y) * k; el.style.left = (50 + bx * 50) + '%'; el.style.top = (50 - by * 50) + '%'; } }
    const k = Math.min(1, dt * 3.5); Mi.x += (Mi.tx - Mi.x) * k; Mi.z += (Mi.tz - Mi.z) * k; Mi.hop = Math.max(0, Mi.hop - dt * 1.4);
    const top = best ? 1.3 : 1.62; cat.root.position.set(Mi.x, top + Math.sin(Mi.hop * Math.PI) * 1.2, Mi.z); cat.root.rotation.y += angDiff(Mi.look, cat.root.rotation.y) * Math.min(1, dt * 5);
    cat.animate(dt, { speed: 0, grounded: true, sit: Mi.hop > 0.05 ? 0 : 1 });
  }
  // ---- rings, particles, camera
  for (const q of rings) if (q.t > 0) { q.t -= dt * 1.1; const e = 1 - q.t; q.m.scale.setScalar(0.3 + e * 3.2); q.m.material.opacity = Math.max(0, q.t) * 0.8; if (q.t <= 0) q.m.visible = false; }
  G.homeRing.material.opacity = 0.25 + Math.sin(G.t * 3) * 0.12 + (puppies.some((p) => p.state === 'follow') ? 0.3 : 0);
  if (Math.random() < dt * 5) { const a = Math.random() * 6.28, d = 3 + Math.random() * 14; pAdd.spawn(P.x + Math.cos(a) * d, 0.5 + Math.random() * 1.6, P.z + Math.sin(a) * d, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.4, 2.5, 0.09, 0.02, 2.2, 3, 0.6, 1, 0, 0.2); }     // fireflies
  pAdd.update(dt); pAlpha.update(dt);
  const kc = Math.min(1, dt * 4); cam.x += (P.x - cam.x) * kc; cam.z += (P.z - cam.z) * kc;
  const tall = camera.aspect < 1 ? 1 : 0, ti = G.mode === 'title' || G.mode === 'win' ? 1 : 0, hgt = lerp(12 + tall * 9, 3.2, ti), back = lerp(8.6 + tall * 3, 6.5, ti);
  // in play the camera hangs above and to the south; on the title and at the end it comes down on the lane side, facing the kennel
  const sway = G.mode === 'win' ? Math.sin(G.endT * 0.5) * 3.2 : 0;
  camera.position.lerp(tmpV.set(cam.x + ti * 2.6 + sway, hgt + (G.mode === 'win' ? 0.5 : 0), cam.z + lerp(back, -6.6, ti)), Math.min(1, dt * 3)); camera.lookAt(cam.x + ti * 0.9, 0.4 + ti * 0.3, cam.z + lerp(-0.8, 2.2, ti));
  moon.target.position.set(cam.x, 0, cam.z); moon.position.set(cam.x - 14, 30, cam.z + 12); moon.target.updateMatrixWorld();
  // dawn creeps in over the last minute and a half
  // night life: moths at the lamps, smoke from the chimneys, the hedgehog, bats, the television, an owl now and then
  for (const m of MOTHS) if (Math.abs(m.x - P.x) < 26 && Math.random() < dt * 9) pAdd.spawn(m.x + (Math.random() - 0.5) * 1.2, m.y + (Math.random() - 0.5) * 0.9, m.z + (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 2.2, (Math.random() - 0.5) * 1.4, (Math.random() - 0.5) * 2.2, 0.6, 0.06, 0.04, 2.6, 2.3, 1.7, 0.9, 0, 1.5);
  for (const c of SMOKE) if (Math.random() < dt * 4) pAlpha.spawn(c.x + (Math.random() - 0.5) * 0.2, 5.7, c.z, 0.25 + Math.random() * 0.15, 0.55, (Math.random() - 0.5) * 0.12, 4.5, 0.3, 1.5, 0.42, 0.45, 0.55, 0.2, -0.02, 0.15);
  { const hx = Math.sin(G.t * 0.016) * 30, dir = Math.cos(G.t * 0.016) > 0 ? 1 : -1; hog.position.set(hx, Math.abs(Math.sin(G.t * 9)) * 0.012, -2.25); hog.rotation.y = dir * Math.PI / 2; }
  for (const bt of bats) { const a = G.t * 0.55 + bt.ph; bt.g.position.set(bt.cx + Math.sin(a) * 15, 6.2 + Math.sin(a * 2.3) * 0.9, bt.cz + Math.sin(a * 2) * 7); bt.g.rotation.y = Math.atan2(Math.cos(a) * 15, Math.cos(a * 2) * 14); const f = Math.sin(G.t * 22 + bt.ph) * 0.8; bt.wl.rotation.z = -f; bt.wr.rotation.z = f; }
  { const k = 0.55 + 0.45 * Math.sin(G.t * 7.3) * Math.sin(G.t * 2.9 + 1) + (Math.sin(G.t * 31) > 0.9 ? 0.4 : 0); tvGlow.material.uniforms.uStrength.value = 0.1 + 0.12 * k; tvGlow.userData.pane.material.color.setRGB(0.45 + 0.35 * k, 0.4 + 0.3 * k, 0.9); }
  if (audio.on && G.mode === 'play' && Math.random() < dt / 22) { audio.tone(392, 0.32, 'sine', 0.04); audio.tone(330, 0.7, 'sine', 0.045, 0, 0.42); }
  RU.uTime.value = G.t; if (Math.random() < dt * 4) pAdd.spawn(P.x + (Math.random() - 0.5) * 30, 0.4 + Math.random() * 1.5, P.z + (Math.random() - 0.5) * 22, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.4, 3.5, 0.09, 0.05, 1.6, 2.3, 0.6, 0.9, 0, 0);      // fireflies
  const dawn = sm(NIGHT - 95, NIGHT, G.time); scene.background.setRGB(lerp(0.004, 0.32, dawn), lerp(0.007, 0.26, dawn), lerp(0.02, 0.3, dawn)); moon.intensity = lerp(1.55, 2.0, dawn); scene.fog.color.copy(scene.background); fogUniforms.uFogColor.value.copy(scene.fog.color);
  // ---- endings, HUD, sound
  if (G.mode === 'win' || G.mode === 'lose') { G.endT += dt; if (G.endT > (G.mode === 'win' ? 7.6 : 1.6) && $('end').classList.contains('hidden')) finish(G.mode === 'win'); }
  hud(); if (hintT > 0) { hintT -= dt; if (hintT <= 0) $('hint').style.opacity = 0; } if (pickT > 0) { pickT -= dt; if (pickT <= 0) $('pick').style.opacity = 0; }
  if (audio.on) { audio.music({ tunnel: 0, night: 0.8, win: G.mode === 'win', lost: G.mode === 'lose' }); audio.crickets.gain.setTargetAtTime(0.02, audio.ctx.currentTime, 0.5); if (P.speed > 1 && play) { stepAcc -= dt * (2 + P.speed); if (stepAcc <= 0) { stepAcc = 1; audio.step(false); } } }
  $('touch').classList.toggle('on', play);
}
let stepAcc = 0; const Mi = { x: 3, z: 3, tx: 3, tz: 3, hop: 0, look: 0, sparkT: 0 };

// ------------------------------------------------------------------ boot
let last = 0, fpsAcc = 0, fpsN = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
  if (document.hidden) return;
  step(dt); draw();
  fpsAcc += dt; fpsN++; if (fpsAcc > 2.5) { if (fpsAcc / fpsN > 0.03 && pixelRatio > 0.7) { pixelRatio = Math.max(0.7, pixelRatio * 0.85); resize(); } fpsAcc = 0; fpsN = 0; }
}
async function boot() {
  document.body.classList.add('night'); if (isTouch) document.body.classList.add('touch');
  await new Promise((r) => setTimeout(r, 30));
  tex = createTextures();
  scene.fog = new THREE.FogExp2(0x050814, 0.012); fogUniforms.uFogDensity.value = 0.012;
  moon = new THREE.DirectionalLight(0xa9bcff, 1.55); moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048);
  const sc = moon.shadow.camera; sc.left = -24; sc.right = 24; sc.top = 24; sc.bottom = -24; sc.near = 1; sc.far = 90; moon.shadow.bias = -0.0008; moon.shadow.normalBias = 0.06; scene.add(moon, moon.target);
  scene.add(new THREE.HemisphereLight(0x5a70c0, 0x1a2416, 0.95));
  buildWorld(); buildGrass();
  dog = buildDog(tex, { lantern: true }); scene.add(dog.root); if (HQ) addFur(dog.root, DOG_FUR); if (dog.light) { dog.light.intensity = 26; dog.light.distance = 13; dog.light.decay = 1.6; }
  for (let i = 0; i < 5; i++) { const d = buildDog(tex, { scale: 0.43, head: 1.3, leg: 0.8, ear: 1.15, snout: 0.72 }); scene.add(d.root); puppies.push({ i, d, x: 0, z: 0, state: 'hidden' }); }
  cat = buildCat({ scale: 1.2 }); scene.add(cat.root); if (HQ) addFur(cat.root, CAT_FUR);
  for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 28), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 6; scene.add(m); rings.push({ m, t: 0 }); }
  glow = new THREE.Mesh(new THREE.SphereGeometry(0.75, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false })); glow.visible = false; scene.add(glow);
  for (let i = 0; i < 4; i++) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([-0.42, 0, -0.3, 0, 0, 0.36, 0.42, 0, -0.3, 0, 0, -0.06], 3)); g.setIndex([0, 1, 3, 1, 2, 3]);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); m.visible = false; m.renderOrder = 6; scene.add(m); arrows.push(m); }
  pAdd = new Particles(700, true); pAlpha = new Particles(400, false); scene.add(pAdd.mesh, pAlpha.mesh);
  reset(); G.mode = 'title'; applyLang();
  $('start').addEventListener('click', startGame);
  $('lang').addEventListener('click', () => { lang = lang === 'pl' ? 'en' : 'pl'; applyLang(); });
  $('again').addEventListener('click', () => { toTitle(); startGame(); });
  $('menu').addEventListener('click', toTitle);
  $('bJump').style.display = 'none'; $('flash').style.background = 'radial-gradient(ellipse at center, rgba(255,214,110,0) 40%, rgba(255,190,80,.55))';
  step(0.016); camera.position.set(cam.x + 2.6, 3.2, cam.z - 6.2); renderer.compile(scene, camera); draw();
  window.__night = { G, P, GARD, puppies, sectors, toys, windows, mowers, input, audio, step, startGame, reset, toTitle, caught, bark, renderer, scene, camera, blocked,
    tp: (x, z) => { P.x = x; P.z = z; trail.length = 0; cam.x = x; cam.z = z; },
    sim: (secs, dt = 1 / 60) => { for (let t = 0; t < secs; t += dt) step(dt); draw(); return { mode: G.mode, x: +P.x.toFixed(1), z: +P.z.toFixed(1), alert: +G.alert.toFixed(2), home: G.home, states: puppies.map((p) => p.state[0]).join(''), time: +G.time.toFixed(0) }; },
    // walks in a straight line towards a point (collisions on); returns true when it gets there
    walk: (x, z, max = 20, dt = 1 / 60) => { for (let t = 0; t < max; t += dt) { const dx = x - P.x, dz = z - P.z, d = Math.hypot(dx, dz); if (d < 0.3) { input.x = input.y = 0; return true; } input.x = dx / d; input.y = -dz / d; step(dt); } input.x = input.y = 0; return false; } };
  $('title').classList.remove('hidden'); $('loading').style.opacity = 0; setTimeout(() => $('loading').remove(), 1100);
  last = performance.now(); requestAnimationFrame(frame);
}
boot().catch((e) => { console.error(e); $('loading').textContent = 'Błąd: ' + e.message; });
