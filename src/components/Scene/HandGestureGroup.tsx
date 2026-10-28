import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils, type Group } from 'three';
import { handStore } from '../../hooks/handStore';

/** Suavizado exponencial de la escala (mayor = más rápido). */
const SCALE_DAMPING = 8;

/**
 * Aplica los gestos de mano al modelo: integra `rotationDelta` (rad/s) en la rotación
 * y acerca la escala a `zoomLevel`. Lee `handStore` dentro de useFrame (sin estado de React).
 */
export default function HandGestureGroup({ children }: { children: ReactNode }) {
  const group = useRef<Group>(null);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    g.rotation.x += handStore.rotationDelta.x * delta;
    g.rotation.y += handStore.rotationDelta.y * delta;
    const s = MathUtils.damp(g.scale.x, handStore.zoomLevel, SCALE_DAMPING, delta);
    g.scale.setScalar(s);
  });

  return <group ref={group}>{children}</group>;
}
