import { e as createComponent, m as maybeRenderHead, g as addAttribute, r as renderTemplate, l as renderComponent } from '../chunks/astro/server_DrLJit2O.mjs';
import 'piccolore';
import { $ as $$MainLayout } from '../chunks/MainLayout_u9eYjk_v.mjs';
import 'clsx';
/* empty css                                 */
export { renderers } from '../renderers.mjs';

const tiendaBg = new Proxy({"src":"/_astro/tienda.BQReuHP4.png","width":1280,"height":853,"format":"png"}, {
						get(target, name, receiver) {
							if (name === 'clone') {
								return structuredClone(target);
							}
							if (name === 'fsPath') {
								return "C:/proyectos/motokass-landing/src/assets/img/backgrounds/tienda.png";
							}
							
							return target[name];
						}
					});

const tallerBg = new Proxy({"src":"/_astro/taller.CmGCsDex.png","width":3264,"height":1836,"format":"png"}, {
						get(target, name, receiver) {
							if (name === 'clone') {
								return structuredClone(target);
							}
							if (name === 'fsPath') {
								return "C:/proyectos/motokass-landing/src/assets/img/backgrounds/taller.png";
							}
							
							return target[name];
						}
					});

const $$ServiceSelector = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<section class="section fade-in" data-astro-cid-3lcdxzxq> <div class="container" data-astro-cid-3lcdxzxq> <div class="services" data-astro-cid-3lcdxzxq> <a href="/tienda" class="service-card"${addAttribute(`background-image: url('${tiendaBg.src}')`, "style")} data-astro-cid-3lcdxzxq> <h1 data-astro-cid-3lcdxzxq>TIENDA</h1> </a> <a href="/taller" class="service-card"${addAttribute(`background-image: url('${tallerBg.src}')`, "style")} data-astro-cid-3lcdxzxq> <h1 data-astro-cid-3lcdxzxq>TALLER</h1> </a> </div> </div> </section> `;
}, "C:/proyectos/motokass-landing/src/components/ServiceSelector.astro", void 0);

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(raw || cooked.slice()) }));
var _a;
const $$Map = createComponent(($$result, $$props, $$slots) => {
  const direccion = "Moto Kass, \xC1vila";
  const lat = 40.6525721;
  const lng = -4.6851359;
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  return renderTemplate(_a || (_a = __template(["", '<section class="location-section" data-astro-cid-kbkfje74> <div class="container" data-astro-cid-kbkfje74> <div class="location-content" data-astro-cid-kbkfje74> <div class="location-text" data-astro-cid-kbkfje74> <h2 data-astro-cid-kbkfje74>D\xF3nde estamos</h2> <p data-astro-cid-kbkfje74>\nEncuentra nuestro taller f\xE1cilmente. Estamos en una ubicaci\xF3n accesible,\n          con espacio para estacionar y atenci\xF3n personalizada.\n</p> <div class="address-box" data-astro-cid-kbkfje74> <strong data-astro-cid-kbkfje74>Direcci\xF3n:</strong> <span data-astro-cid-kbkfje74>', "</span> </div> <a", ' target="_blank" class="btn-route" data-astro-cid-kbkfje74>\nIniciar ruta en Google Maps\n</a> </div> <div id="map" data-astro-cid-kbkfje74></div> </div> </div> </section> <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"> <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script> <script>\n    const map = L.map("map").setView([40.6525721, -4.6851359], 16);\n\n  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {\n    attribution: "&copy; OpenStreetMap contributors",\n  }).addTo(map);\n\n  const customIcon = L.divIcon({\n    className: "custom-marker",\n    html: `<div class="marker-pin"></div>`,\n    iconSize: [30, 30],\n    iconAnchor: [15, 30],\n  });\n\n\n    L.marker([40.6525721, -4.6851359], { icon: customIcon })\n    .addTo(map)\n    .bindPopup("<b>Motokass</b><br/>Tu taller de confianza")\n    .openPopup();\n<\/script> '], ["", '<section class="location-section" data-astro-cid-kbkfje74> <div class="container" data-astro-cid-kbkfje74> <div class="location-content" data-astro-cid-kbkfje74> <div class="location-text" data-astro-cid-kbkfje74> <h2 data-astro-cid-kbkfje74>D\xF3nde estamos</h2> <p data-astro-cid-kbkfje74>\nEncuentra nuestro taller f\xE1cilmente. Estamos en una ubicaci\xF3n accesible,\n          con espacio para estacionar y atenci\xF3n personalizada.\n</p> <div class="address-box" data-astro-cid-kbkfje74> <strong data-astro-cid-kbkfje74>Direcci\xF3n:</strong> <span data-astro-cid-kbkfje74>', "</span> </div> <a", ' target="_blank" class="btn-route" data-astro-cid-kbkfje74>\nIniciar ruta en Google Maps\n</a> </div> <div id="map" data-astro-cid-kbkfje74></div> </div> </div> </section> <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"> <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script> <script>\n    const map = L.map("map").setView([40.6525721, -4.6851359], 16);\n\n  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {\n    attribution: "&copy; OpenStreetMap contributors",\n  }).addTo(map);\n\n  const customIcon = L.divIcon({\n    className: "custom-marker",\n    html: \\`<div class="marker-pin"></div>\\`,\n    iconSize: [30, 30],\n    iconAnchor: [15, 30],\n  });\n\n\n    L.marker([40.6525721, -4.6851359], { icon: customIcon })\n    .addTo(map)\n    .bindPopup("<b>Motokass</b><br/>Tu taller de confianza")\n    .openPopup();\n<\/script> '])), maybeRenderHead(), direccion, addAttribute(googleMapsUrl, "href"));
}, "C:/proyectos/motokass-landing/src/components/Map.astro", void 0);

const $$Index = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "MainLayout", $$MainLayout, { "title": "MOTOKASS - Tienda y Taller de Motos", "description": "MOTOKASS es tu tienda y taller mec\xE1nico de motos en \xC1vila. Venta de motos Rieju y Sherco, mantenimiento y reparaci\xF3n profesional." }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "ServiceSelector", $$ServiceSelector, {})} ${renderComponent($$result2, "Map", $$Map, {})} ` })}`;
}, "C:/proyectos/motokass-landing/src/pages/index.astro", void 0);

const $$file = "C:/proyectos/motokass-landing/src/pages/index.astro";
const $$url = "";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
	__proto__: null,
	default: $$Index,
	file: $$file,
	url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
