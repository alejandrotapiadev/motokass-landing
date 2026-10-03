/**
 * Datos reales del negocio en un único sitio.
 * Todos proceden de la web actual (footer, Map, JSON-LD). No añadir datos
 * que no hayan sido confirmados por el cliente.
 */

export const SITE = {
  name: "MOTOKASS",
  /** NIF del titular (publicado en /aviso-legal). */
  taxId: "70811225K",
  url: "https://motokass.com",
  email: "info@motokass.com",
  phone: "+34920254044",
  phoneDisplay: "920 25 40 44",
  address: {
    street: "C. de la Virgen María, 20",
    postalCode: "05003",
    city: "Ávila",
    region: "Ávila",
    country: "ES",
  },
  geo: { lat: 40.6525721, lng: -4.6851359 },
  brands: ["Rieju", "Sherco"] as const,
  social: {
    instagram: "https://www.instagram.com/moto_kass/",
    facebook: "https://www.facebook.com/p/MOTO-KASS-100063585579672/?locale=es_ES",
  },
  googleReviewsUrl:
    "https://www.google.com/maps/place/Moto+Kass/@40.6525761,-4.6877108,17z/data=!3m1!4b1!4m6!3m5!1s0xd40f313ac754745:0xcfeb50ee9c5664c1!8m2!3d40.6525721!4d-4.6851359!16s%2Fg%2F11kl1070yk",
  schedule: [
    { days: "Lunes a jueves", hours: "10:00–13:45 · 15:30–19:00" },
    { days: "Viernes", hours: "10:00–14:00" },
    { days: "Sábado y domingo", hours: "Cerrado" },
  ],
} as const;

/**
 * Blog oculto temporalmente: sin enlaces (menú, footer, home), fuera del
 * buscador y del sitemap, y /blog responde 404. Poner a true para reactivarlo.
 */
export const BLOG_ENABLED = false;

export const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${SITE.geo.lat},${SITE.geo.lng}`;

/** Número WhatsApp (solo servidor: WHATSAPP_NUMBER no es PUBLIC_). */
export function getWhatsappNumber(): string {
  return import.meta.env.WHATSAPP_NUMBER ?? "34600000000";
}

export function whatsappUrl(message = "Hola, me gustaría información sobre "): string {
  return `https://wa.me/${getWhatsappNumber()}?text=${encodeURIComponent(message)}`;
}
