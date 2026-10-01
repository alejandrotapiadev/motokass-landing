import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "../ui/Icon";
import OrderSummary from "./OrderSummary";
import type { PublicOrder } from "../../lib/commerce/checkout-service";
import { cart } from "../../lib/commerce/cart";
import { clearPendingOrder } from "../../lib/commerce/pending-order";
import { track } from "../../lib/analytics";
import "./CartPage.css";
import "./CheckoutPage.css";

/**
 * Página de vuelta desde Stripe. Llegar aquí NO significa que el pago esté
 * confirmado: se consulta el estado real (fijado por el webhook) con un
 * sondeo limitado.
 */
const POLL_DELAYS_MS = [1500, 2000, 2000, 3000, 3000, 4000, 5000, 5000, 6000, 8000]; // ~40 s

type View =
  | { kind: "loading" }
  | { kind: "order"; order: PublicOrder }
  | { kind: "timeout"; order: PublicOrder }
  | { kind: "error"; message: string };

function trackOnce(key: string, fn: () => void) {
  try {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
  } catch {
    /* sin almacenamiento: se registra igualmente */
  }
  fn();
}

export default function CheckoutSuccess() {
  const [view, setView] = useState<View>({ kind: "loading" });
  const attempt = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const access = useRef<{ order: string; token: string } | null>(null);

  const fetchStatus = useCallback(async () => {
    const a = access.current;
    if (!a) return;
    try {
      const res = await fetch("/api/orders/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(a),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setView({ kind: "error", message: data.error ?? "No encontramos este pedido." });
        return;
      }
      const order = data.order as PublicOrder;
      if (order.state === "pending") {
        const delay = POLL_DELAYS_MS[attempt.current++];
        if (delay == null) return setView({ kind: "timeout", order });
        setView({ kind: "order", order });
        timer.current = window.setTimeout(fetchStatus, delay);
        return;
      }
      setView({ kind: "order", order });
    } catch {
      setView({ kind: "error", message: "No hemos podido consultar tu pedido. Revisa tu conexión." });
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const order = params.get("order");
    const token = params.get("t");
    if (!order || !token) {
      setView({ kind: "error", message: "No encontramos este pedido." });
      return;
    }
    access.current = { order, token };
    fetchStatus();
    return () => window.clearTimeout(timer.current);
  }, [fetchStatus]);

  // Efectos de un estado definitivo (una sola vez por pedido).
  useEffect(() => {
    if (view.kind !== "order") return;
    const { order } = view;
    if (order.state === "paid" || order.state === "processing") {
      cart.clear();
      clearPendingOrder(access.current?.order);
    }
    if (order.state === "paid") {
      trackOnce(`mk_purchase_${order.orderNumber}`, () =>
        track("purchase", {
          transaction_id: order.orderNumber,
          value: order.total,
          shipping: order.shippingAmount,
          tax: order.taxAmount,
          currency: order.currency.toUpperCase(),
          items: order.items.map((i) => ({ item_name: `${i.brand} ${i.name}`, item_variant: i.variantName, price: i.unitPrice, quantity: i.quantity })),
        }),
      );
    }
    if (order.state === "failed") {
      trackOnce(`mk_payment_failed_${order.orderNumber}`, () => track("payment_failed", { transaction_id: order.orderNumber, value: order.total }));
    }
  }, [view]);

  function retry() {
    attempt.current = POLL_DELAYS_MS.length - 3; // unos pocos intentos más, no infinitos
    setView({ kind: "loading" });
    fetchStatus();
  }

  if (view.kind === "loading") {
    return (
      <div className="order-status" aria-busy="true">
        <div className="order-status__head">
          <div className="order-status__spinner" />
          <div>
            <h2>Comprobando tu pedido…</h2>
          </div>
        </div>
      </div>
    );
  }

  if (view.kind === "error") {
    return (
      <div className="order-status" role="alert">
        <div className="order-status__head">
          <div className="order-status__icon order-status__icon--ko"><Icon name="close" size={28} /></div>
          <div>
            <h2>No encontramos el pedido</h2>
            <p>{view.message}</p>
          </div>
        </div>
        <div className="order-status__ctas">
          <a href="/contacto" className="btn btn--dark">Contactar</a>
          <a href="/carrito" className="btn btn--outline">Ver carrito</a>
        </div>
      </div>
    );
  }

  const { order } = view;
  const head = (() => {
    if (view.kind === "timeout") {
      return {
        icon: <Icon name="clock" size={28} />,
        tone: "",
        title: "No hemos podido confirmar el pago todavía",
        text: "Si has completado el pago, lo confirmaremos en unos minutos y recibirás un email. No repitas la compra.",
      };
    }
    switch (order.state) {
      case "paid":
        return { icon: <Icon name="check" size={28} />, tone: "--ok", title: "¡Gracias por tu compra!", text: `Pago confirmado. Te hemos enviado la confirmación a ${order.customerEmail}.` };
      case "processing":
        return { icon: <Icon name="clock" size={28} />, tone: "", title: "Pago en proceso", text: "Tu banco está procesando el pago. Te avisaremos por email en cuanto se confirme." };
      case "pending":
        return { icon: <div className="order-status__spinner" />, tone: "", title: "Estamos confirmando tu pago…", text: "Suele tardar solo unos segundos. No cierres esta página." };
      case "failed":
        return { icon: <Icon name="close" size={28} />, tone: "--ko", title: "El pago no se ha completado", text: "No se ha realizado ningún cargo. Puedes intentarlo de nuevo." };
      case "refunded":
        return { icon: <Icon name="return" size={28} />, tone: "", title: "Pedido reembolsado", text: "El importe de este pedido se ha reembolsado." };
      default:
        return { icon: <Icon name="close" size={28} />, tone: "--ko", title: "Pedido cancelado", text: "Este pedido se canceló y no se ha realizado ningún cargo." };
    }
  })();

  return (
    <div className="order-status" aria-live="polite">
      <div className="order-status__head">
        <div className={`order-status__icon${head.tone ? ` order-status__icon${head.tone}` : ""}`}>{head.icon}</div>
        <div>
          <h2>{head.title}</h2>
          <p>{head.text}</p>
        </div>
      </div>
      <OrderSummary order={order} />
      <div className="order-status__ctas">
        {view.kind === "timeout" && (
          <button type="button" className="btn btn--dark" onClick={retry}>Comprobar de nuevo</button>
        )}
        {(order.state === "failed" || order.state === "cancelled") && (
          <a href="/checkout" className="btn btn--accent">Volver a intentarlo</a>
        )}
        <a href="/equipamiento" className="btn btn--outline">Seguir comprando</a>
      </div>
    </div>
  );
}
