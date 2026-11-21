// Small building kit shared by the newer levels: vertex-coloured shapes merged into one mesh, a gable roof, canvas textures.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from './textures.js';

export const worldMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93, side: THREE.DoubleSide });

export class Builder {
  constructor(seed) { this.g = []; this.r = rng(seed); }
  add(geo, color, x = 0, y = 0, z = 0, ry = 0, jit = 0.07) {
    const g = geo.index ? geo.toNonIndexed() : geo; g.deleteAttribute('uv');
    if (ry) g.rotateY(ry); g.translate(x, y, z);
    const n = g.attributes.position.count, c = new Float32Array(n * 3), col = new THREE.Color(color), k = 1 + (this.r() - 0.5) * 2 * jit;
    for (let i = 0; i < n; i++) { c[i * 3] = col.r * k; c[i * 3 + 1] = col.g * k; c[i * 3 + 2] = col.b * k; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3)); this.g.push(g); return g;
  }
  box(w, h, d, x, y, z, color, ry = 0, jit) { return this.add(new THREE.BoxGeometry(w, h, d), color, x, y + h / 2, z, ry, jit); }   // y is the base
  cyl(rt, rb, h, x, y, z, color, seg = 8) { return this.add(new THREE.CylinderGeometry(rt, rb, h, seg), color, x, y + h / 2, z); }
  cone(r, h, x, y, z, color, seg = 7) { return this.add(new THREE.ConeGeometry(r, h, seg), color, x, y + h / 2, z, this.r() * 3); }
  blob(r, x, y, z, color, sy = 1, sx = 1, sz = 1) { const g = new THREE.IcosahedronGeometry(r, 1); g.scale(sx, sy, sz); return this.add(g, color, x, y, z, this.r() * 3, 0.12); }
  get empty() { return this.g.length === 0; }
  mesh(mat = worldMat) { const m = new THREE.Mesh(mergeGeometries(this.g), mat); m.castShadow = true; m.receiveShadow = true; this.g = []; return m; }
}

export function roofGeo(w, h, d) {       // gable prism, ridge along z
  const a = w / 2, b = d / 2, p = [-a, 0, -b, 0, h, -b, 0, h, b, -a, 0, -b, 0, h, b, -a, 0, b, a, 0, -b, a, 0, b, 0, h, b, a, 0, -b, 0, h, b, 0, h, -b, -a, 0, -b, a, 0, -b, 0, h, -b, -a, 0, b, 0, h, b, a, 0, b];
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.computeVertexNormals();
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(p.length / 3 * 2), 2)); return g;
}

export function canvasTex(w, h, draw, rx = 1, ry = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8; return t;
}
