import { DayPicker, type DayClickEventHandler } from 'react-day-picker';
import { es } from 'date-fns/locale';
import 'react-day-picker/dist/style.css';

const today = new Date();
today.setHours(0, 0, 0, 0);

function isWeekend(date: Date) {
  return date.getDay() === 0 || date.getDay() === 6;
}

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

export default function CalendarioCitas() {
  const handleDayClick: DayClickEventHandler = (day, modifiers) => {
    if (modifiers.disabled || modifiers.cerrado) return;
    const y = day.getFullYear();
    const m = String(day.getMonth() + 1).padStart(2, '0');
    const d = String(day.getDate()).padStart(2, '0');
    window.location.href = `/CitaPrevia?fecha=${y}-${m}-${d}`;
  };

  return (
    <DayPicker
      locale={es}
      weekStartsOn={1}
      showOutsideDays={false}
      disabled={[{ before: today }]}
      modifiers={{
        // Weekend pero no hoy → rojo
        cerrado: (date) => isWeekend(date) && !isSameDay(date, today),
        // Días laborables desde hoy → azul
        disponible: (date) => !isWeekend(date) && date >= today,
      }}
      modifiersClassNames={{
        cerrado: 'day-cerrado',
        disponible: 'day-disponible',
      }}
      onDayClick={handleDayClick}
    />
  );
}
