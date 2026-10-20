import { useState } from 'react';
import MoleculeViewer from './components/Scene/MoleculeViewer';
import HandTrackingPanel from './components/HandTracking/HandTrackingPanel';

const BASE = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;

interface AtomicSystem {
  id: string;
  name: string;
  category: string;
  chemicalFormula: string;
  description: string;
  modelUrl: string;
  hasAnimation: boolean;
}

const INITIAL_CATALOG: AtomicSystem[] = [
  { 
    id: 'aspirin', 
    name: 'Molécula de Aspirina', 
    category: 'Molécula Pequeña', 
    chemicalFormula: 'C9H8O4',
    description: 'Fármaco analgésico ampliamente utilizado. Permite observar las vibraciones térmicas de los enlaces intra-moleculares.',
    modelUrl: `${BASE}models/aspirin.glb`,
    hasAnimation: true 
  },
  { 
    id: 'graphene', 
    name: 'Capa de Grafeno', 
    category: 'Superficie / Material', 
    chemicalFormula: 'C',
    description: 'Estructura bidimensional de átomos de carbono dispuestos en una red hexagonal tipo panal de abeja.',
    modelUrl: '/models/graphene.glb',
    hasAnimation: false 
  },
];

export default function App() {
  const [selectedModel, setSelectedModel] = useState<AtomicSystem>(INITIAL_CATALOG[0]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', fontFamily: 'system-ui, sans-serif' }}>
      {/* Encabezado Superior */}
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
        {/* Lienzo 3D */}
        <main style={{ flex: 1, position: 'relative' }}>
          <MoleculeViewer 
            modelUrl={selectedModel.modelUrl} 
            hasAnimation={selectedModel.hasAnimation} 
          />
          <HandTrackingPanel />
        </main>

        {/* Panel Lateral de Contenido */}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {INITIAL_CATALOG.map((item) => {
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

          {/* Información Detallada del Sistema Seleccionado */}
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
