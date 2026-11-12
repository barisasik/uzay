import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const ease = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

/**
 * "Uzaklaş – kay – yaklaş" uçuş yolu (van Wijk & Nuij 2003, optimal yakınlaştırma/kaydırma).
 * u: hedefin yol boyunca aldığı mesafe, w: kamera uzaklığı (görüş genişliği).
 * Ay'dan Andromeda'ya ~15 mertebelik farkı birkaç saniyede, gözü yormadan geçer.
 */
const RHO = 1.4;
function zoomPath(w0: number, w1: number, u1: number) {
  if (u1 < 1e-9 * Math.max(w0, w1)) {
    const S = Math.abs(Math.log(w1 / w0)) / RHO;
    const k = Math.sign(w1 - w0);
    return { S, u: () => 0, w: (s: number) => w0 * Math.exp(k * RHO * s) };
  }
  const r2 = RHO * RHO;
  const b0 = (w1 * w1 - w0 * w0 + r2 * r2 * u1 * u1) / (2 * w0 * r2 * u1);
  const b1 = (w1 * w1 - w0 * w0 - r2 * r2 * u1 * u1) / (2 * w1 * r2 * u1);
  // ln(−b + √(b²+1)) = −asinh(b): büyük b'de sayısal olarak kararlı
  const r0 = -Math.asinh(b0);
  const r1 = -Math.asinh(b1);
  return {
    S: (r1 - r0) / RHO,
    // w0/ρ²·(cosh r0·tanh(ρs+r0) − sinh r0) ifadesinin kararlı biçimi
    u: (s: number) => ((w0 / r2) * Math.sinh(RHO * s)) / Math.cosh(RHO * s + r0),
    w: (s: number) => (w0 * Math.cosh(r0)) / Math.cosh(RHO * s + r0),
  };
}

interface Flight {
  t: number;
  dur: number;
  path: ReturnType<typeof zoomPath>;
  u1: number;
  tgt0: THREE.Vector3;
  dir0: THREE.Vector3;
  turn: THREE.Quaternion;
  minDistance: number;
}

/** Bir nesneye yumuşak uçuş ve ardından onu takip etme. Konumlar dünya koordinatında. */
export class CameraRig {
  private focus: THREE.Object3D | null = null;
  private last = new THREE.Vector3();
  private fly: Flight | null = null;
  private p = new THREE.Vector3();
  private dir = new THREE.Vector3();
  private q = new THREE.Quaternion();
  private readonly identity = new THREE.Quaternion();

  constructor(private camera: THREE.PerspectiveCamera, private controls: OrbitControls) {}

  get flying() {
    return this.fly !== null;
  }

  flyTo(obj: THREE.Object3D, radius: number, minElev = 0.25) {
    obj.getWorldPosition(this.p);
    const cam = this.camera.position;
    const tgt0 = this.controls.target.clone();
    const dir1 = cam.clone().sub(this.p).normalize();
    dir1.y = Math.max(dir1.y, minElev); // biraz yukarıdan bak
    dir1.normalize();
    const dir0 = cam.clone().sub(tgt0);
    const w0 = Math.max(dir0.length(), 1e-6);
    dir0.normalize();
    const w1 = radius * 6;
    const u1 = tgt0.distanceTo(this.p);
    const path = zoomPath(w0, w1, u1);

    this.focus = obj;
    this.fly = {
      t: 0,
      dur: THREE.MathUtils.clamp(0.8 + path.S * 0.12, 1.4, 4.5),
      path,
      u1,
      tgt0,
      dir0,
      turn: new THREE.Quaternion().setFromUnitVectors(dir0, dir1),
      minDistance: radius * 1.5,
    };
    this.controls.enabled = false;
    this.controls.minDistance = 0; // yol boyunca kamera hedefe istediği kadar yaklaşabilsin
    this.last.copy(this.p);
  }

  release() {
    if (this.fly) this.controls.minDistance = this.fly.minDistance;
    this.focus = null;
    this.fly = null;
    this.controls.enabled = true;
  }

  update(dt: number) {
    if (!this.focus) return;
    const p = this.focus.getWorldPosition(this.p);
    if (this.fly) {
      const f = this.fly;
      f.t = Math.min(1, f.t + dt / f.dur);
      const k = ease(f.t);
      const s = f.path.S * k;
      // Hedef, yol boyunca hareketli nesnenin şimdiki konumuna doğru kayar.
      const frac = f.u1 > 0 ? Math.min(1, f.path.u(s) / f.u1) : k;
      this.controls.target.copy(f.tgt0).lerp(p, f.t >= 1 ? 1 : frac);
      this.q.copy(this.identity).slerp(f.turn, k);
      this.dir.copy(f.dir0).applyQuaternion(this.q);
      const w = f.t >= 1 ? f.path.w(f.path.S) : f.path.w(s);
      this.camera.position.copy(this.controls.target).addScaledVector(this.dir, w);
      if (f.t >= 1) {
        this.controls.minDistance = f.minDistance;
        this.fly = null;
        this.controls.enabled = true;
      }
    } else {
      const delta = this.dir.subVectors(p, this.last);
      this.camera.position.add(delta);
      this.controls.target.add(delta);
    }
    this.last.copy(p);
  }
}
