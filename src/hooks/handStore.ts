// Store transitorio (fuera de React) para datos de alta frecuencia del seguimiento de mano.
// El hook escribe aquí; el overlay y el visor 3D leen dentro de su propio bucle (rAF / useFrame).

export const LANDMARK_COUNT = 21;

export interface HandStore {
  /** x, y, z normalizados (0..1 en imagen) de los 21 landmarks crudos, intercalados. */
  landmarks: Float32Array;
  /** Mismos landmarks tras el filtro One Euro. */
  smoothLandmarks: Float32Array;
  present: boolean;
  /** Frecuencia de detección en Hz (media móvil). */
  detectionFps: number;
  /** performance.now() de la última detección. */
  updatedAt: number;

  /** Centro de la palma (0..1, ya espejado: derecha = x mayor), suavizado. */
  palmX: number;
  palmY: number;
  /** Tamaño de la mano: muñeca (0) → base del dedo medio (9), en unidades de altura de imagen. */
  handSize: number;
  /** Distancia pulgar–índice / tamaño de la mano. ~0.1 en contacto, ~1 mano abierta. */
  pinchRatio: number;
  /** Agarre: pellizco con histéresis. El modelo solo responde mientras es true. */
  pinching: boolean;

  /** Se incrementa en cada agarre nuevo; el visor lo usa para guardar la rotación base. */
  grabId: number;
  /** Palma y tamaño de la mano al empezar el agarre (referencia de calibración). */
  grabStartX: number;
  grabStartY: number;
  grabRefSize: number;
  /** handSize / grabRefSize durante el agarre (>1 = mano más cerca). */
  sizeRatio: number;

  /**
   * Giro (rad) acumulado desde el inicio del agarre por arrastre de la palma.
   * x: sobre el eje X (palma arriba/abajo), y: sobre el eje Y (palma izquierda/derecha). 0 sin agarre.
   */
  rotationDelta: { x: number; y: number };
  /** Escala objetivo (ZOOM_MIN..ZOOM_MAX). Se conserva al soltar o perder la mano. */
  zoomLevel: number;
}

export const handStore: HandStore = {
  landmarks: new Float32Array(LANDMARK_COUNT * 3),
  smoothLandmarks: new Float32Array(LANDMARK_COUNT * 3),
  present: false,
  detectionFps: 0,
  updatedAt: 0,
  palmX: 0.5,
  palmY: 0.5,
  handSize: 0,
  pinchRatio: 1,
  pinching: false,
  grabId: 0,
  grabStartX: 0.5,
  grabStartY: 0.5,
  grabRefSize: 0,
  sizeRatio: 1,
  rotationDelta: { x: 0, y: 0 },
  zoomLevel: 1,
};

export function resetHandStore() {
  handStore.landmarks.fill(0);
  handStore.smoothLandmarks.fill(0);
  handStore.present = false;
  handStore.detectionFps = 0;
  handStore.updatedAt = 0;
  handStore.palmX = 0.5;
  handStore.palmY = 0.5;
  handStore.handSize = 0;
  handStore.pinchRatio = 1;
  handStore.pinching = false;
  handStore.grabStartX = 0.5;
  handStore.grabStartY = 0.5;
  handStore.grabRefSize = 0;
  handStore.sizeRatio = 1;
  handStore.rotationDelta.x = 0;
  handStore.rotationDelta.y = 0;
  handStore.zoomLevel = 1;
}
