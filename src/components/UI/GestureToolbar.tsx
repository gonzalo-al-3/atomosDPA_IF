import type { ActiveHandMode, HandMode } from '../../hooks/handMode';

interface GestureToolbarProps {
  mode: HandMode;
  onPress: (pressed: ActiveHandMode) => void;
  /** Cámara iniciándose. Los botones siguen activos para poder cancelar o cambiar de modo. */
  busy?: boolean;
}

const BUTTONS: { mode: ActiveHandMode; label: string; title: string }[] = [
  { mode: 'gestures', label: 'Gestos', title: 'Controlar el modelo con la mano, sin mostrar la cámara' },
  { mode: 'gestures+camera', label: 'Gestos + cámara', title: 'Controlar el modelo con la mano y ver la cámara' },
];

/** Botones de la barra superior para elegir el modo de control por gestos. */
export default function GestureToolbar({ mode, onPress, busy = false }: GestureToolbarProps) {
  return (
    <div
      role="group"
      aria-label="Control por gestos"
      aria-busy={busy}
      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
    >
      {BUTTONS.map((b) => {
        const pressed = mode === b.mode;
        return (
          <button
            key={b.mode}
            type="button"
            aria-pressed={pressed}
            title={b.title}
            onClick={() => onPress(b.mode)}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '9999px',
              border: '1px solid',
              borderColor: pressed ? '#38bdf8' : '#1e293b',
              backgroundColor: pressed ? '#0369a1' : '#020617',
              color: '#f8fafc',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: busy ? 'progress' : 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {b.label}
          </button>
        );
      })}
      <span aria-live="polite" style={{ fontSize: '0.75rem', color: '#94a3b8', minWidth: '7.5rem' }}>
        {busy ? 'Iniciando cámara…' : ''}
      </span>
    </div>
  );
}
