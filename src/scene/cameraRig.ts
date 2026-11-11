import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const FLY_SECONDS = 1.6;
const ease = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

/** Bir nesneye yumuşak uçuş ve ardından onu takip etme. */
export class CameraRig {
  private focus: THREE.Object3D | null = null;
  private last = new THREE.Vector3();
  private fly: { t: number; cam: THREE.Vector3; tgt: THREE.Vector3; dir: THREE.Vector3; dist: number } | null = null;
  private goal = new THREE.Vector3();

  constructor(private camera: THREE.PerspectiveCamera, private controls: OrbitControls) {}

  flyTo(obj: THREE.Object3D, radius: number, minElev = 0.25) {
    const dir = this.camera.position.clone().sub(obj.position).normalize();
    dir.y = Math.max(dir.y, minElev); // biraz yukarıdan bak
    dir.normalize();
    this.focus = obj;
    this.fly = {
      t: 0,
      cam: this.camera.position.clone(),
      tgt: this.controls.target.clone(),
      dir,
      dist: radius * 6,
    };
    this.controls.enabled = false;
    this.controls.minDistance = radius * 1.5;
    this.last.copy(obj.position);
  }

  release() {
    this.focus = null;
    this.fly = null;
    this.controls.enabled = true;
  }

  update(dt: number) {
    if (!this.focus) return;
    const p = this.focus.position;
    if (this.fly) {
      const f = this.fly;
      f.t = Math.min(1, f.t + dt / FLY_SECONDS);
      const k = ease(f.t);
      this.goal.copy(f.dir).multiplyScalar(f.dist).add(p);
      this.camera.position.lerpVectors(f.cam, this.goal, k);
      this.controls.target.lerpVectors(f.tgt, p, k);
      if (f.t >= 1) {
        this.fly = null;
        this.controls.enabled = true;
      }
    } else {
      const delta = this.goal.subVectors(p, this.last);
      this.camera.position.add(delta);
      this.controls.target.add(delta);
    }
    this.last.copy(p);
  }
}
