import { useEffect, useRef, useState } from 'react';
import { useHandTracking } from '../../hooks/useHandTracking';
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

const btn = (bg: string): React.CSSProperties => ({
  flex: 1,
  padding: '0.45rem 0.6rem',
  borderRadius: '6px',
  border: 'none',
  backgroundColor: bg,
  color: '#f8fafc',
  fontSize: '0.8rem',
  cursor: 'pointer',
});

export default function HandTrackingPanel() {
  const { status, error, videoRef, start, stop } = useHandTracking();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const readoutRef = useRef<HTMLPreElement>(null);
  const [debug, setDebug] = useState(import.meta.env.DEV);
  const active = status === 'on';

  // Dibujo del overlay: bucle propio que lee el store, sin pasar por el estado de React.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !active || !debug) {
      ctx?.clearRect(0, 0, W, H);
      return;
    }
    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const lm = handStore.smoothLandmarks;
      const raw = handStore.landmarks;
      if (handStore.present) {
        // Landmarks crudos: anillos grises grandes, visibles aunque el punto suavizado quede encima.
        ctx.strokeStyle = 'rgba(203, 213, 225, 0.9)';
        ctx.lineWidth = 1;
        for (let i = 0; i < LANDMARK_COUNT; i++) {
          ctx.beginPath();
          ctx.arc(raw[i * 3] * W, raw[i * 3 + 1] * H, 6, 0, Math.PI * 2);
          ctx.stroke();
        }
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
      const out = readoutRef.current;
      if (out) {
        const h = handStore;
        out.textContent = h.present
          ? `fps det  ${h.detectionFps.toFixed(1)}\n` +
            `palma    x ${h.palmX.toFixed(2)}  y ${h.palmY.toFixed(2)}\n` +
            `tamaño   ${h.handSize.toFixed(3)}\n` +
            `pinch    ${h.pinchRatio.toFixed(2)}  ${h.pinching ? 'CERRADO' : 'abierto'}\n` +
            `rotDelta x ${h.rotationDelta.x.toFixed(2)}  y ${h.rotationDelta.y.toFixed(2)} rad/s\n` +
            `zoom     ${h.zoomLevel.toFixed(2)}`
          : `fps det  ${h.detectionFps.toFixed(1)}\nsin mano`;
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [active, debug]);

  const label =
    status === 'loading' ? 'Cargando…' : status === 'error' ? (error ?? 'Error') : null;

  return (
    <div
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
          ref={videoRef}
          muted
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: active ? 'block' : 'none' }}
        />
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />
      </div>

      {active && debug && (
        <pre
          ref={readoutRef}
          style={{ margin: '0.4rem 0 0', fontSize: '0.7rem', lineHeight: 1.35, color: '#a5f3fc', whiteSpace: 'pre' }}
        />
      )}

      <div style={{ fontSize: '0.75rem', color: status === 'error' ? '#f87171' : '#94a3b8', margin: '0.4rem 0' }}>
        {label ?? (active ? 'Cámara activa' : 'Cámara apagada — se activa solo con el botón')}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={start}
          disabled={status === 'loading' || active}
          style={{ ...btn('#0369a1'), opacity: status === 'loading' || active ? 0.5 : 1 }}
        >
          Activar cámara
        </button>
        <button
          onClick={stop}
          disabled={status === 'off'}
          style={{ ...btn('#475569'), opacity: status === 'off' ? 0.5 : 1 }}
        >
          Desactivar
        </button>
      </div>

      {import.meta.env.DEV && (
        <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.4rem' }}>
          <input type="checkbox" checked={debug} onChange={(e) => setDebug(e.target.checked)} /> Mostrar landmarks
        </label>
      )}
    </div>
  );
}
