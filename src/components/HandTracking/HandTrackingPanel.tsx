import { useEffect, useRef } from 'react';
import { handStore, LANDMARK_COUNT } from '../../hooks/handStore';

const W = 320;
const H = 240;

// Conexiones de la mano en MediaPipe (índices de los 21 landmarks).
const CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

interface HandTrackingPanelProps {
  /** Ref callback del hook: conecta este <video> al stream ya abierto. */
  attachPreview: (video: HTMLVideoElement | null) => void;
  starting: boolean;
  /** Cierra el recuadro (pasa a modo "gestos", no apaga). */
  onClose: () => void;
}

/** Recuadro flotante con la imagen de la cámara y los 21 landmarks (modo "Gestos + cámara"). */
export default function HandTrackingPanel({ attachPreview, starting, onClose }: HandTrackingPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Dibujo de los landmarks: bucle propio que lee el store, sin pasar por el estado de React.
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      if (handStore.present) {
        const lm = handStore.smoothLandmarks;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (const [a, b] of CONNECTIONS) {
          ctx.moveTo(lm[a * 3] * W, lm[a * 3 + 1] * H);
          ctx.lineTo(lm[b * 3] * W, lm[b * 3 + 1] * H);
        }
        ctx.stroke();
        ctx.fillStyle = handStore.pinching ? '#22c55e' : '#f97316';
        for (let i = 0; i < LANDMARK_COUNT; i++) {
          ctx.beginPath();
          ctx.arc(lm[i * 3] * W, lm[i * 3 + 1] * H, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      role="region"
      aria-label="Imagen de la cámara"
      style={{
        position: 'absolute',
        right: '1rem',
        bottom: '1rem',
        width: W,
        maxWidth: 'calc(100% - 2rem)',
        padding: '0.6rem',
        borderRadius: '10px',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        border: '1px solid #1e293b',
        color: '#f8fafc',
        zIndex: 10,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
          {starting ? 'Iniciando cámara…' : 'Cámara activa — la imagen no sale de este equipo'}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar recuadro de la cámara (los gestos siguen activos)"
          title="Cerrar recuadro (los gestos siguen activos)"
          style={{
            border: 'none',
            background: 'transparent',
            color: '#94a3b8',
            fontSize: '1.1rem',
            lineHeight: 1,
            cursor: 'pointer',
            padding: '0 0.25rem',
          }}
        >
          ×
        </button>
      </div>

      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: `${W} / ${H}`,
          backgroundColor: '#020617',
          borderRadius: '6px',
          overflow: 'hidden',
          transform: 'scaleX(-1)', // vista espejo
        }}
      >
        <video
          ref={attachPreview}
          muted
          playsInline
          autoPlay
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
}
