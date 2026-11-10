import { useRef, useEffect, useLayoutEffect, Suspense, Component, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, useAnimations, Bounds } from '@react-three/drei';
import * as THREE from 'three';
import HandGestureGroup from './HandGestureGroup';
import FpsProbe from '../../debug/FpsProbe';
import { DEBUG } from '../../debug/debugFlag';

const BASE = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;

interface MoleculeViewerProps {
  modelUrl?: string;
  hasAnimation?: boolean;
  /** Con gestos activos el mouse y el touch no controlan el modelo. */
  gesturesActive?: boolean;
}

interface CanvasErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
  modelUrl: string;
}

interface CanvasErrorBoundaryState {
  hasError: boolean;
  errorUrl?: string;
}

interface InnerModelProps {
  modelUrl: string;
  hasAnimation?: boolean;
}

// Error Boundary para capturar fallos de carga en useGLTF sin tumbar la aplicación
class CanvasErrorBoundary extends Component<CanvasErrorBoundaryProps, CanvasErrorBoundaryState> {
    constructor(props: CanvasErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorUrl: props.modelUrl };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    // Si falla la carga, limpiamos el caché de la URL para no bloquear el visor
    if (this.props.modelUrl) {
      try {
        useGLTF.clear(this.props.modelUrl);
      } catch {
        // Ignorar si no estaba en caché
      }
    }
  }

  static getDerivedStateFromProps(nextProps: CanvasErrorBoundaryProps, prevState: CanvasErrorBoundaryState) {
    if (nextProps.modelUrl !== prevState.errorUrl) {
      return { hasError: false, errorUrl: nextProps.modelUrl };
    }
    return null;
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Modelo 3D de prueba generado con código (sin depender de archivos externos)
function ProceduralMolecule() {
  return (
    <group>
      {/* Átomo Central */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color="#ef4444" roughness={0.3} />
      </mesh>
      {/* Átomos periféricos */}
      <mesh position={[1, 0.5, 0]}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.3} />
      </mesh>
      <mesh position={[-1, -0.5, 0]}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.3} />
      </mesh>
    </group>
  );
}

/**
 * Caja envolvente de `root` en el sistema de su padre, sin depender de las transformaciones
 * de los grupos de arriba (gestos, Float). Se usa para centrar cada modelo.
 */
function boxInParentFrame(root: THREE.Object3D): THREE.Box3 {
  root.updateMatrix();
  root.updateMatrixWorld(true);
  const toRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const box = new THREE.Box3();
  const part = new THREE.Box3();
  const m = new THREE.Matrix4();
  root.traverse((obj) => {
    const geometry = (obj as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
    if (!geometry?.attributes?.position) return;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    part.copy(geometry.boundingBox!).applyMatrix4(m.multiplyMatrices(toRoot, obj.matrixWorld));
    box.union(part);
  });
  return box.applyMatrix4(root.matrix);
}

// Componente interno encargado de cargar el archivo .glb y gestionar animaciones
function Model({ modelUrl, hasAnimation }: InnerModelProps) {
  const group = useRef<THREE.Group>(null);
  const offset = useRef<THREE.Group>(null);
  
  // hook useGLTF de Drei para parsear los assets 3D
  const { scene, animations } = useGLTF(modelUrl);
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    if (hasAnimation && actions && Object.keys(actions).length > 0) {
      // Reproducir automáticamente la primera pista de animación detectada
      const firstActionName = Object.keys(actions)[0];
      const action = actions[firstActionName];
      
      action?.reset().fadeIn(0.5).play();

      return () => {
        action?.fadeOut(0.5);
      };
    }
  }, [actions, hasAnimation, modelUrl]);

  // Centrado: el centro de la caja envolvente queda en el origen, para cada modelo que se cargue.
  // (Center de drei solo calcula al montar y no se entera de los cambios de modelo.)
  useLayoutEffect(() => {
    const g = offset.current;
    if (!(g instanceof THREE.Object3D)) return; // (en tests sin WebGL el grupo es un nodo DOM)
    const box = boxInParentFrame(scene);
    if (box.isEmpty()) g.position.set(0, 0, 0);
    else box.getCenter(g.position).negate();
  }, [scene]);

  return (
    <group ref={group} dispose={null}>
      <group ref={offset}>
        <primitive object={scene} />
      </group>
    </group>
  );
}

/**
 * Flotación decorativa (misma fórmula que Float de drei). Al desactivarla vuelve suavemente a la
 * posición neutra; Float de drei se congelaría desplazado y la molécula no quedaría centrada.
 */
function IdleFloat({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const SPEED = 1.5;
  const ROTATION_INTENSITY = 0.2;
  const FLOAT_INTENSITY = 0.4;

  useFrame((state, delta) => {
    const g = ref.current;
    if (!g) return;
    const t = (state.clock.elapsedTime / 4) * SPEED;
    const on = enabled ? 1 : 0;
    const k = 1 - Math.exp(-6 * delta);
    g.rotation.x += ((on * Math.cos(t)) / 8 * ROTATION_INTENSITY - g.rotation.x) * k;
    g.rotation.y += ((on * Math.sin(t)) / 8 * ROTATION_INTENSITY - g.rotation.y) * k;
    g.rotation.z += ((on * Math.sin(t)) / 20 * ROTATION_INTENSITY - g.rotation.z) * k;
    g.position.y += ((on * Math.sin(t)) / 10 * FLOAT_INTENSITY - g.position.y) * k;
  });

  return <group ref={ref}>{children}</group>;
}

// Indicador visual de carga mientras el modelo 3D se descarga
function LoadingFallback() {
  return (
    <mesh>
      <sphereGeometry args={[0.8, 16, 16]} />
      <meshStandardMaterial color="#12c6bd" wireframe />
    </mesh>
  );
}

export default function MoleculeViewer({ 
  modelUrl = `${BASE}models/aspirin.glb`, 
  hasAnimation = false,
  gesturesActive = false,
}: MoleculeViewerProps) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        style={{ background: '#07110f' }}
      >
        {DEBUG && <FpsProbe />}

        {/* Configuración de Iluminación */}
        <ambientLight intensity={0.9} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow />
        <directionalLight position={[-10, -10, -5]} intensity={0.4} />

        {/* Carga diferida con Suspense */}
        <Suspense fallback={<LoadingFallback />}>
          <Bounds fit clip observe margin={1.3}>
            <HandGestureGroup active={gesturesActive} resetKey={modelUrl}>
              {/* Flotación decorativa solo sin gestos: con gestos el centro debe ser estable. */}
              <IdleFloat enabled={!gesturesActive}>
                <CanvasErrorBoundary modelUrl={modelUrl} fallback={<ProceduralMolecule />}>
                  <Model modelUrl={modelUrl} hasAnimation={hasAnimation} />
                </CanvasErrorBoundary>
              </IdleFloat>
            </HandGestureGroup>
          </Bounds>
        </Suspense>

        {/* Controles de cámara táctil / ratón. Se desactivan (sin desmontar) mientras hay gestos,
            para que mano y mouse no compitan; al reactivarlos la cámara sigue donde estaba. */}
        <OrbitControls makeDefault enabled={!gesturesActive} enablePan enableZoom enableRotate />
      </Canvas>
    </div>
  );
}
