import { useEffect, useState } from "react";
import Icon from "../ui/Icon";
import { useCart } from "../../lib/commerce/useCart";
import { cart } from "../../lib/commerce/cart";
import { removeFromCart } from "../../lib/commerce/actions";
import { getCheckoutProvider } from "../../lib/commerce/checkout";
import { STORE_CONFIG } from "../../lib/commerce/store-config";
import { formatPrice } from "../../lib/catalog/types";
import { track } from "../../lib/analytics";
import "./CartPage.css";

interface Props {
  whatsappNumber: string;
}

export default function CartPage({ whatsappNumber }: Props) {
  const { state, totals } = useCart();
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promo, setPromo] = useState("");
  const provider = getCheckoutProvider(whatsappNumber);

  useEffect(() => setHydrated(true), []);

  async function checkout() {
    setBusy(true);
    setError(null);
    track("begin_checkout", {
      value: totals.total,
      currency: "EUR",
      items: state.lines.length,
      provider: provider.id,
    });
    const result = await provider.begin(state, totals);
    if (result.kind === "redirect") {
      window.open(result.url, "_blank", "noopener");
    } else {
      setError(result.message);
    }
    setBusy(false);
  }

  if (!hydrated) {
    return <div className="cart__loading" aria-busy="true">Cargando carrito…</div>;
  }

  if (!state.lines.length) {
    return (
      <div className="cart-empty">
        <Icon name="cart" size={56} strokeWidth={1.2} />
        <h2>Tu carrito está vacío</h2>
        <p>Descubre nuestro equipamiento para motoristas o encuentra tu próxima moto.</p>
        <div className="cart-empty__ctas">
          <a href="/equipamiento" className="btn btn--dark">Ver equipamiento</a>
          <a href="/catalogo" className="btn btn--outline">Ver motos</a>
        </div>
      </div>
    );
  }

  return (
    <div className="cart">
      <section className="cart__lines" aria-label="Productos en el carrito">
        <div className="cart__thead" aria-hidden="true">
          <span>Producto</span>
          <span>Precio</span>
          <span>Cantidad</span>
          <span>Subtotal</span>
        </div>
        <ul>
          {state.lines.map((l) => (
            <li key={l.lineId} className="cl">
              <a href={l.url} className="cl__img">
                {l.image ? <img src={l.image} alt="" width={120} height={120} loading="lazy" /> : <Icon name="helmet" size={36} strokeWidth={1.2} />}
              </a>
              <div className="cl__info">
                <span className="cl__brand">{l.brand}</span>
                <a href={l.url} className="cl__name">{l.name}</a>
                <span className="cl__variant">
                  {[l.color && `Color: ${l.color}`, l.size && `Talla: ${l.size}`].filter(Boolean).join(" · ")}
                </span>
                <button type="button" className="cl__remove" onClick={() => removeFromCart(l)}>
                  <Icon name="trash" size={15} /> Eliminar
                </button>
              </div>
              <div className="cl__price" data-label="Precio">
                {formatPrice(l.unitPrice)}
                {l.compareAtPrice != null && l.compareAtPrice > l.unitPrice && <s>{formatPrice(l.compareAtPrice)}</s>}
              </div>
              <div className="cl__qty" data-label="Cantidad">
                <div className="qty">
                  <button type="button" aria-label={`Restar una unidad de ${l.name}`} onClick={() => cart.setQuantity(l.lineId, l.quantity - 1)}>
                    <Icon name="minus" size={14} />
                  </button>
                  <span aria-live="polite">{l.quantity}</span>
                  <button
                    type="button"
                    aria-label={`Sumar una unidad de ${l.name}`}
                    onClick={() => cart.setQuantity(l.lineId, l.quantity + 1)}
                    disabled={l.maxQuantity != null && l.quantity >= l.maxQuantity}
                  >
                    <Icon name="plus" size={14} />
                  </button>
                </div>
                {l.maxQuantity != null && l.quantity >= l.maxQuantity && <small>Máx. disponible</small>}
              </div>
              <div className="cl__subtotal" data-label="Subtotal">{formatPrice(l.unitPrice * l.quantity)}</div>
            </li>
          ))}
        </ul>
        <a href="/equipamiento" className="link-arrow cart__continue">
          <Icon name="chevron-left" size={14} /> Seguir comprando
        </a>
      </section>

      <aside className="cart__summary" aria-label="Resumen del pedido">
        <h2>Resumen</h2>

        {STORE_CONFIG.promoCodesEnabled && (
          <form
            className="cart__promo"
            onSubmit={(e) => {
              e.preventDefault();
              cart.setPromoCode(promo);
            }}
          >
            <label htmlFor="promo" className="sr-only">Código promocional</label>
            <input id="promo" value={promo} onChange={(e) => setPromo(e.target.value)} placeholder="Código promocional" />
            <button type="submit" className="btn btn--outline btn--sm">Aplicar</button>
          </form>
        )}

        <dl>
          <div>
            <dt>Subtotal ({totals.itemCount} {totals.itemCount === 1 ? "artículo" : "artículos"})</dt>
            <dd>{formatPrice(totals.subtotal)}</dd>
          </div>
          {totals.discount > 0 && (
            <div>
              <dt>Descuento</dt>
              <dd>-{formatPrice(totals.discount)}</dd>
            </div>
          )}
          <div>
            <dt>Envío</dt>
            <dd>{totals.shipping == null ? "A confirmar" : totals.shipping === 0 ? "Gratis" : formatPrice(totals.shipping)}</dd>
          </div>
          <div className="cart__total">
            <dt>Total</dt>
            <dd>{formatPrice(totals.total)}</dd>
          </div>
        </dl>
        <p className="cart__tax">IVA incluido{totals.shipping == null ? ". Gastos de envío no incluidos." : "."}</p>
        {totals.remainingForFreeShipping != null && totals.remainingForFreeShipping > 0 && (
          <p className="cart__free">Te faltan {formatPrice(totals.remainingForFreeShipping)} para el envío gratis.</p>
        )}

        <button type="button" className="btn btn--accent btn--block cart__cta" onClick={checkout} disabled={busy}>
          {busy ? "Un momento…" : provider.ctaLabel}
        </button>
        <p className="cart__note">{provider.note}</p>
        {error && <p className="cart__error" role="alert">{error}</p>}
      </aside>
    </div>
  );
}
