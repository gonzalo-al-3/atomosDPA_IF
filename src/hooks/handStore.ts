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
  /** Distancia pulgar–índice / handSize. ~0.1 en contacto, ~1 mano abierta. */
  pinchRatio: number;
  /** Estado de pellizco con histéresis. */
  pinching: boolean;

  /**
   * Velocidad angular deseada (rad/s), proporcional al desplazamiento de la palma
   * respecto al centro de la imagen (con zona muerta). x: giro sobre el eje X (palma arriba/abajo),
   * y: giro sobre el eje Y (palma izquierda/derecha). Es 0 sin mano o mientras se pellizca.
   */
  rotationDelta: { x: number; y: number };
  /** Escala objetivo (ZOOM_MIN..ZOOM_MAX). Se conserva al perder la mano. */
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
  handStore.rotationDelta.x = 0;
  handStore.rotationDelta.y = 0;
  handStore.zoomLevel = 1;
}
