import { useEffect, useState } from "react";
import Icon from "../ui/Icon";
import type { PublicOrder } from "../../lib/commerce/checkout-service";
import { clearPendingOrder } from "../../lib/commerce/pending-order";
import "./CartPage.css";
import "./CheckoutPage.css";

/**
 * El cliente salió de Stripe sin pagar. Se pide al servidor que expire la
 * sesión y libere el stock reservado; el carrito se conserva intacto.
 */
export default function CheckoutCancel() {
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("order");
    const token = params.get("t");
    if (!id || !token) {
      setDone(true);
      return;
    }
    fetch("/api/checkout/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: id, token }),
    })
      .then((r) => r.json().catch(() => ({})))
      .then((data) => {
        if (data.order) setOrder(data.order as PublicOrder);
        clearPendingOrder(id);
      })
      .catch(() => undefined)
      .finally(() => setDone(true));
  }, []);

  // Si Stripe completó el pago a pesar de todo, lo mostramos en la página de éxito.
  if (order && (order.state === "paid" || order.state === "processing")) {
    const params = window.location.search;
    return (
      <div className="order-status">
        <div className="order-status__head">
          <div className="order-status__icon order-status__icon--ok"><Icon name="check" size={28} /></div>
          <div>
            <h2>Este pedido ya está pagado</h2>
            <p>Pedido {order.orderNumber}.</p>
          </div>
        </div>
        <div className="order-status__ctas">
          <a href={`/checkout/success${params}`} className="btn btn--dark">Ver pedido</a>
        </div>
      </div>
    );
  }

  return (
    <div className="order-status" aria-busy={!done}>
      <div className="order-status__head">
        <div className="order-status__icon"><Icon name="cart" size={28} /></div>
        <div>
          <h2>Pago cancelado</h2>
          <p>No se ha realizado ningún cargo. Tu carrito se ha conservado para que puedas terminar la compra cuando quieras.</p>
        </div>
      </div>
      <div className="order-status__ctas">
        <a href="/checkout" className="btn btn--accent">Volver al checkout</a>
        <a href="/carrito" className="btn btn--outline">Ver carrito</a>
      </div>
    </div>
  );
}
