/**
 * Stripe Checkout (alojado por Stripe): construcción de la sesión y
 * adaptador mínimo del SDK. Los datos de tarjeta nunca pasan por nuestro
 * servidor.
 */
import type Stripe from "stripe";
import type { CheckoutTotals, PricedLine } from "./pricing";

export interface SessionInput {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  currency: string;
  lines: PricedLine[];
  totals: CheckoutTotals;
  pricesIncludeTax: boolean;
  deliveryLabel: string;
  successUrl: string;
  cancelUrl: string;
  /** Unix (s). Stripe exige entre 30 min y 24 h desde la creación. */
  expiresAt: number;
  siteUrl: string;
}

/** Stripe solo acepta imágenes públicas por https. */
function imagesFor(src: string | null, siteUrl: string): { images?: string[] } {
  if (!src) return {};
  try {
    const url = new URL(src, siteUrl);
    return url.protocol === "https:" ? { images: [url.toString()] } : {};
  } catch {
    return {};
  }
}

export function buildCheckoutSessionParams(i: SessionInput): Stripe.Checkout.SessionCreateParams {
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = i.lines.map((l) => ({
    quantity: l.quantity,
    price_data: {
      currency: i.currency,
      unit_amount: l.unitAmountCents,
      product_data: {
        name: `${l.brand} ${l.name}`.slice(0, 250),
        ...(l.color || l.size ? { description: [l.color, l.size && `Talla ${l.size}`].filter(Boolean).join(" · ") } : {}),
        ...imagesFor(l.image, i.siteUrl),
        metadata: { product_id: l.productId, variant_id: l.variantId ?? "", sku: l.sku ?? "" },
      },
    },
  }));

  if (!i.pricesIncludeTax && i.totals.taxCents) {
    lineItems.push({
      quantity: 1,
      price_data: { currency: i.currency, unit_amount: i.totals.taxCents, product_data: { name: "IVA" } },
    });
  }

  const charged =
    lineItems.reduce((s, li) => s + (li.price_data?.unit_amount ?? 0) * (li.quantity ?? 1), 0) + i.totals.shippingCents;
  if (charged !== i.totals.totalCents) {
    throw new Error(`stripe_amount_mismatch: ${charged} != ${i.totals.totalCents}`);
  }

  const metadata = { order_id: i.orderId, order_number: i.orderNumber };

  return {
    mode: "payment",
    locale: "es",
    customer_email: i.customerEmail,
    client_reference_id: i.orderId,
    metadata,
    payment_intent_data: { metadata, description: `Pedido ${i.orderNumber}` },
    line_items: lineItems,
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          display_name: i.deliveryLabel,
          fixed_amount: { amount: i.totals.shippingCents, currency: i.currency },
        },
      },
    ],
    success_url: i.successUrl,
    cancel_url: i.cancelUrl,
    expires_at: i.expiresAt,
  };
}

/* ─────────────── Adaptador del SDK ─────────────── */

export interface PaymentGateway {
  createCheckoutSession(params: Stripe.Checkout.SessionCreateParams, idempotencyKey: string): Promise<{ id: string; url: string | null }>;
  /** Expira una sesión abierta. 'expired' si ya no se puede pagar; 'not_open' si se completó. */
  expireCheckoutSession(sessionId: string): Promise<"expired" | "not_open">;
}

export function stripeGateway(stripe: Stripe): PaymentGateway {
  return {
    async createCheckoutSession(params, idempotencyKey) {
      const s = await stripe.checkout.sessions.create(params, { idempotencyKey });
      return { id: s.id, url: s.url };
    },
    async expireCheckoutSession(sessionId) {
      const s = await stripe.checkout.sessions.retrieve(sessionId);
      if (s.status === "expired") return "expired";
      if (s.status !== "open") return "not_open";
      await stripe.checkout.sessions.expire(sessionId);
      return "expired";
    },
  };
}

/** payment_intent puede venir como id o como objeto expandido. */
export function idOf(ref: string | { id: string } | null | undefined): string | null {
  if (!ref) return null;
  return typeof ref === "string" ? ref : ref.id;
}
