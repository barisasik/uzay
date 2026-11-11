// Yerel Grup galaksileri. Konumlar galaktik koordinatlardan (l, b) ve Güneş'e
// uzaklıktan hesaplanır. Kaynak: McConnachie (2012), "The observed properties of
// dwarf galaxies in and around the Local Group" ve NED; değerler yuvarlanmıştır.
// Birim: kly (bin ışık yılı).

export type GalaxyId =
  | 'milkyway' | 'sgr' | 'lmc' | 'smc' | 'draco' | 'umi' | 'sculptor' | 'sextans'
  | 'carina' | 'fornax' | 'leo2' | 'leo1' | 'ngc6822' | 'm31' | 'm32' | 'm110' | 'm33' | 'ic1613';

export type GalaxyType = 'barred' | 'spiral' | 'irregular' | 'elliptical' | 'dsph';

export interface GalaxyData {
  id: GalaxyId;
  type: GalaxyType;
  /** Galaktik boylam / enlem (derece). */
  l: number;
  b: number;
  /** Güneş'e uzaklık (kly). */
  distKly: number;
  /** Görünür çap (kly); büyük galaksilerde panelde gösterilir. */
  diameterKly: number;
  showDiameter: boolean;
  parent: GalaxyId | null;
  /** Disk eğikliği (bakış doğrultusuna göre; 0 = yüzden, 90 = yandan) ve konum açısı. Yaklaşık. */
  incl?: number;
  pa?: number;
  /** Etiket her zaman görünsün mü (büyük galaksiler). */
  major: boolean;
}

/** Güneş'in Samanyolu merkezine uzaklığı (kly). */
export const SUN_GC_KLY = 26.7;

// Liste sırası: Samanyolu ve uyduları, sonra Andromeda ve uyduları.
// M32 ve M110'un uzaklıkları Andromeda'ya göre belirsizliğin içinde; derinlikte
// yanlış ayrışmasınlar diye Andromeda'ya yakın tutuldu.
export const GALAXIES: GalaxyData[] = [
  { id: 'milkyway', type: 'barred', l: 0, b: 0, distKly: 0, diameterKly: 100, showDiameter: true, parent: null, major: true },
  { id: 'sgr', type: 'dsph', l: 5.57, b: -14.17, distKly: 70, diameterKly: 10, showDiameter: false, parent: 'milkyway', major: false },
  { id: 'lmc', type: 'irregular', l: 280.47, b: -32.89, distKly: 163, diameterKly: 14, showDiameter: true, parent: 'milkyway', incl: 35, pa: 150, major: true },
  { id: 'smc', type: 'irregular', l: 302.8, b: -44.3, distKly: 200, diameterKly: 7, showDiameter: true, parent: 'milkyway', incl: 60, pa: 45, major: true },
  { id: 'draco', type: 'dsph', l: 86.37, b: 34.72, distKly: 248, diameterKly: 2, showDiameter: false, parent: 'milkyway', major: false },
  { id: 'umi', type: 'dsph', l: 104.97, b: 44.8, distKly: 248, diameterKly: 2, showDiameter: false, parent: 'milkyway', major: false },
  { id: 'sculptor', type: 'dsph', l: 287.53, b: -83.16, distKly: 280, diameterKly: 3, showDiameter: false, parent: 'milkyway', major: false },
  { id: 'sextans', type: 'dsph', l: 243.5, b: 42.27, distKly: 280, diameterKly: 4, showDiameter: false, parent: 'milkyway', major: false },
  { id: 'carina', type: 'dsph', l: 260.11, b: -22.22, distKly: 345, diameterKly: 2, showDiameter: false, parent: 'milkyway', major: false },
  { id: 'fornax', type: 'dsph', l: 237.1, b: -65.65, distKly: 460, diameterKly: 4, showDiameter: false, parent: 'milkyway', major: false },
  { id: 'leo2', type: 'dsph', l: 220.17, b: 67.23, distKly: 760, diameterKly: 1.5, showDiameter: false, parent: 'milkyway', major: false },
  { id: 'leo1', type: 'dsph', l: 225.99, b: 49.11, distKly: 820, diameterKly: 2, showDiameter: false, parent: 'milkyway', major: false },
  { id: 'ngc6822', type: 'irregular', l: 25.34, b: -18.4, distKly: 1500, diameterKly: 7, showDiameter: true, parent: null, incl: 60, pa: 10, major: false },
  { id: 'm31', type: 'spiral', l: 121.17, b: -21.57, distKly: 2540, diameterKly: 152, showDiameter: true, parent: null, incl: 77, pa: 38, major: true },
  { id: 'm32', type: 'elliptical', l: 121.15, b: -21.98, distKly: 2530, diameterKly: 6.5, showDiameter: true, parent: 'm31', major: false },
  { id: 'm110', type: 'elliptical', l: 120.72, b: -21.14, distKly: 2575, diameterKly: 17, showDiameter: true, parent: 'm31', major: false },
  { id: 'm33', type: 'spiral', l: 133.61, b: -31.33, distKly: 2730, diameterKly: 61, showDiameter: true, parent: 'm31', incl: 55, pa: 23, major: true },
  { id: 'ic1613', type: 'irregular', l: 129.79, b: -60.58, distKly: 2380, diameterKly: 7, showDiameter: true, parent: null, incl: 40, pa: 60, major: false },
];
