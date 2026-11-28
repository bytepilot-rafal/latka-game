// Level 6 – "Zima nad Narwią": Łatka and Mila ride Staś's sledge down the long hill, then cross the frozen river on
// their paws to the bonfire. Two kinds of play in one run:
//   the hill – every point is (s, u): distance down the run and offset from its middle; x = cx(s) + u, z = -s. Gravity
//              pulls the sledge, the player steers, brakes and hops; kickers throw it into the air.
//   the ice  – free movement with almost no grip: Łatka keeps sliding, so turns and stops have to be planned.
import * as THREE from 'three';
import { createTextures, sm, lerp, clamp, rng, fbm } from './textures.js';
import { Builder, roofGeo, canvasTex, worldMat } from './kit.js';
import { buildDog } from './dog.js';
import { HQ, addFur, DOG_FUR, CAT_FUR } from './fur.js';
import { buildCat } from './cat.js';
import { Particles, fogUniforms } from './fx.js';
import { AudioSys } from './audio.js';
import { makeUniforms, patchMat, daySky } from './real.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const $ = (id) => document.getElementById(id);
const TXT = {
  pl: {
    over: 'Poziom 6', title: 'Zima nad Narwią', start: 'Zjeżdżamy!', again: 'Jeszcze raz', menu: 'Menu',
    story: 'Spadł śnieg! Łatka i Mila zjeżdżają na sankach Stasia z Górki Piszczykowskiej, a potem po zamarzniętej Narwi biegną do ogniska. Na lodzie łapy się rozjeżdżają — hamuj i skręcaj z wyprzedzeniem!',
    keys: 'A / D lub ← → — skręt · Spacja — podskok · S lub ↓ — hamulec · na lodzie: strzałki / WASD — bieg we wszystkie strony',
    keys_t: 'Lewy kciuk — skręt (na lodzie: kierunek biegu) · łapa — podskok · „Stop" — hamulec',
    time: (t) => `Czas: ${t}`, bones: (n) => `Kości: ${n}`, left: (m) => `Do ogniska: ${m} m`, brake: 'Stop',
    h_start: 'Sanki same nabierają prędkości. Skręcaj, a przed zakrętem przyhamuj.', h_log: 'Kłoda w poprzek — podskocz!', h_ramp: 'Skocznia! Najedź na nią, żeby polecieć.',
    h_ball: 'Uwaga, toczy się śnieżna kula!', h_ice: 'Lód! Łatka ślizga się dalej, nawet gdy puścisz ster.', h_hole: 'Omijaj przeręble.', h_thin: 'Ciemny lód jest cienki — przebiegnij szybko albo omiń.',
    h_snow: 'Na śniegu łapy trzymają — tam najłatwiej wyhamować.', h_skater: 'Uwaga na łyżwiarzy!',
    hit: 'Bęc! Sanki w zaspie!', splash: 'Chlup! Lodowata kąpiel!', bump: 'Ups!', air: (m) => `Lot ${m} m! +${m * 5}`, crackle: 'Lód trzeszczy!', off: 'Dalej na łapach!',
    k_place: 'Zima', p1: 'Górka Piszczykowska', p2: 'Leśny Jar', p3: 'Zamarznięta Narew', p4: 'Ognisko',
    winT: 'Przy ognisku!', winX: (t, b, s) => `Łatka i Mila grzeją łapy przy ognisku ze Stasiem. Czas: ${t} · kości: ${b}. ${s}`,
    loseT: 'Koniec zabawy…', loseX: (m) => `Przemoczone i zmarznięte wracają do domu, ${m} m przed ogniskiem. Spróbuj jeszcze raz!`,
  },
  en: {
    over: 'Level 6', title: 'Winter on the Narew', start: 'Off we go!', again: 'Again', menu: 'Menu',
    story: 'It has snowed! Łatka and Mila ride Staś\'s sledge down the big hill, then run across the frozen Narew to the bonfire. Paws slip on the ice — brake and turn early!',
    keys: 'A / D or ← → — steer · Space — hop · S or ↓ — brake · on the ice: arrows / WASD — run any way',
    keys_t: 'Left thumb — steer (on the ice: where to run) · paw — hop · "Stop" — brake',
    time: (t) => `Time: ${t}`, bones: (n) => `Bones: ${n}`, left: (m) => `To the bonfire: ${m} m`, brake: 'Stop',
    h_start: 'The sledge picks up speed by itself. Steer, and brake before the bends.', h_log: 'A log across the run — hop!', h_ramp: 'A kicker! Ride over it to fly.',
    h_ball: 'Look out, a snowball is rolling!', h_ice: 'Ice! Łatka keeps sliding even when you let go.', h_hole: 'Keep away from the ice holes.', h_thin: 'Dark ice is thin — cross it fast or go round.',
    h_snow: 'Paws grip on snow — the easiest place to stop.', h_skater: 'Mind the skaters!',
    hit: 'Bump! Into the snowdrift!', splash: 'Splash! An icy bath!', bump: 'Oops!', air: (m) => `${m} m of air! +${m * 5}`, crackle: 'The ice is cracking!', off: 'On paws from here!',
    k_place: 'Winter', p1: 'Górka Piszczykowska', p2: 'Leśny Jar', p3: 'Zamarznięta Narew', p4: 'Ognisko',
    winT: 'By the bonfire!', winX: (t, b, s) => `Łatka and Mila warm their paws by the fire with Staś. Time: ${t} · bones: ${b}. ${s}`,
    loseT: 'That is it for today…', loseX: (m) => `Soaked and cold, they head home ${m} m short of the bonfire. Try again!`,
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
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, 1, 0.2, 1100);
let composer = null;
if (HQ) {                                                    // snow glare: a soft glow around everything bright, slightly darker corners
  const PV = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 })); composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new ShaderPass({ uniforms: { tDiffuse: { value: null } }, vertexShader: PV, fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); c.rgb = min(max(c.rgb, 0.0), 30.0); if (!(c.r + c.g + c.b < 1e5)) c.rgb = vec3(0.0); gl_FragColor = vec4(c.rgb, 1.0); }' }));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.22, 0.7, 1.5));
  composer.addPass(new ShaderPass({ uniforms: { tDiffuse: { value: null } }, vertexShader: PV, fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); vec2 q = vUv - 0.5; float v = 1.0 - dot(q, q) * 0.6; c.rgb *= v * v; gl_FragColor = vec4(max(c.rgb, 0.0), 1.0); }' }));
  composer.addPass(new OutputPass());
}
const draw = () => (composer ? composer.render() : renderer.render(scene, camera));
function resize() { const w = Math.max(2, window.innerWidth), h = Math.max(2, window.innerHeight); camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setPixelRatio(pixelRatio); renderer.setSize(w, h, false); if (composer) { composer.setPixelRatio(pixelRatio); composer.setSize(w, h); } }
window.addEventListener('resize', resize); resize();

// ------------------------------------------------------------------ the course
const S1 = 1500, ICE0 = S1 + 36, S2 = S1 + 450, DROP = 250, IW = 26;       // S1: the shore; ICE0: where they leave the sledge; S2: the far bank
const cx0 = (s) => 28 * Math.sin(s * 0.0075) + 13 * Math.sin(s * 0.017 + 1.3) + 5 * Math.sin(s * 0.041 + 0.4);
const cx = (s) => { let q = Math.max(0, s); if (q > S1 - 160) { const t = Math.min(1, (q - (S1 - 160)) / 160); q = S1 - 160 + 160 * (t - t * t / 2); } return (cx0(q) - cx0(0)) * sm(0, 90, q); };    // straight at the top, straightens out again before the shore
const CXI = cx(S1 + 100);
const half = (s) => lerp(7.6 + 1.4 * Math.sin(s * 0.011 + 2), IW, sm(S1 - 10, S1 + 70, s));
const trackY = (s) => { const f = clamp((S1 - s) / S1, 0, 1.06), a = 0.1, g = f < a ? f * f / (2 * a) : f - a / 2, k = sm(0, 0.15, f); return DROP * g + (4 * Math.sin(s * 0.019) + 1.6 * Math.sin(s * 0.043 + 1)) * k; };
const RAMPS = [];                                                          // kickers: { s, u, w }
function ground(s, u) {
  const a = Math.abs(u), h = half(s), k = sm(S1 - 30, S1 + 5, s), m = Math.min(a, h);
  let y = trackY(s) + 0.014 * m * m * (1 - k) + sm(h, h + 5, a) * (1.9 - 0.4 * k);
  if (a > h + 2) y += sm(h + 2, h + 70, a) * (fbm((cx(s) + u) * 0.018, s * 0.018, 3, 7) * 24 - 5);
  y += sm(S2 + 1, S2 + 18, s) * 1.8;
  for (const r of RAMPS) { const d = s - r.s; if (d > -11 && d < 1.3) { const side = sm(r.w, r.w - 1.3, Math.abs(u - r.u)); if (side > 0) y += 1.55 * side * (d <= 0 ? sm(-11, 0, d) : 1 - d / 1.3); } }
  return y;
}
const slopeAt = (s) => -(trackY(s + 1) - trackY(s - 1)) / 2, headAt = (s) => (cx(s + 1) - cx(s - 1)) / 2, curveAt = (s) => (cx(s + 3) - 2 * cx(s) + cx(s - 3)) / 9;

const G = { mode: 'load', phase: 'sled', t: 0, time: 0, s: 0, u: 0, uv: 0, v: 0, y: 0, vy: 0, air: false, airS: 0, lives: 3, bones: 0, inv: 0, shake: 0, spin: 0, endT: 0, hints: new Set(), bot: false, places: 0, streak: 0, streakT: 0 };
const P = { x: 0, z: 0, vx: 0, vz: 0, face: Math.PI, fall: 0 }, Mi = { x: 0, z: 0, vx: 0, vz: 0, spin: 0 };
const keys = {}, touch = { x: 0, y: 0, brake: false }, input = { x: 0, y: 0, brake: false };
const audio = new AudioSys();
let dog, cat, tex, pAdd, pAlpha, sun, hemi, RU, sled, boneMesh, flakes, flakeU, trail, fire, fireLight;
const obs = [], rows = [], items = [], balls = [], haz = [], skaters = [], people = [], puppies = [];
const dummy = new THREE.Object3D(), tmpV = new THREE.Vector3(), tmpC = new THREE.Color();
const SUN = new THREE.Vector3(0.5, 0.36, -0.62).normalize();
const snowMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86 });

// ------------------------------------------------------------------ scenery
function buildWorld() {
  RU = makeUniforms(); patchMat(worldMat, RU, { cloud: 0.25 }); patchMat(snowMat, RU, { grain: HQ ? 0.2 : 0.1, cloud: 0.3, gs: 0.5 });
  G.sky = daySky(renderer, scene, SUN, { gain: 0.42, size: 900, turbidity: 4.5, rayleigh: 1.6 }); scene.environmentIntensity = 0.55;
  sun = new THREE.DirectionalLight(0xffe6c4, 2.6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = -30; sc.right = 30; sc.top = 34; sc.bottom = -26; sc.near = 1; sc.far = 190; sun.shadow.bias = -0.0007; sun.shadow.normalBias = 0.07; scene.add(sun, sun.target);
  hemi = new THREE.HemisphereLight(0xc4dcff, 0xb8c6dc, 0.55); scene.add(hemi);
  scene.fog = new THREE.FogExp2(0xcfdcec, 0.0042); fogUniforms.uFogColor.value.copy(scene.fog.color); fogUniforms.uFogDensity.value = 0.0042;
  const R = rng(61);
  // kickers first: the ground depends on them
  for (let s = 190; s < S1 - 150; s += 165 + R() * 40) RAMPS.push({ s, u: (R() - 0.5) * 5, w: 3.3 });
  // ---- the snow: one sheet that follows the run, fine in the middle and coarse far out
  const US = []; for (const a of [150, 112, 84, 62, 46, 35, 27, 21, 16.5, 13, 11, 9.4, 8, 6.6, 5.2, 3.9, 2.6, 1.3]) US.push(-a); US.push(0); for (let i = US.length - 2; i >= 0; i--) US.push(-US[i]);
  const DS = 1.5, s0 = -60, NR = Math.ceil((S2 + 120 - s0) / DS), NC = US.length, pos = new Float32Array((NR + 1) * NC * 3), col = new Float32Array((NR + 1) * NC * 3), ix = [];
  for (let i = 0; i <= NR; i++) { const s = s0 + i * DS, c = cx(s), h = half(s), ice = s > S1 - 2 && s < S2 + 3;
    for (let j = 0; j < NC; j++) { const u = US[j] * (s > S1 ? lerp(1, 1.5, sm(S1, S1 + 60, s)) : 1), a = Math.abs(u), q = (i * NC + j) * 3; let y = ground(s, u); if (ice && a < h - 0.2) y -= 0.7;
      pos[q] = c + u; pos[q + 1] = y; pos[q + 2] = -s;
      const n = fbm((c + u) * 0.09, s * 0.09, 3, 3), packed = (1 - sm(h - 1.5, h + 1, a)) * (1 - sm(S1 - 20, S1 + 10, s)), b = 0.9 + n * 0.1 - packed * 0.07;
      col[q] = b * (0.955 - packed * 0.03); col[q + 1] = b * 0.975; col[q + 2] = b * 1.02; } }
  for (let i = 0; i < NR; i++) for (let j = 0; j < NC - 1; j++) { const a = i * NC + j, b = a + 1, c = a + NC, d = c + 1; ix.push(a, b, c, b, d, c); }
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); tg.setAttribute('color', new THREE.BufferAttribute(col, 3)); tg.setIndex(ix); tg.computeVertexNormals();
  const terrain = new THREE.Mesh(tg, snowMat); terrain.receiveShadow = true; terrain.frustumCulled = false; scene.add(terrain);
  // ---- the frozen river
  const iceTex = canvasTex(1024, 1024, (c, w, h) => { const r = rng(9); c.fillStyle = '#93b6cf'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { const q = 30 + r() * 110, x = q + r() * (w - 2 * q), y = q + r() * (h - 2 * q), g2 = c.createRadialGradient(x, y, 0, x, y, q); g2.addColorStop(0, `rgba(255,255,255,${0.1 + r() * 0.2})`); g2.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g2; c.fillRect(x - q, y - q, q * 2, q * 2); }   // dustings of snow
    c.lineCap = 'round'; for (let i = 0; i < 46; i++) { let x = r() * w, y = r() * h, a = r() * 6.28; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 9; k++) { a += (r() - 0.5) * 1.1; x += Math.cos(a) * (14 + r() * 26); y += Math.sin(a) * (14 + r() * 26); c.lineTo(x, y); } c.strokeStyle = `rgba(240,250,255,${0.25 + r() * 0.35})`; c.lineWidth = 0.8 + r() * 1.6; c.stroke(); }   // cracks
    for (let i = 0; i < 60; i++) { c.beginPath(); c.arc(r() * w, r() * h, 60 + r() * 220, r() * 6.28, r() * 6.28 + 0.5 + r()); c.strokeStyle = `rgba(255,255,255,${0.08 + r() * 0.12})`; c.lineWidth = 1; c.stroke(); } }, 4, 30);                   // skate marks
  const ice = new THREE.Mesh(new THREE.PlaneGeometry(IW * 3.2, S2 - S1 + 30).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: iceTex, roughness: 0.1, metalness: 0, envMapIntensity: 1.5 }));
  ice.position.set(CXI, 0, -(S1 + S2) / 2 - 3); ice.receiveShadow = true; scene.add(ice);
  // ---- forest: snow-laden spruces on both sides
  { const B = new Builder(4); B.cyl(0.22, 0.32, 3, 0, 0, 0, 0x4a3626, 6);
    for (let k = 0; k < 4; k++) { const r = 3.1 - k * 0.66, y = 1.8 + k * 2.5, h = 4.6 - k * 0.3; B.cone(r, h, 0, y, 0, 0x1d4a2c, 9); B.cone(r * 0.86, h * 0.72, 0, y + h * 0.3 + 0.05, 0, 0xf2f6fb, 9); }
    const geo = B.mesh().geometry, list = [], n0 = HQ ? 1 : 0.6;
    for (let s = -55; s < S2 + 115; s += 2.6) for (const side of [-1, 1]) { const h = half(s); for (let q = 0; q < 2; q++) { if (R() > n0 * (q ? 0.55 : 0.8)) continue; const a = h + 4.5 + Math.pow(R(), 1.7) * 125, u = side * a; list.push([cx(s) + u, ground(s, u) - 0.25, -s - R() * 2.6, 0.5 + R() * 0.75]); } }
    for (let i = 0; i < 70; i++) { const x = CXI + (R() - 0.5) * 150, s = S2 + 26 + R() * 90; if (Math.abs(x - CXI) < 13 && s < S2 + 50) continue; list.push([x, ground(s, x - CXI) - 0.25, -s, 0.6 + R() * 0.7]); }
    const m = new THREE.InstancedMesh(geo, worldMat, list.length); list.forEach(([x, y, z, sc2], i) => { dummy.position.set(x, y, z); dummy.rotation.set(0, R() * 6.28, 0); dummy.scale.set(sc2, sc2 * (0.9 + R() * 0.35), sc2); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); m.setColorAt(i, tmpC.setScalar(0.8 + R() * 0.3)); });
    m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; scene.add(m); }
  // ---- soft drifts and boulders along the edges
  { const B = new Builder(8); B.blob(1, 0, 0.1, 0, 0xf4f7fc, 0.5, 1.3, 1); const geo = B.mesh().geometry, list = [];
    for (let s = -20; s < S2 + 40; s += 5) for (const side of [-1, 1]) if (R() < 0.7) { const u = side * (half(s) + 1.5 + R() * 5); list.push([cx(s) + u, ground(s, u) - 0.1, -s, 0.8 + R() * 1.6]); }
    const m = new THREE.InstancedMesh(geo, snowMat, list.length); list.forEach(([x, y, z, sc2], i) => { dummy.position.set(x, y, z); dummy.rotation.set(0, R() * 6.28, 0); dummy.scale.set(sc2, sc2 * (0.7 + R() * 0.5), sc2); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); });
    m.receiveShadow = true; m.castShadow = true; m.frustumCulled = false; scene.add(m); }
  // ---- fences of poles and orange netting on the outside of the bends, flags at the kickers, the start gate, a hut, the cottage by the fire
  const B = new Builder(12);
  for (let s = 30; s < S1 - 40; s += 4) { const c = curveAt(s); if (Math.abs(c) < 0.012) continue; const side = c > 0 ? -1 : 1, u = side * (half(s) + 0.9), x = cx(s) + u, y = ground(s, u); B.cyl(0.05, 0.06, 1.3, x, y - 0.1, -s, 0x6b4a2e, 5); B.box(0.04, 0.5, 4.05, x, y + 0.55, -s - 2, 0xff7a1a, -headAt(s)); }
  for (const r of RAMPS) for (const sd of [-1, 1]) { const u = r.u + sd * (r.w + 0.3), x = cx(r.s - 6) + u, y = ground(r.s - 6, u); B.cyl(0.035, 0.035, 2.2, x, y, -(r.s - 6), 0xd8d8d8, 5); B.box(0.55, 0.36, 0.03, x + 0.28, y + 1.8, -(r.s - 6), sd < 0 ? 0xd9302c : 0x2c62d9); }
  { const y = ground(8, 0), x = cx(8); for (const sd of [-1, 1]) B.cyl(0.13, 0.15, 4.6, x + sd * 6.2, y + 1.2, -8, 0x7a5636, 7); B.box(12.6, 0.9, 0.12, x, y + 5.0, -8, 0xc8372f);
    const hy = ground(-10, -14); B.box(5, 2.6, 4, x - 14, hy, 10, 0x8a6240); B.add(roofGeo(5.8, 1.7, 4.8), 0xf3f6fb, x - 14, hy + 2.6, 10); B.box(0.6, 1.4, 0.6, x - 12.6, hy + 3.4, 10.6, 0x6e4a32); }
  { const x = CXI + 15, z = -(S2 + 30), y = ground(S2 + 30, 15); B.box(8, 3, 6, x, y, z, 0xd9cbb0); B.add(roofGeo(9.2, 2.6, 7), 0xf3f6fb, x, y + 3, z); B.box(0.8, 1.8, 0.8, x + 2.2, y + 4.2, z, 0x8a5a44); B.box(1, 2, 0.1, x - 1.2, y, z + 3.02, 0x5b3a26); for (const wx of [-3, 1.6]) B.box(1.1, 1, 0.1, x + wx, y + 1.3, z + 3.02, 0xffd98a); G.chimney = new THREE.Vector3(x + 2.2, y + 6.1, z);
    for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28; B.cyl(0.16, 0.18, 0.5, CXI + Math.cos(a) * 3.3, ground(S2 + 12, 0) - 0.05, -(S2 + 12) + Math.sin(a) * 3.3, 0x7a5636, 7); } }      // stumps to sit on round the fire
  const st = B.mesh(); st.frustumCulled = false; scene.add(st);
  { const b = canvasTex(512, 64, (c, w, h) => { c.fillStyle = '#c8372f'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = 'bold 44px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('S T A R T', w / 2, h / 2 + 2); }, 1, 1);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(12.4, 0.86), new THREE.MeshStandardMaterial({ map: b, roughness: 0.8, side: THREE.DoubleSide })); m.position.set(cx(8), ground(8, 0) + 5.45, -7.93); scene.add(m); }
  // ---- the bonfire
  { const fy = ground(S2 + 12, 0); fire = new THREE.Group(); fire.position.set(CXI, fy, -(S2 + 12)); const B2 = new Builder(3); for (let i = 0; i < 6; i++) { const g = new THREE.CylinderGeometry(0.09, 0.11, 1.5, 6); g.rotateZ(1.05); g.rotateY(i / 6 * 6.28); B2.add(g, 0x4a3020, 0, 0.4, 0); } B2.cyl(0.9, 1.0, 0.12, 0, 0, 0, 0x55504c, 10);
    fire.add(B2.mesh()); fire.userData.flames = [];
    for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.32 - i * 0.05, 1.3 - i * 0.12, 8).translate(0, 0.65, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 2 + i * 0.6, 0.3 + i * 0.15), transparent: true, opacity: 0.85, depthWrite: false, fog: false })); f.position.set(Math.cos(i * 1.7) * 0.16, 0.25, Math.sin(i * 1.7) * 0.16); fire.add(f); fire.userData.flames.push(f); }
    fireLight = new THREE.PointLight(0xff9a40, 26, 22, 1.6); fireLight.position.y = 1.3; fire.add(fireLight); scene.add(fire); }
  // ---- snowflakes: a box of points that wraps around the camera
  { const n = HQ ? 2600 : 1300, p = new Float32Array(n * 3); for (let i = 0; i < n * 3; i++) p[i] = R(); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    flakeU = { uT: { value: 0 }, uCam: { value: new THREE.Vector3() }, uSize: { value: 1 } };
    flakes = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: flakeU, transparent: true, depthWrite: false,
      vertexShader: 'uniform float uT, uSize; uniform vec3 uCam; varying float vA; void main(){ vec3 box = vec3(56.0, 34.0, 56.0); vec3 p = position * box; p.y -= uT * (1.6 + fract(position.x * 7.3) * 1.6); p.x += sin(uT * 0.7 + position.z * 20.0) * 0.9 + uT * 1.2; p.z += cos(uT * 0.5 + position.x * 17.0) * 0.7; p = mod(p - uCam, box) - box * 0.5 + uCam; vec4 mv = viewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; float d = -mv.z; gl_PointSize = uSize * (0.6 + fract(position.y * 9.1) * 0.8) * 70.0 / max(d, 1.0); vA = smoothstep(0.6, 3.0, d) * (1.0 - smoothstep(22.0, 28.0, d)); }',
      fragmentShader: 'varying float vA; void main(){ vec2 q = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.1, length(q)); gl_FragColor = vec4(1.0, 1.0, 1.0, a * vA * 0.85); }' }));
    flakes.frustumCulled = false; flakes.renderOrder = 12; scene.add(flakes); }
}

// a small figure in winter clothes; arm: which arm is raised
function person(jacket, hat, pants = 0x2c3350, sc = 1, arm = 1) {
  const B = new Builder(jacket & 255); for (const sx of [-1, 1]) { B.box(0.15, 0.5, 0.18, sx * 0.1, 0, 0, pants); B.box(0.17, 0.09, 0.26, sx * 0.1, 0, 0.03, 0x2a2420); }
  B.cyl(0.19, 0.23, 0.56, 0, 0.5, 0, jacket, 9); B.cyl(0.2, 0.2, 0.09, 0, 1.03, 0, 0xf2f2f2, 9);
  for (const sx of [-1, 1]) { const g = new THREE.BoxGeometry(0.12, 0.5, 0.13); if (sx === arm) { g.translate(0, 0.25, 0); g.rotateZ(-sx * 0.5); B.add(g, jacket, sx * 0.27, 0.92, 0); B.blob(0.07, sx * 0.53, 1.38, 0, 0xc23b2e); } else { B.add(g, jacket, sx * 0.28, 0.78, 0); B.blob(0.07, sx * 0.28, 0.5, 0, 0xc23b2e); } }
  B.blob(0.17, 0, 1.24, 0, 0xf0c7a2); B.blob(0.185, 0, 1.33, -0.01, hat, 0.72); B.blob(0.07, 0, 1.5, 0, 0xffffff);
  const m = B.mesh(); m.scale.setScalar(sc); return m;
}

function buildCourse() {
  const R = rng(77);
  // ---- obstacle shapes
  const GEO = {};
  { const B = new Builder(1); B.cyl(0.07, 0.1, 0.7, 0, 0, 0, 0x4a3626, 5); for (let k = 0; k < 3; k++) { const r = 0.85 - k * 0.24, y = 0.4 + k * 0.62; B.cone(r, 1.15, 0, y, 0, 0x1f5030, 8); B.cone(r * 0.85, 0.82, 0, y + 0.36, 0, 0xf2f6fb, 8); } GEO.spruce = B.mesh().geometry; }
  { const B = new Builder(2); B.blob(0.55, 0, 0.5, 0, 0xf5f8fc); B.blob(0.4, 0, 1.22, 0, 0xf5f8fc); B.blob(0.28, 0, 1.78, 0, 0xf5f8fc); const n = new THREE.ConeGeometry(0.05, 0.3, 6); n.rotateX(Math.PI / 2); B.add(n, 0xff7a1a, 0, 1.78, 0.36);
    for (const sx of [-1, 1]) { B.blob(0.035, sx * 0.1, 1.86, 0.25, 0x151515); const g = new THREE.CylinderGeometry(0.02, 0.02, 0.7, 4); g.rotateZ(sx * 1.1); B.add(g, 0x4a3626, sx * 0.62, 1.32, 0); } for (let k = 0; k < 3; k++) B.blob(0.04, 0, 1.0 + k * 0.17, 0.39 - k * 0.02, 0x151515);
    B.cyl(0.2, 0.2, 0.26, 0, 1.98, 0, 0x1c1c22, 9); B.cyl(0.3, 0.3, 0.03, 0, 1.98, 0, 0x1c1c22, 9); B.cyl(0.29, 0.29, 0.1, 0, 1.52, 0, 0xc8372f, 9); GEO.snowman = B.mesh().geometry; }
  { const B = new Builder(3); B.blob(0.85, 0, 0.35, 0, 0x7d8088, 0.75, 1.1, 0.9); B.blob(0.7, 0.05, 0.72, 0, 0xf4f7fc, 0.42, 1.1, 0.95); GEO.rock = B.mesh().geometry; }
  { const B = new Builder(5); const g = new THREE.CylinderGeometry(0.26, 0.28, 1, 9); g.rotateZ(Math.PI / 2); B.add(g, 0x6b4a2e, 0, 0.27, 0); const c = new THREE.CylinderGeometry(0.23, 0.25, 1, 9, 1, false, -0.9, 1.8); c.rotateZ(Math.PI / 2); c.rotateX(-Math.PI / 2); B.add(c, 0xf4f7fc, 0, 0.36, 0); GEO.log = B.mesh().geometry; }
  // ---- rows of obstacles with one clear line through each
  let safe = 0;
  for (let s = 75; s < S1 - 70; s += 23 + R() * 12) {
    const h = half(s) - 1.3; safe = clamp(safe + (R() - 0.5) * 8, -h + 1.4, h - 1.4);
    const ramp = RAMPS.find((r) => s > r.s - 16 && s < r.s + 42); if (ramp) { rows.push({ s, safe: ramp.u, clear: true }); safe = ramp.u; continue; }
    if (R() < 0.16 && s > 200) { obs.push({ type: 'log', s, u: 0, w: h * 2 + 2, r: 0.3, hgt: 0.62 }); rows.push({ s, safe, log: true }); continue; }
    const row = { s, safe }; rows.push(row);
    for (let u = -h + 0.6; u <= h - 0.6; u += 2.3) { if (Math.abs(u - safe) < 2.5 || R() > 0.3 + Math.min(0.32, s / 3200)) continue; const type = ['spruce', 'spruce', 'snowman', 'rock'][(R() * 4) | 0]; obs.push({ type, s: s + (R() - 0.5) * 3, u: u + (R() - 0.5) * 0.8, r: type === 'rock' ? 0.85 : type === 'spruce' ? 0.55 : 0.6, sc: 0.85 + R() * 0.4 }); }
  }
  for (const s of [430, 760, 1040, 1300]) { const b = { s, u: 0, r: 1.05, ph: R() * 6, m: new THREE.Mesh(new THREE.IcosahedronGeometry(1.05, 2), new THREE.MeshStandardMaterial({ color: 0xf1f5fb, roughness: 0.9, flatShading: true })) }; b.m.castShadow = true; scene.add(b.m); balls.push(b); }      // snowballs rolling from side to side
  for (const type of Object.keys(GEO)) { const a = obs.filter((o) => o.type === type); if (!a.length) continue; const m = new THREE.InstancedMesh(GEO[type], worldMat, a.length);
    a.forEach((o, i) => { const u = o.u, x = cx(o.s) + u; dummy.position.set(x, ground(o.s, u) - 0.05, -o.s); dummy.rotation.set(0, type === 'log' ? -headAt(o.s) : R() * 6.28, 0); if (type === 'log') dummy.scale.set(o.w, 1, 1); else dummy.scale.setScalar(o.sc); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); });
    m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; scene.add(m); }
  // ---- bones: along the clear line, and in an arc after every kicker
  for (let i = 0; i < rows.length - 1; i++) { const a = rows[i], b = rows[i + 1]; if (R() < 0.25) continue; for (let k = 1; k <= 4; k++) { const t = k / 5, s = lerp(a.s, b.s, t); items.push({ s, u: lerp(a.safe, b.safe, t), h: a.log && k === 1 ? 1.3 : 0.55 }); } }
  for (const r of RAMPS) for (let k = 0; k < 6; k++) items.push({ s: r.s + 2 + k * 3.2, u: r.u, h: 1.9 + Math.sin((k + 0.5) / 6 * Math.PI) * 1.5, airy: true });
  // ---- the ice: holes, thin patches, snow to brake on, anglers, skaters
  const far = (x, z, d) => haz.every((q) => Math.hypot(q.x - x, q.z - z) > q.r + d);
  const waterM = new THREE.MeshStandardMaterial({ color: 0x071824, roughness: 0.04, metalness: 0.1 }), rimM = new THREE.MeshStandardMaterial({ color: 0xf2f7fc, roughness: 0.9 }),
    thinM = new THREE.MeshStandardMaterial({ color: 0x2d5878, roughness: 0.06, transparent: true, opacity: 0.72, map: canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); const r = rng(4); c.strokeStyle = 'rgba(190,225,245,0.95)'; for (let i = 0; i < 9; i++) { let x = w / 2, y = h / 2, a = r() * 6.28; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 6; k++) { a += (r() - 0.5) * 0.9; x += Math.cos(a) * 22; y += Math.sin(a) * 22; c.lineTo(x, y); } c.lineWidth = 1 + r() * 2; c.stroke(); } }, 1, 1) });
  const holeMesh = (x, z, r) => { const g = new THREE.Group(); const w = new THREE.Mesh(new THREE.CircleGeometry(r, 26).rotateX(-Math.PI / 2), waterM); w.position.y = 0.012; const rim = new THREE.Mesh(new THREE.TorusGeometry(r + 0.08, 0.13, 6, 26).rotateX(Math.PI / 2).scale(1, 0.45, 1), rimM); rim.position.y = 0.03; g.add(w, rim); g.position.set(x, 0, z); scene.add(g); return g; };
  for (let i = 0; i < 300 && haz.filter((q) => q.type === 'hole').length < 14; i++) { const z = -(ICE0 + 45 + R() * (S2 - ICE0 - 85)), x = CXI + (R() - 0.5) * 42, r = 1.5 + R() * 0.9; if (!far(x, z, 6.5)) continue; haz.push({ type: 'hole', x, z, r, m: holeMesh(x, z, r) }); }
  for (let i = 0; i < 300 && haz.filter((q) => q.type === 'thin').length < 9; i++) { const z = -(ICE0 + 60 + R() * (S2 - ICE0 - 100)), x = CXI + (R() - 0.5) * 40, r = 2.7 + R() * 0.9; if (!far(x, z, 5)) continue;
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 26).rotateX(-Math.PI / 2), thinM); m.position.set(x, 0.014, z); m.rotation.y = R() * 6; scene.add(m); const hm = holeMesh(x, z, r * 0.92); hm.visible = false; haz.push({ type: 'thin', x, z, r, m, hm, load: 0, warned: false }); }
  { const g = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2), p = g.attributes.position; for (let i = 1; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)), q = 0.8 + 0.3 * Math.sin(a * 3 + 1) + 0.12 * Math.sin(a * 7); p.setX(i, p.getX(i) * q); p.setZ(i, p.getZ(i) * q); }
    for (let i = 0; i < 300 && haz.filter((q) => q.type === 'snow').length < 13; i++) { const z = -(ICE0 + 30 + R() * (S2 - ICE0 - 50)), x = CXI + (R() - 0.5) * 42, r = 2.6 + R() * 1.8; if (!far(x, z, 2.5)) continue; const m = new THREE.Mesh(g, rimM); m.position.set(x, 0.02, z); m.scale.set(r, 1, r); m.rotation.y = R() * 6; m.receiveShadow = true; scene.add(m); haz.push({ type: 'snow', x, z, r: r * 0.9, m }); } }
  haz.filter((q) => q.type === 'hole').slice(0, 5).forEach((hl, i) => { const sd = i % 2 ? 1 : -1, x = hl.x + sd * (hl.r + 1.1), g = new THREE.Group(), B = new Builder(30 + i); B.box(0.5, 0.36, 0.4, 0, 0, 0, 0x5a7a3a); const rod = new THREE.CylinderGeometry(0.012, 0.02, 1.7, 4); rod.rotateZ(sd * 1.0); B.add(rod, 0x2a2a2a, -sd * 0.75, 1.05, 0.1);
    const pm = person([0x3a6a4a, 0x8a4a2a, 0x344a7a][i % 3], [0xd9a441, 0x555555, 0xc23b2e][i % 3], 0x2c3350, 1, 0); pm.position.y = 0.2; g.add(B.mesh(), pm); g.position.set(x, 0, hl.z); g.rotation.y = sd * 0.5; scene.add(g); haz.push({ type: 'angler', x, z: hl.z, r: 0.75, m: g }); });
  for (let i = 0; i < 6; i++) { const z = -(ICE0 + 70 + i * (S2 - ICE0 - 120) / 5), m = person([0xd9302c, 0x2c62d9, 0xe0a020, 0x9a3fc0, 0x23a37a, 0xe05a90][i], [0xffffff, 0xffd23f, 0x2c62d9, 0xffffff, 0xd9302c, 0x3a3a3a][i], 0x23262e, 0.82 + (i % 3) * 0.08, i % 2 ? 1 : -1); scene.add(m); skaters.push({ m, z, amp: 9 + R() * 9, w: 0.5 + R() * 0.35, ph: R() * 6, x: CXI, r: 0.6, cd: 0 }); }
  for (let z = ICE0 + 26; z < S2 - 6; z += 3.4) { const x = CXI + 15 * Math.sin((z - ICE0) * 0.026) * sm(ICE0, ICE0 + 60, z); if (!far(x, -z, 1.2) && haz.some((q) => q.type !== 'snow' && Math.hypot(q.x - x, q.z + z) < q.r + 1.2)) continue; items.push({ ice: true, x, z: -z, h: 0.55 }); }
  for (const it of items) it.got = false;
  boneMesh = new THREE.InstancedMesh(tex.boneGeo || (() => { const B = new Builder(6); const g = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 6); g.rotateZ(Math.PI / 2); B.add(g, 0xfff3d0, 0, 0, 0); for (const sx of [-1, 1]) for (const sy of [-1, 1]) B.blob(0.075, sx * 0.17, sy * 0.05, 0, 0xfff3d0); return B.mesh().geometry; })(), new THREE.MeshStandardMaterial({ vertexColors: true, color: 0xffb62e, roughness: 0.45, emissive: 0xc27a08, emissiveIntensity: 0.9 }), 90);
  boneMesh.frustumCulled = false; boneMesh.castShadow = true; scene.add(boneMesh);
  // ---- people: Staś at the start and by the fire with the others
  const mk = (j, h, sc, x, z, y, arm) => { const m = person(j, h, 0x2c3350, sc, arm); m.position.set(x, y, z); scene.add(m); return m; };
  G.stasTop = mk(0x2c62d9, 0xd9302c, 0.9, cx(2) + 1.5, 1.6, ground(-1.6, 1.5), 1); G.stasTop.rotation.y = Math.PI - 0.5;
  [[0x2c62d9, 0xd9302c, 0.9], [0x2f9a4a, 0xffd23f, 0.84], [0xc24a8a, 0xffffff, 0.78], [0xe07a20, 0x3a3a3a, 1.05]].forEach(([j, h, sc], i) => { const a = 0.3 + i * 0.85, x = CXI + Math.cos(a) * 3.1, z = -(S2 + 12) - Math.sin(a) * 3.1, m = mk(j, h, sc, x, z, ground(S2 + 12, 0), i % 2 ? 1 : -1); m.lookAt(CXI, m.position.y, -(S2 + 12)); people.push({ m, y: m.position.y, ph: i * 1.7 }); });
  // ---- the sledge (its front points to +z, like the animals) and the tracks it leaves
  { const B = new Builder(15), wood = 0x9a6a3c, dark = 0x6e4a2a;
    for (const sx of [-1, 1]) { B.box(0.05, 0.05, 1.55, sx * 0.27, 0, -0.05, dark); const c = new THREE.BoxGeometry(0.05, 0.05, 0.46); c.rotateX(-0.75); B.add(c, dark, sx * 0.27, 0.19, 0.86); for (const z of [-0.5, 0.35]) B.box(0.05, 0.24, 0.06, sx * 0.27, 0.04, z, dark); B.box(0.06, 0.04, 1.3, sx * 0.27, 0.27, -0.08, wood); }
    for (let i = -2; i <= 2; i++) B.box(0.1, 0.03, 1.3, i * 0.115, 0.3, -0.08, wood); for (const z of [-0.5, 0.35]) B.box(0.62, 0.035, 0.07, 0, 0.265, z, dark); B.box(0.62, 0.04, 0.05, 0, 0.36, 0.98, dark);
    sled = new THREE.Group(); sled.add(B.mesh()); sled.rotation.order = 'YXZ'; scene.add(sled); }
  { const N = 150, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 2 * 6 * 3), 3)); trail = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x8fa6c4, transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })); trail.frustumCulled = false; trail.userData = { N, k: 0, last: null }; scene.add(trail); }
}
function trailAdd() {                                       // two thin ribbons where the runners went
  const T2 = trail.userData, hd = headAt(G.s), c = cx(G.s) + G.u, cur = [-0.27, 0.27].map((o) => [c + o, ground(G.s, G.u + o) + 0.03, -G.s + o * hd]);
  if (T2.last && !G.air && !T2.gap) { const p = trail.geometry.attributes.position.array, w = 0.045; cur.forEach((q, r) => { const l = T2.last[r], o = ((T2.k % T2.N) * 2 + r) * 18; p.set([l[0] - w, l[1], l[2], l[0] + w, l[1], l[2], q[0] - w, q[1], q[2], l[0] + w, l[1], l[2], q[0] + w, q[1], q[2], q[0] - w, q[1], q[2]], o); }); T2.k++; trail.geometry.attributes.position.needsUpdate = true; }
  T2.gap = G.air; T2.last = cur;
}

// ------------------------------------------------------------------ HUD and input
let hintT = 0, pickT = 0;
function hint(key, once = true) { if (once) { if (G.hints.has(key)) return; G.hints.add(key); } $('hint').textContent = T(key); $('hint').style.opacity = 1; hintT = 4.2; }
function pick(text) { $('pick').textContent = text; $('pick').style.opacity = 1; pickT = 1.8; }
function place(name) { const el = $('place'); $('placeKind').textContent = T('k_place'); $('placeName').textContent = name; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); if (audio.on) audio.placeChime(); }
const buzz = (p) => { try { if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(p); } catch (_) { /* not supported */ } };
const clock = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const flakeIcon = '<svg viewBox="0 0 32 32"><g stroke="currentColor" stroke-width="3.4" stroke-linecap="round"><path d="M16 4v24M5.6 10l20.8 12M5.6 22l20.8-12"/></g></svg>';
const shown = {};
const prog = () => (G.phase === 'sled' ? G.s : -P.z);
function hud(force) {
  const set = (id, v, html) => { if (!force && shown[id] === v) return; shown[id] = v; if (html) $(id).innerHTML = v; else $(id).textContent = v; };
  set('rScore', T('bones', G.bones)); set('rSub', T('time', clock(G.time)));
  set('rLives', [0, 1, 2].map((i) => `<span class="${i < G.lives ? '' : 'lost'}" style="color:#8fd0ff">${flakeIcon}</span>`).join(''), true);
  set('rLabel', T('left', Math.max(0, Math.round((S2 - prog()) / 10) * 10)));
  const k = Math.round(clamp(prog() / S2, 0, 1) * 100); if (shown.prog !== k) { shown.prog = k; $('rDog').style.left = k + '%'; }
}
function applyLang() {
  $('title').querySelector('h1').innerHTML = `<small>${T('over')}</small>${T('title')}`;
  $('title').querySelector('.story').textContent = T('story'); $('start').textContent = T('start'); $('title').querySelector('.keys').textContent = T('keys');
  $('again').textContent = T('again'); $('menu').textContent = T('menu'); $('lang').textContent = lang === 'pl' ? 'EN' : 'PL'; $('bBark').textContent = T('brake'); hud(true);
}
function hop() {
  if (G.mode !== 'play') return;
  if (G.phase === 'sled') { if (!G.air) { G.vy = Math.max(G.vy, 0) + 6.4; G.y += 0.08; G.air = true; G.airS = G.s; G.hopped = true; if (audio.on) audio.jump(); } }
  else if (P.y <= 0 && P.fall <= 0) { P.vy = 5.2; P.y = 0.01; if (audio.on) audio.jump(); }
}
window.addEventListener('keydown', (e) => {
  if (e.repeat) return; keys[e.code] = true;
  if (e.code === 'Space') { if (G.mode === 'title') startGame(); else hop(); e.preventDefault(); }
  if (e.code === 'Enter' && G.mode === 'title') startGame();
  if (e.code === 'KeyM' && audio.on) audio.toggleMusic();
  if (e.code === 'KeyP') document.body.classList.toggle('clean');
  if (e.code.startsWith('Arrow')) e.preventDefault();
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; touch.brake = false; touch.x = touch.y = 0; });
{
  const zone = $('joyZone'), base = $('joy'), knob = $('joyKnob'), R = 50, NP = { passive: false }; let id = null, ox = 0, oy = 0;
  const each = (e, fn) => { e.preventDefault(); for (const t of e.changedTouches) fn(t); };
  const set = (dx, dy) => { const l = Math.hypot(dx, dy) || 1, k = Math.min(1, R / l); dx *= k; dy *= k; knob.style.transform = `translate(${dx}px, ${dy}px)`; touch.x = Math.abs(dx) < 7 ? 0 : dx / R; touch.y = Math.abs(dy) < 7 ? 0 : -dy / R; };
  zone.addEventListener('touchstart', (e) => each(e, (t) => { if (id !== null) return; id = t.identifier; const r = zone.getBoundingClientRect(); ox = t.clientX; oy = t.clientY; base.style.left = (ox - r.left) + 'px'; base.style.top = (oy - r.top) + 'px'; base.classList.add('act'); set(0, 0); }), NP);
  zone.addEventListener('touchmove', (e) => each(e, (t) => { if (t.identifier === id) set(t.clientX - ox, t.clientY - oy); }), NP);
  const end = (e) => each(e, (t) => { if (t.identifier !== id) return; id = null; base.classList.remove('act'); base.style.left = base.style.top = ''; set(0, 0); });
  zone.addEventListener('touchend', end, NP); zone.addEventListener('touchcancel', end, NP);
  $('bJump').addEventListener('touchstart', (e) => { e.preventDefault(); hop(); }, NP);
  $('bBark').addEventListener('touchstart', (e) => { e.preventDefault(); touch.brake = true; }, NP);
  for (const ev of ['touchend', 'touchcancel']) $('bBark').addEventListener(ev, (e) => { e.preventDefault(); touch.brake = false; }, NP);
  $('bMusic').addEventListener('touchstart', (e) => { e.preventDefault(); if (audio.on) $('bMusic').classList.toggle('off', !audio.toggleMusic()); }, NP);
  for (const g of ['gesturestart', 'gesturechange']) document.addEventListener(g, (e) => e.preventDefault());
}

// ------------------------------------------------------------------ game flow
function reset() {
  Object.assign(G, { phase: 'sled', t: 0, time: 0, s: 0, u: 0, uv: 0, v: 0, y: ground(0, 0), vy: 0, air: false, lives: 3, bones: 0, inv: 0, shake: 0, spin: 0, endT: 0, places: 0, streak: 0, streakT: 0, hopped: false, gyPrev: undefined, spinD: 0 }); G.hints.clear();
  Object.assign(P, { x: 0, z: 0, vx: 0, vz: 0, y: 0, vy: 0, face: Math.PI, fall: 0 }); Object.assign(Mi, { x: 0, z: 0, vx: 0, vz: 0, spin: 0 });
  for (const it of items) it.got = false;
  for (const q of haz) if (q.type === 'thin') { q.load = 0; q.warned = false; q.broken = false; q.m.visible = true; q.hm.visible = false; }
  sled.add(dog.root); dog.root.position.set(0, 0.31, 0.28); dog.root.rotation.set(0, 0, 0); sled.add(cat.root); cat.root.position.set(0, 0.32, -0.42); cat.root.rotation.set(0, 0, 0); sled.visible = true;
  trail.userData.last = null; trail.userData.k = 0; trail.geometry.attributes.position.array.fill(0); trail.geometry.attributes.position.needsUpdate = true;
  puppies.forEach((p, i) => { p.x = CXI - 3 + i * 1.5; p.z = -(S2 + 8.5) + (i % 2) * 1.1; });
}
function startGame() {
  if (G.mode !== 'title') return;
  audio.start(); G.mode = 'play'; G.v = 4; $('title').classList.add('hidden'); for (const id of ['rTop', 'rLives', 'rMila']) $(id).style.opacity = 1;
  setTimeout(() => { if (G.mode === 'play') { place(T('p1')); hint('h_start'); } }, 700); audio.bark(); dog.bark(); setTimeout(() => audio.meow(), 500);
}
function toTitle() { reset(); G.mode = 'title'; $('end').classList.add('hidden'); $('title').classList.remove('hidden'); for (const id of ['rTop', 'rLives', 'rMila']) $(id).style.opacity = 0; }
function finish(win) {
  const stars = win ? (G.lives === 3 && G.time < 150 ? '★★★' : G.lives >= 2 || G.time < 150 ? '★★☆' : '★☆☆') : '';
  $('endTitle').textContent = T(win ? 'winT' : 'loseT'); $('endText').textContent = win ? T('winX', clock(G.time), G.bones, stars) : T('loseX', Math.max(0, Math.round(S2 - prog())));
  $('end').classList.remove('hidden'); $('menu').style.display = ''; for (const id of ['rTop', 'rLives', 'rMila', 'hint', 'pick']) $(id).style.opacity = 0;
}
function hurt(text, x, y, z, wet) {
  G.lives--; G.inv = 1.8; G.shake = 0.7; buzz(150); pick(T(text));
  if (audio.on) { if (wet) audio.splash(0.5); else audio.crack(); audio.yelp(); setTimeout(() => audio.meow(1.3), 250); }
  $('flash').style.opacity = 1; setTimeout(() => { $('flash').style.opacity = 0; }, 200);
  for (let k = 0; k < 34; k++) pAlpha.spawn(x, y + 0.2, z, (Math.random() - 0.5) * 7, 2 + Math.random() * 4.5, (Math.random() - 0.5) * 7, 0.9, 0.16, 0.5, wet ? 0.75 : 0.96, wet ? 0.88 : 0.98, 1, 0.9, 9, 0.6);
  if (G.lives <= 0) { G.mode = 'over'; G.endT = 0; if (audio.on) audio.night(); }
}
const snowPuff = (x, y, z, n, sp = 3) => { for (let k = 0; k < n; k++) pAlpha.spawn(x + (Math.random() - 0.5) * 0.5, y + 0.1, z + (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * sp, 0.6 + Math.random() * sp * 0.6, (Math.random() - 0.5) * sp, 0.5 + Math.random() * 0.5, 0.14, 0.55, 0.97, 0.98, 1, 0.75, 5, 1.2); };
function gotBone(x, y, z) { G.bones++; G.streak = G.streakT > 0 ? G.streak + 1 : 0; G.streakT = 0.5; if (audio.on) audio.coin(G.streak); for (let k = 0; k < 5; k++) pAdd.spawn(x, y, z, (Math.random() - 0.5) * 3, Math.random() * 3, (Math.random() - 0.5) * 3, 0.45, 0.2, 0.02, 4, 3, 1, 1, 0, 1); }

function stepSled(dt) {
  const prevS = G.s, sl = slopeAt(G.s), h = half(G.s), brake = input.brake;
  // ---- along the run: gravity down the slope, air drag, the brake digs in
  if (!G.air) G.v += (26 * sl - 0.0085 * G.v * G.v - 0.35 - (brake ? 11 : 0) - Math.abs(G.uv) * 0.12) * dt;
  if (G.s > S1) G.v -= (1.2 + G.v * 0.3) * dt;                                                        // the sledge runs out on the ice
  G.v = clamp(G.v, G.s > S1 ? 0 : 2.2, 34); G.s += G.v * dt;
  // ---- sideways: steering, and the bends throw the sledge outwards
  const grip = G.air ? 0.25 : 1; G.uv += (input.x * 26 * grip - G.uv * 3.4 * grip - curveAt(G.s) * G.v * G.v * 0.5 * grip) * dt; G.u += G.uv * dt;
  if (Math.abs(G.u) > h - 0.7) { const sd = Math.sign(G.u); G.u = sd * (h - 0.7); if (G.uv * sd > 0) { if (G.uv * sd > 3) { G.v *= 0.86; G.shake = Math.max(G.shake, 0.25); if (audio.on) audio.scrape(); } G.uv *= -0.35; } snowPuff(cx(G.s) + G.u + sd * 0.5, G.y, -G.s, 3, 4); }
  // ---- up and down: the ground is followed while it holds the sledge; a kicker lets go of it
  const gy = ground(G.s, G.u), wasAir = G.air; G.vy -= 22 * dt; G.y += G.vy * dt;
  if (G.y <= gy) { if (wasAir) { const d = Math.round(G.s - G.airS); if (!G.hopped && d >= 8) { G.bones += 0; pick(T('air', d)); G.score = (G.score || 0) + d * 5; } if (G.vy < -5) { G.shake = Math.max(G.shake, 0.35); snowPuff(cx(G.s) + G.u, gy, -G.s, 22, 6); if (audio.on) audio.land(); } G.hopped = false; }
    G.y = gy; G.vy = clamp((gy - (G.gyPrev === undefined ? gy : G.gyPrev)) / Math.max(dt, 1e-4), -30, 14); G.air = false; }
  else if (G.y > gy + 0.07) { if (!G.air) G.airS = G.s; G.air = true; }
  G.gyPrev = gy;
  const X = cx(G.s) + G.u, Z = -G.s;
  // ---- things in the way
  if (G.inv <= 0 && !G.noHit) {
    for (const o of obs) { if (o.s < prevS - 1.2 || o.s > G.s + 1.4) continue; const ds = Math.abs(o.s - G.s);
      if (o.type === 'log') { if (ds < 0.75 && G.y - gy < o.hgt) { hurt('hit', X, G.y, Z); G.v *= 0.3; G.vy = 4; G.y += 0.1; G.air = true; G.hopped = true; G.spin = 1; break; } continue; }
      if (ds < o.r * (o.sc || 1) + 0.6 && Math.abs(o.u - G.u) < o.r * (o.sc || 1) + 0.42 && G.y - gy < 1.2) { hurt('hit', X, G.y, Z); G.v *= 0.3; G.uv = (G.u >= o.u ? 1 : -1) * 6; G.spin = 1; break; } }
    for (const b of balls) if (Math.abs(b.s - G.s) < b.r + 0.6 && Math.abs(b.u - G.u) < b.r + 0.4 && G.y - gy < 1.6) { hurt('hit', X, G.y, Z); G.v *= 0.3; G.uv = (G.u >= b.u ? 1 : -1) * 7; G.spin = 1; break; }
  }
  for (const it of items) { if (it.got || it.ice || it.s < G.s - 2 || it.s > G.s + 2) continue; if (Math.abs(it.s - G.s) < 1.1 && Math.abs(it.u - G.u) < 1.05 && Math.abs(ground(it.s, it.u) + it.h - (G.y + 0.5)) < 1.25) { it.got = true; gotBone(cx(it.s) + it.u, ground(it.s, it.u) + it.h, -it.s); } }
  // ---- hints and places
  for (const o of obs) if (o.type === 'log' && o.s > G.s && o.s < G.s + 45) { hint('h_log'); break; }
  for (const r of RAMPS) if (r.s > G.s && r.s < G.s + 55) { hint('h_ramp'); break; }
  for (const b of balls) if (b.s > G.s && b.s < G.s + 50) { hint('h_ball'); break; }
  if (G.places < 1 && G.s > 620) { G.places = 1; place(T('p2')); }
  if (G.places < 2 && G.s > S1 - 30) { G.places = 2; place(T('p3')); }
  // ---- snow thrown up, the tracks, the wind
  if (!G.air) { trail.userData.acc = (trail.userData.acc || 0) + G.v * dt; if (trail.userData.acc > 0.7) { trail.userData.acc = 0; trailAdd(); }
    const n = (brake ? 60 : 10) + Math.abs(G.uv) * 9; if (Math.random() < dt * n * Math.min(1, G.v / 8)) pAlpha.spawn(X + (Math.random() - 0.5) * 0.7, G.y + 0.08, Z + 0.6, -G.uv * 0.4 + (Math.random() - 0.5) * 2, 0.8 + Math.random() * 1.8, 1 + Math.random() * 2, 0.6, 0.12, 0.6, 0.97, 0.98, 1, 0.7, 4, 1.2); }
  else trail.userData.gap = true;
  // ---- the sledge itself
  const head = Math.atan(headAt(G.s) + G.uv / Math.max(G.v, 6)); G.spin = Math.max(0, G.spin - dt * 1.1);
  sled.position.set(X, G.y + 0.03, Z); sled.rotation.set(G.air ? clamp(-G.vy / Math.max(G.v, 8), -0.5, 0.6) : Math.atan(sl) + (brake ? -0.05 : 0), Math.PI - head + G.spin * G.spin * 12.56, -G.uv * 0.035 + (G.inv > 0 ? Math.sin(G.t * 30) * 0.05 : 0));
  // ---- off the sledge once it has slid to a stop on the ice
  if (G.s > ICE0 || (G.s > S1 + 6 && G.v < 0.6)) {
    G.phase = 'ice'; pick(T('off')); hint('h_ice'); P.x = X + 0.9; P.z = Z - 0.8; P.vx = 0; P.vz = -Math.max(3, G.v); P.y = 0.01; P.vy = 3.5; Mi.x = X - 0.9; Mi.z = Z - 0.4; Mi.vx = 0; Mi.vz = -2;
    scene.attach(dog.root); scene.attach(cat.root); dog.root.rotation.set(0, Math.PI, 0); cat.root.rotation.set(0, Math.PI, 0); sled.rotation.set(0, sled.rotation.y, 0); sled.position.y = 0.03; if (audio.on) audio.bark();
  }
}
function stepIce(dt) {
  // ---- what is under the paws
  let onSnow = false; for (const q of haz) if (q.type === 'snow' && Math.hypot(q.x - P.x, q.z - P.z) < q.r) { onSnow = true; break; }
  if (onSnow) hint('h_snow');
  if (P.fall > 0) { P.fall -= dt; if (P.fall <= 0) { P.x = P.rx; P.z = P.rz; P.vx = P.vz = 0; P.y = 0; } }
  else {
    const acc = (onSnow ? 30 : 8.5) * (P.y > 0 ? 0.2 : 1), mu = onSnow ? 11 : input.brake ? 3.2 : 0.75; let ix = input.x, iy = input.y; const il = Math.hypot(ix, iy); if (il > 1) { ix /= il; iy /= il; }
    P.vx += ix * acc * dt; P.vz -= iy * acc * dt;
    const sp = Math.hypot(P.vx, P.vz); if (sp > 0) { const d = Math.max(0, sp - (P.y > 0 ? 0 : mu) * dt) / sp, cap = Math.min(1, 12.5 / Math.max(sp, 0.01)); P.vx *= d * cap; P.vz *= d * cap; }
    P.x += P.vx * dt; P.z += P.vz * dt;
    if (P.y > 0 || P.vy > 0) { P.vy -= 18 * dt; P.y += P.vy * dt; if (P.y <= 0) { P.y = 0; P.vy = 0; if (audio.on) audio.land(); } }
    const s = -P.z, w = half(s) - 0.9, off = P.x - cx(s); if (Math.abs(off) > w) { P.x = cx(s) + Math.sign(off) * w; if (P.vx * off > 0) P.vx *= -0.4; snowPuff(P.x, 0, P.z, 2); }
    if (s < S1 + 4) { P.z = -(S1 + 4); if (P.vz > 0) P.vz *= -0.3; }
    // ---- hazards
    for (const q of haz) { const d = Math.hypot(q.x - P.x, q.z - P.z);
      if (q.type === 'hole' || (q.type === 'thin' && q.broken)) { if (d < q.r + 9) hint('h_hole'); if (d < q.r - 0.15 && P.y < 0.5 && G.inv <= 0 && !G.noHit) dunk(q); }
      else if (q.type === 'thin') { if (d < q.r + 10) hint('h_thin');
        if (d < q.r && P.y < 0.3) { q.load += dt; if (!q.warned && q.load > 0.3) { q.warned = true; pick(T('crackle')); if (audio.on) audio.crack(); } if (q.load > 0.85) { q.broken = true; q.m.visible = false; q.hm.visible = true; if (audio.on) { audio.crack(); audio.splash(0.3); } if (G.inv <= 0 && !G.noHit) dunk(q); } }
        else { q.load = Math.max(0, q.load - dt * 0.5); if (q.load < 0.1) q.warned = false; } }
      else if (q.type === 'angler' && d < q.r + 0.45) { const nx = (P.x - q.x) / (d || 1), nz = (P.z - q.z) / (d || 1), vn = P.vx * nx + P.vz * nz; P.x = q.x + nx * (q.r + 0.45); P.z = q.z + nz * (q.r + 0.45); if (vn < 0) { P.vx -= 1.5 * vn * nx; P.vz -= 1.5 * vn * nz; if (vn < -3) { pick(T('bump')); if (audio.on) audio.land(); } } } }
    for (const k of skaters) { if (Math.abs(k.z + P.z - 0) < 30) hint('h_skater'); k.cd -= dt; const d = Math.hypot(k.x - P.x, k.z - P.z); if (d < k.r + 0.5 && k.cd <= 0 && P.y < 0.9) { k.cd = 1; const nx = (P.x - k.x) / (d || 1), nz = (P.z - k.z) / (d || 1); P.vx = nx * 7 + k.vx * 0.6; P.vz = nz * 7; G.spinD = 1; G.shake = Math.max(G.shake, 0.3); pick(T('bump')); buzz(40); if (audio.on) { audio.land(); audio.yelp(); } snowPuff(P.x, 0.3, P.z, 10); } }
  }
  for (const it of items) { if (it.got || !it.ice) continue; if (Math.abs(it.z - P.z) < 1 && Math.abs(it.x - P.x) < 1) { it.got = true; gotBone(it.x, it.h, it.z); } }
  if (G.places < 3 && -P.z > S2 - 60) { G.places = 3; place(T('p4')); }
  // ---- Łatka: legs scrabble when she pushes, she turns towards where she is going
  const sp = Math.hypot(P.vx, P.vz), push = Math.hypot(input.x, input.y);
  if (sp > 0.6) { const want = Math.atan2(P.vx, P.vz); let d = want - P.face; while (d > Math.PI) d -= 6.2832; while (d < -Math.PI) d += 6.2832; P.face += d * Math.min(1, dt * (onSnow ? 10 : 4)); }
  G.spinD = Math.max(0, (G.spinD || 0) - dt * 1.3);
  dog.root.position.set(P.x, P.fall > 0 ? -0.5 : P.y, P.z); dog.root.rotation.set(0, P.face + (G.spinD || 0) ** 2 * 12.56, 0); dog.root.visible = P.fall <= 0 && (G.inv <= 0 || Math.floor(G.t * 14) % 2 === 0);
  dog.animate(dt, { speed: push > 0.1 ? 9 : sp > 4 && !onSnow ? 0 : sp, grounded: P.y <= 0, vy: P.vy, slide: push < 0.1 && sp > 4 && !onSnow ? 1 : 0, happy: 0.4, pant: true });
  if (sp > 3 && P.y <= 0 && Math.random() < dt * (onSnow ? 30 : 10)) pAlpha.spawn(P.x, 0.06, P.z, -P.vx * 0.2 + (Math.random() - 0.5), 0.5 + Math.random(), -P.vz * 0.2 + (Math.random() - 0.5), 0.5, 0.1, 0.4, 0.95, 0.98, 1, 0.6, 3, 1.5);
  // ---- Mila glides along behind, spinning when the turns get sharp
  const tx = P.x - Math.sin(P.face) * 1.5, tz = P.z - Math.cos(P.face) * 1.5; Mi.vx += ((tx - Mi.x) * 5 - Mi.vx * 1.6) * dt; Mi.vz += ((tz - Mi.z) * 5 - Mi.vz * 1.6) * dt; Mi.x += Mi.vx * dt; Mi.z += Mi.vz * dt; Mi.spin += (Mi.vx * Math.cos(P.face) - Mi.vz * Math.sin(P.face)) * dt * 0.5; Mi.spin *= Math.exp(-dt * 1.2);
  cat.root.position.set(Mi.x, 0, Mi.z); cat.root.rotation.set(0, Math.atan2(Mi.vx, Mi.vz) + Mi.spin, 0); cat.animate(dt, { speed: Math.hypot(Mi.vx, Mi.vz) > 5 ? 0 : Math.hypot(Mi.vx, Mi.vz), grounded: true, vy: 0, crouch: Math.hypot(Mi.vx, Mi.vz) > 5 ? 1 : 0 });
  // ---- the far bank
  if (-P.z > S2 - 1.5 && P.fall <= 0 && G.mode === 'play') { G.mode = 'win'; G.endT = 0; if (audio.on) audio.fanfare(); buzz([60, 40, 60]); }
}
function dunk(q) {
  P.fall = 1.1; const d = Math.hypot(P.vx, P.vz) || 1; P.rx = clamp(q.x - P.vx / d * (q.r + 2.2), cx(-q.z) - half(-q.z) + 2, cx(-q.z) + half(-q.z) - 2); P.rz = Math.min(q.z - P.vz / d * (q.r + 2.2), -(S1 + 8)); if (Math.hypot(P.rx - q.x, P.rz - q.z) < q.r + 1) P.rz = q.z + q.r + 2.2;
  hurt('splash', q.x, 0, q.z, true); for (let k = 0; k < 26; k++) pAlpha.spawn(q.x + (Math.random() - 0.5) * q.r, 0.1, q.z + (Math.random() - 0.5) * q.r, (Math.random() - 0.5) * 4, 3 + Math.random() * 4, (Math.random() - 0.5) * 4, 0.9, 0.12, 0.3, 0.7, 0.85, 1, 0.85, 10, 0.5);
}

function step(dt) {
  G.t += dt; RU.uTime.value = G.t; flakeU.uT.value = G.t;
  const play = G.mode === 'play', title = G.mode === 'title', win = G.mode === 'win';
  input.x = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + touch.x; input.y = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) + touch.y; input.brake = !!(keys.KeyS || keys.ArrowDown || touch.brake || keys.ShiftLeft);
  if (G.phase === 'ice') input.brake = !!(touch.brake || keys.ShiftLeft || keys.ShiftRight);
  if (G.bot && play) bot();
  input.x = clamp(input.x, -1, 1); input.y = clamp(input.y, -1, 1);
  G.inv = Math.max(0, G.inv - dt); G.streakT -= dt; G.shake = Math.max(0, G.shake - dt * 1.6);
  if (play) { G.time += dt; if (G.phase === 'sled') stepSled(dt); else stepIce(dt); }
  else if (title) { G.y = ground(0, 0); sled.position.set(cx(0), G.y + 0.03, 0); sled.rotation.set(Math.atan(slopeAt(0)), Math.PI, 0); }
  else if (G.mode === 'over') { G.endT += dt; if (G.endT > 1.8 && $('end').classList.contains('hidden')) finish(false); }
  if (G.phase === 'sled') { dog.animate(dt, { speed: 0, grounded: true, vy: 0, sit: 1, happy: 0.7, pant: true }); cat.animate(dt, { speed: 0, grounded: true, vy: 0, sit: 1, crouch: G.v > 20 ? 1 : 0 }); dog.root.visible = cat.root.visible = true; sled.visible = G.inv <= 0 || Math.floor(G.t * 14) % 2 === 0; }
  else sled.visible = true;
  // ---- the ending: both run to the fire and sit down, everybody hops
  const FX = CXI, FZ = -(S2 + 12);
  if (win) { G.endT += dt; const go = (o, tx, tz, an, isDog) => { const dx = tx - o.position.x, dz = tz - o.position.z, d = Math.hypot(dx, dz); if (d > 0.25) { const v = Math.min(6, d * 3); o.position.x += dx / d * v * dt; o.position.z += dz / d * v * dt; o.position.y = ground(-o.position.z, o.position.x - CXI); o.rotation.set(0, Math.atan2(dx, dz), 0); an.animate(dt, { speed: v, grounded: true, vy: 0, happy: 1, pant: isDog }); } else { o.rotation.set(0, Math.atan2(FX - o.position.x, FZ - o.position.z), 0); an.animate(dt, { speed: 0, grounded: true, vy: 0, sit: 1, happy: 1, pant: isDog }); } };
    dog.root.visible = true; go(dog.root, FX - 1.3, FZ + 2.4, dog, true); go(cat.root, FX + 1.0, FZ + 2.5, cat, false);
    if (G.endT > 1.2 && Math.random() < dt * 0.6 && audio.on) audio.bark(0.95 + Math.random() * 0.2);
    if (G.endT > 7.5 && $('end').classList.contains('hidden')) finish(true); }
  people.forEach((p) => { p.m.position.y = p.y + Math.abs(Math.sin(G.t * (win ? 7 : 2.2) + p.ph)) * (win ? 0.4 : 0.05); });
  puppies.forEach((p, i) => { const hopY = Math.abs(Math.sin(G.t * (win ? 8 : 3) + i * 1.3)) * (win ? 0.45 : 0.08); p.d.root.position.set(p.x, ground(-p.z, p.x - CXI) + hopY, p.z); p.d.root.rotation.y = Math.atan2(FX - p.x, FZ - p.z) + (win ? Math.sin(G.t * 3 + i) * 0.6 : 0); p.d.animate(dt, { speed: 0, grounded: hopY < 0.05, vy: 1, happy: 1, pant: true, sit: win ? 0 : 1 }); });
  // ---- things that move by themselves
  for (const b of balls) { const h = half(b.s) - 1.2, a = G.t * 0.75 + b.ph; b.u = h * Math.sin(a); const x = cx(b.s) + b.u; b.m.position.set(x, ground(b.s, b.u) + b.r * 0.92, -b.s); b.m.rotation.z -= h * Math.cos(a) * 0.75 * dt / b.r; }
  for (const k of skaters) { const a = G.t * k.w + k.ph, nx = CXI + k.amp * Math.sin(a); k.vx = (nx - k.x) / Math.max(dt, 1e-3); k.x = nx; const dir = Math.cos(a) >= 0 ? 1 : -1; k.m.position.set(k.x, 0.02, k.z + Math.sin(a * 2) * 1.5); k.m.rotation.set(0, dir * Math.PI / 2, -dir * 0.0); k.m.rotation.x = 0.16; k.m.position.y = 0.02 + Math.abs(Math.sin(a * 6)) * 0.03; }
  for (const f of fire.userData.flames) { const q = 0.75 + Math.random() * 0.5; f.scale.set(q, 0.7 + Math.random() * 0.7, q); } fireLight.intensity = 22 + Math.random() * 9;
  if (Math.random() < dt * 22) pAdd.spawn(FX + (Math.random() - 0.5) * 0.5, fire.position.y + 0.8, FZ + (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.8, 1.6 + Math.random() * 2, (Math.random() - 0.5) * 0.8, 1.2, 0.07, 0.02, 6, 2.4, 0.4, 1, -0.6, 0.3);
  if (Math.random() < dt * 9) pAlpha.spawn(FX, fire.position.y + 1.6, FZ, 0.3, 1.2 + Math.random(), 0, 3.2, 0.5, 2.6, 0.62, 0.62, 0.66, 0.3, -0.2, 0.2);
  if (G.chimney && Math.random() < dt * 6) pAlpha.spawn(G.chimney.x, G.chimney.y, G.chimney.z, 0.5, 1 + Math.random() * 0.6, 0, 4, 0.6, 3, 0.8, 0.8, 0.84, 0.32, -0.15, 0.2);
  // ---- bones
  let n = 0; const ps = prog();
  for (const it of items) { if (it.got || n >= 90) continue; const s = it.ice ? -it.z : it.s; if (s < ps - 6 || s > ps + 130) continue; const x = it.ice ? it.x : cx(it.s) + it.u, y = (it.ice ? 0 : ground(it.s, it.u)) + it.h;
    dummy.position.set(x, y + Math.sin(G.t * 3 + s) * 0.06, -s); dummy.rotation.set(0.3, G.t * 3 + s * 0.4, 0.5); dummy.scale.setScalar(1.7); dummy.updateMatrix(); boneMesh.setMatrixAt(n++, dummy.matrix); }
  boneMesh.count = n; boneMesh.instanceMatrix.needsUpdate = true;
  pAdd.update(dt); pAlpha.update(dt);
  // ---- camera, light
  const sh = G.shake * G.shake * 0.5, tall = camera.aspect < 1 ? 1 : 0; let px, py, pz;
  if (title) { const a = G.t * 0.12 + 0.7; px = cx(0); py = G.y; pz = 0; camera.position.set(px + Math.sin(a) * 6.5, py + 2.3, pz + Math.cos(a) * 6.5 + 1); camera.lookAt(px, py + 0.5, pz - 2); }
  else if (win) { px = FX; pz = FZ; py = fire.position.y; const a = 0.4 + G.endT * 0.17; camera.position.lerp(tmpV.set(px + Math.sin(a) * (9 + tall * 3), py + 3.2, pz + Math.cos(a) * (9 + tall * 3) + 2), Math.min(1, dt * 1.5)); camera.lookAt(px, py + 0.9, pz + 0.6); }
  else if (G.phase === 'sled') { px = cx(G.s) + G.u; py = G.y; pz = -G.s; const hd = Math.atan(headAt(G.s)), back = 5.4 + tall * 3 + G.v * 0.07, cs = G.s - back * Math.cos(hd), cu = G.u * 0.75, cxw = cx(cs) + cu;
    tmpV.set(cxw, Math.max(py + 2.1 + tall, ground(cs, cu) + 1.5), -cs); camera.position.lerp(tmpV, Math.min(1, dt * 7)); camera.position.x += (Math.random() - 0.5) * sh; camera.position.y += (Math.random() - 0.5) * sh;
    const ls = G.s + 9; camera.lookAt(cx(ls) + G.u * 0.6, trackY(ls) + 1.1, -ls); camera.rotateZ(-G.uv * 0.012); }
  else { px = P.x; py = 0; pz = P.z; camera.position.lerp(tmpV.set(lerp(P.x, CXI, 0.25), 5.2 + tall * 2, P.z + 8.2 + tall * 2.5), Math.min(1, dt * 5)); camera.position.x += (Math.random() - 0.5) * sh; camera.lookAt(lerp(P.x, CXI, 0.15), 0.4, P.z - 6); }
  const fov = 62 + (tall ? 8 : 0) + (G.phase === 'sled' && play ? clamp((G.v - 12) * 0.75, 0, 14) : 0); if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 3); camera.updateProjectionMatrix(); }
  G.sky.position.copy(camera.position); flakeU.uCam.value.copy(camera.position); flakeU.uSize.value = renderer.domElement.height / 700;
  sun.target.position.set(px, py, pz - 6); sun.position.copy(sun.target.position).addScaledVector(SUN, 90);
  hud(); if (hintT > 0) { hintT -= dt; if (hintT <= 0) $('hint').style.opacity = 0; } if (pickT > 0) { pickT -= dt; if (pickT <= 0) $('pick').style.opacity = 0; }
  if (audio.on) { audio.musicRun({ play, soft: win, stage: G.phase === 'ice' ? 1 : 0 }); if (audio.wind) audio.wind.g.gain.setTargetAtTime(play && G.phase === 'sled' ? 0.05 + G.v * 0.012 : 0.06, audio.ctx.currentTime, 0.3); }
}
// plays the level by itself (testing): follows the clear line and brakes on the hill; on the ice keeps its speed down and steers round what is dangerous
function bot() {
  if (G.phase === 'sled') { let next = rows.find((r) => r.s > G.s + 2), prev = null; for (const r of rows) { if (r.s <= G.s + 2) prev = r; } const tgt = next ? (prev ? lerp(prev.safe, next.safe, clamp((G.s - prev.s) / (next.s - prev.s), 0, 1) ** 0.6) : next.safe) : 0;
    input.x = clamp((tgt - G.u) * 0.9 - G.uv * 0.25, -1, 1); input.brake = G.v > 19 && G.s < S1 - 40; if (next && next.log && next.s - G.s < G.v * 0.3 && !G.air) hop(); return; }
  let dx = (CXI - P.x) * 0.04, dz = -1; for (const q of haz) { if (q.type === 'snow') continue; const ox = P.x - q.x, oz = P.z - q.z, d = Math.hypot(ox, oz), reach = q.r + 6; if (d < reach && oz > -q.r - 1) { const k = (reach - d) / reach * 3.2; dx += (ox >= 0 ? 1 : -1) * k * (1.2 - Math.abs(ox) / reach); } }
  for (const k of skaters) { const oz = P.z - k.z; if (oz > 0 && oz < 7 && Math.abs(k.x - P.x) < 4) dz = 0.6; }
  const want = 6.5, wx = clamp(dx, -1.4, 1.4) * 4, wz = dz * want; input.x = clamp((wx - P.vx) * 0.5, -1, 1); input.y = clamp(-(wz - P.vz) * 0.5, -1, 1); input.brake = false;
}

let last = 0, fpsAcc = 0, fpsN = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
  if (document.hidden) return;
  step(dt); draw();
  fpsAcc += dt; fpsN++; if (fpsAcc > 2.5) { if (fpsAcc / fpsN > 0.03 && pixelRatio > 0.7) { pixelRatio = Math.max(0.7, pixelRatio * 0.85); resize(); } fpsAcc = 0; fpsN = 0; }
}
async function boot() {
  document.body.classList.add('sled'); if (isTouch) document.body.classList.add('touch');
  await new Promise((r) => setTimeout(r, 30));
  tex = createTextures();
  buildWorld(); buildCourse();
  dog = buildDog(tex, {}); cat = buildCat({ scale: 1.15 }); if (HQ) { addFur(dog.root, DOG_FUR); addFur(cat.root, CAT_FUR); }
  for (let i = 0; i < 4; i++) { const d = buildDog(tex, { scale: 0.43, head: 1.3, leg: 0.8, ear: 1.15, snout: 0.72 }); scene.add(d.root); puppies.push({ d, x: 0, z: 0 }); }
  pAdd = new Particles(500, true); pAlpha = new Particles(900, false); scene.add(pAdd.mesh, pAlpha.mesh);
  $('rCat').textContent = '🔥'; $('rCat').style.left = '100%';
  reset(); G.mode = 'title'; applyLang();
  $('start').addEventListener('click', startGame);
  $('lang').addEventListener('click', () => { lang = lang === 'pl' ? 'en' : 'pl'; applyLang(); });
  $('again').addEventListener('click', () => { const bt = G.bot; toTitle(); G.bot = bt; startGame(); });
  $('menu').addEventListener('click', toTitle);
  step(0.016); renderer.compile(scene, camera); draw();
  window.__sled = { G, P, Mi, obs, rows, items, balls, haz, skaters, input, audio, step, startGame, reset, toTitle, hop, renderer, scene, camera, cx, half, ground, S1, S2, ICE0, CXI,
    sim: (secs, dt = 1 / 60) => { for (let t = 0; t < secs; t += dt) step(dt); draw(); return { mode: G.mode, phase: G.phase, s: +prog().toFixed(0), u: +G.u.toFixed(1), v: +G.v.toFixed(1), lives: G.lives, bones: G.bones, time: +G.time.toFixed(0) }; } };
  $('title').classList.remove('hidden'); $('loading').style.opacity = 0; setTimeout(() => $('loading').remove(), 1100);
  last = performance.now(); requestAnimationFrame(frame);
}
boot().catch((e) => { console.error(e); $('loading').textContent = 'Błąd: ' + e.message; });
