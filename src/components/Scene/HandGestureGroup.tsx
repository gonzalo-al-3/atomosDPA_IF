import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { useBounds } from '@react-three/drei';
import { MathUtils, PerspectiveCamera, Quaternion, Vector3, type Group } from 'three';
import { handStore, resetModelTransform } from '../../hooks/handStore';

/** Suavizado exponencial (mayor = sigue más rápido a la mano). */
const ROTATION_DAMPING = 14;
const POSITION_DAMPING = 10;
const SCALE_DAMPING = 8;
/** Velocidad con la que el objetivo de la cámara vuelve al centro al activar los gestos. */
const RECENTER_DAMPING = 4;
/** Cuánto se mueve la molécula por cada "altura de imagen" que se mueve el puño (1 = sigue a la mano). */
const DRAG_GAIN = 1;

interface HandGestureGroupProps {
  children: ReactNode;
  /** Gestos activos. Al apagarlos la molécula vuelve al centro (conserva giro y zoom). */
  active: boolean;
  /** Al cambiar (otro modelo) se reinicia todo: centro, giro y zoom, y se reajusta la cámara. */
  resetKey: string;
}

interface Controls {
  target: Vector3;
}

/**
 * Aplica los gestos de mano leyendo `handStore` dentro de useFrame (sin estado de React).
 * Jerarquía: grupo exterior = posición (origen de la molécula); interior = giro y escala.
 * Así el giro con la mano abierta siempre es sobre el centro de la molécula, esté donde esté.
 */
export default function HandGestureGroup({ children, active, resetKey }: HandGestureGroupProps) {
  const outer = useRef<Group>(null);
  const inner = useRef<Group>(null);
  const bounds = useBounds();
  const st = useRef({
    key: null as string | null,
    grabId: handStore.grabId,
    targetPos: new Vector3(),
    basePos: new Vector3(),
    targetQuat: new Quaternion(),
    unitsPerImageHeight: 1,
    q: new Quaternion(),
    right: new Vector3(),
    up: new Vector3(),
    tmp: new Vector3(),
  });

  useFrame((state, delta) => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const s = st.current;
    const camera = state.camera;

    // Modelo nuevo: todo al centro, sin giro ni zoom, y la cámara se ajusta a su tamaño.
    // Se hace aquí (no en un efecto) para que corra cuando el modelo ya está visible.
    if (s.key !== resetKey) {
      s.key = resetKey;
      s.targetPos.set(0, 0, 0);
      s.targetQuat.identity();
      s.grabId = handStore.grabId;
      o.position.set(0, 0, 0);
      i.quaternion.identity();
      i.scale.setScalar(1);
      resetModelTransform();
      bounds?.refresh().clip().fit();
    }

    // Ejes de la pantalla en el mundo (la cámara está quieta mientras hay gestos).
    s.right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    s.up.set(0, 1, 0).applyQuaternion(camera.quaternion);

    // Giro con la mano abierta: se consume lo acumulado por la detección.
    const rx = handStore.rotationAccum.x;
    const ry = handStore.rotationAccum.y;
    handStore.rotationAccum.x = 0;
    handStore.rotationAccum.y = 0;

    if (active) {
      // El centro de la pantalla vuelve a ser el origen (por si se paneó con el mouse).
      const controls = state.controls as unknown as Controls | null;
      if (controls && controls.target.lengthSq() > 1e-8) {
        s.tmp.copy(controls.target).multiplyScalar(-(1 - Math.exp(-RECENTER_DAMPING * delta)));
        controls.target.add(s.tmp);
        camera.position.add(s.tmp);
      }

      if (rx || ry) {
        s.q.setFromAxisAngle(s.up, ry);
        s.targetQuat.premultiply(s.q);
        s.q.setFromAxisAngle(s.right, rx);
        s.targetQuat.premultiply(s.q);
      }

      // Puño: desplazar el origen siguiendo a la mano.
      if (handStore.grabbing) {
        if (s.grabId !== handStore.grabId) {
          s.grabId = handStore.grabId;
          s.basePos.copy(s.targetPos);
          // Escala mano → mundo calculada una vez por agarre, a la distancia de la molécula.
          const fov = camera instanceof PerspectiveCamera ? camera.fov : 45;
          const dist = camera.position.distanceTo(o.getWorldPosition(s.tmp));
          s.unitsPerImageHeight = 2 * dist * Math.tan(MathUtils.degToRad(fov) / 2) * DRAG_GAIN;
        }
        s.targetPos
          .copy(s.basePos)
          .addScaledVector(s.right, handStore.dragOffset.x * s.unitsPerImageHeight)
          .addScaledVector(s.up, -handStore.dragOffset.y * s.unitsPerImageHeight);
      }
    } else {
      // Sin gestos la molécula vuelve al centro; giro y zoom se conservan.
      s.targetPos.set(0, 0, 0);
    }

    o.position.lerp(s.targetPos, 1 - Math.exp(-POSITION_DAMPING * delta));
    i.quaternion.slerp(s.targetQuat, 1 - Math.exp(-ROTATION_DAMPING * delta));
    i.scale.setScalar(MathUtils.damp(i.scale.x, handStore.zoomLevel, SCALE_DAMPING, delta));
  });

  return (
    <group ref={outer}>
      <group ref={inner}>{children}</group>
    </group>
  );
}
