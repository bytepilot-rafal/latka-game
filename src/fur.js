// High-quality extras shared by the levels. HQ is the switch on the title screen ("High Quality", the default).
// Fur is drawn as a stack of thin shells pushed out along the surface: every shell keeps only the strands that are
// still long enough, and the roots are darker than the tips. All the shells of one body part go out in one draw call.
import * as THREE from 'three';

export const HQ = typeof window === 'undefined' || window.QUALITY !== 'regular';
export const DOG_FUR = { len: 0.0055, density: 620, shells: 10, droop: 0.5 }, CAT_FUR = { len: 0.012, density: 430, shells: 12, droop: 0.7 };
const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches, v = new THREE.Vector3(), ident = new THREE.Matrix4();

export function addFur(root, { len, density, shells, droop, min = 0.026 }) {
  if (coarse) shells = Math.ceil(shells / 2);
  const mats = new Map(), meshes = []; root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || !o.material || !o.material.isMeshStandardMaterial || o.material.roughness < 0.7 || o.material.roughness > 0.9) return;
    const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere(); o.getWorldScale(v);
    if (g.boundingSphere.radius * Math.max(v.x, v.y, v.z) >= min) meshes.push(o);
  });
  for (const m of meshes) {
    const g = m.geometry; if (!g.attributes.aShell || g.attributes.aShell.count !== shells) g.setAttribute('aShell', new THREE.InstancedBufferAttribute(Float32Array.from({ length: shells }, (_, i) => (i + 1) / shells), 1));
    let e = mats.get(m.material);
    if (!e) {
      const mat = m.material.clone(); mat.roughness = 1; const u = { uLen: { value: len }, uDen: { value: density }, uDroop: { value: droop } };
      mat.onBeforeCompile = (s) => {
        Object.assign(s.uniforms, u);
        s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute float aShell; uniform float uLen, uDroop; varying vec3 vBase; varying float vShell;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBase = position; vShell = aShell; transformed += normalize(normal) * uLen * aShell; transformed.y -= uLen * aShell * aShell * uDroop;');
        s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
          uniform float uDen; varying vec3 vBase; varying float vShell;
          float h31(vec3 p){ p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }`)
          .replace('#include <map_fragment>', `#include <map_fragment>
          { vec3 q = vBase * uDen, c = floor(q); float h = h31(c), d = length(fract(q) - 0.5 - (vec3(h31(c + 7.0), h31(c + 13.0), h31(c + 19.0)) - 0.5) * 0.5);
            if (h * 0.8 + 0.2 < vShell || d > 0.6 * (1.0 - vShell * 0.6)) discard; diffuseColor.rgb *= mix(0.55, 1.1, vShell);
#ifdef USE_COLOR
            if (vColor.r > vColor.g * 1.18 && vColor.r > 0.5) discard;
#endif
          }`);
      };
      mat.userData.chain = true; mat.userData.key = 'fur'; mat.customProgramCacheKey = () => 'fur';
      const skin = m.material.clone(); skin.color.multiplyScalar(0.62);                                    // the skin under the fur is darker, which reads as soft shading
      e = { mat, skin }; mats.set(m.material, e);
    }
    m.material = e.skin; const mat = e.mat;
    const sh = new THREE.InstancedMesh(g, mat, shells); for (let i = 0; i < shells; i++) sh.setMatrixAt(i, ident);
    sh.receiveShadow = true; sh.castShadow = false; sh.frustumCulled = false; m.add(sh);
  }
}
