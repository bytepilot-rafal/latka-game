// Level 6 – "Zima nad Narwią": Łatka and Mila ride Staś's sledge down the long hill, then cross the frozen river on
// their paws to the bonfire. Two kinds of play in one run:
//   the hill – every point is (s, u): distance down the run and offset from its middle; x = cx(s) + u, z = -s. Gravity
//              pulls the sledge, the player steers, brakes and hops; kickers throw it into the air.
//   the ice  – free movement with almost no grip: Łatka keeps sliding, so turns and stops have to be planned.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
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
    h_start: 'Sanki same nabierają prędkości. Skręcaj, a przed zakrętem przyhamuj.', h_log: 'Kłoda w poprzek — podskocz!', h_ramp: 'Skocznia! W locie: ← → obrót, ↑ ↓ salto. Wyląduj prosto — seria udanych skoków mnoży punkty stylu.', h_aval: 'LAWINA! Nie hamuj — uciekaj!', h_bridge: 'Kładka nad strumieniem — trzymaj się środka.', h_fight: 'Bitwa na śnieżki! Omijaj kule — trafienie zasypuje ekran.', h_fork: 'Rozwidlenie! Szeroka droga jest łatwa, wąski skrót przez las — szybszy i pełen kości.', h_jump: 'W prawo zjazd na WIELKĄ SKOCZNIĘ! Nie hamuj na rozbiegu, a w locie kręć obroty i salta.', signJ: 'SKOCZNIA', h_chute: 'Lodowa rynna! Sanki pędzą i prawie nie skręcają.', h_deer: 'Sarny przebiegają przez trasę — przyhamuj!', h_crack: 'Lód pęka za Łatką! Biegnij i nie zatrzymuj się!',
    h_ball: 'Uwaga, toczy się śnieżna kula!', h_ice: 'Lód! Łatka ślizga się dalej, nawet gdy puścisz ster.', h_hole: 'Omijaj przeręble.', h_thin: 'Ciemny lód jest cienki — przebiegnij szybko albo omiń.',
    h_snow: 'Na śniegu łapy trzymają — tam najłatwiej wyhamować.', h_skater: 'Uwaga na łyżwiarzy!',
    hit: 'Bęc! Sanki w zaspie!', splash: 'Chlup! Lodowata kąpiel!', bump: 'Ups!', air: (m, b) => `Lot ${m} m! +${b}`, spin: (n, b) => `Obrót ×${n}! +${b}`, clean: (n, b) => `Obrót ×${n} i czyste lądowanie! +${b}`, tumble: 'Krzywe lądowanie — fikołek!', t_spin: (n) => `obrót ×${n}`, t_flip: (n) => `salto ×${n}`, t_clean: 'czysto', t_air: (m) => `lot ${m} m`, style: (p, c) => `Styl: ${p}${c > 1 ? ' ×' + c : ''}`, styleEnd: (p) => ` Styl: ${p}.`, buried: 'Lawina was dogoniła!', aval: (m) => `Lawina: ${m} m`, splat: 'Pac! Śnieżka!', sign: 'SKRÓT', crackle: 'Lód trzeszczy!', off: 'Dalej na łapach!',
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
    h_start: 'The sledge picks up speed by itself. Steer, and brake before the bends.', h_log: 'A log across the run — hop!', h_ramp: 'A kicker! In the air: ← → spin, ↑ ↓ flip. Land straight — a run of clean jumps multiplies the style points.', h_aval: 'AVALANCHE! Do not brake — run!', h_bridge: 'A footbridge over the stream — keep to the middle.', h_fight: 'Snowball fight! Dodge them — a hit snows up the screen.', h_fork: 'A fork! The wide way is easy, the narrow shortcut through the trees is faster and full of bones.', h_jump: 'To the right: the BIG JUMP! Do not brake on the run-up, and spin and flip in the air.', signJ: 'SKOCZNIA', h_chute: 'The ice chute! The sledge flies and hardly steers.', h_deer: 'Deer are crossing the run — brake!', h_crack: 'The ice is breaking behind Łatka! Run and do not stop!',
    h_ball: 'Look out, a snowball is rolling!', h_ice: 'Ice! Łatka keeps sliding even when you let go.', h_hole: 'Keep away from the ice holes.', h_thin: 'Dark ice is thin — cross it fast or go round.',
    h_snow: 'Paws grip on snow — the easiest place to stop.', h_skater: 'Mind the skaters!',
    hit: 'Bump! Into the snowdrift!', splash: 'Splash! An icy bath!', bump: 'Oops!', air: (m, b) => `${m} m of air! +${b}`, spin: (n, b) => `Spin ×${n}! +${b}`, clean: (n, b) => `Spin ×${n} and a clean landing! +${b}`, tumble: 'Crooked landing — tumble!', t_spin: (n) => `spin ×${n}`, t_flip: (n) => `flip ×${n}`, t_clean: 'clean', t_air: (m) => `${m} m air`, style: (p, c) => `Style: ${p}${c > 1 ? ' ×' + c : ''}`, styleEnd: (p) => ` Style: ${p}.`, buried: 'The avalanche caught you!', aval: (m) => `Avalanche: ${m} m`, splat: 'Splat! A snowball!', sign: 'SKRÓT', crackle: 'The ice is cracking!', off: 'On paws from here!',
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
const JUMP = 1078, JLEN = 52, JH = 10.5;                                                              // the lip of the big jump, the length of its curved take-off, its height
const laneClear = (s, u, w) => { const f = forkAt(s); return !f || Math.abs(u - uc(f, s)) > (f === FORKS[1] && s > JUMP - 70 && s < JUMP + 95 ? w + 9 : w + laneW(f, s) - HS); };      // room for a tree here? (the jump needs a wide corridor)
const forkAt = (s) => (s > FORKS[0].a && s < FORKS[0].b ? FORKS[0] : s > FORKS[1].a && s < FORKS[1].b ? FORKS[1] : null);
const uc = (f, s) => f.off * sm(f.a, f.a + 62, s) * (1 - sm(f.b - 50, f.b, s));
const laneW = (f, s) => HS + 4.2 * Math.max(1 - sm(f.a + 26, f.a + 66, s), sm(f.b - 54, f.b - 22, s));      // half-width of a side lane: a broad funnel where it leaves the run and where it comes back                    // middle of the shortcut: it leaves the run, keeps apart, comes back
const chuteK = (s) => sm(CHUTE[0], CHUTE[0] + 25, s) * (1 - sm(CHUTE[1] - 25, CHUTE[1], s));
const AV0 = 720, AV1 = 985, TUN = [452, 498], BR = 875;                                           // the avalanche stretch; the snow tunnel; the footbridge
const bridgeK = (s) => sm(BR - 27, BR - 13, s) * (1 - sm(BR + 13, BR + 27, s)), gul = (s) => 3.6 * sm(BR - 17, BR - 9, s) * (1 - sm(BR + 9, BR + 17, s));   // the run narrows on to the bridge; the stream gully under it
const half = (s) => lerp(lerp(lerp(7.6 + 1.4 * Math.sin(s * 0.011 + 2), 2.8, chuteK(s)), 2.5, bridgeK(s)), IW, sm(S1 - 10, S1 + 70, s));
const trackY = (s) => { const f = clamp((S1 - s) / S1, 0, 1.06), a = 0.1, g = f < a ? f * f / (2 * a) : f - a / 2, k = sm(0, 0.15, f); return DROP * g + (4 * Math.sin(s * 0.019) + 1.6 * Math.sin(s * 0.043 + 1)) * k; };
const RAMPS = [];                                                          // kickers: { s, u, w }
function ground(s, u) {
  const a = Math.abs(u), h = half(s), k = sm(S1 - 30, S1 + 5, s), f = forkAt(s); let d = a - h, m = Math.min(a, h), dip = 0;
  if (f) { const c = uc(f, s), LW = laneW(f, s), ds = Math.abs(u - c) - LW; if (ds < d) { d = ds; m = Math.min(Math.abs(u - c), LW); } dip = 2.4 * Math.sin(Math.PI * clamp((s - f.a - 40) / (f.b - f.a - 80), 0, 1)) * sm(3, -0.5, ds) * sm(HS + 4, HS + 9, Math.abs(c)); }   // the shortcut dives into a gully
  let y = trackY(s) + (0.014 + 0.2 * chuteK(s)) * m * m * (1 - k) + sm(0, 5, d) * (1.9 - 0.4 * k) - dip;
  if (f === FORKS[1] && s > JUMP - JLEN && s <= JUMP) { const t = (s - (JUMP - JLEN)) / JLEN; y += JH * t * t * sm(HS + 2.2, HS - 0.4, Math.abs(u - uc(f, s))); }      // the take-off sweeps up to a lip, and the ground simply ends there
  if (d > 2) y += sm(2, 70, d) * (fbm((cx(s) + u) * 0.018, s * 0.018, 3, 7) * 24 - 5);
  if (d > 0.4 && Math.abs(s - BR) < 18) y -= gul(s) * sm(0.4, 1.2, d);
  y += sm(S2 + 1, S2 + 18, s) * 1.8;
  for (const r of RAMPS) { const d = s - r.s; if (d > -11 && d < 1.3) { const side = sm(r.w, r.w - 1.3, Math.abs(u - r.u)); if (side > 0) y += 1.95 * side * (d <= 0 ? sm(-11, 0, d) : 1 - d / 1.3); } }
  return y;
}
const slopeAt = (s) => -(trackY(s + 1) - trackY(s - 1)) / 2, headAt = (s) => (cx(s + 1) - cx(s - 1)) / 2, curveAt = (s) => (cx(s + 3) - 2 * cx(s) + cx(s - 3)) / 9;

const G = { mode: 'load', phase: 'sled', t: 0, time: 0, s: 0, u: 0, uv: 0, v: 0, y: 0, vy: 0, air: false, airS: 0, lives: 3, bones: 0, inv: 0, shake: 0, spin: 0, endT: 0, hints: new Set(), bot: false, places: 0, streak: 0, streakT: 0 };
const P = { x: 0, z: 0, vx: 0, vz: 0, face: Math.PI, fall: 0 }, Mi = { x: 0, z: 0, vx: 0, vz: 0, spin: 0 };
const keys = {}, touch = { x: 0, y: 0, brake: false }, input = { x: 0, y: 0, brake: false };
const audio = new AudioSys();
let dog, cat, tex, pAdd, pAlpha, sun, hemi, RU, sled, boneMesh, flakes, flakeU, trail, fire, fireLight;
const obs = [], rows = [], items = [], balls = [], haz = [], skaters = [], people = [], puppies = [], nearTrees = [], deer = [], floes = [], kids = [], shots = [];
let hare, iceTrail, crackWater; const birds = [];
const dummy = new THREE.Object3D(), tmpV = new THREE.Vector3(), tmpC = new THREE.Color();
const SUN = new THREE.Vector3(0.5, 0.36, -0.62).normalize();
const snowMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86 });

// ------------------------------------------------------------------ scenery
const paintGeo = (g, fn) => { const P2 = g.attributes.position, c = new Float32Array(P2.count * 3); for (let i = 0; i < P2.count; i++) { const q = fn(P2.getX(i), P2.getY(i), P2.getZ(i)); c[i * 3] = q[0]; c[i * 3 + 1] = q[1]; c[i * 3 + 2] = q[2]; } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); g.deleteAttribute('uv'); return g; };
// A spruce: whorls of drooping branches with ragged tips, each one carrying snow on its upper part while the tips stay dark green.
function spruceGeo(seed, tiers, r0, H, seg = 10) {
  const R = rng(seed), parts = [paintGeo(new THREE.CylinderGeometry(0.1 * r0 / 3, 0.3 * r0 / 3, H * 0.34, 6, 1, true).translate(0, H * 0.17, 0), () => [0.2, 0.14, 0.1])];
  for (let k = 0; k < tiers; k++) { const t = k / (tiers - 1), r = r0 * (1 - 0.82 * t) * (0.88 + R() * 0.24), th = H * 0.27 * (1 - 0.4 * t), y0 = H * 0.13 + (H * 0.87 - th) * Math.pow(t, 0.92), g = new THREE.ConeGeometry(r, th, seg, 2, true), P2 = g.attributes.position, sd = seed * 7 + k * 3.7, tw = R() * 6.28;
    for (let i = 0; i < P2.count; i++) { const x = P2.getX(i), y = P2.getY(i), z = P2.getZ(i), f = (y + th / 2) / th, an = Math.atan2(z, x) + tw, n = fbm(Math.cos(an) * 2.1 + sd, Math.sin(an) * 2.1 + k, 2, 5), jag = 1 + (1 - f) * ((n - 0.5) * 1.1 + 0.18 * Math.sin(an * 7 + sd));
      P2.setXYZ(i, x * jag, y - (1 - f) * (1 - f) * r * (0.16 + n * 0.3), z * jag); }
    g.computeVertexNormals(); g.translate(0, y0 + th / 2, 0);
    parts.push(paintGeo(g, (x, y, z) => { const f = (y - y0) / th, an = Math.atan2(z, x) + tw, n = fbm(Math.cos(an) * 3.3 + sd, Math.sin(an) * 3.3 + f * 4, 2, 9), snow = sm(0.16, 0.5, f + (n - 0.5) * 0.75), gr = 0.55 + f * 0.5 + (n - 0.5) * 0.3; return [lerp(0.07 * gr, 0.95, snow), lerp(0.235 * gr, 0.97, snow), lerp(0.115 * gr, 1.0, snow)]; })); }
  return mergeGeometries(parts);
}
// A bare birch: a pale trunk with dark scars, a few rising boughs, thin twigs.
function birchGeo(seed) {
  const R = rng(seed), H = 7.5 + R() * 2, parts = [], bend = (R() - 0.5) * 0.5, tr = new THREE.CylinderGeometry(0.05, 0.16, H, 7, 10, true).translate(0, H / 2, 0), P2 = tr.attributes.position;
  for (let i = 0; i < P2.count; i++) { const y = P2.getY(i); P2.setX(i, P2.getX(i) + bend * (y / H) ** 2 * 1.4); } tr.computeVertexNormals();
  parts.push(paintGeo(tr, (x, y, z) => { const n = fbm(y * 2.6 + seed, Math.atan2(z, x) * 1.5, 2, 3), dk = n > 0.63 || y < 0.5 ? 1 : 0, b = dk ? 0.16 : 0.84 + (n - 0.5) * 0.2; return [b, b * 0.985, b * 0.95]; }));
  const limb = (x, y, z, az, tilt, len, r) => { const g = new THREE.CylinderGeometry(r * 0.35, r, len, 5, 1, true).translate(0, len / 2, 0); g.rotateZ(-tilt); g.rotateY(az); g.translate(x, y, z); parts.push(paintGeo(g, (px, py) => { const b = 0.17 + (py - y) * 0.012; return [b * 1.15, b, b * 0.92]; })); return [x + Math.sin(tilt) * Math.cos(az) * len * 0.62, y + Math.cos(tilt) * len * 0.62, z - Math.sin(tilt) * Math.sin(az) * len * 0.62]; };
  for (let i = 0; i < 9; i++) { const y = H * (0.36 + i * 0.065), az = i * 2.4 + R() * 0.8, len = 1.5 + R() * 1.6 - i * 0.07, q = limb(bend * (y / H) ** 2 * 1.4, y, 0, az, 0.6 + R() * 0.35, len, 0.045); for (let j = 0; j < 2; j++) limb(q[0], q[1], q[2], az + (j ? 0.9 : -0.8) + R() * 0.4, 0.55 + R() * 0.5, 0.8 + R() * 0.7, 0.016); }
  limb(bend * 1.1, H * 0.93, 0, R() * 6, 0.12, 1.3, 0.035);
  return mergeGeometries(parts);
}
function buildWorld() {
  RU = makeUniforms(); patchMat(worldMat, RU, { cloud: 0.25 }); patchMat(snowMat, RU, { grain: HQ ? 0.2 : 0.1, cloud: 0.3, gs: 0.5 });
  G.sky = daySky(renderer, scene, SUN, { gain: 0.42, size: 900, turbidity: 4.5, rayleigh: 1.6 }); scene.environmentIntensity = 0.55;
  // thin winter cloud drifting overhead, lit from the sun's side and warmed by it at dusk
  G.cloudU = { uSunDir: { value: SUN }, uLit: { value: new THREE.Color(1.0, 0.99, 0.97) }, uShade: { value: new THREE.Color(0.6, 0.68, 0.8) }, uTime: { value: 0 } };
  G.clouds = new THREE.Mesh(new THREE.SphereGeometry(820, 32, 16), new THREE.ShaderMaterial({ uniforms: G.cloudU, side: THREE.BackSide, depthWrite: false, fog: false, transparent: true,
    vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uSunDir, uLit, uShade; uniform float uTime; varying vec3 vDir;
      float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
      float fb(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vn(p); p = p * 2.03 + 7.1; a *= 0.5; } return s / 0.97; }
      void main(){ vec3 d = normalize(vDir); if (d.y < 0.005) discard; vec2 q = d.xz / (d.y + 0.14) * 0.62 + vec2(uTime * 0.006, uTime * 0.002);
        float n = fb(q) * 0.62 + fb(q * 2.7 + 3.0) * 0.38, cov = smoothstep(0.5, 0.78, n), lit = clamp((n - fb(q + normalize(uSunDir.xz) * 0.2)) * 3.0 + 0.55, 0.0, 1.0), sd = pow(max(dot(d, uSunDir), 0.0), 5.0);
        vec3 c = mix(uShade, uLit, lit) + uLit * sd * 0.35; gl_FragColor = vec4(c, cov * 0.88 * smoothstep(0.005, 0.16, d.y));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` }));
  G.clouds.frustumCulled = false; G.clouds.renderOrder = -10; scene.add(G.clouds);
  // sunlit snow glitters: tiny crystals flash as the view moves over them
  { const prev = snowMat.onBeforeCompile; snowMat.onBeforeCompile = (sh) => { prev(sh); sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      { vec2 gp = vWp.xz * ${HQ ? '34.0' : '22.0'}; vec2 gc = floor(gp); float gh = fract(sin(dot(gc, vec2(127.1, 311.7))) * 43758.5453), gd = length(vViewPosition);
        float tw = fract(gh * 37.0 + dot(normalize(vViewPosition).xy, vec2(3.1, 2.3)) * 2.5 + vWp.y * 0.6); float gl = step(0.986, gh) * smoothstep(0.75, 1.0, tw) * smoothstep(0.42, 0.1, length(fract(gp) - 0.5)) * (1.0 - smoothstep(14.0, 46.0, gd));
        totalEmissiveRadiance += vec3(1.0, 0.98, 0.94) * gl * ${HQ ? '3.2' : '1.6'} * uGlint; }`).replace('#include <common>', '#include <common>\nuniform float uGlint;'); sh.uniforms.uGlint = G.glintU; }; G.glintU = { value: 1 }; snowMat.customProgramCacheKey = () => 'snowglint'; }
  sun = new THREE.DirectionalLight(0xffe6c4, 2.6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = -30; sc.right = 30; sc.top = 34; sc.bottom = -26; sc.near = 1; sc.far = 190; sun.shadow.bias = -0.0007; sun.shadow.normalBias = 0.07; scene.add(sun, sun.target);
  hemi = new THREE.HemisphereLight(0xc4dcff, 0xb8c6dc, 0.55); scene.add(hemi);
  scene.fog = new THREE.FogExp2(0xcfdcec, 0.0042); fogUniforms.uFogColor.value.copy(scene.fog.color); fogUniforms.uFogDensity.value = 0.0042;
  const R = rng(61);
  // kickers first: the ground depends on them
  for (let s = 190; s < S1 - 150; s += 165 + R() * 40) if ((s < CHUTE[0] - 40 || s > CHUTE[1] + 20) && (s < TUN[0] - 14 || s > TUN[1] + 6) && Math.abs(s - BR) > 42 && (s < FORKS[1].a - 10 || s > FORKS[1].b + 10)) RAMPS.push({ s, u: (R() - 0.5) * 5, w: 3.3 });
  // ---- the snow: one sheet that follows the run, fine in the middle and coarse far out
  const US = []; for (const a of [150, 112, 84, 62, 46, 35, 28, 24.5, 22, 20, 18.2, 16.5, 14.8, 13.2, 11.6, 10.2, 8.9, 7.6, 6.4, 5.2, 3.9, 2.6, 1.3]) US.push(-a); US.push(0); for (let i = US.length - 2; i >= 0; i--) US.push(-US[i]);
  const DS = 1.5, s0 = -60, NR = Math.ceil((S2 + 120 - s0) / DS), NC = US.length, pos = new Float32Array((NR + 1) * NC * 3), col = new Float32Array((NR + 1) * NC * 3), ix = [];
  for (let i = 0; i <= NR; i++) { const s = s0 + i * DS, c = cx(s), h = half(s), ice = s > S1 - 2 && s < S2 + 3;
    for (let j = 0; j < NC; j++) { const u = US[j] * (s > S1 ? lerp(1, 1.5, sm(S1, S1 + 60, s)) : 1), a = Math.abs(u), q = (i * NC + j) * 3; const lump = (fbm((c + u) * 0.11, s * 0.11, 3, 41) - 0.5) * 0.6 * sm(h + 1.5, h + 9, a) * (forkAt(s) && Math.abs(u - uc(forkAt(s), s)) < HS + 4 ? 0 : 1); let y = ground(s, u) + lump; if (ice && a < h - 0.2) y -= 0.7; if (a <= h + 0.45) y -= gul(s);
      pos[q] = c + u; pos[q + 1] = y; pos[q + 2] = -s;
      const fk = forkAt(s), inS = fk ? 1 - sm(laneW(fk, s) - 1, laneW(fk, s) + 1, Math.abs(u - uc(fk, s))) : 0, n = fbm((c + u) * 0.09, s * 0.09, 3, 3), packed = Math.max(1 - sm(h - 1.5, h + 1, a), inS) * (1 - sm(S1 - 20, S1 + 10, s)), b = 0.9 + n * 0.1 - packed * 0.07;
      const strm = Math.abs(s - BR) < 3.2 ? 1 : 0, hol = clamp(-lump * 0.16, 0, 0.07); col[q] = b * (0.955 - packed * 0.03 - strm * 0.3 - hol); col[q + 1] = b * (0.975 - strm * 0.14); col[q + 2] = b * 1.02; } }
  for (let i = 0; i < NR; i++) for (let j = 0; j < NC - 1; j++) { const a = i * NC + j, b = a + 1, c = a + NC, d = c + 1; ix.push(a, b, c, b, d, c); }
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); tg.setAttribute('color', new THREE.BufferAttribute(col, 3)); tg.setIndex(ix); tg.computeVertexNormals();
  const terrain = new THREE.Mesh(tg, snowMat); terrain.receiveShadow = true; terrain.frustumCulled = false; scene.add(terrain);
  // ---- the frozen river
  const iceTex = canvasTex(1024, 1024, (c, w, h) => { const r = rng(9); c.fillStyle = '#93b6cf'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { const q = 30 + r() * 110, x = q + r() * (w - 2 * q), y = q + r() * (h - 2 * q), g2 = c.createRadialGradient(x, y, 0, x, y, q); g2.addColorStop(0, `rgba(255,255,255,${0.1 + r() * 0.2})`); g2.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g2; c.fillRect(x - q, y - q, q * 2, q * 2); }   // dustings of snow
    c.lineCap = 'round'; for (let i = 0; i < 46; i++) { let x = r() * w, y = r() * h, a = r() * 6.28; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 9; k++) { a += (r() - 0.5) * 1.1; x += Math.cos(a) * (14 + r() * 26); y += Math.sin(a) * (14 + r() * 26); c.lineTo(x, y); } c.strokeStyle = `rgba(240,250,255,${0.25 + r() * 0.35})`; c.lineWidth = 0.8 + r() * 1.6; c.stroke(); }   // cracks
    for (let i = 0; i < 60; i++) { c.beginPath(); c.arc(r() * w, r() * h, 60 + r() * 220, r() * 6.28, r() * 6.28 + 0.5 + r()); c.strokeStyle = `rgba(255,255,255,${0.08 + r() * 0.12})`; c.lineWidth = 1; c.stroke(); } }, 4, 30);                   // skate marks
  const IW2 = IW * 3.2, IL = S2 - S1 + 30, IS0 = S1 - 12, UVMAP = `vMapUv = vec2((wpI.x - ${(CXI - IW2 / 2).toFixed(2)}) / ${IW2.toFixed(2)} * 4.0, (-wpI.z - ${IS0.toFixed(1)}) / ${IL.toFixed(1)} * 30.0);`;      // the ice texture is laid out in world space, so separate pieces of ice match up
  iceTex.repeat.set(1, 1);
  const iceM = new THREE.MeshStandardMaterial({ map: iceTex, roughness: 0.1, metalness: 0, envMapIntensity: 1.5 }); iceM.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\n{ vec4 wpI = modelMatrix * vec4(position, 1.0); ' + UVMAP + ' }'); }; iceM.customProgramCacheKey = () => 'iceworld';
  for (const [a, b2] of [[IS0, CR0 - 3], [CR1 + 3, S2 + 18]]) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(IW2, b2 - a).rotateX(-Math.PI / 2), iceM); pl.position.set(CXI, 0, -(a + b2) / 2); pl.receiveShadow = true; scene.add(pl); }
  { // between them the sheet is made of some 900 plates with crooked edges. Each knows its middle and three random numbers; the vertex shader moves it according to how far the break has passed it.
    const NXp = 23, NZp = 40, x0 = CXI - IW2 / 2, sA = CR0 - 3, sB = CR1 + 3, r = rng(57), pts = [], pp = [], cc = [], rr = [], ii = [], TH = 0.34;
    for (let iz = 0; iz <= NZp; iz++) for (let ix = 0; ix <= NXp; ix++) { const ex = ix === 0 || ix === NXp, ez = iz === 0 || iz === NZp; pts.push([x0 + ix / NXp * IW2 + (ex ? 0 : (r() - 0.5) * IW2 / NXp * 0.72), sA + iz / NZp * (sB - sA) + (ez ? 0 : (r() - 0.5) * (sB - sA) / NZp * 0.72)]); }
    for (let iz = 0; iz < NZp; iz++) for (let ix = 0; ix < NXp; ix++) { const q = [pts[iz * (NXp + 1) + ix], pts[iz * (NXp + 1) + ix + 1], pts[(iz + 1) * (NXp + 1) + ix + 1], pts[(iz + 1) * (NXp + 1) + ix]], mx = (q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4, ms = (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4, rnd = [r(), r(), r()], b0 = pp.length / 3;
      for (const y of [0, -TH]) for (const c of q) { pp.push(c[0], y, -c[1]); cc.push(mx, ms); rr.push(...rnd); }
      ii.push(b0, b0 + 1, b0 + 2, b0, b0 + 2, b0 + 3); for (let e = 0; e < 4; e++) { const a = b0 + e, b2 = b0 + (e + 1) % 4; ii.push(a, a + 4, b2, b2, a + 4, b2 + 4); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3)); g.setAttribute('aC', new THREE.Float32BufferAttribute(cc, 2)); g.setAttribute('aR', new THREE.Float32BufferAttribute(rr, 3)); g.setIndex(ii);
    const ng = g.toNonIndexed(); ng.computeVertexNormals();                                              // flat faces: crisp broken edges
    G.iceU = { uFront: { value: CR0 - 40 }, uT: { value: 0 } };
    const pm = new THREE.MeshStandardMaterial({ map: iceTex, roughness: 0.1, metalness: 0, envMapIntensity: 1.5, side: THREE.DoubleSide });
    pm.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, G.iceU);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
        attribute vec2 aC; attribute vec3 aR; uniform float uFront, uT; varying float vSide;
        mat3 plateRot(float ax, float az){ float cx = cos(ax), sx = sin(ax), cz = cos(az), sz = sin(az); return mat3(cz, sz, 0.0, -sz, cz, 0.0, 0.0, 0.0, 1.0) * mat3(1.0, 0.0, 0.0, 0.0, cx, sx, 0.0, -sx, cx); }`)
        .replace('#include <uv_vertex>', '#include <uv_vertex>\n{ vec4 wpI = vec4(position, 1.0); ' + UVMAP + ' }')
        .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        float pd = uFront - aC.y + (aR.x - 0.5) * 6.0;                                                   // metres since the break reached this plate (ragged, not a straight line)
        float pPre = smoothstep(-11.0, 0.0, pd), pBrk = smoothstep(0.0, 4.0, pd), pFar = smoothstep(7.0, 26.0, pd) * step(0.42, aR.y);      // hairline cracks ahead; broken loose; later on more than half of them go under
        float pAng = (aR.y - 0.5) * 0.62 * pBrk + sin(uT * 1.7 + aR.z * 40.0) * 0.06 * pBrk + pFar * (aR.z - 0.5) * 1.9, pPhi = aR.z * 6.2832;
        mat3 pR = plateRot(pAng * cos(pPhi), pAng * sin(pPhi)); objectNormal = pR * objectNormal; vSide = 1.0 - abs(normal.y);`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
        { vec3 ctr = vec3(aC.x, 0.0, -aC.y), rel = transformed - ctr; rel.xz *= 1.0 - 0.022 * pPre - 0.07 * pBrk; rel = pR * rel;
          rel.y += -0.03 * pPre * aR.z - (0.05 + aR.x * 0.16) * pBrk + sin(uT * 1.3 + aR.y * 30.0) * 0.035 * pBrk - pFar * 1.3;
          rel.xz += vec2(cos(pPhi), sin(pPhi)) * 0.3 * pBrk * aR.x; transformed = ctr + rel; }`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vSide;').replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.78, 0.9, 0.97), vSide * 0.85);'); };      // the freshly broken edges are pale, clean ice
    pm.customProgramCacheKey = () => 'iceplates'; const m = new THREE.Mesh(ng, pm); m.receiveShadow = true; m.frustumCulled = false; scene.add(m); }
  // ---- forest: snow-laden spruces on both sides
  { const GEOS = [spruceGeo(11, HQ ? 7 : 5, 3.2, 12.5, HQ ? 10 : 8), spruceGeo(23, HQ ? 6 : 5, 2.5, 13.5, HQ ? 10 : 8), birchGeo(5), birchGeo(8)];      // lighter trees in regular quality
    const list = [], n0 = HQ ? 1 : 0.6;
    for (let s = -55; s < S2 + 115; s += 2.6) for (const side of [-1, 1]) { const h = half(s); for (let q = 0; q < 2; q++) { if (R() > n0 * (q ? 0.55 : 0.8)) continue; const a = h + 4.5 + Math.pow(R(), 1.7) * 125, u = side * a; if (!laneClear(s, u, HS + 2.2)) continue; const t = [cx(s) + u, ground(s, u) - 0.25, -s - R() * 2.6, 0.5 + R() * 0.75]; list.push(t); if (a < h + 12 && s > 20 && s < S1) nearTrees.push({ s: -t[2], u, x: t[0], y: t[1], z: t[2], sc: t[3], done: false }); } }
    for (const fk of FORKS) for (let s = fk.a + 30; s < fk.b - 30; s += 3.2) { const c = uc(fk, s), sg = Math.sign(fk.off), room = Math.abs(c) - HS - half(s) - 3.4; if (room < 0.5) continue; const u = sg * (half(s) + 1.7 + R() * room); if (!laneClear(s, u, HS + 1.5)) continue; const t = [cx(s) + u, ground(s, u) - 0.25, -s, 0.36 + R() * 0.3]; list.push(t); nearTrees.push({ s, u, x: t[0], y: t[1], z: t[2], sc: t[3], done: false }); }
    nearTrees.sort((p, q) => p.s - q.s);
    for (let i = 0; i < 70; i++) { const x = CXI + (R() - 0.5) * 150, s = S2 + 26 + R() * 90; if (Math.abs(x - CXI) < 13 && s < S2 + 50) continue; list.push([x, ground(s, x - CXI) - 0.25, -s, 0.6 + R() * 0.7]); }
    const kinds = [[], [], [], []]; list.forEach((t, i) => { const h = fbm(t[0] * 0.02, t[2] * 0.02, 2, 17), q = (i * 7919) % 100; kinds[q < (h > 0.55 ? 34 : 9) ? 2 + (i & 1) : q % 3 ? 0 : 1].push(t); });      // birches gather in groves; the rest is spruce of two builds
    kinds.forEach((a, kd) => { if (!a.length) return; const m = new THREE.InstancedMesh(GEOS[kd], worldMat, a.length); a.forEach(([x, y, z, sc2], i) => { const k2 = kd < 2 ? sc2 * 1.12 : 0.75 + sc2 * 0.5; dummy.position.set(x, y, z); dummy.rotation.set((R() - 0.5) * 0.06, R() * 6.28, (R() - 0.5) * 0.06); dummy.scale.set(k2 * (0.85 + R() * 0.3), k2 * (0.85 + R() * 0.45), k2 * (0.85 + R() * 0.3)); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); m.setColorAt(i, tmpC.setScalar(0.78 + R() * 0.34)); });
      m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; scene.add(m); }); }
  { const young = spruceGeo(61, 4, 1.0, 3.1, 7), bparts = [], r = rng(91); for (let i = 0; i < 16; i++) { const len = 0.7 + r() * 0.9, g = new THREE.CylinderGeometry(0.006, 0.02, len, 4, 1, true).translate(0, len / 2, 0); g.rotateZ(0.25 + r() * 0.75); g.rotateY(r() * 6.28); bparts.push(paintGeo(g, () => [0.2, 0.15, 0.12])); } const bush = mergeGeometries(bparts);
    const la = [], lb = [], n1 = HQ ? 1 : 0.5; for (let s2 = 10; s2 < S2 + 60; s2 += 2.2) for (const side of [-1, 1]) { const u = side * (half(s2) + 2.5 + R() * R() * 70); if (!laneClear(s2, u, HS + 2)) continue; if (R() < 0.42 * n1) la.push([cx(s2) + u, ground(s2, u) - 0.1, -s2 - R() * 2, 0.5 + R() * 1.0]); else if (R() < 0.3 * n1) lb.push([cx(s2) + u, ground(s2, u) - 0.05, -s2 - R() * 2, 0.7 + R() * 0.9]); }
    for (const [geo, list] of [[young, la], [bush, lb]]) { const m = new THREE.InstancedMesh(geo, worldMat, list.length); list.forEach(([x, y, z, sc2], i) => { dummy.position.set(x, y, z); dummy.rotation.set(0, R() * 6.28, 0); dummy.scale.set(sc2, sc2 * (0.8 + R() * 0.5), sc2); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); m.setColorAt(i, tmpC.setScalar(0.8 + R() * 0.3)); }); m.castShadow = true; m.frustumCulled = false; scene.add(m); } }
  // ---- dry reeds standing out of the snow along the river banks
  { const parts = []; const r = rng(88); for (let i = 0; i < 9; i++) { const hh = 1.1 + r() * 1.0, g = new THREE.CylinderGeometry(0.004, 0.016, hh, 4, 1, true).translate(0, hh / 2, 0); g.rotateZ((r() - 0.5) * 0.5); g.rotateY(r() * 6.28); g.translate((r() - 0.5) * 0.5, 0, (r() - 0.5) * 0.5); parts.push(paintGeo(g, (x, y) => { const b = 0.5 + y * 0.12; return [b * 1.0, b * 0.84, b * 0.5]; })); if (i % 2 === 0) { const hd = new THREE.CylinderGeometry(0.03, 0.022, 0.22, 5).translate(0, hh, 0); hd.rotateZ((r() - 0.5) * 0.4); hd.translate(parts.length * 0.01 - 0.05, 0, 0); parts.push(paintGeo(hd, () => [0.36, 0.25, 0.15])); } }
    const geo = mergeGeometries(parts), list = []; for (let s2 = S1 + 20; s2 < S2 + 6; s2 += 1.6) for (const side of [-1, 1]) { if (R() > 0.62) continue; const u = side * (half(s2) + 0.3 + R() * 3.2); list.push([cx(s2) + u, ground(s2, u) - 0.05, -s2 - R() * 1.6, 0.8 + R() * 0.7]); }
    const m = new THREE.InstancedMesh(geo, worldMat, list.length); list.forEach(([x, y, z, sc2], i) => { dummy.position.set(x, y, z); dummy.rotation.set(0, R() * 6.28, 0); dummy.scale.setScalar(sc2); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); }); m.castShadow = true; m.frustumCulled = false; scene.add(m); }
  // ---- soft drifts and boulders along the edges
  { const B = new Builder(8); B.blob(1, 0, 0.1, 0, 0xf4f7fc, 0.5, 1.3, 1); const geo = B.mesh().geometry, list = [];
    for (let s = -20; s < S2 + 40; s += 5) for (const side of [-1, 1]) if (R() < 0.7) { const u = side * (half(s) + 1.5 + R() * 5), fk = forkAt(s); if (fk && Math.abs(u - uc(fk, s)) < HS + 1.8) continue; list.push([cx(s) + u, ground(s, u) - 0.1, -s, 0.8 + R() * 1.6]); }
    const m = new THREE.InstancedMesh(geo, snowMat, list.length); list.forEach(([x, y, z, sc2], i) => { dummy.position.set(x, y, z); dummy.rotation.set(0, R() * 6.28, 0); dummy.scale.set(sc2, sc2 * (0.7 + R() * 0.5), sc2); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); });
    m.receiveShadow = true; m.castShadow = true; m.frustumCulled = false; scene.add(m); }
  // ---- fences of poles and orange netting on the outside of the bends, flags at the kickers, the start gate, a hut, the cottage by the fire
  const B = new Builder(12);
  for (let s = 30; s < S1 - 40; s += 4) { const c = curveAt(s); if (Math.abs(c) < 0.012 || forkAt(s) || chuteK(s) > 0 || bridgeK(s) > 0 || (s > TUN[0] - 4 && s < TUN[1] + 4)) continue; const side = c > 0 ? -1 : 1, u = side * (half(s) + 0.9), x = cx(s) + u, y = ground(s, u); B.cyl(0.05, 0.06, 1.3, x, y - 0.1, -s, 0x6b4a2e, 5); B.box(0.04, 0.5, 4.05, x, y + 0.55, -s - 2, 0xff7a1a, -headAt(s)); }
  for (const r of RAMPS) for (const sd of [-1, 1]) { const u = r.u + sd * (r.w + 0.3), x = cx(r.s - 6) + u, y = ground(r.s - 6, u); B.cyl(0.035, 0.035, 2.2, x, y, -(r.s - 6), 0xd8d8d8, 5); B.box(0.55, 0.36, 0.03, x + 0.28, y + 1.8, -(r.s - 6), sd < 0 ? 0xd9302c : 0x2c62d9); }
  { const y = ground(8, 0), x = cx(8); for (const sd of [-1, 1]) B.cyl(0.13, 0.15, 4.6, x + sd * 6.2, y + 1.2, -8, 0x7a5636, 7); B.box(12.6, 0.9, 0.12, x, y + 5.0, -8, 0xc8372f);
    const hy = ground(-10, -14); B.box(5, 2.6, 4, x - 14, hy, 10, 0x8a6240); B.add(roofGeo(5.8, 1.7, 4.8), 0xf3f6fb, x - 14, hy + 2.6, 10); B.box(0.6, 1.4, 0.6, x - 12.6, hy + 3.4, 10.6, 0x6e4a32); }
  { const x = CXI + 15, z = -(S2 + 30), y = ground(S2 + 30, 15); B.box(8, 3, 6, x, y, z, 0xd9cbb0); B.add(roofGeo(9.2, 2.6, 7), 0xf3f6fb, x, y + 3, z); B.box(0.8, 1.8, 0.8, x + 2.2, y + 4.2, z, 0x8a5a44); B.box(1, 2, 0.1, x - 1.2, y, z + 3.02, 0x5b3a26); for (const wx of [-3, 1.6]) B.box(1.1, 1, 0.1, x + wx, y + 1.3, z + 3.02, 0xffd98a); G.chimney = new THREE.Vector3(x + 2.2, y + 6.1, z);
    for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28; B.cyl(0.16, 0.18, 0.5, CXI + Math.cos(a) * 3.3, ground(S2 + 12, 0) - 0.05, -(S2 + 12) + Math.sin(a) * 3.3, 0x7a5636, 7); } }      // stumps to sit on round the fire
  for (let s = CHUTE[0] + 14, i = 0; s < CHUTE[1] - 12; s += 3, i++) for (const sd of [-1, 1]) { const u = sd * (half(s) + 0.75), x = cx(s) + u; B.box(0.12, 0.5, 3.02, x, ground(s, u) - 0.05, -s, i % 2 ? 0xd9302c : 0xf2f4f7, -headAt(s)); }      // boards along the ice chute
  for (const fk of FORKS) { const s = fk.a - 4, sg = Math.sign(fk.off), u = sg * (half(s) + 0.9), x = cx(s) + u, y = ground(s, u); for (const o of [-0.9, 0.9]) B.cyl(0.05, 0.06, 2.2, x + o, y - 0.1, -s, 0x6b4a2e, 5); B.box(2.3, 0.75, 0.07, x, y + 1.45, -s, 0x8a6240);
    const tx = canvasTex(256, 96, (c, w, h) => { c.fillStyle = '#8a6240'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff6da'; const jmp = fk === FORKS[1]; c.font = `bold ${jmp ? 34 : 46}px Georgia, serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(jmp ? T('signJ') + ' →' : sg < 0 ? '← ' + T('sign') : T('sign') + ' →', w / 2, h / 2 + 3); }, 1, 1);
    const pm = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.7), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.9 })); pm.position.set(x, y + 1.82, -s + 0.045); scene.add(pm); }
  // ---- the big jump: flags up the take-off, a gantry over the lip, distance lines on the landing
  { const fk = FORKS[1]; for (let s = JUMP - JLEN, i = 0; s <= JUMP; s += 4, i++) for (const sd of [-1, 1]) { if (Math.abs(uc(fk, s)) < half(s) + HS + 3) continue; const u = uc(fk, s) + sd * (HS + 1.5), x = cx(s) + u, y = ground(s, u); B.cyl(0.04, 0.04, 2.4, x, y - 0.2, -s, 0xd8d8d8, 5); B.box(0.6, 0.38, 0.03, x + 0.3, y + 1.8, -s, (i + (sd > 0)) % 2 ? 0xd9302c : 0xf2f4f7); }
    { const s = JUMP - 1, uc0 = uc(fk, s), y = ground(s, uc0); for (const sd of [-1, 1]) B.box(0.3, 13, 0.3, cx(s) + uc0 + sd * (HS + 2.6), y - 9, -s, 0x7a8087); B.box(HS * 2 + 5.6, 0.8, 0.3, cx(s) + uc0, y + 3.4, -s, 0xc8372f); }
    for (const [o, col] of [[38, 0x2c62d9], [52, 0x2f9a4a], [66, 0xd9302c]]) { const s = JUMP + o, u = uc(fk, s); B.box(HS * 2, 0.04, 0.35, cx(s) + u, ground(s, u) + 0.02, -s, col); } }
  // ---- countryside: telegraph poles along the village, boulders showing through the snow, a jetty and a boat frozen in at the river bank
  for (let s = 590; s <= 790; s += 28) { const u = half(s) + 6.5, x = cx(s) + u, y = ground(s, u); B.cyl(0.09, 0.12, 7.2, x, y - 0.4, -s, 0x4a3a2c, 6); B.box(1.5, 0.1, 0.1, x, y + 6.2, -s, 0x4a3a2c); if (s < 790) { const s2 = s + 28, x2 = cx(s2) + half(s2) + 6.5, y2 = ground(s2, half(s2) + 6.5); for (const o of [-0.6, 0.6]) for (let q = 0; q < 6; q++) { const a = q / 6, b2 = (q + 1) / 6, sag = (t) => -1.1 * 4 * t * (1 - t), g = new THREE.CylinderGeometry(0.012, 0.012, 1, 3), ax = lerp(x, x2, a) + o, ay = lerp(y, y2, a) + 6.25 + sag(a), az = -lerp(s, s2, a), bx = lerp(x, x2, b2) + o, by = lerp(y, y2, b2) + 6.25 + sag(b2), bz = -lerp(s, s2, b2), len = Math.hypot(bx - ax, by - ay, bz - az); g.scale(1, len, 1); g.rotateX(Math.PI / 2); g.lookAt(new THREE.Vector3(bx - ax, by - ay, bz - az)); B.add(g, 0x1c1c1c, (ax + bx) / 2, (ay + by) / 2, (az + bz) / 2); } } }
  for (let i = 0; i < 150; i++) { const s = 20 + R() * (S2 + 60), side = R() < 0.5 ? -1 : 1, u = side * (half(s) + 3 + R() * 60), fk = forkAt(s); if (fk && Math.abs(u - uc(fk, s)) < HS + 3) continue; const x = cx(s) + u, y = ground(s, u), r = 0.6 + R() * 1.5; B.blob(r, x, y + r * 0.25, -s, 0x6f737b, 0.7 + R() * 0.3, 1 + R() * 0.5, 0.9 + R() * 0.4); B.blob(r * 0.86, x + r * 0.08, y + r * 0.62, -s, 0xf4f7fc, 0.4, 1 + R() * 0.4, 0.95); }
  { const s = S1 + 150, x = CXI - IW - 1; for (let k = 0; k < 9; k++) { B.box(1.7, 0.08, 0.42, x + 4.5 + 0 * k, 0.55, -s - k * 0.5, k % 2 ? 0x8f6844 : 0x7b5837); } for (const o of [0, 2, 4]) for (const sd of [-0.75, 0.75]) B.cyl(0.07, 0.07, 1.6, x + 4.5 + sd, -0.6, -s - o, 0x5e4228, 6);
    const hull = new THREE.CylinderGeometry(0.75, 0.55, 3.6, 10, 1, false, 0, Math.PI); hull.rotateZ(Math.PI / 2); hull.rotateY(Math.PI / 2); hull.scale(1, 0.75, 1); B.add(hull, 0x3f6a8a, x + 7.5, 0.5, -s - 6, 0.5); B.box(1.2, 0.07, 0.3, x + 7.5, 0.42, -s - 6, 0x8f6844, 0.5); B.blob(0.7, x + 7.5, 0.55, -s - 6.4, 0xf4f7fc, 0.3, 1.2, 2.2); }
  // ---- Wierzbica: cottages under snow beside the run, fenced yards, haystacks
  G.smoke = [];
  [[606, 15, 0xd8c9ae, 1], [636, 26, 0xb9a48a, 0], [668, 16, 0xe2d6c0, 1], [694, 31, 0xc9b79c, 1], [738, 19, 0xd4c3a6, 0], [770, 28, 0xbfae95, 1]].forEach(([s, off, wall, lit], i) => { const u = off + Math.sign(off) * half(s), x = cx(s) + u, w = 6.5 + (i % 3), dpt = 5 + (i % 2), y = Math.min(ground(s - 3, u - 3), ground(s + 3, u + 3), ground(s, u)) - 0.3, ry = -headAt(s) + (i % 2 ? 0.25 : -0.2), c = Math.cos(ry), sn = Math.sin(ry), at = (lx, lz) => [x + lx * c + lz * sn, -s - lx * sn + lz * c];
    B.box(w, 3.4, dpt, x, y, -s, wall, ry); B.box(w + 0.2, 0.5, dpt + 0.2, x, y - 0.2, -s, 0x6b6660, ry); B.add(roofGeo(dpt + 1.3, 2.5, w + 1.2).rotateY(Math.PI / 2), 0xf3f6fb, x, y + 3.4, -s, ry); { const q = at(w * 0.22, 0.4); B.box(0.75, 1.9, 0.75, q[0], y + 4.4, q[1], 0x8a5a44, ry); G.smoke.push(new THREE.Vector3(q[0], y + 6.4, q[1])); }
    const sd = off > 0 ? -1 : 1; { const q = at(sd * 0 - w * 0.2, 0); const f = at(-w * 0.2, -sd * (dpt / 2 + 0.03)); B.box(1.0, 2.0, 0.08, f[0], y + 0.3, f[1], 0x5b3a26, ry); void q; }
    for (const lx of [w * 0.18, w * 0.36]) { const f = at(lx, -sd * (dpt / 2 + 0.03)); B.box(1.0, 1.0, 0.08, f[0], y + 1.5, f[1], lit ? 0xffd98a : 0x33414e, ry); }
    for (let k = -3; k <= 3; k++) { const f = at(k * 1.6, -sd * (dpt / 2 + 4.5)), gy = ground(-f[1], f[0] - cx(-f[1])); B.cyl(0.05, 0.06, 1.0, f[0], gy - 0.1, f[1], 0x6b4a2e, 5); if (k < 3) { const f2 = at(k * 1.6 + 0.8, -sd * (dpt / 2 + 4.5)); B.box(1.6, 0.07, 0.05, f2[0], ground(-f2[1], f2[0] - cx(-f2[1])) + 0.55, f2[1], 0x7a5636, ry); } }
    { const f = at(-w * 0.9, sd * 1.5), gy = ground(-f[1], f[0] - cx(-f[1])); B.cone(1.5, 2.4, f[0], gy - 0.2, f[1], 0xc9a85a, 9); B.cone(1.3, 1.5, f[0], gy + 1.0, f[1], 0xf3f6fb, 9); } });
  // ---- far hills: forested ridges that fade into the haze on both sides and beyond the river
  { const pp = [], cc = [], ii = [], US2 = [150, 205, 270, 350, 440], rise = [0, 16, 38, 60, 46]; let rowsN = 0;
    for (const side of [-1, 1]) { const base = pp.length / 3; let n = 0; for (let s = -200; s <= S2 + 500; s += 26, n++) { const k = s > S1 ? lerp(1, 1.5, sm(S1, S1 + 60, s)) : 1, sc = clamp(s, -60, S2 + 120); US2.forEach((u0, j) => { const u = side * u0 * k, x = cx(sc) + u, hgt = j ? ground(sc, side * 150 * k) * 0.8 + trackY(sc) * 0.2 + rise[j] * (0.55 + fbm(x * 0.006 + 3, s * 0.006, 3, 21) * 1.1) : ground(sc, u), f = fbm(x * 0.05, s * 0.05, 2, 4), wood = j ? sm(0.3, 0.55, f) : 0; pp.push(x, hgt, -s); cc.push(lerp(0.9, 0.14, wood), lerp(0.94, 0.21, wood), lerp(1.0, 0.2, wood)); }); }
      rowsN = n; for (let i = 0; i < n - 1; i++) for (let j = 0; j < US2.length - 1; j++) { const q = base + i * US2.length + j; if (side > 0) ii.push(q, q + US2.length, q + 1, q + 1, q + US2.length, q + US2.length + 1); else ii.push(q, q + 1, q + US2.length, q + 1, q + US2.length + 1, q + US2.length); } }
    { const base = pp.length / 3, NX = 30, NZ = 9; for (let iz = 0; iz <= NZ; iz++) for (let ix = 0; ix <= NX; ix++) { const x = CXI + (ix / NX - 0.5) * 900, s = S2 + 118 + iz * 44, e = iz / NZ, hgt = ground(S2 + 118, clamp(x - CXI, -220, 220)) * (1 - e) + (8 + 74 * fbm(x * 0.005 + 9, s * 0.006, 3, 31)) * sm(0, 0.7, e), f = fbm(x * 0.05, s * 0.05, 2, 4), wood = sm(0.3, 0.55, f) * sm(0, 0.25, e); pp.push(x, hgt, -s); cc.push(lerp(0.9, 0.14, wood), lerp(0.94, 0.21, wood), lerp(1.0, 0.2, wood)); }
      for (let iz = 0; iz < NZ; iz++) for (let ix = 0; ix < NX; ix++) { const q = base + iz * (NX + 1) + ix; ii.push(q, q + 1, q + NX + 1, q + 1, q + NX + 2, q + NX + 1); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cc, 3)); g.setIndex(ii); g.computeVertexNormals(); const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide })); m.frustumCulled = false; scene.add(m); void rowsN; }
  // the footbridge: planks, rails, trestles down into the gully
  for (let s = BR - 19.5, i = 0; s <= BR + 19.5; s += 0.56, i++) B.box(5.5, 0.1, 0.5, cx(s), ground(s, 0) - 0.07, -s, i % 2 ? 0x8f6844 : 0x7b5837, -headAt(s));
  for (let s = BR - 19; s <= BR + 19.1; s += 2.2) for (const sd of [-1, 1]) { const x = cx(s) + sd * 2.68, y = ground(s, 0); B.cyl(0.06, 0.06, 1.05, x, y - 0.05, -s, 0x5e4228, 6); if (s < BR + 18) for (const hh of [0.5, 0.95]) B.box(0.07, 0.08, 2.24, cx(s + 1.1) + sd * 2.68, ground(s + 1.1, 0) + hh, -s - 1.1, 0x8f6844, -headAt(s)); }
  for (const o of [-9, 0, 9]) { const s = BR + o, y = ground(s, 0), dp = gul(s) + 0.8; for (const sd of [-1, 1]) B.box(0.24, dp, 0.24, cx(s) + sd * 2.3, y - dp - 0.1, -s, 0x5e4228); B.box(5.2, 0.2, 0.24, cx(s), y - 0.32, -s, 0x5e4228); }
  // icicles in the mouths of the snow tunnel
  for (const s of [TUN[0] + 0.3, TUN[1] - 0.3]) for (let i = 0; i < 11; i++) { const an = 0.5 + i * 0.214, hw = half(s) + 1.1, g = new THREE.ConeGeometry(0.07 + R() * 0.06, 0.6 + R() * 0.9, 5); g.rotateX(Math.PI); B.add(g, 0xd8ecfb, cx(s) + Math.cos(an) * hw, ground(s, 0) + 0.2 + Math.sin(an) * 4.5 - 0.5, -s); }
  const st = B.mesh(); st.frustumCulled = false; scene.add(st);
  // ---- the snow tunnel: a vault of packed snow over the run, blue inside
  { const J = 16, rowsN = Math.round((TUN[1] - TUN[0]) / 2), mk = (grow, mat) => { const pp = [], ii = []; for (let i = 0; i <= rowsN; i++) { const s = TUN[0] + i * 2, hw = half(s) + 1.2 + grow, gy = ground(s, 0); for (let j = 0; j <= J; j++) { const an = Math.PI * j / J, n = (fbm(i * 0.5, j * 0.5, 2, 5) - 0.5) * (grow ? 1.1 : 0.35); pp.push(cx(s) + Math.cos(an) * (hw + n), gy - 0.9 + Math.sin(an) * (5.4 + grow * 1.25 + n), -s); } }
      for (let i = 0; i < rowsN; i++) for (let j = 0; j < J; j++) { const q = i * (J + 1) + j; ii.push(q, q + J + 1, q + 1, q + 1, q + J + 1, q + J + 2); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3)); g.setIndex(ii); g.computeVertexNormals(); const m = new THREE.Mesh(g, mat); m.frustumCulled = false; scene.add(m); return { m, pp }; };
    const inM = new THREE.MeshStandardMaterial({ color: 0x6f95bd, roughness: 0.5, side: THREE.DoubleSide, emissive: 0x24456a, emissiveIntensity: 0.6, fog: false }), outM = new THREE.MeshStandardMaterial({ color: 0xf3f7fc, roughness: 0.9, side: THREE.DoubleSide });
    const a = mk(0, inM), b = mk(1.2, outM); b.m.castShadow = true; b.m.receiveShadow = true;
    for (const i of [0, rowsN]) { const pp = [], ii = [], o = i * (J + 1) * 3; for (let j = 0; j <= J; j++) { pp.push(a.pp[o + j * 3], a.pp[o + j * 3 + 1], a.pp[o + j * 3 + 2], b.pp[o + j * 3], b.pp[o + j * 3 + 1], b.pp[o + j * 3 + 2]); if (j < J) ii.push(j * 2, j * 2 + 1, j * 2 + 2, j * 2 + 1, j * 2 + 3, j * 2 + 2); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3)); g.setIndex(ii); g.computeVertexNormals(); const m = new THREE.Mesh(g, outM); m.frustumCulled = false; scene.add(m); } }      // the faces of the two mouths
  // ---- the avalanche: a long wall of tumbling snow that comes down the left-hand slope at an angle and closes on the run like a gate
  { const g = new THREE.IcosahedronGeometry(1, 3), P3 = g.attributes.position; for (let i = 0; i < P3.count; i++) { const x = P3.getX(i), y = P3.getY(i), z = P3.getZ(i), n = 0.74 + fbm(x * 1.7 + 3 + y, z * 1.7 - y, 3, 11) * 0.6; P3.setXYZ(i, x * n, y * n, z * n); } g.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ color: 0xf7fafe, roughness: 1 }); G.avL = [];
    for (let i = 0; i < 22; i++) { const m = new THREE.Mesh(g, mat); m.visible = false; m.castShadow = true; scene.add(m); G.avL.push({ m, sx: 5.5 + R() * 3.5, sy: 4.2 + R() * 3, ph: R() * 6.28, off: (R() - 0.5) * 3, spin: 1.6 + R() * 1.6 }); } }
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
  GEO.spruce = spruceGeo(41, 5, 0.9, 2.5);
  { const B = new Builder(2); B.blob(0.55, 0, 0.5, 0, 0xf5f8fc); B.blob(0.4, 0, 1.22, 0, 0xf5f8fc); B.blob(0.28, 0, 1.78, 0, 0xf5f8fc); const n = new THREE.ConeGeometry(0.05, 0.3, 6); n.rotateX(Math.PI / 2); B.add(n, 0xff7a1a, 0, 1.78, 0.36);
    for (const sx of [-1, 1]) { B.blob(0.035, sx * 0.1, 1.86, 0.25, 0x151515); const g = new THREE.CylinderGeometry(0.02, 0.02, 0.7, 4); g.rotateZ(sx * 1.1); B.add(g, 0x4a3626, sx * 0.62, 1.32, 0); } for (let k = 0; k < 3; k++) B.blob(0.04, 0, 1.0 + k * 0.17, 0.39 - k * 0.02, 0x151515);
    B.cyl(0.2, 0.2, 0.26, 0, 1.98, 0, 0x1c1c22, 9); B.cyl(0.3, 0.3, 0.03, 0, 1.98, 0, 0x1c1c22, 9); B.cyl(0.29, 0.29, 0.1, 0, 1.52, 0, 0xc8372f, 9); GEO.snowman = B.mesh().geometry; }
  { const B = new Builder(3); B.blob(0.85, 0, 0.35, 0, 0x7d8088, 0.75, 1.1, 0.9); B.blob(0.7, 0.05, 0.72, 0, 0xf4f7fc, 0.42, 1.1, 0.95); GEO.rock = B.mesh().geometry; }
  { const B = new Builder(5); const g = new THREE.CylinderGeometry(0.26, 0.28, 1, 9); g.rotateZ(Math.PI / 2); B.add(g, 0x6b4a2e, 0, 0.27, 0); const c = new THREE.CylinderGeometry(0.23, 0.25, 1, 9, 1, false, -0.9, 1.8); c.rotateZ(Math.PI / 2); c.rotateX(-Math.PI / 2); B.add(c, 0xf4f7fc, 0, 0.36, 0); GEO.log = B.mesh().geometry; }
  // ---- rows of obstacles with one clear line through each
  let safe = 0;
  for (let s = 75; s < S1 - 70; s += 23 + R() * 12) {
    const h = half(s) - 1.3; safe = clamp(safe + (R() - 0.5) * 8, -h + 1.4, h - 1.4);
    if (chuteK(s) > 0 || (s > CHUTE[0] - 30 && s < CHUTE[1] + 12) || Math.abs(s - BR) < 34) { rows.push({ s, safe: 0, clear: true }); safe = 0; continue; }
    const ramp = RAMPS.find((r) => s > r.s - 16 && s < r.s + 42); if (ramp) { rows.push({ s, safe: ramp.u, clear: true }); safe = ramp.u; continue; }
    if (R() < 0.16 && s > 200) { obs.push({ type: 'log', s, u: 0, w: h * 2 + 2, r: 0.3, hgt: 0.62 }); rows.push({ s, safe, log: true }); continue; }
    const row = { s, safe }; rows.push(row);
    for (let u = -h + 0.6; u <= h - 0.6; u += 2.3) { if (Math.abs(u - safe) < 2.5 || R() > (0.3 + Math.min(0.32, s / 3200)) * (forkAt(s) ? 0.55 : 1)) continue; const type = ['spruce', 'spruce', 'snowman', 'rock'][(R() * 4) | 0]; obs.push({ type, s: s + (R() - 0.5) * 3, u: u + (R() - 0.5) * 0.8, r: type === 'rock' ? 0.85 : type === 'spruce' ? 0.55 : 0.6, sc: 0.85 + R() * 0.4 }); }
  }
  for (const fk of [FORKS[0]]) { let sd = 1; for (let s = fk.a + 74; s < fk.b - 62; s += 8.5, sd = -sd) { obs.push({ type: 'spruce', s, u: uc(fk, s) + sd * 1.45, r: 0.5, sc: 0.72 }); for (let q = 0; q < 3; q++) { const s2 = s + 1.6 + q * 2.4; items.push({ s: s2, u: uc(fk, s2) - sd * 0.95 * (q === 1 ? 1 : 0.6), h: 0.55 }); } } }      // a tight slalom, thick with bones
  for (const s of [250, 430]) { const b = { s, u: 0, r: 1.05, ph: R() * 6, m: new THREE.Mesh(new THREE.IcosahedronGeometry(1.05, 2), new THREE.MeshStandardMaterial({ color: 0xf1f5fb, roughness: 0.9, flatShading: true })) }; b.m.castShadow = true; scene.add(b.m); balls.push(b); }      // snowballs rolling from side to side
  for (const type of Object.keys(GEO)) { const a = obs.filter((o) => o.type === type); if (!a.length) continue; const m = new THREE.InstancedMesh(GEO[type], worldMat, a.length);
    a.forEach((o, i) => { const u = o.u, x = cx(o.s) + u; dummy.position.set(x, ground(o.s, u) - 0.05, -o.s); dummy.rotation.set(0, type === 'log' ? -headAt(o.s) : R() * 6.28, 0); if (type === 'log') dummy.scale.set(o.w, 1, 1); else dummy.scale.setScalar(o.sc); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); });
    m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; scene.add(m); }
  // ---- bones: along the clear line, and in an arc after every kicker
  for (let i = 0; i < rows.length - 1; i++) { const a = rows[i], b = rows[i + 1]; if (R() < 0.25) continue; for (let k = 1; k <= 4; k++) { const t = k / 5, s = lerp(a.s, b.s, t); items.push({ s, u: lerp(a.safe, b.safe, t), h: a.log && k === 1 ? 1.3 : 0.55 }); } }
  for (let k = 0; k < 16; k++) { const s = JUMP + 3 + k * 3.6; items.push({ s, u: uc(FORKS[1], s), h: 2.5 + Math.sin((k + 0.5) / 16 * Math.PI) * 5 + (JUMP - s) * 0 + 6 * (1 - k / 16), airy: true }); }      // a long arc of bones along the flight
  for (const fk of FORKS) for (let s = fk.a - 26; s < (fk === FORKS[1] ? JUMP - 6 : fk.a + 70); s += 3) items.push({ s, u: s < fk.a + 12 ? Math.sign(fk.off) * lerp(0, half(s) * 0.62, sm(fk.a - 26, fk.a + 8, s)) : Math.max(Math.abs(uc(fk, s)), half(s) * 0.62) * Math.sign(fk.off), h: 0.55 });      // a trail of bones leads off the run into each side lane
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
    for (let i = 0; i < 300 && haz.filter((q) => q.type === 'snow').length < 13; i++) { const z = -(ICE0 + 30 + R() * (CR0 - ICE0 - 34)), x = CXI + (R() - 0.5) * 42, r = 2.6 + R() * 1.8; if (!far(x, z, 2.5)) continue; const m = new THREE.Mesh(g, rimM); m.position.set(x, 0.02, z); m.scale.set(r, 1, r); m.rotation.y = R() * 6; m.receiveShadow = true; scene.add(m); haz.push({ type: 'snow', x, z, r: r * 0.9, m }); } }
  haz.filter((q) => q.type === 'hole').slice(0, 5).forEach((hl, i) => { const sd = i % 2 ? 1 : -1, x = hl.x + sd * (hl.r + 1.1), g = new THREE.Group(), B = new Builder(30 + i); B.box(0.5, 0.36, 0.4, 0, 0, 0, 0x5a7a3a); const rod = new THREE.CylinderGeometry(0.012, 0.02, 1.7, 4); rod.rotateZ(sd * 1.0); B.add(rod, 0x2a2a2a, -sd * 0.75, 1.05, 0.1);
    const pm = person([0x3a6a4a, 0x8a4a2a, 0x344a7a][i % 3], [0xd9a441, 0x555555, 0xc23b2e][i % 3], 0x2c3350, 1, 0); pm.position.y = 0.2; g.add(B.mesh(), pm); g.position.set(x, 0, hl.z); g.rotation.y = sd * 0.5; scene.add(g); haz.push({ type: 'angler', x, z: hl.z, r: 0.75, m: g }); });
  for (let i = 0; i < 6; i++) { const z = -(ICE0 + 70 + i * (CR0 - ICE0 - 90) / 5), m = person([0xd9302c, 0x2c62d9, 0xe0a020, 0x9a3fc0, 0x23a37a, 0xe05a90][i], [0xffffff, 0xffd23f, 0x2c62d9, 0xffffff, 0xd9302c, 0x3a3a3a][i], 0x23262e, 0.82 + (i % 3) * 0.08, i % 2 ? 1 : -1); scene.add(m); skaters.push({ m, z, amp: 9 + R() * 9, w: 0.5 + R() * 0.35, ph: R() * 6, x: CXI, r: 0.6, cd: 0 }); }
  for (let z = ICE0 + 26; z < S2 - 6; z += 3.4) { const x = CXI + 15 * Math.sin((z - ICE0) * 0.026) * sm(ICE0, ICE0 + 60, z); if (!far(x, -z, 1.2) && haz.some((q) => q.type !== 'snow' && Math.hypot(q.x - x, q.z + z) < q.r + 1.2)) continue; items.push({ ice: true, x, z: -z, h: 0.55 }); }
  const wTex = canvasTex(512, 512, (c, w, h) => { const r = rng(14); c.fillStyle = '#2f6283'; c.fillRect(0, 0, w, h); for (let i = 0; i < 260; i++) { const x = r() * w, y = r() * h, l = 14 + r() * 46; c.strokeStyle = `rgba(${120 + r() * 80 | 0},${170 + r() * 60 | 0},${205 + r() * 40 | 0},${0.1 + r() * 0.22})`; c.lineWidth = 1 + r() * 2; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + l / 2, y + (r() - 0.5) * 8, x + l, y); c.stroke(); }
      for (let i = 0; i < 150; i++) { c.fillStyle = `rgba(235,246,255,${0.35 + r() * 0.5})`; const x = r() * w, y = r() * h, q = 2 + r() * 7; c.beginPath(); c.moveTo(x, y); c.lineTo(x + q, y + q * (r() - 0.5)); c.lineTo(x + q * 0.6, y + q); c.lineTo(x - q * 0.3, y + q * 0.6); c.fill(); } }, 5, 1);                                   // ripples and brash ice
    wTex.repeat.set(5, 9); const crackM = new THREE.MeshStandardMaterial({ map: wTex, emissiveMap: wTex, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.15 }); G.wTex = wTex;
    crackWater = new THREE.Mesh(new THREE.PlaneGeometry(IW * 3.2, CR1 - CR0 + 6).rotateX(-Math.PI / 2), crackM); crackWater.position.set(CXI, -0.42, -(CR0 + CR1) / 2); scene.add(crackWater);
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
    [[345, 1], [1208, -1]].forEach(([s0, dir]) => { for (let q = 0; q < 2; q++) deer.push({ m: mkDeer(), s: s0 + q * 2.2, dir, lag: q * 0.8, u: 0, on: false, t: 0, r: 0.75 }); });
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
  // ---- the snowball fight: pairs of children beside the run, and the balls they throw
  [[160, -1], [612, 1], [1130, -1]].forEach(([s0, side], e) => { for (let q = 0; q < 2; q++) { const s = s0 + q * 5.5, u = side * (half(s) + 1.5 + q * 0.6), m = mk([0xd9302c, 0x2f9a4a, 0x8a3fc0, 0xe0a020, 0x2c62d9, 0xe05a90][e * 2 + q], [0xffffff, 0xd9302c, 0xffd23f, 0x2c62d9, 0xffffff, 0x3a3a3a][e * 2 + q], 0.86 + q * 0.08, cx(s) + u, -s, ground(s, u), -side); m.rotation.y = -side * 1.2; kids.push({ m, s, u, y: m.position.y, cd: q * 0.6, hop: 0 }); } });
  for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.17, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 })); m.visible = false; m.castShadow = true; scene.add(m); shots.push({ m, on: false, vx: 0, vy: 0, vz: 0 }); }
  // ---- a flock of rooks crossing the sky over the landing hill: the sledge flies right through them
  { const bodyG = new THREE.SphereGeometry(1, 10, 8).scale(0.09, 0.08, 0.26), headG = new THREE.SphereGeometry(0.06, 8, 6).translate(0, 0.03, 0.26), beakG = new THREE.ConeGeometry(0.02, 0.1, 5).rotateX(Math.PI / 2).translate(0, 0.02, 0.36), tailG = new THREE.BoxGeometry(0.12, 0.012, 0.2).translate(0, 0, -0.3);
    const wingG = new THREE.BufferGeometry(); wingG.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.14, 0.62, 0, 0.02, 0.5, 0, -0.16, 0, 0, 0.14, 0.5, 0, -0.16, 0, 0, -0.12], 3)); wingG.computeVertexNormals();
    const bm = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.6, side: THREE.DoubleSide }), km = new THREE.MeshStandardMaterial({ color: 0xb9b3a4, roughness: 0.6 });
    for (let i = 0; i < 11; i++) { const g = new THREE.Group(), wl = new THREE.Mesh(wingG, bm), wr = new THREE.Mesh(wingG, bm); wr.scale.x = -1; g.add(new THREE.Mesh(bodyG, bm), new THREE.Mesh(headG, bm), new THREE.Mesh(beakG, km), new THREE.Mesh(tailG, bm), wl, wr); g.scale.setScalar(1.5); g.visible = false; scene.add(g);
      const row = Math.ceil(i / 2), sd = i % 2 ? 1 : -1; birds.push({ g, wl, wr, ds: 16 + row * 4.2 + R() * 2, du: sd * row * 2.3 + (R() - 0.5), dy: 0.5 + row * 0.4 + R() * 3.5, ph: R() * 6, sp: 9 + R() * 2 }); } }
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
  set('rScore', T('bones', G.bones)); set('rSub', T('time', clock(G.time)) + (G.style ? ' · ' + T('style', G.style, G.combo) : ''));
  set('rLives', [0, 1, 2].map((i) => `<span class="${i < G.lives ? '' : 'lost'}" style="color:#8fd0ff">${flakeIcon}</span>`).join(''), true);
  set('rLabel', G.av === 1 && G.phase === 'sled' ? T('aval', Math.max(0, Math.round(G.s - G.avS))) : T('left', Math.max(0, Math.round((S2 - prog()) / 10) * 10))); if (shown.avc !== (G.av === 1)) { shown.avc = G.av === 1; $('rLabel').style.color = shown.avc ? '#ff8a6a' : ''; }
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
  Object.assign(G, { av: 0, avS: 0, avV: 16, avFade: 0, flip: 0, combo: 1, style: 0, snowed: 0 }); for (const q of G.avL) q.m.visible = false; for (const q of shots) { q.on = false; q.m.visible = false; } for (const kd of kids) kd.cd = Math.random();
  Object.assign(G, { crash: null, trick: 0, inShort: false, treeI: 0, crackOn: false, crackS: CR0, crackHold: 0, floeI: 0, floeS: CR0, dusk: -1, breath: 0 }); for (const t of nearTrees) t.done = false; G.birdT = 0; for (const b of birds) b.g.visible = false; for (const d of deer) { d.on = false; d.done = false; d.m.visible = false; } G.iceU.uFront.value = CR0 - 40; hare.visible = false; hare.userData.i = 0; hare.userData.off = 0;
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
  $('endTitle').textContent = T(win ? 'winT' : 'loseT'); $('endText').textContent = win ? T('winX', clock(G.time), G.bones, stars) + (G.style ? T('styleEnd', G.style) : '') : T('loseX', Math.max(0, Math.round(S2 - prog())));
  $('end').classList.remove('hidden'); $('menu').style.display = ''; for (const id of ['rTop', 'rLives', 'rMila', 'hint', 'pick']) $(id).style.opacity = 0;
}
function hurt(text, x, y, z, wet) {
  G.lives--; G.inv = 1.8; G.shake = 0.7; G.combo = 1; buzz(150); pick(T(text));
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
  if (G.crash) return; G.combo = 1; G.inv = Math.max(G.inv, 3.4); const v0 = Math.max(G.v, 6), hd = Math.atan(headAt(G.s)); G.crash = { t: 0, a: [] };
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
  const ck = chuteK(G.s), fk = forkAt(G.s), lane = fk ? uc(fk, G.s) : 0; const LW = fk ? laneW(fk, G.s) : HS; G.inShort = !!fk && Math.abs(lane) > h * 0.55 && Math.abs(G.u - lane) < LW + 0.4 && (G.inShort || G.u * fk.off > 0 && Math.abs(G.u) > h * 0.42);      // on the lane's side of the run when it peels off: taken
  if (G.crash) { input.x = 0; G.v += (1.6 - G.v) * Math.min(1, dt * 3.5); }
  else if (!G.air) G.v += (26 * sl + 5.5 * ck + (G.inShort ? (fk === FORKS[1] && G.s < JUMP ? 7.5 : 2.6) : 0) - 0.0085 * (1 - 0.55 * ck) * G.v * G.v - 0.35 - (brake ? 11 - 5 * ck : 0) - Math.abs(G.uv) * 0.12) * dt;
  if (G.s > S1) G.v -= (1.2 + G.v * 0.3) * dt;                                                        // the sledge runs out on the ice
  G.v = clamp(G.v, G.s > S1 ? 0 : G.crash ? 1 : 2.2, 34 + 9 * ck + (G.inShort && fk === FORKS[1] ? 6 : 0)); G.s += G.v * dt;
  if (ck > 0.2) hint('h_chute'); { const up = forkAt(G.s + 55); if (up && G.s < up.a + 30) hint(up === FORKS[1] ? 'h_jump' : 'h_fork'); }
  if (G.inShort) G.u += (uc(fk, G.s) - lane);                                                          // the lane carries the sledge along as it swings away and back
  // ---- sideways: steering, and the bends throw the sledge outwards
  const tricking = G.air && !G.hopped && !G.crash && G.y - ground(G.s, G.u) > 0.65, grip = (G.air ? 0.25 : 1) * (1 - 0.7 * ck); G.uv += (input.x * 26 * grip * (tricking ? 0.3 : 1) - G.uv * 3.4 * grip - curveAt(G.s) * G.v * G.v * 0.5 * grip * (1 - 0.5 * ck)) * dt; G.u += G.uv * dt;
  if (tricking) { const ease = (v, inp, rate) => { if (inp) return v + inp * rate * dt; const t = Math.round(v / 6.2832) * 6.2832, dd = t - v; return Math.abs(dd) < 4.5 * dt ? t : v + Math.sign(dd) * 4.5 * dt; }; G.trick = ease(G.trick, input.x, 11); G.flip = ease(G.flip, input.y, 10.5); } else if (!G.air) { G.trick *= Math.exp(-dt * 12); G.flip *= Math.exp(-dt * 12); }
  { const c2 = fk ? uc(fk, G.s) : 0, dM = Math.abs(G.u) - (h - 0.7), dS = fk ? Math.abs(G.u - c2) - (LW - 0.6) : 1e9;
    if (dM > 0 && dS > 0) { const main = dM <= dS, sd = Math.sign(main ? G.u : G.u - c2); G.u = main ? sd * (h - 0.7) : c2 + sd * (LW - 0.6); if (G.uv * sd > 0) { if (G.uv * sd > 3 && ck < 0.3) { G.v *= 0.86; G.shake = Math.max(G.shake, 0.25); if (audio.on) audio.scrape(); } G.uv *= ck > 0.3 ? -0.7 : -0.35; } snowPuff(cx(G.s) + G.u + sd * 0.5, G.y, -G.s, 3, 4); } }
  // ---- up and down: the ground is followed while it holds the sledge; a kicker lets go of it
  const gy = ground(G.s, G.u), wasAir = G.air; G.vy -= 17.5 * dt; G.y += G.vy * dt;
  if (G.s > TUN[0] - 14 && G.s < TUN[1] + 1) { const top = gy + (G.s > TUN[0] ? 3.3 : lerp(11, 3.3, sm(TUN[0] - 14, TUN[0], G.s))); if (G.y > top) { G.y = top; G.vy = Math.min(G.vy, -2); } }      // inside there is a roof; on the way in, anything flying high is eased down under it      // under and just before the snow vault there is no flying: the roof is in the way
  if (G.y <= gy) { if (wasAir) { const d = Math.round(G.s - G.airS);
      if (!G.hopped && !G.crash) { const tw = Math.abs(G.trick), n = Math.round(tw / 6.2832), res = Math.abs(tw - n * 6.2832), fw = Math.abs(G.flip), m = Math.round(fw / 6.2832), res2 = Math.abs(fw - m * 6.2832), off = Math.max(tw > 0.7 ? res : 0, fw > 0.7 ? res2 : 0);      // full turns and somersaults made, and how far from straight she comes down
        if (off > 1.3) { pick(T('tumble')); G.v *= 0.45; G.shake = 0.6; G.combo = 1; wipeout(); if (audio.on) audio.yelp(); }
        else if (n + m > 0 || d >= 8) { const clean = n + m > 0 && Math.max(res, res2) < 0.55, pts = (n * 100 + m * 150 + (clean ? 50 : 0) + (d >= 8 ? d * 5 : 0)) * G.combo, bn = n * 5 + m * 7 + (clean ? 3 : 0) + (d >= 8 ? Math.floor(d / 4) : 0), parts = [];
          if (n) parts.push(T('t_spin', n)); if (m) parts.push(T('t_flip', m)); if (d >= 8) parts.push(T('t_air', d)); if (clean) parts.push(T('t_clean'));
          G.style += pts; G.bones += bn; pick(parts.join(' + ') + (G.combo > 1 ? ` ×${G.combo}` : '') + ` = ${pts}`); pickT = 2.4; G.combo = Math.min(9, G.combo + 1); if (n + m > 0) { if (!clean) G.v *= 0.85; if (audio.on) audio.pickup('mirror'); buzz(40); } }
        G.flip = (G.flip > 0 ? 1 : -1) * (fw - m * 6.2832);
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
  for (let i = G.treeI; i < nearTrees.length && nearTrees[i].s < G.s + 2.5; i++) { const t = nearTrees[i]; if (t.done || G.v < 9 || Math.abs(t.u - G.u) > 11 || Math.abs(t.u - G.u) < 4.5) continue; t.done = true; if (Math.random() > (HQ ? 0.5 : 0.3)) continue;
    for (let k = 0; k < (HQ ? 14 : 8); k++) { const a = Math.random() * 6.28, r = Math.random() * 1.8 * t.sc; pAlpha.spawn(t.x + Math.cos(a) * r, t.y + (4 + Math.random() * 6.5) * t.sc, t.z + Math.sin(a) * r, (Math.random() - 0.5) * 0.6, -0.5 - Math.random(), (Math.random() - 0.5) * 0.6, 1.2 + Math.random() * 0.6, 0.16, 0.5 + Math.random() * 0.3, 0.98, 0.99, 1, 0.6, 7, 0.8); } }
  for (const it of items) { if (it.got || it.ice || it.s < G.s - 2 || it.s > G.s + 2) continue; if (Math.abs(it.s - G.s) < 1.1 && Math.abs(it.u - G.u) < 1.05 && Math.abs(ground(it.s, it.u) + it.h - (G.y + 0.5)) < 1.25) { it.got = true; gotBone(cx(it.s) + it.u, ground(it.s, it.u) + it.h, -it.s); } }
  // ---- hints and places
  for (const o of obs) if (o.type === 'log' && o.s > G.s && o.s < G.s + 45) { hint('h_log'); break; }
  for (const r of RAMPS) if (r.s > G.s && r.s < G.s + 55) { hint('h_ramp'); break; }
  for (const b of balls) if (b.s > G.s && b.s < G.s + 50) { hint('h_ball'); break; }
  if (bridgeK(G.s + 30) > 0) hint('h_bridge');
  // ---- the avalanche: it starts far behind, keeps coming at a steady pace and gains on anyone who brakes or falls
  if (!G.av && G.s > AV0) { G.av = 1; G.avIn = 1; G.avS = G.s - 48; hint('h_aval', false); G.shake = 0.9; buzz([80, 60, 80, 60, 200]); if (audio.on) audio.rumble(2.2); }
  if (G.av === 1) { const gap = G.s - G.avS; const pace = 0.84 * Math.sqrt(Math.max(0.6, 26 * slopeAt(G.avS + 20) - 0.35) / 0.0085); G.avV = (G.avV || 16) + (clamp(pace, 9, 19) - (G.avV || 16)) * Math.min(1, dt * 0.9);      // it runs a little slower than a sledge that never brakes would here
    G.avS += Math.max(0, G.avV + Math.max(0, gap - 36) * 0.7 - Math.max(0, G.s - AV1) * 0.45) * dt; if (G.crash || G.inv > 0) G.avS = Math.min(G.avS, G.s - 30);
    G.shake = Math.max(G.shake, clamp((30 - gap) / 30, 0, 1) * 0.42); if (audio.on && Math.random() < dt * 0.9) audio.rumble(1.1);
    { const near = clamp((34 - gap) / 26, 0, 1);                                                           // the closer it is, the more snow and clods come racing past on both sides
      for (let k = 0; k < 3; k++) if (Math.random() < dt * 60 * near) { const sd = Math.random() < 0.85 ? -1 : 1, bs = G.s - 5.5 - Math.random() * 2, bu = G.u + sd * (2.6 + Math.random() * 5); pAlpha.spawn(cx(bs) + bu, ground(bs, bu) + 0.3 + Math.random() * 2.2, -bs, sd * Math.random() * 1.5, 0.6 + Math.random() * 1.8, -(G.v + 5 + Math.random() * 7), 1.1, 0.5, 2.2 + Math.random() * 1.4, 0.97, 0.98, 1, 0.6, 1, 0.3); }
      if (Math.random() < dt * 26 * near) { const sd = Math.random() < 0.5 ? -1 : 1, bs = G.s - 6, bu = G.u + sd * (1.6 + Math.random() * 4); pAlpha.spawn(cx(bs) + bu, ground(bs, bu) + 0.4, -bs, sd * Math.random() * 2, 2.5 + Math.random() * 3, -(G.v + 9 + Math.random() * 6), 1.2, 0.34, 0.26, 1, 1, 1, 1, 13, 0.2); } }
    if (gap < 3 + Math.max(0, -G.u) * 0.5 && !G.crash && !G.noHit) { G.snowed = 2.2; hurt('buried', X, G.y, Z); G.v *= 0.3; wipeout(); G.av = 2; G.avFade = 1; for (let k = 0; k < 40; k++) pAlpha.spawn(X + (Math.random() - 0.5) * 12, G.y + Math.random() * 3, Z + (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, 1 + Math.random() * 3, -4 - Math.random() * 8, 1.6, 1.5, 4.5, 0.97, 0.98, 1, 0.6, 1, 0.6); }      // it rolls over them and is spent
    if (G.s > AV1 + 50 || (G.s > AV1 && gap > 70)) { G.av = 2; G.avFade = 1; } }
  if (G.places < 1 && G.s > 620) { G.places = 1; place(T('p2')); }
  if (G.places < 2 && G.s > S1 - 30) { G.places = 2; place(T('p3')); }
  // ---- snow thrown up, the tracks, the wind
  if (!G.air) { trail.userData.acc = (trail.userData.acc || 0) + G.v * dt; if (trail.userData.acc > 0.7) { trail.userData.acc = 0; trailAdd(); }
    const n = (brake ? 60 : 10) + Math.abs(G.uv) * 9; if (Math.random() < dt * n * Math.min(1, G.v / 8)) pAlpha.spawn(X + (Math.random() - 0.5) * 0.7, G.y + 0.08, Z + 0.6, -G.uv * 0.4 + (Math.random() - 0.5) * 2, 0.8 + Math.random() * 1.8, 1 + Math.random() * 2, 0.6, 0.12, 0.6, 0.97, 0.98, 1, 0.7, 4, 1.2); }
  else trail.userData.gap = true;
  // ---- the sledge itself
  const head = Math.atan(headAt(G.s) + (G.inShort ? (uc(fk, G.s + 1) - uc(fk, G.s - 1)) / 2 : 0) + G.uv / Math.max(G.v, 6)) - G.trick; G.spin = Math.max(0, G.spin - dt * 1.1);
  if (G.crash) crashStep(dt);
  sled.position.set(X, G.y + 0.03, Z); sled.rotation.set((G.air ? clamp(-G.vy / Math.max(G.v, 8), -0.5, 0.6) : Math.atan(sl) + (brake ? -0.05 : 0)) + G.flip, Math.PI - head + G.spin * G.spin * 12.56, -G.uv * 0.035 + (G.inv > 0 ? Math.sin(G.t * 30) * 0.05 : 0));
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
      G.iceU.uFront.value = G.crackS; G.wTex.offset.x = G.t * 0.015;
      if (G.crackHold <= 0) { for (let k = 0; k < 2; k++) if (Math.random() < dt * 22) { const x = CXI + (Math.random() - 0.5) * (half(G.crackS) * 2 - 2), z = -G.crackS + 2 - Math.random() * 6; pAlpha.spawn(x, 0.05, z, (Math.random() - 0.5) * 1.5, 1.5 + Math.random() * 3, (Math.random() - 0.5), 0.6, 0.1, 0.55, 0.85, 0.93, 1, 0.75, 9, 0.5); } if (audio.on && Math.random() < dt * 2.2) audio.crack(); }
      if (s < G.crackS - 2.6 && P.fall <= 0 && G.inv <= 0 && !G.noHit) { dunk({ x: P.x, z: P.z, r: 1.2 }); P.rx = P.x; P.rz = -(Math.min(CR1, G.crackS) + 8); G.crackHold = 2.4; } } }
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
  if (G.av) { const f = G.av === 1 ? 1 : (G.avFade = Math.max(0, G.avFade - dt * 0.45)), TS = 0.5; G.avIn = Math.max(0, (G.avIn || 0) - dt * 0.4);      // TS: how obliquely the wall meets the run
    G.avL.forEach((q, i) => { q.m.visible = f > 0; if (f <= 0) return; const L = (i - 5) * 6.2 + q.off, sL = G.avS + L, h = half(sL), u = -h - L * TS - 2.5 - G.avIn * G.avIn * 34 + (L < 0 ? Math.min(-L * 0.35, h) : 0), x = cx(sL) + u, gy = ground(sL, u);
      q.m.position.set(x, gy + q.sy * (0.35 * f - (1 - f) * 0.9) + Math.sin(G.t * 3 + q.ph) * 0.4, -sL); q.m.scale.set(q.sx, q.sy * (0.75 + 0.25 * Math.sin(G.t * 2.3 + q.ph)), q.sx); q.m.rotation.set(G.t * q.spin + q.ph, q.ph, -G.t * q.spin * 0.7);
      if (G.av === 1 && Math.random() < dt * 5) { pAlpha.spawn(x + 2 + Math.random() * 3, gy + q.sy * (0.5 + Math.random() * 0.9), -sL + (Math.random() - 0.5) * 6, 3 + Math.random() * 4, 2 + Math.random() * 4, -(G.avV * 0.6), 1.5, 2.2, 6 + Math.random() * 3, 0.97, 0.98, 1, 0.55, 0.6, 0.5); if (Math.random() < 0.5) pAlpha.spawn(x + 3, gy + 1, -sL, 5 + Math.random() * 6, 3 + Math.random() * 5, -(G.avV * 0.7) + (Math.random() - 0.5) * 4, 1.2, 0.5, 0.35, 1, 1, 1, 1, 14, 0.2); } }); }
  // the snowball fight
  if (play && G.phase === 'sled') for (const kd of kids) { const ds = kd.s - G.s; kd.hop = Math.max(0, kd.hop - dt * 3); kd.m.position.y = kd.y + Math.sin(kd.hop * Math.PI) * 0.25; if (ds < 40 && ds > 0) hint('h_fight');
    kd.cd -= dt; if (ds < 34 && ds > 5 && kd.cd <= 0 && !G.crash) { const q = shots.find((z) => !z.on); if (!q) continue; kd.cd = 1.15 + Math.random() * 0.6; kd.hop = 1; const Tf = 0.8 + ds * 0.012, sT = G.s + G.v * Tf, uT = G.u + G.uv * Tf * 0.5 + (Math.random() - 0.5) * 1.5, tx = cx(sT) + uT, ty = ground(sT, uT) + 0.55, tz = -sT;
      q.on = true; q.m.visible = true; q.m.position.set(kd.m.position.x, kd.y + 1.4, kd.m.position.z); q.vx = (tx - q.m.position.x) / Tf; q.vz = (tz - q.m.position.z) / Tf; q.vy = (ty - q.m.position.y) / Tf + 7 * Tf; if (audio.on) audio.whoosh(); } }
  for (const q of shots) if (q.on) { q.vy -= 14 * dt; q.m.position.x += q.vx * dt; q.m.position.y += q.vy * dt; q.m.position.z += q.vz * dt; q.m.rotation.x += dt * 9; const sp = -q.m.position.z, gy2 = ground(sp, q.m.position.x - cx(sp));
    if (G.phase === 'sled' && play && !G.crash && Math.hypot(q.m.position.x - sled.position.x, q.m.position.z - sled.position.z) < 0.85 && Math.abs(q.m.position.y - sled.position.y - 0.55) < 0.9 && !G.noHit) { q.on = false; q.m.visible = false; G.snowed = 1.1; G.v *= 0.9; G.shake = Math.max(G.shake, 0.3); pick(T('splat')); buzz(60); snowPuff(sled.position.x, sled.position.y + 0.6, sled.position.z, 16, 4); if (audio.on) { audio.land(); audio.burst(1800, 1, 0.12, 0.2, 'highpass'); } }
    else if (q.m.position.y < gy2) { q.on = false; q.m.visible = false; snowPuff(q.m.position.x, gy2, q.m.position.z, 6, 2.5); } }
  { const hz = G.av === 1 && G.phase === 'sled' && play ? clamp((9 - (G.s - G.avS)) / 6, 0, 1) : 0; if (hz !== G.hazeK) { G.hazeK = hz; G.haze.style.opacity = hz.toFixed(2); } }
  if (G.snowed > 0 || G.splatOn) { G.snowed = Math.max(0, G.snowed - dt); const o = Math.min(1, G.snowed / 0.7); G.splatOn = o > 0; G.splat.style.opacity = o.toFixed(2); }
  // the rooks take off as the sledge comes up the take-off, and beat along over the landing hill at the height of its flight
  { const fk = FORKS[1], on = G.phase === 'sled' && (play || G.mode === 'over') && G.inShort && forkAt(G.s) === fk && G.s > JUMP - 40; if (on && !G.birdT) { G.birdT = 0.001; if (audio.on) for (let k = 0; k < 3; k++) audio.tone(520 - k * 60, 0.16, 'sawtooth', 0.05, 0.75, 0.5 + k * 0.33); }
    if (G.birdT) { G.birdT += dt; const yb = ground(JUMP, uc(fk, JUMP)); for (const b of birds) { const sB = JUMP + b.ds + G.birdT * b.sp, uB = uc(fk, Math.min(sB, fk.b - 1)) + b.du + Math.sin(G.birdT * 0.9 + b.ph) * 0.6, fl = Math.sin(G.t * 11 + b.ph);
        b.g.visible = G.birdT < 9; b.g.position.set(cx(sB) + uB, yb - (sB - JUMP) * 0.17 + b.dy + Math.sin(G.t * 2 + b.ph) * 0.4 + fl * 0.08, -sB); b.g.rotation.set(0, Math.PI - Math.atan(headAt(sB)), Math.sin(G.t * 1.3 + b.ph) * 0.15); b.wl.rotation.z = fl * 0.75; b.wr.rotation.z = -fl * 0.75; } } }
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
      SUN.set(0.5, lerp(0.36, 0.045, dk), -0.62).normalize(); G.sky.material.uniforms.sunPosition.value.copy(SUN); G.cloudU.uLit.value.setRGB(1, lerp(0.99, 0.62, dk), lerp(0.97, 0.42, dk)); G.cloudU.uShade.value.setRGB(lerp(0.6, 0.3, dk), lerp(0.68, 0.3, dk), lerp(0.8, 0.46, dk)); G.glintU.value = 1 - dk * 0.8;
      sun.color.setRGB(1, lerp(0.9, 0.5, dk), lerp(0.77, 0.3, dk)); sun.intensity = lerp(2.6, 0.75, dk); hemi.intensity = lerp(0.55, 0.3, dk); hemi.color.setRGB(lerp(0.77, 0.42, dk), lerp(0.86, 0.47, dk), lerp(1, 0.8, dk));
      scene.environmentIntensity = lerp(0.55, 0.2, dk); scene.fog.color.setRGB(lerp(0.81, 0.4, dk), lerp(0.86, 0.38, dk), lerp(0.93, 0.5, dk)); fogUniforms.uFogColor.value.copy(scene.fog.color);
      G.winMat.color.setRGB(0.25 + 5.5 * dk, 0.18 + 3.4 * dk, 0.08 + 1.1 * dk); G.houseLight.intensity = 40 * dk; fireLight.distance = lerp(22, 40, dk); } }
  G.iceU.uT.value = G.t;
  for (const f of fire.userData.flames) { const q = 0.75 + Math.random() * 0.5; f.scale.set(q, 0.7 + Math.random() * 0.7, q); } fireLight.intensity = (22 + Math.random() * 9) * (1 + 2.2 * Math.max(0, G.dusk));
  if (Math.random() < dt * 22) pAdd.spawn(FX + (Math.random() - 0.5) * 0.5, fire.position.y + 0.8, FZ + (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.8, 1.6 + Math.random() * 2, (Math.random() - 0.5) * 0.8, 1.2, 0.07, 0.02, 6, 2.4, 0.4, 1, -0.6, 0.3);
  if (Math.random() < dt * 9) pAlpha.spawn(FX, fire.position.y + 1.6, FZ, 0.3, 1.2 + Math.random(), 0, 3.2, 0.5, 2.6, 0.62, 0.62, 0.66, 0.3, -0.2, 0.2);
  for (const q of G.smoke) if (Math.abs(-q.z - prog()) < 170 && Math.random() < dt * 4) pAlpha.spawn(q.x, q.y, q.z, 0.5, 0.9 + Math.random() * 0.6, 0, 4.5, 0.5, 3.2, 0.82, 0.82, 0.86, 0.3, -0.15, 0.2);
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
  else if (G.phase === 'sled') { px = cx(G.s) + G.u; py = G.y; pz = -G.s; const hd = Math.atan(headAt(G.s)), back = (G.av === 1 ? 4.2 : 5.4) + tall * 3 + G.v * (G.av === 1 ? 0.04 : 0.07), cs = G.s - back * Math.cos(hd), cu = G.u * (G.inShort ? 1 : 0.75), cxw = cx(cs) + cu;
    tmpV.set(cxw, Math.max(py + 2.1 + tall, ground(cs, cu) + 1.5), -cs); camera.position.lerp(tmpV, Math.min(1, dt * 7)); camera.position.x += (Math.random() - 0.5) * sh; camera.position.y += (Math.random() - 0.5) * sh;
    const ls = G.s + 9, lu = G.inShort ? uc(forkAt(G.s) || FORKS[0], ls) + (G.u - uc(forkAt(G.s) || FORKS[0], G.s)) : G.u * 0.6; const avLook = G.av === 1 ? 3.2 * clamp((60 - (G.s - G.avS)) / 40, 0, 1) : 0; camera.position.x += avLook * 0.35 * Math.min(1, dt * 7); camera.lookAt(cx(ls) + lu - avLook, trackY(ls) + (G.inShort ? ground(G.s, G.u) - trackY(G.s) : 0) + 1.1, -ls); camera.rotateZ(-G.uv * 0.012); }
  else { px = P.x; py = 0; pz = P.z; const ck2 = G.crackOn && -P.z < CR1 + 6 ? 1 : 0; G.camK = (G.camK || 0) + (ck2 - (G.camK || 0)) * Math.min(1, dt * 2); const q = G.camK;      // over the breaking ice the camera rises and drops back, so the water closing in behind stays in sight
    camera.position.lerp(tmpV.set(lerp(P.x, CXI, 0.25), 5.2 + tall * 2 + q * 3.2, P.z + 8.2 + tall * 2.5 + q * 5.5), Math.min(1, dt * 5)); camera.position.x += (Math.random() - 0.5) * (sh + q * 0.05); camera.lookAt(lerp(P.x, CXI, 0.15), 0.4, P.z - 6 + q * 3.5); }
  const fov = 62 + (tall ? 8 : 0) + (G.phase === 'sled' && play ? clamp((G.v - 12) * 0.75, 0, 14) + (G.av === 1 ? clamp((40 - (G.s - G.avS)) * 0.25, 0, 7) : 0) : 0); if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 3); camera.updateProjectionMatrix(); }
  G.sky.position.copy(camera.position); G.clouds.position.copy(camera.position); G.cloudU.uTime.value = G.t; flakeU.uCam.value.copy(camera.position); flakeU.uSize.value = renderer.domElement.height / 700;
  sun.target.position.set(px, py, pz - 6); sun.position.copy(sun.target.position).addScaledVector(SUN, 90);
  hud(); if (hintT > 0) { hintT -= dt; if (hintT <= 0) $('hint').style.opacity = 0; } if (pickT > 0) { pickT -= dt; if (pickT <= 0) $('pick').style.opacity = 0; }
  if (audio.on) { audio.musicRun({ play, soft: win, stage: G.phase === 'ice' ? 1 : 0 }); if (audio.wind) audio.wind.g.gain.setTargetAtTime(play && G.phase === 'sled' ? 0.05 + G.v * 0.012 : 0.06, audio.ctx.currentTime, 0.3); }
}
// plays the level by itself (testing): follows the clear line and brakes on the hill; on the ice keeps its speed down and steers round what is dangerous
function bot() {
  if (G.phase === 'sled') { let next = rows.find((r) => r.s > G.s + 2), prev = null; for (const r of rows) { if (r.s <= G.s + 2) prev = r; } const tgt = next ? (prev ? lerp(prev.safe, next.safe, clamp((G.s - prev.s) / (next.s - prev.s), 0, 1) ** 0.6) : next.safe) : 0;
    input.x = clamp((tgt - G.u) * 0.9 - G.uv * 0.25, -1, 1); input.brake = G.v > 19 && G.s < S1 - 40 && G.av !== 1; if (next && next.log && next.s - G.s < G.v * 0.3 && !G.air) hop(); return; }
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
  G.splat = document.createElement('div'); G.splat.style.cssText = 'position:fixed;inset:0;pointer-events:none;opacity:0;z-index:4;background:radial-gradient(ellipse 34% 30% at 30% 38%, #fff 0, rgba(255,255,255,.96) 55%, rgba(255,255,255,0) 100%),radial-gradient(ellipse 30% 34% at 68% 30%, #fff 0, rgba(255,255,255,.95) 50%, rgba(255,255,255,0) 100%),radial-gradient(ellipse 40% 30% at 56% 70%, #fff 0, rgba(255,255,255,.95) 50%, rgba(255,255,255,0) 100%),radial-gradient(ellipse 22% 26% at 14% 76%, #fff 0, rgba(255,255,255,.9) 50%, rgba(255,255,255,0) 100%),radial-gradient(ellipse 20% 22% at 88% 66%, #fff 0, rgba(255,255,255,.9) 50%, rgba(255,255,255,0) 100%)'; document.body.appendChild(G.splat);
  G.haze = document.createElement('div'); G.haze.style.cssText = 'position:fixed;inset:0;pointer-events:none;opacity:0;z-index:4;box-shadow:inset 0 -60px 190px 70px rgba(255,255,255,.95)'; document.body.appendChild(G.haze);      // the avalanche's snow cloud creeping in from the edges of the screen
  reset(); G.mode = 'title'; applyLang();
  $('start').addEventListener('click', startGame);
  $('lang').addEventListener('click', () => { lang = lang === 'pl' ? 'en' : 'pl'; applyLang(); });
  $('again').addEventListener('click', () => { const bt = G.bot; toTitle(); G.bot = bt; startGame(); });
  $('menu').addEventListener('click', toTitle);
  step(0.016); renderer.compile(scene, camera); draw();
  window.__sled = { G, P, Mi, obs, rows, items, balls, haz, skaters, deer, kids, shots, AV0, AV1, TUN, BR, nearTrees, FORKS, CHUTE, CR0, uc, wipeout, input, audio, step, startGame, reset, toTitle, hop, renderer, scene, camera, cx, half, ground, S1, S2, ICE0, CXI,
    sim: (secs, dt = 1 / 60) => { for (let t = 0; t < secs; t += dt) step(dt); draw(); return { mode: G.mode, phase: G.phase, s: +prog().toFixed(0), u: +G.u.toFixed(1), v: +G.v.toFixed(1), lives: G.lives, bones: G.bones, time: +G.time.toFixed(0) }; } };
  $('title').classList.remove('hidden'); $('loading').style.opacity = 0; setTimeout(() => $('loading').remove(), 1100);
  last = performance.now(); requestAnimationFrame(frame);
}
boot().catch((e) => { console.error(e); $('loading').textContent = 'Błąd: ' + e.message; });
