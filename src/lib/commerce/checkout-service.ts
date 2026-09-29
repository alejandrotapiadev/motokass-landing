/**
 * Orquestación del checkout online (solo servidor). Dependencias inyectadas
 * para poder probarlo sin red: repositorio de pedidos + pasarela de pago.
 *
 *   quoteCheckout   → valora el carrito con datos reales (sin escribir nada)
 *   startCheckout   → crea pedido pendiente + reserva stock + sesión Stripe
 *   cancelCheckout  → el cliente vuelve de Stripe sin pagar: libera stock
 *   getPublicOrder  → estado del pedido para la página de éxito (con token)
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { CheckoutRequest, CheckoutItemInput } from "./checkout-schema";
import { DbError, type OrderRecord, type OrdersRepo } from "./orders-repo";
import {
  type LineIssue,
  computeCheckoutTotals,
  fromCents,
  isUuid,
  mergeItems,
  priceItems,
  shippingCentsFor,
  toCents,
} from "./pricing";
import { type DeliveryMethod, type StoreConfig, getDeliveryOptions, isOnlineCheckoutConfigured } from "./store-config";
import { type PaymentGateway, buildCheckoutSessionParams } from "./stripe-checkout";

export interface CheckoutDeps {
  repo: OrdersRepo;
  gateway: PaymentGateway;
  config: StoreConfig;
  siteUrl: string;
  now?: () => number;
}

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; issues?: LineIssue[]; fields?: Record<string, string> };

export const MESSAGES = {
  unavailable: "El pago online no está disponible en este momento. Puedes hacer tu pedido por WhatsApp.",
  cartChanged: "Revisa tu carrito: algunos productos han cambiado.",
  outOfStock: "La cantidad solicitada supera el stock disponible.",
  productUnavailable: "Este producto ya no está disponible.",
  priceChanged: "El precio de algún producto ha cambiado. Revisa tu carrito.",
  paymentStart: "No hemos podido iniciar el pago. Inténtalo de nuevo.",
  notFound: "No encontramos este pedido.",
  country: "Por ahora no enviamos a este país.",
  delivery: "Elige un método de entrega disponible.",
} as const;

const fail = (status: number, error: string, extra: Partial<Extract<ServiceResult<never>, { ok: false }>> = {}) =>
  ({ ok: false, status, error, ...extra }) as const;

/* ─────────────── Token de acceso al pedido ─────────────── */

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function tokenMatches(token: string, hash: string): boolean {
  const a = Buffer.from(hashToken(token), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/* ─────────────── Valoración ─────────────── */

async function loadPricing(items: CheckoutItemInput[], deps: Pick<CheckoutDeps, "repo" | "config">) {
  const ids = [...new Set(mergeItems(items).map((i) => i.productId).filter(isUuid))];
  const rows = await deps.repo.getCatalog(ids);
  return priceItems(items, rows, deps.config);
}

export interface QuoteLine {
  productId: string;
  sku: string | null;
  name: string;
  brand: string;
  color: string | null;
  size: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  available: number;
}

export interface Quote {
  lines: QuoteLine[];
  issues: LineIssue[];
  subtotal: number;
  shipping: number | null;
  taxAmount: number | null;
  total: number;
}

export async function quoteCheckout(
  input: { items: CheckoutItemInput[]; deliveryMethod?: DeliveryMethod | null },
  deps: Pick<CheckoutDeps, "repo" | "config">,
): Promise<Quote> {
  const { lines, issues } = await loadPricing(input.items, deps);
  const subtotalCents = lines.reduce((s, l) => s + l.lineTotalCents, 0);
  const shippingCents = input.deliveryMethod ? shippingCentsFor(input.deliveryMethod, subtotalCents, deps.config) : null;
  const totals = computeCheckoutTotals(lines, shippingCents ?? 0, deps.config);
  return {
    lines: lines.map((l) => ({
      productId: l.productId,
      sku: l.sku,
      name: l.name,
      brand: l.brand,
      color: l.color,
      size: l.size,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      lineTotal: fromCents(l.lineTotalCents),
      available: l.available,
    })),
    issues,
    subtotal: fromCents(totals.subtotalCents),
    shipping: shippingCents == null ? null : fromCents(shippingCents),
    taxAmount: totals.taxCents == null ? null : fromCents(totals.taxCents),
    total: fromCents(totals.totalCents),
  };
}

/* ─────────────── Inicio del pago ─────────────── */

function mapDbError(err: unknown) {
  if (!(err instanceof DbError)) return null;
  switch (err.message) {
    case "out_of_stock":
      return fail(409, MESSAGES.outOfStock);
    case "product_unavailable":
    case "variant_required":
    case "variant_mismatch":
      return fail(409, MESSAGES.productUnavailable);
    case "price_changed":
      return fail(409, MESSAGES.priceChanged);
    default:
      return null;
  }
}

export interface StartedCheckout {
  url: string;
  orderNumber: string;
  orderId: string;
  /** Token de acceso a success/cancel; null si es un reintento idempotente. */
  accessToken: string | null;
  total: number;
}

export async function startCheckout(
  req: CheckoutRequest,
  deps: CheckoutDeps,
): Promise<ServiceResult<StartedCheckout>> {
  const { repo, gateway, config } = deps;
  if (!isOnlineCheckoutConfigured(config)) return fail(503, MESSAGES.unavailable);

  const option = getDeliveryOptions(config).find((o) => o.id === req.deliveryMethod);
  if (!option) return fail(400, MESSAGES.delivery, { fields: { deliveryMethod: MESSAGES.delivery } });
  const address = req.deliveryMethod === "shipping" ? req.address ?? null : null;
  if (address && !option.countries.includes(address.country)) {
    return fail(400, MESSAGES.country, { fields: { "address.country": MESSAGES.country } });
  }

  // Limpieza oportunista de reservas vencidas (no bloquea el checkout).
  await repo.releaseExpiredReservations().catch(() => 0);

  const { lines, issues } = await loadPricing(req.items, deps);
  if (issues.length) return fail(409, MESSAGES.cartChanged, { issues });
  if (!lines.length) return fail(400, MESSAGES.cartChanged);

  const subtotalCents = lines.reduce((s, l) => s + l.lineTotalCents, 0);
  const shippingCents = shippingCentsFor(req.deliveryMethod, subtotalCents, config);
  if (shippingCents == null) return fail(400, MESSAGES.delivery);
  const totals = computeCheckoutTotals(lines, shippingCents, config);

  const token = randomBytes(32).toString("hex");
  const currency = config.currency.toLowerCase();

  let created;
  try {
    created = await repo.createOrder(
      {
        idempotencyKey: req.idempotencyKey,
        accessTokenHash: hashToken(token),
        customerEmail: req.customer.email,
        customerName: req.customer.name,
        customerPhone: req.customer.phone ?? null,
        deliveryMethod: req.deliveryMethod,
        shippingAddress: address,
        notes: req.notes ?? null,
        currency,
        shippingAmount: fromCents(shippingCents),
        discountAmount: fromCents(totals.discountCents),
        taxRate: config.tax.rate,
        pricesIncludeTax: config.tax.pricesIncludeTax,
        reservationMinutes: config.checkoutReservationMinutes,
      },
      lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity, expectedUnitPrice: l.unitPrice })),
    );
  } catch (err) {
    const mapped = mapDbError(err);
    if (mapped) return mapped;
    throw err;
  }

  // Reintento de la misma petición (doble envío): se reutiliza la sesión.
  if (created.existing) {
    return created.status === "pending" && created.stripeCheckoutUrl
      ? { ok: true, data: { url: created.stripeCheckoutUrl, orderNumber: created.orderNumber, orderId: created.orderId, accessToken: null, total: created.total } }
      : fail(409, MESSAGES.paymentStart);
  }

  if (toCents(created.total) !== totals.totalCents) {
    await repo.cancelPendingOrder(created.orderId, "total_mismatch");
    throw new Error(`checkout_total_mismatch ${created.orderNumber}`);
  }

  const now = deps.now?.() ?? Date.now();
  const base = deps.siteUrl.replace(/\/$/, "");
  const access = `order=${created.orderId}&t=${token}`;

  let session;
  try {
    const params = buildCheckoutSessionParams({
      orderId: created.orderId,
      orderNumber: created.orderNumber,
      customerEmail: req.customer.email,
      currency,
      lines,
      totals,
      pricesIncludeTax: config.tax.pricesIncludeTax,
      deliveryLabel: option.label,
      successUrl: `${base}/checkout/success?${access}`,
      cancelUrl: `${base}/checkout/cancel?${access}`,
      // 1 min de margen sobre la reserva: Stripe exige ≥ 30 min
      expiresAt: Math.floor(now / 1000) + config.checkoutReservationMinutes * 60 + 60,
      siteUrl: base,
    });
    session = await gateway.createCheckoutSession(params, `checkout_${created.orderId}`);
  } catch (err) {
    await repo.cancelPendingOrder(created.orderId, "stripe_session_error").catch(() => false);
    console.error("[checkout] no se pudo crear la sesión de Stripe", created.orderNumber, (err as Error)?.message);
    return fail(502, MESSAGES.paymentStart);
  }

  if (!session.url) {
    await gateway.expireCheckoutSession(session.id).catch(() => "not_open");
    await repo.cancelPendingOrder(created.orderId, "stripe_session_without_url");
    return fail(502, MESSAGES.paymentStart);
  }

  await repo.attachSession(created.orderId, session.id, session.url);
  return { ok: true, data: { url: session.url, orderNumber: created.orderNumber, orderId: created.orderId, accessToken: token, total: fromCents(totals.totalCents) } };
}

/* ─────────────── Estado del pedido para el cliente ─────────────── */

export type PublicOrderState = "pending" | "processing" | "paid" | "failed" | "cancelled" | "refunded";

export interface PublicOrder {
  orderNumber: string;
  state: PublicOrderState;
  deliveryMethod: DeliveryMethod;
  customerName: string;
  customerEmail: string;
  shippingAddress: OrderRecord["shippingAddress"];
  items: { name: string; brand: string; variantName: string | null; quantity: number; unitPrice: number; subtotal: number; imageUrl: string | null }[];
  subtotal: number;
  shippingAmount: number;
  discountAmount: number;
  taxAmount: number | null;
  total: number;
  currency: string;
  createdAt: string;
}

export function publicState(o: OrderRecord): PublicOrderState {
  if (o.paymentStatus === "refunded") return "refunded";
  if (o.paymentStatus === "paid" || o.paymentStatus === "partially_refunded") return "paid";
  if (o.status === "cancelled") return o.paymentStatus === "failed" ? "failed" : "cancelled";
  // Pago asíncrono iniciado (reserva mantenida sin caducidad)
  if (o.stripePaymentIntentId && o.reservedUntil == null) return "processing";
  return "pending";
}

export function toPublicOrder(o: OrderRecord): PublicOrder {
  return {
    orderNumber: o.orderNumber,
    state: publicState(o),
    deliveryMethod: o.deliveryMethod,
    customerName: o.customerName,
    customerEmail: o.customerEmail,
    shippingAddress: o.shippingAddress,
    items: o.items.map((i) => ({
      name: i.name,
      brand: i.brand,
      variantName: i.variantName,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      subtotal: i.subtotal,
      imageUrl: i.imageUrl,
    })),
    subtotal: o.subtotal,
    shippingAmount: o.shippingAmount,
    discountAmount: o.discountAmount,
    taxAmount: o.taxAmount,
    total: o.total,
    currency: o.currency,
    createdAt: o.createdAt,
  };
}

async function loadAuthorized(orderId: string, token: string, repo: OrdersRepo): Promise<OrderRecord | null> {
  const order = await repo.getOrder(orderId);
  return order && tokenMatches(token, order.accessTokenHash) ? order : null;
}

export async function getPublicOrder(orderId: string, token: string, repo: OrdersRepo): Promise<ServiceResult<PublicOrder>> {
  const order = await loadAuthorized(orderId, token, repo);
  return order ? { ok: true, data: toPublicOrder(order) } : fail(404, MESSAGES.notFound);
}

export async function cancelCheckout(
  orderId: string,
  token: string,
  deps: Pick<CheckoutDeps, "repo" | "gateway">,
): Promise<ServiceResult<PublicOrder>> {
  const order = await loadAuthorized(orderId, token, deps.repo);
  if (!order) return fail(404, MESSAGES.notFound);

  if (order.status === "pending") {
    // Solo se cancela si Stripe confirma que la sesión ya no se puede pagar.
    const result = order.stripeCheckoutSessionId
      ? await deps.gateway.expireCheckoutSession(order.stripeCheckoutSessionId)
      : "expired";
    if (result === "expired") await deps.repo.cancelPendingOrder(order.id, "customer_cancelled");
  }
  const fresh = await deps.repo.getOrder(order.id);
  return { ok: true, data: toPublicOrder(fresh ?? order) };
}
