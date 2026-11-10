import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { MOON, PLANETS, SATURN_RINGS, SUN, URANUS_RINGS, type BodyId } from '../data/bodies';
import {
  DAY_MS, J2000_MS, elementsAt, orbitPoints, positionAt, satelliteDirection, satelliteOrbitPoints,
} from '../astro/orbit';
import { eclipticAxes, eclipticToScene, scale } from '../scale';
import { bodyName } from '../i18n';
import { applyMap, type LoadTexture } from './textures';

export type BodyKind = 'star' | 'planet' | 'moon';

export interface BodyView {
  id: BodyId;
  kind: BodyKind;
  /** Dünya konumu (eğiksiz, ölçeksiz); kamera ve etiket buna bağlı */
  object: THREE.Group;
  /** Ölçek, eksen eğikliği ve dönüş */
  mesh: THREE.Mesh;
  /** sahne birimi */
  radius: number;
  radiusKm: number;
  /** yörünge süresi (gün); Güneş için null */
  periodDays: number | null;
  /** güncel Güneş uzaklığı (AU) */
  distanceAU: number;
  /** uydular için ana gezegene uzaklık (km) */
  parentDistanceKm: number | null;
  rotationDays: number;
  /** Kutup ekseni çizgisi (seçilince görünür) */
  axis: THREE.Object3D;
}

const TAU = Math.PI * 2;
const D2R = Math.PI / 180;

export function createSolarSystem(scene: THREE.Scene, loadTexture: LoadTexture, onPick: (v: BodyView) => void) {
  const views: BodyView[] = [];
  const unitSphere = new THREE.SphereGeometry(1, 64, 48);

  function makeBody(
    id: BodyId, kind: BodyKind, phys: { radiusKm: number; tiltDeg: number; rotationDays: number; texture: string; color: number },
    extra: Pick<BodyView, 'periodDays' | 'parentDistanceKm'>,
  ): BodyView {
    const mat = kind === 'star'
      ? new THREE.MeshBasicMaterial({ color: phys.color })
      : new THREE.MeshStandardMaterial({ color: phys.color, roughness: 1, metalness: 0 });
    loadTexture(phys.texture, applyMap(mat));

    const mesh = new THREE.Mesh(unitSphere, mat);
    const radius = scale.radius(phys.radiusKm);
    mesh.scale.setScalar(radius);
    mesh.rotation.order = 'ZYX'; // önce dönüş (Y), sonra eğiklik (Z)
    mesh.rotation.z = phys.tiltDeg * D2R;

    const object = new THREE.Group();
    object.add(mesh);
    scene.add(object);

    const axis = createAxis(2.6); // halkaların dışına taşsın
    mesh.add(axis);

    const view: BodyView = {
      id, kind, object, mesh, radius, radiusKm: phys.radiusKm, distanceAU: 0,
      rotationDays: phys.rotationDays, axis, ...extra,
    };

    const div = document.createElement('div');
    div.className = 'label';
    div.textContent = bodyName(id);
    div.addEventListener('click', () => onPick(view));
    const label = new CSS2DObject(div);
    label.position.set(0, radius * 1.15, 0);
    label.center.set(0.5, 1);
    object.add(label);

    views.push(view);
    return view;
  }

  // --- Güneş + parlama ---
  const sun = makeBody('sun', 'star', SUN, { periodDays: null, parentDistanceKm: null });
  sun.object.add(createGlow(sun.radius * 7));

  // --- Gezegenler ---
  const nowDays = (Date.now() - J2000_MS) / DAY_MS;
  const orbitMat = new THREE.LineBasicMaterial({ color: 0x4466aa, transparent: true, opacity: 0.4 });
  const planetViews = PLANETS.map((p) => {
    const v = makeBody(p.id, 'planet', p, { periodDays: p.periodDays, parentDistanceKm: null });
    const pts = orbitPoints(elementsAt(p, nowDays / 36525), 512).map((q) => eclipticToScene(q, new THREE.Vector3()));
    scene.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), orbitMat));
    return { data: p, view: v };
  });
  const earth = views.find((v) => v.id === 'earth')!;
  const saturn = views.find((v) => v.id === 'saturn')!;

  // --- Satürn halkası (gezegen yarıçapı biriminde, mesh'in çocuğu → eğiklikle birlikte döner) ---
  saturn.mesh.add(createRing(SATURN_RINGS.innerKm / saturn.radiusKm, SATURN_RINGS.outerKm / saturn.radiusKm, loadTexture));

  // --- Uranüs halkaları (gezegenle birlikte ~98° yatık) ---
  const uranus = views.find((v) => v.id === 'uranus')!;
  uranus.mesh.add(createUranusRings(uranus.radiusKm));

  // --- Dünya bulutları ---
  const cloudMat = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.9, depthWrite: false, visible: false });
  loadTexture('earth_clouds', (t) => {
    cloudMat.alphaMap = t;
    cloudMat.visible = true;
    cloudMat.needsUpdate = true;
  }, false);
  const clouds = new THREE.Mesh(unitSphere, cloudMat);
  clouds.scale.setScalar(1.012);
  earth.mesh.add(clouds);

  // --- Ay ---
  const moon = makeBody('moon', 'moon', MOON, { periodDays: MOON.periodDays, parentDistanceKm: MOON.distanceKm });
  const moonDist = scale.satelliteDistance(MOON.distanceKm, earth.radiusKm);
  const moonOrbit = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(
      satelliteOrbitPoints(MOON, nowDays, 128).map((q) => eclipticAxes(q, new THREE.Vector3()).multiplyScalar(moonDist)),
    ),
    new THREE.LineBasicMaterial({ color: 0x8899bb, transparent: true, opacity: 0.35 }),
  );
  earth.object.add(moonOrbit);

  const spin = (v: BodyView, days: number) => {
    v.mesh.rotation.y = ((days / v.rotationDays) % 1) * TAU;
  };
  const tmp = new THREE.Vector3();

  return {
    views,
    /** Yalnızca verilen gövdenin kutup eksenini göster (null: hiçbiri). */
    showAxis(target: BodyView | null) {
      for (const v of views) v.axis.visible = v === target;
    },
    update(ms: number) {
      const days = (ms - J2000_MS) / DAY_MS;
      const T = days / 36525;
      spin(sun, days);
      for (const { data, view } of planetViews) {
        const p = positionAt(elementsAt(data, T));
        view.distanceAU = Math.hypot(p.x, p.y, p.z);
        eclipticToScene(p, view.object.position);
        spin(view, days);
      }
      clouds.rotation.y = ((days / 3) % 1) * TAU * 0.1; // bulutlar yavaşça kayar
      eclipticAxes(satelliteDirection(MOON, days), tmp).multiplyScalar(moonDist);
      moon.object.position.copy(earth.object.position).add(tmp);
      moon.distanceAU = earth.distanceAU;
      // Ay kilitli dönüş: hep aynı yüzü Dünya'ya döner
      // (dokunun merkezi = yakın yüz = yerel +x; onu Dünya yönüne, yani -tmp'ye çevir)
      moon.mesh.rotation.y = Math.atan2(tmp.z, -tmp.x);
    },
  };
}

function createGlow(size: number) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,240,200,1)');
  grad.addColorStop(0.15, 'rgba(255,210,120,0.8)');
  grad.addColorStop(0.35, 'rgba(255,160,60,0.25)');
  grad.addColorStop(1, 'rgba(255,120,30,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }),
  );
  sprite.scale.setScalar(size);
  return sprite;
}

/** Halka diski; doku yatay bir şerittir (u = iç kenardan dış kenara). Yarıçaplar gezegen yarıçapı biriminde. */
function createRingMesh(inner: number, outer: number, mat: THREE.MeshBasicMaterial) {
  const geo = new THREE.RingGeometry(inner, outer, 256, 1);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const r = Math.hypot(pos.getX(i), pos.getY(i));
    uv.setXY(i, (r - inner) / (outer - inner), 0.5);
  }
  const ring = new THREE.Mesh(geo, mat);
  ring.rotation.x = -Math.PI / 2; // ekvator düzlemine yatır
  return ring;
}

function createRing(inner: number, outer: number, loadTexture: LoadTexture) {
  const mat = new THREE.MeshBasicMaterial({
    color: 0xcfc6b0, side: THREE.DoubleSide, transparent: true, opacity: 0.9, depthWrite: false,
  });
  loadTexture('saturn_ring_alpha', applyMap(mat));
  return createRingMesh(inner, outer, mat);
}

/** Uranüs halkaları: veriden çizilen şerit dokusu (harici dosya yok). */
function createUranusRings(planetRadiusKm: number) {
  const innerKm = URANUS_RINGS[0].radiusKm - 400;
  const outerKm = URANUS_RINGS[URANUS_RINGS.length - 1].radiusKm + 400;
  const W = 1024;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = 4;
  const g = c.getContext('2d')!;
  const px = (km: number) => ((km - innerKm) / (outerKm - innerKm)) * W;
  for (const r of URANUS_RINGS) {
    // Gerçek genişlikler (1–100 km) ekranda pikselin altında kalır; görünürlük için büyütüldü.
    const w = r.name === 'ε' ? 22 : 9;
    g.fillStyle = r.name === 'ε' ? 'rgba(205,220,230,0.95)' : 'rgba(175,190,205,0.8)';
    g.fillRect(px(r.radiusKm) - w / 2, 0, w, 4);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, transparent: true, depthWrite: false });
  return createRingMesh(innerKm / planetRadiusKm, outerKm / planetRadiusKm, mat);
}

/** Kutup ekseni: kuzey yarısı turuncu, güney yarısı mavi. Mesh'in çocuğu (eğiklikle yatar, dönüşten etkilenmez). */
function createAxis(length: number) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, length, 0, 0, 0, 0, 0, -length, 0], 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute([1, 0.6, 0.2, 1, 0.6, 0.2, 0.3, 0.6, 1, 0.3, 0.6, 1], 3));
  const axis = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true }));
  axis.visible = false;
  return axis;
}
