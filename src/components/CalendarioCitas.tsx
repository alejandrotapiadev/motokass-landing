import { DayPicker, type DayClickEventHandler } from 'react-day-picker';
import { es } from 'date-fns/locale';
import 'react-day-picker/dist/style.css';
import { esFestivo, esDiaCerrado, toDateStr } from '../utils/festivos';

const today = new Date();
today.setHours(0, 0, 0, 0);

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

export default function CalendarioCitas() {
  const handleDayClick: DayClickEventHandler = (day, modifiers) => {
    if (modifiers.disabled || modifiers.cerrado || esFestivo(day)) return;
    const dateStr = toDateStr(day);
    window.location.href = `/CitaPrevia?fecha=${dateStr}`;
  };

  return (
    <DayPicker
      locale={es}
      weekStartsOn={1}
      showOutsideDays={false}
      disabled={[{ before: today }]}
      modifiers={{
        // Cerrado: finde de semana O festivo, pero nunca hoy (hoy siempre se resalta como "hoy")
        cerrado: (date) => esDiaCerrado(date) && !isSameDay(date, today),
        // Disponible: laborable, no festivo, desde hoy
        disponible: (date) => !esDiaCerrado(date) && date >= today,
      }}
      modifiersClassNames={{
        cerrado: 'day-cerrado',
        disponible: 'day-disponible',
      }}
      onDayClick={handleDayClick}
    />
  );
}
