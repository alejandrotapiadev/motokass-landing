/**
 * Acceso a pedidos (solo servidor).
 *
 * Todo pasa por funciones SQL (supabase/migrations/20260929_orders.sql):
 * así las reglas críticas (reserva de stock, transiciones, idempotencia) se
 * ejecutan dentro de PostgreSQL de forma atómica, y este módulo se puede
 * probar contra un Postgres real (PGlite) inyectando otro RpcCaller.
 */
import type { CatalogProductRow } from "./pricing";
import type { DeliveryMethod } from "./store-config";

export class DbError extends Error {
  constructor(message: string, readonly details: string | null = null) {
    super(message);
    this.name = "DbError";
  }
}

/** Llama a una función SQL con argumentos por nombre. Lanza DbError si falla. */
export type RpcCaller = (fn: string, args: Record<string, unknown>) => Promise<unknown>;

interface SupabaseLike {
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: { message: string; details?: string | null } | null }>;
}

export function supabaseRpc(client: SupabaseLike): RpcCaller {
  return async (fn, args) => {
    const { data, error } = await client.rpc(fn, args);
    if (error) throw new DbError(error.message, error.details ?? null);
    return data;
  };
}

/* ─────────────── Tipos ─────────────── */

export type OrderStatus = "pending" | "paid" | "completed" | "cancelled" | "refunded";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "partially_refunded";
export type FulfillmentStatus = "unfulfilled" | "preparing" | "shipped" | "ready_for_pickup" | "delivered";

export interface ShippingAddress {
  line1: string;
  line2?: string;
  city: string;
  postalCode: string;
  province: string;
  country: string;
}

export interface OrderItemRecord {
  productId: string | null;
  variantId: string | null;
  sku: string | null;
  name: string;
  brand: string;
  variantName: string | null;
  color: string | null;
  size: string | null;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface OrderRecord {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  accessTokenHash: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string | null;
  deliveryMethod: DeliveryMethod;
  shippingAddress: ShippingAddress | null;
  notes: string | null;
  currency: string;
  subtotal: number;
  shippingAmount: number;
  discountAmount: number;
  taxAmount: number | null;
  pricesIncludeTax: boolean;
  total: number;
  amountRefunded: number;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  stockReserved: boolean;
  reservedUntil: string | null;
  requiresAttention: boolean;
  attentionReason: string | null;
  paidAt: string | null;
  createdAt: string;
  items: OrderItemRecord[];
}

export interface NewOrderInput {
  idempotencyKey: string;
  accessTokenHash: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string | null;
  deliveryMethod: DeliveryMethod;
  shippingAddress: ShippingAddress | null;
  notes: string | null;
  currency: string;
  shippingAmount: number;
  discountAmount: number;
  taxRate: number | null;
  pricesIncludeTax: boolean;
  reservationMinutes: number;
}

export interface NewOrderItem {
  productId: string;
  variantId: string | null;
  quantity: number;
  expectedUnitPrice: number;
}

export interface CreatedOrder {
  orderId: string;
  orderNumber: string;
  existing: boolean;
  status: OrderStatus;
  total: number;
  stripeCheckoutUrl: string | null;
}

export type EmailKind = "customer" | "store";

/* ─────────────── Mapeo ─────────────── */

type Json = Record<string, any>;
const num = (v: unknown) => (v == null ? 0 : Number(v));
const numOrNull = (v: unknown) => (v == null ? null : Number(v));

function mapAddress(a: Json | null): ShippingAddress | null {
  if (!a) return null;
  return {
    line1: a.line1,
    line2: a.line2 ?? undefined,
    city: a.city,
    postalCode: a.postal_code,
    province: a.province,
    country: a.country,
  };
}

export function mapOrder(o: Json): OrderRecord {
  return {
    id: o.id,
    orderNumber: o.order_number,
    status: o.status,
    paymentStatus: o.payment_status,
    fulfillmentStatus: o.fulfillment_status,
    accessTokenHash: o.access_token_hash,
    customerEmail: o.customer_email,
    customerName: o.customer_name,
    customerPhone: o.customer_phone ?? null,
    deliveryMethod: o.delivery_method,
    shippingAddress: mapAddress(o.shipping_address),
    notes: o.notes ?? null,
    currency: o.currency,
    subtotal: num(o.subtotal),
    shippingAmount: num(o.shipping_amount),
    discountAmount: num(o.discount_amount),
    taxAmount: numOrNull(o.tax_amount),
    pricesIncludeTax: Boolean(o.prices_include_tax),
    total: num(o.total),
    amountRefunded: num(o.amount_refunded),
    stripeCheckoutSessionId: o.stripe_checkout_session_id ?? null,
    stripePaymentIntentId: o.stripe_payment_intent_id ?? null,
    stockReserved: Boolean(o.stock_reserved),
    reservedUntil: o.reserved_until ?? null,
    requiresAttention: Boolean(o.requires_attention),
    attentionReason: o.attention_reason ?? null,
    paidAt: o.paid_at ?? null,
    createdAt: o.created_at,
    items: ((o.items ?? []) as Json[]).map((i) => ({
      productId: i.product_id ?? null,
      variantId: i.variant_id ?? null,
      sku: i.sku ?? null,
      name: i.product_name_snapshot,
      brand: i.brand_snapshot,
      variantName: i.variant_name_snapshot ?? null,
      color: i.color ?? null,
      size: i.size ?? null,
      imageUrl: i.image_url ?? null,
      quantity: Number(i.quantity),
      unitPrice: num(i.unit_price),
      subtotal: num(i.subtotal),
    })),
  };
}

function toDbAddress(a: ShippingAddress | null) {
  if (!a) return null;
  return { line1: a.line1, line2: a.line2 ?? null, city: a.city, postal_code: a.postalCode, province: a.province, country: a.country };
}

/* ─────────────── Repositorio ─────────────── */

export function createOrdersRepo(rpc: RpcCaller) {
  return {
    async getCatalog(productIds: string[]): Promise<CatalogProductRow[]> {
      if (!productIds.length) return [];
      const data = (await rpc("get_checkout_catalog", { p_product_ids: productIds })) as Json[] | null;
      return (data ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        sku: p.sku ?? null,
        price: p.price,
        stock: Number(p.stock ?? 0),
        active: Boolean(p.active),
        images: p.images ?? [],
        variants: ((p.variants ?? []) as Json[]).map((v) => ({
          id: v.id,
          sku: v.sku,
          color: v.color ?? null,
          size: v.size ?? null,
          stock: Number(v.stock ?? 0),
          price: v.price ?? null,
        })),
      }));
    },

    async createOrder(order: NewOrderInput, items: NewOrderItem[]): Promise<CreatedOrder> {
      const r = (await rpc("create_checkout_order", {
        p_order: {
          idempotency_key: order.idempotencyKey,
          access_token_hash: order.accessTokenHash,
          customer_email: order.customerEmail,
          customer_name: order.customerName,
          customer_phone: order.customerPhone,
          delivery_method: order.deliveryMethod,
          shipping_address: toDbAddress(order.shippingAddress),
          notes: order.notes,
          currency: order.currency,
          shipping_amount: order.shippingAmount,
          discount_amount: order.discountAmount,
          tax_rate: order.taxRate,
          prices_include_tax: order.pricesIncludeTax,
          reservation_minutes: order.reservationMinutes,
        },
        p_items: items.map((i) => ({
          product_id: i.productId,
          variant_id: i.variantId,
          quantity: i.quantity,
          expected_unit_price: i.expectedUnitPrice,
        })),
      })) as Json;
      return {
        orderId: r.order_id,
        orderNumber: r.order_number,
        existing: Boolean(r.existing),
        status: r.status,
        total: num(r.total),
        stripeCheckoutUrl: r.stripe_checkout_url ?? null,
      };
    },

    async attachSession(orderId: string, sessionId: string, url: string | null): Promise<boolean> {
      return Boolean(await rpc("attach_checkout_session", { p_order_id: orderId, p_session_id: sessionId, p_url: url }));
    },

    async confirmPayment(p: {
      orderId: string;
      sessionId: string | null;
      paymentIntentId: string | null;
      amountTotalCents: number | null;
      currency: string | null;
    }): Promise<{ changed: boolean; requiresAttention: boolean }> {
      const r = (await rpc("confirm_order_payment", {
        p_order_id: p.orderId,
        p_session_id: p.sessionId,
        p_payment_intent_id: p.paymentIntentId,
        p_amount_total_cents: p.amountTotalCents,
        p_currency: p.currency,
      })) as Json;
      return { changed: Boolean(r.changed), requiresAttention: Boolean(r.requires_attention) };
    },

    async markAwaitingPayment(orderId: string, sessionId: string | null, paymentIntentId: string | null): Promise<boolean> {
      return Boolean(
        await rpc("mark_order_awaiting_payment", { p_order_id: orderId, p_session_id: sessionId, p_payment_intent_id: paymentIntentId }),
      );
    },

    async cancelPendingOrder(orderId: string, reason: string, paymentFailed = false): Promise<boolean> {
      return Boolean(await rpc("cancel_pending_order", { p_order_id: orderId, p_reason: reason, p_payment_failed: paymentFailed }));
    },

    async releaseExpiredReservations(graceMinutes = 10): Promise<number> {
      return Number(await rpc("release_expired_reservations", { p_grace_minutes: graceMinutes }));
    },

    async recordRefund(paymentIntentId: string, amountRefundedCents: number): Promise<{ found: boolean; changed: boolean; orderId: string | null; full: boolean }> {
      const r = (await rpc("record_order_refund", { p_payment_intent_id: paymentIntentId, p_amount_refunded_cents: amountRefundedCents })) as Json;
      return { found: Boolean(r.found), changed: Boolean(r.changed), orderId: r.order_id ?? null, full: Boolean(r.full) };
    },

    async claimEmail(orderId: string, kind: EmailKind): Promise<boolean> {
      return Boolean(await rpc("claim_order_email", { p_order_id: orderId, p_kind: kind }));
    },

    async releaseEmailClaim(orderId: string, kind: EmailKind): Promise<void> {
      await rpc("release_order_email_claim", { p_order_id: orderId, p_kind: kind });
    },

    async registerStripeEvent(id: string, type: string, livemode: boolean): Promise<"process" | "duplicate"> {
      return (await rpc("register_stripe_event", { p_id: id, p_type: type, p_livemode: livemode })) === "duplicate" ? "duplicate" : "process";
    },

    async completeStripeEvent(id: string, error: string | null = null): Promise<void> {
      await rpc("complete_stripe_event", { p_id: id, p_error: error });
    },

    async getOrder(orderId: string): Promise<OrderRecord | null> {
      const data = (await rpc("get_order_details", { p_order_id: orderId })) as Json | null;
      return data ? mapOrder(data) : null;
    },

    async logEvent(orderId: string, type: string, data: Record<string, unknown> = {}): Promise<void> {
      await rpc("log_order_event", { p_order_id: orderId, p_type: type, p_data: data });
    },
  };
}

export type OrdersRepo = ReturnType<typeof createOrdersRepo>;
