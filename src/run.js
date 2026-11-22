// Level 2 – "Pościg za Milą": a three-lane chase down a village lane. Łatka runs by herself; the player changes lanes,
// jumps and slides. Catch Mila the cat three times to win.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createTextures, sm, lerp, clamp, rng, fbm } from './textures.js';
import { buildDog } from './dog.js';
import { HQ, addFur, DOG_FUR, CAT_FUR } from './fur.js';
import { buildCat } from './cat.js';
import { relicModel, RELIC_COLORS } from './relics.js';
import { Particles, fogUniforms } from './fx.js';
import { AudioSys } from './audio.js';
import { detailTex, daySky, leafBlob } from './real.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const $ = (id) => document.getElementById(id);
const TXT = {
  pl: {
    over: 'Poziom 2', title: 'Pościg za Milą', start: 'Biegnij!', again: 'Jeszcze raz', menu: 'Menu',
    story: 'Kotka Mila zwiała ulicą Pogodną! Biegnij za nią, zbieraj kości i omijaj przeszkody. Złap ją trzy razy, zanim stracisz wszystkie łapki.',
    keys: '← → zmiana toru · ↑ / Spacja — skok · ↓ — ślizg · M — muzyka',
    keys_t: 'Przesuń palcem: w lewo / w prawo — tor · w górę — skok · w dół — ślizg',
    hint: 'Kości przybliżają cię do Mili. Każde potknięcie daje jej przewagę!',
    mila: (m) => `Mila: ${m} m`, stage: (n) => `Etap ${n}/3`, bones: (n) => `Kości: ${n}`,
    k_street: 'Ulica', turn: 'Skrzyżowanie! Wybierz kierunek — jeśli nie zdążysz, wybierze los.', caught: (p) => `Mam cię! +${p}`, away: 'Mila ucieka dalej!', ouch: 'Auć!',
    winT: 'Mila złapana!', winX: (s, b, best) => `Mila ma dość uciekania — od dziś biegacie razem. Wynik: ${s} · kości: ${b} · rekord: ${best}`,
    loseT: 'Mila uciekła…', loseX: (s, b, best) => `Tym razem była szybsza. Wynik: ${s} · kości: ${b} · rekord: ${best}`,
    p_magnet: 'Magnes na kości!', p_shield: 'Tarcza!', p_turbo: 'Turbo-łapy!', p_x2: 'Podwójne punkty!', shieldPop: 'Tarcza cię uratowała!', splash: 'Chlup!', smash: 'Bum! +20', carOn: 'KOD: SKODA — Škoda Superb Combi! Prędkość ×3', carOff: 'Koniec jazdy — dalej na łapach',
    cheers: ['Brawo, Łatka!', 'Łap ją, łap!', 'Dalej, dalej!', 'Szybciej, szybciej!', 'Hau hau!', 'Biegnij, Łatka!', 'Mila jest tuż-tuż!', 'Dasz radę!', 'Ale pędzisz!', 'Już ją masz!', 'Brawo, piesku kochany!'],
    w_rain: 'Zaczyna padać!', w_fog: 'Nadciąga mgła…', w_snow: 'Sypie śnieg!', w_clear: 'Przejaśnia się.',
    fin1: 'Mila: „No dobrze… wygrałaś!”', fin2: 'Od dziś biegają razem.',
    r_bone: 'Kość dr. Alicji! +100', r_sock: 'Feeeeee! Skarpeta Lesława! +100', r_mirror: 'Lustro Oli! +100', r_brush: 'Zmiotka Agaty! +100', r_diaper: 'Ojej! Pielucha Jasia! +100', r_ball: 'Gooool! Piłka Piotrusia! +100',
  },
  en: {
    over: 'Level 2', title: 'Chasing Mila', start: 'Run!', again: 'Again', menu: 'Menu',
    story: 'Mila the cat has bolted down Pogodna Street! Run after her, collect bones and dodge what is in the way. Catch her three times before you lose all your paws.',
    keys: '← → change lane · ↑ / Space — jump · ↓ — slide · M — music',
    keys_t: 'Swipe: left / right — lane · up — jump · down — slide',
    hint: 'Bones bring you closer to Mila. Every stumble gives her a head start!',
    mila: (m) => `Mila: ${m} m`, stage: (n) => `Stage ${n}/3`, bones: (n) => `Bones: ${n}`,
    k_street: 'Street', turn: 'Junction! Pick a way — if you are too slow, chance decides.', caught: (p) => `Gotcha! +${p}`, away: 'Mila is off again!', ouch: 'Ouch!',
    winT: 'Mila is caught!', winX: (s, b, best) => `Mila is done running — from now on you run together. Score: ${s} · bones: ${b} · best: ${best}`,
    loseT: 'Mila got away…', loseX: (s, b, best) => `She was faster this time. Score: ${s} · bones: ${b} · best: ${best}`,
    p_magnet: 'Bone magnet!', p_shield: 'Shield!', p_turbo: 'Turbo paws!', p_x2: 'Double points!', shieldPop: 'The shield saved you!', splash: 'Splash!', smash: 'Boom! +20', carOn: 'CODE: SKODA — Škoda Superb Combi! Speed ×3', carOff: 'End of the ride — back on paws',
    cheers: ['Bravo, Łatka!', 'Get her!', 'Go, go, go!', 'Faster, faster!', 'Woof woof!', 'Run, Łatka!', 'Mila is right there!', 'You can do it!', 'So fast!', 'You have got her!', 'Good girl!'],
    w_rain: 'It starts to rain!', w_fog: 'Fog rolls in…', w_snow: 'It is snowing!', w_clear: 'It clears up.',
    fin1: 'Mila: "All right… you win!"', fin2: 'From now on they run together.',
    r_bone: 'Kość dr. Alicji! +100', r_sock: 'Yuck! Skarpeta Lesława! +100', r_mirror: 'Lustro Oli! +100', r_brush: 'Zmiotka Agaty! +100', r_diaper: 'Oh my! Pielucha Jasia! +100', r_ball: 'Goal! Piłka Piotrusia! +100',
  },
};
let lang = 'pl';
const isTouch = matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && matchMedia('(hover: none)').matches);
const T = (k, ...a) => { const v = (isTouch && TXT[lang][k + '_t']) || TXT[lang][k]; return typeof v === 'function' ? v(...a) : v; };
const STREETS = ['Pogodna', 'Słoneczna Polana', 'Miła'];

// ------------------------------------------------------------------ renderer
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
let pixelRatio = Math.min(window.devicePixelRatio || 1, 1.6);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 900);
// finishing passes: a soft glow around the sun, the lamps and anything shiny, and slightly darker corners
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 }));
composer.addPass(new RenderPass(scene, camera));
const PASS_V = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
composer.addPass(new ShaderPass({ uniforms: { tDiffuse: { value: null } }, vertexShader: PASS_V, fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); c.rgb = min(max(c.rgb, 0.0), 30.0); if (!(c.r + c.g + c.b < 1e5)) c.rgb = vec3(0.0); gl_FragColor = vec4(c.rgb, 1.0); }' }));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.28, 0.6, 1.35));
const lensPass = HQ ? new ShaderPass({ uniforms: { tDiffuse: { value: null }, uZoom: { value: 0 }, uTilt: { value: 0 } }, vertexShader: PASS_V,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uZoom, uTilt; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tDiffuse, vUv); vec2 dv = vUv - 0.5;
      if (uZoom > 0.002) { vec4 a = vec4(0.0); for (int i = 0; i < 8; i++) a += texture2D(tDiffuse, 0.5 + dv * (1.0 - uZoom * 0.11 * float(i) / 7.0)); c = mix(c, a / 8.0, smoothstep(0.05, 0.4, length(dv))); }
      if (uTilt > 0.002) { float tb = uTilt * smoothstep(0.1, 0.48, abs(vUv.y - 0.55)) * 0.007; vec4 a = vec4(0.0); for (int i = 0; i < 8; i++) { float an = float(i) * 0.785; a += texture2D(tDiffuse, vUv + vec2(cos(an), sin(an) * 1.6) * tb); } c = mix(c, a / 8.0, 0.85); }
      gl_FragColor = c; }` }) : null;
if (lensPass) composer.addPass(lensPass);
composer.addPass(new ShaderPass({ uniforms: { tDiffuse: { value: null } }, vertexShader: PASS_V, fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); vec2 q = vUv - 0.5; float v = 1.0 - dot(q, q) * 0.7; c.rgb *= v * v; gl_FragColor = vec4(max(c.rgb, 0.0), 1.0); }' }));
composer.addPass(new OutputPass());
const draw = () => composer.render();
function resize() { const w = Math.max(2, window.innerWidth), h = Math.max(2, window.innerHeight); camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setPixelRatio(pixelRatio); renderer.setSize(w, h, false); composer.setPixelRatio(pixelRatio); composer.setSize(w, h); }
window.addEventListener('resize', resize); resize();

// ------------------------------------------------------------------ constants / state
const LANE = 1.7, LX = [-LANE, 0, LANE], CL = 24, NC = 8, ROADW = 5.9, JH = ROADW / 2 + 0.75;   // JH: half-width of a street with its verge
const STAGE_GAP = [30, 34, 38], STAGE_SPEED = [9.5, 11.5, 13.3];
const G = { mode: 'load', t: 0, dist: 0, speed: 0, stage: 0, gap: 30, lives: 3, score: 0, bones: 0, inv: 0, slow: 0, ct: 0, stageT: 0, shake: 0, streak: 0, streakT: 0, blend: 0, bot: false, genMin: 0, endT: 0, best: 0 };
const Pl = { lane: 1, x: 0, y: 0, vy: 0, slide: 0, grounded: true };
const Mi = { lane: 1, x: 0, y: 0, vy: 0, crouch: 0 };
let R = rng(7);
const audio = new AudioSys();
let dog, cat, pAdd, pAlpha, sun, hemi, skyU, tex, roadM, grassM, bubble, rainFx, snowFx;
G.pw = { magnet: 0, shield: 0, turbo: 0, x2: 0 };
const POWERS = ['magnet', 'shield', 'turbo', 'x2'], POW_TIME = { magnet: 9, shield: 25, turbo: 4, x2: 12 }, POW_COL = { magnet: 0xff5a48, shield: 0x4ab4ff, turbo: 0xffd23a, x2: 0xc77dff };
const W = { rain: 0, fog: 0, snow: 0, eve: 0, target: 'clear', order: ['rain', 'fog', 'snow'] };     // weather, each 0..1
const buzz = (p) => { try { if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(p); } catch (_) { /* not supported */ } };
try { G.best = +localStorage.getItem('latka-run-best') || 0; } catch (_) { /* private mode */ }

// ------------------------------------------------------------------ bends and hills
// The track itself stays straight (so lanes and collisions stay simple); everything ahead of Łatka is pushed sideways and
// up/down in the vertex shader by distance², which reads as the road curving and rolling. Shadows are computed in the
// unbent world on both sides, so they bend along with whatever they fall on.
const bendU = { value: new THREE.Vector3() }, bend = { x: 0, y: 0, tx: 0, ty: 0, t: 3, dir: 1 };
const detailU = { value: null };
function bendPatch(m) {
  if (!m || m.isShaderMaterial || m.userData.bent) return; m.userData.bent = true; const pre = m.userData.chain ? m.onBeforeCompile : null;
  const gr = m.userData.grain || 0, wet = !!m.userData.wet;
  m.onBeforeCompile = (sh) => {
    if (pre) pre(sh); sh.uniforms.uBend = bendU; sh.uniforms.uDetail = detailU; sh.uniforms.uWet = hq.wet;
    if (gr) sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vBw; uniform sampler2D uDetail; uniform float uWet;').replace('#include <map_fragment>', `#include <map_fragment>\n{ vec3 dA = texture2D(uDetail, vBw.xz * 0.9).rgb, dB = texture2D(uDetail, vBw.xz * 0.07).rgb; diffuseColor.rgb *= (1.0 + (dA.r - 0.5) * ${(gr * 1.1).toFixed(3)}) * (1.0 + (dB.g - 0.5) * ${(gr * 0.7).toFixed(3)}); }`);
    if (gr && wet) sh.fragmentShader = sh.fragmentShader.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n{ float pm = smoothstep(0.5, 0.64, texture2D(uDetail, vBw.xz * 0.045).b * 0.7 + texture2D(uDetail, vBw.xz * 0.013).g * 0.5); roughnessFactor = mix(roughnessFactor, 0.1, pm * uWet); diffuseColor.rgb *= mix(1.0, 0.5, pm * uWet); }');
    sh.vertexShader = 'uniform vec3 uBend; varying vec3 vBw;\n' + sh.vertexShader.replace('#include <project_vertex>', `vec4 bw = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        bw = instanceMatrix * bw;
      #endif
      bw = modelMatrix * bw; vBw = bw.xyz; float bd = min(0.0, bw.z - uBend.z); bw.x += uBend.x * bd * bd; bw.y += uBend.y * bd * bd;
      vec4 mvPosition = viewMatrix * bw; gl_Position = projectionMatrix * mvPosition;`);
  };
  m.customProgramCacheKey = () => 'bend' + gr + (wet ? 'w' : '') + (m.userData.key || ''); m.needsUpdate = true;
}
function updateBend(dt) {
  const moving = G.mode === 'play' || G.mode === 'catch';
  bend.t -= dt;
  if (bend.t <= 0) {
    bend.t = 3.5 + Math.random() * 4.5;
    if (Math.random() < 0.22) bend.tx = 0; else { bend.dir = Math.random() < 0.7 ? -bend.dir : bend.dir; bend.tx = bend.dir * (0.0009 + Math.random() * 0.0011); }
    bend.ty = (Math.random() - 0.55) * 0.0009;
  }
  const k = Math.min(1, dt * 0.75);
  const ok = moving && !(jn && !jn.done) && !(jn && G.dist < jn.J + 25);        // junctions are approached and left on a straight, level road
  bend.x += ((ok ? bend.tx : 0) - bend.x) * k * (ok ? 1 : 2); bend.y += ((ok ? bend.ty : 0) - bend.y) * k * (ok ? 1 : 2);
  bendU.value.set(bend.x, bend.y, -G.dist);
}

// ------------------------------------------------------------------ geometry helpers (everything is vertex-coloured and merged)
const worldMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, side: THREE.DoubleSide }); worldMat.userData.grain = 0.3;
class Builder {
  constructor(seed) { this.g = []; this.r = rng(seed); }
  add(geo, color, x = 0, y = 0, z = 0, ry = 0, jit = 0.07) {
    const g = geo.index ? geo.toNonIndexed() : geo; g.deleteAttribute('uv');
    if (ry) g.rotateY(ry); g.translate(x, y, z);
    const n = g.attributes.position.count, c = new Float32Array(n * 3), col = new THREE.Color(color), k = 1 + (this.r() - 0.5) * 2 * jit;
    const sh = g.attributes.color ? g.attributes.color.array : null;
    for (let i = 0; i < n; i++) { const q = sh ? sh[i * 3] * 1.4 * k : k; c[i * 3] = col.r * q; c[i * 3 + 1] = col.g * q; c[i * 3 + 2] = col.b * q; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3)); this.g.push(g); return g;
  }
  box(w, h, d, x, y, z, color, ry = 0, jit) { return this.add(new THREE.BoxGeometry(w, h, d), color, x, y + h / 2, z, ry, jit); }
  cyl(rt, rb, h, x, y, z, color, seg = 8) { return this.add(new THREE.CylinderGeometry(rt, rb, h, seg), color, x, y + h / 2, z); }
  cone(r, h, x, y, z, color, seg = 7) { return this.add(new THREE.ConeGeometry(r, h, seg), color, x, y + h / 2, z, this.r() * 3); }
  leaf(r, x, y, z, color, sy = 1) { return this.add(leafBlob(r, sy, ((x * 7 + z * 3 + y * 5) | 0) + 40, 1), color, x, y, z, this.r() * 3, 0.12); }
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
const hq = { wet: { value: 0 }, time: { value: 0 }, wetK: 0, sky: null, sky2: null, pm: null, envScene: null, envRT: null, envEl: -9, glassM: null, glassLitM: null, bladeM: null, coneM: null, sparrows: [], birdAt: 60, prints: [], printI: 0, printD: 0, drops: null, dropT: 0 };      // high-quality extras
const chunks = [], plateMats = [], lampBits = []; let junction, ground, jn = null, lampM, poolM;
function buildScenery() {
  // sky
  skyU = { uTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uSun: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3() }, uTime: { value: 0 }, uCover: { value: 0 }, uPhys: { value: 0 } };
  const dome = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), new THREE.ShaderMaterial({ uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uTop, uHor, uSun, uSunDir; uniform float uTime, uCover, uPhys; varying vec3 vDir;
      float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
      float fb(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * vn(p); p = p * 2.07 + 7.1; a *= 0.5; } return s / 0.9375; }
      void main(){
        vec3 d = normalize(vDir); float h = max(d.y, 0.0);
        vec3 c = mix(uHor, uTop, pow(h, 0.5)); c = mix(c, uTop * 0.72, pow(h, 1.7) * 0.55);                  // deeper blue overhead
        float sd = max(dot(d, uSunDir), 0.0), sa = max(dot(normalize(d.xz + 1e-5), normalize(uSunDir.xz + 1e-5)), 0.0);
        c += uSun * pow(sa, 5.0) * exp(-h * 5.5) * 0.4;                                                      // warm band of sky under the sun
        c += uSun * (pow(sd, 40.0) * 0.45 + pow(sd, 5.0) * 0.2) * (1.0 - uCover * 0.85);                                             // halo
        float disc = smoothstep(0.9993, 0.99965, sd) * (1.0 - uCover);
        float al = 0.0;
        if (d.y > 0.0) {
          vec2 p = d.xz / (d.y + 0.11); float up = smoothstep(0.0, 0.16, d.y);
          // thin streaks of high cloud
          float ci = fb(p * vec2(0.45, 1.7) + vec2(uTime * 0.003, 3.0)); ci = smoothstep(0.52, 0.8, ci) * 0.4 * up;
          c = mix(c, vec3(0.97) + uSun * 0.12, ci);
          // drifting heaps of cumulus, lit from the sun's side, grey underneath
          vec2 q = p * 0.7 + vec2(uTime * 0.009, uTime * 0.002);
          float n = fb(q) * 0.68 + fb(q * 3.1 + 5.0) * 0.32, cov = mix(smoothstep(0.55, 0.74, n), 1.0, uCover);
          vec2 ld = normalize(uSunDir.xz + 1e-4) * 0.16; float n2 = fb(q + ld);
          float lit = clamp((fb(q) - n2) * 3.2 + 0.55, 0.0, 1.0), thick = smoothstep(0.55, 0.95, n);
          vec3 bright = mix(vec3(1.0), uSun, 0.45) * 1.12, under = mix(uTop, uHor, 0.55) * 0.62 + uSun * 0.1;
          vec3 cc = mix(under, bright, clamp(lit * (1.0 - thick * 0.55) + 0.18, 0.0, 1.0));
          cc += uSun * pow(sd, 10.0) * (1.0 - thick) * 0.9;                                                  // glowing edges where the sun shines through
          cc = mix(cc, mix(under, uHor, 0.6) * (0.82 + 0.18 * n), uCover * 0.85);                             // overcast: one grey sheet
          c = mix(c, cc, cov * up * 0.94); disc *= 1.0 - cov * 0.9; al = 1.0 - (1.0 - ci) * (1.0 - cov * up * 0.94);
        }
        c += uSun * disc * 9.0 * (1.0 - uPhys);
        float hz = exp(-h * 11.0) * 0.72; c = mix(c, uHor, hz); al = max(al, hz * 1.05); if (d.y <= 0.0) al = 1.0; gl_FragColor = vec4(c, mix(1.0, clamp(al, 0.0, 1.0), uPhys));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` }));
  dome.frustumCulled = false; dome.renderOrder = -10; scene.add(dome); G.dome = dome;
  if (HQ) {                                                // a physically based sky behind the painted clouds; it follows the sun from stage to stage
    dome.material.transparent = true; skyU.uPhys.value = 1;
    const mk = () => { const k = new Sky(), u = k.material.uniforms; u.turbidity.value = 2.5; u.rayleigh.value = 2.6; u.mieCoefficient.value = 0.004; u.mieDirectionalG.value = 0.83; return k; };
    hq.sky = mk(); hq.sky.material.fragmentShader = hq.sky.material.fragmentShader.replace('gl_FragColor = vec4( retColor, 1.0 );', 'gl_FragColor = vec4( retColor * 0.5, 1.0 );'); hq.sky.scale.setScalar(800); hq.sky.renderOrder = -20; hq.sky.frustumCulled = false; scene.add(hq.sky);
    hq.sky2 = mk(); hq.envScene = new THREE.Scene(); hq.envScene.add(hq.sky2); hq.pm = new THREE.PMREMGenerator(renderer);
    hq.glassM = new THREE.MeshStandardMaterial({ color: 0x1b2a3a, roughness: 0.05, metalness: 0.9 }); hq.glassLitM = new THREE.MeshStandardMaterial({ color: 0x1b2a3a, roughness: 0.05, metalness: 0.9, emissive: 0xffb55a, emissiveIntensity: 0 });
    hq.coneM = new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    hq.bladeM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }); hq.bladeM.userData.chain = true; hq.bladeM.userData.key = 'blade';
    hq.bladeM.onBeforeCompile = (sh) => { sh.uniforms.uTimeB = hq.time; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aTip; uniform float uTimeB;').replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.xz += aTip * 0.045 * vec2(sin(uTimeB * 1.9 + position.x * 0.9 + position.z * 0.6), cos(uTimeB * 1.4 + position.z * 0.8 - position.x * 0.4));'); };
  }
  sun = new THREE.DirectionalLight(0xffffff, 3); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  detailU.value = detailTex(); daySky(renderer, scene, new THREE.Vector3(-0.4, 0.62, -0.68).normalize(), { show: false });      // the sky also lights the scene and shows in wet and shiny things
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
      if (HQ) { const g = v * 0.86 + 4; d[i] = g * 1.1; d[i + 1] = g * 1.0; d[i + 2] = g * 0.8 - edge * 14; d[i + 3] = 255; continue; }        // warmer and lighter: gravel, not asphalt
      d[i] = v * 1.05; d[i + 1] = v * 0.99; d[i + 2] = v * 0.9 - edge * 14; d[i + 3] = 255;
    }
    c.putImageData(im, 0, 0);
    for (let i = 0; i < 260; i++) { c.fillStyle = `rgba(${r() < 0.5 ? '70,66,60' : '215,208,196'},${0.25 + r() * 0.4})`; c.fillRect(r() * w, r() * h, 1 + r() * 2.2, 1 + r() * 2.2); }
    if (HQ) {                                                // a gravel lane: sandy, full of small stones, with grass creeping in from the edges
      for (let i = 0; i < 2600; i++) { const k = r(), x = r() * w, y = r() * h, sz = 0.8 + r() * r() * 3.4; c.fillStyle = k < 0.4 ? `rgba(196,186,164,${0.3 + r() * 0.4})` : k < 0.75 ? `rgba(92,84,72,${0.25 + r() * 0.4})` : `rgba(168,150,120,${0.3 + r() * 0.4})`; c.beginPath(); c.ellipse(x, y, sz, sz * (0.6 + r() * 0.4), r() * 3, 0, 6.3); c.fill(); }
      for (let i = 0; i < 160; i++) { const sd = r() < 0.5, x = sd ? r() * r() * 26 : w - r() * r() * 26; c.fillStyle = `rgba(${78 + r() * 30},${112 + r() * 30},${52 + r() * 20},${0.25 + r() * 0.4})`; c.fillRect(x, r() * h, 1.5 + r() * 2.5, 2 + r() * 5); }
    }
  }, 1, CL / ROADW);
  const grassT = canvasTex(256, 256, (c, w, h) => {
    const im = c.createImageData(w, h), d = im.data, r = rng(4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const n = fbm(x * 0.05, y * 0.05, 4, 9), k = 0.7 + n * 0.45 + r() * 0.22, i = (y * w + x) * 4; d[i] = 74 * k; d[i + 1] = 128 * k; d[i + 2] = 48 * k; d[i + 3] = 255; }
    c.putImageData(im, 0, 0);
  }, 22, 6);
  roadM = new THREE.MeshStandardMaterial({ map: roadT, roughness: 0.95 }); grassM = new THREE.MeshStandardMaterial({ map: grassT, roughness: 1 }); roadM.userData.grain = HQ ? 0.85 : 0.45; grassM.userData.grain = 0.7; roadM.userData.wet = HQ;
  const roadG = new THREE.PlaneGeometry(ROADW, CL); roadG.rotateX(-Math.PI / 2);
  const grassG = new THREE.PlaneGeometry(190, CL); grassG.rotateX(-Math.PI / 2);

  // street-name plates: one texture per street; only two houses on the whole loop carry one
  for (const name of STREETS) {
    const t = canvasTex(512, 128, (c, w, h) => {
      c.fillStyle = '#f4f4f0'; c.fillRect(0, 0, w, h); c.fillStyle = '#1d4e9e'; c.fillRect(7, 7, w - 14, h - 14);
      c.fillStyle = '#f4f4f0'; c.textAlign = 'center'; c.textBaseline = 'middle'; let fs = 66; do { c.font = `bold ${fs}px Arial, Helvetica, sans-serif`; fs -= 3; } while (c.measureText('ul. ' + name).width > w - 50);
      c.fillText('ul. ' + name, w / 2, h / 2 + 3);
    }, 1, 1);
    plateMats.push(new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 }));
  }
  const plateG = new THREE.PlaneGeometry(2.7, 0.675);
  const lampG = new THREE.SphereGeometry(0.2, 10, 8), poolG = new THREE.CircleGeometry(4.2, 28); poolG.rotateX(-Math.PI / 2);
  const poolT = canvasTex(128, 128, (c, w) => { const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, 'rgba(255,214,140,1)'); g.addColorStop(0.45, 'rgba(255,190,110,.45)'); g.addColorStop(1, 'rgba(255,170,90,0)'); c.fillStyle = g; c.fillRect(0, 0, w, w); }, 1, 1);
  lampM = new THREE.MeshBasicMaterial({ color: 0xffffff }); poolM = new THREE.MeshBasicMaterial({ map: poolT, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 });
  const WALLS = [0xeadcbe, 0xf3efe4, 0xe7c98c, 0xdcc0a2, 0xcfd8cf], ROOFS = [0x9a3b2e, 0x80402f, 0x55565c, 0x6f3a2c];
  const GREENS = [0x3f7a2c, 0x4f8a34, 0x356b2a, 0x5c9440];
  const coneG = new THREE.ConeGeometry(2.4, 5, 20, 1, true);
  // a tuft of three blades, each drawn on both faces with the normal pointing up so that it is lit like the lawn
  const tuft = (P, x, z, R) => { const k = 0.6 + R() * 0.6; for (let j = 0; j < 3; j++) { const a = R() * 6.28, h = 0.1 + R() * 0.16, w = 0.022 + R() * 0.02, bx = x + (R() - 0.5) * 0.18, bz = z + (R() - 0.5) * 0.18, lx = (R() - 0.5) * 0.1, lz = (R() - 0.5) * 0.1, c = Math.cos(a) * w, sn = Math.sin(a) * w, cr = 0.068 * k, cg = 0.216 * k, cb = 0.03 * k;
    for (const fl of [0, 1]) { if (fl) P.pos.push(bx + c, 0, bz + sn, bx - c, 0, bz - sn, bx + lx, h, bz + lz); else P.pos.push(bx - c, 0, bz - sn, bx + c, 0, bz + sn, bx + lx, h, bz + lz); P.col.push(cr * 0.6, cg * 0.6, cb * 0.6, cr * 0.6, cg * 0.6, cb * 0.6, cr * 1.35, cg * 1.4, cb * 1.2); P.tip.push(0, 0, 1); P.nor.push(0, 1, 0, 0, 1, 0, 0, 1, 0); } } };
  // everything a high-quality house gets on top of the plain one: tiles, gutters, pigeons, and a garden that looks used
  const hqHouse = (b, R, o) => {
    const { hx, zc, w, d, h, rh, rw, rd, turn, roof, s, fx, grp } = o, ry = turn ? Math.PI / 2 : 0, y0 = h + 0.35, face = hx - s * (w / 2 + 0.02), put = (g, col, jit = 0.03) => b.add(g, col, hx, y0, zc, ry, jit);
    const a = Math.atan2(rh, rw / 2), L = Math.hypot(rw / 2, rh), n = Math.max(5, Math.round(L / 0.46));
    for (const sd of [-1, 1]) { for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, g = new THREE.BoxGeometry(L / n * 1.32, 0.08, rd + 0.12); g.rotateZ(-sd * (a - 0.12)); g.translate(sd * (rw / 2) * (1 - t), rh * t + 0.05, 0); put(g, roof, 0.09); }
      put(new THREE.BoxGeometry(0.14, 0.1, rd + 0.14).translate(sd * (rw / 2 + 0.05), -0.03, 0), 0x4a4d52, 0); put(new THREE.BoxGeometry(0.08, h, 0.08).translate(sd * (rw / 2 - 0.5), -h / 2, rd / 2 - 0.5), 0x4a4d52, 0); }
    put(new THREE.BoxGeometry(0.3, 0.14, rd + 0.2).translate(0, rh + 0.07, 0), roof, 0.05);
    if (R() < 0.55) for (let i = 0, k = 1 + ((R() * 3) | 0); i < k; i++) { const lz = (R() - 0.5) * rd * 0.7, bd = new THREE.SphereGeometry(0.11, 8, 6); bd.scale(1, 0.9, 1.6); put(bd.translate(0, rh + 0.24, lz), 0x8a8f98, 0.08); put(new THREE.SphereGeometry(0.06, 8, 6).translate(0, rh + 0.38, lz + 0.14), 0x767c88, 0.05); }
    grp.userData.chim.push({ x: o.chx, y: h + 2.4, z: o.chz, s });
    b.box(0.08, 1.0, 0.08, fx + s * 0.3, 0, zc + 1.15, 0x6d7278, 0, 0); b.box(0.3, 0.22, 0.22, fx + s * 0.3, 1.0, zc + 1.15, [0xc0392b, 0x2c5f8a, 0xd8d8d2, 0x2f6b3a][(R() * 4) | 0], 0, 0.02);                         // letter box
    [[0, 0x2f6b3a], [1, 0xd9b233]].forEach(([k, col]) => { b.box(0.5, 0.9, 0.55, fx + s * 0.75, 0, zc - 1.5 - k * 0.68, col, 0, 0.04); b.box(0.55, 0.07, 0.6, fx + s * 0.75, 0.9, zc - 1.5 - k * 0.68, 0x1f2a22, 0, 0); });       // wheelie bins
    const gap = Math.abs(face - fx), carry = R(); let car = false;
    if (carry < 0.45 && gap > 2.4) { car = true; const along = gap > 4.6, cxp = (face + fx) / 2 + s * 0.15, cz = zc + 3.5, col = [0x8a1f1f, 0x2f4a6a, 0xd8d8d2, 0x3a3f46, 0x2f6b3a, 0xc9a23a][(R() * 6) | 0], cr = along ? 0 : Math.PI / 2, cp = (g) => b.add(g, col, cxp, 0, cz, cr, 0.02);
      cp(new THREE.BoxGeometry(3.7, 0.6, 1.62).translate(0, 0.6, 0)); cp(new THREE.BoxGeometry(2.0, 0.52, 1.5).translate(-0.2, 1.16, 0)); b.add(new THREE.BoxGeometry(2.04, 0.36, 1.54).translate(-0.2, 1.2, 0), 0x10161e, cxp, 0, cz, cr, 0);
      for (const sx of [-1.15, 1.15]) for (const sz of [-0.78, 0.78]) { const wg = new THREE.CylinderGeometry(0.31, 0.31, 0.2, 12); wg.rotateX(Math.PI / 2); b.add(wg.translate(sx, 0.31, sz), 0x15151a, cxp, 0, cz, cr, 0); } }
    if (R() < 0.4) { const bx = face - s * 0.22, bz = zc - d * 0.36, col = [0x2c7fb8, 0xd9483b, 0x2f6b3a][(R() * 3) | 0]; for (const dz of [-0.5, 0.5]) { const wg = new THREE.TorusGeometry(0.3, 0.03, 6, 16); wg.rotateY(Math.PI / 2); b.add(wg, 0x1a1a1e, bx, 0.33, bz + dz, 0, 0); } b.box(0.04, 0.04, 1.0, bx, 0.55, bz, col, 0, 0); b.box(0.04, 0.4, 0.04, bx, 0.45, bz - 0.15, col, 0, 0); b.box(0.3, 0.04, 0.04, bx, 0.9, bz + 0.45, 0x22222a, 0, 0); }      // a bike against the wall
    if (!car && R() < 0.5 && gap > 2) { const lx = fx + s * Math.min(1.5, gap * 0.5), z1 = zc + 2.4, z2 = zc + 4.9; for (const z of [z1, z2]) b.cyl(0.04, 0.05, 2.0, lx, 0, z, 0xb8b8b8, 6); b.box(0.02, 0.02, z2 - z1, lx, 1.95, (z1 + z2) / 2, 0xd8d8d8, 0, 0); [[0.2, 0xf4f1ea, 1.1], [0.5, 0x9ec4e8, 0.85], [0.8, 0xf0b6c8, 1.0]].forEach(([k, col, hh]) => b.box(0.03, hh, 0.72, lx, 1.95 - hh, lerp(z1, z2, k), col, 0, 0.02)); }        // washing on the line
    if (R() < 0.45 && gap > 2.2) { const vx = fx + s * Math.min(1.6, gap * 0.5), vz = zc - 4.2; b.box(1.6, 0.1, 2.4, vx, 0, vz, 0x3d2c1e, 0, 0.04); for (let i = 0; i < 3; i++) for (let k = 0; k < 5; k++) b.leaf(0.14, vx - 0.5 + i * 0.5, 0.2, vz - 0.9 + k * 0.45, i % 2 ? 0x4f8a34 : 0x6a9a3a, 0.8); }                 // a vegetable patch
  };
  for (let ci = 0; ci < NC; ci++) {
    const bs = { [-1]: new Builder(300 + ci), 1: new Builder(100 + ci) }, r = bs[1].r, grp = new THREE.Group(); let b = bs[1];
    const hr = rng(7000 + ci), gbs = HQ ? { [-1]: [new Builder(500 + ci), new Builder(520 + ci)], 1: [new Builder(540 + ci), new Builder(560 + ci)] } : null, blades = { [-1]: { pos: [], col: [], tip: [], nor: [] }, 1: { pos: [], col: [], tip: [], nor: [] } }; grp.userData.chim = [];   // each side of the street is its own mesh, so one side can be hidden at a junction
    const road = new THREE.Mesh(roadG, roadM); road.position.set(0, 0, -CL / 2); road.receiveShadow = true; grp.add(road);
    const grass = new THREE.Mesh(grassG, grassM); grass.position.set(0, -0.03, -CL / 2); grass.receiveShadow = true; grp.add(grass);
    const spruce = (x, z, h) => { b.cyl(0.1 * h / 5, 0.14 * h / 5, h * 0.25, x, 0, z, 0x5a4030); for (let i = 0; i < 4; i++) b.cone(h * (0.26 - i * 0.045), h * 0.36, x, h * (0.16 + i * 0.2), z, i % 2 ? 0x2f5d33 : 0x27502d, 8); };
    const tree = (x, z, s) => { b.cyl(0.13 * s, 0.2 * s, 2.3 * s, x, 0, z, 0x5d4632); b.leaf(1.5 * s, x, 3.2 * s, z, GREENS[(r() * 4) | 0], 0.9); b.leaf(1.1 * s, x + 0.9 * s, 2.7 * s, z + 0.4 * s, GREENS[(r() * 4) | 0]); b.leaf(1.0 * s, x - 0.8 * s, 2.9 * s, z - 0.5 * s, GREENS[(r() * 4) | 0]); };
    for (const s of [-1, 1]) {
      b = bs[s]; const fx = s * (ROADW / 2 + 0.75);
      // two 12 m plots per side, each with its own boundary
      for (let seg = 0; seg < 2; seg++) {
        const z0 = -seg * 12, zc = z0 - 6, kind = (r() * 4) | 0;
        if (kind === 0) {                                      // dark picket fence
          for (let i = 0; i < 74; i++) b.box(0.115, 1.0 + (i % 2) * 0.0, 0.03, fx, 0.08, z0 - 0.08 - i * 0.162, 0x4a342a, 0, 0.1);
          for (const y of [0.32, 0.86]) b.box(0.05, 0.07, 12, fx - s * 0.03, y, zc, 0x3e2b22);
          for (let i = 0; i <= 4; i++) b.box(0.12, 1.2, 0.12, fx - s * 0.02, 0, z0 - i * 3, 0x3a2820);
        } else if (kind === 1) {                               // clipped hedge
          b.box(0.95, 1.35 + r() * 0.5, 12, fx + s * 0.25, 0, zc, 0x3d6f2b, 0, 0.1);
          for (let i = 0; i < 9; i++) b.leaf(0.62, fx + s * 0.25, 1.45 + r() * 0.4, z0 - 0.7 - i * 1.32, GREENS[(r() * 4) | 0], 0.7);
          if (HQ) for (let i = 0; i < 28; i++) b.leaf(0.42 + hr() * 0.14, fx + s * 0.25 - s * (0.38 + hr() * 0.14), 0.32 + (i % 2) * 0.6 + hr() * 0.25, z0 - 0.3 - (i >> 1) * 0.84 - hr() * 0.3, GREENS[(hr() * 4) | 0], 0.9);        // a leafy, uneven face instead of a smooth box
        } else if (kind === 2) {                               // thuja row
          for (let i = 0; i < 9; i++) b.cone(0.55 + r() * 0.12, 2.3 + r() * 1.3, fx + s * 0.2, 0, z0 - 0.7 - i * 1.32, i % 2 ? 0x3c7030 : 0x4a8036, 9);
        } else {                                               // wire fence on a concrete footing
          b.box(0.2, 0.3, 12, fx, 0, zc, 0xa9a59c);
          for (let i = 0; i <= 4; i++) b.box(0.07, 1.25, 0.07, fx, 0.3, z0 - i * 3, 0x33543c);
          for (const y of [0.55, 0.95, 1.45]) b.box(0.03, 0.03, 12, fx, y, zc, 0x3f6447);
          for (let i = 0; i < 6; i++) b.leaf(0.5 + r() * 0.3, fx + s * 0.8, 0.5, z0 - 1 - i * 2, GREENS[(r() * 4) | 0], 0.8);
        }
        // what stands on the plot
        const hx = s * (ROADW / 2 + 6.2 + r() * 2.5), q = ci % 2 === 0 && s === (ci % 4 === 0 ? -1 : 1) && seg === 0 ? 0 : r();
        if (q < 0.62) {
          const w = 6 + r() * 2.5, d = 6.5 + r() * 2.5, h = 2.9 + (r() < 0.35 ? 2.4 : 0), wall = WALLS[(r() * WALLS.length) | 0], roof = ROOFS[(r() * ROOFS.length) | 0];
          b.box(w, 0.35, d, hx, 0, zc, 0x8f8a82); b.box(w - 0.1, h, d - 0.1, hx, 0.35, zc, wall, 0, 0.03);
          const turn = r() < 0.5, rh = 2.3 + r(), rw = (turn ? d : w) + 0.9, rd = (turn ? w : d) + 0.9, rg = roofGeo(rw, rh, rd); b.add(rg, roof, hx, h + 0.35, zc, turn ? Math.PI / 2 : 0, 0.04);
          const chx = hx + (r() - 0.5) * 2, chz = zc + (r() - 0.5) * 2; b.box(0.55, 1.1, 0.55, chx, h + 1.2, chz, 0x8a5a48);                    // chimney
          const face = hx - s * (w / 2 + 0.02);
          for (const wz of [-d * 0.27, d * 0.27]) for (let fl = 0; fl < (h > 4 ? 2 : 1); fl++) { b.box(0.06, 1.25, 1.15, face - s * 0.01, 1.25 + fl * 2.4, zc + wz, 0xf4f1ea, 0, 0);
            if (HQ) { r(); gbs[s][hr() < 0.45 ? 1 : 0].box(0.07, 1.05, 0.95, face - s * 0.03, 1.35 + fl * 2.4, zc + wz, 0x2c3f52, 0, 0); b.box(0.22, 0.06, 1.32, face - s * 0.09, 1.2 + fl * 2.4, zc + wz, 0xe6e2d8, 0, 0); for (const cz of [-0.34, 0.34]) b.box(0.02, 0.98, 0.25, face - s * 0.075, 1.38 + fl * 2.4, zc + wz + cz, 0xf2ead8, 0, 0.03); }      // glass that mirrors the sky, a sill, curtains
            else b.box(0.07, 1.05, 0.95, face - s * 0.03, 1.35 + fl * 2.4, zc + wz, 0x2c3f52, 0, 0); }
          b.box(0.07, 2.0, 0.95, face - s * 0.02, 0.35, zc, 0x6b4630, 0, 0);                                           // door
          if (HQ) hqHouse(b, hr, { hx, zc, w, d, h, rh, rw, rd, turn, roof, s, fx, grp, chx, chz });
          if (ci % 2 === 0 && s === (ci % 4 === 0 ? -1 : 1) && !grp.userData.plate) { const pl = new THREE.Mesh(plateG, plateMats[0]); pl.position.set(face - s * 0.07, 2.75, zc); pl.rotation.y = -s * Math.PI / 2; grp.userData.plate = pl; grp.userData.plateSide = s; }
          b.box(Math.abs(face - fx) - 0.3, 0.04, 1.6, (face + fx) / 2, 0, zc, 0xa8a49b, 0, 0.03);                     // path to the gate
          if (r() < 0.6) tree(hx + s * (1 + r() * 3), zc + (r() < 0.5 ? -5 : 5), 0.8 + r() * 0.4);
        } else if (q < 0.82) { tree(hx - s * 1.5, zc + 2, 1 + r() * 0.5); spruce(hx + s * 2, zc - 3, 6 + r() * 3); tree(hx + s * 4, zc + 4, 0.9); }
        else { spruce(hx - s, zc + 3, 5 + r() * 3); spruce(hx + s * 2.5, zc - 2, 7 + r() * 3); for (let i = 0; i < 5; i++) b.leaf(0.6 + r() * 0.5, hx + (r() - 0.5) * 7, 0.45, zc + (r() - 0.5) * 9, GREENS[(r() * 4) | 0], 0.75); }
        // far tree line that closes the view
        for (let i = 0; i < 3; i++) { const tx = s * (24 + r() * 16), tz = z0 - r() * 12; if (r() < 0.6) spruce(tx, tz, 9 + r() * 6); else tree(tx, tz, 1.6 + r() * 0.9); }
      }
      // verge: tufts and flowers along the edge of the road
      if (HQ) {                                              // fallen leaves at the edge of the lane, real blades of grass on the verge and the lawns
        for (let i = 0; i < 12; i++) { const lg = new THREE.CircleGeometry(0.06 + hr() * 0.05, 5); lg.rotateX(-Math.PI / 2); b.add(lg, [0x9a5a22, 0xb8862e, 0x7a4a1e, 0xc9a23a][i % 4], s * (ROADW / 2 - 0.12 - hr() * hr() * 1.5), 0.012, -hr() * CL, hr() * 6, 0.1); }
        for (let i = 0, nb = isTouch ? 500 : 1400; i < nb; i++) { const strip = i % 3 === 0, x = s * (ROADW / 2 + (strip ? 0.22 + hr() * 0.48 : 0.9 + hr() * hr() * 4.6)), z = -hr() * CL; if (!strip && Math.abs((-z) % 12 - 6) < 0.95) continue; tuft(blades[s], x, z, hr); }
      }
      for (let i = 0; i < 16; i++) { const z = -r() * CL, x = s * (ROADW / 2 + 0.12 + r() * 0.45); if (r() < 0.75) b.cone(0.09 + r() * 0.07, 0.22 + r() * 0.2, x, 0, z, 0x5f9a3c, 5); else b.blob(0.07, x, 0.2, z, [0xf2d24a, 0xf5f5f0, 0xd95f8a][(r() * 3) | 0]); }
    }
    if (ci % 2 === 0) { const s = ci % 4 === 0 ? 1 : -1; b = bs[s]; const x = s * (ROADW / 2 + 0.38); b.cyl(0.05, 0.07, 5.2, x, 0, -6, 0x6d7278); b.box(0.9, 0.06, 0.08, x - s * 0.4, 5.15, -6, 0x6d7278); b.box(0.36, 0.1, 0.18, x - s * 0.82, 5.05, -6, 0xe8e2c8); grp.userData.lamp = { s, x }; }
    grp.userData.sideL = bs[-1].mesh(); grp.userData.sideR = bs[1].mesh(); grp.add(grp.userData.sideL, grp.userData.sideR);
    if (HQ) for (const sd of [-1, 1]) { const side = grp.userData[sd < 0 ? 'sideL' : 'sideR'];
      gbs[sd].forEach((gb, k) => { if (!gb.g.length) return; const gm = gb.mesh(); gm.material = k ? hq.glassLitM : hq.glassM; gm.castShadow = false; side.add(gm); });
      const P = blades[sd]; if (P.pos.length) { const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(P.pos, 3)); bg.setAttribute('color', new THREE.Float32BufferAttribute(P.col, 3)); bg.setAttribute('normal', new THREE.Float32BufferAttribute(P.nor, 3)); bg.setAttribute('aTip', new THREE.Float32BufferAttribute(P.tip, 1)); const bm = new THREE.Mesh(bg, hq.bladeM); bm.receiveShadow = true; side.add(bm); } }
    if (grp.userData.plate) grp.userData[grp.userData.plateSide < 0 ? 'sideL' : 'sideR'].add(grp.userData.plate);
    if (grp.userData.lamp) {                 // evening: a glowing lamp head and a pool of light on the road (no real light, so it costs nothing)
      const { s, x } = grp.userData.lamp, gl = new THREE.Mesh(lampG, lampM), pool = new THREE.Mesh(poolG, poolM);
      gl.position.set(x - s * 0.82, 4.97, -6); pool.position.set(x - s * 1.5, 0.035, -6); gl.visible = pool.visible = false; lampBits.push(gl, pool);
      grp.userData[s < 0 ? 'sideL' : 'sideR'].add(gl, pool);
      if (HQ) { const cn = new THREE.Mesh(coneG, hq.coneM); cn.position.set(x - s * 0.82, 2.5, -6); cn.renderOrder = 4; grp.userData[s < 0 ? 'sideL' : 'sideR'].add(cn); }      // a shaft of light under the lamp, seen in fog and rain
    }
    grp.traverse((o) => { o.frustumCulled = false; }); grp.userData.k = ci; scene.add(grp); chunks.push(grp);
  }
  // one green sheet under everything, so there is never a hole where no street piece lies
  const gg = new THREE.PlaneGeometry(900, 900, 90, 90); gg.rotateX(-Math.PI / 2);
  ground = new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ color: 0x4f8a36, roughness: 1, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 4 })); ground.position.y = -0.1; ground.receiveShadow = true; ground.frustumCulled = false; scene.add(ground);
  // the T-junction: a square of road, a hedge with a chevron board closing the far side, a house behind it
  {
    junction = new THREE.Group(); const b = new Builder(900), r = b.r;
    const rg = new THREE.PlaneGeometry(2 * JH, ROADW + 0.75); rg.rotateX(-Math.PI / 2); const rd = new THREE.Mesh(rg, roadM); rd.position.set(0, 0.004, 0.375); rd.receiveShadow = true; junction.add(rd);
    const pg = new THREE.PlaneGeometry(2 * JH, 92); pg.rotateX(-Math.PI / 2); const gp = new THREE.Mesh(pg, grassM); gp.position.set(0, -0.03, -ROADW / 2 - 46); gp.receiveShadow = true; junction.add(gp);
    b.box(2 * JH + 2.4, 1.5, 0.95, 0, 0, -JH - 0.35, 0x3d6f2b, 0, 0.1); for (let i = 0; i < 8; i++) b.leaf(0.66, -4.3 + i * 1.23, 1.55 + r() * 0.3, -JH - 0.35, 0x4a8034, 0.7);
    for (const x of [-1.9, 1.9]) b.box(0.1, 2.2, 0.1, x, 0, -JH + 0.42, 0x8a8f96);
    b.box(8.5, 0.35, 7, 0.6, 0, -JH - 8.5, 0x8f8a82); b.box(8.4, 3.0, 6.9, 0.6, 0.35, -JH - 8.5, 0xf0e4c4, 0, 0.03); b.add(roofGeo(7.9, 2.8, 9.4), 0x9a3b2e, 0.6, 3.35, -JH - 8.5, Math.PI / 2, 0.04);
    for (const x of [-1.6, 2.8]) { b.box(1.15, 1.25, 0.06, x, 1.25, -JH - 5.0, 0xf4f1ea, 0, 0); b.box(0.95, 1.05, 0.07, x, 1.35, -JH - 4.98, 0x2c3f52, 0, 0); }
    for (const [x, z, h] of [[-6.5, -9, 8], [7.5, -12, 10], [-3, -17, 11], [5, -19, 9]]) { b.cyl(0.02 * h, 0.03 * h, h * 0.25, x, 0, z - JH, 0x5a4030); for (let i = 0; i < 4; i++) b.cone(h * (0.26 - i * 0.045), h * 0.36, x, h * (0.16 + i * 0.2), z - JH, i % 2 ? 0x2f5d33 : 0x27502d, 8); }
    junction.add(b.mesh());
    const st = canvasTex(512, 160, (c, w, h) => {
      c.fillStyle = '#17171a'; c.fillRect(0, 0, w, h); c.fillStyle = '#f6c62d'; c.fillRect(8, 8, w - 16, h - 16); c.fillStyle = '#17171a';
      for (const d of [-1, 1]) { const cx = w / 2 + d * 128; c.beginPath(); c.moveTo(cx + d * 96, h / 2); c.lineTo(cx + d * 22, h / 2 - 52); c.lineTo(cx + d * 22, h / 2 - 22); c.lineTo(cx - d * 78, h / 2 - 22); c.lineTo(cx - d * 78, h / 2 + 22); c.lineTo(cx + d * 22, h / 2 + 22); c.lineTo(cx + d * 22, h / 2 + 52); c.closePath(); c.fill(); }
    }, 1, 1);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.31), new THREE.MeshStandardMaterial({ map: st, roughness: 0.5, emissive: 0x33290a })); sign.position.set(0, 1.75, -JH + 0.5); junction.add(sign);
    junction.traverse((o) => { o.frustumCulled = false; }); junction.visible = false; scene.add(junction);
  }
}
// ---- street pieces: laid along the track, then along both arms of the next junction
const showSides = (c, l, r) => { c.userData.sideL.visible = l; c.userData.sideR.visible = r; };
function placeTrack(c, s0) { const u = c.userData; u.role = 'track'; u.s0 = s0; c.position.set(0, 0, -s0); c.rotation.y = 0; showSides(c, true, true); if (u.plate) u.plate.material = plateMats[Math.min(2, G.stage)]; }
function rotAbout(o, J, th) { const x = o.position.x, z = o.position.z + J, c = Math.cos(th), sn = Math.sin(th); o.position.x = x * c + z * sn; o.position.z = -x * sn + z * c - J; o.rotation.y += th; }
function trackFar() { let far = -1e9; for (const c of chunks) if (c.userData.role === 'track') far = Math.max(far, c.userData.s0 + CL); return far; }
function planJunction() {
  const J = trackFar() + CL + JH; G.jCount = (G.jCount || 0) + 1;
  jn = { J, arms: 0, done: false, choice: null, id: G.jCount };
  junction.position.set(0, 0, -J); junction.rotation.y = 0; junction.visible = true;
  for (let i = rows.length - 1; i >= 0; i--) if (rows[i].z > J - 32) { freeRow(rows[i]); rows.splice(i, 1); }
  for (let i = items.length - 1; i >= 0; i--) if (items[i].z > J - 32) { if (items[i].mesh) items[i].mesh.visible = false; items.splice(i, 1); }
  gen.z = Math.min(gen.z, rows.length ? rows[rows.length - 1].z : gen.z);
  for (const f of friends) if (f.on && f.z > J - 45) { f.on = false; f.g.visible = false; }
}
function manageChunks() {
  if ((!jn || jn.done) && G.dist > G.nextJ - 190) planJunction();
  for (let it = 0; it < 3; it++) {
    let far = -1e9, back = null, free = null;
    for (const c of chunks) {
      const u = c.userData;
      if (u.role === 'track') { far = Math.max(far, u.s0 + CL); if (u.s0 + CL < G.dist - 8 && (!back || u.s0 < back.userData.s0)) back = c; }
      else if (u.role === 'spareArm' && G.t > u.ready) free = c;           // the arm that was not taken: out of sight a moment after the turn
      else if (u.role === 'spareOld' && G.dist > u.ready) free = free || c; // the street we came from: only once it is well behind
    }
    free = free || back; if (!free) return;
    const pending = jn && !jn.done;
    if (far < (pending ? jn.J - JH : 1e9) - 0.1) { if (far > G.dist + 172) return; placeTrack(free, far); }
    else if (pending && jn.arms < 6) {
      const n = jn.arms >> 1, left = jn.arms % 2 === 0, u = free.userData; jn.arms++; u.role = left ? 'armL' : 'armR'; u.n = n;
      free.position.set((left ? -1 : 1) * (JH + n * CL), 0, -jn.J); free.rotation.y = left ? Math.PI / 2 : -Math.PI / 2;
      showSides(free, !left, left);                                          // the side facing the street we are on stays empty, or its houses would stand inside ours
      if (u.plate) u.plate.material = plateMats[Math.min(2, G.stage)];
    } else return;
  }
}
// The turn itself: the camera never changes its maths. Everything that exists is swung a quarter turn about the middle of
// the junction so the chosen arm lies straight ahead, and the camera and Łatka are given the opposite offset, which then
// eases to zero. On the first frame the picture is identical; over the next third of a second it becomes a turn.
function doTurn(dir) {
  for (const m of hq.prints) m.visible = false; for (const b of hq.sparrows) { b.st = 0; b.g.visible = false; } hq.birdAt = G.dist + 40;
  const th = dir === 'left' ? -Math.PI / 2 : Math.PI / 2, J = jn.J, mine = dir === 'left' ? 'armL' : 'armR';
  for (const c of chunks) {
    const u = c.userData;
    if (u.role === mine) { u.role = 'track'; u.s0 = J + JH + u.n * CL; c.position.set(0, 0, -u.s0); c.rotation.y = 0; if (u.n > 0) showSides(c, true, true); }
    else { rotAbout(c, J, th); if (u.role === 'track') { u.role = 'spareOld'; u.ready = J + 50; } else { u.role = 'spareArm'; u.ready = G.t + 0.3; } }
  }
  rotAbout(junction, J, th);
  G.dist = J + (dir === 'left' ? -Pl.x : Pl.x); Pl.x = 0; Pl.lane = 1; Mi.x = 0; Mi.lane = 1;
  G.yawOff = th; G.yaw += th; jn.done = true; gen.hold = false; gen.z = J + 14; gen.safe = 1; G.genMin = J + 26; G.nextJ = J + 240 + Math.random() * 110;
  audio.whoosh(); G.score += 25; buzz(20);
  for (const f of friends) { f.on = false; f.g.visible = false; } G.friendAt = Math.max(G.friendAt, J + 55);
  setWeather(jn.id % 2 ? W.order[((jn.id - 1) >> 1) % 3] : 'clear', true);                 // a new street, new weather
}
// time of day drifts from a bright afternoon to a warm sunset over the three stages
const MOODS = [
  { top: [0.03, 0.22, 0.92], hor: [0.5, 0.75, 1.0], sun: [1.0, 0.95, 0.82], si: 3.3, hi: 1.05, el: 0.62, fog: 0.0105 },
  { top: [0.1, 0.27, 0.78], hor: [1.0, 0.8, 0.52], sun: [1.0, 0.8, 0.5], si: 3.1, hi: 0.92, el: 0.38, fog: 0.012 },
  { top: [0.04, 0.06, 0.26], hor: [0.86, 0.4, 0.3], sun: [1.0, 0.5, 0.3], si: 1.6, hi: 0.78, el: 0.1, fog: 0.0135 },     // dusk: the lamps come on
];
const mood = { k: 0 }, sunDir = new THREE.Vector3(), tmpC = new THREE.Color(), YAX = new THREE.Vector3(0, 1, 0);
function setWeather(k, announce) { if (W.target === k) return; W.target = k; if (announce && G.mode === 'play') hint(T('w_' + k), 2.6); }
function buildWeather() {
  const n = 380, rp = new Float32Array(n * 6), rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
  rainFx = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0xcfdcec, transparent: true, opacity: 0.55, fog: false })); rainFx.frustumCulled = false; rainFx.visible = false; scene.add(rainFx);
  rainFx.userData.d = Array.from({ length: n }, () => [(Math.random() - 0.5) * 20, Math.random() * 10, 4 - Math.random() * 26]);
  const m = 520, sp = new Float32Array(m * 3), sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const flake = canvasTex(32, 32, (c) => { const g = c.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.6, 'rgba(255,255,255,.85)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 32, 32); }, 1, 1);
  snowFx = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, map: flake, size: 0.09, transparent: true, opacity: 0.95, depthWrite: false, fog: false })); snowFx.frustumCulled = false; snowFx.visible = false; scene.add(snowFx);
  snowFx.userData.d = Array.from({ length: m }, () => [(Math.random() - 0.5) * 22, Math.random() * 9, 4 - Math.random() * 26, Math.random() * 6]);
}
function updateWeatherFx(dt) {
  const c = camera.position;
  rainFx.visible = W.rain > 0.03;
  if (rainFx.visible) {
    const d = rainFx.userData.d, a = rainFx.geometry.attributes.position, p = a.array, n = Math.floor(d.length * W.rain);
    for (let i = 0; i < n; i++) { const q = d[i]; q[1] -= 26 * dt; q[2] += G.speed * dt * 0.6; if (q[1] < -1.5 || q[2] > 5) { q[0] = (Math.random() - 0.5) * 20; q[1] = 8 + Math.random() * 3; q[2] = 4 - Math.random() * 26; }
      const j = i * 6; p[j] = c.x + q[0]; p[j + 1] = c.y - 2.4 + q[1]; p[j + 2] = c.z + q[2]; p[j + 3] = p[j] + 0.03; p[j + 4] = p[j + 1] + 0.6; p[j + 5] = p[j + 2] - 0.16; }
    a.needsUpdate = true; rainFx.geometry.setDrawRange(0, n * 2);
  }
  snowFx.visible = W.snow > 0.03;
  if (snowFx.visible) {
    const d = snowFx.userData.d, a = snowFx.geometry.attributes.position, p = a.array, n = Math.floor(d.length * W.snow);
    for (let i = 0; i < n; i++) { const q = d[i]; q[1] -= (1.5 + (i % 5) * 0.25) * dt; q[2] += G.speed * dt * 0.85; q[0] += Math.sin(G.t * 1.3 + q[3]) * dt * 0.5; if (q[1] < -0.5 || q[2] > 5) { const pass = q[2] > 5; q[0] = (Math.random() - 0.5) * 22; q[1] = pass ? Math.random() * 9 : 8.5; q[2] = pass ? -22 + Math.random() * 3 : 4 - Math.random() * 26; }
      const j = i * 3; p[j] = c.x + q[0]; p[j + 1] = c.y - 2.4 + q[1]; p[j + 2] = c.z + q[2]; }
    a.needsUpdate = true; snowFx.geometry.setDrawRange(0, n);
  }
}
function updateMood(dt) {
  mood.k += (Math.min(2, G.stage + (G.mode === 'play' ? sm(0, 1, G.stageT / 60) * 0.6 : 0)) - mood.k) * Math.min(1, dt * 0.6);
  for (const k of ['rain', 'fog', 'snow']) W[k] += ((W.target === k ? 1 : 0) - W[k]) * Math.min(1, dt * 0.45);
  W.eve = sm(1.3, 2, mood.k);
  const i = Math.min(1, Math.floor(mood.k)), f = mood.k - i, a = MOODS[i], b = MOODS[i + 1], L3 = (p, q) => [lerp(p[0], q[0], f), lerp(p[1], q[1], f), lerp(p[2], q[2], f)];
  const top = L3(a.top, b.top), hor = L3(a.hor, b.hor), sc = L3(a.sun, b.sun), mix3 = (c, t, k) => { c[0] = lerp(c[0], t[0], k); c[1] = lerp(c[1], t[1], k); c[2] = lerp(c[2], t[2], k); };
  const dusk = 1 - 0.55 * W.eve;                                                           // weather colours are darker at dusk
  mix3(top, [0.3 * dusk, 0.34 * dusk, 0.4 * dusk], W.rain * 0.85); mix3(hor, [0.55 * dusk, 0.58 * dusk, 0.62 * dusk], W.rain * 0.85);
  mix3(top, [0.7 * dusk, 0.72 * dusk, 0.75 * dusk], W.fog * 0.9); mix3(hor, [0.8 * dusk, 0.82 * dusk, 0.84 * dusk], W.fog * 0.95);
  mix3(top, [0.5 * dusk, 0.58 * dusk, 0.72 * dusk], W.snow * 0.8); mix3(hor, [0.86 * dusk, 0.89 * dusk, 0.94 * dusk], W.snow * 0.9);
  skyU.uTop.value.setRGB(...top); skyU.uHor.value.setRGB(...hor); skyU.uSun.value.setRGB(...sc); skyU.uCover.value = Math.max(W.rain, W.fog, W.snow * 0.85);
  const el = lerp(a.el, b.el, f); sunDir.set(-0.42 * Math.cos(el), Math.sin(el), -0.91 * Math.cos(el)).normalize(); skyU.uSunDir.value.copy(sunDir); skyU.uTime.value = G.t; sunDir.applyAxisAngle(YAX, G.yaw); G.dome.rotation.y = G.yaw;    // the sky and the light turn with the world
  if (hq.sky) { const su = hq.sky.material.uniforms; su.sunPosition.value.copy(sunDir); su.turbidity.value = 2.5 + 8 * skyU.uCover.value;
    if (Math.abs(el - hq.envEl) > 0.05) { hq.envEl = el; hq.sky2.material.uniforms.sunPosition.value.copy(skyU.uSunDir.value); const old = hq.envRT; hq.envRT = hq.pm.fromScene(hq.envScene); scene.environment = hq.envRT.texture; if (old) old.dispose(); }
    hq.glassLitM.emissiveIntensity = 2.4 * W.eve; hq.coneM.opacity = W.eve * (0.05 + 0.22 * W.fog + 0.08 * W.rain); hq.bladeM.color.setRGB(lerp(1, 12, W.snow), lerp(1, 4, W.snow), lerp(1, 20, W.snow));
    hq.wetK = Math.max(W.rain, hq.wetK - dt * 0.012); hq.wet.value = hq.wetK * (1 - W.snow); hq.time.value = G.t;
    if (hq.drops) hq.drops.style.opacity = W.rain > 0.15 ? Math.min(1, W.rain * 1.2) : 0; }
  sun.color.setRGB(...sc); sun.intensity = lerp(a.si, b.si, f) * Math.max(0.22, 1 - 0.6 * W.rain - 0.72 * W.fog - 0.4 * W.snow);
  hemi.intensity = lerp(a.hi, b.hi, f) * (1 + 0.3 * W.fog + 0.45 * W.snow - 0.05 * W.rain);
  scene.environmentIntensity = 0.3 * hemi.intensity * Math.max(0.25, 1 - 0.5 * W.rain - 0.5 * W.fog); hemi.intensity *= 0.72;
  hemi.color.setRGB(...top).lerp(tmpC.setRGB(1, 1, 1), 0.55); scene.fog.color.setRGB(...hor); scene.fog.density = lerp(a.fog, b.fog, f) * (1 + 0.5 * W.rain + 2.4 * W.fog + 0.8 * W.snow);
  fogUniforms.uFogColor.value.copy(scene.fog.color); fogUniforms.uFogDensity.value = scene.fog.density;
  // wet road in the rain, white ground in the snow
  roadM.roughness = lerp(0.95, 0.3, W.rain); roadM.color.setScalar(lerp(1, 0.6, W.rain) * lerp(1, 1.7, W.snow));
  grassM.color.setRGB(lerp(1, 10, W.snow), lerp(1, 3.5, W.snow), lerp(1, 21, W.snow)); ground.material.color.setHex(0x4f8a36).lerp(tmpC.setHex(0xe9eef4), W.snow);
  worldMat.emissive.setRGB(0.05 * W.snow, 0.055 * W.snow, 0.07 * W.snow);
  // street lamps
  const lit = W.eve > 0.03; if (lampBits.length && lampBits[0].visible !== lit) for (const o of lampBits) o.visible = lit;
  lampM.color.setRGB(4 * W.eve, 3 * W.eve, 1.6 * W.eve); poolM.opacity = 0.55 * W.eve;
  if (audio.on) audio.fall.g.gain.setTargetAtTime(W.rain * 0.09, audio.ctx.currentTime, 0.5);
  const pz = -G.dist; sun.target.position.set(0, 0, pz - 6); sun.position.copy(sun.target.position).addScaledVector(sunDir, 60); sun.target.updateMatrixWorld();
  G.dome.position.copy(camera.position); if (hq.sky) hq.sky.position.copy(camera.position); ground.position.set(0, -0.1, pz);
  updateWeatherFx(dt);
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
  mk('planter', (b) => { b.box(1.3, 0.55, 0.7, 0, 0, 0, 0xb5b0a6); b.box(1.38, 0.08, 0.78, 0, 0.55, 0, 0x9d988e); b.leaf(0.5, -0.3, 0.95, 0, 0x3f7a2c); b.leaf(0.55, 0.3, 1.02, 0.05, 0x4f8a34); b.leaf(0.4, 0, 1.35, -0.05, 0x5c9440); for (let i = 0; i < 6; i++) b.leaf(0.08, -0.5 + i * 0.2, 1.05 + (i % 3) * 0.16, 0.36, i % 2 ? 0xe85d8f : 0xf4d44a); });
  mk('biglog', (b) => { b.add(lying(ROADW + 0.5, 0.27), 0x66472f, 0, 0.27, 0); b.add(lying(ROADW + 0.54, 0.21), 0xc9a877, 0, 0.27, 0); for (const x of [-1.9, 0.6, 2.2]) { b.cyl(0.05, 0.08, 0.35, x, 0.45, 0.02, 0x5c3f2a); b.blob(0.2, x + 0.1, 0.78, 0, 0x4f8a34); } });
  mk('line', (b) => {
    for (const x of [-ROADW / 2 - 0.1, ROADW / 2 + 0.1]) { b.box(0.1, 2.05, 0.1, x, 0, 0, 0x8a8f96); b.box(0.5, 0.06, 0.06, x, 1.95, 0, 0x8a8f96); }
    b.box(ROADW + 0.2, 0.025, 0.025, 0, 1.93, 0, 0xe8e4da);
    const cols = [0xf4f1ea, 0xd9534f, 0x4f86c6, 0xf2c94c, 0xf4f1ea, 0x69a86b, 0xe58fb0]; let x = -ROADW / 2 + 0.5;
    for (let i = 0; i < 7; i++) { const w = 0.6 + (i % 3) * 0.1; b.box(w, 1.12 + (i % 2) * 0.06, 0.03, x + w / 2, 0.8 - (i % 2) * 0.06, 0, cols[i], 0, 0.02); x += w + 0.1; }
  });
  // flowerpots Mila knocks off the fences
  mk('pot', (b) => { for (const x of [-0.3, 0.28]) { b.cyl(0.2, 0.13, 0.3, x, 0, 0, 0xb5583a, 10); b.cyl(0.22, 0.22, 0.05, x, 0.28, 0, 0xc46a48, 10); b.leaf(0.2, x, 0.5, 0, 0x4f8a34); b.blob(0.09, x + 0.08, 0.66, 0.05, 0xe85d8f); b.blob(0.08, x - 0.1, 0.62, -0.04, 0xf4d44a); } });
  // a rolling ball (built around its centre so it can spin), a neighbour on a bike, a robot mower
  mk('ball', (b) => { b.add(new THREE.IcosahedronGeometry(0.3, 2), 0xd9412f, 0, 0, 0, 0, 0.02); b.add(new THREE.CylinderGeometry(0.305, 0.305, 0.12, 20), 0xf6f3ec, 0, 0, 0, 0, 0); const g2 = new THREE.CylinderGeometry(0.303, 0.303, 0.12, 20); g2.rotateZ(Math.PI / 2); b.add(g2, 0x2f6fd0, 0, 0, 0, 0, 0); });
  mk('bike', (b) => {
    for (const z of [-0.52, 0.52]) { const w = new THREE.TorusGeometry(0.31, 0.035, 6, 18); w.rotateY(Math.PI / 2); b.add(w, 0x1d1d20, 0, 0.345, z, 0, 0); }
    b.box(0.05, 0.05, 0.95, 0, 0.62, 0, 0xd8362c); b.box(0.05, 0.5, 0.05, 0, 0.36, -0.1, 0xd8362c); b.box(0.05, 0.55, 0.05, 0, 0.36, 0.48, 0xd8362c); b.box(0.5, 0.04, 0.04, 0, 0.93, 0.46, 0x2a2a2e); b.box(0.16, 0.05, 0.26, 0, 0.86, -0.12, 0x2a2a2e);
    b.box(0.36, 0.52, 0.24, 0, 0.92, -0.05, 0x2f6fb5); b.blob(0.14, 0, 1.6, 0.06, 0xe9b98f, 1); b.blob(0.155, 0, 1.66, 0.04, 0xf2c230, 0.75);       // the rider: jacket, head, helmet
    for (const x of [-0.11, 0.11]) { b.box(0.11, 0.5, 0.13, x, 0.42, -0.02, 0x3a3f4a); b.box(0.09, 0.09, 0.42, x * 1.7, 1.2, 0.22, 0x2f6fb5); }
  });
  // somebody carving down the lane on a one-wheeled electric board: one fat tyre in the middle, a footpad on each side of it
  mk('onewheel', (b) => {
    const tyre = new THREE.CylinderGeometry(0.19, 0.19, 0.2, 18); tyre.rotateZ(Math.PI / 2); b.add(tyre, 0x17171a, 0, 0.19, 0, 0, 0); const hub = new THREE.CylinderGeometry(0.09, 0.09, 0.22, 12); hub.rotateZ(Math.PI / 2); b.add(hub, 0xb9bec6, 0, 0.19, 0, 0, 0);
    for (const x of [-0.125, 0.125]) b.box(0.03, 0.06, 0.92, x, 0.18, 0, 0x9aa0a8, 0, 0); for (const z of [-0.33, 0.33]) { b.box(0.25, 0.035, 0.3, 0, 0.23, z, 0x1c1d21, 0, 0); b.box(0.2, 0.006, 0.24, 0, 0.266, z, z > 0 ? 0x2a7fd0 : 0x2a2c31, 0, 0); }
    b.box(0.22, 0.025, 0.42, 0, 0.385, 0, 0x24262b, 0, 0); b.box(0.2, 0.04, 0.02, 0, 0.2, 0.47, 0xf6f6f0, 0, 0); b.box(0.2, 0.04, 0.02, 0, 0.2, -0.47, 0xd8342c, 0, 0);                                         // fender, white light in front, red behind
    const limb = (r, len, rx, rz, x, y, z, col) => { const c = new THREE.CapsuleGeometry(r, len, 4, 8); c.rotateX(rx); c.rotateZ(rz); b.add(c, col, x, y, z, 0, 0.03); }, JEANS = 0x34507a, HOOD = 0x2a9d8f, skin = 0xe9b98f;
    limb(0.075, 0.3, 0.42, 0, 0, 0.5, 0.3, JEANS); limb(0.08, 0.3, -0.2, 0, 0, 0.88, 0.2, JEANS); limb(0.075, 0.3, -0.42, 0, 0, 0.5, -0.3, JEANS); limb(0.08, 0.3, 0.2, 0, 0, 0.88, -0.2, JEANS);                    // bent knees, feet on the pads
    for (const z of [0.36, -0.36]) { const sh = new THREE.SphereGeometry(0.085, 10, 8); sh.scale(1.5, 0.6, 0.9); b.add(sh, 0xf2f2f2, 0.02, 0.31, z, 0, 0.02); }
    limb(0.17, 0.34, 0.06, 0, 0, 1.36, 0, HOOD); b.box(0.16, 0.34, 0.26, -0.17, 1.2, 0, 0x3a3f46, 0, 0.03);                                                                                                     // hoodie and a backpack
    limb(0.055, 0.38, 1.2, 0, 0.02, 1.42, 0.42, HOOD); limb(0.055, 0.38, -1.0, 0, 0.02, 1.36, -0.4, HOOD); for (const [y, z] of [[1.34, 0.66], [1.22, -0.62]]) b.add(new THREE.SphereGeometry(0.06, 10, 8), skin, 0.02, y, z, 0, 0.02);   // arms out for balance
    b.cyl(0.06, 0.065, 0.09, 0, 1.64, 0, skin, 10); b.add(new THREE.SphereGeometry(0.15, 12, 10), skin, 0, 1.84, 0, 0, 0.02); b.add(new THREE.SphereGeometry(0.17, 12, 8, 0, 6.3, 0, 1.7), 0x22242a, 0, 1.86, 0, 0, 0.02); b.box(0.03, 0.05, 0.22, 0.135, 1.85, 0, 0x101114, 0, 0);
  });
  mk('mower', (b) => { b.box(0.86, 0.2, 1.0, 0, 0.07, 0, 0xf07a1a); b.box(0.7, 0.14, 0.7, 0, 0.27, -0.05, 0xf59a3a); b.box(0.9, 0.07, 1.04, 0, 0.03, 0, 0x2a2a2e); b.box(0.2, 0.05, 0.12, 0, 0.41, 0.1, 0x33d17a, 0, 0); for (const x of [-0.46, 0.46]) for (const z of [-0.36, 0.36]) b.add(lying(0.08, 0.13), 0x1d1d20, x, 0.13, z, 0, 0); });
  { const g = new THREE.CircleGeometry(0.78, 24); g.rotateX(-Math.PI / 2); g.scale(0.96, 1, 1.5); PROTO.puddle = g; MATS.puddle = new THREE.MeshStandardMaterial({ color: 0x4a6f93, roughness: 0.08, transparent: true, opacity: 0.86 }); bendPatch(MATS.puddle); }
}
const KIND = { log: 'low', crate: 'low', gate: 'high', binG: 'full', binB: 'full', binY: 'full', planter: 'full', biglog: 'low', line: 'high', pot: 'low', ball: 'low', mower: 'low', bike: 'full', onewheel: 'full', puddle: 'puddle' };
const MOVE_V = { ball: 5.5, bike: 6.5, onewheel: 6.2, mower: 2.6 }, MATS = {};       // things that come towards Łatka, and their speed
function getObj(kind) {
  const p = pools[kind] || (pools[kind] = []); let m = p.pop();
  if (!m) { m = new THREE.Mesh(PROTO[kind], MATS[kind] || worldMat); m.castShadow = kind !== 'puddle'; m.receiveShadow = true; m.userData.kind = kind; m.frustumCulled = false; scene.add(m); }
  m.visible = true; m.rotation.set(0, 0, 0); m.userData.tip = 0; return m;
}
function freeRow(row) { for (const m of row.objs) { m.visible = false; pools[m.userData.kind].push(m); } row.objs.length = 0; }

const BONES = 110; let boneMesh, relicMeshes = {}; const dummy = new THREE.Object3D();
function buildPickups() {
  const parts = [], cg = new THREE.CylinderGeometry(0.045, 0.045, 0.26, 8); cg.rotateZ(Math.PI / 2); parts.push(cg.toNonIndexed());
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) { const s = new THREE.SphereGeometry(0.07, 8, 6); s.translate(sx * 0.14, sy * 0.05, 0); parts.push(s.toNonIndexed()); }
  boneMesh = new THREE.InstancedMesh(mergeGeometries(parts), new THREE.MeshStandardMaterial({ color: 0xffd257, emissive: 0x9a5a00, emissiveIntensity: 0.9, roughness: 0.35 }), BONES);
  boneMesh.frustumCulled = false; boneMesh.castShadow = true; scene.add(boneMesh);
  // the rare relics are the very same models as in level 1, with a ring around them so they stand out on the road
  for (const id of RELICS) {
    const g = new THREE.Group(), c = new THREE.Color(RELIC_COLORS[id]), model = relicModel(id);
    model.traverse((o) => { if (o.isMesh && o.material.metalness > 0.5) { o.material.metalness = 0.35; o.material.emissiveIntensity *= 1.5; } });   // no reflection map on this level: plain metal would render black
    const spin = new THREE.Group(); spin.add(model); spin.scale.setScalar(1.35); g.add(spin);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.035, 6, 28), new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(1.6) })); g.add(halo);
    g.visible = false; g.userData.col = c; scene.add(g); relicMeshes[id] = g;
  }
  // power-ups: a horseshoe magnet, a shield orb, a lightning bolt and a ×2 coin
  for (const id of POWERS) {
    const g = new THREE.Group(), c = new THREE.Color(POW_COL[id]), spin = new THREE.Group(), mat = (col, e = 0.9) => new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: e, roughness: 0.35 });
    if (id === 'magnet') {
      spin.add(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.075, 10, 20, Math.PI), mat(0xe23a2c)));
      for (const x of [-0.2, 0.2]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.2, 12), mat(0xe23a2c)); leg.position.set(x, -0.1, 0); const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.078, 0.1, 12), mat(0xf2f2f2, 0.6)); tip.position.set(x, -0.25, 0); spin.add(leg, tip); }
    } else if (id === 'shield') {
      spin.add(new THREE.Mesh(new THREE.SphereGeometry(0.27, 18, 14), new THREE.MeshStandardMaterial({ color: 0x8fd0ff, emissive: 0x2f8fe0, emissiveIntensity: 1, roughness: 0.2, transparent: true, opacity: 0.8 })));
      spin.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.15, 0), mat(0xffffff, 0.8)));
    } else if (id === 'turbo') {
      const sh = new THREE.Shape(); [[0.06, 0.34], [-0.16, -0.02], [-0.02, -0.02], [-0.08, -0.34], [0.17, 0.06], [0.03, 0.06]].forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y)));
      const bolt = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.09, bevelEnabled: false }), mat(0xffd21f, 1.2)); bolt.position.z = -0.045; spin.add(bolt);
    } else {
      const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.07, 24), mat(0x9a4fe0)); coin.rotation.x = Math.PI / 2; spin.add(coin);
      const t = canvasTex(128, 128, (cx, w) => { cx.clearRect(0, 0, w, w); cx.fillStyle = '#fff6d8'; cx.font = 'bold 84px Arial, sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText('×2', w / 2, w / 2 + 4); }, 1, 1);
      for (const sd of [1, -1]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.46), new THREE.MeshBasicMaterial({ map: t, transparent: true })); f.position.z = sd * 0.04; f.rotation.y = sd > 0 ? 0 : Math.PI; spin.add(f); }
    }
    spin.scale.setScalar(1.5); g.add(spin);
    g.add(new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.035, 6, 28), new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(1.6) })));
    g.visible = false; g.userData.col = c; scene.add(g); relicMeshes[id] = g;
  }
  bubble = new THREE.Mesh(new THREE.SphereGeometry(0.82, 20, 14), new THREE.MeshBasicMaterial({ color: 0x7cc8ff, transparent: true, opacity: 0.24, depthWrite: false })); bubble.visible = false; scene.add(bubble);
}
// ---- friends who cheer from the roadside (the owners of the relics)
// name, shirt, hair, height, trousers, then: long hair, white coat, skirt, grey bun / flat cap
const FRIENDS = [
  { name: 'Alicja', shirt: 0xf4f4f0, hair: 0x5a3a22, sc: 1.0, legs: 0x3a4660, long: 1, coat: 1 },
  { name: 'Dziadek Lesław', shirt: 0x3f6b4a, hair: 0xb9b9b9, sc: 1.04, legs: 0x4a4038, cap: 1 },
  { name: 'Ola', shirt: 0xe2a03a, hair: 0xd8b45a, sc: 0.96, legs: 0x2f3a55, long: 1 },
  { name: 'Agata', shirt: 0x5b72c9, hair: 0x2b1d14, sc: 1.0, legs: 0x6a4a3a, long: 1 },
  { name: 'Jaś', shirt: 0x7fc4f0, hair: 0xd9b877, sc: 0.52, legs: 0xf6f6f6 },
  { name: 'Staś', shirt: 0xd9483b, hair: 0x6b4a2a, sc: 0.7, legs: 0x34507a },
  { name: 'Kazik', shirt: 0xf2c230, hair: 0x3a2a1c, sc: 0.76, legs: 0x4a4a52 },
  { name: 'Karolina', shirt: 0xc2476b, hair: 0x8a3b1e, sc: 0.98, legs: 0x2b2f3a, long: 1 },
  { name: 'Tomek', shirt: 0x2f8f8a, hair: 0x4a3524, sc: 1.05, legs: 0x3a3f4a },
  { name: 'Krzysiek', shirt: 0x7a5bb0, hair: 0x22201e, sc: 1.07, legs: 0x5a4a3a },
  { name: 'Piotruś', shirt: 0x2f9a4a, hair: 0x4a3320, sc: 0.72, legs: 0xf2f2f2, ball: 1 },
  { name: 'Babcia Małgosia', shirt: 0xa56a9a, hair: 0xd6d6d6, sc: 0.9, legs: 0x6a5a7a, skirt: 1, bun: 1 },
];
const friends = [];
function buildFriends() {
  FRIENDS.forEach((F, i) => {
    const { name, shirt, hair, sc } = F, g = new THREE.Group(), b = new Builder(700 + i), skin = 0xe8b890;
    if (HQ) {
      const cap = (rr, hh, x, y, z, col, rz = 0, sx = 1, sz = 1) => { const cg = new THREE.CapsuleGeometry(rr, hh, 4, 10); cg.scale(sx, 1, sz); if (rz) cg.rotateZ(rz); return b.add(cg, col, x, y, z, 0, 0.03); }, ball = (rr, x, y, z, col, sx = 1, sy = 1, sz = 1, jit = 0.02) => { const sg = new THREE.SphereGeometry(rr, 14, 10); sg.scale(sx, sy, sz); return b.add(sg, col, x, y, z, 0, jit); };
      for (const x of [-0.095, 0.095]) { cap(0.075, 0.6, x, 0.42, 0, F.skirt ? skin : F.legs); ball(0.085, x, 0.06, 0.05, 0x2a2420, 1, 0.7, 1.6); }
      if (F.skirt) b.cyl(0.21, 0.31, 0.5, 0, 0.32, 0, F.legs, 14);
      cap(0.19, 0.3, 0, 1.05, 0, shirt, 0, 1.12, 0.72); cap(0.055, 0.42, -0.285, 1.0, 0, shirt, 0.07); ball(0.06, -0.31, 0.72, 0, skin);
      if (F.coat) b.cyl(0.235, 0.27, 0.5, 0, 0.42, 0, shirt, 14);
      b.cyl(0.06, 0.065, 0.1, 0, 1.33, 0, skin, 10); ball(0.165, 0, 1.56, 0, skin, 0.95, 1.08, 1); for (const x of [-0.158, 0.158]) ball(0.03, x, 1.55, 0, skin, 0.6, 1, 0.8);
      { const hg = new THREE.SphereGeometry(0.178, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.56); hg.scale(0.98, 1.06, 1.03); hg.rotateX(-0.25); b.add(hg, hair, 0, 1.585, -0.012, 0, 0.05); }
      if (F.long) ball(0.17, 0, 1.4, -0.1, hair, 1, 1.35, 0.6, 0.05);
      if (F.bun) ball(0.09, 0, 1.77, -0.1, hair);
      if (F.cap) { b.cyl(0.178, 0.184, 0.07, 0, 1.69, -0.01, 0x5a5348, 16); b.box(0.2, 0.025, 0.14, 0, 1.69, 0.17, 0x5a5348); b.box(0.2, 0.045, 0.03, 0, 1.475, 0.155, hair, 0, 0); }
      for (const x of [-0.062, 0.062]) { ball(0.03, x, 1.585, 0.14, 0xf6f4ee, 1, 1, 0.6, 0); ball(0.017, x, 1.585, 0.158, 0x1c1410, 1, 1, 0.6, 0); b.box(0.06, 0.012, 0.02, x, 1.635, 0.148, hair, 0, 0); ball(0.032, x * 1.5, 1.5, 0.125, 0xe59a86, 1, 0.8, 0.5, 0); }
      ball(0.026, 0, 1.53, 0.165, 0xdca582, 0.9, 1, 1, 0); if (!F.cap) b.box(0.075, 0.018, 0.02, 0, 1.468, 0.153, 0x9a3b34, 0, 0);
    } else {
      for (const x of [-0.09, 0.09]) { b.box(0.13, 0.78, 0.15, x, 0, 0, F.skirt ? skin : F.legs); b.box(0.14, 0.07, 0.24, x, 0, 0.04, 0x2a2420); }
      if (F.skirt) b.cyl(0.2, 0.3, 0.5, 0, 0.32, 0, F.legs, 10);
      b.box(0.42, 0.56, 0.24, 0, 0.78, 0, shirt); b.box(0.1, 0.5, 0.1, -0.27, 0.8, 0, shirt);                      // body and the arm that hangs
      if (F.coat) b.box(0.44, 0.42, 0.26, 0, 0.42, 0, shirt);                                                       // dr Alicja's white coat
      b.cyl(0.06, 0.06, 0.08, 0, 1.34, 0, skin); b.blob(0.16, 0, 1.56, 0, skin, 1.05); b.blob(0.172, 0, 1.61, -0.035, hair, 0.9);
      if (F.long) b.box(0.3, 0.3, 0.1, 0, 1.3, -0.13, hair);
      if (F.bun) b.blob(0.09, 0, 1.76, -0.1, hair);
      if (F.cap) { b.cyl(0.175, 0.18, 0.07, 0, 1.69, -0.01, 0x5a5348, 12); b.box(0.2, 0.025, 0.14, 0, 1.69, 0.17, 0x5a5348); b.box(0.2, 0.05, 0.03, 0, 1.47, 0.15, hair, 0, 0); }   // flat cap and a moustache
      for (const x of [-0.06, 0.06]) b.box(0.035, 0.035, 0.02, x, 1.55, 0.15, 0x1c1c1c, 0, 0);
      if (!F.cap) b.box(0.08, 0.02, 0.02, 0, 1.47, 0.155, 0x9a3b34, 0, 0);
    }
    g.add(b.mesh());
    if (F.ball) { const fb = relicModel('ball'); fb.scale.setScalar(0.8); fb.position.set(-0.36, 0.19, 0.22); g.add(fb); }      // Piotruś keeps his football at his feet
    const ab = new Builder(750 + i); if (HQ) { ab.add(new THREE.CapsuleGeometry(0.055, 0.42, 4, 10), shirt, 0, 0.25, 0, 0, 0.03); ab.add(new THREE.SphereGeometry(0.062, 12, 10), skin, 0, 0.56, 0, 0, 0.02); } else { ab.box(0.1, 0.5, 0.1, 0, 0, 0, shirt); ab.blob(0.075, 0, 0.56, 0, skin); }
    const arm = ab.mesh(); arm.position.set(0.27, 1.28, 0); g.add(arm);                                           // the waving arm, hinged at the shoulder
    const lw = name.length > 9 ? 1.75 : 1.1;
    const t = canvasTex(Math.round(lw * 232), 72, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = 'rgba(12,9,6,.62)'; c.beginPath(); if (c.roundRect) c.roundRect(4, 4, w - 8, h - 8, 28); else c.rect(4, 4, w - 8, h - 8); c.fill(); c.fillStyle = '#ffd27a'; c.font = 'italic 44px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(name, w / 2, h / 2 + 2, w - 26); }, 1, 1);
    const label = new THREE.Mesh(new THREE.PlaneGeometry(lw, 0.31), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false })); label.position.y = 2.08 + (1 / sc - 1) * 0.42; label.scale.setScalar(1 / sc); g.add(label);
    g.traverse((o) => { o.frustumCulled = false; }); g.scale.setScalar(sc); g.visible = false; scene.add(g);
    friends.push({ name, g, arm, label, z: 0, on: false, cheered: false, i, sc });
  });
}
function placeFriend(f, x, z, yaw) { f.z = -z; f.on = true; f.cheered = false; f.g.visible = true; f.g.position.set(x, 0, z); f.g.rotation.y = yaw; f.label.rotation.y = -yaw; f.label.position.y = 2.08 + (1 / f.sc - 1) * 0.42; }
const RELICS = ['sock', 'ball', 'mirror', 'brush', 'diaper', 'bone'];

// ------------------------------------------------------------------ level generation
const gen = { z: 40, safe: 1, relicAt: 260, relicI: 0, powAt: 100 };
// Difficulty climbs steadily with the time actually played (and a little with every catch): Łatka runs faster,
// obstacles come closer together, fewer lanes are left open and the safe lane more often needs a jump or a slide.
function difficulty() { return clamp(G.playT / 170 + G.stage * 0.12, 0, 1); }
function speedNow() { return 9.0 + Math.min(5.6, G.playT * 0.034) + Math.min(2, G.stage) * 0.45; }
function genRow() {
  const d = difficulty(), sp = speedNow(), prev = gen.safe;
  let safe = clamp(prev + (R() < 0.6 ? (R() < 0.5 ? -1 : 1) : 0), 0, 2);
  let dz = sp * lerp(1.3, 0.78, d) + R() * sp * lerp(0.45, 0.25, d); if (safe !== prev) dz += sp * 0.22;
  const q = R(), pick = (a) => a[(R() * a.length) | 0], a1 = 0.08 + d * 0.1, a2 = a1 + 0.08 + d * 0.1, a3 = a2 + (gen.z > 110 ? 0.1 + d * 0.05 : 0);
  const mover = q >= a2 && q < a3 ? pick(['ball', 'onewheel', 'mower', 'ball', 'onewheel', 'mower', 'bike']) : null; if (mover) dz += 15;    // it will come to meet her, so leave room
  if (jn && !jn.done && Math.max(gen.z + dz, G.genMin) > jn.J - 32) { gen.hold = true; return; }   // keep the run-up to a junction clear
  const z = Math.max(gen.z + dz, G.genMin), row = { z, cells: [null, null, null], safe, objs: [], hit: false, wide: null };
  if (q < a1) { row.wide = 'biglog'; row.cells = ['low', 'low', 'low']; safe = row.safe = prev; }
  else if (q < a2) { row.wide = 'line'; row.cells = ['high', 'high', 'high']; safe = row.safe = prev; }
  else if (mover) { const m = (R() * 3) | 0; row.cells[m] = KIND[mover]; safe = row.safe = prev !== m ? prev : m === 1 ? (R() < 0.5 ? 0 : 2) : 1; row.mover = { kind: mover, v: MOVE_V[mover], on: false, t: 0 }; }
  else {
    let n = 0;
    for (let l = 0; l < 3; l++) {
      if (l === safe) { if (R() < 0.08 + d * 0.45) row.cells[l] = R() < 0.55 ? 'low' : 'high'; continue; }
      const k = R(), open = lerp(0.42, 0.08, d); row.cells[l] = k < open ? null : k < open + (1 - open) * 0.62 ? 'full' : k < open + (1 - open) * 0.82 ? 'low' : 'high'; if (row.cells[l]) n++;
      if (row.cells[l] === 'low' && R() < lerp(0.3, 0.9, W.target === 'rain' ? 1 : 0)) row.cells[l] = 'puddle';        // puddles slow her down; plenty of them in the rain
    }
    if (!n) row.cells[(safe + 1) % 3] = 'full';
  }
  if (row.wide) { const m = getObj(row.wide); m.position.set(0, 0, -z); row.objs.push(m); }
  else row.cells.forEach((c, l) => {
    if (!c) return;
    const kind = row.mover ? row.mover.kind : c === 'puddle' ? 'puddle' : c === 'low' ? pick(['log', 'crate']) : c === 'high' ? 'gate' : pick(['binG', 'binB', 'binY', 'planter']), m = getObj(kind);
    m.position.set(LX[l], kind === 'ball' ? 0.3 : kind === 'puddle' ? 0.02 : 0, -z); m.rotation.y = c === 'full' && !row.mover ? (R() - 0.5) * 0.3 : 0; m.userData.lane = l; row.objs.push(m);
  });
  rows.push(row);
  // bones lead along the safe lane; they arc over things to jump and stay low under things to slide beneath
  const act = row.cells[safe];
  if (R() < 0.78) for (let i = 0; i < 5; i++) {
    const off = act ? (i - 2) * 1.5 : -7.6 + i * 1.45, y = act === 'low' ? 0.5 + 0.95 * Math.cos((i - 2) / 2 * 1.35) ** 2 * (i === 0 || i === 4 ? 0.35 : 1) : act === 'high' ? 0.3 : 0.55;
    if (z + off > gen.z + 1.2) items.push({ x: LX[safe], y, z: z + off, kind: 'bone' });
  }
  const mid = z - dz * 0.5 - (act ? 2 : 0);
  if (z > gen.relicAt) { items.push({ x: LX[safe], y: 0.85, z: mid, kind: RELICS[gen.relicI++ % RELICS.length] }); gen.relicAt = z + 230 + R() * 90; }
  else if (z > gen.powAt) { items.push({ x: LX[safe], y: 0.85, z: mid, kind: POWERS[(R() * POWERS.length) | 0] }); gen.powAt = z + 120 + R() * 90; }
  gen.z = z; gen.safe = safe;
}
// Mila's trick from the top of a fence: a pair of flowerpots dropped into the lane below. Only where there is room,
// and they can always be jumped.
function dropPot(zc, side) {
  const lane = side < 0 ? 0 : 2, z = zc + 1.5; let idx = rows.length;
  if (z < G.dist + 13 || (jn && !jn.done && z > jn.J - 36)) return false;
  for (let i = 0; i < rows.length; i++) { const r = rows[i]; if (Math.abs(r.z - z) < (r.mover ? 16 : 6.5)) return false; if (r.z > z && idx === rows.length) idx = i; }
  const before = idx > 0 ? rows[idx - 1].safe : 1, row = { z, cells: [null, null, null], safe: before !== lane ? before : 1, objs: [], hit: false, wide: null, fall: 0.001, fx: side * (ROADW / 2 + 0.72), lane };
  row.cells[lane] = 'low'; const m = getObj('pot'); m.position.set(row.fx, 1.1, -z); m.userData.lane = lane; row.objs.push(m); rows.splice(idx, 0, row);
  if (audio.on) audio.tone(520, 0.08, 'square', 0.06); return true;
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
  for (const k of POWERS) { const on = G.pw[k] > 0 && G.mode !== 'title', w = on ? Math.ceil(G.pw[k] / POW_TIME[k] * 20) * 5 : -1; if (shown['pw' + k] !== w) { shown['pw' + k] = w; const el = $('pw-' + k); el.className = on ? 'on' : ''; if (on) el.lastChild.style.width = w + '%'; } }
  const tv = G.mode === 'play' && jn && !jn.done && jn.J - G.dist < 30 ? (jn.choice || 'ask') : '';
  if (shown.turn !== tv) { shown.turn = tv; $('turn').className = 'ui ' + tv; if (tv === 'ask' && !G.turnHint) { G.turnHint = true; hint(T('turn'), 4); } }
}

// ------------------------------------------------------------------ input
function act(a) {
  if (G.mode !== 'play') return;
  if ((a === 'left' || a === 'right') && jn && !jn.done && jn.J - G.dist < 30) { if (!jn.locked && jn.choice !== a) { jn.choice = a; audio.whoosh(); audio.tone(880, 0.12, 'triangle', 0.12); } return; }   // at a junction the swipe picks the way
  if (G.car && (a === 'up' || a === 'down')) return;
  if (a === 'left' && Pl.lane > 0) { Pl.lane--; audio.whoosh(); }
  else if (a === 'right' && Pl.lane < 2) { Pl.lane++; audio.whoosh(); }
  else if (a === 'up') { if (Pl.grounded) { Pl.vy = 6.7; Pl.grounded = false; Pl.slide = 0; audio.jump(); } else Pl.jumpBuf = 0.14; }
  else if (a === 'down') { Pl.slide = 0.72; if (!Pl.grounded) Pl.vy = Math.min(Pl.vy, -9); else audio.scrape(); }
}
const KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', Space: 'up', ArrowDown: 'down', KeyS: 'down' };
window.addEventListener('keydown', (e) => {
  if (e.repeat) return; const a = KEYMAP[e.code];
  if (e.key && e.key.length === 1) { typed = (typed + e.key.toLowerCase()).slice(-8); if (typed.endsWith('skoda') && G.mode === 'play') { typed = ''; setCar(!G.car); } }
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


// ------------------------------------------------------------------ cheat code "skoda": Łatka drives a grey Škoda Superb, Mila flees in a dark blue Opel Agila
let carD = null, carM = null, typed = ''; const flying = [];
// A car is a smooth skin stretched over ~100 cross-sections (sill, flank, shoulder, glasshouse leaning in, roof), with the
// windows, shut lines, lamps, grille, badges and lettering painted on in real metres; the wheel arches are cut out of the skin.
function buildCar(S) {
  const g = new THREE.Group(), N = 100, z0 = S.z0, z1 = S.z1, ip = (pl, z) => { if (z <= pl[0][0]) return pl[0][1]; for (let i = 1; i < pl.length; i++) if (z <= pl[i][0]) return lerp(pl[i - 1][1], pl[i][1], (z - pl[i - 1][0]) / (pl[i][0] - pl[i - 1][0])); return pl[pl.length - 1][1]; };
  const T = [], B = [], K = [], Wd = [];
  for (let i = 0; i < N; i++) { const z = lerp(z0, z1, i / (N - 1)), e = clamp(Math.min(z - z0, z1 - z) / 0.5, 0, 1); T.push(ip(S.top, z)); B.push(ip(S.bot, z)); K.push(ip(S.belt, z)); Wd.push(S.w * (S.endW + (1 - S.endW) * Math.sqrt(1 - (1 - e) ** 2))); }
  for (let q = 0; q < 2; q++) for (const A of [T, B]) { const c = A.slice(); for (let i = 1; i < N - 1; i++) A[i] = (c[i - 1] + 2 * c[i] + c[i + 1]) / 4; }
  for (let i = 0; i < N; i++) K[i] = Math.min(K[i], T[i] - 0.1);
  const at = (z) => { const f = clamp((z - z0) / (z1 - z0), 0, 1) * (N - 1), i = Math.min(N - 2, Math.floor(f)), k = f - i, yb = lerp(B[i], B[i + 1], k), yB = lerp(K[i], K[i + 1], k), yT = lerp(T[i], T[i + 1], k), W = lerp(Wd[i], Wd[i + 1], k),
    yS = yb + 0.12, yG = yB + 0.03, yR = Math.max(yG + 0.004, yT - 0.06), Wg = W * 0.955, Wr = Wg - S.tumble * (yR - yG), cr = Math.min(0.1, Wr * 0.3); return { yb, yB, yT, W, yS, yG, yR, Wg, Wr, cr }; };
  const sec = (p, t) => { let s;
    if (t <= 0.12) return [t / 0.12 * p.W * 0.86, p.yb];
    if (t <= 0.2) { s = (t - 0.12) / 0.08 * Math.PI / 2; return [p.W * (0.86 + 0.125 * Math.sin(s)), p.yb + 0.12 * (1 - Math.cos(s))]; }
    if (t <= 0.55) { s = (t - 0.2) / 0.35; return [p.W * (0.985 + 0.015 * Math.sin(Math.PI * s)), lerp(p.yS, p.yB, s)]; }
    if (t <= 0.62) { s = (t - 0.55) / 0.07; return [lerp(p.W * 0.985, p.Wg, s * s * (3 - 2 * s)), lerp(p.yB, p.yG, s)]; }
    if (t <= 0.85) { s = (t - 0.62) / 0.23; return [lerp(p.Wg, p.Wr, s), lerp(p.yG, p.yR, s)]; }
    if (t <= 0.92) { s = (t - 0.85) / 0.07 * Math.PI / 2; return [p.Wr - p.cr * (1 - Math.cos(s)), p.yR + 0.06 * Math.sin(s)]; }
    s = (t - 0.92) / 0.08; return [(p.Wr - p.cr) * (1 - s), p.yT + 0.02 * (1 - (1 - s) ** 2)]; };
  const TS = []; for (const [a, b2, n] of [[0, 0.12, 3], [0.12, 0.2, 4], [0.2, 0.55, 8], [0.55, 0.62, 3], [0.62, 0.85, 7], [0.85, 0.92, 4], [0.92, 1, 5]]) for (let i = 0; i < n; i++) TS.push(lerp(a, b2, i / n)); TS.push(1);
  const M = TS.length, rake = (z, y, p) => { const h = clamp((y - p.yb) / (p.yT - p.yb), 0, 1), f = clamp(1 - (z - z0) / 0.55, 0, 1), r = clamp(1 - (z1 - z) / 0.55, 0, 1); return z + S.rakeF * h * f * f - S.rakeR * h * r * r; };
  // ---- skin
  const pos = [], uv = [], ix = [];
  for (const sx of [1, -1]) { const base = pos.length / 3;
    for (let i = 0; i < N; i++) { const z = lerp(z0, z1, i / (N - 1)), p = at(z); for (let j = 0; j < M; j++) { const [x, y] = sec(p, TS[j]); pos.push(sx * x, y, rake(z, y, p)); uv.push(i / (N - 1), TS[j]); } }
    for (let i = 0; i < N - 1; i++) for (let j = 0; j < M - 1; j++) { const a = base + i * M + j, b2 = a + M, c = a + 1, d = b2 + 1; if (sx > 0) ix.push(a, b2, c, c, b2, d); else ix.push(a, c, b2, c, d, b2); } }
  const skin = new THREE.BufferGeometry(); skin.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); skin.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); skin.setIndex(ix); skin.computeVertexNormals();
  { const nr = skin.attributes.normal, half = N * M; for (let h = 0; h < 2; h++) for (let i = 0; i < N; i++) for (const j of [0, M - 1]) { const q = h * half + i * M + j, y = nr.getY(q), z = nr.getZ(q), l = Math.hypot(y, z) || 1; nr.setXYZ(q, 0, y / l, z / l); } }
  // ---- painted side / top
  const CW = 2048, CH = 1024, mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c.getContext('2d'); }, col = mk(CW, CH), emi = mk(CW, CH);
  const U = (z) => (z - z0) / (z1 - z0) * CW, V = (t) => (1 - t) * CH, tOf = (z, y) => { const p = at(z); return y <= p.yB ? 0.2 + 0.35 * clamp((y - p.yS) / (p.yB - p.yS), -0.25, 1) : 0.62 + 0.23 * clamp((y - p.yG) / (p.yR - p.yG), 0, 1); };
  col.fillStyle = S.paint; col.fillRect(0, 0, CW, CH); emi.fillStyle = '#000'; emi.fillRect(0, 0, CW, CH);
  { const gr = col.createLinearGradient(0, V(0.62), 0, V(0.2)); gr.addColorStop(0, 'rgba(255,255,255,0.10)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.22)'); col.fillStyle = gr; col.fillRect(0, V(0.62), CW, V(0.2) - V(0.62)); }
  col.fillStyle = '#0d0e10'; col.fillRect(0, V(0.185), CW, CH);                                                   // sills and underbody
  const path = (c, pts) => { c.beginPath(); pts.forEach((q, i) => { const n = pts[(i + 1) % pts.length]; for (let k = 0; k < 10; k++) { const z = lerp(q[0], n[0], k / 10), y = lerp(q[1], n[1], k / 10), X = U(z), Y = V(tOf(z, y)); if (i + k) c.lineTo(X, Y); else c.moveTo(X, Y); } }); c.closePath(); };
  const D = {
    at, S, col,
    rT(za, zb, ta, tb, fill, lit) { for (const c of lit ? [col, emi] : [col]) { c.fillStyle = c === emi ? lit : fill; c.fillRect(U(za), V(tb), U(zb) - U(za), V(ta) - V(tb)); } },
    glass(za, zb, ta, tb) { const x = U(za), y = V(tb), w = U(zb) - x, h = V(ta) - y, gr = col.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#31465a'); gr.addColorStop(0.45, '#101a24'); gr.addColorStop(1, '#070b10'); col.fillStyle = '#0a0a0b'; col.fillRect(x - 5, y - 5, w + 10, h + 10); col.fillStyle = gr; col.fillRect(x, y, w, h);
      col.save(); col.beginPath(); col.rect(x, y, w, h); col.clip(); col.fillStyle = 'rgba(190,220,245,0.13)'; col.beginPath(); col.moveTo(x + w * 0.15, y + h); col.lineTo(x + w * 0.4, y); col.lineTo(x + w * 0.55, y); col.lineTo(x + w * 0.3, y + h); col.fill(); col.restore(); },
    poly(pts, fill, lit) { for (const c of lit ? [col, emi] : [col]) { path(c, pts); c.fillStyle = c === emi ? lit : fill; c.fill(); } },
    line(pts, color, w) { col.beginPath(); for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k <= 10; k++) { const z = lerp(pts[i][0], pts[i + 1][0], k / 10), y = lerp(pts[i][1], pts[i + 1][1], k / 10); if (i + k) col.lineTo(U(z), V(tOf(z, y))); else col.moveTo(U(z), V(tOf(z, y))); } col.strokeStyle = color; col.lineWidth = w; col.lineCap = 'round'; col.stroke(); },
    lineT(za, ta, zb, tb, color, w) { col.beginPath(); col.moveTo(U(za), V(ta)); col.lineTo(U(zb), V(tb)); col.strokeStyle = color; col.lineWidth = w; col.stroke(); },
  };
  S.side(D);
  for (const zc of [S.zf, S.zr]) { col.beginPath(); for (let k = 0; k <= 40; k++) { const a = k / 40 * Math.PI, z = zc + S.ar * Math.cos(a), y = S.ay + S.ar * Math.sin(a); col.lineTo(U(z), V(tOf(z, y))); } col.lineTo(U(zc - S.ar), V(0.02)); col.lineTo(U(zc + S.ar), V(0.02)); col.closePath();
    col.strokeStyle = '#08080a'; col.lineWidth = 16; col.stroke(); col.globalCompositeOperation = 'destination-out'; col.fill(); col.globalCompositeOperation = 'source-over'; }
  const texOf = (c, srgb) => { const t = new THREE.CanvasTexture(c.canvas); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  const skinM = new THREE.MeshStandardMaterial({ map: texOf(col, true), emissiveMap: texOf(emi, true), emissive: 0xffffff, emissiveIntensity: 1.3, roughness: 0.3, metalness: 0.35, alphaTest: 0.5, side: THREE.DoubleSide });
  const body = new THREE.Mesh(skin, skinM); body.castShadow = true; g.add(body);
  // ---- painted front and rear faces
  for (const end of [0, 1]) { const zE = end ? z1 : z0, p = at(zE), fc = mk(1024, 512), fe = mk(1024, 512), X = (x) => (0.5 + x / (2 * p.W)) * 1024, Y = (y) => (1 - (y - p.yb) / (p.yT + 0.02 - p.yb)) * 512;
    fc.fillStyle = S.paint; fc.fillRect(0, 0, 1024, 512); fe.fillStyle = '#000'; fe.fillRect(0, 0, 1024, 512);
    const F = { p, fc,
      rect(x0, x1, y0, y1, fill, lit) { for (const c of lit ? [fc, fe] : [fc]) { c.fillStyle = c === fe ? lit : fill; c.fillRect(X(x0), Y(y1), X(x1) - X(x0), Y(y0) - Y(y1)); } },
      poly(pts, fill, lit) { for (const c of lit ? [fc, fe] : [fc]) { c.beginPath(); pts.forEach((q, i) => (i ? c.lineTo(X(q[0]), Y(q[1])) : c.moveTo(X(q[0]), Y(q[1])))); c.closePath(); c.fillStyle = c === fe ? lit : fill; c.fill(); } },
      both(fn) { fn(1); fn(-1); },
      circle(x, y, r, fill, stroke, lw) { fc.beginPath(); fc.ellipse(X(x), Y(y), X(r) - X(0), Y(0) - Y(r), 0, 0, 6.2832); if (fill) { fc.fillStyle = fill; fc.fill(); } if (stroke) { fc.strokeStyle = stroke; fc.lineWidth = lw; fc.stroke(); } },
      stroke(pts, color, lw) { fc.beginPath(); pts.forEach((q, i) => (i ? fc.lineTo(X(q[0]), Y(q[1])) : fc.moveTo(X(q[0]), Y(q[1])))); fc.strokeStyle = color; fc.lineWidth = lw; fc.lineJoin = 'miter'; fc.stroke(); },
      text(str, x, y, hgt, fill, spacing = 0, maxW = 0) { const font = 'Arial, Helvetica, sans-serif'; let px = Y(0) - Y(hgt); if (maxW) { fc.font = `bold ${px}px ${font}`; px *= Math.min(1, (X(maxW) - X(0)) / fc.measureText(str).width); } fc.font = `bold ${px}px ${font}`; fc.textBaseline = 'middle'; fc.fillStyle = fill; const ws = [...str].map((ch) => fc.measureText(ch).width), sp = X(spacing) - X(0), tot = ws.reduce((a2, b2) => a2 + b2, 0) + sp * (str.length - 1); let cx = X(x) - tot / 2; [...str].forEach((ch, i) => { fc.fillText(ch, cx, Y(y)); cx += ws[i] + sp; }); },
      plate(x, y, w, h) { F.rect(x - w / 2 - 0.012, x + w / 2 + 0.012, y - h / 2 - 0.012, y + h / 2 + 0.012, '#0b0b0c'); F.rect(x - w / 2, x + w / 2, y - h / 2, y + h / 2, '#f3f3ee'); F.rect(x - w / 2, x - w / 2 + 0.045, y - h / 2, y + h / 2, '#1b3fa0'); F.text(S.plate, x + 0.022, y - 0.004, h * 0.78, '#111', 0, w - 0.075); },
    };
    (end ? S.rear : S.front)(F);
    const cp = [0, (p.yb + p.yT) / 2, 0], cu = [0.5, 0.5], ring = []; for (const sx of [1, -1]) { const js = [...TS.keys()]; if (sx < 0) js.reverse(); for (const j of js) { const [x, y] = sec(p, TS[j]); ring.push([sx * x, y]); } }
    cp[2] = rake(zE, cp[1], p); const ci = [];
    ring.forEach(([x, y], k) => { cp.push(x, y, rake(zE, y, p)); cu.push(0.5 + (end ? 1 : -1) * x / (2 * p.W), (y - p.yb) / (p.yT + 0.02 - p.yb)); ci.push(0, k + 1, (k + 1) % ring.length + 1); });
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3)); cg.setAttribute('uv', new THREE.Float32BufferAttribute(cu, 2)); cg.setIndex(ci); cg.computeVertexNormals();
    const cm = new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ map: texOf(fc, true), emissiveMap: texOf(fe, true), emissive: 0xffffff, emissiveIntensity: 1.5, roughness: 0.3, metalness: 0.35, side: THREE.DoubleSide })); cm.castShadow = true; g.add(cm); }
  // ---- wheels, arch liners, mirrors
  const std = (c, r, m) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m }), black = std(0x0c0d0f, 0.8, 0.1), chrome = std(0xe2e6ea, 0.16, 1), rubber = std(0x0b0b0c, 0.92, 0), alloy = std(0xbcc2c9, 0.3, 0.9), paintM = std(S.paint, 0.3, 0.35);
  for (const z of [S.zf, S.zr]) { const W = at(z).W; { const l = new THREE.Mesh(new THREE.CylinderGeometry(S.ar + 0.03, S.ar + 0.03, 2 * W - 0.5, 24, 1, false).rotateZ(Math.PI / 2), black); l.position.set(0, S.ay, z); g.add(l); }
    for (const sx of [-1, 1]) { const wh = new THREE.Group(); wh.position.set(sx * (W * 0.985 - 0.1), S.wr, z); g.add(wh);
      const ty = new THREE.Mesh(new THREE.CylinderGeometry(S.wr, S.wr, 0.21, 30).rotateZ(Math.PI / 2), rubber); ty.castShadow = true; wh.add(ty);
      wh.add(new THREE.Mesh(new THREE.CylinderGeometry(S.wr * 0.72, S.wr * 0.72, 0.214, 26).rotateZ(Math.PI / 2), alloy));
      for (let i = 0; i < S.spokes; i++) { const a = i * Math.PI * 2 / S.spokes, hole = new THREE.Mesh(new THREE.CircleGeometry(S.wr * (S.spokes > 5 ? 0.13 : 0.17), 10).rotateY(sx * Math.PI / 2), black); hole.position.set(sx * 0.1085, Math.cos(a) * S.wr * 0.45, Math.sin(a) * S.wr * 0.45); wh.add(hole); }
      const cap = new THREE.Mesh(new THREE.CircleGeometry(S.wr * 0.14, 10).rotateY(sx * Math.PI / 2), chrome); cap.position.x = sx * 0.11; wh.add(cap); (g.userData.wheels || (g.userData.wheels = [])).push(wh); } }
  for (const sx of [-1, 1]) { const p = at(S.mirror), m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10).scale(0.9, 0.62, 0.55), paintM); m.position.set(sx * (p.Wg + 0.09), p.yB + 0.1, S.mirror); m.castShadow = true; g.add(m);
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.05), black); st.position.set(sx * (p.Wg + 0.01), p.yB + 0.07, S.mirror); g.add(st); }
  if (S.extra) S.extra(g, { at, std, paintM, black, chrome });
  g.userData.r = S.wr; g.scale.setScalar(0.8); g.visible = false; scene.add(g); return g;
}
function buildCars() {
  const CHR = '#d9dde2', DK = '#0a0a0c', seam = 'rgba(0,0,0,0.6)';
  // ---- Škoda Superb Combi (third generation, after the facelift): long estate with roof rails, upright chrome slats, crystalline lamps, C-shaped tail lights, ŠKODA across the tailgate
  carD = buildCar({ paint: '#7b8087', plate: 'BI LATKA', w: 0.93, endW: 0.8, tumble: 0.5, z0: -2.43, z1: 2.43, rakeF: 0.1, rakeR: 0.09, zf: -1.47, zr: 1.37, ay: 0.345, ar: 0.395, wr: 0.335, spokes: 5, mirror: -0.92,
    top: [[-2.43, 0.7], [-2.3, 0.76], [-1.9, 0.84], [-1.15, 0.94], [-0.3, 1.385], [0.05, 1.455], [0.6, 1.475], [1.72, 1.45], [1.98, 1.4], [2.33, 1.05], [2.43, 0.98]],
    bot: [[-2.43, 0.26], [-2.28, 0.2], [2.25, 0.22], [2.43, 0.34]], belt: [[-1.15, 0.9], [0.4, 0.95], [2.3, 1.03]],
    side(D) {
      D.line([[-2.2, 0.83], [-1.0, 0.86], [1.2, 0.9], [2.3, 0.9]], 'rgba(255,255,255,0.28)', 5); D.line([[-2.2, 0.815], [-1.0, 0.845], [1.2, 0.885], [2.3, 0.885]], 'rgba(0,0,0,0.3)', 5);          // the sharp shoulder crease
      D.line([[-1.0, 0.42], [1.0, 0.46]], 'rgba(255,255,255,0.14)', 5);
      D.rT(-1.0, 2.1, 0.63, 0.846, CHR); D.glass(-0.96, 0.31, 0.64, 0.836); D.glass(0.4, 1.2, 0.64, 0.836); D.glass(1.28, 2.06, 0.64, 0.836);                                                       // six-light glasshouse with a chrome surround
      D.glass(-1.1, -0.3, 0.885, 1); D.glass(2.02, 2.34, 0.89, 1); D.rT(-0.12, 0.62, 0.925, 1, '#0b0f14'); D.lineT(-0.2, 0.9, 1.9, 0.9, CHR, 7);                                                                                         // windscreen, rear screen, glass roof
      D.lineT(-1.12, 0.875, -2.38, 0.875, seam, 4); D.lineT(1.97, 0.86, 1.97, 1, seam, 4);                                                                                                         // bonnet and tailgate shut lines
      for (const z of [-1.0, 0.355, 1.24]) D.line([[z, 0.31], [z, 0.9]], seam, 4); D.line([[-1.0, 0.31], [1.0, 0.31]], seam, 4);
      for (const z of [0.05, 0.95]) D.poly([[z, 0.835], [z + 0.2, 0.84], [z + 0.2, 0.868], [z, 0.862]], '#989da4');
      D.poly([[-2.43, 0.585], [-2.02, 0.655], [-2.06, 0.705], [-2.43, 0.675]], '#f2f6fa', '#fff6de');                                                                                                // headlamp wrapping round the corner
      D.poly([[2.43, 0.8], [2.02, 0.84], [2.06, 0.925], [2.43, 0.93]], '#b00812', '#8a0000');                                                                                                       // tail lamp wrapping round the corner
      D.poly([[-2.43, 0.28], [-1.95, 0.24], [-1.95, 0.3], [-2.43, 0.36]], DK); D.poly([[2.43, 0.36], [1.85, 0.25], [1.85, 0.31], [2.43, 0.44]], DK);
    },
    front(F) {
      F.poly([[-0.6, 0.29], [0.6, 0.29], [0.52, 0.4], [-0.52, 0.4]], DK); for (let i = -4; i <= 4; i++) F.rect(i * 0.11 - 0.003, i * 0.11 + 0.003, 0.3, 0.39, '#2a2c30');                              // lower intake
      F.both((s) => { F.poly([[s * 0.72, 0.3], [s * 0.6, 0.3], [s * 0.57, 0.37], [s * 0.72, 0.39]], DK); F.rect(s * 0.6 - 0.05, s * 0.6 + 0.05, 0.325, 0.345, '#eef3f8', '#fff3d6'); });
      const gx = 0.4, g0 = 0.455, g1 = 0.665; F.poly([[-gx - 0.03, g1 + 0.015], [gx + 0.03, g1 + 0.015], [gx - 0.05, g0 - 0.015], [-gx + 0.05, g0 - 0.015]], CHR); F.poly([[-gx, g1], [gx, g1], [gx - 0.065, g0], [-gx + 0.065, g0]], DK);
      for (let i = -9; i <= 9; i++) { const x = i * 0.04, cut = Math.max(0, Math.abs(x) - (gx - 0.07)) / 0.065 * (g1 - g0); F.rect(x - 0.008, x + 0.008, g0 + cut + 0.008, g1 - 0.008, CHR); }                // the upright slats
      F.both((s) => { F.poly([[s * 0.44, 0.66], [s * 0.72, 0.69], [s * 0.72, 0.62], [s * 0.47, 0.585]], '#dfe6ec', '#fff6de'); F.poly([[s * 0.46, 0.6], [s * 0.7, 0.632], [s * 0.7, 0.618], [s * 0.47, 0.588]], '#ffffff', '#ffffff'); F.stroke([[s * 0.55, 0.604], [s * 0.55, 0.674]], '#8a9199', 3); F.stroke([[s * 0.63, 0.615], [s * 0.63, 0.682]], '#8a9199', 3); });
      F.circle(0, 0.696, 0.034, '#101412', CHR, 5); F.poly([[-0.02, 0.682], [0.008, 0.71], [0.016, 0.69]], CHR); F.stroke([[-0.012, 0.7], [0.02, 0.702]], CHR, 3);                                   // winged arrow
      F.plate(0, 0.35, 0.5, 0.105);
    },
    rear(F) {
      F.poly([[-0.72, 0.34], [0.72, 0.34], [0.72, 0.45], [-0.72, 0.47]], DK); F.rect(-0.5, 0.5, 0.455, 0.467, CHR); F.both((s) => { F.rect(s * 0.6 - 0.07, s * 0.6 + 0.07, 0.5, 0.52, '#a00a10', '#600000'); F.rect(s * 0.46 - 0.06, s * 0.46 + 0.06, 0.37, 0.41, '#3a3d42'); });
      F.stroke([[-0.72, 0.77], [0.72, 0.77]], seam, 4);                                                                                                                                              // tailgate edge
      F.both((s) => { F.poly([[s * 0.2, 0.93], [s * 0.72, 0.935], [s * 0.72, 0.8], [s * 0.27, 0.805]], '#5a0509');                                                                                    // lamp housing
        F.stroke([[s * 0.68, 0.908], [s * 0.3, 0.905], [s * 0.34, 0.83], [s * 0.68, 0.832]], '#ff2a22', 13); for (const c of [F.fc]) { c.globalAlpha = 1; }
        F.poly([[s * 0.7, 0.918], [s * 0.26, 0.914], [s * 0.31, 0.82], [s * 0.7, 0.822], [s * 0.7, 0.844], [s * 0.36, 0.842], [s * 0.33, 0.894], [s * 0.7, 0.897]], '#ff2a22', '#c00c04'); });               // the C
      F.text('ŠKODA', 0, 0.865, 0.062, CHR, 0.03); F.text('SUPERB', -0.47, 0.725, 0.036, CHR, 0.004); F.text('TDI', 0.52, 0.725, 0.036, CHR, 0.004);
      F.poly([[-0.33, 0.69], [0.33, 0.69], [0.3, 0.555], [-0.3, 0.555]], '#5d6268'); F.plate(0, 0.62, 0.5, 0.105);
    },
    extra(g, { paintM }) { const fin = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 8).rotateX(-0.9).scale(0.5, 1, 1.6), paintM); fin.position.set(0, 1.47, 1.6); g.add(fin); } });
  // ---- Opel Agila B: short tall mini-MPV, big swept-back headlamps, chrome bar with the blitz, tall tail lamps beside the rear window
  carM = buildCar({ paint: '#15276b', plate: 'BI MILA', w: 0.84, endW: 0.82, tumble: 0.34, z0: -1.87, z1: 1.87, rakeF: 0.2, rakeR: 0.05, zf: -1.2, zr: 1.2, ay: 0.315, ar: 0.36, wr: 0.3, spokes: 7, mirror: -0.86,
    top: [[-1.87, 0.8], [-1.74, 0.9], [-1.0, 1.05], [-0.36, 1.5], [0.1, 1.585], [1.3, 1.575], [1.6, 1.52], [1.78, 1.25], [1.87, 1.04]],
    bot: [[-1.87, 0.28], [-1.72, 0.2], [1.72, 0.2], [1.87, 0.3]], belt: [[-1.0, 0.99], [0.3, 1.02], [1.3, 1.07], [1.87, 1.09]],
    side(D) {
      D.line([[-1.6, 0.6], [1.7, 0.72]], 'rgba(255,255,255,0.16)', 5); D.line([[-1.6, 0.585], [1.7, 0.705]], 'rgba(0,0,0,0.3)', 5);                                                                 // rising swage line
      D.rT(-0.9, 1.52, 0.635, 0.842, DK); D.glass(-0.84, 0.17, 0.645, 0.832); D.glass(0.27, 1.03, 0.645, 0.832); D.glass(1.11, 1.47, 0.645, 0.832);
      D.glass(-0.96, -0.36, 0.885, 1); D.glass(1.6, 1.84, 0.9, 1);
      D.lineT(-0.98, 0.875, -1.82, 0.875, seam, 4);
      for (const z of [-0.9, 0.22, 1.08]) D.line([[z, 0.3], [z, 0.98]], seam, 4); D.line([[-0.9, 0.3], [1.08, 0.3]], seam, 4);
      for (const z of [-0.02, 0.86]) D.poly([[z, 0.9], [z + 0.19, 0.905], [z + 0.19, 0.94], [z, 0.935]], '#0c1430');
      D.poly([[-1.87, 0.62], [-1.5, 0.78], [-1.2, 0.9], [-1.32, 0.94], [-1.87, 0.8]], '#e8eef4', '#fff6de');                                                                                         // the big headlamp sweeping up the wing
      D.rT(1.6, 1.87, 0.63, 0.9, '#c00a14', '#8a0000'); D.rT(1.6, 1.87, 0.7, 0.735, '#f0f0f0', '#555555');                                                                                          // tall tail lamp on the pillar
      D.poly([[-1.87, 0.28], [-1.6, 0.24], [-1.6, 0.36], [-1.87, 0.42]], DK); D.poly([[1.87, 0.3], [1.55, 0.24], [1.55, 0.36], [1.87, 0.44]], DK);
      D.line([[-0.2, 0.33], [0.5, 0.33]], 'rgba(0,0,0,0.5)', 14);
    },
    front(F) {
      F.poly([[-0.5, 0.31], [0.5, 0.31], [0.42, 0.52], [-0.42, 0.52]], DK); for (let i = 0; i < 3; i++) F.rect(-0.4, 0.4, 0.345 + i * 0.05, 0.352 + i * 0.05, '#26282c'); F.plate(0, 0.43, 0.46, 0.1);
      F.both((s) => { F.circle(s * 0.56, 0.4, 0.045, '#eef3f8', '#55585e', 5); F.poly([[s * 0.36, 0.7], [s * 0.66, 0.8], [s * 0.67, 0.62], [s * 0.42, 0.615]], '#e8eef4', '#fff6de'); F.circle(s * 0.55, 0.69, 0.05, '#ffffff', '#9aa2aa', 4); });
      F.poly([[-0.34, 0.7], [0.34, 0.7], [0.36, 0.605], [-0.36, 0.605]], DK); F.rect(-0.36, 0.36, 0.642, 0.668, CHR);                                                                                 // grille slot with the chrome bar
      F.circle(0, 0.655, 0.058, DK, CHR, 7); F.stroke([[-0.058, 0.642], [0.012, 0.666], [-0.012, 0.646], [0.058, 0.668]], CHR, 6);                                                                    // the blitz
    },
    rear(F) {
      F.poly([[-0.7, 0.3], [0.7, 0.3], [0.7, 0.46], [-0.7, 0.48]], DK); F.both((s) => F.rect(s * 0.5 - 0.08, s * 0.5 + 0.08, 0.4, 0.425, '#a00a10', '#600000'));
      F.stroke([[-0.7, 0.52], [0.7, 0.52]], seam, 4);
      F.poly([[-0.34, 0.8], [0.34, 0.8], [0.31, 0.64], [-0.31, 0.64]], '#0e1c50'); F.plate(0, 0.715, 0.46, 0.1); F.rect(-0.3, 0.3, 0.815, 0.84, CHR);
      F.circle(0, 0.93, 0.06, DK, CHR, 7); F.stroke([[-0.06, 0.917], [0.012, 0.941], [-0.012, 0.921], [0.06, 0.943]], CHR, 6);
      F.text('OPEL', -0.45, 0.9, 0.04, CHR, 0.008); F.text('AGILA', 0.44, 0.9, 0.04, CHR, 0.006);
      F.both((s) => F.rect(s * 0.69 - 0.04, s * 0.69 + 0.04, 0.9, 1.04, '#c00a14', '#8a0000'));
    },
    extra(g, { black }) { const an = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.36, 6).rotateX(-0.7), black); an.position.set(0, 1.72, -0.12); g.add(an); } });
}
// obstacles hit by a car fly off to the sides, spinning; cells: the row no longer blocks that lane
function smash(row, lane, x) {
  for (let i = row.objs.length - 1; i >= 0; i--) { const o = row.objs[i]; if (o.userData.kind === 'puddle' || !(row.wide || o.userData.lane === lane)) continue;
    row.objs.splice(i, 1); const side = row.wide ? (Math.random() < 0.5 ? -1 : 1) : o.position.x > x + 0.05 ? 1 : o.position.x < x - 0.05 ? -1 : Math.random() < 0.5 ? -1 : 1;
    flying.push({ o, vx: side * (5 + Math.random() * 5), vy: 5 + Math.random() * 4, vz: -G.speed * (0.95 + Math.random() * 0.25), rx: (Math.random() - 0.5) * 14, rz: -side * (5 + Math.random() * 8), t: 0 }); }
  if (row.wide) row.cells = row.cells.map((c) => (c === 'puddle' ? c : null)); else row.cells[lane] = null; row.mover = null; row.fall = 0;
  for (let i = 0; i < 18; i++) pAlpha.spawn(x + (Math.random() - 0.5) * 1.2, 0.3 + Math.random() * 0.6, -row.z, (Math.random() - 0.5) * 9, 1 + Math.random() * 4, -G.speed * 0.8 + (Math.random() - 0.5) * 4, 0.7, 0.1, 0.05, 0.55, 0.42, 0.3, 1, 9, 0.5);
}
function clearFlying() { for (const f of flying) { f.o.visible = false; pools[f.o.userData.kind].push(f.o); } flying.length = 0; }
function setCar(on, quiet) {
  G.car = on; if (!on) { carD.visible = carM.visible = false; dog.root.rotation.z = 0; }
  else { Object.assign(Pl, { y: 0, vy: 0, slide: 0, grounded: true }); Mi.trick = null; Mi.wy = 0; Mi.y = 0; Mi.vy = 0; Mi.flip = 0; Mi.crouch = 0; G.inv = 0; G.slow = 0; }
  if (quiet) return; pick(T(on ? 'carOn' : 'carOff')); pickT = 2.8; sparkle(Pl.x, 0.8, -G.dist - 0.5, GOLD, 50);
  if (on) { G.shake = 0.6; buzz([60, 30, 120]); if (audio.on) { audio.rumble(1.2); audio.tone(415, 0.28, 'square', 0.07); audio.tone(523, 0.28, 'square', 0.07); audio.tone(415, 0.3, 'square', 0.07, 0, 0.36); audio.tone(523, 0.3, 'square', 0.07, 0, 0.36); } }
}
function carStep(dt, moving) {
  const bob = moving ? Math.sin(G.t * 23) * 0.012 : 0;
  carD.visible = true; carD.position.set(dog.root.position.x, bob, dog.root.position.z); carD.rotation.set(0, dog.root.rotation.y - Math.PI - (LX[Pl.lane] - Pl.x) * 0.13, (LX[Pl.lane] - Pl.x) * 0.035);
  dog.root.position.y = 0.6 + bob; dog.root.position.z += 0.25; dog.root.rotation.z = 0; dog.root.visible = true;
  const ry = cat.root.rotation.y === 0 ? Math.PI : cat.root.rotation.y; cat.root.rotation.set(0, ry, 0);
  carM.visible = cat.root.visible; carM.position.set(cat.root.position.x, -bob, cat.root.position.z); carM.rotation.set(0, ry - Math.PI, 0); cat.root.position.y = 0.86 - bob; cat.root.position.z += 0.25;
  for (const c of [carD, carM]) for (const w of c.userData.wheels) w.rotation.x -= G.speed * dt / (c.userData.r * 0.8);
  if (moving) for (const c of [carD, carM]) if (c.visible && Math.random() < dt * 40) pAlpha.spawn(c.position.x + (Math.random() < 0.5 ? -0.6 : 0.6), 0.1, c.position.z + 1.6, (Math.random() - 0.5), 0.5 + Math.random() * 0.6, 2 + Math.random() * 2, 0.7, 0.2, 1.1, 0.72, 0.68, 0.6, 0.3, 0, 1.2);
}

// ------------------------------------------------------------------ game flow
function reset() {
  for (const r of rows) freeRow(r); rows.length = 0; items.length = 0; R = rng(G.bot ? G.seed || 7 : 7 + ((Math.random() * 1e6) | 0));
  Object.assign(G, { playT: 0, t: 0, dist: 0, speed: 0, stage: 0, gap: STAGE_GAP[0], lives: 3, score: 0, bones: 0, inv: 0, slow: 0, ct: 0, stageT: 0, shake: 0, streak: 0, blend: 0, genMin: 0, endT: 0 });
  Object.assign(Pl, { lane: 1, x: 0, y: 0, vy: 0, slide: 0, grounded: true }); Object.assign(Mi, { lane: 1, x: 0, y: 0, vy: 0, crouch: 0 });
  Object.assign(gen, { z: 38, safe: 1, relicAt: 240, relicI: 0, powAt: 95 }); mood.k = 0;
  Object.assign(G.pw, { magnet: 0, shield: 0, turbo: 0, x2: 0 }); Mi.trick = null; Mi.wy = 0; G.trickAt = 16; G.friendAt = 75; G.friendI = 0; G.fin = {};
  Object.assign(W, { rain: 0, fog: 0, snow: 0, target: 'clear' }); W.order.sort(() => Math.random() - 0.5);
  for (const f of friends) { f.on = false; f.g.visible = false; } bubble.visible = false;
  chunks.forEach((c, i) => placeTrack(c, (i - 1) * CL)); junction.visible = false; jn = null; gen.hold = false;
  Object.assign(G, { yaw: 0, yawOff: 0, nextJ: 185, jCount: 0 }); Mi.lead = 2.3 + (STAGE_GAP[0] - 2.3) * 0.5;
  Object.assign(bend, { x: 0, y: 0, tx: 0, ty: 0, t: 3 }); G.cr = 0; G.ts = 1; Mi.flip = 0;
  for (const id in relicMeshes) relicMeshes[id].visible = false;
  dog.root.visible = true; clearFlying(); if (carD) setCar(false, true);
}
function startGame() {
  if (G.mode !== 'title') return;
  audio.start(); G.mode = 'play'; G.blend = 0;
  $('title').classList.add('hidden'); for (const id of ['rTop', 'rLives', 'rMila', 'rPow']) $(id).style.opacity = 1;
  setTimeout(() => { if (G.mode === 'play') { place(STREETS[0]); hint(T('hint')); } }, 600);
  audio.bark(); dog.bark(); setTimeout(() => audio.meow(), 500);
}
function toTitle() { reset(); G.mode = 'title'; $('end').classList.add('hidden'); $('title').classList.remove('hidden'); for (const id of ['rTop', 'rLives', 'rMila', 'rPow']) $(id).style.opacity = 0; }
function finish(win) {
  const s = Math.floor(G.score); if (s > G.best) { G.best = s; try { localStorage.setItem('latka-run-best', String(s)); } catch (_) { /* private mode */ } }
  $('endTitle').textContent = T(win ? 'winT' : 'loseT'); $('endText').textContent = T(win ? 'winX' : 'loseX', s, G.bones, G.best);
  $('end').classList.remove('hidden'); $('menu').style.display = ''; for (const id of ['rTop', 'rLives', 'rMila', 'rPow', 'hint', 'pick']) $(id).style.opacity = 0;
}
// Everything that moves in the high-quality version: birds, dust, splashes, wet paw prints, smoke, drifting leaves, the lens.
function hqStep(dt, play, moving) {
  const rnd = () => Math.random() - 0.5, wetK = hq.wet.value, run = moving && Pl.grounded && G.speed > 3;
  if (run && wetK < 0.2 && Math.random() < dt * 16) pAlpha.spawn(Pl.x + rnd() * 0.3, 0.05, -G.dist + 0.35, rnd() * 0.6, 0.4 + Math.random() * 0.4, 1.2, 0.55, 0.12, 0.5, 0.62, 0.58, 0.5, 0.22, 0, 1.2);                                    // dust
  if (run && wetK >= 0.2 && Math.random() < dt * 40) pAlpha.spawn(Pl.x + rnd() * 0.35, 0.05, -G.dist + 0.25, rnd() * 2.2, 1.2 + Math.random() * 1.6, 1 + Math.random() * 2, 0.45, 0.07, 0.03, 0.78, 0.86, 0.95, 0.7, 9, 0.4);                  // spray
  if (run && wetK > 0.3 && G.dist - hq.printD > 0.42) { hq.printD = G.dist; const m = hq.prints[hq.printI++ % hq.prints.length]; m.position.set(Pl.x + (hq.printI % 2 ? 0.1 : -0.1), 0.014, -G.dist + 0.2); m.visible = true; }
  for (const m of hq.prints) if (m.visible && -m.position.z < G.dist - 9) m.visible = false;
  for (const c of chunks) { if (c.rotation.y !== 0 || Math.abs(c.position.z + 12 + G.dist) > 70) continue; for (const k of c.userData.chim) { const side = c.userData[k.s < 0 ? 'sideL' : 'sideR']; if (side.visible && Math.random() < dt * 2.2) pAlpha.spawn(c.position.x + k.x, k.y, c.position.z + k.z, 0.3 + Math.random() * 0.2, 0.6, rnd() * 0.15, 4.5, 0.35, 1.7, 0.5, 0.52, 0.58, 0.2, -0.02, 0.15); } }
  if (moving && Math.random() < dt * 6) { const leaf = G.stage >= 1 && Math.random() < 0.7; pAlpha.spawn(rnd() * 12, 0.4 + Math.random() * 3.2, -G.dist - 5 - Math.random() * 24, 1.2 + Math.random() * 1.6, rnd() * 0.5, rnd(), 3.2, leaf ? 0.09 : 0.035, leaf ? 0.09 : 0.03, leaf ? 0.8 : 1, leaf ? 0.45 + Math.random() * 0.25 : 1, leaf ? 0.12 : 0.85, 0.85, leaf ? 0.25 : 0, 0.1); }      // pollen in summer, leaves later on
  // sparrows
  if (play && G.dist + 55 > hq.birdAt && !(jn && !jn.done)) { const lane = (Math.random() * 3) | 0; let n = 0; for (const b of hq.sparrows) if (b.st === 0 && n < 4) { n++; b.st = 1; b.x = LX[lane] + rnd() * 1.1; b.z = hq.birdAt + rnd() * 2.2; b.y = 0; b.g.visible = true; b.g.rotation.set(0, Math.random() * 6.28, 0); } hq.birdAt = G.dist + 110 + Math.random() * 90; }
  for (const b of hq.sparrows) {
    if (b.st === 1) { b.g.position.set(b.x, Math.abs(Math.sin(G.t * 7 + b.ph)) * 0.025, -b.z); b.g.rotation.x = Math.max(0, Math.sin(G.t * 5 + b.ph)) * 0.5; b.wl.rotation.z = 0.9; b.wr.rotation.z = -0.9;
      if (b.z - G.dist < 9.5) { b.st = 2; b.t = 0; const sd = b.x >= 0 ? 1 : -1; b.vx = sd * (2.5 + Math.random() * 2.5); b.vy = 3.6 + Math.random() * 1.6; b.vz = -(G.speed + 2 + Math.random() * 3); b.g.rotation.set(0, Math.atan2(b.vx, b.vz), 0); if (audio.on && Math.random() < 0.6) audio.tone(3000 + Math.random() * 900, 0.07, 'sine', 0.03, 1.3); } else if (b.z < G.dist - 4) { b.st = 0; b.g.visible = false; } }
    else if (b.st === 2) { b.t += dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z -= b.vz * dt; b.vy += dt * 0.8; b.g.position.set(b.x, b.y, -b.z); const f = Math.sin(G.t * 38 + b.ph) * 1.0; b.wl.rotation.z = f; b.wr.rotation.z = -f; if (b.t > 3.2) { b.st = 0; b.g.visible = false; } }
  }
  // the lens: streaks at turbo speed, a softer top and bottom in the little scenes, drops that slide down in the rain
  const lu = lensPass.uniforms, k = Math.min(1, dt * 4); lu.uZoom.value += ((G.pw.turbo > 0 && play ? 1 : 0) - lu.uZoom.value) * k; lu.uTilt.value += ((G.mode === 'catch' || G.mode === 'win' ? 1 : 0) - lu.uTilt.value) * k;
  hq.dropT -= dt; if (hq.dropT <= 0 && hq.wetK > 0.15) { hq.dropT = 0.5; const d = hq.drops.children[(Math.random() * hq.drops.children.length) | 0]; d.style.transition = 'none'; d.style.left = Math.random() * 96 + '%'; d.style.top = Math.random() * 70 + '%'; void d.offsetWidth; d.style.transition = 'top 5s linear,opacity .8s'; d.style.top = (parseFloat(d.style.top) + 14 + Math.random() * 20) + '%'; }
}
function stumble(row) {
  row.hit = true; if (G.inv > 0) return;
  if (HQ) for (let i = 0; i < 16; i++) pAlpha.spawn(Pl.x + (Math.random() - 0.5) * 0.4, 0.3 + Math.random() * 0.4, -G.dist - 0.4, (Math.random() - 0.5) * 5, 1 + Math.random() * 3.5, (Math.random() - 0.5) * 3 - 1, 0.7, 0.09, 0.05, 0.5, 0.38, 0.27, 1, 9, 0.5);      // splinters fly
  if (G.pw.shield > 0) {                                   // the shield takes the knock
    G.pw.shield = 0; G.inv = 1.2; G.shake = 0.35; pick(T('shieldPop')); buzz(60); if (audio.on) { audio.tone(1320, 0.25, 'triangle', 0.16, 0.5); audio.burst(2600, 2, 0.2, 0.2); }
    for (let i = 0; i < 40; i++) { const a = Math.random() * 6.28, b = Math.random() * 3.14; pAdd.spawn(Pl.x, Pl.y + 0.5, -G.dist, Math.cos(a) * Math.sin(b) * 4, Math.cos(b) * 4, Math.sin(a) * Math.sin(b) * 4 - G.speed * 0.6, 0.6, 0.25, 0.02, 1.5, 3, 5, 1, 2, 1); }
    return;
  }
  buzz(150);
  G.lives--; G.inv = 1.5; G.slow = 1; G.gap += 7; G.shake = 0.6; G.streak = 0; audio.yelp(); pick(T('ouch'));
  $('flash').style.opacity = 1; setTimeout(() => { $('flash').style.opacity = 0; }, 180);
  for (let i = 0; i < 14; i++) pAlpha.spawn(Pl.x + (Math.random() - 0.5) * 0.6, 0.2 + Math.random() * 0.5, -G.dist - 0.4, (Math.random() - 0.5) * 3, 1 + Math.random() * 2, (Math.random() - 0.5) * 2 - 2, 0.7 + Math.random() * 0.5, 0.3, 1.2, 0.75, 0.7, 0.62, 0.4, 0, 1.5);
  if (G.lives <= 0) { G.mode = 'over'; G.endT = 0; audio.night(); }
}
function sparkle(x, y, z, c, n) { for (let i = 0; i < n; i++) pAdd.spawn(x, y, z, (Math.random() - 0.5) * 3, Math.random() * 3, (Math.random() - 0.5) * 3 - G.speed * 0.5, 0.4 + Math.random() * 0.5, 0.2, 0.02, c.r * 4, c.g * 4, c.b * 4, 1, 4, 1); }
const GOLD = new THREE.Color(1, 0.75, 0.25);

function step(dt) {
  // slow motion for the pounce (G.cr counts real seconds since the catch began)
  if (G.mode === 'catch' || (G.mode === 'win' && G.cr < 2.4)) { G.cr += dt; G.ts = 1 - 0.74 * sm(0, 0.1, G.cr) * (1 - sm(1.35, 1.9, G.cr)); } else G.ts = 1;
  const rawDt = dt; dt *= G.ts;
  G.t += dt;
  const play = G.mode === 'play', moving = play || G.mode === 'catch';
  // ---- speed and distance
  let target = 0;
  if (moving) { G.stageT += play ? dt : 0; G.playT += play ? dt : 0; target = speedNow() * (1 - 0.45 * G.slow) * (G.pw.turbo > 0 ? 1.45 : 1) * (G.car ? 3 : 1); }
  G.slow = Math.max(0, G.slow - dt * 1.4); G.inv = Math.max(0, G.inv - dt);
  G.speed += (target - G.speed) * Math.min(1, dt * (moving ? 3.2 : 2.2));
  const prevDist = G.dist; G.dist += G.speed * dt; if (play) G.score += G.speed * dt * (G.pw.x2 > 0 ? 2 : 1);
  if (play) for (const k of POWERS) if (G.pw[k] > 0) { G.pw[k] -= dt; if (G.pw[k] <= 0) { G.pw[k] = 0; if (k === 'turbo') G.inv = Math.max(G.inv, 1.2); } }      // a moment of safety when the sprint ends
  if (G.bot && play) botPlay();
  // ---- player
  Pl.x += (LX[Pl.lane] - Pl.x) * Math.min(1, dt * 15);
  if (!Pl.grounded) { Pl.vy -= 21 * dt; Pl.y += Pl.vy * dt; if (Pl.y <= 0) { Pl.y = 0; Pl.vy = 0; Pl.grounded = true; audio.land(); if (Pl.jumpBuf > 0 && play) { Pl.jumpBuf = 0; act('up'); } } }
  Pl.jumpBuf = Math.max(0, (Pl.jumpBuf || 0) - dt); Pl.slide = Math.max(0, Pl.slide - dt);
  const sliding = Pl.slide > 0 && Pl.grounded;
  // ---- world generation / recycling
  while (moving && !gen.hold && gen.z < G.dist + 150) genRow();
  while (rows.length && rows[0].z < G.dist - 1.3) { freeRow(rows[0]); rows.shift(); }      // gone as soon as it is behind Łatka, so nothing ever hides her from the camera
  if (moving) manageChunks();
  if (moving && jn && !jn.done) {
    // the way can be picked (and changed) for the last 30 m; 5 m before the corner it is settled – by chance if nobody chose
    if (!jn.locked && G.dist >= jn.J - 5) { if (!jn.choice) { jn.choice = Math.random() < 0.5 ? 'left' : 'right'; audio.tone(660, 0.12, 'triangle', 0.1); } jn.locked = true; }
    if (G.dist >= jn.J) doTurn(jn.choice);
  }
  if (G.yawOff) { const d = dt * (Math.PI / 2) / 0.36; G.yawOff = Math.abs(G.yawOff) <= d ? 0 : G.yawOff - Math.sign(G.yawOff) * d; }
  // ---- things that move: balls, bikes and mowers come to meet her once she is near; pots fall; bins tip over
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]; if (row.z > G.dist + 70) break;
    const mv = row.mover, o = row.objs[0];
    if (mv && o) {
      if (!mv.on && row.z - G.dist < 46) { mv.on = true; if (audio.on) { if (mv.kind === 'bike') { audio.tone(1900, 0.22, 'triangle', 0.13); audio.tone(1900, 0.22, 'triangle', 0.13, 0, 0.25); } else if (mv.kind === 'onewheel') { audio.tone(430, 0.5, 'sawtooth', 0.045, 1.35); audio.tone(860, 0.5, 'sine', 0.03, 1.35); } else if (mv.kind === 'mower') audio.burst(140, 2, 1.6, 0.25, 'lowpass'); else audio.tone(260, 0.2, 'sine', 0.2, 0.5); } }
      if (mv.on && moving) {
        mv.t += dt; row.z = Math.max(i > 0 ? rows[i - 1].z + 4 : -1e9, row.z - mv.v * dt); o.position.z = -row.z;
        if (mv.kind === 'ball') { o.rotation.x += dt * mv.v / 0.3; o.position.y = 0.3 + Math.abs(Math.sin(mv.t * 7)) * 0.1; }
        else if (mv.kind === 'bike') o.rotation.z = Math.sin(mv.t * 5) * 0.05;
        else if (mv.kind === 'onewheel') { o.rotation.z = Math.sin(mv.t * 2.6) * 0.13; o.rotation.y = Math.sin(mv.t * 2.6) * 0.16; o.rotation.x = -0.05; }      // carving from edge to edge
        else if (Math.random() < dt * 30) pAlpha.spawn(o.position.x + (Math.random() - 0.5) * 0.7, 0.1, o.position.z - 0.4, (Math.random() - 0.5) * 2, 1 + Math.random(), -1 - Math.random(), 0.5, 0.1, 0.3, 0.35, 0.7, 0.25, 0.7, 6, 1);
      }
    }
    if (row.fall > 0 && row.fall < 1 && o) {
      row.fall = Math.min(1, row.fall + dt / 0.42); const e = row.fall; o.position.x = lerp(row.fx, LX[row.lane], e); o.position.y = 1.1 * (1 - e * e); o.rotation.z = (1 - e) * 2.5 * Math.sign(row.fx);
      if (e >= 1) { o.rotation.z = 0; if (audio.on) audio.crack(); for (let k = 0; k < 8; k++) pAlpha.spawn(o.position.x, 0.15, o.position.z, (Math.random() - 0.5) * 3, 1 + Math.random(), (Math.random() - 0.5) * 3, 0.5, 0.2, 0.7, 0.7, 0.45, 0.3, 0.5, 3, 1.5); }
    }
    for (const b of row.objs) if (b.userData.tip > 0 && b.userData.tip < 1) { b.userData.tip = Math.min(1, b.userData.tip + dt * 3); b.rotation.x = b.userData.tip ** 2 * 1.5; }
  }
  for (let i = flying.length - 1; i >= 0; i--) { const f = flying[i], o = f.o; f.t += dt; f.vy -= 17 * dt; o.position.x += f.vx * dt; o.position.y = Math.max(0, o.position.y + f.vy * dt); o.position.z += f.vz * dt; f.vz *= Math.exp(-dt * 1.2); o.rotation.x += f.rx * dt; o.rotation.z += f.rz * dt;
    if (o.position.y <= 0 && f.vy < 0) { f.vy *= -0.35; f.vx *= 0.7; f.rx *= 0.6; f.rz *= 0.6; } if (f.t > 1.7) { o.visible = false; pools[o.userData.kind].push(o); flying.splice(i, 1); } }
  // ---- collisions
  if (play) {
    const lane = clamp(Math.round(Pl.x / LANE) + 1, 0, 2);
    for (const row of rows) {
      const reach = G.car ? 2.0 : 0.35; if (row.z > G.dist + reach + 0.65) break; if (row.hit || row.z < prevDist - 0.3 || row.z > G.dist + reach) continue;
      const c = row.cells[lane]; if (!c) continue;
      if (G.car) { if (c !== 'puddle') { smash(row, lane, Pl.x); G.score += 20; G.shake = Math.max(G.shake, 0.4); pick(T('smash')); buzz(40); if (audio.on) { audio.crack(); audio.burst(180, 1.2, 0.25, 0.3, 'lowpass'); } } continue; }
      if (c === 'puddle') {                                // no paw lost, but it slows her and Mila gains a little
        if (Pl.y < 0.12 && G.pw.turbo <= 0) { row.hit = true; G.slow = 0.9; G.gap += 2.5; pick(T('splash')); buzz(40); if (audio.on) audio.splash(0.35); for (let k = 0; k < 22; k++) pAlpha.spawn(Pl.x + (Math.random() - 0.5) * 0.8, 0.1, -G.dist, (Math.random() - 0.5) * 4, 2 + Math.random() * 3, (Math.random() - 0.5) * 3 - 2, 0.6, 0.12, 0.3, 0.55, 0.7, 0.9, 0.7, 9, 0.5); }
        continue;
      }
      if (c === 'full' || (c === 'low' && Pl.y < 0.36) || (c === 'high' && !sliding)) {
        if (G.pw.turbo > 0) { row.hit = true; G.score += 20; G.shake = 0.3; pick(T('smash')); if (audio.on) audio.crack(); for (const o of row.objs) if (row.wide || o.userData.lane === lane) o.visible = false; sparkle(Pl.x, 0.6, -G.dist - 0.5, GOLD, 30); }      // turbo paws go straight through
        else stumble(row);
        break;
      }
    }
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i]; if (it.z < G.dist - 3) { if (it.mesh) it.mesh.visible = false; items.splice(i, 1); continue; }
      if (G.pw.magnet > 0 && it.kind === 'bone' && it.z - G.dist < 9 && it.z > G.dist - 1) { const k = Math.min(1, dt * 7); it.x += (Pl.x - it.x) * k; it.y += (Pl.y + 0.5 - it.y) * k; }
      if (Math.abs(it.z - G.dist) < 0.75 && Math.abs(it.x - Pl.x) < 0.75 && Math.abs(it.y - (Pl.y + 0.45)) < 0.85) {
        if (it.kind === 'bone') { G.bones++; G.score += G.pw.x2 > 0 ? 20 : 10; G.gap -= 0.13; G.streak = G.streakT > 0 ? G.streak + 1 : 0; G.streakT = 0.45; audio.coin(G.streak); sparkle(it.x, it.y, -it.z, GOLD, 5); }
        else if (POW_TIME[it.kind]) { G.pw[it.kind] = POW_TIME[it.kind]; pick(T('p_' + it.kind)); buzz(30); audio.pickup('mirror'); sparkle(it.x, it.y, -it.z, relicMeshes[it.kind].userData.col, 40); it.mesh.visible = false; }
        else { G.score += 100; G.gap -= 2; audio.pickup(it.kind); pick(T('r_' + it.kind)); sparkle(it.x, it.y, -it.z, relicMeshes[it.kind].userData.col, 40); it.mesh.visible = false; }
        items.splice(i, 1);
      }
    }
    G.streakT -= dt;
    G.gap -= dt * (0.27 + (G.pw.turbo > 0 ? 1.6 : 0));
    if (jn && (jn.done ? G.dist < jn.J + 20 : jn.J - G.dist < 70)) G.gap = Math.max(G.gap, 8);       // no catch in the middle of a junction: she keeps a few metres clear there
    else if (G.gap <= 2.3) catchMila();
  }
  // ---- stage transition / endings
  if (G.mode === 'catch') {
    G.ct += dt; const last = G.stage >= 2;
    if (!last) { G.gap = lerp(2.3, STAGE_GAP[G.stage + 1], sm(0.5, 2.6, G.ct)); if (G.ct > 2.7) { G.stage++; G.stageT = 0; G.mode = 'play'; place(STREETS[G.stage]); } }
    else if (G.ct > 0.9) { if (G.car) { setCar(false, true); sparkle(Pl.x, 0.8, -G.dist, GOLD, 60); sparkle(Mi.x, 0.8, -G.dist - Mi.lead, GOLD, 60); } G.mode = 'win'; G.endT = 0; audio.fanfare(); }
  }
  if (G.mode === 'win' || G.mode === 'over') {
    G.endT += dt; if (G.mode === 'over') G.gap += dt * 9; else G.gap += (2.6 - G.gap) * Math.min(1, dt * 3);
    if (G.mode === 'win') finale(dt);
    if (G.endT > (G.mode === 'win' ? 9.2 : 1.7) && $('end').classList.contains('hidden')) finish(G.mode === 'win');
  }
  // ---- Mila: follows the safe lane, hops and ducks like a pro
  const pounce = G.mode === 'catch' ? sm(0, 0.22, G.ct) * (1 - sm(0.4, 0.8, G.ct)) : 0;
  let lead = 2.3 + (G.gap - 2.3) * 0.5 - pounce * 1.25, waits = false;
  if (jn && !jn.done && !jn.choice && lead > jn.J - 0.8 - G.dist) { lead = Math.max(0.7, jn.J - 0.8 - G.dist); waits = true; }       // way still open: she hesitates at the corner
  if (jn && !jn.done && jn.choice && G.dist + Mi.lead > jn.J) jn.locked = true;                                                    // she has gone round the corner: settled
  if (G.mode === 'win') lead = lerp(2.45, 0.85, sm(2.3, 4.2, G.endT));                 // finale: she walks back to Łatka
  Mi.lead += clamp(lead - Mi.lead, -1e9, dt * 17);
  const mz = G.dist + Mi.lead + (G.car ? 2.9 : 0),          // drawn at half the real lead, so she stays in sight
     sitM = (G.mode === 'win' && (G.endT < 2.3 || G.endT > 4.4)) || G.mode === 'title' ? 1 : 0;
  let tr = Mi.trick;
  if (moving && !tr) {
    for (const row of rows) {
      if (row.z < mz - 0.3) {
        // as she passes, she sometimes shoves over a bin in the lane next to hers (just for show: it still blocks the lane)
        if (!row.seen) { row.seen = true; if (!row.wide && !row.mover && Math.random() < 0.45) for (const o of row.objs) if (o.userData.kind.startsWith('bin') && Math.abs(o.userData.lane - Mi.lane) === 1) { o.userData.tip = 0.001; if (audio.on) audio.burst(260, 1, 0.2, 0.25, 'lowpass'); break; } }
        continue;
      }
      Mi.lane = row.safe; const c = row.cells[row.safe], dz = row.z - mz;
      if (G.car) { if (c && c !== 'puddle' && dz < 1.7) { smash(row, row.safe, Mi.x); if (audio.on) audio.crack(); } Mi.crouch = 0; break; }
      if (c === 'low' && dz < G.speed * 0.27 && Mi.y === 0) Mi.vy = 5.6; Mi.crouch = c === 'high' && dz < G.speed * 0.3 ? 1 : 0; break;
    }
  }
  // her other trick: up onto the fence, along the top knocking flowerpots down, and back
  const nearJn = jn && (jn.done ? G.dist < jn.J + 30 : jn.J - G.dist < 60);
  if (play && !tr && !G.car && G.playT > G.trickAt && G.gap > 9 && G.gap < 34 && !nearJn && Mi.y === 0) { tr = Mi.trick = { side: Math.random() < 0.5 ? -1 : 1, t: 0, dur: 3.6, next: 0.7, left: 2 + (Math.random() < 0.5 ? 1 : 0) }; audio.meow(1.1); }
  if (tr) {
    tr.t += dt; if (!play || nearJn) tr.dur = Math.min(tr.dur, tr.t + 0.4);
    if (tr.t >= tr.dur) { Mi.trick = tr = null; Mi.wy = 0; G.trickAt = G.playT + 13 + Math.random() * 12; }
    else { const e = sm(0, 0.4, tr.t) * (1 - sm(tr.dur - 0.4, tr.dur, tr.t)); Mi.wy = 1.12 * e + 0.4 * Math.sin(Math.PI * e); Mi.crouch = 0;
      if (tr.left > 0 && tr.t > tr.next && tr.t < tr.dur - 0.8) { tr.next = tr.t + 0.8; if (dropPot(mz, tr.side)) tr.left--; } }
  }
  Mi.x += ((tr ? tr.side * (ROADW / 2 + 0.72) : G.mode === 'win' && G.endT > 2.3 ? Pl.x + 0.42 : LX[Mi.lane]) - Mi.x) * Math.min(1, dt * (tr ? 6 : 9));
  if (Mi.vy !== 0 || Mi.y > 0) { Mi.vy -= 19 * dt; Mi.y += Mi.vy * dt; if (Mi.y <= 0) { Mi.y = 0; Mi.vy = 0; Mi.flip = 0; } }
  if (Mi.flip > 0 && Mi.y > 0) { Mi.flip += dt; if (Math.random() < rawDt * 60) pAdd.spawn(Mi.x + (Math.random() - 0.5) * 0.3, Mi.y + 0.3, -mz, (Math.random() - 0.5) * 2, Math.random() * 2, (Math.random() - 0.5) * 2 - G.speed * 0.6, 0.5, 0.22, 0.02, 4, 3, 1, 1, 3, 1); }
  if (G.mode === 'title') { cat.root.position.set(-1.0, 0, -G.dist - 1.3); cat.root.rotation.y = Math.PI + 0.5; cat.root.visible = true; }
  else if (jn && !jn.done && jn.choice && mz > jn.J) { const sgn = jn.choice === 'left' ? -1 : 1; cat.root.position.set(sgn * (mz - jn.J), Mi.y, -jn.J); cat.root.rotation.set(0, sgn * Math.PI / 2, 0); cat.root.visible = true; }   // already running down the chosen street
  else { cat.root.position.set(Mi.x, Mi.y + (Mi.wy || 0) + (Mi.flip > 0 ? 0.25 * Math.sin(Math.min(1, Mi.flip / 0.74) * Math.PI) : 0), -mz); cat.root.rotation.y = sitM || G.mode === 'win' || (waits && Mi.lead < lead + 0.3) ? 0 : Math.PI; cat.root.rotation.x = Mi.flip > 0 ? Math.min(1, Mi.flip / 0.74) * Math.PI * 2 : 0; cat.root.visible = G.gap < 75; }
  cat.animate(dt, { speed: G.car ? 0 : sitM || (waits && Mi.lead < lead + 0.3) ? 0 : G.mode === 'win' ? 1.6 : Math.max(G.speed, moving ? 8 : G.mode === 'over' ? 9 : 0), grounded: Mi.y === 0, vy: Mi.vy, sit: G.car ? 1 : sitM, crouch: Mi.crouch });
  // ---- Łatka
  const sitD = G.mode === 'title' || ((G.mode === 'win' || G.mode === 'over') && G.speed < 1.5) ? 1 : 0;
  dog.root.position.set(Pl.x, Pl.y, -G.dist); { const q = Math.abs(G.yawOff) / (Math.PI / 2); dog.root.rotation.y = Math.PI + G.yawOff * q; dog.root.rotation.z = (LX[Pl.lane] - Pl.x) * 0.22 - G.yawOff * (1 - q) * 0.5; }
  dog.root.visible = G.inv <= 0 || Math.floor(G.t * 14) % 2 === 0;
  dog.animate(dt, { speed: G.car ? 0 : G.speed, grounded: Pl.grounded, vy: Pl.vy, sit: G.car ? 1 : sitD, slide: sliding ? 1 : 0, happy: G.mode === 'win' ? 1 : 0.15, pant: true });
  if (G.car) carStep(dt, moving);
  if (sliding && Math.random() < dt * 40) pAlpha.spawn(Pl.x + (Math.random() - 0.5) * 0.4, 0.08, -G.dist + 0.3, (Math.random() - 0.5), 0.6, 1.5, 0.5, 0.2, 0.8, 0.78, 0.74, 0.66, 0.35, 0, 1.5);
  if (moving && Pl.grounded && !sliding && Math.random() < dt * 9) pAlpha.spawn(Pl.x + (Math.random() - 0.5) * 0.3, 0.06, -G.dist + 0.35, (Math.random() - 0.5) * 0.6, 0.5, 1.2, 0.45, 0.14, 0.55, 0.78, 0.74, 0.66, 0.22, 0, 1.5);
  // ---- friends at the roadside
  if (play && G.dist + 140 > G.friendAt) {
    if (jn && !jn.done && G.friendAt > jn.J - 45) G.friendAt = jn.J + 60;
    else { const f = friends[G.friendI++ % friends.length], sd = G.friendI % 2 ? 1 : -1; placeFriend(f, sd * (ROADW / 2 + 0.45), -G.friendAt, -sd * 0.95); G.friendAt += 150 + Math.random() * 110; }
  }
  for (const f of friends) if (f.on) {
    f.arm.rotation.z = -0.35 + Math.sin(G.t * 10 + f.i) * 0.42; f.g.position.y = Math.abs(Math.sin(G.t * 6 + f.i)) * 0.06 * (f.cheered || G.mode === 'win' ? 2.2 : 1);
    if (play && !f.cheered && f.z - G.dist < 2.5) { f.cheered = true; G.score += 50; hint(f.name + ': ' + T('cheers')[f.i % T('cheers').length] + ' +50', 2.2); if (audio.on) { audio.tone(784, 0.12, 'triangle', 0.1); audio.tone(1047, 0.2, 'triangle', 0.1, 0, 0.1); } }
    if (G.mode !== 'win' && f.z < G.dist - 7) { f.on = false; f.g.visible = false; }
  }
  if (HQ) hqStep(rawDt, play, moving);
  // ---- power-up effects on Łatka
  bubble.visible = G.pw.shield > 0 && (G.pw.shield > 3 || Math.floor(G.t * 8) % 2 === 0); if (bubble.visible) { bubble.position.set(Pl.x, Pl.y + 0.48, -G.dist); bubble.scale.setScalar(1 + Math.sin(G.t * 6) * 0.04); }
  if (G.pw.turbo > 0 && Math.random() < rawDt * 90) pAdd.spawn(Pl.x + (Math.random() - 0.5) * 0.5, Pl.y + 0.2 + Math.random() * 0.5, -G.dist + 0.6, (Math.random() - 0.5), Math.random(), 3, 0.35, 0.3, 0.02, 5, 2.4, 0.4, 1, 0, 1);
  if (G.pw.magnet > 0 && Math.random() < rawDt * 14) pAdd.spawn(Pl.x + (Math.random() - 0.5) * 1.6, Pl.y + 0.3 + Math.random() * 0.8, -G.dist - 0.5, 0, 0.6, 0, 0.4, 0.12, 0.02, 4, 0.8, 0.6, 1, 0, 1);
  // ---- pickups
  let n = 0;
  for (const it of items) {
    if (it.z > G.dist + 120) continue;
    if (it.kind === 'bone') { if (n < BONES) { dummy.position.set(it.x, it.y + Math.sin(G.t * 3 + it.z) * 0.05, -it.z); dummy.rotation.set(0.3, G.t * 3.2 + it.z * 0.5, 0.5); dummy.scale.setScalar(1.55); dummy.updateMatrix(); boneMesh.setMatrixAt(n++, dummy.matrix); } }
    else { const m = it.mesh || (it.mesh = relicMeshes[it.kind]); m.visible = true; m.position.set(it.x, it.y + Math.sin(G.t * 2.5) * 0.08, -it.z); m.children[0].rotation.y = G.t * 2.4; m.children[1].rotation.x = G.t * 1.7; m.children[1].rotation.y = G.t * 0.9; }
  }
  boneMesh.count = n; boneMesh.instanceMatrix.needsUpdate = true;
  pAdd.update(dt); pAlpha.update(dt);
  // ---- camera
  G.blend = Math.min(1, G.blend + dt * (G.mode === 'title' ? -3 : 0.9)); if (G.mode === 'title') G.blend = 0;
  const k = sm(0, 1, G.blend), pz = -G.dist, wide = camera.aspect < 1 ? 1 : 0, end = 0;
  G.shake = Math.max(0, G.shake - dt * 1.8); const sh = G.shake * G.shake * 0.25;
  camP.set(lerp(2.3, Pl.x * 0.6, k) + end * 2.6, lerp(1.25, 2.45 + wide * 0.5 + Pl.y * 0.3, k) - end * 1.1, pz + lerp(-3.4 - wide * 2.4, 4.4 + wide * 0.8, k) - end * 4.5);
  if (G.car) { camP.y += 0.8 * k; camP.z += 2.5 * k; }
  camL.set(lerp(-0.2, Pl.x * 0.8, k), lerp(-0.25 - wide * 0.9, 1.05 - wide * 0.8, k) - end * 0.4, pz + lerp(-1.5, -7.5, k) + end * 6);
  // the catch is watched from low at the roadside, close to both animals
  const cc = G.cr > 0 && (G.mode === 'catch' || G.mode === 'win') ? sm(0, 0.22, G.cr) * (1 - sm(1.5, 2.15, G.cr)) : 0;
  if (cc > 0) { const side = Pl.x > 0.5 ? -1 : 1; camP.lerp(tmpV.set(Pl.x + side * 3.3, 0.75, pz - 0.2), cc); camL.lerp(tmpV.set((Pl.x + Mi.x) / 2, 0.85, pz - 1.5), cc); }
  camL.x += bend.x * 420 * (1 - cc);
  if (G.mode === 'win') {                                  // finale: a slow circle around the two of them
    const e = sm(1.3, 3, G.endT), a = 0.5 + Math.sin(G.endT * 0.33) * 0.75, r = lerp(5.4, 4.3, sm(3, 8, G.endT)) + wide * 2.2;      // sways from side to side, always between the fences
    camP.lerp(tmpV.set(clamp(Pl.x * 0.4 + Math.sin(a) * 2.2, -2.3, 2.3), 1.35 + wide * 0.7, pz + Math.cos(a) * r), e); camL.lerp(tmpV.set(Pl.x * 0.6 + 0.2, 0.75, pz - 1.2), e);
  }
  if (G.yawOff) { const c = Math.cos(G.yawOff), sn = Math.sin(G.yawOff); for (const v of [camP, camL]) { const x = v.x - Pl.x, z = v.z - pz; v.x = Pl.x + x * c + z * sn; v.z = pz - x * sn + z * c; } }
  camera.position.copy(camP); camera.position.x += (Math.random() - 0.5) * sh; camera.position.y += (Math.random() - 0.5) * sh; camera.lookAt(camL); camera.rotateZ(-bend.x * 34 * (1 - cc));
  const fov = 62 + (wide ? 8 : 0) + clamp((G.speed - 9) * 1.3, 0, 9) - cc * 14 + (G.pw.turbo > 0 ? 7 : 0); if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 3); camera.updateProjectionMatrix(); }
  updateBend(dt); updateMood(dt);
  // ---- HUD and sound
  hud(); if (hintT > 0) { hintT -= dt; if (hintT <= 0) $('hint').style.opacity = 0; } if (pickT > 0) { pickT -= dt; if (pickT <= 0) $('pick').style.opacity = 0; }
  audio.musicRun({ play: moving, soft: G.mode === 'win', stage: G.stage });
  if (audio.on && moving && Pl.grounded && !sliding && !G.car) { stepAcc -= dt * (2 + G.speed * 0.75); if (stepAcc <= 0) { stepAcc = 1; audio.step(false); } }
}
let stepAcc = 0; const camP = new THREE.Vector3(), camL = new THREE.Vector3(), tmpV = new THREE.Vector3();
function catchMila() {
  buzz([40, 50, 40, 50, 160]); Mi.trick = null; Mi.wy = 0;
  const pts = 500 * (G.stage + 1); G.score += pts; G.mode = 'catch'; G.ct = 0; G.cr = 0; G.gap = 2.3;
  audio.bark(); dog.bark(); audio.meow(1.25); setTimeout(() => audio.hiss(), 500); audio.whoosh(); audio.tone(110, 1.2, 'sine', 0.25, 0.5);
  Mi.vy = 7.2; Mi.y = 0.01; Mi.flip = 0.001; Mi.lane = Pl.lane; Mi.x = Pl.x;
  Pl.slide = 0; Pl.vy = 6.4; Pl.grounded = false; if (Pl.y <= 0) Pl.y = 0.01;
  if (G.car) { Object.assign(Pl, { y: 0, vy: 0, grounded: true }); Mi.vy = 0; Mi.y = 0; Mi.flip = 0; }                    // Łatka pounces
  $('flash').style.background = 'radial-gradient(ellipse at center, rgba(255,230,150,0) 35%, rgba(255,214,110,.6))'; $('flash').style.opacity = 1; setTimeout(() => { $('flash').style.opacity = 0; setTimeout(() => { $('flash').style.background = ''; }, 300); }, 500);
  for (let i = 0; i < 70; i++) { const a = Math.random() * 6.28, sp = 2 + Math.random() * 4; pAdd.spawn(Pl.x, 0.7, -(G.dist + 1.2), Math.cos(a) * sp, Math.abs(Math.sin(a)) * sp + 1, -G.speed * 0.8 + (Math.random() - 0.5) * 3, 0.8 + Math.random() * 0.7, 0.3, 0.03, 5, 3.6 + Math.random(), 1, 1, 5, 1); }
  pick(T('caught', pts)); if (G.stage < 2) setTimeout(() => { if (G.mode === 'catch') pick(T('away')); }, 1300);
  sparkle(Mi.x, 0.6, -(G.dist + 2.3), GOLD, 50); clearAhead(G.dist, G.dist + 62);
}
// The ending: everyone who lent Łatka a relic comes out to cheer, confetti falls, Mila walks back, rubs against her and
// they sit together, while the camera circles them.
function finale(dt) {
  const t = G.endT, F = G.fin, cx = Pl.x, cz = -G.dist - 1, once = (k, at, fn) => { if (!F[k] && t > at) { F[k] = true; fn(); } };
  once('crowd', 1.5, () => {
    const order = [...friends].sort((p, q) => p.sc - q.sc), front = Math.ceil(order.length / 2);
    order.forEach((f, i) => { const back = i >= front, n = back ? order.length - front : front, k = n > 1 ? (back ? i - front : i) / (n - 1) - 0.5 : 0, x = clamp(cx * 0.4 + k * (back ? 4.6 : 5.2), -2.75, 2.75), z = cz - 2.4 - (back ? 1.7 : 0) + Math.abs(k) * 0.8; placeFriend(f, x, z, Math.atan2(cx - x, cz - z)); f.cheered = true; if (back) f.label.position.y += 0.55 / f.sc; });     // two rows, the little ones in front
    Object.assign(G.pw, { magnet: 0, shield: 0, turbo: 0, x2: 0 }); for (const id of ['rTop', 'rLives', 'rMila', 'rPow', 'hint']) $(id).style.opacity = 0;
    for (const row of rows) freeRow(row); rows.length = 0; items.length = 0; for (const id in relicMeshes) relicMeshes[id].visible = false;
    setWeather('clear'); buzz([60, 40, 60]);
  });
  once('l1', 2.6, () => { pick(T('fin1')); pickT = 2.3; audio.meow(0.9); });
  once('bark', 4.5, () => { audio.bark(); dog.bark(); });
  once('l2', 5.4, () => { pick(T('fin2')); pickT = 3; if (audio.on) audio.pickup('mirror'); });
  if (t > 1.5 && t < 8) for (let i = 0; i < 2; i++) if (Math.random() < dt * 45) { const c = [[1, 0.3, 0.3], [1, 0.8, 0.2], [0.3, 0.7, 1], [0.5, 0.9, 0.4], [0.9, 0.4, 0.9]][(Math.random() * 5) | 0]; pAlpha.spawn(cx + (Math.random() - 0.5) * 8, 3.6 + Math.random(), cz + (Math.random() - 0.5) * 8, (Math.random() - 0.5), -0.4, (Math.random() - 0.5), 2.6, 0.13, 0.13, c[0], c[1], c[2], 0.95, 1.2, 0.8); }
  if (t > 4.3 && Math.random() < dt * 7) pAdd.spawn((cx + Mi.x) / 2 + (Math.random() - 0.5) * 0.5, 0.9, -G.dist - Mi.lead * 0.5, (Math.random() - 0.5) * 0.3, 0.9, 0, 1.4, 0.16, 0.3, 5, 0.6, 1.6, 1, -0.2, 0.3);    // hearts, more or less
}
// plays the level by itself (used for testing): heads for the safe lane and jumps / slides when needed
function botPlay() {
  if (jn && !jn.done && jn.J - G.dist < 22 && !jn.choice) act((G.seed + jn.id) % 2 ? 'left' : 'right');
  let prev = null;
  for (const row of rows) {
    if (row.z < G.dist - 0.4) { prev = row; continue; }
    if (!prev || G.dist > prev.z + 0.9) { if (Pl.lane < row.safe) act('right'); else if (Pl.lane > row.safe) act('left'); }
    const c = row.cells[row.safe], dz = row.z - G.dist;
    if (Pl.lane === row.safe && Pl.grounded) { if ((c === 'low' || c === 'puddle') && dz < G.speed * 0.3 && dz > 0.3) act('up'); if (c === 'high' && dz < G.speed * 0.26 && Pl.slide <= 0.2) act('down'); }
    break;
  }
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
  document.body.classList.add('run'); if (isTouch) document.body.classList.add('touch');
  await new Promise((r) => setTimeout(r, 30));
  tex = createTextures();
  buildScenery(); buildWeather(); buildProtos(); buildPickups(); buildFriends(); buildCars();
  $('rPow').innerHTML = [['magnet', '🧲'], ['shield', '🛡️'], ['turbo', '⚡'], ['x2', '×2']].map(([k, ic]) => `<span id="pw-${k}"><i>${ic}</i><b></b></span>`).join('');
  dog = buildDog(tex, {}); scene.add(dog.root); if (HQ) addFur(dog.root, DOG_FUR);
  cat = buildCat({ scale: 1.45 }); scene.add(cat.root); if (HQ) addFur(cat.root, CAT_FUR);
  scene.traverse((o) => { if (o.material) bendPatch(o.material); }); for (const m of plateMats) bendPatch(m);
  pAdd = new Particles(500, true); pAlpha = new Particles(HQ ? 900 : 400, false); scene.add(pAdd.mesh); scene.add(pAlpha.mesh);
  if (HQ) {
    for (let i = 0; i < 8; i++) {                           // sparrows that sit on the road and scatter when Łatka comes running
      const g = new THREE.Group(), bb = new Builder(880 + i), body = new THREE.SphereGeometry(0.07, 8, 6); body.scale(1, 0.95, 1.5); bb.add(body, 0x7a5a3c, 0, 0.08, 0, 0, 0.06); bb.add(new THREE.SphereGeometry(0.045, 8, 6), 0x5a4230, 0, 0.14, 0.09, 0, 0.04); bb.box(0.03, 0.012, 0.09, 0, 0.07, -0.13, 0x4a3626, 0, 0); bb.cone(0.012, 0.035, 0, 0.13, 0.14, 0x2a2420, 4);
      const mk = (sd) => { const wb = new Builder(890 + i); wb.box(0.13, 0.012, 0.09, sd * 0.065, 0, 0, 0x5f4630, 0, 0.05); const m = wb.mesh(); m.position.set(sd * 0.05, 0.11, 0); return m; }, wl = mk(-1), wr = mk(1);
      g.add(bb.mesh(), wl, wr); g.visible = false; g.traverse((o) => { o.frustumCulled = false; }); scene.add(g); hq.sparrows.push({ g, wl, wr, st: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, t: 0, ph: i * 1.7 });
    }
    const pg = new THREE.CircleGeometry(0.05, 8); pg.rotateX(-Math.PI / 2); const pmat = new THREE.MeshBasicMaterial({ color: 0x0c0e12, transparent: true, opacity: 0.32, depthWrite: false }); bendPatch(pmat);
    for (let i = 0; i < 28; i++) { const m = new THREE.Mesh(pg, pmat); m.visible = false; m.frustumCulled = false; m.renderOrder = 2; scene.add(m); hq.prints.push(m); }      // wet paw prints
    hq.drops = document.createElement('div'); hq.drops.style.cssText = 'position:fixed;inset:0;z-index:1;pointer-events:none;opacity:0;transition:opacity 1.5s';
    for (let i = 0; i < 14; i++) { const d = document.createElement('i'), sz = 22 + Math.random() * 52; d.style.cssText = `position:absolute;left:${Math.random() * 96}%;top:${Math.random() * 92}%;width:${sz}px;height:${sz * (1 + Math.random() * 0.35)}px;border-radius:50%;background:radial-gradient(circle at 36% 30%,rgba(255,255,255,.34),rgba(255,255,255,.06) 42%,rgba(0,0,0,.1) 68%,transparent 71%);backdrop-filter:blur(2.5px);-webkit-backdrop-filter:blur(2.5px);transition:top 5s linear,opacity .8s`; hq.drops.appendChild(d); }
    document.body.appendChild(hq.drops);                    // rain on the lens
  }
  reset(); G.mode = 'title'; applyLang();
  $('start').addEventListener('click', startGame);
  $('lang').addEventListener('click', () => { lang = lang === 'pl' ? 'en' : 'pl'; applyLang(); });
  $('again').addEventListener('click', () => { const bot = G.bot; toTitle(); G.bot = bot; startGame(); });
  $('menu').addEventListener('click', toTitle);
  // put every obstacle on the graphics card once, behind the loading screen
  const warm = Object.keys(PROTO).map((k) => { const m = getObj(k); m.position.set(0, 0, -8); return m; });
  step(0.016); renderer.compile(scene, camera); draw();
  for (const m of warm) { m.visible = false; pools[m.userData.kind].push(m); }
  window.__run = { G, Pl, Mi, W, rows, items, gen, audio, chunks, friends, setWeather, get jn() { return jn; }, step, startGame, reset, toTitle, renderer, scene, camera, act, setCar, flying,
    sim: (secs, dt = 1 / 60) => { for (let t = 0; t < secs; t += dt) step(dt); draw(); return { mode: G.mode, dist: +G.dist.toFixed(1), gap: +G.gap.toFixed(1), stage: G.stage, lives: G.lives, score: Math.floor(G.score), bones: G.bones, t: +G.t.toFixed(1) }; } };
  $('title').classList.remove('hidden'); $('loading').style.opacity = 0; setTimeout(() => $('loading').remove(), 1100);
  last = performance.now(); requestAnimationFrame(frame);
}
boot().catch((e) => { console.error(e); $('loading').textContent = 'Błąd: ' + e.message; });
