import { describe, it, expect, vi, beforeEach } from 'vitest';

// MediaPipe simulado: cada createFromOptions devuelve una promesa que el test resuelve a mano.
const created: { delegate: string; close: ReturnType<typeof vi.fn> }[] = [];
let pendingCreates: { resolve: (v: unknown) => void; reject: (e: unknown) => void; delegate: string }[] = [];

vi.mock('@mediapipe/tasks-vision', () => ({
  FilesetResolver: { forVisionTasks: vi.fn(async () => ({})) },
  HandLandmarker: {
    createFromOptions: vi.fn(
      (_vision: unknown, opts: { baseOptions: { delegate: string } }) =>
        new Promise((resolve, reject) => {
          pendingCreates.push({ resolve, reject, delegate: opts.baseOptions.delegate });
        }),
    ),
  },
}));

/** Resuelve la creación pendiente más antigua con una instancia simulada. */
async function finishCreate() {
  await vi.waitFor(() => expect(pendingCreates.length).toBeGreaterThan(0));
  const p = pendingCreates.shift()!;
  const instance = { delegate: p.delegate, close: vi.fn() };
  created.push(instance);
  p.resolve(instance);
  return instance;
}

async function load() {
  vi.resetModules();
  return import('../landmarkerSingleton');
}

beforeEach(() => {
  created.length = 0;
  pendingCreates = [];
});

describe('landmarkerSingleton', () => {
  it('inicializaciones concurrentes comparten una sola instancia', async () => {
    const { acquireLandmarker } = await load();
    const a = acquireLandmarker();
    const b = acquireLandmarker();
    const instance = await finishCreate();
    expect(await a).toBe(instance);
    expect(await b).toBe(instance);
    expect(created).toHaveLength(1);
  });

  it('se cierra solo cuando la libera el último usuario', async () => {
    const { acquireLandmarker, releaseLandmarker } = await load();
    const a = acquireLandmarker();
    acquireLandmarker();
    const instance = await finishCreate();
    await a;
    releaseLandmarker();
    expect(instance.close).not.toHaveBeenCalled();
    releaseLandmarker();
    expect(instance.close).toHaveBeenCalledTimes(1);
  });

  it('tras cerrarse, un nuevo acquire crea otra instancia (no reutiliza la cerrada)', async () => {
    const { acquireLandmarker, releaseLandmarker } = await load();
    const first = acquireLandmarker();
    await finishCreate();
    await first;
    releaseLandmarker();
    const second = acquireLandmarker();
    const instance2 = await finishCreate();
    expect(await second).toBe(instance2);
    expect(created).toHaveLength(2);
  });

  it('si se libera mientras carga, se cierra al terminar de crearse (sin fugas)', async () => {
    const { acquireLandmarker, releaseLandmarker } = await load();
    const p = acquireLandmarker();
    releaseLandmarker();
    const instance = await finishCreate();
    await expect(p).rejects.toThrow();
    expect(instance.close).toHaveBeenCalledTimes(1);
  });

  it('si el GPU falla usa CPU y lo registra en perfStore', async () => {
    const { acquireLandmarker } = await load();
    const { perfStore } = await import('../../debug/perfStore');
    const p = acquireLandmarker();
    await vi.waitFor(() => expect(pendingCreates.length).toBe(1));
    pendingCreates.shift()!.reject(new Error('sin WebGL'));
    const instance = await finishCreate();
    expect(await p).toBe(instance);
    expect(instance.delegate).toBe('CPU');
    expect(perfStore.delegate).toBe('CPU');
  });
});
