import { e as createComponent, k as renderHead, r as renderTemplate } from '../chunks/astro/server_DrLJit2O.mjs';
import 'piccolore';
import 'clsx';
/* empty css                               */
export { renderers } from '../renderers.mjs';

const $$404 = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`<html lang="es" data-astro-cid-zetdm5md> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Error 404 | Motokass</title>${renderHead()}</head> <body data-astro-cid-zetdm5md> <div class="container" data-astro-cid-zetdm5md> <div class="error-code" data-astro-cid-zetdm5md>404</div> <div class="divider" data-astro-cid-zetdm5md></div> <h1 data-astro-cid-zetdm5md>Página no encontrada</h1> <p data-astro-cid-zetdm5md>
La ruta que intentas acceder no existe o ha sido movida.
</p> <a href="/" class="btn" data-astro-cid-zetdm5md>Volver al inicio</a> </div> <footer data-astro-cid-zetdm5md>
© ${(/* @__PURE__ */ new Date()).getFullYear()} Motokass. Todos los derechos reservados.
</footer> </body></html>`;
}, "C:/proyectos/motokass-landing/src/pages/404.astro", void 0);

const $$file = "C:/proyectos/motokass-landing/src/pages/404.astro";
const $$url = "/404";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$404,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
