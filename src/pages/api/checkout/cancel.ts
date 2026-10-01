/**
 * POST /api/checkout/cancel  { order, token }
 * El cliente volvió de Stripe sin pagar: expira la sesión y libera el stock
 * reservado. Nunca marca nada como pagado.
 */
export const prerender = false;

import type { APIRoute } from "astro";
import { orderAccessSchema } from "@/lib/commerce/checkout-schema";
import { cancelCheckout } from "@/lib/commerce/checkout-service";
import { getOrdersRepo, getPaymentGateway, isSameOrigin, json, readJson } from "@/lib/commerce/server";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";

export const POST: APIRoute = async ({ request }) => {
  if (!isSameOrigin(request)) return json({ error: "Origen no permitido." }, 403);
  if (isRateLimited(`cancel:${getClientIp(request)}`, { max: 20, windowMs: 10 * 60 * 1000 })) {
    return json({ error: "Demasiadas solicitudes. Inténtalo más tarde." }, 429);
  }

  let body: unknown;
  try {
    body = await readJson(request, 2_000);
  } catch {
    return json({ error: "Solicitud no válida." }, 400);
  }
  const parsed = orderAccessSchema.safeParse(body);
  if (!parsed.success) return json({ error: "No encontramos este pedido." }, 404);

  try {
    const result = await cancelCheckout(parsed.data.order, parsed.data.token, {
      repo: await getOrdersRepo(),
      gateway: getPaymentGateway(),
    });
    return result.ok ? json({ order: result.data }) : json({ error: result.error }, result.status);
  } catch (err) {
    console.error("[checkout/cancel]", (err as Error)?.message);
    return json({ error: "No hemos podido actualizar el pedido." }, 500);
  }
};
