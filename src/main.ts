import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { createSolarSystem, type BodyView } from './scene/solarSystem';
import { createStarfield } from './scene/starfield';
import { CameraRig } from './scene/cameraRig';
import { createTextureLoader } from './scene/textures';
import { createBodyList, createLoader, createUI, type Scope } from './ui/ui';
import { simClock } from './time';
import { createBelts, type BeltView } from './scene/belts';
import { createGalaxies, type GalaxyView } from './scene/galaxies';
import { beltText, galaxyName, t } from './i18n';

// ---------- Render ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

/** Her sahnenin kendi etiket katmanı var; görünmeyen kapsamın etiketleri DOM'da kalmasın diye. */
function makeLabelRenderer() {
  const r = new CSS2DRenderer();
  r.setSize(innerWidth, innerHeight);
  Object.assign(r.domElement.style, { position: 'absolute', top: '0', left: '0', pointerEvents: 'none' });
  document.body.appendChild(r.domElement);
  return r;
}
const labelRenderer = makeLabelRenderer();
const galaxyLabelRenderer = makeLabelRenderer();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000005);
const galaxyScene = new THREE.Scene();
galaxyScene.background = new THREE.Color(0x000003);

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
let selectedGalaxy: GalaxyView | null = null;
let scope: Scope = 'solar';
let labelsOn = true;

const ui = createUI(
  {
    onSpeed: (v) => (simClock.speed = v),
    onToday: () => simClock.reset(),
    onLabels: (on) => {
      labelsOn = on;
      applyLabelVisibility();
    },
    onClose: deselect,
  },
  simClock.speed,
);

const belts = createBelts(scene, selectBelt);
belts.setLabels((id) => beltText(id, 'name'));
const jupiter = system.views.find((v) => v.id === 'jupiter')!;

const galaxies = createGalaxies(galaxyScene, selectGalaxy, () => setScope('solar'), galaxyName, t('galaxy.sunHere'));
galaxies.setViewport(innerHeight, camera.fov);

const bodyList = createBodyList(system.views, select, belts.views, selectBelt, galaxies.views, selectGalaxy, setScope);

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

function selectGalaxy(g: GalaxyView) {
  selectedGalaxy = g;
  // Yükseklik sınırı yok (-1): bakış yönü korunur; Andromeda'ya Samanyolu'ndan bakınca
  // gökyüzünde gördüğümüz eğik hâliyle görünür.
  rig.flyTo(g.object, g.radius * 0.55, -1);
  bodyList.setSelected(g.id);
  ui.showGalaxy(g);
}

function deselect() {
  selected = null;
  selectedGalaxy = null;
  system.showAxis(null);
  bodyList.setSelected(null);
  rig.release();
  ui.hide();
}

addEventListener('keydown', (e) => e.key === 'Escape' && deselect());

// ---------- Kapsam: Güneş Sistemi ↔ Galaksiler ----------
interface CamState { pos: THREE.Vector3; target: THREE.Vector3; min: number; max: number }
const saved: Partial<Record<Scope, CamState>> = {};

function applyLabelVisibility() {
  labelRenderer.domElement.style.display = labelsOn && scope === 'solar' ? '' : 'none';
  galaxyLabelRenderer.domElement.style.display = labelsOn && scope === 'galaxy' ? '' : 'none';
}
applyLabelVisibility();

function setScope(s: Scope) {
  if (s === scope) return;
  deselect();
  saved[scope] = { pos: camera.position.clone(), target: controls.target.clone(), min: controls.minDistance, max: controls.maxDistance };
  scope = s;
  bodyList.setScope(s);
  ui.setScope(s);
  applyLabelVisibility();

  const st = saved[s];
  if (st) {
    camera.position.copy(st.pos);
    controls.target.copy(st.target);
    controls.minDistance = st.min;
    controls.maxDistance = st.max;
  } else if (s === 'galaxy') {
    // İlk giriş: Samanyolu'nun üstünden başla, Andromeda'ya uç.
    camera.position.set(-60, 110, 150);
    controls.target.set(0, 0, 0);
    controls.maxDistance = 15000;
    selectGalaxy(galaxies.views.find((g) => g.id === 'm31')!);
  }
  controls.update();
}

// ---------- Tıklama ile seçim (ekran uzayında en yakın nesne) ----------
const down = new THREE.Vector2();
const proj = new THREE.Vector3();
let touchSlop = 16;
renderer.domElement.addEventListener('pointerdown', (e) => down.set(e.clientX, e.clientY));
renderer.domElement.addEventListener('pointerup', (e) => {
  const touch = e.pointerType === 'touch';
  if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > (touch ? 10 : 5)) return; // sürükleme
  touchSlop = touch ? 28 : 16; // parmakla dokunmada daha geniş hedef
  if (scope === 'solar') {
    const v = pick(system.views, e.clientX, e.clientY);
    if (v) select(v);
  } else {
    const g = pick(galaxies.views, e.clientX, e.clientY);
    if (g) selectGalaxy(g);
  }
});

function pick<T extends { object: THREE.Object3D; radius: number }>(items: T[], x: number, y: number): T | null {
  const focal = innerHeight / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  let best: T | null = null;
  let bestScore = Infinity;
  for (const v of items) {
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
  galaxyLabelRenderer.setSize(innerWidth, innerHeight);
  galaxies.setViewport(innerHeight, camera.fov);
});

let listTimer = 0;
const timer = new THREE.Timer();
timer.connect(document); // sekme gizlenince dt sıçramasın
renderer.setAnimationLoop((now) => {
  timer.update(now);
  const dt = Math.min(timer.getDelta(), 0.1);
  if (scope === 'solar') {
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
  } else {
    rig.update(dt);
    galaxies.updateLabels(camera, selectedGalaxy);
    controls.update();
    renderer.render(galaxyScene, camera);
    galaxyLabelRenderer.render(galaxyScene, camera);
  }
});
