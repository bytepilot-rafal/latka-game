// The five relics as 3D models, shared by both levels so they look the same everywhere.
import * as THREE from 'three';

export const RELIC_COLORS = { bone: 0xffc04a, sock: 0x58ff2e, mirror: 0xcfeaff, brush: 0xff8a2e, diaper: 0xff8fd0 };

export function relicModel(id) {
  const s = new THREE.Group(), add = (g, m) => { const o = new THREE.Mesh(g, m); s.add(o); return o; };
  const gold = new THREE.MeshStandardMaterial({ color: 0xffc84a, metalness: 1, roughness: 0.22, emissive: 0xff9a1a, emissiveIntensity: 0.55 });
  if (id === 'bone') {                      // golden bone
    add(new THREE.CapsuleGeometry(0.075, 0.5, 6, 14), gold).rotation.z = Math.PI / 2;
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) add(new THREE.SphereGeometry(0.125, 16, 12), gold).position.set(sx * 0.31, sy * 0.085, 0);
    s.rotation.z = 0.5;
  } else if (id === 'sock') {               // old stinky sock
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.42, 0), new THREE.Vector3(0.01, 0.2, 0), new THREE.Vector3(0.02, 0.05, 0.02), new THREE.Vector3(0.1, -0.03, 0.03), new THREE.Vector3(0.26, -0.04, 0.03)]);
    add(new THREE.TubeGeometry(c, 24, 0.095, 12, false), new THREE.MeshStandardMaterial({ color: 0x9aa36e, roughness: 1, emissive: 0x2a8a10, emissiveIntensity: 0.35 }));
    add(new THREE.SphereGeometry(0.097, 12, 10), new THREE.MeshStandardMaterial({ color: 0x6b5a3a, roughness: 1, emissive: 0x2a8a10, emissiveIntensity: 0.3 })).position.set(0.26, -0.04, 0.03);
    const red = new THREE.MeshStandardMaterial({ color: 0x8e2d22, roughness: 1 });
    for (const y of [0.4, 0.33]) { const t = add(new THREE.TorusGeometry(0.097, 0.02, 6, 16), red); t.rotation.x = Math.PI / 2; t.position.y = y; }
    s.scale.setScalar(1.7); s.rotation.z = 0.25;
  } else if (id === 'mirror') {             // shiny hand mirror
    const face = add(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 32), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.02, emissive: 0xbfe4ff, emissiveIntensity: 0.9 })); face.rotation.x = Math.PI / 2; face.position.y = 0.2;
    add(new THREE.TorusGeometry(0.21, 0.028, 10, 32), gold).position.y = 0.2;
    add(new THREE.CylinderGeometry(0.026, 0.032, 0.3, 10), gold).position.y = -0.17;
    add(new THREE.SphereGeometry(0.045, 10, 8), gold).position.y = -0.33;
    s.scale.setScalar(1.5);
  } else if (id === 'brush') {              // Agata's hand brush
    const woodM = new THREE.MeshStandardMaterial({ color: 0xb5651d, roughness: 0.55, emissive: 0xff7a1a, emissiveIntensity: 0.25 }), straw = new THREE.MeshStandardMaterial({ color: 0xe8c66a, roughness: 0.9, emissive: 0xffb030, emissiveIntensity: 0.3 });
    add(new THREE.CylinderGeometry(0.028, 0.034, 0.36, 10), woodM).position.y = 0.3;
    add(new THREE.SphereGeometry(0.04, 10, 8), woodM).position.y = 0.49;
    add(new THREE.BoxGeometry(0.34, 0.09, 0.1), woodM).position.y = 0.09;
    for (let i = -4; i <= 4; i++) for (const dz of [-0.03, 0.03]) { const b = add(new THREE.ConeGeometry(0.022, 0.26, 6), straw); b.rotation.x = Math.PI; b.position.set(i * 0.038, -0.07, dz); b.rotation.z = i * 0.035; }
    s.rotation.z = 0.45; s.scale.setScalar(1.25);
  } else if (id === 'diaper') {             // Jaś's nappy
    const cloth = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.95, emissive: 0xff9ad6, emissiveIntensity: 0.22 }), tab = new THREE.MeshStandardMaterial({ color: 0x4aa3ff, roughness: 0.6, emissive: 0x2a6adf, emissiveIntensity: 0.4 });
    add(new THREE.SphereGeometry(0.2, 18, 14), cloth).scale.set(1.1, 0.85, 0.82);
    const waist = add(new THREE.TorusGeometry(0.18, 0.04, 10, 24), cloth); waist.rotation.x = Math.PI / 2; waist.position.y = 0.11; waist.scale.set(1.1, 0.82, 1);
    for (const sd of [-1, 1]) {
      const leg = add(new THREE.TorusGeometry(0.075, 0.03, 8, 18), cloth); leg.position.set(sd * 0.12, -0.11, 0.02); leg.rotation.set(Math.PI / 2 - 0.5, 0, sd * 0.5);
      const t = add(new THREE.BoxGeometry(0.09, 0.05, 0.02), tab); t.position.set(sd * 0.13, 0.1, 0.145); t.rotation.y = sd * 0.5;
    }
    s.scale.setScalar(1.25);
  }
  s.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return s;
}
