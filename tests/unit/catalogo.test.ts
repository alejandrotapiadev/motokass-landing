import { describe, it, expect } from 'vitest';
import { toSlug } from '@/lib/slug';
import RiejuData from '@/resources/RiejuCatalogo.json';
import ShercoData from '@/resources/ShercoCatalogo.json';

const rieju = RiejuData.catalogo.modelos;
const sherco = ShercoData.catalogo.modelos;
const todos = [...rieju, ...sherco];

describe('Catálogo — integridad de datos', () => {
  it('tiene 35 modelos Rieju', () => {
    expect(rieju).toHaveLength(35);
  });

  it('tiene 32 modelos Sherco', () => {
    expect(sherco).toHaveLength(32);
  });

  it('todos los modelos tienen campo "modelo" no vacío', () => {
    todos.forEach(m => {
      expect(m.modelo, `modelo vacío en ${JSON.stringify(m)}`).toBeTruthy();
    });
  });

  it('todos los modelos tienen imagen', () => {
    todos.forEach(m => {
      expect(m.imagen, `sin imagen: ${m.modelo}`).toBeTruthy();
    });
  });

  it('todos los modelos tienen categoría', () => {
    todos.forEach(m => {
      expect((m as any).categoria, `sin categoría: ${m.modelo}`).toBeTruthy();
    });
  });

  it('el campo stock es boolean o está ausente', () => {
    todos.forEach(m => {
      if ('stock' in m) {
        expect(typeof m.stock, `stock inválido: ${m.modelo}`).toBe('boolean');
      }
    });
  });

  it('genera slugs únicos para todos los modelos', () => {
    const slugs = todos.map(m => toSlug(m.modelo));
    const unicos = new Set(slugs);
    expect(unicos.size).toBe(todos.length);
  });

  it('ningún slug está vacío', () => {
    todos.forEach(m => {
      const slug = toSlug(m.modelo);
      expect(slug, `slug vacío para: ${m.modelo}`).toBeTruthy();
      expect(slug).toMatch(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/);
    });
  });

  it('los modelos Rieju tienen specs', () => {
    rieju.forEach(m => {
      expect(m.specs, `sin specs: ${m.modelo}`).toBeTruthy();
    });
  });

  it('los modelos Sherco tienen specs', () => {
    sherco.forEach(m => {
      expect((m as any).specs, `sin specs: ${m.modelo}`).toBeTruthy();
    });
  });

  it('los modelos no eléctricos tienen cilindrada_cc', () => {
    todos.forEach(m => {
      const specs = (m as any).specs ?? {};
      const esElectrico = specs.potencia_kw != null || /eléctric|electric/i.test(specs.tipo_motor ?? '');
      if (!esElectrico) {
        expect(specs.cilindrada_cc, `sin cilindrada_cc: ${m.modelo}`).toBeTruthy();
      }
    });
  });

  it('cilindrada_cc está en rango válido (1–2000) cuando existe', () => {
    todos.forEach(m => {
      const cc = (m as any).specs?.cilindrada_cc;
      if (cc != null) {
        expect(cc, `cilindrada fuera de rango: ${m.modelo}`).toBeGreaterThan(0);
        expect(cc, `cilindrada fuera de rango: ${m.modelo}`).toBeLessThanOrEqual(2000);
      }
    });
  });
});
