import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { CameraRig } from '../scene/cameraRig';
import type { BodyView } from '../scene/solarSystem';
import type { GalaxyView } from '../scene/galaxies';
import type { BeltView } from '../scene/belts';
import { SHIP_LENGTH, type createShip } from '../scene/spacecraft';

export type Stop = (
  | { kind: 'body'; view: BodyView }
  | { kind: 'galaxy'; view: GalaxyView }
  | { kind: 'belt'; view: BeltView }
) & { name: string };

export type ShipView = 'chase' | 'cockpit' | 'free';
export type Phase = 'docked' | 'leg' | 'dwell' | 'done';

export interface TourStatus {
  phase: Phase;
  paused: boolean;
  returning: boolean;
  target: string | null;
  /** kalan uzaklık (sahne birimi) */
  distance: number;
  /** km/sn */
  speedKms: number;
  /** varışa kalan gerçek saniye */
  eta: number;
  stop: number;
  stops: number;
}

/**
 * Hız katsayısı. Bir ayakta araç kalkış noktasına uzaklığıyla orantılı hızlanır, hedefe
 * uzaklığıyla orantılı yavaşlar: v = K·(x + rA) / v = K·(kalan + rB). Böylece istasyondan
 * kalkıştan galaksiler arası yola kadar her ayak 10–25 saniye sürer (logaritmik yolculuk).
 */
const K = 1.3;
/** Durakta cismin etrafında salınım açısı (yarısı) */
const SWING = 28 * (Math.PI / 180);
const DWELL = 9;
const UP = new THREE.Vector3(0, 1, 0);
/** Kamera aracın arkasında ve biraz yukarıda; bakış noktası aracın üstünde: hedef, aracın üstünde görünür. */
const CHASE_OFF = new THREE.Vector3(0, 0.35, -2.7);
const CHASE_LOOK = new THREE.Vector3(0, 0.45, 0);
/** İstasyondayken: önden ve yukarıdan, araç ile arkasındaki istasyon birlikte görünür. */
const DOCK_OFF = new THREE.Vector3(3.2, 2.6, 5.5);

interface Leg {
  from: THREE.Object3D;
  fromOff: THREE.Vector3;
  to: THREE.Object3D;
  toOff: THREE.Vector3;
  rA: number;
  rB: number;
  D: number;
  xs: number;
  tA: number;
  T: number;
  s: number;
  stop: Stop | null; // null: istasyon
}

type Ship = ReturnType<typeof createShip>;

export interface TourHooks {
  /** Durağa varınca (bilgi paneli); null: ayrılırken */
  onStop(stop: Stop | null): void;
  onChange(): void;
}

/**
 * Uzay aracı yolculuğu: rotadaki duraklar arasında araç hareketi, durakta salınım,
 * istasyona dönüş ve iki kamera (dış görünüm, kokpit). "free": kamera uygulamanın normal kamerası.
 */
export class Tour {
  phase: Phase = 'docked';
  paused = false;
  view: ShipView = 'free';
  speed = 1;
  routeId: string | null = null;

  private stops: Stop[] = [];
  private idx = 0;
  private leg: Leg | null = null;
  private dwellT = 0;
  private stopObj: THREE.Object3D | null = null;
  private baseOff = new THREE.Vector3();
  private holdOff = new THREE.Vector3();
  private pending: ShipView | null = null;
  /** Dış görünümde kameranın, bakış noktasına göre aracın yerel uzayındaki konumu (araç boyu biriminde). */
  private chaseOff = new THREE.Vector3().copy(CHASE_OFF);
  /** Dış görünüme geçince kamera bu süre boyunca varsayılan konuma yerleşir (kullanıcı döndürürse durur). */
  private settle = 0;
  private returning = false;
  private vel = 0; // birim / ayak-saniyesi

  private readonly q = new THREE.Quaternion();
  private readonly qd = new THREE.Quaternion();
  private readonly m = new THREE.Matrix4();
  private readonly a = new THREE.Vector3();
  private readonly b = new THREE.Vector3();
  private readonly c = new THREE.Vector3();
  private readonly flip = new THREE.Quaternion().setFromAxisAngle(UP, Math.PI);

  constructor(
    private ship: Ship,
    private dock: THREE.Object3D,
    private camera: THREE.PerspectiveCamera,
    private controls: OrbitControls,
    private rig: CameraRig,
    private hooks: TourHooks,
  ) {
    controls.addEventListener('start', () => (this.settle = 0));
  }

  get pos() {
    return this.ship.object.position;
  }

  /** Aracın ekrandaki boyu: Güneş'ten çok uzakta (galaksiler arası) sayısal hassasiyet için büyütülür. */
  get size() {
    return Math.max(SHIP_LENGTH, this.pos.length() * 1e-13);
  }

  /** Kamera araç tarafından sürülüyor mu (dış görünüm / kokpit) */
  get drivesCamera() {
    return this.view !== 'free';
  }

  // ---------- Komutlar ----------

  start(routeId: string, stops: Stop[]) {
    if (!stops.length) return;
    this.routeId = routeId;
    this.stops = stops;
    this.idx = 0;
    this.paused = false;
    this.returning = false;
    this.beginLeg(stops[0]);
    this.settle = 3; // istasyon görünümünden aracın arkasına
    if (this.view === 'free') this.setView('chase');
    this.hooks.onChange();
  }

  togglePause() {
    if (this.phase === 'docked' || this.phase === 'done') return;
    this.paused = !this.paused;
    this.hooks.onChange();
  }

  setSpeed(m: number) {
    this.speed = m;
    this.hooks.onChange();
  }

  returnHome() {
    if (this.phase === 'docked' && !this.leg) return;
    this.paused = false;
    this.returning = true;
    this.routeId = null;
    this.stops = [];
    this.beginLeg(null);
    if (this.view === 'free') this.setView('chase');
    this.hooks.onChange();
  }

  /** Kamera görünümü. Kamera araçtan uzaktaysa önce yumuşak bir uçuşla araca gelinir. */
  setView(v: ShipView) {
    this.pending = null;
    if (v === 'free') {
      this.leaveShipView();
      this.rig.flyTo(this.ship.object, this.size * 0.5, 0.15);
    } else if (this.view === 'free' && this.camera.position.distanceTo(this.pos) > this.size * 40) {
      this.rig.flyTo(this.ship.object, this.size * 0.5, 0.15);
      this.pending = v;
    } else {
      this.enterShipView(v);
    }
    this.hooks.onChange();
  }

  /** Kullanıcı başka bir cisim seçince: kamera serbest kalır, araç yoluna devam eder. */
  detach() {
    this.pending = null;
    if (this.view !== 'free') {
      this.leaveShipView();
      this.hooks.onChange();
    }
  }

  get displayView(): ShipView {
    return this.pending ?? this.view;
  }

  status(): TourStatus {
    const L = this.leg;
    let target: string | null = null;
    let distance = 0;
    let eta = 0;
    if (L) {
      target = L.stop ? L.stop.name : null;
      this.targetPoint(L, this.a);
      distance = this.a.distanceTo(this.pos);
      eta = (L.T - L.s) / (K * this.speed);
    } else if (this.phase !== 'docked') {
      target = this.stops[this.idx]?.name ?? null;
    }
    return {
      phase: this.phase,
      paused: this.paused,
      returning: this.returning,
      target,
      distance,
      speedKms: this.phase === 'leg' && !this.paused ? this.vel * K * this.speed * 1000 : 0,
      eta,
      stop: this.idx + 1,
      stops: this.stops.length,
    };
  }

  // ---------- Kare güncellemesi ----------

  update(dt: number) {
    const ship = this.ship.object;
    const step = this.paused ? 0 : dt * this.speed;
    let look: THREE.Vector3 | null = null; // bakılacak nokta
    let align: THREE.Quaternion | null = null; // ya da doğrudan yönelim

    if (this.phase === 'docked') {
      this.dock.getWorldPosition(ship.position);
      this.dock.getWorldQuaternion(this.qd);
      align = this.qd;
    } else if (this.phase === 'leg' && this.leg) {
      const L = this.leg;
      L.s = Math.min(L.T, L.s + step * K);
      let x: number;
      if (L.s < L.tA) {
        x = L.rA * (Math.exp(L.s) - 1);
        this.vel = x + L.rA;
      } else {
        const y = (L.D - L.xs + L.rB) * Math.exp(-(L.s - L.tA)) - L.rB;
        x = L.D - Math.max(0, y);
        this.vel = Math.max(0, y) + L.rB;
      }
      const f = L.D > 0 ? Math.min(1, x / L.D) : 1;
      L.from.getWorldPosition(this.a).add(L.fromOff);
      this.targetPoint(L, this.b);
      ship.position.copy(this.a).lerp(this.b, f);
      if (L.stop) {
        // Son kısımda burun hedef cisme döner.
        L.to.getWorldPosition(this.c);
        look = f > 0.97 ? this.c : this.b.distanceTo(ship.position) > 1e-9 ? this.b : this.c;
      } else if (f > 0.9) {
        this.dock.getWorldQuaternion(this.qd);
        align = this.qd;
      } else {
        look = this.b;
      }
      if (L.s >= L.T) this.arrive();
    } else if ((this.phase === 'dwell' || this.phase === 'done') && this.stopObj) {
      if (this.phase === 'dwell') {
        // Durak süresi hızla birlikte kısalır ama yolculuk kadar değil.
        if (!this.paused) this.dwellT += dt;
        const dur = DWELL / Math.sqrt(this.speed);
        const ang = -SWING + 2 * SWING * smooth(Math.min(1, this.dwellT / dur));
        this.holdOff.copy(this.baseOff).applyAxisAngle(UP, ang);
        if (this.dwellT >= dur) this.depart();
      }
      if (this.stopObj) {
        // (depart() yeni ayağı başlattıysa stopObj boşalır; bu karede yerinde kal)
        this.stopObj.getWorldPosition(this.c);
        ship.position.copy(this.c).add(this.holdOff);
        look = this.c;
      }
    }

    // Yönelim (yumuşak)
    if (align) this.q.copy(align);
    else if (look) {
      this.m.lookAt(look, ship.position, UP);
      this.q.setFromRotationMatrix(this.m);
    }
    if (align || look) ship.quaternion.slerp(this.q, this.phase === 'docked' ? 1 : 1 - Math.exp(-2.5 * dt));
    ship.scale.setScalar(this.size);
    ship.updateMatrixWorld(true);

    const thr = this.paused ? 0 : this.phase === 'leg' ? Math.min(1, 0.25 + Math.log10(1 + this.vel * K * this.speed * 1000) / 7) : 0.08;
    this.ship.setThrottle(thr);

    // Bekleyen görünüm: uçuş bitince araca geç
    if (this.pending && !this.rig.flying) {
      const v = this.pending;
      this.pending = null;
      this.enterShipView(v);
      this.hooks.onChange();
    }
  }

  /** Dış görünüm / kokpit kamerası (controls.update yerine çağrılır). */
  updateCamera(dt: number) {
    const ship = this.ship.object;
    const L = this.size;
    if (this.view === 'chase') {
      if (this.settle > 0) {
        this.settle -= dt;
        this.chaseOff.lerp(this.phase === 'docked' ? DOCK_OFF : CHASE_OFF, 1 - Math.exp(-2.5 * dt));
      }
      const look = this.c.copy(CHASE_LOOK).multiplyScalar(L).applyQuaternion(ship.quaternion).add(ship.position);
      this.camera.position.copy(look).add(this.a.copy(this.chaseOff).multiplyScalar(L).applyQuaternion(ship.quaternion));
      this.controls.target.copy(look);
      this.controls.minDistance = L * 1.2;
      this.controls.maxDistance = L * 400;
      this.controls.update();
      // Kullanıcının döndürmesini aracın yerel uzayında sakla: araç dönünce kamera da döner.
      this.chaseOff.copy(this.camera.position).sub(look).divideScalar(L)
        .applyQuaternion(this.q.copy(ship.quaternion).invert());
    } else if (this.view === 'cockpit') {
      this.camera.position.copy(ship.position).add(this.a.set(0, 0.11, 0.3).multiplyScalar(L).applyQuaternion(ship.quaternion));
      this.camera.quaternion.copy(ship.quaternion).multiply(this.flip);
      this.controls.target.copy(this.camera.position).add(this.a.set(0, 0, -1).applyQuaternion(this.camera.quaternion));
    }
  }

  // ---------- İç işler ----------

  private enterShipView(v: ShipView) {
    this.rig.release();
    const ship = this.ship.object;
    if (v === 'chase' && this.view !== 'chase') {
      // Kamera zaten yakındaysa bulunduğu yerden başlayıp aracın arkasına yerleşir (sıçrama olmasın).
      const d = this.camera.position.distanceTo(ship.position);
      if (this.view === 'free' && d < this.size * 30 && d > this.size * 1.2) {
        const look = this.c.copy(CHASE_LOOK).multiplyScalar(this.size).applyQuaternion(ship.quaternion).add(ship.position);
        this.chaseOff.copy(this.camera.position).sub(look).divideScalar(this.size)
          .applyQuaternion(this.q.copy(ship.quaternion).invert());
      } else {
        this.chaseOff.copy(this.phase === 'docked' ? DOCK_OFF : CHASE_OFF);
      }
      this.settle = 3;
    }
    this.view = v;
    this.controls.enablePan = v === 'free';
    this.controls.enabled = v === 'chase';
    this.ship.model.visible = v !== 'cockpit';
  }

  private leaveShipView() {
    this.view = 'free';
    this.controls.enabled = true;
    this.controls.enablePan = true;
    this.controls.maxDistance = 1e17;
    this.ship.model.visible = true;
    // Kokpitten çıkınca kamera bakış yönü, hedefin önünde kalsın.
    this.controls.target.copy(this.pos);
  }

  /** Bir sonraki ayağı mevcut konumdan başlatır. stop null: istasyona dönüş. */
  private beginLeg(stop: Stop | null) {
    // Kalkış noktası: şu an bağlı olunan nesne (istasyon, durak ya da yarım kalan ayağın hedefi)
    const from = this.phase === 'docked' ? this.dock : this.stopObj ?? this.leg?.to ?? this.dock;
    const fromOff = this.pos.clone().sub(from.getWorldPosition(this.a));
    const startR = this.phase === 'docked' ? SHIP_LENGTH : Math.max(SHIP_LENGTH, fromOff.length() * 0.1);

    if (this.phase === 'dwell' || this.phase === 'done') this.hooks.onStop(null);

    let to: THREE.Object3D;
    let toOff: THREE.Vector3;
    let rB: number;
    if (stop) {
      to = this.stopObject(stop);
      const standoff = this.standoff(stop);
      this.baseOff.copy(this.offsetDir(stop, to)).multiplyScalar(standoff);
      toOff = this.baseOff.clone().applyAxisAngle(UP, -SWING);
      rB = Math.max(SHIP_LENGTH, standoff * 0.12);
    } else {
      to = this.dock;
      toOff = new THREE.Vector3();
      rB = SHIP_LENGTH * 0.5;
    }
    const target = to.getWorldPosition(this.b).add(toOff);
    const D = Math.max(1e-9, target.distanceTo(this.pos));
    const rA = Math.min(startR, D * 0.25);
    const xs = THREE.MathUtils.clamp((D + rB - rA) / 2, 0, D);
    const tA = Math.log((xs + rA) / rA);
    const tB = Math.log((D - xs + rB) / rB);
    this.leg = { from, fromOff, to, toOff, rA, rB, D, xs, tA, T: tA + tB, s: 0, stop };
    this.phase = 'leg';
    this.stopObj = null;
  }

  private arrive() {
    const L = this.leg!;
    this.leg = null;
    if (!L.stop) {
      this.phase = 'docked';
      this.settle = 4; // kamera istasyon görünümüne yerleşsin
      this.returning = false;
      this.paused = false;
      this.hooks.onChange();
      return;
    }
    this.phase = 'dwell';
    this.dwellT = 0;
    this.stopObj = L.to;
    this.holdOff.copy(L.toOff);
    this.hooks.onStop(L.stop);
    this.hooks.onChange();
  }

  private depart() {
    if (this.idx + 1 < this.stops.length) {
      this.idx++;
      this.beginLeg(this.stops[this.idx]);
    } else {
      this.phase = 'done';
    }
    this.hooks.onChange();
  }

  private targetPoint(L: Leg, out: THREE.Vector3) {
    return L.to.getWorldPosition(out).add(L.toOff);
  }

  private stopObject(s: Stop): THREE.Object3D {
    return s.kind === 'belt' ? s.view.focus : s.view.object;
  }

  /** Durakta cisme uzaklık; uygulamadaki "seç ve uç" görünümüyle aynı çerçeve. */
  private standoff(s: Stop) {
    if (s.kind === 'body') return s.view.radius * 6;
    if (s.kind === 'galaxy') return s.view.radius * 3.3;
    return s.view.viewRadius * 6;
  }

  /** Duraktaki bakış yönü (cisimden araca doğru birim vektör). */
  private offsetDir(s: Stop, to: THREE.Object3D) {
    const tp = to.getWorldPosition(new THREE.Vector3());
    const toShip = this.pos.clone().sub(tp);
    if (toShip.lengthSq() === 0) toShip.set(0, 0, 1);
    toShip.normalize();
    const dir = new THREE.Vector3();
    if (s.kind === 'body') {
      if (s.view.kind === 'star') dir.copy(toShip).addScaledVector(UP, 0.3);
      else {
        // Güneş tarafından, biraz yandan: cisim aydınlık görünsün.
        const toSun = tp.clone().negate().normalize();
        dir.copy(toSun).multiplyScalar(0.8).addScaledVector(toShip, 0.6).addScaledVector(UP, 0.3);
      }
    } else if (s.kind === 'galaxy') {
      if (s.view.id === 'milkyway') {
        // Galaksinin "üstünden": disk eğik ama bütün olarak görünsün.
        const north = new THREE.Vector3(0, 1, 0).applyQuaternion(to.parent!.getWorldQuaternion(this.qd));
        dir.copy(north).multiplyScalar(0.8).addScaledVector(toShip, 0.6);
      } else dir.copy(toShip).addScaledVector(UP, 0.15);
    } else {
      dir.copy(toShip).addScaledVector(UP, 1.2);
    }
    if (dir.lengthSq() < 1e-6) dir.copy(UP);
    return dir.normalize();
  }
}

const smooth = (k: number) => k * k * (3 - 2 * k);
