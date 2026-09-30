import * as THREE from 'three';
import { equatorialVector, localSkyMatrix, precessJ2000 } from './astronomy.mjs';
import { cityRegion } from '../data/regions.mjs';

interface SkyData {
  stars: [number, number, number, number, number][];
  constellations: { id: string; paths: [number, number][][] }[];
}

const radius = 10000;
const vertex = `
  varying float elevation;
  void main() {
    elevation = (modelMatrix * vec4(position, 0.0)).y / 10000.0;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const lineFragment = `
  varying float elevation;
  void main() {
    if (elevation < 0.0) discard;
    gl_FragColor = vec4(0.53, 0.69, 0.61, 0.24 * smoothstep(0.0, 0.09, elevation));
  }
`;
const starVertex = `
  attribute float magnitude;
  attribute vec3 starColor;
  uniform float pixelRatio;
  varying float elevation;
  varying float brightness;
  varying vec3 tint;
  void main() {
    elevation = (modelMatrix * vec4(position, 0.0)).y / 10000.0;
    brightness = clamp(0.32 + (6.0 - magnitude) * 0.11, 0.25, 1.0);
    tint = starColor;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = (1.6 + max(0.0, 6.0 - magnitude) * 0.65) * pixelRatio;
  }
`;
const starFragment = `
  varying float elevation;
  varying float brightness;
  varying vec3 tint;
  void main() {
    if (elevation < 0.0) discard;
    float r = length(gl_PointCoord - vec2(0.5));
    float glow = 1.0 - smoothstep(0.12, 0.5, r);
    gl_FragColor = vec4(tint, glow * brightness * smoothstep(0.0, 0.07, elevation));
  }
`;

export async function makeCelestialSky(scene: THREE.Scene, pixelRatio: number) {
  const response = await fetch('/data/sky.json');
  if (!response.ok) throw new Error('Celestial catalog unavailable');
  const data = await response.json() as SkyData;
  const group = new THREE.Group();
  group.matrixAutoUpdate = false;
  const epochDate = new Date();
  const positions: number[] = [], magnitudes: number[] = [], colors: number[] = [];
  function catalogVector(ra: number, dec: number) {
    const [currentRA, currentDec] = precessJ2000(ra, dec, epochDate);
    return new THREE.Vector3(...equatorialVector(currentRA, currentDec) as [number, number, number]);
  }
  for (const [, ra, dec, mag, bv] of data.stars) {
    positions.push(...catalogVector(ra, dec).multiplyScalar(radius).toArray());
    magnitudes.push(mag);
    const cold = new THREE.Color(0xb9d7ff), neutral = new THREE.Color(0xe7efdf), warm = new THREE.Color(0xffd5a5);
    const color = bv < .65 ? cold.lerp(neutral, THREE.MathUtils.clamp((bv + .3) / .95, 0, 1)) : neutral.lerp(warm, THREE.MathUtils.clamp((bv - .65) / 1.2, 0, 1));
    colors.push(color.r, color.g, color.b);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('magnitude', new THREE.Float32BufferAttribute(magnitudes, 1));
  geometry.setAttribute('starColor', new THREE.Float32BufferAttribute(colors, 3));
  const material = new THREE.ShaderMaterial({ vertexShader: starVertex, fragmentShader: starFragment, uniforms: { pixelRatio: { value: pixelRatio } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const stars = new THREE.Points(geometry, material);
  stars.frustumCulled = false;
  group.add(stars);
  const lines: number[] = [];
  for (const constellation of data.constellations) for (const path of constellation.paths) for (let i = 1; i < path.length; i++) {
    const a = catalogVector(...path[i - 1]), b = catalogVector(...path[i]);
    const steps = Math.max(1, Math.ceil(a.angleTo(b) / THREE.MathUtils.degToRad(2)));
    for (let step = 0; step < steps; step++) {
      // Normalized interpolation stays on the sphere, including RA wraparound.
      lines.push(...a.clone().lerp(b, step / steps).normalize().multiplyScalar(radius).toArray(), ...a.clone().lerp(b, (step + 1) / steps).normalize().multiplyScalar(radius).toArray());
    }
  }
  const lineGeometry = new THREE.BufferGeometry(); lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
  const lineMaterial = new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: lineFragment, transparent: true, depthWrite: false });
  const outlines = new THREE.LineSegments(lineGeometry, lineMaterial); outlines.frustumCulled = false; group.add(outlines);
  scene.add(group);
  let lastSecond = -1;
  const rotation = new THREE.Matrix4();
  return {
    update(camera: THREE.Camera) {
      const now = new Date();
      if (Math.floor(now.getTime() / 1000) !== lastSecond) {
        lastSecond = Math.floor(now.getTime() / 1000);
        const m = localSkyMatrix(now, cityRegion.origin[1], cityRegion.origin[0]);
        rotation.set(m[0], m[1], m[2], 0, m[3], m[4], m[5], 0, m[6], m[7], m[8], 0, 0, 0, 0, 1);
      }
      // The celestial sphere follows the camera; stars never acquire city-scale parallax.
      group.matrix.copy(rotation).setPosition(camera.position);
      group.matrixWorldNeedsUpdate = true;
    },
    dispose() { scene.remove(group); geometry.dispose(); material.dispose(); lineGeometry.dispose(); lineMaterial.dispose(); },
  };
}
