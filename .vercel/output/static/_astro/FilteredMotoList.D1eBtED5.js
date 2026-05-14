import{r as m}from"./index.C5BVv2q5.js";var u={exports:{}},d={};/**
 * @license React
 * react-jsx-runtime.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var x;function w(){if(x)return d;x=1;var a=Symbol.for("react.transitional.element"),i=Symbol.for("react.fragment");function c(s,o,t){var n=null;if(t!==void 0&&(n=""+t),o.key!==void 0&&(n=""+o.key),"key"in o){t={};for(var l in o)l!=="key"&&(t[l]=o[l])}else t=o;return o=t.ref,{$$typeof:a,type:s,key:n,ref:o!==void 0?o:null,props:t}}return d.Fragment=i,d.jsx=c,d.jsxs=c,d}var f;function k(){return f||(f=1,u.exports=w()),u.exports}var r=k();function y({marca:a,nombre:i,precio:c,imagen:s}){return r.jsxs(r.Fragment,{children:[r.jsxs("div",{className:"moto-card",children:[s&&r.jsx("img",{src:s,alt:i}),r.jsxs("div",{className:"moto-info",children:[r.jsx("span",{className:`moto-brand ${a.toLowerCase()}`,children:a}),r.jsx("h3",{children:i}),r.jsxs("span",{className:"price",children:[c," €"]})]})]}),r.jsx("style",{children:`
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
        `})]})}function M({motos:a}){const[i,c]=m.useState(""),[s,o]=m.useState(""),t=Math.max(...a.map(e=>e.precio))+1001,[n,l]=m.useState(t),h=[...new Set(a.map(e=>e.marca))],p=m.useMemo(()=>a.filter(e=>{const g=e.nombre.toLowerCase().includes(i.toLowerCase())||e.marca.toLowerCase().includes(i.toLowerCase()),j=s===""||e.marca===s,v=e.precio<=n;return g&&j&&v}),[i,s,n,a]),b=()=>{c(""),o(""),l(t)};return r.jsxs(r.Fragment,{children:[r.jsxs("div",{class:"filtro-container",children:[r.jsxs("div",{class:"filtro-group",children:[r.jsx("input",{type:"text",placeholder:"🔍 Buscar por modelo o marca...",value:i,onInput:e=>c(e.target.value),class:"input-filtro"}),r.jsxs("select",{value:s,onChange:e=>o(e.target.value),class:"select-filtro",children:[r.jsx("option",{value:"",children:"Todas las marcas"}),h.map(e=>r.jsx("option",{value:e,children:e}))]}),r.jsxs("div",{class:"slider-container",children:[r.jsxs("label",{class:"slider-label",children:["Precio máximo: ",r.jsxs("strong",{children:[n.toLocaleString()," €"]})]}),r.jsx("input",{type:"range",min:"0",max:t,step:"500",value:n,onInput:e=>l(Number(e.target.value)),class:"slider-precio"})]}),r.jsx("button",{onClick:b,class:"btn-limpiar",children:"Limpiar"})]}),r.jsxs("div",{class:"resultado-count",children:[p.length," moto(s) encontrada(s)"]})]}),r.jsx("div",{class:"motos-grid",children:p.map(e=>r.jsx("a",{href:"/under-construction",class:"moto-link",children:r.jsx(y,{...e})}))}),r.jsx("style",{children:`
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
        `})]})}export{M as default};
