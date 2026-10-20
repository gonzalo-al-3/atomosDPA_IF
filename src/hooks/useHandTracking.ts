import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { handStore, resetHandStore, LANDMARK_COUNT } from './handStore';
import { processHandFrame, processHandLost, resetFilters } from './handProcessing';

export type HandTrackingStatus = 'off' | 'loading' | 'on' | 'error';

const BASE = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;
const WASM_PATH = `${BASE}mediapipe-wasm`;
const MODEL_PATH = `${BASE}models/hand_landmarker.task`;

async function createLandmarker(): Promise<HandLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
  const make = (delegate: 'GPU' | 'CPU') =>
    HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_PATH, delegate },
      runningMode: 'VIDEO',
      numHands: 1,
    });
  try {
    return await make('GPU');
  } catch {
    return await make('CPU');
  }
}

function describeError(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === 'NotAllowedError') return 'Permiso de cámara denegado.';
    if (err.name === 'NotFoundError') return 'No se encontró ninguna cámara.';
    if (err.name === 'NotReadableError') return 'La cámara está en uso por otra aplicación.';
  }
  return err instanceof Error ? err.message : 'Error desconocido.';
}

export interface UseHandTracking {
  status: HandTrackingStatus;
  error: string | null;
  videoRef: RefObject<HTMLVideoElement | null>;
  start: () => Promise<void>;
  stop: () => void;
}

/**
 * Detección de mano con MediaPipe. La cámara solo se pide en start() (botón explícito).
 * Solo `status`/`error` viven en estado de React; los landmarks se escriben en `handStore`.
 */
export function useHandTracking(): UseHandTracking {
  const [status, setStatus] = useState<HandTrackingStatus>('off');
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const rafRef = useRef(0);
  // Se incrementa en cada start/stop para descartar arranques asíncronos obsoletos.
  const sessionRef = useRef(0);

  const releaseCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
    }
    resetHandStore();
    resetFilters();
  }, []);

  const invalidate = useCallback(() => {
    sessionRef.current++;
  }, []);

  const stop = useCallback(() => {
    invalidate();
    releaseCamera();
    setError(null);
    setStatus('off');
  }, [invalidate, releaseCamera]);

  const start = useCallback(async () => {
    if (streamRef.current) return;
    const session = ++sessionRef.current;
    setError(null);
    setStatus('loading');

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });
      if (session !== sessionRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;

      landmarkerRef.current ??= await createLandmarker();
      if (session !== sessionRef.current) return;

      const video = videoRef.current;
      if (!video) throw new Error('Elemento de video no disponible.');
      video.srcObject = stream;
      await video.play();
      if (session !== sessionRef.current) return;

      const landmarker = landmarkerRef.current;
      let lastVideoTime = -1;
      let lastDetect = 0;

      const loop = () => {
        if (session !== sessionRef.current) return;
        if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          const now = performance.now();
          const result = landmarker.detectForVideo(video, now);
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
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      setStatus('on');
      rafRef.current = requestAnimationFrame(loop);
    } catch (err) {
      if (session !== sessionRef.current) return;
      stream?.getTracks().forEach((t) => t.stop());
      releaseCamera();
      setError(describeError(err));
      setStatus('error');
    }
  }, [releaseCamera]);

  // Al desmontar: apagar cámara (LED) y liberar el modelo.
  useEffect(() => {
    return () => {
      invalidate();
      releaseCamera();
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, [invalidate, releaseCamera]);

  return { status, error, videoRef, start, stop };
}
