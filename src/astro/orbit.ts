import type { Elements, PlanetData } from '../data/bodies';

export const J2000_MS = Date.UTC(2000, 0, 1, 12);
export const DAY_MS = 86_400_000;
const D2R = Math.PI / 180;

export interface Vec3 { x: number; y: number; z: number }

/** J2000'den bu yana geçen Jülyen yüzyılı. */
export const julianCenturies = (ms: number) => (ms - J2000_MS) / (DAY_MS * 36525);

export function elementsAt(p: PlanetData, T: number): Elements {
  const { el, rate } = p;
  return {
    a: el.a + rate.a * T,
    e: el.e + rate.e * T,
    I: el.I + rate.I * T,
    L: el.L + rate.L * T,
    peri: el.peri + rate.peri * T,
    node: el.node + rate.node * T,
  };
}

function solveKepler(M: number, e: number): number {
  let E = M + e * Math.sin(M);
  for (let i = 0; i < 10; i++) {
    const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= d;
    if (Math.abs(d) < 1e-12) break;
  }
  return E;
}

/** Eksantrik anomali E'deki güneş merkezli ekliptik konum (AU). */
function positionFromE(el: Elements, E: number): Vec3 {
  const w = (el.peri - el.node) * D2R;
  const O = el.node * D2R;
  const I = el.I * D2R;
  const xp = el.a * (Math.cos(E) - el.e);
  const yp = el.a * Math.sqrt(1 - el.e * el.e) * Math.sin(E);
  const cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(O), sO = Math.sin(O), cI = Math.cos(I), sI = Math.sin(I);
  return {
    x: (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
    y: (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
    z: sw * sI * xp + cw * sI * yp,
  };
}

export function positionAt(el: Elements): Vec3 {
  let M = (el.L - el.peri) % 360;
  if (M > 180) M -= 360;
  if (M < -180) M += 360;
  return positionFromE(el, solveKepler(M * D2R, el.e));
}

export function orbitPoints(el: Elements, n: number): Vec3[] {
  const pts: Vec3[] = [];
  for (let i = 0; i < n; i++) pts.push(positionFromE(el, (i / n) * Math.PI * 2));
  return pts;
}
