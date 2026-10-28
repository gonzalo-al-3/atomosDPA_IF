import { useState } from 'react';
// 1. IMPORTAMOS TU ARCHIVO JSON (asegúrate de que la ruta sea correcta)
import modelsData from './data/modelsData.json';

export default function App() {
  // 2. INICIALIZAMOS EL ESTADO CON EL PRIMER MODELO DE TU JSON
  const [selectedModel, setSelectedModel] = useState(modelsData[0]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      {/* Header */}
      <header style={{
        padding: '1rem 1.5rem',
        backgroundColor: '#1e293b',
        borderBottom: '1px solid #334155',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Interactive Molecular AR Explorer</h1>
        <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Science Event Presentation — Nov 13</span>
      </header>

      {/* Main Workspace */}
      <div style={{ display: 'flex', flex: 1, position: 'relative', overflow: 'hidden' }}>

        {/* Left Side: 3D Viewport Placeholder */}
        <main style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#020617',
          position: 'relative'
        }}>
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', border: '2px dashed #334155', borderRadius: '12px' }}>
            <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#e2e8f0' }}>3D / AR Viewport</p>
            <p style={{ fontSize: '0.9rem' }}>Currently showing: <strong>{selectedModel.name}</strong></p>
            {/* Mostramos la URL para que compruebes que está conectado */}
            <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: '#38bdf8' }}>
              Ruta: {selectedModel.modelUrl}
            </p>
            <p style={{ fontSize: '0.8rem', marginTop: '1rem' }}>(React Three Fiber / model-viewer will render here)</p>
          </div>
        </main>

        {/* Right Side: Educational Info Panel */}
        <aside style={{
          width: '320px',
          backgroundColor: '#1e293b',
          borderLeft: '1px solid #334155',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#38bdf8' }}>Select Model</h2>
            
            {/* 3. AGREGAMOS UN SCROLL POR SI LA LISTA ES MUY LARGA (tienes 13 modelos) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              
              {/* 4. MAPEAMOS SOBRE LOS DATOS DE TU JSON */}
              {modelsData.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedModel(item)}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: selectedModel.id === item.id ? '#38bdf8' : '#334155',
                    backgroundColor: selectedModel.id === item.id ? '#0f172a' : '#1e293b',
                    color: '#f8fafc',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 500 }}>{item.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{item.category}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid #334155', paddingTop: '1rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: '#f8fafc' }}>{selectedModel.name}</h3>
            {/* 5. AÑADIMOS LA FÓRMULA QUÍMICA Y LA DESCRIPCIÓN */}
            <p style={{ fontSize: '0.85rem', color: '#38bdf8', marginBottom: '0.5rem' }}>
              Fórmula: {selectedModel.chemicalFormula}
            </p>
            <p style={{ fontSize: '0.875rem', color: '#cbd5e1', lineHeight: '1.4' }}>{selectedModel.description}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
