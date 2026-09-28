import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MotoCard from '@/components/MotoCard.jsx';
import FilteredMotoList from '@/components/FilteredMotoList.jsx';
import ProductCard from '@/components/commerce/ProductCard';
import { MOCK_EQUIPMENT } from '@/lib/catalog/equipment.mock';
import { cart, CART_STORAGE_KEY } from '@/lib/commerce/cart';

describe('MotoCard — precio', () => {
  it('muestra el PVP con separador de miles cuando existe', () => {
    render(<MotoCard marca="Rieju" nombre="Rieju MR PRO 300i 2026" imagen="" precio={9149} />);
    expect(screen.getByText(/9\.149\s€/)).toBeInTheDocument();
    expect(screen.queryByText('Consultar precio')).not.toBeInTheDocument();
  });

  it('muestra "Consultar precio" si el precio es null', () => {
    render(<MotoCard marca="Sherco" nombre="Sherco 300 SE" imagen="" precio={null} />);
    expect(screen.getByText('Consultar precio')).toBeInTheDocument();
  });
});

describe('FilteredMotoList — segmento', () => {
  const motos = [
    { marca: 'Rieju', nombre: 'Rieju MR PRO 125', imagen: '', stock: true, specs: {}, segmentos: ['enduro'] },
    { marca: 'Sherco', nombre: 'Sherco 300 ST', imagen: '', stock: true, specs: {}, segmentos: ['trial'] },
  ];

  it('aplica el segmento inicial (enlaces ?segmento= de la home)', () => {
    render(<FilteredMotoList motos={motos} segmentos={[{ value: 'trial', label: 'Trial' }]} initialSegmento="trial" />);
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByText('Sherco 300 ST')).toBeInTheDocument();
  });
});

describe('ProductCard', () => {
  beforeEach(() => {
    localStorage.removeItem(CART_STORAGE_KEY);
    cart.clear();
  });

  const casco = MOCK_EQUIPMENT.find((p) => p.slug === 'demo-casco-integral')!;
  const jet = MOCK_EQUIPMENT.find((p) => p.slug === 'demo-casco-jet')!;

  it('muestra marca, precio, precio anterior y descuento', () => {
    render(<ProductCard product={casco} />);
    expect(screen.getByText('Marca Demo')).toBeInTheDocument();
    expect(screen.getByText('129,90 €')).toBeInTheDocument();
    expect(screen.getByText('159,90 €')).toBeInTheDocument();
    expect(screen.getByText('-19%')).toBeInTheDocument();
  });

  it('añade al carrito la talla elegida en el selector rápido', () => {
    render(<ProductCard product={casco} />);
    fireEvent.click(screen.getByRole('button', { name: 'Añadir talla M' }));
    const line = cart.getState().lines[0];
    expect(line.size).toBe('M');
    expect(line.color).toBe('Negro');
    expect(line.unitPrice).toBe(129.9);
  });

  it('producto agotado: botón deshabilitado', () => {
    render(<ProductCard product={jet} />);
    expect(screen.getByRole('button', { name: 'Sin stock' })).toBeDisabled();
  });
});
