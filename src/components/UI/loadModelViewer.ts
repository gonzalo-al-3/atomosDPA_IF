// Carga diferida de <model-viewer> (Realidad Aumentada).
// El archivo lo prepara scripts/setup-model-viewer.mjs en public/vendor/ y se sirve desde nuestro
// sitio. No va en el bundle principal: en escritorio nunca se descarga y en móvil se carga en
// segundo plano o al abrir la RA, sin retrasar el arranque de la app.

const BASE = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;

export const MODEL_VIEWER_URL = `${BASE}vendor/model-viewer-4.0.0.min.js`;

let pending: Promise<void> | null = null;

/** Registra <model-viewer> (una sola vez). Si falla, el siguiente intento vuelve a descargarlo. */
export function loadModelViewer(): Promise<void> {
  if (customElements.get('model-viewer')) return Promise.resolve();
  pending ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = MODEL_VIEWER_URL;
    script.onload = () => resolve();
    script.onerror = () => {
      script.remove();
      pending = null;
      reject(new Error(`No se pudo cargar model-viewer desde ${MODEL_VIEWER_URL}`));
    };
    document.head.append(script);
  });
  return pending;
}

/** Empieza a descargarlo cuando el navegador está libre, para que al abrir la RA ya esté listo. */
export function preloadModelViewerWhenIdle() {
  const run = () => {
    loadModelViewer().catch(() => {
      // Se reintenta (y se muestra el error) al abrir la RA.
    });
  };
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 4000 });
  else setTimeout(run, 2000);
}
