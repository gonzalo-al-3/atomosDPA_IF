import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils, Quaternion, Vector3, type Group } from 'three';
import { handStore } from '../../hooks/handStore';

/** Suavizado exponencial (mayor = sigue más rápido a la mano). */
const ROTATION_DAMPING = 12;
const SCALE_DAMPING = 8;

const X_AXIS = new Vector3(1, 0, 0);
const Y_AXIS = new Vector3(0, 1, 0);

/**
 * Aplica los gestos de mano al modelo leyendo `handStore` dentro de useFrame (sin estado de React).
 * Al agarrar guarda la rotación actual como base; mientras dura el agarre el objetivo es
 * base + rotationDelta (en ejes de pantalla). Al soltar el objetivo no cambia: el modelo se queda.
 */
export default function HandGestureGroup({ children }: { children: ReactNode }) {
  const group = useRef<Group>(null);
  const state = useRef({
    grabId: handStore.grabId,
    base: new Quaternion(),
    target: new Quaternion(),
    qx: new Quaternion(),
    qy: new Quaternion(),
  });

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const st = state.current;

    if (handStore.pinching) {
      if (st.grabId !== handStore.grabId) {
        st.grabId = handStore.grabId;
        st.base.copy(g.quaternion);
      }
      // Giros en ejes de mundo (pantalla), aplicados sobre la orientación al agarrar.
      st.qx.setFromAxisAngle(X_AXIS, handStore.rotationDelta.x);
      st.qy.setFromAxisAngle(Y_AXIS, handStore.rotationDelta.y);
      st.target.copy(st.base).premultiply(st.qx).premultiply(st.qy);
    }

    // target empieza en la identidad, igual que el grupo.
    g.quaternion.slerp(st.target, 1 - Math.exp(-ROTATION_DAMPING * delta));
    const s = MathUtils.damp(g.scale.x, handStore.zoomLevel, SCALE_DAMPING, delta);
    g.scale.setScalar(s);
  });

  return <group ref={group}>{children}</group>;
}
