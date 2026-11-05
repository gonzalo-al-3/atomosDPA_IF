# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"¡Átomos a la vista!" — interactive 3D/AR viewer of atomic and molecular systems for the IF-UNAM Día de Puertas Abiertas 2026. The README (in Spanish) is mostly contributor workflow (fork → branch → PR; never work on `main`). El visor usa React Three Fiber + drei (`src/components/Scene/MoleculeViewer.tsx`, `OrbitControls`) y carga los GLB del catálogo `src/data/modelsData.json` (las rutas se normalizan con `BASE_URL` en `App.tsx`).

## Commands

- `npm run dev` — Vite dev server (http://localhost:5173/atomosDPA_IF/ because of `base`)
- `npm run build` — `tsc -b && vite build` (type-check is part of the build)
- `npm run lint` — ESLint (flat config in `eslint.config.js`)
- `npm run preview` — serve the production build
- `npm test` — Vitest (jsdom; config en `vite.config.ts`, setup en `src/test/setup.ts`). También corre en CI antes del build.
- Depuración en el navegador: `?debug=1` muestra fps del render, Hz/ms de detección, delegado GPU/CPU y los valores de los gestos (tecla D lo oculta).

## Architecture / gotchas

- React 19 + TypeScript + Vite; TS config is split into `tsconfig.app.json` (src) and `tsconfig.node.json` (vite config).
- `vite.config.ts` sets `base: '/atomosDPA_IF/'` — must match the GitHub repo name, or deployed asset paths break. Account for it when referencing files in `public/` (use `import.meta.env.BASE_URL`, not absolute `/...`).
- Deploy: pushing to `main` triggers `.github/workflows/deploy.yml` (Node 20, `npm ci`, `npm test`, `npm run build`, GitHub Pages). Keep `package-lock.json` in sync with `package.json`.
- Hand tracking: `@mediapipe/tasks-vision`. Los assets (`public/mediapipe-wasm/` y `public/models/hand_landmarker.task`) NO están en git; los genera `npm run setup:hand-tracking` (copia el WASM desde `node_modules` y descarga el modelo si falta). Corre solo antes de `dev` y `build` (`predev`/`prebuild`), también en CI. Se sirven desde `public/` con `BASE_URL`, nunca desde CDN en runtime.
- Arquitectura de gestos: `useHandTracking` (se usa una vez, en `App`) maneja el modo `off | gestures | gestures+camera` (`handMode.ts`, lógica pura), un solo `getUserMedia` y un video de detección propio; el recuadro (`HandTrackingPanel`) muestra el mismo stream vía `attachPreview`. `landmarkerSingleton.ts` garantiza una sola instancia del `HandLandmarker` (conteo de usuarios, `close()` al liberar). Detección limitada a ~30 Hz → `handStore` (store mutable fuera de React) → `handProcessing` (agarre = pellizco con histéresis; arrastre de la palma → `rotationDelta` en rad desde el agarre; tamaño muñeca–nudillo medio / referencia → `zoomLevel`; One Euro) → `HandGestureGroup` lo aplica con cuaterniones en `useFrame`. Con gestos activos `OrbitControls` está `enabled={false}`; Esc apaga los gestos. Los valores a calibrar están como constantes al inicio de `handProcessing.ts`.
- Styling: estilos inline (paleta slate/sky) en los componentes; `App.css` es residuo de la plantilla de Vite (`index.css.bkp` is a backup, ignore it).

## Reglas no negociables
- El render 3D no puede perder fps. Datos de alta frecuencia NUNCA en estado de React.
- Modelo y WASM de MediaPipe se sirven desde public/, nunca desde CDN.
- Rutas de assets con import.meta.env.BASE_URL (deploy en subdirectorio de GitHub Pages).
- La cámara se activa solo con un botón explícito, nunca al cargar la página.
- Los landmarks de mano NO van en estado de React: se escriben en un ref/store transitorio y el visor los lee dentro de su `useFrame`.
- Al apagar la cámara, detener los tracks del `MediaStream` (el LED debe apagarse) y llamar `handLandmarker.close()` al desmontar.
