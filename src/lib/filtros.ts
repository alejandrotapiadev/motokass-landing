export interface MotoFiltro {
  specs?: {
    tipo_motor?: string;
    potencia_kw?: number | null;
    cilindrada_cc?: number | null;
  };
}

export function getTipoMotor(moto: MotoFiltro): '2T' | '4T' | 'Eléctrico' | null {
  const t = (moto.specs?.tipo_motor || '').toLowerCase();
  if (
    t.includes('eléctrico') || t.includes('electrico') ||
    t.includes('shimano') || moto.specs?.potencia_kw != null
  ) return 'Eléctrico';
  if (t.includes('2t') || t.includes('2 temps')) return '2T';
  if (t.includes('4t') || t.includes('4 temps')) return '4T';
  return null;
}

export function getRangoCilindrada(
  moto: MotoFiltro
): '50cc' | '125cc' | '250-500cc' | 'mas500cc' | 'electrico' | null {
  if (getTipoMotor(moto) === 'Eléctrico') return 'electrico';
  const cc = moto.specs?.cilindrada_cc;
  if (!cc) return null;
  if (cc <= 50)  return '50cc';
  if (cc <= 125) return '125cc';
  if (cc <= 500) return '250-500cc';
  return 'mas500cc';
}

export function getPaginas(total: number, actual: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const p: (number | '…')[] = [1];
  if (actual > 3) p.push('…');
  for (let i = Math.max(2, actual - 1); i <= Math.min(total - 1, actual + 1); i++) p.push(i);
  if (actual < total - 2) p.push('…');
  p.push(total);
  return p;
}
