// Métricas de rendimiento (fuera de React). Se escriben desde useFrame / el loop de detección
// y las lee el overlay de depuración con un temporizador propio.

export interface PerfStore {
  /** fps del render 3D (ventana de ~0.5 s). */
  renderFps: number;
  /** Peor tiempo entre frames de render en la última ventana (ms). */
  worstFrameMs: number;
  /** Duración media de detectForVideo (ms, media móvil). Bloquea el hilo principal. */
  detectMs: number;
  /** Delegado con el que se creó el HandLandmarker. */
  delegate: 'GPU' | 'CPU' | null;
}

export const perfStore: PerfStore = {
  renderFps: 0,
  worstFrameMs: 0,
  detectMs: 0,
  delegate: null,
};
