import { copyFile, mkdir, readdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'dist');

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

// Match any top-level static asset (html/css/js/images/fonts)
const STATIC_EXT = /\.(html|css|js|mjs|png|jpg|jpeg|webp|svg|gif|ico|json|txt|map|woff2?|ttf)$/i;

const files = await readdir(root);
const copied = [];

for (const name of files) {
  if (name.startsWith('.')) continue;
  if (!STATIC_EXT.test(name)) continue;
  try {
    await copyFile(join(root, name), join(output, name));
    copied.push(name);
  } catch (err) {
    console.warn(`Skip ${name}:`, err.message);
  }
}

// Required pages — fail the build if missing so Netlify shows a clear error
const required = ['index.html', 'premium.html', 'styles.css', 'main.js'];
const missing = required.filter((f) => !copied.includes(f));
if (missing.length) {
  console.error('BUILD FAILED — missing required files:', missing.join(', '));
  console.error('Files found in root:', files.join(', '));
  process.exit(1);
}

console.log(`Built ${output}`);
console.log(`Copied ${copied.length} files:`, copied.sort().join(', '));
console.log('OK: premium.html and index.html included in dist/');
