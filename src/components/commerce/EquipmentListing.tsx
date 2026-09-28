import { useEffect, useMemo, useRef, useState } from "react";
import ProductCard from "./ProductCard";
import Icon from "../ui/Icon";
import type { EquipmentProduct } from "../../lib/catalog/types";
import type { FilterOption } from "../../lib/catalog/equipment-categories";
import {
  EMPTY_FILTERS,
  SORT_OPTIONS,
  applyFilters,
  computeFacets,
  countActiveFilters,
  filtersFromParams,
  filtersToParams,
  sortProducts,
  type EquipmentFilterState,
  type SortKey,
} from "../../lib/catalog/equipment-filters";
import { track } from "../../lib/analytics";
import "./EquipmentListing.css";

interface Props {
  products: EquipmentProduct[];
  categorySlug: string;
  categoryName: string;
  categoryIcon: string;
  types: FilterOption[];
  sizeScale: string[];
  /** Query string inicial (renderizado en servidor con los mismos filtros). */
  initialQuery: string;
}

type ListKey = "brands" | "types" | "sizes" | "colors";

export default function EquipmentListing({ products, categorySlug, categoryName, categoryIcon, types, sizeScale, initialQuery }: Props) {
  const initial = useMemo(() => filtersFromParams(new URLSearchParams(initialQuery)), [initialQuery]);
  const [filters, setFilters] = useState<EquipmentFilterState>(initial.filters);
  const [sort, setSort] = useState<SortKey>(initial.sort);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const firstRender = useRef(true);
  const drawerRef = useRef<HTMLDivElement>(null);

  const facets = useMemo(() => computeFacets(products, types, sizeScale), [products, types, sizeScale]);
  const visible = useMemo(() => sortProducts(applyFilters(products, filters), sort), [products, filters, sort]);
  const activeCount = countActiveFilters(filters);

  // Sincroniza la URL (compartible, recarga conserva filtros) + analytics
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const qs = filtersToParams(filters, sort).toString();
    history.replaceState(null, "", `${location.pathname}${qs ? `?${qs}` : ""}`);
    track("filter_category", { category: categorySlug, filters: qs || "none", results: visible.length });
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

  const toggle = (key: ListKey, value: string) =>
    setFilters((f) => ({ ...f, [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value] }));
  const clear = () => setFilters(EMPTY_FILTERS);

  const chips: { label: string; remove: () => void }[] = [
    ...filters.types.map((v) => ({ label: types.find((t) => t.value === v)?.label ?? v, remove: () => toggle("types", v) })),
    ...filters.brands.map((v) => ({ label: v, remove: () => toggle("brands", v) })),
    ...filters.sizes.map((v) => ({ label: `Talla ${v}`, remove: () => toggle("sizes", v) })),
    ...filters.colors.map((v) => ({ label: v, remove: () => toggle("colors", v) })),
    ...(filters.priceMin != null || filters.priceMax != null
      ? [{ label: `${filters.priceMin ?? 0}–${filters.priceMax ?? "∞"} €`, remove: () => setFilters((f) => ({ ...f, priceMin: null, priceMax: null })) }]
      : []),
    ...(filters.minRating != null ? [{ label: `${filters.minRating}★ o más`, remove: () => setFilters((f) => ({ ...f, minRating: null })) }] : []),
    ...(filters.inStockOnly ? [{ label: "En stock", remove: () => setFilters((f) => ({ ...f, inStockOnly: false })) }] : []),
    ...(filters.onSaleOnly ? [{ label: "En oferta", remove: () => setFilters((f) => ({ ...f, onSaleOnly: false })) }] : []),
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
                onChange={(e) => setFilters((f) => ({ ...f, priceMin: e.target.value === "" ? null : Number(e.target.value) }))}
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
                onChange={(e) => setFilters((f) => ({ ...f, priceMax: e.target.value === "" ? null : Number(e.target.value) }))}
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
              onChange={() => setFilters((f) => ({ ...f, minRating: f.minRating === r ? null : r }))}
            />
          ))}
        </Group>
      )}
      <Group title="Disponibilidad">
        <Check label="Solo en stock" checked={filters.inStockOnly} onChange={() => setFilters((f) => ({ ...f, inStockOnly: !f.inStockOnly }))} />
        {facets.hasSale && (
          <Check label="En oferta" checked={filters.onSaleOnly} onChange={() => setFilters((f) => ({ ...f, onSaleOnly: !f.onSaleOnly }))} />
        )}
      </Group>
    </div>
  );

  return (
    <div className="el">
      {/* Barra superior: filtrar / ordenar */}
      <div className="el__bar">
        <button type="button" className="el__filter-btn" onClick={() => setDrawerOpen(true)} aria-haspopup="dialog">
          <Icon name="filter" size={18} /> Filtrar{activeCount ? ` (${activeCount})` : ""}
        </button>
        <p className="el__count" aria-live="polite">
          {visible.length} {visible.length === 1 ? "producto" : "productos"}
        </p>
        <label className="el__sort">
          <Icon name="sort" size={16} />
          <span className="sr-only">Ordenar</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Ordenar productos">
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
            <div className="product-grid product-grid--3">
              {visible.map((p, i) => (
                <ProductCard key={p.id} product={p} categoryIcon={categoryIcon} priority={i < 3} />
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
