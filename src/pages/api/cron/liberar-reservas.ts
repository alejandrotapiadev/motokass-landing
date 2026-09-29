/**
 * GET /api/cron/liberar-reservas
 * Red de seguridad (Vercel Cron): cancela pedidos pendientes cuya reserva de
 * stock venció sin que llegara checkout.session.expired. Protegido con
 * CRON_SECRET (Vercel envía Authorization: Bearer <CRON_SECRET>).
 */
export const prerender = false;

import type { APIRoute } from "astro";
import { getOrdersRepo, json } from "@/lib/commerce/server";

export const GET: APIRoute = async ({ request }) => {
  const secret = import.meta.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return json({ error: "No autorizado" }, 401);
  }
  try {
    const released = await (await getOrdersRepo()).releaseExpiredReservations();
    return json({ released });
  } catch (err) {
    console.error("[cron/liberar-reservas]", (err as Error)?.message);
    return json({ error: "error" }, 500);
  }
};
