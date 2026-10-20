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
- Hand tracking (branch `feat/hand-tracking`): uses `@mediapipe/tasks-vision`. The WASM runtime is self-hosted in `public/mediapipe-wasm/` and the model in `public/models/hand_landmarker.task` (no CDN), so load them via `BASE_URL`-prefixed paths. These are large binaries; the directories are currently untracked.
- Styling is inline styles in `App.tsx` plus `App.css`/`index.css` (`index.css.bkp` is a backup, ignore it).

## Reglas no negociables
- El render 3D no puede perder fps. Datos de alta frecuencia NUNCA en estado de React.
- Modelo y WASM de MediaPipe se sirven desde public/, nunca desde CDN.
- Rutas de assets con import.meta.env.BASE_URL (deploy en subdirectorio de GitHub Pages).
- La cámara se activa solo con un botón explícito, nunca al cargar la página.
