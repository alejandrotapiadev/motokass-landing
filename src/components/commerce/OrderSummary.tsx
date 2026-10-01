import type { PublicOrder } from "../../lib/commerce/checkout-service";
import { formatPrice } from "../../lib/catalog/types";

/** Resumen de un pedido ya creado (datos snapshot del servidor). */
export default function OrderSummary({ order }: { order: PublicOrder }) {
  const a = order.shippingAddress;
  return (
    <div className="order-status__card">
      <h3>Pedido {order.orderNumber}</h3>
      <ul className="co-lines">
        {order.items.map((i, n) => (
          <li key={n}>
            <span>
              {i.quantity} × {i.brand} {i.name}
              {i.variantName && <small>{i.variantName}</small>}
            </span>
            <strong>{formatPrice(i.subtotal)}</strong>
          </li>
        ))}
      </ul>
      <dl>
        <div>
          <dt>Subtotal</dt>
          <dd>{formatPrice(order.subtotal)}</dd>
        </div>
        {order.discountAmount > 0 && (
          <div>
            <dt>Descuento</dt>
            <dd>-{formatPrice(order.discountAmount)}</dd>
          </div>
        )}
        <div>
          <dt>{order.deliveryMethod === "pickup" ? "Recogida en tienda" : "Envío"}</dt>
          <dd>{order.shippingAmount === 0 ? "Gratis" : formatPrice(order.shippingAmount)}</dd>
        </div>
        {order.taxAmount != null && (
          <div>
            <dt>IVA incluido</dt>
            <dd>{formatPrice(order.taxAmount)}</dd>
          </div>
        )}
        <div className="cart__total">
          <dt>Total</dt>
          <dd>{formatPrice(order.total)}</dd>
        </div>
      </dl>
      {order.deliveryMethod === "shipping" && a && (
        <p className="cart__note">
          Envío a: {a.line1}
          {a.line2 ? `, ${a.line2}` : ""}, {a.postalCode} {a.city} ({a.province}), {a.country}
        </p>
      )}
    </div>
  );
}
