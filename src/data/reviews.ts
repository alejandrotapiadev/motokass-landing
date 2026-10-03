/**
 * Reseñas reales de clientes.
 *
 * Los testimonios anteriores eran ficticios: aquí solo reseñas reales, copiadas
 * literalmente (p. ej. de Google) e indicando la fuente. Si se vacía, la web
 * solo enlaza a las reseñas de Google.
 * Se muestran todas, en este orden, en el carrusel de la home: poner primero
 * las mejores. Nombre abreviado ("Carlos M.") y `url` al enlace de la reseña.
 */
export interface Review {
  author: string;
  text: string;
  rating: 1 | 2 | 3 | 4 | 5;
  /** Texto de fecha, p. ej. "Abril 2026". */
  date: string;
  source: "google" | "facebook" | "tienda";
  url?: string;
}

/**
 * Las 5 mejores reseñas de Google, elegidas por MOTOKASS (octubre 2026).
 * Texto literal; nombre abreviado. Google solo da fechas relativas ("hace 7
 * meses"), así que la fecha es aproximada (mes o año).
 */
export const REVIEWS: Review[] = [
  {
    author: "Alejandro",
    text: "Trato y amabilidad excepcional, me han resuelto mis dudas y me solucionan el problema de la moto. Recomendable 100%.",
    rating: 5,
    date: "Septiembre 2026",
    source: "google",
  },
  {
    author: "Ignacio C.",
    text: "Javi es un gran profesional. Muchos repuestos para tu moto, ropa, equipación y accesorios.",
    rating: 5,
    date: "Marzo 2026",
    source: "google",
  },
  {
    author: "Mar K.",
    text: "Un gran profesional, tanto en el trato como en el servicio",
    rating: 5,
    date: "Agosto 2026",
    source: "google",
  },
  {
    author: "Amilcar R.",
    text: "Excelente atención y resultados en La búsqueda de soluciones para las motos, repuestos y servicios.. lo recomiendo",
    rating: 5,
    date: "2024",
    source: "google",
  },
  {
    author: "Antonio M.",
    text: "El trato muy bueno saben lo que quieres y te aconsejan sobre todo lo de tu moto",
    rating: 5,
    date: "2022",
    source: "google",
  },
];
