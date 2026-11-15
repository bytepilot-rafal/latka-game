// Billboard particles + additive light beams.
import * as THREE from 'three';

export const fogUniforms = { uFogColor: { value: new THREE.Color(0.7, 0.6, 0.5) }, uFogDensity: { value: 0.004 } };

export class Particles {
  constructor(max, additive) {
    this.max = max; this.n = 0;
    this.p = new Float32Array(max * 3); this.d = new Float32Array(max * 2); this.c = new Float32Array(max * 4);
    this.v = new Float32Array(max * 3); this.life = new Float32Array(max); this.age = new Float32Array(max);
    this.s0 = new Float32Array(max); this.s1 = new Float32Array(max); this.a0 = new Float32Array(max);
    this.grav = new Float32Array(max); this.drag = new Float32Array(max); this.rv = new Float32Array(max);
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]), 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    this.aP = new THREE.InstancedBufferAttribute(this.p, 3); this.aD = new THREE.InstancedBufferAttribute(this.d, 2); this.aC = new THREE.InstancedBufferAttribute(this.c, 4);
    for (const a of [this.aP, this.aD, this.aC]) a.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('iPos', this.aP); g.setAttribute('iData', this.aD); g.setAttribute('iCol', this.aC);
    g.instanceCount = 0;
    const mat = new THREE.ShaderMaterial({
      uniforms: fogUniforms,
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: `
        attribute vec3 iPos; attribute vec2 iData; attribute vec4 iCol;
        uniform float uFogDensity; varying vec2 vUv; varying vec4 vCol; varying float vFog;
        void main(){ vUv = position.xy; vCol = iCol;
          vec4 mv = viewMatrix * vec4(iPos, 1.0);
          float c = cos(iData.y), s = sin(iData.y);
          mv.xy += mat2(c, -s, s, c) * position.xy * iData.x;
          gl_Position = projectionMatrix * mv;
          float d = -mv.z; vFog = 1.0 - exp(-uFogDensity * uFogDensity * d * d);
          vCol.a *= smoothstep(0.15, 0.7, d); }`,
      fragmentShader: `
        uniform vec3 uFogColor; varying vec2 vUv; varying vec4 vCol; varying float vFog;
        void main(){ float d = length(vUv) * 2.0; float a = smoothstep(1.0, 0.0, d); a *= a;
          ${additive ? 'gl_FragColor = vec4(vCol.rgb * (1.0 - vFog), vCol.a * a);' : 'gl_FragColor = vec4(mix(vCol.rgb, uFogColor, vFog), vCol.a * a);'} }`,
    });
    this.geo = g;
    this.mesh = new THREE.Mesh(g, mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = additive ? 11 : 10;
  }
  spawn(x, y, z, vx, vy, vz, life, s0, s1, r, g, b, a, grav = 0, drag = 0) {
    if (this.n >= this.max) return;
    const i = this.n++;
    this.p[i * 3] = x; this.p[i * 3 + 1] = y; this.p[i * 3 + 2] = z;
    this.v[i * 3] = vx; this.v[i * 3 + 1] = vy; this.v[i * 3 + 2] = vz;
    this.life[i] = life; this.age[i] = 0; this.s0[i] = s0; this.s1[i] = s1; this.a0[i] = a;
    this.c[i * 4] = r; this.c[i * 4 + 1] = g; this.c[i * 4 + 2] = b; this.c[i * 4 + 3] = 0;
    this.grav[i] = grav; this.drag[i] = drag; this.d[i * 2] = s0; this.d[i * 2 + 1] = Math.random() * 6.283; this.rv[i] = (Math.random() - 0.5) * 1.2;
  }
  update(dt) {
    const { p, v, c, d } = this;
    for (let i = 0; i < this.n; i++) {
      this.age[i] += dt;
      if (this.age[i] >= this.life[i]) {
        const j = --this.n;
        if (i !== j) {
          p.copyWithin(i * 3, j * 3, j * 3 + 3); v.copyWithin(i * 3, j * 3, j * 3 + 3); c.copyWithin(i * 4, j * 4, j * 4 + 4); d.copyWithin(i * 2, j * 2, j * 2 + 2);
          for (const arr of [this.life, this.age, this.s0, this.s1, this.a0, this.grav, this.drag, this.rv]) arr[i] = arr[j];
        }
        i--; continue;
      }
      const t = this.age[i] / this.life[i];
      const dr = Math.max(0, 1 - this.drag[i] * dt);
      v[i * 3] *= dr; v[i * 3 + 1] = v[i * 3 + 1] * dr - this.grav[i] * dt; v[i * 3 + 2] *= dr;
      p[i * 3] += v[i * 3] * dt; p[i * 3 + 1] += v[i * 3 + 1] * dt; p[i * 3 + 2] += v[i * 3 + 2] * dt;
      d[i * 2] = this.s0[i] + (this.s1[i] - this.s0[i]) * t; d[i * 2 + 1] += this.rv[i] * dt;
      c[i * 4 + 3] = this.a0[i] * Math.min(1, t * 7) * (1 - t) * (1 - t * 0.3);
    }
    this.geo.instanceCount = this.n;
    this.aP.needsUpdate = this.aD.needsUpdate = this.aC.needsUpdate = true;
  }
}

// soft additive column of light (v = 0 at the bottom)
export function beamMaterial(color, strength, timeU) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uStrength: { value: strength }, uTime: timeU },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uStrength; uniform float uTime; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ float f = pow(abs(dot(normalize(vN), normalize(vV))), 2.0);
        float a = pow(clamp(1.0 - vUv.y, 0.0, 1.0), 1.6) * f * (0.8 + 0.2 * sin(vUv.y * 40.0 - uTime * 3.0 + vUv.x * 12.0));
        gl_FragColor = vec4(uColor * uStrength, a); }`,
  });
}

// soft round glow sprite
export function glowMaterial(color, strength) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uStrength: { value: strength } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 uColor; uniform float uStrength; varying vec2 vUv; void main(){ float d = length(vUv - 0.5) * 2.0; float a = smoothstep(1.0, 0.0, d); gl_FragColor = vec4(uColor * uStrength, a * a); }',
  });
}
