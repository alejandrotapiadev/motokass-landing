/**
 * Configuración comercial de la tienda online.
 *
 * REGLA: todo lo que no esté confirmado por MOTOKASS queda en null/false y
 * la interfaz NO lo muestra. No afirmar envíos gratis, devoluciones, pago
 * seguro, recogida en tienda, etc. hasta rellenarlo aquí con datos reales.
 */

export interface ShippingPolicy {
  /** Coste fijo en euros. */
  flatRate: number;
  /** Importe a partir del cual el envío es gratis; null = nunca. */
  freeFrom: number | null;
  /** Texto de plazo, p.ej. "24–72 h laborables". */
  deliveryTime: string;
  /** Zonas, p.ej. "Península". */
  zones: string;
}

export interface ReturnsPolicy {
  days: number;
  /** true si el cliente no paga el envío de la devolución. */
  free: boolean;
  details: string;
}

export interface StoreConfig {
  currency: "EUR";
  /** Hay pasarela de pago conectada (Stripe, Redsys…). */
  onlinePaymentEnabled: boolean;
  /** Métodos visibles en la ficha/carrito, solo si onlinePaymentEnabled. */
  paymentMethods: string[];
  shipping: ShippingPolicy | null;
  returns: ReturnsPolicy | null;
  pickupInStore: boolean;
  promoCodesEnabled: boolean;
  /** Guía de tallas genérica (por marca se añadirá en el producto). */
  sizeGuideAvailable: boolean;
  maxQuantityPerLine: number;
}

export const STORE_CONFIG: StoreConfig = {
  currency: "EUR",
  onlinePaymentEnabled: false,
  paymentMethods: [],
  shipping: null,
  returns: null,
  pickupInStore: false,
  promoCodesEnabled: false,
  sizeGuideAvailable: false,
  maxQuantityPerLine: 10,
};

/**
 * Argumentos de confianza que SÍ son verdaderos hoy (verificados en la web
 * actual) + los condicionales que se activan al configurar la tienda.
 */
export interface TrustPoint {
  key: string;
  title: string;
  text: string;
  icon: string;
}

export function getStoreTrustPoints(config: StoreConfig = STORE_CONFIG): TrustPoint[] {
  const points: TrustPoint[] = [];
  if (config.onlinePaymentEnabled) {
    points.push({ key: "payment", title: "Pago seguro", text: config.paymentMethods.join(" · ") || "Pasarela segura", icon: "lock" });
  }
  if (config.shipping) {
    points.push({
      key: "shipping",
      title: "Envíos",
      text: config.shipping.freeFrom != null
        ? `Gratis desde ${config.shipping.freeFrom} € · ${config.shipping.deliveryTime}`
        : config.shipping.deliveryTime,
      icon: "truck",
    });
  }
  if (config.returns) {
    points.push({ key: "returns", title: "Devoluciones", text: `${config.returns.days} días${config.returns.free ? " gratis" : ""}`, icon: "return" });
  }
  if (config.pickupInStore) {
    points.push({ key: "pickup", title: "Recogida en tienda", text: "En nuestra tienda de Ávila", icon: "store" });
  }
  points.push(
    { key: "store", title: "Tienda física", text: "Ven a verlo en Ávila", icon: "store" },
    { key: "whatsapp", title: "Atención directa", text: "Por WhatsApp y teléfono", icon: "chat" },
    { key: "workshop", title: "Taller propio", text: "Servicio postventa", icon: "wrench" },
  );
  return points;
}
