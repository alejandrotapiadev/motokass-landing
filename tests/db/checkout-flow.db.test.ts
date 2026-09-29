// @vitest-environment node
/**
 * Flujo completo contra PostgreSQL real (PGlite) con Stripe simulado:
 * /api/checkout (startCheckout) → webhook firmado → pedido → stock → emails.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb, pgliteRpc, seedProduct } from "./pglite";
import { createOrdersRepo, type OrdersRepo } from "../../src/lib/commerce/orders-repo";
import { cancelCheckout, getPublicOrder, startCheckout, type CheckoutDeps } from "../../src/lib/commerce/checkout-service";
import { checkoutRequestSchema, type CheckoutRequest } from "../../src/lib/commerce/checkout-schema";
import { STORE_CONFIG, type StoreConfig } from "../../src/lib/commerce/store-config";
import type { PaymentGateway } from "../../src/lib/commerce/stripe-checkout";
import { processStripeWebhook, type WebhookDeps } from "../../src/lib/commerce/stripe-webhook";
import { sendOrderEmails, type EmailMessage } from "../../src/lib/commerce/order-emails";

const WEBHOOK_SECRET = "whsec_test_secret";
const stripe = new Stripe("sk_test_dummy");

const CONFIG: StoreConfig = {
  ...STORE_CONFIG,
  onlinePaymentEnabled: true,
  legalTermsReviewed: true,
  shipping: { flatRate: 5, freeFrom: 100, deliveryTime: "48 h", zones: "Península", countries: ["ES"] },
  pickupInStore: true,
};

let db: PGlite;
let repo: OrdersRepo;
let gateway: PaymentGateway & { created: { params: Stripe.Checkout.SessionCreateParams; key: string }[]; expired: string[]; failNext: boolean };
let sent: EmailMessage[];
let deps: CheckoutDeps;
let webhookDeps: WebhookDeps;
let keySeq = 0;

function fakeGateway() {
  const g = {
    created: [] as { params: Stripe.Checkout.SessionCreateParams; key: string }[],
    expired: [] as string[],
    failNext: false,
    async createCheckoutSession(params: Stripe.Checkout.SessionCreateParams, key: string) {
      if (g.failNext) throw new Error("stripe down");
      g.created.push({ params, key });
      const id = `cs_test_${g.created.length}`;
      return { id, url: `https://checkout.stripe.com/c/pay/${id}` };
    },
    async expireCheckoutSession(id: string) {
      g.expired.push(id);
      return "expired" as const;
    },
  };
  return g;
}

const request = (items: CheckoutRequest["items"], over: Partial<CheckoutRequest> = {}): CheckoutRequest =>
  checkoutRequestSchema.parse({
    idempotencyKey: `idem-key-${String(++keySeq).padStart(8, "0")}`,
    items,
    customer: { name: "Ana López", email: "ana@example.com", phone: "600123123" },
    deliveryMethod: "shipping",
    address: { line1: "Calle Mayor 1", city: "Ávila", postalCode: "05001", province: "Ávila", country: "ES" },
    acceptTerms: true,
    ...over,
  });

const stockOf = async (id: string, table = "equipment_products") =>
  (await db.query<{ stock: number }>(`SELECT stock FROM ${table} WHERE id = $1`, [id])).rows[0].stock;

async function signed(event: object) {
  const payload = JSON.stringify(event);
  const header = await stripe.webhooks.generateTestHeaderStringAsync({ payload, secret: WEBHOOK_SECRET });
  return { payload, header };
}

function sessionEvent(type: string, orderId: string, over: Record<string, unknown> = {}, id = `evt_${Math.random().toString(36).slice(2)}`) {
  return {
    id,
    object: "event",
    type,
    livemode: false,
    created: Math.floor(Date.now() / 1000),
    api_version: "2026-08-26.dahlia",
    data: {
      object: {
        id: "cs_test_1",
        object: "checkout.session",
        client_reference_id: orderId,
        metadata: { order_id: orderId },
        payment_intent: "pi_test_1",
        payment_status: "paid",
        amount_total: 0,
        currency: "eur",
        ...over,
      },
    },
  };
}

beforeEach(async () => {
  db = await createTestDb();
  repo = createOrdersRepo(pgliteRpc(db));
  gateway = fakeGateway();
  sent = [];
  deps = { repo, gateway, config: CONFIG, siteUrl: "https://motokass.com", now: () => Date.UTC(2026, 8, 29, 10) };
  webhookDeps = {
    repo,
    verify: (body, sig) => stripe.webhooks.constructEventAsync(body, sig, WEBHOOK_SECRET),
    notifyPaid: (orderId) => sendOrderEmails(orderId, { repo, storeEmail: "tienda@motokass.com", send: async (m) => void sent.push(m) }),
  };
}, 60_000);

describe("startCheckout (/api/checkout)", () => {
  it("construye la sesión de Stripe con precios del servidor, ignorando precios del navegador", async () => {
    const { productId, variantIds } = await seedProduct(db, { slug: "casco", price: 120, variants: [{ sku: "K-M", size: "M", stock: 2 }] });
    // El navegador intenta colar un precio: el esquema lo descarta y el servidor usa el de BD.
    const body = request([{ productId, sku: "K-M", color: "Negro", size: "M", quantity: 1, unitPrice: 0.01 } as never]);
    expect(body.items[0]).not.toHaveProperty("unitPrice");

    const r = await startCheckout(body, deps);
    expect(r.ok).toBe(true);
    const { params, key } = gateway.created[0];
    expect(params.mode).toBe("payment");
    expect(params.line_items?.[0].price_data?.unit_amount).toBe(12000);
    expect(params.shipping_options?.[0].shipping_rate_data?.fixed_amount?.amount).toBe(0); // gratis desde 100 €
    expect(params.metadata?.order_id).toBe(r.ok && r.data.orderId);
    expect(params.customer_email).toBe("ana@example.com");
    expect(params.success_url).toMatch(/^https:\/\/motokass\.com\/checkout\/success\?order=.+&t=[a-f0-9]{64}$/);
    expect(params.expires_at).toBe(Date.UTC(2026, 8, 29, 10) / 1000 + 31 * 60);
    expect(key).toBe(`checkout_${r.ok && r.data.orderId}`);
    expect(await stockOf(variantIds["K-M"], "equipment_variants")).toBe(1);
  });

  it("producto inexistente o desactivado → error por línea, sin pedido", async () => {
    const off = await seedProduct(db, { slug: "off", price: 10, stock: 5, active: false });
    const r = await startCheckout(
      request([
        { productId: "no-existe", sku: null, color: null, size: null, quantity: 1 },
        { productId: off.productId, sku: null, color: null, size: null, quantity: 1 },
      ]),
      deps,
    );
    expect(r).toMatchObject({ ok: false, status: 409 });
    if (!r.ok) expect(r.issues?.map((i) => i.message)).toEqual(["Este producto ya no está disponible.", "Este producto ya no está disponible."]);
    expect(gateway.created).toHaveLength(0);
  });

  it("sin stock y cantidad superior al stock", async () => {
    const agotado = await seedProduct(db, { slug: "ago", price: 10, stock: 0 });
    const pocas = await seedProduct(db, { slug: "poc", price: 10, stock: 2 });
    const r = await startCheckout(
      request([
        { productId: agotado.productId, sku: null, color: null, size: null, quantity: 1 },
        { productId: pocas.productId, sku: null, color: null, size: null, quantity: 3 },
      ]),
      deps,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.issues?.map((i) => i.code)).toEqual(["out_of_stock", "insufficient_stock"]);
      expect(r.issues?.[1].message).toBe("La cantidad solicitada supera el stock disponible (quedan 2).");
    }
  });

  it("rechaza países de envío no configurados y métodos de entrega no disponibles", async () => {
    const { productId } = await seedProduct(db, { slug: "pais", price: 10, stock: 5 });
    const item = [{ productId, sku: null, color: null, size: null, quantity: 1 }];
    const fr = await startCheckout(request(item, { address: { line1: "Rue 1", city: "Paris", postalCode: "75001", province: "Paris", country: "FR" } }), deps);
    expect(fr).toMatchObject({ ok: false, status: 400, error: "Por ahora no enviamos a este país." });
    const noPickup = await startCheckout(request(item, { deliveryMethod: "pickup", address: null }), { ...deps, config: { ...CONFIG, pickupInStore: false } });
    expect(noPickup).toMatchObject({ ok: false, status: 400 });
  });

  it("no funciona si el pago online no está configurado", async () => {
    const { productId } = await seedProduct(db, { slug: "off2", price: 10, stock: 5 });
    const r = await startCheckout(request([{ productId, sku: null, color: null, size: null, quantity: 1 }]), { ...deps, config: STORE_CONFIG });
    expect(r).toMatchObject({ ok: false, status: 503 });
  });

  it("doble envío con la misma clave → misma sesión, una sola reserva", async () => {
    const { productId } = await seedProduct(db, { slug: "doble", price: 10, stock: 5 });
    const body = request([{ productId, sku: null, color: null, size: null, quantity: 2 }]);
    const a = await startCheckout(body, deps);
    const b = await startCheckout(body, deps);
    expect(a.ok && b.ok && a.data.url === b.data.url).toBe(true);
    expect(gateway.created).toHaveLength(1);
    expect(await stockOf(productId)).toBe(3);
  });

  it("si Stripe falla, el pedido se cancela y el stock vuelve", async () => {
    const { productId } = await seedProduct(db, { slug: "fallo", price: 10, stock: 1 });
    gateway.failNext = true;
    const r = await startCheckout(request([{ productId, sku: null, color: null, size: null, quantity: 1 }]), deps);
    expect(r).toMatchObject({ ok: false, status: 502, error: "No hemos podido iniciar el pago. Inténtalo de nuevo." });
    expect(await stockOf(productId)).toBe(1);
  });

  it("cancelación desde Stripe: expira la sesión y libera la reserva; token incorrecto → 404", async () => {
    const { productId } = await seedProduct(db, { slug: "cancel", price: 10, stock: 1 });
    const r = await startCheckout(request([{ productId, sku: null, color: null, size: null, quantity: 1 }]), deps);
    if (!r.ok || !r.data.accessToken) throw new Error("checkout no creado");
    expect(await cancelCheckout(r.data.orderId, "f".repeat(64), deps)).toMatchObject({ ok: false, status: 404 });
    const c = await cancelCheckout(r.data.orderId, r.data.accessToken, deps);
    expect(c.ok && c.data.state).toBe("cancelled");
    expect(gateway.expired).toEqual(["cs_test_1"]);
    expect(await stockOf(productId)).toBe(1);
  });
});

describe("webhook de Stripe", () => {
  async function checkoutFor(stock = 1, price = 60) {
    const { productId } = await seedProduct(db, { slug: `w${++keySeq}`, price, stock });
    const r = await startCheckout(request([{ productId, sku: null, color: null, size: null, quantity: 1 }]), deps);
    if (!r.ok || !r.data.accessToken) throw new Error("checkout no creado");
    return { productId, orderId: r.data.orderId, token: r.data.accessToken, totalCents: Math.round(r.data.total * 100) };
  }

  it("firma inválida o ausente → 400 sin tocar nada", async () => {
    const { orderId, token } = await checkoutFor();
    const { payload } = await signed(sessionEvent("checkout.session.completed", orderId));
    expect((await processStripeWebhook(payload, null, webhookDeps)).status).toBe(400);
    const forged = await stripe.webhooks.generateTestHeaderStringAsync({ payload, secret: "whsec_otro" });
    expect((await processStripeWebhook(payload, forged, webhookDeps)).status).toBe(400);
    const order = await getPublicOrder(orderId, token, repo);
    expect(order.ok && order.data.state).toBe("pending");
  });

  it("pago completado: pedido pagado, stock descontado una vez, emails enviados una vez aunque se repita", async () => {
    const { productId, orderId, token, totalCents } = await checkoutFor(1, 60);
    const event = sessionEvent("checkout.session.completed", orderId, { amount_total: totalCents }, "evt_paid_1");
    const { payload, header } = await signed(event);

    const first = await processStripeWebhook(payload, header, webhookDeps);
    expect(first).toMatchObject({ status: 200, body: { result: "paid" } });
    const again = await processStripeWebhook(payload, header, webhookDeps);
    expect(again).toMatchObject({ status: 200, body: { duplicate: true } });
    // Mismo pago notificado con otro id de evento (p.ej. reenvío manual)
    const other = await signed(sessionEvent("checkout.session.completed", orderId, { amount_total: totalCents }, "evt_paid_2"));
    expect((await processStripeWebhook(other.payload, other.header, webhookDeps)).status).toBe(200);

    const order = await getPublicOrder(orderId, token, repo);
    expect(order.ok && order.data.state).toBe("paid");
    expect(await stockOf(productId)).toBe(0);
    expect(sent.map((m) => m.to).sort()).toEqual(["ana@example.com", "tienda@motokass.com"]);
    expect(sent[0].subject).toMatch(/^Pedido MK-\d{4}-\d{6} confirmado/);
  });

  it("si el email falla responde 500 y el reintento lo envía sin duplicar el otro", async () => {
    const { orderId, totalCents } = await checkoutFor();
    let fail = true;
    const flaky: WebhookDeps = {
      ...webhookDeps,
      notifyPaid: (id) =>
        sendOrderEmails(id, {
          repo,
          storeEmail: "tienda@motokass.com",
          send: async (m) => {
            if (fail && m.to === "tienda@motokass.com") throw new Error("resend caído");
            sent.push(m);
          },
        }),
    };
    const { payload, header } = await signed(sessionEvent("checkout.session.completed", orderId, { amount_total: totalCents }, "evt_mail"));
    expect((await processStripeWebhook(payload, header, flaky)).status).toBe(500);
    fail = false;
    expect((await processStripeWebhook(payload, header, flaky)).status).toBe(200);
    expect(sent.map((m) => m.to).sort()).toEqual(["ana@example.com", "tienda@motokass.com"]);
  });

  it("pago asíncrono fallido: pedido cancelado y stock liberado", async () => {
    const { productId, orderId, token } = await checkoutFor(1);
    const started = await signed(sessionEvent("checkout.session.completed", orderId, { payment_status: "unpaid" }));
    expect((await processStripeWebhook(started.payload, started.header, webhookDeps)).body.result).toBe("awaiting_payment");
    expect((await getPublicOrder(orderId, token, repo)).ok).toBe(true);
    const order = await getPublicOrder(orderId, token, repo);
    expect(order.ok && order.data.state).toBe("processing");

    const failed = await signed(sessionEvent("checkout.session.async_payment_failed", orderId, { payment_status: "unpaid" }));
    expect((await processStripeWebhook(failed.payload, failed.header, webhookDeps)).body.result).toBe("payment_failed");
    const after = await getPublicOrder(orderId, token, repo);
    expect(after.ok && after.data.state).toBe("failed");
    expect(await stockOf(productId)).toBe(1);
    expect(sent).toHaveLength(0);
  });

  it("intento de pago rechazado: no cancela (el cliente puede reintentar); sesión expirada: libera stock", async () => {
    const { productId, orderId, token } = await checkoutFor(1);
    const declined = await signed({
      id: "evt_pi_failed", object: "event", type: "payment_intent.payment_failed", livemode: false, created: 0,
      data: { object: { id: "pi_x", object: "payment_intent", metadata: { order_id: orderId }, last_payment_error: { code: "card_declined", decline_code: "generic_decline" } } },
    });
    expect((await processStripeWebhook(declined.payload, declined.header, webhookDeps)).body.result).toBe("attempt_failed");
    expect(await stockOf(productId)).toBe(0);

    const expired = await signed(sessionEvent("checkout.session.expired", orderId, { payment_status: "unpaid" }));
    expect((await processStripeWebhook(expired.payload, expired.header, webhookDeps)).body.result).toBe("expired");
    const order = await getPublicOrder(orderId, token, repo);
    expect(order.ok && order.data.state).toBe("cancelled");
    expect(await stockOf(productId)).toBe(1);
  });

  it("reembolso total actualiza el pedido", async () => {
    const { orderId, token, totalCents } = await checkoutFor();
    const paid = await signed(sessionEvent("checkout.session.completed", orderId, { amount_total: totalCents }));
    await processStripeWebhook(paid.payload, paid.header, webhookDeps);
    const refund = await signed({
      id: "evt_refund", object: "event", type: "charge.refunded", livemode: false, created: 0,
      data: { object: { id: "ch_1", object: "charge", payment_intent: "pi_test_1", amount: totalCents, amount_refunded: totalCents } },
    });
    expect((await processStripeWebhook(refund.payload, refund.header, webhookDeps)).body.result).toBe("refunded");
    const order = await getPublicOrder(orderId, token, repo);
    expect(order.ok && order.data.state).toBe("refunded");
  });

  it("eventos ajenos se ignoran con 200", async () => {
    const { payload, header } = await signed({ id: "evt_other", object: "event", type: "customer.created", livemode: false, created: 0, data: { object: { id: "cus_1", object: "customer" } } });
    expect(await processStripeWebhook(payload, header, webhookDeps)).toMatchObject({ status: 200, body: { result: "ignored" } });
  });

  it("pedido desconocido → 200 (reintentar no lo arreglaría)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { payload, header } = await signed(sessionEvent("checkout.session.completed", "00000000-0000-4000-8000-000000000000"));
    expect(await processStripeWebhook(payload, header, webhookDeps)).toMatchObject({ status: 200, body: { result: "unknown_order" } });
    warn.mockRestore();
  });

  it("error de proceso → 500 para que Stripe reintente, sin datos personales en logs", async () => {
    const { orderId, totalCents } = await checkoutFor();
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const broken: WebhookDeps = { ...webhookDeps, notifyPaid: async () => { throw new Error("fallo interno"); } };
    const { payload, header } = await signed(
      sessionEvent("checkout.session.completed", orderId, { amount_total: totalCents, customer_details: { email: "secreto@example.com" } }),
    );
    expect((await processStripeWebhook(payload, header, broken)).status).toBe(500);
    expect(JSON.stringify(spy.mock.calls)).not.toContain("secreto@example.com");
    expect(JSON.stringify(spy.mock.calls)).not.toContain("ana@example.com");
    spy.mockRestore();
  });
});
