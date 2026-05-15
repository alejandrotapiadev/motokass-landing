import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MotoCard from '@/components/MotoCard.jsx';

const base = {
  marca: 'Rieju',
  nombre: 'Rieju MR PRO 125',
  imagen: 'https://example.com/moto.jpg',
};

describe('MotoCard', () => {
  it('muestra el nombre del modelo', () => {
    render(<MotoCard {...base} />);
    expect(screen.getByText('Rieju MR PRO 125')).toBeInTheDocument();
  });

  it('muestra la marca', () => {
    render(<MotoCard {...base} />);
    expect(screen.getByText('Rieju')).toBeInTheDocument();
  });

  it('muestra "Consultar precio"', () => {
    render(<MotoCard {...base} />);
    expect(screen.getByText('Consultar precio')).toBeInTheDocument();
  });

  it('muestra badge "Sin stock" cuando stock=false', () => {
    render(<MotoCard {...base} stock={false} />);
    expect(screen.getByText('Sin stock')).toBeInTheDocument();
  });

  it('no muestra badge "Sin stock" cuando stock=true', () => {
    render(<MotoCard {...base} stock={true} />);
    expect(screen.queryByText('Sin stock')).not.toBeInTheDocument();
  });

  it('muestra badge "Nuevo" cuando nuevo=true y hay stock', () => {
    render(<MotoCard {...base} stock={true} nuevo={true} />);
    expect(screen.getByText('Nuevo')).toBeInTheDocument();
  });

  it('no muestra badge "Nuevo" si no hay stock aunque nuevo=true', () => {
    render(<MotoCard {...base} stock={false} nuevo={true} />);
    expect(screen.queryByText('Nuevo')).not.toBeInTheDocument();
  });

  it('aplica clase moto-card--agotada cuando sin stock', () => {
    const { container } = render(<MotoCard {...base} stock={false} />);
    expect(container.firstChild).toHaveClass('moto-card--agotada');
  });

  it('renderiza la imagen con el alt correcto', () => {
    render(<MotoCard {...base} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('alt', 'Rieju MR PRO 125');
    expect(img).toHaveAttribute('src', 'https://example.com/moto.jpg');
  });

  it('aplica clase de marca correcta al badge', () => {
    render(<MotoCard {...base} marca="Sherco" nombre="Sherco 300" imagen="" />);
    const badge = screen.getByText('Sherco');
    expect(badge).toHaveClass('sherco');
  });
});
