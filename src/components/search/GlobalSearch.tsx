import { useEffect, useRef, useState } from "react";
import Icon from "../ui/Icon";
import { track } from "../../lib/analytics";

type Group = "motorcycle" | "equipment" | "blog";

interface ResultDoc {
  group: Group;
  id: string;
  title: string;
  subtitle: string;
  url: string;
  image: string | null;
  price: number | null;
}

interface Response {
  total: number;
  groups: Record<Group, ResultDoc[]>;
}

const GROUPS: { key: Group; label: string }[] = [
  { key: "motorcycle", label: "Motos" },
  { key: "equipment", label: "Equipamiento" },
  { key: "blog", label: "Blog" },
];

const SUGGESTIONS = ["Rieju", "Sherco", "Enduro", "Casco integral", "Guantes", "Trial", "125 cc"];

const eur = (n: number) =>
  n.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: n % 1 ? 2 : 0 });

/**
 * Buscador global (overlay). Se abre con cualquier elemento [data-open-search]
 * o con la tecla "/". Enter lleva a /buscar?q= con todos los resultados.
 */
export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement)?.closest("[data-open-search]");
      if (el) {
        e.preventDefault();
        lastFocus.current = el as HTMLElement;
        setOpen(true);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        lastFocus.current = document.activeElement as HTMLElement;
        setOpen(true);
      }
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onEsc);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setData(null);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: ctrl.signal });
        if (res.ok) {
          const json = (await res.json()) as Response;
          setData(json);
          track("search", { search_term: query, results: json.total, source: "overlay" });
        }
      } catch {
        /* abortado o sin red */
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  function close() {
    setOpen(false);
    lastFocus.current?.focus?.();
  }

  if (!open) return null;

  const hasResults = data && data.total > 0;

  return (
    <div className="gs" role="dialog" aria-modal="true" aria-label="Buscar en MOTOKASS">
      <div className="gs__backdrop" onClick={close} />
      <div className="gs__panel">
        <form className="gs__form" action="/buscar" method="get" role="search">
          <Icon name="search" size={22} />
          <input
            ref={inputRef}
            name="q"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Busca motos, cascos, guantes, marcas…"
            aria-label="Buscar"
            autoComplete="off"
            enterKeyHint="search"
          />
          <button type="button" className="gs__close" onClick={close} aria-label="Cerrar búsqueda">
            <Icon name="close" size={22} />
          </button>
        </form>

        <div className="gs__body">
          {!data && !loading && (
            <div className="gs__suggest">
              <span>Búsquedas frecuentes</span>
              <div>
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => setQ(s)}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {loading && !data && <p className="gs__status">Buscando…</p>}

          {data && !hasResults && (
            <p className="gs__status">
              Sin resultados para <strong>“{q}”</strong>. Prueba con una marca, un modelo o una categoría.
            </p>
          )}

          {hasResults &&
            GROUPS.filter((g) => data.groups[g.key].length).map((g) => (
              <section key={g.key} className="gs__group">
                <h3>{g.label}</h3>
                <ul>
                  {data.groups[g.key].map((d) => (
                    <li key={d.id}>
                      <a href={d.url} className="gs__item">
                        <span className="gs__thumb">
                          {d.image ? <img src={d.image} alt="" loading="lazy" width={64} height={48} /> : <Icon name={g.key === "blog" ? "doc" : g.key === "equipment" ? "helmet" : "moto"} size={22} />}
                        </span>
                        <span className="gs__text">
                          <strong>{d.title}</strong>
                          <span>{d.subtitle}</span>
                        </span>
                        {d.price != null && <span className="gs__price">{eur(d.price)}</span>}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

          {hasResults && (
            <a className="btn btn--dark btn--block" href={`/buscar?q=${encodeURIComponent(q.trim())}`}>
              Ver los {data.total} resultados
            </a>
          )}
        </div>
      </div>

      <style>{`
        .gs { position: fixed; inset: 0; z-index: 950; }
        .gs__backdrop { position: absolute; inset: 0; background: rgba(14,15,18,.6); }
        .gs__panel {
          position: relative;
          margin: 0 auto;
          max-width: 760px;
          background: #fff;
          color: var(--text);
          max-height: 100dvh;
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow-2);
          animation: gs-in .2s var(--ease);
        }
        @media (min-width: 901px) { .gs__panel { margin-top: 10vh; max-height: 75vh; border-radius: var(--radius-lg); } }
        .gs__form { display: flex; align-items: center; gap: .75rem; padding: .75rem 1rem; border-bottom: 1px solid var(--line); }
        .gs__form input { flex: 1; border: 0; outline: 0; font-size: 1.1rem; padding: .6rem 0; background: transparent; min-width: 0; }
        .gs__form input::-webkit-search-cancel-button { display: none; }
        .gs__close { background: none; border: 0; cursor: pointer; padding: .5rem; color: var(--text-2); }
        .gs__body { overflow-y: auto; padding: 1rem; display: grid; gap: 1.25rem; }
        .gs__suggest span { display: block; font-size: .75rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--text-2); margin-bottom: .6rem; }
        .gs__suggest div { display: flex; flex-wrap: wrap; gap: .5rem; }
        .gs__suggest button { border: 1px solid var(--line); background: #fff; border-radius: 999px; padding: .45rem .9rem; cursor: pointer; font-size: .88rem; }
        .gs__suggest button:hover { border-color: var(--ink); }
        .gs__status { color: var(--text-2); margin: 0; }
        .gs__group h3 { font-family: var(--font-body); font-size: .72rem; letter-spacing: .12em; text-transform: uppercase; color: var(--text-2); margin: 0 0 .5rem; }
        .gs__group ul { list-style: none; margin: 0; padding: 0; }
        .gs__item { display: flex; align-items: center; gap: .85rem; padding: .55rem .5rem; border-radius: var(--radius); }
        .gs__item:hover, .gs__item:focus-visible { background: var(--paper-2); }
        .gs__thumb { width: 64px; height: 48px; flex-shrink: 0; display: grid; place-items: center; background: var(--paper-2); border-radius: 2px; overflow: hidden; color: var(--text-2); }
        .gs__thumb img { width: 100%; height: 100%; object-fit: cover; }
        .gs__text { flex: 1; min-width: 0; display: grid; }
        .gs__text strong { font-size: .95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .gs__text span { font-size: .8rem; color: var(--text-2); }
        .gs__price { font-weight: 700; font-size: .9rem; white-space: nowrap; }
        @keyframes gs-in { from { opacity: 0; transform: translateY(-10px); } }
      `}</style>
    </div>
  );
}
