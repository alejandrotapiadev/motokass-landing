export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isFechaFutura(fecha: string): boolean {
  const citaDate = new Date(fecha + 'T00:00:00');
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return citaDate >= hoy;
}

export interface BodyCita {
  nombre?: string;
  email?: string;
  fecha?: string;
  hora?: string;
  vehiculo?: string;
  motivo?: string;
}

export function validarCita(body: BodyCita): string | null {
  const { nombre, email, fecha, hora, vehiculo, motivo } = body;
  if (!nombre?.trim() || !email?.trim() || !fecha || !hora || !vehiculo?.trim() || !motivo) {
    return 'Faltan campos obligatorios';
  }
  if (!isValidEmail(email)) return 'El email no es válido';
  if (!isFechaFutura(fecha)) return 'La fecha no puede ser en el pasado';
  return null;
}

export interface BodyContacto {
  name?: string;
  email?: string;
  message?: string;
}

export function validarContacto(body: BodyContacto): string | null {
  const { name, email, message } = body;
  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return 'Nombre, email y mensaje son obligatorios';
  }
  if (!isValidEmail(email)) return 'El email no es válido';
  if (message.trim().length < 10) return 'El mensaje es demasiado corto (mínimo 10 caracteres)';
  return null;
}
