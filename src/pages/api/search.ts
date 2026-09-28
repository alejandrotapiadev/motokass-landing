export const prerender = false;
import type { APIRoute } from "astro";
import { searchAll } from "@/lib/catalog/search-index";

export const GET: APIRoute = async ({ url }) => {
  const q = (url.searchParams.get("q") ?? "").slice(0, 80);
  const limit = Math.min(Number(url.searchParams.get("limit")) || 5, 24);
  const { groups, total } = await searchAll(q, limit);

  // No exponer el índice interno (haystack, etc.)
  const slim = Object.fromEntries(
    Object.entries(groups).map(([k, docs]) => [
      k,
      docs.map(({ group, id, title, subtitle, url, image, price }) => ({ group, id, title, subtitle, url, image, price })),
    ]),
  );

  return new Response(JSON.stringify({ total, groups: slim }), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
    },
  });
};
