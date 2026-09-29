import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import CheckoutPage from '@/components/commerce/CheckoutPage';
import { cart, CART_STORAGE_KEY } from '@/lib/commerce/cart';
import type { DeliveryOption } from '@/lib/commerce/store-config';

const OPTIONS: DeliveryOption[] = [
  { id: 'shipping', label: 'Envío a domicilio', description: 'Península · 48 h', price: 4.95, freeFrom: 100, countries: ['ES'] },
];

const quote = {
  lines: [{ productId: 'p1', name: 'Casco X', brand: 'Marca', color: 'Negro', size: 'M', quantity: 1, unitPrice: 50, lineTotal: 50 }],
  issues: [],
  subtotal: 50,
  shipping: 4.95,
  taxAmount: null,
  total: 54.95,
};

function mockFetch(checkoutResponse: () => Promise<Response>) {
  return vi.fn((url: string) => {
    if (url === '/api/checkout/quote') return Promise.resolve(new Response(JSON.stringify(quote), { status: 200 }));
    if (url === '/api/checkout') return checkoutResponse();
    return Promise.resolve(new Response('{}', { status: 200 }));
  });
}

const renderPage = () =>
  render(<CheckoutPage deliveryOptions={OPTIONS} termsUrl="/condiciones-venta" privacyUrl="/privacidad" pricesIncludeTax />);

function fillForm() {
  const byLabel = (l: RegExp) => screen.getByLabelText(l);
  fireEvent.change(byLabel(/Nombre y apellidos/), { target: { value: 'Ana López' } });
  fireEvent.change(byLabel(/^Email/), { target: { value: 'ana@example.com' } });
  fireEvent.change(byLabel(/^Dirección/), { target: { value: 'Calle Mayor 1' } });
  fireEvent.change(byLabel(/Código postal/), { target: { value: '05001' } });
  fireEvent.change(byLabel(/Ciudad/), { target: { value: 'Ávila' } });
  fireEvent.change(byLabel(/Provincia/), { target: { value: 'Ávila' } });
  fireEvent.click(screen.getByRole('checkbox'));
}

describe('CheckoutPage', () => {
  const assign = vi.fn();

  beforeEach(() => {
    localStorage.removeItem(CART_STORAGE_KEY);
    cart.clear();
    cart.add({
      productId: 'p1', sku: 'V-M', slug: 'casco', url: '/x', name: 'Casco X', brand: 'Marca', image: null,
      color: 'Negro', size: 'M', unitPrice: 50, compareAtPrice: null, maxQuantity: 3,
    });
    Object.defineProperty(window, 'location', { value: { ...window.location, assign, origin: 'http://localhost' }, writable: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    assign.mockReset();
  });

  it('muestra el resumen calculado por el servidor', async () => {
    vi.stubGlobal('fetch', mockFetch(() => Promise.reject(new Error('no debería llamarse'))));
    renderPage();
    expect(await screen.findByRole('button', { name: /Pagar 54,95/ })).toBeEnabled();
  });

  it('valida el formulario sin llamar al servidor', async () => {
    const fetchMock = mockFetch(() => Promise.reject(new Error('no debería llamarse')));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    const pay = await screen.findByRole('button', { name: /Pagar/ });
    fireEvent.click(pay);
    expect(await screen.findByText('Revisa los campos marcados.')).toBeInTheDocument();
    expect(screen.getByText('Indica tu nombre y apellidos.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith('/api/checkout', expect.anything());
  });

  it('evita el doble clic y redirige a Stripe', async () => {
    let resolve!: (r: Response) => void;
    const fetchMock = mockFetch(() => new Promise<Response>((r) => (resolve = r)));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    const pay = await screen.findByRole('button', { name: /Pagar/ });
    fillForm();

    fireEvent.click(pay);
    fireEvent.click(pay);
    await waitFor(() => expect(screen.getByRole('button', { name: /Conectando con el pago seguro/ })).toBeDisabled());
    expect(fetchMock.mock.calls.filter(([u]) => u === '/api/checkout')).toHaveLength(1);

    const body = JSON.parse((fetchMock.mock.calls.find(([u]) => u === '/api/checkout') as unknown as [string, RequestInit])[1].body as string);
    expect(body.items[0]).toEqual({ productId: 'p1', sku: 'V-M', color: 'Negro', size: 'M', quantity: 1 }); // sin precios

    await act(async () => {
      resolve(new Response(JSON.stringify({ url: 'https://checkout.stripe.com/c/pay/cs_1', orderId: 'o1', accessToken: 'a'.repeat(64), orderNumber: 'MK-2026-000001', total: 54.95 }), { status: 200 }));
    });
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/cs_1'));
  });

  it('muestra errores del servidor de forma comprensible y permite reintentar', async () => {
    vi.stubGlobal('fetch', mockFetch(() => Promise.resolve(new Response(JSON.stringify({ error: 'La cantidad solicitada supera el stock disponible.' }), { status: 409 }))));
    renderPage();
    const pay = await screen.findByRole('button', { name: /Pagar/ });
    fillForm();
    fireEvent.click(pay);
    expect(await screen.findByText('La cantidad solicitada supera el stock disponible.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pagar/ })).toBeEnabled();
  });
});
