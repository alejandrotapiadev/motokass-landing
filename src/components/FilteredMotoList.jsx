import { useState, useMemo, useEffect, useRef } from 'react';
import MotoCard from './MotoCard.jsx';

const MOTOS_POR_PAGINA = 12;

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

function getPaginas(total, actual) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const p = [];
  p.push(1);
  if (actual > 3) p.push('…');
  for (let i = Math.max(2, actual - 1); i <= Math.min(total - 1, actual + 1); i++) p.push(i);
  if (actual < total - 2) p.push('…');
  p.push(total);
  return p;
}

const RANGOS_CC = [
  { value: '50cc',      label: '50 cc' },
  { value: '125cc',     label: '125 cc' },
  { value: '250-500cc', label: '250 – 500 cc' },
  { value: 'mas500cc',  label: 'Más de 500 cc' },
  { value: 'electrico', label: 'Eléctrico' },
];

const TIPOS_MOTOR = ['2T', '4T', 'Eléctrico'];

export default function FilteredMotoList({ motos }) {
  const [busqueda, setBusqueda]               = useState('');
  const [marcaSeleccionada, setMarca]         = useState('');
  const [categoriaSeleccionada, setCategoria] = useState('');
  const [cilindradaSeleccionada, setCilindrada] = useState('');
  const [tipoMotorSeleccionado, setTipoMotor] = useState('');
  const [soloConStock, setSoloConStock]       = useState(false);
  const [paginaActual, setPaginaActual]       = useState(1);

  const gridRef = useRef(null);

  const marcasUnicas     = [...new Set(motos.map(m => m.marca))];
  const categoriasUnicas = [...new Set(motos.map(m => m.categoria).filter(Boolean))].sort();

  const motosFiltradas = useMemo(() => {
    return motos.filter(moto => {
      const coincideBusqueda   = moto.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                                  moto.marca.toLowerCase().includes(busqueda.toLowerCase());
      const coincideMarca      = !marcaSeleccionada      || moto.marca === marcaSeleccionada;
      const coincideCategoria  = !categoriaSeleccionada  || moto.categoria === categoriaSeleccionada;
      const coincideCilindrada = !cilindradaSeleccionada || getRangoCilindrada(moto) === cilindradaSeleccionada;
      const coincideTipo       = !tipoMotorSeleccionado  || getTipoMotor(moto) === tipoMotorSeleccionado;
      const coincideStock      = !soloConStock           || moto.stock !== false;
      return coincideBusqueda && coincideMarca && coincideCategoria && coincideCilindrada && coincideTipo && coincideStock;
    });
  }, [busqueda, marcaSeleccionada, categoriaSeleccionada, cilindradaSeleccionada, tipoMotorSeleccionado, soloConStock, motos]);

  // Volver a página 1 cuando cambian los filtros
  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, marcaSeleccionada, categoriaSeleccionada, cilindradaSeleccionada, tipoMotorSeleccionado, soloConStock]);

  const totalPaginas  = Math.max(1, Math.ceil(motosFiltradas.length / MOTOS_POR_PAGINA));
  const inicio        = (paginaActual - 1) * MOTOS_POR_PAGINA;
  const motosPagina   = motosFiltradas.slice(inicio, inicio + MOTOS_POR_PAGINA);
  const hayFiltros    = busqueda || marcaSeleccionada || categoriaSeleccionada || cilindradaSeleccionada || tipoMotorSeleccionado || soloConStock;

  const irAPagina = (n) => {
    setPaginaActual(n);
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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
      {/* ── FILTROS ─────────────────────────────────────────────── */}
      <div className="filtro-container">

        {/* Fila 1: búsqueda + marca + stock + limpiar */}
        <div className="filtro-group">
          <input
            type="text"
            placeholder="🔍 Buscar por modelo..."
            value={busqueda}
            onInput={(e) => setBusqueda(e.target.value)}
            className="input-filtro input-filtro--wide"
          />
          <select value={marcaSeleccionada} onChange={(e) => setMarca(e.target.value)} className="select-filtro">
            <option value="">Todas las marcas</option>
            {marcasUnicas.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <label className="label-stock">
            <input type="checkbox" checked={soloConStock} onChange={(e) => setSoloConStock(e.target.checked)} />
            Solo disponibles
          </label>
          {hayFiltros && (
            <button onClick={limpiarFiltros} className="btn-limpiar">✕ Limpiar</button>
          )}
        </div>

        {/* Fila 2: categoría + cilindrada */}
        <div className="filtro-group">
          <select value={categoriaSeleccionada} onChange={(e) => setCategoria(e.target.value)} className="select-filtro">
            <option value="">Todas las categorías</option>
            {categoriasUnicas.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={cilindradaSeleccionada} onChange={(e) => setCilindrada(e.target.value)} className="select-filtro">
            <option value="">Cualquier cilindrada</option>
            {RANGOS_CC.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>

        {/* Fila 3: tipo de motor chips */}
        <div className="filtro-group filtro-group--chips">
          <span className="chips-label">Motor:</span>
          <button className={`chip${!tipoMotorSeleccionado ? ' chip--active' : ''}`} onClick={() => setTipoMotor('')}>Todos</button>
          {TIPOS_MOTOR.map(t => (
            <button
              key={t}
              className={`chip${tipoMotorSeleccionado === t ? ' chip--active' : ''}`}
              onClick={() => setTipoMotor(tipoMotorSeleccionado === t ? '' : t)}
            >{t}</button>
          ))}
        </div>

        {/* Contador */}
        <div className="resultado-count">
          {motosFiltradas.length} moto{motosFiltradas.length !== 1 ? 's' : ''} encontrada{motosFiltradas.length !== 1 ? 's' : ''}
          {totalPaginas > 1 && ` · página ${paginaActual} de ${totalPaginas}`}
        </div>
      </div>

      {/* ── GRID ──────────────────────────────────────────────────── */}
      <div className="motos-grid" ref={gridRef}>
        {motosPagina.length > 0 ? (
          motosPagina.map(moto => (
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

      {/* ── PAGINACIÓN ────────────────────────────────────────────── */}
      {totalPaginas > 1 && (
        <div className="paginacion">
          <button
            className="pag-btn pag-btn--arrow"
            onClick={() => irAPagina(paginaActual - 1)}
            disabled={paginaActual === 1}
            aria-label="Página anterior"
          >
            ‹
          </button>

          {getPaginas(totalPaginas, paginaActual).map((p, i) =>
            p === '…' ? (
              <span key={`ellipsis-${i}`} className="pag-ellipsis">…</span>
            ) : (
              <button
                key={p}
                className={`pag-btn${paginaActual === p ? ' pag-btn--active' : ''}`}
                onClick={() => irAPagina(p)}
                aria-label={`Ir a página ${p}`}
                aria-current={paginaActual === p ? 'page' : undefined}
              >
                {p}
              </button>
            )
          )}

          <button
            className="pag-btn pag-btn--arrow"
            onClick={() => irAPagina(paginaActual + 1)}
            disabled={paginaActual === totalPaginas}
            aria-label="Página siguiente"
          >
            ›
          </button>
        </div>
      )}

      <style>{`
        /* ── Filtros ── */
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
        .chip:hover { border-color: #1F3F7A; color: #1F3F7A; }
        .chip--active { background: #1F3F7A; border-color: #1F3F7A; color: white; }
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
        .input-filtro--wide { min-width: 220px; flex: 2; }
        .input-filtro:focus,
        .select-filtro:focus { outline: none; border-color: #1F3F7A; }
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
        .label-stock input { accent-color: #1F3F7A; width: 16px; height: 16px; cursor: pointer; }
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
        .btn-limpiar:hover { background: #fee2e2; }
        .resultado-count {
          font-weight: 600;
          font-size: 0.875rem;
          color: #64748b;
        }

        /* ── Grid ── */
        .motos-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 2rem;
          scroll-margin-top: 1rem;
        }
        .moto-link {
          display: block;
          text-decoration: none;
          border-radius: 1rem;
          transition: outline 0.15s;
        }
        .moto-link:focus-visible { outline: 3px solid #1F3F7A; outline-offset: 2px; }
        .sin-resultados {
          grid-column: 1 / -1;
          text-align: center;
          padding: 3rem 1rem;
          color: #64748b;
        }
        .sin-resultados p { margin-bottom: 1rem; font-size: 1rem; }

        /* ── Paginación ── */
        .paginacion {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 0.4rem;
          margin-top: 2.5rem;
          flex-wrap: wrap;
        }
        .pag-btn {
          min-width: 38px;
          height: 38px;
          padding: 0 0.6rem;
          border-radius: 0.5rem;
          border: 1.5px solid #e5e7eb;
          background: white;
          color: #374151;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .pag-btn:hover:not(:disabled) { border-color: #1F3F7A; color: #1F3F7A; }
        .pag-btn--active {
          background: #1F3F7A;
          border-color: #1F3F7A;
          color: white;
        }
        .pag-btn--arrow { font-size: 1.2rem; line-height: 1; }
        .pag-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .pag-ellipsis {
          min-width: 28px;
          text-align: center;
          color: #9ca3af;
          font-size: 1rem;
          line-height: 38px;
        }

        @media (max-width: 640px) {
          .input-filtro, .select-filtro, .input-filtro--wide { min-width: 100%; }
        }
      `}</style>
    </>
  );
}
