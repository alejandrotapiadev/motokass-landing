export const prerender = false;
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { getAllMotorcycles } from "@/lib/catalog/motorcycles";
import { getActiveCategories } from "@/lib/catalog/equipment-categories";
import { getEquipment } from "@/lib/catalog/equipment";
import { BLOG_ENABLED, COMPARE_ENABLED } from "@/lib/site";

/**
 * Sitemap dinámico (sustituye al public/sitemap.xml mantenido a mano).
 * Incluye motos, categorías/productos de equipamiento reales y blog.
 */
const SITE = "https://motokass.com";

interface Entry {
  path: string;
  priority: number;
  changefreq: "daily" | "weekly" | "monthly";
  lastmod?: string;
}

const today = new Date().toISOString().slice(0, 10);

export const GET: APIRoute = async () => {
  const entries: Entry[] = [
    { path: "/", priority: 1.0, changefreq: "weekly" },
    { path: "/catalogo", priority: 0.9, changefreq: "weekly" },
    { path: "/equipamiento", priority: 0.9, changefreq: "weekly" },
    { path: "/taller", priority: 0.8, changefreq: "monthly" },
    { path: "/Ofertas", priority: 0.8, changefreq: "weekly" },
    { path: "/contacto", priority: 0.7, changefreq: "monthly" },
    { path: "/CitaPrevia", priority: 0.7, changefreq: "monthly" },
    { path: "/faq", priority: 0.6, changefreq: "monthly" },
  ];

  if (COMPARE_ENABLED) entries.push({ path: "/comparar", priority: 0.6, changefreq: "monthly" });

  for (const m of getAllMotorcycles()) entries.push({ path: m.url, priority: 0.6, changefreq: "monthly" });

  for (const c of getActiveCategories()) entries.push({ path: `/equipamiento/${c.slug}`, priority: 0.8, changefreq: "weekly" });

  const { products, source } = await getEquipment();
  if (source === "supabase") {
    for (const p of products) entries.push({ path: p.url, priority: 0.6, changefreq: "weekly" });
  }

  if (BLOG_ENABLED) {
    entries.push({ path: "/blog", priority: 0.7, changefreq: "weekly" });
    for (const post of await getCollection("blog")) {
      entries.push({
        path: `/blog/${post.id.replace(/\.md$/, "")}`,
        priority: 0.5,
        changefreq: "monthly",
        lastmod: post.data.date.toISOString().slice(0, 10),
      });
    }
    try {
      if (import.meta.env.SUPABASE_URL) {
        const { getDynamicPosts } = await import("@/lib/supabaseBlog");
        for (const p of await getDynamicPosts()) {
          entries.push({ path: `/blog/${p.slug}`, priority: 0.5, changefreq: "monthly", lastmod: p.published_at.slice(0, 10) });
        }
      }
    } catch {
      /* blog dinámico opcional */
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (e) => `  <url>
    <loc>${SITE}${encodeURI(e.path)}</loc>
    <lastmod>${e.lastmod ?? today}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority.toFixed(1)}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
};
