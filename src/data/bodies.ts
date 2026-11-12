// Gerçek değerler. Kaynaklar:
// - Yarıçap, yörünge/dönüş süresi, eksen eğikliği: NASA Planetary Fact Sheet
// - Yörünge elemanları: JPL "Approximate Positions of the Planets", Tablo 1 (1800–2050)
//   https://ssd.jpl.nasa.gov/planets/approx_pos.html
// - Ay ortalama elemanları: Meeus, "Astronomical Algorithms" (J2000)
// - Plüton: 2006'dan beri resmî olarak cüce gezegen; burada gezegen olarak gösterilir.
//   Elemanları JPL tablosunun Plüton'u da içeren önceki sürümünden (Standish, 1800–2050).

export type PlanetId = 'mercury' | 'venus' | 'earth' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune' | 'pluto';

export type SatelliteId =
  | 'phobos' | 'deimos'
  | 'io' | 'europa' | 'ganymede' | 'callisto'
  | 'mimas' | 'enceladus' | 'tethys' | 'dione' | 'rhea' | 'titan' | 'iapetus'
  | 'miranda' | 'ariel' | 'umbriel' | 'titania' | 'oberon'
  | 'triton'
  | 'charon';

export type BodyId = 'sun' | PlanetId | 'moon' | SatelliteId;

/** Kepler elemanları: a (AU), e, I / L / peri (ϖ) / node (Ω) derece. */
export interface Elements {
  a: number;
  e: number;
  I: number;
  L: number;
  peri: number;
  node: number;
}

interface Physical {
  radiusKm: number;
  /** Eksen eğikliği (derece). Ters dönenler (Venüs, Uranüs) >90°. */
  tiltDeg: number;
  /** Yıldız günü (gün) */
  rotationDays: number;
  /** public/textures/<texture>.webp */
  texture: string;
  /** Doku yüklenene kadarki renk */
  color: number;
}

export interface PlanetData extends Physical {
  id: PlanetId;
  periodDays: number;
  /** J2000 değerleri */
  el: Elements;
  /** Jülyen yüzyılı başına değişim */
  rate: Elements;
}

export const SUN: Physical & { id: 'sun' } = {
  id: 'sun', radiusKm: 695_700, tiltDeg: 7.25, rotationDays: 25.38, texture: 'sun', color: 0xffcc55,
};

export const MOON: Physical & {
  id: 'moon';
  parent: 'earth';
  periodDays: number;
  distanceKm: number;
  inclinationDeg: number;
  /** J2000 ortalama boylam ve günlük değişimi (derece) */
  L0: number;
  Lrate: number;
  /** J2000 yükselen düğüm boylamı ve günlük değişimi (derece) */
  node0: number;
  nodeRate: number;
} = {
  id: 'moon', parent: 'earth', radiusKm: 1_737.4, tiltDeg: 6.68, rotationDays: 27.321661,
  texture: 'moon', color: 0xaaaaaa, periodDays: 27.321661, distanceKm: 384_400,
  inclinationDeg: 5.145, L0: 218.3165, Lrate: 13.17639648, node0: 125.0445, nodeRate: -0.0529538,
};

const E = (a: number, e: number, I: number, L: number, peri: number, node: number): Elements =>
  ({ a, e, I, L, peri, node });

export const PLANETS: PlanetData[] = [
  {
    id: 'mercury', radiusKm: 2_439.7, periodDays: 87.969, color: 0x9e9e9e,
    tiltDeg: 0.03, rotationDays: 58.646, texture: 'mercury',
    el:   E(0.38709927, 0.20563593, 7.00497902, 252.2503235, 77.45779628, 48.33076593),
    rate: E(0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081),
  },
  {
    id: 'venus', radiusKm: 6_051.8, periodDays: 224.701, color: 0xe8c27a,
    tiltDeg: 177.36, rotationDays: 243.025, texture: 'venus_atmosphere',
    el:   E(0.72333566, 0.00677672, 3.39467605, 181.9790995, 131.60246718, 76.67984255),
    rate: E(0.0000039, -0.00004107, -0.0007889, 58517.81538729, 0.00268329, -0.27769418),
  },
  {
    id: 'earth', radiusKm: 6_371.0, periodDays: 365.256, color: 0x3a7bd5,
    tiltDeg: 23.44, rotationDays: 0.99727, texture: 'earth_daymap',
    el:   E(1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0),
    rate: E(0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0),
  },
  {
    id: 'mars', radiusKm: 3_389.5, periodDays: 686.98, color: 0xc1440e,
    tiltDeg: 25.19, rotationDays: 1.02596, texture: 'mars',
    el:   E(1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891),
    rate: E(0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343),
  },
  {
    id: 'jupiter', radiusKm: 69_911, periodDays: 4_332.59, color: 0xd8b48a,
    tiltDeg: 3.13, rotationDays: 0.41354, texture: 'jupiter',
    el:   E(5.202887, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909),
    rate: E(-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106),
  },
  {
    id: 'saturn', radiusKm: 58_232, periodDays: 10_759.22, color: 0xe3d18f,
    tiltDeg: 26.73, rotationDays: 0.44401, texture: 'saturn',
    el:   E(9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448),
    rate: E(-0.0012506, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794),
  },
  {
    id: 'uranus', radiusKm: 25_362, periodDays: 30_688.5, color: 0x9fdfe8,
    tiltDeg: 97.77, rotationDays: 0.71833, texture: 'uranus',
    el:   E(19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.9542763, 74.01692503),
    rate: E(-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589),
  },
  {
    id: 'neptune', radiusKm: 24_622, periodDays: 60_182, color: 0x4b70dd,
    tiltDeg: 28.32, rotationDays: 0.67125, texture: 'neptune',
    el:   E(30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574),
    rate: E(0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664),
  },
  {
    // Doku yordamsal (scripts/make-pluto-texture.mjs). Eğiklik >90°: ters yönde döner.
    id: 'pluto', radiusKm: 1_188.3, periodDays: 90_560, color: 0xd9c2a5,
    tiltDeg: 122.53, rotationDays: 6.3872, texture: 'pluto',
    el:   E(39.48211675, 0.2488273, 17.14001206, 238.92903833, 224.06891629, 110.30393684),
    rate: E(-0.00031596, 0.0000517, 0.00004818, 145.20780515, -0.04062942, -0.01183482),
  },
];

/**
 * Diğer gezegenlerin büyük uyduları. Kaynak: NASA/JPL Planetary Satellite Physical Parameters
 * ve Mean Orbital Parameters (ssd.jpl.nasa.gov/sats).
 * aKm: yarı büyük eksen, periodDays: yörünge süresi (negatif = ters yönde, Triton).
 * Yörüngeler gezegenin ekvator düzleminde dairesel varsayılır. Başlangıç açıları temsilidir,
 * gerçek anlık konumlar değildir (Ay hariç; o gerçek ortalama konumdadır).
 * texture: null ise düz renk; 'moon' ise Ay dokusu renkle boyanır (krater görünümü).
 */
export interface SatelliteData {
  id: SatelliteId;
  parent: PlanetId;
  radiusKm: number;
  aKm: number;
  periodDays: number;
  color: number;
  texture: 'moon' | null;
}

export const SATELLITES: SatelliteData[] = [
  { id: 'phobos',    parent: 'mars',    radiusKm: 11.27,  aKm: 9_376,     periodDays: 0.31891,   color: 0x9a8a78, texture: 'moon' },
  { id: 'deimos',    parent: 'mars',    radiusKm: 6.2,    aKm: 23_463,    periodDays: 1.26244,   color: 0xa89884, texture: 'moon' },
  { id: 'io',        parent: 'jupiter', radiusKm: 1_821.6, aKm: 421_700,  periodDays: 1.769138,  color: 0xf0d860, texture: 'moon' },
  { id: 'europa',    parent: 'jupiter', radiusKm: 1_560.8, aKm: 671_034,  periodDays: 3.551181,  color: 0xf2e6d0, texture: 'moon' },
  { id: 'ganymede',  parent: 'jupiter', radiusKm: 2_634.1, aKm: 1_070_412, periodDays: 7.154553, color: 0xb8aa98, texture: 'moon' },
  { id: 'callisto',  parent: 'jupiter', radiusKm: 2_410.3, aKm: 1_882_709, periodDays: 16.689018, color: 0x8a7a68, texture: 'moon' },
  { id: 'mimas',     parent: 'saturn',  radiusKm: 198.2,  aKm: 185_539,   periodDays: 0.942422,  color: 0xd0d0d0, texture: 'moon' },
  { id: 'enceladus', parent: 'saturn',  radiusKm: 252.1,  aKm: 237_948,   periodDays: 1.370218,  color: 0xffffff, texture: null },
  { id: 'tethys',    parent: 'saturn',  radiusKm: 531.1,  aKm: 294_619,   periodDays: 1.887802,  color: 0xe8e8e0, texture: 'moon' },
  { id: 'dione',     parent: 'saturn',  radiusKm: 561.4,  aKm: 377_396,   periodDays: 2.736915,  color: 0xe0ded8, texture: 'moon' },
  { id: 'rhea',      parent: 'saturn',  radiusKm: 763.8,  aKm: 527_108,   periodDays: 4.518212,  color: 0xdcd8d0, texture: 'moon' },
  { id: 'titan',     parent: 'saturn',  radiusKm: 2_574.7, aKm: 1_221_870, periodDays: 15.945,   color: 0xd9a54a, texture: null },
  { id: 'iapetus',   parent: 'saturn',  radiusKm: 734.5,  aKm: 3_560_820, periodDays: 79.3215,   color: 0xa89880, texture: 'moon' },
  { id: 'miranda',   parent: 'uranus',  radiusKm: 235.8,  aKm: 129_900,   periodDays: 1.413479,  color: 0xc8c8c8, texture: 'moon' },
  { id: 'ariel',     parent: 'uranus',  radiusKm: 578.9,  aKm: 190_900,   periodDays: 2.520379,  color: 0xd4d0c8, texture: 'moon' },
  { id: 'umbriel',   parent: 'uranus',  radiusKm: 584.7,  aKm: 266_000,   periodDays: 4.144177,  color: 0x8c8882, texture: 'moon' },
  { id: 'titania',   parent: 'uranus',  radiusKm: 788.4,  aKm: 436_300,   periodDays: 8.705872,  color: 0xcac0b2, texture: 'moon' },
  { id: 'oberon',    parent: 'uranus',  radiusKm: 761.4,  aKm: 583_519,   periodDays: 13.463239, color: 0xb8ae9e, texture: 'moon' },
  { id: 'triton',    parent: 'neptune', radiusKm: 1_353.4, aKm: 354_759,  periodDays: -5.876854, color: 0xe0d4c8, texture: 'moon' },
  { id: 'charon',    parent: 'pluto',   radiusKm: 606,    aKm: 19_591,    periodDays: 6.3872,    color: 0xa8a29a, texture: 'moon' },
];

/** Satürn halkaları (km): C halkası iç kenarı → A halkası dış kenarı */
export const SATURN_RINGS = { innerKm: 74_500, outerKm: 136_780 };

/**
 * Uranüs'ün ana halkaları (yarıçap ve genişlik km). Kaynak: NASA Uranian Rings Fact Sheet.
 * Gerçekte çok dar ve koyudurlar; görünür olsunlar diye çizimde genişlik büyütülür.
 */
export const URANUS_RINGS: { name: string; radiusKm: number; widthKm: number }[] = [
  { name: '6', radiusKm: 41_837, widthKm: 1.5 },
  { name: '5', radiusKm: 42_234, widthKm: 2 },
  { name: '4', radiusKm: 42_571, widthKm: 2 },
  { name: 'α', radiusKm: 44_718, widthKm: 7 },
  { name: 'β', radiusKm: 45_661, widthKm: 8 },
  { name: 'η', radiusKm: 47_176, widthKm: 1.6 },
  { name: 'γ', radiusKm: 47_627, widthKm: 3 },
  { name: 'δ', radiusKm: 48_300, widthKm: 6 },
  { name: 'λ', radiusKm: 50_023, widthKm: 2 },
  { name: 'ε', radiusKm: 51_149, widthKm: 58 },
];
