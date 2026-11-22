// Shared pieces for a more natural look (levels 3 and 4): a physically based sky that also lights the scene, tiling
// noise textures, close-up grain and drifting cloud shadows for standard materials, flowing water with sky reflections,
// and smooth, irregular trees and shrubs.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { hash, vnoise } from './textures.js';

// periodic value noise, so that the textures tile
const pn = (x, y, p, s) => { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), w = (i) => ((i % p) + p) % p, a = hash(w(ix), w(iy), s), b = hash(w(ix + 1), w(iy), s), c = hash(w(ix), w(iy + 1), s), d = hash(w(ix + 1), w(iy + 1), s); return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy; };
export const pfbm = (u, v, p, s, o = 4) => { let a = 0.5, sum = 0, n = 0; for (let i = 0; i < o; i++) { sum += a * pn(u * p, v * p, p, s + i * 13); n += a; a *= 0.5; p *= 2; } return sum / n; };
export function dataTex(n, fn) {
  const c = document.createElement('canvas'); c.width = c.height = n; const ctx = c.getContext('2d'), im = ctx.createImageData(n, n), d = im.data;
  for (let y = 0, i = 0; y < n; y++) for (let x = 0; x < n; x++, i += 4) { const v = fn(x / n, y / n); d[i] = v[0] * 255; d[i + 1] = v[1] * 255; d[i + 2] = v[2] * 255; d[i + 3] = 255; }
  ctx.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const detailTex = () => dataTex(256, (u, v) => { const a = pfbm(u, v, 16, 3, 4), b = pfbm(u, v, 6, 8, 3); return [clamp01(a + (hash(u * 256, v * 256, 4) - 0.5) * 0.35), b, a]; });
export const cloudTex = () => dataTex(256, (u, v) => { const a = pfbm(u, v, 4, 21, 5); return [a, a, a]; });
export const waterNormalTex = () => dataTex(256, (u, v) => { const e = 1 / 256, h = (a, b) => pfbm(a, b, 5, 51, 4), dx = (h(u + e, v) - h(u - e, v)) * 7, dy = (h(u, v + e) - h(u, v - e)) * 7, l = Math.hypot(dx, dy, 1); return [0.5 - dx / l * 0.5, 0.5 - dy / l * 0.5, 0.5 + 0.5 / l]; });

// The uniforms every patched material shares: { uDetail, uCloud, uWN, uTime }
export const makeUniforms = () => ({ uDetail: { value: detailTex() }, uCloud: { value: cloudTex() }, uWN: { value: waterNormalTex() }, uTime: { value: 0 } });
const VERT = (s) => s.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <begin_vertex>', '#include <begin_vertex>\n{ vec4 wp = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\nwp = instanceMatrix * wp;\n#endif\nvWp = (modelMatrix * wp).xyz; }');
const HEAD = '#include <common>\nvarying vec3 vWp; uniform sampler2D uDetail, uCloud, uWN; uniform float uTime;';
// grain: how strong the close-up grain is (0 = none); cloud: how dark the cloud shadows are (0 = none); cs: their size
export function patchMat(mat, U, { grain = 0, cloud = 0, cs = 0.004, gs = 1 } = {}) {
  mat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, U); s.vertexShader = VERT(s.vertexShader);
    s.fragmentShader = s.fragmentShader.replace('#include <common>', HEAD).replace('#include <map_fragment>', '#include <map_fragment>\n'
      + (grain ? `{ vec3 dA = texture2D(uDetail, vWp.xz * ${(0.9 * gs).toFixed(3)}).rgb, dB = texture2D(uDetail, vWp.xz * ${(0.07 * gs).toFixed(4)}).rgb; diffuseColor.rgb *= (1.0 + (dA.r - 0.5) * ${(grain * 1.1).toFixed(3)}) * (1.0 + (dB.g - 0.5) * ${(grain * 0.7).toFixed(3)}); }\n` : '')
      + (cloud ? `{ float cs = texture2D(uCloud, vWp.xz * ${cs.toFixed(5)} + uTime * vec2(0.006, 0.002)).r; diffuseColor.rgb *= mix(1.0, ${(1 - cloud).toFixed(3)}, smoothstep(0.5, 0.68, cs)); }` : ''));
  };
  mat.customProgramCacheKey = () => `real${grain}_${cloud}_${cs}_${gs}`; return mat;
}
// A horizontal sheet of water: two layers of ripples drifting downstream (towards -z), reflecting the sky.
export function waterMat(U, { color = 0x2f5a50, flow = 1, scale = 1, strength = 0.2 } = {}) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.1, metalness: 0.3 });
  mat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, U); s.vertexShader = VERT(s.vertexShader);
    s.fragmentShader = s.fragmentShader.replace('#include <common>', HEAD).replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      { vec2 p = vWp.xz * ${scale.toFixed(3)}; float t = uTime * ${flow.toFixed(3)};
        vec3 a = texture2D(uWN, p * 0.085 + vec2(0.0, t * 0.1)).xyz * 2.0 - 1.0, b = texture2D(uWN, p * 0.23 + vec2(t * 0.02, t * 0.2)).xyz * 2.0 - 1.0, c = texture2D(uWN, p * 0.021 + vec2(t * 0.004, t * 0.03)).xyz * 2.0 - 1.0;
        vec2 n2 = (a.xy + b.xy * 0.7 + c.xy * 0.6) * ${strength.toFixed(3)}; normal = normalize((viewMatrix * vec4(normalize(vec3(n2.x, 1.0, n2.y)), 0.0)).xyz); }`)
      .replace('#include <map_fragment>', '#include <map_fragment>\n{ float cs = texture2D(uCloud, vWp.xz * 0.004 + uTime * vec2(0.006, 0.002)).r; diffuseColor.rgb *= mix(1.0, 0.7, smoothstep(0.5, 0.68, cs)); }');
  };
  mat.customProgramCacheKey = () => `water${flow}_${scale}_${strength}`; return mat;
}

// A physically based daytime sky. `gain` scales what the camera sees, so a level can keep its own exposure.
export function daySky(renderer, scene, sunDir, { gain = 1, size = 800, turbidity = 3.2, rayleigh = 2.0 } = {}) {
  const sky = new Sky(), su = sky.material.uniforms; su.turbidity.value = turbidity; su.rayleigh.value = rayleigh; su.mieCoefficient.value = 0.004; su.mieDirectionalG.value = 0.83; su.sunPosition.value.copy(sunDir);
  const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene(); es.add(sky); scene.environment = pm.fromScene(es).texture; pm.dispose();
  if (gain !== 1) { sky.material.fragmentShader = sky.material.fragmentShader.replace('gl_FragColor = vec4( retColor, 1.0 );', `gl_FragColor = vec4( retColor * ${gain.toFixed(3)}, 1.0 );`); sky.material.needsUpdate = true; }
  sky.scale.setScalar(size); sky.renderOrder = -20; sky.frustumCulled = false; scene.add(sky); return sky;
}

// ---- vegetation
const v3 = new THREE.Vector3();
const paint = (g, fn) => { const p = g.attributes.position, c = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { const q = fn(p.getX(i), p.getY(i), p.getZ(i)); c[i * 3] = q[0]; c[i * 3 + 1] = q[1]; c[i * 3 + 2] = q[2]; } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); if (g.attributes.uv) g.deleteAttribute('uv'); return g; };
// a lumpy, smooth-shaded mass of leaves; grey vertex colours (darker underneath) that the instance colour tints
export function leafBlob(r, sy = 0.85, s = 1, detail = 1, x = 0, y = 0, z = 0) {
  let g = mergeVertices(new THREE.IcosahedronGeometry(r, detail).deleteAttribute('uv').deleteAttribute('normal')); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { v3.fromBufferAttribute(p, i); const k = 0.9 / r, q = 0.78 + 0.5 * vnoise((v3.x * 0.9 + v3.y * 0.6) * k * 3.7 + s, (v3.z * 0.9 - v3.y * 0.7) * k * 3.7, s); p.setXYZ(i, v3.x * q, v3.y * q * sy, v3.z * q); }
  g.computeVertexNormals(); g = g.toNonIndexed(); g.translate(x, y, z);
  return paint(g, (px, py, pz) => { const q = Math.min(1.1, Math.max(0.25, 0.52 + (py - y) / (r * sy) * 0.42 + (vnoise(px * 1.7 + s, pz * 1.7, 9) - 0.5) * 0.3)); return [q, q, q]; });
}
const trunk = (r, h) => paint(new THREE.CylinderGeometry(r * 0.7, r, h, 6, 1, true).toNonIndexed().translate(0, h / 2, 0), () => [0.42, 0.3, 0.22]);
const cone = (r, h, y, s) => { const g = new THREE.ConeGeometry(r, h, 10, 3, true), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)), q = 1 + (vnoise(a * 2.2 + s, p.getY(i) * 1.3, s) - 0.5) * 0.36; p.setX(i, p.getX(i) * q); p.setZ(i, p.getZ(i) * q); } g.computeVertexNormals(); return paint(g.toNonIndexed().translate(0, y + h / 2, 0), (px, py) => { const q = 0.45 + (py - y) / h * 0.6; return [q, q, q]; }); };
// three kinds, each about 11–15 m tall: a broadleaf, a spruce, a pine
export const treeGeos = () => [
  mergeGeometries([trunk(0.35, 5), leafBlob(3.7, 0.85, 1, 2, 0, 7.2, 0), leafBlob(2.5, 0.9, 5, 1, 1.7, 8.7, 0.9), leafBlob(2.4, 0.85, 9, 1, -1.5, 6.3, -1.1)]),
  mergeGeometries([trunk(0.3, 4), cone(3.3, 6, 2.4, 1), cone(2.7, 5.5, 5.4, 2), cone(2.0, 5, 8.4, 3), cone(1.2, 4.2, 11.4, 4)]),
  mergeGeometries([trunk(0.32, 7), leafBlob(3.4, 0.6, 14, 2, 0, 8.6, 0), leafBlob(2.3, 0.65, 17, 1, 1.3, 10.2, -0.7), leafBlob(2.0, 0.6, 21, 1, -1.4, 7.6, 0.8)]),
];
// list: [x, y, z, kind, scale]; light: how bright the leaves are (lower at night)
export function plantTrees(scene, list, mat, R, light = 1) {
  const GEO = treeGeos(), dummy = new THREE.Object3D(), col = new THREE.Color(), out = [];
  for (let type = 0; type < 3; type++) {
    const a = list.filter((t) => t[3] === type); if (!a.length) continue; const m = new THREE.InstancedMesh(GEO[type], mat, a.length);
    a.forEach(([x, y, z, , s], i) => {
      dummy.position.set(x, y - 0.2, z); dummy.rotation.set(0, R() * 6.28, 0); dummy.scale.set(s * (0.85 + R() * 0.3), s * (0.9 + R() * 0.3), s * (0.85 + R() * 0.3)); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix);
      if (type === 1) col.setHSL(0.31 + R() * 0.06, 0.34 + R() * 0.14, (0.13 + R() * 0.07) * light); else if (type === 2) col.setHSL(0.27 + R() * 0.06, 0.36 + R() * 0.12, (0.13 + R() * 0.06) * light); else col.setHSL(0.23 + R() * 0.09, 0.42 + R() * 0.18, (0.13 + R() * 0.08) * light);
      m.setColorAt(i, col);
    });
    m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; scene.add(m); out.push(m);
  }
  return out;
}
