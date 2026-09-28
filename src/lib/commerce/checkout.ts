/**
 * Punto de conexión del checkout.
 *
 * No hay pasarela de pago integrada. Para conectar Stripe, Redsys, Shopify,
 * WooCommerce… implementar CheckoutProvider (idealmente vía un endpoint
 * /api/checkout que revalide precios y stock en servidor contra Supabase)
 * y devolverlo desde getCheckoutProvider() cuando esté configurado.
 *
 * Mientras tanto se usa "whatsapp-order": el cliente envía su pedido por
 * WhatsApp a la tienda. No implica pago online ni condiciones de envío.
 */
import type { CartState, CartTotals } from "./cart";
import { STORE_CONFIG } from "./store-config";

export type CheckoutResult =
  | { kind: "redirect"; url: string }
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
      return { kind: "redirect", url: `https://wa.me/${whatsappNumber}?text=${text}` };
    },
  };
}

export function getCheckoutProvider(whatsappNumber: string): CheckoutProvider {
  if (STORE_CONFIG.onlinePaymentEnabled) {
    // TODO: devolver aquí el proveedor de pago real cuando exista.
    // return stripeCheckoutProvider();
  }
  return whatsappOrderProvider(whatsappNumber);
}
