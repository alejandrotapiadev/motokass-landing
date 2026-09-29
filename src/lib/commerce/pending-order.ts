/**
 * Último pedido enviado a Stripe en esta pestaña (sessionStorage).
 * Sirve para liberar su reserva de stock si el cliente vuelve atrás desde
 * Stripe con el botón del navegador y lanza un nuevo intento.
 */
export const PENDING_ORDER_KEY = "mk_pending_order_v1";

export interface PendingOrderRef {
  order: string;
  token: string;
}

export function savePendingOrder(ref: PendingOrderRef): void {
  try {
    sessionStorage.setItem(PENDING_ORDER_KEY, JSON.stringify(ref));
  } catch {
    /* modo privado / sin almacenamiento */
  }
}

export function readPendingOrder(): PendingOrderRef | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(PENDING_ORDER_KEY) ?? "null");
    return v && typeof v.order === "string" && typeof v.token === "string" ? v : null;
  } catch {
    return null;
  }
}

export function clearPendingOrder(orderId?: string): void {
  try {
    if (!orderId || readPendingOrder()?.order === orderId) sessionStorage.removeItem(PENDING_ORDER_KEY);
  } catch {
    /* sin almacenamiento */
  }
}
