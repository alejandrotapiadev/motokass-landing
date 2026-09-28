/**
 * Ofertas de taller publicadas.
 *
 * Vacío a propósito: los precios que había (79 €, 89 €, 39 €) eran de
 * ejemplo y no están confirmados por el cliente. Añadir aquí ofertas reales;
 * la home y /Ofertas las mostrarán automáticamente.
 */
export interface WorkshopOffer {
  title: string;
  description: string;
  price: number;
  /** Precio habitual, solo si es real. */
  regularPrice?: number | null;
  /** Fecha fin (ISO). Las ofertas caducadas se ocultan solas. */
  validUntil?: string | null;
  icon?: string;
}

export const WORKSHOP_OFFERS: WorkshopOffer[] = [];

export function getActiveWorkshopOffers(now = new Date()): WorkshopOffer[] {
  return WORKSHOP_OFFERS.filter((o) => !o.validUntil || new Date(o.validUntil) >= now);
}
