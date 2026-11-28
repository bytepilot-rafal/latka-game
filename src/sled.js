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
    h_start: 'Sanki same nabierają prędkości. Skręcaj, a przed zakrętem przyhamuj.', h_log: 'Kłoda w poprzek — podskocz!', h_ramp: 'Skocznia! W locie kręć sankami (← →) i wyląduj prosto.', h_fork: 'Rozwidlenie! Szeroka droga jest łatwa, wąski skrót przez las — szybszy i pełen kości.', h_chute: 'Lodowa rynna! Sanki pędzą i prawie nie skręcają.', h_deer: 'Sarny przebiegają przez trasę — przyhamuj!', h_crack: 'Lód pęka za Łatką! Biegnij i nie zatrzymuj się!',
    h_ball: 'Uwaga, toczy się śnieżna kula!', h_ice: 'Lód! Łatka ślizga się dalej, nawet gdy puścisz ster.', h_hole: 'Omijaj przeręble.', h_thin: 'Ciemny lód jest cienki — przebiegnij szybko albo omiń.',
    h_snow: 'Na śniegu łapy trzymają — tam najłatwiej wyhamować.', h_skater: 'Uwaga na łyżwiarzy!',
    hit: 'Bęc! Sanki w zaspie!', splash: 'Chlup! Lodowata kąpiel!', bump: 'Ups!', air: (m, b) => `Lot ${m} m! +${b}`, spin: (n, b) => `Obrót ×${n}! +${b}`, clean: (n, b) => `Obrót ×${n} i czyste lądowanie! +${b}`, tumble: 'Krzywe lądowanie — fikołek!', sign: 'SKRÓT', crackle: 'Lód trzeszczy!', off: 'Dalej na łapach!',
    k_place: 'Zima', p1: 'Górka Piszczykowska', p2: 'Wierzbica', p3: 'Zamarznięta Narew', p4: 'Ognisko',
    winT: 'Przy ognisku!', winX: (t, b, s) => `Łatka i Mila grzeją łapy przy ognisku ze Stasiem. Czas: ${t} · kości: ${b}. ${s}`,
    loseT: 'Koniec zabawy…', loseX: (m) => `Przemoczone i zmarznięte wracają do domu, ${m} m przed ogniskiem. Spróbuj jeszcze raz!`,
  },
  en: {
    over: 'Level 6', title: 'Winter on the Narew', start: 'Off we go!', again: 'Again', menu: 'Menu',
    story: 'It has snowed! Łatka and Mila ride Staś\'s sledge down the big hill, then run across the frozen Narew to the bonfire. Paws slip on the ice — brake and turn early!',
    keys: 'A / D or ← → — steer · Space — hop · S or ↓ — brake · on the ice: arrows / WASD — run any way',
    keys_t: 'Left thumb — steer (on the ice: where to run) · paw — hop · "Stop" — brake',
    time: (t) => `Time: ${t}`, bones: (n) => `Bones: ${n}`, left: (m) => `To the bonfire: ${m} m`, brake: 'Stop',
    h_start: 'The sledge picks up speed by itself. Steer, and brake before the bends.', h_log: 'A log across the run — hop!', h_ramp: 'A kicker! Spin the sledge in the air (← →) and land straight.', h_fork: 'A fork! The wide way is easy, the narrow shortcut through the trees is faster and full of bones.', h_chute: 'The ice chute! The sledge flies and hardly steers.', h_deer: 'Deer are crossing the run — brake!', h_crack: 'The ice is breaking behind Łatka! Run and do not stop!',
    h_ball: 'Look out, a snowball is rolling!', h_ice: 'Ice! Łatka keeps sliding even when you let go.', h_hole: 'Keep away from the ice holes.', h_thin: 'Dark ice is thin — cross it fast or go round.',
    h_snow: 'Paws grip on snow — the easiest place to stop.', h_skater: 'Mind the skaters!',
    hit: 'Bump! Into the snowdrift!', splash: 'Splash! An icy bath!', bump: 'Oops!', air: (m, b) => `${m} m of air! +${b}`, spin: (n, b) => `Spin ×${n}! +${b}`, clean: (n, b) => `Spin ×${n} and a clean landing! +${b}`, tumble: 'Crooked landing — tumble!', sign: 'SKRÓT', crackle: 'The ice is cracking!', off: 'On paws from here!',
    k_place: 'Winter', p1: 'Górka Piszczykowska', p2: 'Wierzbica', p3: 'Zamarznięta Narew', p4: 'Ognisko',
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
const FORKS = [{ a: 520, b: 700, off: -16.5 }, { a: 1010, b: 1190, off: 16.5 }], HS = 2.7, CHUTE = [1235, 1390], CR0 = S2 - 120, CR1 = S2 - 28;   // shortcuts; the ice chute; where the river ice breaks up
const forkAt = (s) => (s > FORKS[0].a && s < FORKS[0].b ? FORKS[0] : s > FORKS[1].a && s < FORKS[1].b ? FORKS[1] : null);
const uc = (f, s) => f.off * sm(f.a, f.a + 45, s) * (1 - sm(f.b - 45, f.b, s));                    // middle of the shortcut: it leaves the run, keeps apart, comes back
const chuteK = (s) => sm(CHUTE[0], CHUTE[0] + 25, s) * (1 - sm(CHUTE[1] - 25, CHUTE[1], s));
const half = (s) => lerp(lerp(7.6 + 1.4 * Math.sin(s * 0.011 + 2), 2.8, chuteK(s)), IW, sm(S1 - 10, S1 + 70, s));
const trackY = (s) => { const f = clamp((S1 - s) / S1, 0, 1.06), a = 0.1, g = f < a ? f * f / (2 * a) : f - a / 2, k = sm(0, 0.15, f); return DROP * g + (4 * Math.sin(s * 0.019) + 1.6 * Math.sin(s * 0.043 + 1)) * k; };
const RAMPS = [];                                                          // kickers: { s, u, w }
function ground(s, u) {
  const a = Math.abs(u), h = half(s), k = sm(S1 - 30, S1 + 5, s), f = forkAt(s); let d = a - h, m = Math.min(a, h), dip = 0;
  if (f) { const c = uc(f, s), ds = Math.abs(u - c) - HS; if (ds < d) { d = ds; m = Math.min(Math.abs(u - c), HS); } dip = 2.4 * Math.sin(Math.PI * clamp((s - f.a - 40) / (f.b - f.a - 80), 0, 1)) * sm(3, -0.5, ds) * sm(HS + 4, HS + 9, Math.abs(c)); }   // the shortcut dives into a gully
  let y = trackY(s) + (0.014 + 0.2 * chuteK(s)) * m * m * (1 - k) + sm(0, 5, d) * (1.9 - 0.4 * k) - dip;
  if (d > 2) y += sm(2, 70, d) * (fbm((cx(s) + u) * 0.018, s * 0.018, 3, 7) * 24 - 5);
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
const obs = [], rows = [], items = [], balls = [], haz = [], skaters = [], people = [], puppies = [], nearTrees = [], deer = [], floes = [];
let hare, iceTrail, crackWater;
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
  for (let s = 190; s < S1 - 150; s += 165 + R() * 40) if (s < CHUTE[0] - 40 || s > CHUTE[1] + 20) RAMPS.push({ s, u: (R() - 0.5) * 5, w: 3.3 });
  // ---- the snow: one sheet that follows the run, fine in the middle and coarse far out
  const US = []; for (const a of [150, 112, 84, 62, 46, 35, 28, 24.5, 22, 20, 18.2, 16.5, 14.8, 13.2, 11.6, 10.2, 8.9, 7.6, 6.4, 5.2, 3.9, 2.6, 1.3]) US.push(-a); US.push(0); for (let i = US.length - 2; i >= 0; i--) US.push(-US[i]);
  const DS = 1.5, s0 = -60, NR = Math.ceil((S2 + 120 - s0) / DS), NC = US.length, pos = new Float32Array((NR + 1) * NC * 3), col = new Float32Array((NR + 1) * NC * 3), ix = [];
  for (let i = 0; i <= NR; i++) { const s = s0 + i * DS, c = cx(s), h = half(s), ice = s > S1 - 2 && s < S2 + 3;
    for (let j = 0; j < NC; j++) { const u = US[j] * (s > S1 ? lerp(1, 1.5, sm(S1, S1 + 60, s)) : 1), a = Math.abs(u), q = (i * NC + j) * 3; let y = ground(s, u); if (ice && a < h - 0.2) y -= 0.7;
      pos[q] = c + u; pos[q + 1] = y; pos[q + 2] = -s;
      const fk = forkAt(s), inS = fk ? 1 - sm(HS - 1, HS + 1, Math.abs(u - uc(fk, s))) : 0, n = fbm((c + u) * 0.09, s * 0.09, 3, 3), packed = Math.max(1 - sm(h - 1.5, h + 1, a), inS) * (1 - sm(S1 - 20, S1 + 10, s)), b = 0.9 + n * 0.1 - packed * 0.07;
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
    for (let s = -55; s < S2 + 115; s += 2.6) for (const side of [-1, 1]) { const h = half(s); for (let q = 0; q < 2; q++) { if (R() > n0 * (q ? 0.55 : 0.8)) continue; const a = h + 4.5 + Math.pow(R(), 1.7) * 125, u = side * a, fk = forkAt(s); if (fk && Math.abs(u - uc(fk, s)) < HS + 2.2) continue; const t = [cx(s) + u, ground(s, u) - 0.25, -s - R() * 2.6, 0.5 + R() * 0.75]; list.push(t); if (a < h + 12 && s > 20 && s < S1) nearTrees.push({ s: -t[2], u, x: t[0], y: t[1], z: t[2], sc: t[3], done: false }); } }
    for (const fk of FORKS) for (let s = fk.a + 30; s < fk.b - 30; s += 3.2) { const c = uc(fk, s), sg = Math.sign(fk.off), room = Math.abs(c) - HS - half(s) - 3.4; if (room < 0.5) continue; const u = sg * (half(s) + 1.7 + R() * room), t = [cx(s) + u, ground(s, u) - 0.25, -s, 0.36 + R() * 0.3]; list.push(t); nearTrees.push({ s, u, x: t[0], y: t[1], z: t[2], sc: t[3], done: false }); }
    nearTrees.sort((p, q) => p.s - q.s);
    for (let i = 0; i < 70; i++) { const x = CXI + (R() - 0.5) * 150, s = S2 + 26 + R() * 90; if (Math.abs(x - CXI) < 13 && s < S2 + 50) continue; list.push([x, ground(s, x - CXI) - 0.25, -s, 0.6 + R() * 0.7]); }
    const m = new THREE.InstancedMesh(geo, worldMat, list.length); list.forEach(([x, y, z, sc2], i) => { dummy.position.set(x, y, z); dummy.rotation.set(0, R() * 6.28, 0); dummy.scale.set(sc2, sc2 * (0.9 + R() * 0.35), sc2); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); m.setColorAt(i, tmpC.setScalar(0.8 + R() * 0.3)); });
    m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; scene.add(m); }
  // ---- soft drifts and boulders along the edges
  { const B = new Builder(8); B.blob(1, 0, 0.1, 0, 0xf4f7fc, 0.5, 1.3, 1); const geo = B.mesh().geometry, list = [];
    for (let s = -20; s < S2 + 40; s += 5) for (const side of [-1, 1]) if (R() < 0.7) { const u = side * (half(s) + 1.5 + R() * 5), fk = forkAt(s); if (fk && Math.abs(u - uc(fk, s)) < HS + 1.8) continue; list.push([cx(s) + u, ground(s, u) - 0.1, -s, 0.8 + R() * 1.6]); }
    const m = new THREE.InstancedMesh(geo, snowMat, list.length); list.forEach(([x, y, z, sc2], i) => { dummy.position.set(x, y, z); dummy.rotation.set(0, R() * 6.28, 0); dummy.scale.set(sc2, sc2 * (0.7 + R() * 0.5), sc2); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); });
    m.receiveShadow = true; m.castShadow = true; m.frustumCulled = false; scene.add(m); }
  // ---- fences of poles and orange netting on the outside of the bends, flags at the kickers, the start gate, a hut, the cottage by the fire
  const B = new Builder(12);
  for (let s = 30; s < S1 - 40; s += 4) { const c = curveAt(s); if (Math.abs(c) < 0.012 || forkAt(s) || chuteK(s) > 0) continue; const side = c > 0 ? -1 : 1, u = side * (half(s) + 0.9), x = cx(s) + u, y = ground(s, u); B.cyl(0.05, 0.06, 1.3, x, y - 0.1, -s, 0x6b4a2e, 5); B.box(0.04, 0.5, 4.05, x, y + 0.55, -s - 2, 0xff7a1a, -headAt(s)); }
  for (const r of RAMPS) for (const sd of [-1, 1]) { const u = r.u + sd * (r.w + 0.3), x = cx(r.s - 6) + u, y = ground(r.s - 6, u); B.cyl(0.035, 0.035, 2.2, x, y, -(r.s - 6), 0xd8d8d8, 5); B.box(0.55, 0.36, 0.03, x + 0.28, y + 1.8, -(r.s - 6), sd < 0 ? 0xd9302c : 0x2c62d9); }
  { const y = ground(8, 0), x = cx(8); for (const sd of [-1, 1]) B.cyl(0.13, 0.15, 4.6, x + sd * 6.2, y + 1.2, -8, 0x7a5636, 7); B.box(12.6, 0.9, 0.12, x, y + 5.0, -8, 0xc8372f);
    const hy = ground(-10, -14); B.box(5, 2.6, 4, x - 14, hy, 10, 0x8a6240); B.add(roofGeo(5.8, 1.7, 4.8), 0xf3f6fb, x - 14, hy + 2.6, 10); B.box(0.6, 1.4, 0.6, x - 12.6, hy + 3.4, 10.6, 0x6e4a32); }
  { const x = CXI + 15, z = -(S2 + 30), y = ground(S2 + 30, 15); B.box(8, 3, 6, x, y, z, 0xd9cbb0); B.add(roofGeo(9.2, 2.6, 7), 0xf3f6fb, x, y + 3, z); B.box(0.8, 1.8, 0.8, x + 2.2, y + 4.2, z, 0x8a5a44); B.box(1, 2, 0.1, x - 1.2, y, z + 3.02, 0x5b3a26); for (const wx of [-3, 1.6]) B.box(1.1, 1, 0.1, x + wx, y + 1.3, z + 3.02, 0xffd98a); G.chimney = new THREE.Vector3(x + 2.2, y + 6.1, z);
    for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28; B.cyl(0.16, 0.18, 0.5, CXI + Math.cos(a) * 3.3, ground(S2 + 12, 0) - 0.05, -(S2 + 12) + Math.sin(a) * 3.3, 0x7a5636, 7); } }      // stumps to sit on round the fire
  for (let s = CHUTE[0] + 14, i = 0; s < CHUTE[1] - 12; s += 3, i++) for (const sd of [-1, 1]) { const u = sd * (half(s) + 0.75), x = cx(s) + u; B.box(0.12, 0.5, 3.02, x, ground(s, u) - 0.05, -s, i % 2 ? 0xd9302c : 0xf2f4f7, -headAt(s)); }      // boards along the ice chute
  for (const fk of FORKS) { const s = fk.a + 16, sg = Math.sign(fk.off), u = sg * (half(s) - 1.2), x = cx(s) + u, y = ground(s, u); for (const o of [-0.9, 0.9]) B.cyl(0.05, 0.06, 2.2, x + o, y - 0.1, -s, 0x6b4a2e, 5); B.box(2.3, 0.75, 0.07, x, y + 1.45, -s, 0x8a6240);
    const tx = canvasTex(256, 96, (c, w, h) => { c.fillStyle = '#8a6240'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff6da'; c.font = 'bold 46px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(sg < 0 ? '← ' + T('sign') : T('sign') + ' →', w / 2, h / 2 + 3); }, 1, 1);
    const pm = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.7), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.9 })); pm.position.set(x, y + 1.82, -s + 0.045); scene.add(pm); }
  const st = B.mesh(); st.frustumCulled = false; scene.add(st);
  { const x = CXI + 15, z = -(S2 + 30), y = ground(S2 + 30, 15); G.winMat = new THREE.MeshBasicMaterial({ color: 0x000000, fog: false }); for (const wx of [-3, 1.6]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.9), G.winMat); w.position.set(x + wx, y + 1.8, z + 3.09); scene.add(w); } G.houseLight = new THREE.PointLight(0xffc070, 0, 26, 1.5); G.houseLight.position.set(x - 0.6, y + 2, z + 6); scene.add(G.houseLight); }
  // ---- the ice chute: a glossy skin over the half-pipe
  { const us = [-2.6, -1.3, 0, 1.3, 2.6], a = CHUTE[0] + 9, n = Math.floor((CHUTE[1] - 9 - a) / 1.5), pp = [], ii = []; for (let i = 0; i <= n; i++) { const s = a + i * 1.5; for (const u of us) pp.push(cx(s) + u, ground(s, u) + 0.035, -s); } for (let i = 0; i < n; i++) for (let j = 0; j < 4; j++) { const q = i * 5 + j; ii.push(q, q + 1, q + 5, q + 1, q + 6, q + 5); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3)); g.setIndex(ii); g.computeVertexNormals(); const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x86b9de, roughness: 0.08, envMapIntensity: 1.6, transparent: true, opacity: 0.86 })); m.receiveShadow = true; m.frustumCulled = false; scene.add(m); }
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
    if (chuteK(s) > 0 || (s > CHUTE[0] - 30 && s < CHUTE[1] + 12)) { rows.push({ s, safe: 0, clear: true }); safe = 0; continue; }
    const ramp = RAMPS.find((r) => s > r.s - 16 && s < r.s + 42); if (ramp) { rows.push({ s, safe: ramp.u, clear: true }); safe = ramp.u; continue; }
    if (R() < 0.16 && s > 200) { obs.push({ type: 'log', s, u: 0, w: h * 2 + 2, r: 0.3, hgt: 0.62 }); rows.push({ s, safe, log: true }); continue; }
    const row = { s, safe }; rows.push(row);
    for (let u = -h + 0.6; u <= h - 0.6; u += 2.3) { if (Math.abs(u - safe) < 2.5 || R() > (0.3 + Math.min(0.32, s / 3200)) * (forkAt(s) ? 0.55 : 1)) continue; const type = ['spruce', 'spruce', 'snowman', 'rock'][(R() * 4) | 0]; obs.push({ type, s: s + (R() - 0.5) * 3, u: u + (R() - 0.5) * 0.8, r: type === 'rock' ? 0.85 : type === 'spruce' ? 0.55 : 0.6, sc: 0.85 + R() * 0.4 }); }
  }
  for (const fk of FORKS) { let sd = 1; for (let s = fk.a + 52; s < fk.b - 50; s += 8.5, sd = -sd) { obs.push({ type: 'spruce', s, u: uc(fk, s) + sd * 1.45, r: 0.5, sc: 0.72 }); for (let q = 0; q < 3; q++) { const s2 = s + 1.6 + q * 2.4; items.push({ s: s2, u: uc(fk, s2) - sd * 0.95 * (q === 1 ? 1 : 0.6), h: 0.55 }); } } }      // a tight slalom, thick with bones
  for (const s of [430, 770, 930]) { const b = { s, u: 0, r: 1.05, ph: R() * 6, m: new THREE.Mesh(new THREE.IcosahedronGeometry(1.05, 2), new THREE.MeshStandardMaterial({ color: 0xf1f5fb, roughness: 0.9, flatShading: true })) }; b.m.castShadow = true; scene.add(b.m); balls.push(b); }      // snowballs rolling from side to side
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
  for (let i = 0; i < 300 && haz.filter((q) => q.type === 'hole').length < 14; i++) { const z = -(ICE0 + 45 + R() * (CR0 - ICE0 - 60)), x = CXI + (R() - 0.5) * 42, r = 1.5 + R() * 0.9; if (!far(x, z, 6.5)) continue; haz.push({ type: 'hole', x, z, r, m: holeMesh(x, z, r) }); }
  for (let i = 0; i < 300 && haz.filter((q) => q.type === 'thin').length < 9; i++) { const z = -(ICE0 + 60 + R() * (CR0 - ICE0 - 75)), x = CXI + (R() - 0.5) * 40, r = 2.7 + R() * 0.9; if (!far(x, z, 5)) continue;
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 26).rotateX(-Math.PI / 2), thinM); m.position.set(x, 0.014, z); m.rotation.y = R() * 6; scene.add(m); const hm = holeMesh(x, z, r * 0.92); hm.visible = false; haz.push({ type: 'thin', x, z, r, m, hm, load: 0, warned: false }); }
  { const g = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2), p = g.attributes.position; for (let i = 1; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)), q = 0.8 + 0.3 * Math.sin(a * 3 + 1) + 0.12 * Math.sin(a * 7); p.setX(i, p.getX(i) * q); p.setZ(i, p.getZ(i) * q); }
    for (let i = 0; i < 300 && haz.filter((q) => q.type === 'snow').length < 13; i++) { const z = -(ICE0 + 30 + R() * (CR0 - ICE0 - 34)), x = CXI + (R() - 0.5) * 42, r = 2.6 + R() * 1.8; if (!far(x, z, 2.5)) continue; const m = new THREE.Mesh(g, rimM); m.position.set(x, 0.02, z); m.scale.set(r, 1, r); m.rotation.y = R() * 6; m.receiveShadow = true; scene.add(m); haz.push({ type: 'snow', x, z, r: r * 0.9, m }); }
    for (let i = 0; i < 110; i++) { const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xe6f1fa, roughness: 0.4, emissive: 0x6f8296, emissiveIntensity: 0.35 })); m.visible = false; scene.add(m); floes.push({ m, ph: R() * 6 }); } }
  haz.filter((q) => q.type === 'hole').slice(0, 5).forEach((hl, i) => { const sd = i % 2 ? 1 : -1, x = hl.x + sd * (hl.r + 1.1), g = new THREE.Group(), B = new Builder(30 + i); B.box(0.5, 0.36, 0.4, 0, 0, 0, 0x5a7a3a); const rod = new THREE.CylinderGeometry(0.012, 0.02, 1.7, 4); rod.rotateZ(sd * 1.0); B.add(rod, 0x2a2a2a, -sd * 0.75, 1.05, 0.1);
    const pm = person([0x3a6a4a, 0x8a4a2a, 0x344a7a][i % 3], [0xd9a441, 0x555555, 0xc23b2e][i % 3], 0x2c3350, 1, 0); pm.position.y = 0.2; g.add(B.mesh(), pm); g.position.set(x, 0, hl.z); g.rotation.y = sd * 0.5; scene.add(g); haz.push({ type: 'angler', x, z: hl.z, r: 0.75, m: g }); });
  for (let i = 0; i < 6; i++) { const z = -(ICE0 + 70 + i * (CR0 - ICE0 - 90) / 5), m = person([0xd9302c, 0x2c62d9, 0xe0a020, 0x9a3fc0, 0x23a37a, 0xe05a90][i], [0xffffff, 0xffd23f, 0x2c62d9, 0xffffff, 0xd9302c, 0x3a3a3a][i], 0x23262e, 0.82 + (i % 3) * 0.08, i % 2 ? 1 : -1); scene.add(m); skaters.push({ m, z, amp: 9 + R() * 9, w: 0.5 + R() * 0.35, ph: R() * 6, x: CXI, r: 0.6, cd: 0 }); }
  for (let z = ICE0 + 26; z < S2 - 6; z += 3.4) { const x = CXI + 15 * Math.sin((z - ICE0) * 0.026) * sm(ICE0, ICE0 + 60, z); if (!far(x, -z, 1.2) && haz.some((q) => q.type !== 'snow' && Math.hypot(q.x - x, q.z + z) < q.r + 1.2)) continue; items.push({ ice: true, x, z: -z, h: 0.55 }); }
  const wTex = canvasTex(512, 512, (c, w, h) => { const r = rng(14); c.fillStyle = '#2f6283'; c.fillRect(0, 0, w, h); for (let i = 0; i < 260; i++) { const x = r() * w, y = r() * h, l = 14 + r() * 46; c.strokeStyle = `rgba(${120 + r() * 80 | 0},${170 + r() * 60 | 0},${205 + r() * 40 | 0},${0.1 + r() * 0.22})`; c.lineWidth = 1 + r() * 2; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + l / 2, y + (r() - 0.5) * 8, x + l, y); c.stroke(); }
      for (let i = 0; i < 150; i++) { c.fillStyle = `rgba(235,246,255,${0.35 + r() * 0.5})`; const x = r() * w, y = r() * h, q = 2 + r() * 7; c.beginPath(); c.moveTo(x, y); c.lineTo(x + q, y + q * (r() - 0.5)); c.lineTo(x + q * 0.6, y + q); c.lineTo(x - q * 0.3, y + q * 0.6); c.fill(); } }, 5, 1);                                   // ripples and brash ice
    const crackM = new THREE.MeshStandardMaterial({ map: wTex, emissiveMap: wTex, emissive: 0xffffff, emissiveIntensity: 1.0, roughness: 0.2 }); G.wTex = wTex;
    // the edge of the break is ragged: tongues of water bite into the ice ahead of it, and white cracks run on further still
    { const W = IW * 2 + 8, teeth = canvasTex(1024, 64, (c, w, h) => { const r = rng(23); c.fillStyle = '#000'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(0, h); let x = 0; while (x < w) { const d = 14 + r() * 34; c.lineTo(x + d * (0.3 + r() * 0.4), h * (0.05 + r() * 0.75)); x += d; c.lineTo(x, h * (0.7 + r() * 0.28)); } c.lineTo(w, h); c.fill(); }, 1, 1); teeth.colorSpace = THREE.NoColorSpace;
      const tm = crackM.clone(); tm.map = tm.emissiveMap = wTex.clone(); tm.map.repeat.set(5, 0.25); tm.alphaMap = teeth; tm.alphaTest = 0.5; G.crackEdge = new THREE.Mesh(new THREE.PlaneGeometry(W, 2.6).rotateX(-Math.PI / 2).translate(0, 0, -1.3), tm); G.crackEdge.position.set(CXI, 0.0135, -CR0); G.crackEdge.visible = false; scene.add(G.crackEdge);
      const lines = canvasTex(1024, 256, (c, w, h) => { const r = rng(31); c.fillStyle = '#000'; c.fillRect(0, 0, w, h); c.lineCap = 'round'; for (let i = 0; i < 70; i++) { let x = r() * w, y = h, a = -Math.PI / 2 + (r() - 0.5) * 0.9; const len = 3 + r() * 9; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < len; k++) { a += (r() - 0.5) * 0.9; x += Math.cos(a) * 16; y += Math.sin(a) * 16; c.lineTo(x, y); if (r() < 0.25) { c.lineTo(x + (r() - 0.5) * 30, y - r() * 14); c.moveTo(x, y); } } c.strokeStyle = `rgba(255,255,255,${0.5 + r() * 0.5})`; c.lineWidth = 1.2 + r() * 2.2; c.stroke(); } }, 1, 1); lines.colorSpace = THREE.NoColorSpace;
      G.crackLines = new THREE.Mesh(new THREE.PlaneGeometry(W, 9).rotateX(-Math.PI / 2).translate(0, 0, -4.5), new THREE.MeshBasicMaterial({ color: 0xf2f8ff, alphaMap: lines, transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 })); G.crackLines.position.set(CXI, 0.012, -CR0); G.crackLines.visible = false; scene.add(G.crackLines); }
    crackWater = new THREE.Mesh(new THREE.PlaneGeometry(IW * 2 + 8, 1).rotateX(-Math.PI / 2).translate(0, 0, -0.5), crackM); crackWater.position.set(CXI, 0.013, -CR0); crackWater.visible = false; scene.add(crackWater);
  { const N = 260, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 2 * 18), 3)); iceTrail = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xf4faff, transparent: true, opacity: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 })); iceTrail.frustumCulled = false; iceTrail.userData = { N, k: 0, last: null, acc: 0 }; scene.add(iceTrail); }
  { // Roe deer in their grey-brown winter coat and a brown hare: smooth bodies turned on a lathe, paler bellies, legs with two joints that really gallop.
    const lathe = (pts, sx = 1, sy = 1, seg = 24) => { const sp = new THREE.SplineCurve(pts.map((q) => new THREE.Vector2(q[0], q[1]))).getPoints(pts.length * 4); sp.forEach((q) => { q.x = Math.max(q.x, 0.001); }); const g = new THREE.LatheGeometry(sp, seg).rotateX(Math.PI / 2).scale(sx, sy, 1); g.computeVertexNormals(); return g; };      // profile [radius, along the body]; the nose end is +z
    const shade = (g, top, belly, y0, y1) => { const P2 = g.attributes.position, c = new Float32Array(P2.count * 3), A = new THREE.Color(top), Bc = new THREE.Color(belly); for (let i = 0; i < P2.count; i++) { const k = sm(y0, y1, P2.getY(i)); c[i * 3] = lerp(Bc.r, A.r, k); c[i * 3 + 1] = lerp(Bc.g, A.g, k); c[i * 3 + 2] = lerp(Bc.b, A.b, k); } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); g.deleteAttribute('uv'); return g; };
    const flat = (g, col) => shade(g, col, col, 0, 1), part = (g) => { const m = new THREE.Mesh(g, worldMat); m.castShadow = true; return m; };
    const ell = (rx, ry, rz) => new THREE.SphereGeometry(1, 12, 9).scale(rx, ry, rz);
    const mkDeer = () => { const g = new THREE.Group(), coat = 0x86705a, pale = 0xb7a58c, dark = 0x55432f, legs = [];
      g.add(part(shade(lathe([[0.001, -0.6], [0.11, -0.57], [0.2, -0.42], [0.215, -0.15], [0.2, 0.12], [0.205, 0.32], [0.16, 0.48], [0.09, 0.58], [0.001, 0.6]], 0.82, 1.02).translate(0, 0.8, 0), coat, pale, 0.62, 0.84)));      // barrel of the body, deep at the chest
      g.add(part(flat(ell(0.15, 0.17, 0.07).translate(0, 0.84, -0.58), 0xf4f0e6)));                                                                                               // the white rump patch
      const neck = new THREE.Group(); neck.position.set(0, 0.9, 0.47); g.add(neck);
      neck.add(part(shade(new THREE.CylinderGeometry(0.062, 0.115, 0.46, 12).translate(0, 0.21, 0).rotateX(0.62), coat, pale, 0.0, 0.3)));
      const head = new THREE.Group(); head.position.set(0, 0.4, 0.27); neck.add(head);
      head.add(part(shade(lathe([[0.001, -0.1], [0.07, -0.07], [0.082, 0.0], [0.07, 0.08], [0.045, 0.17], [0.036, 0.23], [0.001, 0.25]], 0.9, 1).rotateX(0.32), coat, pale, -0.08, 0.02)));
      head.add(part(flat(ell(0.03, 0.024, 0.026).translate(0, -0.072, 0.232), 0x16110e)));                                                                                         // nose
      for (const sx of [-1, 1]) { head.add(part(flat(ell(0.014, 0.016, 0.014).translate(sx * 0.064, 0.012, 0.055), 0x0c0a09))); const ear = part(shade(ell(0.036, 0.1, 0.014).translate(0, 0.09, 0), dark, 0xd9c9b4, 0.0, 0.14)); ear.position.set(sx * 0.06, 0.05, -0.06); ear.rotation.set(-0.25, sx * 0.5, -sx * 0.55); head.add(ear); }
      g.add(part(flat(ell(0.03, 0.045, 0.03).translate(0, 0.9, -0.62), 0xf4f0e6)));
      for (const [z, front] of [[0.4, 1], [-0.42, 0]]) for (const sx of [-1, 1]) {                                                                                                // legs: thigh or shoulder, cannon bone, hoof
        const up = new THREE.Group(); up.position.set(sx * 0.105, 0.72, z); g.add(up); up.add(part(shade(new THREE.CylinderGeometry(front ? 0.05 : 0.07, 0.03, 0.37, 9).translate(0, -0.185, 0), coat, dark, -0.37, -0.1)));
        const lo = new THREE.Group(); lo.position.y = -0.37; up.add(lo); lo.add(part(flat(new THREE.CylinderGeometry(0.026, 0.02, 0.33, 8).translate(0, -0.165, 0), dark))); lo.add(part(flat(new THREE.BoxGeometry(0.045, 0.05, 0.065).translate(0, -0.34, 0.012), 0x14100d)));
        legs.push({ up, lo, front, sx }); }
      g.userData = { legs, neck, head }; g.scale.setScalar(1.18); g.visible = false; g.rotation.order = 'YXZ'; scene.add(g); return g; };
    [[345, 1], [975, -1]].forEach(([s0, dir]) => { for (let q = 0; q < 2; q++) deer.push({ m: mkDeer(), s: s0 + q * 2.2, dir, lag: q * 0.8, u: 0, on: false, t: 0, r: 0.75 }); });
    { const g = new THREE.Group(), coat = 0x8f7a5e, pale = 0xd9cdb8, ears = [];
      const body = part(shade(lathe([[0.001, -0.22], [0.075, -0.19], [0.105, -0.08], [0.095, 0.06], [0.07, 0.17], [0.001, 0.22]], 0.9, 1).translate(0, 0.19, 0), coat, pale, 0.12, 0.2)); g.add(body);
      for (const sx of [-1, 1]) g.add(part(shade(ell(0.055, 0.085, 0.1).translate(sx * 0.07, 0.17, -0.1), coat, pale, 0.1, 0.19)));                                                 // haunches
      const head = new THREE.Group(); head.position.set(0, 0.29, 0.2); g.add(head); head.add(part(shade(lathe([[0.001, -0.07], [0.055, -0.04], [0.06, 0.01], [0.04, 0.07], [0.001, 0.1]], 0.9, 1), coat, pale, -0.05, 0.0))); head.add(part(flat(ell(0.012, 0.01, 0.01).translate(0, 0.0, 0.1), 0x241a16)));
      for (const sx of [-1, 1]) { head.add(part(flat(ell(0.011, 0.013, 0.011).translate(sx * 0.047, 0.018, 0.03), 0x0c0a09))); const e = new THREE.Group(); e.position.set(sx * 0.028, 0.045, -0.03); e.add(part(shade(ell(0.02, 0.085, 0.012).translate(0, 0.08, 0), 0x1a1512, coat, 0.115, 0.15))); head.add(e); ears.push(e); }
      const fl = new THREE.Group(), hl = new THREE.Group(); fl.position.set(0, 0.13, 0.13); hl.position.set(0, 0.12, -0.13); g.add(fl, hl);
      for (const sx of [-1, 1]) { fl.add(part(flat(new THREE.CylinderGeometry(0.018, 0.014, 0.15, 6).translate(sx * 0.045, -0.07, 0), coat))); hl.add(part(flat(new THREE.CylinderGeometry(0.022, 0.016, 0.13, 6).translate(sx * 0.07, -0.05, 0.02).rotateX(-0.5), coat))); hl.add(part(flat(new THREE.BoxGeometry(0.03, 0.022, 0.17).translate(sx * 0.07, -0.115, 0.07), coat))); }
      g.add(part(flat(ell(0.035, 0.035, 0.03).translate(0, 0.21, -0.22), 0xfaf8f2)));
      hare = g; hare.scale.setScalar(1.5); hare.rotation.order = 'YXZ'; hare.visible = false; hare.userData = { i: 0, off: 0, fl, hl, ears, body }; scene.add(hare); } }
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
  Object.assign(G, { crash: null, trick: 0, inShort: false, treeI: 0, crackOn: false, crackS: CR0, crackHold: 0, floeI: 0, floeS: CR0, dusk: -1, breath: 0 }); for (const t of nearTrees) t.done = false; for (const d of deer) { d.on = false; d.done = false; d.m.visible = false; } for (const f of floes) f.m.visible = false; crackWater.visible = G.crackEdge.visible = G.crackLines.visible = false; hare.visible = false; hare.userData.i = 0; hare.userData.off = 0;
  iceTrail.userData.last = null; iceTrail.userData.k = 0; iceTrail.geometry.attributes.position.array.fill(0); iceTrail.geometry.attributes.position.needsUpdate = true;
  sled.add(dog.root); dog.root.position.set(...SEAT[0]); dog.root.rotation.set(0, 0, 0); sled.add(cat.root); cat.root.position.set(...SEAT[1]); cat.root.rotation.set(0, 0, 0); sled.visible = true;
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
  if (!wet) {                                                // a wipe-out throws up a billowing cloud of snow, with clods flying out of it
    for (let k = 0; k < 46; k++) { const an = Math.random() * 6.28, sp = 1.5 + Math.random() * 4.5; pAlpha.spawn(x + Math.cos(an) * 0.4, y + 0.3 + Math.random() * 0.6, z + Math.sin(an) * 0.4, Math.cos(an) * sp, 0.8 + Math.random() * 2.6, Math.sin(an) * sp - G.v * 0.25, 1.3 + Math.random() * 0.9, 0.7, 2.6 + Math.random() * 1.6, 0.97, 0.98, 1, 0.55, 0.6, 1.6); }
    for (let k = 0; k < 26; k++) pAlpha.spawn(x, y + 0.4, z, (Math.random() - 0.5) * 11, 3 + Math.random() * 6, (Math.random() - 0.5) * 11 - G.v * 0.3, 1.1, 0.22, 0.12, 1, 1, 1, 1, 14, 0.3);
  }
  if (G.lives <= 0) { G.mode = 'over'; G.endT = 0; if (audio.on) audio.night(); }
}
// Both animals are thrown off the sledge, somersault through the air, land in the snow, shake it off and hop back on.
const SEAT = [[0, 0.31, 0.28], [0, 0.32, -0.42]];
function wipeout() {
  if (G.crash) return; G.inv = Math.max(G.inv, 3.4); const v0 = Math.max(G.v, 6), hd = Math.atan(headAt(G.s)); G.crash = { t: 0, a: [] };
  [[dog, 1], [cat, -1]].forEach(([an, sd], i) => { const o = an.root; scene.attach(o); G.crash.a.push({ an, o, i, vx: Math.sin(hd) * v0 * 0.5 + sd * (1.6 + Math.random() * 1.8), vy: 5 + Math.random() * 1.6, vz: -Math.cos(hd) * (v0 * 0.5 + 2 + i), land: -1, yaw: Math.PI - hd, isDog: i === 0 }); });
}
function crashStep(dt) {
  const c = G.crash; c.t += dt; let back = 0;
  for (const q of c.a) { const o = q.o;
    if (q.land < 0) { q.vy -= 19 * dt; o.position.x += q.vx * dt; o.position.y += q.vy * dt; o.position.z += q.vz * dt; o.rotation.set(o.rotation.x + (q.isDog ? 11 : -13) * dt, q.yaw, 0);
      const s = -o.position.z, gy = ground(s, o.position.x - cx(s)); if (o.position.y <= gy && q.vy < 0) { o.position.y = gy; q.land = c.t; q.lx = o.position.x; q.ly = gy; q.lz = o.position.z; o.rotation.set(0, q.yaw, 0); snowPuff(q.lx, gy, q.lz, 26, 5); if (audio.on) audio.land(); }
      q.an.animate(dt, { speed: 0, grounded: false, vy: q.vy }); }
    else { const k = c.t - q.land;
      if (k < 0.85 || G.mode !== 'play') { o.rotation.y = q.yaw + (k > 0.25 ? Math.sin(k * 40) * 0.4 * Math.max(0, 1 - (k - 0.25) / 0.6) : 0); if (k > 0.25 && k < 0.8 && Math.random() < dt * 60) pAlpha.spawn(q.lx + (Math.random() - 0.5) * 0.4, q.ly + 0.3 + Math.random() * 0.3, q.lz, (Math.random() - 0.5) * 3, 0.5 + Math.random() * 1.5, (Math.random() - 0.5) * 3, 0.5, 0.08, 0.3, 1, 1, 1, 0.8, 5, 1); q.an.animate(dt, { speed: 0, grounded: true, vy: 0, sit: 1, happy: 0.3 }); }
      else { const e = Math.min(1, (k - 0.85) / 0.55); sled.localToWorld(tmpV.set(...SEAT[q.i])); o.position.set(lerp(q.lx, tmpV.x, e), lerp(q.ly, tmpV.y, e) + Math.sin(e * Math.PI) * 1.1, lerp(q.lz, tmpV.z, e)); o.rotation.set(0, Math.atan2(tmpV.x - q.lx, tmpV.z - q.lz), 0); q.an.animate(dt, { speed: 6, grounded: false, vy: 3 - e * 6 }); if (e >= 1) back++; } } }
  if (back === 2) { c.a.forEach((q) => { sled.add(q.o); q.o.position.set(...SEAT[q.i]); q.o.rotation.set(0, 0, 0); }); G.crash = null; G.inv = Math.max(G.inv, 0.8); if (audio.on) audio.bark(); }
}
const snowPuff = (x, y, z, n, sp = 3) => { for (let k = 0; k < n; k++) pAlpha.spawn(x + (Math.random() - 0.5) * 0.5, y + 0.1, z + (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * sp, 0.6 + Math.random() * sp * 0.6, (Math.random() - 0.5) * sp, 0.5 + Math.random() * 0.5, 0.14, 0.55, 0.97, 0.98, 1, 0.75, 5, 1.2); };
function gotBone(x, y, z) { G.bones++; G.streak = G.streakT > 0 ? G.streak + 1 : 0; G.streakT = 0.5; if (audio.on) audio.coin(G.streak); for (let k = 0; k < 5; k++) pAdd.spawn(x, y, z, (Math.random() - 0.5) * 3, Math.random() * 3, (Math.random() - 0.5) * 3, 0.45, 0.2, 0.02, 4, 3, 1, 1, 0, 1); }

function stepSled(dt) {
  const prevS = G.s, sl = slopeAt(G.s), h = half(G.s), brake = input.brake;
  // ---- along the run: gravity down the slope, air drag, the brake digs in
  const ck = chuteK(G.s), fk = forkAt(G.s), lane = fk ? uc(fk, G.s) : 0; G.inShort = !!fk && Math.abs(lane) > h - 1 && Math.abs(G.u - lane) < HS + 0.4;
  if (G.crash) { input.x = 0; G.v += (1.6 - G.v) * Math.min(1, dt * 3.5); }
  else if (!G.air) G.v += (26 * sl + 5.5 * ck + (G.inShort ? 2.6 : 0) - 0.0085 * (1 - 0.55 * ck) * G.v * G.v - 0.35 - (brake ? 11 - 5 * ck : 0) - Math.abs(G.uv) * 0.12) * dt;
  if (G.s > S1) G.v -= (1.2 + G.v * 0.3) * dt;                                                        // the sledge runs out on the ice
  G.v = clamp(G.v, G.s > S1 ? 0 : G.crash ? 1 : 2.2, 34 + 9 * ck); G.s += G.v * dt;
  if (ck > 0.2) hint('h_chute'); if (fk && G.s < fk.a + 40) hint('h_fork');
  if (G.inShort) G.u += (uc(fk, G.s) - lane);                                                          // the lane carries the sledge along as it swings away and back
  // ---- sideways: steering, and the bends throw the sledge outwards
  const tricking = G.air && !G.hopped && !G.crash, grip = (G.air ? 0.25 : 1) * (1 - 0.7 * ck); G.uv += (input.x * 26 * grip * (tricking ? 0.3 : 1) - G.uv * 3.4 * grip - curveAt(G.s) * G.v * G.v * 0.5 * grip * (1 - 0.5 * ck)) * dt; G.u += G.uv * dt;
  if (tricking) G.trick += input.x * 9 * dt; else if (!G.air) G.trick *= Math.exp(-dt * 12);
  { const c2 = fk ? uc(fk, G.s) : 0, dM = Math.abs(G.u) - (h - 0.7), dS = fk ? Math.abs(G.u - c2) - (HS - 0.6) : 1e9;
    if (dM > 0 && dS > 0) { const main = dM <= dS, sd = Math.sign(main ? G.u : G.u - c2); G.u = main ? sd * (h - 0.7) : c2 + sd * (HS - 0.6); if (G.uv * sd > 0) { if (G.uv * sd > 3 && ck < 0.3) { G.v *= 0.86; G.shake = Math.max(G.shake, 0.25); if (audio.on) audio.scrape(); } G.uv *= ck > 0.3 ? -0.7 : -0.35; } snowPuff(cx(G.s) + G.u + sd * 0.5, G.y, -G.s, 3, 4); } }
  // ---- up and down: the ground is followed while it holds the sledge; a kicker lets go of it
  const gy = ground(G.s, G.u), wasAir = G.air; G.vy -= 22 * dt; G.y += G.vy * dt;
  if (G.y <= gy) { if (wasAir) { const d = Math.round(G.s - G.airS);
      if (!G.hopped && !G.crash) { const tw = Math.abs(G.trick), n = Math.round(tw / 6.2832), res = Math.abs(tw - n * 6.2832);                 // full turns made, and how far from straight she comes down
        if (tw > 0.7 && res > 1.15) { pick(T('tumble')); G.v *= 0.45; G.shake = 0.6; wipeout(); if (audio.on) audio.yelp(); }
        else if (n > 0) { const b = n * 5 + (res < 0.55 ? 3 : 0); G.bones += b; pick(T(res < 0.55 ? 'clean' : 'spin', n, b)); if (res >= 0.55) G.v *= 0.85; if (audio.on) audio.pickup('mirror'); buzz(40); }
        else if (d >= 8) { const b = Math.floor(d / 4); G.bones += b; pick(T('air', d, b)); }
        G.trick = (G.trick > 0 ? 1 : -1) * (tw - n * 6.2832); } if (G.vy < -5) { G.shake = Math.max(G.shake, 0.35); snowPuff(cx(G.s) + G.u, gy, -G.s, 22, 6); if (audio.on) audio.land(); } G.hopped = false; }
    G.y = gy; G.vy = clamp((gy - (G.gyPrev === undefined ? gy : G.gyPrev)) / Math.max(dt, 1e-4), -30, 14); G.air = false; }
  else if (G.y > gy + 0.07) { if (!G.air) G.airS = G.s; G.air = true; }
  G.gyPrev = gy;
  const X = cx(G.s) + G.u, Z = -G.s;
  // ---- things in the way
  if (G.inv <= 0 && !G.noHit) {
    for (const o of obs) { if (o.s < prevS - 1.2 || o.s > G.s + 1.4) continue; const ds = Math.abs(o.s - G.s);
      if (o.type === 'log') { if (ds < 0.75 && G.y - gy < o.hgt) { hurt('hit', X, G.y, Z); G.v *= 0.3; G.vy = 4; G.y += 0.1; G.air = true; G.hopped = true; G.spin = 0.5; wipeout(); break; } continue; }
      if (ds < o.r * (o.sc || 1) + 0.6 && Math.abs(o.u - G.u) < o.r * (o.sc || 1) + 0.42 && G.y - gy < 1.2) { hurt('hit', X, G.y, Z); G.v *= 0.3; G.uv = (G.u >= o.u ? 1 : -1) * 6; G.spin = 0.5; wipeout(); break; } }
    for (const b of balls) if (Math.abs(b.s - G.s) < b.r + 0.6 && Math.abs(b.u - G.u) < b.r + 0.4 && G.y - gy < 1.6) { hurt('hit', X, G.y, Z); G.v *= 0.3; G.uv = (G.u >= b.u ? 1 : -1) * 7; G.spin = 0.5; wipeout(); break; }
    for (const d of deer) if (d.on && Math.abs(d.s - G.s) < d.r + 0.6 && Math.abs(d.u - G.u) < d.r + 0.5 && G.y - gy < 1.5) { hurt('hit', X, G.y, Z); G.v *= 0.3; G.uv = -d.dir * 6; G.spin = 0.5; wipeout(); break; }
  }
  // ---- snow slides off the branches of the trees she rushes past
  while (G.treeI < nearTrees.length && nearTrees[G.treeI].s < G.s - 1) G.treeI++;
  for (let i = G.treeI; i < nearTrees.length && nearTrees[i].s < G.s + 2.5; i++) { const t = nearTrees[i]; if (t.done || G.v < 9 || Math.abs(t.u - G.u) > 9.5) continue; t.done = true; if (Math.random() > (HQ ? 0.8 : 0.5)) continue;
    for (let k = 0; k < (HQ ? 26 : 14); k++) { const a = Math.random() * 6.28, r = Math.random() * 2.3 * t.sc; pAlpha.spawn(t.x + Math.cos(a) * r, t.y + (4 + Math.random() * 6.5) * t.sc, t.z + Math.sin(a) * r, (Math.random() - 0.5) * 0.8, -0.5 - Math.random(), (Math.random() - 0.5) * 0.8, 1.3 + Math.random() * 0.7, 0.25, 0.9 + Math.random() * 0.6, 0.98, 0.99, 1, 0.75, 6, 0.8); } }
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
  const head = Math.atan(headAt(G.s) + (G.inShort ? (uc(fk, G.s + 1) - uc(fk, G.s - 1)) / 2 : 0) + G.uv / Math.max(G.v, 6)) - G.trick; G.spin = Math.max(0, G.spin - dt * 1.1);
  if (G.crash) crashStep(dt);
  sled.position.set(X, G.y + 0.03, Z); sled.rotation.set(G.air ? clamp(-G.vy / Math.max(G.v, 8), -0.5, 0.6) : Math.atan(sl) + (brake ? -0.05 : 0), Math.PI - head + G.spin * G.spin * 12.56, -G.uv * 0.035 + (G.inv > 0 ? Math.sin(G.t * 30) * 0.05 : 0));
  // ---- off the sledge once it has slid to a stop on the ice
  if (!G.crash && (G.s > ICE0 || (G.s > S1 + 6 && G.v < 0.6))) {
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
  // ---- the ice gives way behind her on the last stretch: keep running
  { const s = -P.z; if (!G.crackOn && s > CR0 + 9) { G.crackOn = true; G.crackS = CR0; G.floeS = CR0; hint('h_crack'); G.shake = 0.5; if (audio.on) { audio.crack(); audio.rumble(0.8); } }
    if (G.crackOn) { if (G.crackHold > 0) G.crackHold -= dt; else G.crackS = Math.min(CR1, G.crackS + (4.6 + Math.max(0, s - G.crackS - 4.5) * 1.6) * dt);
      crackWater.visible = G.crackEdge.visible = G.crackLines.visible = true; crackWater.scale.z = Math.max(0.01, G.crackS - CR0); G.crackEdge.position.z = G.crackLines.position.z = -G.crackS; G.crackEdge.material.map.offset.x = (G.crackS * 0.37) % 1; G.crackEdge.material.alphaMap.offset.x = Math.floor(G.crackS / 1.3) * 0.173; G.crackLines.material.alphaMap.offset.x = Math.floor(G.crackS / 2.2) * 0.31;
      if (G.crackHold <= 0 && Math.random() < dt * 26) { const x = CXI + (Math.random() - 0.5) * (half(G.crackS) * 2 - 2); pAlpha.spawn(x, 0.05, -G.crackS - Math.random() * 1.5, (Math.random() - 0.5) * 1.5, 1.5 + Math.random() * 2.5, -1 - Math.random(), 0.6, 0.1, 0.5, 0.85, 0.93, 1, 0.75, 9, 0.5); } G.wTex.repeat.y = Math.max(0.1, (G.crackS - CR0) / 11); G.wTex.offset.x = G.t * 0.02;
      while (G.floeS < G.crackS) { G.floeS += 0.42; const f = floes[G.floeI++ % floes.length], r = 0.7 + Math.random() * 1.7; f.m.visible = true; f.m.position.set(CXI + (Math.random() - 0.5) * (half(G.floeS) * 2 - 3), 0.03, -G.floeS + Math.random()); f.m.scale.set(r, 1, r * (0.7 + Math.random() * 0.6)); f.m.rotation.y = Math.random() * 6; if (Math.random() < 0.25) { pAlpha.spawn(f.m.position.x, 0.1, f.m.position.z, 0, 2 + Math.random() * 2, 0, 0.6, 0.1, 0.5, 0.8, 0.9, 1, 0.7, 9, 0.5); if (audio.on && Math.random() < 0.5) audio.crack(); } }
      if (s < G.crackS - 0.3 && P.fall <= 0 && G.inv <= 0 && !G.noHit) { dunk({ x: P.x, z: P.z, r: 1.2 }); P.rx = P.x; P.rz = -(Math.min(CR1, G.crackS) + 8); G.crackHold = 2.4; } } }
  // ---- claw marks: faint when she runs, long white scratches when she brakes or skids
  { const U2 = iceTrail.userData, sp2 = Math.hypot(P.vx, P.vz), skid = input.brake || Math.abs(Math.sin(Math.atan2(P.vx, P.vz) - P.face)) > 0.35 || Math.hypot(input.x, input.y) < 0.1;
    if (sp2 > 2.2 && P.y <= 0 && P.fall <= 0 && !onSnow) { U2.acc += sp2 * dt; if (U2.acc > 0.35) { U2.acc = 0; const nx = P.vz / sp2, nz = -P.vx / sp2, w = skid ? 0.035 : 0.012, cur = [-0.13, 0.13].map((o) => [P.x + nx * o, P.z + nz * o]);
      if (U2.last) { const pp = iceTrail.geometry.attributes.position.array; cur.forEach((q, r) => { const l = U2.last[r], o = ((U2.k % U2.N) * 2 + r) * 18; pp.set([l[0] - nx * w, 0.02, l[1] - nz * w, l[0] + nx * w, 0.02, l[1] + nz * w, q[0] - nx * w, 0.02, q[1] - nz * w, l[0] + nx * w, 0.02, l[1] + nz * w, q[0] + nx * w, 0.02, q[1] + nz * w, q[0] - nx * w, 0.02, q[1] - nz * w], o); }); U2.k++; iceTrail.geometry.attributes.position.needsUpdate = true; }
      U2.last = cur; if (skid && Math.random() < 0.5) pAlpha.spawn(P.x, 0.05, P.z, (Math.random() - 0.5) * 1.5, 0.4 + Math.random() * 0.8, (Math.random() - 0.5) * 1.5, 0.4, 0.05, 0.25, 0.95, 0.98, 1, 0.7, 3, 1.5); } }
    else U2.last = null; }
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
  else if (G.mode === 'over') { G.endT += dt; if (G.crash) crashStep(dt); if (G.endT > 2.2 && $('end').classList.contains('hidden')) finish(false); }
  if (G.phase === 'sled') { if (!G.crash) { dog.animate(dt, { speed: 0, grounded: true, vy: 0, sit: 1, happy: 0.7, pant: true }); cat.animate(dt, { speed: 0, grounded: true, vy: 0, sit: 1, crouch: G.v > 20 ? 1 : 0 }); } dog.root.visible = cat.root.visible = true; sled.visible = G.inv <= 0 || !!G.crash || Math.floor(G.t * 14) % 2 === 0; }
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
  // deer bound across the run when the sledge comes near; a hare lopes along the edge ahead of it
  for (const d of deer) { const h = half(d.s);
    if (!d.on && !d.done && play && G.phase === 'sled' && d.s - G.s < 60 + d.lag * 12 && d.s > G.s) { d.on = true; d.u = -d.dir * (h + 11); d.t = 0; d.m.visible = true; hint('h_deer'); }
    if (d.on) { d.t += dt; d.u += d.dir * 9.5 * dt; const hopP = d.t * 7.5 + d.lag * 3, x = cx(d.s) + d.u; d.m.position.set(x, ground(d.s, d.u) + Math.abs(Math.sin(hopP)) * 0.55, -d.s); d.m.rotation.set(Math.cos(hopP * 2) * 0.17, d.dir * Math.PI / 2 - headAt(d.s), 0); { const th = hopP * 2, L = d.m.userData; for (const q of L.legs) { const w = q.front ? Math.cos(th - 0.5) : -Math.cos(th + 0.3); q.up.rotation.x = (q.front ? -0.25 : 0.2) + w * 0.85 + q.sx * 0.07; q.lo.rotation.x = q.front ? 0.2 + Math.max(0, w) * 1.3 : -0.35 - Math.max(0, -w) * 1.1; } L.neck.rotation.x = -0.1 - Math.cos(th) * 0.12; L.head.rotation.x = 0.12 + Math.cos(th) * 0.1; } if (Math.abs(Math.sin(hopP)) < 0.12 && Math.random() < 0.5) snowPuff(x, ground(d.s, d.u), -d.s, 2, 2); if (d.u * d.dir > h + 14) { d.on = false; d.done = true; d.m.visible = false; } } }
  { const HR = [[110, 300, -1], [800, 990, 1]], hu = hare.userData, r = HR[hu.i]; hare.visible = false;
    if (r && G.phase === 'sled' && play) { const hs = Math.max(r[0], G.s + 15); if (G.s > r[0] - 25) { if (hs > r[1]) hu.off += dt * 7; const u = r[2] * (half(hs) - 1.7 + hu.off), hp = G.t * 10; hare.visible = true; hare.position.set(cx(hs) + u, ground(hs, u) + Math.abs(Math.sin(hp)) * 0.42, -hs); { const w = Math.cos(hp * 2), H = hare.userData; H.fl.rotation.x = -0.3 - w * 0.9; H.hl.rotation.x = 0.2 + w * 1.0; H.body.scale.z = 1 + Math.abs(Math.sin(hp)) * 0.22; for (const e of H.ears) e.rotation.x = -0.35 - Math.abs(Math.sin(hp)) * 0.75; }
      hare.rotation.set(-Math.cos(hp * 2) * 0.3, Math.PI - Math.atan(headAt(hs)) + (hu.off > 0 ? -r[2] * 1.0 : 0), 0); if (hu.off > 12) { hu.i++; hu.off = 0; } } } }
  // warm breath in the cold air
  if (HQ && (play || win || title)) { G.breath -= dt; if (G.breath <= 0) { G.breath = 0.85 + Math.random() * 0.5; for (const [an, f] of [[dog, 0.26], [cat, 0.17]]) { if (!an.root.visible) continue; an.head.getWorldPosition(tmpV); const q = an.root.getWorldQuaternion(new THREE.Quaternion()), fw = new THREE.Vector3(0, 0, 1).applyQuaternion(q); for (let k = 0; k < 3; k++) pAlpha.spawn(tmpV.x + fw.x * f, tmpV.y - 0.02, tmpV.z + fw.z * f, fw.x * 0.5 + (Math.random() - 0.5) * 0.2, 0.25 + Math.random() * 0.2, fw.z * 0.5 - (G.phase === 'sled' && play ? G.v * 0.5 : 0), 0.8, 0.06, 0.38, 1, 1, 1, 0.3, -0.2, 1.2); } } }
  // the afternoon turns to dusk while they cross the ice: low red sun, blue shadows, the fire and the windows take over
  { const dk = G.phase === 'ice' ? sm(ICE0 + 30, S2 - 25, -P.z) : 0; if (Math.abs(dk - G.dusk) > 0.004) { G.dusk = dk;
      SUN.set(0.5, lerp(0.36, 0.045, dk), -0.62).normalize(); G.sky.material.uniforms.sunPosition.value.copy(SUN);
      sun.color.setRGB(1, lerp(0.9, 0.5, dk), lerp(0.77, 0.3, dk)); sun.intensity = lerp(2.6, 0.75, dk); hemi.intensity = lerp(0.55, 0.3, dk); hemi.color.setRGB(lerp(0.77, 0.42, dk), lerp(0.86, 0.47, dk), lerp(1, 0.8, dk));
      scene.environmentIntensity = lerp(0.55, 0.2, dk); scene.fog.color.setRGB(lerp(0.81, 0.4, dk), lerp(0.86, 0.38, dk), lerp(0.93, 0.5, dk)); fogUniforms.uFogColor.value.copy(scene.fog.color);
      G.winMat.color.setRGB(0.25 + 5.5 * dk, 0.18 + 3.4 * dk, 0.08 + 1.1 * dk); G.houseLight.intensity = 40 * dk; fireLight.distance = lerp(22, 40, dk); } }
  if (G.crackOn) for (const f of floes) if (f.m.visible) { f.m.position.y = 0.035 + Math.sin(G.t * 1.8 + f.ph) * 0.03; f.m.rotation.x = Math.sin(G.t * 1.3 + f.ph * 2) * 0.07; f.m.rotation.z = Math.cos(G.t * 1.1 + f.ph) * 0.07; }      // the floes rock on the water
  for (const f of fire.userData.flames) { const q = 0.75 + Math.random() * 0.5; f.scale.set(q, 0.7 + Math.random() * 0.7, q); } fireLight.intensity = (22 + Math.random() * 9) * (1 + 2.2 * Math.max(0, G.dusk));
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
  else if (G.phase === 'sled') { px = cx(G.s) + G.u; py = G.y; pz = -G.s; const hd = Math.atan(headAt(G.s)), back = 5.4 + tall * 3 + G.v * 0.07, cs = G.s - back * Math.cos(hd), cu = G.u * (G.inShort ? 1 : 0.75), cxw = cx(cs) + cu;
    tmpV.set(cxw, Math.max(py + 2.1 + tall, ground(cs, cu) + 1.5), -cs); camera.position.lerp(tmpV, Math.min(1, dt * 7)); camera.position.x += (Math.random() - 0.5) * sh; camera.position.y += (Math.random() - 0.5) * sh;
    const ls = G.s + 9, lu = G.inShort ? uc(forkAt(G.s) || FORKS[0], ls) + (G.u - uc(forkAt(G.s) || FORKS[0], G.s)) : G.u * 0.6; camera.lookAt(cx(ls) + lu, trackY(ls) + (G.inShort ? ground(G.s, G.u) - trackY(G.s) : 0) + 1.1, -ls); camera.rotateZ(-G.uv * 0.012); }
  else { px = P.x; py = 0; pz = P.z; const ck2 = G.crackOn && -P.z < CR1 + 6 ? 1 : 0; G.camK = (G.camK || 0) + (ck2 - (G.camK || 0)) * Math.min(1, dt * 2); const q = G.camK;      // over the breaking ice the camera rises and drops back, so the water closing in behind stays in sight
    camera.position.lerp(tmpV.set(lerp(P.x, CXI, 0.25), 5.2 + tall * 2 + q * 3.2, P.z + 8.2 + tall * 2.5 + q * 5.5), Math.min(1, dt * 5)); camera.position.x += (Math.random() - 0.5) * (sh + q * 0.05); camera.lookAt(lerp(P.x, CXI, 0.15), 0.4, P.z - 6 + q * 3.5); }
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
  const want = -P.z > CR0 - 6 ? 10 : 6.5, wx = clamp(dx, -1.4, 1.4) * 4, wz = dz * want; input.x = clamp((wx - P.vx) * 0.5, -1, 1); input.y = clamp(-(wz - P.vz) * 0.5, -1, 1); input.brake = false;
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
  dog = buildDog(tex, {}); cat = buildCat({ scale: 1.15 }); if (HQ) { addFur(dog.root, DOG_FUR); addFur(cat.root, CAT_FUR); const seen = new Set(); for (const an of [dog, cat]) an.root.traverse((o) => { const m = o.material; if (m && m.userData && m.userData.key === 'fur' && !seen.has(m)) { seen.add(m); m.color.lerp(new THREE.Color(0xffffff), 0.25); m.emissive = new THREE.Color(0x9fb8d8); m.emissiveIntensity = 0.16; } }); }   // a touch of frost on the fur
  for (let i = 0; i < 4; i++) { const d = buildDog(tex, { scale: 0.43, head: 1.3, leg: 0.8, ear: 1.15, snout: 0.72 }); scene.add(d.root); puppies.push({ d, x: 0, z: 0 }); }
  pAdd = new Particles(500, true); pAlpha = new Particles(900, false); scene.add(pAdd.mesh, pAlpha.mesh);
  $('rCat').textContent = '🔥'; $('rCat').style.left = '100%';
  reset(); G.mode = 'title'; applyLang();
  $('start').addEventListener('click', startGame);
  $('lang').addEventListener('click', () => { lang = lang === 'pl' ? 'en' : 'pl'; applyLang(); });
  $('again').addEventListener('click', () => { const bt = G.bot; toTitle(); G.bot = bt; startGame(); });
  $('menu').addEventListener('click', toTitle);
  step(0.016); renderer.compile(scene, camera); draw();
  window.__sled = { G, P, Mi, obs, rows, items, balls, haz, skaters, deer, nearTrees, FORKS, CHUTE, CR0, uc, wipeout, input, audio, step, startGame, reset, toTitle, hop, renderer, scene, camera, cx, half, ground, S1, S2, ICE0, CXI,
    sim: (secs, dt = 1 / 60) => { for (let t = 0; t < secs; t += dt) step(dt); draw(); return { mode: G.mode, phase: G.phase, s: +prog().toFixed(0), u: +G.u.toFixed(1), v: +G.v.toFixed(1), lives: G.lives, bones: G.bones, time: +G.time.toFixed(0) }; } };
  $('title').classList.remove('hidden'); $('loading').style.opacity = 0; setTimeout(() => $('loading').remove(), 1100);
  last = performance.now(); requestAnimationFrame(frame);
}
boot().catch((e) => { console.error(e); $('loading').textContent = 'Błąd: ' + e.message; });
