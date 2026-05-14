import { renderers } from './renderers.mjs';
import { c as createExports, s as serverEntrypointModule } from './chunks/_@astrojs-ssr-adapter_DNtimClf.mjs';
import { manifest } from './manifest_BrYpWsvd.mjs';

const serverIslandMap = new Map();;

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/404.astro.mjs');
const _page2 = () => import('./pages/api/send-launch-emails.astro.mjs');
const _page3 = () => import('./pages/api/subscribe.astro.mjs');
const _page4 = () => import('./pages/citaprevia.astro.mjs');
const _page5 = () => import('./pages/contacto.astro.mjs');
const _page6 = () => import('./pages/ofertas.astro.mjs');
const _page7 = () => import('./pages/taller.astro.mjs');
const _page8 = () => import('./pages/tienda.astro.mjs');
const _page9 = () => import('./pages/under-construction.astro.mjs');
const _page10 = () => import('./pages/index.astro.mjs');
const pageMap = new Map([
    ["node_modules/astro/dist/assets/endpoint/generic.js", _page0],
    ["src/pages/404.astro", _page1],
    ["src/pages/api/send-launch-emails.ts", _page2],
    ["src/pages/api/subscribe.ts", _page3],
    ["src/pages/CitaPrevia.astro", _page4],
    ["src/pages/contacto.astro", _page5],
    ["src/pages/Ofertas.astro", _page6],
    ["src/pages/taller.astro", _page7],
    ["src/pages/tienda.astro", _page8],
    ["src/pages/under-construction.astro", _page9],
    ["src/pages/index.astro", _page10]
]);

const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    actions: () => import('./noop-entrypoint.mjs'),
    middleware: () => import('./_noop-middleware.mjs')
});
const _args = {
    "middlewareSecret": "3eea9170-913a-4a0c-8f6c-3563cbb89da4",
    "skewProtection": false
};
const _exports = createExports(_manifest, _args);
const __astrojsSsrVirtualEntry = _exports.default;
const _start = 'start';
if (Object.prototype.hasOwnProperty.call(serverEntrypointModule, _start)) ;

export { __astrojsSsrVirtualEntry as default, pageMap };
