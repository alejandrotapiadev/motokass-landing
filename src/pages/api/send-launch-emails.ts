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
        html: `<p>Hola 👋<br>¡La página de MOTOKASS ya está abierta! Visítanos y descubre lo que preparamos.</p>`, //TODO PREPARAR PLANTILLA PARA EL CORREO
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
