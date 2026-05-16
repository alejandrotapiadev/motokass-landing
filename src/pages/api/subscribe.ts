export const prerender = false;
import type { APIRoute } from "astro";
import supabase from "@/lib/supabase";
import resend from "@/lib/resend";
import { isRateLimited, getClientIp } from "@/lib/rateLimit";

// SQL necesario en Supabase (ejecutar una sola vez):
// ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS token TEXT;
// ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS confirmado BOOLEAN DEFAULT FALSE;

function emailConfirmacion(email: string, token: string): string {
  const url = `https://motokass.com/api/confirmar-suscripcion?token=${token}`;
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
  <div style="max-width:560px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,.1);">
    <div style="background:#1F3F7A;padding:28px 32px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:22px;letter-spacing:2px;">MOTOKASS</h1>
      <p style="color:rgba(255,255,255,.7);margin:4px 0 0;font-size:13px;">Taller y Tienda de Motos · Ávila</p>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#1F3F7A;margin-top:0;font-size:18px;">Confirma tu suscripción</h2>
      <p style="color:#444;line-height:1.7;">Hemos recibido tu solicitud para recibir novedades y ofertas de MOTOKASS. Para completar la suscripción, haz clic en el botón:</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${url}" style="display:inline-block;background:#1F3F7A;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;">Confirmar suscripción</a>
      </div>
      <p style="color:#888;font-size:13px;line-height:1.6;">Si no has solicitado esta suscripción, ignora este email. El enlace expira en 48 horas.</p>
      <hr style="border:none;border-top:1px solid #f1f5f9;margin:24px 0;" />
      <p style="color:#aaa;font-size:12px;margin:0;">MOTOKASS · C. de la Virgen María, 20 · Ávila · <a href="https://motokass.com/privacidad" style="color:#aaa;">Política de privacidad</a></p>
    </div>
  </div></body></html>`;
}

export const POST: APIRoute = async ({ request }) => {
  // Rate limit: 3 intentos por IP cada hora
  if (isRateLimited(getClientIp(request), { max: 3, windowMs: 60 * 60 * 1000 })) {
    return new Response(JSON.stringify({ error: "Demasiadas solicitudes. Inténtalo más tarde." }), { status: 429 });
  }

  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "Email requerido" }), { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "Email no válido" }), { status: 400 });
    }

    // Comprobar si ya existe confirmado
    const { data: existente } = await supabase
      .from("subscribers")
      .select("confirmado")
      .eq("email", email)
      .single();

    if (existente?.confirmado) {
      return new Response(JSON.stringify({ error: "Este email ya está suscrito." }), { status: 400 });
    }

    // Generar token único
    const token = crypto.randomUUID();

    if (existente) {
      // Ya existe pero no confirmado — renovar el token
      await supabase.from("subscribers").update({ token }).eq("email", email);
    } else {
      const { error } = await supabase
        .from("subscribers")
        .insert([{ email, token, confirmado: false }]);
      if (error) {
        return new Response(JSON.stringify({ error: "Error al registrar el email." }), { status: 500 });
      }
    }

    // Enviar email de confirmación
    const from = import.meta.env.RESEND_FROM!;
    await resend.emails.send({
      from,
      to: email,
      subject: "Confirma tu suscripción a MOTOKASS",
      html: emailConfirmacion(email, token),
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch {
    return new Response(JSON.stringify({ error: "Error interno" }), { status: 500 });
  }
};
