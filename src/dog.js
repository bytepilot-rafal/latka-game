// Łatka the Dalmatian (also used for the puppies and the stone statues).
import * as THREE from 'three';
import { clamp, lerp, sm } from './textures.js';

const Y = new THREE.Vector3(0, 1, 0);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function buildDog(tex, opt = {}) {
  const P = Object.assign({ scale: 1, head: 1, leg: 1, ear: 1, snout: 1, lantern: false, stone: null, seed: 1 }, opt);
  const st = P.stone;
  const fur = st || new THREE.MeshStandardMaterial({ map: tex.spots, roughness: 0.78 });
  const white = st || new THREE.MeshStandardMaterial({ color: 0xf1eee8, roughness: 0.8 });
  const fine = st || new THREE.MeshStandardMaterial({ map: tex.spotsFine, roughness: 0.78 });
  const blk = st || new THREE.MeshStandardMaterial({ color: 0x4a2c1b, roughness: 0.7 });          // liver-brown ears and eye patches
  const eyeM = st || new THREE.MeshStandardMaterial({ color: 0xa8742a, roughness: 0.08 });         // amber eyes
  const pupilM = st || new THREE.MeshStandardMaterial({ color: 0x0a0605, roughness: 0.05 });
  const noseM = st || new THREE.MeshStandardMaterial({ color: 0x8d5b4c, roughness: 0.38 });        // liver-pink nose
  const lipM = st || new THREE.MeshStandardMaterial({ color: 0x3a2318, roughness: 0.6 });
  const tongueM = st || new THREE.MeshStandardMaterial({ color: 0xe8788a, roughness: 0.45 });
  const collarM = st || new THREE.MeshStandardMaterial({ color: 0xb3261e, roughness: 0.55 });
  const brass = st || new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: 0.3, metalness: 1 });

  const all = [];
  const mesh = (g, m) => { const o = new THREE.Mesh(g, m); o.castShadow = true; o.receiveShadow = true; all.push(o); return o; };
  const uvOff = (g) => { const uv = g.attributes.uv; const ou = Math.random(), ov = Math.random(); for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.9 + ou, uv.getY(i) * 0.9 + ov); return g; };
  const limb = (a, b, ra, rb, m) => {
    const d = new THREE.Vector3().subVectors(b, a); const len = d.length();
    const o = mesh(uvOff(new THREE.CylinderGeometry(rb, ra, len, 12, 1)), m);
    o.position.copy(a).addScaledVector(d, 0.5); o.quaternion.setFromUnitVectors(Y, d.normalize()); return o;
  };
  const ball = (r, m, x, y, z, sx = 1, sy = 1, sz = 1) => { const o = mesh(uvOff(new THREE.SphereGeometry(r, 16, 12)), m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); return o; };

  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const baseY = 0.4 * P.leg + 0.07;
  body.position.y = baseY;

  // torso
  const prof = [[0, -0.37], [0.06, -0.36], [0.108, -0.31], [0.122, -0.2], [0.118, -0.06], [0.135, 0.08], [0.158, 0.2], [0.15, 0.29], [0.11, 0.35], [0.05, 0.385], [0, 0.39]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const tg = new THREE.LatheGeometry(prof, 20); tg.rotateX(Math.PI / 2); tg.scale(0.84, 1, 1);
  { const p = tg.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i); let y = p.getY(i); if (y < 0) y *= 1 + 0.2 * sm(-0.05, 0.25, z) - 0.14 * sm(0.02, -0.2, z); p.setY(i, y - 0.035 * Math.max(0, z) / 0.3 + 0.015); } tg.computeVertexNormals(); }
  { const uv = tg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2, uv.getY(i) * 1.6); } // denser, smaller body spots like the real Łatka
  const torso = mesh(tg, fur); body.add(torso);

  // legs
  const legs = [];
  const mkLeg = (x, y, z, hind) => {
    const lu = 0.2 * P.leg, ll = 0.2 * P.leg;
    const hip = new THREE.Group(); hip.position.set(x, y, z);
    hip.add(limb(V(0, 0.02, 0), V(0, -lu, 0), hind ? 0.064 : 0.05, 0.037, fur)); hip.add(ball(hind ? 0.068 : 0.052, fur, 0, 0.02, 0));
    const knee = new THREE.Group(); knee.position.y = -lu; hip.add(knee);
    knee.add(ball(0.038, fur, 0, 0, 0)); knee.add(limb(V(0, 0, 0), V(0, -ll, 0), 0.035, 0.027, fine));
    knee.add(ball(0.041, fine, 0, -ll + 0.006, 0.02, 1, 0.62, 1.4));
    if (P.scale >= 1) for (const tx of [-0.02, 0, 0.02]) knee.add(ball(0.015, fine, tx, -ll - 0.002, 0.066 - Math.abs(tx) * 0.4, 1, 0.8, 1.3));   // toes
    body.add(hip);
    const L = { hip, knee, hind, rest: hind ? -0.35 : 0.04, restK: hind ? 0.7 : 0.0 };
    legs.push(L); return L;
  };
  mkLeg(-0.088, -0.05, 0.22, false); mkLeg(0.088, -0.05, 0.22, false);
  mkLeg(-0.09, -0.074, -0.25, true); mkLeg(0.09, -0.074, -0.25, true);

  // neck + head
  const headPos = V(0, 0.235, 0.43);
  body.add(limb(V(0, 0.03, 0.26), headPos, 0.105, 0.075, fur));
  body.add(ball(0.118, fur, 0, -0.035, 0.265, 0.9, 1.05, 0.9));   // forechest
  const head = new THREE.Group(); head.position.copy(headPos); head.scale.setScalar(P.head); body.add(head);
  // sculpted head: one mesh for skull, stop, muzzle and flews; the eye patches are painted with vertex colours
  const SN = P.snout, tipZ = 0.06 + 0.154 * SN;
  const hg = new THREE.LatheGeometry([[0, -0.108], [0.045, -0.104], [0.08, -0.082], [0.098, -0.04], [0.102, 0.0], [0.098, 0.035], [0.086, 0.06], [0.07, 0.078], [0.06, 0.095], [0.056, 0.125], [0.053, 0.16], [0.049, 0.188], [0.04, 0.205], [0.022, 0.213], [0, 0.215]].map(([r, y]) => new THREE.Vector2(r, y)), 28);
  hg.rotateX(Math.PI / 2);
  {
    const hp = hg.attributes.position, col = new Float32Array(hp.count * 3), cB = new THREE.Color(0x4a2c1b), cL = new THREE.Color(0x2b1a12), cc = new THREE.Color();
    for (let i = 0; i < hp.count; i++) {
      let x = hp.getX(i), y = hp.getY(i), z = hp.getZ(i);
      const mz = sm(0.055, 0.11, z);                                   // 0 on the skull, 1 on the muzzle
      x *= lerp(0.93, 0.88, mz);
      y *= y > 0 ? lerp(0.9, 0.7, mz) : lerp(0.92, 1.1, mz);           // flat nose bridge, deeper lips
      y -= 0.021 * mz;                                                  // muzzle sits below the crown (the "stop")
      if (y > 0) { const bx = Math.abs(x) - 0.044; y += 0.013 * Math.exp(-(bx * bx) / 0.0006 - ((z - 0.06) ** 2) / 0.0005); }   // brow ridges
      if (y < 0.02) x *= 1 + 0.07 * Math.exp(-((z - 0.03) ** 2) / 0.002);                                                    // cheeks
      if (y < -0.012) x *= 1 + 0.13 * mz * sm(0.21, 0.13, z);                                                                // hanging flews
      if (y > 0.02 && Math.abs(x) < 0.02) y -= 0.004 * sm(0.03, 0.09, z) * sm(0.02, 0, Math.abs(x)) * (1 - mz);              // furrow between the eyes
      const n = Math.sin(x * 190 + z * 140) * 0.006 + Math.sin(y * 230 + z * 90) * 0.005;
      let k = 1 - sm(0.05, 0.062, Math.hypot(Math.abs(x) - 0.054, (y - 0.036) * 0.85, (z - 0.045) * 0.7) + n);
      k = Math.max(k, 1 - sm(0.046, 0.058, Math.hypot(Math.abs(x) - 0.08, y - 0.05, (z + 0.02) * 0.6) + n));
      k *= sm(0.01, 0.022, Math.abs(x));                                // white blaze down the middle
      cc.setRGB(1, 1, 1).lerp(cB, k).lerp(cL, mz * sm(-0.06, -0.072, y) * 0.9);
      if (z > 0.06) z = 0.06 + (z - 0.06) * SN;
      hp.setXYZ(i, x, y, z); col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b;
    }
    hg.setAttribute('color', new THREE.BufferAttribute(col, 3)); hg.computeVertexNormals();
    const uv = hg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.9 + 0.3, uv.getY(i) * 0.75);
  }
  const headM = st || new THREE.MeshStandardMaterial({ map: tex.spotsFine, vertexColors: true, roughness: 0.78 });
  head.add(mesh(hg, headM));
  // nose leather with nostrils
  head.add(ball(0.027, noseM, 0, -0.013, tipZ - 0.004, 1.25, 0.95, 0.85));
  for (const s of [-1, 1]) head.add(ball(0.0075, lipM, s * 0.012, -0.016, tipZ + 0.0165, 1, 0.8, 0.6));
  head.add(ball(0.004, lipM, 0, -0.034, tipZ + 0.008, 0.6, 2.4, 0.8));           // philtrum
  head.add(ball(0.027, white, 0, -0.085, 0.06 + 0.066 * SN, 0.92, 0.5, 2.15 * SN)); // lower jaw
  const eyeZ = 0.06 + 0.014 * SN;
  for (const s of [-1, 1]) {
    head.add(ball(0.0155, eyeM, s * 0.046, 0.037, eyeZ + 0.001));
    head.add(ball(0.0085, pupilM, s * 0.0474, 0.0373, eyeZ + 0.0098));
    head.add(ball(0.0175, lipM, s * 0.046, 0.0375, eyeZ - 0.003, 1.08, 1.02, 1));   // dark eyelid rim
    if (!st) { const hl = ball(0.0045, new THREE.MeshBasicMaterial({ color: 0xffffff }), s * 0.0435, 0.0435, eyeZ + 0.0145); hl.castShadow = false; head.add(hl); }
  }
  // tongue lies inside the mouth, between the upper lip and the lower jaw, and only its tip lolls out over the front of the jaw
  const tongue = ball(0.022, tongueM, 0, -0.07, 0.06 + 0.118 * SN, 0.7, 0.26, 2.0); tongue.rotation.x = 0.42; head.add(tongue);
  // ears: soft triangles that taper to a rounded tip and hang against the cheeks
  const ears = [];
  const eg = new THREE.SphereGeometry(1, 14, 10);
  { const ep = eg.attributes.position; for (let i = 0; i < ep.count; i++) { const t = (1 - ep.getY(i)) / 2; ep.setX(i, ep.getX(i) * lerp(1.05, 0.5, t * t)); ep.setZ(i, ep.getZ(i) * lerp(1.3, 0.8, t)); } eg.scale(0.06 * P.ear, 0.098 * P.ear, 0.012); eg.computeVertexNormals(); }
  for (const s of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(s * 0.08, 0.062, -0.022);
    const e = mesh(eg, blk); e.position.set(s * 0.024, -0.08 * P.ear, 0.012); e.rotation.set(0.12, s * 0.5, s * 0.2);
    piv.add(e); head.add(piv); ears.push({ piv, s });
  }

  // tail
  const tail = []; let tp = new THREE.Group(); tp.position.set(0, 0.06, -0.35); body.add(tp);
  for (let i = 0; i < 5; i++) {
    const len = 0.085; tp.add(limb(V(0, 0, 0), V(0, len, 0), 0.027 - i * 0.0042, 0.023 - i * 0.0042, fine));
    tail.push(tp); const n = new THREE.Group(); n.position.y = len; tp.add(n); tp = n;
  }

  // collar + lantern
  let light = null, flame = null;
  if (!st) {
    const col = mesh(new THREE.TorusGeometry(0.094, 0.014, 8, 22), collarM); col.position.set(0, 0.105, 0.325); col.rotation.x = -0.72; body.add(col);
    if (P.lantern) {
      const lan = new THREE.Group(); lan.position.set(0, 0.0, 0.405); body.add(lan);
      lan.add(mesh(new THREE.CylinderGeometry(0.02, 0.026, 0.018, 10), brass));
      const cap = mesh(new THREE.ConeGeometry(0.03, 0.03, 10), brass); cap.position.y = -0.075; cap.rotation.x = Math.PI; lan.add(cap);
      flame = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.05, 0.3) }));
      flame.position.y = -0.04; lan.add(flame);
      light = new THREE.PointLight(0xffa24a, 0, 20, 2); light.position.set(0, 0.95, 0.45); lan.add(light);
    }
  }

  root.scale.setScalar(P.scale);

  const A = { phase: Math.random() * 6, t: Math.random() * 10, bark: 0, sit: 0, lookY: 0 };
  function animate(dt, s = {}) {
    A.t += dt;
    const sp = s.speed || 0, run = clamp((sp - 3.5) / 4, 0, 1), air = s.grounded === false;
    const happy = s.happy || 0;
    A.sit += ((s.sit || 0) - A.sit) * Math.min(1, dt * 6);
    const sit = A.sit;
    if (sp > 0.2) A.phase += dt * (5.5 + sp * 1.75);
    const amp = air ? 0 : Math.min(1, sp / 2.2) * (0.5 + 0.4 * run);
    const offs = run > 0.5 ? [0, 0.7, Math.PI, Math.PI + 0.7] : [0, Math.PI, Math.PI, 0];
    legs.forEach((L, i) => {
      const ph = A.phase + offs[i];
      let h = L.rest - Math.sin(ph) * amp * 0.9, k = L.restK + Math.max(0, Math.cos(ph)) * amp * 1.15;
      if (air) { const up = (s.vy || 0) > 0; h = L.hind ? (up ? 0.75 : 0.2) : (up ? -0.95 : -0.5); k = L.hind ? 0.25 : 0.35; }
      if (sit > 0.01) { const hs = L.hind ? -0.55 : 1.02, ks = L.hind ? 2.5 : 0; h = lerp(h, hs, sit); k = lerp(k, ks, sit); }
      L.hip.rotation.x += (h - L.hip.rotation.x) * Math.min(1, dt * 22);
      L.knee.rotation.x += (k - L.knee.rotation.x) * Math.min(1, dt * 22);
    });
    body.position.y = baseY + Math.abs(Math.sin(A.phase)) * 0.022 * amp - sit * 0.19 + Math.sin(A.t * 2.2) * 0.003;
    const pitch = -0.7 * sit + (air ? clamp(-(s.vy || 0) * 0.035, -0.3, 0.3) : Math.sin(A.phase * 2) * 0.035 * run);
    body.rotation.x += (pitch - body.rotation.x) * Math.min(1, dt * 12);
    const br = 1 + Math.sin(A.t * (sp > 4 ? 9 : 3)) * 0.012; torso.scale.set(br, br, 1);
    // tail
    const wag = Math.sin(A.t * (7 + happy * 9)) * (0.18 + 0.55 * happy);
    tail.forEach((g, i) => { g.rotation.z = wag * (0.5 + i * 0.25); g.rotation.x = i === 0 ? -1.05 + run * 0.55 - sit * 0.3 : 0.16 - run * 0.1; });
    // ears
    ears.forEach(({ piv, s: sd }) => { piv.rotation.x = -run * 0.5 - Math.abs(Math.sin(A.phase)) * 0.25 * amp; piv.rotation.z = sd * (run * 0.55 + (air ? 0.6 : 0) + Math.sin(A.t * 3 + sd) * 0.03); });
    // head
    A.bark = Math.max(0, A.bark - dt * 4);
    A.lookY += ((s.lookY || 0) - A.lookY) * Math.min(1, dt * 5);
    head.rotation.x = sit * 0.6 + Math.sin(A.t * 1.3) * 0.035 - A.bark * 0.45 - run * 0.12 + (s.lookX || 0);
    head.rotation.y = A.lookY + (sp < 0.3 ? Math.sin(A.t * 0.45) * 0.3 * (1 - sit * 0.5) : 0);
    head.rotation.z = sp < 0.3 ? Math.sin(A.t * 0.31) * 0.08 : 0;
    const pant = sp > 4 || happy > 0.5 || s.pant;
    tongue.scale.z = 2.0 * (pant ? 1 + Math.sin(A.t * 14) * 0.12 : 0.2); tongue.position.y = pant ? -0.0745 : -0.066;
    if (flame) { const f = 0.85 + Math.sin(A.t * 23) * 0.08 + Math.sin(A.t * 37) * 0.07; flame.scale.setScalar(f); }
  }
  animate(0.016, { sit: P.sit || 0 });
  if (P.sit) { for (let i = 0; i < 30; i++) animate(0.05, { sit: 1 }); }

  return { root, body, head, animate, light, flame, bark: () => { A.bark = 1; }, all };
}
