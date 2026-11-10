import type { BodyId } from './data/bodies';

// Arayüzdeki tüm metinler burada. Faz 6'da `en` eklenecek.
const tr = {
  'meta.locale': 'tr-TR',

  'speed.pause': 'Duraklat',
  'speed.real': 'Gerçek zaman',
  'speed.day': '1 gün/sn',
  'speed.month': '1 ay/sn',
  'speed.year': '1 yıl/sn',
  'ui.today': 'Bugüne dön',
  'ui.labels': 'Etiketler',
  'ui.close': 'Kapat',
  'ui.loading': 'Dokular yükleniyor',
  'ui.credits': 'Dokular: Solar System Scope (CC BY 4.0)',
  'app.title': 'Uzay Gezgini',
  'info.distanceParent': "Dünya'ya uzaklık",

  'info.diameter': 'Çap',
  'info.distance': "Güneş'e uzaklık",
  'info.period': 'Yörünge süresi',
  'info.type': 'Tür',
  'unit.km': 'km',
  'unit.millionKm': 'milyon km',
  'unit.au': 'AU',
  'unit.day': 'gün',
  'unit.year': 'yıl',

  'body.sun.name': 'Güneş',
  'body.sun.type': 'G2V tipi sarı cüce yıldız',
  'body.sun.desc': "Güneş Sistemi'nin merkezindeki yıldız. Sistemdeki toplam kütlenin %99,8'i ondadır.",
  'body.mercury.name': 'Merkür',
  'body.mercury.desc': "Güneş'e en yakın ve en küçük gezegen. Atmosferi neredeyse yoktur; gece ile gündüz arasındaki sıcaklık farkı 600 °C'yi bulur.",
  'body.venus.name': 'Venüs',
  'body.venus.desc': 'Kalın karbondioksit atmosferi yüzünden en sıcak gezegen. Kendi ekseni etrafında diğerlerinin tersine döner.',
  'body.earth.name': 'Dünya',
  'body.earth.desc': 'Yüzeyinde sıvı su ve yaşam bulunduğu bilinen tek gezegen.',
  'body.moon.name': 'Ay',
  'body.moon.desc': "Dünya'nın tek doğal uydusu. Dünya'ya hep aynı yüzünü döner; gelgitlerin asıl nedeni odur.",
  'body.mars.name': 'Mars',
  'body.mars.desc': "Kızıl gezegen. Güneş Sistemi'nin en yüksek yanardağı Olympus Mons buradadır.",
  'body.jupiter.name': 'Jüpiter',
  'body.jupiter.desc': 'En büyük gezegen. Büyük Kırmızı Leke, yüzyıllardır süren ve Dünya’dan büyük bir fırtınadır.',
  'body.saturn.name': 'Satürn',
  'body.saturn.desc': 'Buz ve kaya parçalarından oluşan görkemli halkalarıyla bilinir. Ortalama yoğunluğu sudan düşüktür.',
  'body.uranus.name': 'Uranüs',
  'body.uranus.desc': "Ekseni neredeyse yan yatmıştır; Güneş'in etrafında yuvarlanır gibi döner.",
  'body.neptune.name': 'Neptün',
  'body.neptune.desc': "Güneş'e en uzak gezegen. Güneş Sistemi'nin en hızlı rüzgârları burada eser.",
} as const;

export type Key = keyof typeof tr;
const dicts: Record<string, Record<Key, string>> = { tr };
let lang = 'tr';

export const t = (k: Key): string => dicts[lang][k];
export const locale = () => t('meta.locale');
export const bodyName = (id: BodyId) => t(`body.${id}.name`);
export const bodyDesc = (id: BodyId) => t(`body.${id}.desc`);
