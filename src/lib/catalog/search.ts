/**
 * Buscador global (puro). Indexa motos, equipamiento y blog en documentos
 * homogéneos y devuelve resultados agrupados.
 *
 * Entiende consultas tipo:
 *   "casco negro"      → equipamiento, categoría cascos, color negro
 *   "Rieju"            → motos Rieju + productos de la marca Rieju
 *   "guantes talla L"  → guantes con talla L disponible
 */
import type { EquipmentProduct, MotorcycleProduct } from "./types";
import { AVAILABILITY_LABEL } from "./types";

export type SearchGroup = "motorcycle" | "equipment" | "blog";

export interface SearchDoc {
  group: SearchGroup;
  id: string;
  title: string;
  subtitle: string;
  url: string;
  image: string | null;
  price: number | null;
  /** Texto normalizado donde se busca. */
  haystack: string;
  /** Solo el título normalizado, para puntuar. */
  titleNorm: string;
  colors: string[];
  /** Tallas con stock (equipamiento). */
  sizesInStock: string[];
  sizes: string[];
}

export interface BlogDocInput {
  slug: string;
  title: string;
  description: string;
  category: string;
  image?: string | null;
  tags?: string[];
}

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9.\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Singulariza de forma simple (cascos→casco, guantes→guante, botas→bota). */
function stem(w: string): string {
  if (w.length > 4 && w.endsWith("es") && !w.endsWith("ies")) return w.slice(0, -1);
  if (w.length > 3 && w.endsWith("s")) return w.slice(0, -1);
  return w;
}

const STOP = new Set(["de", "del", "la", "el", "los", "las", "para", "con", "en", "y", "un", "una", "por"]);

const COLOR_WORDS: Record<string, string> = {
  negro: "negro", negra: "negro", negros: "negro", negras: "negro",
  blanco: "blanco", blanca: "blanco", blancos: "blanco", blancas: "blanco",
  rojo: "rojo", roja: "rojo", rojos: "rojo", rojas: "rojo",
  azul: "azul", azules: "azul",
  gris: "gris", grises: "gris",
  verde: "verde", verdes: "verde",
  amarillo: "amarillo", amarilla: "amarillo", amarillos: "amarillo",
  naranja: "naranja", naranjas: "naranja",
  rosa: "rosa", rosas: "rosa",
  marron: "marron", marrones: "marron",
  plata: "plata", plateado: "plata",
};

const SIZE_TOKENS = new Set(["xxs", "xs", "s", "m", "l", "xl", "xxl", "2xl", "3xl", "4xl"]);

export interface ParsedQuery {
  terms: string[];
  colors: string[];
  sizes: string[];
}

export function parseQuery(q: string): ParsedQuery {
  const words = normalize(q).split(" ").filter(Boolean);
  const terms: string[] = [];
  const colors: string[] = [];
  const sizes: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (w === "talla" && words[i + 1]) {
      sizes.push(words[++i].toUpperCase());
      continue;
    }
    if (SIZE_TOKENS.has(w) && w.length <= 4 && (w !== "s" || words.length > 1)) {
      sizes.push(w.toUpperCase());
      continue;
    }
    if (COLOR_WORDS[w]) {
      colors.push(COLOR_WORDS[w]);
      continue;
    }
    if (STOP.has(w)) continue;
    terms.push(w);
  }
  return { terms, colors, sizes };
}

/* ─────────────── Construcción del índice ─────────────── */

export function motorcycleToDoc(m: MotorcycleProduct): SearchDoc {
  const cc = m.specs.cilindrada_cc ? `${m.specs.cilindrada_cc}cc ${m.specs.cilindrada_cc} cc` : "";
  const text = [m.brand, m.name, m.category, m.subcategory, m.segments.join(" "), cc, m.specs.tipo_motor, "moto motos"]
    .filter(Boolean)
    .join(" ");
  return {
    group: "motorcycle",
    id: m.id,
    title: m.name,
    subtitle: [m.brand, m.category, m.specs.cilindrada_cc ? `${m.specs.cilindrada_cc} cc` : null].filter(Boolean).join(" · "),
    url: m.url,
    image: m.images[0] ?? null,
    price: m.price,
    haystack: normalize(text),
    titleNorm: normalize(m.name),
    colors: [],
    sizesInStock: [],
    sizes: [],
  };
}

export function equipmentToDoc(p: EquipmentProduct, categoryName?: string): SearchDoc {
  const colors = p.colors.map((c) => normalize(c.name));
  const sizesInStock = p.variants.length
    ? [...new Set(p.variants.filter((v) => v.stock > 0 && v.size).map((v) => v.size!.toUpperCase()))]
    : p.stock > 0 ? p.sizes.map((s) => s.toUpperCase()) : [];
  const text = [p.brand, p.name, p.category, categoryName, p.type, p.subcategory, p.tags.join(" "), colors.join(" "), p.sku]
    .filter(Boolean)
    .join(" ");
  return {
    group: "equipment",
    id: p.id,
    title: p.name,
    subtitle: [p.brand, categoryName ?? p.category, AVAILABILITY_LABEL[p.availability]].filter(Boolean).join(" · "),
    url: p.url,
    image: p.images[0] ?? null,
    price: p.price,
    haystack: normalize(text),
    titleNorm: normalize(p.name),
    colors,
    sizesInStock,
    sizes: p.sizes.map((s) => s.toUpperCase()),
  };
}

export function blogToDoc(b: BlogDocInput): SearchDoc {
  return {
    group: "blog",
    id: `blog-${b.slug}`,
    title: b.title,
    subtitle: b.category,
    url: `/blog/${b.slug}`,
    image: b.image ?? null,
    price: null,
    haystack: normalize([b.title, b.description, b.category, (b.tags ?? []).join(" ")].join(" ")),
    titleNorm: normalize(b.title),
    colors: [],
    sizesInStock: [],
    sizes: [],
  };
}

/* ─────────────── Búsqueda ─────────────── */

function termMatches(term: string, haystackWords: string[]): boolean {
  const t = stem(term);
  return haystackWords.some((w) => w.startsWith(term) || stem(w).startsWith(t) || (term.length >= 4 && w.includes(term)));
}

function scoreDoc(doc: SearchDoc, q: ParsedQuery): number {
  const words = doc.haystack.split(" ");
  const titleWords = doc.titleNorm.split(" ");

  // Filtros de atributo (color / talla) solo aplican a productos con atributos
  if (q.sizes.length) {
    if (doc.group !== "equipment") return 0;
    if (!q.sizes.some((s) => doc.sizesInStock.includes(s))) return 0;
  }
  if (q.colors.length) {
    const colorHit = q.colors.some((c) => doc.colors.some((dc) => dc.includes(c)) || words.includes(c));
    if (!colorHit) return 0;
  }

  if (!q.terms.length) return q.sizes.length || q.colors.length ? 1 : 0;

  let score = 0;
  for (const term of q.terms) {
    if (!termMatches(term, words)) return 0; // AND
    score += termMatches(term, titleWords) ? 3 : 1;
    if (titleWords[0]?.startsWith(term)) score += 1;
  }
  return score;
}

export interface SearchResults {
  query: string;
  parsed: ParsedQuery;
  groups: Record<SearchGroup, SearchDoc[]>;
  total: number;
}

export function search(docs: SearchDoc[], query: string, limitPerGroup = 6): SearchResults {
  const parsed = parseQuery(query);
  const groups: Record<SearchGroup, SearchDoc[]> = { motorcycle: [], equipment: [], blog: [] };
  if (!parsed.terms.length && !parsed.colors.length && !parsed.sizes.length) {
    return { query, parsed, groups, total: 0 };
  }
  const scored = docs
    .map((d) => ({ d, s: scoreDoc(d, parsed) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);

  let total = 0;
  for (const { d } of scored) {
    total++;
    if (groups[d.group].length < limitPerGroup) groups[d.group].push(d);
  }
  return { query, parsed, groups, total };
}

export const GROUP_LABEL: Record<SearchGroup, string> = {
  motorcycle: "Motos",
  equipment: "Equipamiento",
  blog: "Blog",
};
