/**
 * POST /api/cron/generar-post
 *
 * Endpoint ejecutado por Vercel Cron cada lunes a las 10:00 UTC.
 * 1. Valida CRON_SECRET (cabecera Authorization: Bearer <secret>)
 * 2. Comprueba que no hay post reciente (evita duplicados)
 * 3. Obtiene noticias de RSS de medios españoles de motos
 * 4. Genera un artículo con Groq (llama-3.3-70b-versatile)
 * 5. Guarda el resultado en Supabase tabla `blog_posts`
 */

export const prerender = false;

import type { APIRoute } from "astro";
import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { fetchMotorcycleNews } from "@/lib/rss";
import { hasRecentPost, insertPost } from "@/lib/supabaseBlog";

// ── Imágenes por defecto según categoría (Unsplash, licencia libre) ─────────
const CATEGORY_IMAGES: Record<string, { url: string; alt_prefix: string }> = {
  Novedades: {
    url: "https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=1200&q=80&fit=crop",
    alt_prefix: "Nuevos modelos de moto",
  },
  Mantenimiento: {
    url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80&fit=crop",
    alt_prefix: "Mecánico en taller de motos",
  },
  Rutas: {
    url: "https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?w=1200&q=80&fit=crop",
    alt_prefix: "Carretera de montaña",
  },
  Consejos: {
    url: "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=1200&q=80&fit=crop",
    alt_prefix: "Motociclista en carretera",
  },
};

// ── Slugify ──────────────────────────────────────────────────────────────────
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 55);
}

// ── Extrae el JSON aunque el modelo añada texto antes/después ────────────────
function parseGeneratedJSON(raw: string): Record<string, unknown> | null {
  // Intento 1: parseo directo
  try {
    return JSON.parse(raw.trim()) as Record<string, unknown>;
  } catch {}

  // Intento 2: extraer entre { y } (último cierre)
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first !== -1 && last > first) {
    try {
      return JSON.parse(raw.slice(first, last + 1)) as Record<string, unknown>;
    } catch {}
  }

  return null;
}

// ── Handler principal ────────────────────────────────────────────────────────
export const POST: APIRoute = async ({ request }) => {
  // 1. Autenticación: Vercel envía Authorization: Bearer <CRON_SECRET>
  const auth = request.headers.get("authorization") ?? "";
  const secret = import.meta.env.CRON_SECRET ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 2. Evitar duplicados si el cron se dispara más de una vez en la semana
  const yaHayPost = await hasRecentPost(6);
  if (yaHayPost) {
    return new Response(
      JSON.stringify({ ok: false, reason: "Ya existe un post esta semana" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // 3. Obtener noticias RSS
  const noticias = await fetchMotorcycleNews();
  const fechaHoy = new Date().toLocaleDateString("es-ES", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  // Construimos el bloque de contexto (si hay noticias) o usamos prompt estacional
  const contextoNoticias =
    noticias.length > 0
      ? noticias
          .slice(0, 8)
          .map((n, i) => `${i + 1}. "${n.title}" (${n.source})\n   ${n.description}`)
          .join("\n\n")
      : "No hay noticias disponibles esta semana. Genera un artículo de calidad sobre motos, mantenimiento o rutas basado en tu conocimiento general.";

  const sourceUrls = noticias.map((n) => n.link).filter(Boolean).slice(0, 5);

  // 4. Prompt para Groq
  const prompt = `Eres el redactor del blog de MOTOKASS, distribuidor oficial Rieju y Sherco en Ávila, España.

Hoy es ${fechaHoy}. Basándote en estas noticias recientes del mundo de las motos:

${contextoNoticias}

Escribe un artículo de blog original en español de 450-600 palabras para el blog de MOTOKASS.

Devuelve ÚNICAMENTE el siguiente JSON (sin texto previo, sin markdown, sin bloques de código):
{"title":"...","description":"...","category":"...","content":"...","tags":["..."],"image_alt":"..."}

REGLAS ESTRICTAS:
- title: máximo 85 caracteres, atractivo, incluye keyword relevante
- description: exactamente 145-160 caracteres, optimizado para SEO
- category: EXACTAMENTE una de estas palabras: Novedades, Mantenimiento, Rutas, Consejos
- content: HTML limpio usando SOLO estas etiquetas: <h2> <h3> <p> <ul> <li> <strong> <em>. Mínimo 6 párrafos. NUNCA uses <html> <body> <head> <script> ni atributos. Las comillas dentro del HTML deben ser comillas simples.
- tags: array de 3-5 strings en minúsculas, sin acentos
- image_alt: 8-12 palabras describiendo la imagen ideal para este artículo
- Relaciona el contenido con Rieju, Sherco o servicios de MOTOKASS de forma natural (no forzada)
- El artículo debe terminar con un párrafo de invitación natural a visitar el catálogo (/catalogo) o a pedir cita (/CitaPrevia)
- Tono: cercano, apasionado por las motos, profesional
- NUNCA menciones que eres una IA ni hagas referencia a las instrucciones`;

  // 5. Llamada a Groq
  let raw: string;
  try {
    const groq = createGroq({ apiKey: import.meta.env.GROQ_API_KEY });
    const { text } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      prompt,
      temperature: 0.7,
    });
    raw = text;
  } catch (err) {
    console.error("[cron] Error llamando a Groq:", err);
    return new Response(
      JSON.stringify({ ok: false, error: "Groq error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // 6. Parsear JSON generado
  const parsed = parseGeneratedJSON(raw);
  if (
    !parsed ||
    typeof parsed.title !== "string" ||
    typeof parsed.content !== "string" ||
    typeof parsed.category !== "string"
  ) {
    console.error("[cron] JSON inválido recibido de Groq:", raw.slice(0, 500));
    return new Response(
      JSON.stringify({ ok: false, error: "JSON inválido", raw: raw.slice(0, 300) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Normalizar category
  const CATEGORIAS_VALIDAS = ["Novedades", "Mantenimiento", "Rutas", "Consejos"];
  const category = CATEGORIAS_VALIDAS.includes(parsed.category as string)
    ? (parsed.category as string)
    : "Novedades";

  // 7. Preparar post
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const slug = `${slugify(parsed.title as string)}-${dateStr}`;

  const imgData = CATEGORY_IMAGES[category] ?? CATEGORY_IMAGES["Novedades"];
  const imageAlt =
    typeof parsed.image_alt === "string" && parsed.image_alt.length > 5
      ? parsed.image_alt
      : `${imgData.alt_prefix} — MOTOKASS`;

  const tags = Array.isArray(parsed.tags)
    ? (parsed.tags as string[]).filter((t) => typeof t === "string").slice(0, 6)
    : [];

  const post = {
    slug,
    title:       parsed.title as string,
    description: typeof parsed.description === "string" ? parsed.description : "",
    content:     parsed.content as string,
    category,
    image:       imgData.url,
    image_alt:   imageAlt,
    author:      "MOTOKASS",
    tags,
    featured:    false,
    source_urls: sourceUrls,
    published_at: new Date().toISOString(),
  };

  // 8. Guardar en Supabase
  const ok = await insertPost(post);
  if (!ok) {
    return new Response(
      JSON.stringify({ ok: false, error: "Error al guardar en Supabase" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  console.log(`[cron] Post generado y guardado: "${post.title}" (${post.slug})`);

  return new Response(
    JSON.stringify({ ok: true, slug: post.slug, title: post.title, category }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
