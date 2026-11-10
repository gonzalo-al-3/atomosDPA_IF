import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface ModelViewerElement extends HTMLElement {
  activateAR: () => Promise<void>;
  toBlob: (options?: { idealAspect?: boolean }) => Promise<Blob>;
  canActivateAR?: boolean;
  scale: string;
}

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
          scale?: string;
          'shadow-intensity'?: string | number;
          'camera-controls'?: boolean;
          'disable-pan'?: boolean;
          'auto-rotate'?: boolean;
          autoplay?: boolean;
          loading?: 'auto' | 'lazy' | 'eager';
          reveal?: 'auto' | 'manual';
          'touch-action'?: string;
          ref?: React.Ref<ModelViewerElement>;
        },
        HTMLElement
      >;
    }
  }
}

interface ARButtonProps {
  modelUrl: string;
  modelName?: string;
  compact?: boolean;
}

const SCALE_PRESETS = [
  { label: 'Compacto (~15 cm)', short: '15 cm', value: '0.035 0.035 0.035' },
  { label: 'Mesa (~25 cm)', short: '25 cm', value: '0.06 0.06 0.06' },
  { label: 'Mediano (~45 cm)', short: '45 cm', value: '0.12 0.12 0.12' },
];

export default function ARButton({
  modelUrl,
  modelName = 'Sistema Atómico',
  compact = false,
}: ARButtonProps) {
  const [isARSupportedDevice, setIsARSupportedDevice] = useState<boolean>(false);
  const [isAndroidDevice, setIsAndroidDevice] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isModelLoaded, setIsModelLoaded] = useState<boolean>(false);
  const [selectedScale, setSelectedScale] = useState<string>(SCALE_PRESETS[1].value);
  const [allowPinchScale, setAllowPinchScale] = useState<boolean>(true);
  const [isInARSession, setIsInARSession] = useState<boolean>(false);
  const [hideARHudForPhoto, setHideARHudForPhoto] = useState<boolean>(false);
  const [photoToast, setPhotoToast] = useState<string | null>(null);
  const [arError, setArError] = useState<string | null>(null);
  const [selectedARMode, setSelectedARMode] = useState<'scene-viewer' | 'webxr'>('scene-viewer');

  const modelViewerRef = useRef<ModelViewerElement | null>(null);
  // Guardamos en caché una captura válida del lienzo 3D antes de entrar a WebXR
  // porque durante la sesión WebXR el navegador vacía el canvas estándar
  const cachedModelBlobRef = useRef<Blob | null>(null);

  const absoluteModelUrl = useMemo(() => {
    if (!modelUrl) return '';
    try {
      return new URL(modelUrl, window.location.origin).href;
    } catch {
      return modelUrl;
    }
  }, [modelUrl]);

  useEffect(() => {
    const checkMobileCompatibility = () => {
      const ua =
        navigator.userAgent ||
        navigator.vendor ||
        (window as unknown as { opera?: string }).opera ||
        '';
      const isAndroid = /android/i.test(ua);
      const isIOS =
        /iPad|iPhone|iPod/.test(ua) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const hasXR = 'xr' in navigator;

      setIsAndroidDevice(isAndroid);
      setIsARSupportedDevice(
        isAndroid || isIOS || (hasXR && navigator.maxTouchPoints > 0)
      );
    };

    checkMobileCompatibility();
  }, []);

  // Compone una postal PNG con fondo oscuro y encabezado para que nunca salga transparente ni en blanco
  const buildPostcardBlob = useCallback(
    async (rawModelBlob: Blob): Promise<Blob> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(rawModelBlob);

        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          const width = Math.max(img.width, 800);
          const height = Math.max(img.height, 800) + 110;

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            resolve(rawModelBlob);
            return;
          }

          // Fondo oscuro institucional para que nunca se vea blanco/vacío
          const gradient = ctx.createLinearGradient(0, 0, 0, height);
          gradient.addColorStop(0, '#0d1d1b');
          gradient.addColorStop(1, '#050d0c');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, width, height);

          // Dibujar la molécula centrada
          const x = (width - img.width) / 2;
          const y = (height - 110 - img.height) / 2;
          ctx.drawImage(img, x, y);

          // Pie de postal con nombre de la molécula y evento
          ctx.fillStyle = '#0d1d1b';
          ctx.fillRect(0, height - 110, width, 110);
          ctx.strokeStyle = '#225c54';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, height - 110);
          ctx.lineTo(width, height - 110);
          ctx.stroke();

          ctx.fillStyle = '#12c6bd';
          ctx.font = 'bold 28px system-ui, sans-serif';
          ctx.fillText(modelName, 32, height - 60);

          ctx.fillStyle = '#94b9b4';
          ctx.font = '20px system-ui, sans-serif';
          ctx.fillText('¡Átomos a la vista! — IF-UNAM', 32, height - 24);

          canvas.toBlob((finalBlob) => {
            if (finalBlob) resolve(finalBlob);
            else reject(new Error('No se pudo generar la postal'));
          }, 'image/png');
        };

        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(rawModelBlob);
        };

        img.src = objectUrl;
      });
    },
    [modelName]
  );

  useEffect(() => {
    if (!isModalOpen) return;

    const viewer = modelViewerRef.current;
    if (!viewer) return;

    const handleLoad = async () => {
      setIsModelLoaded(true);
      setArError(null);
      // Pre-capturamos el modelo apenas carga en el modal (cuando el canvas WebGL sí tiene los píxeles)
      setTimeout(async () => {
        try {
          if (modelViewerRef.current) {
            const rawBlob = await modelViewerRef.current.toBlob({ idealAspect: true });
            cachedModelBlobRef.current = rawBlob;
          }
        } catch {
          // Ignorar silenciosamente si aún no está listo
        }
      }, 350);
    };

    const handleError = () => {
      setArError(
        'No se pudo cargar el archivo 3D (.glb). Verifica tu conexión e inténtalo de nuevo.'
      );
    };

    const handleArStatus = (event: Event) => {
      const customEvent = event as CustomEvent<{ status: string }>;
      const status = customEvent.detail?.status;

      if (status === 'session-started' || status === 'object-placed') {
        setIsInARSession(true);
      } else if (status === 'not-presenting') {
        setIsInARSession(false);
      } else if (status === 'failed') {
        setIsInARSession(false);
        setArError(
          'La cámara RA no pudo iniciarse. Asegúrate de dar permisos de cámara a Google Chrome.'
        );
      }
    };

    viewer.addEventListener('load', handleLoad);
    viewer.addEventListener('error', handleError);
    viewer.addEventListener('ar-status', handleArStatus);

    return () => {
      viewer.removeEventListener('load', handleLoad);
      viewer.removeEventListener('error', handleError);
      viewer.removeEventListener('ar-status', handleArStatus);
    };
  }, [isModalOpen, absoluteModelUrl]);

  const handleOpenModal = () => {
    setIsModelLoaded(false);
    setArError(null);
    setIsInARSession(false);
    cachedModelBlobRef.current = null;
    setIsModalOpen(true);
  };

  const handleManualActivateAR = async () => {
    const viewer = modelViewerRef.current;
    if (!viewer) return;

    try {
      setArError(null);
      // Actualizamos la captura en caché justo antes de lanzar la cámara WebXR
      try {
        cachedModelBlobRef.current = await viewer.toBlob({ idealAspect: true });
      } catch {
        // Continuar aunque falle la caché
      }
      await viewer.activateAR();
    } catch {
      setArError(
        'No se pudo abrir la cámara. Prueba abriendo esta página directamente en Google Chrome (Android) o Safari (iOS).'
      );
    }
  };

  // Toma la foto del modelo (en el modal) o limpia la pantalla en WebXR para tomar captura con cámara
  const handleSnapshot = async () => {
    const viewer = modelViewerRef.current;
    if (!viewer || !isModelLoaded) return;

    // Si estamos dentro de la cámara WebXR, limpiamos todos los botones 4 segundos para que
    // el usuario tome la captura real con la cámara de fondo sin estorbos en pantalla
    if (isInARSession) {
      setHideARHudForPhoto(true);
      setPhotoToast('📸 Pantalla limpia por 4s: presiona Volumen Abajo + Encendido para capturar la cámara');
      setTimeout(() => {
        setPhotoToast(null);
      }, 1800);
      setTimeout(() => {
        setHideARHudForPhoto(false);
      }, 4500);
      return;
    }

    try {
      const rawBlob = await viewer.toBlob({ idealAspect: true });
      cachedModelBlobRef.current = rawBlob;
      const postcardBlob = await buildPostcardBlob(rawBlob);

      const url = URL.createObjectURL(postcardBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${modelName.replace(/\s+/g, '_')}_IF_UNAM.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      setArError('No se pudo guardar la captura en este navegador.');
    }
  };

  if ((!isARSupportedDevice && !compact) || !modelUrl) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpenModal}
        aria-label="Ver en Realidad Aumentada"
        aria-pressed={isModalOpen}
        disabled={!isARSupportedDevice}
        title={isARSupportedDevice ? 'Abrir Realidad Aumentada' : 'Realidad Aumentada no disponible en este dispositivo'}
        style={{
          position: compact ? 'static' : 'absolute',
          top: compact ? undefined : '1.25rem',
          right: compact ? undefined : '1.25rem',
          zIndex: compact ? undefined : 50,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: compact ? '0.7rem 1.15rem' : '0.7rem 1.2rem',
          backgroundColor: !isARSupportedDevice ? 'transparent' : '#12c6bd',
          color: !isARSupportedDevice ? '#718984' : '#041210',
          border: '1px solid',
          borderColor: !isARSupportedDevice ? '#29554e' : '#12c6bd',
          borderRadius: compact ? '7px' : '9999px',
          fontWeight: 600,
          fontSize: '0.9rem',
          boxShadow: compact || !isARSupportedDevice ? 'none' : '0 8px 20px rgba(18, 198, 189, 0.3)',
          cursor: isARSupportedDevice ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s ease',
        }}
      >
        <span aria-hidden="true">{compact ? 'RA' : '◉'}</span>
        {!compact && <span>Ver en RA</span>}
      </button>

      {isModalOpen && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ar-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            backgroundColor: 'rgba(1, 8, 7, 0.88)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '1rem',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '420px',
              backgroundColor: '#0d1d1b',
              border: '1px solid #225c54',
              borderRadius: '12px',
              overflow: 'hidden',
              color: '#e8fbf8',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.6)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: 'calc(100dvh - 2rem)',
              overflowY: 'auto',
              overscrollBehavior: 'contain',
            }}
          >
            {/* Encabezado */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.85rem 1.2rem',
                borderBottom: '1px solid #225c54',
              }}
            >
              <h3
                id="ar-modal-title"
                style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#12c6bd' }}
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
                  color: '#94b9b4',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  padding: '0.2rem 0.4rem',
                }}
              >
                ✕
              </button>
            </div>

            {/* Instrucciones táctiles claras */}
            <div
              style={{
                padding: '0.75rem 1.2rem',
                backgroundColor: '#050d0c',
                borderBottom: '1px solid #225c54',
                fontSize: '0.8rem',
                lineHeight: 1.45,
                color: '#c1e0dc',
              }}
            >
              <strong style={{ color: '#12c6bd' }}>Instrucciones:</strong> Mueve tu teléfono en círculos sobre la mesa para detectar la superficie. Una vez anclada: <strong>1 dedo</strong> la mueve por la mesa, <strong>2 dedos</strong> la giran o cambian su tamaño.
            </div>

            {isAndroidDevice && (
              <div className="ar-mode-picker">
                <span className="ar-mode-picker-label">Modo RA</span>
                <div className="ar-mode-buttons" role="group" aria-label="Modo de Realidad Aumentada">
                  <button
                    type="button"
                    className={selectedARMode === 'scene-viewer' ? 'is-selected' : ''}
                    aria-pressed={selectedARMode === 'scene-viewer'}
                    onClick={() => setSelectedARMode('scene-viewer')}
                  >
                    Scene Viewer
                  </button>
                  <button
                    type="button"
                    className={selectedARMode === 'webxr' ? 'is-selected' : ''}
                    aria-pressed={selectedARMode === 'webxr'}
                    onClick={() => setSelectedARMode('webxr')}
                  >
                    WebXR
                  </button>
                </div>
              </div>
            )}

            {/* Controles de tamaño inicial y modo táctil */}
            <div
              style={{
                padding: '0.6rem 1.2rem',
                backgroundColor: '#0d1d1b',
                borderBottom: '1px solid #225c54',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
                fontSize: '0.76rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ color: '#94b9b4', fontWeight: 600 }}>Tamaño:</span>
                {SCALE_PRESETS.map((preset) => {
                  const active = selectedScale === preset.value;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setSelectedScale(preset.value)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '6px',
                        border: '1px solid',
                        borderColor: active ? '#12c6bd' : '#28635a',
                        backgroundColor: active ? '#087e73' : '#17413b',
                        color: '#e8fbf8',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                      }}
                    >
                      {preset.short}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setAllowPinchScale((prev) => !prev)}
                style={{
                  padding: '0.25rem 0.55rem',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: allowPinchScale ? '#2bdd48' : '#38635d',
                  backgroundColor: allowPinchScale ? 'rgba(43, 221, 72, 0.14)' : '#17413b',
                  color: allowPinchScale ? '#54ed67' : '#94b9b4',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                }}
              >
                {allowPinchScale ? '🖐️ Zoom táctil: Sí' : '🔒 Escala fija'}
              </button>
            </div>

            {arError && (
              <div
                style={{
                  padding: '0.65rem 1.2rem',
                  backgroundColor: '#450a0a',
                  borderBottom: '1px solid #dc2626',
                  fontSize: '0.8rem',
                  color: '#fca5a5',
                }}
              >
                ⚠️ {arError}
              </div>
            )}

            {/* Visor <model-viewer> con interfaz superpuesta (DOM Overlay) para WebXR */}
            <div style={{ width: '100%', height: '280px', position: 'relative' }}>
              <model-viewer
                ref={modelViewerRef}
                src={absoluteModelUrl}
                alt={`Modelo 3D en Realidad Aumentada de ${modelName}`}
                ar
                ar-modes={isAndroidDevice ? selectedARMode : 'webxr scene-viewer quick-look'}
                ar-placement="floor"
                ar-scale={allowPinchScale ? 'auto' : 'fixed'}
                scale={selectedScale}
                shadow-intensity="1"
                loading="eager"
                reveal="auto"
                camera-controls
                auto-rotate
                autoplay
                touch-action="none"
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#0d1d1b',
                }}
              >
                <button slot="ar-button" style={{ display: 'none' }} />

                {/* Controles flotantes visibles DENTRO de la cámara WebXR */}
                {isInARSession && !hideARHudForPhoto && (
                  <div
                    style={{
                      position: 'fixed',
                      bottom: '28px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      zIndex: 9999,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '10px',
                      width: '92%',
                      maxWidth: '380px',
                      pointerEvents: 'auto',
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: 'rgba(15, 23, 42, 0.82)',
                        color: '#e8fbf8',
                        padding: '6px 12px',
                        borderRadius: '9999px',
                        fontSize: '12px',
                        border: '1px solid rgba(56, 189, 248, 0.4)',
                        textAlign: 'center',
                      }}
                    >
                      👆 1 dedo: mover en mesa · ✌️ 2 dedos: girar / escalar
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        backgroundColor: 'rgba(2, 6, 23, 0.88)',
                        padding: '8px 14px',
                        borderRadius: '9999px',
                        border: '1px solid #28635a',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                      }}
                    >
                      {SCALE_PRESETS.map((preset) => {
                        const active = selectedScale === preset.value;
                        return (
                          <button
                            key={preset.short}
                            type="button"
                            onClick={() => setSelectedScale(preset.value)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '9999px',
                              border: active ? '1px solid #12c6bd' : '1px solid #28635a',
                              backgroundColor: active ? '#087e73' : '#17413b',
                              color: '#e8fbf8',
                              fontSize: '12px',
                              fontWeight: 600,
                            }}
                          >
                            {preset.short}
                          </button>
                        );
                      })}

                      {/* Botón para despejar pantalla 4s y tomar pantallazo limpio */}
                      <button
                        type="button"
                        onClick={handleSnapshot}
                        aria-label="Modo pantalla limpia para foto"
                        style={{
                          marginLeft: '4px',
                          padding: '6px 12px',
                          borderRadius: '9999px',
                          backgroundColor: '#e8fbf8',
                          color: '#0d1d1b',
                          border: '2px solid #12c6bd',
                          fontSize: '12px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          boxShadow: '0 4px 12px rgba(18, 198, 189, 0.35)',
                        }}
                      >
                        <span>📸</span>
                        <span>Limpiar p/ Foto</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Aviso breve que desaparece antes de tomar la captura */}
                {isInARSession && photoToast && (
                  <div
                    style={{
                      position: 'fixed',
                      top: '20px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: 'rgba(1, 8, 7, 0.88)',
                      color: '#12c6bd',
                      padding: '8px 16px',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      textAlign: 'center',
                      width: '85%',
                      zIndex: 9999,
                    }}
                  >
                    {photoToast}
                  </div>
                )}
              </model-viewer>
            </div>

            {/* Pie del modal */}
            <div
              style={{
                padding: '0.85rem 1.2rem',
                borderTop: '1px solid #225c54',
                backgroundColor: '#050d0c',
                display: 'flex',
                gap: '0.6rem',
                justifyContent: 'center',
              }}
            >
              <button
                type="button"
                disabled={!isModelLoaded}
                onClick={handleManualActivateAR}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  backgroundColor: isModelLoaded ? '#087e73' : '#28635a',
                  color: isModelLoaded ? '#e8fbf8' : '#94b9b4',
                  border: isModelLoaded ? '1px solid #12c6bd' : '1px solid #38635d',
                  borderRadius: '9999px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  boxShadow: isModelLoaded ? '0 6px 16px rgba(18, 198, 189, 0.3)' : 'none',
                  cursor: isModelLoaded ? 'pointer' : 'wait',
                  transition: 'all 0.2s ease',
                }}
              >
                {isModelLoaded
                  ? '📷 Activar cámara RA'
                  : '⏳ Preparando modelo 3D...'}
              </button>

              {isModelLoaded && (
                <button
                  type="button"
                  onClick={handleSnapshot}
                  title="Guardar postal 3D del modelo"
                  style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: '#17413b',
                    color: '#e8fbf8',
                    border: '1px solid #28635a',
                    borderRadius: '9999px',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  📸 Postal 3D
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}