import { useEffect, useState } from "react";
import Icon from "../ui/Icon";
import { SHOP_URL } from "../../lib/catalog/equipment-categories";
import { getLastListing } from "../../lib/catalog/listing-context";

interface Props {
  /** Destino si no hay listado previo (entrada directa a la ficha): la categoría del producto. */
  fallbackHref: string;
  fallbackLabel: string;
}

/** Flecha para volver de la ficha al listado, conservando categoría, filtros, orden y página. */
export default function BackToListing({ fallbackHref, fallbackLabel }: Props) {
  const [last, setLast] = useState<string | null>(null);

  useEffect(() => {
    const url = getLastListing();
    if (url?.startsWith(SHOP_URL)) setLast(url);
  }, []);

  function onClick(e: React.MouseEvent) {
    if (!last || !document.referrer) return;
    // Si venimos justo de ese listado, el "atrás" del navegador conserva además el scroll.
    const ref = new URL(document.referrer);
    if (ref.origin === location.origin && ref.pathname + ref.search === last) {
      e.preventDefault();
      history.back();
    }
  }

  return (
    <a href={last ?? fallbackHref} className="pd-back" onClick={onClick}>
      <Icon name="arrow-left" size={18} strokeWidth={2} />
      <span>{last ? "Volver al listado" : fallbackLabel}</span>
    </a>
  );
}
