import { e as createComponent, l as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_DrLJit2O.mjs';
import 'piccolore';
import { $ as $$MainLayout } from '../chunks/MainLayout_u9eYjk_v.mjs';
/* empty css                                    */
export { renderers } from '../renderers.mjs';

const $$Contacto = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "MainLayout", $$MainLayout, { "data-astro-cid-2mxdoeuz": true }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<section class="contact" data-astro-cid-2mxdoeuz> <div class="contact__overlay" data-astro-cid-2mxdoeuz> <div class="contact__container" data-astro-cid-2mxdoeuz> <header class="contact__header" data-astro-cid-2mxdoeuz> <h1 data-astro-cid-2mxdoeuz>Contacto</h1> <p data-astro-cid-2mxdoeuz>
Cuéntanos qué necesita tu moto y te responderemos lo antes posible.
</p> </header> <div class="contact__card" data-astro-cid-2mxdoeuz> <form class="form" method="POST" action="#" data-astro-cid-2mxdoeuz> <div class="form__group" data-astro-cid-2mxdoeuz> <input type="text" id="name" name="name" required placeholder=" " data-astro-cid-2mxdoeuz> <label for="name" data-astro-cid-2mxdoeuz>Nombre</label> </div> <div class="form__group" data-astro-cid-2mxdoeuz> <input type="email" id="email" name="email" required placeholder=" " data-astro-cid-2mxdoeuz> <label for="email" data-astro-cid-2mxdoeuz>Email</label> </div> <div class="form__group" data-astro-cid-2mxdoeuz> <input type="tel" id="phone" name="phone" placeholder=" " data-astro-cid-2mxdoeuz> <label for="phone" data-astro-cid-2mxdoeuz>Teléfono (opcional)</label> </div> <div class="form__group" data-astro-cid-2mxdoeuz> <textarea id="message" name="message" rows="5" required placeholder=" " data-astro-cid-2mxdoeuz></textarea> <label for="message" data-astro-cid-2mxdoeuz>Mensaje</label> </div> <button type="submit" class="btn-primary" data-astro-cid-2mxdoeuz>
Enviar mensaje
</button> <div class="linea" data-astro-cid-2mxdoeuz></div> <button type="submit" class="btn-primary btn-llamar" data-astro-cid-2mxdoeuz>
llamar
</button> </form> </div> </div> </div> </section> ` })} `;
}, "C:/proyectos/motokass-landing/src/pages/contacto.astro", void 0);

const $$file = "C:/proyectos/motokass-landing/src/pages/contacto.astro";
const $$url = "/contacto";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Contacto,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
