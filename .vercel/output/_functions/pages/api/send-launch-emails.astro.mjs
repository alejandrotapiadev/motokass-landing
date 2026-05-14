import { s as supabase } from '../../chunks/supabase_DZVgsdGI.mjs';
import { Resend } from 'resend';
export { renderers } from '../../renderers.mjs';

const resend = new Resend(undefined                              );

const prerender = false;
const POST = async () => {
  try {
    const { data: subscribers, error: fetchError } = await supabase.from("subscribers").select("id,email").eq("notified", false);
    if (fetchError) throw fetchError;
    if (!subscribers?.length) return new Response("No hay suscriptores pendientes", { status: 200 });
    for (const sub of subscribers) {
      await resend.emails.send({
        from: undefined                           ,
        to: sub.email,
        subject: "¡Ya abrimos MOTOKASS!",
        html: `<p>Hola 👋<br>¡La página de MOTOKASS ya está abierta! Visítanos y descubre lo que preparamos.</p>`
        //TODO PREPARAR PLANTILLA PARA EL CORREO
      });
      await supabase.from("subscribers").update({ notified: true }).eq("id", sub.id);
    }
    return new Response(JSON.stringify({ success: true, count: subscribers.length }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Error interno" }), { status: 500 });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
