/**
 * Recuerda el último listado de la tienda visitado (categoría + filtros +
 * orden + página) para poder volver a él desde la ficha de producto.
 * Solo cliente; si sessionStorage no está disponible, simplemente no recuerda.
 */
const KEY = "mk:last-listing";

export function rememberListing(url: string): void {
  try {
    sessionStorage.setItem(KEY, url);
  } catch {
    /* modo privado / almacenamiento bloqueado */
  }
}

export function getLastListing(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}
