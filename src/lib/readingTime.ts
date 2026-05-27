/**
 * Calcula el tiempo estimado de lectura en minutos.
 * Asume una velocidad media de 200 palabras/minuto.
 */
export function readingTime(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
