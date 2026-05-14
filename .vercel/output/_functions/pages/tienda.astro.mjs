import { e as createComponent, l as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_DrLJit2O.mjs';
import 'piccolore';
import { $ as $$MainLayout } from '../chunks/MainLayout_u9eYjk_v.mjs';
import { jsxs, Fragment, jsx } from 'react/jsx-runtime';
import { useState, useMemo } from 'react';
/* empty css                                  */
export { renderers } from '../renderers.mjs';

function MotoCard({ marca, nombre, precio, imagen }) {
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs("div", { className: "moto-card", children: [
      imagen && /* @__PURE__ */ jsx("img", { src: imagen, alt: nombre }),
      /* @__PURE__ */ jsxs("div", { className: "moto-info", children: [
        /* @__PURE__ */ jsx("span", { className: `moto-brand ${marca.toLowerCase()}`, children: marca }),
        /* @__PURE__ */ jsx("h3", { children: nombre }),
        /* @__PURE__ */ jsxs("span", { className: "price", children: [
          precio,
          " €"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx("style", { children: `
        .moto-card {
          background: white;
          border-radius: 1rem;
          overflow: hidden;
          box-shadow: 0 10px 24px rgba(0,0,0,0.08);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 350px; /* Alto fijo para todas las tarjetas */
        }

        .moto-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.12);
        }

        .moto-card img {
          width: 100%;
          height: 220px;
          object-fit: cover;
        }

        .moto-info {
          padding: 1rem;
          flex: 1; /* Ocupa todo el espacio restante */
          display: flex;
          flex-direction: column;
          justify-content: space-between; /* Mantiene separación uniforme */
        }

        .moto-info h3 {
          font-size: 1.2rem;
          margin: 0.25rem 0;
        }

        .moto-brand {
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          display: inline-block;
          margin-bottom: 0.5rem;
          padding: 0.2rem 0.5rem;
          border-radius: 0.25rem;
          color: white;
        }

        .moto-brand.yamaha { background: #1e40af; }
        .moto-brand.kawasaki { background: #059669; }
        .moto-brand.honda { background: #dc2626; }
        .moto-brand.suzuki { background: #f59e0b; }
        .moto-brand.sherco { background: #0d9488; }
        .moto-brand.rieju { background: #dc2626; }

        .price {
          font-weight: 700;
          color: var(--color-secondary);
        }
        ` })
  ] });
}

function FilteredMotoList({ motos }) {
  const [busqueda, setBusqueda] = useState("");
  const [marcaSeleccionada, setMarcaSeleccionada] = useState("");
  const precioMaximoDisponible = Math.max(...motos.map((m) => m.precio)) + 1001;
  const [precioMax, setPrecioMax] = useState(precioMaximoDisponible);
  const marcasUnicas = [...new Set(motos.map((m) => m.marca))];
  const motosFiltradas = useMemo(() => {
    return motos.filter((moto) => {
      const coincideBusqueda = moto.nombre.toLowerCase().includes(busqueda.toLowerCase()) || moto.marca.toLowerCase().includes(busqueda.toLowerCase());
      const coincideMarca = marcaSeleccionada === "" || moto.marca === marcaSeleccionada;
      const coincidePrecio = moto.precio <= precioMax;
      return coincideBusqueda && coincideMarca && coincidePrecio;
    });
  }, [busqueda, marcaSeleccionada, precioMax, motos]);
  const limpiarFiltros = () => {
    setBusqueda("");
    setMarcaSeleccionada("");
    setPrecioMax(precioMaximoDisponible);
  };
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs("div", { class: "filtro-container", children: [
      /* @__PURE__ */ jsxs("div", { class: "filtro-group", children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "text",
            placeholder: "🔍 Buscar por modelo o marca...",
            value: busqueda,
            onInput: (e) => setBusqueda(e.target.value),
            class: "input-filtro"
          }
        ),
        /* @__PURE__ */ jsxs(
          "select",
          {
            value: marcaSeleccionada,
            onChange: (e) => setMarcaSeleccionada(e.target.value),
            class: "select-filtro",
            children: [
              /* @__PURE__ */ jsx("option", { value: "", children: "Todas las marcas" }),
              marcasUnicas.map((marca) => /* @__PURE__ */ jsx("option", { value: marca, children: marca }))
            ]
          }
        ),
        /* @__PURE__ */ jsxs("div", { class: "slider-container", children: [
          /* @__PURE__ */ jsxs("label", { class: "slider-label", children: [
            "Precio máximo: ",
            /* @__PURE__ */ jsxs("strong", { children: [
              precioMax.toLocaleString(),
              " €"
            ] })
          ] }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "range",
              min: "0",
              max: precioMaximoDisponible,
              step: "500",
              value: precioMax,
              onInput: (e) => setPrecioMax(Number(e.target.value)),
              class: "slider-precio"
            }
          )
        ] }),
        /* @__PURE__ */ jsx("button", { onClick: limpiarFiltros, class: "btn-limpiar", children: "Limpiar" })
      ] }),
      /* @__PURE__ */ jsxs("div", { class: "resultado-count", children: [
        motosFiltradas.length,
        " moto(s) encontrada(s)"
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { class: "motos-grid", children: motosFiltradas.map((moto) => /* @__PURE__ */ jsx("a", { href: "/under-construction", class: "moto-link", children: /* @__PURE__ */ jsx(MotoCard, { ...moto }) })) }),
    /* @__PURE__ */ jsx("style", { children: `
        .filtro-container {
          background: white;
          padding: 1.5rem;
          border-radius: 1rem;
          box-shadow: 0 8px 24px rgba(0,0,0,0.06);
          margin-bottom: 2rem;
        }

        .filtro-group {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          align-items: center;
        }

        .input-filtro,
        .select-filtro {
          padding: 0.7rem 1rem;
          border-radius: 0.6rem;
          border: 1px solid #e5e7eb;
          font-size: 0.95rem;
          flex: 1;
          min-width: 180px;
        }

        .slider-container {
          display: flex;
          flex-direction: column;
          min-width: 220px;
          flex: 1;
        }

        .slider-label {
          font-size: 0.9rem;
          margin-bottom: 0.4rem;
          color: var(--color-primary);
        }

        .slider-precio {
          width: 100%;
          cursor: pointer;
        }

        .btn-limpiar {
          background: var(--color-secondary);
          color: var(--color-primary);
          border: none;
          padding: 0.7rem 1.2rem;
          border-radius: 0.6rem;
          cursor: pointer;
          font-weight: 600;
        }

        .resultado-count {
          margin-top: 1rem;
          font-weight: 600;
          color: var(--color-primary);
        }

        .motos-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 2rem;
        }

        .moto-link {
          display: block;
          text-decoration: none;
        }
        ` })
  ] });
}

const catalogo$1 = {"marca":"Rieju","modelos":[{"modelo":"Rieju Century 125","specs":{"cilindrada_cc":125,"tipo_motor":"4T monocilíndrico","potencia_cv":15,"transmision":"Manual 6 velocidades","refrigeracion":"Líquida","peso_kg":135},"precio_eur":3999,"imagen":"https://www.motostarragona.com/cdn/shop/products/rieju-century-125-promociones-rieju-motos-tarragona-concesionario-oficial-21_2048x.jpg?v=1672676420"},{"modelo":"Rieju Aventura 125","specs":{"cilindrada_cc":125,"tipo_motor":"4T monocilíndrico","potencia_cv":null,"transmision":"Manual","refrigeracion":"Líquida","peso_kg":138},"precio_eur":3595,"imagen":"https://enduro21.com/images/2023/february-2023/first-look-rieju-adventure-125/rieju-aventura-125-3.jpg"},{"modelo":"Rieju MRT 50 SM","specs":{"cilindrada_cc":50,"tipo_motor":"2T","potencia_cv":null,"transmision":"Manual","refrigeracion":"Aire","peso_kg":null},"precio_eur":3449,"imagen":"https://cdn.rieju.com/uploads/_CGSmartImage/img-0bdb75dd14a4589f6f1b211f85aef05a.jpg"},{"modelo":"Rieju MRT 50 Trophy SM Pro","specs":{"cilindrada_cc":50,"tipo_motor":"2T","potencia_cv":null,"transmision":"Manual","refrigeracion":"Aire","peso_kg":null},"precio_eur":4199,"imagen":"https://cdn.rieju.com/uploads/_CGSmartImage/img-1b8127a51f223ac7a6b356efb6112eec.jpg"},{"modelo":"Rieju Marathon 125 Pro","specs":{"cilindrada_cc":125,"tipo_motor":"4T monocilíndrico","potencia_cv":null,"transmision":"Manual","refrigeracion":"Líquida","peso_kg":null},"precio_eur":5070,"imagen":"https://cdn.rieju.com/uploads/_CGSmartImage/img-38c1653bb81282beceb97b2b19437a36.jpg"},{"modelo":"Rieju E-CITY 3KW","specs":{"tipo_motor":"Eléctrico","potencia_kw":3,"autonomia_km":null,"transmision":"Automática","peso_kg":null},"precio_eur":3748,"imagen":"https://cdn.rieju.com/uploads/_CGSmartImage/img-5cbd1bba52774ec51e608e7e0098ea51.jpg"},{"modelo":"Rieju Xplora 557 S","specs":{"cilindrada_cc":554,"tipo_motor":"4T bicilíndrico","potencia_cv":null,"transmision":"Manual","refrigeracion":"Líquida","peso_kg":215},"precio_eur":5499,"imagen":"https://cdn.rieju.com/uploads/_CGSmartImage/img-cc12e5171d8c56952f540d934dec481b.jpg"},{"modelo":"Rieju MR PRO 300i","specs":{"cilindrada_cc":300,"tipo_motor":"4T monocilíndrico","potencia_cv":null,"transmision":"Manual","refrigeracion":"Líquida","peso_kg":null},"precio_eur":10299,"imagen":"https://cdn.rieju.com/uploads/_CGSmartImage/img-746082c610752cd6dfef1d296f5a20da.jpg"}]};
const RiejuCatalogo = {
  catalogo: catalogo$1,
};

const catalogo = {"marca":"Sherco","modelos":[{"modelo":"Sherco 125 SE-R","specs":{"cilindrada_cc":125,"tipo_motor":"2T monocilíndrico","potencia_cv":36,"transmision":"Manual 6 velocidades","refrigeracion":"Líquida","peso_kg":96},"precio_eur":6999,"imagen":"https://www.sherco.com/wp-content/uploads/125-SE-2025-3679X2456-2-600x400.jpg"},{"modelo":"Sherco 250 SEF-R","specs":{"cilindrada_cc":250,"tipo_motor":"4T monocilíndrico","potencia_cv":36,"transmision":"Manual 6 velocidades","refrigeracion":"Líquida","peso_kg":104},"precio_eur":7999,"imagen":"https://www.sherco.com/wp-content/uploads/01-250-SE-FACTORY-2026-1200-600x400.jpg"},{"modelo":"Sherco 300 SE-R","specs":{"cilindrada_cc":300,"tipo_motor":"2T monocilíndrico","potencia_cv":46,"transmision":"Manual 6 velocidades","refrigeracion":"Líquida","peso_kg":98},"precio_eur":7599,"imagen":"https://www.sherco.com/wp-content/uploads/01-300-SEF-FACTORY-2026-1200-600x400.jpg"},{"modelo":"Sherco 450 SEF-R","specs":{"cilindrada_cc":449,"tipo_motor":"4T monocilíndrico","potencia_cv":58,"transmision":"Manual 6 velocidades","refrigeracion":"Líquida","peso_kg":111},"precio_eur":8999,"imagen":"https://www.sherco.com/wp-content/uploads/01-450-SEF-FACTORY-2026-1200-600x400.jpg"},{"modelo":"Sherco 500 SEF-R","specs":{"cilindrada_cc":500,"tipo_motor":"4T monocilíndrico","potencia_cv":60,"transmision":"Manual 6 velocidades","refrigeracion":"Líquida","peso_kg":113},"precio_eur":9499,"imagen":"https://www.sherco.com/wp-content/uploads/01-500-SEF-FACTORY-2026-1200-600x400.jpg"},{"modelo":"Sherco 125 ST-R Enduro","specs":{"cilindrada_cc":125,"tipo_motor":"2T monocilíndrico","potencia_cv":36,"transmision":"Manual 6 velocidades","refrigeracion":"Líquida","peso_kg":93},"precio_eur":7199,"imagen":"https://www.sherco.com/wp-content/uploads/01-125-SE-FACTORY-2026-1200x800-1-600x400.jpg"},{"modelo":"Sherco 300 SEF Factory","specs":{"cilindrada_cc":300,"tipo_motor":"2T monocilíndrico","potencia_cv":46,"transmision":"Manual 6 velocidades","refrigeracion":"Líquida","peso_kg":97},"precio_eur":9999,"imagen":"https://www.sherco.com/wp-content/uploads/01-300-SEF-FACTORY-2026-1200-600x400.jpg"},{"modelo":"Sherco 450 SEF Factory","specs":{"cilindrada_cc":449,"tipo_motor":"4T monocilíndrico","potencia_cv":58,"transmision":"Manual 6 velocidades","refrigeracion":"Líquida","peso_kg":112},"precio_eur":10999,"imagen":"https://www.sherco.com/wp-content/uploads/01-450-SEF-FACTORY-2026-1200-600x400.jpg"}]};
const ShercoCatalogo = {
  catalogo,
};

const $$Tienda = createComponent(($$result, $$props, $$slots) => {
  const motosRieju = RiejuCatalogo.catalogo.modelos.map((moto) => ({
    marca: RiejuCatalogo.catalogo.marca,
    nombre: moto.modelo,
    precio: moto.precio_eur,
    imagen: moto.imagen,
    specs: moto.specs
  }));
  const motosSherco = ShercoCatalogo.catalogo.modelos.map((moto) => ({
    marca: ShercoCatalogo.catalogo.marca,
    nombre: moto.modelo,
    precio: moto.precio_eur,
    imagen: moto.imagen,
    specs: moto.specs
  }));
  const motos = [...motosRieju, ...motosSherco];
  return renderTemplate`${renderComponent($$result, "MainLayout", $$MainLayout, { "title": "MOTOKASS - Tienda de Motos | Rieju y Sherco en \xC1vila", "description": "Compra tu moto en MOTOKASS. Distribuidor oficial de Rieju y Sherco en \xC1vila. Amplio cat\xE1logo con filtros por marca y precio.", "data-astro-cid-yfwjf34f": true }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<section class="section" data-astro-cid-yfwjf34f> <div class="container" data-astro-cid-yfwjf34f> ${renderComponent($$result2, "FilteredMotoList", FilteredMotoList, { "motos": motos, "client:load": true, "client:component-hydration": "load", "client:component-path": "C:/proyectos/motokass-landing/src/components/FilteredMotoList.jsx", "client:component-export": "default", "data-astro-cid-yfwjf34f": true })} </div> </section> ` })} `;
}, "C:/proyectos/motokass-landing/src/pages/tienda.astro", void 0);

const $$file = "C:/proyectos/motokass-landing/src/pages/tienda.astro";
const $$url = "/tienda";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Tienda,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
