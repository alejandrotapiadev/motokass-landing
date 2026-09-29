/**
 * Emails transaccionales de pedido (cliente y tienda).
 *
 * Se envían SOLO desde el webhook de Stripe tras confirmar el pago. Cada
 * email se "reclama" en base de datos antes de enviarse (claim_order_email),
 * de modo que un webhook repetido nunca lo duplica; si el envío falla se
 * libera la marca y el error hace que Stripe reintente el webhook.
 */
import { esc } from "../sanitize";
import { SITE } from "../site";
import type { EmailKind, OrderRecord, OrdersRepo } from "./orders-repo";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export type EmailSender = (msg: EmailMessage) => Promise<void>;

const eur = (n: number) => n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });

function itemsTable(o: OrderRecord): string {
  const rows = o.items
    .map(
      (i) => `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;">
          <strong>${esc(i.brand)} ${esc(i.name)}</strong>
          ${i.variantName ? `<br><span style="color:#666;font-size:13px;">${esc(i.variantName)}</span>` : ""}
          ${i.sku ? `<br><span style="color:#999;font-size:12px;">SKU ${esc(i.sku)}</span>` : ""}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;">${i.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;">${eur(i.unitPrice)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;">${eur(i.subtotal)}</td>
      </tr>`,
    )
    .join("");
  const totals = [
    ["Subtotal", eur(o.subtotal)],
    ...(o.discountAmount > 0 ? [["Descuento", `-${eur(o.discountAmount)}`]] : []),
    [o.deliveryMethod === "pickup" ? "Recogida en tienda" : "Envío", o.shippingAmount === 0 ? "Gratis" : eur(o.shippingAmount)],
    ...(o.taxAmount != null ? [[o.pricesIncludeTax ? "IVA incluido" : "IVA", eur(o.taxAmount)]] : []),
  ]
    .map(([k, v]) => `<tr><td colspan="3" style="padding:6px 12px;text-align:right;color:#555;">${k}</td><td style="padding:6px 12px;text-align:right;">${v}</td></tr>`)
    .join("");
  return `<table style="width:100%;border-collapse:collapse;font-size:14px;">
    <thead><tr style="background:#f8fafc;text-align:left;">
      <th style="padding:10px 12px;">Producto</th><th style="padding:10px 12px;text-align:center;">Cant.</th>
      <th style="padding:10px 12px;text-align:right;">Precio</th><th style="padding:10px 12px;text-align:right;">Total</th>
    </tr></thead>
    <tbody>${rows}${totals}
      <tr><td colspan="3" style="padding:12px;text-align:right;font-weight:700;font-size:16px;">Total</td>
      <td style="padding:12px;text-align:right;font-weight:700;font-size:16px;">${eur(o.total)}</td></tr>
    </tbody></table>`;
}

function addressBlock(o: OrderRecord): string {
  if (o.deliveryMethod === "pickup" || !o.shippingAddress) {
    return `<p style="margin:0;"><strong>Recogida en tienda</strong><br>${esc(SITE.address.street)}, ${esc(SITE.address.postalCode)} ${esc(SITE.address.city)}</p>`;
  }
  const a = o.shippingAddress;
  return `<p style="margin:0;">${esc(o.customerName)}<br>${esc(a.line1)}${a.line2 ? `<br>${esc(a.line2)}` : ""}<br>
    ${esc(a.postalCode)} ${esc(a.city)} (${esc(a.province)})<br>${esc(a.country)}</p>`;
}

function layout(title: string, subtitle: string, body: string): string {
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
  <div style="max-width:640px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,.1);">
    <div style="background:#1F3F7A;padding:24px 32px;">
      <h1 style="color:white;margin:0;font-size:20px;">${title}</h1>
      <p style="color:rgba(255,255,255,.75);margin:4px 0 0;font-size:14px;">${subtitle}</p>
    </div>
    <div style="padding:28px 32px;color:#222;line-height:1.6;">${body}</div>
  </div></body></html>`;
}

export function renderCustomerOrderEmail(o: OrderRecord): Omit<EmailMessage, "to"> {
  const body = `
    <p>Hola ${esc(o.customerName)},</p>
    <p>Hemos recibido el pago de tu pedido <strong>${esc(o.orderNumber)}</strong>. Te avisaremos cuando esté ${
      o.deliveryMethod === "pickup" ? "listo para recoger" : "en camino"
    }.</p>
    ${itemsTable(o)}
    <h3 style="margin:24px 0 8px;font-size:15px;">${o.deliveryMethod === "pickup" ? "Recogida" : "Dirección de envío"}</h3>
    ${addressBlock(o)}
    ${o.notes ? `<h3 style="margin:24px 0 8px;font-size:15px;">Notas</h3><p style="margin:0;white-space:pre-wrap;">${esc(o.notes)}</p>` : ""}
    <p style="margin-top:28px;">¿Alguna duda? Responde a este email o llámanos al ${esc(SITE.phoneDisplay)}.</p>
    <p style="color:#888;font-size:12px;">${esc(SITE.name)} · ${esc(SITE.address.street)}, ${esc(SITE.address.postalCode)} ${esc(SITE.address.city)} ·
      <a href="${SITE.url}/condiciones-venta" style="color:#1F3F7A;">Condiciones de venta</a></p>`;
  return {
    subject: `Pedido ${o.orderNumber} confirmado — ${SITE.name}`,
    html: layout(`Pedido ${esc(o.orderNumber)} confirmado`, "Gracias por tu compra", body),
    replyTo: SITE.email,
  };
}

export function renderStoreOrderEmail(o: OrderRecord): Omit<EmailMessage, "to"> {
  const attention = o.requiresAttention
    ? `<div style="background:#fef2f2;border:1px solid #fecaca;color:#991b1b;padding:12px 16px;border-radius:8px;margin-bottom:20px;">
        <strong>Requiere revisión:</strong> ${esc(o.attentionReason ?? "")}</div>`
    : "";
  const body = `${attention}
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px;">
      <tr style="background:#f8fafc;"><td style="padding:8px 12px;font-weight:700;width:35%;">Pedido</td><td style="padding:8px 12px;">${esc(o.orderNumber)}</td></tr>
      <tr><td style="padding:8px 12px;font-weight:700;">Cliente</td><td style="padding:8px 12px;">${esc(o.customerName)}</td></tr>
      <tr style="background:#f8fafc;"><td style="padding:8px 12px;font-weight:700;">Email</td><td style="padding:8px 12px;"><a href="mailto:${esc(o.customerEmail)}">${esc(o.customerEmail)}</a></td></tr>
      ${o.customerPhone ? `<tr><td style="padding:8px 12px;font-weight:700;">Teléfono</td><td style="padding:8px 12px;"><a href="tel:${esc(o.customerPhone)}">${esc(o.customerPhone)}</a></td></tr>` : ""}
      <tr style="background:#f8fafc;"><td style="padding:8px 12px;font-weight:700;">Entrega</td><td style="padding:8px 12px;">${o.deliveryMethod === "pickup" ? "Recogida en tienda" : "Envío a domicilio"}</td></tr>
      <tr><td style="padding:8px 12px;font-weight:700;">Pago Stripe</td><td style="padding:8px 12px;">${esc(o.stripePaymentIntentId ?? "—")}</td></tr>
    </table>
    ${itemsTable(o)}
    <h3 style="margin:24px 0 8px;font-size:15px;">Entrega</h3>
    ${addressBlock(o)}
    ${o.notes ? `<h3 style="margin:24px 0 8px;font-size:15px;">Notas del cliente</h3><p style="margin:0;white-space:pre-wrap;">${esc(o.notes)}</p>` : ""}`;
  return {
    subject: `${o.requiresAttention ? "[REVISAR] " : ""}Nuevo pedido ${o.orderNumber} — ${eur(o.total)}`,
    html: layout(`Nuevo pedido ${esc(o.orderNumber)}`, "Pago confirmado por Stripe", body),
    replyTo: o.customerEmail,
  };
}

/**
 * Envía los emails pendientes de un pedido pagado. Idempotente.
 * Lanza error si algún envío falla (tras liberar su marca) para que el
 * webhook responda 500 y Stripe lo reintente.
 */
export async function sendOrderEmails(orderId: string, deps: { repo: OrdersRepo; send: EmailSender; storeEmail: string }): Promise<EmailKind[]> {
  const order = await deps.repo.getOrder(orderId);
  if (!order || !["paid", "partially_refunded", "refunded"].includes(order.paymentStatus)) return [];

  const sent: EmailKind[] = [];
  const errors: string[] = [];
  const jobs: [EmailKind, EmailMessage][] = [
    ["customer", { to: order.customerEmail, ...renderCustomerOrderEmail(order) }],
    ["store", { to: deps.storeEmail, ...renderStoreOrderEmail(order) }],
  ];

  for (const [kind, msg] of jobs) {
    if (!(await deps.repo.claimEmail(orderId, kind))) continue;
    try {
      await deps.send(msg);
      sent.push(kind);
    } catch (err) {
      await deps.repo.releaseEmailClaim(orderId, kind);
      errors.push(`${kind}: ${(err as Error)?.message ?? "error"}`);
    }
  }
  if (errors.length) throw new Error(`order_email_failed ${order.orderNumber} (${errors.join("; ")})`);
  return sent;
}
