/**
 * Conversión fila Supabase → EquipmentProduct (función pura, testeable).
 */
import type { Availability, EquipmentBadge, EquipmentProduct, FaqItem, ProductColor, ProductVariant } from "./types";
import { productUrl } from "./equipment-categories";

export interface EquipmentVariantRow {
  sku: string;
  ean: string | null;
  color: string | null;
  size: string | null;
  stock: number;
  price: number | string | null;
}

export interface EquipmentRow {
  id: string;
  slug: string;
  sku: string | null;
  ean: string | null;
  brand: string;
  name: string;
  category: string;
  subcategory: string | null;
  type: string | null;
  description: string | null;
  price: number | string;
  compare_at_price: number | string | null;
  images: string[] | null;
  colors: ProductColor[] | null;
  sizes: string[] | null;
  stock: number | null;
  rating: number | string | null;
  review_count: number | null;
  features: string[] | null;
  materials: string[] | null;
  technology: string[] | null;
  gender: EquipmentProduct["gender"];
  season: EquipmentProduct["season"];
  tags: string[] | null;
  badges: string[] | null;
  faq: FaqItem[] | null;
  featured?: boolean | null;
  equipment_variants?: EquipmentVariantRow[] | null;
}

const LOW_STOCK_THRESHOLD = 3;

export function availabilityFromStock(stock: number): Availability {
  if (stock <= 0) return "out_of_stock";
  if (stock <= LOW_STOCK_THRESHOLD) return "low_stock";
  return "in_stock";
}

const num = (v: number | string | null | undefined): number | null =>
  v === null || v === undefined || v === "" ? null : Number(v);

const VALID_BADGES: EquipmentBadge[] = ["new", "sale", "bestseller"];

export function rowToEquipment(row: EquipmentRow): EquipmentProduct {
  const variants: ProductVariant[] = (row.equipment_variants ?? []).map((v) => ({
    sku: v.sku,
    ean: v.ean,
    color: v.color,
    size: v.size,
    stock: v.stock ?? 0,
    price: num(v.price),
  }));
  const stock = variants.length ? variants.reduce((s, v) => s + v.stock, 0) : row.stock ?? 0;

  // Tallas/colores: si no vienen explícitos, se derivan de las variantes.
  const sizes = row.sizes?.length
    ? row.sizes
    : [...new Set(variants.map((v) => v.size).filter(Boolean) as string[])];
  const colors: ProductColor[] = row.colors?.length
    ? row.colors
    : [...new Set(variants.map((v) => v.color).filter(Boolean) as string[])].map((name) => ({ name }));

  const price = Number(row.price);
  const compareAt = num(row.compare_at_price);
  const badges = (row.badges ?? []).filter((b): b is EquipmentBadge => VALID_BADGES.includes(b as EquipmentBadge));
  if (compareAt != null && compareAt > price && !badges.includes("sale")) badges.push("sale");

  return {
    kind: "equipment",
    id: row.id,
    slug: row.slug,
    url: productUrl(row.category, row.slug),
    brand: row.brand,
    name: row.name,
    price,
    compareAtPrice: compareAt != null && compareAt > price ? compareAt : null,
    images: row.images ?? [],
    availability: availabilityFromStock(stock),
    tags: row.tags ?? [],
    sku: row.sku,
    ean: row.ean,
    category: row.category,
    subcategory: row.subcategory,
    type: row.type,
    description: row.description ?? "",
    colors,
    sizes,
    variants,
    stock,
    rating: num(row.rating),
    reviewCount: row.review_count ?? 0,
    features: row.features ?? [],
    materials: row.materials ?? [],
    technology: row.technology ?? [],
    gender: row.gender ?? null,
    season: row.season ?? null,
    badges,
    faq: row.faq ?? [],
  };
}

/** Stock disponible para una combinación color/talla concreta. */
export function variantStock(p: EquipmentProduct, color: string | null, size: string | null): number {
  if (!p.variants.length) return p.stock;
  return p.variants
    .filter((v) => (color == null || v.color === color) && (size == null || v.size === size))
    .reduce((s, v) => s + v.stock, 0);
}

export function findVariant(p: EquipmentProduct, color: string | null, size: string | null): ProductVariant | undefined {
  return p.variants.find((v) => (v.color ?? null) === color && (v.size ?? null) === size);
}
