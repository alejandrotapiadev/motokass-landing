/**
 * Proveedores de checkout que ofrece el carrito.
 *
 *  - "online": pago con Stripe. Lleva a /checkout (datos + resumen), que
 *    llama a /api/checkout; el servidor revalida precios y stock.
 *  - "whatsapp-order": el cliente envía su pedido por WhatsApp a la tienda
 *    (checkout manual, sin pago online). Es el único canal mientras el pago
 *    online no esté listo, y una alternativa si manualOrderEnabled.
 */
import type { CartState, CartTotals } from "./cart";
import { STORE_CONFIG, type StoreConfig } from "./store-config";

export type CheckoutResult =
  | { kind: "redirect"; url: string; newTab?: boolean }
  | { kind: "error"; message: string };

export interface CheckoutProvider {
  id: string;
  /** Texto del botón principal del carrito. */
  ctaLabel: string;
  /** Aclaración mostrada bajo el botón. */
  note: string;
  begin(cart: CartState, totals: CartTotals): Promise<CheckoutResult>;
}

const eur = (n: number) => n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });

export function buildOrderMessage(cart: CartState, totals: CartTotals): string {
  const lines = cart.lines.map((l) => {
    const variant = [l.color, l.size && `talla ${l.size}`].filter(Boolean).join(", ");
    return `• ${l.quantity} × ${l.brand} ${l.name}${variant ? ` (${variant})` : ""}${l.sku ? ` [${l.sku}]` : ""} — ${eur(l.unitPrice * l.quantity)}`;
  });
  return [
    "Hola MOTOKASS, quiero hacer este pedido:",
    "",
    ...lines,
    "",
    `Subtotal: ${eur(totals.subtotal)}`,
    "¿Me confirmáis disponibilidad y cómo completar la compra?",
  ].join("\n");
}

export function whatsappOrderProvider(whatsappNumber: string): CheckoutProvider {
  return {
    id: "whatsapp-order",
    ctaLabel: "Continuar con la compra",
    note: "Te llevamos a WhatsApp con tu pedido para confirmar disponibilidad y forma de pago con la tienda.",
    async begin(cart, totals) {
      const text = encodeURIComponent(buildOrderMessage(cart, totals));
      return { kind: "redirect", url: `https://wa.me/${whatsappNumber}?text=${text}`, newTab: true };
    },
  };
}

export function onlineCheckoutProvider(): CheckoutProvider {
  return {
    id: "online",
    ctaLabel: "Tramitar pedido",
    note: "Revisarás tus datos y el total antes de pagar de forma segura con Stripe.",
    async begin() {
      return { kind: "redirect", url: "/checkout" };
    },
  };
}

export interface CheckoutOptions {
  primary: CheckoutProvider;
  alternative: CheckoutProvider | null;
}

/**
 * onlineReady lo calcula el servidor (configuración comercial + claves de
 * Stripe): ver isOnlineCheckoutReady() en server.ts.
 */
export function getCheckoutOptions(opts: { whatsappNumber: string; onlineReady: boolean; config?: StoreConfig }): CheckoutOptions {
  const config = opts.config ?? STORE_CONFIG;
  const whatsapp = whatsappOrderProvider(opts.whatsappNumber);
  if (!opts.onlineReady) return { primary: whatsapp, alternative: null };
  return {
    primary: onlineCheckoutProvider(),
    alternative: config.manualOrderEnabled ? { ...whatsapp, ctaLabel: "Prefiero pedir por WhatsApp" } : null,
  };
}
