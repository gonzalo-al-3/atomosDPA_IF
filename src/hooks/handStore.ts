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
  /** Distancia media puntas de los dedos → muñeca / tamaño de la mano. ~1 puño, ~1.9 mano abierta. */
  curlRatio: number;
  /** Agarre: puño cerrado con histéresis. */
  grabbing: boolean;

  /** Se incrementa en cada agarre nuevo; el visor lo usa para guardar la posición base. */
  grabId: number;
  /** Palma y tamaño de la mano al empezar el agarre (referencia de calibración). */
  grabStartX: number;
  grabStartY: number;
  grabRefSize: number;
  /** handSize / grabRefSize durante el agarre (>1 = mano más cerca). */
  sizeRatio: number;

  /**
   * Giro pendiente (rad) por el movimiento de la mano abierta. La detección suma y el visor lo
   * consume (lo pone en 0) en cada frame. x: sobre el eje horizontal de la pantalla (mano
   * arriba/abajo), y: sobre el eje vertical (mano izquierda/derecha).
   */
  rotationAccum: { x: number; y: number };
  /**
   * Desplazamiento de la palma desde el inicio del agarre, en alturas de imagen
   * (x espejada: + = derecha; y: + = abajo). 0 sin agarre.
   */
  dragOffset: { x: number; y: number };
  /** Escala objetivo (ZOOM_MIN..ZOOM_MAX). Se conserva al soltar, perder la mano o apagar los gestos. */
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
  curlRatio: 2,
  grabbing: false,
  grabId: 0,
  grabStartX: 0.5,
  grabStartY: 0.5,
  grabRefSize: 0,
  sizeRatio: 1,
  rotationAccum: { x: 0, y: 0 },
  dragOffset: { x: 0, y: 0 },
  zoomLevel: 1,
};

/** Al apagar la cámara. El zoom se conserva (solo se reinicia al cambiar de modelo). */
export function resetHandStore() {
  handStore.landmarks.fill(0);
  handStore.smoothLandmarks.fill(0);
  handStore.present = false;
  handStore.detectionFps = 0;
  handStore.updatedAt = 0;
  handStore.palmX = 0.5;
  handStore.palmY = 0.5;
  handStore.handSize = 0;
  handStore.curlRatio = 2;
  handStore.grabbing = false;
  handStore.grabStartX = 0.5;
  handStore.grabStartY = 0.5;
  handStore.grabRefSize = 0;
  handStore.sizeRatio = 1;
  handStore.rotationAccum.x = 0;
  handStore.rotationAccum.y = 0;
  handStore.dragOffset.x = 0;
  handStore.dragOffset.y = 0;
}

/** Al cambiar de modelo: zoom a 1 y sin giro pendiente. */
export function resetModelTransform() {
  handStore.zoomLevel = 1;
  handStore.rotationAccum.x = 0;
  handStore.rotationAccum.y = 0;
}
