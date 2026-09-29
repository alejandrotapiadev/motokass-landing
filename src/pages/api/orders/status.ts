/**
 * POST /api/orders/status  { order, token }
 * Estado del pedido para la página de éxito. Solo lectura; el estado real
 * lo fija el webhook de Stripe. POST para no dejar el token en logs de URL.
 */
export const prerender = false;

import type { APIRoute } from "astro";
import { orderAccessSchema } from "@/lib/commerce/checkout-schema";
import { getPublicOrder } from "@/lib/commerce/checkout-service";
import { getOrdersRepo, isSameOrigin, json, readJson } from "@/lib/commerce/server";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";

export const POST: APIRoute = async ({ request }) => {
  if (!isSameOrigin(request)) return json({ error: "Origen no permitido." }, 403);
  if (isRateLimited(`order-status:${getClientIp(request)}`, { max: 120, windowMs: 10 * 60 * 1000 })) {
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
    const result = await getPublicOrder(parsed.data.order, parsed.data.token, await getOrdersRepo());
    return result.ok ? json({ order: result.data }) : json({ error: result.error }, result.status);
  } catch (err) {
    console.error("[orders/status]", (err as Error)?.message);
    return json({ error: "No hemos podido consultar el pedido." }, 500);
  }
};
