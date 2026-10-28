import { useState } from 'react';
import modelsData from './data/modelsData.json';
import MoleculeViewer from './components/Scene/MoleculeViewer';
import HandTrackingPanel from './components/HandTracking/HandTrackingPanel';
import ARButton from './components/UI/ARButton';

interface AtomicSystem {
  id: string;
  name: string;
  category: string;
  chemicalFormula: string;
  description: string;
  modelUrl: string;
  hasAnimation: boolean;
}

export default function App() {
  // Usamos tu JSON para inicializar el catálogo
  const [selectedModel, setSelectedModel] = useState<AtomicSystem>(modelsData[0]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', fontFamily: 'system-ui, sans-serif' }}>
      {/* Encabezado Superior (Mantenemos el de tus compañeros) */}
      <header style={{ 
        padding: '0.85rem 1.5rem', 
        backgroundColor: '#0f172a', 
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: '#f8fafc'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0, color: '#38bdf8' }}>
            ¡Átomos a la vista!
          </h1>
          <span style={{ fontSize: '0.75rem', backgroundColor: '#0369a1', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
            3D Viewer
          </span>
        </div>
        <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
          IF-UNAM — Día de Puertas Abiertas 2026
        </span>
      </header>

      {/* Cuerpo Principal */}
      <div style={{ display: 'flex', flex: 1, position: 'relative', overflow: 'hidden' }}>
        
        {/* Lienzo 3D (Mantenemos el de tus compañeros) */}
        <main style={{ flex: 1, position: 'relative' }}>
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

        {/* Panel Lateral de Contenido (Mezclamos el diseño de ellos con tu lista) */}
        <aside style={{ 
          width: '320px', 
          backgroundColor: '#0f172a', 
          borderLeft: '1px solid #1e293b', 
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          color: '#f8fafc',
          boxSizing: 'border-box'
        }}>
          <div>
            <h2 style={{ fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', color: '#94a3b8' }}>
              Catálogo de Sistemas
            </h2>
            
            {/* Aquí está tu lista dinámica con scroll añadido para los 13 modelos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '450px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {modelsData.map((item) => {
                const isSelected = selectedModel.id === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedModel(item)}
                    style={{
                      padding: '0.75rem',
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
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: isSelected ? '#38bdf8' : '#f8fafc' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                      {item.category}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Información Detallada (Mantenemos el diseño de tus compañeros) */}
          <div style={{ 
            borderTop: '1px solid #1e293b', 
            paddingTop: '1rem', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.5rem' 
          }}>
            <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600 }}>
              Fórmula: {selectedModel.chemicalFormula}
            </span>
            <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 600 }}>
              {selectedModel.name}
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.4', margin: 0 }}>
              {selectedModel.description}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}