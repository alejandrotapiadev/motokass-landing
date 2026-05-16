export const prerender = false;
import type { APIRoute } from "astro";
import supabase from "@/lib/supabase";
import resend from "@/lib/resend";
import { validarCita } from "@/lib/validacion";
import { isRateLimited, getClientIp } from "@/lib/rateLimit";
import { esc } from "@/lib/sanitize";

const MOTIVO_LABEL: Record<string, string> = {
  mantenimiento: "Mantenimiento",
  revision: "Revisión",
  reparacion: "Reparación",
  diagnostico: "Diagnóstico electrónico",
  otro: "Otro",
};

function emailConfirmacionCliente(nombre: string, fecha: string, hora: string, vehiculo: string, motivo: string, resumen?: string): string {
  const filas = [
    ["Fecha",      esc(fecha)],
    ["Hora",       esc(hora)],
    ["Vehículo",   esc(vehiculo)],
    ["Servicio",   esc(MOTIVO_LABEL[motivo] ?? motivo)],
    ...(resumen ? [["Descripción", esc(resumen)]] : []),
  ];
  const filasHtml = filas
    .map(([k, v], i) => `<tr style="background:${i % 2 === 0 ? "#f8fafc" : "white"}"><td style="padding:12px 16px;font-weight:700;color:#555;width:40%;">${k}</td><td style="padding:12px 16px;color:#222;">${v}</td></tr>`)
    .join("");

  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,.1);">
    <div style="background:#1F3F7A;padding:32px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:26px;letter-spacing:2px;">MOTOKASS</h1>
      <p style="color:rgba(255,255,255,.75);margin:6px 0 0;font-size:14px;">Taller y Tienda de Motos · Ávila</p>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#1F3F7A;margin-top:0;">Cita confirmada</h2>
      <p style="color:#444;">Hola <strong>${esc(nombre)}</strong>, tu cita ha quedado registrada. Aquí tienes el resumen:</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;">${filasHtml}</table>
      <p style="color:#666;font-size:14px;margin-top:24px;">Si necesitas cancelar o modificar la cita, llámanos:</p>
      <a href="tel:+34920254044" style="display:inline-block;background:#1F3F7A;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;">📞 +34 920 254 044</a>
    </div>
    <div style="background:#f8fafc;padding:16px;text-align:center;color:#aaa;font-size:13px;"><p style="margin:0;">MOTOKASS · Ávila, España · motokass.com</p></div>
  </div></body></html>`;
}

function emailNotificacionTaller(nombre: string, email: string, telefono: string | undefined, fecha: string, hora: string, vehiculo: string, motivo: string, resumen?: string): string {
  const filas = [
    ["Cliente",  esc(nombre)],
    ["Email",    `<a href="mailto:${esc(email)}" style="color:#1F3F7A;">${esc(email)}</a>`],
    ...(telefono ? [["Teléfono", `<a href="tel:${esc(telefono)}" style="color:#1F3F7A;">${esc(telefono)}</a>`]] : []),
    ["Fecha",    esc(fecha)],
    ["Hora",     esc(hora)],
    ["Vehículo", esc(vehiculo)],
    ["Servicio", esc(MOTIVO_LABEL[motivo] ?? motivo)],
    ...(resumen ? [["Descripción", esc(resumen)]] : []),
  ];
  const filasHtml = filas
    .map(([k, v], i) => `<tr style="background:${i % 2 === 0 ? "#f8fafc" : "white"}"><td style="padding:12px 16px;font-weight:700;color:#555;width:35%;">${k}</td><td style="padding:12px 16px;">${v}</td></tr>`)
    .join("");

  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,.1);">
    <div style="background:#dc2626;padding:24px 32px;">
      <h1 style="color:white;margin:0;font-size:20px;">Nueva cita agendada</h1>
    </div>
    <div style="padding:32px;">
      <table style="width:100%;border-collapse:collapse;">${filasHtml}</table>
      <p style="margin-top:24px;"><a href="mailto:${email}" style="background:#1F3F7A;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;">Responder al cliente</a></p>
    </div>
  </div></body></html>`;
}

export const POST: APIRoute = async ({ request }) => {
  // Rate limit: 5 citas por IP cada 10 minutos
  if (isRateLimited(getClientIp(request), { max: 5, windowMs: 10 * 60 * 1000 })) {
    return new Response(JSON.stringify({ error: "Demasiadas solicitudes. Inténtalo más tarde." }), { status: 429 });
  }

  try {
    const body = await request.json();
    const { nombre, email, telefono, fecha, hora, vehiculo, motivo, resumen } = body;

    const errorValidacion = validarCita({ nombre, email, fecha, hora, vehiculo, motivo });
    if (errorValidacion) {
      return new Response(JSON.stringify({ error: errorValidacion }), { status: 400 });
    }

    const { error: dbError } = await supabase
      .from("citas")
      .insert([{ nombre, email, telefono: telefono || null, fecha, hora, vehiculo, motivo, resumen: resumen || null }]);

    if (dbError) {
      return new Response(JSON.stringify({ error: "Error al guardar la cita. Inténtalo de nuevo." }), { status: 500 });
    }

    const from = import.meta.env.RESEND_FROM!;
    const tallerEmail = import.meta.env.TALLER_EMAIL || from;

    await Promise.all([
      resend.emails.send({
        from,
        to: email,
        subject: "Cita confirmada en MOTOKASS",
        html: emailConfirmacionCliente(nombre, fecha, hora, vehiculo, motivo, resumen),
      }),
      resend.emails.send({
        from,
        to: tallerEmail,
        replyTo: email,
        subject: `Nueva cita: ${nombre} — ${fecha} ${hora}`,
        html: emailNotificacionTaller(nombre, email, telefono, fecha, hora, vehiculo, motivo, resumen),
      }),
    ]);

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch {
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), { status: 500 });
  }
};
