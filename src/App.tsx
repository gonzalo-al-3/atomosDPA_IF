import { useState, useEffect } from 'react';
import modelsData from './data/modelsData.json';
import MoleculeViewer from './components/Scene/MoleculeViewer';
import HandTrackingPanel from './components/HandTracking/HandTrackingPanel';
import ARButton from './components/UI/ARButton';

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
  const [isMobileView, setIsMobileView] = useState<boolean>(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', width: '100vw', fontFamily: 'system-ui, sans-serif', overflow: 'hidden' }}>
      {/* Encabezado Superior */}
      <header style={{ 
        padding: isMobileView ? '0.6rem 1rem' : '0.85rem 1.5rem', 
        backgroundColor: '#0f172a', 
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.5rem',
        color: '#f8fafc'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h1 style={{ fontSize: isMobileView ? '1.05rem' : '1.2rem', fontWeight: 600, margin: 0, color: '#38bdf8' }}>
            ¡Átomos a la vista!
          </h1>
          <span style={{ fontSize: '0.75rem', backgroundColor: '#0369a1', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
            3D Viewer
          </span>
        </div>
        <span style={{ fontSize: isMobileView ? '0.75rem' : '0.85rem', color: '#94a3b8' }}>
          IF-UNAM — Día de Puertas Abiertas 2026
        </span>
      </header>

      {/* Cuerpo Principal: Fila en escritorio, Columna en móvil */}
      <div style={{ 
        display: 'flex', 
        flexDirection: isMobileView ? 'column' : 'row', 
        flex: 1, 
        position: 'relative', 
        overflow: 'hidden' 
      }}>
        {/* Lienzo 3D */}
        <main style={{ flex: 1, position: 'relative', minHeight: isMobileView ? '64%' : 'auto', overflow: 'hidden' }}>
          <MoleculeViewer 
            modelUrl={selectedModel.modelUrl} 
            hasAnimation={selectedModel.hasAnimation} 
          />
          <HandTrackingPanel />
          <ARButton 
            modelUrl={selectedModel.modelUrl} 
            modelName={selectedModel.name} 
          />
        </main>

        {/* Panel de Contenido: Lateral en escritorio, Inferior compacto en móvil */}
        <aside style={{ 
          width: isMobileView ? '100%' : '320px', 
          maxHeight: isMobileView ? '36%' : 'none',
          overflowY: 'auto',
          backgroundColor: '#0f172a', 
          borderLeft: isMobileView ? 'none' : '1px solid #1e293b', 
          borderTop: isMobileView ? '1px solid #1e293b' : 'none',
          padding: isMobileView ? '0.85rem 1rem' : '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: isMobileView ? '0.75rem' : '1.25rem',
          color: '#f8fafc',
          boxSizing: 'border-box'
        }}>
          <div>
            <h2 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.5rem 0', color: '#94a3b8' }}>
              Catálogo de Sistemas ({catalog.length})
            </h2>
            
            {/* Lista dinámica con scroll para los 13 modelos */}
            <div style={{ 
              display: isMobileView ? 'grid' : 'flex', 
              gridTemplateColumns: isMobileView ? 'repeat(2, 1fr)' : undefined,
              flexDirection: isMobileView ? undefined : 'column', 
              gap: '0.5rem', 
              maxHeight: isMobileView ? '130px' : '450px', 
              overflowY: 'auto', 
              paddingRight: '0.25rem' 
            }}>
              {catalog.map((item) => {
                const isSelected = selectedModel.id === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedModel(item)}
                    style={{
                      padding: isMobileView ? '0.55rem' : '0.75rem',
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: isSelected ? '#38bdf8' : '#1e293b',
                      backgroundColor: isSelected ? '#1e293b' : '#020617',
                      color: '#f8fafc',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: isMobileView ? '0.82rem' : '0.9rem', color: isSelected ? '#38bdf8' : '#f8fafc' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.15rem' }}>
                      {item.category}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Información Detallada */}
          <div style={{ 
            borderTop: '1px solid #1e293b', 
            paddingTop: isMobileView ? '0.65rem' : '1rem', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.35rem' 
          }}>
            <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600 }}>
              Fórmula: {selectedModel.chemicalFormula}
            </span>
            <h3 style={{ fontSize: isMobileView ? '0.98rem' : '1.1rem', margin: 0, fontWeight: 600 }}>
              {selectedModel.name}
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.4', margin: 0 }}>
              {selectedModel.description}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}