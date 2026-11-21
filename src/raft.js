// Level 4 – "Spływ Narwią": Łatka and Mila ride an inflatable raft down the river from the bridge in Serock to the beach.
// The current carries them; the player steers and paddles. The river is one fixed winding channel: every point is
// (s, u) – distance downstream and offset from the middle – and x = cx(s) + u, z = -s.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createTextures, sm, lerp, clamp, rng } from './textures.js';
import { Builder, roofGeo, canvasTex, worldMat } from './kit.js';
import { buildDog } from './dog.js';
import { buildCat } from './cat.js';
import { Particles, fogUniforms } from './fx.js';
import { AudioSys } from './audio.js';

const $ = (id) => document.getElementById(id);
const TXT = {
  pl: {
    over: 'Poziom 4', title: 'Spływ Narwią', start: 'Odbijamy!', again: 'Jeszcze raz', menu: 'Menu',
    story: 'Łatka i Mila płyną pontonem od mostu w Serocku aż na plażę. Steruj, wiosłuj, omijaj skały, kłody i kajakarzy — i nie daj się wciągnąć wirom!',
    keys: 'A / D lub ← → — ster · Spacja lub W — wiosło · M — muzyka',
    keys_t: 'Lewy kciuk w lewo / w prawo — ster · przycisk — wiosło',
    time: (t) => `Czas: ${t}`, bones: (n) => `Kości: ${n}`, left: (m) => `Do plaży: ${m} m`, paddle: 'Wiosło',
    h_start: 'Nurt niesie ponton. Steruj na boki i wiosłuj, żeby przyspieszyć.', h_lane: 'Bystry nurt — tu płynie się szybciej!', h_whirl: 'Wir! Wiosłuj, żeby się wyrwać!',
    h_sand: 'Mielizna — ponton zwalnia.', h_bridge: 'Przepłyń między filarami mostu.', h_kayak: 'Uwaga, kajakarz!', h_beach: 'Widać plażę!',
    hit: 'Auć! Dziura w pontonie!', patch: 'Łatka na ponton! +1', k_place: 'Narew', p1: 'Most w Serocku', p2: 'Wielkie Zakole', p3: 'Stary Most', p4: 'Plaża',
    winT: 'Dopłynęli!', winX: (t, b, s) => `Łatka i Mila są na plaży. Czas: ${t} · kości: ${b}. ${s}`,
    loseT: 'Ponton zatonął…', loseX: (m) => `Łatka i Mila dopłynęły do brzegu wpław, ${m} m przed plażą. Spróbuj jeszcze raz!`,
  },
  en: {
    over: 'Level 4', title: 'Down the Narew', start: 'Cast off!', again: 'Again', menu: 'Menu',
    story: 'Łatka and Mila ride a raft from the bridge in Serock all the way to the beach. Steer, paddle, dodge rocks, logs and kayakers — and stay out of the whirlpools!',
    keys: 'A / D or ← → — steer · Space or W — paddle · M — music',
    keys_t: 'Left thumb left / right — steer · button — paddle',
    time: (t) => `Time: ${t}`, bones: (n) => `Bones: ${n}`, left: (m) => `To the beach: ${m} m`, paddle: 'Paddle',
    h_start: 'The current carries the raft. Steer sideways and paddle to go faster.', h_lane: 'Fast water — the raft speeds up here!', h_whirl: 'A whirlpool! Paddle to break free!',
    h_sand: 'A sandbank — the raft slows down.', h_bridge: 'Pass between the piers of the bridge.', h_kayak: 'Mind the kayaker!', h_beach: 'The beach is in sight!',
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
function resize() { const w = Math.max(2, window.innerWidth), h = Math.max(2, window.innerHeight); camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setPixelRatio(pixelRatio); renderer.setSize(w, h, false); }
window.addEventListener('resize', resize); resize();

// ------------------------------------------------------------------ the river
const END = 1500, LEN = END + 120, CH = 40, BR = [44, 830];           // BR: bridges
const cx0 = (s) => 26 * Math.sin(s * 0.0105) + 12 * Math.sin(s * 0.023 + 1.3) + 5 * Math.sin(s * 0.051 + 0.4);
const cx = (s) => (cx0(s) - cx0(0)) * sm(0, 120, s);                   // straight for the first stretch, then it starts to wind
const half = (s) => 6.4 + 1.5 * Math.sin(s * 0.013 + 2) + 4.5 * sm(END - 70, END + 30, s);
const slope = (s) => (cx(s + 1) - cx(s - 1)) / 2;
const PROFILE = [[-0.9, -0.55], [0, 0.03], [1.8, 0.26], [4.5, 1.0], [10, 1.45], [75, 1.9]];
const bankY = (d) => { for (let i = 1; i < PROFILE.length; i++) if (d <= PROFILE[i][0]) { const a = PROFILE[i - 1], b = PROFILE[i]; return lerp(a[1], b[1], (d - a[0]) / (b[0] - a[0])); } return 1.9; };
const BEACH = { s: END + 34 };

// ------------------------------------------------------------------ state
const G = { mode: 'load', t: 0, time: 0, s: 0, u: 0, uv: 0, v: 0, boost: 0, lives: 3, bones: 0, inv: 0, cd: 0, stroke: 0, spin: 0, shake: 0, endT: 0, hints: new Set(), bot: false, places: 0 };
const keys = {}, touch = { x: 0 }, input = { x: 0, paddle: false };
const audio = new AudioSys();
let dog, cat, tex, pAdd, pAlpha, sun, hemi, skyU, water, waterU, raft, paddles = [], boneMesh, puppies = [];
const obs = [], items = [], events = [], lanes = [], whirls = [], kayaks = [];
const dummy = new THREE.Object3D(), tmpV = new THREE.Vector3(), tmpC = new THREE.Color();

function buildRiver() {
  // sky
  skyU = { uTop: { value: new THREE.Color(0.05, 0.27, 0.9) }, uHor: { value: new THREE.Color(0.6, 0.8, 1.0) }, uSun: { value: new THREE.Color(1, 0.94, 0.8) }, uSunDir: { value: new THREE.Vector3(0.35, 0.62, -0.7).normalize() }, uTime: { value: 0 } };
  const dome = new THREE.Mesh(new THREE.SphereGeometry(700, 32, 16), new THREE.ShaderMaterial({ uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uTop, uHor, uSun, uSunDir; uniform float uTime; varying vec3 vDir;
      float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
      float fb(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * vn(p); p = p * 2.07 + 7.1; a *= 0.5; } return s / 0.9375; }
      void main(){ vec3 d = normalize(vDir); float h = max(d.y, 0.0); vec3 c = mix(uHor, uTop, pow(h, 0.5));
        float sd = max(dot(d, uSunDir), 0.0); c += uSun * (pow(sd, 40.0) * 0.4 + pow(sd, 5.0) * 0.18 + smoothstep(0.9993, 0.99965, sd) * 8.0);
        if (d.y > 0.0) { vec2 q = d.xz / (d.y + 0.11) * 0.7 + vec2(uTime * 0.008, 0.0); float n = fb(q) * 0.68 + fb(q * 3.1 + 5.0) * 0.32, cov = smoothstep(0.56, 0.75, n) * smoothstep(0.0, 0.16, d.y);
          float lit = clamp((fb(q) - fb(q + normalize(uSunDir.xz) * 0.16)) * 3.2 + 0.55, 0.0, 1.0); c = mix(c, mix(mix(uTop, uHor, 0.55) * 0.7, vec3(1.08), lit), cov * 0.92); }
        c = mix(c, uHor, exp(-h * 11.0) * 0.7); gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` }));
  dome.frustumCulled = false; dome.renderOrder = -10; scene.add(dome); G.dome = dome;
  sun = new THREE.DirectionalLight(0xfff0d8, 3.2); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  const sc = sun.shadow.camera; sc.left = -20; sc.right = 20; sc.top = 26; sc.bottom = -16; sc.near = 1; sc.far = 140; sun.shadow.bias = -0.0007; sun.shadow.normalBias = 0.06; scene.add(sun, sun.target);
  hemi = new THREE.HemisphereLight(0xbcd8ff, 0x55683a, 1.05); scene.add(hemi);
  scene.fog = new THREE.FogExp2(0xa8cdf0, 0.0085); fogUniforms.uFogColor.value.copy(scene.fog.color); fogUniforms.uFogDensity.value = 0.0085;

  // water: one sheet that travels with the raft; ripples run downstream, the sun glints on them
  waterU = { uTime: { value: 0 }, uDeep: { value: new THREE.Color(0.05, 0.22, 0.3) }, uShal: { value: new THREE.Color(0.12, 0.4, 0.42) }, uSky: { value: new THREE.Color(0.55, 0.75, 0.95) }, uSun: { value: new THREE.Color(1, 0.95, 0.8) }, uSunDir: skyU.uSunDir, uFog: { value: scene.fog.color }, uFogD: { value: 0.0085 } };
  const wg = new THREE.PlaneGeometry(260, 420); wg.rotateX(-Math.PI / 2);
  water = new THREE.Mesh(wg, new THREE.ShaderMaterial({ uniforms: waterU,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float uTime, uFogD; uniform vec3 uDeep, uShal, uSky, uSun, uSunDir, uFog; varying vec3 vW;
      float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
      float fb(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 3; i++) { s += a * vn(p); p = p * 2.1 + 3.7; a *= 0.5; } return s / 0.875; }
      void main(){ vec2 p = vW.xz; float t = uTime;
        float n1 = fb(p * 0.3 + vec2(0.0, t * 0.8)), n2 = fb(p * 0.95 + vec2(t * 0.15, t * 1.5)), n3 = fb(p * 0.3 + vec2(4.0, t * 0.8 + 2.0));
        vec3 nrm = normalize(vec3((n1 - 0.5) * 0.55 + (n2 - 0.5) * 0.3, 1.0, (n3 - 0.5) * 0.55));
        vec3 V = normalize(cameraPosition - vW); float fres = pow(1.0 - max(dot(V, nrm), 0.0), 3.0);
        vec3 col = mix(uDeep, uShal, n1 * 0.7); col = mix(col, uSky, clamp(fres, 0.0, 1.0) * 0.8);
        col += uSun * pow(max(dot(nrm, normalize(V + uSunDir)), 0.0), 120.0) * 1.8;
        col += vec3(1.0) * smoothstep(0.74, 0.84, n2) * 0.1;
        float d = length(cameraPosition - vW); col = mix(col, uFog, 1.0 - exp(-uFogD * uFogD * d * d));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` }));
  water.frustumCulled = false; scene.add(water);

  // banks: a ribbon of sand rising into meadow on each side, with trees, reeds and the odd house
  const SAND = new THREE.Color(0xd9c58e), GRASS = new THREE.Color(0x4f8f3a), GRASS2 = new THREE.Color(0x3f7a30), DARK = new THREE.Color(0x4a5a3a);
  const GREENS = [0x3f7a2c, 0x4f8a34, 0x356b2a, 0x5c9440, 0x6fa040];
  for (let s0 = -40; s0 < LEN; s0 += CH) {
    const pos = [], col = [], idx = [], b = new Builder(500 + s0), r = b.r, N = CH / 2;
    for (const side of [-1, 1]) {
      const base = pos.length / 3;
      for (let i = 0; i <= N; i++) {
        const s = s0 + i * 2, beach = side > 0 ? sm(END - 90, END - 20, s) : 0;
        PROFILE.forEach(([d, y], j) => {
          const dd = d * (1 + beach * (j > 1 && j < 5 ? 1.6 : 0)); pos.push(cx(s) + side * (half(s) + dd), y * (1 - beach * 0.55) + (j === 0 ? 0 : 0), -s);
          const c = tmpC.copy(j <= 2 ? SAND : j === 3 ? GRASS : j === 4 ? GRASS2 : GRASS).lerp(SAND, j >= 3 ? beach * (j === 5 ? 0.25 : 1) : 0); if (j === 0) c.copy(DARK);
          const k = 0.92 + r() * 0.16; col.push(c.r * k, c.g * k, c.b * k);
        });
      }
      const P = PROFILE.length;
      for (let i = 0; i < N; i++) for (let j = 0; j < P - 1; j++) { const a = base + i * P + j, c = a + P; if (side > 0) idx.push(a, c, a + 1, a + 1, c, c + 1); else idx.push(a, a + 1, c, a + 1, c + 1, c); }
      // what grows and stands on this stretch of bank
      for (let k = 0; k < 15; k++) {
        const s = s0 + r() * CH, d = 3.5 + r() * r() * 44, x = cx(s) + side * (half(s) + d), y = bankY(d) - 0.05, q = r();
        if (side > 0 && s > END - 95 && d < 20) continue;                                     // keep the beach clear
        if (q < 0.4) { const h = 5 + r() * 5; b.cyl(0.02 * h, 0.035 * h, h * 0.3, x, y, -s, 0x5a4030); for (let i = 0; i < 4; i++) b.cone(h * (0.25 - i * 0.045), h * 0.36, x, y + h * (0.18 + i * 0.2), -s, i % 2 ? 0x2f5d33 : 0x27502d, 8); }
        else if (q < 0.8) { const sc = 0.8 + r() * 0.9; b.cyl(0.14 * sc, 0.22 * sc, 2.2 * sc, x, y, -s, 0x5d4632); b.blob(1.6 * sc, x, y + 3.2 * sc, -s, GREENS[(r() * 5) | 0], 0.9); b.blob(1.2 * sc, x + sc, y + 2.7 * sc, -s + 0.5, GREENS[(r() * 5) | 0]); b.blob(1.1 * sc, x - 0.9 * sc, y + 2.9 * sc, -s - 0.5, GREENS[(r() * 5) | 0]); }
        else { for (let i = 0; i < 3; i++) b.blob(0.6 + r() * 0.5, x + (r() - 0.5) * 2, y + 0.4, -s + (r() - 0.5) * 2, GREENS[(r() * 5) | 0], 0.75); }
      }
      for (let k = 0; k < 9; k++) {                                                            // reeds at the water's edge
        const s = s0 + r() * CH; if (side > 0 && s > END - 95) continue;
        const x0 = cx(s) + side * (half(s) + 0.1 + r() * 0.5); for (let i = 0; i < 5; i++) { const x = x0 + (r() - 0.5) * 0.9, z = -s + (r() - 0.5) * 1.6, h = 0.9 + r() * 0.9; b.cone(0.05, h, x, 0, z, 0x6f9a48, 4); if (i % 2) b.cyl(0.045, 0.045, 0.22, x, h * 0.86, z, 0x5a3c22, 5); }
      }
      if (r() < 0.3 && !(side > 0 && s0 > END - 140)) {                                        // a house up on the bank, sometimes with a jetty below it
        const s = s0 + 8 + r() * 24, d = 16 + r() * 10, x = cx(s) + side * (half(s) + d), y = bankY(d) - 0.1, wall = [0xeadcbe, 0xf3efe4, 0xe7c98c, 0xcfd8cf][(r() * 4) | 0];
        b.box(7, 3, 6, x, y, -s, wall, 0, 0.03); b.add(roofGeo(7.8, 2.4, 6.9), [0x9a3b2e, 0x80402f, 0x55565c][(r() * 3) | 0], x, y + 3, -s, 0, 0.04); b.box(1.1, 1.2, 0.08, x - 1.8, y + 1.2, -s + 3.02, 0x2c3f52, 0, 0); b.box(1.1, 1.2, 0.08, x + 1.8, y + 1.2, -s + 3.02, 0x2c3f52, 0, 0);
        const jx = cx(s) + side * (half(s) + 0.4); b.box(3.6, 0.12, 1.3, jx, 0.35, -s, 0x8a6a45); for (const dx of [-1.5, 1.5]) for (const dz of [-0.5, 0.5]) b.cyl(0.07, 0.07, 1.0, jx + dx, -0.5, -s + dz, 0x5d4632, 6);
      }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    const bank = new THREE.Mesh(g, worldMat); bank.receiveShadow = true; scene.add(bank);
    if (!b.empty) scene.add(b.mesh());
  }
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
  const rock = (s1, u, r) => { const x = cx(s1) + u; b.blob(r * 1.05, x, 0.15, -s1, 0x7d7a74, 0.7); b.blob(r * 0.6, x + r * 0.5, 0.1, -s1 + r * 0.4, 0x6a6862, 0.7); b.blob(r * 0.5, x - r * 0.5, 0.05, -s1 - r * 0.3, 0x8a877f, 0.6); obs.push({ type: 'rock', s: s1, u, r: r * 0.95 }); };
  while (s < END - 70) {
    const d = clamp(s / END, 0, 1), h = half(s) - 1.1, near = BR.some((q) => Math.abs(q - s) < 26), prev = gap;
    gap = clamp(prev + (R() - 0.5) * 2 * 4.5, -h + 1.6, h - 1.6);
    let type = near ? 'bridge' : pick(d < 0.12 ? ['rocks', 'lane', 'rocks', 'sand'] : ['rocks', 'rocks', 'log', 'whirl', 'kayak', 'sand', 'lane', 'log']);
    if (type === 'bridge') { const bs = BR.find((q) => Math.abs(q - s) < 26); gap = 0; events.push({ s: bs, gap: 0, type }); s = bs + 30; continue; }
    const ev = { s, gap, type }; events.push(ev);
    if (type === 'rocks') { const n = 2 + (R() < d ? 1 : 0); for (let i = 0; i < n; i++) { let u, t = 0; do { u = (R() * 2 - 1) * h; } while (Math.abs(u - gap) < 2.7 && t++ < 20); if (Math.abs(u - gap) >= 2.7) rock(s + (R() - 0.5) * 5, u, 0.8 + R() * 0.5); } }
    else if (type === 'log') { const side = gap > 0 ? -1 : 1, len = clamp(Math.abs(side * h - gap) - 2.7, 2, 9), uc = side * h - side * len / 2, x = cx(s) + uc, g = new THREE.CylinderGeometry(0.3, 0.34, len, 10); g.rotateZ(Math.PI / 2); b.add(g, 0x6b4a32, x, 0.12, -s); b.cyl(0.06, 0.08, 0.5, x + len * 0.2, 0.3, -s, 0x5c3f2a); for (let k = 0; k <= Math.floor(len / 1.1); k++) obs.push({ type: 'log', s, u: uc - len / 2 + 0.4 + k * 1.1, r: 0.55 }); }
    else if (type === 'sand') { const u = clamp(gap + (R() < 0.5 ? -1 : 1) * (3.4 + R() * 2), -h, h), x = cx(s) + u, g = new THREE.CylinderGeometry(2.6, 3.0, 0.14, 18); b.add(g, 0xe2cf9a, x, 0.0, -s, 0, 0.03); b.blob(0.3, x + 0.8, 0.14, -s - 0.5, 0x8a877f, 0.5); obs.push({ type: 'sand', s, u, r: 2.6 }); }
    else if (type === 'whirl') { const u = clamp(gap + (R() < 0.5 ? -1 : 1) * (4 + R() * 1.5), -h + 1, h - 1); whirls.push({ s, u, r: 2.7 }); obs.push({ type: 'whirl', s, u, r: 2.7 }); }
    else if (type === 'kayak') { kayaks.push({ s, amp: h - 0.6, w: 0.5 + R() * 0.35, ph: R() * 6, u: 0 }); ev.kayak = kayaks[kayaks.length - 1]; }
    else if (type === 'lane') { lanes.push({ s0: s - 4, s1: s + 34, u: gap }); ev.lane = true; }
    // bones: a line through the gap, leading on from the last one
    if (type !== 'kayak') for (let i = 0; i < 6; i++) { const k = i / 5, ss = s - 14 + k * (type === 'lane' ? 44 : 20); items.push({ s: ss, u: lerp(prev, gap, sm(0, 0.7, k)), kind: 'bone', got: false }); }
    if (events.length % 9 === 0) items.push({ s: s + 12, u: gap, kind: 'patch', got: false });
    s += type === 'lane' ? 50 : lerp(34, 24, d) + R() * 10 + (type === 'kayak' ? 8 : 0);
  }
  scene.add(b.mesh());
  // whirlpools, fast-water strips, kayakers, pickups
  const spiral = canvasTex(256, 256, (c, w) => { c.clearRect(0, 0, w, w); c.translate(w / 2, w / 2); for (let k = 0; k < 3; k++) { c.rotate(2.094); c.beginPath(); for (let a = 0; a < 9; a += 0.1) { const rr = 6 + a * 13; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 7; c.stroke(); } });
  for (const w of whirls) { const g = new THREE.CircleGeometry(w.r, 32); g.rotateX(-Math.PI / 2); w.m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: spiral, transparent: true, opacity: 0.8, depthWrite: false })); w.m.position.set(cx(w.s) + w.u, 0.05, -w.s); w.m.renderOrder = 3; scene.add(w.m);
    const dk = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x06202c, transparent: true, opacity: 0.45, depthWrite: false })); dk.position.copy(w.m.position); dk.position.y = 0.04; dk.renderOrder = 2; scene.add(dk); }
  const arrowT = canvasTex(64, 128, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 7; c.lineCap = 'round'; for (const y of [34, 98]) { c.beginPath(); c.moveTo(10, y + 16); c.lineTo(w / 2, y - 16); c.lineTo(w - 10, y + 16); c.stroke(); } });
  for (const l of lanes) { const n = Math.round((l.s1 - l.s0) / 2), pos = [], uv = [], idx = [];
    for (let i = 0; i <= n; i++) { const ss = lerp(l.s0, l.s1, i / n); pos.push(cx(ss) + l.u - 1.5, 0.045, -ss, cx(ss) + l.u + 1.5, 0.045, -ss); uv.push(0, i / 2, 1, i / 2); if (i < n) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    l.m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: arrowT, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide })); l.m.renderOrder = 3; scene.add(l.m); }
  kayaks.forEach((k, i) => { const kb = new Builder(1300 + i), col = [0xe2402f, 0xf2c230, 0x2f8fe0, 0x3fae5a][i % 4];
    kb.blob(1, 0, 0.12, 0, col, 0.2, 0.34, 1.9); kb.blob(0.26, 0, 0.3, -0.1, 0x1c1c22, 0.4, 1, 1.4); kb.box(0.36, 0.5, 0.24, 0, 0.32, -0.15, 0xf07a1a); kb.blob(0.14, 0, 1.0, -0.15, 0xe8b890); kb.blob(0.15, 0, 1.07, -0.17, 0xffffff, 0.7);
    k.g = new THREE.Group(); k.g.add(kb.mesh()); const pb = new Builder(1350 + i); pb.cyl(0.025, 0.025, 2.2, 0, -1.1, 0, 0x3a3a3e, 6); pb.box(0.2, 0.36, 0.03, 0, 0.92, 0, col); pb.box(0.2, 0.36, 0.03, 0, -1.28, 0, col); k.p = pb.mesh(); k.p.position.set(0, 0.72, 0.15); k.p.rotation.z = Math.PI / 2; k.g.add(k.p); scene.add(k.g); obs.push({ type: 'kayak', k, r: 1.25 }); });
  const parts = [], cg = new THREE.CylinderGeometry(0.06, 0.06, 0.34, 8); cg.rotateZ(Math.PI / 2); parts.push(cg.toNonIndexed());
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) { const q = new THREE.SphereGeometry(0.09, 8, 6); q.translate(sx * 0.18, sy * 0.065, 0); parts.push(q.toNonIndexed()); }
  boneMesh = new THREE.InstancedMesh(mergeGeometries(parts), new THREE.MeshStandardMaterial({ color: 0xffd257, emissive: 0x9a5a00, emissiveIntensity: 0.9, roughness: 0.35 }), 90); boneMesh.frustumCulled = false; boneMesh.castShadow = true; scene.add(boneMesh);
  for (const it of items) if (it.kind === 'patch') { it.m = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.15, 10, 24), new THREE.MeshStandardMaterial({ color: 0xe2402f, emissive: 0x5a1008, roughness: 0.5 })); const w = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.155, 10, 6, 0.5), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })); it.m.add(w); const w2 = w.clone(); w2.rotation.z = Math.PI; it.m.add(w2); scene.add(it.m); }
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
}

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
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
{
  const zone = $('joyZone'), base = $('joy'), knob = $('joyKnob'), R = 50, NP = { passive: false }; let id = null, ox = 0;
  const each = (e, fn) => { e.preventDefault(); for (const t of e.changedTouches) fn(t); };
  const set = (dx) => { dx = clamp(dx, -R, R); knob.style.transform = `translate(${dx}px, 0px)`; touch.x = Math.abs(dx) < 7 ? 0 : dx / R; };
  zone.addEventListener('touchstart', (e) => each(e, (t) => { if (id !== null) return; id = t.identifier; const r = zone.getBoundingClientRect(); ox = t.clientX; base.style.left = (ox - r.left) + 'px'; base.style.top = (t.clientY - r.top) + 'px'; base.classList.add('act'); set(0); }), NP);
  zone.addEventListener('touchmove', (e) => each(e, (t) => { if (t.identifier === id) set(t.clientX - ox); }), NP);
  const end = (e) => each(e, (t) => { if (t.identifier !== id) return; id = null; base.classList.remove('act'); base.style.left = base.style.top = ''; set(0); });
  zone.addEventListener('touchend', end, NP); zone.addEventListener('touchcancel', end, NP);
  $('bBark').addEventListener('touchstart', (e) => { e.preventDefault(); paddle(); }, NP);
  $('bMusic').addEventListener('touchstart', (e) => { e.preventDefault(); if (audio.on) $('bMusic').classList.toggle('off', !audio.toggleMusic()); }, NP);
  for (const g of ['gesturestart', 'gesturechange']) document.addEventListener(g, (e) => e.preventDefault());
}

// ------------------------------------------------------------------ game flow
function reset() {
  Object.assign(G, { t: 0, time: 0, s: 0, u: 0, uv: 0, v: 0, boost: 0, lives: 3, bones: 0, inv: 0, cd: 0, stroke: 0, spin: 0, shake: 0, endT: 0, places: 0, landed: 0, hopD: 0, hopC: 0 }); G.hints.clear();
  for (const it of items) { it.got = false; if (it.m) it.m.visible = true; }
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
      if (o.type === 'whirl') { if (d < o.r + 0.4) { const k = 1 - d / (o.r + 0.4); slow = Math.min(slow, 0.5); G.uv += Math.sign(dx) * 9 * k * dt; G.spin += dt * 5 * k; hint('h_whirl'); } }
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
  const target = moving ? (6.4 + 2.6 * sm(0, END, G.s) + fast) * slow : 0;
  G.boost += (0 - G.boost) * Math.min(1, dt * (G.boost < 0 ? 1.6 : 0.9));
  G.v += (Math.max(0.6 * (moving ? 1 : 0), target + G.boost * slow) - G.v) * Math.min(1, dt * 2.2);
  G.uv += (steer * 7.5 - G.uv) * Math.min(1, dt * 3.2); if (!moving) G.uv *= 1 - Math.min(1, dt * 3);
  G.s += G.v * dt; G.u += G.uv * dt;
  const lim = G.mode === 'land' ? half(G.s) - 0.3 : hw; if (Math.abs(G.u) > lim) { G.u = Math.sign(G.u) * lim; if (play && Math.abs(G.uv) > 1) { G.boost = Math.min(G.boost, -1.2); if (Math.random() < dt * 30) pAlpha.spawn(cx(G.s) + G.u, 0.15, -G.s, 0, 1, 1, 0.5, 0.2, 0.6, 0.8, 0.75, 0.6, 0.5, 3, 1); } G.uv = 0; }
  G.spin += (0 - G.spin) * Math.min(1, dt * 1.8);
  const rx = cx(G.s) + G.u, head = Math.atan2(slope(G.s) + G.uv / Math.max(3, G.v), -1), bob = Math.sin(G.t * 2.3) * 0.045;
  raft.position.set(rx, 0.02 + bob, -G.s); raft.rotation.set(Math.sin(G.t * 1.7) * 0.03 - G.boost * 0.012, head + G.spin, -G.uv * 0.022 + Math.sin(G.t * 2.1) * 0.025, 'YXZ');
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
  for (const k of kayaks) { if (Math.abs(k.s - G.s) > 130) { k.g.visible = false; continue; } k.g.visible = true; const a = G.t * k.w + k.ph; k.u = Math.sin(a) * k.amp; k.g.position.set(cx(k.s) + k.u, 0.02 + Math.sin(G.t * 2 + k.ph) * 0.04, -k.s); k.g.rotation.y = Math.cos(a) > 0 ? Math.PI / 2 : -Math.PI / 2; k.p.rotation.x = Math.sin(G.t * 4 + k.ph) * 0.6; if (play && k.s - G.s < 45 && k.s > G.s) hint('h_kayak'); }
  for (const w of whirls) if (Math.abs(w.s - G.s) < 90) w.m.rotation.y = -G.t * 2.4;
  for (const l of lanes) l.m.material.map.offset.y = -G.t * 1.6;
  let n = 0; for (const it of items) { if (it.got || it.s < G.s - 6 || it.s > G.s + 130) continue; const x = cx(it.s) + it.u; if (it.kind === 'bone') { if (n < 90) { dummy.position.set(x, 0.95 + Math.sin(G.t * 3 + it.s) * 0.08, -it.s); dummy.rotation.set(0.3, G.t * 3 + it.s, 0.5); dummy.scale.setScalar(1.5); dummy.updateMatrix(); boneMesh.setMatrixAt(n++, dummy.matrix); } } else { it.m.position.set(x, 0.9 + Math.sin(G.t * 2.5) * 0.1, -it.s); it.m.rotation.y = G.t * 2; } }
  boneMesh.count = n; boneMesh.instanceMatrix.needsUpdate = true;
  pAdd.update(dt); pAlpha.update(dt);
  // ---- camera, light, water
  const title = G.mode === 'title', win = G.mode === 'win', tall = camera.aspect < 1 ? 1 : 0, sh = G.shake * G.shake * 0.3;
  if (title) { camera.position.lerp(tmpV.set(rx + 3.6, 1.6, -G.s - 4.6), Math.min(1, dt * 3)); camera.lookAt(rx, 0.7, -G.s); }
  else if (win) { const a = 0.4 + Math.sin(G.endT * 0.4) * 0.5, bx = cx(BEACH.s) + half(BEACH.s) + 3.2; camera.position.lerp(tmpV.set(bx - 5.5 - tall * 2, 2.2, -BEACH.s + Math.sin(a) * 6), Math.min(1, dt * 2)); camera.lookAt(bx + 0.5, 0.9, -BEACH.s); }
  else { const hd = Math.atan(slope(G.s)) * 0.8, back = 7.6 + tall * 2.5 + clamp(G.v - 7, 0, 5) * 0.25; camera.position.lerp(tmpV.set(rx * 0.85 + cx(G.s) * 0.15 - Math.sin(hd) * back, 4.3 + tall * 1.6, -G.s + Math.cos(hd) * back), Math.min(1, dt * 5)); camera.position.x += (Math.random() - 0.5) * sh; camera.position.y += (Math.random() - 0.5) * sh; camera.lookAt(lerp(rx, cx(G.s + 11), 0.6), 0.6, -G.s - 11); }
  const fov = 60 + tall * 8 + clamp(G.v - 7, 0, 6) * 1.6; if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 3); camera.updateProjectionMatrix(); }
  water.position.set(cx(G.s + 60), 0, -G.s - 110); waterU.uTime.value = G.t; skyU.uTime.value = G.t; G.dome.position.copy(camera.position);
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
  step(dt); renderer.render(scene, camera);
  fpsAcc += dt; fpsN++; if (fpsAcc > 2.5) { if (fpsAcc / fpsN > 0.03 && pixelRatio > 0.7) { pixelRatio = Math.max(0.7, pixelRatio * 0.85); resize(); } fpsAcc = 0; fpsN = 0; }
}
async function boot() {
  document.body.classList.add('raft'); if (isTouch) document.body.classList.add('touch');
  await new Promise((r) => setTimeout(r, 30));
  tex = createTextures();
  buildRiver(); buildCourse(); buildRaft();
  dog = buildDog(tex, {}); cat = buildCat({ scale: 1.15 });
  for (let i = 0; i < 5; i++) { const d = buildDog(tex, { scale: 0.43, head: 1.3, leg: 0.8, ear: 1.15, snout: 0.72 }); scene.add(d.root); puppies.push({ d, x: 0, z: 0, y: 0, vy: 0 }); }
  pAdd = new Particles(600, true); pAlpha = new Particles(700, false); scene.add(pAdd.mesh, pAlpha.mesh);
  $('rCat').textContent = '🏖'; $('rCat').style.left = '100%'; $('bJump').style.display = 'none';
  reset(); G.mode = 'title'; applyLang();
  $('start').addEventListener('click', startGame);
  $('lang').addEventListener('click', () => { lang = lang === 'pl' ? 'en' : 'pl'; applyLang(); });
  $('again').addEventListener('click', () => { const bt = G.bot; toTitle(); G.bot = bt; startGame(); });
  $('menu').addEventListener('click', toTitle);
  step(0.016); camera.position.set(3.6, 1.6, -4.6); renderer.compile(scene, camera); renderer.render(scene, camera);
  window.__raft = { G, obs, items, events, kayaks, lanes, whirls, input, audio, step, startGame, reset, toTitle, paddle, renderer, scene, camera, cx, half, END,
    sim: (secs, dt = 1 / 60) => { for (let t = 0; t < secs; t += dt) step(dt); renderer.render(scene, camera); return { mode: G.mode, s: +G.s.toFixed(0), u: +G.u.toFixed(1), v: +G.v.toFixed(1), lives: G.lives, bones: G.bones, time: +G.time.toFixed(0) }; } };
  $('title').classList.remove('hidden'); $('loading').style.opacity = 0; setTimeout(() => $('loading').remove(), 1100);
  last = performance.now(); requestAnimationFrame(frame);
}
boot().catch((e) => { console.error(e); $('loading').textContent = 'Błąd: ' + e.message; });
