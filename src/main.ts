import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { createSolarSystem, type BodyView } from './scene/solarSystem';
import { createStarfield } from './scene/starfield';
import { CameraRig } from './scene/cameraRig';
import { createTextureLoader } from './scene/textures';
import { createBodyList, createLoader, createScaleBar, createUI, type Scope } from './ui/ui';
import { simClock } from './time';
import { createBelts, type BeltView } from './scene/belts';
import { createGalaxies, type GalaxyView } from './scene/galaxies';
import { beltText, galaxyName, t } from './i18n';
import { AU } from './scale';

// Tek sahne, gerçek ölçek (1 birim = 1000 km). Güneş dünya orijininde; galaksiler
// aynı sahnede gerçek uzaklıklarında. Bkz. scale.ts.

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
scene.background = new THREE.Color(0x000004);

// Yakın düzlem 100 m, uzak düzlem ~100 milyon ışık yılı; logaritmik derinlik ikisini de taşır.
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 1e-4, 1e18);
camera.position.set(0, 1.4 * AU, 2.6 * AU); // iç gezegenlere genel bakış

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 1;
controls.maxDistance = 1e17; // ~10 milyon ışık yılı
controls.zoomSpeed = 3; // yirmi mertebelik ölçekte tekerlekle gezilebilsin

scene.add(new THREE.AmbientLight(0xffffff, 0.08));
scene.add(new THREE.PointLight(0xffffff, 3, 0, 0)); // Güneş'ten, sönümsüz

// ---------- Sahne ----------
const loader = createLoader();
const loadTexture = createTextureLoader(renderer, loader.progress, loader.done);
const starfield = createStarfield(scene);
const rig = new CameraRig(camera, controls);
const system = createSolarSystem(scene, loadTexture, select);
let selected: BodyView | null = null;
let selectedGalaxy: GalaxyView | null = null;
let selectedBelt: BeltView | null = null;
let labelsOn = true;

const ui = createUI(
  {
    onSpeed: (v) => (simClock.speed = v),
    onToday: () => simClock.reset(),
    onLabels: (on) => {
      labelsOn = on;
      labelRenderer.domElement.style.display = on ? '' : 'none';
    },
    onClose: deselect,
  },
  simClock.speed,
);
const scaleBar = createScaleBar();

const belts = createBelts(scene, selectBelt);
belts.setLabels((id) => beltText(id, 'name'));
const jupiter = system.views.find((v) => v.id === 'jupiter')!;
const sun = system.views.find((v) => v.id === 'sun')!;

const galaxies = createGalaxies(scene, selectGalaxy, () => select(sun), galaxyName, t('galaxy.sunHere'));
galaxies.setViewport(innerHeight, camera.fov);

const bodyList = createBodyList(system.views, select, belts.views, selectBelt, galaxies.views, selectGalaxy, setScope);

function clearSelection() {
  selected = null;
  selectedGalaxy = null;
  selectedBelt = null;
  system.showAxis(null);
}

function selectBelt(b: BeltView) {
  clearSelection();
  selectedBelt = b;
  rig.flyTo(b.focus, b.viewRadius, b.id === 'trojans' ? 0.35 : 0.7);
  setScope('solar');
  bodyList.setSelected(b.id);
  ui.showBelt(b);
}

function select(v: BodyView) {
  clearSelection();
  selected = v;
  rig.flyTo(v.object, v.radius);
  system.showAxis(v);
  setScope('solar');
  bodyList.setSelected(v.id);
  ui.show(v);
}

function selectGalaxy(g: GalaxyView) {
  clearSelection();
  selectedGalaxy = g;
  // Yükseklik sınırı yok (-1): bakış yönü korunur; Andromeda'ya bizim taraftan bakınca
  // gökyüzünde gördüğümüz eğik hâliyle görünür.
  rig.flyTo(g.object, g.radius * 0.55, -1);
  setScope('galaxy');
  bodyList.setSelected(g.id);
  ui.showGalaxy(g);
}

function deselect() {
  clearSelection();
  bodyList.setSelected(null);
  rig.release();
  ui.hide();
}

addEventListener('keydown', (e) => e.key === 'Escape' && deselect());

/** Sol listede hangi bölüm görünsün (kamerayı etkilemez). */
let scope: Scope = 'solar';
function setScope(s: Scope) {
  if (s === scope) return;
  scope = s;
  bodyList.setScope(s);
}

// ---------- Tıklama ile seçim (ekran uzayında en yakın nesne) ----------
const down = new THREE.Vector2();
const proj = new THREE.Vector3();
const wp = new THREE.Vector3();
let touchSlop = 16;
renderer.domElement.addEventListener('pointerdown', (e) => down.set(e.clientX, e.clientY));
renderer.domElement.addEventListener('pointerup', (e) => {
  const touch = e.pointerType === 'touch';
  if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > (touch ? 10 : 5)) return; // sürükleme
  touchSlop = touch ? 28 : 16; // parmakla dokunmada daha geniş hedef
  // Yalnızca o ölçekte etiketi görünen (anlamlı) cisimler seçilebilir.
  const b = pick(system.views.filter((v) => v.label.visible), e.clientX, e.clientY);
  const g = pick(galaxies.views.filter((v) => v.label.visible), e.clientX, e.clientY);
  if (b && (!g || b.score <= g.score)) select(b.item);
  else if (g) selectGalaxy(g.item);
});

function focalPx() {
  return innerHeight / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
}

function pick<T extends { object: THREE.Object3D; radius: number }>(items: T[], x: number, y: number) {
  const focal = focalPx();
  let best: T | null = null;
  let bestScore = Infinity;
  for (const v of items) {
    v.object.getWorldPosition(wp);
    proj.copy(wp).project(camera);
    if (proj.z > 1) continue; // kameranın arkasında
    const sx = ((proj.x + 1) / 2) * innerWidth;
    const sy = ((1 - proj.y) / 2) * innerHeight;
    const rPx = (v.radius / camera.position.distanceTo(wp)) * focal;
    const d = Math.hypot(sx - x, sy - y);
    if (d < Math.max(touchSlop, rPx) && d - rPx < bestScore) {
      best = v;
      bestScore = d - rPx;
    }
  }
  return best ? { item: best, score: bestScore } : null;
}

/**
 * Çok uzak bir uzak düzlemle CSS2DRenderer, kameranın arkasındaki etiketleri ayna gibi
 * öne yansıtır; bunlar elle gizlenir.
 */
const allLabels = [
  ...system.views.map((v) => v.label),
  ...belts.views.map((v) => v.label),
  ...galaxies.views.map((v) => v.label),
  ...galaxies.extraLabels,
];
const camDir = new THREE.Vector3();
function hideLabelsBehindCamera() {
  camera.getWorldDirection(camDir);
  for (const l of allLabels) {
    if (!l.visible) continue;
    l.getWorldPosition(wp);
    if (wp.sub(camera.position).dot(camDir) <= 0) l.visible = false;
  }
}

// ---------- Döngü ----------
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  labelRenderer.setSize(innerWidth, innerHeight);
  galaxies.setViewport(innerHeight, camera.fov);
});

let listTimer = 0;
const timer = new THREE.Timer();
timer.connect(document); // sekme gizlenince dt sıçramasın
const loop = (now: number) => {
  timer.update(now);
  const dt = Math.min(timer.getDelta(), 0.1);
  simClock.tick(dt);
  system.update(simClock.ms);
  rig.update(dt);
  controls.update();

  const sunDist = camera.position.length(); // Güneş orijinde
  const focal = focalPx();
  belts.update(simClock.ms, jupiter.ecl, sunDist, selectedBelt?.id ?? null);
  system.updateLabels(camera, selected, sunDist, focal);
  galaxies.updateLabels(camera, selectedGalaxy, sunDist);
  starfield.update(camera, sunDist);
  hideLabelsBehindCamera();
  scaleBar.update(camera.position.distanceTo(controls.target) / focal);

  if (selected) ui.updateDistance(selected);
  listTimer += dt;
  if (listTimer > 0.25) {
    listTimer = 0;
    bodyList.update();
  }
  ui.setDate(simClock.ms);
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
};
renderer.setAnimationLoop(loop);
