import { useEffect, useRef } from "react";
import { SHOP_URL, categoryUrl } from "../../lib/catalog/equipment-categories";
import type { SortKey } from "../../lib/catalog/equipment-filters";
import "./CategoryNav.css";

interface Props {
  categories: { slug: string; name: string }[];
  /** slug de la categoría activa; null = "Todos". */
  active: string | null;
  /** Orden actual: se conserva al cambiar de categoría. */
  sort?: SortKey;
}

/** Navegación entre categorías de la tienda: Todos | Cascos | Chaquetas… */
export default function CategoryNav({ categories, active, sort = "relevance" }: Props) {
  const ref = useRef<HTMLElement>(null);
  const qs = sort !== "relevance" ? `?orden=${sort}` : "";

  // En móvil la lista hace scroll horizontal: deja a la vista la categoría activa.
  useEffect(() => {
    const nav = ref.current;
    const current = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (nav && current) nav.scrollLeft = current.offsetLeft - (nav.clientWidth - current.offsetWidth) / 2;
  }, [active]);

  const items = [{ slug: null as string | null, name: "Todos" }, ...categories];

  return (
    <nav className="cat-nav" aria-label="Categorías de equipamiento" ref={ref}>
      {items.map((c) => (
        <a
          key={c.slug ?? "todos"}
          href={`${c.slug ? categoryUrl(c.slug) : SHOP_URL}${qs}`}
          aria-current={c.slug === active ? "page" : undefined}
        >
          {c.name}
        </a>
      ))}
    </nav>
  );
}
