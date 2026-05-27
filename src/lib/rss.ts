/**
 * Fetcher de RSS para medios españoles de motos.
 * Sin dependencias externas — parseo con regex sobre el XML del feed.
 */

export interface RSSItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source: string;
}

// Medios de referencia en español — feeds RSS públicos
const RSS_FEEDS: { url: string; name: string }[] = [
  { url: "https://www.motociclismo.es/feed/",      name: "Motociclismo" },
  { url: "https://www.motorpasionmoto.com/feed",   name: "Motor Pasión Moto" },
  { url: "https://www.mundomotero.com/feed",        name: "Mundo Motero" },
];

// ── helpers ────────────────────────────────────────────────────────────────

function extractTag(xml: string, tag: string): string {
  // CDATA
  const cdata = new RegExp(
    `<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`,
    "i"
  ).exec(xml);
  if (cdata) return cdata[1].trim();

  // Contenido normal
  const normal = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i").exec(xml);
  if (normal) return normal[1].trim();

  // <link> puede ser self-closing o tener texto suelto (Atom)
  if (tag === "link") {
    const atom = /<link[^>]+href="([^"]+)"/.exec(xml);
    if (atom) return atom[1];
  }

  return "";
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── fetch de un feed ───────────────────────────────────────────────────────

async function fetchFeed(
  url: string,
  sourceName: string
): Promise<RSSItem[]> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "MOTOKASS-Blog-Bot/1.0 (+https://motokass.com)",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) return [];

    const text = await res.text();
    const items: RSSItem[] = [];
    const re = /<item>([\s\S]*?)<\/item>/gi;
    let m: RegExpExecArray | null;

    while ((m = re.exec(text)) !== null && items.length < 5) {
      const block = m[1];
      const title = stripHtml(extractTag(block, "title"));
      const raw =
        extractTag(block, "description") ||
        extractTag(block, "content:encoded") ||
        extractTag(block, "summary");
      const description = stripHtml(raw).slice(0, 380);
      const link =
        extractTag(block, "link") ||
        extractTag(block, "guid");
      const pubDate =
        extractTag(block, "pubDate") ||
        extractTag(block, "dc:date") ||
        extractTag(block, "published");

      if (title && title.length > 8) {
        items.push({ title, description, link, pubDate, source: sourceName });
      }
    }
    return items;
  } catch (err) {
    console.warn(`[rss] Error en ${url}:`, err);
    return [];
  }
}

// ── API pública ────────────────────────────────────────────────────────────

/**
 * Obtiene hasta 12 noticias recientes de motos de varias fuentes RSS.
 * Devuelve array vacío si todos los feeds fallan (no lanza error).
 */
export async function fetchMotorcycleNews(): Promise<RSSItem[]> {
  const results = await Promise.allSettled(
    RSS_FEEDS.map(({ url, name }) => fetchFeed(url, name))
  );

  const all: RSSItem[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") all.push(...r.value);
  }

  // Deduplicar por título normalizado
  const seen = new Set<string>();
  const unique = all.filter((item) => {
    const key = item.title.toLowerCase().slice(0, 45);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique.slice(0, 12);
}
