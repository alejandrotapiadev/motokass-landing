/**
 * Valoración del pedido en servidor (funciones puras, testeables).
 *
 * Entrada: lo que pide el cliente + filas reales de Supabase.
 * Salida: líneas con precio real y problemas por línea. Todos los importes
 * se manejan en céntimos para evitar errores de redondeo.
 */
import type { CheckoutItemInput } from "./checkout-schema";
import { type DeliveryMethod, type StoreConfig, getDeliveryOptions } from "./store-config";

export interface CatalogVariantRow {
  id: string;
  sku: string;
  color: string | null;
  size: string | null;
  stock: number;
  price: number | string | null;
}

export interface CatalogProductRow {
  id: string;
  name: string;
  brand: string;
  sku: string | null;
  price: number | string;
  stock: number;
  active: boolean;
  images: string[] | null;
  variants: CatalogVariantRow[];
}

export interface PricedLine {
  productId: string;
  variantId: string | null;
  sku: string | null;
  name: string;
  brand: string;
  color: string | null;
  size: string | null;
  image: string | null;
  quantity: number;
  /** Precio unitario en euros tal como está en la base de datos (NUMERIC). */
  unitPrice: number;
  unitAmountCents: number;
  lineTotalCents: number;
  available: number;
}

export type LineIssueCode = "unavailable" | "variant_unavailable" | "out_of_stock" | "insufficient_stock";

export interface LineIssue {
  index: number;
  productId: string;
  sku: string | null;
  code: LineIssueCode;
  available: number;
  message: string;
}

export interface PricingResult {
  lines: PricedLine[];
  issues: LineIssue[];
}

export interface CheckoutTotals {
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  /** IVA desglosado; null si el tipo no está configurado. */
  taxCents: number | null;
  totalCents: number;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (v: string) => UUID_RE.test(v);
export const toCents = (euros: number | string) => Math.round(Number(euros) * 100);
export const fromCents = (cents: number) => Math.round(cents) / 100;

const ISSUE_MESSAGES: Record<LineIssueCode, (available: number) => string> = {
  unavailable: () => "Este producto ya no está disponible.",
  variant_unavailable: () => "La talla o el color elegido ya no está disponible.",
  out_of_stock: () => "Este producto está agotado.",
  insufficient_stock: (n) => `La cantidad solicitada supera el stock disponible (quedan ${n}).`,
};

/** Agrupa líneas repetidas de la misma variante sumando cantidades. */
export function mergeItems(items: CheckoutItemInput[]): CheckoutItemInput[] {
  const map = new Map<string, CheckoutItemInput>();
  for (const it of items) {
    const key = [it.productId, it.sku ?? "", it.color ?? "", it.size ?? ""].join("|");
    const prev = map.get(key);
    map.set(key, prev ? { ...prev, quantity: prev.quantity + it.quantity } : { ...it });
  }
  return [...map.values()];
}

function resolveVariant(product: CatalogProductRow, item: CheckoutItemInput): CatalogVariantRow | null | undefined {
  if (!product.variants.length) return null; // producto sin variantes
  const bySku = item.sku ? product.variants.find((v) => v.sku === item.sku) : undefined;
  if (bySku) return bySku;
  return product.variants.find((v) => (v.color ?? null) === item.color && (v.size ?? null) === item.size);
}

export function priceItems(items: CheckoutItemInput[], rows: CatalogProductRow[], config: StoreConfig): PricingResult {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const lines: PricedLine[] = [];
  const issues: LineIssue[] = [];

  mergeItems(items).forEach((item, index) => {
    const issue = (code: LineIssueCode, available = 0) =>
      issues.push({ index, productId: item.productId, sku: item.sku, code, available, message: ISSUE_MESSAGES[code](available) });

    const product = isUuid(item.productId) ? byId.get(item.productId) : undefined;
    if (!product || !product.active) return issue("unavailable");

    const variant = resolveVariant(product, item);
    if (variant === undefined) return issue("variant_unavailable");

    const available = Math.max(0, variant ? variant.stock : product.stock);
    if (available <= 0) return issue("out_of_stock");
    if (item.quantity > available) return issue("insufficient_stock", available);
    if (item.quantity > config.maxQuantityPerLine) return issue("insufficient_stock", config.maxQuantityPerLine);

    const unitPrice = Number(variant?.price ?? product.price);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) return issue("unavailable");
    const unitAmountCents = toCents(unitPrice);

    lines.push({
      productId: product.id,
      variantId: variant?.id ?? null,
      sku: variant?.sku ?? product.sku,
      name: product.name,
      brand: product.brand,
      color: variant?.color ?? null,
      size: variant?.size ?? null,
      image: product.images?.[0] ?? null,
      quantity: item.quantity,
      unitPrice,
      unitAmountCents,
      lineTotalCents: unitAmountCents * item.quantity,
      available,
    });
  });

  return { lines, issues };
}

/** Coste de entrega en céntimos, o null si el método no está disponible. */
export function shippingCentsFor(method: DeliveryMethod, subtotalCents: number, config: StoreConfig): number | null {
  const option = getDeliveryOptions(config).find((o) => o.id === method);
  if (!option) return null;
  if (option.freeFrom != null && subtotalCents >= toCents(option.freeFrom)) return 0;
  return toCents(option.price);
}

/** Misma fórmula que create_checkout_order() en SQL (se comparan al crear el pedido). */
export function computeCheckoutTotals(lines: PricedLine[], shippingCents: number, config: StoreConfig): CheckoutTotals {
  const subtotalCents = lines.reduce((s, l) => s + l.lineTotalCents, 0);
  const discountCents = 0; // códigos promocionales: sin configurar (STORE_CONFIG.promoCodesEnabled)
  const base = subtotalCents - discountCents + shippingCents;
  const { rate, pricesIncludeTax } = config.tax;

  if (pricesIncludeTax) {
    const taxCents = rate == null ? null : Math.round(base - base / (1 + rate));
    return { subtotalCents, shippingCents, discountCents, taxCents, totalCents: base };
  }
  const taxCents = rate == null ? null : Math.round(base * rate);
  return { subtotalCents, shippingCents, discountCents, taxCents, totalCents: base + (taxCents ?? 0) };
}
