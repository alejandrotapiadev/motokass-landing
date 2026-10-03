/**
 * Construye el índice de búsqueda global en servidor (motos + equipamiento + blog).
 */
import { getCollection } from "astro:content";
import { getAllMotorcycles } from "./motorcycles";
import { getEquipment } from "./equipment";
import { EQUIPMENT_CATEGORIES } from "./equipment-categories";
import { BLOG_ENABLED } from "../site";
import { blogToDoc, equipmentToDoc, motorcycleToDoc, search, type SearchDoc } from "./search";

const TTL_MS = 60_000;
let cached: { at: number; docs: SearchDoc[] } | null = null;

async function getBlogDocs(): Promise<SearchDoc[]> {
  if (!BLOG_ENABLED) return [];
  const statics = (await getCollection("blog")).map((p) =>
    blogToDoc({
      slug: p.id.replace(/\.md$/, ""),
      title: p.data.title,
      description: p.data.description,
      category: p.data.category,
      image: p.data.image,
      tags: p.data.tags,
    }),
  );
  let dynamics: SearchDoc[] = [];
  try {
    if (import.meta.env.SUPABASE_URL) {
      const { getDynamicPosts } = await import("../supabaseBlog");
      dynamics = (await getDynamicPosts()).map((p) =>
        blogToDoc({ slug: p.slug, title: p.title, description: p.description, category: p.category, image: p.image, tags: p.tags }),
      );
    }
  } catch {
    /* blog dinámico opcional */
  }
  return [...statics, ...dynamics];
}

export async function getSearchDocs(): Promise<SearchDoc[]> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.docs;
  const catName = new Map(EQUIPMENT_CATEGORIES.map((c) => [c.slug, c.name]));
  const [{ products }, blog] = await Promise.all([getEquipment(), getBlogDocs()]);
  const docs = [
    ...getAllMotorcycles().map(motorcycleToDoc),
    ...products.map((p) => equipmentToDoc(p, catName.get(p.category))),
    ...blog,
  ];
  cached = { at: Date.now(), docs };
  return docs;
}

export async function searchAll(query: string, limitPerGroup = 6) {
  return search(await getSearchDocs(), query, limitPerGroup);
}
