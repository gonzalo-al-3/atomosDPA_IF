import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';

// Landmarker simulado: el test no carga MediaPipe.
const landmarker = { detectForVideo: vi.fn(() => ({ landmarks: [] })) };
vi.mock('../landmarkerSingleton', () => ({
  acquireLandmarker: vi.fn(async () => landmarker),
  releaseLandmarker: vi.fn(),
}));

import { acquireLandmarker, releaseLandmarker } from '../landmarkerSingleton';
import { useHandTracking } from '../useHandTracking';

class FakeTrack extends EventTarget {
  kind = 'video';
  stop = vi.fn();
}

function fakeStream() {
  const track = new FakeTrack();
  const stream = { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream;
  return { stream, track };
}

let getUserMedia: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  getUserMedia = vi.fn();
  Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true });
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  cleanup(); // desmontar antes de restaurar los mocks de play/pause
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function startIn(mode: 'gestures' | 'gestures+camera') {
  const hook = renderHook(() => useHandTracking());
  act(() => hook.result.current.press(mode));
  await waitFor(() => expect(hook.result.current.starting).toBe(false));
  return hook;
}

describe('useHandTracking', () => {
  it('no pide la cámara al montar', () => {
    renderHook(() => useHandTracking());
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it('cambiar entre modos activos no reabre la cámara ni crea otro landmarker', async () => {
    const { stream, track } = fakeStream();
    getUserMedia.mockResolvedValue(stream);
    const { result } = await startIn('gestures');
    expect(result.current.mode).toBe('gestures');

    act(() => result.current.press('gestures+camera'));
    expect(result.current.mode).toBe('gestures+camera');
    act(() => result.current.closePreview());
    expect(result.current.mode).toBe('gestures');

    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(acquireLandmarker).toHaveBeenCalledTimes(1);
    expect(track.stop).not.toHaveBeenCalled();
  });

  it('pulsar el modo activo apaga: detiene los tracks y cancela el loop', async () => {
    const { stream, track } = fakeStream();
    getUserMedia.mockResolvedValue(stream);
    const { result } = await startIn('gestures+camera');

    act(() => result.current.press('gestures+camera'));
    expect(result.current.mode).toBe('off');
    expect(track.stop).toHaveBeenCalled();
    expect(cancelAnimationFrame).toHaveBeenCalled();
  });

  it('turnOff (Esc) apaga desde cualquier modo', async () => {
    const { stream, track } = fakeStream();
    getUserMedia.mockResolvedValue(stream);
    const { result } = await startIn('gestures');
    act(() => result.current.turnOff());
    expect(result.current.mode).toBe('off');
    expect(track.stop).toHaveBeenCalled();
  });

  it('si el track emite "ended" vuelve a apagado con un mensaje', async () => {
    const { stream, track } = fakeStream();
    getUserMedia.mockResolvedValue(stream);
    const { result } = await startIn('gestures');

    act(() => {
      track.dispatchEvent(new Event('ended'));
    });
    expect(result.current.mode).toBe('off');
    expect(result.current.error).toMatch(/cámara/i);
    expect(track.stop).toHaveBeenCalled();
  });

  it('si se niega el permiso muestra el error y vuelve a apagado', async () => {
    getUserMedia.mockRejectedValue(new DOMException('denied', 'NotAllowedError'));
    const { result } = await startIn('gestures');
    expect(result.current.mode).toBe('off');
    expect(result.current.error).toMatch(/denegado/i);
  });

  it('apagar mientras se espera el permiso detiene el stream cuando llega', async () => {
    const { stream, track } = fakeStream();
    let grant!: (s: MediaStream) => void;
    getUserMedia.mockReturnValue(new Promise((resolve) => (grant = resolve)));
    const { result } = renderHook(() => useHandTracking());

    act(() => result.current.press('gestures'));
    act(() => result.current.press('gestures'));
    expect(result.current.mode).toBe('off');

    await act(async () => grant(stream));
    expect(track.stop).toHaveBeenCalled();
    expect(result.current.mode).toBe('off');
  });

  it('al desmontar apaga la cámara y libera el landmarker', async () => {
    const { stream, track } = fakeStream();
    getUserMedia.mockResolvedValue(stream);
    const { unmount } = await startIn('gestures');
    unmount();
    expect(track.stop).toHaveBeenCalled();
    expect(releaseLandmarker).toHaveBeenCalledTimes(1);
  });
});
