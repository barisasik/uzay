import type * as THREE from 'three';
import type { Vec3 } from './astro/orbit';

// Gerçek değer → sahne birimi dönüşümünün TEK yeri.
// 'schematic': uzaklıklar sıkıştırılmış, gezegenler büyütülmüş.
// Faz 5'te 'real' modu buraya eklenecek.
export type ScaleMode = 'schematic';
let mode: ScaleMode = 'schematic';

export const scale = {
  get mode() { return mode; },
  set mode(m: ScaleMode) { mode = m; },
  distance(au: number): number {
    switch (mode) {
      case 'schematic': return 6 + 14 * Math.sqrt(au);
    }
  },
  radius(km: number): number {
    switch (mode) {
      case 'schematic': return 0.4 * Math.pow(km / 1000, 0.45);
    }
  },
  /** Uydunun ana gezegen merkezine uzaklığı (sahne birimi). */
  satelliteDistance(km: number, parentRadiusKm: number): number {
    switch (mode) {
      case 'schematic':
        return this.radius(parentRadiusKm) * (1.5 + 0.18 * Math.sqrt(km / parentRadiusKm));
    }
  },
};

/** Ekliptik eksenleri → sahne eksenleri (ölçeksiz; yönler ve göreli konumlar için). */
export function eclipticAxes(p: Vec3, out: THREE.Vector3): THREE.Vector3 {
  return out.set(p.x, p.z, -p.y);
}

/** Ekliptik koordinat (AU, z kuzey) → sahne (y yukarı). Uzaklık radyal olarak ölçeklenir. */
export function eclipticToScene(p: Vec3, out: THREE.Vector3): THREE.Vector3 {
  const r = Math.hypot(p.x, p.y, p.z);
  const s = r > 0 ? scale.distance(r) / r : 0;
  return out.set(p.x * s, p.z * s, -p.y * s);
}
