import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import ARButton from '../components/UI/ARButton';
import { loadModelViewer, preloadModelViewerWhenIdle } from '../components/UI/loadModelViewer';

// <model-viewer> real no se puede cargar en jsdom: se simula el cargador.
vi.mock('../components/UI/loadModelViewer', () => ({
  loadModelViewer: vi.fn(() => Promise.resolve()),
  preloadModelViewerWhenIdle: vi.fn(),
}));

const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/120.0.0.0 Mobile Safari/537.36';

describe('ARButton Component', () => {
  const originalUserAgent = navigator.userAgent;

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true,
    });
    vi.restoreAllMocks();
    vi.mocked(loadModelViewer).mockClear();
    vi.mocked(preloadModelViewerWhenIdle).mockClear();
  });

  it('se oculta en computadoras de escritorio', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/120.0.0.0 Safari/537.36',
      configurable: true,
    });

    const { container } = render(<ARButton modelUrl="/models/aspirin.glb" modelName="Aspirina" />);
    expect(container.firstChild).toBeNull();
  });

  it('permite elegir el modo AR en Android', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/120.0.0.0 Mobile Safari/537.36',
      configurable: true,
    });

    render(<ARButton modelUrl="/models/aspirin.glb" modelName="Aspirina" />);
    const button = screen.getByRole('button', { name: /Ver en Realidad Aumentada/i });
    expect(button).toBeTruthy();

    fireEvent.click(button);
    expect(screen.getByText(/Mueve tu teléfono en círculos sobre la mesa/i)).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Modo de Realidad Aumentada' })).toBeTruthy();
    expect(document.querySelector('model-viewer')?.getAttribute('ar-modes')).toBe('scene-viewer');

    fireEvent.click(screen.getByRole('button', { name: 'WebXR' }));
    expect(document.querySelector('model-viewer')?.getAttribute('ar-modes')).toBe('webxr');
  });

  it('avisa al abrir la RA (para apagar los gestos)', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/120.0.0.0 Mobile Safari/537.36',
      configurable: true,
    });
    const onOpen = vi.fn();

    render(<ARButton modelUrl="/models/aspirin.glb" modelName="Aspirina" onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: /Ver en Realidad Aumentada/i }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('en escritorio no descarga model-viewer', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/120.0.0.0 Safari/537.36',
      configurable: true,
    });
    render(<ARButton modelUrl="/models/aspirin.glb" modelName="Aspirina" />);
    expect(preloadModelViewerWhenIdle).not.toHaveBeenCalled();
    expect(loadModelViewer).not.toHaveBeenCalled();
  });

  it('en móvil lo precarga en segundo plano y lo asegura al abrir la RA', () => {
    Object.defineProperty(navigator, 'userAgent', { value: ANDROID_UA, configurable: true });
    render(<ARButton modelUrl="/models/aspirin.glb" modelName="Aspirina" />);
    expect(preloadModelViewerWhenIdle).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Ver en Realidad Aumentada/i }));
    expect(loadModelViewer).toHaveBeenCalledTimes(1);
  });

  it('si no se puede descargar el visor de RA muestra un aviso', async () => {
    Object.defineProperty(navigator, 'userAgent', { value: ANDROID_UA, configurable: true });
    vi.mocked(loadModelViewer).mockRejectedValueOnce(new Error('sin red'));
    render(<ARButton modelUrl="/models/aspirin.glb" modelName="Aspirina" />);

    fireEvent.click(screen.getByRole('button', { name: /Ver en Realidad Aumentada/i }));
    await waitFor(() => expect(screen.getByText(/No se pudo cargar el visor de Realidad Aumentada/i)).toBeTruthy());
  });
});
