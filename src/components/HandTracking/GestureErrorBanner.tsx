interface GestureErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

/** Aviso de error de la cámara / gestos, arriba al centro del visor. */
export default function GestureErrorBanner({ message, onDismiss }: GestureErrorBannerProps) {
  return (
    <div
      role="alert"
      style={{
        position: 'absolute',
        top: '1rem',
        left: '50%',
        transform: 'translateX(-50%)',
        maxWidth: 'calc(100% - 2rem)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.6rem 0.9rem',
        borderRadius: '8px',
        backgroundColor: 'rgba(69, 10, 10, 0.92)',
        border: '1px solid #f87171',
        color: '#fecaca',
        fontSize: '0.85rem',
        zIndex: 30,
        boxSizing: 'border-box',
      }}
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Cerrar aviso"
        style={{ border: 'none', background: 'transparent', color: '#fecaca', fontSize: '1.1rem', cursor: 'pointer', lineHeight: 1 }}
      >
        ×
      </button>
    </div>
  );
}
