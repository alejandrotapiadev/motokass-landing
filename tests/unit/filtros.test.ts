import { describe, it, expect } from 'vitest';
import { getTipoMotor, getRangoCilindrada, getPaginas } from '@/lib/filtros';

// ── getTipoMotor ─────────────────────────────────────────────────────
describe('getTipoMotor', () => {
  it('detecta motor 2T', () => {
    expect(getTipoMotor({ specs: { tipo_motor: 'Motor 2T monocilíndrico' } })).toBe('2T');
    expect(getTipoMotor({ specs: { tipo_motor: '2 Temps' } })).toBe('2T');
  });

  it('detecta motor 4T', () => {
    expect(getTipoMotor({ specs: { tipo_motor: 'Motor 4T DOHC' } })).toBe('4T');
    expect(getTipoMotor({ specs: { tipo_motor: '4 Temps' } })).toBe('4T');
  });

  it('detecta eléctrico por texto', () => {
    expect(getTipoMotor({ specs: { tipo_motor: 'Motor eléctrico BLDC' } })).toBe('Eléctrico');
    expect(getTipoMotor({ specs: { tipo_motor: 'Motor electrico' } })).toBe('Eléctrico');
    expect(getTipoMotor({ specs: { tipo_motor: 'Shimano EP8' } })).toBe('Eléctrico');
  });

  it('detecta eléctrico por potencia_kw', () => {
    expect(getTipoMotor({ specs: { tipo_motor: '', potencia_kw: 3.5 } })).toBe('Eléctrico');
  });

  it('retorna null si no se puede clasificar', () => {
    expect(getTipoMotor({ specs: {} })).toBeNull();
    expect(getTipoMotor({})).toBeNull();
  });
});

// ── getRangoCilindrada ───────────────────────────────────────────────
describe('getRangoCilindrada', () => {
  it('clasifica 50cc o menos', () => {
    expect(getRangoCilindrada({ specs: { cilindrada_cc: 50, tipo_motor: '2T' } })).toBe('50cc');
    expect(getRangoCilindrada({ specs: { cilindrada_cc: 49, tipo_motor: '2T' } })).toBe('50cc');
  });

  it('clasifica 125cc', () => {
    expect(getRangoCilindrada({ specs: { cilindrada_cc: 125, tipo_motor: '4T' } })).toBe('125cc');
    expect(getRangoCilindrada({ specs: { cilindrada_cc: 51, tipo_motor: '4T' } })).toBe('125cc');
  });

  it('clasifica 250-500cc', () => {
    expect(getRangoCilindrada({ specs: { cilindrada_cc: 300, tipo_motor: '2T' } })).toBe('250-500cc');
    expect(getRangoCilindrada({ specs: { cilindrada_cc: 500, tipo_motor: '4T' } })).toBe('250-500cc');
  });

  it('clasifica más de 500cc', () => {
    expect(getRangoCilindrada({ specs: { cilindrada_cc: 707, tipo_motor: '4T' } })).toBe('mas500cc');
  });

  it('clasifica eléctrico independiente de cilindrada', () => {
    expect(getRangoCilindrada({ specs: { cilindrada_cc: null, potencia_kw: 3 } })).toBe('electrico');
    expect(getRangoCilindrada({ specs: { tipo_motor: 'Motor eléctrico' } })).toBe('electrico');
  });

  it('retorna null si no hay datos', () => {
    expect(getRangoCilindrada({ specs: {} })).toBeNull();
    expect(getRangoCilindrada({})).toBeNull();
  });
});

// ── getPaginas ───────────────────────────────────────────────────────
describe('getPaginas', () => {
  it('devuelve todas las páginas si hay 7 o menos', () => {
    expect(getPaginas(5, 1)).toEqual([1, 2, 3, 4, 5]);
    expect(getPaginas(7, 4)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('añade elipsis al inicio cuando la página actual está lejos del comienzo', () => {
    const pags = getPaginas(10, 7);
    expect(pags[0]).toBe(1);
    expect(pags[1]).toBe('…');
  });

  it('añade elipsis al final cuando la página actual está lejos del final', () => {
    const pags = getPaginas(10, 2);
    expect(pags[pags.length - 1]).toBe(10);
    expect(pags[pags.length - 2]).toBe('…');
  });

  it('siempre incluye primera y última página', () => {
    const pags = getPaginas(20, 10);
    expect(pags[0]).toBe(1);
    expect(pags[pags.length - 1]).toBe(20);
  });

  it('incluye páginas adyacentes a la actual', () => {
    const pags = getPaginas(10, 5) as number[];
    const nums = pags.filter((p): p is number => p !== '…');
    expect(nums).toContain(4);
    expect(nums).toContain(5);
    expect(nums).toContain(6);
  });
});
