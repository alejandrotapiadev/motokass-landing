/**
 * Reseñas de producto (solo servidor).
 *
 * ⚠️ Hoy NO existe backend de reseñas: ni tabla, ni API, ni usuarios que puedan
 * escribirlas. La media y el número de valoraciones salen de los campos
 * `rating` / `review_count` de equipment_products; los comentarios, de aquí.
 *
 * Para conectarlo: crear la tabla de reseñas (producto, autor, puntuación,
 * texto, fecha, moderación) y devolver sus filas en getProductReviews().
 * La UI (ProductReviews.astro) ya consume este contrato y no hay que tocarla.
 */
import type { EquipmentProduct, ProductReview } from "./types";

export async function getProductReviews(product: EquipmentProduct): Promise<ProductReview[]> {
  if (product.isMock) {
    const { MOCK_REVIEWS } = await import("./equipment.mock");
    return MOCK_REVIEWS[product.id] ?? [];
  }
  return [];
}
