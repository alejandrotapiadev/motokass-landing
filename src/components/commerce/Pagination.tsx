import Icon from "../ui/Icon";
import { getPaginas } from "../../lib/filtros";

interface Props {
  page: number;
  totalPages: number;
  /** URL de cada página (enlaces reales: funcionan sin JS y se pueden compartir). */
  hrefFor: (page: number) => string;
  onChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, hrefFor, onChange }: Props) {
  if (totalPages <= 1) return null;

  const link = (n: number) => ({
    href: hrefFor(n),
    onClick: (e: React.MouseEvent) => {
      e.preventDefault();
      onChange(n);
    },
  });

  return (
    <nav className="pg" aria-label="Paginación">
      {page > 1 ? (
        <a className="pg__btn" {...link(page - 1)} rel="prev" aria-label="Página anterior">
          <Icon name="chevron-left" size={18} />
        </a>
      ) : (
        <span className="pg__btn" aria-disabled="true"><Icon name="chevron-left" size={18} /></span>
      )}

      <ol className="pg__pages">
        {getPaginas(totalPages, page).map((n, i) =>
          n === "…" ? (
            <li key={`gap-${i}`} className="pg__gap" aria-hidden="true">…</li>
          ) : (
            <li key={n}>
              <a className="pg__btn" {...link(n)} aria-current={n === page ? "page" : undefined} aria-label={`Página ${n}`}>
                {n}
              </a>
            </li>
          ),
        )}
      </ol>
      <span className="pg__status">Página {page} de {totalPages}</span>

      {page < totalPages ? (
        <a className="pg__btn" {...link(page + 1)} rel="next" aria-label="Página siguiente">
          <Icon name="chevron-right" size={18} />
        </a>
      ) : (
        <span className="pg__btn" aria-disabled="true"><Icon name="chevron-right" size={18} /></span>
      )}
    </nav>
  );
}
