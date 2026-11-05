import { describe, it, expect } from 'vitest';
import { closePreview, isGesturesActive, nextMode } from '../handMode';

describe('nextMode', () => {
  it('desde apagado, cada botón activa su modo', () => {
    expect(nextMode('off', 'gestures')).toBe('gestures');
    expect(nextMode('off', 'gestures+camera')).toBe('gestures+camera');
  });

  it('pulsar el botón del modo activo lo apaga', () => {
    expect(nextMode('gestures', 'gestures')).toBe('off');
    expect(nextMode('gestures+camera', 'gestures+camera')).toBe('off');
  });

  it('pulsar el otro botón cambia de modo sin pasar por apagado', () => {
    expect(nextMode('gestures', 'gestures+camera')).toBe('gestures+camera');
    expect(nextMode('gestures+camera', 'gestures')).toBe('gestures');
  });
});

describe('closePreview', () => {
  it('cerrar el recuadro pasa a "gestos", no apaga', () => {
    expect(closePreview('gestures+camera')).toBe('gestures');
  });

  it('no cambia los demás modos', () => {
    expect(closePreview('gestures')).toBe('gestures');
    expect(closePreview('off')).toBe('off');
  });
});

describe('isGesturesActive', () => {
  it('es true en cualquier modo con gestos', () => {
    expect(isGesturesActive('off')).toBe(false);
    expect(isGesturesActive('gestures')).toBe(true);
    expect(isGesturesActive('gestures+camera')).toBe(true);
  });
});
