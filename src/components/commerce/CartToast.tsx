import { useEffect, useState } from "react";
import Icon from "../ui/Icon";

interface AddedDetail {
  name: string;
  variant?: string;
  image?: string | null;
}

/**
 * Confirmación no intrusiva al añadir al carrito.
 * Escucha el evento "mk:cart-added" que emite addToCart().
 */
export default function CartToast() {
  const [item, setItem] = useState<AddedDetail | null>(null);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const onAdded = (e: Event) => {
      setItem((e as CustomEvent<AddedDetail>).detail);
      clearTimeout(t);
      t = setTimeout(() => setItem(null), 5000);
    };
    window.addEventListener("mk:cart-added", onAdded);
    return () => {
      window.removeEventListener("mk:cart-added", onAdded);
      clearTimeout(t);
    };
  }, []);

  if (!item) return null;

  return (
    <div className="mk-toast" role="status" aria-live="polite">
      <div className="mk-toast__row">
        <span className="mk-toast__check"><Icon name="check" size={16} strokeWidth={2.5} /></span>
        <div className="mk-toast__body">
          <strong>Añadido al carrito</strong>
          <span>{item.name}{item.variant ? ` · ${item.variant}` : ""}</span>
        </div>
        <button type="button" className="mk-toast__close" onClick={() => setItem(null)} aria-label="Cerrar aviso">
          <Icon name="close" size={16} />
        </button>
      </div>
      <a href="/carrito" className="btn btn--accent btn--block btn--sm">Ver carrito</a>
      <style>{`
        .mk-toast {
          position: fixed;
          z-index: 800;
          top: calc(var(--header-h) + 12px);
          right: 16px;
          width: min(360px, calc(100vw - 32px));
          background: #fff;
          color: var(--text);
          border: 1px solid var(--line);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-2);
          padding: 1rem;
          display: grid;
          gap: .75rem;
          animation: mk-toast-in .25s var(--ease);
        }
        .mk-toast__row { display: flex; gap: .75rem; align-items: flex-start; }
        .mk-toast__check { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: var(--ok); color: #fff; flex-shrink: 0; }
        .mk-toast__body { flex: 1; display: grid; gap: .15rem; font-size: .9rem; }
        .mk-toast__body span { color: var(--text-2); font-size: .85rem; }
        .mk-toast__close { background: none; border: 0; cursor: pointer; color: var(--text-2); padding: 4px; }
        @keyframes mk-toast-in { from { opacity: 0; transform: translateY(-8px); } }
      `}</style>
    </div>
  );
}
