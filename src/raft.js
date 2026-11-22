// Level 4 – "Spływ Narwią": Łatka and Mila ride an inflatable raft down the river from the bridge in Serock to the beach.
// The current carries them; the player steers and paddles. The river is one fixed winding channel: every point is
// (s, u) – distance downstream and offset from the middle – and x = cx(s) + u, z = -s.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createTextures, sm, lerp, clamp, rng, fbm } from './textures.js';
import { Builder, roofGeo, canvasTex, worldMat } from './kit.js';
import { buildDog } from './dog.js';
import { HQ, addFur, DOG_FUR, CAT_FUR } from './fur.js';
import { buildCat } from './cat.js';
import { Particles, fogUniforms } from './fx.js';
import { AudioSys } from './audio.js';
import { makeUniforms, patchMat, waterMat, daySky, plantTrees, leafBlob } from './real.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const $ = (id) => document.getElementById(id);
const TXT = {
  pl: {
    over: 'Poziom 4', title: 'Spływ Narwią', start: 'Odbijamy!', again: 'Jeszcze raz', menu: 'Menu',
    story: 'Łatka i Mila płyną pontonem od mostu w Serocku aż na plażę. Steruj, wiosłuj, omijaj skały, kłody i kajakarzy — i nie daj się wciągnąć wirom!',
    keys: 'A / D lub ← → — ster · ↑, W lub Spacja (można trzymać) — wiosło · M — muzyka',
    keys_t: 'Lewy kciuk w lewo / w prawo — ster · przycisk (można trzymać) — wiosło',
    time: (t) => `Czas: ${t}`, bones: (n) => `Kości: ${n}`, left: (m) => `Do plaży: ${m} m`, paddle: 'Wiosło',
    h_start: 'Nurt niesie ponton. Steruj na boki; trzymaj wiosło, żeby płynąć szybciej.', h_lane: 'Bystry nurt — tu płynie się szybciej!', h_whirl: 'Wir! Wiosłuj, żeby się wyrwać!',
    h_sand: 'Mielizna — ponton zwalnia.', h_bridge: 'Przepłyń między filarami mostu.', h_kayak: 'Uwaga, kajakarz!', h_beach: 'Widać plażę!',
    artur: ['Ahoj, Łatka!', 'Trzymajcie się, załogo!', 'Kto pierwszy na plaży?', 'Mila, nie bój się wody!'], cheatOn: 'KOD: RAFAL — supermotorówka! Prędkość ×3,5', cheatOff: 'Z powrotem na pontonie',
    arturName: 'Wujek Artur', rafalName: 'Wujek Rafał', rafal: ['Cześć, Łatka! Patrz, lecę nad wodą!', 'E-foil: zero hałasu, sama frajda!', 'Ścigamy się do plaży?', 'Mila, wskakuj na deskę!'],
    hit: 'Auć! Dziura w pontonie!', patch: 'Łatka na ponton! +1', k_place: 'Narew', p1: 'Most w Serocku', p2: 'Wielkie Zakole', p3: 'Stary Most', p4: 'Plaża',
    winT: 'Dopłynęli!', winX: (t, b, s) => `Łatka i Mila są na plaży. Czas: ${t} · kości: ${b}. ${s}`,
    loseT: 'Ponton zatonął…', loseX: (m) => `Łatka i Mila dopłynęły do brzegu wpław, ${m} m przed plażą. Spróbuj jeszcze raz!`,
  },
  en: {
    over: 'Level 4', title: 'Down the Narew', start: 'Cast off!', again: 'Again', menu: 'Menu',
    story: 'Łatka and Mila ride a raft from the bridge in Serock all the way to the beach. Steer, paddle, dodge rocks, logs and kayakers — and stay out of the whirlpools!',
    keys: 'A / D or ← → — steer · ↑, W or Space (hold) — paddle · M — music',
    keys_t: 'Left thumb left / right — steer · button (hold) — paddle',
    time: (t) => `Time: ${t}`, bones: (n) => `Bones: ${n}`, left: (m) => `To the beach: ${m} m`, paddle: 'Paddle',
    h_start: 'The current carries the raft. Steer sideways; hold the paddle to go faster.', h_lane: 'Fast water — the raft speeds up here!', h_whirl: 'A whirlpool! Paddle to break free!',
    h_sand: 'A sandbank — the raft slows down.', h_bridge: 'Pass between the piers of the bridge.', h_kayak: 'Mind the kayaker!', h_beach: 'The beach is in sight!',
    artur: ['Ahoy, Łatka!', 'Hold on tight, crew!', 'Race you to the beach!', 'Mila, the water is fine!'], cheatOn: 'CODE: RAFAL — super speedboat! Speed ×3.5', cheatOff: 'Back on the raft',
    arturName: 'Wujek Artur', rafalName: 'Wujek Rafał', rafal: ['Hi, Łatka! Look, I am flying over the water!', 'An e-foil: no noise, all fun!', 'Race you to the beach?', 'Mila, hop on the board!'],
    hit: 'Ouch! A hole in the raft!', patch: 'A patch for the raft! +1', k_place: 'Narew', p1: 'Most w Serocku', p2: 'Wielkie Zakole', p3: 'Stary Most', p4: 'Plaża',
    winT: 'They made it!', winX: (t, b, s) => `Łatka and Mila are on the beach. Time: ${t} · bones: ${b}. ${s}`,
    loseT: 'The raft sank…', loseX: (m) => `Łatka and Mila swam ashore ${m} m short of the beach. Try again!`,
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
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.2, 900);
let composer = null;
if (HQ) {                                                    // a glow around the sun and its glints on the water, slightly darker corners
  const PV = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 })); composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new ShaderPass({ uniforms: { tDiffuse: { value: null } }, vertexShader: PV, fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); c.rgb = min(max(c.rgb, 0.0), 30.0); if (!(c.r + c.g + c.b < 1e5)) c.rgb = vec3(0.0); gl_FragColor = vec4(c.rgb, 1.0); }' }));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.26, 0.6, 1.3));
  composer.addPass(new ShaderPass({ uniforms: { tDiffuse: { value: null } }, vertexShader: PV, fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); vec2 q = vUv - 0.5; float v = 1.0 - dot(q, q) * 0.65; c.rgb *= v * v; float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722)); c.rgb = mix(vec3(l), c.rgb, 1.08); gl_FragColor = vec4(max(c.rgb, 0.0), 1.0); }' }));
  composer.addPass(new OutputPass());
}
const draw = () => (composer ? composer.render() : renderer.render(scene, camera));
function resize() { const w = Math.max(2, window.innerWidth), h = Math.max(2, window.innerHeight); camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setPixelRatio(pixelRatio); renderer.setSize(w, h, false); if (composer) { composer.setPixelRatio(pixelRatio); composer.setSize(w, h); } }
window.addEventListener('resize', resize); resize();

// ------------------------------------------------------------------ the river
const END = 1500, LEN = END + 120, CH = 40, BR = [44, 830];           // BR: bridges
const cx0 = (s) => 26 * Math.sin(s * 0.0105) + 12 * Math.sin(s * 0.023 + 1.3) + 5 * Math.sin(s * 0.051 + 0.4);
const cx = (s) => (cx0(s) - cx0(0)) * sm(0, 120, s);                   // straight for the first stretch, then it starts to wind
const half = (s) => 6.4 + 1.5 * Math.sin(s * 0.013 + 2) + 4.5 * sm(END - 70, END + 30, s);
const slope = (s) => (cx(s + 1) - cx(s - 1)) / 2;
// Waves running downstream. The same formula is written out in the water's vertex shader, so what floats sits on what is drawn.
function waveH(x, z, t) {
  const s = -z, e = 1 - sm(0.55, 0.95, Math.abs(x - cx(s)) / half(s)), wob = 1.6 * Math.sin(0.07 * z + 0.31 * x), m1 = 0.6 + 0.4 * Math.sin(0.11 * z - 0.23 * x);
  return (0.23 * m1 * Math.sin(0.55 * z + 2.6 * t + 0.35 * x + wob) + 0.075 * Math.sin(1.3 * z + 4.3 * t - 0.6 * x + 1.7) + 0.12 * Math.sin(0.19 * z + 1.1 * t + 0.1 * x)) * e;
}
const WH_DEPTH = 1.25, WH_K = 1.2, whU = { value: Array.from({ length: 12 }, () => new THREE.Vector3(1e6, 1e6, 1)) };       // whirlpools: how deep, how much wider than the pull, and where (for the water shader)
function surfH(x, z, t) {
  let h = waveH(x, z, t); if (!HQ) return h;
  for (const w of whirls) { if (Math.abs(w.s + z) > 6) continue; const rr = Math.hypot(x - w.x, z + w.s) / (w.r * WH_K); if (rr < 1) h = h * sm(0.5, 1, rr) - WH_DEPTH * Math.pow(1 - rr, 2.3); }
  return h;
}
const WAVE_GLSL = `
  float rcx0(float s){ return 26.0 * sin(s * 0.0105) + 12.0 * sin(s * 0.023 + 1.3) + 5.0 * sin(s * 0.051 + 0.4); }
  float rcx(float s){ return (rcx0(s) - rcx0(0.0)) * smoothstep(0.0, 120.0, s); }
  float rhalf(float s){ return 6.4 + 1.5 * sin(s * 0.013 + 2.0) + 4.5 * smoothstep(${(1500 - 70).toFixed(1)}, ${(1500 + 30).toFixed(1)}, s); }
  float waveH(float x, float z, float t){ float s = -z, e = 1.0 - smoothstep(0.55, 0.95, abs(x - rcx(s)) / rhalf(s)), wob = 1.6 * sin(0.07 * z + 0.31 * x), m1 = 0.6 + 0.4 * sin(0.11 * z - 0.23 * x);
    return (0.23 * m1 * sin(0.55 * z + 2.6 * t + 0.35 * x + wob) + 0.075 * sin(1.3 * z + 4.3 * t - 0.6 * x + 1.7) + 0.12 * sin(0.19 * z + 1.1 * t + 0.1 * x)) * e; }`;
const PROFILE = [[-0.9, -0.55], [0, 0.03], [1.8, 0.26], [4.5, 1.0], [10, 1.45], [75, 1.9]];
const bankY = (d) => { for (let i = 1; i < PROFILE.length; i++) if (d <= PROFILE[i][0]) { const a = PROFILE[i - 1], b = PROFILE[i]; return lerp(a[1], b[1], (d - a[0]) / (b[0] - a[0])); } return 1.9; };
const BEACH = { s: END + 34 };

// ------------------------------------------------------------------ state
const G = { mode: 'load', t: 0, time: 0, s: 0, u: 0, uv: 0, v: 0, boost: 0, lives: 3, bones: 0, inv: 0, cd: 0, stroke: 0, spin: 0, shake: 0, endT: 0, hints: new Set(), bot: false, places: 0 };
const keys = {}, touch = { x: 0 }, input = { x: 0, paddle: false };
const audio = new AudioSys();
let dog, cat, tex, pAdd, pAlpha, sun, hemi, skyU, water, waterU, raft, paddles = [], boneMesh, puppies = [];
let RU, sky;
const obs = [], items = [], events = [], lanes = [], whirls = [], kayaks = [];
const A = { mode: 'off', timer: 9, s: 0, u: 0, side: 1, said: false, drop: 0, n: 0, wave: 0 };       // wujek Artur on his jet ski
const dummy = new THREE.Object3D(), tmpV = new THREE.Vector3(), tmpC = new THREE.Color();

function buildRiver() {
  RU = makeUniforms(); patchMat(worldMat, RU, { cloud: 0.36 }); const landMat = patchMat(worldMat.clone(), RU, { grain: 0.55, cloud: 0.36 }), TREES = [];
  // sky
  skyU = { uTop: { value: new THREE.Color(0.05, 0.27, 0.9) }, uHor: { value: new THREE.Color(0.6, 0.8, 1.0) }, uSun: { value: new THREE.Color(1, 0.94, 0.8) }, uSunDir: { value: new THREE.Vector3(0.35, 0.62, -0.7).normalize() }, uTime: { value: 0 } };
  const dome = new THREE.Mesh(new THREE.SphereGeometry(700, 32, 16), new THREE.ShaderMaterial({ uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false, transparent: true,
    vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uTop, uHor, uSun, uSunDir; uniform float uTime; varying vec3 vDir;
      float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
      float fb(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * vn(p); p = p * 2.07 + 7.1; a *= 0.5; } return s / 0.9375; }
      void main(){ vec3 d = normalize(vDir); vec3 c = vec3(0.0); float al = 0.0;
        float sd = max(dot(d, uSunDir), 0.0);
        if (d.y > 0.0) { vec2 q = d.xz / (d.y + 0.11) * 0.7 + vec2(uTime * 0.008, 0.0); float n = fb(q) * 0.68 + fb(q * 3.1 + 5.0) * 0.32, cov = smoothstep(0.62, 0.82, n) * smoothstep(0.0, 0.16, d.y);
          float lit = clamp((fb(q) - fb(q + normalize(uSunDir.xz) * 0.16)) * 3.2 + 0.55, 0.0, 1.0); c = mix(mix(uTop, uHor, 0.5) * 0.62, vec3(1.02, 1.0, 0.97) + uSun * pow(sd, 6.0) * 0.25, lit); al = cov * 0.93 * smoothstep(0.02, 0.14, d.y); }
        gl_FragColor = vec4(c, al);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` }));
  dome.frustumCulled = false; dome.renderOrder = -10; scene.add(dome); G.dome = dome;
  sky = daySky(renderer, scene, skyU.uSunDir.value, { gain: 0.36, size: 800, turbidity: 2, rayleigh: 3 }); scene.environmentIntensity = 0.45;
  sun = new THREE.DirectionalLight(0xfff0d8, 2.7); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = -20; sc.right = 20; sc.top = 26; sc.bottom = -16; sc.near = 1; sc.far = 140; sun.shadow.bias = -0.0007; sun.shadow.normalBias = 0.06; scene.add(sun, sun.target);
  hemi = new THREE.HemisphereLight(0xbcd8ff, 0x55683a, 0.3); scene.add(hemi);
  scene.fog = new THREE.FogExp2(0xa9c6e6, 0.0062); fogUniforms.uFogColor.value.copy(scene.fog.color); fogUniforms.uFogDensity.value = 0.0062;

  // water: one sheet that travels with the raft; ripples run downstream, the sun glints on them
  // the water is a ribbon that the vertex shader lays along the river and lifts into waves
  waterU = RU; const wg = new THREE.PlaneGeometry(2, 420, 36, isTouch ? 300 : 420); wg.rotateX(-Math.PI / 2);
  const wm = waterMat(RU, { color: 0x2c574f, flow: 1.6, scale: 1.5, strength: 0.17 }), wbase = wm.onBeforeCompile;
  wm.onBeforeCompile = (sh) => {
    wbase(sh);
    sh.vertexShader = sh.vertexShader.replace('varying vec3 vWp;', 'varying vec3 vWp; varying vec2 vGrad; varying float vWave, vEdge; uniform float uTime;' + WAVE_GLSL).replace('#include <begin_vertex>', `#include <begin_vertex>
      { float wz = position.z + modelMatrix[3].z, s = -wz, wx = rcx(s) + position.x * (rhalf(s) + 8.0); float h0 = waveH(wx, wz, uTime); vEdge = abs(position.x) * (rhalf(s) + 8.0) / rhalf(s);
        vGrad = vec2(waveH(wx + 0.3, wz, uTime) - h0, waveH(wx, wz + 0.3, uTime) - h0) / 0.3; vWave = h0; transformed.x = wx - modelMatrix[3].x; transformed.y = h0; }`);
    sh.uniforms.uWh = whU;
    sh.fragmentShader = sh.fragmentShader.replace('varying vec3 vWp;', 'varying vec3 vWp; varying vec2 vGrad; varying float vWave, vEdge; uniform vec3 uWh[12];').replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nfor (int i = 0; i < 12; i++) { if (distance(vWp.xz, uWh[i].xy) < uWh[i].z) discard; }')
      .replace('normal = normalize((viewMatrix * vec4(normalize(vec3(n2.x, 1.0, n2.y)), 0.0)).xyz);', 'normal = normalize((viewMatrix * vec4(normalize(vec3(n2.x - vGrad.x, 1.0, n2.y - vGrad.y)), 0.0)).xyz);')
      .replace('diffuseColor.rgb *= mix(1.0, 0.7, smoothstep(0.5, 0.68, cs)); }', 'diffuseColor.rgb *= mix(1.0, 0.7, smoothstep(0.5, 0.68, cs)); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.8, 0.86, 0.88), smoothstep(0.15, 0.38, vWave + (texture2D(uDetail, vWp.xz * 0.07 + vec2(0.0, uTime * 0.3)).r - 0.5) * 0.3) * 0.34); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.5, 0.52, 0.34), smoothstep(0.84, 1.12, vEdge + (texture2D(uDetail, vWp.xz * 0.11).g - 0.5) * 0.12) * 0.62); }');
  };
  wm.customProgramCacheKey = () => 'narew-waves';
  water = new THREE.Mesh(wg, wm); water.receiveShadow = true;
  water.frustumCulled = false; scene.add(water);

  // banks: a ribbon of sand rising into meadow on each side, with trees, reeds and the odd house
  const SAND = new THREE.Color(0xcdbb8c), GRASS = new THREE.Color(0x58883a), GRASS2 = new THREE.Color(0x487632), DARK = new THREE.Color(0x4a5a3a);
  const GREENS = [0x35602a, 0x436d30, 0x2f5626, 0x4c7436, 0x587a3a];
  const bladeM = patchMat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }), RU, { cloud: 0.36 }), bbase = bladeM.onBeforeCompile;
  bladeM.onBeforeCompile = (sh) => { bbase(sh); sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aTip; uniform float uTime;').replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.xz += aTip * 0.06 * vec2(sin(uTime * 1.8 + position.x * 0.9 + position.z * 0.6), cos(uTime * 1.3 + position.z * 0.8 - position.x * 0.4));'); }; bladeM.customProgramCacheKey = () => 'bankblades';
  const fadeS = (s) => (1 - sm(END - 150, END - 105, s)) * sm(30, 80, s);
  const cove = (s, side) => sm(0.56, 0.72, fbm(s / 46 + side * 9.3, 3.3, 2, 17)) * fadeS(s);                                   // here and there the bank opens into a small sandy bay
  const shore = (s, side) => (0.2 + 3.6 * Math.pow(fbm(s * 0.075 + side * 5.1, side * 2.7, 3, 31), 1.6) + cove(s, side) * 2.8) * fadeS(s);
  const edge = (s, side) => half(s) + shore(s, side);
  for (let s0 = -40; s0 < LEN; s0 += CH) {
    const BL = { pos: [], col: [], tip: [], nor: [] }, pos = [], col = [], idx = [], b = new Builder(500 + s0), r = b.r, N = CH / 2;
    for (const side of [-1, 1]) {
      const base = pos.length / 3;
      for (let i = 0; i <= N; i++) {
        const s = s0 + i * 2, beach = side > 0 ? sm(END - 90, END - 20, s) : 0, cv = cove(s, side);
        PROFILE.forEach(([d, y], j) => {
          const dd = d * (1 + beach * (j > 1 && j < 5 ? 1.6 : 0)); pos.push(cx(s) + side * (edge(s, side) + dd), y * (1 - beach * 0.55), -s);
          const c = tmpC.copy(j <= 2 ? SAND : j === 3 ? GRASS : j === 4 ? GRASS2 : GRASS).lerp(SAND, j >= 3 ? Math.max(beach * (j === 5 ? 0.25 : 1), j === 3 ? cv : j === 4 ? cv * 0.55 : 0) : 0); if (j === 0) c.copy(DARK); if (j === 1) c.multiplyScalar(0.74);
          const k = 0.92 + r() * 0.16; col.push(c.r * k, c.g * k, c.b * k);
        });
      }
      const P = PROFILE.length;
      for (let i = 0; i < N; i++) for (let j = 0; j < P - 1; j++) { const a = base + i * P + j, c = a + P; if (side > 0) idx.push(a, c, a + 1, a + 1, c, c + 1); else idx.push(a, a + 1, c, a + 1, c + 1, c); }
      // what grows and stands on this stretch of bank
      for (let k = 0; k < 15; k++) {
        const s = s0 + r() * CH, d = 3.5 + r() * r() * 44, x = cx(s) + side * (edge(s, side) + d), y = bankY(d) - 0.05, q = r();
        if ((side > 0 && s > END - 95 && d < 20) || (cove(s, side) > 0.5 && d < 9) || (HQ && side > 0 && s > 64 && s < 112 && d < 26)) continue;      // keep the beaches clear
        if (q < 0.4) TREES.push([x, y, -s, 1, (5 + r() * 5) / 13.5]);
        else if (q < 0.8) TREES.push([x, y, -s, r() < 0.8 ? 0 : 2, 0.42 + r() * 0.42]);
        else { for (let i = 0; i < 3; i++) { const rr = 0.6 + r() * 0.5; b.add(leafBlob(rr, 0.75, 3 + k + i, 1), GREENS[(r() * 5) | 0], x + (r() - 0.5) * 2, y + 0.4, -s + (r() - 0.5) * 2, r() * 3, 0.12); } }
      }
      for (let k = 0; k < 8; k++) {                                                            // the waterline: lily pads in the calm water, pebbles, tufts of grass, a bush leaning over, driftwood
        const s = s0 + r() * CH; if (side > 0 && s > END - 100) continue; const e = edge(s, side), sh = shore(s, side), cvk = cove(s, side);
        if (sh > 0.9) for (let i = 0, n = 3 + ((r() * 4) | 0); i < n; i++) { const lg = new THREE.CircleGeometry(0.15 + r() * 0.13, 9, 0.35, 5.8); lg.rotateX(-Math.PI / 2); const lx = cx(s) + side * (e - 0.25 - r() * Math.min(2.4, sh - 0.3)), lz = -s + (r() - 0.5) * 2.2; b.add(lg, [0x3f7a34, 0x4c8a3a, 0x356b2c][i % 3], lx, 0.04, lz, r() * 6, 0.08); if (r() < 0.22) b.blob(0.07, lx, 0.09, lz, 0xf6f2ee, 0.7); }
        for (let i = 0; i < 3; i++) b.blob(0.1 + r() * 0.16, cx(s) + side * (e - 0.3 + r() * 1.1), 0.04, -s + (r() - 0.5) * 3, [0x8a877f, 0x9a958a, 0x74716a][i], 0.6);
        if (cvk < 0.5) { for (let i = 0; i < 4; i++) { const d = 0.7 + r() * 2.6; b.cone(0.1 + r() * 0.08, 0.3 + r() * 0.35, cx(s) + side * (e + d), bankY(d) - 0.03, -s + (r() - 0.5) * 3, i % 2 ? 0x5a8a3c : 0x6a9644, 5); }
          if (r() < 0.3) { const d = 0.9 + r() * 1.4, rr = 0.6 + r() * 0.5; b.add(leafBlob(rr, 0.8, 7 + k, 1), GREENS[(r() * 5) | 0], cx(s) + side * (e + d), bankY(d) + rr * 0.45, -s + (r() - 0.5) * 2, r() * 3, 0.12); } }
        else if (r() < 0.4) { const d = 1 + r() * 2, lg = new THREE.CylinderGeometry(0.09, 0.12, 1.6 + r(), 7); lg.rotateZ(Math.PI / 2); b.add(lg, 0x8a7458, cx(s) + side * (e + d), bankY(d) + 0.08, -s, r() * 3, 0.06); }
      }
      if (HQ) for (let i = 0, n = isTouch ? 220 : 620; i < n; i++) {                           // blades of grass down the bank
        const s = s0 + r() * CH, d = 0.8 + r() * r() * 13; if ((side > 0 && s > END - 100) || cove(s, side) > 0.35 || (side > 0 && s > 78 && s < 99 && d < 17)) continue;
        const x = cx(s) + side * (edge(s, side) + d), y = bankY(d) - 0.06, z = -s, k = 0.6 + r() * 0.6;
        for (let j = 0; j < 3; j++) { const a = r() * 6.28, h = 0.14 + r() * 0.24, w = 0.024 + r() * 0.022, bx = x + (r() - 0.5) * 0.22, bz = z + (r() - 0.5) * 0.22, lx = (r() - 0.5) * 0.14, lz = (r() - 0.5) * 0.14, c = Math.cos(a) * w, sn = Math.sin(a) * w, cr = 0.095 * k, cg = 0.24 * k, cb = 0.04 * k;
          for (const fl of [0, 1]) { if (fl) BL.pos.push(bx + c, y, bz + sn, bx - c, y, bz - sn, bx + lx, y + h, bz + lz); else BL.pos.push(bx - c, y, bz - sn, bx + c, y, bz + sn, bx + lx, y + h, bz + lz); BL.col.push(cr * 0.6, cg * 0.6, cb * 0.6, cr * 0.6, cg * 0.6, cb * 0.6, cr * 1.3, cg * 1.35, cb * 1.2); BL.tip.push(0, 0, 1); BL.nor.push(0, 1, 0, 0, 1, 0, 0, 1, 0); } }
      }
      if (HQ) for (let k = 0; k < 5; k++) {                                                    // thickets: willow scrub and tall rushes crowding right down to the water, hiding the line of the bank
        const s = s0 + r() * CH; if ((side > 0 && s > END - 105) || cove(s, side) > 0.45 || s < 60 || (side > 0 && s < 114)) continue; const len = 3 + r() * 5, e0 = edge(s, side);
        for (let i = 0, n = 5 + ((r() * 5) | 0); i < n; i++) { const ss = s + (i / n - 0.5) * len + (r() - 0.5) * 0.8, e = edge(ss, side), d = -0.5 + r() * 2.4, rr = 0.55 + r() * 0.75; b.add(leafBlob(rr, 0.8 + r() * 0.5, 11 + i + k, 1), GREENS[(r() * 5) | 0], cx(ss) + side * (e + d), Math.max(0.1, bankY(Math.max(0, d))) + rr * 0.42, -ss, r() * 3, 0.14); }
        for (let i = 0; i < 16; i++) { const ss = s + (r() - 0.5) * len, e = edge(ss, side), x = cx(ss) + side * (e - 0.9 + r() * 1.3), h = 1.1 + r() * 1.3; b.cone(0.055, h, x, -0.05, -ss, i % 3 ? 0x6f9a48 : 0x86a552, 4); if (i % 4 === 0) b.cyl(0.05, 0.05, 0.24, x, h * 0.84, -ss, 0x5a3c22, 5); }
        if (r() < 0.5) TREES.push([cx(s) + side * (e0 + 1.6 + r() * 1.5), bankY(2) - 0.05, -s, 0, 0.3 + r() * 0.16]);
      }
      for (let k = 0; k < 13; k++) {                                                           // reeds at the water's edge
        const s = s0 + r() * CH; if (side > 0 && s > END - 95) continue;
        if (cove(s, side) > 0.6) continue; const x0 = cx(s) + side * (edge(s, side) - 0.5 + r() * 0.9); for (let i = 0; i < 5; i++) { const x = x0 + (r() - 0.5) * 0.9, z = -s + (r() - 0.5) * 1.6, h = 0.9 + r() * 0.9; b.cone(0.05, h, x, 0, z, 0x6f9a48, 4); if (i % 2) b.cyl(0.045, 0.045, 0.22, x, h * 0.86, z, 0x5a3c22, 5); }
      }
      if (r() < 0.3 && !(side > 0 && s0 > END - 140)) {                                        // a house up on the bank, sometimes with a jetty below it
        const s = s0 + 8 + r() * 24, d = 16 + r() * 10, x = cx(s) + side * (edge(s, side) + d), y = bankY(d) - 0.1, wall = [0xeadcbe, 0xf3efe4, 0xe7c98c, 0xcfd8cf][(r() * 4) | 0];
        b.box(7, 3, 6, x, y, -s, wall, 0, 0.03); b.add(roofGeo(7.8, 2.4, 6.9), [0x9a3b2e, 0x80402f, 0x55565c][(r() * 3) | 0], x, y + 3, -s, 0, 0.04); b.box(1.1, 1.2, 0.08, x - 1.8, y + 1.2, -s + 3.02, 0x2c3f52, 0, 0); b.box(1.1, 1.2, 0.08, x + 1.8, y + 1.2, -s + 3.02, 0x2c3f52, 0, 0);
        const jx = cx(s) + side * (edge(s, side) - 0.6); b.box(3.6, 0.12, 1.3, jx, 0.35, -s, 0x8a6a45); for (const dx of [-1.5, 1.5]) for (const dz of [-0.5, 0.5]) b.cyl(0.07, 0.07, 1.0, jx + dx, -0.5, -s + dz, 0x5d4632, 6);
      }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    const bank = new THREE.Mesh(g, landMat); bank.receiveShadow = true; scene.add(bank);
    if (BL.pos.length) { const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(BL.pos, 3)); bg.setAttribute('color', new THREE.Float32BufferAttribute(BL.col, 3)); bg.setAttribute('normal', new THREE.Float32BufferAttribute(BL.nor, 3)); bg.setAttribute('aTip', new THREE.Float32BufferAttribute(BL.tip, 1)); const bm = new THREE.Mesh(bg, bladeM); bm.receiveShadow = true; scene.add(bm); }
    if (!b.empty) scene.add(b.mesh());
  }
  if (HQ) {                                                  // Tawerna Cicha Zatoka: fried fish on a terrace over the water, just past the first bridge, on the right
    const s = 88, e = edge(s, 1), X = (d) => cx(s) + e + d, Z = (dz) => -s + dz, tb = new Builder(970), DARK = 0x5d4632, DY = 1.25, skin = 0xe8b890;
    tb.box(10.5, 0.2, 15, X(3.2), DY - 0.2, Z(0), 0xa98454, 0, 0.05); for (const dx of [-1.6, 3, 7.8]) for (const dz of [-7, 0, 7]) tb.cyl(0.13, 0.15, 2.2, X(dx), -1, Z(dz), DARK, 6);                         // the terrace on its posts
    for (let i = 0; i < 15; i++) tb.box(0.06, 0.02, 15, X(-1.7 + i * 0.72), DY + 0.005, Z(0), 0x7a5a36, 0, 0);
    for (const dz of [-7.4, -3.7, 0, 3.7, 7.4]) tb.box(0.1, 0.95, 0.1, X(-1.95), DY, Z(dz), DARK, 0, 0); for (const y of [0.45, 0.92]) tb.box(0.06, 0.07, 15, X(-1.95), DY + y, Z(0), DARK, 0, 0);                    // railing on the river side
    tb.box(7.4, 3.3, 11, X(12), 1.35, Z(0), 0xb98a5c, 0, 0.04); for (let i = 0; i < 7; i++) tb.box(0.03, 0.04, 11, X(8.29), 1.7 + i * 0.44, Z(0), 0x8a6238, 0, 0); tb.add(roofGeo(9.2, 2.7, 12.6), 0x8a3528, X(12), 4.65, Z(0), 0, 0.05);     // the house of planks under a red roof
    tb.box(0.08, 2.1, 1.1, X(8.27), 1.35, Z(3.6), 0x4a3524, 0, 0); for (const dz of [-3.2, 0.2]) { tb.box(0.08, 1.2, 1.6, X(8.27), 2.45, Z(dz), 0xf4f1ea, 0, 0); tb.box(0.09, 1.0, 1.4, X(8.25), 2.55, Z(dz), 0xffc97a, 0, 0); }    // door and lit windows
    tb.box(1.3, 1.0, 2.6, X(7.4), DY, Z(-5.6), 0x3a3d42, 0, 0.03); tb.box(1.1, 0.12, 2.4, X(7.4), DY + 1.0, Z(-5.6), 0x1c1c20, 0, 0); tb.cyl(0.16, 0.16, 2.6, X(7.9), DY + 1.1, Z(-6.5), 0x4a4d52, 8); for (let i = 0; i < 4; i++) tb.blob(0.14, X(7.3 + (i % 2) * 0.3), DY + 1.2, Z(-6.2 + i * 0.4), 0xd9a441, 0.5);   // the fryer
    [[0.6, -4.6, 0xd8342c], [0.6, 0, 0x2f6fb0], [0.6, 4.6, 0xf2c21c], [4.6, -2.3, 0x2a9d5c], [4.6, 2.4, 0xd8342c]].forEach(([dx, dz, col], ti) => {
      tb.box(1.0, 0.07, 1.9, X(dx), DY + 0.75, Z(dz), 0xc9a877, 0, 0.03); for (const a of [-0.7, 0.7]) { tb.box(0.08, 0.75, 0.08, X(dx), DY, Z(dz + a), DARK, 0, 0); }
      for (const sd of [-1, 1]) { tb.box(0.34, 0.06, 1.8, X(dx + sd * 0.82), DY + 0.44, Z(dz), 0xa98454, 0, 0.03); for (const a of [-0.7, 0.7]) tb.box(0.06, 0.44, 0.3, X(dx + sd * 0.82), DY, Z(dz + a), DARK, 0, 0); }
      tb.cyl(0.035, 0.035, 2.5, X(dx), DY + 0.75, Z(dz), 0xd8d0c0, 6); tb.cone(1.5, 0.55, X(dx), DY + 3.1, Z(dz), col, 10);                                                                                              // parasol
      for (const a of [-0.5, 0.5]) { tb.cyl(0.17, 0.17, 0.03, X(dx), DY + 0.8, Z(dz + a), 0xf4f4f0, 10); const fg = new THREE.SphereGeometry(0.1, 8, 6); fg.scale(1.7, 0.4, 0.8); tb.add(fg, 0xd9902a, X(dx), DY + 0.86, Z(dz + a), ti + a, 0.05); }      // plates of fried fish
      for (const [sd, a] of [[-1, -0.45], [1, 0.45], [ti % 2 ? -1 : 1, 0.5 * (ti % 2 ? 1 : -1)]].slice(0, ti === 1 ? 2 : 3)) { const px = X(dx + sd * 0.82), pz = Z(dz + a), c2 = [0x2c5fa8, 0xc0392b, 0xf2efe8, 0x2f6b3a, 0xd98a2a][(ti * 2 + (sd > 0 ? 1 : 0)) % 5];
        tb.add(new THREE.CapsuleGeometry(0.19, 0.38, 4, 8), c2, px, DY + 0.85, pz, 0, 0.03); tb.add(new THREE.SphereGeometry(0.15, 10, 8), skin, px, DY + 1.36, pz, 0, 0.02); const hg = new THREE.SphereGeometry(0.16, 10, 6, 0, 6.3, 0, 1.7); tb.add(hg, [0x4a3320, 0xd8b45a, 0x22201e, 0xb9b9b9][(ti + (sd > 0 ? 2 : 0)) % 4], px, DY + 1.38, pz, 0, 0.04);
        tb.add(new THREE.CapsuleGeometry(0.1, 0.4, 4, 6).rotateZ(Math.PI / 2), 0x34507a, px - sd * 0.25, DY + 0.52, pz, 0, 0.03); }                                                                                      // guests on the benches
    });
    { const hull = new THREE.SphereGeometry(1, 12, 8, 0, 6.3, 1.57, 1.57); hull.scale(0.75, 0.5, 2.1); tb.add(hull, 0x2f6fb0, X(-3.4), 0.42, Z(5.2), 0.15, 0.03); tb.box(1.3, 0.05, 0.25, X(-3.4), 0.3, Z(5.2), 0xc9a877, 0.15, 0); }                       // a rowing boat moored below
    for (let i = 0; i < 9; i++) tb.blob(0.07, X(-1.95), DY + 2.5 - Math.sin(i / 8 * Math.PI) * 0.35, Z(-7.2 + i * 1.8), [0xffd27a, 0xff8a5a, 0x9ad0ff][i % 3], 1);                                                                          // a string of lights
    for (const dz of [-7.3, 7.3]) tb.cyl(0.05, 0.06, 2.6, X(-1.95), DY, Z(dz), DARK, 6);
    for (const dx of [-0.6, 5.8]) tb.cyl(0.11, 0.13, 6.9, X(dx), 0.2, Z(9.6), DARK, 6);                                                                                                                                     // the posts of the big sign
    scene.add(tb.mesh());
    const board = (w, h) => canvasTex(1024, Math.round(1024 * h / w), (c, W, H) => {
      c.fillStyle = '#17324d'; c.fillRect(0, 0, W, H); c.strokeStyle = '#f2dca0'; c.lineWidth = 12; c.strokeRect(14, 14, W - 28, H - 28); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#f2dca0';
      c.font = `bold ${H * 0.2}px Georgia, serif`; c.fillText('T A W E R N A', W / 2, H * 0.22); c.font = `bold italic ${H * 0.36}px Georgia, serif`; c.fillStyle = '#ffffff'; c.fillText('Cicha Zatoka', W / 2, H * 0.53); c.font = `${H * 0.13}px Georgia, serif`; c.fillStyle = '#f2dca0'; c.fillText('smażona ryba prosto z Narwi', W / 2, H * 0.83);
      for (const sx of [0.1, 0.9]) { c.save(); c.translate(W * sx, H * 0.24); c.scale(sx < 0.5 ? 1 : -1, 1); c.fillStyle = '#f2b23a'; c.beginPath(); c.ellipse(0, 0, H * 0.13, H * 0.06, 0, 0, 6.3); c.fill(); c.beginPath(); c.moveTo(-H * 0.11, 0); c.lineTo(-H * 0.2, -H * 0.07); c.lineTo(-H * 0.2, H * 0.07); c.fill(); c.fillStyle = '#17324d'; c.beginPath(); c.arc(H * 0.07, -H * 0.012, H * 0.012, 0, 6.3); c.fill(); c.restore(); }
    });
    const mkSign = (w, h, x, y, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: board(w, h), side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); };
    mkSign(8.4, 3.0, X(2.6), 5.9, Z(9.6), -0.42);            // faces the raft as it comes out from under the bridge
    mkSign(6.4, 2.3, X(8.2), 5.6, Z(0), -Math.PI / 2);       // and one on the roof, facing the river
    G.tavern = { x: X(7.9), y: DY + 3.8, z: Z(-6.5), s };
  }
  if (HQ) {                                                  // ducks keeping to the banks, and one fish that keeps jumping
    G.ducks = []; [140, 250, 395, 540, 700, 905, 1080, 1260, 1390].forEach((ds, i) => { const sd = i % 2 ? 1 : -1; for (let k = 0; k < 2; k++) { const db = new Builder(990 + i * 2 + k), male = k === 0, body = new THREE.SphereGeometry(0.2, 10, 8); body.scale(1, 0.75, 1.55); db.add(body, male ? 0x9a8f84 : 0x8a6a48, 0, 0.1, 0, 0, 0.04); db.add(new THREE.SphereGeometry(0.1, 10, 8), male ? 0x1f5a3a : 0x7a5a3c, 0, 0.3, 0.24, 0, 0.03); db.box(0.07, 0.03, 0.12, 0, 0.28, 0.36, 0xe0a82a, 0, 0); db.box(0.12, 0.1, 0.12, 0, 0.16, -0.3, male ? 0x2a2a2e : 0x6b4a32, 0, 0); const m = db.mesh(); scene.add(m); G.ducks.push({ m, s: ds + k * 0.9, sd, ph: i * 1.7 + k }); } });
    const fg = new THREE.SphereGeometry(0.12, 10, 8); fg.scale(0.55, 1, 2.4); G.fish = new THREE.Mesh(fg, new THREE.MeshStandardMaterial({ color: 0xb9c4cc, roughness: 0.25, metalness: 0.7 })); G.fish.visible = false; scene.add(G.fish); G.fishT = 3;
  }
  plantTrees(scene, TREES, patchMat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94 }), RU, { cloud: 0.36 }), rng(321), 1.15);
  // the bridges: a deck high over the water on piers that have to be passed between
  BR.forEach((s, bi) => {
    const b = new Builder(900 + bi), x = cx(s), w = half(s) * 2 + 34, col = bi ? 0x8a6a4a : 0xb9b4aa;
    b.box(w, 0.7, 6.5, x, 4.6, -s, col); b.box(w, 0.9, 0.25, x, 5.3, -s - 3.1, bi ? 0x6a4a34 : 0x7d8791); b.box(w, 0.9, 0.25, x, 5.3, -s + 3.1, bi ? 0x6a4a34 : 0x7d8791);
    for (const u of bi ? [-2.6, 2.6] : [-4.2, 4.2]) { b.cyl(0.85, 1.0, 6, x + u, -1, -s, bi ? 0x6f5a48 : 0x9a968d, 12); b.box(2.6, 0.5, 6.6, x + u, 4.2, -s, bi ? 0x6f5a48 : 0x9a968d); obs.push({ type: 'pier', s, u, r: 1.0 }); }
    for (const sd of [-1, 1]) b.box(8, 5.2, 6.5, x + sd * (half(s) + 5), 0, -s, bi ? 0x6f5a48 : 0x9a968d);
    scene.add(b.mesh());
  });
  // the beach at the end: parasols, a towel or two, and a banner
  { const b = new Builder(950), s = BEACH.s, x = cx(s) + half(s);
    for (const [dx, dz, c] of [[6, -8, 0xe2402f], [10, 4, 0x2f8fe0], [5, 12, 0xf2c230]]) { b.cyl(0.04, 0.04, 2.3, x + dx, 0.2, -s + dz, 0xd8d0c0, 6); b.cone(1.4, 0.6, x + dx, 2.3, -s + dz, c, 10); b.box(1.9, 0.04, 0.9, x + dx + 0.6, 0.22, -s + dz + 0.9, 0xf2efe6, 0.4); }
    for (const dz of [-16, 18]) b.cyl(0.08, 0.1, 4.6, x + 1.5, 0.1, -s + dz, 0xe9e6df, 6); scene.add(b.mesh());
    const ban = new THREE.Mesh(new THREE.PlaneGeometry(34, 1.6), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, map: canvasTex(1024, 64, (c, w, h) => { c.fillStyle = '#d8362c'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff6d8'; c.font = 'bold 44px Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('★  PLAŻA  ★  META  ★  PLAŻA  ★', w / 2, h / 2 + 2); }) }));
    ban.position.set(x + 1.5, 4.1, -s + 1); ban.rotation.y = -Math.PI / 2; scene.add(ban); }
}

// ------------------------------------------------------------------ what is in the water
function buildCourse() {
  const R = rng(20 + ((Math.random() * 1e6) | 0)), b = new Builder(1200), pick = (a) => a[(R() * a.length) | 0];
  let gap = 0, s = 105; events.push({ s: BR[0], gap: 0, type: 'bridge' });
  const rock = (s1, u, r) => { const x = cx(s1) + u; if (HQ) { const q = (rr, dx, dy, dz, col, sy, sd) => { b.add(leafBlob(rr, sy, sd, 2), col, x + dx, dy, -s1 + dz, b.r() * 3, 0.08); b.add(leafBlob(rr * 1.04, 0.22, sd, 2), 0x3a3c3a, x + dx, dy - rr * sy * 0.55, -s1 + dz, 0, 0.03); }; q(r * 1.05, 0, 0.15, 0, 0x8a877f, 0.7, 31 + s1); q(r * 0.6, r * 0.5, 0.1, r * 0.4, 0x74726c, 0.7, 47 + s1); q(r * 0.5, -r * 0.5, 0.05, -r * 0.3, 0x96938a, 0.6, 59 + s1); } else { b.blob(r * 1.05, x, 0.15, -s1, 0x7d7a74, 0.7); b.blob(r * 0.6, x + r * 0.5, 0.1, -s1 + r * 0.4, 0x6a6862, 0.7); b.blob(r * 0.5, x - r * 0.5, 0.05, -s1 - r * 0.3, 0x8a877f, 0.6); } obs.push({ type: 'rock', s: s1, u, r: r * 0.95 }); };
  while (s < END - 70) {
    const d = clamp(s / END, 0, 1), h = half(s) - 1.1, near = BR.some((q) => Math.abs(q - s) < 26), prev = gap;
    gap = clamp(prev + (R() - 0.5) * 2 * 4.5, -h + 1.6, h - 1.6);
    let type = near ? 'bridge' : pick(d < 0.1 ? ['rocks', 'lane', 'rocks', 'sand'] : ['rocks', 'rocks', 'log', 'whirl', 'kayak', 'sand', 'lane', 'log', 'rocks', 'kayak', 'whirl']);
    if (type === 'bridge') { const bs = BR.find((q) => Math.abs(q - s) < 26); gap = 0; events.push({ s: bs, gap: 0, type }); s = bs + 30; continue; }
    const ev = { s, gap, type }; events.push(ev);
    if (type === 'rocks') { const n = 3 + (R() < d ? 1 : 0) + (R() < 0.4 ? 1 : 0); for (let i = 0; i < n; i++) { let u, t = 0; do { u = (R() * 2 - 1) * h; } while (Math.abs(u - gap) < 2.7 && t++ < 20); if (Math.abs(u - gap) >= 2.7) rock(s + (R() - 0.5) * 5, u, 0.8 + R() * 0.5); } }
    else if (type === 'log') { const side = gap > 0 ? -1 : 1, len = clamp(Math.abs(side * h - gap) - 2.7, 2, 9), uc = side * h - side * len / 2, x = cx(s) + uc, g = new THREE.CylinderGeometry(0.3, 0.34, len, 10); g.rotateZ(Math.PI / 2); b.add(g, 0x6b4a32, x, 0.2, -s); b.cyl(0.06, 0.08, 0.5, x + len * 0.2, 0.3, -s, 0x5c3f2a); for (let k = 0; k <= Math.floor(len / 1.1); k++) obs.push({ type: 'log', s, u: uc - len / 2 + 0.4 + k * 1.1, r: 0.55 }); }
    else if (type === 'sand') { const u = clamp(gap + (R() < 0.5 ? -1 : 1) * (3.4 + R() * 2), -h, h), x = cx(s) + u, g = new THREE.CylinderGeometry(2.6, 3.0, 0.14, 18); g.scale(1, 4.6, 1); b.add(g, 0xe2cf9a, x, 0.1, -s, 0, 0.03); b.blob(0.3, x + 0.8, 0.46, -s - 0.5, 0x8a877f, 0.5); obs.push({ type: 'sand', s, u, r: 2.6 }); }
    else if (type === 'whirl') { const u = clamp(gap + (R() < 0.5 ? -1 : 1) * (4 + R() * 1.5), -h + 1, h - 1); whirls.push({ s, u, r: 2.7 }); obs.push({ type: 'whirl', s, u, r: 2.7 }); }
    else if (type === 'kayak') { kayaks.push({ s, amp: h - 0.6, w: 0.5 + R() * 0.35, ph: R() * 6, u: 0 }); ev.kayak = kayaks[kayaks.length - 1]; }
    else if (type === 'lane') { lanes.push({ s0: s - 4, s1: s + 34, u: gap }); ev.lane = true; }
    // bones: a line through the gap, leading on from the last one
    if (type !== 'kayak') for (let i = 0; i < 6; i++) { const k = i / 5, ss = s - 14 + k * (type === 'lane' ? 44 : 20); items.push({ s: ss, u: lerp(prev, gap, sm(0, 0.7, k)), kind: 'bone', got: false }); }
    if (events.length % 9 === 0) items.push({ s: s + 12, u: gap, kind: 'patch', got: false });
    if (type !== 'lane' && type !== 'kayak' && R() < 0.35 + d * 0.4) { let u, t = 0; do { u = (R() * 2 - 1) * h; } while (Math.abs(u - gap) < 3 && t++ < 20); if (Math.abs(u - gap) >= 3) rock(s + 9 + R() * 4, u, 0.6 + R() * 0.35); }      // a stray rock on the way to the next one
    s += type === 'lane' ? 44 : lerp(25, 16, d) + R() * 7 + (type === 'kayak' ? 8 : 0);
  }
  scene.add(b.mesh());
  // whirlpools, fast-water strips, kayakers, pickups
  const spiral = canvasTex(256, 256, (c, w) => { c.clearRect(0, 0, w, w); c.translate(w / 2, w / 2); for (let k = 0; k < 3; k++) { c.rotate(2.094); c.beginPath(); for (let a = 0; a < 9; a += 0.1) { const rr = 6 + a * 13; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 7; c.stroke(); } });
  for (const w of whirls) w.x = cx(w.s) + w.u;
  if (HQ) {                                                  // a real funnel: the surface sinks towards the middle, arms of foam spiral inwards, ripples run round it
    const fg = new THREE.RingGeometry(0.03, 1, 64, 24); fg.rotateX(-Math.PI / 2);
    const fm = new THREE.MeshStandardMaterial({ color: 0x2c574f, roughness: 0.1, metalness: 0.3, transparent: true, depthWrite: false });
    fm.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, RU);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime; varying float vRR, vAng;' + WAVE_GLSL)
        .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>\n{ float r0 = length(position.xz); vec2 dir = position.xz / max(r0, 1e-4); float dr = ${(WH_DEPTH * 2.3).toFixed(3)} * pow(1.0 - min(r0, 1.0), 1.3); objectNormal = normalize(vec3(-dr * dir.x, 1.0, -dr * dir.y)); }`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          { float rr = length(position.xz), ang = atan(position.z, position.x); vec4 wp4 = modelMatrix * vec4(position, 1.0);
            float rip = sin(ang * 3.0 + rr * 13.0 + uTime * 5.0) * 0.07 * (1.0 - rr) * smoothstep(0.05, 0.3, rr);
            transformed.y = waveH(wp4.x, wp4.z, uTime) * smoothstep(0.5, 1.0, rr) - ${WH_DEPTH.toFixed(3)} * pow(1.0 - min(rr, 1.0), 2.3) + rip; vRR = rr; vAng = ang; }`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTime; uniform sampler2D uDetail, uWN; varying float vRR, vAng;')
        .replace('#include <map_fragment>', `#include <map_fragment>
          { float a2 = uTime * 1.6 / (vRR + 0.22); vec2 q = mat2(cos(a2), -sin(a2), sin(a2), cos(a2)) * (vec2(cos(vAng), sin(vAng)) * vRR);
            float n = texture2D(uDetail, q * 1.3).r, sp = vAng * 2.0 + log(vRR + 0.06) * 5.5 + uTime * 3.2;
            float foam = smoothstep(0.55, 0.95, sin(sp) * 0.5 + 0.5 + (n - 0.5) * 0.9) * smoothstep(0.06, 0.28, vRR) * (1.0 - smoothstep(0.72, 0.98, vRR));
            diffuseColor.rgb = mix(diffuseColor.rgb * mix(0.22, 1.0, smoothstep(0.0, 0.75, vRR)), vec3(0.85, 0.9, 0.92), foam * 0.8); diffuseColor.a *= 1.0 - smoothstep(0.93, 1.0, vRR); }`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          { float a2 = uTime * 1.6 / (vRR + 0.22); vec2 q = mat2(cos(a2), -sin(a2), sin(a2), cos(a2)) * (vec2(cos(vAng), sin(vAng)) * vRR); vec3 tn = texture2D(uWN, q * 1.7).xyz * 2.0 - 1.0; normal = normalize(normal + (viewMatrix * vec4(tn.x, 0.0, tn.y, 0.0)).xyz * 0.3); }`);
    };
    fm.customProgramCacheKey = () => 'whirl';
    for (const w of whirls) { w.m = new THREE.Mesh(fg, fm); w.m.position.set(w.x, 0.02, -w.s); w.m.scale.set(w.r * WH_K, 1, w.r * WH_K); w.m.renderOrder = 3; w.m.frustumCulled = false; w.m.receiveShadow = true; scene.add(w.m); }
    // bits of driftwood and leaves going round and down
    G.debris = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 0.035, 0.1), new THREE.MeshStandardMaterial({ color: 0x8a7458, roughness: 0.9 }), whirls.length * 6); G.debris.frustumCulled = false; scene.add(G.debris);
  } else {
    for (const w of whirls) { const g = new THREE.CircleGeometry(w.r, 32); g.rotateX(-Math.PI / 2); w.m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: spiral, transparent: true, opacity: 0.8, depthWrite: false })); w.m.position.set(w.x, 0.4, -w.s); w.m.renderOrder = 3; scene.add(w.m);
    const dk = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x06202c, transparent: true, opacity: 0.45, depthWrite: false })); dk.position.copy(w.m.position); dk.position.y = 0.39; dk.renderOrder = 2; scene.add(dk); }
  }
  const arrowT = canvasTex(64, 128, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 7; c.lineCap = 'round'; for (const y of [34, 98]) { c.beginPath(); c.moveTo(10, y + 16); c.lineTo(w / 2, y - 16); c.lineTo(w - 10, y + 16); c.stroke(); } });
  for (const l of lanes) { const n = Math.round((l.s1 - l.s0) / 2), pos = [], uv = [], idx = [];
    for (let i = 0; i <= n; i++) { const ss = lerp(l.s0, l.s1, i / n); pos.push(cx(ss) + l.u - 1.5, 0.045, -ss, cx(ss) + l.u + 1.5, 0.045, -ss); uv.push(0, i / 2, 1, i / 2); if (i < n) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    l.m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: arrowT, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide })); l.m.renderOrder = 3; l.m.position.y = 0.36; scene.add(l.m); }
  kayaks.forEach((k, i) => { const kb = new Builder(1300 + i), col = [0xe2402f, 0xf2c230, 0x2f8fe0, 0x3fae5a][i % 4];
    kb.blob(1, 0, 0.12, 0, col, 0.2, 0.34, 1.9); kb.blob(0.26, 0, 0.3, -0.1, 0x1c1c22, 0.4, 1, 1.4); kb.box(0.36, 0.5, 0.24, 0, 0.32, -0.15, 0xf07a1a); kb.blob(0.14, 0, 1.0, -0.15, 0xe8b890); kb.blob(0.15, 0, 1.07, -0.17, 0xffffff, 0.7);
    k.g = new THREE.Group(); k.g.add(kb.mesh()); const pb = new Builder(1350 + i); pb.cyl(0.025, 0.025, 2.2, 0, -1.1, 0, 0x3a3a3e, 6); pb.box(0.2, 0.36, 0.03, 0, 0.92, 0, col); pb.box(0.2, 0.36, 0.03, 0, -1.28, 0, col); k.p = pb.mesh(); k.p.position.set(0, 0.72, 0.15); k.p.rotation.z = Math.PI / 2; k.g.add(k.p); scene.add(k.g); obs.push({ type: 'kayak', k, r: 1.25 }); });
  const parts = [], cg = new THREE.CylinderGeometry(0.06, 0.06, 0.34, 8); cg.rotateZ(Math.PI / 2); parts.push(cg.toNonIndexed());
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) { const q = new THREE.SphereGeometry(0.09, 8, 6); q.translate(sx * 0.18, sy * 0.065, 0); parts.push(q.toNonIndexed()); }
  boneMesh = new THREE.InstancedMesh(mergeGeometries(parts), new THREE.MeshStandardMaterial({ color: 0xffd257, emissive: 0x9a5a00, emissiveIntensity: 0.9, roughness: 0.35 }), 140); boneMesh.frustumCulled = false; boneMesh.castShadow = true; scene.add(boneMesh);
  for (const it of items) if (it.kind === 'patch') { it.m = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.15, 10, 24), new THREE.MeshStandardMaterial({ color: 0xe2402f, emissive: 0x5a1008, roughness: 0.5 })); const w = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.155, 10, 6, 0.5), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })); it.m.add(w); const w2 = w.clone(); w2.rotation.z = Math.PI; it.m.add(w2); scene.add(it.m); }
}

// Wujek Artur: roars past on a jet ski every now and then – overtaking, or coming back up the river – waves, calls out,
// and leaves a line of bones in his wake. He swerves round whatever is in the water and never holes the raft.
function buildArtur() {
  const g = new THREE.Group(), b = new Builder(1500), WHITE = 0xf2f3f5, BLACK = 0x16181c, LIME = 0xb6f23a, GREY = 0x2a2d33;
  // A sit-down, three-seater personal watercraft in the modern style: a long V hull with a pointed bow, a tall hood with
  // the handlebar pod, a stepped saddle, footwells, a boarding platform and a jet nozzle at the stern.
  {
    const sh = new THREE.Shape(); sh.moveTo(-0.5, -1.55); sh.lineTo(0.5, -1.55); sh.lineTo(0.58, -0.6); sh.quadraticCurveTo(0.6, 0.6, 0.34, 1.2); sh.quadraticCurveTo(0.14, 1.62, 0, 1.72); sh.quadraticCurveTo(-0.14, 1.62, -0.34, 1.2); sh.quadraticCurveTo(-0.6, 0.6, -0.58, -0.6); sh.lineTo(-0.5, -1.55);
    const hg = new THREE.ExtrudeGeometry(sh, { depth: 0.42, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2, curveSegments: 12 }); hg.rotateX(Math.PI / 2); hg.translate(0, 0.3, 0); hg.deleteAttribute('uv');
    const p = hg.attributes.position, col = new Float32Array(p.count * 3), cW = new THREE.Color(WHITE), cB = new THREE.Color(BLACK), cL = new THREE.Color(LIME);
    for (let k = 0; k < p.count; k++) {
      let x = p.getX(k), y = p.getY(k); const z = p.getZ(k), t = clamp((y + 0.17) / 0.52, 0, 1);            // 0 at the keel, 1 at the deck
      x *= lerp(0.3, 1, sm(0, 0.8, t)); y += 0.2 * sm(0.5, 1.72, z) * (1 - t) + 0.07 * sm(0.9, 1.72, z);      // V bottom, bow sweeping up
      p.setXYZ(k, x, y, z); const c = t < 0.5 ? cB : t < 0.66 && z > -1.2 ? cL : cW; col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
    }
    hg.setAttribute('color', new THREE.BufferAttribute(col, 3)); hg.computeVertexNormals(); b.g.push(hg);
  }
  b.blob(1, 0, 0.5, 0.78, BLACK, 0.27, 0.43, 0.88); b.blob(1, 0, 0.6, 0.84, WHITE, 0.2, 0.3, 0.62); b.blob(1, 0, 0.5, 1.42, LIME, 0.1, 0.16, 0.3);       // hood, its white top panel, the nose
  b.box(0.3, 0.36, 0.34, 0, 0.5, 0.2, BLACK, 0, 0); b.box(0.36, 0.08, 0.22, 0, 0.86, 0.3, GREY, 0, 0);                                                    // steering column and gauge pod
  { const hb = new THREE.CylinderGeometry(0.026, 0.026, 0.8, 8); hb.rotateZ(Math.PI / 2); b.add(hb, BLACK, 0, 0.95, 0.18, 0, 0); }
  for (const x of [-0.36, 0.36]) { b.box(0.12, 0.06, 0.06, x, 0.92, 0.18, LIME, 0, 0); b.box(0.12, 0.09, 0.05, x * 1.05, 0.78, 0.52, BLACK, 0, 0); }        // grips and mirrors
  b.box(0.42, 0.2, 0.8, 0, 0.44, -0.25, GREY, 0, 0); b.box(0.44, 0.26, 0.62, 0, 0.47, -0.9, GREY, 0, 0); b.blob(0.2, 0, 0.72, -1.22, GREY, 0.6, 1.05, 0.6);   // stepped saddle with a bolster
  for (const x of [-0.215, 0.215]) { b.box(0.02, 0.06, 1.3, x, 0.56, -0.5, LIME, 0, 0); b.box(0.13, 0.13, 1.5, x * 2.25, 0.34, -0.55, WHITE, 0, 0); b.box(0.07, 0.08, 0.95, x * 2.85, 0.1, -0.95, BLACK, 0, 0); }   // seat piping, gunwales, sponsons
  b.box(0.92, 0.05, 0.42, 0, 0.34, -1.33, 0x55595f, 0, 0); b.box(0.5, 0.05, 0.05, 0, 0.62, -1.42, BLACK, 0, 0); for (const x of [-0.24, 0.24]) b.box(0.05, 0.26, 0.05, x, 0.38, -1.42, BLACK, 0, 0);            // boarding platform and grab handle
  { const nz = new THREE.CylinderGeometry(0.1, 0.12, 0.24, 10); nz.rotateX(Math.PI / 2); b.add(nz, 0x3a3d42, 0, 0.1, -1.62, 0, 0); }
  // the rider
  b.box(0.44, 0.56, 0.28, 0, 0.66, -0.25, 0xe2402f); b.box(0.46, 0.3, 0.3, 0, 0.78, -0.25, 0xf2c230, 0, 0.02);
  for (const x of [-0.17, 0.17]) { b.box(0.15, 0.16, 0.52, x * 1.5, 0.52, 0.0, 0x34507a); b.box(0.13, 0.3, 0.14, x * 1.9, 0.3, 0.22, 0x34507a); }
  b.box(0.1, 0.1, 0.5, -0.29, 1.04, 0.0, 0xe2402f);
  b.blob(0.16, 0, 1.44, -0.22, 0xe8b890, 1.05); b.blob(0.175, 0, 1.51, -0.25, 0x1f6fd0, 0.7); b.box(0.3, 0.03, 0.2, 0, 1.48, -0.08, 0x1f6fd0); b.box(0.26, 0.07, 0.03, 0, 1.44, -0.06, 0x111114, 0, 0); b.box(0.2, 0.05, 0.03, 0, 1.34, -0.07, 0x6b4a32, 0, 0);
  g.add(b.mesh());
  const ab = new Builder(1501); ab.box(0.1, 0.5, 0.1, 0, 0, 0, 0xe2402f); ab.blob(0.075, 0, 0.56, 0, 0xe8b890); A.arm = ab.mesh(); A.arm.position.set(0.29, 1.16, -0.25); g.add(A.arm);
  // his name floats above him and is drawn over everything, so it can always be read while he is in view
  const t = canvasTex(384, 88, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = 'rgba(12,9,6,.72)'; c.beginPath(); if (c.roundRect) c.roundRect(4, 4, w - 8, h - 8, 34); else c.rect(4, 4, w - 8, h - 8); c.fill(); c.strokeStyle = '#ffd27a'; c.lineWidth = 3; c.stroke(); c.fillStyle = '#ffd27a'; c.font = 'italic 50px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(TXT.pl.arturName, w / 2, h / 2 + 3); });
  A.label = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false, depthWrite: false, fog: false })); A.label.renderOrder = 50; A.label.position.y = 2.5; g.add(A.label);
  g.traverse((o) => { o.frustumCulled = false; }); g.visible = false; scene.add(g); A.g = g;
  A.who = [{ g, arm: A.arm, label: A.label, name: 'arturName', lines: 'artur', foil: false }, buildRafal()];
}
// Wujek Rafał on an e-foil: an electric surfboard that flies above the water on a mast with a hydrofoil underneath.
function buildRafal() {
  const g = new THREE.Group(), b = new Builder(1600), CARBON = 0x1b1d22, TEAL = 0x2a9d8f, ALU = 0xb9bec6, skin = 0xe8b890, SUIT = 0x1c2c44, DECK = 0.95;
  const outline = (k) => { const sh = new THREE.Shape(), P = [[0.24, -0.8], [0.29, -0.55], [0.31, -0.1], [0.28, 0.3], [0.18, 0.62], [0, 0.82]]; sh.moveTo(0, -0.8); sh.lineTo(P[0][0] * k, P[0][1] * k); for (let i = 1; i < P.length; i++) sh.quadraticCurveTo(P[i - 1][0] * k * 1.06, (P[i - 1][1] + P[i][1]) / 2 * k, P[i][0] * k, P[i][1] * k); for (let i = P.length - 2; i >= 0; i--) sh.quadraticCurveTo(-P[i + 1][0] * k * 1.06, (P[i + 1][1] + P[i][1]) / 2 * k, -P[i][0] * k, P[i][1] * k); sh.lineTo(0, -0.8 * k); return sh; };
  { const bg = new THREE.ExtrudeGeometry(outline(1), { depth: 0.09, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.03, bevelSegments: 3, curveSegments: 10 }); bg.rotateX(Math.PI / 2); b.add(bg, CARBON, 0, DECK - 0.01, 0, 0, 0.02);        // the board: a carbon shell...
    const pg = new THREE.ExtrudeGeometry(outline(0.84), { depth: 0.012, bevelEnabled: false, curveSegments: 10 }); pg.rotateX(Math.PI / 2); b.add(pg, 0x3a3f46, 0, DECK + 0.03, -0.04, 0, 0.03);                                                  // ...a grippy deck pad...
    b.box(0.05, 0.004, 1.2, 0, DECK + 0.03, -0.02, TEAL, 0, 0); for (const sx of [-0.2, 0.2]) b.box(0.012, 0.004, 0.9, sx, DECK + 0.03, -0.1, TEAL, 0, 0); b.box(0.22, 0.03, 0.1, 0, DECK + 0.02, 0.5, ALU, 0, 0); }                                  // ...stripes and the battery hatch
  { const mg = new THREE.CylinderGeometry(0.5, 0.5, 0.84, 12); mg.scale(0.036, 1, 0.26); b.add(mg, ALU, 0, DECK - 0.5, -0.3, 0, 0.02);                                                                                                           // the mast, a slim wing section
    const fus = new THREE.CapsuleGeometry(0.04, 0.72, 4, 10); fus.rotateX(Math.PI / 2); b.add(fus, CARBON, 0, 0.04, -0.2, 0, 0); const mot = new THREE.CapsuleGeometry(0.06, 0.22, 4, 10); mot.rotateX(Math.PI / 2); b.add(mot, ALU, 0, 0.04, -0.52, 0, 0.02);
    const duct = new THREE.CylinderGeometry(0.09, 0.08, 0.1, 14, 1, true); duct.rotateX(Math.PI / 2); b.add(duct, CARBON, 0, 0.04, -0.74, 0, 0);                                                                                                // fuselage, motor pod, ducted propeller
    for (const sd of [-1, 1]) { const w = new THREE.BoxGeometry(0.44, 0.014, 0.17); w.translate(sd * 0.22, 0, 0); w.rotateZ(-sd * 0.12); const q = w.attributes.position; for (let i = 0; i < q.count; i++) { const t = Math.abs(q.getX(i)) / 0.44; q.setZ(i, q.getZ(i) * (1 - t * 0.55) - t * 0.06); } b.add(w, TEAL, 0, 0.05, 0.16, 0, 0.02);      // the front wing, swept and tapered
      const st = new THREE.BoxGeometry(0.19, 0.01, 0.08); st.translate(sd * 0.095, 0, 0); st.rotateZ(sd * 0.1); b.add(st, TEAL, 0, 0.05, -0.62, 0, 0.02); } }                                                                                      // and the small stabiliser at the back
  // the rider, standing sideways like a surfer: knees bent, a helmet, an impact vest, the remote in his leading hand
  const limb = (r, len, rx, x, y, z, col) => { const c = new THREE.CapsuleGeometry(r, len, 4, 8); c.rotateX(rx); b.add(c, col, x, y, z, 0, 0.03); }, ball = (r, x, y, z, col, sx = 1, sy = 1, sz = 1) => { const sg = new THREE.SphereGeometry(r, 12, 10); sg.scale(sx, sy, sz); b.add(sg, col, x, y, z, 0, 0.02); };
  limb(0.08, 0.34, 0.5, 0, DECK + 0.26, 0.3, SUIT); limb(0.085, 0.34, -0.25, 0, DECK + 0.66, 0.2, SUIT); limb(0.08, 0.34, -0.55, 0, DECK + 0.26, -0.34, SUIT); limb(0.085, 0.34, 0.3, 0, DECK + 0.66, -0.22, SUIT);
  for (const z of [0.4, -0.44]) ball(0.09, 0.02, DECK + 0.06, z, 0x15161a, 1.5, 0.6, 0.9);
  limb(0.17, 0.36, 0.1, 0, DECK + 1.2, 0, SUIT); limb(0.19, 0.2, 0.1, 0, DECK + 1.24, 0.01, 0xe8552e); b.box(0.2, 0.05, 0.3, 0.1, DECK + 1.32, 0.01, 0x15161a, 0, 0);                                                                              // torso in an orange impact vest
  limb(0.055, 0.4, 1.15, 0.04, DECK + 1.3, 0.4, SUIT); ball(0.06, 0.06, DECK + 1.2, 0.63, skin); b.box(0.05, 0.05, 0.13, 0.06, DECK + 1.24, 0.7, 0xf2c21c, 0, 0);                                                                                 // leading arm and the hand remote
  b.cyl(0.06, 0.065, 0.09, 0, DECK + 1.5, 0, skin, 10); ball(0.15, 0, DECK + 1.7, 0, skin, 0.95, 1.05, 1); { const hg = new THREE.SphereGeometry(0.17, 14, 8, 0, 6.3, 0, 1.75); b.add(hg, 0xf2f2f2, 0, DECK + 1.72, 0, 0, 0.02); }
  b.box(0.04, 0.05, 0.22, 0.135, DECK + 1.71, 0, 0x101114, 0, 0); b.box(0.02, 0.03, 0.34, 0.01, DECK + 1.6, 0, 0x101114, 0, 0); b.box(0.06, 0.02, 0.12, 0.14, DECK + 1.62, 0, 0x5a4634, 0, 0);                                                      // sunglasses, helmet strap, a short beard
  g.add(b.mesh());
  const ab = new Builder(1601); { const c = new THREE.CapsuleGeometry(0.055, 0.4, 4, 8); c.translate(0, 0.25, 0); ab.add(c, SUIT, 0, 0, 0, 0, 0.03); ab.add(new THREE.SphereGeometry(0.06, 10, 8), skin, 0, 0.54, 0, 0, 0.02); }
  const arm = ab.mesh(); arm.position.set(0.02, DECK + 1.42, -0.2); g.add(arm);
  const t = canvasTex(384, 88, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = 'rgba(12,9,6,.72)'; c.beginPath(); if (c.roundRect) c.roundRect(4, 4, w - 8, h - 8, 34); else c.rect(4, 4, w - 8, h - 8); c.fill(); c.strokeStyle = '#ffd27a'; c.lineWidth = 3; c.stroke(); c.fillStyle = '#ffd27a'; c.font = 'italic 50px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(TXT.pl.rafalName, w / 2, h / 2 + 3); });
  const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false, depthWrite: false, fog: false })); label.renderOrder = 50; label.position.y = 3.4; g.add(label);
  g.traverse((o) => { o.frustumCulled = false; if (o.isMesh) o.castShadow = true; }); g.visible = false; scene.add(g);
  return { g, arm, label, name: 'rafalName', lines: 'rafal', foil: true };
}
function updateArtur(dt, play) {
  if (A.mode === 'off') {
    A.timer -= play ? dt : 0;
    if (play && A.timer <= 0 && G.s > 70 && G.s < END - 240) {
      A.mode = A.n++ % 2 ? 'back' : 'pass'; A.side = G.u > 0 ? -1 : 1; A.s = A.mode === 'pass' ? G.s - 40 : G.s + 150; A.u = A.side * (half(A.s) - 1.7); A.said = false; A.drop = 0; A.uv = 0; A.av = null; A.rs = 0;
      const w = A.who[(A.k = (A.k || 0) + 1) % 2 ? 0 : 1]; A.cur = w; A.g = w.g; A.arm = w.arm; A.label = w.label; for (const q of A.who) q.g.visible = q === w;      // wujek Artur and wujek Rafał take turns
      if (audio.on) audio.burst(w.foil ? 420 : 170, 3, 1.6, w.foil ? 0.06 : 0.22, 'bandpass', 0, 1.6);
    }
    return;
  }
  const dir = A.mode === 'pass' ? 1 : -1, sp = A.mode === 'pass' ? G.v + 8.5 : 9, h = half(A.s) - 1.2;
  A.s += dir * sp * dt;
  let want = A.side * (h - 0.5);
  // He steers round the nearest thing ahead only, picks his side once and keeps to it, and his sideways speed is eased:
  // no more flicking from left to right several times a second.
  let near1 = null, nd = 1e9; for (const o of obs) { const os = o.k ? o.k.s : o.s, ou = o.k ? o.k.u : o.u, ds = (os - A.s) * dir; if (ds > -2.5 && ds < 16 && Math.abs(ou - A.u) < o.r + 2.4 && ds < nd) { nd = ds; near1 = o; } }
  if (near1) { const ou = near1.k ? near1.k.u : near1.u; if (A.av !== near1) { A.av = near1; A.avS = A.u >= ou ? 1 : -1; if (Math.abs(ou + A.avS * (near1.r + 2.1)) > h) A.avS = -A.avS; } want = ou + A.avS * (near1.r + 2.1); } else A.av = null;
  if (Math.abs(A.s - G.s) < 10 && Math.abs(want - G.u) < 3.2) { if (!A.rs) A.rs = A.u >= G.u ? 1 : -1; want = G.u + A.rs * 3.4; } else if (Math.abs(A.s - G.s) > 14) A.rs = 0;            // give the raft room
  want = clamp(want, -h, h); A.uv = (A.uv || 0) + (clamp((want - A.u) * 2.2, -5.5, 5.5) - (A.uv || 0)) * Math.min(1, dt * 3.2); const du = A.uv * dt; A.u = clamp(A.u + du, -h, h);
  const x = cx(A.s) + A.u, yaw = Math.atan2(dir * slope(A.s) + du / Math.max(1e-3, dt) / sp, -dir);
  const foil = A.cur && A.cur.foil;
  if (foil) { A.g.position.set(x, -0.3 + Math.sin(G.t * 1.7) * 0.05 + waveH(x, -A.s, G.t) * 0.25, -A.s); A.g.rotation.set(-0.03 + Math.sin(G.t * 1.3) * 0.03, yaw, -clamp(du / Math.max(1e-3, dt), -8, 8) * 0.075 + Math.sin(G.t * 2.1) * 0.03, 'YXZ'); }      // the e-foil flies level and leans into its turns
  else { A.g.position.set(x, 0.07 + Math.abs(Math.sin(G.t * 9)) * 0.07 + waveH(x, -A.s, G.t), -A.s); A.g.rotation.set(-0.08 + Math.sin(G.t * 9) * 0.03, yaw, -clamp(du / Math.max(1e-3, dt), -8, 8) * 0.04, 'YXZ'); }
  const dist = camera.position.distanceTo(A.g.position), k = clamp(dist / 12, 1, 7); A.label.scale.set(3.1 * k, 0.71 * k, 1); A.label.position.y = (foil ? 3.3 : 2.3) + 0.35 * k;
  A.wave = Math.max(0, A.wave - dt); A.arm.rotation.z = A.wave > 0 ? -0.4 + Math.sin(G.t * 12) * 0.5 : 2.6;
  for (let i = 0; i < (foil ? 1 : 3); i++) if (Math.random() < dt * 40) { A.g.localToWorld(tmpV.set((Math.random() - 0.5) * (foil ? 0.15 : 0.8), foil ? 0.4 : 0.1, foil ? -0.4 : -1.6)); pAlpha.spawn(tmpV.x, 0.15, tmpV.z, (Math.random() - 0.5) * 2.5, 1.5 + Math.random() * 2.5, dir * (2 + Math.random() * 3), 0.7, 0.2, 0.7, 0.95, 0.98, 1, 0.7, 8, 0.6); }
  const near = Math.abs(A.s - G.s);
  if (play && !A.said && near < 7) { A.said = true; A.wave = 2.5; pick(`${T(A.cur.name)}: ${T(A.cur.lines)[(A.n + ((Math.random() * 2) | 0)) % T(A.cur.lines).length]}`); pickT = 2.6; buzz(30); if (audio.on) { audio.burst(260, 2, 0.9, 0.3, 'bandpass', 0, 0.6); audio.bark(1.1); dog.bark(); } }
  if (play && near < 3.2 && Math.abs(A.u - G.u) < 4) G.uv += Math.sign(G.u - A.u || 1) * 7 * dt;                // his wash nudges the raft aside
  if (play && A.mode === 'pass' && A.s > G.s + 9 && A.drop < 9 && A.s - (A.lastDrop || 0) > 3.2) { A.lastDrop = A.s; A.drop++; items.push({ s: A.s - 2.5, u: A.u, kind: 'bone', got: false, dyn: true }); }
  if ((A.mode === 'pass' && A.s > G.s + 135) || (A.mode === 'back' && A.s < G.s - 28) || A.s > END - 60 || !play && near > 60) { A.mode = 'off'; A.g.visible = false; A.timer = 16 + Math.random() * 12; A.lastDrop = 0; }
}

function buildRaft() {
  raft = new THREE.Group();
  const b = new Builder(60), tube = new THREE.TorusGeometry(1, 0.27, 10, 26); tube.rotateX(Math.PI / 2); tube.scale(0.82, 1, 1.32);
  b.add(tube, 0xf28c1e, 0, 0.27, 0, 0, 0.02); const fl = new THREE.CylinderGeometry(1, 1, 0.06, 20); fl.scale(0.8, 1, 1.28); b.add(fl, 0x5a6470, 0, 0.1, 0, 0, 0.02);
  const rope = new THREE.TorusGeometry(1.04, 0.025, 5, 26); rope.rotateX(Math.PI / 2); rope.scale(0.82, 1, 1.32); b.add(rope, 0xf4f1ea, 0, 0.5, 0, 0, 0);
  b.box(1.1, 0.1, 0.3, 0, 0.3, -0.15, 0x3a424c);
  raft.add(b.mesh());
  for (const sd of [-1, 1]) { const pb = new Builder(62 + sd); pb.cyl(0.03, 0.03, 1.5, 0, -1.1, 0, 0x8a6a45, 6); pb.box(0.24, 0.42, 0.04, 0, -1.4, 0, 0xe9e6df); const m = pb.mesh(), piv = new THREE.Group(); piv.position.set(sd * 0.92, 0.62, 0.25); piv.rotation.z = sd * 0.7; piv.add(m); raft.add(piv); paddles.push({ piv, sd }); }
  scene.add(raft);
  // the super speedboat that the code "rafal" turns the raft into: a long white hull with a red stripe, a windscreen, two outboards
  const sb = new Builder(64), boat = new THREE.Group(), WHITE = 0xf4f5f7, RED = 0xd8342c, DARK = 0x1c1f24;
  const hull = (k) => { const sh = new THREE.Shape(), P = [[0.78, -2.0], [0.86, -0.9], [0.84, 0.2], [0.66, 1.2], [0.34, 1.95], [0, 2.45]]; sh.moveTo(0, -2.0 * k); sh.lineTo(P[0][0] * k, P[0][1] * k); for (let i = 1; i < P.length; i++) sh.quadraticCurveTo(P[i - 1][0] * k * 1.04, (P[i - 1][1] + P[i][1]) / 2 * k, P[i][0] * k, P[i][1] * k); for (let i = P.length - 2; i >= 0; i--) sh.quadraticCurveTo(-P[i + 1][0] * k * 1.04, (P[i + 1][1] + P[i][1]) / 2 * k, -P[i][0] * k, P[i][1] * k); sh.lineTo(0, -2.0 * k); return sh; };
  { const hg = new THREE.ExtrudeGeometry(hull(1), { depth: 0.6, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.06, bevelSegments: 3, curveSegments: 10 }); hg.rotateX(Math.PI / 2); const q = hg.attributes.position; for (let i = 0; i < q.count; i++) { const t = Math.max(0, -q.getY(i) / 0.7), z = q.getZ(i); q.setX(i, q.getX(i) * (1 - t * 0.55)); q.setY(i, q.getY(i) + Math.max(0, z - 0.8) * 0.16 * (1 - t)); } hg.computeVertexNormals(); sb.add(hg, WHITE, 0, 0.62, 0, 0, 0.02);     // a V hull with a rising bow
    const st = new THREE.ExtrudeGeometry(hull(1.015), { depth: 0.1, bevelEnabled: false, curveSegments: 10 }); st.rotateX(Math.PI / 2); sb.add(st, RED, 0, 0.5, 0, 0, 0.02);
    const fl = new THREE.ExtrudeGeometry(hull(0.82), { depth: 0.02, bevelEnabled: false, curveSegments: 10 }); fl.rotateX(Math.PI / 2); fl.scale(1, 1, 0.8); sb.add(fl, 0x8a6a45, 0, 0.3, -0.25, 0, 0.04); }                                          // teak cockpit floor
  for (const sx of [-0.7, 0.7]) sb.box(0.16, 0.34, 3.0, sx, 0.3, -0.45, WHITE, 0, 0.02); sb.box(1.5, 0.34, 0.16, 0, 0.3, -1.9, WHITE, 0, 0.02); sb.box(1.3, 0.4, 1.0, 0, 0.3, 1.25, WHITE, 0, 0.02);                                                   // coamings and the foredeck
  { const ws = new THREE.BoxGeometry(1.3, 0.5, 0.05); ws.rotateX(-0.55); sb.add(ws, 0x22384c, 0, 0.92, 0.95, 0, 0); sb.box(1.36, 0.05, 0.08, 0, 1.12, 0.82, 0xb9bec6, 0, 0); sb.box(0.5, 0.3, 0.3, 0.35, 0.62, 0.86, DARK, 0, 0); const wh = new THREE.TorusGeometry(0.16, 0.025, 6, 16); wh.rotateX(-0.5); sb.add(wh, DARK, 0.35, 0.86, 0.68, 0, 0); }     // windscreen, console, wheel
  sb.box(1.2, 0.3, 0.45, 0, 0.32, -1.45, RED, 0, 0.03); sb.box(1.2, 0.45, 0.12, 0, 0.5, -1.7, RED, 0, 0.03);                                                                                                                                  // the stern bench
  for (const sx of [-0.36, 0.36]) { sb.box(0.34, 0.62, 0.5, sx, 0.72, -2.25, DARK, 0, 0.02); sb.box(0.3, 0.1, 0.44, sx, 1.32, -2.25, 0xb9bec6, 0, 0); sb.box(0.12, 0.8, 0.2, sx, -0.05, -2.3, 0x3a3d42, 0, 0); }                                     // two big outboards
  for (const sx of [-0.62, 0.62]) { sb.cyl(0.02, 0.02, 0.4, sx, 0.72, 1.7, 0xb9bec6, 6); } sb.box(1.26, 0.03, 0.03, 0, 1.1, 1.7, 0xb9bec6, 0, 0); sb.cyl(0.015, 0.015, 0.9, 0, 0.64, -1.95, 0xb9bec6, 5); sb.box(0.03, 0.26, 0.4, 0, 1.3, -2.14, RED, 0, 0);   // bow rail and a little flag
  boat.add(sb.mesh()); boat.visible = false; raft.add(boat); G.boat = boat; G.raftParts = raft.children.filter((c) => c !== boat);
}
// codes, as in the old games: type "rafal" during the trip and the raft becomes a speedboat
let typed = '';
window.addEventListener('keydown', (e) => { if (e.key.length !== 1) return; typed = (typed + e.key.toLowerCase()).slice(-8); if (typed.endsWith('rafal') && G.mode === 'play') { typed = ''; setBoat(!G.speedboat); }
  else if (typed.endsWith('stop') && G.mode === 'play') { typed = ''; if (G.speedboat) setBoat(false); pick(lang === 'pl' ? 'KOD: STOP — wszystko wraca do normy' : 'CODE: STOP — everything back to normal'); pickT = 2.6; } });
function setBoat(on) { G.speedboat = on; G.boat.visible = on; for (const c of G.raftParts) c.visible = !on; dog.root.position.y = on ? 0.3 : 0.16; cat.root.position.y = on ? 0.32 : 0.2; if (G.mode === 'play') { pick(T(on ? 'cheatOn' : 'cheatOff')); pickT = 2.6; } if (on) { G.shake = 0.6; buzz([60, 30, 120]); if (audio.on) { audio.rumble(1.4); audio.burst(170, 3, 1.6, 0.25, 'bandpass', 0, 1.6); } } }

// ------------------------------------------------------------------ HUD, input
let hintT = 0, pickT = 0;
function hint(key, once = true) { if (once) { if (G.hints.has(key)) return; G.hints.add(key); } $('hint').textContent = T(key); $('hint').style.opacity = 1; hintT = 4; }
function pick(text) { $('pick').textContent = text; $('pick').style.opacity = 1; pickT = 1.8; }
function place(name) { const el = $('place'); $('placeKind').textContent = T('k_place'); $('placeName').textContent = name; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); if (audio.on) audio.placeChime(); }
const buzz = (p) => { try { if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(p); } catch (_) { /* not supported */ } };
const clock = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const ring = '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="9.5" fill="none" stroke="currentColor" stroke-width="7"/></svg>';
const shown = {};
function hud(force) {
  const set = (id, v, html) => { if (!force && shown[id] === v) return; shown[id] = v; if (html) $(id).innerHTML = v; else $(id).textContent = v; };
  set('rScore', T('bones', G.bones)); set('rSub', T('time', clock(G.time)));
  set('rLives', [0, 1, 2].map((i) => `<span class="${i < G.lives ? '' : 'lost'}" style="color:#ff8a3c">${ring}</span>`).join(''), true);
  set('rLabel', T('left', Math.max(0, Math.round((END - G.s) / 10) * 10)));
  const k = Math.round(clamp(G.s / END, 0, 1) * 100); if (shown.prog !== k) { shown.prog = k; $('rDog').style.left = k + '%'; }
}
function applyLang() {
  $('title').querySelector('h1').innerHTML = `<small>${T('over')}</small>${T('title')}`;
  $('title').querySelector('.story').textContent = T('story'); $('start').textContent = T('start'); $('title').querySelector('.keys').textContent = T('keys');
  $('again').textContent = T('again'); $('menu').textContent = T('menu'); $('lang').textContent = lang === 'pl' ? 'EN' : 'PL'; $('bBark').textContent = T('paddle'); hud(true);
}
function paddle() {
  if (G.mode !== 'play' || G.cd > 0) return; G.cd = 0.5; G.stroke = 1; G.boost = Math.min(5.5, G.boost + 3.2); if (audio.on) audio.splash(0.16);
  for (const sd of [-1, 1]) for (let k = 0; k < 5; k++) { raft.localToWorld(tmpV.set(sd * 1.3, 0.1, -0.2)); pAlpha.spawn(tmpV.x, 0.15, tmpV.z, (Math.random() - 0.5) * 2, 1.5 + Math.random() * 1.5, 1 + Math.random() * 2, 0.5, 0.12, 0.3, 0.9, 0.95, 1, 0.8, 9, 0.5); }
}
window.addEventListener('keydown', (e) => {
  if (e.repeat) return; keys[e.code] = true;
  if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') { if (G.mode === 'title' && e.code === 'Space') startGame(); else paddle(); e.preventDefault(); }
  if (e.code === 'Enter' && G.mode === 'title') startGame();
  if (e.code === 'KeyM' && audio.on) audio.toggleMusic();
  if (e.code === 'KeyP') document.body.classList.toggle('clean');
  if (e.code.startsWith('Arrow')) e.preventDefault();
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; touch.paddle = false; });
{
  const zone = $('joyZone'), base = $('joy'), knob = $('joyKnob'), R = 50, NP = { passive: false }; let id = null, ox = 0;
  const each = (e, fn) => { e.preventDefault(); for (const t of e.changedTouches) fn(t); };
  const set = (dx) => { dx = clamp(dx, -R, R); knob.style.transform = `translate(${dx}px, 0px)`; touch.x = Math.abs(dx) < 7 ? 0 : dx / R; };
  zone.addEventListener('touchstart', (e) => each(e, (t) => { if (id !== null) return; id = t.identifier; const r = zone.getBoundingClientRect(); ox = t.clientX; base.style.left = (ox - r.left) + 'px'; base.style.top = (t.clientY - r.top) + 'px'; base.classList.add('act'); set(0); }), NP);
  zone.addEventListener('touchmove', (e) => each(e, (t) => { if (t.identifier === id) set(t.clientX - ox); }), NP);
  const end = (e) => each(e, (t) => { if (t.identifier !== id) return; id = null; base.classList.remove('act'); base.style.left = base.style.top = ''; set(0); });
  zone.addEventListener('touchend', end, NP); zone.addEventListener('touchcancel', end, NP);
  $('bBark').addEventListener('touchstart', (e) => { e.preventDefault(); touch.paddle = true; paddle(); }, NP);
  for (const ev of ['touchend', 'touchcancel']) $('bBark').addEventListener(ev, (e) => { e.preventDefault(); touch.paddle = false; }, NP);
  $('bMusic').addEventListener('touchstart', (e) => { e.preventDefault(); if (audio.on) $('bMusic').classList.toggle('off', !audio.toggleMusic()); }, NP);
  for (const g of ['gesturestart', 'gesturechange']) document.addEventListener(g, (e) => e.preventDefault());
}

// ------------------------------------------------------------------ game flow
function reset() {
  if (G.speedboat) setBoat(false);
  Object.assign(G, { t: 0, time: 0, s: 0, u: 0, uv: 0, v: 0, boost: 0, lives: 3, bones: 0, inv: 0, cd: 0, stroke: 0, spin: 0, shake: 0, endT: 0, places: 0, landed: 0, hopD: 0, hopC: 0 }); G.hints.clear();
  for (let i = items.length - 1; i >= 0; i--) if (items[i].dyn) items.splice(i, 1);
  for (const it of items) { it.got = false; if (it.m) it.m.visible = true; }
  Object.assign(A, { mode: 'off', timer: 9, n: 0, lastDrop: 0, k: 0 }); for (const q of A.who) q.g.visible = false;
  raft.add(dog.root); dog.root.position.set(0, 0.16, 0.48); dog.root.rotation.set(0, 0, 0); raft.add(cat.root); cat.root.position.set(0, 0.2, -0.62); cat.root.rotation.set(0, 0, 0); raft.visible = true; raft.rotation.set(0, Math.PI, 0);
  puppies.forEach((p, i) => { p.x = cx(BEACH.s) + half(BEACH.s) + 4 + (i % 3) * 1.1; p.z = -BEACH.s - 2 + Math.floor(i / 3) * 1.4 + i * 0.5; p.y = 0; p.vy = 0; });
}
function startGame() {
  if (G.mode !== 'title') return;
  audio.start(); G.mode = 'play'; $('title').classList.add('hidden'); for (const id of ['rTop', 'rLives', 'rMila']) $(id).style.opacity = 1;
  setTimeout(() => { if (G.mode === 'play') hint('h_start'); }, 700); audio.bark(); dog.bark(); setTimeout(() => audio.meow(), 500);
}
function toTitle() { reset(); G.mode = 'title'; $('end').classList.add('hidden'); $('title').classList.remove('hidden'); for (const id of ['rTop', 'rLives', 'rMila']) $(id).style.opacity = 0; }
function finish(win) {
  const stars = win ? (G.lives === 3 && G.time < 175 ? '★★★' : G.lives >= 2 || G.time < 175 ? '★★☆' : '★☆☆') : '';
  $('endTitle').textContent = T(win ? 'winT' : 'loseT'); $('endText').textContent = win ? T('winX', clock(G.time), G.bones, stars) : T('loseX', Math.max(0, Math.round(END - G.s)));
  $('end').classList.remove('hidden'); $('menu').style.display = ''; for (const id of ['rTop', 'rLives', 'rMila', 'hint', 'pick']) $(id).style.opacity = 0;
}
function damage(ox, oz, type) {
  if (G.inv > 0) return; G.lastHit = type; G.lives--; G.inv = 1.7; G.boost = -4.5; G.shake = 0.7; G.spin = (Math.random() < 0.5 ? -1 : 1) * 1.2; buzz(150); pick(T('hit'));
  const X = cx(G.s) + G.u; G.uv = clamp((X - ox) * 6, -7, 7); if (Math.abs(G.uv) < 2) G.uv = (G.u > 0 ? -1 : 1) * 4;
  if (audio.on) { audio.crack(); audio.yelp(); setTimeout(() => audio.meow(1.3), 250); }
  $('flash').style.opacity = 1; setTimeout(() => { $('flash').style.opacity = 0; }, 200);
  for (let k = 0; k < 30; k++) pAlpha.spawn(X, 0.2, -G.s, (Math.random() - 0.5) * 6, 2 + Math.random() * 4, (Math.random() - 0.5) * 6, 0.8, 0.14, 0.4, 0.92, 0.96, 1, 0.85, 10, 0.5);
  if (G.lives <= 0) { G.mode = 'over'; G.endT = 0; if (audio.on) audio.night(); }
}

function step(dt) {
  G.t += dt; const play = G.mode === 'play', moving = play || G.mode === 'land';
  G.inv = Math.max(0, G.inv - dt); G.cd = Math.max(0, G.cd - dt); G.stroke = Math.max(0, G.stroke - dt * 2.4); G.shake = Math.max(0, G.shake - dt * 1.8);
  if (play && (keys.ArrowUp || keys.KeyW || keys.Space || touch.paddle)) paddle();          // holding the key or the button keeps the paddles going
  if (G.bot && play) bot();
  // ---- the raft
  let steer = clamp((keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + touch.x + input.x, -1, 1), slow = 1, fast = 0;
  const X = cx(G.s) + G.u, hw = half(G.s) - 1.05;
  if (play) {
    G.time += dt;
    for (const l of lanes) if (G.s > l.s0 && G.s < l.s1 && Math.abs(G.u - l.u) < 1.9) { fast = 4.2; hint('h_lane'); }
    for (const o of obs) {
      const os = o.k ? o.k.s : o.s; if (Math.abs(os - G.s) > 7) continue;
      const ou = o.k ? o.k.u : o.u, ox = cx(os) + ou, dx = ox - X, dz = os - G.s, d = Math.hypot(dx, dz);
      if (o.type === 'whirl') { if (d < o.r + 1.7) { const k = 1 - d / (o.r + 1.7); slow = Math.min(slow, lerp(0.8, 0.22, Math.min(1, k * 1.5))); G.uv += Math.sign(dx) * 19 * k * dt; G.spin += dt * 8 * k; if (k > 0.25) hint('h_whirl'); } }      // the pull reaches well beyond the funnel and is hard to fight near the middle
      else if (o.type === 'sand') { if (d < o.r) { slow = Math.min(slow, 0.5); hint('h_sand'); if (Math.random() < dt * 20) pAlpha.spawn(X + (Math.random() - 0.5), 0.1, -G.s + 1, 0, 0.6, 2, 0.5, 0.2, 0.6, 0.85, 0.78, 0.55, 0.5, 2, 1); } }
      else if (d < o.r + 1.0) damage(ox, -os, o.type);
    }
    for (const it of items) if (!it.got && Math.abs(it.s - G.s) < 1.6 && Math.abs(it.u - G.u) < 1.5) {
      it.got = true; if (it.kind === 'bone') { G.bones++; if (audio.on) audio.coin(G.bones % 6); for (let k = 0; k < 5; k++) pAdd.spawn(cx(it.s) + it.u, 0.9, -it.s, (Math.random() - 0.5) * 3, Math.random() * 3, (Math.random() - 0.5) * 3 - G.v * 0.5, 0.5, 0.2, 0.02, 4, 3, 1, 1, 4, 1); }
      else { it.m.visible = false; if (G.lives < 3) G.lives++; pick(T('patch')); buzz(30); if (audio.on) audio.pickup('mirror'); }
    }
    for (const q of BR) if (q - G.s < 60 && q - G.s > 40) hint('h_bridge');
    const marks = [[20, 'p1'], [420, 'p2'], [BR[1] - 70, 'p3'], [END - 110, 'p4']]; if (G.places < marks.length && G.s > marks[G.places][0]) { place(T(marks[G.places][1])); if (G.places === 3) hint('h_beach'); G.places++; }
    if (G.s >= END) { G.mode = 'land'; G.endT = 0; if (audio.on) audio.fanfare(); for (const id of ['rTop', 'rLives', 'rMila', 'hint']) $(id).style.opacity = 0; }
  }
  if (G.mode === 'land') { steer = clamp((half(G.s) - 0.4 - G.u) * 0.5, -1, 1); slow = 0.45 * (1 - sm(END + 14, BEACH.s, G.s)) + 0.02; if (G.s >= BEACH.s - 0.5 || G.v < 0.25) { G.mode = 'win'; G.endT = 0; scene.attach(dog.root); scene.attach(cat.root); G.from = dog.root.position.clone(); G.fromC = cat.root.position.clone(); } }
  const target = moving ? (6.4 + 2.6 * sm(0, END, G.s) + fast) * slow * (G.speedboat && G.mode === 'play' ? 3.5 : 1) : 0;
  G.boost += (0 - G.boost) * Math.min(1, dt * (G.boost < 0 ? 1.6 : 0.9));
  G.v += (Math.max(0.6 * (moving ? 1 : 0), target + G.boost * slow) - G.v) * Math.min(1, dt * 2.2);
  G.uv += (steer * (G.speedboat ? 12.5 : 7.5) - G.uv) * Math.min(1, dt * (G.speedboat ? 5 : 3.2));
  if (G.speedboat && moving) for (let q = 0; q < 3; q++) { raft.localToWorld(tmpV.set((Math.random() - 0.5) * 1.2, 0.2, -2.6)); pAlpha.spawn(tmpV.x, 0.2, tmpV.z, (Math.random() - 0.5) * 3, 2 + Math.random() * 4, 2 + Math.random() * 3, 0.8, 0.3, 1.1, 0.95, 0.98, 1, 0.7, 9, 0.5); }      // the rooster tail behind the outboards if (!moving) G.uv *= 1 - Math.min(1, dt * 3);
  G.s += G.v * dt; G.u += G.uv * dt;
  const lim = G.mode === 'land' ? half(G.s) - 0.3 : hw; if (Math.abs(G.u) > lim) { G.u = Math.sign(G.u) * lim; if (play && Math.abs(G.uv) > 1) { G.boost = Math.min(G.boost, -1.2); if (Math.random() < dt * 30) pAlpha.spawn(cx(G.s) + G.u, 0.15, -G.s, 0, 1, 1, 0.5, 0.2, 0.6, 0.8, 0.75, 0.6, 0.5, 3, 1); } G.uv = 0; }
  G.spin += (0 - G.spin) * Math.min(1, dt * 1.8);
  const rx = cx(G.s) + G.u, head = Math.atan2(slope(G.s) + G.uv / Math.max(3, G.v), -1), bob = Math.sin(G.t * 2.3) * 0.045;
  { const fx = Math.sin(head), fz = Math.cos(head), z0 = -G.s, hF = surfH(rx + fx * 1.0, z0 + fz * 1.0, G.t), hB = surfH(rx - fx * 1.0, z0 - fz * 1.0, G.t), hR = surfH(rx + fz * 0.75, z0 - fx * 0.75, G.t), hL = surfH(rx - fz * 0.75, z0 + fx * 0.75, G.t), k = Math.min(1, dt * 9);
    G.wy = (G.wy || 0) + ((hF + hB + hR + hL) / 4 - (G.wy || 0)) * k; G.wp = (G.wp || 0) + (-Math.atan((hF - hB) / 2) - (G.wp || 0)) * k; G.wr = (G.wr || 0) + (Math.atan((hR - hL) / 1.5) - (G.wr || 0)) * k; }
  raft.position.set(rx, 0.04 + bob * 0.3 + G.wy, -G.s); raft.rotation.set(G.wp * 1.8 - G.boost * 0.012, head + G.spin, G.wr * 1.8 - G.uv * 0.022 + Math.sin(G.t * 2.1) * 0.02, 'YXZ');
  raft.visible = G.mode !== 'over' || G.endT < 1.2; if (G.mode === 'over') raft.position.y -= G.endT * 0.5;
  if (play && G.inv > 0) raft.visible = Math.floor(G.t * 14) % 2 === 0;
  for (const p of paddles) { const k = Math.sin(G.stroke * Math.PI); p.piv.rotation.x = -0.5 + k * 1.3; p.piv.rotation.z = p.sd * (0.7 + k * 0.25); }
  if (moving && Math.random() < dt * (10 + G.v * 3)) { raft.localToWorld(tmpV.set((Math.random() - 0.5) * 1.4, 0, -1.5)); pAlpha.spawn(tmpV.x, 0.06, tmpV.z, (Math.random() - 0.5) * 0.8, 0.25, 0.6, 1.1, 0.25, 0.9, 0.95, 0.98, 1, 0.42, 0, 0.6); }
  // ---- passengers
  const onRaft = G.mode !== 'win';
  if (onRaft) { dog.animate(dt, { speed: 0, grounded: true, sit: 1, happy: fast || G.boost > 1 ? 1 : 0.3, pant: true, lookY: clamp(-G.uv * 0.08, -0.5, 0.5) }); cat.animate(dt, { speed: 0, grounded: true, sit: 1, lookY: Math.sin(G.t * 0.8) * 0.5 }); cat.root.rotation.z = G.inv > 0 ? Math.sin(G.t * 40) * 0.1 : 0; }
  else {                                                     // on the beach: both hop ashore, the puppies come running, everybody barks
    G.endT += 0; const bx = cx(BEACH.s) + half(BEACH.s) + 3.2, bz = -BEACH.s, k = sm(0.2, 1.3, G.endT), kc = sm(0.9, 2.0, G.endT);
    dog.root.position.set(lerp(G.from.x, bx, k), lerp(G.from.y, bankY(3.2) * 0.45, k) + Math.sin(k * Math.PI) * 1.3 + G.hopD, lerp(G.from.z, bz, k)); dog.root.rotation.set(0, k < 1 ? Math.PI / 2 : Math.PI / 2 + Math.sin(G.endT * 2) * 0.5, 0);
    cat.root.position.set(lerp(G.fromC.x, bx + 0.9, kc), lerp(G.fromC.y, bankY(4) * 0.45, kc) + Math.sin(kc * Math.PI) * 1.1, lerp(G.fromC.z, bz + 1.3, kc)); cat.root.rotation.set(0, -Math.PI / 2, 0);
    G.hopV = (G.hopV || 0) - 16 * dt; G.hopD = Math.max(0, G.hopD + G.hopV * dt); G.party = (G.party || 0) - dt;
    if (k >= 1 && G.endT < 7 && G.party <= 0) { G.party = 0.9; G.hopV = 4.2; G.hopD = 0.01; audio.bark(0.95 + Math.random() * 0.2); dog.bark();
      const c = [[5, 3.5, 1], [5, 1.2, 1.6], [1.4, 3, 5], [2, 5, 1.5]][(Math.random() * 4) | 0]; for (let q = 0; q < 40; q++) { const a = Math.random() * 6.28, b2 = Math.acos(2 * Math.random() - 1), v = 2.4 + Math.random() * 1.4; pAdd.spawn(bx + (Math.random() - 0.5) * 6, 3 + Math.random() * 1.5, bz + (Math.random() - 0.5) * 6, Math.sin(b2) * Math.cos(a) * v, Math.cos(b2) * v, Math.sin(b2) * Math.sin(a) * v, 1.2, 0.3, 0.04, c[0], c[1], c[2], 1, 1.6, 1.2); } }
    dog.animate(dt, { speed: k < 1 ? 5 : 0, grounded: k >= 1 && G.hopD <= 0, vy: G.hopV, sit: G.endT > 7 ? 1 : 0, happy: 1, pant: true }); cat.animate(dt, { speed: kc < 1 ? 4 : 0, grounded: kc >= 1, sit: kc >= 1 ? 1 : 0 });
    puppies.forEach((p, i) => { const a = G.endT * 2.5 + i * 1.2566, tx = bx + Math.sin(a) * 1.8, tz = bz + Math.cos(a) * 1.8, dx = tx - p.x, dz = tz - p.z, dd = Math.hypot(dx, dz) || 1, v = Math.min(8, dd * 6); p.x += dx / dd * v * dt; p.z += dz / dd * v * dt; p.yaw = Math.atan2(dx, dz);
      if (p.y <= 0 && Math.random() < dt * 2) { p.vy = 3.6 + Math.random() * 1.4; p.y = 0.01; if (audio.on) audio.yip(1.5 + Math.random() * 0.7); p.d.bark(); } });
  }
  for (const p of puppies) { if (p.y > 0 || p.vy > 0) { p.vy -= 18 * dt; p.y = Math.max(0, p.y + p.vy * dt); } const d = (p.x - cx(BEACH.s) - half(BEACH.s)); p.d.root.position.set(p.x, bankY(Math.max(0, d)) * 0.45 + p.y, p.z); p.d.root.rotation.y = p.yaw === undefined ? -Math.PI / 2 : p.yaw; p.d.root.visible = G.s > END - 160; if (p.d.root.visible) p.d.animate(dt, { speed: G.mode === 'win' ? 5 : 0, grounded: p.y <= 0, vy: p.vy, sit: G.mode === 'win' ? 0 : 1, happy: 0.9, pant: true }); }
  // ---- things in the water
  if (HQ) {
    for (const d of G.ducks) { if (Math.abs(d.s - G.s) > 110) { d.m.visible = false; continue; } d.m.visible = true; const a = G.t * 0.25 + d.ph, ss = d.s + Math.sin(a) * 1.6, u = d.sd * (half(ss) - 1.0 + Math.cos(a) * 0.5), x = cx(ss) + u; d.m.position.set(x, 0.02 + waveH(x, -ss, G.t), -ss); d.m.rotation.set(Math.sin(G.t * 2 + d.ph) * 0.06, Math.atan2(-Math.sin(a) * 0.5 * d.sd, -Math.cos(a) * 1.6), 0); }
    for (const o of obs) { if (o.type !== 'rock' || Math.abs(o.s - G.s) > 55 || Math.random() > dt * 5) continue; const a = Math.random() * 6.28, x = cx(o.s) + o.u + Math.cos(a) * o.r * 1.05, z = -o.s + Math.sin(a) * o.r * 1.05; pAlpha.spawn(x, 0.12 + waveH(x, z, G.t), z, Math.cos(a) * 0.4, 0.35, Math.sin(a) * 0.4 - 1.2, 0.9, 0.25, 0.8, 0.95, 0.98, 1, 0.5, 1.5, 0.8); }      // foam where the current breaks on the rocks
    G.fishT -= dt; if (G.fishT <= 0 && play && !G.fish.visible) { G.fish.visible = true; G.fishJ = { t: 0, s: G.s + 14 + Math.random() * 16, u: (Math.random() - 0.5) * (half(G.s) * 1.4), dir: Math.random() < 0.5 ? -1 : 1 }; const x = cx(G.fishJ.s) + G.fishJ.u; for (let k = 0; k < 9; k++) pAlpha.spawn(x, 0.15, -G.fishJ.s, (Math.random() - 0.5) * 2, 1.5 + Math.random() * 2, (Math.random() - 0.5) * 2, 0.5, 0.12, 0.3, 0.9, 0.95, 1, 0.8, 9, 0.5); if (audio.on) audio.splash(0.07); }
    if (G.fish.visible) { const j = G.fishJ; j.t += dt; const k = j.t / 0.75, x = cx(j.s) + j.u + j.dir * k * 1.5, y = Math.sin(k * Math.PI) * 0.95 - 0.05; G.fish.position.set(x, y, -j.s); G.fish.rotation.set(0, j.dir * Math.PI / 2, 0); G.fish.rotation.z = 0; G.fish.rotation.x = (k - 0.5) * 2.2; if (k >= 1) { G.fish.visible = false; G.fishT = 4 + Math.random() * 6; for (let q = 0; q < 7; q++) pAlpha.spawn(x, 0.15, -j.s, (Math.random() - 0.5) * 2, 1.2 + Math.random() * 1.5, (Math.random() - 0.5) * 2, 0.45, 0.12, 0.3, 0.9, 0.95, 1, 0.8, 9, 0.5); } }
    if (Math.random() < dt * 7) { const sd = Math.random() < 0.5 ? -1 : 1, ss = G.s + 4 + Math.random() * 30; pAdd.spawn(cx(ss) + sd * (half(ss) - 0.8 + Math.random() * 2.2), 0.5 + Math.random() * 0.8, -ss, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 3, 0.5, 0.07, 0.05, 0.8, 2.2, 3.2, 0.9, 0, 0.5); }      // dragonflies glinting over the reeds
  }
  if (G.tavern && Math.abs(G.tavern.s - G.s) < 130 && Math.random() < dt * 6) pAlpha.spawn(G.tavern.x + (Math.random() - 0.5) * 0.2, G.tavern.y, G.tavern.z, 0.3 + Math.random() * 0.3, 0.7, -0.2 + Math.random() * 0.2, 3.5, 0.3, 1.6, 0.6, 0.6, 0.62, 0.22, -0.02, 0.2);      // smoke from the fryer
  for (const k of kayaks) { if (Math.abs(k.s - G.s) > 130) { k.g.visible = false; continue; } k.g.visible = true; const a = G.t * k.w + k.ph; k.u = Math.sin(a) * k.amp; k.g.position.set(cx(k.s) + k.u, 0.03 + waveH(cx(k.s) + k.u, -k.s, G.t), -k.s); k.g.rotation.y = Math.cos(a) > 0 ? Math.PI / 2 : -Math.PI / 2; k.p.rotation.x = Math.sin(G.t * 4 + k.ph) * 0.6; if (play && k.s - G.s < 45 && k.s > G.s) hint('h_kayak'); }
  if (HQ) { let k = 0; for (const w of whirls) if (w.s > G.s - 60 && w.s < G.s + 320 && k < 12) whU.value[k++].set(w.x, -w.s, w.r * WH_K * 0.92); for (; k < 12; k++) whU.value[k].set(1e6, 1e6, 1);
    whirls.forEach((w, wi) => { for (let i = 0; i < 6; i++) { const u = (G.t * 0.11 + i / 6 + wi * 0.37) % 1, rr = 0.95 - u * 0.88, a = i * 1.047 + wi + G.t * 1.5 / (rr + 0.22), R = rr * w.r * WH_K; dummy.position.set(w.x + Math.cos(a) * R, 0.05 - WH_DEPTH * Math.pow(1 - rr, 2.3), -w.s + Math.sin(a) * R); dummy.rotation.set(0, -a + 1.57, 0.3 * (1 - rr)); dummy.scale.setScalar(0.5 + rr * 0.6); dummy.updateMatrix(); G.debris.setMatrixAt(wi * 6 + i, dummy.matrix); } }); G.debris.instanceMatrix.needsUpdate = true; }
  else for (const w of whirls) if (Math.abs(w.s - G.s) < 90) w.m.rotation.y = -G.t * 2.4;
  for (const l of lanes) l.m.material.map.offset.y = -G.t * 1.6;
  updateArtur(dt, play);
  let n = 0; for (const it of items) { if (it.got || it.s < G.s - 6 || it.s > G.s + 130) continue; const x = cx(it.s) + it.u; if (it.kind === 'bone') { if (n < 140) { dummy.position.set(x, 0.95 + Math.sin(G.t * 3 + it.s) * 0.08, -it.s); dummy.rotation.set(0.3, G.t * 3 + it.s, 0.5); dummy.scale.setScalar(1.5); dummy.updateMatrix(); boneMesh.setMatrixAt(n++, dummy.matrix); } } else { it.m.position.set(x, 0.9 + Math.sin(G.t * 2.5) * 0.1, -it.s); it.m.rotation.y = G.t * 2; } }
  boneMesh.count = n; boneMesh.instanceMatrix.needsUpdate = true;
  pAdd.update(dt); pAlpha.update(dt);
  // ---- camera, light, water
  const title = G.mode === 'title', win = G.mode === 'win', tall = camera.aspect < 1 ? 1 : 0, sh = G.shake * G.shake * 0.3;
  if (title) { camera.position.lerp(tmpV.set(rx + 3.6, 1.6, -G.s - 4.6), Math.min(1, dt * 3)); camera.lookAt(rx, 0.7, -G.s); }
  else if (win) { const a = 0.4 + Math.sin(G.endT * 0.4) * 0.5, bx = cx(BEACH.s) + half(BEACH.s) + 3.2; camera.position.lerp(tmpV.set(bx - 5.5 - tall * 2, 2.2, -BEACH.s + Math.sin(a) * 6), Math.min(1, dt * 2)); camera.lookAt(bx + 0.5, 0.9, -BEACH.s); }
  else { const hd = Math.atan(slope(G.s)) * 0.8, back = 7.6 + tall * 2.5 + clamp(G.v - 7, 0, 5) * 0.25; camera.position.lerp(tmpV.set(rx * 0.85 + cx(G.s) * 0.15 - Math.sin(hd) * back, 4.3 + tall * 1.6, -G.s + Math.cos(hd) * back), Math.min(1, dt * (G.speedboat ? 16 : 5))); camera.position.x += (Math.random() - 0.5) * sh; camera.position.y += (Math.random() - 0.5) * sh; camera.lookAt(lerp(rx, cx(G.s + 11), 0.6), 0.6, -G.s - 11); }
  const fov = 60 + tall * 8 + clamp(G.v - 7, 0, 6) * 1.6; if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 3); camera.updateProjectionMatrix(); }
  water.position.set(0, 0, -G.s - 110); waterU.uTime.value = G.t; skyU.uTime.value = G.t; G.dome.position.copy(camera.position); sky.position.copy(camera.position);
  sun.target.position.set(rx, 0, -G.s - 6); sun.position.copy(sun.target.position).addScaledVector(skyU.uSunDir.value, 70); sun.target.updateMatrixWorld();
  // ---- endings, HUD, sound
  if (G.mode === 'win' || G.mode === 'over') { G.endT += dt; if (G.endT > (win ? 8 : 2) && $('end').classList.contains('hidden')) finish(win); }
  hud(); if (hintT > 0) { hintT -= dt; if (hintT <= 0) $('hint').style.opacity = 0; } if (pickT > 0) { pickT -= dt; if (pickT <= 0) $('pick').style.opacity = 0; }
  if (audio.on) { audio.musicRun({ play: moving, soft: win, stage: 0 }); audio.river.g.gain.setTargetAtTime(moving ? 0.1 + G.v * 0.008 : 0.05, audio.ctx.currentTime, 0.4); }
  $('touch').classList.toggle('on', play);
}
// steers for the gap in whatever comes next and paddles when the way is clear (used for testing)
function bot() {
  let ev = null; for (const e of events) if (e.s > G.s - 3) { ev = e; break; }
  let goal = ev ? ev.gap : 0;
  if (ev && ev.kayak) { const k = ev.kayak, dt = (k.s - G.s) / Math.max(4, G.v), ku = Math.sin((G.t + dt) * k.w + k.ph) * k.amp; goal = ku > 0 ? -k.amp + 0.6 : k.amp - 0.6; }
  input.x = clamp((goal - G.u) * 0.9 - G.uv * 0.12, -1, 1);
  if (G.cd <= 0 && (!ev || ev.s - G.s > 14 || Math.abs(goal - G.u) < 1.2)) paddle();
}

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
  document.body.classList.add('raft'); if (isTouch) document.body.classList.add('touch');
  await new Promise((r) => setTimeout(r, 30));
  tex = createTextures();
  buildRiver(); buildCourse(); buildRaft(); buildArtur();
  dog = buildDog(tex, {}); cat = buildCat({ scale: 1.15 }); if (HQ) { addFur(dog.root, DOG_FUR); addFur(cat.root, CAT_FUR); }
  for (let i = 0; i < 5; i++) { const d = buildDog(tex, { scale: 0.43, head: 1.3, leg: 0.8, ear: 1.15, snout: 0.72 }); scene.add(d.root); puppies.push({ d, x: 0, z: 0, y: 0, vy: 0 }); }
  pAdd = new Particles(600, true); pAlpha = new Particles(700, false); scene.add(pAdd.mesh, pAlpha.mesh);
  $('rCat').textContent = '🏖'; $('rCat').style.left = '100%'; $('bJump').style.display = 'none';
  reset(); G.mode = 'title'; applyLang();
  $('start').addEventListener('click', startGame);
  $('lang').addEventListener('click', () => { lang = lang === 'pl' ? 'en' : 'pl'; applyLang(); });
  $('again').addEventListener('click', () => { const bt = G.bot; toTitle(); G.bot = bt; startGame(); });
  $('menu').addEventListener('click', toTitle);
  step(0.016); camera.position.set(3.6, 1.6, -4.6); renderer.compile(scene, camera); draw();
  window.__raft = { setBoat, G, A, obs, items, events, kayaks, lanes, whirls, input, audio, step, startGame, reset, toTitle, paddle, renderer, scene, camera, cx, half, END,
    sim: (secs, dt = 1 / 60) => { for (let t = 0; t < secs; t += dt) step(dt); draw(); return { mode: G.mode, s: +G.s.toFixed(0), u: +G.u.toFixed(1), v: +G.v.toFixed(1), lives: G.lives, bones: G.bones, time: +G.time.toFixed(0) }; } };
  $('title').classList.remove('hidden'); $('loading').style.opacity = 0; setTimeout(() => $('loading').remove(), 1100);
  last = performance.now(); requestAnimationFrame(frame);
}
boot().catch((e) => { console.error(e); $('loading').textContent = 'Błąd: ' + e.message; });
