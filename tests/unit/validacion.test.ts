import { describe, it, expect, vi, afterEach } from 'vitest';
import { isValidEmail, isFechaFutura, validarCita, validarContacto } from '@/lib/validacion';

// ── isValidEmail ─────────────────────────────────────────────────────
describe('isValidEmail', () => {
  it('acepta emails válidos', () => {
    expect(isValidEmail('cliente@gmail.com')).toBe(true);
    expect(isValidEmail('info@motokass.com')).toBe(true);
    expect(isValidEmail('user+tag@domain.co.uk')).toBe(true);
  });

  it('rechaza emails inválidos', () => {
    expect(isValidEmail('noarrobadominio')).toBe(false);
    expect(isValidEmail('@sinusuario.com')).toBe(false);
    expect(isValidEmail('sindominio@')).toBe(false);
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('espacios @mail.com')).toBe(false);
  });
});

// ── isFechaFutura ────────────────────────────────────────────────────
describe('isFechaFutura', () => {
  afterEach(() => vi.useRealTimers());

  it('acepta la fecha de hoy', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-15'));
    expect(isFechaFutura('2026-05-15')).toBe(true);
  });

  it('acepta fechas futuras', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-15'));
    expect(isFechaFutura('2026-05-20')).toBe(true);
    expect(isFechaFutura('2027-01-01')).toBe(true);
  });

  it('rechaza fechas pasadas', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-15'));
    expect(isFechaFutura('2026-05-14')).toBe(false);
    expect(isFechaFutura('2025-01-01')).toBe(false);
  });
});

// ── validarCita ──────────────────────────────────────────────────────
describe('validarCita', () => {
  const base = {
    nombre: 'Juan García',
    email: 'juan@mail.com',
    fecha: '2099-12-31',
    hora: '10:00',
    vehiculo: 'Rieju MR PRO 125',
    motivo: 'revision',
  };

  it('retorna null cuando todos los campos son correctos', () => {
    expect(validarCita(base)).toBeNull();
  });

  it('detecta campos obligatorios faltantes', () => {
    expect(validarCita({ ...base, nombre: '' })).toBeTruthy();
    expect(validarCita({ ...base, email: '' })).toBeTruthy();
    expect(validarCita({ ...base, fecha: '' })).toBeTruthy();
    expect(validarCita({ ...base, hora: '' })).toBeTruthy();
    expect(validarCita({ ...base, vehiculo: '  ' })).toBeTruthy();
    expect(validarCita({ ...base, motivo: '' })).toBeTruthy();
  });

  it('detecta email inválido', () => {
    expect(validarCita({ ...base, email: 'malformed' })).toMatch(/email/i);
  });

  it('detecta fecha en el pasado', () => {
    expect(validarCita({ ...base, fecha: '2000-01-01' })).toMatch(/pasado/i);
  });
});

// ── validarContacto ──────────────────────────────────────────────────
describe('validarContacto', () => {
  const base = {
    name: 'Ana López',
    email: 'ana@mail.com',
    message: 'Quiero información sobre la Rieju Aventura 125.',
  };

  it('retorna null con datos válidos', () => {
    expect(validarContacto(base)).toBeNull();
  });

  it('detecta campos faltantes', () => {
    expect(validarContacto({ ...base, name: '' })).toBeTruthy();
    expect(validarContacto({ ...base, email: '  ' })).toBeTruthy();
    expect(validarContacto({ ...base, message: '' })).toBeTruthy();
  });

  it('detecta email inválido', () => {
    expect(validarContacto({ ...base, email: 'bad-email' })).toMatch(/email/i);
  });

  it('detecta mensaje demasiado corto', () => {
    expect(validarContacto({ ...base, message: 'Hola' })).toMatch(/corto/i);
  });
});
