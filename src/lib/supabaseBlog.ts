/**
 * CRUD para la tabla `blog_posts` de Supabase.
 * Posts generados automáticamente por el cron semanal.
 */

import supabase from "./supabase";

// ── Tipos ──────────────────────────────────────────────────────────────────

export interface DynamicPost {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;        // HTML generado por IA
  category: string;
  image: string;
  image_alt: string;
  author: string;
  tags: string[];
  featured: boolean;
  source_urls: string[];
  published_at: string;   // ISO string
  created_at: string;
}

export type NewPost = Omit<DynamicPost, "id" | "created_at">;

// ── Queries ────────────────────────────────────────────────────────────────

/** Devuelve todos los posts dinámicos ordenados por fecha desc. */
export async function getDynamicPosts(
  category?: string
): Promise<DynamicPost[]> {
  let q = supabase
    .from("blog_posts")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(100);

  if (category) q = q.eq("category", category);

  const { data, error } = await q;
  if (error) {
    console.error("[supabaseBlog] getDynamicPosts:", error.message);
    return [];
  }
  return (data as DynamicPost[]) ?? [];
}

/** Busca un post por slug. Devuelve null si no existe. */
export async function getDynamicPostBySlug(
  slug: string
): Promise<DynamicPost | null> {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("[supabaseBlog] getDynamicPostBySlug:", error.message);
    return null;
  }
  return (data as DynamicPost) ?? null;
}

/**
 * Comprueba si ya se ha generado un post en los últimos N días.
 * Evita duplicados si el cron se ejecuta más de una vez.
 */
export async function hasRecentPost(days = 6): Promise<boolean> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { count, error } = await supabase
    .from("blog_posts")
    .select("id", { count: "exact", head: true })
    .gte("published_at", since.toISOString());

  if (error) return false;
  return (count ?? 0) > 0;
}

/** Inserta un nuevo post. Devuelve true si tuvo éxito. */
export async function insertPost(post: NewPost): Promise<boolean> {
  const { error } = await supabase.from("blog_posts").insert(post);
  if (error) {
    console.error("[supabaseBlog] insertPost:", error.message);
    return false;
  }
  return true;
}
