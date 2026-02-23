import { useState, useMemo } from 'preact/hooks';
import MotoCard from './MotoCard.jsx';

export default function FilteredMotoList({ motos }) {
  const [busqueda, setBusqueda] = useState('');
  const [marcaSeleccionada, setMarcaSeleccionada] = useState('');

  // Obtenemos precio máximo dinámico
  const precioMaximoDisponible = Math.max(...motos.map(m => m.precio))+1001; // +1000 para dar un margen

  const [precioMax, setPrecioMax] = useState(precioMaximoDisponible);

  const marcasUnicas = [...new Set(motos.map(m => m.marca))];

  const motosFiltradas = useMemo(() => {
    return motos.filter(moto => {
      const coincideBusqueda =
        moto.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        moto.marca.toLowerCase().includes(busqueda.toLowerCase());

      const coincideMarca =
        marcaSeleccionada === '' || moto.marca === marcaSeleccionada;

      const coincidePrecio =
        moto.precio <= precioMax;

      return coincideBusqueda && coincideMarca && coincidePrecio;
    });
  }, [busqueda, marcaSeleccionada, precioMax, motos]);

  const limpiarFiltros = () => {
    setBusqueda('');
    setMarcaSeleccionada('');
    setPrecioMax(precioMaximoDisponible);
  };

  return (
    <>
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

          {/* SLIDER PRECIO */}
          <div class="slider-container">
            <label class="slider-label">
              Precio máximo: <strong>{precioMax.toLocaleString()} €</strong>
            </label>

            <input
              type="range"
              min="0"
              max={precioMaximoDisponible}
              step="500"
              value={precioMax}
              onInput={(e) => setPrecioMax(Number(e.target.value))}
              class="slider-precio"
            />
          </div>

          <button onClick={limpiarFiltros} class="btn-limpiar">
            Limpiar
          </button>
        </div>

        <div class="resultado-count">
          {motosFiltradas.length} moto(s) encontrada(s)
        </div>
      </div>

      <div class="motos-grid">
        {motosFiltradas.map(moto => (
          <a href={'/under-construction'} class="moto-link">
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
          border: 1px solid #e5e7eb;
          font-size: 0.95rem;
          flex: 1;
          min-width: 180px;
        }

        .slider-container {
          display: flex;
          flex-direction: column;
          min-width: 220px;
          flex: 1;
        }

        .slider-label {
          font-size: 0.9rem;
          margin-bottom: 0.4rem;
          color: var(--color-primary);
        }

        .slider-precio {
          width: 100%;
          cursor: pointer;
        }

        .btn-limpiar {
          background: var(--color-secondary);
          color: var(--color-primary);
          border: none;
          padding: 0.7rem 1.2rem;
          border-radius: 0.6rem;
          cursor: pointer;
          font-weight: 600;
        }

        .resultado-count {
          margin-top: 1rem;
          font-weight: 600;
          color: var(--color-primary);
        }

        .motos-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 2rem;
        }

        .moto-link {
          display: block;
          text-decoration: none;
        }
        `}
      </style>
    </>
  );
}
