// Rate limiter en memoria por IP. Válido para instancias serverless de Vercel
// (cada función tiene su propio proceso; suficiente para frenar abusos básicos).

interface Bucket {
  count:     number;
  resetAt:   number;
}

const store = new Map<string, Bucket>();

interface RateLimitOptions {
  /** Máximo de peticiones permitidas en la ventana */
  max:        number;
  /** Duración de la ventana en milisegundos */
  windowMs:   number;
}

/**
 * Devuelve `true` si la IP ha superado el límite, `false` si puede continuar.
 */
export function isRateLimited(ip: string, opts: RateLimitOptions): boolean {
  const now = Date.now();
  const bucket = store.get(ip);

  if (!bucket || now > bucket.resetAt) {
    store.set(ip, { count: 1, resetAt: now + opts.windowMs });
    return false;
  }

  bucket.count += 1;
  if (bucket.count > opts.max) return true;

  return false;
}

/** Extrae la IP real teniendo en cuenta los headers de Vercel/proxies */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}
