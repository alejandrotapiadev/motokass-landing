/**
 * Webhook de Stripe: única fuente de verdad del estado de pago.
 *
 * 1. Verifica la firma (STRIPE_WEBHOOK_SECRET) sobre el cuerpo RAW.
 * 2. Registra el evento (stripe_webhook_events): si ya se procesó → 200.
 * 3. Aplica el cambio con funciones SQL idempotentes (transiciones con
 *    bloqueo de fila; el stock nunca se descuenta dos veces).
 * 4. Envía emails (reclamados en BD: nunca duplicados).
 * 5. Si algo falla → 500 y Stripe reintenta; el evento queda sin procesar.
 */
import type Stripe from "stripe";
import { DbError, type OrdersRepo } from "./orders-repo";
import { idOf } from "./stripe-checkout";

export interface WebhookDeps {
  repo: OrdersRepo;
  /** Verifica la firma y construye el evento; lanza si no es válida. */
  verify: (rawBody: string, signature: string) => Promise<Stripe.Event>;
  /** Emails de pedido pagado (idempotente). */
  notifyPaid: (orderId: string) => Promise<unknown>;
}

export interface WebhookResponse {
  status: number;
  body: Record<string, unknown>;
}

function orderIdFromSession(s: Stripe.Checkout.Session): string | null {
  return s.metadata?.order_id || s.client_reference_id || null;
}

async function confirmAndNotify(s: Stripe.Checkout.Session, deps: WebhookDeps) {
  const orderId = orderIdFromSession(s);
  if (!orderId) return "ignored";
  try {
    await deps.repo.confirmPayment({
      orderId,
      sessionId: s.id,
      paymentIntentId: idOf(s.payment_intent),
      amountTotalCents: s.amount_total,
      currency: s.currency,
    });
  } catch (err) {
    // Pedido de otro entorno/BD: reintentar no lo arreglaría.
    if (err instanceof DbError && (err.message === "order_not_found" || /invalid input syntax for type uuid/.test(err.message))) {
      console.warn("[stripe-webhook] pedido desconocido en sesión", s.id);
      return "unknown_order";
    }
    throw err;
  }
  // Siempre (no solo si changed): reintenta emails de un intento anterior fallido.
  await deps.notifyPaid(orderId);
  return "paid";
}

export async function handleStripeEvent(event: Stripe.Event, deps: WebhookDeps): Promise<string> {
  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object;
      if (s.payment_status === "paid" || s.payment_status === "no_payment_required") {
        return confirmAndNotify(s, deps);
      }
      // Método asíncrono (p.ej. SEPA): el resultado llegará en async_payment_*
      const orderId = orderIdFromSession(s);
      if (!orderId) return "ignored";
      await deps.repo.markAwaitingPayment(orderId, s.id, idOf(s.payment_intent));
      return "awaiting_payment";
    }

    case "checkout.session.async_payment_succeeded":
      return confirmAndNotify(event.data.object, deps);

    case "checkout.session.async_payment_failed": {
      const orderId = orderIdFromSession(event.data.object);
      if (!orderId) return "ignored";
      await deps.repo.cancelPendingOrder(orderId, "async_payment_failed", true);
      return "payment_failed";
    }

    case "checkout.session.expired": {
      const orderId = orderIdFromSession(event.data.object);
      if (!orderId) return "ignored";
      await deps.repo.cancelPendingOrder(orderId, "session_expired");
      return "expired";
    }

    case "payment_intent.payment_failed": {
      // Con Checkout el cliente puede reintentar en la misma sesión: no se
      // cancela el pedido (lo hará session.expired). Solo se deja constancia.
      const pi = event.data.object;
      const orderId = pi.metadata?.order_id;
      if (!orderId) return "ignored";
      await deps.repo.logEvent(orderId, "payment_attempt_failed", {
        code: pi.last_payment_error?.code ?? null,
        decline_code: pi.last_payment_error?.decline_code ?? null,
      });
      return "attempt_failed";
    }

    case "charge.refunded": {
      const charge = event.data.object;
      const pi = idOf(charge.payment_intent);
      if (!pi) return "ignored";
      const r = await deps.repo.recordRefund(pi, charge.amount_refunded);
      return r.found ? (r.full ? "refunded" : "partially_refunded") : "ignored";
    }

    default:
      return "ignored";
  }
}

export async function processStripeWebhook(rawBody: string, signature: string | null, deps: WebhookDeps): Promise<WebhookResponse> {
  if (!signature) return { status: 400, body: { error: "missing_signature" } };

  let event: Stripe.Event;
  try {
    event = await deps.verify(rawBody, signature);
  } catch {
    return { status: 400, body: { error: "invalid_signature" } };
  }

  if ((await deps.repo.registerStripeEvent(event.id, event.type, event.livemode)) === "duplicate") {
    return { status: 200, body: { received: true, duplicate: true } };
  }

  try {
    const result = await handleStripeEvent(event, deps);
    await deps.repo.completeStripeEvent(event.id);
    return { status: 200, body: { received: true, result } };
  } catch (err) {
    const message = (err as Error)?.message ?? "error";
    await deps.repo.completeStripeEvent(event.id, message).catch(() => undefined);
    // Sin payload ni datos personales en el log.
    console.error("[stripe-webhook]", event.type, event.id, message);
    return { status: 500, body: { error: "processing_failed" } };
  }
}
