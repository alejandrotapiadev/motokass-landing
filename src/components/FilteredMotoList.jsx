import { useState, useMemo } from 'preact/hooks';
import MotoCard from './MotoCard.jsx';

export default function FilteredMotoList({ motos }) {
  const [busqueda, setBusqueda] = useState('');
  const [marcaSeleccionada, setMarcaSeleccionada] = useState('');
  const [precioMax, setPrecioMax] = useState('');

  const marcasUnicas = [...new Set(motos.map(m => m.marca))];

  const motosFiltradas = useMemo(() => {
    return motos.filter(moto => {
      const coincideBusqueda =
        moto.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        moto.marca.toLowerCase().includes(busqueda.toLowerCase());

      const coincideMarca =
        marcaSeleccionada === '' || moto.marca === marcaSeleccionada;

      const coincidePrecio =
        precioMax === '' || moto.precio <= Number(precioMax);

      return coincideBusqueda && coincideMarca && coincidePrecio;
    });
  }, [busqueda, marcaSeleccionada, precioMax, motos]);

  const limpiarFiltros = () => {
    setBusqueda('');
    setMarcaSeleccionada('');
    setPrecioMax('');
  };

  return (
    <>
      {/* FILTROS */}
      <div class="filtro-container">
        <div class="filtro-group">
          <input
            type="text"
            placeholder="🔍 Buscar por modelo o marca..."
            value={busqueda}
            onInput={(e) => setBusqueda(e.target.value)}
            class="input-filtro"
          />

          <select
            value={marcaSeleccionada}
            onChange={(e) => setMarcaSeleccionada(e.target.value)}
            class="select-filtro"
          >
            <option value="">Todas las marcas</option>
            {marcasUnicas.map(marca => (
              <option value={marca}>{marca}</option>
            ))}
          </select>

          <input
            type="number"
            placeholder="Precio máximo €"
            value={precioMax}
            onInput={(e) => setPrecioMax(e.target.value)}
            class="input-filtro"
          />

          <button onClick={limpiarFiltros} class="btn-limpiar">
            Limpiar
          </button>
        </div>

        <div class="resultado-count">
          {motosFiltradas.length} moto(s) encontrada(s)
        </div>
      </div>

      {/* LISTADO EN TABLA / GRID */}
      <div class="motos-grid">
        {motosFiltradas.map(moto => (
          <a
            href={'/under-construction'}
            class="moto-link"
          >
            <MotoCard {...moto} />
          </a>
        ))}
      </div>

      {/* ESTILOS */}
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
          border: 1px solid #e5e7eb;
          font-size: 0.95rem;
          flex: 1;
          min-width: 180px;
          transition: all 0.2s ease;
        }

        .input-filtro:focus,
        .select-filtro:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(0,0,0,0.05);
        }

        .btn-limpiar {
          background: var(--color-secondary);
          color: white;
          border: none;
          padding: 0.7rem 1.2rem;
          border-radius: 0.6rem;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .btn-limpiar:hover {
          opacity: 0.9;
          transform: translateY(-2px);
        }

        .resultado-count {
          margin-top: 1rem;
          font-weight: 600;
          color: var(--color-primary);
        }

        .motos-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 2rem;
          animation: fadeIn 0.3s ease;
        }

        .moto-link {
          display: block;
          text-decoration: none;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        `}
      </style>
    </>
  );
}
