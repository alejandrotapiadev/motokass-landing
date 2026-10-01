/**
 * POST /api/checkout/quote
 * Resumen del pedido con precios, stock y envío reales (no escribe nada).
 */
export const prerender = false;

import type { APIRoute } from "astro";
import { quoteRequestSchema } from "@/lib/commerce/checkout-schema";
import { MESSAGES, quoteCheckout } from "@/lib/commerce/checkout-service";
import { STORE_CONFIG } from "@/lib/commerce/store-config";
import { getOrdersRepo, isOnlineCheckoutReady, isSameOrigin, json, readJson } from "@/lib/commerce/server";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";

export const POST: APIRoute = async ({ request }) => {
  if (!isSameOrigin(request)) return json({ error: "Origen no permitido." }, 403);
  if (isRateLimited(`quote:${getClientIp(request)}`, { max: 60, windowMs: 10 * 60 * 1000 })) {
    return json({ error: "Demasiadas solicitudes. Inténtalo más tarde." }, 429);
  }
  if (!isOnlineCheckoutReady()) return json({ error: MESSAGES.unavailable }, 503);

  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return json({ error: "Solicitud no válida." }, 400);
  }
  const parsed = quoteRequestSchema.safeParse(body);
  if (!parsed.success) return json({ error: "Tu carrito no es válido." }, 400);

  try {
    return json(await quoteCheckout(parsed.data, { repo: await getOrdersRepo(), config: STORE_CONFIG }));
  } catch (err) {
    console.error("[checkout/quote]", (err as Error)?.message);
    return json({ error: "No hemos podido calcular tu pedido. Inténtalo de nuevo." }, 500);
  }
};
