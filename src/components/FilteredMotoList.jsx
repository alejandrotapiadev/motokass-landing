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

function getTipoMotor(moto) {
  const tipo = (moto.specs?.tipo_motor || '').toLowerCase();
  if (tipo.includes('eléctrico') || tipo.includes('electrico') || tipo.includes('shimano') || moto.specs?.potencia_kw != null) return 'Eléctrico';
  if (tipo.includes('2t') || tipo.includes('2 t') || tipo.includes('2 temps')) return '2T';
  if (tipo.includes('4t') || tipo.includes('4 t') || tipo.includes('4 temps')) return '4T';
  return null;
}

function getRangoCilindrada(moto) {
  const cc = moto.specs?.cilindrada_cc;
  if (getTipoMotor(moto) === 'Eléctrico') return 'electrico';
  if (!cc) return null;
  if (cc <= 50)  return '50cc';
  if (cc <= 125) return '125cc';
  if (cc <= 500) return '250-500cc';
  return 'mas500cc';
}

const RANGOS_CC = [
  { value: '50cc',     label: '50 cc' },
  { value: '125cc',    label: '125 cc' },
  { value: '250-500cc', label: '250 – 500 cc' },
  { value: 'mas500cc', label: 'Más de 500 cc' },
  { value: 'electrico', label: 'Eléctrico' },
];

const TIPOS_MOTOR = ['2T', '4T', 'Eléctrico'];

export default function FilteredMotoList({ motos }) {
  const [busqueda, setBusqueda]             = useState('');
  const [marcaSeleccionada, setMarca]       = useState('');
  const [categoriaSeleccionada, setCategoria] = useState('');
  const [cilindradaSeleccionada, setCilindrada] = useState('');
  const [tipoMotorSeleccionado, setTipoMotor]   = useState('');
  const [soloConStock, setSoloConStock]     = useState(false);

  const marcasUnicas     = [...new Set(motos.map(m => m.marca))];
  const categoriasUnicas = [...new Set(motos.map(m => m.categoria).filter(Boolean))].sort();

  const motosFiltradas = useMemo(() => {
    return motos.filter(moto => {
      const coincideBusqueda =
        moto.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        moto.marca.toLowerCase().includes(busqueda.toLowerCase());
      const coincideMarca     = !marcaSeleccionada     || moto.marca === marcaSeleccionada;
      const coincideCategoria = !categoriaSeleccionada || moto.categoria === categoriaSeleccionada;
      const coincideCilindrada = !cilindradaSeleccionada || getRangoCilindrada(moto) === cilindradaSeleccionada;
      const coincideTipo      = !tipoMotorSeleccionado  || getTipoMotor(moto) === tipoMotorSeleccionado;
      const coincideStock     = !soloConStock || moto.stock !== false;
      return coincideBusqueda && coincideMarca && coincideCategoria && coincideCilindrada && coincideTipo && coincideStock;
    });
  }, [busqueda, marcaSeleccionada, categoriaSeleccionada, cilindradaSeleccionada, tipoMotorSeleccionado, soloConStock, motos]);

  const hayFiltrosActivos = busqueda || marcaSeleccionada || categoriaSeleccionada || cilindradaSeleccionada || tipoMotorSeleccionado || soloConStock;

  const limpiarFiltros = () => {
    setBusqueda('');
    setMarca('');
    setCategoria('');
    setCilindrada('');
    setTipoMotor('');
    setSoloConStock(false);
  };

  return (
    <>
      <div className="filtro-container">

        {/* Fila 1: búsqueda + marca + stock + limpiar */}
        <div className="filtro-group filtro-group--top">
          <input
            type="text"
            placeholder="🔍 Buscar por modelo..."
            value={busqueda}
            onInput={(e) => setBusqueda(e.target.value)}
            className="input-filtro input-filtro--wide"
          />

          <select
            value={marcaSeleccionada}
            onChange={(e) => setMarca(e.target.value)}
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

          {hayFiltrosActivos && (
            <button onClick={limpiarFiltros} className="btn-limpiar">
              ✕ Limpiar
            </button>
          )}
        </div>

        {/* Fila 2: categoría + cilindrada */}
        <div className="filtro-group filtro-group--mid">
          <select
            value={categoriaSeleccionada}
            onChange={(e) => setCategoria(e.target.value)}
            className="select-filtro"
          >
            <option value="">Todas las categorías</option>
            {categoriasUnicas.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={cilindradaSeleccionada}
            onChange={(e) => setCilindrada(e.target.value)}
            className="select-filtro"
          >
            <option value="">Cualquier cilindrada</option>
            {RANGOS_CC.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        {/* Fila 3: tipo de motor (chips) */}
        <div className="filtro-group filtro-group--chips">
          <span className="chips-label">Motor:</span>
          <button
            className={`chip${!tipoMotorSeleccionado ? ' chip--active' : ''}`}
            onClick={() => setTipoMotor('')}
          >
            Todos
          </button>
          {TIPOS_MOTOR.map(tipo => (
            <button
              key={tipo}
              className={`chip${tipoMotorSeleccionado === tipo ? ' chip--active' : ''}`}
              onClick={() => setTipoMotor(tipoMotorSeleccionado === tipo ? '' : tipo)}
            >
              {tipo}
            </button>
          ))}
        </div>

        <div className="resultado-count">
          {motosFiltradas.length} moto{motosFiltradas.length !== 1 ? 's' : ''} encontrada{motosFiltradas.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="motos-grid">
        {motosFiltradas.length > 0 ? (
          motosFiltradas.map(moto => (
            <a key={moto.nombre} href={`/tienda/${toSlug(moto.nombre)}`} className="moto-link">
              <MotoCard {...moto} />
            </a>
          ))
        ) : (
          <div className="sin-resultados">
            <p>No hay motos que coincidan con los filtros seleccionados.</p>
            <button onClick={limpiarFiltros} className="btn-limpiar">Limpiar filtros</button>
          </div>
        )}
      </div>

      <style>
        {`
        .filtro-container {
          background: white;
          padding: 1.5rem;
          border-radius: 1rem;
          box-shadow: 0 8px 24px rgba(0,0,0,0.06);
          margin-bottom: 2rem;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .filtro-group {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          align-items: center;
        }

        .filtro-group--chips {
          align-items: center;
          gap: 0.5rem;
          padding-top: 0.25rem;
          border-top: 1px solid #f1f5f9;
        }

        .chips-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: #64748b;
          margin-right: 0.25rem;
          white-space: nowrap;
        }

        .chip {
          padding: 0.35rem 0.9rem;
          border-radius: 999px;
          border: 1.5px solid #e5e7eb;
          background: #f8fafc;
          color: #374151;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }

        .chip:hover {
          border-color: #1F3F7A;
          color: #1F3F7A;
        }

        .chip--active {
          background: #1F3F7A;
          border-color: #1F3F7A;
          color: white;
        }

        .input-filtro,
        .select-filtro {
          padding: 0.65rem 1rem;
          border-radius: 0.6rem;
          border: 1.5px solid #e5e7eb;
          font-size: 0.92rem;
          flex: 1;
          min-width: 160px;
          background: white;
          color: #1e293b;
        }

        .input-filtro--wide {
          min-width: 220px;
          flex: 2;
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
          background: #fef2f2;
          color: #dc2626;
          border: 1.5px solid #fecaca;
          padding: 0.65rem 1.1rem;
          border-radius: 0.6rem;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.88rem;
          transition: background 0.15s;
          white-space: nowrap;
        }

        .btn-limpiar:hover {
          background: #fee2e2;
        }

        .resultado-count {
          font-weight: 600;
          font-size: 0.875rem;
          color: #64748b;
          padding-top: 0.1rem;
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

        .sin-resultados {
          grid-column: 1 / -1;
          text-align: center;
          padding: 3rem 1rem;
          color: #64748b;
        }

        .sin-resultados p {
          margin-bottom: 1rem;
          font-size: 1rem;
        }

        @media (max-width: 640px) {
          .input-filtro,
          .select-filtro {
            min-width: 100%;
          }
          .input-filtro--wide {
            min-width: 100%;
          }
        }
        `}
      </style>
    </>
  );
}
