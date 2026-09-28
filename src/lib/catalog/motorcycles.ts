/**
 * Capa única de acceso al catálogo de motos.
 * Normaliza los JSON de fabricante a MotorcycleProduct. Sustituye a los
 * mapeos duplicados que había en catalogo.astro, comparar.astro y [slug].astro.
 *
 * Si el catálogo se migra a Supabase, solo cambia este archivo.
 */
import RiejuCatalogo from "../../resources/RiejuCatalogo.json";
import ShercoCatalogo from "../../resources/ShercoCatalogo.json";
import { toSlug } from "../slug";
import { getTipoMotor } from "../filtros";
import type { MotorcycleProduct, MotoSegment, MotorcycleSpecs } from "./types";

interface RawModel {
  modelo: string;
  categoria?: string;
  subcategoria?: string;
  año?: number;
  nuevo?: boolean;
  specs: MotorcycleSpecs;
  precio_eur: number | null;
  imagen: string;
  url_ficha?: string;
  stock?: boolean;
}

interface RawCatalog {
  catalogo: { marca: string; modelos: RawModel[] };
}

/* ─────────────── Segmentos comerciales ─────────────── */

export interface MotoSegmentInfo {
  slug: MotoSegment;
  name: string;
  description: string;
}

export const MOTO_SEGMENTS: MotoSegmentInfo[] = [
  { slug: "enduro", name: "Enduro", description: "Off-road, rally y motos de campo" },
  { slug: "trail", name: "Trail", description: "Viaje, adventure y crossover" },
  { slug: "carretera", name: "Carretera", description: "Naked, clásicas y supermotard" },
  { slug: "ciudad", name: "Ciudad", description: "Scooters y movilidad urbana" },
  { slug: "trial", name: "Trial", description: "Trial de competición y paseo" },
  { slug: "electricas", name: "Eléctricas", description: "Cero emisiones" },
];

/**
 * Mapea categoría/subcategoría del fabricante → segmentos MOTOKASS.
 * Ampliar aquí cuando entren nuevas categorías en los JSON.
 */
export function getSegments(raw: Pick<RawModel, "categoria" | "subcategoria" | "specs">): MotoSegment[] {
  const cat = (raw.categoria ?? "").toLowerCase();
  const sub = (raw.subcategoria ?? "").toLowerCase();
  const out = new Set<MotoSegment>();

  if (cat === "off-road" || cat === "enduro" || (cat === "50cc" && sub.includes("enduro"))) out.add("enduro");
  if (cat === "travel" || sub.includes("enduro street")) out.add("trail");
  if (["classic", "naked", "supermotard"].includes(cat) || (cat === "streetbike" && !sub.includes("enduro street")) || (cat === "50cc" && sub.includes("supermoto"))) out.add("carretera");
  if (cat === "scooter" || sub.includes("scooter") || sub === "e-tango" || sub === "profesional") out.add("ciudad");
  if (cat === "trial" || cat === "leisure") out.add("trial");
  if (cat === "eléctrico" || cat === "e-bike" || getTipoMotor({ specs: raw.specs as any }) === "Eléctrico") out.add("electricas");

  return [...out];
}

/* ─────────────── Normalización ─────────────── */

function normalize(marca: string, m: RawModel): MotorcycleProduct {
  const slug = toSlug(m.modelo);
  const stock = m.stock !== false;
  return {
    kind: "motorcycle",
    id: `moto-${slug}`,
    slug,
    url: `/catalogo/${slug}`,
    brand: marca,
    name: m.modelo,
    price: m.precio_eur ?? null,
    compareAtPrice: null, // el JSON no tiene precios anteriores reales
    images: m.imagen ? [m.imagen] : [],
    availability: stock ? "in_stock" : "out_of_stock",
    tags: [m.categoria, m.subcategoria].filter(Boolean) as string[],
    category: m.categoria ?? null,
    subcategory: m.subcategoria ?? null,
    segments: getSegments(m),
    year: m.año ?? null,
    isNew: m.nuevo ?? false,
    specs: m.specs ?? {},
    manufacturerUrl: m.url_ficha ?? null,
  };
}

const rieju = (RiejuCatalogo as RawCatalog).catalogo;
const sherco = (ShercoCatalogo as RawCatalog).catalogo;

const riejuMotos = rieju.modelos.map((m) => normalize(rieju.marca, m));
const shercoMotos = sherco.modelos.map((m) => normalize(sherco.marca, m));

/** Intercalado R1, S1, R2, S2… para no mostrar todas las de una marca seguidas. */
function interleave<T>(a: T[], b: T[]): T[] {
  const out: T[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (i < a.length) out.push(a[i]);
    if (i < b.length) out.push(b[i]);
  }
  return out;
}

const ALL = interleave(riejuMotos, shercoMotos);

export function getAllMotorcycles(): MotorcycleProduct[] {
  return ALL;
}

export function getMotorcycleBySlug(slug: string): MotorcycleProduct | undefined {
  return ALL.find((m) => m.slug === slug);
}

export function getMotorcyclesBySegment(segment: MotoSegment): MotorcycleProduct[] {
  return ALL.filter((m) => m.segments.includes(segment));
}

/**
 * Motos destacadas: novedades con stock primero, después las que tienen
 * precio publicado. Alterna marcas para dar visibilidad a ambas.
 */
export function getFeaturedMotorcycles(limit = 4): MotorcycleProduct[] {
  const score = (m: MotorcycleProduct) =>
    (m.availability === "in_stock" ? 4 : 0) + (m.isNew ? 2 : 0) + (m.price != null ? 1 : 0);
  const byBrand = (brand: string) =>
    ALL.filter((m) => m.brand === brand).sort((a, b) => score(b) - score(a));
  return interleave(byBrand(rieju.marca), byBrand(sherco.marca)).slice(0, limit);
}

/** Imagen representativa de cada segmento (primera moto con stock e imagen). */
export function getSegmentCover(segment: MotoSegment): MotorcycleProduct | undefined {
  return getMotorcyclesBySegment(segment).find((m) => m.availability === "in_stock" && m.images.length);
}

/** Motos con rebaja real (compareAtPrice). Hoy no hay ninguna en los JSON. */
export function getMotorcycleOffers(): MotorcycleProduct[] {
  return ALL.filter((m) => m.compareAtPrice != null && m.price != null && m.compareAtPrice > m.price);
}

/**
 * Formato legado que esperan FilteredMotoList, MotoCard y ComparadorMotos.
 * Mantiene la compatibilidad sin reescribir esos componentes.
 */
export function toLegacyMoto(m: MotorcycleProduct) {
  return {
    marca: m.brand,
    nombre: m.name,
    precio: m.price,
    imagen: m.images[0] ?? "",
    specs: m.specs,
    stock: m.availability !== "out_of_stock",
    nuevo: m.isNew,
    categoria: m.category,
    subcategoria: m.subcategory,
    segmentos: m.segments,
    año: m.year,
  };
}

export const TOTAL_MOTORCYCLES = ALL.length;
