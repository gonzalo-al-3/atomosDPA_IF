import { useEffect, useState } from 'react';
import modelsData from './data/modelsData.json';
import MoleculeViewer from './components/Scene/MoleculeViewer';
import HandTrackingPanel from './components/HandTracking/HandTrackingPanel';
import ARButton from './components/UI/ARButton';
import GestureErrorBanner from './components/HandTracking/GestureErrorBanner';
import { useHandTracking } from './hooks/useHandTracking';
import { isGesturesActive } from './hooks/handMode';
import PerfOverlay from './debug/PerfOverlay';
import { DEBUG } from './debug/debugFlag';
import '@fontsource-variable/manrope';
import './App.css';

const BASE = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;

const normalizeModelUrl = (url: string) =>
  `${BASE}${url.replace(/^\/+/, '')}`;

export default function App() {
  const catalog = modelsData.map((item) => ({
    ...item,
    modelUrl: normalizeModelUrl(item.modelUrl),
  }));

  const [selectedModel, setSelectedModel] = useState(catalog[0]);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogView, setCatalogView] = useState<'catalog' | 'description'>('catalog');
  // Control por gestos: en estado de React solo el modo y los errores (los landmarks van en handStore).
  const hand = useHandTracking();
  const gesturesActive = isGesturesActive(hand.mode);
  const { turnOff } = hand;

  // Esc: salida de emergencia que apaga los gestos (y devuelve el mouse).
  useEffect(() => {
    if (!gesturesActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') turnOff();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gesturesActive, turnOff]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-title">
          <h1>¡Átomos a la vista!</h1>
          <a
            className="header-social-link"
            href="https://www.instagram.com/institutodefisica"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram del Instituto de Física"
            title="Instagram del Instituto de Física"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle className="instagram-dot" cx="17.5" cy="6.5" r="1" />
            </svg>
          </a>
        </div>
        <a
          className="header-logo-link"
          href="https://www.fisica.unam.mx/puertas_abiertas/pa2026/index.php"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Abrir el sitio de Puertas Abiertas 2026 del Instituto de Física de la UNAM"
        >
          <img
            className="header-mark"
            src={`${BASE}logo_DPA2ALV_2.png`}
            alt="Identifícate con la Física — IF-UNAM"
          />
        </a>
      </header>

      <main className="viewer-stage">
        <MoleculeViewer
            modelUrl={selectedModel.modelUrl}
            hasAnimation={selectedModel.hasAnimation}
            gesturesActive={gesturesActive}
          />

        <button
          className={`catalog-toggle${catalogOpen ? ' is-open' : ''}`}
          type="button"
          aria-expanded={catalogOpen}
          aria-controls="model-catalog"
          aria-label="Abrir catálogo de modelos"
          title="Catálogo de modelos"
          onClick={() => setCatalogOpen((open) => !open)}
        >
          <span className="catalog-glyph" aria-hidden="true"><i /><i /><i /></span>
        </button>

        {catalogOpen && (
          <>
            <button
              className="catalog-backdrop"
              type="button"
              aria-label="Cerrar catálogo"
              onClick={() => setCatalogOpen(false)}
            />
            <aside className="catalog-drawer" id="model-catalog" aria-label="Catálogo de modelos">
              <div className="drawer-heading">
                <div>
                  <span className="eyebrow">Explorar</span>
                  <h2>{catalogView === 'catalog' ? 'Modelos' : 'Descripción'}</h2>
                </div>
                <button className="icon-button" type="button" aria-label="Cerrar catálogo" onClick={() => setCatalogOpen(false)}>×</button>
              </div>
              <div className="catalog-tabs" role="tablist" aria-label="Contenido del menú">
                <button
                  id="catalog-tab-models"
                  className={catalogView === 'catalog' ? 'is-active' : ''}
                  type="button"
                  role="tab"
                  aria-selected={catalogView === 'catalog'}
                  aria-controls="catalog-panel-models"
                  onClick={() => setCatalogView('catalog')}
                >
                  Modelos <span>{catalog.length}</span>
                </button>
                <button
                  id="catalog-tab-description"
                  className={catalogView === 'description' ? 'is-active' : ''}
                  type="button"
                  role="tab"
                  aria-selected={catalogView === 'description'}
                  aria-controls="catalog-panel-description"
                  onClick={() => setCatalogView('description')}
                >
                  Descripción
                </button>
              </div>
              {catalogView === 'catalog' ? (
                <div id="catalog-panel-models" className="catalog-list" role="tabpanel" aria-labelledby="catalog-tab-models">
                  {catalog.map((item) => {
                    const isSelected = selectedModel.id === item.id;
                    return (
                      <button
                        key={item.id}
                        className={`catalog-item${isSelected ? ' is-selected' : ''}`}
                        type="button"
                        aria-current={isSelected ? 'true' : undefined}
                        onClick={() => setSelectedModel(item)}
                      >
                        <span className="catalog-item-name">{item.name}</span>
                        <span className="catalog-item-category">{item.category}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <section id="catalog-panel-description" className="model-details" role="tabpanel" aria-labelledby="catalog-tab-description" aria-live="polite">
                  <span className="eyebrow">{selectedModel.category}</span>
                  <h3>{selectedModel.name}</h3>
                  <p className="model-formula">Fórmula <strong>{selectedModel.chemicalFormula}</strong></p>
                  <p className="model-description">{selectedModel.description}</p>
                </section>
              )}
            </aside>
          </>
        )}

          {hand.mode === 'gestures+camera' && (
            <HandTrackingPanel
              attachPreview={hand.attachPreview}
              starting={hand.starting}
              onClose={hand.closePreview}
            />
          )}
          {hand.error && <GestureErrorBanner message={hand.error} onDismiss={hand.dismissError} />}
          {DEBUG && <PerfOverlay />}
        <section className="bottom-dock" aria-label="Modelo y modos de visualización">
          <div className="current-model">
            <strong title={selectedModel.name}>{selectedModel.name}</strong>
          </div>
          <div className="mode-controls" role="group" aria-label="Modo de visualización" aria-busy={hand.starting}>
            {/* Al abrir la RA se apagan los gestos: ambos usan la cámara. */}
            <ARButton modelUrl={selectedModel.modelUrl} modelName={selectedModel.name} compact onOpen={turnOff} />
            <button
              className={`mode-button${gesturesActive ? ' is-active' : ''}`}
              type="button"
              aria-pressed={gesturesActive}
              aria-label={hand.starting ? 'Iniciando control por gestos' : gesturesActive ? 'Desactivar control por gestos' : 'Activar control por gestos'}
              onClick={() => gesturesActive ? hand.turnOff() : hand.press('gestures')}
              title={hand.starting ? 'Iniciando cámara…' : 'Activar control por gestos'}
            >
              <span className="mode-indicator" aria-hidden="true" />
              <span>{hand.starting ? 'Iniciando…' : '🖐️'}</span>
            </button>
          </div>
          {gesturesActive && (
            <button
              className={`preview-toggle${hand.mode === 'gestures+camera' ? ' is-active' : ''}`}
              type="button"
              aria-pressed={hand.mode === 'gestures+camera'}
              onClick={() => hand.press(hand.mode === 'gestures+camera' ? 'gestures' : 'gestures+camera')}
              title={hand.mode === 'gestures+camera' ? 'Ocultar vista de cámara' : 'Mostrar vista de cámara'}
            >
              Vista
            </button>
          )}
        </section>
      </main>
    </div>
  );
}