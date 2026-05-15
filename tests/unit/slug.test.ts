import { describe, it, expect } from 'vitest';
import { toSlug } from '@/lib/slug';

describe('toSlug', () => {
  it('convierte a minúsculas', () => {
    expect(toSlug('RIEJU MR PRO')).toBe('rieju-mr-pro');
  });

  it('elimina acentos', () => {
    expect(toSlug('Aventura 125 Ávila')).toBe('aventura-125-avila');
    expect(toSlug('Eléctrico')).toBe('electrico');
  });

  it('reemplaza espacios y caracteres especiales por guiones', () => {
    expect(toSlug('Rieju MR PRO 300i 2026')).toBe('rieju-mr-pro-300i-2026');
    expect(toSlug('Sherco 300 SE-F Factory')).toBe('sherco-300-se-f-factory');
  });

  it('no deja guiones al inicio ni al final', () => {
    expect(toSlug(' moto ')).toBe('moto');
    expect(toSlug('-moto-')).toBe('moto');
  });

  it('colapsa múltiples separadores en un solo guión', () => {
    expect(toSlug('Rieju  --  MR')).toBe('rieju-mr');
  });

  it('maneja números correctamente', () => {
    expect(toSlug('E-City 1.2KW')).toBe('e-city-1-2kw');
    expect(toSlug('MRT 50 SM')).toBe('mrt-50-sm');
  });
});
