import { handStore, LANDMARK_COUNT } from './handStore';

// Gestos:
// - Mano ABIERTA moviéndose: gira la molécula sobre su centro, siguiendo a la mano
//   (gira lo que la mano se mueve y se detiene cuando la mano se detiene).
//   Cerca de los bordes de la imagen el giro se ignora, para que la mano al salir no la haga girar.
// - PUÑO cerrado (agarre): mover la mano desplaza el centro de la molécula; acercar la mano a la
//   cámara (mano más grande en la imagen) = zoom in, alejarla = zoom out.
//   No se usa la z de los landmarks: es relativa a la muñeca, no profundidad absoluta.
// - Al soltar o perder la mano, la molécula se queda donde está.

// --- Parámetros ajustables (calibrar con ?debug=1) -----------------------------
/** Filtro One Euro: menos minCutoff = más suave en reposo; más beta = menos retardo al moverse. */
const PALM_FILTER = { minCutoff: 1.5, beta: 5 };
const SIZE_FILTER = { minCutoff: 1, beta: 3 };
const CURL_FILTER = { minCutoff: 2, beta: 5 };
/** Solo para dibujar los landmarks en el recuadro. */
const LANDMARK_FILTER = { minCutoff: 1.5, beta: 5 };
const D_CUTOFF = 1;

/** Histéresis del puño sobre curlRatio: agarra por debajo de FIST_GRAB, suelta por encima de FIST_RELEASE. */
export const FIST_GRAB = 1.2;
export const FIST_RELEASE = 1.45;

/** Límites de escala. */
export const ZOOM_MIN = 0.4;
export const ZOOM_MAX = 3;
/** Sensibilidad: zoom = base · (tamaño/ref)^ZOOM_EXPONENT. */
const ZOOM_EXPONENT = 1.5;
/** Zona muerta sobre ln(tamaño/ref): ignora cambios de tamaño menores a ~5 %. */
const ZOOM_DEADBAND = 0.05;

/** Radianes por cada "altura de imagen" que se mueve la mano abierta. */
const ROTATION_GAIN = 2 * Math.PI;
/** Movimiento mínimo por detección (alturas de imagen) para girar: filtra el temblor. */
const ROTATION_STEP_DEADBAND = 0.002;
/** Saltos mayores entre detecciones se descartan (mano perdida y reencontrada, error de detección). */
const MAX_ROTATION_STEP = 0.15;
/** Franja junto a los bordes de la imagen (fracción) donde se ignora el giro. */
export const EDGE_MARGIN = 0.08;

/** Zona muerta del arrastre con el puño (alturas de imagen), para que cerrar la mano no la mueva. */
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

/** Puño con histéresis: agarra por debajo de FIST_GRAB y suelta por encima de FIST_RELEASE. */
export function updateFist(grabbing: boolean, curl: number): boolean {
  return grabbing ? curl <= FIST_RELEASE : curl < FIST_GRAB;
}

/** true si el punto (0..1) está en la franja de los bordes donde el seguimiento no es fiable. */
export function isNearEdge(x: number, y: number, margin = EDGE_MARGIN): boolean {
  return x < margin || x > 1 - margin || y < margin || y > 1 - margin;
}

/**
 * Giro (rad) por el movimiento de la mano abierta entre dos detecciones.
 * x, y en 0..1 de la imagen (x ya espejada); `aspect` = ancho/alto para que ambos ejes giren igual.
 * Mano a la derecha → giro +y; mano hacia abajo → giro +x. Saltos grandes se descartan.
 */
export function rotationStep(
  prevX: number,
  prevY: number,
  x: number,
  y: number,
  aspect: number,
): { x: number; y: number } {
  const dx = (x - prevX) * aspect;
  const dy = y - prevY;
  if (Math.hypot(dx, dy) > MAX_ROTATION_STEP) return { x: 0, y: 0 };
  return {
    x: deadband(dy, ROTATION_STEP_DEADBAND) * ROTATION_GAIN,
    y: deadband(dx, ROTATION_STEP_DEADBAND) * ROTATION_GAIN,
  };
}

/** Desplazamiento de la palma desde el punto de agarre, en alturas de imagen, con zona muerta. */
export function dragFromStart(
  startX: number,
  startY: number,
  x: number,
  y: number,
  aspect: number,
): { x: number; y: number } {
  return {
    x: deadband((x - startX) * aspect, DRAG_DEADBAND),
    y: deadband(y - startY, DRAG_DEADBAND),
  };
}

/** Zoom a partir de la razón tamaño actual / tamaño al agarrar, con zona muerta y límites. */
export function zoomFromSize(baseZoom: number, size: number, refSize: number): number {
  if (refSize <= 0 || size <= 0) return clamp(baseZoom, ZOOM_MIN, ZOOM_MAX);
  const logRatio = deadband(Math.log(size / refSize), ZOOM_DEADBAND);
  return clamp(baseZoom * Math.exp(ZOOM_EXPONENT * logRatio), ZOOM_MIN, ZOOM_MAX);
}

// --- Estado del procesamiento ------------------------------------------------

const landmarkFilters = Array.from({ length: LANDMARK_COUNT * 3 }, () => new OneEuro(LANDMARK_FILTER));
const palmXFilter = new OneEuro(PALM_FILTER);
const palmYFilter = new OneEuro(PALM_FILTER);
const sizeFilter = new OneEuro(SIZE_FILTER);
const curlFilter = new OneEuro(CURL_FILTER);

let lastTime = 0;
let lostSince = 0;
/** Zoom en el momento de agarrar. */
let zoomBase = 1;
/** Palma en la detección anterior con la mano abierta (referencia del giro). */
let prevPalm: { x: number; y: number } | null = null;

const FINGER_TIPS = [8, 12, 16, 20];

export function resetFilters() {
  lostSince = 0;
  for (const f of landmarkFilters) f.reset();
  palmXFilter.reset();
  palmYFilter.reset();
  sizeFilter.reset();
  curlFilter.reset();
  lastTime = 0;
  prevPalm = null;
}

function endGrab() {
  handStore.grabbing = false;
  handStore.dragOffset.x = 0;
  handStore.dragOffset.y = 0;
}

/** Suelta el agarre y olvida la referencia del giro (la próxima detección no produce salto). */
function release() {
  endGrab();
  prevPalm = null;
}

/**
 * Procesa un frame con mano: filtra las señales (palma, tamaño, puño) y calcula el giro con la
 * mano abierta o el arrastre y el zoom con el puño. `aspect` = ancho/alto del video.
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

  // Palma: media de muñeca (0) y bases de índice (5) y meñique (17); casi no se mueve al cerrar
  // el puño. x espejada.
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

  // Puño: las puntas de los dedos se acercan a la muñeca.
  let tips = 0;
  for (const tip of FINGER_TIPS) tips += dist(tip, 0);
  handStore.curlRatio = curlFilter.filter(tips / FINGER_TIPS.length / rawSize, dt);

  const wasGrabbing = handStore.grabbing;
  const grabbing = updateFist(wasGrabbing, handStore.curlRatio);

  if (grabbing) {
    if (!wasGrabbing) {
      // Calibración al empezar a agarrar.
      handStore.grabStartX = handStore.palmX;
      handStore.grabStartY = handStore.palmY;
      handStore.grabRefSize = size;
      zoomBase = handStore.zoomLevel;
      handStore.grabId++;
      prevPalm = null;
    }
    handStore.grabbing = true;
    handStore.sizeRatio = size / handStore.grabRefSize;
    handStore.zoomLevel = zoomFromSize(zoomBase, size, handStore.grabRefSize);
    const drag = dragFromStart(handStore.grabStartX, handStore.grabStartY, handStore.palmX, handStore.palmY, aspect);
    handStore.dragOffset.x = drag.x;
    handStore.dragOffset.y = drag.y;
    return;
  }

  // Durante el agarre prevPalm es null, así que al soltar el giro empieza sin salto.
  endGrab();

  // Giro solo con la mano claramente abierta (no mientras se cierra) y lejos de los bordes.
  if (handStore.curlRatio < FIST_RELEASE || isNearEdge(handStore.palmX, handStore.palmY)) {
    prevPalm = null;
    return;
  }
  const palm = { x: handStore.palmX, y: handStore.palmY };
  if (prevPalm) {
    const step = rotationStep(prevPalm.x, prevPalm.y, palm.x, palm.y, aspect);
    handStore.rotationAccum.x += step.x;
    handStore.rotationAccum.y += step.y;
  }
  prevPalm = palm;
}

/** Se llama en frames sin mano: suelta el agarre (la molécula se queda donde está). */
export function processHandLost(now: number) {
  release();
  // Si la mano reaparece en otro lugar, la palma no debe "deslizarse" desde la posición vieja
  // (ese deslizamiento se leería como giro).
  palmXFilter.reset();
  palmYFilter.reset();
  if (!lostSince) lostSince = now;
  else if ((now - lostSince) / 1000 > LOST_RESET_S) resetFilters();
}
