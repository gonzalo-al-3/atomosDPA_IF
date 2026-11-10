// Prepara <model-viewer> (Realidad Aumentada), que NO se versiona en git (ver .gitignore):
//  - public/vendor/model-viewer-<versión>.min.js → build precompilado y autocontenido (trae su
//    propio three.js), descargado una sola vez y verificado con SHA-256.
// Se sirve desde nuestro sitio (no desde un CDN en runtime) y la app lo carga con import()
// solo cuando hace falta (ver src/components/UI/loadModelViewer.ts).
// No se instala con npm porque su peerDependency de three.js no es compatible con la del proyecto.
// Se ejecuta automáticamente antes de `npm run dev` y `npm run build`.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const VERSION = '4.0.0';
const SHA256 = '774edda21e1be2a0934e460ca5943af1fe3f88da130a9f98bd6a9d611576cacf';
const SOURCES = [
  `https://cdn.jsdelivr.net/npm/@google/model-viewer@${VERSION}/dist/model-viewer.min.js`,
  `https://ajax.googleapis.com/ajax/libs/model-viewer/${VERSION}/model-viewer.min.js`,
];

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dest = path.join(root, `public/vendor/model-viewer-${VERSION}.min.js`);

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

const current = await readFile(dest).catch(() => null);
if (current && sha256(current) === SHA256) {
  console.log(`[model-viewer] Ya presente: public/vendor/model-viewer-${VERSION}.min.js`);
  process.exit(0);
}

for (const url of SOURCES) {
  console.log(`[model-viewer] Descargando ${url}…`);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (sha256(buf) !== SHA256) throw new Error('el SHA-256 no coincide');
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, buf);
    console.log('[model-viewer] Descargado y verificado.');
    process.exit(0);
  } catch (err) {
    console.warn(`[model-viewer] Falló (${err.message}).`);
  }
}

console.error(
  `[model-viewer] No se pudo obtener model-viewer ${VERSION}. Descárgalo manualmente desde:\n  ${SOURCES[0]}\n` +
    `y guárdalo en public/vendor/model-viewer-${VERSION}.min.js`,
);
process.exit(1);
