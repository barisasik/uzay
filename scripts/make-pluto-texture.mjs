// Plüton için yordamsal (procedural) yüzey dokusu üretir → public/textures/pluto.webp
// Solar System Scope'ta Plüton dokusu yok. New Horizons görüntülerindeki ana bölgeler
// yaklaşık konumlarıyla çizilir: Tombaugh Regio ("kalp"), Sputnik Planitia, Cthulhu Macula,
// ekvator boyunca koyu lekeler ve kuzey kutbu (Lowell Regio). Bilimsel harita değildir.
// Kullanım: node scripts/make-pluto-texture.mjs
import sharp from 'sharp';

const W = 2048, H = 1024;
const D2R = Math.PI / 180;

// --- Küre üzerinde dikişsiz 3B değer gürültüsü ---
function hash(x, y, z) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
const smooth = (t) => t * t * (3 - 2 * t);
function noise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = smooth(x - xi), yf = smooth(y - yi), zf = smooth(z - zi);
  const l = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hash(xi + dx, yi + dy, zi + dz);
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), xf), l(c(0, 1, 0), c(1, 1, 0), xf), yf),
    l(l(c(0, 0, 1), c(1, 0, 1), xf), l(c(0, 1, 1), c(1, 1, 1), xf), yf),
    zf,
  );
}
function fbm(x, y, z, oct = 6) {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) {
    s += a * noise(x * f, y * f, z * f);
    f *= 2.03;
    a *= 0.5;
  }
  return s;
}

/** Merkezi (lon0, lat0) olan, yarı eksenleri (rl, rb) derece olan elips içinde 1, kenarda yumuşak geçiş. */
function blob(lon, lat, lon0, lat0, rl, rb, edge = 0.25) {
  let dl = lon - lon0;
  if (dl > 180) dl -= 360;
  if (dl < -180) dl += 360;
  const d = Math.hypot((dl * Math.cos(lat * D2R)) / rl, (lat - lat0) / rb);
  return d < 1 - edge ? 1 : d > 1 ? 0 : (1 - d) / edge;
}
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

const BASE = [196, 164, 128]; // açık kahve / ten rengi
const DARK = [92, 48, 32]; // Cthulhu: tholin kaynaklı koyu kızıl
const HEART = [242, 232, 220]; // azot buzu
const POLE = [178, 160, 150]; // grimsi kutup
const RUST = [170, 112, 72];

const buf = Buffer.alloc(W * H * 3);
for (let y = 0; y < H; y++) {
  const lat = 90 - ((y + 0.5) / H) * 180;
  for (let x = 0; x < W; x++) {
    const lon = ((x + 0.5) / W) * 360;
    const cx = Math.cos(lat * D2R) * Math.cos(lon * D2R);
    const cy = Math.cos(lat * D2R) * Math.sin(lon * D2R);
    const cz = Math.sin(lat * D2R);
    const n = fbm(cx * 3 + 11, cy * 3 + 5, cz * 3 + 7);
    const fine = fbm(cx * 24, cy * 24, cz * 24, 4);
    // Bölge kenarlarını düzensizleştiren iki ayrı bozulma alanı (derece)
    const wl = (fbm(cx * 4 + 31, cy * 4 + 17, cz * 4 + 3) - 0.5) * 70;
    const wb = (fbm(cx * 4 + 2, cy * 4 + 41, cz * 4 + 23) - 0.5) * 50;
    const warp = wl;

    let c = mix(BASE, RUST, Math.max(0, (n - 0.45) * 2.2));

    // Ekvator boyunca koyu kuşak: Cthulhu (lon 20–150) ve daha küçük lekeler.
    const cth = Math.max(
      blob(lon + wl, lat + wb, 95, -8, 62, 18, 0.45),
      blob(lon + wl, lat + wb, 40, -2, 30, 14, 0.5) * 0.9,
      blob(lon + wl, lat + wb, 140, -12, 22, 12, 0.5) * 0.9,
    );
    let spots = 0;
    for (const [lon0, lat0, r] of [[238, -6, 10], [264, -12, 8], [291, -4, 12], [322, -10, 9], [350, -3, 11]]) {
      spots = Math.max(spots, blob(lon + wl * 0.5, lat + wb * 0.5, lon0, lat0, r * 1.3, r, 0.6));
    }
    c = mix(c, DARK, Math.min(1, cth + spots * 0.8) * (0.7 + 0.3 * fine));

    // Kalp: batı lobu Sputnik Planitia (pürüzsüz, en parlak), doğu lobu daha soluk.
    // Sputnik: aşağı doğru sivrilen damla; doğu lobu düzensiz ve soluk.
    const sl = lat < 20 ? 1 - (20 - lat) / 55 : 1;
    const sput = blob(lon + wl * 0.15, lat + wb * 0.15, 177, 22, 18 * sl, 26, 0.2);
    const east = blob(lon + wl * 0.6, lat + wb * 0.6, 207, 14, 28, 24, 0.55);
    c = mix(c, HEART, Math.max(east * 0.75 * (0.8 + 0.2 * fine), sput * 0.97));
    if (sput > 0.5) {
      // Sputnik'in "hücreli" (konveksiyon) dokusu: ince koyu çizgiler
      const cell = Math.abs(fbm(cx * 40, cy * 40, cz * 40, 2) - 0.5);
      if (cell < 0.025) c = mix(c, [205, 190, 175], 0.6);
    }

    // Kuzey kutbu
    const pole = Math.min(1, Math.max(0, (lat - 58 + wb * 0.4) / 18));
    c = mix(c, POLE, pole * 0.85);

    // ince ayrıntı
    const k = 0.88 + 0.24 * fine;
    const i = (y * W + x) * 3;
    buf[i] = Math.min(255, c[0] * k);
    buf[i + 1] = Math.min(255, c[1] * k);
    buf[i + 2] = Math.min(255, c[2] * k);
  }
}

const out = new URL('../public/textures/pluto.webp', import.meta.url).pathname;
await sharp(buf, { raw: { width: W, height: H, channels: 3 } }).webp({ quality: 82 }).toFile(out);
console.log('yazıldı:', out);
