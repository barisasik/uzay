import type { BodyId } from './data/bodies';
import type { BeltId } from './scene/belts';

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
  'list.title': 'Gök cisimleri',
  'list.order': 'Sırayla',
  'list.near': 'Yakınlık',
  'list.reference': 'Referans',
  'list.collapse': 'Listeyi gizle',
  'list.expand': 'Listeyi göster',
  'ui.loading': 'Dokular yükleniyor',
  'ui.credits': 'Dokular: Solar System Scope (CC BY 4.0)',
  'app.title': 'Uzay Gezgini',
  'list.belts': 'Kuşaklar',
  'info.region': "Güneş'e uzaklık",
  'info.known': 'Bilinen cisim',
  'belt.kind': 'Küçük cisim kuşağı',

  'belt.asteroid.name': 'Asteroit Kuşağı',
  'belt.asteroid.known': '1 milyondan fazla',
  'belt.asteroid.desc':
    "Mars ile Jüpiter arasında, kayalık ve metalik milyonlarca küçük cisim. Hepsinin toplam kütlesi Ay'ınkinin yalnızca %3'ü kadardır. En büyüğü cüce gezegen Ceres'tir. Aradaki boşluklar (Kirkwood boşlukları) Jüpiter'in kütle çekimiyle temizlenmiştir.",
  'belt.trojans.name': 'Truva Asteroitleri',
  'belt.trojans.known': '15 binden fazla',
  'belt.trojans.desc':
    "Jüpiter'le aynı yörüngede, onun 60° önünde ve arkasında iki büyük küme. Güneş ile Jüpiter'in çekimlerinin dengelendiği bu noktalarda (L4 ve L5) hapsolmuşlardır. NASA'nın Lucy aracı bu asteroitleri ziyaret ediyor.",
  'belt.kuiper.name': 'Kuiper Kuşağı',
  'belt.kuiper.known': '3 binden fazla',
  'belt.kuiper.desc':
    "Neptün'ün ötesinde, buzlu cisimlerden oluşan geniş halka. Plüton, Haumea ve Makemake gibi cüce gezegenler buradadır. Kısa dönemli kuyruklu yıldızların çoğu buradan gelir. Daha ötesindeki dev Oort Bulutu ise gerçek ölçek modunda (Faz 5) eklenecek.",

  'info.distanceParent': 'Gezegenine uzaklık',
  'info.parent': 'Bağlı olduğu',

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

  'body.phobos.name': 'Phobos',
  'body.phobos.desc': "Mars'ın büyük uydusu. Mars'a o kadar yakın ki her yüzyılda yaklaşık 2 m yaklaşıyor; milyonlarca yıl sonra parçalanıp halka olabilir.",
  'body.deimos.name': 'Deimos',
  'body.deimos.desc': "Mars'ın küçük, patates biçimli uydusu. Muhtemelen yakalanmış bir asteroittir.",
  'body.io.name': 'Io',
  'body.io.desc': "Güneş Sistemi'nin volkanik olarak en etkin cismi. Jüpiter'in gelgit kuvveti içini sürekli ısıtır; 400'den fazla etkin yanardağı vardır.",
  'body.europa.name': 'Europa',
  'body.europa.desc': 'Buz kabuğunun altında küresel bir tuzlu su okyanusu olduğu düşünülür. Yaşam aranan yerlerin başında gelir.',
  'body.ganymede.name': 'Ganymede',
  'body.ganymede.desc': "Güneş Sistemi'nin en büyük uydusu; Merkür'den bile büyüktür. Kendi manyetik alanı olan tek uydudur.",
  'body.callisto.name': 'Callisto',
  'body.callisto.desc': "Güneş Sistemi'nde en çok kraterli yüzeylerden birine sahiptir; yüzeyi milyarlarca yıldır pek değişmemiştir.",
  'body.mimas.name': 'Mimas',
  'body.mimas.desc': 'Dev Herschel krateri yüzünden "Ölüm Yıldızı"na benzetilen küçük buz uydu.',
  'body.enceladus.name': 'Enceladus',
  'body.enceladus.desc': "Güney kutbundan uzaya su buharı fışkırtır. Güneş Sistemi'nin en parlak (en yansıtıcı) cismidir.",
  'body.tethys.name': 'Tethys',
  'body.tethys.desc': 'Neredeyse tamamen su buzundan oluşan orta boy uydu. Yüzeyini dev bir kanyon (Ithaca Chasma) yarar.',
  'body.dione.name': 'Dione',
  'body.dione.desc': 'Parlak buz uçurumlarıyla kaplı bir uydu. Altında ince bir okyanus olabileceği düşünülüyor.',
  'body.rhea.name': 'Rhea',
  'body.rhea.desc': "Satürn'ün ikinci büyük uydusu; buz ve kayadan oluşan, çok kraterli bir dünya.",
  'body.titan.name': 'Titan',
  'body.titan.desc': "Kalın atmosferi olan tek uydu. Yüzeyinde sıvı metan ve etan gölleri, nehirleri vardır. Merkür'den büyüktür.",
  'body.iapetus.name': 'Iapetus',
  'body.iapetus.desc': 'İki renkli uydu: bir yarım küresi kömür kadar koyu, diğeri kar kadar parlaktır.',
  'body.miranda.name': 'Miranda',
  'body.miranda.desc': "Yamalı bohça gibi görünen yüzeyinde, Güneş Sistemi'nin en yüksek uçurumlarından biri (Verona Rupes, ~20 km) bulunur.",
  'body.ariel.name': 'Ariel',
  'body.ariel.desc': "Uranüs'ün en parlak uydusu. Genç yüzeyi, geçmişte iç etkinlik olduğunu gösterir.",
  'body.umbriel.name': 'Umbriel',
  'body.umbriel.desc': "Uranüs'ün en koyu büyük uydusu; yüzeyi eski ve kraterlidir.",
  'body.titania.name': 'Titania',
  'body.titania.desc': "Uranüs'ün en büyük uydusu. Yüzeyinde dev fay vadileri vardır.",
  'body.oberon.name': 'Oberon',
  'body.oberon.desc': "Uranüs'ün en dıştaki büyük uydusu; eski ve yoğun kraterli bir yüzeye sahiptir.",
  'body.triton.name': 'Triton',
  'body.triton.desc': "Neptün'ün en büyük uydusu. Gezegenin dönüşünün tersine dolanır; muhtemelen Kuiper Kuşağı'ndan yakalanmıştır. Azot gayzerleri vardır.",
} as const;

export type Key = keyof typeof tr;
const dicts: Record<string, Record<Key, string>> = { tr };
let lang = 'tr';

export const t = (k: Key): string => dicts[lang][k];
export const locale = () => t('meta.locale');
export const bodyName = (id: BodyId) => t(`body.${id}.name`);
export const bodyDesc = (id: BodyId) => t(`body.${id}.desc`);
export const beltText = (id: BeltId, f: 'name' | 'desc' | 'known') => t(`belt.${id}.${f}`);
