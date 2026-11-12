import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { GALAXIES, SUN_GC_KLY, type GalaxyData, type GalaxyId } from '../data/galaxies';
import { gauss, mulberry32 } from '../util/random';
import { AU, KLY } from '../scale';

// Galaksiler bir kök grubun içinde: yerel birim = 1 kly (bin ışık yılı),
// Samanyolu merkezi yerel orijinde, galaktik düzlem yerel xz düzlemi, galaktik kuzey +y.
// Kök grup ölçeklenip döndürülerek Güneş Sistemi'nin ekliptik sahnesine oturtulur:
// Güneş dünya orijininde kalır.

export interface GalaxyView {
  id: GalaxyId;
  data: GalaxyData;
  /** Konumu taşıyan grup (dönmez; etiket buna bağlı). Kök grubun çocuğu: dünya konumu için getWorldPosition. */
  object: THREE.Group;
  /** Dünya (sahne) birimi cinsinden yarıçap */
  radius: number;
  parent: GalaxyView | null;
  label: CSS2DObject;
}

const D2R = Math.PI / 180;

/**
 * Galaktik yerel sahne → ekliptik sahne dönüşümü (döndürme).
 * Galaktik → ekvatoral: Hipparcos matrisinin tersi; ekvatoral → ekliptik: eğiklik ε.
 */
function galacticFrame(): THREE.Quaternion {
  const A = [
    [-0.0548755604, -0.8734370902, -0.4838350155],
    [0.4941094279, -0.44482963, 0.7469822445],
    [-0.867666149, -0.1980763734, 0.4559837762],
  ];
  const eps = 23.4392911 * D2R;
  const map = (gx: number, gy: number, gz: number) => {
    const G = [gx, -gz, gy]; // yerel sahne (X, Z, −Y) → galaktik (X, Y, Z)
    const eq = [0, 1, 2].map((i) => A[0][i] * G[0] + A[1][i] * G[1] + A[2][i] * G[2]);
    const ex = eq[0];
    const ey = Math.cos(eps) * eq[1] + Math.sin(eps) * eq[2];
    const ez = -Math.sin(eps) * eq[1] + Math.cos(eps) * eq[2];
    return new THREE.Vector3(ex, ez, -ey); // ekliptik → sahne
  };
  const m = new THREE.Matrix4().makeBasis(map(1, 0, 0), map(0, 1, 0), map(0, 0, 1));
  return new THREE.Quaternion().setFromRotationMatrix(m);
}

/** Gök kuzey kutbunun (ekvatoral kuzey) yerel galaksi sahnesindeki yönü: l = 122,93°, b = 27,13°. */
const CELESTIAL_NORTH = new THREE.Vector3(-0.4838350155, 0.4559837762, -0.7469822445);

/** Galaktik (l, b, d) → Samanyolu merkezli sahne koordinatı. */
function galacticToScene(lDeg: number, bDeg: number, d: number, out = new THREE.Vector3()) {
  const l = lDeg * D2R, b = bDeg * D2R;
  // X: Güneş'ten merkeze, Y: dönüş yönü (l = 90°), Z: galaktik kuzey.
  const X = -SUN_GC_KLY + d * Math.cos(b) * Math.cos(l);
  const Y = d * Math.cos(b) * Math.sin(l);
  const Z = d * Math.sin(b);
  return out.set(X, Z, -Y);
}

// ---------- Nokta bulutu üreticileri (yerel uzay: disk xz düzleminde, normal +y) ----------

class Cloud {
  pos: number[] = [];
  col: number[] = [];
  size: number[] = [];
  add(x: number, y: number, z: number, c: THREE.Color, s: number) {
    this.pos.push(x, y, z);
    this.col.push(c.r, c.g, c.b);
    this.size.push(s);
  }
}

const WARM = new THREE.Color(1.0, 0.82, 0.58);
const DISK = new THREE.Color(0.95, 0.88, 0.8);
const ARM = new THREE.Color(0.62, 0.74, 1.0);
const HII = new THREE.Color(1.0, 0.5, 0.68);
const PALE = new THREE.Color(1.0, 0.9, 0.78);

interface SpiralOpts { arms: number; pitch: number; bulge: number; bar: number; spread: number; thick: number; size: number }

function spiral(c: Cloud, rnd: () => number, R: number, n: number, o: SpiralOpts) {
  const b = Math.tan(o.pitch * D2R);
  const r0 = R * (o.bar > 0 ? 0.22 : 0.1);
  for (let i = 0; i < n; i++) {
    const k = rnd();
    if (k < o.bulge) {
      // Çekirdek şişkinliği
      c.add(gauss(rnd) * R * 0.08, gauss(rnd) * R * 0.05, gauss(rnd) * R * 0.08, WARM, o.size * 1.3);
    } else if (k < o.bulge + o.bar) {
      // Çubuk (x ekseni boyunca)
      c.add((rnd() * 2 - 1) * r0, gauss(rnd) * R * 0.015, gauss(rnd) * R * 0.035, WARM, o.size * 1.1);
    } else if (k < o.bulge + o.bar + 0.3) {
      // Kollar arası yumuşak disk (üstel)
      const r = Math.min(R, -Math.log(1 - rnd() * 0.97) * R * 0.27);
      const th = rnd() * Math.PI * 2;
      c.add(r * Math.cos(th), gauss(rnd) * o.thick, r * Math.sin(th), DISK, o.size * 0.8);
    } else {
      // Logaritmik sarmal kollar: r = r0·e^(bθ)
      const r = r0 + Math.min(R - r0, -Math.log(1 - rnd() * 0.98) * R * 0.3);
      const arm = Math.floor(rnd() * o.arms);
      const th = Math.log(r / r0) / b + (arm * 2 * Math.PI) / o.arms + gauss(rnd) * o.spread;
      const col = rnd() < 0.05 ? HII : ARM;
      c.add(r * Math.cos(th), gauss(rnd) * o.thick * 0.6, r * Math.sin(th), col, o.size);
    }
  }
}

/** Eliptik / cüce küresel: Plummer dağılımı, hafif basık. */
function elliptical(c: Cloud, rnd: () => number, R: number, n: number, q: number, size: number) {
  const a = R * 0.35;
  for (let i = 0; i < n; i++) {
    const u = Math.max(1e-4, rnd());
    const r = Math.min(R * 1.4, a / Math.sqrt(Math.pow(u, -2 / 3) - 1));
    const z = rnd() * 2 - 1;
    const t = rnd() * Math.PI * 2;
    const s = Math.sqrt(1 - z * z);
    c.add(r * s * Math.cos(t), r * z * q, r * s * Math.sin(t), PALE, size);
  }
}

/** Düzensiz: kaymış bir çubuk + rastgele yıldız oluşum yığınları. */
function irregular(c: Cloud, rnd: () => number, R: number, n: number, size: number) {
  const clumps = Array.from({ length: 9 }, () => {
    const r = R * Math.sqrt(rnd()) * 0.75, th = rnd() * Math.PI * 2;
    return [r * Math.cos(th), r * Math.sin(th), R * (0.08 + rnd() * 0.12)];
  });
  for (let i = 0; i < n; i++) {
    const k = rnd();
    if (k < 0.35) {
      c.add(gauss(rnd) * R * 0.3 + R * 0.1, gauss(rnd) * R * 0.04, gauss(rnd) * R * 0.08, WARM, size * 1.1);
    } else if (k < 0.7) {
      const [x, z, s] = clumps[Math.floor(rnd() * clumps.length)];
      c.add(x + gauss(rnd) * s, gauss(rnd) * R * 0.04, z + gauss(rnd) * s, rnd() < 0.15 ? HII : ARM, size);
    } else {
      c.add(gauss(rnd) * R * 0.4, gauss(rnd) * R * 0.06, gauss(rnd) * R * 0.35, DISK, size * 0.8);
    }
  }
}

// ---------- Malzeme: uzaklıkla küçülen ama 1 pikselin altına inmeyen noktalar ----------

const vertexShader = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  uniform float uScale;
  uniform float uUnit;
  attribute float size;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float s = size * uUnit;           // nokta boyu, dünya biriminde
    float px = s * uScale / max(1e-6, -mv.z);
    gl_PointSize = clamp(px, 1.0, 24.0);
    // 1 pikselden küçük kalan noktalar sönükleşir; toplam parlaklık korunur.
    // Ekranda büyüyen (yakındaki) noktalar da söner: galaksinin içindeyken (Güneş'ten bakınca)
    // gökyüzünde dev lekeler yerine uzaktaki noktaların oluşturduğu Samanyolu kuşağı kalır.
    vAlpha = min(1.0, px * px) * (1.0 - smoothstep(9.0, 22.0, px));
    vColor = color;
    #include <logdepthbuf_vertex>
  }
`;
const fragmentShader = /* glsl */ `
  #include <logdepthbuf_pars_fragment>
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r2 = dot(c, c) * 4.0;
    if (r2 > 1.0) discard;
    gl_FragColor = vec4(vColor, exp(-r2 * 3.0) * vAlpha * uOpacity);
    #include <logdepthbuf_fragment>
  }
`;

function makeMaterial(scaleUniform: { value: number }, opacity: number) {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: { uScale: scaleUniform, uUnit: { value: KLY }, uOpacity: { value: opacity } },
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

/** Disk normalini, Güneş'ten bakınca verilen eğiklik ve konum açısında görünecek şekilde seçer (yaklaşık). */
function diskNormal(pos: THREE.Vector3, sun: THREE.Vector3, inclDeg: number, paDeg: number) {
  const los = pos.clone().sub(sun).normalize();
  const north = CELESTIAL_NORTH.clone();
  const en = north.clone().sub(los.clone().multiplyScalar(north.dot(los))).normalize();
  const ee = new THREE.Vector3().crossVectors(los, en);
  const pa = paDeg * D2R, i = inclDeg * D2R;
  const u = en.multiplyScalar(Math.cos(pa)).add(ee.multiplyScalar(Math.sin(pa)));
  return los.multiplyScalar(-Math.cos(i)).add(u.multiplyScalar(Math.sin(i))).normalize();
}

export function createGalaxies(
  scene: THREE.Scene,
  onPick: (g: GalaxyView) => void,
  onSun: () => void,
  labelText: (id: GalaxyId) => string,
  sunText: string,
) {
  const rnd = mulberry32(31);
  const scaleUniform = { value: 1 };
  const sun = galacticToScene(0, 0, 0);
  const views: GalaxyView[] = [];

  const root = new THREE.Group();
  root.quaternion.copy(galacticFrame());
  root.scale.setScalar(KLY);
  root.position.copy(sun).applyQuaternion(root.quaternion).multiplyScalar(-KLY); // Güneş → dünya orijini
  scene.add(root);

  for (const d of GALAXIES) {
    const R = d.diameterKly / 2;
    const c = new Cloud();
    let opacity = 0.55;
    switch (d.id) {
      case 'milkyway':
        spiral(c, rnd, R, 90000, { arms: 4, pitch: 12, bulge: 0.12, bar: 0.06, spread: 0.32, thick: 0.6, size: 0.35 });
        break;
      case 'm31':
        spiral(c, rnd, R, 90000, { arms: 2, pitch: 7, bulge: 0.18, bar: 0, spread: 0.28, thick: 0.9, size: 0.5 });
        break;
      case 'm33':
        spiral(c, rnd, R, 30000, { arms: 2, pitch: 18, bulge: 0.04, bar: 0, spread: 0.45, thick: 0.5, size: 0.3 });
        break;
      default:
        if (d.type === 'irregular') irregular(c, rnd, R, d.id === 'lmc' ? 14000 : 7000, R * 0.025);
        else if (d.type === 'elliptical') elliptical(c, rnd, R, 6000, 0.7, R * 0.02);
        else {
          elliptical(c, rnd, R, 2500, 0.75, R * 0.03);
          opacity = 0.35;
        }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(c.pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(c.col, 3));
    geo.setAttribute('size', new THREE.Float32BufferAttribute(c.size, 1));
    const points = new THREE.Points(geo, makeMaterial(scaleUniform, opacity));

    const object = new THREE.Group();
    if (d.id !== 'milkyway') galacticToScene(d.l, d.b, d.distKly, object.position);
    const disk = new THREE.Group();
    disk.add(points);
    if (d.incl !== undefined) {
      const n = diskNormal(object.position, sun, d.incl, d.pa ?? 0);
      disk.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
    } else if (d.id === 'milkyway') {
      disk.rotation.y = 27 * D2R; // çubuk, Güneş–merkez doğrusuna ~27° eğik
    }
    object.add(disk);
    root.add(object);

    const div = document.createElement('div');
    div.className = d.major ? 'label galaxy-label major' : 'label galaxy-label';
    div.textContent = labelText(d.id);
    const label = new CSS2DObject(div);
    label.center.set(0.5, 1);
    label.position.set(0, Math.max(R * 0.45, 1.5), 0);
    object.add(label);

    const view: GalaxyView = { id: d.id, data: d, object, radius: Math.max(R, 1.5) * KLY, parent: null, label };
    div.addEventListener('click', () => onPick(view));
    views.push(view);
  }
  for (const v of views) v.parent = views.find((p) => p.id === v.data.parent) ?? null;

  // "Buradasınız" işareti: Güneş'in Samanyolu içindeki yeri.
  const sunMark = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([sun.x, sun.y, sun.z], 3)),
    new THREE.PointsMaterial({ color: 0xffe08a, size: 6, sizeAttenuation: false, depthTest: false, transparent: true }),
  );
  sunMark.renderOrder = 10;
  root.add(sunMark);
  const sunDiv = document.createElement('div');
  sunDiv.className = 'label sun-here';
  sunDiv.textContent = sunText;
  sunDiv.addEventListener('click', onSun);
  const sunLabel = new CSS2DObject(sunDiv);
  sunLabel.center.set(0.5, -0.3);
  sunLabel.position.copy(sun);
  root.add(sunLabel);

  const wp = new THREE.Vector3();
  return {
    views,
    /** Galaksi listesinde olmayan etiketler (arkada kalanları gizlemek için). */
    extraLabels: [sunLabel],
    /** Nokta boyutu ölçeği: ekran yüksekliğine ve görüş açısına bağlı. */
    setViewport(heightPx: number, fovDeg: number) {
      scaleUniform.value = (heightPx * Math.min(devicePixelRatio, 2)) / (2 * Math.tan((fovDeg * D2R) / 2));
    },
    /** sunDist: kameranın Güneş'e uzaklığı (sahne birimi). */
    updateLabels(camera: THREE.Camera, selected: GalaxyView | null, sunDist: number) {
      // Gezegenler arasındayken galaksi etiketleri gökyüzünü kalabalıklaştırmasın.
      const outside = sunDist > 1000 * AU;
      for (const v of views) {
        if (v === selected) { v.label.visible = true; continue; }
        if (!outside) { v.label.visible = false; continue; }
        if (v.data.major) { v.label.visible = true; continue; }
        // Küçük galaksilerin etiketi yalnızca yakındayken (kalabalık olmasın).
        v.object.getWorldPosition(wp);
        v.label.visible = camera.position.distanceTo(wp) < 700 * KLY;
      }
      // "Buradasınız": gezegenler tek noktada birleştikten sonra.
      const here = sunDist > 20000 * AU && sunDist < 900 * KLY;
      sunLabel.visible = here;
      sunMark.visible = here;
    },
  };
}
