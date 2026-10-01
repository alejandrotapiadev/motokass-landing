/**
 * POST /api/checkout
 * Valida el carrito contra Supabase, crea el pedido pendiente reservando
 * stock y devuelve la URL de Stripe Checkout. Ver src/lib/commerce/checkout-service.ts
 */
export const prerender = false;

import type { APIRoute } from "astro";
import { checkoutRequestSchema, fieldErrors } from "@/lib/commerce/checkout-schema";
import { MESSAGES, startCheckout } from "@/lib/commerce/checkout-service";
import { STORE_CONFIG } from "@/lib/commerce/store-config";
import { getOrdersRepo, getPaymentGateway, getSiteUrl, isOnlineCheckoutReady, isSameOrigin, json, readJson } from "@/lib/commerce/server";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";

export const POST: APIRoute = async ({ request }) => {
  if (!isSameOrigin(request)) return json({ error: "Origen no permitido." }, 403);
  if (isRateLimited(`checkout:${getClientIp(request)}`, { max: 10, windowMs: 10 * 60 * 1000 })) {
    return json({ error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." }, 429);
  }
  if (!isOnlineCheckoutReady()) return json({ error: MESSAGES.unavailable }, 503);

  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return json({ error: "Solicitud no válida." }, 400);
  }

  const parsed = checkoutRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "Revisa los datos del formulario.", fields: fieldErrors(parsed.error) }, 400);
  }

  try {
    const result = await startCheckout(parsed.data, {
      repo: await getOrdersRepo(),
      gateway: getPaymentGateway(),
      config: STORE_CONFIG,
      siteUrl: getSiteUrl(request),
    });
    if (!result.ok) {
      const { ok: _ok, status, ...rest } = result;
      return json(rest, status);
    }
    return json(result.data);
  } catch (err) {
    console.error("[checkout] error inesperado", (err as Error)?.message);
    return json({ error: MESSAGES.paymentStart }, 500);
  }
};
