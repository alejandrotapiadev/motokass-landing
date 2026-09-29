import { describe, expect, it } from 'vitest';
import { checkoutItemSchema, checkoutRequestSchema, fieldErrors } from '@/lib/commerce/checkout-schema';
import { computeCheckoutTotals, mergeItems, priceItems, shippingCentsFor, type CatalogProductRow } from '@/lib/commerce/pricing';
import { STORE_CONFIG, getDeliveryOptions, getStoreTrustPoints, isOnlineCheckoutConfigured, type StoreConfig } from '@/lib/commerce/store-config';
import { getCheckoutOptions } from '@/lib/commerce/checkout';
import { buildCheckoutSessionParams } from '@/lib/commerce/stripe-checkout';
import { renderCustomerOrderEmail, renderStoreOrderEmail } from '@/lib/commerce/order-emails';
import type { OrderRecord } from '@/lib/commerce/orders-repo';

const PID = '11111111-1111-4111-8111-111111111111';
const VID = '22222222-2222-4222-8222-222222222222';

const LIVE: StoreConfig = {
  ...STORE_CONFIG,
  onlinePaymentEnabled: true,
  legalTermsReviewed: true,
  shipping: { flatRate: 4.95, freeFrom: 100, deliveryTime: '48 h', zones: 'Península', countries: ['ES'] },
};

const row = (over: Partial<CatalogProductRow> = {}): CatalogProductRow => ({
  id: PID, name: 'Casco X', brand: 'Marca', sku: 'P-SKU', price: '89.90', stock: 0, active: true, images: ['/img/x.jpg'],
  variants: [{ id: VID, sku: 'V-M', color: 'Negro', size: 'M', stock: 3, price: null }],
  ...over,
});

const item = (over = {}) => ({ productId: PID, sku: 'V-M', color: 'Negro', size: 'M', quantity: 1, ...over });

describe('carrito → validación de cantidades', () => {
  it('acepta una línea válida', () => {
    expect(checkoutItemSchema.safeParse(item()).success).toBe(true);
  });
  it.each([0, -1, 1.5, STORE_CONFIG.maxQuantityPerLine + 1])('rechaza cantidad %s', (quantity) => {
    expect(checkoutItemSchema.safeParse(item({ quantity })).success).toBe(false);
  });
});

describe('formulario de checkout', () => {
  const base = {
    idempotencyKey: 'abcdefghijklmnop1234',
    items: [item()],
    customer: { name: 'Ana', email: 'ANA@example.com ', phone: '' },
    deliveryMethod: 'shipping',
    address: { line1: 'Calle 1', city: 'Ávila', postalCode: '05001', province: 'Ávila', country: 'es' },
    acceptTerms: true,
  };

  it('normaliza email, teléfono vacío y país', () => {
    const r = checkoutRequestSchema.parse(base);
    expect(r.customer.email).toBe('ana@example.com');
    expect(r.customer.phone).toBeUndefined();
    expect(r.address?.country).toBe('ES');
  });

  it('exige dirección para envío, términos aceptados y CP válido', () => {
    const r = checkoutRequestSchema.safeParse({ ...base, address: null, acceptTerms: false });
    expect(r.success).toBe(false);
    if (!r.success) {
      const f = fieldErrors(r.error);
      expect(f.address).toBe('Indica la dirección de envío.');
      expect(f.acceptTerms).toBe('Debes aceptar las condiciones de venta.');
    }
    const cp = checkoutRequestSchema.safeParse({ ...base, address: { ...base.address, postalCode: '99999' } });
    expect(!cp.success && fieldErrors(cp.error)['address.postalCode']).toBe('El código postal no es válido.');
  });

  it('descarta campos de precio enviados por el navegador', () => {
    const r = checkoutRequestSchema.parse({ ...base, items: [{ ...item(), unitPrice: 0.01, price: 0 }], total: 1, discount: 999 });
    expect(r.items[0]).not.toHaveProperty('unitPrice');
    expect(r).not.toHaveProperty('total');
    expect(r).not.toHaveProperty('discount');
  });
});

describe('priceItems (servidor)', () => {
  it('usa el precio de la BD y la variante por SKU', () => {
    const { lines, issues } = priceItems([item({ quantity: 2 })], [row()], LIVE);
    expect(issues).toEqual([]);
    expect(lines[0]).toMatchObject({ variantId: VID, unitPrice: 89.9, unitAmountCents: 8990, lineTotalCents: 17980 });
  });

  it('variante con precio propio', () => {
    const r = row({ variants: [{ id: VID, sku: 'V-M', color: 'Negro', size: 'M', stock: 3, price: '99.00' }] });
    expect(priceItems([item()], [r], LIVE).lines[0].unitAmountCents).toBe(9900);
  });

  it('detecta producto inexistente, desactivado, variante inexistente, agotado y stock insuficiente', () => {
    const cases: [ReturnType<typeof item>, CatalogProductRow[], string][] = [
      [item({ productId: 'mock-1' }), [row()], 'unavailable'],
      [item(), [], 'unavailable'],
      [item(), [row({ active: false })], 'unavailable'],
      [item({ sku: 'NOPE', size: 'XXL' }), [row()], 'variant_unavailable'],
      [item(), [row({ variants: [{ id: VID, sku: 'V-M', color: 'Negro', size: 'M', stock: 0, price: null }] })], 'out_of_stock'],
      [item({ quantity: 4 }), [row()], 'insufficient_stock'],
    ];
    for (const [it, rows, code] of cases) {
      expect(priceItems([it], rows, LIVE).issues[0]?.code).toBe(code);
    }
  });

  it('agrupa líneas duplicadas antes de comprobar el stock', () => {
    expect(mergeItems([item(), item({ quantity: 3 })])).toEqual([item({ quantity: 4 })]);
    expect(priceItems([item({ quantity: 2 }), item({ quantity: 2 })], [row()], LIVE).issues[0]?.code).toBe('insufficient_stock');
  });

  it('producto sin variantes usa el stock del producto', () => {
    const r = row({ variants: [], stock: 5 });
    const { lines } = priceItems([item({ sku: 'P-SKU', color: null, size: null })], [r], LIVE);
    expect(lines[0]).toMatchObject({ variantId: null, sku: 'P-SKU' });
  });
});

describe('envío e impuestos', () => {
  it('envío fijo y gratis desde el umbral', () => {
    expect(shippingCentsFor('shipping', 5000, LIVE)).toBe(495);
    expect(shippingCentsFor('shipping', 10000, LIVE)).toBe(0);
    expect(shippingCentsFor('pickup', 5000, LIVE)).toBeNull();
    expect(shippingCentsFor('pickup', 5000, { ...LIVE, pickupInStore: true })).toBe(0);
  });

  it('IVA incluido: el total no cambia; sin tipo no se desglosa', () => {
    const { lines } = priceItems([item()], [row({ price: '121.00' })], LIVE);
    expect(computeCheckoutTotals(lines, 0, LIVE)).toMatchObject({ totalCents: 12100, taxCents: null });
    expect(computeCheckoutTotals(lines, 0, { ...LIVE, tax: { pricesIncludeTax: true, rate: 0.21 } })).toMatchObject({ totalCents: 12100, taxCents: 2100 });
    expect(computeCheckoutTotals(lines, 0, { ...LIVE, tax: { pricesIncludeTax: false, rate: 0.21 } })).toMatchObject({ totalCents: 14641, taxCents: 2541 });
  });
});

describe('configuración de la tienda', () => {
  it('el pago online exige activación, términos revisados y un método de entrega', () => {
    expect(isOnlineCheckoutConfigured(STORE_CONFIG)).toBe(false);
    expect(isOnlineCheckoutConfigured({ ...LIVE, legalTermsReviewed: false })).toBe(false);
    expect(isOnlineCheckoutConfigured({ ...LIVE, shipping: null })).toBe(false);
    expect(isOnlineCheckoutConfigured({ ...LIVE, shipping: null, pickupInStore: true })).toBe(true);
    expect(isOnlineCheckoutConfigured(LIVE)).toBe(true);
  });

  it('no ofrece métodos de entrega no configurados', () => {
    expect(getDeliveryOptions(STORE_CONFIG)).toEqual([]);
    expect(getDeliveryOptions(LIVE).map((o) => o.id)).toEqual(['shipping']);
  });

  it('«Pago seguro» solo aparece con el pago online operativo', () => {
    expect(getStoreTrustPoints(STORE_CONFIG).map((p) => p.key)).not.toContain('payment');
    expect(getStoreTrustPoints(LIVE).map((p) => p.key)).toContain('payment');
  });
});

describe('opciones de checkout del carrito', () => {
  it('sin pago online listo: solo WhatsApp (flujo actual intacto)', () => {
    const o = getCheckoutOptions({ whatsappNumber: '34600000000', onlineReady: false });
    expect(o.primary.id).toBe('whatsapp-order');
    expect(o.alternative).toBeNull();
  });

  it('con pago online: Stripe principal y WhatsApp como alternativa', async () => {
    const o = getCheckoutOptions({ whatsappNumber: '34600000000', onlineReady: true });
    expect(o.primary.id).toBe('online');
    expect(o.alternative?.id).toBe('whatsapp-order');
    const empty = { lines: [], promoCode: null, updatedAt: 0 };
    const totals = { itemCount: 0, subtotal: 0, shipping: null, discount: 0, total: 0, remainingForFreeShipping: null };
    expect(await o.primary.begin(empty, totals)).toEqual({ kind: 'redirect', url: '/checkout' });
    expect(getCheckoutOptions({ whatsappNumber: '1', onlineReady: true, config: { ...LIVE, manualOrderEnabled: false } }).alternative).toBeNull();
  });
});

describe('sesión de Stripe', () => {
  const { lines } = priceItems([item({ quantity: 2 })], [row()], LIVE);
  const totals = computeCheckoutTotals(lines, 495, LIVE);
  const input = {
    orderId: 'o1', orderNumber: 'MK-2026-000001', customerEmail: 'a@b.es', currency: 'eur', lines, totals,
    pricesIncludeTax: true, deliveryLabel: 'Envío a domicilio', successUrl: 'https://motokass.com/s', cancelUrl: 'https://motokass.com/c',
    expiresAt: 1, siteUrl: 'https://motokass.com',
  };

  it('importes en céntimos, metadatos del pedido e imágenes absolutas', () => {
    const p = buildCheckoutSessionParams(input);
    expect(p.line_items?.[0]).toMatchObject({ quantity: 2, price_data: { unit_amount: 8990, currency: 'eur' } });
    expect(p.line_items?.[0].price_data?.product_data?.images).toEqual(['https://motokass.com/img/x.jpg']);
    expect(p.shipping_options?.[0].shipping_rate_data?.fixed_amount?.amount).toBe(495);
    expect(p.metadata).toEqual({ order_id: 'o1', order_number: 'MK-2026-000001' });
    expect(p.payment_intent_data?.metadata).toEqual(p.metadata);
    expect(p).not.toHaveProperty('payment_method_types'); // métodos según el panel de Stripe
  });

  it('se niega a crear una sesión cuyo importe no cuadra con el pedido', () => {
    expect(() => buildCheckoutSessionParams({ ...input, totals: { ...totals, totalCents: totals.totalCents + 1 } })).toThrow(/stripe_amount_mismatch/);
  });
});

describe('emails de pedido', () => {
  const order: OrderRecord = {
    id: 'o1', orderNumber: 'MK-2026-000001', status: 'paid', paymentStatus: 'paid', fulfillmentStatus: 'unfulfilled',
    accessTokenHash: 'x', customerEmail: 'ana@example.com', customerName: '<script>alert(1)</script>', customerPhone: null,
    deliveryMethod: 'shipping', shippingAddress: { line1: 'Calle <b>1</b>', city: 'Ávila', postalCode: '05001', province: 'Ávila', country: 'ES' },
    notes: '<img src=x onerror=alert(1)>', currency: 'eur', subtotal: 100, shippingAmount: 4.95, discountAmount: 0, taxAmount: null,
    pricesIncludeTax: true, total: 104.95, amountRefunded: 0, stripeCheckoutSessionId: 'cs', stripePaymentIntentId: 'pi', stockReserved: true,
    reservedUntil: null, requiresAttention: true, attentionReason: 'Importe distinto', paidAt: null, createdAt: '',
    items: [{ productId: null, variantId: null, sku: 'V-M', name: 'Casco', brand: 'Marca', variantName: 'Negro / Talla M', color: 'Negro', size: 'M', imageUrl: null, quantity: 1, unitPrice: 100, subtotal: 100 }],
  };

  it('escapa los datos del cliente (XSS) e incluye los importes', () => {
    const c = renderCustomerOrderEmail(order);
    expect(c.html).not.toContain('<script>');
    expect(c.html).not.toContain('<img src=x');
    expect(c.html).toContain('&lt;script&gt;');
    expect(c.html).toContain('MK-2026-000001');
    expect(c.html).toMatch(/104,95/);
  });

  it('el email a la tienda avisa si el pedido requiere revisión', () => {
    const s = renderStoreOrderEmail(order);
    expect(s.subject).toMatch(/^\[REVISAR\] Nuevo pedido MK-2026-000001/);
    expect(s.html).toContain('Importe distinto');
    expect(s.replyTo).toBe('ana@example.com');
  });
});
