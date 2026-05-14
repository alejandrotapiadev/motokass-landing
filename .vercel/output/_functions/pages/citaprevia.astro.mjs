import { e as createComponent, l as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_DrLJit2O.mjs';
import 'piccolore';
import { $ as $$MainLayout } from '../chunks/MainLayout_u9eYjk_v.mjs';
/* empty css                                      */
export { renderers } from '../renderers.mjs';

const $$CitaPrevia = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "MainLayout", $$MainLayout, { "title": "Agendar Cita | MOTOKASS Taller de Motos", "description": "Reserva tu cita en el taller de MOTOKASS. Mantenimiento, revisi\xF3n, reparaci\xF3n y diagn\xF3stico para tu moto.", "data-astro-cid-vylzpkyy": true }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="container" data-astro-cid-vylzpkyy> <h1 data-astro-cid-vylzpkyy>Agendar una cita</h1> <form method="post" action="/api/agendar-cita" data-astro-cid-vylzpkyy> <label for="fecha" data-astro-cid-vylzpkyy>Fecha de la cita</label> <input type="date" id="fecha" name="fecha" required data-astro-cid-vylzpkyy> <label for="hora" data-astro-cid-vylzpkyy>Hora</label> <select id="hora" name="hora" required data-astro-cid-vylzpkyy> <option value="" data-astro-cid-vylzpkyy>Selecciona una hora</option> <option value="09:00" data-astro-cid-vylzpkyy>09:00</option> <option value="10:00" data-astro-cid-vylzpkyy>10:00</option> <option value="11:00" data-astro-cid-vylzpkyy>11:00</option> <option value="12:00" data-astro-cid-vylzpkyy>12:00</option> <option value="16:00" data-astro-cid-vylzpkyy>16:00</option> <option value="17:00" data-astro-cid-vylzpkyy>17:00</option> </select> <label for="vehiculo" data-astro-cid-vylzpkyy>Vehículo</label> <input type="text" id="vehiculo" name="vehiculo" placeholder="Ej: Rieju MRT 50 2023" required data-astro-cid-vylzpkyy> <label for="motivo" data-astro-cid-vylzpkyy>Motivo</label> <select id="motivo" name="motivo" required data-astro-cid-vylzpkyy> <option value="" data-astro-cid-vylzpkyy>Selecciona un motivo</option> <option value="mantenimiento" data-astro-cid-vylzpkyy>Mantenimiento</option> <option value="revision" data-astro-cid-vylzpkyy>Revisión</option> <option value="reparacion" data-astro-cid-vylzpkyy>Reparación</option> <option value="diagnostico" data-astro-cid-vylzpkyy>Diagnóstico</option> <option value="otro" data-astro-cid-vylzpkyy>Otro</option> </select> <label for="resumen" data-astro-cid-vylzpkyy>Resumen</label> <textarea id="resumen" name="resumen" placeholder="Describe brevemente el problema o servicio solicitado" data-astro-cid-vylzpkyy></textarea> <button type="submit" data-astro-cid-vylzpkyy>Agendar cita</button> </form> </div> ` })} `;
}, "C:/proyectos/motokass-landing/src/pages/CitaPrevia.astro", void 0);

const $$file = "C:/proyectos/motokass-landing/src/pages/CitaPrevia.astro";
const $$url = "/CitaPrevia";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$CitaPrevia,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
