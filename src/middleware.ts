import { defineMiddleware } from "astro:middleware";
import { BLOG_ENABLED, COMPARE_ENABLED } from "./lib/site";

/**
 * Secciones ocultas (ver BLOG_ENABLED y COMPARE_ENABLED en lib/site.ts):
 * sus rutas responden con la página 404.
 */
export const onRequest = defineMiddleware((context, next) => {
  const path = context.url.pathname.toLowerCase().replace(/\/$/, "");
  const blogHidden = !BLOG_ENABLED && (path === "/blog" || path.startsWith("/blog/"));
  const compareHidden = !COMPARE_ENABLED && path === "/comparar";
  if (blogHidden || compareHidden) {
    return context.rewrite(new Request(new URL("/404", context.url)));
  }
  return next();
});
