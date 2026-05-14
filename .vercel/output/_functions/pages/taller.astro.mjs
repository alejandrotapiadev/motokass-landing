import { e as createComponent, l as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_DrLJit2O.mjs';
import 'piccolore';
import { $ as $$MainLayout } from '../chunks/MainLayout_u9eYjk_v.mjs';
/* empty css                                  */
export { renderers } from '../renderers.mjs';

const $$Taller = createComponent(($$result, $$props, $$slots) => {
  const servicios = [
    { titulo: "Cambio de aceite", descripcion: "Mantenimiento esencial para alargar la vida del motor." },
    { titulo: "Frenos y suspensiones", descripcion: "Seguridad y control en cada curva." },
    { titulo: "Diagn\xF3stico electr\xF3nico", descripcion: "Revisi\xF3n completa con herramientas profesionales." },
    { titulo: "Revisi\xF3n general", descripcion: "Puesta a punto completa de tu moto." }
  ];
  return renderTemplate`${renderComponent($$result, "MainLayout", $$MainLayout, { "title": "MOTOKASS taller - servicios de mantenimiento y reparaci\xF3n", "description": "MOTOKASS ofrece servicios profesionales de taller mec\xE1nico para motos. Desde cambios de aceite hasta diagn\xF3sticos electr\xF3nicos. \xA1Cuida tu moto con nosotros!", "data-astro-cid-cl33sx3c": true }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<section class="section" data-astro-cid-cl33sx3c> <div class="container" data-astro-cid-cl33sx3c> <div class="top_header" data-astro-cid-cl33sx3c> <h1 data-astro-cid-cl33sx3c>Taller Mecanico</h1> <p class="section-subtitle" data-astro-cid-cl33sx3c>Cuidamos tu moto como si fuera nuestra.</p> </div> <!-- Servicios --> <div class="grid" data-astro-cid-cl33sx3c> ${servicios.map((s) => renderTemplate`<div class="service-card" data-astro-cid-cl33sx3c> <h3 data-astro-cid-cl33sx3c>${s.titulo}</h3> <p data-astro-cid-cl33sx3c>${s.descripcion}</p> </div>`)} </div> <!-- Sección Agendar cita --> <section class="cita-section" data-astro-cid-cl33sx3c> <h2 data-astro-cid-cl33sx3c>Agendar cita</h2> <p data-astro-cid-cl33sx3c>Más adelante podrás reservar una cita directamente desde aquí.</p> <a href="/citaPrevia" data-astro-cid-cl33sx3c><button class="btn-primary" data-astro-cid-cl33sx3c>Agendar cita</button></a> </section> </div> </section> ` })} `;
}, "C:/proyectos/motokass-landing/src/pages/taller.astro", void 0);

const $$file = "C:/proyectos/motokass-landing/src/pages/taller.astro";
const $$url = "/taller";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Taller,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
