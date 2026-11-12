import * as THREE from 'three';
import { KLY } from '../scale';

/**
 * Geçici rastgele yıldızlar (Faz 4a'da gerçek yıldız kataloğuyla değişecek).
 * Yakın yıldızları temsil eder: kamerayla birlikte taşınır, sonsuz uzaklıkta gibi davranır.
 * Güneş'ten binlerce ışık yılı uzaklaşınca söner; oradan bakınca Samanyolu'nun kendisi görünür.
 */
export function createStarfield(scene: THREE.Scene, count = 6000) {
  const pos = new Float32Array(count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    v.randomDirection();
    pos.set([v.x, v.y, v.z], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xffffff, size: 1.5, sizeAttenuation: false, transparent: true, depthTest: false, depthWrite: false,
  });
  const points = new THREE.Points(g, mat);
  points.renderOrder = -10; // her şeyden önce, arka plan olarak
  points.frustumCulled = false;
  scene.add(points);

  return {
    update(camera: THREE.Camera, sunDist: number) {
      points.position.copy(camera.position);
      // Birim küre, kameranın yakın düzleminden büyük olmalı.
      points.scale.setScalar(Math.max(1, (camera as THREE.PerspectiveCamera).near * 10));
      mat.opacity = 1 - THREE.MathUtils.smoothstep(sunDist, 0.3 * KLY, 3 * KLY);
      points.visible = mat.opacity > 0.01;
    },
  };
}
