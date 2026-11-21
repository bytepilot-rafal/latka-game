// Level 2 – "Pościg za Milą": a three-lane chase down a village lane. Łatka runs by herself; the player changes lanes,
// jumps and slides. Catch Mila the cat three times to win.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createTextures, sm, lerp, clamp, rng, fbm } from './textures.js';
import { buildDog } from './dog.js';
import { buildCat } from './cat.js';
import { relicModel, RELIC_COLORS } from './relics.js';
import { Particles, fogUniforms } from './fx.js';
import { AudioSys } from './audio.js';

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
    p_magnet: 'Magnes na kości!', p_shield: 'Tarcza!', p_turbo: 'Turbo-łapy!', p_x2: 'Podwójne punkty!', shieldPop: 'Tarcza cię uratowała!', splash: 'Chlup!', smash: 'Bum! +20',
    cheers: ['Brawo, Łatka!', 'Łap ją, łap!', 'Dalej, dalej!', 'Szybciej, szybciej!', 'Hau hau!', 'Biegnij, Łatka!', 'Mila jest tuż-tuż!', 'Dasz radę!', 'Ale pędzisz!', 'Już ją masz!', 'Brawo, piesku kochany!'],
    w_rain: 'Zaczyna padać!', w_fog: 'Nadciąga mgła…', w_snow: 'Sypie śnieg!', w_clear: 'Przejaśnia się.',
    fin1: 'Mila: „No dobrze… wygrałaś!”', fin2: 'Od dziś biegają razem.',
    r_bone: 'Kość dr. Alicji! +100', r_sock: 'Feeeeee! Skarpeta Lesława! +100', r_mirror: 'Lustro Oli! +100', r_brush: 'Zmiotka Agaty! +100', r_diaper: 'Ojej! Pielucha Jasia! +100',
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
    p_magnet: 'Bone magnet!', p_shield: 'Shield!', p_turbo: 'Turbo paws!', p_x2: 'Double points!', shieldPop: 'The shield saved you!', splash: 'Splash!', smash: 'Boom! +20',
    cheers: ['Bravo, Łatka!', 'Get her!', 'Go, go, go!', 'Faster, faster!', 'Woof woof!', 'Run, Łatka!', 'Mila is right there!', 'You can do it!', 'So fast!', 'You have got her!', 'Good girl!'],
    w_rain: 'It starts to rain!', w_fog: 'Fog rolls in…', w_snow: 'It is snowing!', w_clear: 'It clears up.',
    fin1: 'Mila: "All right… you win!"', fin2: 'From now on they run together.',
    r_bone: 'Kość dr. Alicji! +100', r_sock: 'Yuck! Skarpeta Lesława! +100', r_mirror: 'Lustro Oli! +100', r_brush: 'Zmiotka Agaty! +100', r_diaper: 'Oh my! Pielucha Jasia! +100',
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
function resize() { const w = Math.max(2, window.innerWidth), h = Math.max(2, window.innerHeight); camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setPixelRatio(pixelRatio); renderer.setSize(w, h, false); }
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
function bendPatch(m) {
  if (!m || m.isShaderMaterial || m.userData.bent) return; m.userData.bent = true;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uBend = bendU;
    sh.vertexShader = 'uniform vec3 uBend;\n' + sh.vertexShader.replace('#include <project_vertex>', `vec4 bw = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        bw = instanceMatrix * bw;
      #endif
      bw = modelMatrix * bw; float bd = min(0.0, bw.z - uBend.z); bw.x += uBend.x * bd * bd; bw.y += uBend.y * bd * bd;
      vec4 mvPosition = viewMatrix * bw; gl_Position = projectionMatrix * mvPosition;`);
  };
  m.needsUpdate = true;
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
const chunks = [], plateMats = [], lampBits = []; let junction, ground, jn = null, lampM, poolM;
function buildScenery() {
  // sky
  skyU = { uTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uSun: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3() }, uTime: { value: 0 }, uCover: { value: 0 } };
  const dome = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), new THREE.ShaderMaterial({ uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uTop, uHor, uSun, uSunDir; uniform float uTime, uCover; varying vec3 vDir;
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
          c = mix(c, cc, cov * up * 0.94); disc *= 1.0 - cov * 0.9;
        }
        c += uSun * disc * 9.0;
        c = mix(c, uHor, exp(-h * 11.0) * 0.72); gl_FragColor = vec4(c, 1.0);
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
  roadM = new THREE.MeshStandardMaterial({ map: roadT, roughness: 0.95 }); grassM = new THREE.MeshStandardMaterial({ map: grassT, roughness: 1 });
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
  for (let ci = 0; ci < NC; ci++) {
    const bs = { [-1]: new Builder(300 + ci), 1: new Builder(100 + ci) }, r = bs[1].r, grp = new THREE.Group(); let b = bs[1];   // each side of the street is its own mesh, so one side can be hidden at a junction
    const road = new THREE.Mesh(roadG, roadM); road.position.set(0, 0, -CL / 2); road.receiveShadow = true; grp.add(road);
    const grass = new THREE.Mesh(grassG, grassM); grass.position.set(0, -0.03, -CL / 2); grass.receiveShadow = true; grp.add(grass);
    const spruce = (x, z, h) => { b.cyl(0.1 * h / 5, 0.14 * h / 5, h * 0.25, x, 0, z, 0x5a4030); for (let i = 0; i < 4; i++) b.cone(h * (0.26 - i * 0.045), h * 0.36, x, h * (0.16 + i * 0.2), z, i % 2 ? 0x2f5d33 : 0x27502d, 8); };
    const tree = (x, z, s) => { b.cyl(0.13 * s, 0.2 * s, 2.3 * s, x, 0, z, 0x5d4632); b.blob(1.5 * s, x, 3.2 * s, z, GREENS[(r() * 4) | 0], 0.9); b.blob(1.1 * s, x + 0.9 * s, 2.7 * s, z + 0.4 * s, GREENS[(r() * 4) | 0]); b.blob(1.0 * s, x - 0.8 * s, 2.9 * s, z - 0.5 * s, GREENS[(r() * 4) | 0]); };
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
        const hx = s * (ROADW / 2 + 6.2 + r() * 2.5), q = ci % 2 === 0 && s === (ci % 4 === 0 ? -1 : 1) && seg === 0 ? 0 : r();
        if (q < 0.62) {
          const w = 6 + r() * 2.5, d = 6.5 + r() * 2.5, h = 2.9 + (r() < 0.35 ? 2.4 : 0), wall = WALLS[(r() * WALLS.length) | 0], roof = ROOFS[(r() * ROOFS.length) | 0];
          b.box(w, 0.35, d, hx, 0, zc, 0x8f8a82); b.box(w - 0.1, h, d - 0.1, hx, 0.35, zc, wall, 0, 0.03);
          const turn = r() < 0.5, rg = roofGeo((turn ? d : w) + 0.9, 2.3 + r(), (turn ? w : d) + 0.9); b.add(rg, roof, hx, h + 0.35, zc, turn ? Math.PI / 2 : 0, 0.04);
          b.box(0.55, 1.1, 0.55, hx + (r() - 0.5) * 2, h + 1.2, zc + (r() - 0.5) * 2, 0x8a5a48);                    // chimney
          const face = hx - s * (w / 2 + 0.02);
          for (const wz of [-d * 0.27, d * 0.27]) for (let fl = 0; fl < (h > 4 ? 2 : 1); fl++) { b.box(0.06, 1.25, 1.15, face - s * 0.01, 1.25 + fl * 2.4, zc + wz, 0xf4f1ea, 0, 0); b.box(0.07, 1.05, 0.95, face - s * 0.03, 1.35 + fl * 2.4, zc + wz, 0x2c3f52, 0, 0); }
          b.box(0.07, 2.0, 0.95, face - s * 0.02, 0.35, zc, 0x6b4630, 0, 0);                                           // door
          if (ci % 2 === 0 && s === (ci % 4 === 0 ? -1 : 1) && !grp.userData.plate) { const pl = new THREE.Mesh(plateG, plateMats[0]); pl.position.set(face - s * 0.07, 2.75, zc); pl.rotation.y = -s * Math.PI / 2; grp.userData.plate = pl; grp.userData.plateSide = s; }
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
    if (ci % 2 === 0) { const s = ci % 4 === 0 ? 1 : -1; b = bs[s]; const x = s * (ROADW / 2 + 0.38); b.cyl(0.05, 0.07, 5.2, x, 0, -6, 0x6d7278); b.box(0.9, 0.06, 0.08, x - s * 0.4, 5.15, -6, 0x6d7278); b.box(0.36, 0.1, 0.18, x - s * 0.82, 5.05, -6, 0xe8e2c8); grp.userData.lamp = { s, x }; }
    grp.userData.sideL = bs[-1].mesh(); grp.userData.sideR = bs[1].mesh(); grp.add(grp.userData.sideL, grp.userData.sideR);
    if (grp.userData.plate) grp.userData[grp.userData.plateSide < 0 ? 'sideL' : 'sideR'].add(grp.userData.plate);
    if (grp.userData.lamp) {                 // evening: a glowing lamp head and a pool of light on the road (no real light, so it costs nothing)
      const { s, x } = grp.userData.lamp, gl = new THREE.Mesh(lampG, lampM), pool = new THREE.Mesh(poolG, poolM);
      gl.position.set(x - s * 0.82, 4.97, -6); pool.position.set(x - s * 1.5, 0.035, -6); gl.visible = pool.visible = false; lampBits.push(gl, pool);
      grp.userData[s < 0 ? 'sideL' : 'sideR'].add(gl, pool);
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
    b.box(2 * JH + 2.4, 1.5, 0.95, 0, 0, -JH - 0.35, 0x3d6f2b, 0, 0.1); for (let i = 0; i < 8; i++) b.blob(0.66, -4.3 + i * 1.23, 1.55 + r() * 0.3, -JH - 0.35, 0x4a8034, 0.7);
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
  sun.color.setRGB(...sc); sun.intensity = lerp(a.si, b.si, f) * Math.max(0.22, 1 - 0.6 * W.rain - 0.72 * W.fog - 0.4 * W.snow);
  hemi.intensity = lerp(a.hi, b.hi, f) * (1 + 0.3 * W.fog + 0.45 * W.snow - 0.05 * W.rain);
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
  G.dome.position.copy(camera.position); ground.position.set(0, -0.1, pz);
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
  mk('planter', (b) => { b.box(1.3, 0.55, 0.7, 0, 0, 0, 0xb5b0a6); b.box(1.38, 0.08, 0.78, 0, 0.55, 0, 0x9d988e); b.blob(0.5, -0.3, 0.95, 0, 0x3f7a2c); b.blob(0.55, 0.3, 1.02, 0.05, 0x4f8a34); b.blob(0.4, 0, 1.35, -0.05, 0x5c9440); for (let i = 0; i < 6; i++) b.blob(0.08, -0.5 + i * 0.2, 1.05 + (i % 3) * 0.16, 0.36, i % 2 ? 0xe85d8f : 0xf4d44a); });
  mk('biglog', (b) => { b.add(lying(ROADW + 0.5, 0.27), 0x66472f, 0, 0.27, 0); b.add(lying(ROADW + 0.54, 0.21), 0xc9a877, 0, 0.27, 0); for (const x of [-1.9, 0.6, 2.2]) { b.cyl(0.05, 0.08, 0.35, x, 0.45, 0.02, 0x5c3f2a); b.blob(0.2, x + 0.1, 0.78, 0, 0x4f8a34); } });
  mk('line', (b) => {
    for (const x of [-ROADW / 2 - 0.1, ROADW / 2 + 0.1]) { b.box(0.1, 2.05, 0.1, x, 0, 0, 0x8a8f96); b.box(0.5, 0.06, 0.06, x, 1.95, 0, 0x8a8f96); }
    b.box(ROADW + 0.2, 0.025, 0.025, 0, 1.93, 0, 0xe8e4da);
    const cols = [0xf4f1ea, 0xd9534f, 0x4f86c6, 0xf2c94c, 0xf4f1ea, 0x69a86b, 0xe58fb0]; let x = -ROADW / 2 + 0.5;
    for (let i = 0; i < 7; i++) { const w = 0.6 + (i % 3) * 0.1; b.box(w, 1.12 + (i % 2) * 0.06, 0.03, x + w / 2, 0.8 - (i % 2) * 0.06, 0, cols[i], 0, 0.02); x += w + 0.1; }
  });
  // flowerpots Mila knocks off the fences
  mk('pot', (b) => { for (const x of [-0.3, 0.28]) { b.cyl(0.2, 0.13, 0.3, x, 0, 0, 0xb5583a, 10); b.cyl(0.22, 0.22, 0.05, x, 0.28, 0, 0xc46a48, 10); b.blob(0.2, x, 0.5, 0, 0x4f8a34); b.blob(0.09, x + 0.08, 0.66, 0.05, 0xe85d8f); b.blob(0.08, x - 0.1, 0.62, -0.04, 0xf4d44a); } });
  // a rolling ball (built around its centre so it can spin), a neighbour on a bike, a robot mower
  mk('ball', (b) => { b.add(new THREE.IcosahedronGeometry(0.3, 2), 0xd9412f, 0, 0, 0, 0, 0.02); b.add(new THREE.CylinderGeometry(0.305, 0.305, 0.12, 20), 0xf6f3ec, 0, 0, 0, 0, 0); const g2 = new THREE.CylinderGeometry(0.303, 0.303, 0.12, 20); g2.rotateZ(Math.PI / 2); b.add(g2, 0x2f6fd0, 0, 0, 0, 0, 0); });
  mk('bike', (b) => {
    for (const z of [-0.52, 0.52]) { const w = new THREE.TorusGeometry(0.31, 0.035, 6, 18); w.rotateY(Math.PI / 2); b.add(w, 0x1d1d20, 0, 0.345, z, 0, 0); }
    b.box(0.05, 0.05, 0.95, 0, 0.62, 0, 0xd8362c); b.box(0.05, 0.5, 0.05, 0, 0.36, -0.1, 0xd8362c); b.box(0.05, 0.55, 0.05, 0, 0.36, 0.48, 0xd8362c); b.box(0.5, 0.04, 0.04, 0, 0.93, 0.46, 0x2a2a2e); b.box(0.16, 0.05, 0.26, 0, 0.86, -0.12, 0x2a2a2e);
    b.box(0.36, 0.52, 0.24, 0, 0.92, -0.05, 0x2f6fb5); b.blob(0.14, 0, 1.6, 0.06, 0xe9b98f, 1); b.blob(0.155, 0, 1.66, 0.04, 0xf2c230, 0.75);       // the rider: jacket, head, helmet
    for (const x of [-0.11, 0.11]) { b.box(0.11, 0.5, 0.13, x, 0.42, -0.02, 0x3a3f4a); b.box(0.09, 0.09, 0.42, x * 1.7, 1.2, 0.22, 0x2f6fb5); }
  });
  mk('mower', (b) => { b.box(0.86, 0.2, 1.0, 0, 0.07, 0, 0xf07a1a); b.box(0.7, 0.14, 0.7, 0, 0.27, -0.05, 0xf59a3a); b.box(0.9, 0.07, 1.04, 0, 0.03, 0, 0x2a2a2e); b.box(0.2, 0.05, 0.12, 0, 0.41, 0.1, 0x33d17a, 0, 0); for (const x of [-0.46, 0.46]) for (const z of [-0.36, 0.36]) b.add(lying(0.08, 0.13), 0x1d1d20, x, 0.13, z, 0, 0); });
  { const g = new THREE.CircleGeometry(0.78, 24); g.rotateX(-Math.PI / 2); g.scale(0.96, 1, 1.5); PROTO.puddle = g; MATS.puddle = new THREE.MeshStandardMaterial({ color: 0x4a6f93, roughness: 0.08, transparent: true, opacity: 0.86 }); bendPatch(MATS.puddle); }
}
const KIND = { log: 'low', crate: 'low', gate: 'high', binG: 'full', binB: 'full', binY: 'full', planter: 'full', biglog: 'low', line: 'high', pot: 'low', ball: 'low', mower: 'low', bike: 'full', puddle: 'puddle' };
const MOVE_V = { ball: 5.5, bike: 6.5, mower: 2.6 }, MATS = {};       // things that come towards Łatka, and their speed
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
  { name: 'Babcia Małgosia', shirt: 0xa56a9a, hair: 0xd6d6d6, sc: 0.9, legs: 0x6a5a7a, skirt: 1, bun: 1 },
];
const friends = [];
function buildFriends() {
  FRIENDS.forEach((F, i) => {
    const { name, shirt, hair, sc } = F, g = new THREE.Group(), b = new Builder(700 + i), skin = 0xe8b890;
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
    g.add(b.mesh());
    const ab = new Builder(750 + i); ab.box(0.1, 0.5, 0.1, 0, 0, 0, shirt); ab.blob(0.075, 0, 0.56, 0, skin);
    const arm = ab.mesh(); arm.position.set(0.27, 1.28, 0); g.add(arm);                                           // the waving arm, hinged at the shoulder
    const lw = name.length > 9 ? 1.75 : 1.1;
    const t = canvasTex(Math.round(lw * 232), 72, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = 'rgba(12,9,6,.62)'; c.beginPath(); if (c.roundRect) c.roundRect(4, 4, w - 8, h - 8, 28); else c.rect(4, 4, w - 8, h - 8); c.fill(); c.fillStyle = '#ffd27a'; c.font = 'italic 44px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(name, w / 2, h / 2 + 2, w - 26); }, 1, 1);
    const label = new THREE.Mesh(new THREE.PlaneGeometry(lw, 0.31), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false })); label.position.y = 2.08 + (1 / sc - 1) * 0.42; label.scale.setScalar(1 / sc); g.add(label);
    g.traverse((o) => { o.frustumCulled = false; }); g.scale.setScalar(sc); g.visible = false; scene.add(g);
    friends.push({ name, g, arm, label, z: 0, on: false, cheered: false, i, sc });
  });
}
function placeFriend(f, x, z, yaw) { f.z = -z; f.on = true; f.cheered = false; f.g.visible = true; f.g.position.set(x, 0, z); f.g.rotation.y = yaw; f.label.rotation.y = -yaw; f.label.position.y = 2.08 + (1 / f.sc - 1) * 0.42; }
const RELICS = ['sock', 'mirror', 'brush', 'diaper', 'bone'];

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
  const mover = q >= a2 && q < a3 ? pick(['ball', 'bike', 'mower']) : null; if (mover) dz += 15;    // it will come to meet her, so leave room
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
  dog.root.visible = true;
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
function stumble(row) {
  row.hit = true; if (G.inv > 0) return;
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
  if (moving) { G.stageT += play ? dt : 0; G.playT += play ? dt : 0; target = speedNow() * (1 - 0.45 * G.slow) * (G.pw.turbo > 0 ? 1.45 : 1); }
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
      if (!mv.on && row.z - G.dist < 46) { mv.on = true; if (audio.on) { if (mv.kind === 'bike') { audio.tone(1900, 0.22, 'triangle', 0.13); audio.tone(1900, 0.22, 'triangle', 0.13, 0, 0.25); } else if (mv.kind === 'mower') audio.burst(140, 2, 1.6, 0.25, 'lowpass'); else audio.tone(260, 0.2, 'sine', 0.2, 0.5); } }
      if (mv.on && moving) {
        mv.t += dt; row.z = Math.max(i > 0 ? rows[i - 1].z + 4 : -1e9, row.z - mv.v * dt); o.position.z = -row.z;
        if (mv.kind === 'ball') { o.rotation.x += dt * mv.v / 0.3; o.position.y = 0.3 + Math.abs(Math.sin(mv.t * 7)) * 0.1; }
        else if (mv.kind === 'bike') o.rotation.z = Math.sin(mv.t * 5) * 0.05;
        else if (Math.random() < dt * 30) pAlpha.spawn(o.position.x + (Math.random() - 0.5) * 0.7, 0.1, o.position.z - 0.4, (Math.random() - 0.5) * 2, 1 + Math.random(), -1 - Math.random(), 0.5, 0.1, 0.3, 0.35, 0.7, 0.25, 0.7, 6, 1);
      }
    }
    if (row.fall > 0 && row.fall < 1 && o) {
      row.fall = Math.min(1, row.fall + dt / 0.42); const e = row.fall; o.position.x = lerp(row.fx, LX[row.lane], e); o.position.y = 1.1 * (1 - e * e); o.rotation.z = (1 - e) * 2.5 * Math.sign(row.fx);
      if (e >= 1) { o.rotation.z = 0; if (audio.on) audio.crack(); for (let k = 0; k < 8; k++) pAlpha.spawn(o.position.x, 0.15, o.position.z, (Math.random() - 0.5) * 3, 1 + Math.random(), (Math.random() - 0.5) * 3, 0.5, 0.2, 0.7, 0.7, 0.45, 0.3, 0.5, 3, 1.5); }
    }
    for (const b of row.objs) if (b.userData.tip > 0 && b.userData.tip < 1) { b.userData.tip = Math.min(1, b.userData.tip + dt * 3); b.rotation.x = b.userData.tip ** 2 * 1.5; }
  }
  // ---- collisions
  if (play) {
    const lane = clamp(Math.round(Pl.x / LANE) + 1, 0, 2);
    for (const row of rows) {
      if (row.z > G.dist + 1) break; if (row.hit || row.z < prevDist - 0.3 || row.z > G.dist + 0.35) continue;
      const c = row.cells[lane]; if (!c) continue;
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
    else if (G.ct > 0.9) { G.mode = 'win'; G.endT = 0; audio.fanfare(); }
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
  const mz = G.dist + Mi.lead,          // drawn at half the real lead, so she stays in sight
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
      if (c === 'low' && dz < G.speed * 0.27 && Mi.y === 0) Mi.vy = 5.6; Mi.crouch = c === 'high' && dz < G.speed * 0.3 ? 1 : 0; break;
    }
  }
  // her other trick: up onto the fence, along the top knocking flowerpots down, and back
  const nearJn = jn && (jn.done ? G.dist < jn.J + 30 : jn.J - G.dist < 60);
  if (play && !tr && G.playT > G.trickAt && G.gap > 9 && G.gap < 34 && !nearJn && Mi.y === 0) { tr = Mi.trick = { side: Math.random() < 0.5 ? -1 : 1, t: 0, dur: 3.6, next: 0.7, left: 2 + (Math.random() < 0.5 ? 1 : 0) }; audio.meow(1.1); }
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
  cat.animate(dt, { speed: sitM || (waits && Mi.lead < lead + 0.3) ? 0 : G.mode === 'win' ? 1.6 : Math.max(G.speed, moving ? 8 : G.mode === 'over' ? 9 : 0), grounded: Mi.y === 0, vy: Mi.vy, sit: sitM, crouch: Mi.crouch });
  // ---- Łatka
  const sitD = G.mode === 'title' || ((G.mode === 'win' || G.mode === 'over') && G.speed < 1.5) ? 1 : 0;
  dog.root.position.set(Pl.x, Pl.y, -G.dist); { const q = Math.abs(G.yawOff) / (Math.PI / 2); dog.root.rotation.y = Math.PI + G.yawOff * q; dog.root.rotation.z = (LX[Pl.lane] - Pl.x) * 0.22 - G.yawOff * (1 - q) * 0.5; }
  dog.root.visible = G.inv <= 0 || Math.floor(G.t * 14) % 2 === 0;
  dog.animate(dt, { speed: G.speed, grounded: Pl.grounded, vy: Pl.vy, sit: sitD, slide: sliding ? 1 : 0, happy: G.mode === 'win' ? 1 : 0.15, pant: true });
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
  if (audio.on && moving && Pl.grounded && !sliding) { stepAcc -= dt * (2 + G.speed * 0.75); if (stepAcc <= 0) { stepAcc = 1; audio.step(false); } }
}
let stepAcc = 0; const camP = new THREE.Vector3(), camL = new THREE.Vector3(), tmpV = new THREE.Vector3();
function catchMila() {
  buzz([40, 50, 40, 50, 160]); Mi.trick = null; Mi.wy = 0;
  const pts = 500 * (G.stage + 1); G.score += pts; G.mode = 'catch'; G.ct = 0; G.cr = 0; G.gap = 2.3;
  audio.bark(); dog.bark(); audio.meow(1.25); setTimeout(() => audio.hiss(), 500); audio.whoosh(); audio.tone(110, 1.2, 'sine', 0.25, 0.5);
  Mi.vy = 7.2; Mi.y = 0.01; Mi.flip = 0.001; Mi.lane = Pl.lane; Mi.x = Pl.x;
  Pl.slide = 0; Pl.vy = 6.4; Pl.grounded = false; if (Pl.y <= 0) Pl.y = 0.01;                    // Łatka pounces
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
  step(dt); renderer.render(scene, camera);
  fpsAcc += dt; fpsN++; if (fpsAcc > 2.5) { if (fpsAcc / fpsN > 0.03 && pixelRatio > 0.7) { pixelRatio = Math.max(0.7, pixelRatio * 0.85); resize(); } fpsAcc = 0; fpsN = 0; }
}
async function boot() {
  document.body.classList.add('run'); if (isTouch) document.body.classList.add('touch');
  await new Promise((r) => setTimeout(r, 30));
  tex = createTextures();
  buildScenery(); buildWeather(); buildProtos(); buildPickups(); buildFriends();
  $('rPow').innerHTML = [['magnet', '🧲'], ['shield', '🛡️'], ['turbo', '⚡'], ['x2', '×2']].map(([k, ic]) => `<span id="pw-${k}"><i>${ic}</i><b></b></span>`).join('');
  dog = buildDog(tex, {}); scene.add(dog.root);
  cat = buildCat({ scale: 1.45 }); scene.add(cat.root);
  scene.traverse((o) => { if (o.material) bendPatch(o.material); }); for (const m of plateMats) bendPatch(m);
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
  window.__run = { G, Pl, Mi, W, rows, items, gen, audio, chunks, friends, setWeather, get jn() { return jn; }, step, startGame, reset, toTitle, renderer, scene, camera, act,
    sim: (secs, dt = 1 / 60) => { for (let t = 0; t < secs; t += dt) step(dt); renderer.render(scene, camera); return { mode: G.mode, dist: +G.dist.toFixed(1), gap: +G.gap.toFixed(1), stage: G.stage, lives: G.lives, score: Math.floor(G.score), bones: G.bones, t: +G.t.toFixed(1) }; } };
  $('title').classList.remove('hidden'); $('loading').style.opacity = 0; setTimeout(() => $('loading').remove(), 1100);
  last = performance.now(); requestAnimationFrame(frame);
}
boot().catch((e) => { console.error(e); $('loading').textContent = 'Błąd: ' + e.message; });
