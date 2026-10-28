import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import ARButton from '../components/UI/ARButton';

describe('ARButton Component', () => {
  const originalUserAgent = navigator.userAgent;

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  it('se oculta en computadoras de escritorio', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/120.0.0.0 Safari/537.36',
      configurable: true,
    });

    const { container } = render(<ARButton modelUrl="/models/aspirin.glb" modelName="Aspirina" />);
    expect(container.firstChild).toBeNull();
  });

  it('muestra el botón Ver en RA en dispositivos móviles y abre el modal con instrucciones', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/120.0.0.0 Mobile Safari/537.36',
      configurable: true,
    });

    render(<ARButton modelUrl="/models/aspirin.glb" modelName="Aspirina" />);
    const button = screen.getByRole('button', { name: /Ver en Realidad Aumentada/i });
    expect(button).toBeTruthy();

    fireEvent.click(button);
    expect(screen.getByText(/Mueve tu teléfono en círculos sobre la mesa/i)).toBeTruthy();
  });
});