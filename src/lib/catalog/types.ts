/**
 * Modelo de dominio común.
 *
 *   Product
 *   ├── MotorcycleProduct  (catálogo Rieju/Sherco, JSON en src/resources)
 *   └── EquipmentProduct   (tienda online, tabla equipment_products en Supabase)
 *
 * Ambos comparten los campos de BaseProduct para que búsqueda, ofertas y
 * analytics puedan tratarlos de forma uniforme.
 */

export type ProductKind = "motorcycle" | "equipment";

export type Availability = "in_stock" | "low_stock" | "out_of_stock" | "on_request";

export interface BaseProduct {
  kind: ProductKind;
  id: string;
  slug: string;
  /** Ruta canónica de la ficha. */
  url: string;
  brand: string;
  name: string;
  /** Precio actual en euros; null = "Consultar precio". */
  price: number | null;
  /** Precio anterior (tachado). Solo si existe una rebaja real. */
  compareAtPrice: number | null;
  images: string[];
  availability: Availability;
  tags: string[];
}

/* ───────────────────────── Motos ───────────────────────── */

export type MotoSegment = "enduro" | "trail" | "carretera" | "ciudad" | "trial" | "electricas";

export interface MotorcycleSpecs {
  cilindrada_cc?: number | null;
  tipo_motor?: string | null;
  potencia_cv?: number | null;
  potencia_kw?: number | null;
  peso_kg?: number | null;
  [key: string]: string | number | boolean | null | undefined;
}

export interface MotorcycleProduct extends BaseProduct {
  kind: "motorcycle";
  /** Categoría original del fabricante (Off-Road, Travel, Enduro…). */
  category: string | null;
  subcategory: string | null;
  /** Segmentos comerciales de MOTOKASS (una moto puede estar en varios). */
  segments: MotoSegment[];
  year: number | null;
  isNew: boolean;
  specs: MotorcycleSpecs;
  manufacturerUrl: string | null;
}

/* ─────────────────────── Equipamiento ─────────────────────── */

export interface ProductColor {
  name: string;
  /** Color CSS para el swatch. */
  hex?: string | null;
  /** Imágenes específicas de ese color (opcional). */
  images?: string[];
}

export interface ProductVariant {
  sku: string;
  color: string | null;
  size: string | null;
  stock: number;
  /** Sobrescribe el precio del producto si esta variante cuesta distinto. */
  price?: number | null;
  ean?: string | null;
}

export type EquipmentBadge = "new" | "sale" | "bestseller";

export interface FaqItem {
  q: string;
  a: string;
}

export interface EquipmentProduct extends BaseProduct {
  kind: "equipment";
  sku: string | null;
  ean: string | null;
  /** slug de EquipmentCategory (cascos, guantes…). */
  category: string;
  subcategory: string | null;
  /** Tipo filtrable dentro de la categoría (integral, modular, jet…). */
  type: string | null;
  description: string;
  colors: ProductColor[];
  sizes: string[];
  variants: ProductVariant[];
  /** Stock total (suma de variantes si las hay). */
  stock: number;
  rating: number | null;
  reviewCount: number;
  features: string[];
  materials: string[];
  technology: string[];
  gender: "hombre" | "mujer" | "unisex" | "infantil" | null;
  season: "verano" | "invierno" | "entretiempo" | "todo-el-ano" | null;
  badges: EquipmentBadge[];
  faq: FaqItem[];
  /** true solo en datos mock de desarrollo. Nunca debe llegar a producción. */
  isMock?: boolean;
}

/** Reseña de un cliente sobre un producto (ver equipment-reviews.ts). */
export interface ProductReview {
  id: string;
  /** Nombre público del autor. */
  author: string;
  /** Puntuación de 1 a 5. */
  rating: number;
  title?: string | null;
  body: string;
  /** Fecha ISO (YYYY-MM-DD). */
  date: string;
}

export type Product = MotorcycleProduct | EquipmentProduct;

/* ─────────────────────── Utilidades ─────────────────────── */

export function discountPercent(p: Pick<BaseProduct, "price" | "compareAtPrice">): number | null {
  if (p.price == null || p.compareAtPrice == null || p.compareAtPrice <= p.price) return null;
  return Math.round((1 - p.price / p.compareAtPrice) * 100);
}

export function isOnSale(p: Pick<BaseProduct, "price" | "compareAtPrice">): boolean {
  return discountPercent(p) !== null;
}

// useGrouping "always": en es-ES los números de 4 cifras no llevan punto por defecto (9149 €)
const eur = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  useGrouping: "always" as any,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const eurRound = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  useGrouping: "always" as any,
  maximumFractionDigits: 0,
});

/** 129,90 € — para equipamiento. */
export function formatPrice(value: number): string {
  return eur.format(value);
}

/** 10.299 € — para motos (sin céntimos). */
export function formatPriceRound(value: number): string {
  return eurRound.format(value);
}

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  in_stock: "En stock",
  low_stock: "Últimas unidades",
  out_of_stock: "Sin stock",
  on_request: "Bajo pedido",
};

export const AVAILABILITY_SCHEMA: Record<Availability, string> = {
  in_stock: "https://schema.org/InStock",
  low_stock: "https://schema.org/LimitedAvailability",
  out_of_stock: "https://schema.org/OutOfStock",
  on_request: "https://schema.org/PreOrder",
};
