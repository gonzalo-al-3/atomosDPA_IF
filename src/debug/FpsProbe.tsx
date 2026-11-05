import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { perfStore } from './perfStore';

const WINDOW_MS = 500;

/** Cuenta frames del render 3D dentro de useFrame y escribe en perfStore. No renderiza nada. */
export default function FpsProbe() {
  const acc = useRef({ frames: 0, start: 0, last: 0, worst: 0 });

  useFrame(() => {
    const a = acc.current;
    const now = performance.now();
    if (!a.start) {
      a.start = a.last = now;
      return;
    }
    a.frames++;
    a.worst = Math.max(a.worst, now - a.last);
    a.last = now;
    if (now - a.start >= WINDOW_MS) {
      perfStore.renderFps = (a.frames * 1000) / (now - a.start);
      perfStore.worstFrameMs = a.worst;
      a.frames = 0;
      a.worst = 0;
      a.start = now;
    }
  });

  return null;
}
