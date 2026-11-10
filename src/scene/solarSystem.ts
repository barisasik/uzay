import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { PLANETS, SUN, type BodyId, type PlanetData } from '../data/bodies';
import { elementsAt, julianCenturies, orbitPoints, positionAt } from '../astro/orbit';
import { eclipticToScene, scale } from '../scale';
import { bodyName } from '../i18n';

export interface BodyView {
  id: BodyId;
  mesh: THREE.Mesh;
  /** sahne birimi */
  radius: number;
  radiusKm: number;
  planet: PlanetData | null;
  /** güncel Güneş uzaklığı (AU) */
  distanceAU: number;
}

export function createSolarSystem(scene: THREE.Scene, onPick: (v: BodyView) => void) {
  const views: BodyView[] = [];
  const unitSphere = new THREE.SphereGeometry(1, 48, 32);

  const sunMesh = new THREE.Mesh(unitSphere, new THREE.MeshBasicMaterial({ color: SUN.color }));
  const sunR = scale.radius(SUN.radiusKm);
  sunMesh.scale.setScalar(sunR);
  scene.add(sunMesh);
  views.push({ id: 'sun', mesh: sunMesh, radius: sunR, radiusKm: SUN.radiusKm, planet: null, distanceAU: 0 });

  const T0 = julianCenturies(Date.now());
  const orbitMat = new THREE.LineBasicMaterial({ color: 0x4466aa, transparent: true, opacity: 0.4 });

  for (const p of PLANETS) {
    const mesh = new THREE.Mesh(unitSphere, new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.9 }));
    const r = scale.radius(p.radiusKm);
    mesh.scale.setScalar(r);
    scene.add(mesh);
    views.push({ id: p.id, mesh, radius: r, radiusKm: p.radiusKm, planet: p, distanceAU: 0 });

    const pts = orbitPoints(elementsAt(p, T0), 512).map((q) => eclipticToScene(q, new THREE.Vector3()));
    scene.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), orbitMat));
  }

  for (const v of views) {
    const div = document.createElement('div');
    div.className = 'label';
    div.textContent = bodyName(v.id);
    div.addEventListener('click', () => onPick(v));
    const label = new CSS2DObject(div);
    label.position.set(0, 1.15, 0); // birim küre üstü (mesh ölçeğiyle büyür)
    label.center.set(0.5, 1);
    v.mesh.add(label);
  }

  return {
    views,
    update(ms: number) {
      const T = julianCenturies(ms);
      for (const v of views) {
        if (!v.planet) continue;
        const p = positionAt(elementsAt(v.planet, T));
        v.distanceAU = Math.hypot(p.x, p.y, p.z);
        eclipticToScene(p, v.mesh.position);
      }
    },
  };
}
