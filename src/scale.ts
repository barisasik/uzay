import type * as THREE from 'three';
import type { Vec3 } from './astro/orbit';

// Gerçek ölçek: 1 sahne birimi = 1000 km.
// Güneş Sistemi'nden Andromeda'ya ~20 büyüklük mertebesi; konumlar CPU'da 64 bitle tutulur,
// three.js her nesnenin kameraya göre konumunu (modelView) yine 64 bitle hesaplar, GPU'ya
// yalnızca bu göreli değer gider. Derinlik için logaritmik derinlik tamponu kullanılır.
export const UNIT_KM = 1000;
export const AU_KM = 149_597_870.7;
export const LY_KM = 9_460_730_472_580.8;

/** Sahne birimi cinsinden sabitler. */
export const AU = AU_KM / UNIT_KM;
export const LY = LY_KM / UNIT_KM;
export const KLY = LY * 1000;

export const scale = {
  distance(au: number): number {
    return au * AU;
  },
  radius(km: number): number {
    return km / UNIT_KM;
  },
  satelliteRadius(km: number): number {
    return km / UNIT_KM;
  },
  /** Uydunun ana gezegen merkezine uzaklığı (sahne birimi). */
  satelliteDistance(km: number): number {
    return km / UNIT_KM;
  },
};

/** Ekliptik eksenleri → sahne eksenleri (ölçeksiz; yönler ve göreli konumlar için). */
export function eclipticAxes(p: Vec3, out: THREE.Vector3): THREE.Vector3 {
  return out.set(p.x, p.z, -p.y);
}

/** Ekliptik koordinat (AU, z kuzey) → sahne (y yukarı). */
export function eclipticToScene(p: Vec3, out: THREE.Vector3): THREE.Vector3 {
  return out.set(p.x * AU, p.z * AU, -p.y * AU);
}
