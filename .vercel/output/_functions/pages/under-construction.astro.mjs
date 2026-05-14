import { e as createComponent, l as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_DrLJit2O.mjs';
import 'piccolore';
import { $ as $$MainLayout } from '../chunks/MainLayout_u9eYjk_v.mjs';
/* empty css                                              */
export { renderers } from '../renderers.mjs';

const $$UnderConstruction = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "MainLayout", $$MainLayout, { "title": "Secci\xF3n en construcci\xF3n", "description": "La secci\xF3n que intentas acceder est\xE1 en construcci\xF3n.", "data-astro-cid-2flqetzf": true }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<section class="under-construction" data-astro-cid-2flqetzf> <div class="uc-card" data-astro-cid-2flqetzf> <div class="uc-icon" data-astro-cid-2flqetzf>🏗️</div> <h1 data-astro-cid-2flqetzf>Sección en construcción</h1> <p data-astro-cid-2flqetzf>
La página a la que intentas acceder está actualmente en desarrollo.
        Estamos trabajando para ofrecerte la mejor experiencia posible.
</p> <a href="/" class="uc-button" data-astro-cid-2flqetzf>
Volver al inicio
</a> </div> </section> ` })} `;
}, "C:/proyectos/motokass-landing/src/pages/under-construction.astro", void 0);

const $$file = "C:/proyectos/motokass-landing/src/pages/under-construction.astro";
const $$url = "/under-construction";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$UnderConstruction,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
