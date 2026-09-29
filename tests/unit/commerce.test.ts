import { describe, it, expect } from 'vitest';
import { addLine, computeTotals, lineIdFor, removeLine, setLineQuantity, type CartState, type NewLine } from '@/lib/commerce/cart';
import { STORE_CONFIG, getStoreTrustPoints, type StoreConfig } from '@/lib/commerce/store-config';
import { buildOrderMessage } from '@/lib/commerce/checkout';

const empty: CartState = { lines: [], promoCode: null, updatedAt: 0 };
const casco: NewLine = {
  productId: 'p1', sku: 'SKU-1', slug: 'casco', url: '/equipamiento/cascos/casco',
  name: 'Casco X', brand: 'Marca', image: null, color: 'Negro', size: 'M',
  unitPrice: 100, compareAtPrice: null, maxQuantity: 3,
};

describe('cart reducers', () => {
  it('añade una línea con id color|talla', () => {
    const s = addLine(empty, casco);
    expect(s.lines).toHaveLength(1);
    expect(s.lines[0].lineId).toBe(lineIdFor('p1', 'Negro', 'M'));
    expect(s.lines[0].quantity).toBe(1);
  });

  it('agrupa la misma variante y respeta el stock máximo', () => {
    let s = addLine(empty, casco);
    s = addLine(s, { ...casco, quantity: 5 });
    expect(s.lines).toHaveLength(1);
    expect(s.lines[0].quantity).toBe(3);
  });

  it('separa variantes distintas', () => {
    const s = addLine(addLine(empty, casco), { ...casco, size: 'L' });
    expect(s.lines).toHaveLength(2);
  });

  it('modifica cantidad y elimina con cantidad 0', () => {
    let s = addLine(empty, casco);
    const id = s.lines[0].lineId;
    s = setLineQuantity(s, id, 2);
    expect(s.lines[0].quantity).toBe(2);
    s = setLineQuantity(s, id, 0);
    expect(s.lines).toHaveLength(0);
  });

  it('elimina una línea', () => {
    const s = addLine(empty, casco);
    expect(removeLine(s, s.lines[0].lineId).lines).toHaveLength(0);
  });
});

describe('computeTotals', () => {
  it('sin política de envío: shipping null y total = subtotal', () => {
    const s = addLine(empty, { ...casco, quantity: 2 });
    const t = computeTotals(s);
    expect(t.itemCount).toBe(2);
    expect(t.subtotal).toBe(200);
    expect(t.shipping).toBeNull();
    expect(t.total).toBe(200);
  });

  it('con envío configurado calcula coste y umbral gratuito', () => {
    const cfg: StoreConfig = { ...STORE_CONFIG, shipping: { flatRate: 5, freeFrom: 150, deliveryTime: '48h', zones: 'Península', countries: ['ES'] } };
    const t1 = computeTotals(addLine(empty, casco, cfg), cfg);
    expect(t1.shipping).toBe(5);
    expect(t1.remainingForFreeShipping).toBe(50);
    expect(t1.total).toBe(105);
    const t2 = computeTotals(addLine(empty, { ...casco, quantity: 2 }, cfg), cfg);
    expect(t2.shipping).toBe(0);
  });

  it('ignora códigos promocionales si no están habilitados', () => {
    const s = { ...addLine(empty, casco), promoCode: 'X' };
    expect(computeTotals(s, STORE_CONFIG, () => 50).discount).toBe(0);
  });
});

describe('store-config: no afirma políticas no configuradas', () => {
  it('por defecto no muestra pago seguro, envíos, devoluciones ni recogida', () => {
    const keys = getStoreTrustPoints().map((p) => p.key);
    expect(keys).not.toContain('payment');
    expect(keys).not.toContain('shipping');
    expect(keys).not.toContain('returns');
    expect(keys).not.toContain('pickup');
    expect(keys).toContain('store');
  });
});

describe('checkout WhatsApp', () => {
  it('genera mensaje con variantes y subtotal', () => {
    const s = addLine(empty, casco);
    const msg = buildOrderMessage(s, computeTotals(s));
    expect(msg).toContain('Casco X');
    expect(msg).toContain('talla M');
    expect(msg).toContain('Subtotal');
  });
});
