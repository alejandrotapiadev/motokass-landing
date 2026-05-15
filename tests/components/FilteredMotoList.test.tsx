import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import FilteredMotoList from '@/components/FilteredMotoList.jsx';

const motos = [
  { marca: 'Rieju', nombre: 'Rieju MR PRO 125',     imagen: '', stock: true,  nuevo: false, categoria: 'Off-Road',  specs: { cilindrada_cc: 125, tipo_motor: '2T' } },
  { marca: 'Rieju', nombre: 'Rieju Aventura 500',    imagen: '', stock: true,  nuevo: true,  categoria: 'Travel',    specs: { cilindrada_cc: 500, tipo_motor: '4T' } },
  { marca: 'Rieju', nombre: 'Rieju E-City 3KW',      imagen: '', stock: true,  nuevo: true,  categoria: 'Eléctrico', specs: { tipo_motor: 'Motor eléctrico', potencia_kw: 3 } },
  { marca: 'Sherco', nombre: 'Sherco 300 SE Factory', imagen: '', stock: true,  nuevo: false, categoria: 'Enduro',    specs: { cilindrada_cc: 300, tipo_motor: '2T' } },
  { marca: 'Sherco', nombre: 'Sherco 50 SM RS',       imagen: '', stock: false, nuevo: false, categoria: '50cc',      specs: { cilindrada_cc: 50,  tipo_motor: '2T' } },
];

describe('FilteredMotoList', () => {
  it('renderiza todos los modelos sin filtros', () => {
    render(<FilteredMotoList motos={motos} />);
    expect(screen.getAllByRole('link')).toHaveLength(5);
  });

  it('muestra el contador correcto de resultados', () => {
    render(<FilteredMotoList motos={motos} />);
    expect(screen.getByText(/5 motos encontradas/i)).toBeInTheDocument();
  });

  it('filtra por búsqueda de texto', () => {
    render(<FilteredMotoList motos={motos} />);
    const input = screen.getByPlaceholderText(/buscar por modelo/i);
    fireEvent.input(input, { target: { value: 'sherco' } });
    expect(screen.getAllByRole('link')).toHaveLength(2);
    expect(screen.getByText(/2 motos encontradas/i)).toBeInTheDocument();
  });

  it('filtra solo disponibles (con stock)', () => {
    render(<FilteredMotoList motos={motos} />);
    const checkbox = screen.getByLabelText(/solo disponibles/i);
    fireEvent.click(checkbox);
    // sherco 50 SM sin stock debe desaparecer
    expect(screen.queryByText('Sherco 50 SM RS')).not.toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(4);
  });

  it('filtra solo novedades', () => {
    render(<FilteredMotoList motos={motos} />);
    const checkbox = screen.getByLabelText(/solo novedades/i);
    fireEvent.click(checkbox);
    expect(screen.getAllByRole('link')).toHaveLength(2);
    expect(screen.getByText('Rieju Aventura 500')).toBeInTheDocument();
    expect(screen.getByText('Rieju E-City 3KW')).toBeInTheDocument();
  });

  it('muestra "Sin resultados" cuando ningún modelo coincide', () => {
    render(<FilteredMotoList motos={motos} />);
    const input = screen.getByPlaceholderText(/buscar por modelo/i);
    fireEvent.input(input, { target: { value: 'modelo que no existe xyz' } });
    expect(screen.getByText(/no hay motos que coincidan/i)).toBeInTheDocument();
  });

  it('muestra el botón limpiar cuando hay filtros activos', () => {
    render(<FilteredMotoList motos={motos} />);
    expect(screen.queryByText(/limpiar/i)).not.toBeInTheDocument();
    const input = screen.getByPlaceholderText(/buscar por modelo/i);
    fireEvent.input(input, { target: { value: 'rieju' } });
    expect(screen.getByText(/limpiar/i)).toBeInTheDocument();
  });

  it('el botón limpiar resetea todos los filtros', () => {
    render(<FilteredMotoList motos={motos} />);
    const input = screen.getByPlaceholderText(/buscar por modelo/i);
    fireEvent.input(input, { target: { value: 'rieju' } });
    expect(screen.getAllByRole('link')).toHaveLength(3);
    fireEvent.click(screen.getByText(/limpiar/i));
    expect(screen.getAllByRole('link')).toHaveLength(5);
  });
});
