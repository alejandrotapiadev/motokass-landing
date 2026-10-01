/**
 * Dependencias reales del checkout (solo servidor): Stripe, Supabase y
 * Resend a partir de variables de entorno. Ningún secreto llega al cliente:
 * estas variables no llevan prefijo PUBLIC_.
 */
import Stripe from "stripe";
import { STORE_CONFIG, isOnlineCheckoutConfigured } from "./store-config";
import { createOrdersRepo, supabaseRpc, type OrdersRepo } from "./orders-repo";
import { stripeGateway, type PaymentGateway } from "./stripe-checkout";
import { sendOrderEmails, type EmailSender } from "./order-emails";
import type { WebhookDeps } from "./stripe-webhook";

const env = import.meta.env;

/** El pago online funciona solo con configuración comercial + claves + BD. */
export function isOnlineCheckoutReady(): boolean {
  return (
    isOnlineCheckoutConfigured(STORE_CONFIG) &&
    Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET && env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

let stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY no configurada");
  stripe ??= new Stripe(env.STRIPE_SECRET_KEY, { maxNetworkRetries: 2, appInfo: { name: "motokass-web" } });
  return stripe;
}

let repo: OrdersRepo | null = null;
export async function getOrdersRepo(): Promise<OrdersRepo> {
  if (!repo) {
    const { default: supabase } = await import("../supabase");
    repo = createOrdersRepo(supabaseRpc(supabase));
  }
  return repo;
}

export function getPaymentGateway(): PaymentGateway {
  return stripeGateway(getStripe());
}

const sendWithResend: EmailSender = async (msg) => {
  const { default: resend } = await import("../resend");
  const { error } = await resend.emails.send({
    from: env.RESEND_FROM!,
    to: msg.to,
    subject: msg.subject,
    html: msg.html,
    replyTo: msg.replyTo,
  });
  if (error) throw new Error(error.message);
};

export async function getWebhookDeps(): Promise<WebhookDeps> {
  const secret = env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET no configurada");
  const orders = await getOrdersRepo();
  const client = getStripe();
  return {
    repo: orders,
    verify: (rawBody, signature) => client.webhooks.constructEventAsync(rawBody, signature, secret),
    notifyPaid: (orderId) =>
      sendOrderEmails(orderId, {
        repo: orders,
        send: sendWithResend,
        storeEmail: env.STORE_ORDERS_EMAIL || env.TALLER_EMAIL || env.RESEND_FROM!,
      }),
  };
}

/** URL pública para success/cancel. SITE_URL en producción; si no, el origen de la petición. */
export function getSiteUrl(request: Request): string {
  return (env.SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
}

/* ─────────────── Utilidades HTTP ─────────────── */

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });
}

/**
 * Protección CSRF: astro.config tiene checkOrigin desactivado, así que las
 * rutas que modifican estado comprueban que el Origin sea el propio sitio.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const allowed = new Set([new URL(request.url).origin]);
  if (env.SITE_URL) allowed.add(new URL(env.SITE_URL).origin);
  return allowed.has(origin);
}

export async function readJson(request: Request, maxBytes = 32_000): Promise<unknown> {
  const text = await request.text();
  if (text.length > maxBytes) throw new Error("payload_too_large");
  return JSON.parse(text);
}
