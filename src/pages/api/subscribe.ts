import type { APIRoute } from "astro";
import supabase from "@/lib/supabase";

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email } = await request.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email requerido" }),
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("subscribers")
      .insert([{ email }]);

    if (error) {
      if (error.code === "23505") { // código PostgreSQL para unique violation
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
