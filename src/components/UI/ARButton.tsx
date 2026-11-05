import React, { useState, useEffect } from 'react';

// Declaración para que TypeScript reconozca el Web Component <model-viewer> en JSX
declare module 'react' {
  // Aumentar el namespace JSX de React solo puede hacerse con sintaxis de namespace.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          alt?: string;
          ar?: boolean;
          'ar-modes'?: string;
          'ar-placement'?: 'floor' | 'wall';
          'ar-scale'?: 'auto' | 'fixed';
          'shadow-intensity'?: string | number;
          'camera-controls'?: boolean;
          'auto-rotate'?: boolean;
          autoplay?: boolean;
          'touch-action'?: string;
        },
        HTMLElement
      >;
    }
  }
}

interface ARButtonProps {
  modelUrl: string;
  modelName?: string;
}

export default function ARButton({
  modelUrl,
  modelName = 'Sistema Atómico',
}: ARButtonProps) {
  const [isARSupportedDevice, setIsARSupportedDevice] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const checkMobileCompatibility = () => {
      const ua = navigator.userAgent || navigator.vendor || (window as unknown as { opera?: string }).opera || '';
      const isAndroid = /android/i.test(ua);
      const isIOS =
        /iPad|iPhone|iPod/.test(ua) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const hasXR = 'xr' in navigator;

      // Se activa en dispositivos móviles (Android / iOS) o navegadores con soporte WebXR móvil
      setIsARSupportedDevice(isAndroid || isIOS || (hasXR && navigator.maxTouchPoints > 0));
    };

    checkMobileCompatibility();
  }, []);

  // Criterio de aceptación: En computadoras de escritorio se oculta de forma transparente
  if (!isARSupportedDevice || !modelUrl) {
    return null;
  }

  return (
    <>
      {/* Botón flotante "Ver en RA" sobre el lienzo 3D */}
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        aria-label="Ver en Realidad Aumentada"
        style={{
          position: 'absolute',
          top: '1.5rem',
          right: '1.5rem',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1.25rem',
          backgroundColor: '#0284c7',
          color: '#f8fafc',
          border: '1px solid #38bdf8',
          borderRadius: '9999px',
          fontWeight: 600,
          fontSize: '0.9rem',
          boxShadow: '0 8px 20px rgba(2, 132, 199, 0.45)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        <span role="img" aria-hidden="true">📷</span>
        <span>Ver en RA</span>
      </button>

      {/* Modal del Visor RA con instrucciones y <model-viewer> */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ar-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            backgroundColor: 'rgba(2, 6, 23, 0.85)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '1rem',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '420px',
              backgroundColor: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '12px',
              overflow: 'hidden',
              color: '#f8fafc',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.6)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Encabezado del Modal */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.9rem 1.2rem',
                borderBottom: '1px solid #1e293b',
              }}
            >
              <h3
                id="ar-modal-title"
                style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#38bdf8' }}
              >
                Realidad Aumentada — {modelName}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Cerrar modal de Realidad Aumentada"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  padding: '0.2rem 0.4rem',
                }}
              >
                ✕
              </button>
            </div>

            {/* Instrucción breve para el usuario */}
            <div
              style={{
                padding: '0.85rem 1.2rem',
                backgroundColor: '#020617',
                borderBottom: '1px solid #1e293b',
                fontSize: '0.85rem',
                lineHeight: 1.45,
                color: '#cbd5e1',
              }}
            >
              <strong style={{ color: '#38bdf8' }}>Instrucciones:</strong> Mueve tu teléfono en círculos sobre la mesa para detectar la superficie y proyectar el modelo a escala fija.
            </div>

            {/* Contenedor de <model-viewer> con las propiedades requeridas */}
            <div style={{ width: '100%', height: '340px', position: 'relative' }}>
              <model-viewer
                src={modelUrl}
                alt={`Modelo 3D en Realidad Aumentada de ${modelName}`}
                ar
                ar-modes="scene-viewer quick-look webxr"
                ar-placement="floor"
                ar-scale="fixed"
                shadow-intensity="1"
                camera-controls
                auto-rotate
                autoplay
                touch-action="pan-y"
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#0f172a',
                }}
              >
                <button
                  slot="ar-button"
                  style={{
                    position: 'absolute',
                    bottom: '16px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#0284c7',
                    color: '#f8fafc',
                    border: '1px solid #38bdf8',
                    borderRadius: '9999px',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    boxShadow: '0 6px 16px rgba(2, 132, 199, 0.5)',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                  }}
                >
                  Activar cámara RA
                </button>
              </model-viewer>
            </div>
          </div>
        </div>
      )}
    </>
  );
}