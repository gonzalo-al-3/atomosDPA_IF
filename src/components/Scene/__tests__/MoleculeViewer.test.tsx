import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MoleculeViewer from '../MoleculeViewer';

// 1. Mock de React Three Fiber (Lienzo 3D)
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="r3f-canvas">{children}</div>
  ),
  useFrame: vi.fn(),
}));

// 2. Mock de Drei (Hooks y Componentes 3D) para no requerir contexto WebGL en JSDOM
vi.mock('@react-three/drei', () => ({
  useGLTF: vi.fn(() => ({
    scene: {},
    animations: [],
  })),
  useAnimations: vi.fn(() => ({
    actions: {},
  })),
  OrbitControls: () => <div data-testid="orbit-controls" />,
  Center: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Float: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('MoleculeViewer Component', () => {
  it('renderiza el contenedor del canvas 3D y los controles correctamente', () => {
    render(<MoleculeViewer modelUrl="/models/aspirin.glb" hasAnimation={false} />);
    
    // Verifica que el lienzo simulación exista
    const canvasElement = screen.getByTestId('r3f-canvas');
    expect(canvasElement).toBeInTheDocument();

    // Verifica que los controles de órbita simulados se hayan montado
    const controlsElement = screen.getByTestId('orbit-controls');
    expect(controlsElement).toBeInTheDocument();
  });
});
