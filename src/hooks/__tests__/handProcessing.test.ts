import { describe, it, expect, beforeEach } from 'vitest';
import {
  EDGE_MARGIN,
  FIST_GRAB,
  FIST_RELEASE,
  OneEuro,
  ZOOM_MAX,
  ZOOM_MIN,
  deadband,
  dragFromStart,
  isNearEdge,
  processHandFrame,
  processHandLost,
  resetFilters,
  rotationStep,
  updateFist,
  zoomFromSize,
} from '../handProcessing';
import { handStore, resetHandStore, resetModelTransform } from '../handStore';

describe('deadband', () => {
  it('anula valores dentro de la zona muerta y resta el umbral fuera de ella', () => {
    expect(deadband(0.03, 0.05)).toBe(0);
    expect(deadband(-0.05, 0.05)).toBe(0);
    expect(deadband(0.1, 0.05)).toBeCloseTo(0.05);
    expect(deadband(-0.1, 0.05)).toBeCloseTo(-0.05);
  });
});

describe('updateFist (histéresis)', () => {
  it('agarra solo por debajo del umbral de cierre', () => {
    expect(updateFist(false, FIST_GRAB - 0.01)).toBe(true);
    expect(updateFist(false, FIST_GRAB + 0.01)).toBe(false);
  });

  it('entre los dos umbrales conserva el estado anterior (no parpadea)', () => {
    const between = (FIST_GRAB + FIST_RELEASE) / 2;
    expect(updateFist(true, between)).toBe(true);
    expect(updateFist(false, between)).toBe(false);
  });

  it('suelta solo por encima del umbral de apertura', () => {
    expect(updateFist(true, FIST_RELEASE + 0.01)).toBe(false);
    expect(updateFist(true, FIST_RELEASE)).toBe(true);
  });
});

describe('isNearEdge', () => {
  it('detecta la franja de los cuatro bordes', () => {
    expect(isNearEdge(0.5, 0.5)).toBe(false);
    expect(isNearEdge(EDGE_MARGIN / 2, 0.5)).toBe(true);
    expect(isNearEdge(1 - EDGE_MARGIN / 2, 0.5)).toBe(true);
    expect(isNearEdge(0.5, EDGE_MARGIN / 2)).toBe(true);
    expect(isNearEdge(0.5, 1 - EDGE_MARGIN / 2)).toBe(true);
  });
});

describe('rotationStep', () => {
  it('sin movimiento no gira', () => {
    expect(rotationStep(0.5, 0.5, 0.5, 0.5, 4 / 3)).toEqual({ x: 0, y: 0 });
  });

  it('ignora el temblor (movimientos mínimos)', () => {
    expect(rotationStep(0.5, 0.5, 0.501, 0.5, 1)).toEqual({ x: 0, y: 0 });
  });

  it('mover a la derecha gira +y y bajar gira +x', () => {
    expect(rotationStep(0.5, 0.5, 0.55, 0.5, 1).y).toBeGreaterThan(0);
    expect(rotationStep(0.5, 0.5, 0.45, 0.5, 1).y).toBeLessThan(0);
    expect(rotationStep(0.5, 0.5, 0.5, 0.55, 1).x).toBeGreaterThan(0);
  });

  it('corrige la proporción del video para que ambos ejes giren igual', () => {
    const r = rotationStep(0.5, 0.5, 0.52, 0.54, 2);
    expect(r.y).toBeCloseTo(r.x);
  });

  it('descarta saltos grandes entre detecciones', () => {
    expect(rotationStep(0.2, 0.5, 0.8, 0.5, 1)).toEqual({ x: 0, y: 0 });
  });
});

describe('dragFromStart', () => {
  it('ignora movimientos pequeños al cerrar el puño', () => {
    expect(dragFromStart(0.5, 0.5, 0.505, 0.505, 1)).toEqual({ x: 0, y: 0 });
  });

  it('da el desplazamiento en alturas de imagen, corrigiendo la proporción', () => {
    const d = dragFromStart(0.5, 0.5, 0.6, 0.7, 2);
    expect(d.x).toBeCloseTo(0.2 - 0.01);
    expect(d.y).toBeCloseTo(0.2 - 0.01);
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
  /** curlRatio deseado (puntas → muñeca / size): ~1.9 abierta, ~0.9 puño. */
  curl: number;
}

const OPEN = 1.9;
const FIST = 0.9;

/** Escribe 21 landmarks con la palma en (x, y), tamaño y apertura dados (aspect = 1). */
function setHand({ x, y, size, curl }: SyntheticHand) {
  const lm = handStore.landmarks;
  const put = (i: number, px: number, py: number) => {
    lm[i * 3] = px;
    lm[i * 3 + 1] = py;
    lm[i * 3 + 2] = 0;
  };
  for (let i = 0; i < 21; i++) put(i, x, y);
  // Palma = media de 0, 5 y 17 → queda en (x, y) sea cual sea el tamaño.
  const wristY = y + size / 2;
  put(0, x, wristY);
  put(9, x, y - size / 2);
  put(5, x, y - size / 4);
  put(17, x, y - size / 4);
  // Puntas de los cuatro dedos a curl·size de la muñeca.
  for (const tip of [8, 12, 16, 20]) put(tip, x, wristY - curl * size);
  handStore.present = true;
}

let now = 0;
/** Simula `frames` detecciones a 30 Hz con la misma mano (deja converger los filtros). */
function hold(hand: SyntheticHand, frames = 60) {
  for (let i = 0; i < frames; i++) {
    now += 1000 / 30;
    setHand(hand);
    processHandFrame(now, 1);
  }
}

/** Mueve la palma linealmente de `from` a `to` en `frames` detecciones. */
function move(from: SyntheticHand, to: Partial<SyntheticHand>, frames = 30) {
  const end = { ...from, ...to };
  for (let i = 1; i <= frames; i++) {
    const t = i / frames;
    now += 1000 / 30;
    setHand({
      x: from.x + (end.x - from.x) * t,
      y: from.y + (end.y - from.y) * t,
      size: from.size + (end.size - from.size) * t,
      curl: end.curl,
    });
    processHandFrame(now, 1);
  }
  return end;
}

const rotation = () => ({ ...handStore.rotationAccum });

describe('processHandFrame (gestos completos)', () => {
  const open = { x: 0.5, y: 0.5, size: 0.2, curl: OPEN };
  const fist = { ...open, curl: FIST };

  beforeEach(() => {
    resetHandStore();
    resetModelTransform();
    resetFilters();
    now = 1000;
  });

  it('con la mano abierta quieta no hay agarre, giro ni zoom', () => {
    hold(open);
    expect(handStore.grabbing).toBe(false);
    expect(Math.abs(handStore.rotationAccum.x)).toBeLessThan(1e-6);
    expect(Math.abs(handStore.rotationAccum.y)).toBeLessThan(1e-6);
    expect(handStore.zoomLevel).toBe(1);
  });

  it('mover la mano abierta gira la molécula hacia el lado del movimiento (x espejada)', () => {
    hold(open);
    // En la imagen la mano va a la izquierda = a la derecha del usuario (vista espejo).
    move(open, { x: 0.35 });
    hold({ ...open, x: 0.35 }, 20);
    expect(handStore.rotationAccum.y).toBeGreaterThan(0.5);
    expect(Math.abs(handStore.rotationAccum.x)).toBeLessThan(0.05);

    handStore.rotationAccum.y = 0;
    move({ ...open, x: 0.35 }, { y: 0.65 });
    hold({ ...open, x: 0.35, y: 0.65 }, 20);
    expect(handStore.rotationAccum.x).toBeGreaterThan(0.5);
  });

  it('el giro sigue a la mano: si la mano se detiene, deja de girar', () => {
    hold(open);
    move(open, { x: 0.35 });
    hold({ ...open, x: 0.35 }, 30);
    const before = rotation();
    hold({ ...open, x: 0.35 }, 60);
    expect(handStore.rotationAccum.y - before.y).toBeCloseTo(0, 3);
  });

  it('cerca del borde (mano saliendo de la imagen) no gira', () => {
    const edge = { ...open, x: 0.96 };
    hold(edge);
    move(edge, { x: 0.99 });
    expect(handStore.rotationAccum).toEqual({ x: 0, y: 0 });
  });

  it('si la mano se pierde y reaparece en otro lugar, no hay giro por el salto', () => {
    hold(open);
    processHandLost(now + 33);
    now += 66;
    hold({ ...open, x: 0.3 }, 40);
    expect(Math.abs(handStore.rotationAccum.y)).toBeLessThan(0.02);
  });

  it('cerrar el puño agarra y calibra la referencia; mientras se agarra no gira', () => {
    hold(open);
    const grabId = handStore.grabId;
    hold(fist);
    expect(handStore.grabbing).toBe(true);
    expect(handStore.grabId).toBe(grabId + 1);
    expect(handStore.grabRefSize).toBeCloseTo(0.2, 2);
    expect(handStore.grabStartX).toBeCloseTo(0.5, 2);

    const before = rotation();
    move(fist, { x: 0.35, y: 0.6 });
    expect(handStore.rotationAccum).toEqual(before);
  });

  it('mover el puño desplaza el origen hacia donde va la mano', () => {
    hold(fist);
    move(fist, { x: 0.35 });
    hold({ ...fist, x: 0.35 }, 20);
    expect(handStore.dragOffset.x).toBeGreaterThan(0.1); // a la derecha del usuario
    move({ ...fist, x: 0.35 }, { x: 0.5, y: 0.65 });
    hold({ ...fist, y: 0.65 }, 20);
    expect(handStore.dragOffset.y).toBeGreaterThan(0.1); // hacia abajo
    expect(Math.abs(handStore.dragOffset.x)).toBeLessThan(0.02);
  });

  it('acercar el puño hace zoom in y alejarlo zoom out', () => {
    hold(fist);
    move(fist, { size: 0.3 });
    hold({ ...fist, size: 0.3 });
    expect(handStore.zoomLevel).toBeGreaterThan(1.3);
    expect(handStore.sizeRatio).toBeCloseTo(1.5, 1);
    move({ ...fist, size: 0.3 }, { size: 0.12 });
    hold({ ...fist, size: 0.12 });
    expect(handStore.zoomLevel).toBeLessThan(1);
  });

  it('al soltar se conserva el zoom, el arrastre vuelve a 0 y no hay giro por el cambio', () => {
    hold(fist);
    hold({ ...fist, size: 0.3 });
    const zoom = handStore.zoomLevel;
    hold({ ...open, size: 0.3 });
    expect(handStore.grabbing).toBe(false);
    expect(handStore.zoomLevel).toBe(zoom);
    expect(handStore.dragOffset).toEqual({ x: 0, y: 0 });
    expect(Math.abs(handStore.rotationAccum.x)).toBeLessThan(0.02);
    expect(Math.abs(handStore.rotationAccum.y)).toBeLessThan(0.02);

    // Nuevo agarre con la mano a la misma distancia: el zoom no salta.
    hold({ ...fist, size: 0.3 });
    expect(handStore.zoomLevel).toBeCloseTo(zoom, 5);
  });

  it('perder la mano suelta el agarre sin tocar el zoom', () => {
    hold(fist);
    hold({ ...fist, size: 0.3 });
    const zoom = handStore.zoomLevel;
    processHandLost(now + 33);
    expect(handStore.grabbing).toBe(false);
    expect(handStore.zoomLevel).toBe(zoom);
    expect(handStore.dragOffset).toEqual({ x: 0, y: 0 });
  });

  it('apagar la cámara conserva el zoom; cambiar de modelo lo reinicia', () => {
    hold(fist);
    hold({ ...fist, size: 0.3 });
    const zoom = handStore.zoomLevel;
    resetHandStore();
    expect(handStore.zoomLevel).toBe(zoom);
    resetModelTransform();
    expect(handStore.zoomLevel).toBe(1);
  });
});
