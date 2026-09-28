/**
 * Capa de analytics desacoplada.
 *
 * Los componentes llaman a track("add_to_cart", {...}) sin saber qué
 * herramienta hay detrás. Hoy no hay ninguna herramienta de eventos
 * configurada: los eventos se emiten como CustomEvent "mk:track" en window
 * y se empujan a window.dataLayer SOLO si ya existe (p.ej. si en el futuro
 * se instala GTM/GA4). Para conectar otra herramienta, registrar un adapter.
 *
 * Respeta el consentimiento de cookies existente (localStorage cookie_consent).
 */

export type AnalyticsEvent =
  | "view_product"
  | "view_motorcycle"
  | "add_to_cart"
  | "remove_from_cart"
  | "begin_checkout"
  | "purchase"
  | "search"
  | "filter_category"
  | "click_whatsapp"
  | "click_call"
  | "book_test_ride"
  | "book_workshop";

export type AnalyticsParams = Record<string, string | number | boolean | null | undefined | unknown[]>;

export type AnalyticsAdapter = (event: AnalyticsEvent, params: AnalyticsParams) => void;

const adapters: AnalyticsAdapter[] = [];

export function registerAnalyticsAdapter(adapter: AnalyticsAdapter): () => void {
  adapters.push(adapter);
  return () => {
    const i = adapters.indexOf(adapter);
    if (i >= 0) adapters.splice(i, 1);
  };
}

function hasConsent(): boolean {
  try {
    return localStorage.getItem("cookie_consent") === "accepted";
  } catch {
    return false;
  }
}

export function track(event: AnalyticsEvent, params: AnalyticsParams = {}): void {
  if (typeof window === "undefined") return;

  // Evento interno (siempre): permite a otros módulos reaccionar sin acoplarse.
  window.dispatchEvent(new CustomEvent("mk:track", { detail: { event, params } }));

  if (import.meta.env.DEV) console.debug("[analytics]", event, params);

  if (!hasConsent()) return;

  const w = window as unknown as { dataLayer?: unknown[] };
  if (Array.isArray(w.dataLayer)) w.dataLayer.push({ event, ...params });

  for (const a of adapters) {
    try {
      a(event, params);
    } catch (err) {
      console.warn("[analytics] adapter error", err);
    }
  }
}

/**
 * Delegación de clics para componentes Astro sin JS propio:
 *   <a data-track="click_whatsapp" data-track-location="header">
 */
export function initClickTracking(root: Document = document): void {
  root.addEventListener("click", (e) => {
    const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-track]");
    if (!el) return;
    const event = el.dataset.track as AnalyticsEvent;
    const params: AnalyticsParams = {};
    for (const [k, v] of Object.entries(el.dataset)) {
      if (k.startsWith("track") && k !== "track") {
        params[k.slice(5).replace(/^./, (c) => c.toLowerCase())] = v;
      }
    }
    track(event, params);
  });
}
