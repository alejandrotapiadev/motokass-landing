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
  /** Países admitidos en el checkout (ISO 3166-1 alfa-2), p.ej. ["ES"]. */
  countries: string[];
}

export interface TaxConfig {
  /** true = los precios del catálogo ya incluyen el IVA (lo que muestra hoy la web). */
  pricesIncludeTax: boolean;
  /** Tipo de IVA a desglosar, p.ej. 0.21. null = no confirmado: no se desglosa. */
  rate: number | null;
}

export interface ReturnsPolicy {
  days: number;
  /** true si el cliente no paga el envío de la devolución. */
  free: boolean;
  details: string;
}

export interface StoreConfig {
  currency: "EUR";
  /**
   * Pago online con Stripe. Solo se activa de verdad si además hay al menos
   * un método de entrega (shipping o pickupInStore) y las claves de Stripe
   * están en el entorno (ver isOnlineCheckoutConfigured / getCheckoutEnv).
   */
  onlinePaymentEnabled: boolean;
  /** Pedido por WhatsApp (checkout manual). Alternativa o único canal. */
  manualOrderEnabled: boolean;
  /** Métodos visibles en la ficha/carrito, solo si onlinePaymentEnabled. */
  paymentMethods: string[];
  shipping: ShippingPolicy | null;
  returns: ReturnsPolicy | null;
  pickupInStore: boolean;
  promoCodesEnabled: boolean;
  /** Guía de tallas genérica (por marca se añadirá en el producto). */
  sizeGuideAvailable: boolean;
  maxQuantityPerLine: number;
  tax: TaxConfig;
  /** Minutos que se reserva el stock mientras el cliente paga (Stripe exige ≥ 30). */
  checkoutReservationMinutes: number;
  /**
   * El negocio ha completado y revisado /condiciones-venta (sin marcadores
   * PENDIENTE). Sin esto no se activa el pago online.
   */
  legalTermsReviewed: boolean;
}

export const STORE_CONFIG: StoreConfig = {
  currency: "EUR",
  onlinePaymentEnabled: false,
  manualOrderEnabled: true,
  paymentMethods: [],
  shipping: null,
  returns: null,
  pickupInStore: false,
  promoCodesEnabled: false,
  sizeGuideAvailable: false,
  maxQuantityPerLine: 10,
  tax: { pricesIncludeTax: true, rate: null },
  checkoutReservationMinutes: 30,
  legalTermsReviewed: false,
};

export type DeliveryMethod = "shipping" | "pickup";

export interface DeliveryOption {
  id: DeliveryMethod;
  label: string;
  description: string;
  /** Coste en euros antes de aplicar el envío gratuito. */
  price: number;
  freeFrom: number | null;
  /** Países admitidos (solo envío). */
  countries: string[];
}

/** Métodos de entrega disponibles según la configuración (nunca inventados). */
export function getDeliveryOptions(config: StoreConfig = STORE_CONFIG): DeliveryOption[] {
  const options: DeliveryOption[] = [];
  if (config.shipping && config.shipping.countries.length) {
    options.push({
      id: "shipping",
      label: "Envío a domicilio",
      description: `${config.shipping.zones} · ${config.shipping.deliveryTime}`,
      price: config.shipping.flatRate,
      freeFrom: config.shipping.freeFrom,
      countries: config.shipping.countries,
    });
  }
  if (config.pickupInStore) {
    options.push({
      id: "pickup",
      label: "Recogida en tienda",
      description: "En nuestra tienda de Ávila",
      price: 0,
      freeFrom: null,
      countries: [],
    });
  }
  return options;
}

/** Configuración comercial suficiente para cobrar online (sin mirar claves). */
export function isOnlineCheckoutConfigured(config: StoreConfig = STORE_CONFIG): boolean {
  return (
    config.onlinePaymentEnabled &&
    config.legalTermsReviewed &&
    getDeliveryOptions(config).length > 0 &&
    config.checkoutReservationMinutes >= 30
  );
}

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
  if (isOnlineCheckoutConfigured(config)) {
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
