import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { createSolarSystem, type BodyView } from './scene/solarSystem';
import { createStarfield } from './scene/starfield';
import { CameraRig } from './scene/cameraRig';
import { createTextureLoader } from './scene/textures';
import { createBodyList, createLoader, createUI } from './ui/ui';
import { simClock } from './time';
import { createBelts, type BeltView } from './scene/belts';
import { beltText } from './i18n';

// ---------- Render ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(innerWidth, innerHeight);
Object.assign(labelRenderer.domElement.style, { position: 'absolute', top: '0', left: '0', pointerEvents: 'none' });
document.body.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000005);

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.01, 1e6);
camera.position.set(0, 60, 120);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 1;
controls.maxDistance = 3000;

scene.add(new THREE.AmbientLight(0xffffff, 0.08));
scene.add(new THREE.PointLight(0xffffff, 3, 0, 0)); // Güneş'ten, sönümsüz

// ---------- Sahne ----------
const loader = createLoader();
const loadTexture = createTextureLoader(renderer, loader.progress, loader.done);
createStarfield(scene);
const rig = new CameraRig(camera, controls);
const system = createSolarSystem(scene, loadTexture, select);
let selected: BodyView | null = null;

const ui = createUI(
  {
    onSpeed: (v) => (simClock.speed = v),
    onToday: () => simClock.reset(),
    onLabels: (on) => (labelRenderer.domElement.style.display = on ? '' : 'none'),
    onClose: deselect,
  },
  simClock.speed,
);

const belts = createBelts(scene, selectBelt);
belts.setLabels((id) => beltText(id, 'name'));
const jupiter = system.views.find((v) => v.id === 'jupiter')!;

const bodyList = createBodyList(system.views, select, belts.views, selectBelt);

function selectBelt(b: BeltView) {
  selected = null;
  rig.flyTo(b.focus, b.viewRadius, b.id === 'trojans' ? 0.35 : 0.7);
  system.showAxis(null);
  bodyList.setSelected(b.id);
  ui.showBelt(b);
}

function select(v: BodyView) {
  selected = v;
  rig.flyTo(v.object, v.radius);
  system.showAxis(v);
  bodyList.setSelected(v.id);
  ui.show(v);
}

function deselect() {
  selected = null;
  system.showAxis(null);
  bodyList.setSelected(null);
  rig.release();
  ui.hide();
}

addEventListener('keydown', (e) => e.key === 'Escape' && deselect());

// ---------- Tıklama ile seçim (ekran uzayında en yakın gövde) ----------
const down = new THREE.Vector2();
const proj = new THREE.Vector3();
let touchSlop = 16;
renderer.domElement.addEventListener('pointerdown', (e) => down.set(e.clientX, e.clientY));
renderer.domElement.addEventListener('pointerup', (e) => {
  const touch = e.pointerType === 'touch';
  if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > (touch ? 10 : 5)) return; // sürükleme
  touchSlop = touch ? 28 : 16; // parmakla dokunmada daha geniş hedef
  const v = pick(e.clientX, e.clientY);
  if (v) select(v);
});

function pick(x: number, y: number): BodyView | null {
  const focal = innerHeight / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  let best: BodyView | null = null;
  let bestScore = Infinity;
  for (const v of system.views) {
    proj.copy(v.object.position).project(camera);
    if (proj.z > 1) continue; // kameranın arkasında
    const sx = ((proj.x + 1) / 2) * innerWidth;
    const sy = ((1 - proj.y) / 2) * innerHeight;
    const rPx = (v.radius / camera.position.distanceTo(v.object.position)) * focal;
    const d = Math.hypot(sx - x, sy - y);
    if (d < Math.max(touchSlop, rPx) && d - rPx < bestScore) {
      best = v;
      bestScore = d - rPx;
    }
  }
  return best;
}

// ---------- Döngü ----------
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  labelRenderer.setSize(innerWidth, innerHeight);
});

let listTimer = 0;
const timer = new THREE.Timer();
timer.connect(document); // sekme gizlenince dt sıçramasın
renderer.setAnimationLoop((now) => {
  timer.update(now);
  const dt = Math.min(timer.getDelta(), 0.1);
  simClock.tick(dt);
  system.update(simClock.ms);
  belts.update(simClock.ms, jupiter.ecl);
  rig.update(dt);
  system.updateLabels(camera, selected);
  controls.update();
  if (selected) ui.updateDistance(selected);
  listTimer += dt;
  if (listTimer > 0.25) {
    listTimer = 0;
    bodyList.update();
  }
  ui.setDate(simClock.ms);
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
});
