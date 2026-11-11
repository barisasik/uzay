import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { DAY_MS, J2000_MS, type Vec3 } from '../astro/orbit';
import { eclipticToScene, scale } from '../scale';

export type BeltId = 'asteroid' | 'trojans' | 'kuiper';

export interface BeltView {
  id: BeltId;
  /** Kuşağın iç/dış sınırı (AU). */
  innerAU: number;
  outerAU: number;
  color: number;
  /** Kamera odağı (Güneş'te ya da Truvalılar için L4'te). */
  focus: THREE.Object3D;
  /** Odaklanınca kameranın uzaklığı için "yarıçap" (sahne birimi). */
  viewRadius: number;
  label: CSS2DObject;
}

/** Tekrarlanabilir rastgele sayı (her yüklemede aynı kuşak). */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const D2R = Math.PI / 180;

// Parçacıklar dairesel, eğik yörüngelerde. Konum GPU'da hesaplanır:
// açı = faz + 2π·yıl / a^1.5 (Kepler'in 3. yasası). Uzaklık ölçeği scale.ts'teki
// şematik formülle aynı olmalı: 6 + 14·√a.
const vertexShader = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  uniform float uYears;
  uniform float uLockLon;
  uniform float uLocked;
  uniform float uSize;
  attribute vec4 orbit;   // a (AU), faz, eğim, düğüm
  attribute float bright;
  varying float vBright;
  void main() {
    float a = orbit.x;
    float u = uLocked > 0.5 ? uLockLon + orbit.y : orbit.y + 6.2831853 * uYears / (a * sqrt(a));
    float ci = cos(orbit.z), si = sin(orbit.z);
    float cO = cos(orbit.w), sO = sin(orbit.w);
    float cu = cos(u), su = sin(u);
    vec3 d = vec3(cO * cu - sO * su * ci, sO * cu + cO * su * ci, su * si); // ekliptik
    vec3 p = vec3(d.x, d.z, -d.y) * (6.0 + 14.0 * sqrt(a));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * bright;
    vBright = bright;
    #include <logdepthbuf_vertex>
  }
`;

const fragmentShader = /* glsl */ `
  #include <logdepthbuf_pars_fragment>
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vBright;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r2 = dot(c, c);
    if (r2 > 0.25) discard;
    float a = (1.0 - r2 * 4.0) * uOpacity * min(1.0, vBright);
    gl_FragColor = vec4(uColor, a);
    #include <logdepthbuf_fragment>
  }
`;

interface Particle { a: number; phase: number; inc: number; node: number; bright: number }

function makePoints(list: Particle[], color: number, size: number, opacity: number, locked: boolean) {
  const orbit = new Float32Array(list.length * 4);
  const bright = new Float32Array(list.length);
  list.forEach((p, i) => {
    orbit.set([p.a, p.phase, p.inc, p.node], i * 4);
    bright[i] = p.bright;
  });
  const geo = new THREE.BufferGeometry();
  // position yalnızca three'nin sayım/sınır hesapları için; gerçek konum shader'da.
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(list.length * 3), 3));
  geo.setAttribute('orbit', new THREE.BufferAttribute(orbit, 4));
  geo.setAttribute('bright', new THREE.BufferAttribute(bright, 1));
  const mat = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uYears: { value: 0 },
      uLockLon: { value: 0 },
      uLocked: { value: locked ? 1 : 0 },
      uSize: { value: size * Math.min(devicePixelRatio, 2) },
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false; // gerçek konumlar shader'da
  return pts;
}

const gauss = (rnd: () => number) => {
  // Box–Muller
  const u = Math.max(1e-9, rnd());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
};

/** Asteroit Kuşağı: 2,1–3,3 AU; Jüpiter rezonanslarındaki Kirkwood boşlukları dahil. */
function asteroidBelt(rnd: () => number, n: number): Particle[] {
  const gaps = [2.5, 2.82, 2.95, 3.27]; // 3:1, 5:2, 7:3, 2:1
  const out: Particle[] = [];
  while (out.length < n) {
    const a = 2.1 + rnd() * 1.2;
    if (gaps.some((g) => Math.abs(a - g) < 0.025)) continue;
    out.push({
      a,
      phase: rnd() * Math.PI * 2,
      inc: Math.abs(gauss(rnd)) * 8 * D2R,
      node: rnd() * Math.PI * 2,
      bright: 0.6 + rnd() * 0.8,
    });
  }
  return out;
}

/** Jüpiter Truvalıları: L4 (önde, +60°) ve L5 (arkada, −60°) çevresinde. */
function trojans(rnd: () => number, n: number): Particle[] {
  const out: Particle[] = [];
  for (let i = 0; i < n; i++) {
    const center = (i % 2 ? -60 : 60) * D2R;
    const node = rnd() * Math.PI * 2;
    const lon = center + gauss(rnd) * 12 * D2R;
    // Küçük eğimde boylam ≈ düğüm + u; Jüpiter'e kilitlemek için fazı düğüme göre kaydır.
    out.push({
      a: 5.2 + gauss(rnd) * 0.12,
      phase: lon - node,
      inc: Math.abs(gauss(rnd)) * 12 * D2R,
      node,
      bright: 0.6 + rnd() * 0.7,
    });
  }
  return out;
}

/** Kuiper Kuşağı: Plütinolar (39,4 AU, 3:2 rezonans) + klasik kuşak (42–48 AU) + seyrek dağınık disk. */
function kuiperBelt(rnd: () => number, n: number): Particle[] {
  const out: Particle[] = [];
  for (let i = 0; i < n; i++) {
    const k = rnd();
    let a: number, incDeg: number;
    if (k < 0.2) { a = 39.4 + gauss(rnd) * 0.3; incDeg = 12; }
    else if (k < 0.9) { a = 42 + rnd() * 6; incDeg = 5; }
    else { a = 48 + rnd() * 52; incDeg = 20; }
    out.push({
      a,
      phase: rnd() * Math.PI * 2,
      inc: Math.abs(gauss(rnd)) * incDeg * D2R,
      node: rnd() * Math.PI * 2,
      bright: 0.6 + rnd() * 0.9,
    });
  }
  return out;
}

export function createBelts(scene: THREE.Scene, onPick: (b: BeltView) => void) {
  const rnd = mulberry32(20261111);
  const group = new THREE.Group();
  scene.add(group);

  const specs = [
    { id: 'asteroid' as const, list: asteroidBelt(rnd, 7000), color: 0xb8a58c, size: 1.6, opacity: 0.75, locked: false, innerAU: 2.1, outerAU: 3.3, labelAU: 3.3, labelLon: 225 },
    { id: 'trojans' as const, list: trojans(rnd, 2400), color: 0xc9a77a, size: 1.6, opacity: 0.75, locked: true, innerAU: 5.0, outerAU: 5.4, labelAU: 5.2, labelLon: 0 },
    { id: 'kuiper' as const, list: kuiperBelt(rnd, 12000), color: 0x8fb3d9, size: 1.7, opacity: 0.6, locked: false, innerAU: 30, outerAU: 50, labelAU: 50, labelLon: 225 },
  ];

  const materials: { mat: THREE.ShaderMaterial; locked: boolean }[] = [];
  const views: BeltView[] = [];
  const trojanFocus = new THREE.Object3D();
  group.add(trojanFocus);

  for (const s of specs) {
    const pts = makePoints(s.list, s.color, s.size, s.opacity, s.locked);
    group.add(pts);
    materials.push({ mat: pts.material as THREE.ShaderMaterial, locked: s.locked });

    const div = document.createElement('div');
    div.className = 'label belt-label';
    div.addEventListener('pointerdown', (e) => e.stopPropagation());
    const label = new CSS2DObject(div);
    label.center.set(0.5, 0.5);

    let focus: THREE.Object3D;
    let viewRadius: number;
    if (s.id === 'trojans') {
      // Etiket ve odak L4'te; her karede Jüpiter'le birlikte taşınır.
      trojanFocus.add(label);
      focus = trojanFocus;
      viewRadius = 3;
    } else {
      const lon = s.labelLon * D2R;
      eclipticToScene({ x: Math.cos(lon) * s.labelAU, y: Math.sin(lon) * s.labelAU, z: 0 }, label.position);
      group.add(label);
      focus = new THREE.Object3D(); // Güneş'te
      group.add(focus);
      viewRadius = scale.distance(s.outerAU) / 4.5;
    }
    const view: BeltView = { id: s.id, innerAU: s.innerAU, outerAU: s.outerAU, color: s.color, focus, viewRadius, label };
    div.addEventListener('click', () => onPick(view));
    views.push(view);
  }

  const lockDir = new THREE.Vector3();
  return {
    views,
    /** Etiket metinlerini ayarlar (dil değişince de çağrılabilir). */
    setLabels(name: (id: BeltId) => string) {
      for (const v of views) v.label.element.textContent = name(v.id);
    },
    update(ms: number, jupiter: Vec3) {
      const years = (ms - J2000_MS) / DAY_MS / 365.25;
      const jLon = Math.atan2(jupiter.y, jupiter.x);
      for (const { mat, locked } of materials) {
        mat.uniforms.uYears.value = years;
        if (locked) mat.uniforms.uLockLon.value = jLon;
      }
      // L4 noktası: Jüpiter'in 60° önü.
      const r = Math.hypot(jupiter.x, jupiter.y);
      const l4 = jLon + 60 * D2R;
      eclipticToScene({ x: Math.cos(l4) * r, y: Math.sin(l4) * r, z: 0 }, lockDir);
      trojanFocus.position.copy(lockDir);
    },
  };
}
