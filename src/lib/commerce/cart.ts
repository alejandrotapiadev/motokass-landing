/**
 * Store del carrito — sin dependencias, framework-agnóstico.
 *
 * - Persistencia en localStorage (clave versionada) y sincronización entre pestañas.
 * - Suscripción tipo useSyncExternalStore (ver useCart.ts).
 * - Los precios del carrito son orientativos: el checkout DEBE revalidar
 *   precio y stock en servidor antes de cobrar.
 */
import { STORE_CONFIG, type StoreConfig } from "./store-config";

export interface CartLine {
  /** productId|color|size */
  lineId: string;
  productId: string;
  sku: string | null;
  slug: string;
  url: string;
  name: string;
  brand: string;
  image: string | null;
  color: string | null;
  size: string | null;
  unitPrice: number;
  compareAtPrice: number | null;
  quantity: number;
  /** Stock máximo conocido al añadir (null = sin límite conocido). */
  maxQuantity: number | null;
}

export interface CartState {
  lines: CartLine[];
  promoCode: string | null;
  updatedAt: number;
}

export interface CartTotals {
  itemCount: number;
  subtotal: number;
  /** null = se calcula en el checkout (política de envío no configurada). */
  shipping: number | null;
  discount: number;
  total: number;
  /** Cuánto falta para envío gratis, si aplica. */
  remainingForFreeShipping: number | null;
}

export const CART_STORAGE_KEY = "mk_cart_v1";
const EMPTY: CartState = { lines: [], promoCode: null, updatedAt: 0 };

export function lineIdFor(productId: string, color: string | null, size: string | null): string {
  return [productId, color ?? "", size ?? ""].join("|");
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/* ─────────────── Reducers puros (testeables) ─────────────── */

export type NewLine = Omit<CartLine, "lineId" | "quantity"> & { quantity?: number };

export function addLine(state: CartState, input: NewLine, config: StoreConfig = STORE_CONFIG): CartState {
  const lineId = lineIdFor(input.productId, input.color, input.size);
  const qty = Math.max(1, input.quantity ?? 1);
  const cap = (n: number, max: number | null) => Math.min(n, max ?? Infinity, config.maxQuantityPerLine);
  const existing = state.lines.find((l) => l.lineId === lineId);
  const lines = existing
    ? state.lines.map((l) =>
        l.lineId === lineId
          ? { ...l, ...input, lineId, quantity: cap(l.quantity + qty, input.maxQuantity ?? l.maxQuantity) }
          : l,
      )
    : [...state.lines, { ...input, lineId, quantity: cap(qty, input.maxQuantity) }];
  return { ...state, lines, updatedAt: Date.now() };
}

export function setLineQuantity(state: CartState, lineId: string, quantity: number, config: StoreConfig = STORE_CONFIG): CartState {
  if (quantity <= 0) return removeLine(state, lineId);
  return {
    ...state,
    lines: state.lines.map((l) =>
      l.lineId === lineId ? { ...l, quantity: Math.min(quantity, l.maxQuantity ?? Infinity, config.maxQuantityPerLine) } : l,
    ),
    updatedAt: Date.now(),
  };
}

export function removeLine(state: CartState, lineId: string): CartState {
  return { ...state, lines: state.lines.filter((l) => l.lineId !== lineId), updatedAt: Date.now() };
}

/**
 * Descuento de código promocional. Punto de extensión: hoy no hay
 * códigos configurados (STORE_CONFIG.promoCodesEnabled = false), así que
 * siempre devuelve 0. La validación real debe hacerse en servidor.
 */
export type PromoResolver = (code: string, subtotal: number) => number;
const noPromo: PromoResolver = () => 0;

export function computeTotals(state: CartState, config: StoreConfig = STORE_CONFIG, promo: PromoResolver = noPromo): CartTotals {
  const itemCount = state.lines.reduce((n, l) => n + l.quantity, 0);
  const subtotal = round2(state.lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0));
  const discount = state.promoCode && config.promoCodesEnabled ? round2(Math.min(promo(state.promoCode, subtotal), subtotal)) : 0;

  let shipping: number | null = null;
  let remainingForFreeShipping: number | null = null;
  if (config.shipping && itemCount > 0) {
    const free = config.shipping.freeFrom != null && subtotal - discount >= config.shipping.freeFrom;
    shipping = free ? 0 : config.shipping.flatRate;
    if (!free && config.shipping.freeFrom != null) remainingForFreeShipping = round2(config.shipping.freeFrom - (subtotal - discount));
  }

  return {
    itemCount,
    subtotal,
    shipping,
    discount,
    total: round2(subtotal - discount + (shipping ?? 0)),
    remainingForFreeShipping,
  };
}

/* ─────────────── Store con persistencia ─────────────── */

type Listener = () => void;
let state: CartState = EMPTY;
let hydrated = false;
const listeners = new Set<Listener>();

function isValidState(v: unknown): v is CartState {
  return !!v && typeof v === "object" && Array.isArray((v as CartState).lines);
}

function read(): CartState {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    return isValidState(parsed) ? parsed : EMPTY;
  } catch {
    return EMPTY;
  }
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  state = read();
  window.addEventListener("storage", (e) => {
    if (e.key === CART_STORAGE_KEY) {
      state = read();
      emit();
    }
  });
}

function emit() {
  listeners.forEach((l) => l());
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("mk:cart", { detail: state }));
  }
}

function commit(next: CartState) {
  state = next;
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* modo privado / cuota: el carrito sigue en memoria */
  }
  emit();
}

export const cart = {
  getState(): CartState {
    hydrate();
    return state;
  },
  getServerState(): CartState {
    return EMPTY;
  },
  subscribe(listener: Listener): () => void {
    hydrate();
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  add(line: NewLine) {
    hydrate();
    commit(addLine(state, line));
  },
  setQuantity(lineId: string, qty: number) {
    hydrate();
    commit(setLineQuantity(state, lineId, qty));
  },
  remove(lineId: string) {
    hydrate();
    commit(removeLine(state, lineId));
  },
  setPromoCode(code: string | null) {
    hydrate();
    commit({ ...state, promoCode: code?.trim().toUpperCase() || null, updatedAt: Date.now() });
  },
  clear() {
    commit({ ...EMPTY, updatedAt: Date.now() });
  },
};
