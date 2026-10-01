/**
 * Motor de filtros y ordenación de equipamiento (puro, sin DOM).
 * Las facetas se calculan a partir de los productos + la config de categoría,
 * así que funcionan igual para cualquier categoría nueva.
 */
import type { EquipmentProduct } from "./types";
import type { FilterOption } from "./equipment-categories";

export interface EquipmentFilterState {
  brands: string[];
  types: string[];
  sizes: string[];
  colors: string[];
  priceMin: number | null;
  priceMax: number | null;
  minRating: number | null;
  inStockOnly: boolean;
  onSaleOnly: boolean;
}

export const EMPTY_FILTERS: EquipmentFilterState = {
  brands: [],
  types: [],
  sizes: [],
  colors: [],
  priceMin: null,
  priceMax: null,
  minRating: null,
  inStockOnly: false,
  onSaleOnly: false,
};

export type SortKey = "relevance" | "price-asc" | "price-desc" | "rating" | "discount" | "name";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "relevance", label: "Recomendados" },
  { value: "price-asc", label: "Precio: menor a mayor" },
  { value: "price-desc", label: "Precio: mayor a menor" },
  { value: "rating", label: "Mejor valorados" },
  { value: "discount", label: "Mayor descuento" },
  { value: "name", label: "Nombre A–Z" },
];

function sizeInStock(p: EquipmentProduct, size: string): boolean {
  if (!p.variants.length) return p.sizes.includes(size) && p.stock > 0;
  return p.variants.some((v) => v.size === size && v.stock > 0);
}

export function applyFilters(products: EquipmentProduct[], f: EquipmentFilterState): EquipmentProduct[] {
  return products.filter((p) => {
    if (f.brands.length && !f.brands.includes(p.brand)) return false;
    if (f.types.length && (!p.type || !f.types.includes(p.type))) return false;
    if (f.colors.length && !p.colors.some((c) => f.colors.includes(c.name))) return false;
    // Filtrar por talla = talla con stock real: no sirve un producto que solo la tiene agotada.
    if (f.sizes.length && !f.sizes.some((s) => sizeInStock(p, s))) return false;
    if (f.priceMin != null && (p.price ?? 0) < f.priceMin) return false;
    if (f.priceMax != null && (p.price ?? 0) > f.priceMax) return false;
    if (f.minRating != null && (p.rating ?? 0) < f.minRating) return false;
    if (f.inStockOnly && p.availability === "out_of_stock") return false;
    if (f.onSaleOnly && p.compareAtPrice == null) return false;
    return true;
  });
}

const discount = (p: EquipmentProduct) =>
  p.compareAtPrice && p.price != null ? 1 - p.price / p.compareAtPrice : 0;

export function sortProducts(products: EquipmentProduct[], key: SortKey): EquipmentProduct[] {
  const list = [...products];
  const outLast = (a: EquipmentProduct, b: EquipmentProduct) =>
    Number(a.availability === "out_of_stock") - Number(b.availability === "out_of_stock");
  switch (key) {
    case "price-asc":
      return list.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    case "price-desc":
      return list.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    case "rating":
      return list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.reviewCount - a.reviewCount);
    case "discount":
      return list.sort((a, b) => discount(b) - discount(a));
    case "name":
      return list.sort((a, b) => a.name.localeCompare(b.name, "es"));
    default:
      return list.sort(
        (a, b) =>
          outLast(a, b) ||
          Number(b.badges.includes("bestseller")) - Number(a.badges.includes("bestseller")) ||
          Number(b.badges.includes("new")) - Number(a.badges.includes("new")),
      );
  }
}

export interface Facets {
  brands: FilterOption[];
  types: FilterOption[];
  sizes: FilterOption[];
  colors: (FilterOption & { hex?: string | null })[];
  priceRange: [number, number] | null;
  hasRatings: boolean;
  hasSale: boolean;
}

/**
 * Facetas disponibles. `types` y `sizeScale` vienen de la categoría para
 * conservar el orden lógico (XS…3XL, 38…47); solo se muestran las opciones
 * que existen en los productos.
 */
export function computeFacets(
  products: EquipmentProduct[],
  categoryTypes: FilterOption[] = [],
  sizeScale: string[] = [],
): Facets {
  const brands = [...new Set(products.map((p) => p.brand))].sort((a, b) => a.localeCompare(b, "es"));
  const typeSet = new Set(products.map((p) => p.type).filter(Boolean) as string[]);
  const types = categoryTypes.filter((t) => typeSet.has(t.value));
  // tipos presentes en datos pero no configurados en la categoría
  typeSet.forEach((t) => {
    if (!types.some((x) => x.value === t)) types.push({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) });
  });

  // Solo tallas con stock en algún producto
  const sizeSet = new Set(products.flatMap((p) => p.sizes.filter((s) => sizeInStock(p, s))));
  const sizes = [
    ...sizeScale.filter((s) => sizeSet.has(s)),
    ...[...sizeSet].filter((s) => !sizeScale.includes(s)).sort(),
  ].map((s) => ({ value: s, label: s }));

  const colorMap = new Map<string, string | null | undefined>();
  products.forEach((p) => p.colors.forEach((c) => colorMap.has(c.name) || colorMap.set(c.name, c.hex)));
  const colors = [...colorMap].map(([name, hex]) => ({ value: name, label: name, hex }));

  const prices = products.map((p) => p.price).filter((v): v is number => v != null);
  const priceRange: [number, number] | null = prices.length
    ? [Math.floor(Math.min(...prices)), Math.ceil(Math.max(...prices))]
    : null;

  return {
    brands: brands.map((b) => ({ value: b, label: b })),
    types,
    sizes,
    colors,
    priceRange,
    hasRatings: products.some((p) => p.rating != null),
    hasSale: products.some((p) => p.compareAtPrice != null),
  };
}

export function countActiveFilters(f: EquipmentFilterState): number {
  return (
    f.brands.length +
    f.types.length +
    f.sizes.length +
    f.colors.length +
    (f.priceMin != null || f.priceMax != null ? 1 : 0) +
    (f.minRating != null ? 1 : 0) +
    (f.inStockOnly ? 1 : 0) +
    (f.onSaleOnly ? 1 : 0)
  );
}

/* ── Sincronización con la URL (?tipo=integral&talla=M&orden=price-asc) ── */

const LIST_PARAMS: [keyof EquipmentFilterState, string][] = [
  ["brands", "marca"],
  ["types", "tipo"],
  ["sizes", "talla"],
  ["colors", "color"],
];

export function filtersFromParams(params: URLSearchParams): { filters: EquipmentFilterState; sort: SortKey; page: number } {
  const f: EquipmentFilterState = { ...EMPTY_FILTERS };
  for (const [key, param] of LIST_PARAMS) {
    const v = params.get(param);
    (f[key] as string[]) = v ? v.split(",").filter(Boolean) : [];
  }
  const n = (k: string) => (params.get(k) && !Number.isNaN(Number(params.get(k))) ? Number(params.get(k)) : null);
  f.priceMin = n("min");
  f.priceMax = n("max");
  f.minRating = n("valoracion");
  f.inStockOnly = params.get("stock") === "1";
  f.onSaleOnly = params.get("oferta") === "1";
  const sort = (SORT_OPTIONS.find((o) => o.value === params.get("orden"))?.value ?? "relevance") as SortKey;
  const page = Math.max(1, Math.floor(n("pagina") ?? 1));
  return { filters: f, sort, page };
}

export function filtersToParams(f: EquipmentFilterState, sort: SortKey, page = 1): URLSearchParams {
  const p = new URLSearchParams();
  for (const [key, param] of LIST_PARAMS) {
    const v = f[key] as string[];
    if (v.length) p.set(param, v.join(","));
  }
  if (f.priceMin != null) p.set("min", String(f.priceMin));
  if (f.priceMax != null) p.set("max", String(f.priceMax));
  if (f.minRating != null) p.set("valoracion", String(f.minRating));
  if (f.inStockOnly) p.set("stock", "1");
  if (f.onSaleOnly) p.set("oferta", "1");
  if (sort !== "relevance") p.set("orden", sort);
  if (page > 1) p.set("pagina", String(page));
  return p;
}

/* ── Paginación (en cliente: el listado completo ya está cargado y filtrado) ── */

export const PAGE_SIZE = 12;

export function paginate<T>(items: T[], page: number, pageSize = PAGE_SIZE): { items: T[]; page: number; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  return { items: items.slice((current - 1) * pageSize, current * pageSize), page: current, totalPages };
}
