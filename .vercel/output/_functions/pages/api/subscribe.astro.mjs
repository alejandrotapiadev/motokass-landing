import { s as supabase } from '../../chunks/supabase_DZVgsdGI.mjs';
export { renderers } from '../../renderers.mjs';

const POST = async ({ request }) => {
  try {
    const { email } = await request.json();
    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email requerido" }),
        { status: 400 }
      );
    }
    const { error } = await supabase.from("subscribers").insert([{ email }]);
    if (error) {
      if (error.code === "23505") {
        return new Response(
          JSON.stringify({ error: "Este email ya está registrado" }),
          { status: 400 }
        );
      }
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500 }
      );
    }
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200 }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Error interno" }),
      { status: 500 }
    );
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
