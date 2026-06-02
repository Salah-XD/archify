// Rasterize assets/icon.svg → public/icon/{16,32,48,128}.png for the extension manifest,
// and a 128 store icon. Run: node scripts/gen-icons.mjs  (requires `sharp`, a devDependency).
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'assets', 'icon.svg');
const outDir = join(root, 'src', 'public', 'icon'); // WXT publicDir is <srcDir>/public
mkdirSync(outDir, { recursive: true });

const sizes = [16, 32, 48, 128];
await Promise.all(
  sizes.map((s) =>
    sharp(src, { density: 384 }).resize(s, s).png().toFile(join(outDir, `${s}.png`)),
  ),
);
console.log(`generated ${sizes.map((s) => `${s}.png`).join(', ')} in public/icon/`);
