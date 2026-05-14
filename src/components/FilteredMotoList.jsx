import { useState, useMemo } from 'react';
import MotoCard from './MotoCard.jsx';

function toSlug(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function FilteredMotoList({ motos }) {
  const [busqueda, setBusqueda] = useState('');
  const [marcaSeleccionada, setMarcaSeleccionada] = useState('');
  const [soloConStock, setSoloConStock] = useState(false);

  const marcasUnicas = [...new Set(motos.map(m => m.marca))];

  const motosFiltradas = useMemo(() => {
    return motos.filter(moto => {
      const coincideBusqueda =
        moto.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        moto.marca.toLowerCase().includes(busqueda.toLowerCase());
      const coincideMarca = marcaSeleccionada === '' || moto.marca === marcaSeleccionada;
      const coincideStock = !soloConStock || moto.stock !== false;
      return coincideBusqueda && coincideMarca && coincideStock;
    });
  }, [busqueda, marcaSeleccionada, soloConStock, motos]);

  const limpiarFiltros = () => {
    setBusqueda('');
    setMarcaSeleccionada('');
    setSoloConStock(false);
  };

  return (
    <>
      <div className="filtro-container">
        <div className="filtro-group">
          <input
            type="text"
            placeholder="🔍 Buscar por modelo o marca..."
            value={busqueda}
            onInput={(e) => setBusqueda(e.target.value)}
            className="input-filtro"
          />

          <select
            value={marcaSeleccionada}
            onChange={(e) => setMarcaSeleccionada(e.target.value)}
            className="select-filtro"
          >
            <option value="">Todas las marcas</option>
            {marcasUnicas.map(marca => (
              <option key={marca} value={marca}>{marca}</option>
            ))}
          </select>

          <label className="label-stock">
            <input
              type="checkbox"
              checked={soloConStock}
              onChange={(e) => setSoloConStock(e.target.checked)}
            />
            Solo disponibles
          </label>

          <button onClick={limpiarFiltros} className="btn-limpiar">
            Limpiar
          </button>
        </div>

        <div className="resultado-count">
          {motosFiltradas.length} moto{motosFiltradas.length !== 1 ? 's' : ''} encontrada{motosFiltradas.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="motos-grid">
        {motosFiltradas.map(moto => (
          <a key={moto.nombre} href={`/tienda/${toSlug(moto.nombre)}`} className="moto-link">
            <MotoCard {...moto} />
          </a>
        ))}
      </div>

      <style>
        {`
        .filtro-container {
          background: white;
          padding: 1.5rem;
          border-radius: 1rem;
          box-shadow: 0 8px 24px rgba(0,0,0,0.06);
          margin-bottom: 2rem;
        }

        .filtro-group {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          align-items: center;
        }

        .input-filtro,
        .select-filtro {
          padding: 0.7rem 1rem;
          border-radius: 0.6rem;
          border: 1.5px solid #e5e7eb;
          font-size: 0.95rem;
          flex: 1;
          min-width: 180px;
        }

        .input-filtro:focus,
        .select-filtro:focus {
          outline: none;
          border-color: #1F3F7A;
        }

        .label-stock {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.9rem;
          font-weight: 600;
          color: #374151;
          cursor: pointer;
          white-space: nowrap;
        }

        .label-stock input {
          accent-color: #1F3F7A;
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        .btn-limpiar {
          background: #f1f5f9;
          color: #374151;
          border: 1.5px solid #e5e7eb;
          padding: 0.7rem 1.2rem;
          border-radius: 0.6rem;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.9rem;
          transition: background 0.2s;
        }

        .btn-limpiar:hover {
          background: #e2e8f0;
        }

        .resultado-count {
          margin-top: 1rem;
          font-weight: 600;
          font-size: 0.875rem;
          color: #64748b;
        }

        .motos-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 2rem;
        }

        .moto-link {
          display: block;
          text-decoration: none;
          border-radius: 1rem;
          transition: outline 0.15s;
        }

        .moto-link:focus-visible {
          outline: 3px solid #1F3F7A;
          outline-offset: 2px;
        }
        `}
      </style>
    </>
  );
}
