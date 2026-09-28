/**
 * Repositorio de equipamiento (solo servidor).
 *
 * Fuente real: tablas equipment_products + equipment_variants en Supabase
 * (supabase/migrations/20260928_equipment.sql).
 *
 * Si la tabla no existe o está vacía:
 *  - en desarrollo (astro dev) o con EQUIPMENT_USE_MOCK=true → datos DEMO
 *    marcados con isMock (útil en previews; NO activar en Production).
 *  - en producción → lista vacía; la UI muestra estados vacíos.
 */
import type { EquipmentProduct } from "./types";
import { rowToEquipment, type EquipmentRow } from "./equipment-mapper";

export type EquipmentSource = "supabase" | "mock" | "empty";

export interface EquipmentResult {
  products: EquipmentProduct[];
  source: EquipmentSource;
}

const CACHE_TTL_MS = 60_000;
let cache: { at: number; result: EquipmentResult; featuredIds: Set<string> } | null = null;

function mockAllowed(): boolean {
  return import.meta.env.DEV === true || import.meta.env.EQUIPMENT_USE_MOCK === "true";
}

async function loadAll(): Promise<{ result: EquipmentResult; featuredIds: Set<string> }> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache;

  let products: EquipmentProduct[] = [];
  let featuredIds = new Set<string>();
  let source: EquipmentSource = "empty";

  try {
    if (import.meta.env.SUPABASE_URL && import.meta.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { default: supabase } = await import("../supabase");
      const { data, error } = await supabase
        .from("equipment_products")
        .select("*, equipment_variants(sku, ean, color, size, stock, price)")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const rows = (data ?? []) as EquipmentRow[];
      products = rows.map(rowToEquipment);
      featuredIds = new Set(rows.filter((r) => r.featured).map((r) => r.id));
      if (products.length) source = "supabase";
    }
  } catch (err) {
    console.warn("[equipment] Supabase no disponible:", (err as Error)?.message ?? err);
  }

  if (!products.length && mockAllowed()) {
    const mock = await import("./equipment.mock");
    products = mock.MOCK_EQUIPMENT;
    featuredIds = mock.MOCK_FEATURED_IDS;
    source = "mock";
  }

  const entry = { at: Date.now(), result: { products, source }, featuredIds };
  cache = entry;
  return entry;
}

export async function getEquipment(): Promise<EquipmentResult> {
  return (await loadAll()).result;
}

export async function getEquipmentByCategory(category: string): Promise<EquipmentResult> {
  const { result } = await loadAll();
  return { ...result, products: result.products.filter((p) => p.category === category) };
}

export async function getEquipmentBySlug(category: string, slug: string): Promise<{ product: EquipmentProduct | undefined; source: EquipmentSource }> {
  const { result } = await loadAll();
  return { product: result.products.find((p) => p.category === category && p.slug === slug), source: result.source };
}

/** Destacados (featured). Si no hay marcados, los más recientes con stock. */
export async function getFeaturedEquipment(limit = 8): Promise<EquipmentResult> {
  const { result, featuredIds } = await loadAll();
  const inStock = result.products.filter((p) => p.availability !== "out_of_stock");
  const featured = inStock.filter((p) => featuredIds.has(p.id));
  return { ...result, products: (featured.length ? featured : inStock).slice(0, limit) };
}

export async function getRelatedEquipment(product: EquipmentProduct, limit = 4): Promise<EquipmentProduct[]> {
  const { result } = await loadAll();
  return result.products
    .filter((p) => p.id !== product.id && p.category === product.category)
    .sort((a, b) => Number(b.type === product.type) - Number(a.type === product.type))
    .slice(0, limit);
}

/** "Completa tu equipamiento": productos de otras categorías. */
export async function getComplementaryEquipment(product: EquipmentProduct, limit = 4): Promise<EquipmentProduct[]> {
  const { result } = await loadAll();
  const seen = new Set<string>();
  return result.products
    .filter((p) => p.category !== product.category && p.availability !== "out_of_stock")
    .filter((p) => (seen.has(p.category) ? false : (seen.add(p.category), true)))
    .slice(0, limit);
}

export async function getEquipmentOffers(limit = 8): Promise<EquipmentResult> {
  const { result } = await loadAll();
  return {
    ...result,
    products: result.products.filter((p) => p.compareAtPrice != null && p.availability !== "out_of_stock").slice(0, limit),
  };
}
