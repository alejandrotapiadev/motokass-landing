import { describe, it, expect } from 'vitest';
import { getAllMotorcycles, getSegments, getMotorcycleBySlug, getFeaturedMotorcycles, MOTO_SEGMENTS, getMotorcyclesBySegment } from '@/lib/catalog/motorcycles';
import { rowToEquipment, availabilityFromStock, variantStock } from '@/lib/catalog/equipment-mapper';
import { applyFilters, computeFacets, sortProducts, EMPTY_FILTERS, filtersFromParams, filtersToParams } from '@/lib/catalog/equipment-filters';
import { getActiveCategories, getCategory, getMegaMenu } from '@/lib/catalog/equipment-categories';
import { discountPercent } from '@/lib/catalog/types';
import { MOCK_EQUIPMENT } from '@/lib/catalog/equipment.mock';
import { equipmentToDoc, motorcycleToDoc, blogToDoc, search, parseQuery } from '@/lib/catalog/search';

describe('motorcycles', () => {
  const all = getAllMotorcycles();

  it('carga los 67 modelos sin inventar precios anteriores', () => {
    expect(all).toHaveLength(67);
    expect(all.every((m) => m.compareAtPrice === null)).toBe(true);
  });

  it('mantiene las URLs /catalogo/[slug]', () => {
    const m = getMotorcycleBySlug('rieju-mr-pro-125');
    expect(m?.url).toBe('/catalogo/rieju-mr-pro-125');
  });

  it('todas las motos tienen al menos un segmento', () => {
    const sin = all.filter((m) => m.segments.length === 0).map((m) => m.name);
    expect(sin).toEqual([]);
  });

  it('cada segmento tiene motos', () => {
    MOTO_SEGMENTS.forEach((s) => expect(getMotorcyclesBySegment(s.slug).length, s.slug).toBeGreaterThan(0));
  });

  it('una trial con arranque eléctrico no es "eléctrica"', () => {
    const ste = getMotorcycleBySlug('sherco-250-st-e-factory-2026');
    expect(ste?.segments).toContain('trial');
    expect(ste?.segments).not.toContain('electricas');
  });

  it('mapea categorías de fabricante a segmentos', () => {
    expect(getSegments({ categoria: 'Travel', subcategoria: 'Adventure', specs: {} })).toEqual(['trail']);
    expect(getSegments({ categoria: 'Eléctrico', subcategoria: 'Scooter Eléctrico', specs: { tipo_motor: 'Eléctrico' } })).toEqual(['ciudad', 'electricas']);
  });

  it('destacadas alternan marcas', () => {
    const f = getFeaturedMotorcycles(4);
    expect(f.map((m) => m.brand)).toEqual(['Rieju', 'Sherco', 'Rieju', 'Sherco']);
  });
});

describe('equipment mapper', () => {
  const row = {
    id: 'x', slug: 'casco-x', sku: 'S', ean: null, brand: 'B', name: 'Casco X', category: 'cascos',
    subcategory: null, type: 'integral', description: null, price: '100.00', compare_at_price: '120',
    images: null, colors: null, sizes: null, stock: null, rating: null, review_count: null,
    features: null, materials: null, technology: null, gender: null, season: null, tags: null,
    badges: null, faq: null,
    equipment_variants: [
      { sku: 'S-N-M', ean: null, color: 'Negro', size: 'M', stock: 2, price: null },
      { sku: 'S-N-L', ean: null, color: 'Negro', size: 'L', stock: 0, price: null },
    ],
  };

  it('convierte numéricos, deriva tallas/colores y añade badge sale', () => {
    const p = rowToEquipment(row);
    expect(p.price).toBe(100);
    expect(p.compareAtPrice).toBe(120);
    expect(p.sizes).toEqual(['M', 'L']);
    expect(p.colors.map((c) => c.name)).toEqual(['Negro']);
    expect(p.stock).toBe(2);
    expect(p.availability).toBe('low_stock');
    expect(p.badges).toContain('sale');
    expect(p.url).toBe('/equipamiento/cascos/casco-x');
    expect(variantStock(p, 'Negro', 'L')).toBe(0);
  });

  it('descarta compare_at_price menor o igual al precio', () => {
    expect(rowToEquipment({ ...row, compare_at_price: '90' }).compareAtPrice).toBeNull();
  });

  it('availabilityFromStock', () => {
    expect(availabilityFromStock(0)).toBe('out_of_stock');
    expect(availabilityFromStock(3)).toBe('low_stock');
    expect(availabilityFromStock(10)).toBe('in_stock');
  });

  it('discountPercent', () => {
    expect(discountPercent({ price: 80, compareAtPrice: 100 })).toBe(20);
    expect(discountPercent({ price: 80, compareAtPrice: null })).toBeNull();
  });

  it('los mocks están marcados como tales', () => {
    expect(MOCK_EQUIPMENT.every((p) => p.isMock && p.name.startsWith('[DEMO]'))).toBe(true);
  });
});

describe('equipment filters', () => {
  const cascos = MOCK_EQUIPMENT.filter((p) => p.category === 'cascos');

  it('filtra por tipo, color y talla con stock', () => {
    expect(applyFilters(cascos, { ...EMPTY_FILTERS, types: ['modular'] })).toHaveLength(1);
    expect(applyFilters(cascos, { ...EMPTY_FILTERS, colors: ['Rojo'] }).map((p) => p.slug)).toEqual(['demo-casco-off-road']);
    const jetEnStock = applyFilters(cascos, { ...EMPTY_FILTERS, inStockOnly: true }).some((p) => p.slug === 'demo-casco-jet');
    expect(jetEnStock).toBe(false);
  });

  it('ordena por precio', () => {
    const asc = sortProducts(cascos, 'price-asc').map((p) => p.price);
    expect(asc).toEqual([...asc].sort((a, b) => a! - b!));
  });

  it('facetas respetan el orden de la categoría', () => {
    const cat = getCategory('cascos')!;
    const f = computeFacets(cascos, cat.types, cat.sizeScale);
    expect(f.sizes.map((s) => s.value)).toEqual(['S', 'M', 'L', 'XL']);
    expect(f.types[0].value).toBe('integral');
  });

  it('serializa filtros en la URL ida y vuelta', () => {
    const f = { ...EMPTY_FILTERS, types: ['integral', 'jet'], sizes: ['M'], inStockOnly: true, priceMax: 200 };
    const p = filtersToParams(f, 'price-asc');
    const back = filtersFromParams(new URLSearchParams(p.toString()));
    expect(back.filters).toEqual(f);
    expect(back.sort).toBe('price-asc');
  });
});

describe('equipment categories', () => {
  it('activa las 5 categorías iniciales en orden', () => {
    expect(getActiveCategories().map((c) => c.slug)).toEqual(['cascos', 'guantes', 'chaquetas', 'camisetas', 'botas']);
  });

  it('las categorías inactivas no resuelven', () => {
    expect(getCategory('pantalones')).toBeUndefined();
  });

  it('el mega menú tiene columnas Cascos, Ropa y Botas', () => {
    expect(getMegaMenu().map((c) => c.title)).toEqual(['Cascos', 'Ropa', 'Botas']);
  });
});

describe('global search', () => {
  const docs = [
    ...getAllMotorcycles().map(motorcycleToDoc),
    ...MOCK_EQUIPMENT.map((p) => equipmentToDoc(p, getCategory(p.category)?.name)),
    blogToDoc({ slug: 'enduro-vs-trial', title: 'Enduro vs Trial', description: 'Diferencias', category: 'Consejos' }),
  ];

  it('parsea color y talla', () => {
    expect(parseQuery('guantes talla L')).toEqual({ terms: ['guantes'], colors: [], sizes: ['L'] });
    expect(parseQuery('casco negro')).toEqual({ terms: ['casco'], colors: ['negro'], sizes: [] });
  });

  it('"casco negro" devuelve solo cascos negros de equipamiento', () => {
    const r = search(docs, 'casco negro');
    expect(r.groups.motorcycle).toHaveLength(0);
    expect(r.groups.equipment.length).toBeGreaterThan(0);
    r.groups.equipment.forEach((d) => {
      expect(d.url).toContain('/equipamiento/cascos/');
      expect(d.colors).toContain('negro');
    });
  });

  it('"Rieju" devuelve motos Rieju', () => {
    const r = search(docs, 'Rieju');
    expect(r.groups.motorcycle.length).toBeGreaterThan(0);
    r.groups.motorcycle.forEach((d) => expect(d.title).toMatch(/Rieju/));
  });

  it('"guantes talla L" devuelve guantes con L en stock', () => {
    const r = search(docs, 'guantes talla L');
    expect(r.groups.equipment.length).toBeGreaterThan(0);
    r.groups.equipment.forEach((d) => {
      expect(d.url).toContain('/guantes/');
      expect(d.sizesInStock).toContain('L');
    });
  });

  it('busca también en el blog', () => {
    expect(search(docs, 'trial').groups.blog).toHaveLength(1);
  });

  it('consulta vacía no devuelve nada', () => {
    expect(search(docs, '  ').total).toBe(0);
  });
});
