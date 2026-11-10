import { useEffect, useRef } from 'react';
import { handStore, LANDMARK_COUNT } from '../../hooks/handStore';

// Resolución interna del canvas de landmarks (se escala por CSS al tamaño del recuadro).
const W = 320;
const H = 240;
/** Ancho del recuadro en escritorio (px). En móvil lo fija App.css. */
const PREVIEW_WIDTH = 240;

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
        ctx.strokeStyle = '#12c6bd';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (const [a, b] of CONNECTIONS) {
          ctx.moveTo(lm[a * 3] * W, lm[a * 3 + 1] * H);
          ctx.lineTo(lm[b * 3] * W, lm[b * 3 + 1] * H);
        }
        ctx.stroke();
        ctx.fillStyle = handStore.grabbing ? '#2bdd48' : '#12c6bd';
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
      className="hand-preview"
      role="region"
      aria-label="Imagen de la cámara (no sale de este equipo)"
      style={{
        position: 'absolute',
        right: '1rem',
        bottom: '1rem',
        width: PREVIEW_WIDTH,
        maxWidth: 'calc(100% - 2rem)',
        aspectRatio: `${W} / ${H}`,
        borderRadius: '6px',
        overflow: 'hidden',
        backgroundColor: '#050d0c',
        zIndex: 10,
      }}
    >
      {/* Video y landmarks en espejo; el botón queda fuera para no invertirse. */}
      <div style={{ position: 'absolute', inset: 0, transform: 'scaleX(-1)' }}>
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

      {starting && (
        <span
          className="hand-preview-status"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            fontSize: '0.75rem',
            color: '#94b9b4',
          }}
        >
          Iniciando…
        </span>
      )}

      <button
        className="hand-preview-close"
        type="button"
        onClick={onClose}
        aria-label="Cerrar recuadro de la cámara (los gestos siguen activos)"
        title="Cerrar recuadro (los gestos siguen activos)"
        style={{
          position: 'absolute',
          top: '4px',
          right: '4px',
          width: '22px',
          height: '22px',
          display: 'grid',
          placeItems: 'center',
          padding: 0,
          border: 'none',
          borderRadius: '50%',
          background: 'rgba(5, 13, 12, 0.55)',
          color: '#e8fbf8',
          fontSize: '0.95rem',
          lineHeight: 1,
          cursor: 'pointer',
        }}
      >
        ×
      </button>
    </div>
  );
}
