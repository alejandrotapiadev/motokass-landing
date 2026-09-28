/**
 * Reseñas reales de clientes.
 *
 * Vacío a propósito: los testimonios anteriores eran ficticios. Copiar aquí
 * reseñas reales (p. ej. de Google, con permiso) indicando la fuente.
 * Mientras esté vacío, la web solo enlaza a las reseñas de Google.
 */
export interface Review {
  author: string;
  text: string;
  rating: 1 | 2 | 3 | 4 | 5;
  /** Texto de fecha, p. ej. "Abril 2026". */
  date: string;
  source: "google" | "facebook" | "tienda";
  url?: string;
}

export const REVIEWS: Review[] = [];
