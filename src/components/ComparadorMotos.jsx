import { useState, useMemo, useRef, useEffect } from 'react';
import { toSlug } from '../lib/slug.ts';

/* ── Configuración de filas de specs ────────────────────────────── */

const SPECS = [
  { key: 'categoria',           label: 'Categoría',           src: 'root',  fmt: v => v,           win: null },
  { key: 'año',                 label: 'Año',                 src: 'root',  fmt: v => String(v),   win: null },
  { key: 'tipo_motor',          label: 'Motor',               src: 'specs', fmt: v => v,           win: null },
  { key: 'cilindrada_cc',       label: 'Cilindrada',          src: 'specs', fmt: v => `${v} cc`,   win: null },
  { key: 'potencia_cv',         label: 'Potencia',            src: 'specs', fmt: v => `${v} cv`,   win: 'max' },
  { key: 'potencia_kw',         label: 'Potencia eléctrica',  src: 'specs', fmt: v => `${v} kW`,   win: 'max' },
  { key: 'par_motor_nm',        label: 'Par motor',           src: 'specs', fmt: v => `${v} Nm`,   win: 'max' },
  { key: 'transmision',         label: 'Transmisión',         src: 'specs', fmt: v => v,           win: null },
  { key: 'refrigeracion',       label: 'Refrigeración',       src: 'specs', fmt: v => v,           win: null },
  { key: 'peso_kg',             label: 'Peso',                src: 'specs', fmt: v => `${v} kg`,   win: 'min' },
  { key: 'altura_sillin_mm',    label: 'Altura de sillín',    src: 'specs', fmt: v => `${v} mm`,   win: null },
  { key: 'deposito_litros',     label: 'Depósito',            src: 'specs', fmt: v => `${v} L`,    win: 'max' },
  { key: 'bateria_kwh',         label: 'Batería',             src: 'specs', fmt: v => `${v} kWh`,  win: 'max' },
  { key: 'autonomia_km',        label: 'Autonomía',           src: 'specs', fmt: v => `${v} km`,   win: 'max' },
  { key: 'velocidad_max_kmh',   label: 'Velocidad máx.',      src: 'specs', fmt: v => `${v} km/h`, win: 'max' },
  { key: 'neumatico_delantero', label: 'Neumático delantero', src: 'specs', fmt: v => v,           win: null },
  { key: 'neumatico_trasero',   label: 'Neumático trasero',   src: 'specs', fmt: v => v,           win: null },
  { key: 'abs',                 label: 'ABS',                 src: 'specs', fmt: null,             win: null },
];

function getVal(moto, spec) {
  if (!moto) return null;
  const v = spec.src === 'root' ? moto[spec.key] : moto.specs?.[spec.key];
  return v ?? null;
}

function findWinner(values, spec) {
  if (!spec.win) return -1;
  const nums = values.map((v, i) => ({ v, i })).filter(x => typeof x.v === 'number');
  if (nums.length < 2) return -1;
  const best = spec.win === 'max'
    ? Math.max(...nums.map(x => x.v))
    : Math.min(...nums.map(x => x.v));
  const winners = nums.filter(x => x.v === best);
  if (winners.length > 1) return -1; // empate
  return winners[0].i;
}

/* ── MotoSelector ───────────────────────────────────────────────── */

function MotoSelector({ motos, selected, onSelect, onClear, slot }) {
  const [query, setQuery] = useState('');
  const [open, setOpen]   = useState(false);
  const ref               = useRef(null);
  const inputRef          = useRef(null);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc   = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const list = q
      ? motos.filter(m => m.nombre.toLowerCase().includes(q) || m.marca.toLowerCase().includes(q))
      : motos;
    return list.slice(0, 25);
  }, [query, motos]);

  const handleSelect = (moto) => {
    onSelect(moto);
    setQuery('');
    setOpen(false);
  };

  if (selected) {
    return (
      <div className="msel msel--selected">
        <img src={selected.imagen} alt={selected.nombre} className="msel__thumb" />
        <div className="msel__info">
          <span className={`mbrand mbrand--${selected.marca.toLowerCase()}`}>{selected.marca}</span>
          <span className="msel__name">{selected.nombre}</span>
          {selected.categoria && <span className="msel__cat">{selected.categoria}</span>}
        </div>
        <button className="msel__clear" onClick={onClear} aria-label="Quitar moto">×</button>
      </div>
    );
  }

  return (
    <div className="msel msel--empty" ref={ref}>
      <div className="msel__search-wrap">
        <svg className="msel__icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          ref={inputRef}
          type="text"
          className="msel__input"
          placeholder={slot < 2 ? 'Buscar modelo...' : 'Añadir tercera moto (opcional)...'}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          autoComplete="off"
        />
      </div>
      {open && (
        <div className="msel__dropdown">
          {filtered.length > 0 ? (
            filtered.map(m => (
              <button key={m.nombre} className="msel__option" onMouseDown={() => handleSelect(m)}>
                <img src={m.imagen} alt={m.nombre} className="msel__opt-thumb" />
                <div className="msel__opt-info">
                  <span className={`mbrand mbrand--${m.marca.toLowerCase()}`}>{m.marca}</span>
                  <span className="msel__opt-name">{m.nombre}</span>
                </div>
              </button>
            ))
          ) : (
            <p className="msel__empty">Sin resultados para "{query}"</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── ComparadorMotos ────────────────────────────────────────────── */

export default function ComparadorMotos({ motos }) {
  const [slots, setSlots] = useState([null, null, null]);

  const seleccionar = (i, moto) => setSlots(prev => { const n = [...prev]; n[i] = moto; return n; });
  const quitar      = (i)       => setSlots(prev => { const n = [...prev]; n[i] = null; return n; });

  const seleccionados = new Set(slots.filter(Boolean).map(m => m.nombre));
  const disponibles   = (idx) => motos.filter(m => !seleccionados.has(m.nombre) || slots[idx]?.nombre === m.nombre);

  const activas = slots.filter(Boolean);
  const mostrarTabla = activas.length >= 2;

  const rowsVisibles = SPECS.filter(spec =>
    activas.some(m => getVal(m, spec) !== null)
  );

  return (
    <>
      {/* ── SELECTORES ──────────────────────────────────────────── */}
      <div className="comp-slots">
        {[0, 1, 2].map(i => (
          <div key={i} className="comp-slot">
            <p className="comp-slot__label">
              Moto {i + 1}{i === 2 ? <span className="comp-slot__opt"> (opcional)</span> : ''}
            </p>
            <MotoSelector
              motos={disponibles(i)}
              selected={slots[i]}
              onSelect={m => seleccionar(i, m)}
              onClear={() => quitar(i)}
              slot={i}
            />
          </div>
        ))}
      </div>

      {/* ── HINT ────────────────────────────────────────────────── */}
      {!mostrarTabla && (
        <div className="comp-hint">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="18" rx="1"/>
          </svg>
          <p>{activas.length === 0
            ? 'Selecciona dos motos para ver su comparativa de especificaciones.'
            : 'Selecciona una segunda moto para comenzar la comparación.'
          }</p>
        </div>
      )}

      {/* ── TABLA ───────────────────────────────────────────────── */}
      {mostrarTabla && (
        <div className="comp-table-scroll">
          <table className="comp-table">
            {/* Cabecera con imágenes y nombres */}
            <thead>
              <tr>
                <th className="comp-th-label" aria-label="Especificación"></th>
                {activas.map((m, i) => (
                  <th key={i} className="comp-th-moto">
                    <img src={m.imagen} alt={m.nombre} className="comp-moto-img" />
                    <span className={`mbrand mbrand--${m.marca.toLowerCase()}`}>{m.marca}</span>
                    <span className="comp-moto-name">{m.nombre}</span>
                    {m.año && <span className="comp-moto-year">{m.año}</span>}
                    <a href={`/catalogo/${toSlug(m.nombre)}`} className="comp-ficha-link">
                      Ver ficha completa →
                    </a>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Filas de specs */}
            <tbody>
              {rowsVisibles.map((spec, rowIdx) => {
                const values  = activas.map(m => getVal(m, spec));
                const winIdx  = findWinner(values, spec);

                return (
                  <tr key={spec.key} className={`comp-tr${rowIdx % 2 === 0 ? '' : ' comp-tr--alt'}`}>
                    <td className="comp-td-label">{spec.label}</td>
                    {activas.map((m, i) => {
                      const raw = values[i];
                      const isBest = winIdx === i;

                      let display;
                      if (raw === null) {
                        display = <span className="comp-nd">—</span>;
                      } else if (spec.key === 'abs') {
                        display = raw === true
                          ? <span className="comp-abs comp-abs--si">✓ Sí</span>
                          : <span className="comp-abs comp-abs--no">✗ No</span>;
                      } else {
                        display = spec.fmt ? spec.fmt(raw) : String(raw);
                      }

                      return (
                        <td key={i} className={`comp-td${isBest ? ' comp-td--best' : ''}`}>
                          {display}
                          {isBest && <span className="comp-badge">mejor</span>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── ESTILOS ─────────────────────────────────────────────── */}
      <style>{`
        /* SLOTS */
        .comp-slots {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.25rem;
          margin-bottom: 2rem;
        }
        .comp-slot__label {
          font-size: 0.78rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #64748b;
          margin: 0 0 0.5rem;
        }
        .comp-slot__opt {
          font-weight: 400;
          text-transform: none;
          letter-spacing: 0;
        }

        /* SELECTOR — vacío */
        .msel { border-radius: 0.75rem; overflow: visible; }
        .msel--empty {
          border: 2px dashed #e2e8f0;
          background: #fafafa;
          position: relative;
          border-radius: 0.75rem;
          transition: border-color 0.15s;
        }
        .msel--empty:focus-within { border-color: #1F3F7A; background: white; }
        .msel__search-wrap {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
        }
        .msel__icon { color: #94a3b8; flex-shrink: 0; }
        .msel__input {
          flex: 1;
          border: none;
          background: transparent;
          font-size: 0.9rem;
          color: #1e293b;
          outline: none;
          min-width: 0;
        }
        .msel__input::placeholder { color: #94a3b8; }

        /* DROPDOWN */
        .msel__dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0; right: 0;
          background: white;
          border: 1.5px solid #1F3F7A;
          border-radius: 0.75rem;
          box-shadow: 0 12px 32px rgba(31,63,122,0.15);
          z-index: 300;
          max-height: 320px;
          overflow-y: auto;
          animation: dd-in 0.15s ease;
        }
        @keyframes dd-in {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .msel__option {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
          padding: 0.6rem 0.85rem;
          background: transparent;
          border: none;
          border-bottom: 1px solid #f1f5f9;
          cursor: pointer;
          text-align: left;
          transition: background 0.1s;
        }
        .msel__option:last-child { border-bottom: none; }
        .msel__option:hover { background: #EEF3FB; }
        .msel__opt-thumb {
          width: 52px; height: 34px;
          object-fit: cover;
          border-radius: 0.35rem;
          background: #f1f5f9;
          flex-shrink: 0;
        }
        .msel__opt-info { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
        .msel__opt-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: #1e293b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .msel__empty {
          padding: 1rem;
          text-align: center;
          color: #94a3b8;
          font-size: 0.88rem;
          margin: 0;
        }
        .msel__dropdown::-webkit-scrollbar { width: 4px; }
        .msel__dropdown::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }

        /* SELECTOR — seleccionado */
        .msel--selected {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.65rem 0.9rem;
          background: white;
          border: 2px solid #1F3F7A;
          border-radius: 0.75rem;
          min-height: 70px;
        }
        .msel__thumb {
          width: 70px; height: 46px;
          object-fit: cover;
          border-radius: 0.4rem;
          background: #f1f5f9;
          flex-shrink: 0;
        }
        .msel__info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.2rem; }
        .msel__name {
          font-size: 0.88rem;
          font-weight: 700;
          color: #1e293b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .msel__cat { font-size: 0.75rem; color: #64748b; }
        .msel__clear {
          width: 26px; height: 26px;
          border-radius: 50%;
          border: 1.5px solid #e2e8f0;
          background: white;
          color: #94a3b8;
          font-size: 1.1rem;
          line-height: 1;
          cursor: pointer;
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s;
        }
        .msel__clear:hover { border-color: #dc2626; color: #dc2626; background: #fef2f2; }

        /* MARCA BADGE */
        .mbrand {
          display: inline-block;
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 0.15rem 0.45rem;
          border-radius: 0.25rem;
          color: white;
        }
        .mbrand--rieju  { background: #dc2626; }
        .mbrand--sherco { background: #0d9488; }

        /* HINT */
        .comp-hint {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 3.5rem 2rem;
          background: white;
          border-radius: 1rem;
          border: 2px dashed #e2e8f0;
          color: #94a3b8;
          text-align: center;
        }
        .comp-hint p { margin: 0; font-size: 0.95rem; max-width: 380px; line-height: 1.6; }

        /* TABLA */
        .comp-table-scroll {
          overflow-x: auto;
          border-radius: 1rem;
          box-shadow: 0 4px 24px rgba(0,0,0,0.07);
        }
        .comp-table-scroll::-webkit-scrollbar { height: 6px; }
        .comp-table-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }

        .comp-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          font-size: 0.9rem;
          min-width: 520px;
        }

        /* Cabecera */
        .comp-th-label {
          width: 160px;
          min-width: 140px;
          background: #f8fafc;
          position: sticky;
          left: 0;
          z-index: 2;
          border-right: 1px solid #e2e8f0;
        }
        .comp-th-moto {
          padding: 1.25rem 1rem;
          text-align: center;
          vertical-align: top;
          border-bottom: 3px solid #1F3F7A;
          min-width: 200px;
        }
        .comp-moto-img {
          width: 100%;
          max-width: 180px;
          height: 110px;
          object-fit: cover;
          border-radius: 0.5rem;
          background: #f1f5f9;
          display: block;
          margin: 0 auto 0.6rem;
        }
        .comp-moto-name {
          display: block;
          font-size: 0.92rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0.35rem 0 0.2rem;
          line-height: 1.3;
        }
        .comp-moto-year {
          display: block;
          font-size: 0.75rem;
          color: #94a3b8;
          font-weight: 600;
          margin-bottom: 0.6rem;
        }
        .comp-ficha-link {
          display: inline-block;
          font-size: 0.78rem;
          font-weight: 600;
          color: #1F3F7A;
          text-decoration: none;
          border: 1.5px solid #1F3F7A;
          padding: 0.3rem 0.75rem;
          border-radius: 0.4rem;
          transition: background 0.15s, color 0.15s;
          margin-top: 0.25rem;
        }
        .comp-ficha-link:hover { background: #1F3F7A; color: white; }

        /* Filas */
        .comp-tr { border-bottom: 1px solid #f1f5f9; }
        .comp-tr--alt { background: #fafafa; }
        .comp-tr:last-child { border-bottom: none; }

        .comp-td-label {
          padding: 0.85rem 1rem;
          font-size: 0.82rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          background: #f8fafc;
          position: sticky;
          left: 0;
          border-right: 1px solid #e2e8f0;
          white-space: nowrap;
        }
        .comp-tr--alt .comp-td-label { background: #f1f5f9; }

        .comp-td {
          padding: 0.85rem 1rem;
          text-align: center;
          color: #1e293b;
          font-weight: 500;
          vertical-align: middle;
          position: relative;
        }
        .comp-td--best {
          background: #f0fdf4;
          color: #16a34a;
          font-weight: 700;
        }
        .comp-tr--alt .comp-td--best { background: #dcfce7; }

        .comp-badge {
          display: inline-block;
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          background: #16a34a;
          color: white;
          padding: 0.1rem 0.4rem;
          border-radius: 999px;
          margin-left: 0.4rem;
          vertical-align: middle;
        }

        .comp-nd { color: #cbd5e1; font-weight: 400; }

        .comp-abs { font-weight: 700; }
        .comp-abs--si { color: #16a34a; }
        .comp-abs--no { color: #94a3b8; }

        /* RESPONSIVE */
        @media (max-width: 900px) {
          .comp-slots { grid-template-columns: 1fr; gap: 0.85rem; }
          .comp-th-label, .comp-td-label { position: static; }
        }
        @media (max-width: 600px) {
          .comp-slots { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
}
