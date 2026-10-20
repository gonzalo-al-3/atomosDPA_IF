// Prepara los assets de MediaPipe que NO se versionan en git (ver .gitignore):
//  - public/mediapipe-wasm/  → copiado desde node_modules/@mediapipe/tasks-vision/wasm
//    (siempre se sincroniza para que coincida con la versión instalada de la librería).
//  - public/models/hand_landmarker.task → descargado una sola vez desde el bucket oficial de MediaPipe.
// Se ejecuta automáticamente antes de `npm run dev` y `npm run build`.
import { copyFile, mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wasmSrc = path.join(root, 'node_modules/@mediapipe/tasks-vision/wasm');
const wasmDest = path.join(root, 'public/mediapipe-wasm');
const modelDest = path.join(root, 'public/models/hand_landmarker.task');
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const exists = (p) => stat(p).then(() => true, () => false);

if (!(await exists(wasmSrc))) {
  console.error('[hand-tracking] Falta node_modules/@mediapipe/tasks-vision. Ejecuta `npm install` primero.');
  process.exit(1);
}

await mkdir(wasmDest, { recursive: true });
const files = await readdir(wasmSrc);
await Promise.all(files.map((f) => copyFile(path.join(wasmSrc, f), path.join(wasmDest, f))));
console.log(`[hand-tracking] WASM sincronizado (${files.length} archivos) → public/mediapipe-wasm/`);

if (await exists(modelDest)) {
  console.log('[hand-tracking] Modelo ya presente: public/models/hand_landmarker.task');
} else {
  console.log('[hand-tracking] Descargando modelo hand_landmarker.task…');
  const res = await fetch(MODEL_URL);
  if (!res.ok) {
    console.error(`[hand-tracking] Falló la descarga (${res.status}). Descárgalo manualmente desde:\n  ${MODEL_URL}\ny guárdalo en public/models/hand_landmarker.task`);
    process.exit(1);
  }
  await mkdir(path.dirname(modelDest), { recursive: true });
  await writeFile(modelDest, Buffer.from(await res.arrayBuffer()));
  console.log('[hand-tracking] Modelo descargado.');
}
