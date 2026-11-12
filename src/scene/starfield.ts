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
  // Opak geçişte, her şeyden önce çizilir; derinlik yazmaz, böylece Güneş ve gezegenler
  // (opak) ile parlamalar ve galaksiler (saydam, sonra çizilir) üstünü örter.
  // Saydam olsaydı opak cisimlerden sonra çizilip onların üstünde görünürdü.
  const mat = new THREE.PointsMaterial({
    color: 0xffffff, size: 1.5, sizeAttenuation: false, depthTest: false, depthWrite: false,
  });
  const points = new THREE.Points(g, mat);
  points.renderOrder = -10;
  points.frustumCulled = false;
  scene.add(points);

  return {
    update(camera: THREE.Camera, sunDist: number) {
      points.position.copy(camera.position);
      // Birim küre, kameranın yakın düzleminden büyük olmalı.
      points.scale.setScalar(Math.max(1, (camera as THREE.PerspectiveCamera).near * 10));
      // Opak olduğu için solma, rengi siyaha doğru karartarak yapılır.
      const k = 1 - THREE.MathUtils.smoothstep(sunDist, 0.3 * KLY, 3 * KLY);
      mat.color.setScalar(k);
      points.visible = k > 0.01;
    },
  };
}
