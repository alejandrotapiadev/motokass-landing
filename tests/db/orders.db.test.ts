// @vitest-environment node
/**
 * Migración de pedidos contra PostgreSQL real (PGlite): creación, snapshot,
 * reserva atómica de stock, idempotencia, transiciones y RLS.
 */
import { beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asRole, createTestDb, pgliteRpc, seedProduct } from "./pglite";
import { createOrdersRepo, DbError, type NewOrderInput, type OrdersRepo } from "../../src/lib/commerce/orders-repo";

let db: PGlite;
let repo: OrdersRepo;
let seq = 0;

const baseOrder = (over: Partial<NewOrderInput> = {}): NewOrderInput => ({
  idempotencyKey: `test-key-${String(++seq).padStart(8, "0")}`,
  accessTokenHash: "a".repeat(64),
  customerEmail: "Cliente@Example.com",
  customerName: "Cliente Prueba",
  customerPhone: null,
  deliveryMethod: "pickup",
  shippingAddress: null,
  notes: null,
  currency: "eur",
  shippingAmount: 0,
  discountAmount: 0,
  taxRate: null,
  pricesIncludeTax: true,
  reservationMinutes: 30,
  ...over,
});

const stockOf = async (table: "equipment_products" | "equipment_variants", id: string) =>
  (await db.query<{ stock: number }>(`SELECT stock FROM ${table} WHERE id = $1`, [id])).rows[0].stock;

beforeEach(async () => {
  db = await createTestDb();
  repo = createOrdersRepo(pgliteRpc(db));
}, 60_000);

describe("create_checkout_order", () => {
  it("crea el pedido con número legible, importes del servidor y reserva stock", async () => {
    const { productId, variantIds } = await seedProduct(db, {
      slug: "casco", price: 199.9, variants: [{ sku: "C-M", size: "M", stock: 3 }, { sku: "C-L", size: "L", stock: 1, price: 209.9 }],
    });
    const created = await repo.createOrder(baseOrder({ shippingAmount: 5.95, deliveryMethod: "shipping", shippingAddress: { line1: "Calle 1", city: "Ávila", postalCode: "05003", province: "Ávila", country: "ES" } }), [
      { productId, variantId: variantIds["C-M"], quantity: 2, expectedUnitPrice: 199.9 },
      { productId, variantId: variantIds["C-L"], quantity: 1, expectedUnitPrice: 209.9 },
    ]);

    expect(created.orderNumber).toMatch(/^MK-\d{4}-\d{6}$/);
    expect(created.total).toBeCloseTo(199.9 * 2 + 209.9 + 5.95, 2);
    expect(await stockOf("equipment_variants", variantIds["C-M"])).toBe(1);
    expect(await stockOf("equipment_variants", variantIds["C-L"])).toBe(0);

    const order = await repo.getOrder(created.orderId);
    expect(order?.status).toBe("pending");
    expect(order?.paymentStatus).toBe("pending");
    expect(order?.customerEmail).toBe("cliente@example.com");
    expect(order?.stockReserved).toBe(true);
    expect(order?.items).toHaveLength(2);
  });

  it("guarda un snapshot que no cambia si el producto cambia después", async () => {
    const { productId } = await seedProduct(db, { slug: "guante", price: 49, stock: 5 });
    const created = await repo.createOrder(baseOrder(), [{ productId, variantId: null, quantity: 1, expectedUnitPrice: 49 }]);

    await db.query(`UPDATE equipment_products SET name = 'Nombre nuevo', price = 99 WHERE id = $1`, [productId]);
    const order = await repo.getOrder(created.orderId);
    expect(order?.items[0].name).toBe("Producto guante");
    expect(order?.items[0].unitPrice).toBe(49);
    expect(order?.items[0].sku).toBe("SKU-guante");
    expect(order?.total).toBe(49);
  });

  it("rechaza un precio distinto al de la base de datos (manipulación)", async () => {
    const { productId } = await seedProduct(db, { slug: "p", price: 100, stock: 5 });
    await expect(repo.createOrder(baseOrder(), [{ productId, variantId: null, quantity: 1, expectedUnitPrice: 1 }])).rejects.toMatchObject({ message: "price_changed" });
    expect(await stockOf("equipment_products", productId)).toBe(5);
  });

  it("rechaza productos inexistentes, desactivados y variantes ajenas", async () => {
    const a = await seedProduct(db, { slug: "a", price: 10, stock: 5, active: false });
    const b = await seedProduct(db, { slug: "b", price: 10, variants: [{ sku: "B-M", size: "M", stock: 5 }] });
    const c = await seedProduct(db, { slug: "c", price: 10, variants: [{ sku: "C-M", size: "M", stock: 5 }] });

    await expect(repo.createOrder(baseOrder(), [{ productId: a.productId, variantId: null, quantity: 1, expectedUnitPrice: 10 }])).rejects.toMatchObject({ message: "product_unavailable" });
    await expect(repo.createOrder(baseOrder(), [{ productId: "00000000-0000-4000-8000-000000000000", variantId: null, quantity: 1, expectedUnitPrice: 10 }])).rejects.toMatchObject({ message: "product_unavailable" });
    await expect(repo.createOrder(baseOrder(), [{ productId: b.productId, variantId: null, quantity: 1, expectedUnitPrice: 10 }])).rejects.toMatchObject({ message: "variant_required" });
    await expect(repo.createOrder(baseOrder(), [{ productId: b.productId, variantId: c.variantIds["C-M"], quantity: 1, expectedUnitPrice: 10 }])).rejects.toMatchObject({ message: "variant_mismatch" });
  });

  it("rechaza cantidades inválidas", async () => {
    const { productId } = await seedProduct(db, { slug: "q", price: 10, stock: 500 });
    await expect(repo.createOrder(baseOrder(), [{ productId, variantId: null, quantity: 0, expectedUnitPrice: 10 }])).rejects.toMatchObject({ message: "invalid_quantity" });
    await expect(repo.createOrder(baseOrder(), [{ productId, variantId: null, quantity: 101, expectedUnitPrice: 10 }])).rejects.toMatchObject({ message: "invalid_quantity" });
  });

  it("no permite vender más del stock y revierte todo el pedido (sin stock negativo)", async () => {
    const x = await seedProduct(db, { slug: "x", price: 10, stock: 5 });
    const y = await seedProduct(db, { slug: "y", price: 10, stock: 1 });
    await expect(
      repo.createOrder(baseOrder(), [
        { productId: x.productId, variantId: null, quantity: 2, expectedUnitPrice: 10 },
        { productId: y.productId, variantId: null, quantity: 2, expectedUnitPrice: 10 },
      ]),
    ).rejects.toMatchObject({ message: "out_of_stock" });
    expect(await stockOf("equipment_products", x.productId)).toBe(5);
    expect(await stockOf("equipment_products", y.productId)).toBe(1);
    expect((await db.query("SELECT count(*)::int AS n FROM orders")).rows[0]).toEqual({ n: 0 });
  });

  it("concurrencia: dos compradores para la última unidad → solo uno obtiene reserva", async () => {
    const { productId } = await seedProduct(db, { slug: "ultima", price: 10, stock: 1 });
    const item = [{ productId, variantId: null, quantity: 1, expectedUnitPrice: 10 }];
    const results = await Promise.allSettled([repo.createOrder(baseOrder(), item), repo.createOrder(baseOrder(), item)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason).toBeInstanceOf(DbError);
    expect(rejected.reason.message).toBe("out_of_stock");
    expect(await stockOf("equipment_products", productId)).toBe(0);
  });

  it("la misma clave de idempotencia devuelve el mismo pedido sin reservar dos veces", async () => {
    const { productId } = await seedProduct(db, { slug: "idem", price: 10, stock: 5 });
    const order = baseOrder();
    const item = [{ productId, variantId: null, quantity: 2, expectedUnitPrice: 10 }];
    const a = await repo.createOrder(order, item);
    const b = await repo.createOrder(order, item);
    expect(b.existing).toBe(true);
    expect(b.orderId).toBe(a.orderId);
    expect(b.orderNumber).toBe(a.orderNumber);
    expect(await stockOf("equipment_products", productId)).toBe(3);
  });

  it("desglosa el IVA incluido solo si el tipo está configurado", async () => {
    const { productId } = await seedProduct(db, { slug: "iva", price: 121, stock: 5 });
    const sinTipo = await repo.getOrder((await repo.createOrder(baseOrder(), [{ productId, variantId: null, quantity: 1, expectedUnitPrice: 121 }])).orderId);
    expect(sinTipo?.taxAmount).toBeNull();
    const conTipo = await repo.getOrder((await repo.createOrder(baseOrder({ taxRate: 0.21 }), [{ productId, variantId: null, quantity: 1, expectedUnitPrice: 121 }])).orderId);
    expect(conTipo?.taxAmount).toBe(21);
    expect(conTipo?.total).toBe(121);
  });
});

describe("pago, cancelación y reembolso", () => {
  async function pendingOrder(stock = 2, qty = 1) {
    const { productId } = await seedProduct(db, { slug: `s${++seq}`, price: 50, stock });
    const created = await repo.createOrder(baseOrder(), [{ productId, variantId: null, quantity: qty, expectedUnitPrice: 50 }]);
    await repo.attachSession(created.orderId, `cs_test_${seq}`, "https://checkout.stripe.com/x");
    return { productId, orderId: created.orderId, sessionId: `cs_test_${seq}` };
  }

  it("confirma el pago una sola vez y no vuelve a descontar stock", async () => {
    const { productId, orderId, sessionId } = await pendingOrder(2, 1);
    const pay = { orderId, sessionId, paymentIntentId: "pi_1", amountTotalCents: 5000, currency: "eur" };
    expect(await repo.confirmPayment(pay)).toEqual({ changed: true, requiresAttention: false });
    expect(await repo.confirmPayment(pay)).toEqual({ changed: false, requiresAttention: false });
    expect(await stockOf("equipment_products", productId)).toBe(1);
    const order = await repo.getOrder(orderId);
    expect(order?.status).toBe("paid");
    expect(order?.paymentStatus).toBe("paid");
    expect(order?.reservedUntil).toBeNull();
  });

  it("marca para revisión si el importe cobrado no coincide", async () => {
    const { orderId, sessionId } = await pendingOrder();
    const r = await repo.confirmPayment({ orderId, sessionId, paymentIntentId: "pi_2", amountTotalCents: 100, currency: "eur" });
    expect(r.requiresAttention).toBe(true);
    expect((await repo.getOrder(orderId))?.attentionReason).toContain("Importe");
  });

  it("rechaza confirmar con otra sesión de Stripe", async () => {
    const { orderId } = await pendingOrder();
    await expect(repo.confirmPayment({ orderId, sessionId: "cs_otra", paymentIntentId: "pi", amountTotalCents: 5000, currency: "eur" })).rejects.toMatchObject({ message: "session_mismatch" });
  });

  it("cancelar devuelve el stock exactamente una vez", async () => {
    const { productId, orderId } = await pendingOrder(3, 2);
    expect(await stockOf("equipment_products", productId)).toBe(1);
    expect(await repo.cancelPendingOrder(orderId, "session_expired")).toBe(true);
    expect(await repo.cancelPendingOrder(orderId, "session_expired")).toBe(false);
    expect(await stockOf("equipment_products", productId)).toBe(3);
    expect((await repo.getOrder(orderId))?.status).toBe("cancelled");
  });

  it("un pedido pagado no se puede cancelar como pendiente", async () => {
    const { productId, orderId, sessionId } = await pendingOrder(2, 1);
    await repo.confirmPayment({ orderId, sessionId, paymentIntentId: "pi_3", amountTotalCents: 5000, currency: "eur" });
    expect(await repo.cancelPendingOrder(orderId, "session_expired")).toBe(false);
    expect(await stockOf("equipment_products", productId)).toBe(1);
  });

  it("pago asíncrono: mantiene la reserva y el fallo la libera", async () => {
    const { productId, orderId, sessionId } = await pendingOrder(1, 1);
    await repo.markAwaitingPayment(orderId, sessionId, "pi_async");
    expect(await repo.releaseExpiredReservations(-60)).toBe(0); // sin caducidad mientras espera
    await repo.cancelPendingOrder(orderId, "async_payment_failed", true);
    const order = await repo.getOrder(orderId);
    expect(order?.paymentStatus).toBe("failed");
    expect(await stockOf("equipment_products", productId)).toBe(1);
  });

  it("libera reservas vencidas y un cobro tardío re-reserva o queda en revisión", async () => {
    const { productId, orderId, sessionId } = await pendingOrder(1, 1);
    await db.query(`UPDATE orders SET reserved_until = NOW() - interval '1 hour' WHERE id = $1`, [orderId]);
    expect(await repo.releaseExpiredReservations(10)).toBe(1);
    expect(await stockOf("equipment_products", productId)).toBe(1);

    // Otro cliente se lleva la unidad y luego llega el cobro tardío del primero
    await repo.createOrder(baseOrder(), [{ productId, variantId: null, quantity: 1, expectedUnitPrice: 50 }]);
    const r = await repo.confirmPayment({ orderId, sessionId, paymentIntentId: "pi_late", amountTotalCents: 5000, currency: "eur" });
    expect(r.requiresAttention).toBe(true);
    const order = await repo.getOrder(orderId);
    expect(order?.paymentStatus).toBe("paid");
    expect(order?.attentionReason).toContain("sin stock");
    expect(await stockOf("equipment_products", productId)).toBe(0);
  });

  it("reembolso parcial y total", async () => {
    const { orderId, sessionId } = await pendingOrder(2, 1);
    await repo.confirmPayment({ orderId, sessionId, paymentIntentId: "pi_ref", amountTotalCents: 5000, currency: "eur" });
    expect(await repo.recordRefund("pi_ref", 1000)).toMatchObject({ found: true, changed: true, full: false });
    expect((await repo.getOrder(orderId))?.paymentStatus).toBe("partially_refunded");
    expect(await repo.recordRefund("pi_ref", 1000)).toMatchObject({ changed: false });
    expect(await repo.recordRefund("pi_ref", 5000)).toMatchObject({ changed: true, full: true });
    const order = await repo.getOrder(orderId);
    expect(order?.status).toBe("refunded");
    expect(order?.amountRefunded).toBe(50);
    expect(await repo.recordRefund("pi_desconocido", 100)).toMatchObject({ found: false });
  });

  it("los emails se reclaman una sola vez y solo con el pedido pagado", async () => {
    const { orderId, sessionId } = await pendingOrder();
    expect(await repo.claimEmail(orderId, "customer")).toBe(false);
    await repo.confirmPayment({ orderId, sessionId, paymentIntentId: "pi_mail", amountTotalCents: 5000, currency: "eur" });
    expect(await repo.claimEmail(orderId, "customer")).toBe(true);
    expect(await repo.claimEmail(orderId, "customer")).toBe(false);
    await repo.releaseEmailClaim(orderId, "customer");
    expect(await repo.claimEmail(orderId, "customer")).toBe(true);
  });

  it("registro de eventos de webhook idempotente", async () => {
    expect(await repo.registerStripeEvent("evt_1", "checkout.session.completed", false)).toBe("process");
    expect(await repo.registerStripeEvent("evt_1", "checkout.session.completed", false)).toBe("process"); // no completado aún
    await repo.completeStripeEvent("evt_1");
    expect(await repo.registerStripeEvent("evt_1", "checkout.session.completed", false)).toBe("duplicate");
  });
});

describe("integridad y transiciones", () => {
  it("los importes y las líneas del pedido son inmutables", async () => {
    const { productId } = await seedProduct(db, { slug: "inm", price: 10, stock: 5 });
    const { orderId } = await repo.createOrder(baseOrder(), [{ productId, variantId: null, quantity: 1, expectedUnitPrice: 10 }]);
    await expect(db.query(`UPDATE orders SET total = 0.01, subtotal = 0.01 WHERE id = $1`, [orderId])).rejects.toThrow(/order_amounts_immutable/);
    await expect(db.query(`UPDATE order_items SET unit_price = 0.01, subtotal = 0.01 WHERE order_id = $1`, [orderId])).rejects.toThrow(/order_items_immutable/);
  });

  it("impide transiciones de estado inválidas", async () => {
    const { productId } = await seedProduct(db, { slug: "tr", price: 10, stock: 5 });
    const { orderId } = await repo.createOrder(baseOrder(), [{ productId, variantId: null, quantity: 1, expectedUnitPrice: 10 }]);
    await expect(db.query(`UPDATE orders SET status = 'completed' WHERE id = $1`, [orderId])).rejects.toThrow(/invalid_status_transition/);
    await expect(db.query(`UPDATE orders SET payment_status = 'refunded' WHERE id = $1`, [orderId])).rejects.toThrow(/invalid_payment_transition/);
    await expect(db.query(`UPDATE orders SET fulfillment_status = 'shipped' WHERE id = $1`, [orderId])).rejects.toThrow(/fulfillment_requires_paid_order/);
  });

  it("el stock de producto no puede quedar negativo", async () => {
    const { productId } = await seedProduct(db, { slug: "neg", price: 10, stock: 1 });
    await expect(db.query(`UPDATE equipment_products SET stock = -1 WHERE id = $1`, [productId])).rejects.toThrow(/stock_nonnegative/);
  });
});

describe("seguridad (RLS y permisos)", () => {
  it("anon/authenticated no pueden leer ni modificar pedidos", async () => {
    const { productId } = await seedProduct(db, { slug: "rls", price: 10, stock: 5 });
    const { orderId } = await repo.createOrder(baseOrder(), [{ productId, variantId: null, quantity: 1, expectedUnitPrice: 10 }]);
    for (const role of ["anon", "authenticated"]) {
      await expect(asRole(db, role, () => db.query(`SELECT * FROM orders`))).rejects.toThrow(/permission denied/);
      await expect(asRole(db, role, () => db.query(`UPDATE orders SET status = 'paid', payment_status = 'paid' WHERE id = $1`, [orderId]))).rejects.toThrow(/permission denied/);
      await expect(asRole(db, role, () => db.query(`INSERT INTO order_items (order_id) VALUES ($1)`, [orderId]))).rejects.toThrow(/permission denied/);
    }
    expect((await repo.getOrder(orderId))?.paymentStatus).toBe("pending");
  });

  it("anon no puede marcar pedidos como pagados vía funciones", async () => {
    const { productId } = await seedProduct(db, { slug: "fn", price: 10, stock: 5 });
    const { orderId } = await repo.createOrder(baseOrder(), [{ productId, variantId: null, quantity: 1, expectedUnitPrice: 10 }]);
    const anonRepo = createOrdersRepo(pgliteRpc(db, "anon"));
    await expect(anonRepo.confirmPayment({ orderId, sessionId: null, paymentIntentId: "pi", amountTotalCents: 1000, currency: "eur" })).rejects.toThrow(/permission denied/);
    await expect(anonRepo.createOrder(baseOrder(), [{ productId, variantId: null, quantity: 1, expectedUnitPrice: 10 }])).rejects.toThrow(/permission denied/);
    await expect(anonRepo.getOrder(orderId)).rejects.toThrow(/permission denied/);
  });

  it("anon no puede modificar precios ni stock", async () => {
    const { productId, variantIds } = await seedProduct(db, { slug: "st", price: 10, variants: [{ sku: "ST-M", size: "M", stock: 5 }] });
    await expect(asRole(db, "anon", () => db.query(`UPDATE equipment_products SET price = 0.01, stock = 999 WHERE id = $1`, [productId]))).rejects.toThrow(/permission denied/);
    await expect(asRole(db, "anon", () => db.query(`UPDATE equipment_variants SET stock = 999 WHERE id = $1`, [variantIds["ST-M"]]))).rejects.toThrow(/permission denied/);
    // la lectura pública de productos activos se mantiene
    const rows = await asRole(db, "anon", () => db.query(`SELECT price FROM equipment_products WHERE id = $1`, [productId]));
    expect(Number((rows.rows[0] as { price: string }).price)).toBe(10);
  });
});
