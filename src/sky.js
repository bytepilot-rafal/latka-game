// Sunset: sky dome, sun + ambient light, fog, far mountains, environment map.
import * as THREE from 'three';
import { fbm, lerp, sm } from './textures.js';
import { fogUniforms } from './fx.js';

const KEYS = [
  { t: 0.0, sunI: 4.6, sun: [1.0, 0.68, 0.36], hs: [0.42, 0.56, 1.0], hg: [0.45, 0.3, 0.16], hi: 0.72, zen: [0.035, 0.14, 0.6], hor: [1.0, 0.55, 0.2], glow: [1.0, 0.5, 0.15], fog: [0.9, 0.58, 0.3], fd: 0.0023, ex: 1.0, st: 0, cl: [1.0, 0.74, 0.46], cd: [0.4, 0.32, 0.44] },
  { t: 0.4, sunI: 4.0, sun: [1.0, 0.54, 0.24], hs: [0.46, 0.5, 0.95], hg: [0.42, 0.25, 0.13], hi: 0.68, zen: [0.08, 0.17, 0.52], hor: [1.0, 0.56, 0.25], glow: [1.0, 0.4, 0.08], fog: [0.9, 0.55, 0.32], fd: 0.0026, ex: 1.0, st: 0, cl: [1.0, 0.6, 0.34], cd: [0.4, 0.3, 0.42] },
  { t: 0.66, sunI: 2.0, sun: [1.0, 0.4, 0.16], hs: [0.52, 0.42, 0.72], hg: [0.32, 0.18, 0.14], hi: 0.72, zen: [0.09, 0.13, 0.4], hor: [0.98, 0.42, 0.22], glow: [1.0, 0.28, 0.08], fog: [0.66, 0.38, 0.33], fd: 0.003, ex: 1.08, st: 0.03, cl: [1.0, 0.38, 0.3], cd: [0.27, 0.18, 0.32] },
  { t: 0.84, sunI: 0.4, sun: [0.8, 0.45, 0.55], hs: [0.28, 0.32, 0.7], hg: [0.1, 0.09, 0.15], hi: 0.62, zen: [0.035, 0.065, 0.24], hor: [0.5, 0.27, 0.42], glow: [0.6, 0.18, 0.2], fog: [0.22, 0.2, 0.36], fd: 0.0034, ex: 1.22, st: 0.5, cl: [0.55, 0.3, 0.48], cd: [0.1, 0.1, 0.2] },
  { t: 1.0, sunI: 0.14, sun: [0.4, 0.5, 0.9], hs: [0.11, 0.17, 0.44], hg: [0.03, 0.04, 0.08], hi: 0.55, zen: [0.012, 0.025, 0.1], hor: [0.08, 0.14, 0.32], glow: [0.1, 0.1, 0.25], fog: [0.045, 0.07, 0.17], fd: 0.0038, ex: 1.35, st: 1, cl: [0.14, 0.17, 0.3], cd: [0.03, 0.04, 0.09] },
];
const AZ = new THREE.Vector3(-0.88, 0, 0.47).normalize();

const SKY_FRAG = `
uniform vec3 uSunDir, uZen, uHor, uGlow, uSunCol, uCloudLit, uCloudDark, uHaze; uniform float uStars, uTime, uEnv;
varying vec3 vDir;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vn(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }
void main(){
  vec3 d = normalize(vDir); float h = max(d.y, 0.0);
  vec3 col = mix(uHor, uZen, pow(h, 0.42));
  float sa = max(dot(normalize(d.xz + 1e-5), normalize(uSunDir.xz)), 0.0);
  col += uGlow * pow(sa, 5.0) * exp(-h * 4.5) * 0.9;
  float sd = max(dot(d, uSunDir), 0.0);
  col += uSunCol * (pow(sd, 40.0) * 0.5 + pow(sd, 6.0) * 0.14);
  if (d.y > 0.0) {
    vec2 p = d.xz / (d.y + 0.16) * 1.1 + vec2(uTime * 0.006, uTime * 0.002);
    float c = fbm(p) * 0.75 + fbm(p * 2.7 + 3.0) * 0.25;
    float cov = smoothstep(0.6, 0.9, c) * smoothstep(0.0, 0.14, d.y) * 0.85;
    float thick = smoothstep(0.6, 0.98, c);
    vec3 cc = mix(uCloudLit, uCloudDark, thick * 0.8 * (1.0 - pow(sd, 2.0) * 0.8));
    cc += uSunCol * pow(sd, 10.0) * 0.6 * (1.0 - thick);
    col = mix(col, cc, cov * 0.9);
    if (uStars > 0.0) { vec3 q = d * 190.0; vec3 ce = floor(q); float hs = fract(sin(dot(ce, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
      col += vec3(0.9, 0.95, 1.0) * step(0.9972, hs) * smoothstep(0.5, 0.05, length(fract(q) - 0.5)) * uStars * (1.0 - cov) * 2.5 * (0.6 + 0.4 * sin(uTime * 3.0 + hs * 90.0)); }
  }
  col = mix(col, uHaze * 1.25, exp(-h * 14.0) * 0.6);
  col = mix(col, uHaze * 0.8, smoothstep(0.0, -0.12, d.y));
  if (uEnv < 0.5) col += uSunCol * (smoothstep(0.99965, 0.99985, sd) * 30.0 + pow(sd, 900.0) * 6.0) * (1.0 - smoothstep(0.0, -0.02, d.y));
  gl_FragColor = vec4(col, 1.0);
}`;

export function buildSky(scene, renderer) {
  const S = { sunDir: new THREE.Vector3(), cur: {}, t: 0 };
  const C = (a) => new THREE.Color(a[0], a[1], a[2]);
  const mkU = (env) => ({ uSunDir: { value: S.sunDir }, uZen: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uGlow: { value: new THREE.Color() }, uSunCol: { value: new THREE.Color() }, uCloudLit: { value: new THREE.Color() }, uCloudDark: { value: new THREE.Color() }, uHaze: { value: new THREE.Color() }, uStars: { value: 0 }, uTime: { value: 0 }, uEnv: { value: env } });
  const mkMat = (env) => new THREE.ShaderMaterial({ uniforms: mkU(env), side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader: SKY_FRAG });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(3000, 48, 24), mkMat(0)); dome.renderOrder = -10; dome.frustumCulled = false; scene.add(dome);
  const envScene = new THREE.Scene(); const envDome = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), mkMat(1)); envScene.add(envDome);
  const pmrem = new THREE.PMREMGenerator(renderer); let envRT = null, envT = -1;

  const sun = new THREE.DirectionalLight(0xffffff, 4); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = -72; sc.right = 72; sc.top = 72; sc.bottom = -72; sc.near = 1; sc.far = 760;
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.07; scene.add(sun); scene.add(sun.target);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x443322, 1); scene.add(hemi);
  scene.fog = new THREE.FogExp2(0x888888, 0.004);

  // layered far mountains (lower toward the sunset so the sun sinks behind them late)
  const mts = [];
  const sunAng = Math.atan2(AZ.z, AZ.x);
  [[620, 150, 0.5], [900, 250, 0.33], [1350, 420, 0.2]].forEach(([Rr, hh, mix], li) => {
    const N = 300, pos = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const a = i / N * 6.2832; let da = Math.abs(a - ((sunAng + 6.2832) % 6.2832)); da = Math.min(da, 6.2832 - da);
      const low = lerp(0.12, 1, sm(0.1, 0.9, da));
      const h = hh * (0.35 + 0.9 * fbm(Math.cos(a) * 3 + li * 7, Math.sin(a) * 3 + li * 3, 5, 100 + li)) * low;
      pos.push(Math.cos(a) * Rr, -90, Math.sin(a) * Rr - 120, Math.cos(a) * Rr, h, Math.sin(a) * Rr - 120);
      if (i < N) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ fog: false, side: THREE.DoubleSide })); m.renderOrder = -9 + li * 0.1; m.frustumCulled = false; scene.add(m); mts.push({ m, mix });
  });
  mts.reverse().forEach((o, i) => { o.m.renderOrder = -9 + i; o.m.material.depthWrite = false; });

  const tmp = new THREE.Color(), dark = new THREE.Color(0.012, 0.012, 0.016), base = new THREE.Vector3(), rgt = new THREE.Vector3(), upv = new THREE.Vector3(), ld = new THREE.Vector3();
  const sample = (t) => {
    let i = 0; while (i < KEYS.length - 2 && t > KEYS[i + 1].t) i++;
    const a = KEYS[i], b = KEYS[i + 1], k = Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))), o = S.cur;
    for (const key in a) { if (key === 't') continue; const va = a[key], vb = b[key]; o[key] = Array.isArray(va) ? [lerp(va[0], vb[0], k), lerp(va[1], vb[1], k), lerp(va[2], vb[2], k)] : lerp(va, vb, k); }
    return o;
  };

  S.update = (t, time, camera, focus, tun, world) => {
    S.t = t; const k = sample(t);
    const el = lerp(15, -8, t) * Math.PI / 180;
    S.sunDir.set(AZ.x * Math.cos(el), Math.sin(el), AZ.z * Math.cos(el));
    S.elev = el;
    for (const m of [dome.material, envDome.material]) {
      const u = m.uniforms; u.uZen.value.setRGB(...k.zen).multiplyScalar(1.5); u.uHor.value.setRGB(...k.hor).multiplyScalar(1.5); u.uGlow.value.setRGB(...k.glow).multiplyScalar(1.5); u.uSunCol.value.setRGB(...k.sun);
      u.uCloudLit.value.setRGB(...k.cl).multiplyScalar(1.6); u.uCloudDark.value.setRGB(...k.cd).multiplyScalar(1.4); u.uHaze.value.setRGB(...k.fog); u.uStars.value = k.st; u.uTime.value = time;
    }
    dome.position.copy(camera.position);
    // light
    const le = Math.max(el, 2.8 * Math.PI / 180); ld.set(AZ.x * Math.cos(le), Math.sin(le), AZ.z * Math.cos(le));
    rgt.set(-ld.z, 0, ld.x).normalize(); upv.crossVectors(ld, rgt).normalize();
    const tx = 144 / 2048 * 2; const fx = Math.round(focus.dot(rgt) / tx) * tx, fy = Math.round(focus.dot(upv) / tx) * tx, fz = focus.dot(ld);
    base.set(0, 0, 0).addScaledVector(rgt, fx).addScaledVector(upv, fy).addScaledVector(ld, fz);
    sun.target.position.copy(base); sun.position.copy(base).addScaledVector(ld, 380); sun.target.updateMatrixWorld();
    const horizonFade = sm(-2.5, 3, el * 180 / Math.PI);
    sun.color.setRGB(...k.sun); sun.intensity = k.sunI * 1.45 * lerp(0.35, 1, horizonFade);
    hemi.color.setRGB(...k.hs); hemi.groundColor.setRGB(...k.hg); hemi.intensity = k.hi * 1.25 * (1 - 0.965 * tun);
    scene.environmentIntensity = 0.55 * (1 - 0.96 * tun) * lerp(1, 0.22, sm(0.55, 0.95, t));
    scene.fog.color.setRGB(...k.fog).lerp(dark, tun); scene.fog.density = lerp(k.fd, 0.011, tun);
    fogUniforms.uFogColor.value.copy(scene.fog.color); fogUniforms.uFogDensity.value = scene.fog.density;
    renderer.toneMappingExposure = k.ex * 1.25 * (1 + 0.3 * tun);
    S.sunColor = sun.color; S.sunI = sun.intensity; S.amb = hemi.color; S.ambI = k.hi; S.fog = k.fog; S.night = sm(0.62, 0.95, t);
    for (const { m, mix } of mts) { tmp.setRGB(k.fog[0], k.fog[1], k.fog[2]); m.material.color.setRGB(k.zen[0] * 0.5, k.zen[1] * 0.55, k.zen[2] * 0.6).lerp(tmp, 1 - mix); }
    // water + waterfall + foliage uniforms
    if (world) {
      const w = world.water; w.uSunDir.value.copy(S.sunDir); w.uSunCol.value.copy(sun.color).multiplyScalar(horizonFade); w.uZen.value.setRGB(...k.zen); w.uHor.value.setRGB(...k.hor); w.uGlow.value.setRGB(...k.glow);
      w.uAmb.value.setRGB(k.hs[0] * k.hi + k.sun[0] * k.sunI * 0.12, k.hs[1] * k.hi + k.sun[1] * k.sunI * 0.12, k.hs[2] * k.hi + k.sun[2] * k.sunI * 0.12);
      w.uFoam.value.setRGB(k.hs[0] * k.hi * 0.7 + k.sun[0] * sun.intensity * 0.2, k.hs[1] * k.hi * 0.7 + k.sun[1] * sun.intensity * 0.2, k.hs[2] * k.hi * 0.7 + k.sun[2] * sun.intensity * 0.2);
      world.fall.uLight.value.copy(w.uFoam.value).multiplyScalar(1.25);
      world.rainbow.value = 0.2 * horizonFade * (1 - S.night);
      world.U.uSunView.value.copy(S.sunDir).transformDirection(camera.matrixWorldInverse);
      world.U.uSunCol.value.copy(sun.color).multiplyScalar(sun.intensity * 0.35 * horizonFade);
    }
    // the reflection map is built once: rebuilding it as the sun moved swapped a texture under every material and froze the game for ~0.2 s each time;
    // the sunset is followed by dimming its intensity instead
    if (envT < 0) { envT = t; envRT = pmrem.fromScene(envScene, 0, 0.1, 100); scene.environment = envRT.texture; }
  };
  S.sun = sun; S.hemi = hemi;
  return S;
}
