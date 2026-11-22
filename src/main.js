// Przygody zaginionej Łatki – game loop, player, camera, story.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createTextures, sm, lerp, clamp } from './textures.js';
import { buildWorld, H, L, tunnelR, tunnelS, pathX } from './world.js';
import { buildDog } from './dog.js';
import { HQ, addFur, DOG_FUR, CAT_FUR } from './fur.js';
import { buildSky } from './sky.js';
import { Particles, beamMaterial } from './fx.js';
import { AudioSys } from './audio.js';

const DAY = 360; // seconds of daylight

// ------------------------------------------------------------------ text
const TXT = {
  pl: {
    over: 'Zaginiona świątynia w kanionie', start: 'Zacznij przygodę', again: 'Zagraj ponownie',
    story: 'Zachodzi słońce. Łatka dotarła do zaginionej świątyni w głębi dżungli. Znajdź sześć reliktów ukrytych w ruinach i otwórz wrota, zanim zgaśnie światło — za nimi czekają szczeniaki!',
    keys: 'WASD / strzałki — ruch · Spacja — skok · Shift — bieg · przeciągnij myszą lub Q / E — kamera · H — hau! · M — muzyka',
    keys_t: 'Lewy kciuk — ruch (do końca = bieg) · przycisk z łapą — skok · przeciągnij po ekranie — kamera · dwa palce — przybliżenie · najlepiej w poziomie',
    h_stairs_t: 'Kazikowe Schody się kruszą — przeskakuj wyrwy (przycisk z łapą).',
    sun: 'Do zmroku', h_start: 'Idź ulicą Pogodną przez ruiny do Mostu Serockiego.', h_bridge: 'Most Serocki skrzypi i kołysze się… Uważaj na dziury!',
    h_break: 'Uff! Most Serocki runął do rzeki tuż za tobą!', h_stairs: 'Kazikowe Schody się kruszą — przeskakuj wyrwy (Spacja).', h_tunnel: 'W Tunelu Stasia jest ciemno… Latarenka na obroży rozświetla drogę.',
    h_court: 'Świątynia! Lustro Oli śle promienie do nieba — poszukaj go w ruinach.', h_need: (n) => `Roszczeńskie Wrota potrzebują sześciu reliktów (masz ${n}/6). Rozejrzyj się za kolorowymi słupami światła.`, h_door: 'Relikty wracają na swoje miejsce…',
    h_fall: 'Chlup! Spróbuj jeszcze raz.', h_go: 'Masz wszystkie relikty! Biegnij do Roszczeńskich Wrót.',
    p_bone: 'Kość dr. Alicji!', p_sock: 'Feeeeee! Skarpeta Lesława!', p_mirror: 'Lustro Oli!', p_brush: 'Zmiotka Agaty!', p_diaper: 'Ojej! Pielucha Jasia!', p_ball: 'Gooool! Piłka Piotrusia!',
    k_street: 'ulica', k_bridge: 'most linowy', k_stairs: 'schody', k_tunnel: 'tunel', k_gate: 'wrota świątyni', k_temple: 'zaginiona świątynia',
    win: 'Łatka odnalazła szczeniaki!', winText: (t) => `Roszczeńskie Wrota stoją otworem, a maluchy są bezpieczne. Zdążyłaś w ${t}, zanim zapadł zmrok.`,
    lose: 'Zapadła noc…', loseText: 'Światło zgasło, zanim wrota się otworzyły. Szczeniaki wciąż czekają — spróbuj jeszcze raz!',
  },
  en: {
    over: 'The lost temple in the canyon', start: 'Begin the adventure', again: 'Play again',
    story: 'The sun is setting. Łatka has reached a lost temple deep in the jungle. Find the six relics hidden in the ruins and open the door before the light is gone — the puppies are waiting behind it!',
    keys: 'WASD / arrows — move · Space — jump · Shift — run · drag the mouse or Q / E — camera · H — woof! · M — music',
    keys_t: 'Left thumb — move (push all the way = run) · paw button — jump · drag the screen — camera · two fingers — zoom · best in landscape',
    h_stairs_t: 'Kazikowe Schody are crumbling — jump the gaps (paw button).',
    sun: 'Until dark', h_start: 'Follow Pogodna Street through the ruins to Most Serocki.', h_bridge: 'Most Serocki creaks and sways… Mind the gaps!',
    h_break: 'Phew! Most Serocki fell into the river right behind you!', h_stairs: 'Kazikowe Schody are crumbling — jump the gaps (Space).', h_tunnel: 'Tunel Stasia is dark… The little lantern on your collar lights the way.',
    h_court: 'The temple! Lustro Oli sends rays to the sky — look for it in the ruins.', h_need: (n) => `Roszczeńskie Wrota need six relics (you have ${n}/6). Look for the coloured beams of light.`, h_door: 'The relics return to their places…',
    h_fall: 'Splash! Try again.', h_go: 'You have all the relics! Run to Roszczeńskie Wrota.',
    p_bone: 'Kość dr. Alicji — Dr Alicja\'s bone!', p_sock: 'Yuck! Skarpeta Lesława!', p_mirror: 'Lustro Oli — Ola\'s mirror!', p_brush: 'Zmiotka Agaty — Agata\'s brush!', p_diaper: 'Oh my! Pielucha Jasia!', p_ball: 'Goal! Piłka Piotrusia — Piotruś\'s football!',
    k_street: 'street', k_bridge: 'rope bridge', k_stairs: 'stairs', k_tunnel: 'tunnel', k_gate: 'temple gate', k_temple: 'the lost temple',
    win: 'Łatka found the puppies!', winText: (t) => `The temple door stands open and the little ones are safe. You made it in ${t}, before nightfall.`,
    lose: 'Night has fallen…', loseText: 'The light was gone before the door opened. The puppies are still waiting — try again!',
  },
};
let lang = 'pl';
const touch = { x: 0, y: 0, sprint: false, on: false };   // on-screen controls for phones and tablets
const T = (k, ...a) => { const v = (touch.on && TXT[lang][k + '_t']) || TXT[lang][k]; return typeof v === 'function' ? v(...a) : v; };
const $ = (id) => document.getElementById(id);
function applyLang() { document.querySelectorAll('[data-t]').forEach((e) => { e.textContent = T(e.dataset.t); }); $('sunlabel').textContent = T('sun'); $('lang').textContent = lang === 'pl' ? 'EN' : 'PL'; }

// ------------------------------------------------------------------ renderer
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
let pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
renderer.setPixelRatio(pixelRatio); renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(56, window.innerWidth / window.innerHeight, 0.12, 6000);

const rt = new THREE.WebGLRenderTarget(window.innerWidth * pixelRatio, window.innerHeight * pixelRatio, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new ShaderPass({ uniforms: { tDiffuse: { value: null } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); c.rgb = min(max(c.rgb, 0.0), 60.0); if (!(c.r + c.g + c.b < 1e5)) c.rgb = vec3(0.0); gl_FragColor = vec4(c.rgb, 1.0); }' }));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.3, 0.75, 0.95); composer.addPass(bloom);
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uFade: { value: 1 }, uVig: { value: 0.9 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uFade, uVig; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tDiffuse, vUv); vec2 q = vUv - 0.5; float v = 1.0 - dot(q, q) * uVig; c.rgb *= v * v;
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722)); c.rgb = mix(vec3(l), c.rgb, 1.26); c.rgb = max(c.rgb, 0.0) * (1.0 - uFade); gl_FragColor = c; }`,
});
composer.addPass(grade); composer.addPass(new OutputPass());
function resize() { const w = Math.max(2, window.innerWidth), h = Math.max(2, window.innerHeight); camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setPixelRatio(pixelRatio); renderer.setSize(w, h); composer.setPixelRatio(pixelRatio); composer.setSize(w, h); }
window.addEventListener('resize', resize);

// ------------------------------------------------------------------ state
const audio = new AudioSys();
const G = { mode: 'load', t: 0, time: 0, relics: new Set(), cp: 0, shake: 0, fade: 1, fadeTo: 0, respawn: 0, ct: 0, dtLog: [], hints: new Set(), places: new Set(), tun: 0, lit: false, blend: 1, needT: 0 };
const P = { pos: new THREE.Vector3(0, 5.3, 24.6), vel: new THREE.Vector3(), yaw: Math.PI, grounded: true, coyote: 0, jumpBuf: 0, onBridge: false, bu: 0, bx0: 0, speed: 0, sit: 0, ctrlYaw: 0 };
const cam = { yaw: 0, pitch: 0.24, dist: 4.4, d: 4.4, manual: 0, pos: new THREE.Vector3(), look: new THREE.Vector3() };
const keys = {}; const syn = { x: 0, y: 0, jump: false, sprint: false, camYaw: 0 };
let world, sky, dog, puppies = [], pAdd, pAlpha, blob, flies = [], orbs = [];
const CPS = [{ z: 1e9, p: [0, 5.3, 24.6] }, { z: -36, p: [0, 0.3, -41] }, { z: -96.6, p: [0, 0.4, -100] }, { z: -134.8, p: [0, 9.2, -139] }, { z: -208.5, p: [0, 9.2, -212] }];

// ------------------------------------------------------------------ input
window.addEventListener('keydown', (e) => {
  if (e.repeat) return; keys[e.code] = true;
  if (e.code === 'Space') { P.jumpBuf = 0.14; e.preventDefault(); }
  if (e.code === 'KeyH' && G.mode === 'play') { audio.bark(); dog.bark(); }
  if (e.code === 'KeyP') document.body.classList.toggle('clean');
  if (e.code === 'KeyM' && audio.on) audio.toggleMusic();
  if (e.code === 'Enter' && G.mode === 'title') startGame();
  if (e.code.startsWith('Arrow')) e.preventDefault();
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
// camera: drag with the mouse (pointer events) or one finger, pinch with two fingers to zoom (touch events – see below)
const ptrs = new Map(); let pinch = 0;
function lookStart(id, x, y) { ptrs.set(id, { x, y }); pinch = 0; }
function lookEnd(id) { ptrs.delete(id); pinch = 0; }
function lookMove(id, x, y, k) {
  const p = ptrs.get(id); if (!p) return;
  const dx = x - p.x, dy = y - p.y; p.x = x; p.y = y;
  if (G.mode !== 'play') return;
  if (ptrs.size >= 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch) cam.dist = clamp(cam.dist - (d - pinch) * 0.012, 2.4, 8); pinch = d; return; }
  cam.yaw -= dx * 0.005 * k; cam.pitch = clamp(cam.pitch + dy * 0.004 * k, -0.25, 1.1); cam.manual = 2.5;
}
canvas.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') return; lookStart(e.pointerId, e.clientX, e.clientY); try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* synthetic pointer */ } });
canvas.addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch') lookMove(e.pointerId, e.clientX, e.clientY, 1); });
const ptrEnd = (e) => { if (e.pointerType !== 'touch') lookEnd(e.pointerId); };
canvas.addEventListener('pointerup', ptrEnd); canvas.addEventListener('pointercancel', ptrEnd);
canvas.addEventListener('wheel', (e) => { cam.dist = clamp(cam.dist + e.deltaY * 0.004, 2.4, 8); }, { passive: true });
function readInput() {
  const x = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + syn.x + touch.x;
  const y = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) + syn.y + touch.y;
  return { x: clamp(x, -1, 1), y: clamp(y, -1, 1), sprint: !!(keys.ShiftLeft || keys.ShiftRight || syn.sprint || touch.sprint), cy: (keys.KeyQ ? 1 : 0) - (keys.KeyE ? 1 : 0) + syn.camYaw };
}

// touch controls: a floating stick under the left thumb, buttons under the right one
function enableTouch() { if (touch.on) return; touch.on = true; document.body.classList.add('touch'); applyLang(); }
if (matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && matchMedia('(hover: none)').matches)) enableTouch();
window.addEventListener('touchstart', enableTouch, { once: true, passive: true });
// Everything here uses touch events, not pointer events: every finger keeps reporting to the element it landed on,
// so the stick, a button and the camera can be held at the same time on every phone browser.
{
  const zone = $('joyZone'), base = $('joy'), knob = $('joyKnob'), R = 50, NP = { passive: false }; let id = null, ox = 0, oy = 0;
  const each = (e, fn) => { e.preventDefault(); for (const t of e.changedTouches) fn(t); };
  const set = (dx, dy) => {
    const l = Math.hypot(dx, dy), k = l > R ? R / l : 1, m = Math.min(1, l / R); dx *= k; dy *= k;
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    touch.x = m < 0.18 ? 0 : dx / R; touch.y = m < 0.18 ? 0 : -dy / R; touch.sprint = m > 0.86; base.classList.toggle('run', touch.sprint);
  };
  zone.addEventListener('touchstart', (e) => each(e, (t) => {
    if (id !== null) return; id = t.identifier;
    const r = zone.getBoundingClientRect(); ox = t.clientX; oy = t.clientY;
    base.style.left = (ox - r.left) + 'px'; base.style.top = (oy - r.top) + 'px'; base.classList.add('act'); set(0, 0);
  }), NP);
  zone.addEventListener('touchmove', (e) => each(e, (t) => { if (t.identifier === id) set(t.clientX - ox, t.clientY - oy); }), NP);
  const end = (e) => each(e, (t) => { if (t.identifier !== id) return; id = null; base.classList.remove('act'); base.style.left = base.style.top = ''; set(0, 0); });
  zone.addEventListener('touchend', end, NP); zone.addEventListener('touchcancel', end, NP);
  const tap = (el, fn) => {
    const b = $(el), up = (e) => { e.preventDefault(); b.classList.remove('down'); };
    b.addEventListener('touchstart', (e) => { e.preventDefault(); b.classList.add('down'); fn(); }, NP);
    b.addEventListener('touchend', up, NP); b.addEventListener('touchcancel', up, NP);
  };
  tap('bJump', () => { P.jumpBuf = 0.14; });
  tap('bBark', () => { if (G.mode === 'play') { audio.bark(); dog.bark(); } });
  tap('bMusic', () => { if (audio.on) $('bMusic').classList.toggle('off', !audio.toggleMusic()); });
  canvas.addEventListener('touchstart', (e) => each(e, (t) => lookStart('t' + t.identifier, t.clientX, t.clientY)), NP);
  canvas.addEventListener('touchmove', (e) => each(e, (t) => lookMove('t' + t.identifier, t.clientX, t.clientY, 1.5)), NP);
  const lEnd = (e) => each(e, (t) => lookEnd('t' + t.identifier));
  canvas.addEventListener('touchend', lEnd, NP); canvas.addEventListener('touchcancel', lEnd, NP);
  $('touch').addEventListener('contextmenu', (e) => e.preventDefault());
  for (const g of ['gesturestart', 'gesturechange']) document.addEventListener(g, (e) => e.preventDefault());   // iOS page zoom
}

// ------------------------------------------------------------------ HUD
let hintT = 0, pickT = 0;
function hint(key, once = true, ...a) { if (once) { if (G.hints.has(key)) return; G.hints.add(key); } $('hint').textContent = T(key, ...a); $('hint').style.opacity = 1; hintT = 5.5; }
// location title card: the name sweeps in between two golden lines, once per place
const PLACES = { street: 'Ulica Pogodna', bridge: 'Most Serocki', stairs: 'Kazikowe Schody', tunnel: 'Tunel Stasia', gate: 'Roszczeńskie Wrota', temple: 'Świątynia Piszczykowska' };
function place(id) {
  if (G.places.has(id)) return; G.places.add(id);
  const el = $('place'); $('placeKind').textContent = T('k_' + id); $('placeName').textContent = PLACES[id];
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); audio.placeChime();
}
function pickMsg(key) { $('pick').textContent = T(key); $('pick').style.opacity = 1; pickT = 3; }
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// ------------------------------------------------------------------ boot
async function boot() {
  applyLang();
  await new Promise((r) => setTimeout(r, 30));
  const tex = createTextures();
  world = buildWorld(scene, tex); if (HQ) buildHQ();
  sky = buildSky(scene, renderer);
  dog = buildDog(tex, { lantern: true }); scene.add(dog.root); if (HQ) addFur(dog.root, DOG_FUR);
  for (let i = 0; i < 5; i++) {
    const d = buildDog(tex, { scale: 0.43, head: 1.3, leg: 0.8, ear: 1.15, snout: 0.72 });
    d.root.position.set(-2.4 + i * 1.2, 9.9, -269 - (i % 2) * 2.2); d.root.rotation.y = 0; d.root.visible = false; scene.add(d.root);
    puppies.push({ d, pos: d.root.position, vy: 0, state: 'wait', delay: 0.4 + i * 0.45, ang: -1.9 + i * 0.95 + (Math.random() - 0.5) * 0.3, rad: 1.5 + (i % 2) * 0.7, hopT: Math.random() * 2, speed: 0, yaw: 0 });
  }
  pAdd = new Particles(1400, true); pAlpha = new Particles(900, false); scene.add(pAdd.mesh); scene.add(pAlpha.mesh);
  blob = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.ShaderMaterial({ transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec2 vUv; void main(){ float d = length(vUv - 0.5) * 2.0; gl_FragColor = vec4(0.0, 0.0, 0.0, smoothstep(1.0, 0.2, d) * 0.4); }' }));
  blob.rotation.x = -Math.PI / 2; blob.renderOrder = 2; scene.add(blob);
  const flyM = new THREE.MeshBasicMaterial({ color: 0x050505 });
  for (let i = 0; i < 10; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.022, 5, 4), flyM); scene.add(f); flies.push({ f, a: Math.random() * 6, s: 2 + Math.random() * 3, r: 0.3 + Math.random() * 0.5, h: Math.random() * 6 }); }
  for (let i = 0; i < world.relics.length; i++) { const o = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), new THREE.MeshBasicMaterial({ color: world.relics[i].color.clone().multiplyScalar(4) })); o.visible = false; scene.add(o); orbs.push(o); }
  dog.root.position.copy(P.pos); dog.root.rotation.y = P.yaw;
  // compile every shader up front (puppies, relic orbs, falling planks) so nothing hitches mid-game
  // ...and really draw the whole level once behind the loading screen, so shaders, textures and meshes are already on the graphics card
  // when the title appears (otherwise the first visible frame takes ~2 s and each new area stutters the first time it is seen)
  {
    const hid = [...puppies.map((p) => p.d.root), ...orbs]; hid.forEach((o) => { o.visible = true; });
    world.update(0.016, 0, P);
    const poses = [[0, 6, 30, 0, 3, -40], [0, 3, -44, 0, -6, -100], [0, 4, -104, 0, 8, -136], [0, 10.4, -152, 6, 10, -170], [0, 10.4, -192, -6, 10, -206], [0, 11, -214, 0, 14, -262],
      [0, 11.5, -257, 0, 12, -272], [17, 12, -228, -15, 10, -236], [-4, 2, -98, -4.2, 1, -103], [titleCam.pos.x, titleCam.pos.y, titleCam.pos.z, titleCam.look.x, titleCam.look.y, titleCam.look.z]];
    for (const q of poses) { camera.position.set(q[0], q[1], q[2]); camera.lookAt(q[3], q[4], q[5]); camera.updateMatrixWorld(); sky.update(0, 0, camera, camera.position, 0, world); renderer.shadowMap.needsUpdate = true; composer.render(0.016); }
    renderer.getContext().finish();
    hid.forEach((o) => { o.visible = false; });
  }
  G.mode = 'title'; G.fadeTo = 0;
  $('loading').style.opacity = 0; setTimeout(() => $('loading').remove(), 1100);
  $('title').classList.remove('hidden');
  $('start').addEventListener('click', startGame);
  $('lang').addEventListener('click', () => { lang = lang === 'pl' ? 'en' : 'pl'; applyLang(); });
  $('again').addEventListener('click', () => location.reload());
  window.__latka = { dog, composer, bloom, G, P, cam, syn, keys, world, sky, camera, renderer, scene, H, startGame, audio, DAY, tp: (x, y, z) => { P.pos.set(x, y, z); P.vel.set(0, 0, 0); }, titleCam };
  window.__latka.goTo = (x, z, o = {}) => new Promise((res) => {
    const t0 = performance.now(), max = o.max || 20000;
    const iv = setInterval(() => {
      const dx = x - P.pos.x, dz = z - P.pos.z, d = Math.hypot(dx, dz);
      if (d < (o.r || 0.5) || performance.now() - t0 > max || G.mode !== 'play') { clearInterval(iv); syn.x = syn.y = 0; syn.sprint = false; res({ x: +P.pos.x.toFixed(2), y: +P.pos.y.toFixed(2), z: +P.pos.z.toFixed(2), ok: d < (o.r || 0.5), mode: G.mode }); return; }
      const fx = -Math.sin(P.ctrlYaw), fz = -Math.cos(P.ctrlYaw), rx = Math.cos(P.ctrlYaw), rz = -Math.sin(P.ctrlYaw);
      syn.y = (dx * fx + dz * fz) / d; syn.x = (dx * rx + dz * rz) / d; syn.sprint = !!o.sprint;
      if (o.jumpAt) for (const j of o.jumpAt) if (!j.done && P.pos.z < j.z) { j.done = true; syn.jump = true; }
    }, 16);
  });
  // deterministic fast-forward for playtesting: steps the real game loop without waiting for the display
  window.__latka.sim = (secs, x, z, o = {}) => {
    const n = Math.round(secs * 60); let ok = false, i = 0;
    for (; i < n; i++) {
      if (x !== undefined && x !== null) {
        const dx = x - P.pos.x, dz = z - P.pos.z, d = Math.hypot(dx, dz);
        if (d < (o.r || 0.5) || G.mode !== 'play') { ok = d < (o.r || 0.5); break; }
        const fx = -Math.sin(P.ctrlYaw), fz = -Math.cos(P.ctrlYaw), rx = Math.cos(P.ctrlYaw), rz = -Math.sin(P.ctrlYaw);
        syn.y = (dx * fx + dz * fz) / d; syn.x = (dx * rx + dz * rz) / d; syn.sprint = !!o.sprint;
        if (o.jumpAt) for (const j of o.jumpAt) if (!j.done && P.pos.z < j.z) { j.done = true; syn.jump = true; }
      }
      frame(performance.now(), 1 / 60);
    }
    syn.x = syn.y = 0; syn.sprint = false; last = performance.now();
    return { x: +P.pos.x.toFixed(2), y: +P.pos.y.toFixed(2), z: +P.pos.z.toFixed(2), ok, t: +(i / 60).toFixed(1), mode: G.mode, cp: G.cp, relics: [...G.relics], day: +G.t.toFixed(0) };
  };
  // dev helper: close-up renders of Łatka's head saved to ./renders (needs server.py)
  window.__latka.shots = async (W = 1100, Hh = 825) => {
    for (let i = 0; i < 40; i++) window.__latka.sim(0.05);
    camera.aspect = W / Hh; camera.updateProjectionMatrix(); renderer.setPixelRatio(1.5); renderer.setSize(W, Hh, false); composer.setPixelRatio(1.5); composer.setSize(W, Hh);
    const h = dog.head.getWorldPosition(new THREE.Vector3()), f = new THREE.Vector3(0, 0, 1).applyQuaternion(dog.head.getWorldQuaternion(new THREE.Quaternion())); f.y = 0; f.normalize();
    const r = new THREE.Vector3(f.z, 0, -f.x), out = {};
    const list = { glowa_przod: [0, 0.06, 0.8], glowa_trzy_czwarte: [0.5, 0.1, 0.62], glowa_bok: [0.85, 0.04, 0.1], glowa_bok_lewy: [-0.85, 0.04, 0.1], cala_latka: [1.5, 0, 1.0] };
    for (const [name, o] of Object.entries(list)) {
      camera.position.set(h.x + r.x * o[0] + f.x * o[2], h.y + o[1], h.z + r.z * o[0] + f.z * o[2]);
      if (name === 'cala_latka') camera.lookAt(h.x - f.x * 0.2, h.y - 0.3, h.z - f.z * 0.2); else camera.lookAt(h.x + f.x * 0.06, h.y - 0.02, h.z + f.z * 0.06);
      camera.updateMatrixWorld(); renderer.shadowMap.needsUpdate = true; composer.render(0.016);
      out[name] = (await fetch('/save-render?name=' + name, { method: 'POST', body: renderer.domElement.toDataURL('image/png') })).status;
    }
    return out;
  };
  // scripted route used for automated playthroughs (plays the level with the normal controls)
  window.__latka.playTo = (stage) => {
    const S = window.__latka.sim, log = [], go = (x, z, o) => { const r = S(25, x, z, o); log.push([r.x, r.y, r.z, r.ok ? 1 : 0]); return r; };
    const order = ['arch', 'bridge', 'break', 'landing', 'stairs', 'mouth', 'tunnel', 'sock', 'court', 'mirror', 'door'], upto = order.indexOf(stage);
    if (G.mode === 'title') { startGame(); S(4.5); }
    const steps = [
      () => { go(0, -20); go(world.ballPos.x - 0.4, world.ballPos.z + 0.4, { r: 0.5 }); go(0, -36); go(0, -43.5); },
      () => { go(0, -49.5); go(0, -64, { r: 0.9 }); },
      () => { go(0, -77, { r: 0.6 }); S(0.7); },
      () => { go(0, -100, { r: 0.6 }); go(-2.9, -102.6, { r: 0.5 }); go(0, -105, { r: 0.6 }); go(0, -108.6, { r: 0.4 }); },
      () => { go(0, -136.5, { r: 0.6, jumpAt: [{ z: -115.35 }, { z: -122.75 }] }); },
      () => { go(0, -143.5, { r: 0.6 }); },
      () => { for (const s of [0.04, 0.12, 0.2, 0.28]) { const F = world.tunnelFrame(s); go(F.cx, F.z, { r: 0.7 }); } },
      () => { for (const s of [0.36, 0.44]) { const F = world.tunnelFrame(s); go(F.cx, F.z, { r: 0.7 }); } go(world.sockPos.x - 1.2, world.sockPos.z + 0.6); },
      () => { for (const s of [0.6, 0.7, 0.8, 0.9, 0.98]) { const F = world.tunnelFrame(s); go(F.cx, F.z, { r: 0.7 }); } go(0, -213, { r: 0.7 }); },
      () => { go(12.5, -233, { r: 0.6 }); go(15.8, -233, { r: 0.4 }); go(10, -234, { r: 0.6 }); go(-13.7, -235.6, { r: 0.5 }); },
      () => { go(-6, -240, { r: 0.6 }); go(0, -246, { r: 0.6 }); },
    ];
    for (let i = (window.__latka.done || 0); i <= upto; i++) steps[i]();
    window.__latka.done = upto + 1;
    return { log, mode: G.mode, relics: [...G.relics], day: +G.t.toFixed(0), cp: G.cp };
  };
  last = performance.now(); G.dtLog.length = 0;
  renderer.setAnimationLoop(frame);
}

function startGame() {
  if (G.mode !== 'title') return;
  audio.start(); G.mode = 'play'; G.blend = 0;
  $('title').classList.add('hidden'); $('relics').style.opacity = 1; $('sun').style.opacity = 1;
  setTimeout(() => hint('h_start'), 1800);
}

// ------------------------------------------------------------------ player
const info = {};
function respawn() { const c = CPS[G.cp].p; P.pos.set(c[0], c[1], c[2]); P.vel.set(0, 0, 0); P.yaw = Math.PI; P.grounded = false; cam.yaw = 0; cam.manual = 0; P.ctrlYaw = 0; }
function updatePlayer(dt, inp) {
  // on the bridge "forward" always means along the bridge, so the camera is free to swing out toward the waterfall
  { const want = P.onBridge && cam.manual <= 0 ? 0 : cam.yaw; let dy = want - P.ctrlYaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); P.ctrlYaw += dy * Math.min(1, dt * (P.onBridge ? 6 : 4 + 20 * Math.min(1, Math.abs(dy) < 0.5 ? 1 : 0.15))); }
  const fx = -Math.sin(P.ctrlYaw), fz = -Math.cos(P.ctrlYaw), rx = Math.cos(P.ctrlYaw), rz = -Math.sin(P.ctrlYaw);
  let mx = fx * inp.y + rx * inp.x, mz = fz * inp.y + rz * inp.x; const ml = Math.hypot(mx, mz);
  const maxS = inp.sprint ? 7.6 : 4.3; if (ml > 0.01) { mx /= ml; mz /= ml; } else { mx = mz = 0; }
  const a = 1 - Math.exp(-(P.grounded ? 12 : 3.2) * dt);
  P.vel.x += (mx * maxS - P.vel.x) * a; P.vel.z += (mz * maxS - P.vel.z) * a;
  P.coyote = P.grounded ? 0.12 : P.coyote - dt; P.jumpBuf -= dt; if (syn.jump) { P.jumpBuf = 0.14; syn.jump = false; }
  if (P.jumpBuf > 0 && P.coyote > 0) { P.vel.y = 7.7; P.grounded = false; P.coyote = 0; P.jumpBuf = 0; audio.jump(); }
  P.vel.y = Math.max(P.vel.y - 21 * dt, -45);
  const dxm = P.vel.x * dt, dzm = P.vel.z * dt, dl = Math.hypot(dxm, dzm), y = P.pos.y;
  if (dl > 1e-6) {
    const nx = dxm / dl, nz = dzm / dl;
    if (!world.blocked(P.pos.x + dxm, P.pos.z + dzm, y, nx, nz)) { P.pos.x += dxm; P.pos.z += dzm; }
    else if (Math.abs(dxm) > 1e-6 && !world.blocked(P.pos.x + dxm, P.pos.z, y, Math.sign(dxm), 0)) { P.pos.x += dxm; P.vel.z *= 0.6; }
    else if (Math.abs(dzm) > 1e-6 && !world.blocked(P.pos.x, P.pos.z + dzm, y, 0, Math.sign(dzm))) { P.pos.z += dzm; P.vel.x *= 0.6; }
    else { P.vel.x *= 0.3; P.vel.z *= 0.3; }
  }
  for (const c of world.circles) { if (!c.on || y > c.top) continue; const dx = P.pos.x - c.x, dz = P.pos.z - c.z, d = Math.hypot(dx, dz), r = c.r + 0.22; if (d < r && d > 1e-4) { P.pos.x = c.x + dx / d * r; P.pos.z = c.z + dz / d * r; } }
  // rope rails keep Łatka on the deck; the deck carries her as it sways
  const br = world.bridge;
  if (P.pos.z < L.BR_Z0 && P.pos.z > L.BR_Z1 && P.pos.y > -4) {
    const u = br.uOf(P.pos.z), cxb = br.deckX(u);
    if (Math.abs(P.pos.x - cxb) < 1.4) { if (P.onBridge) P.pos.x += cxb - P.bx0; P.pos.x = clamp(P.pos.x, cxb - 0.8, cxb + 0.8); }
    P.bx0 = cxb; P.bu = u;
  }
  const prevY = P.pos.y; P.pos.y += P.vel.y * dt;
  const wasG = P.grounded, g = world.groundAt(P.pos.x, P.pos.z, prevY, info);
  if (P.pos.y <= g || (wasG && P.vel.y <= 0 && P.pos.y - g < 0.34)) {
    if (!wasG && P.vel.y < -7) { audio.land(); dust(P.pos.x, g, P.pos.z, 6); }
    P.pos.y = g; P.vel.y = 0; P.grounded = true; P.onBridge = info.kind === 2;
    if (info.kind === 1 && info.ref.step) world.stairs.touch(info.ref.step);
  } else { P.grounded = false; P.onBridge = false; }
  P.speed = Math.hypot(P.vel.x, P.vel.z);
  if (ml > 0.01) { let dy = Math.atan2(mx, mz) - P.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); P.yaw += dy * (1 - Math.exp(-11 * dt)); }
}

// ------------------------------------------------------------------ particles helpers
const rnd = (a = 1) => (Math.random() - 0.5) * 2 * a;
// ---- high-quality extras: blades of grass, shafts of evening light between the trees, butterflies, birds, falling leaves
const hq = { beams: [], flies: [], birds: null, birdT: 6 };
const _up = new THREE.Vector3(0, 1, 0);
function buildHQ() {
  let seed = 7; const R = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }, pos = [], col = [], tip = [], nor = [];
  const free = (x, z) => !world.boxes.some((b) => x > b.x0 - 0.3 && x < b.x1 + 0.3 && z > b.z0 - 0.3 && z < b.z1 + 0.3) && !world.circles.some((c) => (x - c.x) ** 2 + (z - c.z) ** 2 < (c.r + 0.2) ** 2);
  for (let i = 0, n = matchMedia('(pointer: coarse)').matches ? 20000 : 52000; i < n; i++) {
    const z = 30 - R() * 292, x = (R() - 0.5) * 34; if ((z < L.G0 + 3 && z > L.G1 - 3) || (z < -138 && z > -214)) continue;                 // not over the gorge, not in the tunnel
    const y = H(x, z); if (y < L.WATER_Y + 0.6 || Math.abs(x - pathX(z)) < 2.1 || Math.abs(H(x + 0.8, z) - H(x - 0.8, z)) > 0.9 || Math.abs(H(x, z + 0.8) - H(x, z - 0.8)) > 0.9 || !free(x, z)) continue;
    const k = 0.55 + R() * 0.7;
    for (let j = 0; j < 3; j++) { const a = R() * 6.28, h = 0.14 + R() * 0.22, w = 0.024 + R() * 0.022, bx = x + (R() - 0.5) * 0.22, bz = z + (R() - 0.5) * 0.22, lx = (R() - 0.5) * 0.14, lz = (R() - 0.5) * 0.14, c = Math.cos(a) * w, sn = Math.sin(a) * w, cr = 0.075 * k, cg = 0.2 * k, cb = 0.035 * k;
      for (const fl of [0, 1]) { if (fl) pos.push(bx + c, y, bz + sn, bx - c, y, bz - sn, bx + lx, y + h, bz + lz); else pos.push(bx - c, y, bz - sn, bx + c, y, bz + sn, bx + lx, y + h, bz + lz); col.push(cr * 0.55, cg * 0.55, cb * 0.55, cr * 0.55, cg * 0.55, cb * 0.55, cr * 1.4, cg * 1.45, cb * 1.2); tip.push(0, 0, 1); nor.push(0, 1, 0, 0, 1, 0, 0, 1, 0); } }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('aTip', new THREE.Float32BufferAttribute(tip, 1));
  const gm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
  gm.onBeforeCompile = (sh) => { sh.uniforms.uTimeB = world.U.uTime; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aTip; uniform float uTimeB;').replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.xz += aTip * 0.06 * vec2(sin(uTimeB * 1.8 + position.x * 0.9 + position.z * 0.6), cos(uTimeB * 1.3 + position.z * 0.8 - position.x * 0.4));'); };
  const grass = new THREE.Mesh(g, gm); grass.receiveShadow = true; grass.frustumCulled = false; scene.add(grass);
  for (const [x, z, r] of [[-7, -6, 1.5], [6, -17, 1.9], [-3, -29, 1.4], [8, -37, 1.7], [-10, 10, 2.0], [-7, -101, 1.5], [5, -107, 1.3], [-11, -228, 1.9], [10, -241, 1.6], [2, -222, 1.4]]) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.75, r, 34, 14, 1, true), beamMaterial(0xffd9a0, 0.2, world.U.uTime)); m.renderOrder = 8; m.frustumCulled = false; scene.add(m); hq.beams.push({ m, x, y: H(x, z), z });
  }
  const WING = [0xf39a2a, 0xf4f1e6, 0x5aa0e8, 0xf2d24a, 0xe8607a];
  for (let i = 0; i < 9; i++) { const grp = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color: WING[i % 5], side: THREE.DoubleSide }), mk = (sd) => { const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.05, sd * 0.11, 0, -0.09, sd * 0.09, 0, 0.05, 0, 0, -0.05, sd * 0.09, 0, 0.05, 0, 0, 0.06], 3)); return new THREE.Mesh(wg, mat); }, wl = mk(-1), wr = mk(1); grp.add(wl, wr); grp.visible = false; scene.add(grp); hq.flies.push({ grp, wl, wr, cx: 0, cz: 99, ph: i * 2.3 }); }
  hq.birds = new THREE.Group(); const bm = new THREE.MeshBasicMaterial({ color: 0x14100e, side: THREE.DoubleSide });
  for (let i = 0; i < 7; i++) { const b = new THREE.Group(), mk = (sd) => { const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.25, sd * 1.1, 0, 0.1, 0, 0, 0.3], 3)); return new THREE.Mesh(wg, bm); }; b.add(mk(-1), mk(1)); const k = Math.ceil(i / 2), sd = i % 2 ? 1 : -1; b.position.set(sd * k * 1.9, (i % 3) * 0.4, k * 1.6); hq.birds.add(b); }
  hq.birds.visible = false; scene.add(hq.birds);
}
function hqStep(dt) {
  const sd = sky.sunDir, day = (1 - sm(0.3, 0.8, sky.night)) * sm(0.02, 0.12, sd.y), open = G.tun < 0.25;
  for (const b of hq.beams) { b.m.visible = day > 0.02; if (!b.m.visible) continue; b.m.material.uniforms.uStrength.value = 0.2 * day; b.m.quaternion.setFromUnitVectors(_up, sd); b.m.position.set(b.x + sd.x * 17, b.y + sd.y * 17 - 0.3, b.z + sd.z * 17); }
  if (open && Math.random() < dt * 5) { const y = Math.random() < 0.5; pAlpha.spawn(P.pos.x + rnd(14), P.pos.y + 4 + Math.random() * 6, P.pos.z + rnd(14), rnd(0.5), -0.8 - Math.random() * 0.6, rnd(0.5), 6, 0.11, 0.11, y ? 0.7 : 0.3, y ? 0.5 : 0.46, 0.12, 0.9, 0.1, 0.5); }      // leaves coming down
  for (const f of hq.flies) {
    if ((f.cx - P.pos.x) ** 2 + (f.cz - P.pos.z) ** 2 > 22 * 22) { f.cx = P.pos.x + rnd(11); f.cz = P.pos.z + rnd(11); }
    f.grp.visible = open && sky.night < 0.45; if (!f.grp.visible) continue; const t = G.time, x = f.cx + Math.sin(t * 0.7 + f.ph) * 1.7, z = f.cz + Math.cos(t * 0.5 + f.ph * 2) * 1.7;
    f.grp.position.set(x, Math.max(H(x, z), P.pos.y - 0.5) + 0.9 + Math.sin(t * 1.3 + f.ph) * 0.45, z); f.grp.rotation.y = t * 0.6 + f.ph; const w = Math.sin(t * 19 + f.ph) * 1.0; f.wl.rotation.z = w; f.wr.rotation.z = -w;
  }
  hq.birdT -= dt; if (hq.birdT <= 0 && !hq.birds.visible && sky.night < 0.6) { hq.birds.visible = true; hq.birds.userData = { t: 0, z: P.pos.z - 40 - Math.random() * 50, dir: Math.random() < 0.5 ? 1 : -1 }; }
  if (hq.birds.visible) { const u = hq.birds.userData; u.t += dt; hq.birds.position.set(-150 * u.dir + u.t * 13 * u.dir, P.pos.y + 34 + Math.sin(u.t * 0.4) * 3, u.z - u.t * 2); hq.birds.rotation.y = u.dir > 0 ? -Math.PI / 2 : Math.PI / 2; hq.birds.children.forEach((b, i) => { const w = Math.sin(G.time * 7 + i) * 0.6; b.children[0].rotation.z = -w; b.children[1].rotation.z = w; }); if (u.t > 24) { hq.birds.visible = false; hq.birdT = 14 + Math.random() * 18; } }
}
function dust(x, y, z, n, r = 0.5, g = 0.42, b = 0.32) { for (let i = 0; i < n; i++) pAlpha.spawn(x + rnd(0.3), y + 0.1, z + rnd(0.3), rnd(1), 0.4 + Math.random(), rnd(1), 0.9 + Math.random() * 0.6, 0.25, 1.1, r, g, b, 0.28, 0, 1.5); }
function sparkle(pos, col, n, sp = 2.5) { for (let i = 0; i < n; i++) pAdd.spawn(pos.x + rnd(0.2), pos.y + rnd(0.2), pos.z + rnd(0.2), rnd(sp), rnd(sp) + 1, rnd(sp), 0.6 + Math.random() * 0.9, 0.16, 0.02, col.r * 5, col.g * 5, col.b * 5, 1, 3, 1.2); }
function splash(pos, s = 1) {
  const f = world.water.uFoam.value;
  for (let i = 0; i < 26 * s; i++) pAlpha.spawn(pos.x + rnd(0.8 * s), L.WATER_Y + 0.2, pos.z + rnd(0.8 * s), rnd(3 * s), 3 + Math.random() * 6 * s, rnd(3 * s), 1 + Math.random() * 0.8, 0.5 * s, 2.2 * s, f.r, f.g, f.b, 0.6, 12, 0.6);
}
let acc = { mist: 0, fire: 0, glit: 0, mote: 0, fly: 0, rmist: 0, wisp: 0, ddust: 0 };
function emitters(dt) {
  const f = world.water.uFoam.value, cp = camera.position, night = sky.night, tun = G.tun;
  // waterfall
  if (cp.distanceTo(world.fallBase) < 260) {
    acc.mist += dt * 34; while (acc.mist > 1) { acc.mist--; pAlpha.spawn(72 + rnd(3.5), L.WATER_Y + 0.5 + Math.random() * 2, -80 + rnd(6), -1.5 + rnd(1.6), 1.8 + Math.random() * 3.2, rnd(1.4), 4 + Math.random() * 3.5, 4, 15 + Math.random() * 8, f.r * 1.15, f.g * 1.15, f.b * 1.15, 0.2, -0.12, 0.35);
      if (Math.random() < 0.5) pAlpha.spawn(75.5 + rnd(1.5), 20 - Math.random() * 50, -80 + rnd(4.5), -1 + rnd(0.6), -6, rnd(0.6), 1.6, 1.5, 5, f.r, f.g, f.b, 0.16, 6, 0.2); }
    acc.rmist += dt * 2.2; while (acc.rmist > 1) { acc.rmist--; pAlpha.spawn(-25 + Math.random() * 90, L.WATER_Y + 1.5, -72 + rnd(15), -0.9, 0.15, 0.2, 10, 12, 26, f.r, f.g, f.b, 0.055, 0, 0); }
  }
  // fires
  let dFire = 1e9;
  for (const fr of world.fires) {
    const d = cp.distanceTo(fr.pos); dFire = Math.min(dFire, d);
    fr.light.intensity = (40 + 22 * night) * (0.8 + 0.2 * Math.sin(G.time * 17 + fr.pos.x) + 0.12 * Math.sin(G.time * 31));
    if (d > 120) continue;
    for (let i = 0; i < Math.round(dt * 70 + Math.random()); i++) pAdd.spawn(fr.pos.x + rnd(0.4), fr.pos.y + Math.random() * 0.2, fr.pos.z + rnd(0.4), rnd(0.3), 1.5 + Math.random() * 1.6, rnd(0.3), 0.4 + Math.random() * 0.5, 0.48, 0.08, 2.4, 0.62, 0.07, 0.4, -0.8, 0.2);
    if (Math.random() < dt * 7) pAdd.spawn(fr.pos.x + rnd(0.3), fr.pos.y + 0.5, fr.pos.z + rnd(0.3), rnd(0.8), 2 + Math.random() * 2, rnd(0.8), 1.5 + Math.random(), 0.07, 0.03, 6, 2.2, 0.4, 1, -0.3, 0.4);
  }
  G.dFire = dFire;
  // relics
  acc.glit += dt * 16; while (acc.glit > 1) {
    acc.glit--;
    for (const r of world.relics) {
      if (r.got || cp.distanceTo(r.pos) > 90) continue;
      if (r.id === 'sock') { pAdd.spawn(r.pos.x + rnd(0.4), r.pos.y + Math.random() * 0.5, r.pos.z + rnd(0.4), rnd(0.15), 0.35 + Math.random() * 0.4, rnd(0.15), 2.4, 0.3, 1.1, 0.25, 1.3, 0.12, 0.2, 0, 0.2); }
      else { const c = r.color; pAdd.spawn(r.pos.x + rnd(0.75), r.pos.y + rnd(0.75), r.pos.z + rnd(0.75), rnd(0.3), 0.3 + rnd(0.3), rnd(0.3), 0.5 + Math.random() * 0.6, 0.02, 0.13 + Math.random() * 0.08, c.r * 6, c.g * 6, c.b * 6, 1, 0, 0); }
    }
  }
  const sk = world.relics[1];
  flies.forEach((fl) => { fl.f.visible = !sk.got; fl.a += dt * fl.s; fl.f.position.set(sk.pos.x + Math.cos(fl.a) * fl.r, sk.pos.y + 0.35 + Math.sin(fl.a * 1.7 + fl.h) * 0.28, sk.pos.z + Math.sin(fl.a * 1.3) * fl.r); });
  // sunlit motes / lantern dust / fireflies
  acc.mote += dt * 16; while (acc.mote > 1) {
    acc.mote--; const x = P.pos.x + rnd(9), z = P.pos.z + rnd(9) - 2, y = P.pos.y + 0.3 + Math.random() * 3.2;
    if (tun > 0.5) pAdd.spawn(P.pos.x + rnd(2.2), P.pos.y + 0.2 + Math.random() * 1.8, P.pos.z + rnd(2.2), rnd(0.1), rnd(0.08), rnd(0.1), 3.5, 0.03, 0.03, 2.2, 1.3, 0.55, 0.45, 0, 0);
    else if (night < 0.9) { const c = sky.sunColor; pAdd.spawn(x, y, z, rnd(0.15), rnd(0.1), rnd(0.15), 4.5, 0.04, 0.04, c.r * 2.2, c.g * 2.2, c.b * 2.2, 0.5 * (1 - night), 0, 0); }
  }
  if (night > 0.15 && tun < 0.5) { acc.fly += dt * 10 * night; while (acc.fly > 1) { acc.fly--; const x = P.pos.x + rnd(14), z = P.pos.z + rnd(14) - 3; const gy = H(x, z); if (gy < P.pos.y - 4 || gy > P.pos.y + 4) continue; pAdd.spawn(x, gy + 0.3 + Math.random() * 2, z, rnd(0.5), rnd(0.25), rnd(0.5), 3.5, 0.09, 0.09, 2.6, 4.2, 0.7, 1, 0, 0.3); } }
  // lantern embers
  if (dog.light.intensity > 5 && Math.random() < dt * 5) { dog.flame.getWorldPosition(_v); pAdd.spawn(_v.x, _v.y, _v.z, rnd(0.2), 0.5 + Math.random() * 0.5, rnd(0.2), 0.8, 0.05, 0.01, 5, 2, 0.4, 1, -0.3, 0.6); }
  // door dust while it grinds open
  const d = world.door; if (d.open > 0.01 && d.open < 0.98) { acc.ddust += dt * 40; while (acc.ddust > 1) { acc.ddust--; pAlpha.spawn(rnd(3.6), 17.4 - Math.random() * 0.5, -262.2 + rnd(0.5), rnd(0.3), -1.5 - Math.random() * 2, 0.5 + Math.random(), 1.8, 0.5, 2.2, 0.55, 0.48, 0.38, 0.22, 2, 0.5); } }
}
const _v = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3();

// ------------------------------------------------------------------ game logic
function logic(dt) {
  for (const e of world.events) {
    if (e.type === 'snap') { audio.snap(); G.shake = 0.7; G.breakT = 3.6; setTimeout(() => hint('h_break'), 1500); }
    else if (e.type === 'plank') { dust(e.pos.x, e.pos.y, e.pos.z, 3, 0.4, 0.3, 0.2); }
    else if (e.type === 'splash') { splash(e.pos, e.size); audio.splash(0.22); }
    else if (e.type === 'crack') { audio.crack(); G.shake = Math.max(G.shake, 0.15); }
    else if (e.type === 'rubble') { audio.rubble(); dust(e.pos.x, e.pos.y, e.pos.z, 12); }
  }
  world.events.length = 0;
  if (G.mode !== 'play') return;
  const z = P.pos.z;
  // daylight
  G.t += dt; if (G.t >= DAY) { G.mode = 'lose'; audio.night(); $('endTitle').textContent = T('lose'); $('endText').textContent = T('loseText'); $('end').classList.remove('hidden'); return; }
  // checkpoints
  if (P.grounded) for (let i = CPS.length - 1; i > G.cp; i--) if (z < CPS[i].z) { G.cp = i; break; }
  // place names + zone hints
  if (G.t > 4.6 && z < 28) place('street'); if (z < -46.5 && z > -60) place('bridge'); if (z < -103 && z > -112) place('stairs'); if (z < -143.5 && z > -160) place('tunnel'); if (z < -222) place('gate');
  if (z < -44 && z > -60) hint('h_bridge'); if (z < -101 && z > -112) hint('h_stairs'); if (z < -144 && z > -160) hint('h_tunnel'); if (z < -207) hint(G.relics.size === world.relics.length ? 'h_go' : 'h_court');
  // the big moment
  if (P.onBridge && P.bu > 0.56 && !world.bridge.broken) { world.bridge.break(); G.cp = Math.max(G.cp, 2); }
  // falling
  if (G.respawn <= 0 && ((P.pos.y < L.WATER_Y + 0.3) || (z < -108 && z > -135 && P.pos.y < -15))) {
    if (P.pos.y < L.WATER_Y + 1) { splash(P.pos, 1.4); audio.splash(0.5); }
    G.respawn = 0.9; G.fadeTo = 1; hint('h_fall', false);
  }
  if (G.respawn > 0) { G.respawn -= dt; if (G.respawn <= 0.45 && G.fadeTo === 1) { respawn(); G.fadeTo = 0; } }
  // relics
  for (const r of world.relics) {
    if (r.got) continue; const d = Math.hypot(P.pos.x - r.pos.x, P.pos.z - r.pos.z);
    if (d < 1.75 && Math.abs(P.pos.y - r.pos.y) < 3.4) {
      // hide the meshes but keep the light object: removing a light recompiles every shader (visible stutter)
      r.got = true; for (const c of r.g.children) if (!c.isLight) c.visible = false; r.light.intensity = 0; G.relics.add(r.id); $('s-' + r.id).classList.add('got');
      audio.pickup(r.id); sparkle(r.pos, r.color, 60); pickMsg('p_' + r.id); dog.bark(); if (r.id !== 'sock') setTimeout(() => audio.bark(), 350);
      if (G.relics.size === world.relics.length) setTimeout(() => hint('h_go'), 3200);
    }
  }
  // the door
  const dd = Math.hypot(P.pos.x, z + 251);
  if (dd < 7.5 && z > -256) {
    if (G.relics.size === world.relics.length) { G.mode = 'cine'; G.ct = 0; G.winTime = G.t; hint('h_door'); }
    else { G.needT -= dt; if (G.needT <= 0) { hint('h_need', false, G.relics.size); G.needT = 7; } }
  }
}

function cinematic(dt) {
  G.ct += dt; const t = G.ct, door = world.door;
  if (t > 0.5) place('temple');   // the temple's name appears while the relics fly up, just before the door opens
  // Łatka walks to the foot of the steps and sits
  _v.set(0, 9.05, -250.6); const k = Math.min(1, dt * 2.2); P.pos.x += (_v.x - P.pos.x) * k; P.pos.z += (_v.z - P.pos.z) * k; P.pos.y = world.groundAt(P.pos.x, P.pos.z, P.pos.y + 0.3); P.vel.set(0, 0, 0);
  let dy = Math.PI - P.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); P.yaw += dy * Math.min(1, dt * 5);
  P.speed = t < 0.8 ? 2.5 : 0; P.sit = t > 1 ? 1 : 0;
  // relics fly to their sockets
  for (let i = 0; i < orbs.length; i++) {
    const t0 = 1.2 + i * 0.62, o = orbs[i], s = door.sockets[i];
    if (t > t0 && s.lit === 0) {
      const u = clamp((t - t0) / 1.0, 0, 1), e = u * u * (3 - 2 * u); o.visible = true;
      _a.set(P.pos.x, P.pos.y + 0.8, P.pos.z); _b.copy(s.m.position);
      o.position.lerpVectors(_a, _b, e); o.position.y += Math.sin(u * Math.PI) * 3; o.position.x += Math.sin(u * Math.PI) * (i - 2.5) * 1.2;
      const c = s.color; pAdd.spawn(o.position.x, o.position.y, o.position.z, rnd(0.4), rnd(0.4), rnd(0.4), 0.7, 0.3, 0.02, c.r * 5, c.g * 5, c.b * 5, 1, 0, 0);
      if (u >= 1) { s.lit = 1; o.visible = false; audio.chime(i); sparkle(s.m.position, s.color, 40, 3); G.shake = 0.12; }
    }
  }
  if (t > 5.9 && door.target === 0) { door.target = 1; audio.rumble(4.8); for (const p of puppies) p.d.root.visible = true; }
  if (door.target === 1 && door.open < 0.98) G.shake = Math.max(G.shake, 0.1);
  world.chamberLight.intensity = 140 * door.open; world.doorSpill.uStrength.value = 1.1 * sm(0, 0.5, door.open) * (1 - sm(0.7, 1, door.open) * 0.5);
  if (t > 13.8 && G.mode === 'cine') { G.mode = 'win'; audio.fanfare(); $('endTitle').textContent = T('win'); $('endText').textContent = T('winText', fmt(G.winTime)); $('end').classList.remove('hidden'); $('hint').style.opacity = 0; }
}

function updatePuppies(dt) {
  const open = world.door.open;
  for (const p of puppies) {
    if (!p.d.root.visible) continue;
    let sp = 0, happy = 0.6;
    if (p.state === 'wait') { if (open > 0.42) { p.delay -= dt; if (p.delay <= 0) { p.state = 'run'; audio.yip(1.7 + Math.random() * 0.5); } } }
    else {
      const tx = P.pos.x + Math.sin(p.ang) * p.rad, tz = P.pos.z + Math.cos(p.ang) * p.rad + (p.state === 'run' ? 0 : 0);
      const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
      if (p.state === 'run') {
        sp = Math.min(5.2, d * 3 + 1); p.pos.x += dx / d * sp * dt; p.pos.z += dz / d * sp * dt; p.yaw = Math.atan2(dx, dz);
        if (d < 0.25) { p.state = 'play'; audio.yip(1.6 + Math.random() * 0.6); }
      } else {
        happy = 1; p.yaw = Math.atan2(P.pos.x - p.pos.x, P.pos.z - p.pos.z); p.hopT -= dt;
        if (p.hopT <= 0 && p.grounded) { p.vy = 2.6 + Math.random() * 1.6; p.hopT = 0.5 + Math.random() * 1.8; if (Math.random() < 0.4) audio.yip(1.6 + Math.random() * 0.7); if (Math.random() < 0.25) p.ang += rnd(0.8); }
        if (d > 0.3) { sp = 2.5; p.pos.x += dx / d * sp * dt; p.pos.z += dz / d * sp * dt; }
      }
      p.vy -= 16 * dt; p.pos.y += p.vy * dt; const g = world.groundAt(p.pos.x, p.pos.z, p.pos.y + 0.5);
      p.grounded = p.pos.y <= g; if (p.grounded) { p.pos.y = g; p.vy = Math.max(0, p.vy); }
      let dy = p.yaw - p.d.root.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); p.d.root.rotation.y += dy * Math.min(1, dt * 10);
    }
    p.d.animate(dt, { speed: sp * 1.6, grounded: p.state === 'wait' ? true : p.grounded, vy: p.vy, happy, sit: p.state === 'wait' ? 1 : 0, pant: true });
  }
}

// ------------------------------------------------------------------ camera
const titleCam = { pos: new THREE.Vector3(-80, 9, -57), look: new THREE.Vector3(60, -7, -78) };
const tgt = new THREE.Vector3(), des = new THREE.Vector3(), dir = new THREE.Vector3(), look = new THREE.Vector3();
function updateCamera(dt, inp) {
  if (G.mode === 'title') { camera.position.set(titleCam.pos.x + Math.sin(G.time * 0.11) * 0.7, titleCam.pos.y + Math.sin(G.time * 0.17) * 0.25, titleCam.pos.z); look.copy(titleCam.look); camera.lookAt(look); cam.pos.copy(camera.position); cam.look.copy(look); return; }
  if (G.mode === 'cine' || G.mode === 'win') {
    const t = G.ct + (G.mode === 'win' ? 0 : 0); if (G.mode === 'win') G.ct += dt;
    const k = sm(6.8, 11.8, t), orbit = Math.max(0, t - 11.3) * 0.05;
    des.set(lerp(7.5, 3.4 * Math.cos(orbit) + 0.6, k), lerp(11.6, 9.75, k), lerp(-243.5, -247.3 + Math.sin(orbit) * 1.2, k));
    look.set(lerp(0, -0.3, k), lerp(14.5, 10.3, k), lerp(-262, -253.5, k));
  } else {
    cam.yaw += inp.cy * 1.9 * dt; if (inp.cy) cam.manual = 1.5;
    cam.manual -= dt;
    if (cam.manual <= 0 && P.speed > 1) { let dy = (P.yaw + Math.PI) - (P.onBridge ? 1.45 : 0) - cam.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); if (Math.abs(dy) < 2.3) cam.yaw += dy * Math.min(1, dt * 1.3); }
    const inT = P.pos.z < L.TZ0 + 1 && P.pos.z > L.TZ1 - 1;
    const wantD = cam.dist * (P.onBridge ? 2.0 : inT ? 0.72 : 1), wantP = cam.manual > 0 ? cam.pitch : (P.onBridge ? 0.17 : inT ? 0.12 : 0.24);
    cam.pitch += (wantP - cam.pitch) * Math.min(1, dt * 1.5);
    tgt.set(P.pos.x, P.pos.y + 0.85, P.pos.z);
    const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch); dir.set(Math.sin(cam.yaw) * cp, sp, Math.cos(cam.yaw) * cp);
    let d = wantD;
    for (let i = 1; i <= 12; i++) {
      const f = i / 12 * wantD, x = tgt.x + dir.x * f, y = tgt.y + dir.y * f, zz = tgt.z + dir.z * f; let hit = H(x, zz) + 0.35 > y;
      if (!hit) for (const c of world.circles) if (c.on && c.top > y && c.r > 0.4 && (x - c.x) ** 2 + (zz - c.z) ** 2 < (c.r + 0.15) ** 2) { hit = true; break; }
      if (!hit) for (const b of world.boxes) if (b.on && b.top > y + 0.3 && b.bottom < y && x > b.x0 - 0.2 && x < b.x1 + 0.2 && zz > b.z0 - 0.2 && zz < b.z1 + 0.2) { hit = true; break; }
      if (hit) { d = Math.max(0.9, (i - 1) / 12 * wantD); break; }
    }
    cam.d += (d - cam.d) * Math.min(1, dt * (d < cam.d ? 18 : 2.5));
    des.copy(tgt).addScaledVector(dir, cam.d);
    if (des.z < L.TZ0 + 3 && des.z > L.TZ1 - 3) des.y = Math.min(des.y, 9 + tunnelR(clamp(tunnelS(des.z), 0, 1)) * 0.95 - 0.45);
    look.set(tgt.x, tgt.y + 0.3, tgt.z);
    if (G.breakT > 0) { G.breakT -= dt; const kb = Math.sin(Math.PI * clamp(1 - G.breakT / 3.6, 0, 1)) * 0.42; look.x += (0 - look.x) * kb; look.y += (-4 - look.y) * kb; look.z += (-66.5 - look.z) * kb; }
  }
  const k = 1 - Math.exp(-(G.mode === 'play' ? 9 : 1.4) * dt);
  G.blend = Math.min(1, G.blend + dt / 4.2);
  if (G.blend < 1) { const e = sm(0, 1, G.blend); cam.pos.lerpVectors(titleCam.pos, des, e); cam.look.lerpVectors(titleCam.look, look, e); }
  else { cam.pos.lerp(des, k); cam.look.lerp(look, G.mode === 'play' ? 1 - Math.exp(-14 * dt) : k); }
  camera.position.copy(cam.pos);
  if (G.shake > 0.001) { camera.position.x += rnd(G.shake * 0.25); camera.position.y += rnd(G.shake * 0.25); camera.position.z += rnd(G.shake * 0.2); G.shake *= Math.exp(-3.5 * dt); }
  camera.lookAt(cam.look);
}

// ------------------------------------------------------------------ frame
let last = performance.now(), fpsT = 0, fpsN = 0, fpsAcc = 0;
function frame(now, simDt) {
  if (touch.on) $('touch').classList.toggle('on', G.mode === 'play');
  if (!simDt && G.dtLog.length < 900) G.dtLog.push(Math.round(now - last));
  let dt = Math.min(0.1, (now - last) / 1000); last = now; if (dt <= 0) dt = 0.016;
  if (simDt) dt = simDt;
  G.time += dt; G.frame = (G.frame || 0) + 1; G.raw = (G.raw || 0.016) * 0.95 + dt * 0.05;
  if (G.frame % 2 === 0 || G.frame < 4) renderer.shadowMap.needsUpdate = true;
  const inp = readInput();
  if (G.mode === 'play' && G.respawn <= 0.45) { const n = dt > 0.034 ? 3 : 1; for (let i = 0; i < n; i++) updatePlayer(dt / n, inp); }
  else if (G.mode === 'cine' || G.mode === 'win') cinematic(dt);
  else if (G.mode === 'lose') { P.speed = 0; P.sit = 1; }
  world.update(dt, G.time, P); if (HQ) hqStep(dt);
  logic(dt);
  updatePuppies(dt);
  // Łatka
  dog.root.position.copy(P.pos); dog.root.rotation.y = P.yaw;
  dog.animate(dt, { speed: P.speed, grounded: P.grounded, vy: P.vel.y, happy: G.mode === 'win' || G.mode === 'cine' ? 1 : P.speed < 0.3 ? 0.35 : 0.1, sit: G.mode === 'title' ? 1 : P.sit, pant: G.mode === 'title' });
  const gy = world.groundAt(P.pos.x, P.pos.z, P.pos.y + 0.2); blob.position.set(P.pos.x, gy + 0.03, P.pos.z); blob.visible = P.pos.y - gy < 3; blob.scale.setScalar(1 / (1 + (P.pos.y - gy) * 0.6));
  updateCamera(dt, inp);
  // tunnel darkness (eye adaptation)
  const cz = camera.position.z * 0.5 + P.pos.z * 0.5, depth = Math.min(L.TZ0 + 2 - cz, cz - (L.TZ1 - 2));
  G.tun += (sm(-1, 9, depth) - G.tun) * Math.min(1, dt * 2.5);
  sky.update(G.t / DAY, G.time, camera, P.pos, G.tun, world);
  // the collar amulet is dark in daylight; it lights up in the tunnel and once dusk has really fallen
  const night = sky.night, need = Math.max(sm(0.15, 0.6, G.tun), sm(0.45, 0.9, night) * 0.85);
  if (G.tun > 0.3 && !G.lit) { G.lit = true; audio.ignite(); }
  dog.light.intensity = 12 * need * (0.9 + 0.06 * Math.sin(G.time * 19) + 0.05 * Math.sin(G.time * 33));
  dog.flame.material.color.setRGB(0.1 + 2.3 * need, 0.07 + 0.98 * need, 0.04 + 0.26 * need);
  const hz = sky.cur.hor, gs = G.tun * 2.4;
  world.tunnelGlows.forEach((u, i) => { const mz = i === 0 ? L.TZ0 + 3.4 : L.TZ1 - 3.4; u.uColor.value.setRGB(hz[0], hz[1] * 0.95, hz[2]); u.uStrength.value = gs * sm(3, 16, Math.abs(camera.position.z - mz)); });
  emitters(dt); pAdd.update(dt); pAlpha.update(dt);
  // audio
  const dSock = world.relics[1].got ? 1e3 : P.pos.distanceTo(world.relics[1].pos);
  audio.update(dt, { win: G.mode === 'win', lost: G.mode === 'lose', dFall: P.pos.distanceTo(world.fallBase), dRiver: Math.abs(P.pos.y - L.WATER_Y) + (P.pos.z < L.G0 + 6 && P.pos.z > L.G1 - 6 ? 0 : 30), tunnel: G.tun, night, dSock, dFire: G.dFire || 1e3, onBridge: P.onBridge, moving: P.speed > 1, stepRate: P.grounded && P.speed > 0.8 && G.mode === 'play' ? 1.6 + P.speed * 0.75 : 0 });
  // HUD
  $('sundot').style.left = (clamp(G.t / DAY, 0, 1) * 100) + '%';
  if (hintT > 0) { hintT -= dt; if (hintT <= 0) $('hint').style.opacity = 0; }
  if (pickT > 0) { pickT -= dt; if (pickT <= 0) $('pick').style.opacity = 0; }
  G.fade += clamp((G.mode === 'lose' ? 0.55 : G.fadeTo) - G.fade, -dt * 2.6, dt * 2.6); grade.uniforms.uFade.value = G.fade;
  if (simDt) return;
  composer.render(dt);
  // adaptive resolution
  fpsAcc += dt; fpsN++; if (fpsAcc > 2.5 && G.time > 8) { const ms = fpsAcc / fpsN * 1000; if (G.raw * 1000 > 30 && pixelRatio > 0.6) { pixelRatio = Math.max(0.6, pixelRatio * 0.82); resize(); } fpsAcc = 0; fpsN = 0; G.ms = ms; }
}

boot().catch((e) => { console.error(e); $('loading').textContent = 'Błąd: ' + e.message; });
