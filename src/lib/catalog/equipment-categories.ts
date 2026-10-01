/**
 * Categorías de equipamiento — configuración declarativa.
 *
 * Para añadir una categoría nueva (pantalones, protecciones, monos, mochilas,
 * accesorios…) basta con añadir un objeto a EQUIPMENT_CATEGORIES con
 * `active: true`. Rutas, menú, footer, sitemap, filtros y SEO se generan solos.
 */

export interface FilterOption {
  value: string;
  label: string;
}

export interface EquipmentCategory {
  slug: string;
  name: string;
  /** Nombre en singular, para textos tipo "Ver casco". */
  singular: string;
  /** Icono de línea (clave de icons.ts). */
  icon: string;
  /** Grupo del mega menú. */
  menuGroup: "cascos" | "ropa" | "botas" | "accesorios";
  seo: { title: string; description: string };
  h1: string;
  subtitle: string;
  intro: string;
  /** Opciones del filtro "Tipo" específicas de la categoría. */
  types: FilterOption[];
  /** Orden recomendado de tallas para el selector. */
  sizeScale: string[];
  active: boolean;
  order: number;
}

const APPAREL_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
const HELMET_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const BOOT_SIZES = ["38", "39", "40", "41", "42", "43", "44", "45", "46", "47"];

export const EQUIPMENT_CATEGORIES: EquipmentCategory[] = [
  {
    slug: "cascos",
    name: "Cascos",
    singular: "casco",
    icon: "helmet",
    menuGroup: "cascos",
    seo: {
      title: "Cascos de moto en Ávila | Integral, modular, jet y off-road | MOTOKASS",
      description:
        "Cascos de moto integrales, modulares, jet, off-road y trial. Pruébatelos en nuestra tienda de Ávila o cómpralos online en MOTOKASS.",
    },
    h1: "Cascos para moto",
    subtitle: "Protección, comodidad y diseño para cada tipo de conducción.",
    intro:
      "El casco es la pieza más importante de tu equipamiento. Elige el tipo según cómo y dónde conduces: integral para carretera, modular si viajas, jet para ciudad y off-road o trial para el campo.",
    types: [
      { value: "integral", label: "Integral" },
      { value: "modular", label: "Modular" },
      { value: "jet", label: "Jet" },
      { value: "off-road", label: "Off-road" },
      { value: "trial", label: "Trial" },
      { value: "adventure", label: "Adventure" },
    ],
    sizeScale: HELMET_SIZES,
    active: true,
    order: 1,
  },
  {
    slug: "guantes",
    name: "Guantes",
    singular: "guante",
    icon: "glove",
    menuGroup: "ropa",
    seo: {
      title: "Guantes de moto | Verano, invierno, off-road e impermeables | MOTOKASS",
      description:
        "Guantes de moto de verano, invierno, off-road, urbanos e impermeables. Encuentra tu talla en MOTOKASS Ávila.",
    },
    h1: "Guantes de moto",
    subtitle: "Agarre, tacto y protección en cada estación.",
    intro:
      "Unos buenos guantes protegen tus manos en caso de caída y te dan control sobre los mandos. Elige según la temporada y el tipo de conducción.",
    types: [
      { value: "verano", label: "Verano" },
      { value: "invierno", label: "Invierno" },
      { value: "off-road", label: "Off-road" },
      { value: "urbano", label: "Urbanos" },
      { value: "impermeable", label: "Impermeables" },
    ],
    sizeScale: APPAREL_SIZES,
    active: true,
    order: 4,
  },
  {
    slug: "chaquetas",
    name: "Chaquetas",
    singular: "chaqueta",
    icon: "jacket",
    menuGroup: "ropa",
    seo: {
      title: "Chaquetas de moto | Textil, cuero, adventure y urbanas | MOTOKASS",
      description:
        "Chaquetas de moto textiles y de cuero para verano, invierno, adventure y ciudad. Equípate en MOTOKASS Ávila.",
    },
    h1: "Chaquetas de moto",
    subtitle: "Protección homologada con la comodidad que necesitas en cada ruta.",
    intro:
      "Una chaqueta de moto combina protecciones, resistencia a la abrasión y confort térmico. Textil para versatilidad, cuero para máxima resistencia.",
    types: [
      { value: "textil", label: "Textil" },
      { value: "cuero", label: "Cuero" },
      { value: "verano", label: "Verano" },
      { value: "invierno", label: "Invierno" },
      { value: "adventure", label: "Adventure" },
      { value: "urbana", label: "Urbana" },
    ],
    sizeScale: APPAREL_SIZES,
    active: true,
    order: 2,
  },
  {
    slug: "camisetas",
    name: "Camisetas",
    singular: "camiseta",
    icon: "tshirt",
    menuGroup: "ropa",
    seo: {
      title: "Camisetas moteras y de marca | MOTOKASS Ávila",
      description: "Camisetas para motoristas y de tus marcas favoritas. Disponibles en MOTOKASS Ávila y online.",
    },
    h1: "Camisetas",
    subtitle: "Para cuando te bajas de la moto.",
    intro: "Camisetas de marca y lifestyle para llevar tu pasión por las motos también fuera de la carretera.",
    types: [
      { value: "manga-corta", label: "Manga corta" },
      { value: "manga-larga", label: "Manga larga" },
      { value: "tecnica", label: "Técnica" },
    ],
    sizeScale: APPAREL_SIZES,
    active: true,
    order: 3,
  },
  {
    slug: "botas",
    name: "Botas",
    singular: "bota",
    icon: "boot",
    menuGroup: "botas",
    seo: {
      title: "Botas de moto | Touring, racing, off-road y adventure | MOTOKASS",
      description: "Botas de moto touring, racing, off-road y adventure. Protección para tobillos y pies en MOTOKASS Ávila.",
    },
    h1: "Botas de moto",
    subtitle: "Protección y sujeción desde el primer kilómetro.",
    intro:
      "Las botas de moto protegen tobillo, empeine y talón y mejoran el tacto con los mandos. Elige según tu estilo de conducción.",
    types: [
      { value: "touring", label: "Touring" },
      { value: "racing", label: "Racing" },
      { value: "off-road", label: "Off-road" },
      { value: "adventure", label: "Adventure" },
    ],
    sizeScale: BOOT_SIZES,
    active: true,
    order: 6,
  },
  {
    slug: "pantalones",
    name: "Pantalones",
    singular: "pantalón",
    icon: "pants",
    menuGroup: "ropa",
    seo: { title: "Pantalones de moto | MOTOKASS", description: "Pantalones de moto textiles, vaqueros y de cuero en MOTOKASS Ávila." },
    h1: "Pantalones de moto",
    subtitle: "Protección para las piernas sin renunciar a la comodidad.",
    intro: "Pantalones con protecciones para carretera, viaje y ciudad.",
    types: [
      { value: "textil", label: "Textil" },
      { value: "vaquero", label: "Vaquero" },
      { value: "cuero", label: "Cuero" },
    ],
    sizeScale: APPAREL_SIZES,
    active: true,
    order: 5,
  },
  {
    slug: "accesorios",
    name: "Accesorios",
    singular: "accesorio",
    icon: "bag",
    menuGroup: "accesorios",
    seo: {
      title: "Accesorios para motoristas | MOTOKASS Ávila",
      description: "Accesorios para motoristas: intercomunicadores, mochilas, antirrobos y más en MOTOKASS Ávila.",
    },
    h1: "Accesorios para moto",
    subtitle: "Los complementos que completan tu equipamiento.",
    intro: "Accesorios para ti y para tu moto: todo lo que hace cada salida más cómoda y segura.",
    types: [],
    sizeScale: [],
    active: true,
    order: 7,
  },
  // ── Preparadas para activar cuando haya producto ──
  {
    slug: "protecciones",
    name: "Protecciones",
    singular: "protección",
    icon: "shield",
    menuGroup: "accesorios",
    seo: { title: "Protecciones para moto | MOTOKASS", description: "Petos, rodilleras, espalderas y protecciones para moto en MOTOKASS Ávila." },
    h1: "Protecciones",
    subtitle: "Petos, espalderas, rodilleras y más.",
    intro: "Protecciones para completar tu equipamiento en carretera y off-road.",
    types: [],
    sizeScale: APPAREL_SIZES,
    active: false,
    order: 8,
  },
];

export function getActiveCategories(): EquipmentCategory[] {
  return EQUIPMENT_CATEGORIES.filter((c) => c.active).sort((a, b) => a.order - b.order);
}

export function getCategory(slug: string): EquipmentCategory | undefined {
  return EQUIPMENT_CATEGORIES.find((c) => c.slug === slug && c.active);
}

/** Raíz de la tienda: listado de todas las categorías ("Todos"). */
export const SHOP_URL = "/equipamiento";

export function categoryUrl(slug: string, type?: string): string {
  return `${SHOP_URL}/${slug}${type ? `?tipo=${encodeURIComponent(type)}` : ""}`;
}

/** Tipos de todas las categorías activas (sin repetir) para el filtro "Tipo" de "Todos". */
export function getAllTypes(): FilterOption[] {
  const seen = new Map<string, FilterOption>();
  getActiveCategories().forEach((c) => c.types.forEach((t) => seen.has(t.value) || seen.set(t.value, t)));
  return [...seen.values()];
}

/** Escala de tallas combinada (ropa + calzado) para el listado "Todos". */
export const ALL_SIZES: string[] = [...new Set([...APPAREL_SIZES, ...HELMET_SIZES, ...BOOT_SIZES])];

export function productUrl(categorySlug: string, productSlug: string): string {
  return `/equipamiento/${categorySlug}/${productSlug}`;
}

/**
 * Estructura del mega menú. Los enlaces a subtipos se derivan de `types`,
 * así que al añadir tipos a una categoría aparecen automáticamente.
 */
export interface MegaMenuColumn {
  title: string;
  href: string;
  links: { label: string; href: string }[];
}

export function getMegaMenu(): MegaMenuColumn[] {
  const active = getActiveCategories();
  const cascos = active.find((c) => c.slug === "cascos");
  const botas = active.find((c) => c.slug === "botas");
  const ropa = active.filter((c) => c.menuGroup === "ropa");
  const accesorios = active.filter((c) => c.menuGroup === "accesorios");

  const cols: MegaMenuColumn[] = [];
  if (cascos) {
    cols.push({
      title: "Cascos",
      href: categoryUrl("cascos"),
      links: cascos.types
        .filter((t) => t.value !== "trial")
        .map((t) => ({ label: t.label, href: categoryUrl("cascos", t.value) })),
    });
  }
  if (ropa.length) {
    cols.push({
      title: "Ropa",
      href: "/equipamiento",
      links: ropa.map((c) => ({ label: c.name, href: categoryUrl(c.slug) })),
    });
  }
  if (botas) {
    cols.push({
      title: "Botas",
      href: categoryUrl("botas"),
      links: botas.types.map((t) => ({ label: t.label, href: categoryUrl("botas", t.value) })),
    });
  }
  if (accesorios.length) {
    cols.push({
      title: "Accesorios",
      href: "/equipamiento",
      links: accesorios.map((c) => ({ label: c.name, href: categoryUrl(c.slug) })),
    });
  }
  return cols;
}
