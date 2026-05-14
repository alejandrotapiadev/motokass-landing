import { useState, useMemo, useEffect, useRef } from 'react';
import MotoCard from './MotoCard.jsx';

const MOTOS_POR_PAGINA = 12;

/* ── utilidades ─────────────────────────────────────────────────── */

function toSlug(str) {
  return str.toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function getTipoMotor(moto) {
  const t = (moto.specs?.tipo_motor || '').toLowerCase();
  if (t.includes('eléctrico') || t.includes('electrico') || t.includes('shimano') || moto.specs?.potencia_kw != null) return 'Eléctrico';
  if (t.includes('2t') || t.includes('2 temps')) return '2T';
  if (t.includes('4t') || t.includes('4 temps')) return '4T';
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
  const p = [1];
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

/* ── CustomSelect ────────────────────────────────────────────────── */

function ChevronIcon({ open }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, transition: 'transform 0.2s ease', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, marginLeft: 'auto' }}
    >
      <polyline points="4 12 9 17 20 7" />
    </svg>
  );
}

function CustomSelect({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc   = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, []);

  const selected = options.find(o => o.value === value);
  const allOptions = [{ value: '', label: placeholder }, ...options];

  return (
    <div className={`csel${open ? ' csel--open' : ''}`} ref={ref}>
      <button type="button" className="csel__trigger" onClick={() => setOpen(v => !v)}>
        <span className={selected ? 'csel__val' : 'csel__placeholder'}>
          {selected ? selected.label : placeholder}
        </span>
        {value && (
          <span
            className="csel__clear"
            role="button"
            tabIndex={0}
            aria-label="Limpiar"
            onClick={(e) => { e.stopPropagation(); onChange(''); setOpen(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onChange(''); setOpen(false); } }}
          >×</span>
        )}
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="csel__panel" role="listbox">
          {allOptions.map((opt) => {
            const isActive = opt.value === value || (!value && opt.value === '');
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isActive}
                className={`csel__option${isActive ? ' csel__option--active' : ''}`}
                onClick={() => { onChange(opt.value); setOpen(false); }}
              >
                <span>{opt.label}</span>
                {isActive && <CheckIcon />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── FilteredMotoList ────────────────────────────────────────────── */

export default function FilteredMotoList({ motos }) {
  const [busqueda,    setBusqueda]    = useState('');
  const [marca,       setMarca]       = useState('');
  const [categoria,   setCategoria]   = useState('');
  const [cilindrada,  setCilindrada]  = useState('');
  const [tipoMotor,   setTipoMotor]   = useState('');
  const [soloStock,   setSoloStock]   = useState(false);
  const [soloNuevo,   setSoloNuevo]   = useState(false);
  const [pagina,      setPagina]      = useState(1);
  const gridRef = useRef(null);

  const opcionesMarca     = [...new Set(motos.map(m => m.marca))].map(v => ({ value: v, label: v }));
  const opcionesCategoria = [...new Set(motos.map(m => m.categoria).filter(Boolean))].sort()
                              .map(v => ({ value: v, label: v }));

  const filtradas = useMemo(() => motos.filter(m => {
    const q = busqueda.toLowerCase();
    return (!q        || m.nombre.toLowerCase().includes(q) || m.marca.toLowerCase().includes(q))
        && (!marca     || m.marca === marca)
        && (!categoria || m.categoria === categoria)
        && (!cilindrada || getRangoCilindrada(m) === cilindrada)
        && (!tipoMotor  || getTipoMotor(m) === tipoMotor)
        && (!soloStock  || m.stock !== false)
      && (!soloNuevo  || m.nuevo === true);
  }), [busqueda, marca, categoria, cilindrada, tipoMotor, soloStock, motos]);

  useEffect(() => { setPagina(1); },
    [busqueda, marca, categoria, cilindrada, tipoMotor, soloStock, soloNuevo]);

  const totalPag  = Math.max(1, Math.ceil(filtradas.length / MOTOS_POR_PAGINA));
  const inicio    = (pagina - 1) * MOTOS_POR_PAGINA;
  const pagMoots  = filtradas.slice(inicio, inicio + MOTOS_POR_PAGINA);
  const hayFiltros = busqueda || marca || categoria || cilindrada || tipoMotor || soloStock || soloNuevo;

  const irA = (n) => { setPagina(n); gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const limpiar = () => { setBusqueda(''); setMarca(''); setCategoria(''); setCilindrada(''); setTipoMotor(''); setSoloStock(false); setSoloNuevo(false); };

  return (
    <>
      {/* ── PANEL DE FILTROS ────────────────────────────────────── */}
      <div className="filtro-wrap">

        {/* Fila 1 */}
        <div className="filtro-row">
          <input
            type="text"
            placeholder="🔍  Buscar por modelo..."
            value={busqueda}
            onInput={(e) => setBusqueda(e.target.value)}
            className="filtro-search"
          />
          <CustomSelect value={marca}    onChange={setMarca}    options={opcionesMarca}     placeholder="Todas las marcas" />
          <CustomSelect value={categoria} onChange={setCategoria} options={opcionesCategoria} placeholder="Todas las categorías" />
          <CustomSelect value={cilindrada} onChange={setCilindrada} options={RANGOS_CC}        placeholder="Cilindrada" />
        </div>

        {/* Fila 2: tipo motor + stock + limpiar */}
        <div className="filtro-row filtro-row--bottom">
          <div className="chips-group">
            <span className="chips-label">Motor</span>
            <button className={`chip${!tipoMotor ? ' chip--on' : ''}`} onClick={() => setTipoMotor('')}>Todos</button>
            {TIPOS_MOTOR.map(t => (
              <button key={t} className={`chip${tipoMotor === t ? ' chip--on' : ''}`}
                onClick={() => setTipoMotor(tipoMotor === t ? '' : t)}>{t}</button>
            ))}
          </div>

          <div className="filtro-row__right">
            <label className="label-stock">
              <input type="checkbox" checked={soloNuevo} onChange={(e) => setSoloNuevo(e.target.checked)} />
              ✨ Solo novedades
            </label>
            <label className="label-stock">
              <input type="checkbox" checked={soloStock} onChange={(e) => setSoloStock(e.target.checked)} />
              Solo disponibles
            </label>
            {hayFiltros && <button onClick={limpiar} className="btn-limpiar">✕ Limpiar</button>}
          </div>
        </div>

        {/* Contador */}
        <p className="resultado-count">
          {filtradas.length} moto{filtradas.length !== 1 ? 's' : ''} encontrada{filtradas.length !== 1 ? 's' : ''}
          {totalPag > 1 && ` · página ${pagina} de ${totalPag}`}
        </p>
      </div>

      {/* ── GRID ────────────────────────────────────────────────── */}
      <div className="motos-grid" ref={gridRef}>
        {pagMoots.length > 0
          ? pagMoots.map(m => (
              <a key={m.nombre} href={`/catalogo/${toSlug(m.nombre)}`} className="moto-link">
                <MotoCard {...m} />
              </a>
            ))
          : (
            <div className="sin-resultados">
              <p>No hay motos que coincidan con los filtros.</p>
              <button onClick={limpiar} className="btn-limpiar">Limpiar filtros</button>
            </div>
          )}
      </div>

      {/* ── PAGINACIÓN ──────────────────────────────────────────── */}
      {totalPag > 1 && (
        <div className="paginacion">
          <button className="pag-btn pag-btn--arrow" onClick={() => irA(pagina - 1)} disabled={pagina === 1} aria-label="Anterior">‹</button>
          {getPaginas(totalPag, pagina).map((p, i) =>
            p === '…'
              ? <span key={`e${i}`} className="pag-ellipsis">…</span>
              : <button key={p} className={`pag-btn${pagina === p ? ' pag-btn--on' : ''}`} onClick={() => irA(p)} aria-current={pagina === p ? 'page' : undefined}>{p}</button>
          )}
          <button className="pag-btn pag-btn--arrow" onClick={() => irA(pagina + 1)} disabled={pagina === totalPag} aria-label="Siguiente">›</button>
        </div>
      )}

      {/* ── ESTILOS ─────────────────────────────────────────────── */}
      <style>{`
        /* PANEL DE FILTROS */
        .filtro-wrap {
          background: white;
          padding: 1.25rem 1.5rem 1rem;
          border-radius: 1rem;
          box-shadow: 0 4px 24px rgba(0,0,0,0.07);
          margin-bottom: 2rem;
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
        }
        .filtro-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.65rem;
          align-items: center;
        }
        .filtro-row--bottom {
          justify-content: space-between;
          padding-top: 0.5rem;
          border-top: 1px solid #f1f5f9;
        }
        .filtro-row__right {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        /* BUSCADOR */
        .filtro-search {
          flex: 2;
          min-width: 200px;
          padding: 0.65rem 1rem;
          border-radius: 0.6rem;
          border: 1.5px solid #e5e7eb;
          font-size: 0.92rem;
          color: #1e293b;
          background: #fafafa;
          transition: border-color 0.15s, background 0.15s;
        }
        .filtro-search:focus {
          outline: none;
          border-color: #1F3F7A;
          background: white;
        }

        /* CUSTOM SELECT */
        .csel {
          position: relative;
          flex: 1;
          min-width: 160px;
          user-select: none;
        }
        .csel__trigger {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.65rem 0.9rem;
          border-radius: 0.6rem;
          border: 1.5px solid #e5e7eb;
          background: #fafafa;
          color: #1e293b;
          font-size: 0.92rem;
          cursor: pointer;
          text-align: left;
          transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
        }
        .csel__trigger:hover,
        .csel--open .csel__trigger {
          border-color: #1F3F7A;
          background: white;
        }
        .csel--open .csel__trigger {
          border-bottom-left-radius: 0;
          border-bottom-right-radius: 0;
          box-shadow: 0 -2px 0 0 #1F3F7A inset;
        }
        .csel__val       { flex: 1; font-weight: 600; color: #1F3F7A; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .csel__placeholder { flex: 1; color: #9ca3af; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .csel__clear {
          color: #9ca3af;
          font-size: 1rem;
          line-height: 1;
          cursor: pointer;
          padding: 0 0.15rem;
          border-radius: 50%;
          transition: color 0.15s;
        }
        .csel__clear:hover { color: #dc2626; }

        /* PANEL DROPDOWN */
        .csel__panel {
          position: absolute;
          top: calc(100% - 1px);
          left: 0; right: 0;
          background: white;
          border: 1.5px solid #1F3F7A;
          border-top: none;
          border-bottom-left-radius: 0.6rem;
          border-bottom-right-radius: 0.6rem;
          box-shadow: 0 8px 24px rgba(31,63,122,0.13);
          z-index: 200;
          overflow: hidden;
          max-height: 260px;
          overflow-y: auto;
          animation: csel-drop 0.15s ease;
        }
        @keyframes csel-drop {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* OPCIONES */
        .csel__option {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.65rem 1rem;
          background: transparent;
          border: none;
          font-size: 0.9rem;
          color: #374151;
          cursor: pointer;
          text-align: left;
          transition: background 0.1s, color 0.1s;
          border-bottom: 1px solid #f8fafc;
        }
        .csel__option:last-child { border-bottom: none; }
        .csel__option:hover:not(.csel__option--active) {
          background: #EEF3FB;
          color: #1F3F7A;
        }
        .csel__option--active {
          background: #1F3F7A;
          color: white;
          font-weight: 600;
        }
        .csel__option--active svg { stroke: white; }

        /* scrollbar del panel */
        .csel__panel::-webkit-scrollbar { width: 4px; }
        .csel__panel::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }

        /* CHIPS TIPO MOTOR */
        .chips-group {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          flex-wrap: wrap;
        }
        .chips-label {
          font-size: 0.82rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          white-space: nowrap;
          margin-right: 0.2rem;
        }
        .chip {
          padding: 0.32rem 0.85rem;
          border-radius: 999px;
          border: 1.5px solid #e5e7eb;
          background: #f8fafc;
          color: #374151;
          font-size: 0.84rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .chip:hover  { border-color: #1F3F7A; color: #1F3F7A; background: #EEF3FB; }
        .chip--on    { background: #1F3F7A; border-color: #1F3F7A; color: white; }

        /* STOCK + LIMPIAR */
        .label-stock {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.88rem;
          font-weight: 600;
          color: #374151;
          cursor: pointer;
          white-space: nowrap;
        }
        .label-stock input { accent-color: #1F3F7A; width: 15px; height: 15px; cursor: pointer; }
        .btn-limpiar {
          background: #fef2f2;
          color: #dc2626;
          border: 1.5px solid #fecaca;
          padding: 0.5rem 1rem;
          border-radius: 0.6rem;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.85rem;
          transition: background 0.15s;
          white-space: nowrap;
        }
        .btn-limpiar:hover { background: #fee2e2; }

        /* CONTADOR */
        .resultado-count {
          font-size: 0.85rem;
          font-weight: 600;
          color: #94a3b8;
          margin: 0;
        }

        /* GRID */
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
        }
        .moto-link:focus-visible { outline: 3px solid #1F3F7A; outline-offset: 2px; }
        .sin-resultados {
          grid-column: 1 / -1;
          text-align: center;
          padding: 3rem 1rem;
          color: #64748b;
        }
        .sin-resultados p { margin-bottom: 1rem; }

        /* PAGINACIÓN */
        .paginacion {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 0.35rem;
          margin-top: 2.5rem;
          flex-wrap: wrap;
        }
        .pag-btn {
          min-width: 38px; height: 38px;
          padding: 0 0.55rem;
          border-radius: 0.5rem;
          border: 1.5px solid #e5e7eb;
          background: white;
          color: #374151;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .pag-btn:hover:not(:disabled) { border-color: #1F3F7A; color: #1F3F7A; background: #EEF3FB; }
        .pag-btn--on  { background: #1F3F7A; border-color: #1F3F7A; color: white; }
        .pag-btn--arrow { font-size: 1.25rem; line-height: 1; }
        .pag-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .pag-ellipsis { min-width: 24px; text-align: center; color: #9ca3af; line-height: 38px; }

        @media (max-width: 640px) {
          .filtro-search, .csel { min-width: 100%; flex: unset; width: 100%; }
          .filtro-row--bottom { flex-direction: column; align-items: flex-start; }
          .filtro-row__right  { width: 100%; justify-content: space-between; }
        }
      `}</style>
    </>
  );
}
