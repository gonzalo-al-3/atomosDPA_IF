import { handStore, LANDMARK_COUNT } from './handStore';

// Gestos: el modelo solo responde mientras la mano está en pellizco ("agarrar").
// - Al agarrar se calibra una referencia (posición de la palma, tamaño de la mano, zoom actual).
// - Arrastrar la palma gira el modelo (como mover una esfera con el mouse).
// - Acercar la mano a la cámara (mano más grande en la imagen) = zoom in; alejarla = zoom out.
//   No se usa la z de los landmarks: es relativa a la muñeca, no profundidad absoluta.
// - Al soltar, el modelo se queda donde está.

// --- Parámetros ajustables (calibrar con ?debug=1) -----------------------------
/** Filtro One Euro: menos minCutoff = más suave en reposo; más beta = menos retardo al moverse. */
const PALM_FILTER = { minCutoff: 1.5, beta: 5 };
const SIZE_FILTER = { minCutoff: 1, beta: 3 };
const PINCH_FILTER = { minCutoff: 2, beta: 5 };
/** Solo para dibujar los landmarks en el recuadro. */
const LANDMARK_FILTER = { minCutoff: 1.5, beta: 5 };
const D_CUTOFF = 1;

/** Histéresis del pellizco sobre pinchRatio (pulgar–índice / tamaño de la mano): agarrar < soltar. */
export const PINCH_GRAB = 0.22;
export const PINCH_RELEASE = 0.34;

/** Límites de escala. */
export const ZOOM_MIN = 0.4;
export const ZOOM_MAX = 3;
/** Sensibilidad: zoom = base · (tamaño/ref)^ZOOM_EXPONENT. */
const ZOOM_EXPONENT = 1.5;
/** Zona muerta sobre ln(tamaño/ref): ignora cambios de tamaño menores a ~5 %. */
const ZOOM_DEADBAND = 0.05;

/** Radianes por cada "altura de imagen" que se arrastra la palma. */
const ROTATION_GAIN = 2 * Math.PI;
/** Zona muerta del arrastre (en alturas de imagen), para que agarrar no gire el modelo. */
const DRAG_DEADBAND = 0.01;

/** Tamaño mínimo de la mano (muñeca–nudillo medio en alturas de imagen) para fiarse de la medida. */
const MIN_HAND_SIZE = 0.03;
/** Segundos sin mano tras los cuales se reinician los filtros. */
const LOST_RESET_S = 0.25;
// -----------------------------------------------------------------------------

export class OneEuro {
  private x = 0;
  private dx = 0;
  private ready = false;
  private readonly minCutoff: number;
  private readonly beta: number;

  constructor({ minCutoff, beta }: { minCutoff: number; beta: number }) {
    this.minCutoff = minCutoff;
    this.beta = beta;
  }

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
    const cutoff = this.minCutoff + this.beta * Math.abs(this.dx);
    this.x += OneEuro.alpha(cutoff, dt) * (value - this.x);
    return this.x;
  }
}

// --- Funciones puras ---------------------------------------------------------

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Resta una zona muerta simétrica sin saltos: |v| <= d → 0. */
export function deadband(v: number, d: number): number {
  const a = Math.abs(v) - d;
  return a > 0 ? Math.sign(v) * a : 0;
}

/** Pellizco con histéresis: agarra por debajo de PINCH_GRAB y suelta por encima de PINCH_RELEASE. */
export function updatePinch(pinching: boolean, ratio: number): boolean {
  return pinching ? ratio <= PINCH_RELEASE : ratio < PINCH_GRAB;
}

/** Zoom a partir de la razón tamaño actual / tamaño al agarrar, con zona muerta y límites. */
export function zoomFromSize(baseZoom: number, size: number, refSize: number): number {
  if (refSize <= 0 || size <= 0) return clamp(baseZoom, ZOOM_MIN, ZOOM_MAX);
  const logRatio = deadband(Math.log(size / refSize), ZOOM_DEADBAND);
  return clamp(baseZoom * Math.exp(ZOOM_EXPONENT * logRatio), ZOOM_MIN, ZOOM_MAX);
}

/**
 * Giro (rad) a partir del arrastre de la palma desde el punto de agarre.
 * x, y en 0..1 de la imagen (x ya espejada); `aspect` = ancho/alto para que ambos ejes giren igual.
 * Mano a la derecha → giro +Y; mano hacia abajo → giro +X (la parte de arriba se acerca).
 */
export function rotationFromDrag(
  startX: number,
  startY: number,
  x: number,
  y: number,
  aspect: number,
): { x: number; y: number } {
  return {
    x: deadband(y - startY, DRAG_DEADBAND) * ROTATION_GAIN,
    y: deadband((x - startX) * aspect, DRAG_DEADBAND) * ROTATION_GAIN,
  };
}

// --- Estado del procesamiento ------------------------------------------------

const landmarkFilters = Array.from({ length: LANDMARK_COUNT * 3 }, () => new OneEuro(LANDMARK_FILTER));
const palmXFilter = new OneEuro(PALM_FILTER);
const palmYFilter = new OneEuro(PALM_FILTER);
const sizeFilter = new OneEuro(SIZE_FILTER);
const pinchFilter = new OneEuro(PINCH_FILTER);

let lastTime = 0;
let lostSince = 0;
/** Zoom en el momento de agarrar. */
let zoomBase = 1;

export function resetFilters() {
  lostSince = 0;
  for (const f of landmarkFilters) f.reset();
  palmXFilter.reset();
  palmYFilter.reset();
  sizeFilter.reset();
  pinchFilter.reset();
  lastTime = 0;
}

function release() {
  handStore.pinching = false;
  handStore.rotationDelta.x = 0;
  handStore.rotationDelta.y = 0;
}

/**
 * Procesa un frame con mano: filtra las señales (palma, tamaño, pinch) y, si hay agarre,
 * calcula rotationDelta (rad desde el agarre) y zoomLevel. `aspect` = ancho/alto del video.
 */
export function processHandFrame(now: number, aspect: number) {
  const dt = lastTime ? Math.max((now - lastTime) / 1000, 1e-3) : 1 / 30;
  lastTime = now;
  lostSince = 0;

  const raw = handStore.landmarks;
  const s = handStore.smoothLandmarks;
  for (let i = 0; i < raw.length; i++) s[i] = landmarkFilters[i].filter(raw[i], dt);

  // Las señales se calculan con los landmarks crudos y se filtran una sola vez.
  const dist = (a: number, b: number) =>
    Math.hypot((raw[a * 3] - raw[b * 3]) * aspect, raw[a * 3 + 1] - raw[b * 3 + 1]);

  // Palma: media de muñeca (0) y bases de índice (5) y meñique (17). x espejada.
  handStore.palmX = palmXFilter.filter(1 - (raw[0] + raw[5 * 3] + raw[17 * 3]) / 3, dt);
  handStore.palmY = palmYFilter.filter((raw[1] + raw[5 * 3 + 1] + raw[17 * 3 + 1]) / 3, dt);

  // Tamaño aparente: muñeca (0) → nudillo medio (9), en alturas de imagen.
  const rawSize = dist(0, 9);
  if (rawSize < MIN_HAND_SIZE) {
    release();
    return;
  }
  const size = sizeFilter.filter(rawSize, dt);
  handStore.handSize = size;
  handStore.pinchRatio = pinchFilter.filter(dist(4, 8) / rawSize, dt);

  const wasGrabbing = handStore.pinching;
  const grabbing = updatePinch(wasGrabbing, handStore.pinchRatio);

  if (grabbing && !wasGrabbing) {
    // Calibración al empezar a agarrar.
    handStore.grabStartX = handStore.palmX;
    handStore.grabStartY = handStore.palmY;
    handStore.grabRefSize = size;
    zoomBase = handStore.zoomLevel;
    handStore.grabId++;
  }

  if (!grabbing) {
    release();
    return;
  }
  handStore.pinching = true;
  handStore.sizeRatio = size / handStore.grabRefSize;
  handStore.zoomLevel = zoomFromSize(zoomBase, size, handStore.grabRefSize);
  const rot = rotationFromDrag(handStore.grabStartX, handStore.grabStartY, handStore.palmX, handStore.palmY, aspect);
  handStore.rotationDelta.x = rot.x;
  handStore.rotationDelta.y = rot.y;
}

/** Se llama en frames sin mano: suelta el agarre (el modelo se queda donde está). */
export function processHandLost(now: number) {
  release();
  if (!lostSince) lostSince = now;
  else if ((now - lostSince) / 1000 > LOST_RESET_S) resetFilters();
}
