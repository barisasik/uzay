import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

// Uzay aracı ve ana istasyon: dış dosya kullanmadan, kodla üretilen basit modeller.
// Boyutlar sahne birimi (1 birim = 1000 km) cinsindendir.

/** Aracın gerçek boyu: 40 m. */
export const SHIP_LENGTH = 0.04;
/** İstasyon halkasının yarıçapı: 120 m. */
export const STATION_SIZE = 0.12;

const STATION_ALTITUDE_KM = 400;
const STATION_PERIOD_MIN = 92.7;
const STATION_INCL = 51.6;
const TAU = Math.PI * 2;
const D2R = Math.PI / 180;

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(160,220,255,0.7)');
  grad.addColorStop(1, 'rgba(60,140,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Uzay aracı. Yerel uzayda burnu +Z yönünde, boyu ~1 birim (dıştaki grup SHIP_LENGTH ile ölçeklenir).
 * setThrottle(0..1): motor parlaklığı.
 */
export function createShip() {
  const object = new THREE.Group();
  const model = new THREE.Group();
  object.add(model);

  const hull = new THREE.MeshStandardMaterial({ color: 0xd8dde6, roughness: 0.5, metalness: 0.35, emissive: 0x0d1118 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x3a404c, roughness: 0.7, metalness: 0.4, emissive: 0x06070a });
  const accent = new THREE.MeshStandardMaterial({
    color: 0x2f5fb3, roughness: 0.5, metalness: 0.3, emissive: 0x081020, side: THREE.DoubleSide,
  });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x0c1830, roughness: 0.1, metalness: 0.9, emissive: 0x0a2a55, emissiveIntensity: 0.8,
  });
  const nozzle = new THREE.MeshBasicMaterial({ color: 0x8fdcff });

  // Gövde: Y ekseninde döndürülmüş profil, sonra Z eksenine yatırılır.
  const profile = [[0, -0.5], [0.1, -0.5], [0.13, -0.36], [0.14, 0.08], [0.115, 0.28], [0.065, 0.44], [0, 0.52]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 40), hull);
  body.rotation.x = Math.PI / 2;
  model.add(body);

  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.075, 24, 12, 0, TAU, 0, Math.PI / 2), glass);
  canopy.scale.set(1, 0.75, 2.1);
  canopy.position.set(0, 0.09, 0.2);
  model.add(canopy);

  // Kanatlar (geriye ok biçimli)
  const ws = new THREE.Shape();
  ws.moveTo(0.1, 0.1);
  ws.lineTo(0.47, -0.2);
  ws.lineTo(0.5, -0.34);
  ws.lineTo(0.1, -0.3);
  ws.closePath();
  const wingGeo = new THREE.ExtrudeGeometry(ws, { depth: 0.018, bevelEnabled: false });
  for (const sx of [1, -1]) {
    const w = new THREE.Mesh(wingGeo, accent);
    w.rotation.x = Math.PI / 2; // şekil düzlemi XY → XZ
    w.scale.x = sx;
    w.position.y = 0.009;
    model.add(w);
  }

  // Dikey dümen
  const fs = new THREE.Shape();
  fs.moveTo(-0.12, 0.1);
  fs.lineTo(-0.4, 0.3);
  fs.lineTo(-0.49, 0.3);
  fs.lineTo(-0.47, 0.08);
  fs.closePath();
  const fin = new THREE.Mesh(new THREE.ExtrudeGeometry(fs, { depth: 0.014, bevelEnabled: false }), accent);
  fin.rotation.y = -Math.PI / 2; // şeklin x'i → -z (geriye)
  fin.position.x = 0.007;
  model.add(fin);

  // Motorlar ve parıltı
  const tex = glowTexture();
  const glows: THREE.Sprite[] = [];
  const engine = (x: number, y: number, r: number, len: number) => {
    const nac = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.15, len, 20), dark);
    nac.rotation.x = Math.PI / 2;
    nac.position.set(x, y, -0.5 + len / 2 - 0.02);
    model.add(nac);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(r * 0.85, 20), nozzle);
    disc.rotation.y = Math.PI;
    disc.position.set(x, y, -0.5 - 0.021);
    model.add(disc);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, color: 0x9fdcff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
    }));
    s.position.set(x, y, -0.56);
    s.userData.base = r * 3.2;
    model.add(s);
    glows.push(s);
  };
  engine(0, 0, 0.085, 0.12);
  engine(0.2, -0.02, 0.055, 0.3);
  engine(-0.2, -0.02, 0.055, 0.3);

  object.scale.setScalar(SHIP_LENGTH);

  return {
    object,
    model,
    setThrottle(k: number) {
      for (const s of glows) {
        s.scale.setScalar(s.userData.base * (0.35 + 1.4 * k));
        s.material.opacity = 0.35 + 0.65 * k;
      }
    },
  };
}

function panelTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 48;
  const g = c.getContext('2d')!;
  g.fillStyle = '#c9ccd2';
  g.fillRect(0, 0, 128, 48);
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 6; y++) {
      g.fillStyle = (x + y) % 2 ? '#1c3a78' : '#17336b';
      g.fillRect(x * 8 + 1, y * 8 + 1, 6.5, 6.5);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Kurgusal ana istasyon: Dünya'nın 400 km yukarısında, ekvatora 51,6° eğik dairesel yörüngede
 * (ISS'inkine benzer), dönen bir yaşam halkası, güneş panelleri ve bir yanaşma kolu.
 */
export function createStation(scene: THREE.Scene, labelText: string, onPick: () => void) {
  const object = new THREE.Group(); // yörüngedeki konum ve yönelim
  const model = new THREE.Group();
  model.scale.setScalar(STATION_SIZE);
  object.add(model);
  scene.add(object);

  const metal = new THREE.MeshStandardMaterial({ color: 0xc8ccd4, roughness: 0.45, metalness: 0.5, emissive: 0x0c0f14 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x4a505c, roughness: 0.7, metalness: 0.4, emissive: 0x06070a });
  const warm = new THREE.MeshStandardMaterial({ color: 0xe4ddd0, roughness: 0.6, metalness: 0.2, emissive: 0x2a2010 });
  const panel = new THREE.MeshStandardMaterial({
    map: panelTexture(), roughness: 0.35, metalness: 0.4, emissive: 0x050a18, side: THREE.DoubleSide,
  });

  // Merkez gövde (Y ekseni = dönüş ekseni)
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 1.3, 32), metal);
  model.add(hub);
  for (const y of [0.65, -0.65]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 12), metal);
    cap.position.y = y;
    model.add(cap);
  }

  // Dönen yaşam halkası
  const ring = new THREE.Group();
  const torus = new THREE.Mesh(new THREE.TorusGeometry(1, 0.1, 16, 120), warm);
  torus.rotation.x = Math.PI / 2;
  ring.add(torus);
  for (let i = 0; i < 4; i++) {
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 10), metal);
    spoke.rotation.z = Math.PI / 2;
    spoke.position.x = 0.55;
    const arm = new THREE.Group();
    arm.rotation.y = (i * Math.PI) / 2;
    arm.add(spoke);
    ring.add(arm);
  }
  // Pencere ışıkları
  const lights = new THREE.Points(
    new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: 48 }, (_, i) => {
        const a = (i / 48) * TAU;
        return new THREE.Vector3(Math.cos(a) * 1.0, 0.04, Math.sin(a) * 1.0).multiplyScalar(1.0);
      }).flatMap((p) => [p.clone().setLength(1.1), p.clone().setLength(0.9)]),
    ),
    new THREE.PointsMaterial({ color: 0xffd890, size: 2, sizeAttenuation: false }),
  );
  ring.add(lights);
  model.add(ring);

  // Güneş paneli kafesi ve paneller
  const truss = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.06, 0.06), dark);
  truss.position.y = 0.55;
  model.add(truss);
  for (const x of [-1.85, -1.25, 1.25, 1.85]) {
    for (const z of [0.3, -0.3]) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.48), panel);
      p.rotation.x = -Math.PI / 2;
      p.position.set(x, 0.55, z);
      model.add(p);
    }
  }

  // Yanaşma kolu (+Z yönünde) ve kapı halkası
  const armDock = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.95, 16), metal);
  armDock.rotation.x = Math.PI / 2;
  armDock.position.set(0, -0.45, 0.55);
  model.add(armDock);
  const port = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.025, 10, 24), dark);
  port.position.set(0, -0.45, 1.02);
  model.add(port);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff4040 }));
  beacon.position.set(0, -0.36, 1.02);
  model.add(beacon);

  // Yanaşma noktası: aracın arkası kapıya değer, burnu +Z'ye (dışarı) bakar.
  const dock = new THREE.Object3D();
  dock.position.set(0, -0.45, 1.05 + (0.5 * SHIP_LENGTH) / STATION_SIZE);
  model.add(dock);

  const div = document.createElement('div');
  div.className = 'label station-label';
  div.textContent = labelText;
  div.addEventListener('click', onPick);
  const label = new CSS2DObject(div);
  label.position.set(0, 1.4 * STATION_SIZE, 0);
  label.center.set(0.5, 1);
  object.add(label);

  const r = (6_371 + STATION_ALTITUDE_KM) / 1000;
  const plane = new THREE.Quaternion().setFromEuler(new THREE.Euler(STATION_INCL * D2R, 0, 23.44 * D2R, 'ZYX'));
  const tmp = new THREE.Vector3();
  let blink = 0;

  return {
    object,
    dock,
    label,
    radius: STATION_SIZE * 2.2,
    altitudeKm: STATION_ALTITUDE_KM,
    periodMin: STATION_PERIOD_MIN,
    /** earthPos: Dünya'nın sahne konumu; ms: simülasyon zamanı; dt: gerçek saniye. */
    update(earthPos: THREE.Vector3, ms: number, dt: number) {
      const a = ((ms / 60000 / STATION_PERIOD_MIN) % 1) * TAU;
      tmp.set(Math.cos(a) * r, 0, -Math.sin(a) * r).applyQuaternion(plane);
      object.position.copy(earthPos).add(tmp);
      object.quaternion.copy(plane);
      ring.rotation.y += dt * 0.25;
      blink = (blink + dt) % 1.2;
      beacon.visible = blink < 0.15;
      object.updateMatrixWorld(true);
    },
  };
}
