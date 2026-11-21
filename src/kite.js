// Level 5 – "Latawiec Stasia": the wind carries Staś's kite away with Łatka hanging underneath. She glides over the whole
// neighbourhood – the village, the Narew, the forest with the lost temple, the lake – through rings of cloud and back
// down to the meadow where Staś is waiting. This level aims for a natural look: a physically based sky, a real terrain
// with fields, forests and water, cloud shadows drifting over the land.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { Lensflare, LensflareElement } from 'three/addons/objects/Lensflare.js';
import { createTextures, sm, lerp, clamp, rng, fbm, hash, vnoise } from './textures.js';
import { Builder, roofGeo, canvasTex, worldMat } from './kit.js';
import { buildDog } from './dog.js';
import { Particles, fogUniforms } from './fx.js';
import { AudioSys } from './audio.js';

const $ = (id) => document.getElementById(id);
const TXT = {
  pl: {
    over: 'Poziom 5', title: 'Latawiec Stasia', start: 'Lecimy!', again: 'Jeszcze raz', menu: 'Menu',
    story: 'Wiatr porwał latawiec Stasia — razem z Łatką! Szybuj nad wsią, Narwią i lasem, przelatuj przez obręcze z chmur, omijaj balony i bociany, a na koniec wyląduj na Słonecznej Polanie, gdzie czeka Staś.',
    keys: 'A / D lub ← → — skręt · W / ↑ — w górę · S / ↓ — nurkowanie (szybciej) · Spacja — hau! · M — muzyka',
    keys_t: 'Lewy kciuk: na boki — skręt, w górę — wznoszenie, w dół — nurkowanie · przycisk — hau!',
    sub: (a, n, b, h) => `Obręcze ${a}/${n} · Kości ${b} · ${h} m`, next: (m) => `Następna obręcz: ${m} m`, land: (m) => `Słoneczna Polana: ${m} m`, bark: 'Hau!',
    h_start: 'Przelatuj przez obręcze z chmur. Nurkując, przyspieszasz.', h_thermal: 'Komin ciepłego powietrza — niesie w górę!', h_storm: 'Burza! Trzymaj kurs i nie daj się zepchnąć.',
    h_low: 'Za nisko! W górę!', h_land: 'Ląduj w białym kole na Słonecznej Polanie.', h_balloon: 'Uwaga na balony!', h_stork: 'Bociany! Omiń je.',
    gate: (c) => (c > 1 ? `Obręcz! ×${c}` : 'Obręcz!'), miss: 'Obok…', hitB: 'Bum! Balon!', hitS: 'Klekot! Bocian!', crash: 'Auć! Za nisko!',
    k_village: 'wieś', k_river: 'rzeka', k_ruin: 'ruiny w lesie', k_fair: 'festyn balonowy', k_lake: 'jezioro', k_meadow: 'lądowisko',
    p_village: 'Ulica Pogodna', p_river: 'Narew', p_ruin: 'Zaginiona świątynia', p_fair: 'Balony nad lasem', p_lake: 'Jezioro Łabędzie', p_meadow: 'Słoneczna Polana', stas: 'Staś',
    winT: 'Miękkie lądowanie!', winX: (t, a, n, b, s) => `Staś odzyskał latawiec, a Łatka ma co opowiadać. Czas: ${t} · obręcze: ${a}/${n} · kości: ${b}. ${s}`,
    loseT: 'Latawiec spadł…', loseX: (a, n) => `Łatka wylądowała w stogu siana — cała i zdrowa. Obręcze: ${a}/${n}. Spróbuj jeszcze raz!`,
  },
  en: {
    over: 'Level 5', title: 'Staś\'s Kite', start: 'Take off!', again: 'Again', menu: 'Menu',
    story: 'The wind has carried Staś\'s kite away — with Łatka hanging on! Glide over the village, the Narew and the forest, fly through the rings of cloud, dodge balloons and storks, and land on Słoneczna Polana where Staś is waiting.',
    keys: 'A / D or ← → — turn · W / ↑ — climb · S / ↓ — dive (faster) · Space — woof! · M — music',
    keys_t: 'Left thumb: sideways — turn, up — climb, down — dive · button — woof!',
    sub: (a, n, b, h) => `Rings ${a}/${n} · Bones ${b} · ${h} m`, next: (m) => `Next ring: ${m} m`, land: (m) => `Słoneczna Polana: ${m} m`, bark: 'Woof!',
    h_start: 'Fly through the rings of cloud. Diving makes you faster.', h_thermal: 'A thermal — warm air carries you up!', h_storm: 'A storm! Hold your course.',
    h_low: 'Too low! Pull up!', h_land: 'Land in the white circle on Słoneczna Polana.', h_balloon: 'Mind the balloons!', h_stork: 'Storks! Fly around them.',
    gate: (c) => (c > 1 ? `Ring! ×${c}` : 'Ring!'), miss: 'Missed…', hitB: 'Bump! A balloon!', hitS: 'Clatter! A stork!', crash: 'Ouch! Too low!',
    k_village: 'village', k_river: 'river', k_ruin: 'ruins in the forest', k_fair: 'balloon fair', k_lake: 'lake', k_meadow: 'landing field',
    p_village: 'Ulica Pogodna', p_river: 'Narew', p_ruin: 'The lost temple', p_fair: 'Balloons over the forest', p_lake: 'Jezioro Łabędzie', p_meadow: 'Słoneczna Polana', stas: 'Staś',
    winT: 'A soft landing!', winX: (t, a, n, b, s) => `Staś has his kite back and Łatka has a story to tell. Time: ${t} · rings: ${a}/${n} · bones: ${b}. ${s}`,
    loseT: 'The kite came down…', loseX: (a, n) => `Łatka landed in a haystack, safe and sound. Rings: ${a}/${n}. Try again!`,
  },
};
let lang = 'pl';
const isTouch = matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && matchMedia('(hover: none)').matches);
const T = (k, ...a) => { const v = (isTouch && TXT[lang][k + '_t']) || TXT[lang][k]; return typeof v === 'function' ? v(...a) : v; };

// ------------------------------------------------------------------ renderer
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
let pixelRatio = Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 2);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.5;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, 1, 1.2, 9000);
function resize() { const w = Math.max(2, window.innerWidth), h = Math.max(2, window.innerHeight); camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setPixelRatio(pixelRatio); renderer.setSize(w, h, false); }
window.addEventListener('resize', resize); resize();

// ------------------------------------------------------------------ the land
const SIZE = 4000, HALF = SIZE / 2, N = 321, CELL = SIZE / (N - 1);
const VIL = { x: -280, z: 640 }, MEAD = { x: -850, z: 330 }, LAKE = { x: -650, z: -650 }, TEMPLE = { x: 1000, z: -350 }, FAIR = { x: 300, z: -850 }, STORM = { x: -190, z: -800, r: 190 }, BRX = 120;
const riverZ = (x) => 240 + 190 * Math.sin(x / 390 + 0.4) + 70 * Math.sin(x / 160 + 1.3);
const riverD = (x, z) => { const sl = (riverZ(x + 4) - riverZ(x - 4)) / 8; return Math.abs(z - riverZ(x)) / Math.sqrt(1 + sl * sl); };
const bump = (dx, dz, r) => { const d = Math.hypot(dx, dz) / r; return d >= 1 ? 0 : (1 - d * d) * (1 - d * d); };
const far = (p, x, z) => Math.hypot(x - p.x, z - p.z);
function rawH(x, z) {
  let h = 8 + fbm(x / 520 + 3.1, z / 520 + 7.7, 4, 11) * 46;
  h += sm(1300, 1950, Math.hypot(x, z)) * (50 + fbm(x / 330 + 1, z / 330 + 5, 3, 5) * 130);       // wooded hills close the horizon
  h += 78 * bump(x - TEMPLE.x, z - TEMPLE.z, 300);
  h = lerp(h, 15, sm(350, 170, far(VIL, x, z))); h = lerp(h, 11, sm(260, 110, far(MEAD, x, z))); h = lerp(h, 22, sm(240, 90, far(FAIR, x, z)));
  const ld = far(LAKE, x, z) / 175 + (fbm(x / 150, z / 150, 2, 31) - 0.5) * 0.55; h = lerp(3, h, sm(1.0, 2.3, ld)); h = lerp(-5, h, sm(0.8, 1.12, ld));
  const d = riverD(x, z); h = lerp(2.2, h, sm(45, 300, d)); h = lerp(-4.5, h, sm(20, 46, d));     // flood plain, then the channel
  return h;
}
function rawF(x, z) {                                                                               // > 0.57 means forest
  let f = fbm(x / 270 + 9.3, z / 270 + 2.1, 3, 23) + sm(1250, 1700, Math.hypot(x, z)) * 0.3 + 0.3 * bump(x - TEMPLE.x, z - TEMPLE.z, 340);
  f -= sm(95, 60, riverD(x, z)) + sm(380, 300, far(VIL, x, z)) + sm(250, 190, far(MEAD, x, z)) + sm(290, 230, far(LAKE, x, z)) + sm(200, 150, far(FAIR, x, z)) + sm(46, 34, far(TEMPLE, x, z));
  return f;
}
const Hg = new Float32Array(N * N), Fg = new Float32Array(N * N), Wu = new Float32Array(N * N), Wv = new Float32Array(N * N);
function samp(g, x, z) {
  const fx = clamp((x + HALF) / CELL, 0, N - 1.001), fz = clamp((z + HALF) / CELL, 0, N - 1.001), ix = fx | 0, iz = fz | 0, tx = fx - ix, tz = fz - iz, i = iz * N + ix;
  return (g[i] * (1 - tx) + g[i + 1] * tx) * (1 - tz) + (g[i + N] * (1 - tx) + g[i + N + 1] * tx) * tz;
}
const groundAt = (x, z) => samp(Hg, x, z), isForest = (x, z) => samp(Fg, x, z) > 0.57;
const floorAt = (x, z) => Math.max(0, groundAt(x, z)) + (isForest(x, z) ? 15 : far(VIL, x, z) < 290 ? 9 : 0);      // what the kite must clear
// the patchwork of fields: a warped, slightly rotated grid
const FC = Math.cos(0.38), FS = Math.sin(0.38);
function field(x, z) {
  const u = x * FC + z * FS + samp(Wu, x, z), v = -x * FS + z * FC + samp(Wv, x, z), cu = u / 230, cv = v / 125, iu = Math.floor(cu), iv = Math.floor(cv);
  return { id: hash(iu, iv, 77), k: hash(iu, iv, 5), e: Math.min((cu - iu) * 230, (iu + 1 - cu) * 230, (cv - iv) * 125, (iv + 1 - cv) * 125), u, v };
}

// ------------------------------------------------------------------ state
const G = { mode: 'load', t: 0, time: 0, lives: 3, bones: 0, score: 0, gi: 0, got: 0, combo: 0, inv: 0, boost: 0, shake: 0, endT: 0, ct: 0, hints: new Set(), places: new Set(), bot: false, noHit: false, storm: 0, bolt: 3 };
const P = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, v: 21 };
const START = { x: -850, y: 165, z: 900 };
const keys = {}, touch = { x: 0, y: 0 }, input = { x: 0, y: 0 };
const audio = new AudioSys();
const U = { uDetail: { value: null }, uCloud: { value: null }, uTime: { value: 0 } };
const SUN = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 31), THREE.MathUtils.degToRad(318));
const FOG = new THREE.Color(0.56, 0.7, 0.92);
let dog, tex, sun, sky, water, kite, sail, tails = [], pAdd, clouds, bones, nextRing, nextRing2, rain, flare, landRing, arrow, wake, boat;
const gates = [], items = [], thermals = [], balloons = [], storks = [], people = [], HOUSES = [];
const dummy = new THREE.Object3D(), tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), tmpC = new THREE.Color();

// periodic noise, for textures that tile
const pn = (x, y, p, s) => { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), w = (i) => ((i % p) + p) % p, a = hash(w(ix), w(iy), s), b = hash(w(ix + 1), w(iy), s), c = hash(w(ix), w(iy + 1), s), d = hash(w(ix + 1), w(iy + 1), s); return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy; };
const pfbm = (u, v, p, s, o = 4) => { let a = 0.5, sum = 0, n = 0; for (let i = 0; i < o; i++) { sum += a * pn(u * p, v * p, p, s + i * 13); n += a; a *= 0.5; p *= 2; } return sum / n; };
function dataTex(n, fn, rep = true) {
  const c = document.createElement('canvas'); c.width = c.height = n; const ctx = c.getContext('2d'), im = ctx.createImageData(n, n), d = im.data;
  for (let y = 0, i = 0; y < n; y++) for (let x = 0; x < n; x++, i += 4) { const v = fn(x / n, y / n); d[i] = v[0] * 255; d[i + 1] = v[1] * 255; d[i + 2] = v[2] * 255; d[i + 3] = (v[3] === undefined ? 1 : v[3]) * 255; }
  ctx.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}
// adds the drifting cloud shadows (and, for the ground, close-up grain) to a standard material
function patch(mat, detail) {
  mat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, U);
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <begin_vertex>', '#include <begin_vertex>\n{ vec4 wp = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\nwp = instanceMatrix * wp;\n#endif\nvWp = (modelMatrix * wp).xyz; }');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp; uniform sampler2D uDetail, uCloud; uniform float uTime;').replace('#include <map_fragment>', '#include <map_fragment>\n'
      + (detail ? '{ vec3 dA = texture2D(uDetail, vWp.xz * 0.21).rgb, dB = texture2D(uDetail, vWp.xz * 0.017).rgb; diffuseColor.rgb *= (0.72 + 0.56 * dA.r) * (0.86 + 0.28 * dB.g); }\n' : '')
      + '{ float cs = texture2D(uCloud, vWp.xz * 0.00042 + uTime * vec2(0.0034, 0.0012)).r; diffuseColor.rgb *= mix(1.0, 0.5, smoothstep(0.5, 0.66, cs)); }');
  };
  mat.customProgramCacheKey = () => 'kite' + (detail ? 1 : 0); return mat;
}

function buildSky() {
  sky = new Sky(); sky.scale.setScalar(8000); const su = sky.material.uniforms;
  su.turbidity.value = 3.2; su.rayleigh.value = 2.1; su.mieCoefficient.value = 0.004; su.mieDirectionalG.value = 0.83; su.sunPosition.value.copy(SUN);
  const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene(); es.add(sky); scene.environment = pm.fromScene(es).texture; pm.dispose(); scene.add(sky);
  scene.environmentIntensity = 0.85; scene.fog = new THREE.FogExp2(FOG, 0.00021);
  sun = new THREE.DirectionalLight(0xfff0dc, 3.4); sun.castShadow = true; const m = isTouch ? 2048 : 4096; sun.shadow.mapSize.set(m, m);
  const sc = sun.shadow.camera; sc.left = -260; sc.right = 260; sc.top = 260; sc.bottom = -260; sc.near = 1; sc.far = 1500; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.5; scene.add(sun, sun.target);
  // a little lens flare when the camera looks towards the sun
  const glow = (stops) => canvasTex(128, 128, (c) => { const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); for (const [o, col] of stops) g.addColorStop(o, col); c.fillStyle = g; c.fillRect(0, 0, 128, 128); });
  const f0 = glow([[0, 'rgba(255,250,235,1)'], [0.12, 'rgba(255,236,190,.55)'], [0.45, 'rgba(255,210,150,.12)'], [1, 'rgba(255,200,140,0)']]), f1 = glow([[0, 'rgba(255,255,255,0)'], [0.72, 'rgba(190,220,255,.0)'], [0.86, 'rgba(190,220,255,.22)'], [1, 'rgba(190,220,255,0)']]);
  flare = new Lensflare(); flare.addElement(new LensflareElement(f0, 260, 0)); flare.addElement(new LensflareElement(f1, 70, 0.55)); flare.addElement(new LensflareElement(f1, 130, 0.8)); flare.addElement(new LensflareElement(f0, 60, 1.05, new THREE.Color(0.6, 0.8, 1))); scene.add(flare);
}

function buildLand() {
  for (let iz = 0, i = 0; iz < N; iz++) for (let ix = 0; ix < N; ix++, i++) {
    const x = -HALF + ix * CELL, z = -HALF + iz * CELL; Hg[i] = rawH(x, z); Fg[i] = rawF(x, z);
    Wu[i] = (fbm(x / 600 + 1.7, z / 600 + 4.2, 2, 41) - 0.5) * 300; Wv[i] = (fbm(x / 600 + 8, z / 600 + 1, 2, 43) - 0.5) * 300;
  }
  const pos = new Float32Array(N * N * 3), uv = new Float32Array(N * N * 2), idx = new Uint32Array((N - 1) * (N - 1) * 6);
  for (let iz = 0, i = 0; iz < N; iz++) for (let ix = 0; ix < N; ix++, i++) { pos[i * 3] = -HALF + ix * CELL; pos[i * 3 + 1] = Hg[i]; pos[i * 3 + 2] = -HALF + iz * CELL; uv[i * 2] = ix / (N - 1); uv[i * 2 + 1] = 1 - iz / (N - 1); }
  for (let iz = 0, k = 0; iz < N - 1; iz++) for (let ix = 0; ix < N - 1; ix++) { const a = iz * N + ix, b = a + 1, c = a + N, d = c + 1; idx[k++] = a; idx[k++] = c; idx[k++] = b; idx[k++] = b; idx[k++] = c; idx[k++] = d; }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(new THREE.BufferAttribute(idx, 1)); geo.computeVertexNormals();
  // houses first, so that their gardens can be painted on the ground
  const R = rng(91);
  for (let x = -505; x <= -50; x += 35) for (const sd of [-1, 1]) if (Math.abs(x - VIL.x) > 26) HOUSES.push({ x: x + (R() - 0.5) * 5, z: VIL.z + sd * (23 + R() * 4), ry: Math.PI / 2, sd });
  for (let z = 455; z <= 850; z += 35) for (const sd of [-1, 1]) if (Math.abs(z - VIL.z) > 44) HOUSES.push({ x: VIL.x + sd * (23 + R() * 4), z: z + (R() - 0.5) * 5, ry: 0, sd });
  const CH = { x: VIL.x + 44, z: VIL.z - 62 };                                                      // the church by the crossroads
  for (let i = HOUSES.length - 1; i >= 0; i--) if (far(CH, HOUSES[i].x, HOUSES[i].z) < 34) HOUSES.splice(i, 1);
  const ROADS = [
    [7, '#77746d', [[-560, 640], [-10, 640], [70, 560], [BRX, 480], [BRX, 372], [150, 180], [200, -150], [260, -520], [300, -800]]],
    [6, '#7b776f', [[VIL.x, 420], [VIL.x, 880], [-250, 1100], [-420, 1500]]],
    [4.5, '#b7a47f', [[-560, 640], [-700, 520], [-800, 400], [MEAD.x + 20, MEAD.z + 40]]],
    [4, '#b7a47f', [[-560, 640], [-700, 780], [START.x, START.z - 60]]],
    [4, '#b09c78', [[200, -150], [500, -260], [800, -330], [TEMPLE.x - 50, TEMPLE.z + 20]]],
    [4, '#b7a47f', [[150, 180], [-200, 60], [-500, -200], [LAKE.x + 150, LAKE.z + 170]]],
  ];
  const W = isTouch ? 1024 : 2048, k = W / SIZE, cx = (x) => (x + HALF) * k;
  const map = canvasTex(W, W, (ctx) => {
    const im = ctx.createImageData(W, W), d = im.data, TP = Math.PI * 2;
    const KIND = [[0.24, 198, 174, 104], [0.42, 182, 164, 116], [0.6, 104, 128, 68], [0.74, 76, 104, 54], [0.86, 118, 92, 68], [0.92, 198, 182, 86], [2, 122, 142, 80]];
    for (let py = 0, i = 0; py < W; py++) for (let px = 0; px < W; px++, i += 4) {
      const x = -HALF + (px + 0.5) / k, z = -HALF + (py + 0.5) / k, h = samp(Hg, x, z), f = samp(Fg, x, z) + (hash(px, py, 3) - 0.5) * 0.06, dr = riverD(x, z), gr = hash(px, py, 9) - 0.5;
      let r, g, b;
      if (f > 0.57) { const n = 0.8 + 0.5 * vnoise(x / 9, z / 9, 61); r = 36 * n; g = 56 * n; b = 31 * n; }
      else {
        const F = field(x, z), kd = KIND.find((q) => F.id < q[0]), row = F.k > 0.5 ? F.u : F.v, st = 0.93 + 0.07 * Math.sin(row * TP / (kd[0] === 0.86 ? 4 : 7.5)), br = (0.88 + 0.24 * F.k) * st;
        r = kd[1] * br; g = kd[2] * br; b = kd[3] * br;
        const e = sm(4.5, 1.5, F.e); r = lerp(r, 78, e); g = lerp(g, 104, e); b = lerp(b, 56, e);                               // a grassy strip between fields
        const fr = sm(0.5, 0.57, f); r = lerp(r, 70, fr); g = lerp(g, 98, fr); b = lerp(b, 50, fr);                           // scrub at the forest edge
      }
      const lawn = Math.max(sm(340, 240, far(VIL, x, z)), sm(200, 110, dr) * 0.9, sm(3.6, 2.6, samp(Hg, x, z)) * (h < 9 ? 1 : 0)); r = lerp(r, 96, lawn); g = lerp(g, 120, lawn); b = lerp(b, 66, lawn);
      const mown = Math.max(sm(230, 170, far(MEAD, x, z)), sm(190, 140, far(FAIR, x, z))), ms = 0.95 + 0.05 * Math.sign(Math.sin((x + z) * TP / 26)); r = lerp(r, 108 * ms, mown); g = lerp(g, 132 * ms, mown); b = lerp(b, 72 * ms, mown);
      const sand = sm(1.5, 0.35, h); r = lerp(r, 196, sand); g = lerp(g, 182, sand); b = lerp(b, 142, sand);
      const wet = sm(0.2, -2.5, h); r = lerp(r, 48, wet); g = lerp(g, 60, wet); b = lerp(b, 46, wet);
      const q = 1 + gr * 0.1; d[i] = r * q; d[i + 1] = g * q; d[i + 2] = b * q; d[i + 3] = 255;
    }
    ctx.putImageData(im, 0, 0);
    for (const hs of HOUSES) {                                                                      // gardens: a lawn, a hedge, a drive
      const w = (hs.ry ? 33 : 44) * k, dd = (hs.ry ? 44 : 33) * k, ox = hs.ry ? 0 : hs.sd * 12, oz = hs.ry ? hs.sd * 12 : 0, X = cx(hs.x + ox) - w / 2, Y = cx(hs.z + oz) - dd / 2;
      ctx.fillStyle = ['#6f9a48', '#7ba652', '#688f44', '#86a85a'][(R() * 4) | 0]; ctx.fillRect(X, Y, w, dd); ctx.strokeStyle = '#3d5a2c'; ctx.lineWidth = 1.2; ctx.strokeRect(X, Y, w, dd);
      ctx.fillStyle = '#9a958c'; if (hs.ry) ctx.fillRect(cx(hs.x) + 5 * k, cx(hs.z - hs.sd * 22) - (hs.sd < 0 ? 0 : 18 * k), 3 * k, 18 * k); else ctx.fillRect(cx(hs.x - hs.sd * 22) - (hs.sd < 0 ? 0 : 18 * k), cx(hs.z) + 5 * k, 18 * k, 3 * k);
    }
    ctx.lineJoin = ctx.lineCap = 'round';
    for (const [w, col, pts] of ROADS) for (const pass of [0, 1]) { ctx.strokeStyle = pass ? col : 'rgba(60,70,40,.35)'; ctx.lineWidth = (w + (pass ? 0 : 3)) * k; ctx.beginPath(); pts.forEach(([x, z], i) => (i ? ctx.lineTo(cx(x), cx(z)) : ctx.moveTo(cx(x), cx(z)))); ctx.stroke(); }
    ctx.fillStyle = '#a9a59b'; ctx.fillRect(cx(CH.x - 22), cx(CH.z - 26), 44 * k, 52 * k);
  });
  map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping; map.anisotropy = renderer.capabilities.getMaxAnisotropy();
  U.uDetail.value = dataTex(256, (u, v) => { const a = pfbm(u, v, 16, 3, 4), b = pfbm(u, v, 6, 8, 3); return [clamp(a + (hash(u * 256, v * 256, 4) - 0.5) * 0.35, 0, 1), b, a]; });
  U.uCloud.value = dataTex(256, (u, v) => { const a = pfbm(u, v, 4, 21, 5); return [a, a, a]; });
  const land = new THREE.Mesh(geo, patch(new THREE.MeshStandardMaterial({ map, roughness: 0.96, metalness: 0 }), true)); land.receiveShadow = true; scene.add(land);
  // water: one sheet at sea level; the river bed and the lake dip below it
  const wn = dataTex(256, (u, v) => { const e = 1 / 256, hh = (a, b) => pfbm(a, b, 5, 51, 4), dx = (hh(u + e, v) - hh(u - e, v)) * 7, dy = (hh(u, v + e) - hh(u, v - e)) * 7, l = Math.hypot(dx, dy, 1); return [0.5 - dx / l * 0.5, 0.5 - dy / l * 0.5, 0.5 + 0.5 / l]; });
  wn.repeat.set(SIZE / 22, SIZE / 22);
  water = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE).rotateX(-Math.PI / 2), patch(new THREE.MeshStandardMaterial({ color: 0x2b4a4a, roughness: 0.13, metalness: 0.35, normalMap: wn, normalScale: new THREE.Vector2(0.22, 0.22) }), false));
  water.receiveShadow = true; scene.add(water);

  // ---- trees, in chunks so that only the ones in view are drawn
  const v3 = new THREE.Vector3(), paint = (g, fn) => { const p = g.attributes.position, c = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { const q = fn(p.getX(i), p.getY(i), p.getZ(i)); c[i * 3] = q[0]; c[i * 3 + 1] = q[1]; c[i * 3 + 2] = q[2]; } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); g.deleteAttribute('uv'); return g; };
  const blob = (r, x, y, z, sy, s) => {
    let g = mergeVertices(new THREE.IcosahedronGeometry(r, 1).deleteAttribute('uv').deleteAttribute('normal')); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { v3.fromBufferAttribute(p, i); const q = 0.78 + 0.5 * vnoise(v3.x * 0.9 + v3.y * 0.6 + s, v3.z * 0.9 - v3.y * 0.7, s); p.setXYZ(i, v3.x * q, v3.y * q * sy, v3.z * q); }
    g.computeVertexNormals(); g = g.toNonIndexed(); g.translate(x, y, z);
    return paint(g, (px, py, pz) => { const q = clamp(0.52 + (py - y) / (r * sy) * 0.42 + (vnoise(px * 1.7 + s, pz * 1.7, 9) - 0.5) * 0.3, 0.25, 1.1); return [q, q, q]; });
  };
  const trunk = (r, h) => paint(new THREE.CylinderGeometry(r * 0.7, r, h, 5, 1, true).toNonIndexed().translate(0, h / 2, 0), () => [0.42, 0.3, 0.22]);
  const cone = (r, h, y) => paint(new THREE.ConeGeometry(r, h, 8, 1, true).toNonIndexed().translate(0, y + h / 2, 0), (px, py) => { const q = 0.5 + (py - y) / h * 0.55; return [q, q, q]; });
  const GEO = [mergeGeometries([trunk(0.35, 5), blob(3.7, 0, 7.2, 0, 0.85, 1), blob(2.5, 1.7, 8.7, 0.9, 0.9, 5), blob(2.4, -1.5, 6.3, -1.1, 0.85, 9)]),
    mergeGeometries([trunk(0.3, 4), cone(3.3, 6, 2.4), cone(2.7, 5.5, 5.4), cone(2.0, 5, 8.4), cone(1.2, 4.2, 11.4)]),
    mergeGeometries([trunk(0.32, 7), blob(3.4, 0, 8.6, 0, 0.6, 14), blob(2.3, 1.3, 10.2, -0.7, 0.65, 17), blob(2.0, -1.4, 7.6, 0.8, 0.6, 21)])];
  const tmat = patch(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94 }), false), CN = 10, CS = SIZE / CN, bins = [];
  const put = (x, z, type, s) => { const ci = clamp(Math.floor((x + HALF) / CS), 0, CN - 1) + CN * clamp(Math.floor((z + HALF) / CS), 0, CN - 1), key = ci * 3 + type; (bins[key] || (bins[key] = [])).push(x, z, s); };
  const step = isTouch ? 22 : 15.5;
  for (let z = -HALF + 8; z < HALF; z += step) for (let x = -HALF + 8; x < HALF; x += step) {
    const jx = x + (R() - 0.5) * step * 0.9, jz = z + (R() - 0.5) * step * 0.9, rr = Math.hypot(jx, jz), f = samp(Fg, jx, jz);
    if (f < 0.575 || (rr > 1650 && R() < 0.55) || samp(Hg, jx, jz) < 0.8) continue;
    const con = vnoise(jx / 190 + 3, jz / 190, 71) + (samp(Hg, jx, jz) > 80 ? 0.2 : 0);                                         // stands of spruce and pine among the broadleaves
    put(jx, jz, con > 0.62 ? 1 : con > 0.52 && R() < 0.5 ? 2 : R() < 0.12 ? 1 : 0, 0.8 + R() * 0.55);
  }
  for (let i = 0; i < 5200; i++) {                                                                  // hedgerow trees along the field edges
    const x = (R() - 0.5) * 3300, z = (R() - 0.5) * 3300; if (samp(Fg, x, z) > 0.5 || samp(Fg, x, z) < -0.05 || samp(Hg, x, z) < 2.5) continue; const F = field(x, z); if (F.e > 4 || F.k < 0.35) continue;
    put(x, z, R() < 0.85 ? 0 : 2, 0.6 + R() * 0.5);
  }
  for (const hs of HOUSES) if (R() < 0.8) put(hs.x + (hs.ry ? (R() - 0.5) * 26 : hs.sd * (17 + R() * 8)), hs.z + (hs.ry ? hs.sd * (17 + R() * 8) : (R() - 0.5) * 26), R() < 0.7 ? 0 : 1, 0.5 + R() * 0.35);
  let total = 0;
  bins.forEach((a, key) => {
    if (!a) return; const type = key % 3, n = a.length / 3, m = new THREE.InstancedMesh(GEO[type], tmat, n); total += n;
    for (let i = 0; i < n; i++) {
      const x = a[i * 3], z = a[i * 3 + 1], s = a[i * 3 + 2]; dummy.position.set(x, samp(Hg, x, z) - 0.3, z); dummy.rotation.set(0, R() * 6.28, 0); dummy.scale.set(s * (0.85 + R() * 0.3), s * (0.9 + R() * 0.35), s * (0.85 + R() * 0.3)); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix);
      if (type === 1) tmpC.setHSL(0.31 + R() * 0.06, 0.34 + R() * 0.14, 0.13 + R() * 0.07); else if (type === 2) tmpC.setHSL(0.27 + R() * 0.06, 0.36 + R() * 0.12, 0.12 + R() * 0.06); else tmpC.setHSL(0.23 + R() * 0.09, 0.42 + R() * 0.18, 0.12 + R() * 0.08);
      m.setColorAt(i, tmpC);
    }
    m.castShadow = true; m.receiveShadow = true; m.computeBoundingSphere(); m.computeBoundingBox(); scene.add(m);
  });
  G.trees = total;

  // ---- the village, the church, the bridge, the ruins
  const b = new Builder(17), WALL = [0xf1ece0, 0xe9dcc0, 0xf6f3ea, 0xdcc9a8, 0xe6e2d8, 0xcfd8dc], ROOF = [0x9c4a35, 0x8a3f2e, 0x4a4a50, 0x6b4a3a, 0xa8553c, 0x3c4046];
  for (const hs of HOUSES) {
    const y = groundAt(hs.x, hs.z) - 0.4, w = 8 + R() * 2.5, d = 11 + R() * 4, hh = 4.6 + (R() < 0.3 ? 2.6 : 0), wall = WALL[(R() * WALL.length) | 0], roof = ROOF[(R() * ROOF.length) | 0], c = Math.cos(hs.ry), s = Math.sin(hs.ry), at = (lx, lz) => [hs.x + lx * c + lz * s, hs.z - lx * s + lz * c];
    b.box(w, hh + 0.4, d, hs.x, y, hs.z, wall, hs.ry, 0.03); b.add(roofGeo(w + 1.1, 3.4, d + 1.1), roof, hs.x, y + hh + 0.4, hs.z, hs.ry, 0.05);
    const [qx, qz] = at(w * 0.22, d * 0.2); b.box(0.8, 1.6, 0.8, qx, y + hh + 2.0, qz, 0x8a5a48, hs.ry);
    for (const lz of [-d * 0.28, d * 0.28]) for (const sx of [-1, 1]) { const [wx, wz] = at(sx * (w / 2 + 0.04), lz); b.box(0.12, 1.3, 1.5, wx, y + 1.9, wz, 0x27323c, hs.ry, 0); }
    if (R() < 0.55) { const [gx, gz] = at(-w * 0.5 - 4, d * 0.1); b.box(4, 2.6, 6, gx, y, gz, wall, hs.ry, 0.03); b.box(4.4, 0.25, 6.4, gx, y + 2.6, gz, 0x55585c, hs.ry); }
  }
  { const y = groundAt(CH.x, CH.z) - 0.4; b.box(12, 10, 28, CH.x, y, CH.z, 0xf3efe6, 0, 0.02); b.add(roofGeo(13, 6, 29), 0x7e3b2c, CH.x, y + 10, CH.z); b.box(7.5, 24, 7.5, CH.x, y, CH.z + 16, 0xf3efe6, 0, 0.02);
    const sp = new THREE.ConeGeometry(5.6, 15, 4); sp.rotateY(Math.PI / 4); b.add(sp, 0x4f8f7b, CH.x, y + 24 + 7.5, CH.z + 16, 0, 0.02); b.box(0.3, 3, 0.3, CH.x, y + 39, CH.z + 16, 0xd9c36a); b.box(1.6, 0.3, 0.3, CH.x, y + 41, CH.z + 16, 0xd9c36a); }
  { const zc = riverZ(BRX); b.box(9.5, 0.9, 118, BRX, 3.3, zc, 0x8e8b84, 0, 0.02); for (const dz of [-36, -12, 12, 36]) b.box(7, 8, 3, BRX, -4.2, zc + dz, 0xa29e96); for (const sx of [-4.5, 4.5]) { b.box(0.25, 1.1, 118, BRX + sx, 4.2, zc, 0xd8d8d2, 0, 0); } }
  { const y = groundAt(TEMPLE.x, TEMPLE.z) - 4; let ty = y; [[44, 7], [35, 6], [26, 6], [17, 6], [9, 7]].forEach(([w, h], i) => { b.box(w, h, w, TEMPLE.x, ty, TEMPLE.z, i % 2 ? 0x8c8674 : 0x9a927c, 0.2, 0.06); ty += h; });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.cyl(1.2, 1.4, 12, TEMPLE.x + sx * 26, y + 2, TEMPLE.z + sz * 26, 0x8f8876, 8); G.templeY = ty; }
  const R2 = rng(5); for (let i = 0; i < 900; i++) { const x = (R2() - 0.5) * 3000, z = (R2() - 0.5) * 3000; if (samp(Fg, x, z) > 0.45 || samp(Hg, x, z) < 4 || far(VIL, x, z) < 330) continue; const F = field(x, z); if (F.id < 0.24 || F.id >= 0.42 || F.e < 9 || far(MEAD, x, z) < 280 || far(FAIR, x, z) < 220) continue; const g2 = new THREE.CylinderGeometry(1.25, 1.25, 1.5, 10); g2.rotateZ(Math.PI / 2); b.add(g2, 0xd9c487, x, groundAt(x, z) + 1.2, z, R2() * 3, 0.08); }   // straw bales on the stubble
  const town = b.mesh(patch(worldMat.clone(), false)); scene.add(town);
  const orb = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 4.2, 1.2) })); orb.position.set(TEMPLE.x, G.templeY + 2.6, TEMPLE.z); scene.add(orb);

  // ---- the landing field: a chalk circle, a windsock, Staś and his friends
  const my = groundAt(MEAD.x, MEAD.z);
  landRing = new THREE.Mesh(new THREE.RingGeometry(24, 27, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xf4f2ea, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })); landRing.position.set(MEAD.x, my + 0.12, MEAD.z); landRing.receiveShadow = true; scene.add(landRing);
  const dot = new THREE.Mesh(new THREE.CircleGeometry(4, 32).rotateX(-Math.PI / 2), landRing.material); dot.position.set(MEAD.x, my + 0.12, MEAD.z); scene.add(dot);
  const pb = new Builder(33); pb.cyl(0.12, 0.16, 9, MEAD.x + 34, my, MEAD.z - 22, 0xe8e8e8, 6); const ws = new THREE.ConeGeometry(0.75, 4.2, 10, 1, true); ws.rotateZ(Math.PI / 2 + 0.25); pb.add(ws, 0xe8552e, MEAD.x + 36.2, my + 8.4, MEAD.z - 22, 0.7, 0.02); scene.add(pb.mesh());
  const WHO = [[0xd9483b, 0x6b4a2a, 0.74, 0x34507a], [0xf2c230, 0x3a2a1c, 0.78, 0x4a4a52], [0x2f9a4a, 0x4a3320, 0.74, 0xf2f2f2], [0x3f6b4a, 0xb9b9b9, 1.04, 0x4a4038], [0xc2476b, 0x8a3b1e, 0.98, 0x2b2f3a]];
  WHO.forEach(([shirt, hair, sc, legs], i) => {
    const f = new Builder(300 + i), skin = 0xe8b890; for (const x of [-0.09, 0.09]) f.box(0.13, 0.78, 0.15, x, 0, 0, legs); f.box(0.42, 0.56, 0.24, 0, 0.78, 0, shirt); for (const x of [-0.27, 0.27]) f.box(0.1, 0.5, 0.1, x, 1.26, 0, shirt, 0, 0);
    f.cyl(0.06, 0.06, 0.08, 0, 1.34, 0, skin); f.blob(0.16, 0, 1.56, 0, skin, 1.05); f.blob(0.172, 0, 1.61, -0.035, hair, 0.9);
    const m = f.mesh(), a = -0.5 + i * 0.62; m.scale.setScalar(sc * 1.15); m.position.set(MEAD.x + Math.sin(a) * 31, my, MEAD.z + Math.cos(a) * 31); m.rotation.y = a + Math.PI; scene.add(m); people.push({ m, x: m.position.x, y: my, z: m.position.z, ry: m.rotation.y, ph: i * 1.3 });
  });
  { const t = canvasTex(256, 80, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = 'rgba(12,9,6,.62)'; c.beginPath(); if (c.roundRect) c.roundRect(4, 4, w - 8, h - 8, 30); else c.rect(4, 4, w - 8, h - 8); c.fill(); c.fillStyle = '#ffd27a'; c.font = 'italic 46px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(T('stas'), w / 2, h / 2 + 2); });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false, toneMapped: false })); sp.scale.set(3.4, 1.06, 1); sp.position.set(0, 2.5, 0); people[0].m.add(sp); }
  // wujek Artur on the river: a small white boat and its wake
  const bb = new Builder(44); bb.box(1.3, 0.6, 3.4, 0, 0, 0, 0xf4f4f0, 0, 0.02); bb.box(1.0, 0.5, 1.2, 0, 0.6, -0.3, 0x22262a, 0, 0); bb.box(0.5, 0.7, 0.4, 0, 1.0, 0.3, 0x2f6fb0, 0, 0); boat = bb.mesh(); scene.add(boat);
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -9, 0, 62, 9, 0, 62], 3)); wg.setAttribute('uv', new THREE.Float32BufferAttribute([0.5, 0, 0, 1, 1, 1], 2));
  wake = new THREE.Mesh(wg, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader: 'varying vec2 vUv; void main(){ float e = abs(vUv.x - 0.5) * 2.0; gl_FragColor = vec4(vec3(1.7), (smoothstep(0.35, 1.0, e) * 0.6 + 0.12) * (1.0 - vUv.y)); }' })); scene.add(wake);
}

// ------------------------------------------------------------------ clouds (lit billboards, sorted back to front)
const PUFFS = [];
function buildClouds() {
  const puff = dataTex(128, (u, v) => { const r = Math.hypot(u - 0.5, v - 0.5) * 2, n = pfbm(u, v, 4, 7, 4), a = clamp(sm(1, 0.1, r + (n - 0.5) * 0.7) * 1.25, 0, 1); return [n, n, n, a]; }, false);
  const R = rng(404), sd = SUN;
  const cloud = (cx, cy, cz, rx, ry, rz, n, size, dark, alpha) => { for (let i = 0; i < n; i++) { const a = R() * 6.28, q = Math.sqrt(R()), ox = Math.cos(a) * q, oz = Math.sin(a) * q, oy = R() * (1 - q * q * 0.8); PUFFS.push({ x: cx + ox * rx, y: cy + oy * ry, z: cz + oz * rz, s: size * (0.7 + R() * 0.6) * (1 - q * 0.3), sh: clamp((0.28 + oy * 0.62 + (ox * sd.x + oz * sd.z) * 0.22) * (1 - dark), 0, 1), rot: R() * 6.28, a: alpha, gate: -1 }); } };
  for (let i = 0; i < 46; i++) { const a = R() * 6.28, r = 300 + R() * 2700, big = 0.7 + R() * 0.9; cloud(Math.cos(a) * r, 360 + R() * 190, Math.sin(a) * r, 170 * big, 62 * big, 130 * big, Math.round(15 * big) + 4, 190 * big, 0, 0.9); }
  cloud(STORM.x, 330, STORM.z, 300, 150, 260, 46, 330, 0.8, 0.97);                                 // the thunder cloud
  const n = PUFFS.length + 40 * 12, g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]), 3)); g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2)); g.setIndex([0, 1, 2, 0, 2, 3]);
  const aP = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3), aD = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4); aP.setUsage(THREE.DynamicDrawUsage); aD.setUsage(THREE.DynamicDrawUsage); g.setAttribute('iPos', aP); g.setAttribute('iData', aD);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTex: { value: puff }, uLit: { value: new THREE.Color(3.3, 3.15, 2.9) }, uDark: { value: new THREE.Color(0.75, 0.9, 1.2) }, uFog: { value: FOG.clone().multiplyScalar(1.25) }, uGold: { value: new THREE.Color(3.6, 2.6, 0.9) } },
    transparent: true, depthWrite: false,
    vertexShader: `attribute vec3 iPos; attribute vec4 iData; varying vec2 vUv; varying float vSh, vA, vD;
      void main(){ vUv = uv; vSh = iData.y; vA = iData.w; vec4 mv = viewMatrix * vec4(iPos, 1.0); float c = cos(iData.z), s = sin(iData.z); mv.xy += mat2(c, -s, s, c) * position.xy * iData.x; vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform sampler2D uTex; uniform vec3 uLit, uDark, uFog, uGold; varying vec2 vUv; varying float vSh, vA, vD;
      void main(){ vec4 t = texture2D(uTex, vUv); float gate = step(1.5, vA), a = t.a * min(vA, 1.0) * smoothstep(4.0, 30.0, vD); if (a < 0.004) discard;
        vec3 col = mix(uDark, uLit, clamp(vSh + (t.r - 0.5) * 0.7, 0.0, 1.0)); col = mix(col, uGold, gate * 0.35);
        col = mix(col, uFog, (1.0 - exp(-vD * vD * 2.2e-8)) * 0.85); gl_FragColor = vec4(col, a * (1.0 - gate * 0.25));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  clouds = new THREE.Mesh(g, mat); clouds.frustumCulled = false; clouds.renderOrder = 5; clouds.userData = { aP, aD, t: 0 }; scene.add(clouds);
}
function sortClouds() {
  const { aP, aD } = clouds.userData, cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
  for (const p of PUFFS) if (p.th) { const u = (p.k + G.t * 0.035) % 1, a = p.ph + G.t * 0.5 + u * 9, r = p.th.r * (0.25 + 0.4 * u); p.x = p.th.x + Math.cos(a) * r; p.z = p.th.z + Math.sin(a) * r; p.y = p.th.gy + 8 + u * (p.th.top + 20 - p.th.gy); p.a = 0.42 * Math.sin(u * Math.PI); }
  for (const p of PUFFS) p.d = (p.x - cx) ** 2 + (p.y - cy) ** 2 + (p.z - cz) ** 2;
  PUFFS.sort((a, b) => b.d - a.d); let n = 0;
  for (const p of PUFFS) { if (p.gate >= 0 && gates[p.gate].done) continue; aP.array[n * 3] = p.x; aP.array[n * 3 + 1] = p.y; aP.array[n * 3 + 2] = p.z; aD.array[n * 4] = p.s; aD.array[n * 4 + 1] = p.sh; aD.array[n * 4 + 2] = p.rot; aD.array[n * 4 + 3] = p.gate >= 0 ? 2 : p.a; n++; }
  clouds.geometry.instanceCount = n; aP.needsUpdate = aD.needsUpdate = true;
}

// ------------------------------------------------------------------ the course: rings, bones, thermals, balloons, storks
const GR = 17;
function buildCourse() {
  const WP = [[START.x, START.y, START.z], [-560, 135, 770], [-280, 105, 640], [BRX, 66, 440], [520, 34, 358], [900, 40, 362], [1090, 120, 20], [TEMPLE.x, 205, TEMPLE.z], [650, 185, -660], [FAIR.x, 160, FAIR.z], [STORM.x, 150, STORM.z + 10], [LAKE.x, 44, LAKE.z], [-1060, 96, -210], [-1000, 62, 130]];
  const curve = new THREE.CatmullRomCurve3(WP.map((p) => new THREE.Vector3(...p)), false, 'centripetal'), L = curve.getLength(), n = Math.round(L / 190), R = rng(77);
  const safe = (p, m) => { p.y = Math.max(p.y, floorAt(p.x, p.z) + m); return p; };
  for (let i = 1; i <= n; i++) {
    const u = i / n, p = safe(curve.getPointAt(u), 24), t = curve.getTangentAt(u); t.y *= 0.4; t.normalize();
    const gi = gates.length; gates.push({ p, t, done: false, hit: false });
    const ax = new THREE.Vector3(0, 1, 0).cross(t).normalize(), ay = t.clone().cross(ax);
    for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283 + R(), r = GR + 4.5 + R() * 2; PUFFS.push({ x: p.x + (ax.x * Math.cos(a) + ay.x * Math.sin(a)) * r, y: p.y + (ax.y * Math.cos(a) + ay.y * Math.sin(a)) * r, z: p.z + (ax.z * Math.cos(a) + ay.z * Math.sin(a)) * r, s: 15 + R() * 6, sh: 0.82 + R() * 0.18, rot: R() * 6.28, a: 1, gate: gi }); }
    if (i < n) for (const f of [0.3, 0.5, 0.7]) { const q = safe(curve.getPointAt((i + f) / n), 16); q.y += Math.sin(f * 9 + i) * 3; items.push({ p: q, got: false }); }
  }
  G.len = L;
  for (let i = 0; i + 1 < gates.length; i++) if (gates[i + 1].p.y - gates[i].p.y > 13) { const a = gates[i].p, c = gates[i + 1].p; thermals.push({ x: (a.x + c.x) / 2, z: (a.z + c.z) / 2, r: 58, top: c.y + 30, s: 12 }); }
  for (const th of thermals) { th.gy = Math.max(0, groundAt(th.x, th.z)); for (let k = 0; k < 18; k++) PUFFS.push({ x: th.x, y: th.gy, z: th.z, s: 9 + R() * 6, sh: 1, rot: R() * 6.28, a: 0.42, gate: -1, th, k: k / 18, ph: R() * 6.28 }); }      // wisps spiralling up mark each thermal
  const mk = (o) => new THREE.Mesh(new THREE.TorusGeometry(GR, 0.42, 8, 56), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 3.4, 0.9), transparent: true, opacity: o }));
  nextRing = mk(1); nextRing2 = mk(0.3); scene.add(nextRing, nextRing2);
  // golden bones
  const gm = new THREE.MeshStandardMaterial({ color: 0xffc84a, metalness: 0.9, roughness: 0.25, emissive: 0xff9a1a, emissiveIntensity: 1.3 }), parts = [new THREE.CapsuleGeometry(0.16, 1.0, 4, 10).rotateZ(Math.PI / 2)];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) parts.push(new THREE.SphereGeometry(0.27, 10, 8).translate(sx * 0.62, sy * 0.18, 0));
  bones = new THREE.InstancedMesh(mergeGeometries(parts), gm, items.length); bones.frustumCulled = false; scene.add(bones);
  // hot-air balloons
  const prof = []; for (let i = 0; i <= 14; i++) { const t = i / 14; prof.push(new THREE.Vector2(0.9 + 8.6 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.72)), 0.85) * (t < 1 ? 1 : 0), t * 21)); }
  const PAL = [[0xd8342c, 0xf4d03f, 0xf2f0e8], [0x2f6fb0, 0xf2f0e8, 0xf09a2a], [0x7a3f9a, 0xf4d03f, 0x2aa198], [0xe8552e, 0xf2f0e8, 0x2f6fb0], [0x2a9d5c, 0xf4d03f, 0xd8342c], [0xf09a2a, 0xd8342c, 0x5a2a6a]];
  const bmat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, side: THREE.DoubleSide });
  const SPOT = [[FAIR.x + 70, 150, FAIR.z + 40], [FAIR.x - 60, 185, FAIR.z - 55], [FAIR.x + 10, 120, FAIR.z - 90], [FAIR.x - 95, 140, FAIR.z + 75], [FAIR.x + 130, 200, FAIR.z - 30], [540, 215, -610], [-420, 150, 560], [-60, 120, 700], [760, 90, 300]];
  SPOT.forEach(([x, y, z], i) => {
    const pal = PAL[i % PAL.length].map((c) => new THREE.Color(c)), g = new THREE.LatheGeometry(prof, 16).toNonIndexed().deleteAttribute('uv'), p = g.attributes.position, col = new Float32Array(p.count * 3), sw = i % 3;
    for (let f = 0; f < p.count; f += 3) { const mx = (p.getX(f) + p.getX(f + 1) + p.getX(f + 2)) / 3, mz = (p.getZ(f) + p.getZ(f + 1) + p.getZ(f + 2)) / 3, my = (p.getY(f) + p.getY(f + 1) + p.getY(f + 2)) / 3, seg = Math.floor((Math.atan2(mz, mx) + Math.PI) / 6.2832 * 16 + 1e-3), band = Math.floor(my / 3);
      const c = pal[sw === 0 ? seg % 2 : sw === 1 ? (seg + band) % 3 : band % 3 === 1 ? 2 : seg % 2]; for (let q = 0; q < 3; q++) { col[(f + q) * 3] = c.r; col[(f + q) * 3 + 1] = c.g; col[(f + q) * 3 + 2] = c.b; } }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
    const bk = new Builder(500 + i); bk.box(1.7, 1.3, 1.7, 0, -4.6, 0, 0x8a6236, 0, 0.05); for (const sx of [-0.8, 0.8]) for (const sz of [-0.8, 0.8]) bk.box(0.05, 3.6, 0.05, sx, -3.4, sz, 0x3a3028, 0, 0); bk.box(0.5, 0.4, 0.5, 0, -1.2, 0, 0x55585c, 0, 0);
    const grp = new THREE.Group(), env = new THREE.Mesh(g, bmat), bas = bk.mesh(); env.castShadow = true; grp.add(env, bas); grp.position.set(x, y, z); scene.add(grp); balloons.push({ g: grp, x, y, z, ph: i * 1.7 });
  });
  // storks, in threes, crossing the route
  const sb = () => { const s = new Builder(600), w = 0xf2f0ea, k = 0x1c1c1e, r = 0xd8452c; const body = new THREE.SphereGeometry(0.34, 10, 8); body.scale(1, 0.9, 2.6); s.add(body, w, 0, 0, 0, 0, 0.02); s.box(0.14, 0.14, 1.0, 0, -0.02, -1.25, w, 0, 0); const hd = new THREE.SphereGeometry(0.17, 8, 6); s.add(hd, w, 0, 0.05, -1.8, 0, 0); const bk = new THREE.ConeGeometry(0.06, 0.75, 6); bk.rotateX(-Math.PI / 2); s.add(bk, r, 0, 0, -2.3, 0, 0); s.box(0.5, 0.1, 0.5, 0, 0, 0.95, k, 0, 0); for (const sx of [-0.08, 0.08]) s.box(0.04, 0.04, 1.3, sx, -0.12, 1.5, r, 0, 0); return s.mesh(); };
  const wing = (sd) => { const s = new Builder(601); s.box(1.2, 0.05, 0.85, sd * 0.6, 0, 0, 0xf2f0ea, 0, 0.02); s.box(1.25, 0.05, 0.8, sd * 1.8, 0, 0.06, 0x1c1c1e, 0, 0); s.box(2.3, 0.05, 0.3, sd * 1.25, 0, 0.5, 0x1c1c1e, 0, 0); return s.mesh(); };
  for (const gi of [3, 8, 14, 19, 25]) if (gates[gi] && gates[gi + 1]) {
    const a = gates[gi].p, c = gates[gi + 1].p, mid = a.clone().lerp(c, 0.5), dir = new THREE.Vector3(c.z - a.z, 0, a.x - c.x).normalize();
    for (let k = 0; k < 3; k++) { const g = new THREE.Group(), wl = wing(-1), wr = wing(1); g.add(sb(), wl, wr); g.scale.setScalar(1.7); scene.add(g); storks.push({ g, wl, wr, mid, dir, off: (k - 1) * 9, back: Math.abs(k - 1) * 7, y: mid.y + (k - 1) * 2.5 + 3, ph: gi * 0.37 + k, x: 0, z: 0 }); }
  }
  // rain for the storm: streaks in a box that follows the camera
  const rp = new Float32Array(700 * 6), R8 = rng(8); for (let i = 0; i < 700; i++) { const x = (R8() - 0.5) * 90, y = R8() * 60 - 30, z = (R8() - 0.5) * 90; rp.set([x, y, z, x + 0.5, y - 2.6, z + 0.2], i * 6); }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3)); rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: new THREE.Color(1.6, 1.8, 2.1), transparent: true, opacity: 0 })); rain.frustumCulled = false; rain.visible = false; scene.add(rain);
}

// ------------------------------------------------------------------ the kite
function buildKite() {
  kite = new THREE.Group(); kite.rotation.order = 'YXZ'; scene.add(kite);
  const NU = 16, NV = 8, pos = [], col = [], idx = [], c = new THREE.Color(), PAN = [0xf2c21c, 0xf07a1a, 0xd9342c, 0x8a2a8f];
  for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) { const u = i / NU * 2 - 1, v = j / NV, au = Math.abs(u); pos.push(u * v * 2.7, 0, -1.5 + v * 2.7 - au * v * 0.25); const band = Math.min(3, Math.floor(au * 4)), seam = Math.abs(au * 4 - Math.round(au * 4)) < 0.06 && au > 0.1; c.set(seam ? 0x1e1e22 : PAN[band]); if (v > 0.86) c.set(0x1e1e22); col.push(c.r, c.g, c.b); }
  for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const a = j * (NU + 1) + i, b = a + 1, d = a + NU + 1, e = d + 1; idx.push(a, d, b, b, d, e); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); sg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); sg.setIndex(idx);
  sail = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.5, emissive: 0xffffff, emissiveIntensity: 0.0 })); sail.castShadow = true; sail.userData = { NU, NV }; kite.add(sail);
  const carbon = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4 }), rod = (a, b, r = 0.03) => { const d = b.clone().sub(a), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 6), carbon); m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); kite.add(m); return m; };
  const nose = new THREE.Vector3(0, 0, -1.5), tl = new THREE.Vector3(-2.7, 0.42, 0.95), tr = new THREE.Vector3(2.7, 0.42, 0.95), keel = new THREE.Vector3(0, 0, 1.2);
  rod(nose, tl); rod(nose, tr); rod(nose, keel); rod(new THREE.Vector3(-1.5, 0.22, 0.1), new THREE.Vector3(1.5, 0.22, 0.1), 0.025);
  const bar = new THREE.Vector3(0, -2.5, 0.25); rod(new THREE.Vector3(-0.75, -2.5, 0.25), new THREE.Vector3(0.75, -2.5, 0.25), 0.035);
  const lp = []; for (const a of [new THREE.Vector3(0, 0, -0.9), new THREE.Vector3(-1.5, 0.22, 0.1), new THREE.Vector3(1.5, 0.22, 0.1), new THREE.Vector3(0, 0, 0.9)]) for (const sx of [-0.7, 0.7]) lp.push(a.x, a.y, a.z, bar.x + sx, bar.y, bar.z);
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3)); kite.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0xf2f2f2 })));
  for (const [sx, cl] of [[-1, 0xd9342c], [1, 0xf2c21c]]) {                         // three long tails that stream behind
    const n = 22, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((n + 1) * 6), 3)); const ix = []; for (let i = 0; i < n; i++) { const a = i * 2; ix.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } g.setIndex(ix);
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: cl, side: THREE.DoubleSide, roughness: 0.6 })); m.frustumCulled = false; kite.add(m); tails.push({ m, n, x: sx * 2.55, z: 0.95, ph: sx * 2 + 1, len: 7.5 });
  }
  dog = buildDog(tex, {}); kite.add(dog.root); dog.root.scale.setScalar(1.25);
}
function animKite(dt) {
  const p = sail.geometry.attributes.position, { NU, NV } = sail.userData, t = G.t, fl = clamp(P.v / 22, 0.5, 1.6);
  for (let j = 0, i = 0; j <= NV; j++) for (let q = 0; q <= NU; q++, i++) { const u = q / NU * 2 - 1, v = j / NV, au = Math.abs(u); p.setY(i, (0.34 * Math.sin(Math.PI * Math.min(1, au * 1.15)) * (0.5 + 0.5 * au) + au * 0.16) * v + Math.sin(t * 17 * fl + u * 7 + v * 5) * 0.035 * v * v * fl); }
  p.needsUpdate = true; sail.geometry.computeVertexNormals();
  for (const tl of tails) { const a = tl.m.geometry.attributes.position; for (let i = 0; i <= tl.n; i++) { const s = i / tl.n, z = tl.z + s * tl.len, w = Math.sin(t * 9 * fl - s * 9 + tl.ph) * 0.35 * s, y = 0.05 + Math.cos(t * 7 * fl - s * 7 + tl.ph) * 0.25 * s - s * s * 0.5 + P.pitch * s * tl.len * 0.5, x = tl.x * (1 - s * 0.12) + w - P.roll * s * 2.2, hw = 0.085 * (1 - s * 0.5), y0 = 0.42; a.setXYZ(i * 2, x - hw, y + y0, z); a.setXYZ(i * 2 + 1, x + hw, y + y0, z); } a.needsUpdate = true; tl.m.geometry.computeVertexNormals(); }
}

// ------------------------------------------------------------------ HUD and input
let hintT = 0, pickT = 0;
function hint(key, once = true) { if (once) { if (G.hints.has(key)) return; G.hints.add(key); } $('hint').textContent = T(key); $('hint').style.opacity = 1; hintT = 4; }
function pick(text) { $('pick').textContent = text; $('pick').style.opacity = 1; pickT = 1.6; }
function place(key) { if (G.places.has(key)) return; G.places.add(key); const el = $('place'); $('placeKind').textContent = T('k_' + key); $('placeName').textContent = T('p_' + key); el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); if (audio.on) audio.placeChime(); }
const buzz = (p) => { try { if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(p); } catch (_) { /* not supported */ } };
const clock = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const KITE = '<svg viewBox="0 0 32 32"><path d="M16 2l11 12-11 16L5 14z"/></svg>';
const shown = {};
const target = () => (G.gi < gates.length ? gates[G.gi].p : tmpV2.set(MEAD.x, groundAt(MEAD.x, MEAD.z), MEAD.z));
function hud(force) {
  const set = (id, v, html) => { if (!force && shown[id] === v) return; shown[id] = v; if (html) $(id).innerHTML = v; else $(id).textContent = v; };
  set('rScore', String(G.score)); set('rSub', T('sub', G.got, gates.length, G.bones, Math.max(0, Math.round(P.y - Math.max(0, groundAt(P.x, P.z))))));
  set('rLives', [0, 1, 2].map((i) => `<span class="${i < G.lives ? '' : 'lost'}">${KITE}</span>`).join(''), true);
  const tg = target(), m = Math.round(Math.hypot(tg.x - P.x, tg.z - P.z) / 10) * 10; set('rLabel', G.gi < gates.length ? T('next', m) : T('land', m));
  const k = Math.round(clamp(G.gi / Math.max(1, gates.length), 0, 1) * 100); if (shown.prog !== k) { shown.prog = k; $('rDog').style.left = k + '%'; }
}
function applyLang() {
  $('title').querySelector('h1').innerHTML = `<small>${T('over')}</small>${T('title')}`;
  $('title').querySelector('.story').textContent = T('story'); $('start').textContent = T('start'); $('title').querySelector('.keys').textContent = T('keys');
  $('again').textContent = T('again'); $('menu').textContent = T('menu'); $('lang').textContent = lang === 'pl' ? 'EN' : 'PL'; $('bBark').textContent = T('bark'); hud(true);
}
function bark() { if (G.mode !== 'play' && G.mode !== 'win') return; if (audio.on) audio.bark(); dog.bark(); }
window.addEventListener('keydown', (e) => {
  if (e.repeat) return; keys[e.code] = true;
  if (e.code === 'Space' || e.code === 'Enter') { if (G.mode === 'title') startGame(); else if (e.code === 'Space') bark(); e.preventDefault(); }
  if (e.code === 'KeyM' && audio.on) audio.toggleMusic();
  if (e.code === 'KeyP') document.body.classList.toggle('clean');
  if (e.code.startsWith('Arrow')) e.preventDefault();
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
{
  const zone = $('joyZone'), base = $('joy'), knob = $('joyKnob'), R = 50, NP = { passive: false }; let id = null, ox = 0, oy = 0;
  const each = (e, fn) => { e.preventDefault(); for (const t of e.changedTouches) fn(t); };
  const set = (dx, dy) => { const l = Math.hypot(dx, dy), q = l > R ? R / l : 1; dx *= q; dy *= q; knob.style.transform = `translate(${dx}px, ${dy}px)`; touch.x = Math.abs(dx) < 6 ? 0 : dx / R; touch.y = Math.abs(dy) < 6 ? 0 : -dy / R; };
  zone.addEventListener('touchstart', (e) => each(e, (t) => { if (id !== null) return; id = t.identifier; const r = zone.getBoundingClientRect(); ox = t.clientX; oy = t.clientY; base.style.left = (ox - r.left) + 'px'; base.style.top = (oy - r.top) + 'px'; base.classList.add('act'); set(0, 0); }), NP);
  zone.addEventListener('touchmove', (e) => each(e, (t) => { if (t.identifier === id) set(t.clientX - ox, t.clientY - oy); }), NP);
  const end = (e) => each(e, (t) => { if (t.identifier !== id) return; id = null; base.classList.remove('act'); base.style.left = base.style.top = ''; set(0, 0); });
  zone.addEventListener('touchend', end, NP); zone.addEventListener('touchcancel', end, NP);
  $('bBark').addEventListener('touchstart', (e) => { e.preventDefault(); bark(); }, NP);
  $('bMusic').addEventListener('touchstart', (e) => { e.preventDefault(); if (audio.on) $('bMusic').classList.toggle('off', !audio.toggleMusic()); }, NP);
  for (const g of ['gesturestart', 'gesturechange']) document.addEventListener(g, (e) => e.preventDefault());
}

// ------------------------------------------------------------------ game flow
const HUDS = ['rTop', 'rLives', 'rMila'];
function aim() { const tg = target(); return Math.atan2(tg.x - P.x, -(tg.z - P.z)); }
function reset() {
  Object.assign(G, { t: G.t, time: 0, lives: 3, bones: 0, score: 0, gi: 0, got: 0, combo: 0, inv: 0, boost: 0, shake: 0, endT: 0, ct: 0, storm: 0, bolt: 3, inTh: 0 }); G.hints.clear(); G.places.clear();
  for (const g of gates) { g.done = false; g.hit = false; } for (const it of items) it.got = false;
  Object.assign(P, { x: START.x, y: START.y, z: START.z, pitch: 0, roll: 0, v: 21 }); P.yaw = aim();
  people.forEach((p) => { p.m.position.set(p.x, p.y, p.z); p.m.rotation.set(0, p.ry, 0); });
  kite.add(dog.root); dog.root.position.set(0, -3.25, 0.15); dog.root.rotation.set(0, Math.PI, 0); if (clouds) clouds.userData.t = 0;
}
function startGame() {
  if (G.mode !== 'title') return;
  reset(); audio.start(); G.mode = 'play'; $('title').classList.add('hidden'); for (const id of HUDS) $(id).style.opacity = 1;
  setTimeout(() => { if (G.mode === 'play') hint('h_start'); }, 700); audio.bark(); dog.bark();
}
function toTitle() { reset(); G.mode = 'title'; $('end').classList.add('hidden'); $('title').classList.remove('hidden'); for (const id of HUDS) $(id).style.opacity = 0; arrow.style.opacity = 0; }
function finish(win) {
  const r = G.got / gates.length, stars = win ? (r >= 0.85 && G.lives === 3 ? '★★★' : r >= 0.6 || G.lives === 3 ? '★★☆' : '★☆☆') : '';
  $('endTitle').textContent = T(win ? 'winT' : 'loseT'); $('endText').textContent = win ? T('winX', clock(G.time), G.got, gates.length, G.bones, stars) : T('loseX', G.got, gates.length);
  $('end').classList.remove('hidden'); $('menu').style.display = ''; for (const id of [...HUDS, 'hint', 'pick']) $(id).style.opacity = 0; arrow.style.opacity = 0;
}
function flash() { $('flash').style.opacity = 1; setTimeout(() => { $('flash').style.opacity = 0; }, 180); }
function hurt(text) {
  G.lives--; G.inv = 2.4; G.shake = 0.9; G.combo = 0; buzz(160); pick(text); flash(); if (audio.on) { audio.crack(); audio.yelp(); }
  for (let k = 0; k < 26; k++) pAdd.spawn(P.x, P.y, P.z, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, 0.9, 0.5, 0.1, 5, 4, 2, 1, 4, 1);
}
function bumped(text, ox, oy, oz) {                                                                 // a balloon or a stork: knocked aside, one life gone
  if (G.inv > 0 || G.noHit) return; hurt(text); G.boost = -9; P.roll += (P.x - ox + P.z - oz > 0 ? 1 : -1) * 1.1; P.pitch = clamp(P.pitch + (P.y > oy ? 0.3 : -0.3), -0.6, 0.4);
  if (G.lives <= 0) { G.mode = 'over'; G.endT = 0; if (audio.on) audio.night(); }
}
function crash() {                                                                                  // too low: tumble, then back to the last ring
  if (G.noHit) { P.y = floorAt(P.x, P.z) + 3; return; } hurt(T('crash')); G.mode = G.lives <= 0 ? 'over' : 'crash'; G.ct = 0; G.endT = 0; if (G.lives <= 0 && audio.on) audio.night();
}
function respawn() {
  const g = G.gi > 0 ? gates[G.gi - 1] : null; if (g) { P.x = g.p.x; P.y = g.p.y + 4; P.z = g.p.z; } else { P.x = START.x; P.y = START.y; P.z = START.z; }
  P.yaw = aim(); P.pitch = 0; P.roll = 0; P.v = 20; G.boost = 0; G.inv = 2.6; G.mode = 'play';
}
const stormK = () => sm(STORM.r, STORM.r * 0.55, Math.hypot(P.x - STORM.x, P.z - STORM.z));
function fly(dt, ix, iy) {
  P.roll += (ix * 0.82 - P.roll) * Math.min(1, dt * 3.2); P.yaw += P.roll * 1.25 * dt;
  P.pitch += ((iy > 0 ? iy * 0.37 : iy * 0.62) - P.pitch) * Math.min(1, dt * 2.4);
  P.v += (21 - Math.sin(P.pitch) * 30 + G.boost - P.v) * Math.min(1, dt * 0.9); G.boost *= Math.exp(-dt * 0.45);
  let lift = -1.0, th = 0; for (const t of thermals) { const d = Math.hypot(P.x - t.x, P.z - t.z) / t.r; if (d < 1 && P.y < t.top) { th = (1 - d * d); lift += t.s * th; } }
  G.inTh += (th - G.inTh) * Math.min(1, dt * 3); G.storm = stormK(); lift -= G.storm * 3.2; if (P.y > 300) lift -= (P.y - 300) * 0.25;
  if (G.storm > 0.2) { P.roll += (Math.sin(G.t * 3.1) + Math.sin(G.t * 7.3)) * 0.35 * G.storm * dt * 3; P.pitch += Math.sin(G.t * 5.3) * 0.2 * G.storm * dt * 3; }
  const r = Math.hypot(P.x, P.z); if (r > 1720) { let da = Math.atan2(-P.x, P.z) - P.yaw; da = Math.atan2(Math.sin(da), Math.cos(da)); P.yaw += clamp(da, -1, 1) * dt * 1.6 * sm(1720, 1850, r); }
  const cp = Math.cos(P.pitch); P.x += Math.sin(P.yaw) * cp * P.v * dt; P.z -= Math.cos(P.yaw) * cp * P.v * dt; P.y += (Math.sin(P.pitch) * P.v + lift) * dt;
}
function bot() {
  const tg = target(), dx = tg.x - P.x, dz = tg.z - P.z, dist = Math.hypot(dx, dz); let da = Math.atan2(dx, -dz) - P.yaw; da = Math.atan2(Math.sin(da), Math.cos(da));
  input.x = clamp(da * 2.4 - P.roll * 0.3, -1, 1);
  const landing = G.gi >= gates.length, want = landing ? tg.y + clamp(dist * 0.16, 0, 60) - (dist < 40 ? 4 : 0) : tg.y, need = Math.max(want, floorAt(P.x + Math.sin(P.yaw) * 60, P.z - Math.cos(P.yaw) * 60) + (landing && dist < 220 ? 2 : 14));
  input.y = clamp(((need - P.y) / Math.max(40, dist) * 5.5) + (need - P.y) * 0.04 - Math.sin(P.pitch) * 0.6, -1, 1);
}

function step(dt) {
  G.t += dt; U.uTime.value = G.t; const play = G.mode === 'play', title = G.mode === 'title', win = G.mode === 'win';
  if (play) {
    G.time += dt; G.inv = Math.max(0, G.inv - dt);
    if (G.bot) bot(); else { input.x = clamp((keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + touch.x, -1, 1); input.y = clamp((keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) + touch.y, -1, 1); }
    const px = P.x, py = P.y, pz = P.z; fly(dt, input.x, input.y);
    // rings
    if (G.gi < gates.length) {
      const g = gates[G.gi], d0 = (px - g.p.x) * g.t.x + (py - g.p.y) * g.t.y + (pz - g.p.z) * g.t.z, d1 = (P.x - g.p.x) * g.t.x + (P.y - g.p.y) * g.t.y + (P.z - g.p.z) * g.t.z;
      if (d1 >= 0 && d0 < 60) {
        const lat = Math.sqrt(Math.max(0, (P.x - g.p.x) ** 2 + (P.y - g.p.y) ** 2 + (P.z - g.p.z) ** 2 - d1 * d1)); g.done = true; G.gi++; clouds.userData.t = 0;
        if (lat < GR + 1.5) { g.hit = true; G.got++; G.combo = Math.min(5, G.combo + 1); G.score += 100 * G.combo; G.boost = Math.min(14, G.boost + 9); pick(T('gate', G.combo)); buzz(25); if (audio.on) { audio.chime(Math.min(5, G.combo)); audio.whoosh(); }
          for (let k = 0; k < 40; k++) { const a = Math.random() * 6.28; pAdd.spawn(g.p.x + Math.cos(a) * GR * 0.9 * g.t.z, g.p.y + Math.sin(a) * GR * 0.9, g.p.z - Math.cos(a) * GR * 0.9 * g.t.x, g.t.x * 14, g.t.y * 14 + 2, g.t.z * 14, 1.1, 1.4, 0.2, 6, 4.4, 1.6, 1, 0, 0.6); } }
        else { G.combo = 0; pick(T('miss')); }
        if (G.gi >= gates.length) hint('h_land');
      }
    }
    // bones
    for (const it of items) if (!it.got && Math.abs(it.p.x - P.x) < 8 && (it.p.x - P.x) ** 2 + (it.p.y - P.y + 1.5) ** 2 + (it.p.z - P.z) ** 2 < 60) { it.got = true; G.bones++; G.score += 10; if (audio.on) audio.coin(G.bones % 8); for (let k = 0; k < 8; k++) pAdd.spawn(it.p.x, it.p.y, it.p.z, (Math.random() - 0.5) * 6, Math.random() * 5, (Math.random() - 0.5) * 6, 0.6, 0.6, 0.05, 6, 4.2, 1.2, 1, 6, 1); }
    // balloons and storks
    for (const b of balloons) { const d = Math.hypot(P.x - b.g.position.x, P.z - b.g.position.z); if (d < 190 && Math.abs(P.y - b.y) < 80) hint('h_balloon'); if (d < 10.5 && P.y > b.g.position.y - 7 && P.y < b.g.position.y + 23.5) bumped(T('hitB'), b.g.position.x, b.g.position.y + 11, b.g.position.z); }
    for (const s of storks) { const d = (P.x - s.x) ** 2 + (P.y - 1 - s.g.position.y) ** 2 + (P.z - s.z) ** 2; if (d < 150 * 150) hint('h_stork'); if (d < 3.4 * 3.4) bumped(T('hitS'), s.x, s.g.position.y, s.z); }
    // the ground
    const fl = floorAt(P.x, P.z), dm = far(MEAD, P.x, P.z);
    if (P.y - fl < 14 && dm > 110 && G.inv <= 0) hint('h_low', false);
    if (P.y < fl + 1.7) { if (dm < 95) { G.mode = 'win'; G.endT = 0; G.score += G.lives * 200 + (dm < 27 ? 300 : 0); if (audio.on) audio.fanfare(); for (const id of [...HUDS, 'hint']) $(id).style.opacity = 0; arrow.style.opacity = 0; } else if (G.mode === 'play') crash(); }
    if (G.inTh > 0.4) hint('h_thermal'); if (G.storm > 0.3) hint('h_storm');
    const PL = [[VIL, 300, 'village'], [{ x: 520, z: 358 }, 260, 'river'], [TEMPLE, 330, 'ruin'], [FAIR, 300, 'fair'], [LAKE, 300, 'lake'], [MEAD, 330, 'meadow']]; for (const [c, r, key] of PL) if (far(c, P.x, P.z) < r && (key !== 'meadow' || G.gi >= gates.length - 1)) place(key);
  } else if (title) { fly(dt, 0.22, clamp((START.y - P.y) * 0.05, -0.5, 0.5)); if (far(START, P.x, P.z) > 300) P.yaw += dt * 0.3; }
  else if (G.mode === 'crash') { G.ct += dt; P.roll += dt * 7; P.pitch = -0.5; P.y = Math.max(floorAt(P.x, P.z) + 1.2, P.y - 5 * dt); if (G.ct > 1.2) respawn(); }
  else if (G.mode === 'over') { G.endT += dt; P.roll = Math.sin(G.t * 5) * 0.9; P.pitch = -0.35; P.yaw += dt * 2.2; P.y = Math.max(groundAt(P.x, P.z) + 1.0, P.y - 9 * dt); P.x += Math.sin(P.yaw) * 5 * dt; P.z -= Math.cos(P.yaw) * 5 * dt; if (G.endT > 3 && $('end').classList.contains('hidden')) finish(false); }
  else if (win) {                                                                                   // touchdown: the kite slides to a stop, Łatka hops off, everybody cheers
    G.endT += dt; P.v *= Math.exp(-dt * 2.6); P.roll *= Math.exp(-dt * 5); P.pitch += (0.12 - P.pitch) * Math.min(1, dt * 4); P.x += Math.sin(P.yaw) * P.v * dt; P.z -= Math.cos(P.yaw) * P.v * dt; P.y += (groundAt(P.x, P.z) + 3.6 - P.y) * Math.min(1, dt * 5);
    if (G.endT > 1.1 && dog.root.parent === kite) { scene.attach(dog.root); dog.root.rotation.set(0, dog.root.rotation.y, 0); G.hop = 4.5; G.hopY = 0.01; }
    if (dog.root.parent !== kite) { G.hop -= 16 * dt; G.hopY = Math.max(0, G.hopY + G.hop * dt); dog.root.position.y = groundAt(dog.root.position.x, dog.root.position.z) + G.hopY; G.party = (G.party || 0) - dt;
      if (G.hopY <= 0 && G.party <= 0 && G.endT < 8) { G.party = 0.85; G.hop = 4; G.hopY = 0.01; if (audio.on) audio.bark(0.95 + Math.random() * 0.2); dog.bark(); const c = [[6, 4, 1.2], [6, 1.4, 2], [1.6, 3.6, 6], [2.4, 6, 1.8]][(Math.random() * 4) | 0]; for (let q = 0; q < 46; q++) { const a = Math.random() * 6.28, b2 = Math.acos(2 * Math.random() - 1), v = 4 + Math.random() * 3; pAdd.spawn(P.x + (Math.random() - 0.5) * 14, groundAt(P.x, P.z) + 6 + Math.random() * 3, P.z + (Math.random() - 0.5) * 14, Math.sin(b2) * Math.cos(a) * v, Math.cos(b2) * v, Math.sin(b2) * Math.sin(a) * v, 1.4, 0.5, 0.06, c[0], c[1], c[2], 1, 2.4, 1.2); } } }
    people.forEach((p, i) => { const a = P.yaw + 0.9 + i * 0.75, tx = P.x + Math.sin(a) * 6.5, tz = P.z - Math.cos(a) * 6.5, dx = tx - p.m.position.x, dz = tz - p.m.position.z, dd = Math.hypot(dx, dz) || 1, v = Math.min(11, dd * 3); p.m.position.x += dx / dd * v * dt; p.m.position.z += dz / dd * v * dt; p.m.position.y = groundAt(p.m.position.x, p.m.position.z) + Math.abs(Math.sin(G.t * 6 + p.ph)) * 0.55; p.m.lookAt(P.x, p.m.position.y, P.z); });
    if (G.endT > 8.5 && $('end').classList.contains('hidden')) finish(true);
  }
  // ---- the kite and its passenger
  const sh = G.shake * G.shake; G.shake = Math.max(0, G.shake - dt * 1.4);
  kite.position.set(P.x, P.y, P.z); kite.rotation.set(P.pitch * 0.9 + 0.08, -P.yaw, -P.roll); kite.visible = !(play && G.inv > 0 && Math.floor(G.t * 14) % 2 === 0); animKite(dt);
  if (dog.root.parent === kite) { dog.root.rotation.set(-P.pitch * 0.5 + Math.sin(G.t * 1.7) * 0.06, Math.PI, P.roll * 0.35 + Math.sin(G.t * 2.3) * 0.05); dog.animate(dt, { speed: 0, grounded: false, vy: 2 + Math.sin(G.t * 2) * 1.5, happy: 0.8, pant: true, lookY: clamp(-P.roll * 0.6, -0.6, 0.6) }); }
  else dog.animate(dt, { speed: 0, grounded: G.hopY <= 0, vy: G.hop, happy: 1, pant: true, sit: G.endT > 8 ? 1 : 0 });
  // ---- things in the sky and on the water
  for (const b of balloons) { b.g.position.y = b.y + Math.sin(G.t * 0.4 + b.ph) * 3; b.g.position.x = b.x + Math.sin(G.t * 0.13 + b.ph) * 6; b.g.rotation.y = G.t * 0.05 + b.ph; }
  for (const s of storks) { const q = Math.sin(G.t * 0.11 + s.ph * 0.3) * 150, fw = Math.cos(G.t * 0.11 + s.ph * 0.3) > 0 ? 1 : -1; s.x = s.mid.x + s.dir.x * (q - s.back * fw) - s.dir.z * s.off; s.z = s.mid.z + s.dir.z * (q - s.back * fw) + s.dir.x * s.off; s.g.position.set(s.x, s.y + Math.sin(G.t * 0.9 + s.ph) * 1.2, s.z); s.g.rotation.y = Math.atan2(-s.dir.x * fw, -s.dir.z * fw); const f = Math.sin(G.t * 5.2 + s.ph * 2) * 0.55; s.wl.rotation.z = -f; s.wr.rotation.z = f; }
  { const bx = 560 + Math.sin(G.t * 0.045) * 420, dir = Math.cos(G.t * 0.045) > 0 ? 1 : -1, bz = riverZ(bx), a = Math.atan2(dir, dir * (riverZ(bx + 2) - riverZ(bx - 2)) / 4); boat.position.set(bx, 0.15, bz); boat.rotation.y = a + Math.PI; wake.position.set(bx, 0.08, bz); wake.rotation.y = a + Math.PI; }
  let n = 0; for (const it of items) { if (it.got) continue; dummy.position.copy(it.p); dummy.position.y += Math.sin(G.t * 2.4 + it.p.x) * 0.4; dummy.rotation.set(0.3, G.t * 2.6 + it.p.z, 0.5); dummy.scale.setScalar(1.7); dummy.updateMatrix(); bones.setMatrixAt(n++, dummy.matrix); } bones.count = n; bones.instanceMatrix.needsUpdate = true;
  const g0 = gates[G.gi], g1 = gates[G.gi + 1], showR = play || G.mode === 'crash';
  nextRing.visible = !!g0 && showR; if (g0) { nextRing.position.copy(g0.p); nextRing.lookAt(tmpV.copy(g0.p).add(g0.t)); nextRing.scale.setScalar(1 + Math.sin(G.t * 5) * 0.03); }
  nextRing2.visible = !!g1 && showR; if (g1) { nextRing2.position.copy(g1.p); nextRing2.lookAt(tmpV.copy(g1.p).add(g1.t)); }
  pAdd.update(dt);
  // ---- camera
  const fx = Math.sin(P.yaw), fz = -Math.cos(P.yaw), tall = camera.aspect < 1 ? 1 : 0;
  if (win) { const a = P.yaw + 2.4 + G.endT * 0.16, gy = groundAt(P.x, P.z); camera.position.lerp(tmpV.set(P.x + Math.sin(a) * (13 + tall * 4), gy + 3.4, P.z - Math.cos(a) * (13 + tall * 4)), Math.min(1, dt * 1.6)); camera.lookAt(P.x, gy + 2.2, P.z); }
  else if (title) { const a = G.t * 0.1 + 0.6; camera.position.set(P.x + Math.sin(a) * 13, P.y + 1.5, P.z + Math.cos(a) * 13); camera.lookAt(P.x, P.y - 1.2, P.z); }
  else {
    const back = 10.5 + tall * 4 + clamp(P.v - 21, -4, 14) * 0.12, up = 3.1 + tall * 1.2 - P.pitch * 5;
    tmpV.set(P.x - fx * back, Math.max(P.y + up, groundAt(P.x - fx * back, P.z - fz * back) + 2), P.z - fz * back); camera.position.lerp(tmpV, Math.min(1, dt * 6));
    camera.position.x += (Math.random() - 0.5) * (sh + G.storm * 0.25); camera.position.y += (Math.random() - 0.5) * (sh + G.storm * 0.25);
    camera.lookAt(P.x + fx * 16, P.y - 1.4 + Math.sin(P.pitch) * 12, P.z + fz * 16); camera.rotateZ(-P.roll * 0.3);
  }
  const fov = 62 + tall * 10 + clamp(P.v - 21, 0, 16) * 0.75; if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 3); camera.updateProjectionMatrix(); }
  camera.updateMatrixWorld();
  sky.position.copy(camera.position); flare.position.copy(camera.position).addScaledVector(SUN, 3000);
  const tx = Math.round((P.x + fx * 110) / 8) * 8, tz = Math.round((P.z + fz * 110) / 8) * 8; sun.target.position.set(tx, 0, tz); sun.position.set(tx, 0, tz).addScaledVector(SUN, 700); sun.target.updateMatrixWorld();
  clouds.userData.t -= dt; if (clouds.userData.t <= 0) { clouds.userData.t = 0.05; sortClouds(); }
  // ---- storm
  rain.visible = G.storm > 0.02; if (rain.visible) { rain.material.opacity = G.storm * 0.5; rain.position.set(camera.position.x, camera.position.y - ((G.t * 46) % 30) + 15, camera.position.z); }
  if (play && G.storm > 0.3) { G.bolt -= dt; if (G.bolt <= 0) { G.bolt = 2.5 + Math.random() * 4; G.light = 1; if (audio.on) setTimeout(() => audio.rumble(1.6), 350); } }
  G.light = Math.max(0, (G.light || 0) - dt * 5); renderer.toneMappingExposure = 0.5 * (1 - G.storm * 0.35) * (1 + G.light * (0.6 + 0.6 * Math.sin(G.t * 60)));
  // ---- the pointer to the next ring
  if (play) {
    const tg = target(); tmpV.copy(tg).project(camera); let x = tmpV.x, y = tmpV.y; const behind = tmpV.z > 1; if (behind) { x = -x; y = -y; }
    if (behind || Math.abs(x) > 0.9 || Math.abs(y) > 0.86) { const q = 1 / Math.max(Math.abs(x) / 0.86, Math.abs(y) / 0.8, 1e-3); x *= q; y *= q; if (behind) { const l = Math.hypot(x, y) || 1; x = x / l * 0.86; y = y / l * 0.8; } arrow.style.opacity = 1; arrow.style.left = (50 + x * 50) + '%'; arrow.style.top = (50 - y * 50) + '%'; arrow.style.transform = `translate(-50%,-50%) rotate(${-Math.atan2(y, x * camera.aspect)}rad)`; }
    else arrow.style.opacity = 0;
  }
  hud(); if (hintT > 0) { hintT -= dt; if (hintT <= 0) $('hint').style.opacity = 0; } if (pickT > 0) { pickT -= dt; if (pickT <= 0) $('pick').style.opacity = 0; }
  if (audio.on) { const c = audio.ctx.currentTime; audio.music({ tunnel: 0, night: 0, win: win ? 1 : 0, lost: G.mode === 'over' }); audio.wind.g.gain.setTargetAtTime(win ? 0.03 : 0.07 + P.v * 0.006 + G.storm * 0.12, c, 0.3); audio.wind.f.frequency.setTargetAtTime(260 + P.v * 22, c, 0.3); }
  $('touch').classList.toggle('on', play);
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
  document.body.classList.add('raft', 'kite'); if (isTouch) document.body.classList.add('touch');
  await new Promise((r) => setTimeout(r, 30));
  tex = createTextures(); fogUniforms.uFogDensity.value = 0.0002; fogUniforms.uFogColor.value.copy(FOG);
  buildSky(); buildLand(); buildClouds(); buildCourse(); buildKite();
  pAdd = new Particles(900, true); scene.add(pAdd.mesh);
  arrow = document.createElement('div'); arrow.textContent = '➤'; arrow.style.cssText = 'position:fixed;z-index:6;font-size:34px;color:#ffd27a;text-shadow:0 0 10px rgba(0,0,0,.8),0 0 18px rgba(255,190,80,.7);opacity:0;pointer-events:none;transition:opacity .25s'; document.body.appendChild(arrow);
  $('rDog').textContent = '🪁'; $('rCat').textContent = '🏁'; $('rCat').style.left = '100%'; $('bJump').style.display = 'none';
  reset(); G.mode = 'title'; applyLang();
  $('start').addEventListener('click', startGame);
  $('lang').addEventListener('click', () => { lang = lang === 'pl' ? 'en' : 'pl'; applyLang(); });
  $('again').addEventListener('click', () => { const bt = G.bot, nh = G.noHit; toTitle(); G.bot = bt; G.noHit = nh; startGame(); });
  $('menu').addEventListener('click', toTitle);
  step(0.016); renderer.compile(scene, camera); renderer.render(scene, camera);
  window.__kite = { G, P, gates, items, thermals, balloons, storks, input, audio, step, startGame, reset, toTitle, renderer, scene, camera, groundAt, floorAt, sun, MEAD,
    sim: (secs, dt = 1 / 60) => { for (let t = 0; t < secs; t += dt) step(dt); renderer.render(scene, camera); return { mode: G.mode, x: +P.x.toFixed(0), y: +P.y.toFixed(0), z: +P.z.toFixed(0), v: +P.v.toFixed(1), gi: G.gi, got: G.got, lives: G.lives, bones: G.bones, time: +G.time.toFixed(0) }; } };
  $('title').classList.remove('hidden'); $('loading').style.opacity = 0; setTimeout(() => $('loading').remove(), 1100);
  last = performance.now(); requestAnimationFrame(frame);
}
boot().catch((e) => { console.error(e); $('loading').textContent = 'Błąd: ' + e.message; });
