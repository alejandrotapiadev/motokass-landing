import { formatPriceRound } from '../lib/catalog/types';
import './MotoCard.css';

const CC_ESTANDAR = [50, 125, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 950, 1000, 1100, 1200, 1300];

function redondearCC(cc) {
  if (!cc) return null;
  const nearest = CC_ESTANDAR.reduce((prev, cur) =>
    Math.abs(cur - cc) < Math.abs(prev - cc) ? cur : prev
  );
  return `${nearest} cc`;
}

/**
 * Tarjeta de moto. El enlace a la ficha lo pone el contenedor
 * (FilteredMotoList, home…), la tarjeta solo pinta.
 *
 * @param {{
 *   marca: string, nombre: string, imagen: string,
 *   precio?: number | null, stock?: boolean, nuevo?: boolean,
 *   specs?: Record<string, any>, categoria?: string | null,
 *   subcategoria?: string | null, priority?: boolean,
 *   [key: string]: any
 * }} props
 */
export default function MotoCard({
  marca, nombre, precio = null, imagen, stock = true, nuevo = false, specs = {},
  categoria = null, subcategoria = null, priority = false,
}) {
  const cilindrada = redondearCC(specs?.cilindrada_cc);
  const tipo = subcategoria || categoria;
  const electrica = specs?.potencia_kw != null && !specs?.cilindrada_cc;
  return (
      <div className={`moto-card${!stock ? " moto-card--agotada" : ""}`}>
        <div className="moto-card__img-wrapper">
          {imagen && (
            <img
              src={imagen}
              alt={nombre}
              loading={priority ? 'eager' : 'lazy'}
              decoding="async"
              width="640"
              height="400"
            />
          )}
          <div className="moto-card__badges">
            {nuevo && stock && <span className="badge-nuevo">Nuevo</span>}
            {!stock && <span className="badge-agotada">Sin stock</span>}
          </div>
        </div>

        <div className="moto-info">
          <div className="moto-info__top">
            <span className={`moto-brand ${marca.toLowerCase()}`}>{marca}</span>
            {tipo && <span className="moto-tipo">{tipo}</span>}
          </div>
          <h3>{nombre}</h3>
          <div className="moto-meta">
            {cilindrada && <span className="moto-cc">{cilindrada}</span>}
            {electrica && <span className="moto-cc">{specs.potencia_kw} kW</span>}
            <span className={`moto-stock${stock ? '' : ' moto-stock--no'}`}>{stock ? 'Disponible' : 'Consultar disponibilidad'}</span>
          </div>
          <div className="moto-foot">
            {precio != null
              ? <span className="price"><small>PVP</small> {formatPriceRound(precio)}</span>
              : <span className="price price--ask">Consultar precio</span>}
            <span className="moto-cta" aria-hidden="true">Ver moto →</span>
          </div>
        </div>
      </div>
  );
}
