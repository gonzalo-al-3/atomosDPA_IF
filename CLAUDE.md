# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"¡Átomos a la vista!" — interactive 3D/AR viewer of atomic and molecular systems for the IF-UNAM Día de Puertas Abiertas 2026. The README (in Spanish) is mostly contributor workflow (fork → branch → PR; never work on `main`). README mentions Three.js / React Three Fiber, but they are not yet dependencies; `src/App.tsx` is currently a UI shell with a placeholder 3D viewport and a hardcoded `MOLECULE_DATA` list.

## Commands

- `npm run dev` — Vite dev server (http://localhost:5173/atomosDPA_IF/ because of `base`)
- `npm run build` — `tsc -b && vite build` (type-check is part of the build)
- `npm run lint` — ESLint (flat config in `eslint.config.js`)
- `npm run preview` — serve the production build
- No test runner is configured.

## Architecture / gotchas

- React 19 + TypeScript + Vite; TS config is split into `tsconfig.app.json` (src) and `tsconfig.node.json` (vite config).
- `vite.config.ts` sets `base: '/atomosDPA_IF/'` — must match the GitHub repo name, or deployed asset paths break. Account for it when referencing files in `public/` (use `import.meta.env.BASE_URL`, not absolute `/...`).
- Deploy: pushing to `main` triggers `.github/workflows/deploy.yml` (Node 20, `npm ci`, `npm run build`, GitHub Pages). Keep `package-lock.json` in sync with `package.json`.
- Hand tracking: `@mediapipe/tasks-vision`. Los assets (`public/mediapipe-wasm/` y `public/models/hand_landmarker.task`) NO están en git; los genera `npm run setup:hand-tracking` (copia el WASM desde `node_modules` y descarga el modelo si falta). Corre solo antes de `dev` y `build` (`predev`/`prebuild`), también en CI. Se sirven desde `public/` con `BASE_URL`, nunca desde CDN en runtime.
- Arquitectura de gestos: `useHandTracking` (cámara + detección) → `handStore` (store mutable fuera de React) → `handProcessing` (One Euro, pinch, `rotationDelta`/`zoomLevel`) → `HandGestureGroup` los lee en `useFrame`. Los valores a calibrar están como constantes al inicio de `handProcessing.ts`.
- Styling is inline styles in `App.tsx` plus `App.css`/`index.css` (`index.css.bkp` is a backup, ignore it).

## Reglas no negociables
- El render 3D no puede perder fps. Datos de alta frecuencia NUNCA en estado de React.
- Modelo y WASM de MediaPipe se sirven desde public/, nunca desde CDN.
- Rutas de assets con import.meta.env.BASE_URL (deploy en subdirectorio de GitHub Pages).
- La cámara se activa solo con un botón explícito, nunca al cargar la página.
- Los landmarks de mano NO van en estado de React: se escriben en un ref/store transitorio y el visor los lee dentro de su `useFrame`.
- Al apagar la cámara, detener los tracks del `MediaStream` (el LED debe apagarse) y llamar `handLandmarker.close()` al desmontar.
