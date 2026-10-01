import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProductDetail from '@/components/commerce/ProductDetail';
import { MOCK_EQUIPMENT } from '@/lib/catalog/equipment.mock';
import { applyFilters, computeFacets, EMPTY_FILTERS } from '@/lib/catalog/equipment-filters';
import { cart, CART_STORAGE_KEY } from '@/lib/commerce/cart';

// Stock del mock: Negro S y Blanco M agotadas; el resto con 4 unidades.
const casco = MOCK_EQUIPMENT.find((p) => p.slug === 'demo-casco-integral')!;
const jet = MOCK_EQUIPMENT.find((p) => p.slug === 'demo-casco-jet')!;
const size = (s: string, out = false) => screen.getByRole('button', { name: `Talla ${s}${out ? ', agotada' : ''}` });

describe('ProductDetail — tallas según stock real', () => {
  beforeEach(() => {
    localStorage.removeItem(CART_STORAGE_KEY);
    cart.clear();
  });

  it('deshabilita las tallas sin stock del color elegido', () => {
    render(<ProductDetail product={casco} categoryIcon="helmet" sizeHelpUrl="#" />);
    expect(size('S', true)).toBeDisabled();
    expect(size('M')).toBeEnabled();
    expect(screen.getByText(/Las tallas tachadas están agotadas en este color/)).toBeInTheDocument();
  });

  it('al cambiar de color suelta la talla si allí está agotada', () => {
    render(<ProductDetail product={casco} categoryIcon="helmet" sizeHelpUrl="#" />);
    fireEvent.click(size('M'));
    expect(size('M')).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Blanco' }));
    expect(size('M', true)).toBeDisabled();
    expect(size('M', true)).toHaveAttribute('aria-pressed', 'false');
    expect(size('S')).toBeEnabled();

    // sin talla válida no se añade nada al carrito
    fireEvent.click(screen.getAllByRole('button', { name: 'Añadir al carrito' })[0]);
    expect(cart.getState().lines).toHaveLength(0);
  });

  it('producto sin stock: todas las tallas agotadas y sin compra', () => {
    render(<ProductDetail product={jet} categoryIcon="helmet" sizeHelpUrl="#" />);
    ['S', 'M', 'L'].forEach((s) => expect(size(s, true)).toBeDisabled());
    expect(screen.getByRole('button', { name: 'Sin stock' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Comprar ahora' })).not.toBeInTheDocument();
  });
});

describe('filtro de talla según stock real', () => {
  const cascos = MOCK_EQUIPMENT.filter((p) => p.category === 'cascos');

  it('filtrar por talla solo devuelve productos con esa talla en stock', () => {
    const conS = applyFilters(cascos, { ...EMPTY_FILTERS, sizes: ['S'] }).map((p) => p.slug);
    expect(conS).toContain('demo-casco-integral'); // S agotada en Negro, disponible en Blanco
    expect(conS).not.toContain('demo-casco-jet'); // agotado en todas las tallas
  });

  it('las tallas del filtro salen solo de variantes con stock', () => {
    expect(computeFacets([jet]).sizes).toEqual([]);
  });
});
