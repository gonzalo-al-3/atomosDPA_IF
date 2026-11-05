import { useCallback, useEffect, useRef, useState } from 'react';
import type { HandLandmarker } from '@mediapipe/tasks-vision';
import { handStore, resetHandStore, LANDMARK_COUNT } from './handStore';
import { processHandFrame, processHandLost, resetFilters } from './handProcessing';
import { acquireLandmarker, releaseLandmarker } from './landmarkerSingleton';
import { closePreview as closePreviewMode, nextMode, type ActiveHandMode, type HandMode } from './handMode';
import { perfStore } from '../debug/perfStore';

/** Frecuencia máxima de detección, independiente de los fps del render. */
const DETECT_HZ = 30;
const DETECT_INTERVAL_MS = 1000 / DETECT_HZ;
/** Tolerancia para el jitter del rAF (a 60 Hz, 33.3 ms ≈ 2 frames; sin ella saldría ~20 Hz). */
const DETECT_SLACK_MS = 4;

const CAMERA_LOST_MESSAGE =
  'Se perdió la cámara (se desconectó o se retiró el permiso). Los gestos se apagaron.';

function describeError(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === 'NotAllowedError') return 'Permiso de cámara denegado. Puedes seguir usando el mouse.';
    if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError')
      return 'No se encontró ninguna cámara. Puedes seguir usando el mouse.';
    if (err.name === 'NotReadableError') return 'La cámara está en uso por otra aplicación.';
  }
  return err instanceof Error ? err.message : 'Error desconocido.';
}

/** Video de detección: vive fuera de la UI (invisible) para que mostrar u ocultar el recuadro no afecte. */
function createDetectionVideo(): HTMLVideoElement {
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.setAttribute('aria-hidden', 'true');
  // En el DOM pero invisible: algunos navegadores (Safari) no decodifican videos fuera del documento.
  Object.assign(video.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    width: '1px',
    height: '1px',
    opacity: '0',
    pointerEvents: 'none',
  });
  document.body.appendChild(video);
  return video;
}

function showStream(video: HTMLVideoElement | null, stream: MediaStream) {
  if (!video) return;
  video.srcObject = stream;
  video.play().catch(() => {
    // AbortError si se quita el stream antes de reproducir: no importa.
  });
}

export interface UseHandTracking {
  mode: HandMode;
  /** true mientras se pide la cámara y se carga el modelo. */
  starting: boolean;
  error: string | null;
  /** Botón de la barra superior. */
  press: (pressed: ActiveHandMode) => void;
  /** Cierra el recuadro de la cámara sin apagar los gestos. */
  closePreview: () => void;
  turnOff: () => void;
  dismissError: () => void;
  /** Ref callback para el <video> del recuadro: muestra el mismo stream, sin otro getUserMedia. */
  attachPreview: (video: HTMLVideoElement | null) => void;
}

/**
 * Control por gestos con MediaPipe. La cámara solo se pide al pulsar un botón.
 * En estado de React solo van el modo, `starting` y el error; los landmarks se escriben en `handStore`.
 * Un solo getUserMedia y un solo HandLandmarker: cambiar de modo no reabre la cámara.
 */
export function useHandTracking(): UseHandTracking {
  const [mode, setModeState] = useState<HandMode>('off');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modeRef = useRef<HandMode>('off');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<Promise<HandLandmarker> | null>(null);
  const rafRef = useRef(0);
  // Se incrementa al iniciar o liberar la cámara para descartar arranques asíncronos obsoletos.
  const sessionRef = useRef(0);

  const setMode = useCallback((next: HandMode) => {
    modeRef.current = next;
    setModeState(next);
  }, []);

  /** Detiene el loop y TODOS los tracks (apaga el LED). Conserva el landmarker para reactivar rápido. */
  const releaseCamera = useCallback(() => {
    sessionRef.current++;
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    for (const video of [videoRef.current, previewRef.current]) {
      if (!video) continue;
      video.pause();
      video.srcObject = null;
    }
    resetHandStore();
    resetFilters();
    perfStore.detectMs = 0;
  }, []);

  const fail = useCallback(
    (message: string) => {
      releaseCamera();
      setStarting(false);
      setMode('off');
      setError(message);
    },
    [releaseCamera, setMode],
  );

  const turnOff = useCallback(() => {
    releaseCamera();
    setStarting(false);
    setMode('off');
  }, [releaseCamera, setMode]);

  const getLandmarker = useCallback(() => {
    if (!landmarkerRef.current) {
      const promise = acquireLandmarker();
      landmarkerRef.current = promise;
      promise.catch(() => {
        // Si falló la carga, soltar la referencia para poder reintentar con otro clic.
        if (landmarkerRef.current === promise) {
          landmarkerRef.current = null;
          releaseLandmarker();
        }
      });
    }
    return landmarkerRef.current;
  }, []);

  const start = useCallback(async () => {
    const session = ++sessionRef.current;
    setStarting(true);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Este navegador no permite usar la cámara (se requiere HTTPS).');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });
      if (session !== sessionRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      // stop() propio no dispara "ended": solo llega si se desconecta la cámara o se revoca el permiso.
      for (const track of stream.getTracks()) {
        track.addEventListener(
          'ended',
          () => {
            if (session === sessionRef.current) fail(CAMERA_LOST_MESSAGE);
          },
          { once: true },
        );
      }
      showStream(previewRef.current, stream);

      const landmarker = await getLandmarker();
      if (session !== sessionRef.current) return;

      const video = (videoRef.current ??= createDetectionVideo());
      video.srcObject = stream;
      await video.play();
      if (session !== sessionRef.current) return;

      let lastVideoTime = -1;
      let lastDetect = 0;

      const loop = () => {
        if (session !== sessionRef.current) return;
        rafRef.current = requestAnimationFrame(loop);

        const now = performance.now();
        if (now - lastDetect < DETECT_INTERVAL_MS - DETECT_SLACK_MS) return;
        if (video.readyState < 2 || video.currentTime === lastVideoTime) return;
        lastVideoTime = video.currentTime;

        const result = landmarker.detectForVideo(video, now);
        const cost = performance.now() - now;
        perfStore.detectMs = perfStore.detectMs ? perfStore.detectMs * 0.9 + cost * 0.1 : cost;

        const hand = result.landmarks[0];
        if (hand) {
          const buf = handStore.landmarks;
          for (let i = 0; i < LANDMARK_COUNT; i++) {
            buf[i * 3] = hand[i].x;
            buf[i * 3 + 1] = hand[i].y;
            buf[i * 3 + 2] = hand[i].z;
          }
        }
        handStore.present = !!hand;
        if (hand) processHandFrame(now, video.videoWidth / video.videoHeight);
        else processHandLost(now);
        handStore.updatedAt = now;
        if (lastDetect) {
          const fps = 1000 / (now - lastDetect);
          handStore.detectionFps = handStore.detectionFps
            ? handStore.detectionFps * 0.9 + fps * 0.1
            : fps;
        }
        lastDetect = now;
      };
      setStarting(false);
      rafRef.current = requestAnimationFrame(loop);
    } catch (err) {
      if (session !== sessionRef.current) return;
      fail(describeError(err));
    }
  }, [fail, getLandmarker]);

  const press = useCallback(
    (pressed: ActiveHandMode) => {
      const current = modeRef.current;
      const next = nextMode(current, pressed);
      setError(null);
      if (next === 'off') {
        turnOff();
        return;
      }
      setMode(next);
      // Entre modos activos solo cambia la visibilidad del recuadro: la cámara sigue abierta.
      if (current === 'off') void start();
    },
    [setMode, start, turnOff],
  );

  const closePreview = useCallback(() => setMode(closePreviewMode(modeRef.current)), [setMode]);
  const dismissError = useCallback(() => setError(null), []);

  const attachPreview = useCallback((video: HTMLVideoElement | null) => {
    previewRef.current = video;
    if (video && streamRef.current) showStream(video, streamRef.current);
  }, []);

  // Al desmontar (también en el doble montaje de StrictMode): apagar cámara y soltar el landmarker.
  useEffect(() => {
    return () => {
      releaseCamera();
      if (landmarkerRef.current) {
        landmarkerRef.current = null;
        releaseLandmarker();
      }
      videoRef.current?.remove();
      videoRef.current = null;
    };
  }, [releaseCamera]);

  return { mode, starting, error, press, closePreview, turnOff, dismissError, attachPreview };
}
