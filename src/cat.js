// Mila – a common grey tabby with a white chest, belly and socks.
import * as THREE from 'three';
import { clamp, lerp, sm } from './textures.js';

export function buildCat(opt = {}) {
  const S = opt.scale || 1.25;
  const gray = new THREE.Color(0x8f9195), dark = new THREE.Color(0x34363b), white = new THREE.Color(0xf5f3ef), pink = new THREE.Color(0xe7a3a0);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86 });
  const eyeM = new THREE.MeshStandardMaterial({ color: 0xb9c23a, roughness: 0.1 });
  const blackM = new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.2 });
  const all = [], cc = new THREE.Color();
  // every part is coloured per vertex: fn(x, y, z, colour) with coordinates in the part's own space
  const paint = (g, fn) => {
    const p = g.attributes.position, c = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) { fn(p.getX(i), p.getY(i), p.getZ(i), cc); c[i * 3] = cc.r; c[i * 3 + 1] = cc.g; c[i * 3 + 2] = cc.b; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g;
  };
  const stripes = (x, y, z, f = 62) => sm(0.35, 0.8, 0.5 + 0.5 * Math.sin(z * f + Math.sin(y * 38) * 1.4 + Math.sin(x * 33) * 0.8));
  const tabby = (x, y, z, c, f) => c.copy(gray).lerp(dark, stripes(x, y, z, f) * 0.9);
  const mesh = (g, m = mat) => { const o = new THREE.Mesh(g, m); o.castShadow = true; all.push(o); return o; };
  const ball = (r, fn, x, y, z, sx = 1, sy = 1, sz = 1, m) => {
    const g = new THREE.SphereGeometry(r, 14, 10); g.scale(sx, sy, sz); if (fn) paint(g, fn);
    const o = mesh(g, m || mat); o.position.set(x, y, z); return o;
  };
  const tube = (ra, rb, len, fn) => { const g = new THREE.CylinderGeometry(rb, ra, len, 10, 4); g.translate(0, -len / 2, 0); return mesh(paint(g, fn)); };   // hangs down from its origin

  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const baseY = 0.262; body.position.y = baseY;

  // torso: long ellipsoid, poles along z so the stripes get plenty of vertices
  const tg = new THREE.SphereGeometry(1, 22, 44); tg.rotateX(Math.PI / 2); tg.scale(0.086, 0.094, 0.25);
  paint(tg, (x, y, z, c) => {
    tabby(x, y, z, c);
    if (Math.abs(x) < 0.016 && y > 0) c.lerp(dark, 0.75);                         // dark line along the spine
    const w = Math.max(sm(-0.012, -0.05, y), sm(0.11, 0.19, z) * sm(0.05, -0.02, y));   // white belly and chest
    c.lerp(white, w);
  });
  const torso = mesh(tg); torso.receiveShadow = true; body.add(torso);

  // head
  const head = new THREE.Group(); head.position.set(0, 0.07, 0.262); body.add(head);
  const hg = new THREE.SphereGeometry(0.078, 22, 18); hg.scale(1.04, 0.92, 0.96);
  paint(hg, (x, y, z, c) => {
    c.copy(gray).lerp(dark, sm(0.4, 0.8, 0.5 + 0.5 * Math.sin(x * 150)) * sm(0.01, 0.04, y) * 0.85);   // forehead stripes
    c.lerp(dark, sm(0.3, 0.75, 0.5 + 0.5 * Math.sin(y * 170 + 1)) * sm(0.035, 0.06, Math.abs(x)) * sm(0.02, -0.03, z) * 0.7);   // cheek stripes
    const w = Math.max(sm(0.012, -0.02, y) * sm(0.0, 0.03, z), sm(0.018, 0.004, Math.abs(x)) * sm(0.02, 0.045, z) * sm(0.06, 0.03, y));   // white muzzle, chin and blaze
    c.lerp(white, w);
  });
  head.add(mesh(hg));
  for (const s of [-1, 1]) {
    head.add(ball(0.026, (x, y, z, c) => c.copy(white), s * 0.019, -0.022, 0.062, 1, 0.85, 1));        // whisker pads
    head.add(ball(0.0145, null, s * 0.033, 0.012, 0.062, 1, 1, 0.7, eyeM));
    head.add(ball(0.0075, null, s * 0.034, 0.012, 0.071, 0.45, 1.25, 0.6, blackM));
    const eg = new THREE.ConeGeometry(0.034, 0.062, 4); eg.rotateY(Math.PI / 4); eg.scale(1, 1, 0.55);
    paint(eg, (x, y, z, c) => c.copy(z > 0.004 ? pink : gray).lerp(dark, z > 0.004 ? 0 : 0.25));
    const e = mesh(eg); e.position.set(s * 0.045, 0.078, -0.004); e.rotation.set(-0.12, 0, -s * 0.3); head.add(e);
  }
  head.add(ball(0.019, (x, y, z, c) => c.copy(white), 0, -0.042, 0.048, 1, 0.8, 1));                    // chin
  head.add(ball(0.0075, (x, y, z, c) => c.copy(pink), 0, -0.008, 0.079, 1.3, 0.9, 0.8));                // nose

  // legs: white front legs, grey thighs with white socks behind
  const legs = [];
  const mkLeg = (x, y, z, hind) => {
    const hip = new THREE.Group(); hip.position.set(x, y, z); body.add(hip);
    const lu = 0.105, ll = 0.105;
    hip.add(tube(hind ? 0.04 : 0.027, 0.021, lu, (px, py, pz, c) => { if (hind) tabby(px, py * 1.2, pz, c, 90); else c.copy(white); }));
    if (hind) hip.add(ball(0.045, (px, py, pz, c) => tabby(px, py, pz, c, 80), 0, -0.01, 0.005, 0.8, 1.1, 1.2));
    const knee = new THREE.Group(); knee.position.y = -lu; hip.add(knee);
    knee.add(tube(0.021, 0.017, ll, (px, py, pz, c) => c.copy(white)));
    knee.add(ball(0.022, (px, py, pz, c) => c.copy(white), 0, -ll + 0.004, 0.012, 1, 0.6, 1.4));
    const L = { hip, knee, hind, rest: hind ? -0.3 : 0.05, restK: hind ? 0.6 : 0 }; legs.push(L);
  };
  mkLeg(-0.045, -0.045, 0.155, false); mkLeg(0.045, -0.045, 0.155, false);
  mkLeg(-0.05, -0.035, -0.165, true); mkLeg(0.05, -0.035, -0.165, true);

  // tail: ringed, with a pale tip
  const tail = []; let tp = new THREE.Group(); tp.position.set(0, 0.03, -0.235); body.add(tp);
  for (let i = 0; i < 7; i++) {
    const len = 0.062, g = new THREE.CylinderGeometry(0.02 - i * 0.0012, 0.022 - i * 0.0012, len, 8, 3); g.translate(0, len / 2, 0);
    paint(g, (x, y, z, c) => { if (i === 6 && y > len * 0.4) c.copy(white); else c.copy(gray).lerp(dark, sm(0.3, 0.7, 0.5 + 0.5 * Math.sin((i + y / len) * 4.2)) * 0.9); });
    tp.add(mesh(g)); tail.push(tp); const n = new THREE.Group(); n.position.y = len; tp.add(n); tp = n;
  }
  root.scale.setScalar(S);

  const A = { phase: 0, t: Math.random() * 9, sit: 0, crouch: 0 };
  function animate(dt, s = {}) {
    A.t += dt;
    const sp = s.speed || 0, air = s.grounded === false, run = clamp(sp / 6, 0, 1);
    A.sit += ((s.sit || 0) - A.sit) * Math.min(1, dt * 6); A.crouch += ((s.crouch || 0) - A.crouch) * Math.min(1, dt * 14);
    const sit = A.sit, cr = A.crouch;
    if (sp > 0.2) A.phase += dt * (9 + sp * 1.1);
    const amp = air ? 0 : run;
    const offs = [0, 0.5, Math.PI + 0.2, Math.PI + 0.7];                           // bounding gallop: front pair, then hind pair
    legs.forEach((L, i) => {
      const ph = A.phase + offs[i];
      let h = L.rest - Math.sin(ph) * amp * 1.05, k = L.restK + Math.max(0, Math.cos(ph)) * amp * 1.2;
      if (air) { h = L.hind ? 1.0 : -1.2; k = 0.2; }
      if (cr > 0.01) { h = lerp(h, L.hind ? 1.2 : -1.3, cr); k = lerp(k, 0.15, cr); }
      if (sit > 0.01) { h = lerp(h, L.hind ? -0.75 : 0.72, sit); k = lerp(k, L.hind ? 2.3 : 0, sit); }
      L.hip.rotation.x += (h - L.hip.rotation.x) * Math.min(1, dt * 24);
      L.knee.rotation.x += (k - L.knee.rotation.x) * Math.min(1, dt * 24);
    });
    body.position.y = baseY + Math.abs(Math.sin(A.phase)) * 0.03 * amp - sit * 0.1 - cr * 0.13;
    const pitch = -0.72 * sit + (air ? clamp(-(s.vy || 0) * 0.05, -0.35, 0.35) : Math.sin(A.phase) * 0.09 * amp);
    body.rotation.x += (pitch - body.rotation.x) * Math.min(1, dt * 14);
    head.rotation.x = sit * 0.7 - pitch * 0.5 + cr * 0.2; head.rotation.y = (s.lookY || 0) + (sit > 0.5 ? Math.sin(A.t * 0.6) * 0.25 : 0);
    const up = lerp(-0.35, -1.25, run) + sit * 0.5;                                // tail up when calm, streaming behind at speed
    tail.forEach((g, i) => { g.rotation.x = i === 0 ? up : lerp(0.2, -0.06, run) + Math.sin(A.t * 3 + i) * 0.03; g.rotation.z = Math.sin(A.t * (sit > 0.5 ? 2 : 7) + i * 0.6) * (0.07 + 0.05 * i) * (sit > 0.5 ? 1.5 : 1); });
  }
  animate(0.016, {});
  return { root, body, head, animate, all };
}
