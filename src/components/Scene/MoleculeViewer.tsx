import { useRef, useEffect, Suspense, Component, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, useAnimations, Center, Float } from '@react-three/drei';
import * as THREE from 'three';
import HandGestureGroup from './HandGestureGroup';

const BASE = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;

interface MoleculeViewerProps {
  modelUrl?: string;
  hasAnimation?: boolean;
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

// Componente interno encargado de cargar el archivo .glb y gestionar animaciones
function Model({ modelUrl, hasAnimation }: InnerModelProps) {
  const group = useRef<THREE.Group>(null);
  
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

  return (
    <group ref={group} dispose={null}>
      <primitive object={scene} />
    </group>
  );
}

// Indicador visual de carga mientras el modelo 3D se descarga
function LoadingFallback() {
  return (
    <mesh>
      <sphereGeometry args={[0.8, 16, 16]} />
      <meshStandardMaterial color="#38bdf8" wireframe />
    </mesh>
  );
}

export default function MoleculeViewer({ 
  modelUrl = `${BASE}models/aspirin.glb`, 
  hasAnimation = false 
}: MoleculeViewerProps) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        style={{ background: '#020617' }}
      >
        {/* Configuración de Iluminación */}
        <ambientLight intensity={0.9} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow />
        <directionalLight position={[-10, -10, -5]} intensity={0.4} />

        {/* Carga diferida con Suspense */}
        <Suspense fallback={<LoadingFallback />}>
          <HandGestureGroup>
            <Center>
              <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.4}>
                <CanvasErrorBoundary modelUrl={modelUrl} fallback={<ProceduralMolecule />}>
                  <Model modelUrl={modelUrl} hasAnimation={hasAnimation} />
                </CanvasErrorBoundary>
              </Float>
            </Center>
          </HandGestureGroup>
        </Suspense>

        {/* Controles de cámara táctil / ratón.
            TODO: deshabilitar (enabled={false}) cuando la cámara de gestos esté activa, para que
            ratón y mano no compitan. Por ahora conviven con HandGestureGroup. */}
        <OrbitControls makeDefault enablePan enableZoom enableRotate />
      </Canvas>
    </div>
  );
}
