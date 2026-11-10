// Gerçek değerler. Kaynaklar:
// - Yarıçap, yörünge süresi: NASA Planetary Fact Sheet
// - Yörünge elemanları: JPL "Approximate Positions of the Planets", Tablo 1 (1800–2050)
//   https://ssd.jpl.nasa.gov/planets/approx_pos.html

export type BodyId =
  | 'sun' | 'mercury' | 'venus' | 'earth' | 'mars'
  | 'jupiter' | 'saturn' | 'uranus' | 'neptune';

/** Kepler elemanları: a (AU), e, I / L / peri (ϖ) / node (Ω) derece. */
export interface Elements {
  a: number;
  e: number;
  I: number;
  L: number;
  peri: number;
  node: number;
}

export interface PlanetData {
  id: Exclude<BodyId, 'sun'>;
  radiusKm: number;
  periodDays: number;
  color: number;
  /** J2000 değerleri */
  el: Elements;
  /** Jülyen yüzyılı başına değişim */
  rate: Elements;
}

export const SUN = { id: 'sun' as const, radiusKm: 695_700, color: 0xffcc55 };

const E = (a: number, e: number, I: number, L: number, peri: number, node: number): Elements =>
  ({ a, e, I, L, peri, node });

export const PLANETS: PlanetData[] = [
  {
    id: 'mercury', radiusKm: 2_439.7, periodDays: 87.969, color: 0x9e9e9e,
    el:   E(0.38709927, 0.20563593, 7.00497902, 252.2503235, 77.45779628, 48.33076593),
    rate: E(0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081),
  },
  {
    id: 'venus', radiusKm: 6_051.8, periodDays: 224.701, color: 0xe8c27a,
    el:   E(0.72333566, 0.00677672, 3.39467605, 181.9790995, 131.60246718, 76.67984255),
    rate: E(0.0000039, -0.00004107, -0.0007889, 58517.81538729, 0.00268329, -0.27769418),
  },
  {
    id: 'earth', radiusKm: 6_371.0, periodDays: 365.256, color: 0x3a7bd5,
    el:   E(1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0),
    rate: E(0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0),
  },
  {
    id: 'mars', radiusKm: 3_389.5, periodDays: 686.98, color: 0xc1440e,
    el:   E(1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891),
    rate: E(0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343),
  },
  {
    id: 'jupiter', radiusKm: 69_911, periodDays: 4_332.59, color: 0xd8b48a,
    el:   E(5.202887, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909),
    rate: E(-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106),
  },
  {
    id: 'saturn', radiusKm: 58_232, periodDays: 10_759.22, color: 0xe3d18f,
    el:   E(9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448),
    rate: E(-0.0012506, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794),
  },
  {
    id: 'uranus', radiusKm: 25_362, periodDays: 30_688.5, color: 0x9fdfe8,
    el:   E(19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.9542763, 74.01692503),
    rate: E(-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589),
  },
  {
    id: 'neptune', radiusKm: 24_622, periodDays: 60_182, color: 0x4b70dd,
    el:   E(30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574),
    rate: E(0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664),
  },
];
