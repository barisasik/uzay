import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ---------- VERİ: gerçek değerler (JPL / NASA fact sheet) ----------
// radiusKm: ortalama yarıçap, a: yarı büyük eksen (AU), periodDays: yörünge süresi,
// L0: J2000 ortalama boylamı (derece)
interface Body {
  name: string;
  radiusKm: number;
  a: number;
  periodDays: number;
  L0: number;
  color: number;
}

const SUN = { name: 'Güneş', radiusKm: 695_700, color: 0xffcc55 };

const PLANETS: Body[] = [
  { name: 'Merkür',  radiusKm: 2_439.7, a: 0.38710, periodDays: 87.969,    L0: 252.25, color: 0x9e9e9e },
  { name: 'Venüs',   radiusKm: 6_051.8, a: 0.72333, periodDays: 224.701,   L0: 181.98, color: 0xe8c27a },
  { name: 'Dünya',   radiusKm: 6_371.0, a: 1.00000, periodDays: 365.256,   L0: 100.46, color: 0x3a7bd5 },
  { name: 'Mars',    radiusKm: 3_389.5, a: 1.52371, periodDays: 686.980,   L0: -4.55,  color: 0xc1440e },
  { name: 'Jüpiter', radiusKm: 69_911,  a: 5.20289, periodDays: 4_332.59,  L0: 34.40,  color: 0xd8b48a },
  { name: 'Satürn',  radiusKm: 58_232,  a: 9.53668, periodDays: 10_759.22, L0: 49.95,  color: 0xe3d18f },
  { name: 'Uranüs',  radiusKm: 25_362,  a: 19.1891, periodDays: 30_688.5,  L0: 313.24, color: 0x9fdfe8 },
  { name: 'Neptün',  radiusKm: 24_622,  a: 30.0699, periodDays: 60_182,    L0: -55.12, color: 0x4b70dd },
];

// ---------- ÖLÇEK: gerçek değer → sahne birimi (tek yer) ----------
// 'schematic': uzaklıklar sıkıştırılmış, gezegenler büyütülmüş.
// Faz 5'te 'real' modu buraya eklenecek.
type ScaleMode = 'schematic';
const scaleMode: ScaleMode = 'schematic';

const scale = {
  distance(au: number): number {
    switch (scaleMode) {
      case 'schematic': return 6 + 14 * Math.sqrt(au);
    }
  },
  radius(km: number): number {
    switch (scaleMode) {
      case 'schematic': return 0.4 * Math.pow(km / 1000, 0.45);
    }
  },
};

// ---------- ZAMAN ----------
const J2000_MS = Date.UTC(2000, 0, 1, 12);
const DAY_MS = 86_400_000;
let simDays = (Date.now() - J2000_MS) / DAY_MS; // J2000'den bu yana gün
const DAYS_PER_SECOND = 10;

// ---------- SAHNE ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000005);

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.01, 1e6);
camera.position.set(0, 60, 120);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 5;
controls.maxDistance = 2000;

scene.add(new THREE.AmbientLight(0xffffff, 0.08));
scene.add(new THREE.PointLight(0xffffff, 3, 0, 0)); // Güneş'ten, sönümsüz

// Güneş
const sunMesh = new THREE.Mesh(
  new THREE.SphereGeometry(scale.radius(SUN.radiusKm), 48, 32),
  new THREE.MeshBasicMaterial({ color: SUN.color }),
);
scene.add(sunMesh);

// Gezegenler + yörünge çizgileri
const sphereGeo = new THREE.SphereGeometry(1, 32, 24);
const planetMeshes = PLANETS.map((p) => {
  const mesh = new THREE.Mesh(sphereGeo, new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.9 }));
  mesh.scale.setScalar(scale.radius(p.radiusKm));
  scene.add(mesh);

  const r = scale.distance(p.a);
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < 256; i++) {
    const t = (i / 256) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(t) * r, 0, -Math.sin(t) * r));
  }
  const orbit = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color: 0x4466aa, transparent: true, opacity: 0.35 }),
  );
  scene.add(orbit);
  return mesh;
});

// Arka plan yıldızları (geçici; Faz 4a'da HYG ile değişecek)
{
  const N = 6000;
  const pos = new Float32Array(N * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    v.randomDirection().multiplyScalar(5000);
    pos.set([v.x, v.y, v.z], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, sizeAttenuation: false })));
}

function updatePlanets() {
  PLANETS.forEach((p, i) => {
    const L = THREE.MathUtils.degToRad(p.L0) + (2 * Math.PI * simDays) / p.periodDays;
    const r = scale.distance(p.a);
    planetMeshes[i].position.set(Math.cos(L) * r, 0, -Math.sin(L) * r);
  });
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  simDays += clock.getDelta() * DAYS_PER_SECOND;
  updatePlanets();
  controls.update();
  renderer.render(scene, camera);
});
