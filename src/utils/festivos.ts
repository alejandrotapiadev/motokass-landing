// Festivos laborales de Ávila 2026
// Fuente: calendarioslaborales.com/calendario-laboral-avila-2026.htm
// Incluye: nacionales · Castilla y León · locales Ávila
const FESTIVOS_2026 = new Set([
  '2026-01-01', // Año Nuevo
  '2026-01-06', // Reyes Magos
  '2026-04-02', // Jueves Santo
  '2026-04-03', // Viernes Santo
  '2026-04-23', // Día de Castilla y León
  '2026-05-01', // Día del Trabajo
  '2026-05-02', // San Segundo (sábado — ya cerrado, incluido por completitud)
  '2026-08-15', // Asunción de la Virgen (sábado — idem)
  '2026-10-12', // Fiesta Nacional
  '2026-10-15', // Santa Teresa de Jesús
  '2026-11-02', // Todos los Santos (trasladado del domingo 1/11)
  '2026-12-07', // Día de la Constitución (trasladado del domingo 6/12)
  '2026-12-08', // Inmaculada Concepción
  '2026-12-25', // Navidad
]);

export function toDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function esFestivo(date: Date): boolean {
  return FESTIVOS_2026.has(toDateStr(date));
}

export function esDiaCerrado(date: Date): boolean {
  const dow = date.getDay();
  return dow === 0 || dow === 6 || esFestivo(date);
}
