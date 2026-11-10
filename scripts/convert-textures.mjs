// Solar System Scope 2K dokularını (CC BY 4.0) WebP'ye çevirir.
// Kullanım: node scripts/convert-textures.mjs <indirilen-jpg-png-klasörü>
// Kaynak: https://www.solarsystemscope.com/textures/
import sharp from 'sharp';
import { readdir, mkdir } from 'node:fs/promises';
import { join, parse } from 'node:path';

const src = process.argv[2];
if (!src) {
  console.error('Kullanım: node scripts/convert-textures.mjs <klasör>');
  process.exit(1);
}
const out = new URL('../public/textures/', import.meta.url).pathname;
await mkdir(out, { recursive: true });

for (const f of await readdir(src)) {
  if (!/\.(jpe?g|png)$/i.test(f)) continue;
  const name = parse(f).name.replace(/^\d+k_/, '');
  const alpha = f.endsWith('.png');
  const info = await sharp(join(src, f))
    .webp(alpha ? { quality: 90, alphaQuality: 100 } : { quality: 82 })
    .toFile(join(out, `${name}.webp`));
  console.log(`${name}.webp  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)} KB`);
}
