export const prerender = false;
import type { APIRoute } from "astro";
import supabase from "@/lib/supabase";
import resend from "@/lib/resend";

export const POST: APIRoute = async () => {
  try {
    // 1️⃣ Obtener emails no notificados
    const { data: subscribers, error: fetchError } = await supabase
      .from("subscribers")
      .select("id,email")
      .eq("notified", false);

    if (fetchError) throw fetchError;
    if (!subscribers?.length) return new Response("No hay suscriptores pendientes", { status: 200 });

    // 2️⃣ Enviar email a cada usuario
    for (const sub of subscribers) {
      await resend.emails.send({
        from: import.meta.env.RESEND_FROM!,
        to: sub.email,
        subject: "¡Ya abrimos MOTOKASS!",
        html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);max-width:600px;width:100%;">
        <!-- Cabecera -->
        <tr>
          <td style="background:#1F3F7A;padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:1px;">MOTOKASS</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Concesionario Rieju &amp; Sherco · Ávila</p>
          </td>
        </tr>
        <!-- Cuerpo -->
        <tr>
          <td style="padding:40px 40px 32px;">
            <h2 style="margin:0 0 16px;color:#1e293b;font-size:22px;">¡Ya estamos en marcha! 🚀</h2>
            <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">
              Hola,<br><br>
              Te escribimos porque te apuntaste a nuestra lista de espera. Hoy por fin podemos decirte:
              <strong>la web de MOTOKASS ya está abierta.</strong>
            </p>
            <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
              Descubre nuestro catálogo de motos Rieju y Sherco, reserva tu cita de taller online y conoce todas las ofertas de la temporada.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
              <tr>
                <td style="background:#1F3F7A;border-radius:8px;">
                  <a href="https://motokass.com" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">Visitar MOTOKASS →</a>
                </td>
              </tr>
            </table>
            <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.5;">
              Si no solicitaste esta suscripción, puedes ignorar este correo.<br>
              C. de la Virgen María, 20 · Ávila · <a href="tel:+34920254044" style="color:#1F3F7A;">920 25 40 44</a>
            </p>
          </td>
        </tr>
        <!-- Pie -->
        <tr>
          <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">© ${new Date().getFullYear()} MOTOKASS · Distribuidor oficial Rieju y Sherco en Ávila</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
      });

      // 3️⃣ Marcar como notificado
      await supabase
        .from("subscribers")
        .update({ notified: true })
        .eq("id", sub.id);
    }

    return new Response(JSON.stringify({ success: true, count: subscribers.length }), { status: 200 });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Error interno" }), { status: 500 });
  }
};
