# Uzay Gezgini

Tarayıcıda çalışan 3D uzay gezgini (Vite + TypeScript + Three.js).

Her şey tek sahnede ve gerçek ölçekte (1 sahne birimi = 1000 km): bir uydunun yakınından
Andromeda'ya kadar kesintisiz yakınlaştırılabilir. Ayrıntılar `src/scale.ts` içinde.

## Çalıştırma

```bash
npm install
npm run dev
```

## Yayınlama (Vercel)

Depoyu GitHub'a gönderip vercel.com'da "Import Project" ile seçin; Vite otomatik algılanır
(build: `npm run build`, çıktı: `dist`).

## Dokuları yeniden üretmek

`public/textures/` içindeki WebP dosyaları depoda hazır gelir. Yeniden üretmek için Solar System Scope'tan
2K JPG/PNG dosyalarını bir klasöre indirip şunu çalıştırın:

```bash
node scripts/convert-textures.mjs <klasör>
```

## Kaynaklar ve lisanslar

- **Gezegen, Güneş ve Ay dokuları:** [Solar System Scope](https://www.solarsystemscope.com/textures/),
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). 2K sürümler WebP'ye dönüştürülmüştür.
  (Kullanılanlar: sun, mercury, venus_atmosphere, earth_daymap, earth_clouds, moon, mars, jupiter,
  saturn, saturn_ring_alpha, uranus, neptune)
- **Gezegen yörünge elemanları:** NASA JPL, [Approximate Positions of the Planets](https://ssd.jpl.nasa.gov/planets/approx_pos.html)
- **Yarıçap, dönüş süresi, eksen eğikliği:** NASA [Planetary Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/)
- **Ay ortalama yörünge elemanları:** J. Meeus, *Astronomical Algorithms*
- **Yerel Grup galaksileri:** A. McConnachie (2012), *The observed properties of dwarf galaxies in and around the Local Group*, AJ 144, 4; NED. Konumlar yuvarlanmıştır; galaksi görüntüleri yordamsal (procedural) olarak üretilir.
