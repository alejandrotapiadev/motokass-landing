export const prerender = false;
import type { APIRoute } from "astro";
import resend from "@/lib/resend";
import { validarContacto } from "@/lib/validacion";

function emailContacto(nombre: string, email: string, telefono: string | undefined, mensaje: string): string {
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,.1);">
    <div style="background:#1F3F7A;padding:24px 32px;">
      <h1 style="color:white;margin:0;font-size:20px;">Nuevo mensaje de contacto</h1>
      <p style="color:rgba(255,255,255,.7);margin:4px 0 0;font-size:14px;">motokass.com</p>
    </div>
    <div style="padding:32px;">
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr style="background:#f8fafc;"><td style="padding:12px 16px;font-weight:700;color:#555;width:35%;">Nombre</td><td style="padding:12px 16px;">${nombre}</td></tr>
        <tr><td style="padding:12px 16px;font-weight:700;color:#555;">Email</td><td style="padding:12px 16px;"><a href="mailto:${email}" style="color:#1F3F7A;">${email}</a></td></tr>
        ${telefono ? `<tr style="background:#f8fafc;"><td style="padding:12px 16px;font-weight:700;color:#555;">Teléfono</td><td style="padding:12px 16px;"><a href="tel:${telefono}" style="color:#1F3F7A;">${telefono}</a></td></tr>` : ""}
      </table>
      <div style="background:#f8fafc;border-left:4px solid #1F3F7A;padding:16px 20px;border-radius:0 8px 8px 0;">
        <p style="margin:0 0 8px;font-weight:700;color:#555;">Mensaje</p>
        <p style="margin:0;color:#333;line-height:1.7;white-space:pre-wrap;">${mensaje}</p>
      </div>
      <p style="margin-top:28px;">
        <a href="mailto:${email}" style="background:#1F3F7A;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;">Responder a ${nombre}</a>
      </p>
    </div>
  </div></body></html>`;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, email, phone, message } = body;

    const errorValidacion = validarContacto({ name, email, message });
    if (errorValidacion) {
      return new Response(JSON.stringify({ error: errorValidacion }), { status: 400 });
    }

    const from = import.meta.env.RESEND_FROM!;
    const tallerEmail = import.meta.env.TALLER_EMAIL || from;

    await resend.emails.send({
      from,
      to: tallerEmail,
      replyTo: email,
      subject: `Contacto web: ${name}`,
      html: emailContacto(name, email, phone, message),
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch {
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), { status: 500 });
  }
};
