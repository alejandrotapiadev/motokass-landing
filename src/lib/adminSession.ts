// Genera y verifica tokens de sesión firmados con HMAC-SHA256.
// Sustituye el valor plano "ok" por un token criptográfico atado al ADMIN_PASSWORD.

const MENSAJE = "motokass-admin-v1";

async function hmac(secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(MENSAJE));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Genera el token de sesión firmado con la contraseña del admin. */
export async function generarTokenAdmin(): Promise<string> {
  const password = import.meta.env.ADMIN_PASSWORD ?? "";
  return hmac(password);
}

/** Devuelve true si el valor de la cookie coincide con el token esperado. */
export async function esTokenValido(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) return false;
  const esperado = await generarTokenAdmin();
  // Comparación en tiempo constante para evitar timing attacks
  if (cookieValue.length !== esperado.length) return false;
  let diff = 0;
  for (let i = 0; i < esperado.length; i++) {
    diff |= cookieValue.charCodeAt(i) ^ esperado.charCodeAt(i);
  }
  return diff === 0;
}
