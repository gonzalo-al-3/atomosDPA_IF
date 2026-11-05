import { describe, it, expect, beforeEach } from 'vitest';
import {
  OneEuro,
  PINCH_GRAB,
  PINCH_RELEASE,
  ZOOM_MAX,
  ZOOM_MIN,
  deadband,
  processHandFrame,
  processHandLost,
  resetFilters,
  rotationFromDrag,
  updatePinch,
  zoomFromSize,
} from '../handProcessing';
import { handStore, resetHandStore } from '../handStore';

describe('deadband', () => {
  it('anula valores dentro de la zona muerta y resta el umbral fuera de ella', () => {
    expect(deadband(0.03, 0.05)).toBe(0);
    expect(deadband(-0.05, 0.05)).toBe(0);
    expect(deadband(0.1, 0.05)).toBeCloseTo(0.05);
    expect(deadband(-0.1, 0.05)).toBeCloseTo(-0.05);
  });
});

describe('updatePinch (histéresis)', () => {
  it('agarra solo por debajo del umbral de agarre', () => {
    expect(updatePinch(false, PINCH_GRAB - 0.01)).toBe(true);
    expect(updatePinch(false, PINCH_GRAB + 0.01)).toBe(false);
  });

  it('entre los dos umbrales conserva el estado anterior (no parpadea)', () => {
    const between = (PINCH_GRAB + PINCH_RELEASE) / 2;
    expect(updatePinch(true, between)).toBe(true);
    expect(updatePinch(false, between)).toBe(false);
  });

  it('suelta solo por encima del umbral de soltar', () => {
    expect(updatePinch(true, PINCH_RELEASE + 0.01)).toBe(false);
    expect(updatePinch(true, PINCH_RELEASE)).toBe(true);
  });
});

describe('zoomFromSize', () => {
  it('sin cambio de tamaño conserva el zoom base', () => {
    expect(zoomFromSize(1, 0.2, 0.2)).toBeCloseTo(1);
    expect(zoomFromSize(1.5, 0.2, 0.2)).toBeCloseTo(1.5);
  });

  it('ignora cambios pequeños (zona muerta)', () => {
    expect(zoomFromSize(1, 0.204, 0.2)).toBeCloseTo(1);
    expect(zoomFromSize(1, 0.196, 0.2)).toBeCloseTo(1);
  });

  it('mano más cerca (más grande) = zoom in; más lejos = zoom out', () => {
    expect(zoomFromSize(1, 0.3, 0.2)).toBeGreaterThan(1);
    expect(zoomFromSize(1, 0.15, 0.2)).toBeLessThan(1);
  });

  it('es monótono con el tamaño', () => {
    const sizes = [0.1, 0.15, 0.2, 0.25, 0.3, 0.4];
    const zooms = sizes.map((s) => zoomFromSize(1, s, 0.2));
    for (let i = 1; i < zooms.length; i++) expect(zooms[i]).toBeGreaterThanOrEqual(zooms[i - 1]);
  });

  it('respeta los límites', () => {
    expect(zoomFromSize(1, 10, 0.2)).toBe(ZOOM_MAX);
    expect(zoomFromSize(1, 0.001, 0.2)).toBe(ZOOM_MIN);
    expect(zoomFromSize(10, 0.2, 0)).toBe(ZOOM_MAX);
  });
});

describe('rotationFromDrag', () => {
  it('sin arrastre no gira', () => {
    const r = rotationFromDrag(0.5, 0.5, 0.5, 0.5, 4 / 3);
    expect(r.x).toBe(0);
    expect(r.y).toBe(0);
  });

  it('mover a la derecha gira +Y y bajar gira +X', () => {
    expect(rotationFromDrag(0.5, 0.5, 0.7, 0.5, 1).y).toBeGreaterThan(0);
    expect(rotationFromDrag(0.5, 0.5, 0.3, 0.5, 1).y).toBeLessThan(0);
    expect(rotationFromDrag(0.5, 0.5, 0.5, 0.7, 1).x).toBeGreaterThan(0);
  });

  it('corrige la proporción del video para que ambos ejes giren igual', () => {
    // 0.1 de ancho con aspect 2 = 0.2 alturas de imagen, igual que 0.2 en vertical.
    const r = rotationFromDrag(0.5, 0.5, 0.6, 0.7, 2);
    expect(r.y).toBeCloseTo(r.x);
  });
});

describe('OneEuro', () => {
  it('devuelve el primer valor tal cual y converge a una señal constante', () => {
    const f = new OneEuro({ minCutoff: 1, beta: 0 });
    expect(f.filter(1, 1 / 30)).toBe(1);
    let v = 0;
    for (let i = 0; i < 120; i++) v = f.filter(2, 1 / 30);
    expect(v).toBeCloseTo(2, 3);
  });

  it('suaviza un salto (no lo sigue en un solo frame)', () => {
    const f = new OneEuro({ minCutoff: 1, beta: 0 });
    f.filter(0, 1 / 30);
    const v = f.filter(1, 1 / 30);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(1);
  });
});

// --- Integración: processHandFrame con una mano sintética ----------------------

interface SyntheticHand {
  /** Centro de la palma en coordenadas de imagen (sin espejar). */
  x: number;
  y: number;
  /** Distancia muñeca (0) → nudillo medio (9). */
  size: number;
  /** pinchRatio deseado (pulgar–índice / size). */
  pinch: number;
}

/** Escribe 21 landmarks con la palma en (x, y), tamaño y pellizco dados (aspect = 1). */
function setHand({ x, y, size, pinch }: SyntheticHand) {
  const lm = handStore.landmarks;
  const put = (i: number, px: number, py: number) => {
    lm[i * 3] = px;
    lm[i * 3 + 1] = py;
    lm[i * 3 + 2] = 0;
  };
  for (let i = 0; i < 21; i++) put(i, x, y);
  // Palma = media de 0, 5 y 17 → queda en (x, y) sea cual sea el tamaño.
  put(0, x, y + size / 2);
  put(9, x, y - size / 2);
  put(5, x, y - size / 4);
  put(17, x, y - size / 4);
  put(4, x - (pinch * size) / 2, y);
  put(8, x + (pinch * size) / 2, y);
  handStore.present = true;
}

let now = 0;
/** Simula `frames` detecciones a 30 Hz con la misma mano (deja converger los filtros). */
function run(hand: SyntheticHand, frames = 60) {
  for (let i = 0; i < frames; i++) {
    now += 1000 / 30;
    setHand(hand);
    processHandFrame(now, 1);
  }
}

describe('processHandFrame (gestos completos)', () => {
  const open = { x: 0.5, y: 0.5, size: 0.2, pinch: 0.8 };
  const grab = { ...open, pinch: 0.1 };

  beforeEach(() => {
    resetHandStore();
    resetFilters();
    now = 1000;
  });

  it('con la mano abierta no hay agarre ni giro y el zoom no cambia', () => {
    run(open);
    expect(handStore.pinching).toBe(false);
    expect(handStore.rotationDelta).toEqual({ x: 0, y: 0 });
    expect(handStore.zoomLevel).toBe(1);
  });

  it('acercar o mover la mano sin pellizco no afecta al modelo', () => {
    run(open);
    run({ ...open, size: 0.35, x: 0.3 });
    expect(handStore.zoomLevel).toBe(1);
    expect(handStore.rotationDelta).toEqual({ x: 0, y: 0 });
  });

  it('al agarrar calibra la referencia (tamaño y palma)', () => {
    run(open);
    const grabId = handStore.grabId;
    run(grab);
    expect(handStore.pinching).toBe(true);
    expect(handStore.grabId).toBe(grabId + 1);
    expect(handStore.grabRefSize).toBeCloseTo(0.2, 2);
    expect(handStore.grabStartX).toBeCloseTo(0.5, 2);
    expect(handStore.rotationDelta.x).toBeCloseTo(0, 5);
    expect(handStore.rotationDelta.y).toBeCloseTo(0, 5);
  });

  it('acercar la mano agarrada hace zoom in y alejarla zoom out', () => {
    run(grab);
    run({ ...grab, size: 0.3 });
    expect(handStore.zoomLevel).toBeGreaterThan(1.3);
    expect(handStore.sizeRatio).toBeCloseTo(1.5, 1);
    run({ ...grab, size: 0.12 });
    expect(handStore.zoomLevel).toBeLessThan(1);
  });

  it('arrastrar la mano agarrada gira el modelo (x espejada)', () => {
    run(grab);
    // En la imagen la mano va a la izquierda = a la derecha del usuario (vista espejo).
    run({ ...grab, x: 0.35 });
    expect(handStore.rotationDelta.y).toBeGreaterThan(0.5);
    run({ ...grab, x: 0.5, y: 0.65 });
    expect(handStore.rotationDelta.x).toBeGreaterThan(0.5);
  });

  it('al soltar el zoom se conserva y el siguiente agarre parte de él', () => {
    run(grab);
    run({ ...grab, size: 0.3 });
    const zoom = handStore.zoomLevel;
    run({ ...open, size: 0.3 });
    expect(handStore.pinching).toBe(false);
    expect(handStore.zoomLevel).toBe(zoom);
    expect(handStore.rotationDelta).toEqual({ x: 0, y: 0 });

    // Nuevo agarre con la mano a la distancia de antes: el zoom no salta.
    run({ ...grab, size: 0.3 });
    expect(handStore.zoomLevel).toBeCloseTo(zoom, 5);
  });

  it('perder la mano suelta el agarre sin tocar el zoom', () => {
    run(grab);
    run({ ...grab, size: 0.3 });
    const zoom = handStore.zoomLevel;
    processHandLost(now + 33);
    expect(handStore.pinching).toBe(false);
    expect(handStore.zoomLevel).toBe(zoom);
  });
});
