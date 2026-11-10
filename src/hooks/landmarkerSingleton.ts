import type { HandLandmarker } from '@mediapipe/tasks-vision';
import { perfStore } from '../debug/perfStore';

// Instancia única del HandLandmarker, compartida y con conteo de usuarios.
// - La librería de MediaPipe se importa de forma diferida (solo al activar los gestos).
// - Inicializaciones concurrentes esperan la misma promesa (nunca se crean dos).
// - Cuando el último usuario la libera se llama close(); si se libera mientras
//   todavía carga, se cierra en cuanto termine de crearse.

const BASE = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;
const WASM_PATH = `${BASE}mediapipe-wasm`;
const MODEL_PATH = `${BASE}models/hand_landmarker.task`;

let instance: HandLandmarker | null = null;
let pending: Promise<HandLandmarker> | null = null;
let users = 0;

async function createLandmarker(): Promise<HandLandmarker> {
  // Import dinámico: la librería (JS de MediaPipe) va en un chunk aparte que solo se descarga
  // al activar los gestos, no al abrir la página.
  const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision').catch(() => {
    throw new Error('No se pudo descargar la detección de manos. Verifica tu conexión e inténtalo de nuevo.');
  });
  const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
  const make = (delegate: 'GPU' | 'CPU') =>
    HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_PATH, delegate },
      runningMode: 'VIDEO',
      numHands: 1,
    });
  try {
    const landmarker = await make('GPU');
    perfStore.delegate = 'GPU';
    return landmarker;
  } catch {
    try {
      const landmarker = await make('CPU');
      perfStore.delegate = 'CPU';
      return landmarker;
    } catch {
      throw new Error('No se pudo cargar el modelo de detección de manos.');
    }
  }
}

/** Obtiene la instancia (creándola si hace falta). Cada llamada debe emparejarse con releaseLandmarker(). */
export function acquireLandmarker(): Promise<HandLandmarker> {
  users++;
  if (instance) return Promise.resolve(instance);
  pending ??= createLandmarker().then(
    (landmarker) => {
      pending = null;
      if (users === 0) {
        landmarker.close();
        throw new Error('HandLandmarker liberado antes de terminar de cargar.');
      }
      instance = landmarker;
      return landmarker;
    },
    (err) => {
      pending = null;
      throw err;
    },
  );
  return pending;
}

export function releaseLandmarker() {
  users = Math.max(0, users - 1);
  if (users === 0 && instance) {
    instance.close();
    instance = null;
  }
}
