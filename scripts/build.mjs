import { copyFile, mkdir, readdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'dist');
await rm(output, { recursive: true, force: true });
await mkdir(output);

const files = await readdir(root);
for (const name of files) {
  if (/^[a-z0-9-]+\.(html|css|js)$/i.test(name)) {
    await copyFile(join(root, name), join(output, name));
  }
}
console.log(`Built ${output}`);
