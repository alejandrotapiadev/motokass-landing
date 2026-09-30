import { useEffect, useMemo, useRef, useState } from "react";
import ProductCard from "./ProductCard";
import CategoryNav from "./CategoryNav";
import Pagination from "./Pagination";
import Icon from "../ui/Icon";
import type { EquipmentProduct } from "../../lib/catalog/types";
import { SHOP_URL, categoryUrl, type FilterOption } from "../../lib/catalog/equipment-categories";
import {
  EMPTY_FILTERS,
  SORT_OPTIONS,
  applyFilters,
  computeFacets,
  countActiveFilters,
  filtersFromParams,
  filtersToParams,
  paginate,
  sortProducts,
  type EquipmentFilterState,
  type SortKey,
} from "../../lib/catalog/equipment-filters";
import { rememberListing } from "../../lib/catalog/listing-context";
import { track } from "../../lib/analytics";
import "./EquipmentListing.css";

interface Props {
  products: EquipmentProduct[];
  /** Categorías activas para la navegación y los iconos de placeholder. */
  categories: { slug: string; name: string; icon: string }[];
  /** slug de la categoría mostrada; null = "Todos" (toda la tienda). */
  categorySlug: string | null;
  /** Nombre en plural para los textos ("cascos", "productos"…). */
  categoryName: string;
  types: FilterOption[];
  sizeScale: string[];
  /** Query string inicial (renderizado en servidor con los mismos filtros). */
  initialQuery: string;
  /** WhatsApp para consultar cuando la categoría aún no tiene productos. */
  helpUrl: string;
}

type ListKey = "brands" | "types" | "sizes" | "colors";

export default function EquipmentListing({ products, categories, categorySlug, categoryName, types, sizeScale, initialQuery, helpUrl }: Props) {
  const initial = useMemo(() => filtersFromParams(new URLSearchParams(initialQuery)), [initialQuery]);
  const [filters, setFilters] = useState<EquipmentFilterState>(initial.filters);
  const [sort, setSort] = useState<SortKey>(initial.sort);
  const [page, setPage] = useState(initial.page);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const firstRender = useRef(true);
  const firstUrlSync = useRef(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const facets = useMemo(() => computeFacets(products, types, sizeScale), [products, types, sizeScale]);
  const visible = useMemo(() => sortProducts(applyFilters(products, filters), sort), [products, filters, sort]);
  // `current.page` ya viene acotada: ?pagina=99 con 2 páginas muestra la última.
  const current = useMemo(() => paginate(visible, page), [visible, page]);
  const urlFor = (n: number) => {
    const qs = filtersToParams(filters, sort, n).toString();
    return `${categorySlug ? categoryUrl(categorySlug) : SHOP_URL}${qs ? `?${qs}` : ""}`;
  };
  const activeCount = countActiveFilters(filters);
  const icons = useMemo(() => Object.fromEntries(categories.map((c) => [c.slug, c.icon])), [categories]);

  // Sincroniza la URL (compartible, recarga conserva filtros, orden y página)
  // Contexto para el "volver" de la ficha de producto
  useEffect(() => rememberListing(urlFor(current.page)), [filters, sort, current.page]);

  useEffect(() => {
    // Al cargar no se toca la URL, salvo que pidiera una página que no existe.
    if (firstUrlSync.current) {
      firstUrlSync.current = false;
      if (current.page === initial.page) return;
    }
    history.replaceState(history.state, "", urlFor(current.page));
  }, [filters, sort, current.page]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    track("filter_category", { category: categorySlug ?? "todos", filters: filtersToParams(filters, sort).toString() || "none", results: visible.length });
  }, [filters, sort]);

  useEffect(() => {
    if (!drawerOpen) return;
    document.body.style.overflow = "hidden";
    drawerRef.current?.querySelector<HTMLElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [drawerOpen]);

  // Cambiar filtros u orden vuelve a la primera página.
  const changeFilters: typeof setFilters = (value) => {
    setFilters(value);
    setPage(1);
  };
  const changeSort = (value: SortKey) => {
    setSort(value);
    setPage(1);
  };
  const goToPage = (n: number) => {
    setPage(n);
    rootRef.current?.scrollIntoView({ block: "start" });
  };

  const toggle = (key: ListKey, value: string) =>
    changeFilters((f) => ({ ...f, [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value] }));
  const clear = () => changeFilters(EMPTY_FILTERS);

  const chips: { label: string; remove: () => void }[] = [
    ...filters.types.map((v) => ({ label: types.find((t) => t.value === v)?.label ?? v, remove: () => toggle("types", v) })),
    ...filters.brands.map((v) => ({ label: v, remove: () => toggle("brands", v) })),
    ...filters.sizes.map((v) => ({ label: `Talla ${v}`, remove: () => toggle("sizes", v) })),
    ...filters.colors.map((v) => ({ label: v, remove: () => toggle("colors", v) })),
    ...(filters.priceMin != null || filters.priceMax != null
      ? [{ label: `${filters.priceMin ?? 0}–${filters.priceMax ?? "∞"} €`, remove: () => changeFilters((f) => ({ ...f, priceMin: null, priceMax: null })) }]
      : []),
    ...(filters.minRating != null ? [{ label: `${filters.minRating}★ o más`, remove: () => changeFilters((f) => ({ ...f, minRating: null })) }] : []),
    ...(filters.inStockOnly ? [{ label: "En stock", remove: () => changeFilters((f) => ({ ...f, inStockOnly: false })) }] : []),
    ...(filters.onSaleOnly ? [{ label: "En oferta", remove: () => changeFilters((f) => ({ ...f, onSaleOnly: false })) }] : []),
  ];

  const filterPanel = (
    <div className="fl">
      {facets.types.length > 0 && (
        <Group title="Tipo">
          {facets.types.map((t) => (
            <Check key={t.value} label={t.label} checked={filters.types.includes(t.value)} onChange={() => toggle("types", t.value)} />
          ))}
        </Group>
      )}
      {facets.brands.length > 0 && (
        <Group title="Marca">
          {facets.brands.map((b) => (
            <Check key={b.value} label={b.label} checked={filters.brands.includes(b.value)} onChange={() => toggle("brands", b.value)} />
          ))}
        </Group>
      )}
      {facets.priceRange && (
        <Group title="Precio">
          <div className="fl__price">
            <label>
              <span>Mín.</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                placeholder={String(facets.priceRange[0])}
                value={filters.priceMin ?? ""}
                onChange={(e) => changeFilters((f) => ({ ...f, priceMin: e.target.value === "" ? null : Number(e.target.value) }))}
              />
            </label>
            <label>
              <span>Máx.</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                placeholder={String(facets.priceRange[1])}
                value={filters.priceMax ?? ""}
                onChange={(e) => changeFilters((f) => ({ ...f, priceMax: e.target.value === "" ? null : Number(e.target.value) }))}
              />
            </label>
          </div>
        </Group>
      )}
      {facets.sizes.length > 0 && (
        <Group title="Talla">
          <div className="fl__sizes">
            {facets.sizes.map((s) => (
              <button
                key={s.value}
                type="button"
                className="fl__size"
                aria-pressed={filters.sizes.includes(s.value)}
                onClick={() => toggle("sizes", s.value)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </Group>
      )}
      {facets.colors.length > 0 && (
        <Group title="Color">
          {facets.colors.map((c) => (
            <Check
              key={c.value}
              label={c.label}
              checked={filters.colors.includes(c.value)}
              onChange={() => toggle("colors", c.value)}
              swatch={c.hex ?? undefined}
            />
          ))}
        </Group>
      )}
      {facets.hasRatings && (
        <Group title="Valoración">
          {[4, 3].map((r) => (
            <Check
              key={r}
              label={`${r}★ o más`}
              checked={filters.minRating === r}
              onChange={() => changeFilters((f) => ({ ...f, minRating: f.minRating === r ? null : r }))}
            />
          ))}
        </Group>
      )}
      <Group title="Disponibilidad">
        <Check label="Solo en stock" checked={filters.inStockOnly} onChange={() => changeFilters((f) => ({ ...f, inStockOnly: !f.inStockOnly }))} />
        {facets.hasSale && (
          <Check label="En oferta" checked={filters.onSaleOnly} onChange={() => changeFilters((f) => ({ ...f, onSaleOnly: !f.onSaleOnly }))} />
        )}
      </Group>
    </div>
  );

  const nav = <CategoryNav categories={categories} active={categorySlug} sort={sort} />;

  if (products.length === 0) {
    return (
      <div className="el">
        {nav}
        <div className="empty-state">
          <strong>Muy pronto verás aquí nuestros {categoryName.toLowerCase()}.</strong>
          Mientras tanto, consúltanos disponibilidad y tallas: te atendemos por WhatsApp o en la tienda.
          <p style={{ marginTop: "1rem" }}>
            <a href={helpUrl} className="btn btn--dark" target="_blank" rel="noopener noreferrer" data-track="click_whatsapp" data-track-location={`category_${categorySlug ?? "todos"}_empty`}>
              <Icon name="whatsapp" size={18} /> Consultar {categoryName.toLowerCase()}
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="el" ref={rootRef}>
      {nav}

      {/* Barra superior: filtrar / ordenar */}
      <div className="el__bar">
        <button type="button" className="el__filter-btn" onClick={() => setDrawerOpen(true)} aria-haspopup="dialog">
          <Icon name="filter" size={18} /> Filtrar{activeCount ? ` (${activeCount})` : ""}
        </button>
        <p className="el__count" aria-live="polite">
          {visible.length} {visible.length === 1 ? "producto" : "productos"}
          {current.totalPages > 1 && ` · página ${current.page} de ${current.totalPages}`}
        </p>
        <label className="el__sort">
          <Icon name="sort" size={16} />
          <span className="sr-only">Ordenar</span>
          <select value={sort} onChange={(e) => changeSort(e.target.value as SortKey)} aria-label="Ordenar productos">
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      </div>

      {chips.length > 0 && (
        <div className="el__chips">
          {chips.map((c) => (
            <button key={c.label} type="button" className="el__chip" onClick={c.remove} aria-label={`Quitar filtro ${c.label}`}>
              {c.label} <Icon name="close" size={12} strokeWidth={2.5} />
            </button>
          ))}
          <button type="button" className="el__clear" onClick={clear}>Borrar filtros</button>
        </div>
      )}

      <div className="el__layout">
        <aside className="el__side" aria-label="Filtros">{filterPanel}</aside>

        <div>
          {visible.length > 0 ? (
            <div className="product-grid product-grid--3 el__grid" key={urlFor(current.page)}>
              {current.items.map((p, i) => (
                <ProductCard key={p.id} product={p} categoryIcon={icons[p.category]} priority={i < 3} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>No hay {categoryName.toLowerCase()} con estos filtros.</strong>
              Prueba a quitar algún filtro o consúltanos: puede que lo tengamos en tienda.
              <p style={{ marginTop: "1rem" }}>
                <button type="button" className="btn btn--dark btn--sm" onClick={clear}>Borrar filtros</button>
              </p>
            </div>
          )}
          <Pagination page={current.page} totalPages={current.totalPages} hrefFor={urlFor} onChange={goToPage} />
        </div>
      </div>

      {/* Drawer de filtros (móvil / tablet) */}
      {drawerOpen && (
        <div className="el__drawer" role="dialog" aria-modal="true" aria-label="Filtros">
          <div className="el__drawer-backdrop" onClick={() => setDrawerOpen(false)} />
          <div className="el__drawer-panel" ref={drawerRef}>
            <div className="el__drawer-head">
              <strong>Filtrar {categoryName.toLowerCase()}</strong>
              <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Cerrar filtros">
                <Icon name="close" size={22} />
              </button>
            </div>
            <div className="el__drawer-body">{filterPanel}</div>
            <div className="el__drawer-foot">
              <button type="button" className="btn btn--outline" onClick={clear} disabled={!activeCount}>Borrar</button>
              <button type="button" className="btn btn--dark" onClick={() => setDrawerOpen(false)}>
                Ver {visible.length} {visible.length === 1 ? "producto" : "productos"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="fl__group">
      <legend>{title}</legend>
      {children}
    </fieldset>
  );
}

function Check({ label, checked, onChange, swatch }: { label: string; checked: boolean; onChange: () => void; swatch?: string }) {
  return (
    <label className="fl__check">
      <input type="checkbox" checked={checked} onChange={onChange} />
      {swatch && <span className="fl__swatch" style={{ background: swatch }} aria-hidden="true" />}
      <span>{label}</span>
    </label>
  );
}
