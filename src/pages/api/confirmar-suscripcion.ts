export const prerender = false;
import type { APIRoute } from "astro";
import supabase from "@/lib/supabase";

export const GET: APIRoute = async ({ request, redirect }) => {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return redirect("/suscripcion-confirmada?ok=false");
  }

  const { data, error } = await supabase
    .from("subscribers")
    .select("id, confirmado")
    .eq("token", token)
    .single();

  if (error || !data) {
    return redirect("/suscripcion-confirmada?ok=false");
  }

  if (data.confirmado) {
    // Ya confirmado previamente
    return redirect("/suscripcion-confirmada?ok=true&ya=true");
  }

  await supabase
    .from("subscribers")
    .update({ confirmado: true })
    .eq("id", data.id);

  return redirect("/suscripcion-confirmada?ok=true");
};
