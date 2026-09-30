import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import EquipmentListing from '@/components/commerce/EquipmentListing';
import { MOCK_EQUIPMENT } from '@/lib/catalog/equipment.mock';
import { getActiveCategories, ALL_SIZES } from '@/lib/catalog/equipment-categories';

const categories = getActiveCategories().map(({ slug, name, icon }) => ({ slug, name, icon }));
const cascos = MOCK_EQUIPMENT.filter((p) => p.category === 'cascos');

function renderListing(props: Partial<React.ComponentProps<typeof EquipmentListing>> = {}) {
  return render(
    <EquipmentListing
      products={MOCK_EQUIPMENT}
      categories={categories}
      categorySlug={null}
      categoryName="Productos"
      types={[]}
      sizeScale={ALL_SIZES}
      initialQuery=""
      helpUrl="https://wa.me/0"
      {...props}
    />,
  );
}

const names = () => screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
const nav = () => screen.getByRole('navigation', { name: 'Categorías de equipamiento' });

beforeEach(() => {
  history.replaceState(null, '', '/equipamiento');
  sessionStorage.clear();
});

describe('EquipmentListing — categorías', () => {
  it('muestra Todos + las 7 categorías y marca la activa', () => {
    renderListing({ products: cascos, categorySlug: 'cascos', categoryName: 'Cascos' });
    const links = within(nav()).getAllByRole('link');
    expect(links.map((a) => a.textContent)).toEqual(['Todos', 'Cascos', 'Chaquetas', 'Camisetas', 'Guantes', 'Pantalones', 'Botas', 'Accesorios']);
    expect(within(nav()).getByRole('link', { current: 'page' })).toHaveTextContent('Cascos');
    expect(links[0]).toHaveAttribute('href', '/equipamiento');
  });

  it('una categoría sin productos mantiene la navegación y ofrece consultar', () => {
    renderListing({ products: [], categorySlug: 'pantalones', categoryName: 'Pantalones' });
    expect(nav()).toBeInTheDocument();
    expect(screen.getByText(/Muy pronto verás aquí nuestros pantalones/)).toBeInTheDocument();
  });
});

describe('EquipmentListing — ordenación', () => {
  it('aplica el orden elegido y lo refleja en la URL', () => {
    renderListing({ products: cascos, categorySlug: 'cascos', categoryName: 'Cascos' });
    fireEvent.change(screen.getByLabelText('Ordenar productos'), { target: { value: 'price-desc' } });
    expect(names()).toEqual(['[DEMO] Casco modular', '[DEMO] Casco integral', '[DEMO] Casco off-road', '[DEMO] Casco jet']);
    expect(location.search).toBe('?orden=price-desc');
  });

  it('parte del orden de la URL (recarga) y lo conserva al cambiar de categoría', () => {
    renderListing({ products: cascos, categorySlug: 'cascos', categoryName: 'Cascos', initialQuery: 'orden=price-asc' });
    expect(names()[0]).toBe('[DEMO] Casco jet');
    expect(within(nav()).getByRole('link', { name: 'Botas' })).toHaveAttribute('href', '/equipamiento/botas?orden=price-asc');
    expect(within(nav()).getByRole('link', { name: 'Todos' })).toHaveAttribute('href', '/equipamiento?orden=price-asc');
  });
});

describe('EquipmentListing — paginación', () => {
  it('"Todos" muestra todos los productos repartidos en páginas', () => {
    renderListing();
    expect(names()).toHaveLength(12);
    expect(screen.getByText(/15 productos · página 1 de 2/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Página 2' }));
    expect(names()).toHaveLength(MOCK_EQUIPMENT.length - 12);
    expect(location.search).toBe('?pagina=2');
    expect(screen.getByRole('link', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page');
  });

  it('combina orden y página, y vuelve a la página 1 al cambiar el orden o los filtros', () => {
    renderListing({ initialQuery: 'orden=price-asc&pagina=2' });
    expect(names()).toHaveLength(3);
    expect(names().at(-1)).toBe('[DEMO] Chaqueta de cuero');
    expect(screen.getByRole('link', { name: 'Página 1' })).toHaveAttribute('href', '/equipamiento?orden=price-asc');

    fireEvent.change(screen.getByLabelText('Ordenar productos'), { target: { value: 'price-desc' } });
    expect(names()[0]).toBe('[DEMO] Chaqueta de cuero');
    expect(location.search).toBe('?orden=price-desc');
  });

  it('una página inexistente cae en la última y no hay paginación si cabe en una', () => {
    renderListing({ initialQuery: 'pagina=99' });
    expect(screen.getByText(/página 2 de 2/)).toBeInTheDocument();
    expect(location.search).toBe('?pagina=2');

    renderListing({ products: cascos, categorySlug: 'cascos', categoryName: 'Cascos' });
    expect(screen.getAllByRole('navigation', { name: 'Paginación' })).toHaveLength(1);
  });
});
