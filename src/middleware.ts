import { defineMiddleware } from "astro:middleware";
import { BLOG_ENABLED } from "./lib/site";

/** Blog oculto (ver BLOG_ENABLED): /blog y /blog/* responden con la página 404. */
export const onRequest = defineMiddleware((context, next) => {
  const path = context.url.pathname.toLowerCase();
  if (!BLOG_ENABLED && (path === "/blog" || path.startsWith("/blog/"))) {
    return context.rewrite(new Request(new URL("/404", context.url)));
  }
  return next();
});
