import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "../ui/Icon";
import { useCart } from "../../lib/commerce/useCart";
import { cart, type CartLine } from "../../lib/commerce/cart";
import { checkoutRequestSchema, fieldErrors } from "../../lib/commerce/checkout-schema";
import type { DeliveryMethod, DeliveryOption } from "../../lib/commerce/store-config";
import type { LineIssue } from "../../lib/commerce/pricing";
import { formatPrice } from "../../lib/catalog/types";
import { track } from "../../lib/analytics";
import { clearPendingOrder, readPendingOrder, savePendingOrder } from "../../lib/commerce/pending-order";
import "./CartPage.css";
import "./CheckoutPage.css";

interface Props {
  deliveryOptions: DeliveryOption[];
  termsUrl: string;
  privacyUrl: string;
  pricesIncludeTax: boolean;
}

interface QuoteLine {
  productId: string;
  name: string;
  brand: string;
  color: string | null;
  size: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface Quote {
  lines: QuoteLine[];
  issues: LineIssue[];
  subtotal: number;
  shipping: number | null;
  taxAmount: number | null;
  total: number;
}

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  line1: "",
  line2: "",
  postalCode: "",
  city: "",
  province: "",
  country: "",
  notes: "",
  acceptTerms: false,
};
type Form = typeof EMPTY_FORM;

const countryName = (code: string) => {
  try {
    return new Intl.DisplayNames(["es"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
};

const toItems = (lines: CartLine[]) =>
  lines.map((l) => ({ productId: l.productId, sku: l.sku, color: l.color, size: l.size, quantity: l.quantity }));

async function postJson<T>(url: string, body: unknown): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}

export default function CheckoutPage({ deliveryOptions, termsUrl, privacyUrl, pricesIncludeTax }: Props) {
  const { state } = useCart();
  const [hydrated, setHydrated] = useState(false);
  const [form, setForm] = useState<Form>({ ...EMPTY_FORM, country: deliveryOptions.find((o) => o.id === "shipping")?.countries[0] ?? "" });
  const [delivery, setDelivery] = useState<DeliveryMethod>(deliveryOptions[0]?.id ?? "pickup");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const idempotencyKey = useRef<string | null>(null);
  const startedTracked = useRef(false);

  const items = useMemo(() => toItems(state.lines), [state.lines]);
  const shippingOption = deliveryOptions.find((o) => o.id === "shipping");

  useEffect(() => setHydrated(true), []);

  // Resumen con precios/stock reales del servidor.
  useEffect(() => {
    if (!hydrated || !items.length) return;
    let cancelled = false;
    setQuoteError(null);
    postJson<Quote & { error?: string }>("/api/checkout/quote", { items, deliveryMethod: delivery }).then(({ ok, data }) => {
      if (cancelled) return;
      if (!ok) return setQuoteError(data.error ?? "No hemos podido calcular tu pedido.");
      setQuote(data);
      if (!startedTracked.current) {
        startedTracked.current = true;
        track("checkout_started", { value: data.total, currency: "EUR", items: data.lines.length });
      }
    }).catch(() => !cancelled && setQuoteError("No hemos podido calcular tu pedido. Revisa tu conexión."));
    return () => {
      cancelled = true;
    };
  }, [hydrated, items, delivery]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    idempotencyKey.current = null; // datos distintos → petición distinta
  };

  function buildRequest() {
    return {
      idempotencyKey: (idempotencyKey.current ??= crypto.randomUUID()),
      items,
      customer: { name: form.name, email: form.email, phone: form.phone },
      deliveryMethod: delivery,
      address:
        delivery === "shipping"
          ? { line1: form.line1, line2: form.line2, city: form.city, postalCode: form.postalCode, province: form.province, country: form.country }
          : null,
      notes: form.notes,
      acceptTerms: form.acceptTerms,
    };
  }

  /** Si el cliente volvió atrás desde Stripe, libera la reserva anterior antes de crear otra. */
  async function releasePreviousAttempt() {
    const pending = readPendingOrder();
    if (!pending) return;
    await postJson("/api/checkout/cancel", pending).catch(() => undefined);
    clearPendingOrder();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting.current) return; // evita doble envío
    setFormError(null);

    const request = buildRequest();
    const parsed = checkoutRequestSchema.safeParse(request);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      setFormError("Revisa los campos marcados.");
      return;
    }
    setErrors({});
    submitting.current = true;
    setBusy(true);

    try {
      await releasePreviousAttempt();
      const { ok, data } = await postJson<{
        url?: string;
        orderId?: string;
        orderNumber?: string;
        accessToken?: string | null;
        total?: number;
        error?: string;
        fields?: Record<string, string>;
        issues?: LineIssue[];
      }>("/api/checkout", request);
      if (ok && data.url) {
        track("payment_started", { value: data.total, currency: "EUR", order_number: data.orderNumber });
        if (data.orderId && data.accessToken) savePendingOrder({ order: data.orderId, token: data.accessToken });
        window.location.assign(data.url);
        return; // se mantiene "busy" hasta que el navegador navega
      }
      idempotencyKey.current = null;
      if (data.fields) setErrors(data.fields);
      if (data.issues && quote) setQuote({ ...quote, issues: data.issues });
      setFormError(data.error ?? "No hemos podido iniciar el pago. Inténtalo de nuevo.");
    } catch {
      idempotencyKey.current = null;
      setFormError("No hemos podido iniciar el pago. Revisa tu conexión e inténtalo de nuevo.");
    }
    submitting.current = false;
    setBusy(false);
  }

  if (!hydrated) return <div className="cart__loading" aria-busy="true">Cargando…</div>;

  if (!state.lines.length) {
    return (
      <div className="cart-empty">
        <Icon name="cart" size={56} strokeWidth={1.2} />
        <h2>Tu carrito está vacío</h2>
        <p>Añade productos antes de tramitar el pedido.</p>
        <div className="cart-empty__ctas">
          <a href="/equipamiento" className="btn btn--dark">Ver equipamiento</a>
        </div>
      </div>
    );
  }

  const issues = quote?.issues ?? [];
  const err = (key: string) =>
    errors[key] ? <span className="co-field__error" id={`err-${key}`} role="alert">{errors[key]}</span> : null;
  const field = (key: keyof Form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, errKey = String(key)) => (
    <label className="co-field">
      <span>{label}</span>
      <input
        value={String(form[key])}
        onChange={(e) => set(key, e.target.value as never)}
        aria-invalid={Boolean(errors[errKey])}
        aria-describedby={errors[errKey] ? `err-${errKey}` : undefined}
        {...props}
      />
      {err(errKey)}
    </label>
  );

  return (
    <form className="cart checkout" onSubmit={submit} noValidate>
      <div className="checkout__main">
        <fieldset className="co-section" disabled={busy}>
          <legend>1. Tus datos</legend>
          <div className="co-grid">
            {field("name", "Nombre y apellidos", { autoComplete: "name", required: true }, "customer.name")}
            {field("email", "Email", { type: "email", autoComplete: "email", required: true }, "customer.email")}
            {field("phone", "Teléfono (opcional)", { type: "tel", autoComplete: "tel" }, "customer.phone")}
          </div>
        </fieldset>

        <fieldset className="co-section" disabled={busy}>
          <legend>2. Entrega</legend>
          <div className="co-options" role="radiogroup">
            {deliveryOptions.map((o) => (
              <label key={o.id} className={`co-option${delivery === o.id ? " is-active" : ""}`}>
                <input type="radio" name="delivery" value={o.id} checked={delivery === o.id} onChange={() => setDelivery(o.id)} />
                <span className="co-option__body">
                  <strong>{o.label}</strong>
                  <small>{o.description}</small>
                </span>
                <span className="co-option__price">
                  {o.price === 0 ? "Gratis" : formatPrice(o.price)}
                  {o.freeFrom != null && <small>Gratis desde {formatPrice(o.freeFrom)}</small>}
                </span>
              </label>
            ))}
          </div>
          {err("deliveryMethod")}

          {delivery === "shipping" && shippingOption && (
            <div className="co-grid">
              {field("line1", "Dirección", { autoComplete: "address-line1", required: true }, "address.line1")}
              {field("line2", "Piso, puerta… (opcional)", { autoComplete: "address-line2" }, "address.line2")}
              {field("postalCode", "Código postal", { autoComplete: "postal-code", inputMode: "numeric", required: true }, "address.postalCode")}
              {field("city", "Ciudad", { autoComplete: "address-level2", required: true }, "address.city")}
              {field("province", "Provincia", { autoComplete: "address-level1", required: true }, "address.province")}
              <label className="co-field">
                <span>País</span>
                <select value={form.country} onChange={(e) => set("country", e.target.value)} autoComplete="country">
                  {shippingOption.countries.map((c) => (
                    <option key={c} value={c}>{countryName(c)}</option>
                  ))}
                </select>
                {err("address.country")}
              </label>
            </div>
          )}
          {err("address")}
        </fieldset>

        <fieldset className="co-section" disabled={busy}>
          <legend>3. Notas del pedido (opcional)</legend>
          <label className="co-field co-field--full">
            <span className="sr-only">Notas del pedido</span>
            <textarea value={form.notes} maxLength={500} rows={3} onChange={(e) => set("notes", e.target.value)} placeholder="Indicaciones para la entrega, horario…" />
            {err("notes")}
          </label>
        </fieldset>
      </div>

      <aside className="cart__summary" aria-label="Resumen del pedido">
        <h2>Resumen</h2>
        {!quote && !quoteError && <p className="cart__note" aria-busy="true">Comprobando precios y stock…</p>}
        {quoteError && <p className="cart__error" role="alert">{quoteError}</p>}

        {quote && (
          <>
            <ul className="co-lines">
              {quote.lines.map((l) => (
                <li key={`${l.productId}-${l.color}-${l.size}`}>
                  <span>
                    {l.quantity} × {l.brand} {l.name}
                    {(l.color || l.size) && <small>{[l.color, l.size && `Talla ${l.size}`].filter(Boolean).join(" · ")}</small>}
                  </span>
                  <strong>{formatPrice(l.lineTotal)}</strong>
                </li>
              ))}
            </ul>

            {issues.length > 0 && (
              <div className="co-issues" role="alert">
                {issues.map((i) => {
                  const line = state.lines[i.index];
                  return (
                    <p key={`${i.index}-${i.code}`}>
                      <strong>{line ? `${line.brand} ${line.name}` : "Producto"}:</strong> {i.message}{" "}
                      {line && i.code === "insufficient_stock" && i.available > 0 ? (
                        <button type="button" onClick={() => cart.setQuantity(line.lineId, i.available)}>Ajustar a {i.available}</button>
                      ) : line ? (
                        <button type="button" onClick={() => cart.remove(line.lineId)}>Quitar</button>
                      ) : null}
                    </p>
                  );
                })}
              </div>
            )}

            <dl>
              <div>
                <dt>Subtotal</dt>
                <dd>{formatPrice(quote.subtotal)}</dd>
              </div>
              <div>
                <dt>{delivery === "pickup" ? "Recogida en tienda" : "Envío"}</dt>
                <dd>{quote.shipping == null ? "—" : quote.shipping === 0 ? "Gratis" : formatPrice(quote.shipping)}</dd>
              </div>
              <div className="cart__total">
                <dt>Total</dt>
                <dd>{formatPrice(quote.total)}</dd>
              </div>
            </dl>
            <p className="cart__tax">
              {pricesIncludeTax
                ? quote.taxAmount != null
                  ? `IVA incluido (${formatPrice(quote.taxAmount)}).`
                  : "IVA incluido."
                : quote.taxAmount != null
                  ? `Incluye ${formatPrice(quote.taxAmount)} de IVA.`
                  : ""}
            </p>
          </>
        )}

        <label className="co-terms">
          <input type="checkbox" checked={form.acceptTerms} onChange={(e) => set("acceptTerms", e.target.checked)} disabled={busy} />
          <span>
            He leído y acepto las <a href={termsUrl} target="_blank" rel="noopener">condiciones de venta</a> y la{" "}
            <a href={privacyUrl} target="_blank" rel="noopener">política de privacidad</a>.
          </span>
        </label>
        {err("acceptTerms")}

        <button type="submit" className="btn btn--accent btn--block cart__cta" disabled={busy || !quote || issues.length > 0}>
          {busy ? "Conectando con el pago seguro…" : quote ? `Pagar ${formatPrice(quote.total)}` : "Pagar"}
        </button>
        <p className="cart__note">
          Pago seguro con Stripe. No guardamos los datos de tu tarjeta. Reservamos tus productos mientras completas el pago.
        </p>
        {formError && <p className="cart__error" role="alert">{formError}</p>}
        <a href="/carrito" className="link-arrow cart__continue">
          <Icon name="chevron-left" size={14} /> Volver al carrito
        </a>
      </aside>
    </form>
  );
}
