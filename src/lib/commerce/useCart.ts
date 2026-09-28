import { useSyncExternalStore } from "react";
import { cart, computeTotals, type CartState, type CartTotals } from "./cart";

export function useCart(): { state: CartState; totals: CartTotals } {
  const state = useSyncExternalStore(cart.subscribe, cart.getState, cart.getServerState);
  return { state, totals: computeTotals(state) };
}
