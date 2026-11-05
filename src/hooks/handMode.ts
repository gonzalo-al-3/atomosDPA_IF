// Modos del control por gestos. Lógica pura (sin React ni cámara) para poder probarla.

export type HandMode = 'off' | 'gestures' | 'gestures+camera';

/** Modos que se activan con un botón de la barra superior. */
export type ActiveHandMode = Exclude<HandMode, 'off'>;

/** Pulsar el botón del modo activo lo apaga; pulsar el otro cambia de modo. */
export function nextMode(current: HandMode, pressed: ActiveHandMode): HandMode {
  return current === pressed ? 'off' : pressed;
}

/** Cerrar el recuadro de la cámara pasa a "gestos" sin apagar. */
export function closePreview(current: HandMode): HandMode {
  return current === 'gestures+camera' ? 'gestures' : current;
}

export const isGesturesActive = (mode: HandMode) => mode !== 'off';
