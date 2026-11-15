// The canyon: terrain, river, waterfall, jungle, ruins, rope bridge, stairs, tunnel and temple.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { fbm, sm, lerp, clamp, rng } from './textures.js';
import { buildDog } from './dog.js';
import { beamMaterial, glowMaterial, fogUniforms } from './fx.js';

export const L = {
  WATER_Y: -32, G0: -52, G1: -92,
  BR_Z0: -48.6, BR_Z1: -95.4, BR_N: 52,
  ST_Z0: -109.2, ST_DZ: 0.82, ST_N: 30, ST_RISE: 0.3,
  TZ0: -150, TZ1: -205, TOP: 9,
};

// ------------------------------------------------------------------ terrain height
export const tunnelS = (z) => (L.TZ0 - z) / (L.TZ0 - L.TZ1);
export function tunnelCx(z) { const s = tunnelS(z); if (s <= 0 || s >= 1) return 0; return 8 * Math.sin(6.2831853 * s) * sm(0, 0.12, s) * sm(1, 0.88, s); }
export const tunnelR = (s) => 2.7 + 3.0 * Math.exp(-(((s - 0.5) / 0.09) ** 2));
const halfE = (z) => lerp(lerp(24, 13, sm(-88, -98, z)), 27, sm(-203, -211, z));
const halfW = (z) => lerp(lerp(26, 12, sm(-88, -98, z)), 27, sm(-203, -211, z));
const eastMax = (z) => 50 + 26 * fbm(z * 0.015, 3.1, 3, 7);
const cliffP = (d) => Math.pow(sm(0, 20, d), 0.5);
export const pathX = (z) => (z > -50 ? Math.sin(z * 0.09) * 3.2 * sm(-47, -30, z) : 0);

const valleyF = (x, z, n2) => -43 + 24 * sm(0.56, 0.85, fbm(x * 0.011 + 5, z * 0.011, 3, 9)) + n2 * 2;

export function H(x, z, mesh = false) {
  const n1 = fbm(x * 0.035 + 11.3, z * 0.035 - 4.1, 4, 1);
  const n2 = fbm(x * 0.1 + 3.7, z * 0.1 + 9.2, 2, 2);
  const inTun = z < L.TZ0 + 4 && z > L.TZ1 - 4;
  const cx = inTun ? tunnelCx(z) : 0, dx = x - cx;
  let base = (z > -8 ? 5 * sm(-8, 20, z) : z > -132.4 ? 0 : 9) + (n2 - 0.5) * (z > -46 ? 0.7 : 0.04);
  const pm = sm(-109.4, -111.2, z) * sm(-133.9, -132.4, z);
  if (pm > 0) base = lerp(base, -24 + n2 * 5, pm);
  const wob = (n1 - 0.5) * 9 + (n2 - 0.5) * 2.5;
  let h = base;
  if (dx > 0) {
    const d = dx - halfE(z) + wob;
    if (d > 0) { const p = cliffP(d); h = base + eastMax(z) * p + (n2 - 0.5) * 7 * p; }
  } else {
    const d = -dx - halfW(z) + wob * 0.6;
    if (d > 0) {
      const berm = 2.3 * Math.exp(-(((d - 1.5) / 1.1) ** 2));
      h = lerp(base + berm, valleyF(x, z, n2), Math.pow(sm(2.6, 13, d), 0.7));
    }
  }
  if (z > 28) {
    const d = z - 34 + wob;
    if (d > 0) {
      const wallH = base + 46 * cliffP(d);
      const dropH = lerp(base + 2.3 * Math.exp(-(((d - 1.5) / 1.1) ** 2)), valleyF(x, z, n2), Math.pow(sm(2.6, 13, d), 0.7));
      h = lerp(h, lerp(dropH, wallH, sm(-20, -3, x)), sm(-36, -27, x));
    }
  }
  // side gorge with the waterfall
  if (x > -48) {
    const zz = z + (fbm(x * 0.06, 3.3, 3, 5) - 0.5) * 5;
    const gm = sm(L.G0 + 1.2, L.G0 - 3.2, zz) * sm(L.G1 - 1.2, L.G1 + 3.2, zz) * sm(-48, -36, x);
    if (gm > 0) {
      const ge = sm(80, 69, x + (n2 - 0.5) * 5);
      const gfl = -38 + n2 * 3.5;
      const hv = 23 + n1 * 7 - 5 * Math.exp(-(((z + 80) / 4.2) ** 2)) + sm(95, 230, x) * 45 * n1;
      h = lerp(h, lerp(hv, gfl, ge), gm);
    }
  }
  // rock spur with the tunnel
  if (z < L.TZ0 + 8 && z > L.TZ1 - 8) {
    const rm = sm(L.TZ0 + 3, L.TZ0 - 2.5, z + (n2 - 0.5) * 2) * sm(L.TZ1 - 3, L.TZ1 + 2.5, z - (n2 - 0.5) * 2);
    const spurW = sm(-58, -40, x + (n1 - 0.5) * 10);
    let ridge = 9 + (38 + n1 * 20) * rm;
    if (!mesh && inTun) { const r = tunnelR(clamp(tunnelS(z), 0, 1)); ridge = lerp(9.08, ridge, sm(r - 0.35, r + 0.9, Math.abs(dx))); }
    h = Math.max(h, lerp(h, ridge, spurW));
  }
  // temple cliff
  if (z < -256) {
    const tm = sm(-263.5, -267, z + (n2 - 0.5) * 1.2);
    if (tm > 0 && !(!mesh && Math.abs(x) < 4.6 && z > -278.5)) {
      const th = 9 + (58 + n1 * 14) * Math.pow(tm, 0.45);
      h = Math.max(h, lerp(h, th, sm(-52, -34, x)));
    }
  }
  return h;
}

// ------------------------------------------------------------------ helpers
function uvBox(g, w, h, d, k = 0.25) {
  const uv = g.attributes.uv; const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  const ou = Math.random(), ov = Math.random();
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const j = f * 4 + i; uv.setXY(j, uv.getX(j) * dims[f][0] * k + ou, uv.getY(j) * dims[f][1] * k + ov); }
  return g;
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
const M = (x, y, z, ry = 0, rx = 0, rz = 0, sx = 1, sy = sx, sz = sx) => _m.compose(_v.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));

class Batch {
  constructor() { this.map = new Map(); }
  add(geo, mat) { if (!this.map.has(mat)) this.map.set(mat, []); this.map.get(mat).push(geo); }
  box(mat, w, h, d, x, y, z, ry = 0, rx = 0, rz = 0) { const g = uvBox(new THREE.BoxGeometry(w, h, d), w, h, d); g.applyMatrix4(M(x, y, z, ry, rx, rz)); this.add(g, mat); }
  cyl(mat, rt, rb, h, x, y, z, seg = 14, rx = 0, rz = 0) {
    const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1); const uv = g.attributes.uv;
    const side = (seg + 1) * 2;
    for (let i = 0; i < uv.count; i++) { if (i < side) uv.setXY(i, uv.getX(i) * rb * 6.28 * 0.25, uv.getY(i) * h * 0.25); else uv.setXY(i, uv.getX(i) * rb * 0.5, uv.getY(i) * rb * 0.5); }
    g.applyMatrix4(M(x, y, z, Math.random() * 6, rx, rz)); this.add(g, mat);
  }
  build(scene) { for (const [mat, list] of this.map) { const m = new THREE.Mesh(mergeGeometries(list, false), mat); m.castShadow = m.receiveShadow = true; scene.add(m); } }
}

class QB {
  constructor() { this.p = []; this.n = []; this.u = []; this.c = []; this.s = []; this.i = []; this.k = 0; }
  quad(a, b, c, d, uv, n, col, s0, s1) {
    this.p.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, d.x, d.y, d.z);
    for (let i = 0; i < 4; i++) { this.n.push(n.x, n.y, n.z); this.c.push(col[0], col[1], col[2]); }
    this.u.push(uv[0], uv[3], uv[2], uv[3], uv[2], uv[1], uv[0], uv[1]);
    this.s.push(s0, s0, s1, s1); const k = this.k; this.i.push(k, k + 1, k + 2, k, k + 2, k + 3); this.k += 4;
  }
  build(mat) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('aSway', new THREE.Float32BufferAttribute(this.s, 1)); g.setIndex(this.i);
    const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; return m;
  }
}

// ------------------------------------------------------------------ materials
function triMaterial(tex, o) {
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0, side: o.double ? THREE.DoubleSide : THREE.FrontSide });
  const f = (n) => Number(n).toFixed(3);
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, {
      tRock: { value: tex.rock.map }, tRockN: { value: tex.rock.normalMap }, tGround: { value: tex.ground.map }, tGroundN: { value: tex.ground.normalMap },
      tMoss: { value: tex.moss.map }, tNoise: { value: tex.noise }, tBlocks: { value: tex.blocks.map }, tBlocksN: { value: tex.blocks.normalMap },
    });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos; varying vec3 vWNrm;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz; vWNrm = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vWPos; varying vec3 vWNrm;
      uniform sampler2D tRock, tRockN, tGround, tGroundN, tMoss, tNoise, tBlocks, tBlocksN;`)
      .replace('#include <map_fragment>', `
      vec3 wn = normalize(vWNrm) * (gl_FrontFacing ? 1.0 : -1.0);
      ${o.terrain ? `
      if (vWPos.z < ${f(L.TZ0 + 4)} && vWPos.z > ${f(L.TZ1 - 4)} && vWPos.y > 9.03) {
        float ts = clamp((${f(L.TZ0)} - vWPos.z) / ${f(L.TZ0 - L.TZ1)}, 0.0, 1.0);
        float tcx = 8.0 * sin(6.2831853 * ts) * smoothstep(0.0, 0.12, ts) * smoothstep(1.0, 0.88, ts);
        float tq = (ts - 0.5) / 0.09; float tr = 2.7 + 3.0 * exp(-tq * tq);
        if (length(vec2(vWPos.x - tcx, (vWPos.y - 9.2) / 0.95)) < tr - 0.25) discard;
      }
      if (abs(vWPos.x) < 5.2 && vWPos.y > 9.03 && vWPos.y < 19.0 && vWPos.z < -262.6 && vWPos.z > -279.5) discard;` : ''}
      vec3 bw = pow(abs(wn), vec3(5.0)); bw /= (bw.x + bw.y + bw.z);
      float sc = ${f(o.scale || 0.12)};
      vec2 ux = vWPos.zy * sc, uy = vWPos.xz * sc, uz = vWPos.xy * sc;
      float m1 = texture2D(tNoise, vWPos.xz * 0.0071).r;
      float m2 = texture2D(tNoise, vWPos.zy * 0.011 + vWPos.xy * 0.009).g;
      float m3 = texture2D(tNoise, vWPos.xz * 0.06 + vWPos.y * 0.03).b;
      vec3 rockS = texture2D(tRock, ux).rgb * bw.x + texture2D(tRock, uy).rgb * bw.y + texture2D(tRock, uz).rgb * bw.z;
      vec3 rockL = texture2D(tRock, ux * 0.19, 2.5).rgb * bw.x + texture2D(tRock, uy * 0.19, 2.5).rgb * bw.y + texture2D(tRock, uz * 0.19, 2.5).rgb * bw.z;
      vec3 rock = rockS * (0.6 + rockL * 2.6);
      rock *= 0.78 + 0.4 * texture2D(tNoise, vec2(m2 * 0.3 + 0.2, vWPos.y * 0.045 + m1 * 0.3)).b;
      rock *= mix(vec3(1.08, 0.96, 0.82), vec3(0.9, 0.96, 1.04), m1) * ${f(o.tint || 1)};
      vec3 mossC = texture2D(tMoss, ux * 2.3).rgb * bw.x + texture2D(tMoss, uy * 2.3).rgb * bw.y + texture2D(tMoss, uz * 2.3).rgb * bw.z;
      mossC *= 1.1 + 0.9 * m3;
      float mossAmt = smoothstep(0.3, 0.62, smoothstep(0.4, 0.95, wn.y) * 0.5 + 0.08 + m2 * 0.75 + m3 * 0.25 + ${f(o.moss)} - 0.5);
      vec3 col = mix(rock, mossC, mossAmt * 0.92);
      float topMask = smoothstep(0.6, 0.85, wn.y + (m3 - 0.5) * 0.3) * ${f(o.top)};
      vec3 grd = texture2D(tGround, vWPos.xz * 0.31).rgb * (1.2 + 1.3 * texture2D(tNoise, vWPos.xz * 0.045).r);
      col = mix(col, grd, topMask);
      float paveM = 0.0;
      ${o.terrain ? `
      float pz = vWPos.z;
      float px = sin(pz * 0.09) * 3.2 * smoothstep(-47.0, -30.0, pz);
      float pathM = (1.0 - smoothstep(0.9, 2.8, abs(vWPos.x - px) + (m3 - 0.5) * 2.2)) * topMask * step(-50.0, pz) * step(pz, 26.0);
      vec3 dirt = vec3(0.34, 0.23, 0.13) * (0.55 + 0.9 * texture2D(tNoise, vWPos.xz * 0.9).b);
      col = mix(col, dirt, pathM * 0.9);
      paveM = topMask * step(abs(vWPos.x), 30.0) * (smoothstep(-207.0, -211.0, pz) + smoothstep(-134.6, -136.0, pz) * smoothstep(-152.0, -149.0, pz) + smoothstep(-96.0, -97.5, pz) * smoothstep(-110.5, -109.0, pz));
      paveM *= smoothstep(0.75, 0.45, m3 * 0.6 + texture2D(tNoise, vWPos.xz * 0.02).g * 0.6);
      col = mix(col, texture2D(tBlocks, vWPos.xz * 0.3).rgb * 1.35, paveM);` : ''}
      ${o.dirtFloor ? 'col = mix(col, vec3(0.16, 0.115, 0.075) * (0.5 + m3), smoothstep(0.6, 0.9, wn.y));' : ''}
      float wet = smoothstep(${f(L.WATER_Y + 2.6)}, ${f(L.WATER_Y + 0.2)}, vWPos.y);
      col *= mix(1.0, 0.5, wet);
      diffuseColor.rgb = col;`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = mix(0.96, 0.4, wet);')
      .replace('#include <normal_fragment_maps>', `
      vec3 tx = texture2D(tRockN, ux).xyz * 2.0 - 1.0; vec3 tz = texture2D(tRockN, uz).xyz * 2.0 - 1.0;
      vec3 ty = mix(texture2D(tRockN, uy).xyz * 2.0 - 1.0, texture2D(tGroundN, vWPos.xz * 0.31).xyz * 2.0 - 1.0, topMask);
      ty = mix(ty, texture2D(tBlocksN, vWPos.xz * 0.3).xyz * 2.0 - 1.0, paveM);
      float ns = ${f(o.normal || 1.3)} * (1.0 - mossAmt * 0.5);
      tx.xy *= ns; ty.xy *= ns; tz.xy *= ns;
      tx = vec3(tx.xy + wn.zy, wn.x); ty = vec3(ty.xy + wn.xz, wn.y); tz = vec3(tz.xy + wn.xy, wn.z);
      vec3 triN = normalize(tx.zyx * bw.x + ty.xzy * bw.y + tz.xyz * bw.z);
      normal = normalize((viewMatrix * vec4(triN, 0.0)).xyz);`);
  };
  mat.customProgramCacheKey = () => 'tri' + JSON.stringify(o);
  return mat;
}

function foliageMat(map, U, alphaTest = 0.42) {
  const mat = new THREE.MeshStandardMaterial({ map, alphaTest, side: THREE.DoubleSide, vertexColors: true, roughness: 0.72, alphaToCoverage: true });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.uTime; sh.uniforms.uSunView = U.uSunView; sh.uniforms.uSunCol = U.uSunCol;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aSway; uniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float wv = sin(uTime * 1.3 + position.x * 0.35 + position.z * 0.27) * 0.6 + sin(uTime * 2.9 + position.y * 0.8 + position.x * 1.3) * 0.25;
        transformed.x += wv * aSway * 0.16; transformed.z += wv * aSway * 0.1; transformed.y += sin(uTime * 2.1 + position.x) * aSway * 0.03;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uSunView; uniform vec3 uSunCol;')
      .replace('#include <normal_fragment_begin>', 'vec3 normal = normalize(vNormal); vec3 nonPerturbedNormal = normal;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float back = pow(max(dot(-normalize(vViewPosition), uSunView), 0.0), 3.0);
        totalEmissiveRadiance += diffuseColor.rgb * uSunCol * back * 0.5;`);
  };
  mat.customProgramCacheKey = () => 'foliage';
  return mat;
}

// ------------------------------------------------------------------ build
export function buildWorld(scene, tex) {
  const R = rng(20261115);
  const U = { uTime: { value: 0 }, uSunView: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color(1, 0.8, 0.5) } };
  const world = { U, boxes: [], circles: [], fires: [], events: [], updaters: [], relics: [], trees: 0 };
  const addBox = (x0, x1, z0, z1, top, bottom = -1e9) => { const b = { x0, x1, z0, z1, top, bottom, on: true }; world.boxes.push(b); return b; };
  const addCircle = (x, z, r, top = 1e9) => { const c = { x, z, r, top, on: true }; world.circles.push(c); return c; };
  const batch = new Batch();

  const stone = new THREE.MeshStandardMaterial({ map: tex.blocks.map, normalMap: tex.blocks.normalMap, roughness: 0.93, normalScale: new THREE.Vector2(1.3, 1.3) });
  const wood = new THREE.MeshStandardMaterial({ map: tex.wood.map, normalMap: tex.wood.normalMap, roughness: 0.85 });
  const ropeM = new THREE.MeshStandardMaterial({ color: 0x5e4a30, roughness: 1 });
  const rockMat = triMaterial(tex, { moss: 0.42, top: 0, scale: 0.3, normal: 1.4 });
  world.stone = stone;

  // ---------------- terrain
  {
    const axis = (c0, c1, step, o0, o1) => { const a = []; for (let v = c0; v <= c1 + 1e-6; v += step) a.push(v); let s = step, v = c1; while (v < o1) { s *= 1.14; v = Math.min(v + s, o1); a.push(v); } s = step; v = c0; while (v > o0) { s *= 1.14; v = Math.max(v - s, o0); a.unshift(v); } return a; };
    const xs = axis(-78, 100, 1.0, -620, 440), zs = axis(-292, 44, 1.0, -520, 260);
    const nx = xs.length, nz = zs.length;
    const pos = new Float32Array(nx * nz * 3);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const k = (j * nx + i) * 3; pos[k] = xs[i]; pos[k + 1] = H(xs[i], zs[j], true); pos[k + 2] = zs[j]; }
    const idx = new Uint32Array((nx - 1) * (nz - 1) * 6); let q = 0;
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1; idx[q++] = a; idx[q++] = c; idx[q++] = b; idx[q++] = b; idx[q++] = c; idx[q++] = d; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeVertexNormals();
    // push steep rock faces in and out so the cliffs are craggy rather than smooth
    const nrm = g.attributes.normal;
    for (let k = 0; k < nx * nz; k++) {
      const ny = nrm.getY(k), steep = sm(0.3, 0.75, 1 - ny); if (steep <= 0) continue;
      const x = pos[k * 3], y = pos[k * 3 + 1], z = pos[k * 3 + 2];
      if (z < L.TZ0 + 10 && z > L.TZ1 - 10 && Math.abs(x) < 16 && y < 22) continue;
      if (z < -252 && Math.abs(x) < 24) continue;
      const wl = z > -8 ? 5 * sm(-8, 20, z) : z > -132.4 ? 0 : 9;
      const mask = steep * Math.max(sm(wl + 3, wl + 10, y), sm(wl - 3, wl - 9, y));
      if (mask <= 0) continue;
      let hx = nrm.getX(k), hz = nrm.getZ(k); const hl = Math.hypot(hx, hz) || 1; hx /= hl; hz /= hl;
      const a = (fbm(y * 0.2 + x * 0.05, z * 0.07 + y * 0.09, 3, 77) - 0.5) * 6 * mask;
      pos[k * 3] += hx * a; pos[k * 3 + 2] += hz * a;
    }
    g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, triMaterial(tex, { terrain: true, moss: 0.36, top: 1, scale: 0.12, normal: 1.5 }));
    mesh.castShadow = mesh.receiveShadow = true; scene.add(mesh); world.terrain = mesh;
  }

  // ---------------- water
  {
    const X0 = -220, Z0 = -280, SX = 480, SZ = 360, W = 240, Hh = 180;
    const data = new Uint8Array(W * Hh * 4);
    for (let j = 0; j < Hh; j++) for (let i = 0; i < W; i++) { const d = clamp((L.WATER_Y - H(X0 + (i + 0.5) / W * SX, Z0 + (j + 0.5) / Hh * SZ, true)) / 6, 0, 1); const k = (j * W + i) * 4; data[k] = data[k + 1] = data[k + 2] = d * 255; data[k + 3] = 255; }
    const dt = new THREE.DataTexture(data, W, Hh, THREE.RGBAFormat); dt.magFilter = dt.minFilter = THREE.LinearFilter; dt.needsUpdate = true;
    const uniforms = {
      tN: { value: tex.waterN }, tDepth: { value: dt }, tNoise: { value: tex.noise }, uTime: U.uTime,
      uSunDir: { value: new THREE.Vector3() }, uSunCol: { value: new THREE.Color() }, uZen: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uGlow: { value: new THREE.Color() },
      uAmb: { value: new THREE.Color() }, uFoam: { value: new THREE.Color() }, uFixedDepth: { value: -1 },
      uFogColor: fogUniforms.uFogColor, uFogDensity: fogUniforms.uFogDensity,
    };
    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `
        uniform sampler2D tN, tDepth, tNoise; uniform float uTime, uFogDensity, uFixedDepth;
        uniform vec3 uSunDir, uSunCol, uZen, uHor, uGlow, uAmb, uFoam, uFogColor; varying vec3 vW;
        void main(){
          vec2 p = vW.xz; vec2 flow = vec2(-1.0, 0.25);
          vec3 a = texture2D(tN, p * 0.045 + flow * uTime * 0.02).xyz * 2.0 - 1.0;
          vec3 b = texture2D(tN, p * 0.11 + vec2(0.3, -0.8) * uTime * 0.03).xyz * 2.0 - 1.0;
          vec3 c = texture2D(tN, p * 0.31 + flow * uTime * 0.07).xyz * 2.0 - 1.0;
          float dist = length(cameraPosition - vW);
          float rough = mix(0.55, 0.12, smoothstep(60.0, 700.0, dist));
          vec3 N = normalize(vec3((a.x + b.x * 0.7 + c.x * 0.45) * rough, 1.0, (a.y + b.y * 0.7 + c.y * 0.45) * rough));
          vec3 V = normalize(cameraPosition - vW);
          float fres = 0.03 + 0.97 * pow(clamp(1.0 - dot(N, V), 0.0, 1.0), 5.0);
          vec3 Rf = reflect(-V, N); Rf.y = abs(Rf.y);
          vec3 sky = mix(uHor, uZen, pow(max(Rf.y, 0.0), 0.5));
          float sa = max(dot(normalize(Rf.xz + 1e-4), normalize(uSunDir.xz)), 0.0);
          sky += uGlow * pow(sa, 6.0) * exp(-Rf.y * 5.0);
          float sd = max(dot(Rf, uSunDir), 0.0);
          vec3 spec = uSunCol * (pow(sd, 500.0) * 26.0 + pow(sd, 50.0) * 0.5);
          float depth = uFixedDepth >= 0.0 ? uFixedDepth : texture2D(tDepth, (p - vec2(${X0}.0, ${Z0}.0)) / vec2(${SX}.0, ${SZ}.0)).r;
          vec3 body = mix(vec3(0.06, 0.2, 0.15), vec3(0.008, 0.055, 0.06), smoothstep(0.0, 0.75, depth)) * uAmb;
          vec3 col = mix(body, sky, fres) + spec;
          float fn = texture2D(tNoise, p * 0.13 + flow * uTime * 0.04).r, fn2 = texture2D(tNoise, p * 0.4 - flow * uTime * 0.05).g;
          float shore = 1.0 - smoothstep(0.0, 0.16, depth);
          float foam = smoothstep(0.55, 0.85, shore * (0.55 + fn * 0.7));
          float dw = length(p - vec2(72.0, -80.0));
          float churn = 1.0 - smoothstep(3.0, 30.0, dw);
          foam = max(foam, smoothstep(0.42, 0.75, churn * (0.45 + fn * 0.5 + fn2 * 0.5)));
          col = mix(col, uFoam, foam * 0.9);
          float fog = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist);
          gl_FragColor = vec4(mix(col, uFogColor, fog), 1.0);
        }`,
    });
    const river = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); river.rotation.x = -Math.PI / 2; river.scale.set(1500, 1500, 1); river.position.set(82 - 750, L.WATER_Y, -100); scene.add(river);
    const mat2 = mat.clone(); mat2.uniforms = { ...uniforms, uFixedDepth: { value: 0.5 } };
    const upper = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat2); upper.rotation.x = -Math.PI / 2; upper.scale.set(170, 16, 1); upper.position.set(76.5 + 85, 21.3, -80); scene.add(upper);
    world.water = uniforms;
  }

  // ---------------- waterfall
  {
    const fallMat = new THREE.ShaderMaterial({
      uniforms: { tNoise: { value: tex.noise }, uTime: U.uTime, uLight: { value: new THREE.Color(1, 1, 1) }, uFogColor: fogUniforms.uFogColor, uFogDensity: fogUniforms.uFogDensity },
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      vertexShader: 'varying vec2 vUv; varying float vD; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vD = -mv.z; gl_Position = projectionMatrix * mv; }',
      fragmentShader: `uniform sampler2D tNoise; uniform float uTime, uFogDensity; uniform vec3 uLight, uFogColor; varying vec2 vUv; varying float vD;
        void main(){
          float sp = 0.5 + vUv.y * 0.7;
          float n = texture2D(tNoise, vec2(vUv.x * 1.6, vUv.y * 1.4 - uTime * 0.5 * sp)).r;
          float n2 = texture2D(tNoise, vec2(vUv.x * 4.0 + 0.3, vUv.y * 3.2 - uTime * 0.85 * sp)).g;
          float n3 = texture2D(tNoise, vec2(vUv.x * 9.0, vUv.y * 2.0 - uTime * 1.3 * sp)).b;
          float streak = n * 0.5 + n2 * 0.45 + n3 * 0.35;
          float edge = smoothstep(0.0, 0.22, vUv.x) * smoothstep(1.0, 0.78, vUv.x);
          float a = smoothstep(0.3, 0.72, streak * (0.55 + edge * 0.75)) * edge;
          a = max(a, edge * 0.55 * smoothstep(0.1, 0.0, vUv.y));
          a *= smoothstep(1.0, 0.93, vUv.y) * smoothstep(0.0, 0.015, vUv.y);
          vec3 col = uLight * (0.5 + 0.75 * streak) * mix(vec3(0.75, 0.9, 0.95), vec3(1.0), smoothstep(0.5, 0.95, streak));
          float fog = 1.0 - exp(-uFogDensity * uFogDensity * vD * vD);
          gl_FragColor = vec4(mix(col, uFogColor, fog), clamp(a, 0.0, 1.0) * 0.95);
        }`,
    });
    const mk = (z, w, x0, top, bot, out) => {
      const g = new THREE.PlaneGeometry(1, 1, 8, 40); const p = g.attributes.position, uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) {
        const u = uv.getX(i), v = 1 - uv.getY(i);
        p.setXYZ(i, x0 - out * Math.sqrt(v) - Math.sin(u * 3.1416) * 0.8 * v, lerp(top, bot, v * v * 0.35 + v * 0.65), z + (u - 0.5) * w * (1 + 0.35 * v)); uv.setY(i, v);
      }
      const m = new THREE.Mesh(g, fallMat); m.frustumCulled = false; m.renderOrder = 5; scene.add(m);
    };
    mk(-80, 9.5, 78.5, 21.5, L.WATER_Y - 0.5, 5.5);
    mk(-80.5, 6, 79.2, 21.3, L.WATER_Y - 0.5, 3.6);
    world.fall = fallMat.uniforms; world.fallBase = new THREE.Vector3(72.5, L.WATER_Y, -80);
    const rb = new THREE.Mesh(new THREE.PlaneGeometry(46, 46), new THREE.ShaderMaterial({
      uniforms: { uA: { value: 0.3 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform float uA; varying vec2 vUv; void main(){ vec2 q = vUv - vec2(0.5, 0.0); float r = length(q) * 2.0; float t = (r - 0.8) / 0.14;
        if (t < 0.0 || t > 1.0) discard; vec3 c = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + (1.0 - t) * 0.85));
        gl_FragColor = vec4(c, sin(t * 3.1416) * uA * smoothstep(0.0, 0.35, vUv.y)); }`,
    }));
    rb.position.set(62, L.WATER_Y + 1, -79); rb.rotation.y = -Math.PI / 2 + 0.25; rb.renderOrder = 6; scene.add(rb); world.rainbow = rb.material.uniforms.uA;
  }

  // ---------------- boulders
  {
    const variants = [];
    for (let v = 0; v < 4; v++) {
      let g = new THREE.IcosahedronGeometry(1, 2); g.deleteAttribute('normal'); g.deleteAttribute('uv'); g = mergeVertices(g);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const k = 0.72 + 0.6 * fbm(x * 1.3 + v * 9, y * 1.3 + z * 1.7, 3, 40 + v); p.setXYZ(i, x * k, y * k * 0.78, z * k); }
      g.computeVertexNormals(); variants.push(g);
    }
    const list = [];
    const rock = (x, z, s, sink = 0.3, collide = false) => {
      const y = H(x, z, true) - s * sink; const g = variants[Math.floor(R() * 4)].clone(); g.applyMatrix4(M(x, y + s * 0.3, z, R() * 6, R() * 0.4, R() * 0.4, s * (0.8 + R() * 0.5), s * (0.7 + R() * 0.5), s * (0.8 + R() * 0.5)));
      list.push(g); if (collide) addCircle(x, z, s * 0.85, y + s);
    };
    for (let i = 0; i < 46; i++) { const z = 30 - R() * 76, side = R() < 0.5 ? -1 : 1, x = pathX(z) + side * (6 + R() * 16); if (H(x, z) > 6 || H(x, z) < -0.6) continue; rock(x, z, 0.5 + R() * R() * 1.8, 0.3, true); }
    for (let i = 0; i < 26; i++) rock(-22 + R() * 90, -57 - R() * 30, 1.5 + R() * 3.2, 0.1);
    for (let i = 0; i < 10; i++) rock(62 + R() * 9, -74 - R() * 12, 1.5 + R() * 2.5, 0.1);
    for (let i = 0; i < 14; i++) { const x = (R() < 0.5 ? -1 : 1) * (5 + R() * 6), z = -97 - R() * 11; rock(x, z, 0.4 + R() * 0.9, 0.3, true); }
    for (let i = 0; i < 12; i++) { const x = (R() < 0.5 ? -1 : 1) * (5.5 + R() * 5), z = -136 - R() * 11; rock(x, z, 0.4 + R() * 1.0, 0.3, true); }
    for (let i = 0; i < 34; i++) { const a = R() * 6.28, d = 19 + R() * 7; const x = Math.cos(a) * d, z = -234 + Math.sin(a) * d * 1.05; if (z < -256 || z > -209 || Math.abs(x - 17) < 6 && Math.abs(z + 233) < 6) continue; rock(x, z, 0.5 + R() * 1.6, 0.3, true); }
    for (let i = 0; i < 40; i++) rock(-60 - R() * 300, -300 + R() * 420, 2 + R() * 5, 0.2);
    const m = new THREE.Mesh(mergeGeometries(list, false), rockMat); m.castShadow = m.receiveShadow = true; scene.add(m);
  }

  // ---------------- ruins on the first plateau
  {
    const col = (x, z, h, r = 0.55, collide = true) => {
      const y = H(x, z) - 0.3; let yy = y; const drum = 1.1;
      for (let k = 0; yy < y + h; k++) { const dh = Math.min(drum, y + h - yy); batch.cyl(stone, r * (0.97 + R() * 0.05), r * (0.97 + R() * 0.05), dh, x + (R() - 0.5) * 0.06, yy + dh / 2, z + (R() - 0.5) * 0.06, 14, (R() - 0.5) * 0.02, (R() - 0.5) * 0.02); yy += dh; }
      batch.cyl(stone, r * 1.25, r * 1.3, 0.35, x, y + 0.3, z, 14);
      if (collide) addCircle(x, z, r + 0.15);
    };
    // processional columns along the path
    const zs = [12, 3, -6, -15, -24, -33];
    zs.forEach((z, i) => { for (const s of [-1, 1]) { const x = pathX(z) + s * 4.6; const full = (i + (s > 0 ? 1 : 0)) % 3 === 0; col(x, z, full ? 6.2 : 1.2 + R() * 3.2); if (full) batch.box(stone, 1.7, 0.5, 1.7, x, H(x, z) + 6.15, z, R()); } });
    // fallen drums
    for (let i = 0; i < 9; i++) { const z = 14 - R() * 50, x = pathX(z) + (R() < 0.5 ? -1 : 1) * (6.5 + R() * 6); const y = H(x, z); if (y > 5.5 || y < -0.5) continue; batch.cyl(stone, 0.55, 0.55, 1.1 + R(), x, y + 0.42, z, 14, Math.PI / 2 + (R() - 0.5) * 0.2, R() * 3); addCircle(x, z, 0.9, y + 1.0); }
    // little shrine on the starting knoll
    for (let k = 0; k < 7; k++) { const a = 0.6 + k * 0.82; if (Math.abs(Math.cos(a)) < 0.5) continue; const x = Math.cos(a) * 5.2, z = 25 + Math.sin(a) * 5.2; col(x, z, k % 2 ? 4.6 : 1.4 + R() * 2.2, 0.42); }
    batch.cyl(stone, 3.1, 3.3, 0.4, 0, H(0, 25) + 0.02, 25, 28);
    addBox(-2.2, 2.2, 22.8, 27.2, H(0, 25) + 0.22);
    // broken walls on the west rim
    for (let i = 0; i < 7; i++) { const z = 18 - i * 9 - R() * 3, x = -20.5 + R() * 2.5; const y = H(x, z); if (y > 6 || y < -0.5) continue; const w = 3 + R() * 3, h = 0.8 + R() * 1.8; const ry = (R() - 0.5) * 0.5; batch.box(stone, 0.9, h, w, x, y + h / 2 - 0.2, z, ry); addCircle(x, z, 1.2, y + h); }
    // gate arch at the bridge head
    const az = -45.6;
    for (const s of [-1, 1]) { batch.box(stone, 1.3, 4.6, 1.5, s * 2.5, 2.2, az); addBox(s * 2.5 - 0.7, s * 2.5 + 0.7, az - 0.8, az + 0.8, 8); batch.box(stone, 1.7, 0.4, 1.9, s * 2.5, 0.1, az); }
    for (let k = 0; k <= 8; k++) { const a = Math.PI * k / 8; batch.box(stone, 1.05, 0.95, 1.5, Math.cos(a) * 2.5, 4.5 + Math.sin(a) * 2.5, az, 0, 0, a - Math.PI / 2); }
    for (const s of [-1, 1]) { batch.box(stone, 4.5, 2.0 + R(), 1.0, s * 5.3, 1.0, az + 0.1); addBox(s * 5.3 - 2.3, s * 5.3 + 2.3, az - 0.5, az + 0.6, 4); }
    world.archPos = new THREE.Vector3(0, 1.45, az);
  }

  // ---------------- rope bridge
  {
    const N = L.BR_N, Z0 = L.BR_Z0, Z1 = L.BR_Z1, SEG = 28;
    batch.box(stone, 4.6, 7, 3.4, 0, -3.25, Z0 + 0.4); addBox(-2.3, 2.3, Z0 - 1.3, Z0 + 2.1, 0.25);
    batch.box(stone, 4.6, 7, 3.4, 0, -3.25, Z1 - 0.4); addBox(-2.3, 2.3, Z1 - 2.1, Z1 + 1.3, 0.25);
    for (const z of [Z0 + 0.2, Z1 - 0.2]) for (const s of [-1, 1]) { batch.cyl(wood, 0.13, 0.17, 2.5, s * 1.3, 1.3, z, 8, 0, s * 0.05); addCircle(s * 1.3, z, 0.3); }
    const br = { amp: 0.13, dipU: -1, dip: 0, t: 0, planks: [], debris: [], broken: false, queue: [] };
    const pg = uvBox(new THREE.BoxGeometry(2.1, 0.07, 0.7), 2.1, 0.07, 0.7, 0.45);
    const planks = new THREE.InstancedMesh(pg, wood, N); planks.castShadow = planks.receiveShadow = true; planks.frustumCulled = false; scene.add(planks);
    for (let i = 0; i < N; i++) br.planks.push({ alive: !(i === 9 || i === 37), yaw: (R() - 0.5) * 0.12, roll: (R() - 0.5) * 0.07, dx: (R() - 0.5) * 0.1 });
    const rg = new THREE.CylinderGeometry(0.034, 0.034, 1, 6, 1);
    const ropes = new THREE.InstancedMesh(rg, ropeM, SEG * 4 + N); ropes.castShadow = true; ropes.frustumCulled = false; scene.add(ropes);
    { const warm = new THREE.Mesh(pg, wood); warm.position.set(0, -400, 0); warm.castShadow = true; scene.add(warm); } // same shader variant as the falling planks, compiled at load
    br.deckX = (u) => br.amp * (Math.sin(Math.PI * u) * Math.sin(br.t * 1.05) + 0.35 * Math.sin(2 * Math.PI * u) * Math.sin(br.t * 1.9 + 1));
    br.deckY = (u) => 0.3 - 2.4 * Math.sin(Math.PI * u) - br.dip * Math.exp(-(((u - br.dipU) / 0.07) ** 2));
    br.handY = (u) => br.deckY(u) + 1.0 + 0.95 * (2 * u - 1) ** 2;
    br.uOf = (z) => (Z0 - z) / (Z0 - Z1);
    br.top = (x, z) => {
      if (z > Z0 || z < Z1) return -1e9; const u = br.uOf(z); if (Math.abs(x - br.deckX(u)) > 1.15) return -1e9;
      const f = u * N; const i = clamp(Math.floor(f), 0, N - 1), fr = f - i; let ok = br.planks[i].alive;
      if (!ok) { if (fr < 0.3 && i > 0 && br.planks[i - 1].alive) ok = true; else if (fr > 0.7 && i < N - 1 && br.planks[i + 1].alive) ok = true; }
      return ok ? br.deckY(u) + 0.04 : -1e9;
    };
    const o = new THREE.Object3D(), Yv = new THREE.Vector3(0, 1, 0), a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3();
    const zOf = (u) => lerp(Z0, Z1, u);
    const plankXf = (i) => {
      const u = (i + 0.5) / N, P = br.planks[i], e = 0.01;
      o.position.set(br.deckX(u) + P.dx, br.deckY(u), zOf(u));
      o.rotation.set(-Math.atan((br.deckY(u + e) - br.deckY(u - e)) / (zOf(u + e) - zOf(u - e))), P.yaw, P.roll + br.amp * 0.5 * Math.sin(Math.PI * u) * Math.cos(br.t * 1.05));
    };
    const gone = (u) => { const i = clamp(Math.floor(u * N), 0, N - 1); return br.broken && i >= 13 && i <= 26 && !br.planks[i].alive; };
    const seg = (k, hide, th = 1) => { d.subVectors(b, a); const len = d.length(); o.position.copy(a).addScaledVector(d, 0.5); o.quaternion.setFromUnitVectors(Yv, d.multiplyScalar(1 / len)); o.scale.set(hide ? 0 : th, hide ? 0 : len, hide ? 0 : th); o.updateMatrix(); ropes.setMatrixAt(k, o.matrix); };
    br.break = () => {
      if (br.broken) return; br.broken = true; world.events.push({ type: 'snap' });
      for (let i = 26; i >= 13; i--) br.queue.push({ i, t: (26 - i) * 0.075 });
    };
    br.update = (dt, time, player) => {
      br.t = time; const on = player && player.onBridge;
      br.amp += ((on ? 0.36 : 0.12) - br.amp) * Math.min(1, dt * 0.8);
      if (on) { br.dipU = player.bu; br.dip += (0.26 - br.dip) * Math.min(1, dt * 5); } else br.dip += (0 - br.dip) * Math.min(1, dt * 3);
      for (const qd of br.queue) {
        qd.t -= dt;
        if (qd.t <= 0 && !qd.done) {
          qd.done = true; const P = br.planks[qd.i]; if (!P.alive) continue; P.alive = false;
          plankXf(qd.i); const m = new THREE.Mesh(pg, wood); m.castShadow = true; m.position.copy(o.position); m.rotation.copy(o.rotation); scene.add(m);
          br.debris.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 2, -1 - Math.random() * 2, (Math.random() - 0.5) * 2), w: new THREE.Vector3((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 6) });
          world.events.push({ type: 'plank', pos: o.position.clone() });
        }
      }
      for (const D of br.debris) {
        if (!D.m.visible) continue; D.v.y -= 16 * dt; D.m.position.addScaledVector(D.v, dt); D.m.rotation.x += D.w.x * dt; D.m.rotation.y += D.w.y * dt; D.m.rotation.z += D.w.z * dt;
        if (D.m.position.y < L.WATER_Y) { D.m.visible = false; world.events.push({ type: 'splash', pos: D.m.position.clone(), size: 1 }); }
      }
      for (let i = 0; i < N; i++) { o.quaternion.identity(); plankXf(i); o.scale.setScalar(br.planks[i].alive ? 1 : 0.0001); o.updateMatrix(); planks.setMatrixAt(i, o.matrix); }
      planks.instanceMatrix.needsUpdate = true;
      let k = 0;
      for (let r = 0; r < 4; r++) {
        const side = r % 2 ? 1 : -1, hand = r < 2;
        for (let j = 0; j < SEG; j++) {
          const u0 = j / SEG, u1 = (j + 1) / SEG;
          a.set(br.deckX(u0) + side * (hand ? 1.2 : 0.97), hand ? br.handY(u0) : br.deckY(u0) - 0.06, zOf(u0));
          b.set(br.deckX(u1) + side * (hand ? 1.2 : 0.97), hand ? br.handY(u1) : br.deckY(u1) - 0.06, zOf(u1));
          seg(k++, !hand && gone((u0 + u1) / 2));
        }
      }
      for (let i = 0; i < N; i++) { const u = (i + 0.5) / N, side = i % 2 ? 1 : -1; a.set(br.deckX(u) + side * 0.97, br.deckY(u) - 0.06, zOf(u)); b.set(br.deckX(u) + side * 1.2, br.handY(u), zOf(u)); seg(k++, gone(u), 0.55); }
      ropes.instanceMatrix.needsUpdate = true;
    };
    world.bridge = br;
  }

  // ---------------- crumbling stairs
  {
    const st = { steps: [] }; const missing = new Set([8, 9, 17, 18]), crumble = new Set([13, 23]);
    for (let i = 0; i < L.ST_N; i++) {
      if (missing.has(i)) { st.steps.push(null); continue; }
      const z0 = L.ST_Z0 - i * L.ST_DZ, top = (i + 1) * L.ST_RISE, w = 4.4 + R() * 0.4;
      const g = uvBox(new THREE.BoxGeometry(w, 0.6, 0.9), w, 0.6, 0.9);
      const m = new THREE.Mesh(g, stone); m.castShadow = m.receiveShadow = true; m.position.set((R() - 0.5) * 0.2, top - 0.3, z0 - L.ST_DZ / 2); m.rotation.set((R() - 0.5) * 0.02, (R() - 0.5) * 0.05, (R() - 0.5) * 0.03); scene.add(m);
      const box = addBox(-2.2, 2.2, z0 - L.ST_DZ, z0, top, top - 0.6);
      const s = { i, m, box, crumble: crumble.has(i), state: 'ok', t: 0, vy: 0, x0: m.position.x }; box.step = s; st.steps.push(s);
      const next = st.steps.length; if (i % 3 === 1 && !missing.has(i + 1) && !crumble.has(i)) { batch.box(stone, 3.4, top + 27, 1.3, 0, (top - 0.5 - 27) / 2, z0 - L.ST_DZ / 2 - 0.2); }
      if (i % 5 === 2) for (const sd of [-1, 1]) if (R() < 0.7) batch.box(stone, 0.45, 0.7 + R() * 0.8, 0.6, sd * 2.1, top + 0.4, z0 - 0.4, R() * 0.3);
    }
    st.touch = (s) => { if (s.crumble && s.state === 'ok') { s.state = 'shake'; s.t = 0.6; world.events.push({ type: 'crack', pos: s.m.position.clone() }); } };
    st.update = (dt) => {
      for (const s of st.steps) {
        if (!s || s.state === 'ok' || s.state === 'gone') continue;
        if (s.state === 'shake') { s.t -= dt; s.m.position.x = s.x0 + (Math.random() - 0.5) * 0.06; s.m.rotation.z = (Math.random() - 0.5) * 0.03; if (s.t <= 0) { s.state = 'fall'; s.box.on = false; world.events.push({ type: 'rubble', pos: s.m.position.clone() }); } }
        else { s.vy -= 18 * dt; s.m.position.y += s.vy * dt; s.m.rotation.x += dt * 1.3; s.m.rotation.z += dt * 0.7; if (s.m.position.y < -30) { s.state = 'gone'; s.m.visible = false; } }
      }
    };
    // landing + terrace dressing
    for (const s of [-1, 1]) { batch.box(stone, 1.0, 2.6, 1.0, s * 2.9, 1.1, -108.3); addCircle(s * 2.9, -108.3, 0.75); batch.box(stone, 1.0, 1.4 + R() * 1.6, 1.0, s * 2.9, 9.6, -135.2); addCircle(s * 2.9, -135.2, 0.75); }
    world.stairs = st;
  }

  // ---------------- tunnel
  {
    const tubeMat = triMaterial(tex, { moss: 0.12, top: 0, scale: 0.22, normal: 1.6, double: true, tint: 0.5, dirtFloor: true });
    const RING = 124, SEGA = 22, s0 = -0.065, s1 = 1.065, th0 = -0.3, th1 = Math.PI + 0.3;
    const pos = [], idx = [];
    const frame = (s) => { const z = L.TZ0 - s * (L.TZ0 - L.TZ1); const cx = tunnelCx(z), e = 0.25; const tx = tunnelCx(z - e) - tunnelCx(z + e), tz = -2 * e; const l = Math.hypot(tx, tz); return { z, cx, rx: -tz / l, rz: tx / l, ang: Math.atan2(tx, tz), r: tunnelR(clamp(s, 0, 1)) }; };
    world.tunnelFrame = frame;
    for (let i = 0; i <= RING; i++) {
      const s = lerp(s0, s1, i / RING), F = frame(s);
      for (let j = 0; j <= SEGA; j++) {
        const th = lerp(th0, th1, j / SEGA);
        const rr = F.r * (1 + (fbm(th * 1.6 + 3, s * 46, 3, 81) - 0.5) * 0.36 * sm(-0.3, 0.5, Math.sin(th) + 0.2)) + (fbm(th * 5, s * 150, 2, 82) - 0.5) * 0.25;
        const lx = Math.cos(th) * rr, ly = Math.sin(th) * rr * 0.95 + 0.2;
        pos.push(F.cx + F.rx * lx, 9 + ly, F.z + F.rz * lx);
      }
      // floor strip (two extra verts)
      pos.push(F.cx - F.rx * (F.r + 0.6), 9.08, F.z - F.rz * (F.r + 0.6), F.cx + F.rx * (F.r + 0.6), 9.08, F.z + F.rz * (F.r + 0.6));
    }
    const W = SEGA + 3;
    for (let i = 0; i < RING; i++) {
      for (let j = 0; j < SEGA; j++) { const a = i * W + j, b = a + 1, c = a + W, d = c + 1; idx.push(a, b, c, b, d, c); }
      const a = i * W + SEGA + 1, b = a + 1, c = a + W, d = c + 1; idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const tube = new THREE.Mesh(g, tubeMat); tube.receiveShadow = true; scene.add(tube);
    // carved stone ribs
    for (const s of [0.1, 0.24, 0.38, 0.62, 0.76, 0.9]) {
      const F = frame(s), r = F.r + 0.05;
      for (const sd of [-1, 1]) batch.box(stone, 0.6, 2.2, 0.7, F.cx + F.rx * sd * (r - 0.3), 10.0, F.z + F.rz * sd * (r - 0.3), F.ang);
      for (let k = 1; k < 8; k++) { const a = Math.PI * k / 8; const lx = Math.cos(a) * (r - 0.25), ly = 1.9 + Math.sin(a) * (r * 0.95 - 1.75); batch.box(stone, r * 0.5, 0.55, 0.7, F.cx + F.rx * lx, 9 + ly, F.z + F.rz * lx, F.ang, 0, a - Math.PI / 2); }
    }
    // portals
    for (const [z, dir] of [[L.TZ0 + 2.6, 1], [L.TZ1 - 2.6, -1]]) {
      const zc = z - dir * 0.9, zf = z + dir * 1.6; // 5 m deep masonry vault hiding the raw rock rim
      for (const sd of [-1, 1]) { batch.box(stone, 1.9, 5.0, 5.0, sd * 3.95, 11.3, zc); addBox(sd * 3.95 - 0.95, sd * 3.95 + 0.95, zc - 2.5, zc + 2.5, 30); batch.box(stone, 2.3, 0.5, 5.4, sd * 3.95, 9.2, zc); }
      batch.box(stone, 9.8, 2.2, 5.0, 0, 13.6, zc); batch.box(stone, 7.0, 0.9, 4.2, 0, 15.1, zc); batch.box(stone, 3.6, 0.8, 3.4, 0, 15.9, zc);
      for (let k = 0; k <= 10; k++) { const a = Math.PI * k / 10; batch.box(stone, 1.05, 1.25, 1.1, Math.cos(a) * 3.0, 9.25 + Math.sin(a) * 2.95, zf - dir * 0.5, 0, 0, a - Math.PI / 2); }
      const fr = new THREE.Mesh(uvBox(new THREE.BoxGeometry(5.6, 0.7, 0.1), 5.6, 0.7, 0.1), new THREE.MeshStandardMaterial({ map: tex.frieze.map, normalMap: tex.frieze.normalMap, roughness: 0.9 }));
      { const uv = fr.geometry.attributes.uv; for (let i = 16; i < 24; i++) uv.setXY(i, i % 4 === 0 || i % 4 === 2 ? 0 : 0.6, i % 4 < 2 ? 1 : 0); }
      fr.position.set(0, 13.75, z + dir * 1.63); if (dir < 0) fr.rotation.y = Math.PI; scene.add(fr);
    }
    // glowing mushrooms
    const ml = []; const mg = new THREE.SphereGeometry(1, 7, 5, 0, 6.3, 0, 1.6);
    for (let i = 0; i < 70; i++) {
      const s = 0.05 + R() * 0.9, F = frame(s), sd = R() < 0.5 ? -1 : 1, th = 0.05 + R() * 0.5, rr = F.r - 0.25;
      const lx = sd * Math.cos(th) * rr, ly = Math.sin(th) * rr * 0.95 + 0.15;
      for (let k = 0; k < 3; k++) { const gg = mg.clone(); const sc = 0.03 + R() * 0.055; gg.applyMatrix4(M(F.cx + F.rx * lx + (R() - 0.5) * 0.4, 9 + ly + (R() - 0.5) * 0.3, F.z + F.rz * lx + (R() - 0.5) * 0.4, 0, (R() - 0.5), (R() - 0.5), sc, sc * 0.7, sc)); ml.push(gg); }
    }
    const mush = new THREE.Mesh(mergeGeometries(ml, false), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.1, 0.95, 0.75) })); scene.add(mush);
    // overexposed daylight at both mouths
    world.tunnelGlows = [];
    for (const [z, ry] of [[L.TZ0 + 3.4, 0], [L.TZ1 - 3.4, 0]]) { const gm = new THREE.Mesh(new THREE.PlaneGeometry(9, 7.5), glowMaterial(0xffffff, 0)); gm.position.set(0, 11.6, z); gm.rotation.y = ry; gm.renderOrder = 8; scene.add(gm); world.tunnelGlows.push(gm.material.uniforms); }
    // rubble mound for the sock
    const F = frame(0.5); world.sockPos = new THREE.Vector3(F.cx + F.rx * 3.3, 9.9, F.z + F.rz * 3.3);
    batch.cyl(stone, 0.5, 0.75, 0.55, world.sockPos.x, 9.3, world.sockPos.z, 10); addCircle(world.sockPos.x, world.sockPos.z, 0.8);
  }

  // ---------------- temple
  {
    const doorMat = new THREE.MeshStandardMaterial({ map: tex.door.map, normalMap: tex.door.normalMap, roughness: 0.88, normalScale: new THREE.Vector2(1.6, 1.6) });
    const friezeMat = new THREE.MeshStandardMaterial({ map: tex.frieze.map, normalMap: tex.frieze.normalMap, roughness: 0.9, normalScale: new THREE.Vector2(1.5, 1.5) });
    const P = 9.9;
    // podium + steps
    batch.box(stone, 30, 1.6, 13.5, 0, P - 0.8, -261.25); addBox(-15, 15, -268, -254.5, P);
    batch.box(stone, 31.2, 1.2, 1.0, 0, 9.0, -254.3); addBox(-15.6, 15.6, -254.8, -253.8, 9.6);
    batch.box(stone, 32.4, 0.9, 1.0, 0, 8.85, -253.5); addBox(-16.2, 16.2, -254.0, -253.0, 9.3);
    batch.box(stone, 9, 1.6, 15, 0, P - 0.8, -271); addBox(-4.6, 4.6, -278.5, -267.9, P);
    // main wall with doorway
    for (const s of [-1, 1]) { batch.box(stone, 12.4, 17.5, 2.6, s * 9.2, P + 8.75, -263.3); addBox(s * 9.2 - 6.2, s * 9.2 + 6.2, -264.6, -262, 40); }
    batch.box(stone, 6.2, 9.9, 2.6, 0, P + 12.55, -263.3);
    for (const s of [-1, 1]) batch.box(stone, 1.0, 7.9, 1.0, s * 3.5, P + 3.95, -261.8);
    batch.box(stone, 8.6, 2.0, 1.2, 0, P + 8.6, -261.7);
    const fr = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 1.2), friezeMat); fr.position.set(0, P + 8.6, -261.08); scene.add(fr);
    // columns + entablature + stepped roof comb
    for (const x of [-11, -5.9, 5.9, 11]) { for (let k = 0; k < 8; k++) batch.cyl(stone, 0.98, 0.98, 1.25, x, P + 0.625 + k * 1.25, -257.4, 18); batch.cyl(stone, 1.25, 1.3, 0.5, x, P + 0.25, -257.4, 18); batch.box(stone, 2.8, 0.6, 2.8, x, P + 10.3, -257.4); addCircle(x, -257.4, 1.2); }
    batch.box(stone, 27, 2.4, 9, 0, P + 11.8, -260.3);
    const fr2 = new THREE.Mesh(new THREE.PlaneGeometry(26, 1.6), friezeMat.clone()); fr2.material.map = tex.frieze.map.clone(); fr2.material.map.repeat.set(3, 1); fr2.material.normalMap = tex.frieze.normalMap.clone(); fr2.material.normalMap.repeat.set(3, 1); fr2.position.set(0, P + 11.8, -255.78); scene.add(fr2);
    const tiers = [[23, 2.0, 7.5], [18, 2.0, 6.2], [12.5, 2.2, 5], [7, 2.6, 3.8], [3, 2.2, 2.6]]; let ty = P + 13;
    for (const [w, h, d] of tiers) { batch.box(stone, w, h, d, 0, ty + h / 2, -261.6 - (7.5 - d) / 2); ty += h; }
    // doors
    const mkDoor = (s) => {
      const g = new THREE.BoxGeometry(3.05, 7.6, 0.55); const uv = g.attributes.uv; if (s < 0) for (let i = 16; i < 20; i++) uv.setX(i, 1 - uv.getX(i));
      const m = new THREE.Mesh(g, doorMat); m.position.set(s * 1.525, P + 3.8, -262.5); m.castShadow = m.receiveShadow = true; scene.add(m); return m;
    };
    const door = { L: mkDoor(-1), R: mkDoor(1), open: 0, target: 0, box: addBox(-3.1, 3.1, -263.4, -261.9, 40), sockets: [] };
    const glyphs = [[tex.glyphBone, 0xffc247], [tex.glyphSock, 0x63ff3a], [tex.glyphMirror, 0xbfe9ff], [tex.glyphBrush, 0xff8a2e], [tex.glyphDiaper, 0xff8fd0]];
    glyphs.forEach(([gl, c], i) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.16, 28), new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 0.6, emissive: new THREE.Color(c), emissiveMap: gl, emissiveIntensity: 0 }));
      m.rotation.x = Math.PI / 2; m.position.set((i - 2) * 1.72, P + 10.35, -261.05); scene.add(m);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.08, 8, 28), stone); ring.position.copy(m.position); scene.add(ring);
      door.sockets.push({ m, lit: 0, color: new THREE.Color(c) });
    });
    batch.box(stone, 8.6, 1.9, 0.5, 0, P + 10.35, -261.55);
    door.update = (dt) => {
      door.open += clamp(door.target - door.open, -dt * 0.22, dt * 0.22);
      const k = sm(0, 1, door.open); door.L.position.x = -1.525 - k * 2.9; door.R.position.x = 1.525 + k * 2.9;
      const sh = door.open > 0.01 && door.open < 0.99 ? (Math.random() - 0.5) * 0.012 : 0; door.L.position.y = door.R.position.y = P + 3.8 + sh;
      door.box.on = door.open < 0.75;
      for (const s of door.sockets) s.m.material.emissiveIntensity = s.lit * (5 + Math.sin(performance.now() * 0.004) * 0.8);
    };
    world.door = door; world.doorPos = new THREE.Vector3(0, P, -260.5);
    // chamber
    const chm = stone.clone(); chm.side = THREE.BackSide;
    const ch = new THREE.Mesh(uvBox(new THREE.BoxGeometry(9.2, 8.2, 14.2), 9.2, 8.2, 14.2), chm); ch.position.set(0, P + 4.1 - 0.02, -271.4); ch.receiveShadow = true; scene.add(ch);
    world.chamberLight = new THREE.PointLight(0xffb866, 0, 60, 1.6); world.chamberLight.position.set(0, P + 4.5, -268.5); scene.add(world.chamberLight);
    const spill = new THREE.Mesh(new THREE.PlaneGeometry(6.1, 7.6), glowMaterial(0xffc27a, 0)); spill.position.set(0, P + 3.8, -263.2); spill.renderOrder = 7; scene.add(spill); world.doorSpill = spill.material.uniforms;
    // statues
    const stoneDog = new THREE.MeshStandardMaterial({ map: tex.blocks.map, normalMap: tex.rock.normalMap, roughness: 0.95, color: 0xb9b2a2 });
    for (const s of [-1, 1]) {
      batch.box(stone, 3.6, 2.2, 4.6, s * 9.5, 10.0, -248.5); batch.box(stone, 4.2, 0.5, 5.2, s * 9.5, 9.15, -248.5); addBox(s * 9.5 - 2.1, s * 9.5 + 2.1, -251.1, -245.9, 30);
      const d = buildDog(tex, { stone: stoneDog, scale: 5.2, sit: 1 }); d.root.position.set(s * 9.5, 11.05, -248.9); d.root.rotation.y = -s * 0.22; scene.add(d.root);
    }
    // braziers
    for (const s of [-1, 1]) {
      const x = s * 5.2, z = -252.2; batch.cyl(stone, 0.42, 0.6, 1.5, x, 9.7, z, 12); batch.cyl(stone, 0.95, 0.45, 0.5, x, 10.7, z, 14); addCircle(x, z, 0.9);
      const l = new THREE.PointLight(0xff8a3a, 0, 38, 1.7); l.position.set(x, 11.9, z); scene.add(l);
      world.fires.push({ pos: new THREE.Vector3(x, 11.0, z), light: l, size: 1 });
    }
    // stepped ruin for the mirror
    const mx = 17, mz = -233;
    [[6.4, 0.4], [4.8, 0.8], [3.2, 1.2]].forEach(([w, top]) => { batch.box(stone, w, 0.42, w, mx, 9 + top - 0.2, mz, 0); addBox(mx - w / 2, mx + w / 2, mz - w / 2, mz + w / 2, 9 + top); });
    batch.cyl(stone, 0.42, 0.5, 1.0, mx, 10.7, mz, 12); addCircle(mx, mz, 0.6, 11.2);
    for (const [dx, dz, h] of [[-2.9, -2.9, 3.4], [2.9, -2.9, 1.6], [2.9, 2.9, 2.6]]) { batch.cyl(stone, 0.36, 0.36, h, mx + dx, 9.4 + h / 2, mz + dz, 12); addCircle(mx + dx, mz + dz, 0.5); }
    world.mirrorPos = new THREE.Vector3(mx, 12.0, mz);
    // scattered court columns
    for (const [x, z, h] of [[-14, -216, 5], [-17, -228, 2.2], [-15, -241, 3.6], [12, -214, 2.8], [21, -246, 4.4], [-8, -210, 1.4], [8, -209.5, 4.2]]) {
      let yy = 8.8; while (yy < 9 + h) { batch.cyl(stone, 0.5, 0.5, 1.1, x, yy + 0.55, z, 14); yy += 1.1; } addCircle(x, z, 0.68);
    }
  }

  // ---------------- relics
  {
    const gold = new THREE.MeshStandardMaterial({ color: 0xffc84a, metalness: 1, roughness: 0.22, emissive: 0xff9a1a, emissiveIntensity: 0.55 });
    const mkRelic = (id, pos, color, lightI) => {
      const g = new THREE.Group(); g.position.copy(pos); scene.add(g);
      const light = new THREE.PointLight(color, lightI, 22, 1.8); light.position.y = 0.3; g.add(light);
      const halo = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), glowMaterial(color, 0.55)); halo.renderOrder = 9; g.add(halo);
      const r = { id, g, pos: pos.clone(), got: false, light, lightI, halo, spin: new THREE.Group(), color: new THREE.Color(color) }; g.add(r.spin); world.relics.push(r); return r;
    };
    // golden bone
    const bone = mkRelic('bone', world.archPos, 0xffc04a, 14);
    { const b = bone.spin; const sh = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.5, 6, 14), gold); sh.rotation.z = Math.PI / 2; b.add(sh);
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) { const k = new THREE.Mesh(new THREE.SphereGeometry(0.125, 16, 12), gold); k.position.set(sx * 0.31, sy * 0.085, 0); b.add(k); }
      b.rotation.z = 0.5; b.traverse((o) => { if (o.isMesh) o.castShadow = true; }); }
    // old stinky sock
    const sock = mkRelic('sock', world.sockPos, 0x58ff2e, 16);
    { const c = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.42, 0), new THREE.Vector3(0.01, 0.2, 0), new THREE.Vector3(0.02, 0.05, 0.02), new THREE.Vector3(0.1, -0.03, 0.03), new THREE.Vector3(0.26, -0.04, 0.03)]);
      const sm_ = new THREE.MeshStandardMaterial({ color: 0x9aa36e, roughness: 1, emissive: 0x2a8a10, emissiveIntensity: 0.35 });
      const tube = new THREE.Mesh(new THREE.TubeGeometry(c, 24, 0.095, 12, false), sm_); sock.spin.add(tube);
      const toe = new THREE.Mesh(new THREE.SphereGeometry(0.097, 12, 10), new THREE.MeshStandardMaterial({ color: 0x6b5a3a, roughness: 1, emissive: 0x2a8a10, emissiveIntensity: 0.3 })); toe.position.set(0.26, -0.04, 0.03); sock.spin.add(toe);
      const red = new THREE.MeshStandardMaterial({ color: 0x8e2d22, roughness: 1 });
      for (const y of [0.4, 0.33]) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.097, 0.02, 6, 16), red); t.rotation.x = Math.PI / 2; t.position.y = y; sock.spin.add(t); }
      sock.spin.scale.setScalar(1.7); sock.spin.rotation.z = 0.25; }
    // shiny hand mirror
    const mir = mkRelic('mirror', world.mirrorPos, 0xcfeaff, 12);
    { const s = mir.spin;
      const face = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 32), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.02, emissive: 0xbfe4ff, emissiveIntensity: 0.9 })); face.rotation.x = Math.PI / 2; face.position.y = 0.2; s.add(face);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.028, 10, 32), gold); rim.position.y = 0.2; s.add(rim);
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.032, 0.3, 10), gold); h.position.y = -0.17; s.add(h);
      const k = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), gold); k.position.y = -0.33; s.add(k);
      s.scale.setScalar(1.5);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 0.25, 160, 20, 1, true), beamMaterial(0xdff2ff, 0.9, U.uTime)); beam.position.y = 80.3; beam.renderOrder = 9; mir.g.add(beam); mir.beam = beam;
      mir.rays = new THREE.Group(); mir.g.add(mir.rays);
      for (let i = 0; i < 5; i++) { const ry = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.05, 70, 10, 1, true), beamMaterial(0xfff3d0, 0.4, U.uTime)); const piv = new THREE.Group(); ry.position.y = 35; piv.add(ry); piv.rotation.set(0.22 + i * 0.09, i * 1.257, 0, 'YXZ'); piv.renderOrder = 9; mir.rays.add(piv); } }
    // Agata's hand brush – by the rocks on the landing just after the bridge
    const brush = mkRelic('brush', new THREE.Vector3(-4.2, 1.05, -103), 0xff8a2e, 13);
    { const s = brush.spin, woodM = new THREE.MeshStandardMaterial({ color: 0xb5651d, roughness: 0.55, emissive: 0xff7a1a, emissiveIntensity: 0.25 }), straw = new THREE.MeshStandardMaterial({ color: 0xe8c66a, roughness: 0.9, emissive: 0xffb030, emissiveIntensity: 0.3 });
      const hd = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.034, 0.36, 10), woodM); hd.position.y = 0.3; s.add(hd);
      const kn = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), woodM); kn.position.y = 0.49; s.add(kn);
      const blk2 = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.09, 0.1), woodM); blk2.position.y = 0.09; s.add(blk2);
      for (let i = -4; i <= 4; i++) for (const dz of [-0.03, 0.03]) { const b = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.26, 6), straw); b.rotation.x = Math.PI; b.position.set(i * 0.038, -0.07, dz); b.rotation.z = i * 0.035; s.add(b); }
      s.rotation.z = 0.45; s.scale.setScalar(1.25); s.traverse((o) => { if (o.isMesh) o.castShadow = true; }); }
    // Jaś's nappy – on the sunny west side of the temple court
    const nappy = mkRelic('diaper', new THREE.Vector3(-15, 10.05, -236), 0xff8fd0, 13);
    { const s = nappy.spin, cloth = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.95, emissive: 0xff9ad6, emissiveIntensity: 0.22 }), tab = new THREE.MeshStandardMaterial({ color: 0x4aa3ff, roughness: 0.6, emissive: 0x2a6adf, emissiveIntensity: 0.4 });
      const bum = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), cloth); bum.scale.set(1.1, 0.85, 0.82); s.add(bum);
      const waist = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 10, 24), cloth); waist.rotation.x = Math.PI / 2; waist.position.y = 0.11; waist.scale.set(1.1, 0.82, 1); s.add(waist);
      for (const sd of [-1, 1]) { const leg = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.03, 8, 18), cloth); leg.position.set(sd * 0.12, -0.11, 0.02); leg.rotation.set(Math.PI / 2 - 0.5, 0, sd * 0.5); s.add(leg);
        const t = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.02), tab); t.position.set(sd * 0.13, 0.1, 0.145); t.rotation.y = sd * 0.5; s.add(t); }
      s.scale.setScalar(1.25); s.traverse((o) => { if (o.isMesh) o.castShadow = true; }); }
    for (const [r, c] of [[brush, 0xffa24a], [nappy, 0xffa6dc]]) { const bm = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.18, 22, 14, 1, true), beamMaterial(c, 0.45, U.uTime)); bm.position.y = 11; bm.renderOrder = 9; r.g.add(bm); r.beam = bm; }
    // golden bone beam (soft) so it can be seen from the knoll
    const bb = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.2, 26, 14, 1, true), beamMaterial(0xffc860, 0.5, U.uTime)); bb.position.y = 13; bb.renderOrder = 9; bone.g.add(bb); bone.beam = bb;
    world.updaters.push((dt, t) => {
      for (const r of world.relics) {
        if (r.got) continue;
        r.spin.rotation.y = t * 1.4; r.spin.position.y = Math.sin(t * 2 + r.pos.x) * 0.1;
        r.light.intensity = r.lightI * (0.85 + 0.15 * Math.sin(t * 5 + r.pos.z));
        if (r.rays) r.rays.rotation.y = t * 0.25;
      }
    });
  }

  batch.build(scene);

  // ---------------- jungle
  {
    const leafMat = foliageMat(tex.leaves, U, 0.4), plantMat = foliageMat(tex.plants, U, 0.4), frondMat = foliageMat(tex.frond, U, 0.35), vineMat = foliageMat(tex.vine, U, 0.4);
    const barkMat = new THREE.MeshStandardMaterial({ map: tex.bark.map, normalMap: tex.bark.normalMap, roughness: 0.95 });
    const leaves = new QB(), plants = new QB(), fronds = new QB(), vines = new QB(); const trunks = [];
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), d = new THREE.Vector3(), n = new THREE.Vector3(), rt = new THREE.Vector3(), up = new THREE.Vector3(), ctr = new THREE.Vector3();
    const slope = (x, z) => Math.max(Math.abs(H(x + 1.5, z, true) - H(x - 1.5, z, true)), Math.abs(H(x, z + 1.5, true) - H(x, z - 1.5, true))) / 3;

    const tree = (x, z, sc) => {
      const y = H(x, z, true) - 0.4, h = (7 + R() * 6) * sc, r = (0.26 + R() * 0.16) * sc;
      const bx = (R() - 0.5) * 2.4 * sc, bz = (R() - 0.5) * 2.4 * sc;
      const g = new THREE.CylinderGeometry(r * 0.5, r * 1.15, h, 8, 6); g.translate(0, h / 2, 0);
      const p = g.attributes.position, uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) { const t = p.getY(i) / h, fl = 1 + Math.max(0, 0.12 - t) * 9; p.setX(i, p.getX(i) * fl + bx * t * t); p.setZ(i, p.getZ(i) * fl + bz * t * t); }
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2, uv.getY(i) * h * 0.3);
      g.computeVertexNormals(); g.translate(x, y, z); trunks.push(g);
      ctr.set(x + bx, y + h + 0.5 * sc, z + bz); const cr = (3.0 + R() * 1.8) * sc; const nb = 5 + Math.floor(R() * 3);
      for (let k = 0; k < nb; k++) {
        const bxx = ctr.x + (R() - 0.5) * 1.7 * cr, byy = ctr.y + (R() - 0.6) * 0.8 * cr, bzz = ctr.z + (R() - 0.5) * 1.7 * cr;
        for (let q = 0; q < 8; q++) {
          n.set(R() - 0.5, R() - 0.5, R() - 0.5).normalize(); const cx = bxx + n.x * cr * 0.5, cy = byy + n.y * cr * 0.35, cz = bzz + n.z * cr * 0.5;
          n.set(n.x + (R() - 0.5) * 0.8, n.y + (R() - 0.5) * 0.8 + 0.2, n.z + (R() - 0.5) * 0.8).normalize();
          rt.set(n.z, 0, -n.x); if (rt.lengthSq() < 0.01) rt.set(1, 0, 0); rt.normalize(); up.crossVectors(n, rt).normalize();
          const sz = (1.5 + R() * 1.1) * sc;
          a.set(cx, cy, cz).addScaledVector(rt, -sz).addScaledVector(up, -sz); b.set(cx, cy, cz).addScaledVector(rt, sz).addScaledVector(up, -sz);
          c.set(cx, cy, cz).addScaledVector(rt, sz).addScaledVector(up, sz); d.set(cx, cy, cz).addScaledVector(rt, -sz).addScaledVector(up, sz);
          n.set(cx - ctr.x, (cy - ctr.y) + cr * 0.55, cz - ctr.z).normalize();
          const hf = clamp((cy - ctr.y) / cr * 0.5 + 0.6, 0.25, 1.1), k2 = (0.55 + R() * 0.45) * hf;
          leaves.quad(a, b, c, d, [0, 0, 1, 1], n, [k2 * (0.85 + R() * 0.3), k2, k2 * (0.7 + R() * 0.3)], 0.7, 1);
        }
      }
      world.trees++;
    };

    const palm = (x, z, sc) => {
      const y = H(x, z, true) - 0.3, h = (6 + R() * 5) * sc, bx = (R() - 0.5) * 4, bz = (R() - 0.5) * 4;
      const g = new THREE.CylinderGeometry(0.13 * sc, 0.24 * sc, h, 7, 6); g.translate(0, h / 2, 0); const p = g.attributes.position, uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) { const t = p.getY(i) / h; p.setX(i, p.getX(i) + bx * t * t); p.setZ(i, p.getZ(i) + bz * t * t); }
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2, uv.getY(i) * h * 0.4);
      g.computeVertexNormals(); g.translate(x, y, z); trunks.push(g);
      const tx = x + bx, ty = y + h, tz = z + bz; const nf = 11;
      for (let k = 0; k < nf; k++) {
        const an = k / nf * 6.283 + R() * 0.4, len = (3.0 + R() * 1.4) * sc, w = 0.62 * sc, rise = 0.5 + R() * 0.9, col = [0.7 + R() * 0.3, 0.8 + R() * 0.2, 0.6 + R() * 0.2];
        const dx = Math.cos(an), dz = Math.sin(an); rt.set(-dz * w, 0, dx * w); n.set(dx * 0.3, 1, dz * 0.3).normalize();
        const m1x = tx + dx * len * 0.5, m1y = ty + rise * sc, m1z = tz + dz * len * 0.5, ex = tx + dx * len, ey = ty - (0.6 + R() * 0.9) * sc, ez = tz + dz * len;
        a.set(tx - rt.x, ty, tz - rt.z); b.set(tx + rt.x, ty, tz + rt.z); c.set(m1x + rt.x, m1y, m1z + rt.z); d.set(m1x - rt.x, m1y, m1z - rt.z);
        fronds.quad(a, b, c, d, [0, 0, 0.5, 1], n, col, 0.2, 0.7); fixFrondUV(fronds, 0, 0.5);
        a.set(m1x - rt.x, m1y, m1z - rt.z); b.set(m1x + rt.x, m1y, m1z + rt.z); c.set(ex + rt.x, ey, ez + rt.z); d.set(ex - rt.x, ey, ez - rt.z);
        fronds.quad(a, b, c, d, [0, 0, 0.5, 1], n, col, 0.7, 1.6); fixFrondUV(fronds, 0.5, 1);
      }
      world.trees++;
    };
    function fixFrondUV(qb, u0, u1) { const k = qb.u.length - 8; qb.u[k] = u0; qb.u[k + 1] = 0; qb.u[k + 2] = u0; qb.u[k + 3] = 1; qb.u[k + 4] = u1; qb.u[k + 5] = 1; qb.u[k + 6] = u1; qb.u[k + 7] = 0; }

    const walk = (z) => (z > -8 ? 5 * sm(-8, 20, z) : z > -132.4 ? 0 : 9);
    // trees
    for (let i = 0; i < 3400; i++) {
      const x = -150 + R() * 330, z = -330 + R() * 400; const y = H(x, z, true);
      if (y < L.WATER_Y + 1.2 || slope(x, z) > 0.6) continue;
      if (x < 7 && x > -48 && y > -12 && z < 34 && !(z < L.TZ0 + 6 && z > L.TZ1 - 6)) continue;
      if (x < 0 && x > -70 && z < -200 && z > -275 && y < 30) continue;
      const wl = walk(z), onWalk = Math.abs(y - wl) < 1.2 && x > -30 && x < 30;
      let prob = 0.5, sc = 1.1 + R() * 0.8;
      if (onWalk) {
        if (z > -44 && z < 32) { if (Math.abs(x - pathX(z)) < 6.5 || Math.hypot(x, z - 25) < 9 || x < 7) continue; prob = 0.4; sc = 0.8 + R() * 0.5; }
        else if (z < -207 && z > -262) { if (x < 23 || R() < 0.5) continue; prob = 0.5; sc = 0.8 + R() * 0.4; }
        else continue;
      }
      if (z < -252 && Math.abs(x) < 26 && y < 40) continue;
      if (x < -40) prob = 0.75; if (y > 30) { prob = 0.55; sc *= 1.25; }
      if (R() > prob) continue;
      if (R() < 0.22) palm(x, z, sc); else tree(x, z, sc);
      if (onWalk) addCircle(x, z, 0.55 * sc);
    }
    // ground plants
    for (let i = 0; i < 9000; i++) {
      const x = -34 + R() * 70, z = -270 + R() * 304; const y = H(x, z, true), wl = walk(z);
      if (Math.abs(y - wl) > 1.6 || slope(x, z) > 0.55) continue;
      if (z < L.TZ0 + 3 && z > L.TZ1 - 3) continue;
      if (z > -50 && Math.abs(x - pathX(z)) < 2.6) continue;
      if (z < -96 && z > -110 && Math.abs(x) < 3.5 && R() < 0.85) continue;
      if (z < -134 && z > -152 && Math.abs(x) < 4 && R() < 0.85) continue;
      if (z < -207 && (Math.abs(x) < 16 ? R() < 0.93 : R() < 0.4)) continue;
      if (z > 21.5 && z < 28.5 && Math.abs(x) < 3.5) continue;
      const broad = R() < 0.25, sz = broad ? 0.4 + R() * 0.6 : 0.28 + R() * 0.5, an = R() * 3.14, k = 0.6 + R() * 0.5, col = [k * (0.85 + R() * 0.3), k, k * 0.8];
      const u0 = broad ? 0.5 : 0, u1 = u0 + 0.5; n.set(0, 1, 0);
      for (let q = 0; q < 2; q++) { const dx = Math.cos(an + q * 1.57) * sz, dz = Math.sin(an + q * 1.57) * sz; a.set(x - dx, y - 0.08, z - dz); b.set(x + dx, y - 0.08, z + dz); c.set(x + dx, y + sz * 1.7, z + dz); d.set(x - dx, y + sz * 1.7, z - dz); plants.quad(a, b, c, d, [u0, 0, u1, 1], n, col, 0, 0.5); }
    }
    // vines on rock faces
    const hang = (x, y, z, nx, nz, len, w) => {
      rt.set(-nz * w, 0, nx * w); n.set(nx, 0.4, nz).normalize(); const k = 0.6 + R() * 0.5;
      a.set(x - rt.x, y - len, z - rt.z); b.set(x + rt.x, y - len, z + rt.z); c.set(x + rt.x, y, z + rt.z); d.set(x - rt.x, y, z - rt.z);
      vines.quad(a, b, c, d, [0, 0, 1, len / (w * 8)], n, [k, k * 1.05, k * 0.8], 0.6, 0);
    };
    for (let i = 0; i < 150; i++) {
      const z = 30 - R() * 290; if (z < L.G0 + 3 && z > L.G1 - 3) continue; if (z < L.TZ0 + 4 && z > L.TZ1 - 4) continue;
      const fl = walk(z), target = 7 + R() * 16; let x = halfE(z) - 9;
      for (; x < 60; x += 0.6) if (H(x, z, true) - fl > target) break;
      if (x >= 60) continue; hang(x - 1.2, H(x, z, true) + 0.5, z, -1, 0, 4 + R() * 9, 0.7 + R() * 0.5);
    }
    for (let i = 0; i < 26; i++) { const x = -11 + R() * 22; if (Math.abs(x) < 3.6) continue; hang(x, 13.5 + R() * 9, L.TZ0 + 1.5 - R() * 1.5, 0, 1, 3 + R() * 6, 0.6 + R() * 0.4); hang(x, 13.5 + R() * 9, L.TZ1 - 1.5 + R() * 1.5, 0, -1, 3 + R() * 6, 0.6 + R() * 0.4); }
    for (let i = 0; i < 9; i++) { const x = -4 + R() * 8; hang(x, 14.7, L.TZ0 + 4.3, 0, 1, 1.2 + R() * 2.2, 0.5); hang(x, 14.7, L.TZ1 - 4.3, 0, -1, 1.2 + R() * 2.2, 0.5); }
    for (let i = 0; i < 22; i++) { const x = -13 + R() * 26; hang(x, 20.6, -255.7, 0, 1, 1.5 + R() * 5, 0.6 + R() * 0.5); }
    for (let i = 0; i < 16; i++) { const x = (R() < 0.5 ? -1 : 1) * (4.2 + R() * 10); hang(x, 22.5 + R() * 8, -261.9, 0, 1, 2 + R() * 6, 0.6 + R() * 0.4); }
    for (let i = 0; i < 7; i++) { const a2 = 0.3 + R() * 2.5; hang(Math.cos(a2) * 3.1, 4.4 + Math.sin(a2) * 3.0, -45.6 + 0.8, 0, 1, 1 + R() * 2.2, 0.45); }
    for (let i = 0; i < 40; i++) { const x = -28 + R() * 100, zz = R() < 0.5 ? L.G0 - 1.5 : L.G1 + 1.5; if (Math.abs(x) < 4) continue; if (Math.abs(H(x, zz + (zz > -70 ? 4 : -4), true)) > 3) continue; hang(x, -1 - R() * 8, zz + (zz > -70 ? -2.2 : 2.2), 0, zz > -70 ? -1 : 1, 5 + R() * 12, 0.8 + R() * 0.6); }

    const tm = new THREE.Mesh(mergeGeometries(trunks, false), barkMat); tm.castShadow = tm.receiveShadow = true; scene.add(tm);
    scene.add(leaves.build(leafMat)); scene.add(fronds.build(frondMat)); scene.add(vines.build(vineMat));
    const pm = plants.build(plantMat); pm.castShadow = false; scene.add(pm);
  }

  // ---------------- collision queries
  const STEP = 0.46;
  world.groundAt = (x, z, y, out) => {
    let g = H(x, z), kind = 0, ref = null;
    for (const b of world.boxes) if (b.on && x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1 && b.top <= y + STEP && b.top > g) { g = b.top; kind = 1; ref = b; }
    const bt = world.bridge.top(x, z); if (bt > g && bt <= y + STEP) { g = bt; kind = 2; ref = null; }
    if (out) { out.kind = kind; out.ref = ref; }
    return g;
  };
  world.blocked = (x, z, y, dx, dz) => {
    if (H(x + dx * 0.55, z + dz * 0.55) > y + 0.72) return true;
    const m = 0.24;
    for (const b of world.boxes) if (b.on && x > b.x0 - m && x < b.x1 + m && z > b.z0 - m && z < b.z1 + m && b.top > y + STEP && b.bottom < y + 0.6) return true;
    return false;
  };
  world.update = (dt, t, player) => { U.uTime.value = t; world.bridge.update(dt, t, player); world.stairs.update(dt); world.door.update(dt); for (const f of world.updaters) f(dt, t); };
  return world;
}
