/**
 * POST /api/webhooks/stripe
 * Endpoint a registrar en Stripe Dashboard → Developers → Webhooks con los
 * eventos listados en docs/checkout-pagos.md. Lógica en
 * src/lib/commerce/stripe-webhook.ts.
 */
export const prerender = false;

import type { APIRoute } from "astro";
import { processStripeWebhook } from "@/lib/commerce/stripe-webhook";
import { getWebhookDeps, json } from "@/lib/commerce/server";

export const POST: APIRoute = async ({ request }) => {
  let deps;
  try {
    deps = await getWebhookDeps();
  } catch (err) {
    console.error("[stripe-webhook] configuración incompleta", (err as Error)?.message);
    return json({ error: "not_configured" }, 503);
  }
  // Cuerpo RAW: la firma se calcula sobre los bytes exactos recibidos.
  const rawBody = await request.text();
  const { status, body } = await processStripeWebhook(rawBody, request.headers.get("stripe-signature"), deps);
  return json(body, status);
};
