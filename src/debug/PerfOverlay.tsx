import { useEffect, useRef } from 'react';
import { perfStore } from './perfStore';
import { handStore } from '../hooks/handStore';
import { PINCH_GRAB, PINCH_RELEASE, ZOOM_MAX, ZOOM_MIN } from '../hooks/handProcessing';

const REFRESH_MS = 250;

/** Valores de los gestos, para calibrar con números. */
function handLines(): string {
  const h = handStore;
  if (!h.present) return 'mano     —';
  const deg = (r: number) => ((r * 180) / Math.PI).toFixed(0).padStart(4);
  return (
    `palma    x ${h.palmX.toFixed(2)}  y ${h.palmY.toFixed(2)}\n` +
    `pinch    ${h.pinchRatio.toFixed(2)}  (agarra <${PINCH_GRAB}, suelta >${PINCH_RELEASE})\n` +
    `agarre   ${h.pinching ? `SÍ  #${h.grabId}` : 'no'}\n` +
    `tamaño   ${h.handSize.toFixed(3)}  ref ${h.grabRefSize.toFixed(3)}  razón ${h.sizeRatio.toFixed(2)}\n` +
    `giro     x ${deg(h.rotationDelta.x)}°  y ${deg(h.rotationDelta.y)}°\n` +
    `zoom     ${h.zoomLevel.toFixed(2)}  (${ZOOM_MIN}–${ZOOM_MAX})`
  );
}

/**
 * Overlay de rendimiento y gestos (solo con ?debug=1; la tecla D lo oculta o muestra).
 * Se actualiza con textContent, sin estado de React.
 */
export default function PerfOverlay() {
  const ref = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const id = setInterval(() => {
      const el = ref.current;
      if (!el) return;
      const p = perfStore;
      const detecting = handStore.detectionFps > 0;
      el.textContent =
        `render   ${p.renderFps.toFixed(1)} fps  (peor ${p.worstFrameMs.toFixed(1)} ms)\n` +
        `detecc.  ${detecting ? `${handStore.detectionFps.toFixed(1)} Hz  (${p.detectMs.toFixed(1)} ms)` : '—'}\n` +
        `delegado ${p.delegate ?? '—'}\n` +
        handLines();
    }, REFRESH_MS);
    const onKey = (e: KeyboardEvent) => {
      const el = ref.current;
      if (el && (e.key === 'd' || e.key === 'D') && !e.repeat) {
        el.style.display = el.style.display === 'none' ? '' : 'none';
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearInterval(id);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <pre
      ref={ref}
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: '1rem',
        top: '1rem',
        margin: 0,
        padding: '0.4rem 0.6rem',
        borderRadius: '6px',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        border: '1px solid #1e293b',
        color: '#a5f3fc',
        fontSize: '0.7rem',
        lineHeight: 1.35,
        pointerEvents: 'none',
        zIndex: 20,
      }}
    />
  );
}
