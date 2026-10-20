import { handStore, LANDMARK_COUNT } from './handStore';

// --- Parámetros ajustables ---------------------------------------------------
/** Filtro One Euro: menos minCutoff = más suave en reposo; más beta = menos retardo al moverse. */
const MIN_CUTOFF = 1.5;
const BETA = 5;
const D_CUTOFF = 1;

/** Histéresis del pellizco sobre pinchRatio (cerrar < abrir). */
const PINCH_CLOSE = 0.22;
const PINCH_OPEN = 0.34;
/** Rango de pinchRatio que se mapea a zoom. */
const PINCH_RATIO_MIN = 0.2;
const PINCH_RATIO_MAX = 1.0;

export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 2;

/** Zona muerta alrededor del centro (fracción de imagen) y ganancia (rad/s a medio recorrido). */
const DEAD_ZONE = 0.08;
const ROTATION_GAIN = 4;

/** Segundos sin mano tras los cuales se reinician los filtros. */
const LOST_RESET_S = 0.25;
// -----------------------------------------------------------------------------

class OneEuro {
  private x = 0;
  private dx = 0;
  private ready = false;

  private static alpha(cutoff: number, dt: number) {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }

  reset() {
    this.ready = false;
  }

  filter(value: number, dt: number): number {
    if (!this.ready) {
      this.ready = true;
      this.x = value;
      this.dx = 0;
      return value;
    }
    const rawDx = (value - this.x) / dt;
    this.dx += OneEuro.alpha(D_CUTOFF, dt) * (rawDx - this.dx);
    const cutoff = MIN_CUTOFF + BETA * Math.abs(this.dx);
    this.x += OneEuro.alpha(cutoff, dt) * (value - this.x);
    return this.x;
  }
}

const landmarkFilters = Array.from({ length: LANDMARK_COUNT * 3 }, () => new OneEuro());
const palmXFilter = new OneEuro();
const palmYFilter = new OneEuro();
const pinchFilter = new OneEuro();
const sizeFilter = new OneEuro();

let lastTime = 0;
let lostSince = 0;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function resetFilters() {
  lostSince = 0;
  for (const f of landmarkFilters) f.reset();
  palmXFilter.reset();
  palmYFilter.reset();
  pinchFilter.reset();
  sizeFilter.reset();
  lastTime = 0;
}

/** Aplica zona muerta y reescala el resto a -1..1. */
function deadZone(v: number) {
  const a = Math.abs(v);
  if (a <= DEAD_ZONE) return 0;
  return Math.sign(v) * Math.min(1, (a - DEAD_ZONE) / (0.5 - DEAD_ZONE));
}

/**
 * Procesa un frame con mano: suaviza y calcula palma, pinch, rotationDelta y zoomLevel.
 * `aspect` = ancho/alto del video, para medir distancias sin deformar x.
 */
export function processHandFrame(now: number, aspect: number) {
  const dt = lastTime ? Math.max((now - lastTime) / 1000, 1e-3) : 1 / 30;
  lastTime = now;
  lostSince = 0;

  const raw = handStore.landmarks;
  const s = handStore.smoothLandmarks;
  for (let i = 0; i < raw.length; i++) s[i] = landmarkFilters[i].filter(raw[i], dt);

  const dist = (a: number, b: number) =>
    Math.hypot((s[a * 3] - s[b * 3]) * aspect, s[a * 3 + 1] - s[b * 3 + 1]);

  // Palma: media de muñeca (0) y bases de índice (5) y meñique (17). x espejada.
  const px = 1 - (s[0] + s[5 * 3] + s[17 * 3]) / 3;
  const py = (s[1] + s[5 * 3 + 1] + s[17 * 3 + 1]) / 3;
  handStore.palmX = palmXFilter.filter(px, dt);
  handStore.palmY = palmYFilter.filter(py, dt);

  const size = sizeFilter.filter(dist(0, 9), dt);
  handStore.handSize = size;
  const ratio = size > 1e-3 ? pinchFilter.filter(dist(4, 8) / size, dt) : handStore.pinchRatio;
  handStore.pinchRatio = ratio;

  // Histéresis
  if (handStore.pinching) {
    if (ratio > PINCH_OPEN) handStore.pinching = false;
  } else if (ratio < PINCH_CLOSE) {
    handStore.pinching = true;
  }

  // Zoom: pinchRatio → escala exponencial; pellizco cerrado fija el mínimo.
  const t = clamp((ratio - PINCH_RATIO_MIN) / (PINCH_RATIO_MAX - PINCH_RATIO_MIN), 0, 1);
  handStore.zoomLevel = handStore.pinching
    ? ZOOM_MIN
    : ZOOM_MIN * Math.pow(ZOOM_MAX / ZOOM_MIN, t);

  // Rotación: palma respecto al centro como velocidad angular; sin giro mientras se pellizca.
  if (handStore.pinching) {
    handStore.rotationDelta.x = 0;
    handStore.rotationDelta.y = 0;
  } else {
    handStore.rotationDelta.y = deadZone(handStore.palmX - 0.5) * ROTATION_GAIN;
    handStore.rotationDelta.x = deadZone(handStore.palmY - 0.5) * ROTATION_GAIN;
  }
}

/** Se llama en frames sin mano. */
export function processHandLost(now: number) {
  handStore.rotationDelta.x = 0;
  handStore.rotationDelta.y = 0;
  handStore.pinching = false;
  if (!lostSince) lostSince = now;
  else if ((now - lostSince) / 1000 > LOST_RESET_S) resetFilters();
}
