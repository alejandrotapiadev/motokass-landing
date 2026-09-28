/**
 * Páginas de ayuda de la tienda (/ayuda/[tema]).
 * Solo existen si la política correspondiente está configurada en
 * STORE_CONFIG; así nunca se publica una política inventada.
 */
import { STORE_CONFIG, type StoreConfig } from "./store-config";

export interface HelpTopic {
  slug: "envios" | "devoluciones" | "tallas";
  title: string;
  paragraphs: string[];
}

const eur = (n: number) => n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });

export function getHelpTopics(config: StoreConfig = STORE_CONFIG): HelpTopic[] {
  const topics: HelpTopic[] = [];
  if (config.shipping) {
    const s = config.shipping;
    topics.push({
      slug: "envios",
      title: "Envíos",
      paragraphs: [
        `Enviamos a ${s.zones}. Plazo estimado: ${s.deliveryTime}.`,
        `Coste de envío: ${eur(s.flatRate)}${s.freeFrom != null ? `. Gratis en pedidos desde ${eur(s.freeFrom)}` : ""}.`,
      ],
    });
  }
  if (config.returns) {
    topics.push({
      slug: "devoluciones",
      title: "Devoluciones",
      paragraphs: [`Dispones de ${config.returns.days} días para devolver tu pedido.`, config.returns.details],
    });
  }
  if (config.sizeGuideAvailable) {
    topics.push({
      slug: "tallas",
      title: "Guía de tallas",
      paragraphs: ["Cada marca tiene su propia tabla de tallas; la encontrarás en la ficha de cada producto."],
    });
  }
  return topics;
}
