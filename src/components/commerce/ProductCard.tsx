import { useMemo, useState } from "react";
import Icon from "../ui/Icon";
import type { EquipmentProduct } from "../../lib/catalog/types";
import { AVAILABILITY_LABEL, discountPercent, formatPrice } from "../../lib/catalog/types";
import { variantStock } from "../../lib/catalog/equipment-mapper";
import { addToCart } from "../../lib/commerce/actions";
import "./ProductCard.css";

export interface ProductCardProps {
  product: EquipmentProduct;
  /** Icono de categoría para el placeholder sin imagen. */
  categoryIcon?: string;
  /** Carga prioritaria (primeras tarjetas visibles). */
  priority?: boolean;
}

const BADGE_LABEL = { new: "Nuevo", sale: "Oferta", bestseller: "Más vendido" } as const;

export function Stars({ rating, count }: { rating: number; count?: number }) {
  const rounded = Math.round(rating * 2) / 2;
  return (
    <span className="pc-stars" aria-label={`Valoración ${rating.toLocaleString("es-ES")} de 5${count ? `, ${count} reseñas` : ""}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= rounded ? "on" : i - 0.5 === rounded ? "half" : ""} aria-hidden="true">★</span>
      ))}
      {count ? <span className="pc-stars__count">({count})</span> : null}
    </span>
  );
}

export default function ProductCard({ product: p, categoryIcon = "helmet", priority = false }: ProductCardProps) {
  const [color, setColor] = useState<string | null>(p.colors[0]?.name ?? null);
  const [pickingSize, setPickingSize] = useState(false);
  const discount = discountPercent(p);
  const soldOut = p.availability === "out_of_stock";
  const hasSizes = p.sizes.length > 0;

  const images = useMemo(() => {
    const byColor = p.colors.find((c) => c.name === color)?.images;
    return byColor?.length ? byColor : p.images;
  }, [p, color]);

  const sizeAvailable = (size: string) => variantStock(p, color, size) > 0;

  function add(size: string | null) {
    addToCart(p, { color, size });
    setPickingSize(false);
  }

  function onPrimary() {
    if (soldOut) return;
    if (hasSizes) setPickingSize((v) => !v);
    else add(null);
  }

  const badges = [...p.badges].filter((b) => b !== "sale" || !discount);

  return (
    <article className={`pc${soldOut ? " pc--soldout" : ""}${pickingSize ? " pc--picking" : ""}`}>
      <a href={p.url} className="pc__media" aria-label={p.name} tabIndex={-1}>
        {images[0] ? (
          <>
            <img
              src={images[0]}
              alt={p.name}
              loading={priority ? "eager" : "lazy"}
              decoding="async"
              width={600}
              height={600}
              className="pc__img"
            />
            {images[1] && <img src={images[1]} alt="" loading="lazy" decoding="async" width={600} height={600} className="pc__img pc__img--alt" />}
          </>
        ) : (
          <span className="pc__placeholder">
            <Icon name={categoryIcon} size={56} strokeWidth={1.2} />
          </span>
        )}
        <span className="pc__badges">
          {discount && <span className="badge badge--accent">-{discount}%</span>}
          {badges.map((b) => (
            <span key={b} className={`badge${b === "new" ? " badge--brand" : ""}`}>{BADGE_LABEL[b]}</span>
          ))}
          {p.isMock && <span className="badge pc__mock" title="Producto de ejemplo (solo desarrollo)">Demo</span>}
        </span>
      </a>

      {/* Selector rápido de talla (hover en desktop / tap en móvil) */}
      {hasSizes && !soldOut && (
        <div className="pc__quick" aria-label="Añadir rápido: elige talla">
          <span className="pc__quick-label">Añadir talla</span>
          <div className="pc__sizes">
            {p.sizes.map((s) => (
              <button
                key={s}
                type="button"
                className="pc__size"
                disabled={!sizeAvailable(s)}
                onClick={() => add(s)}
                aria-label={`Añadir talla ${s}${sizeAvailable(s) ? "" : " (agotada)"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="pc__body">
        <span className="pc__brand">{p.brand}</span>
        <h3 className="pc__name">
          <a href={p.url}>{p.name}</a>
        </h3>

        {p.rating != null && <Stars rating={p.rating} count={p.reviewCount} />}

        {p.colors.length > 1 && (
          <div className="pc__colors" role="radiogroup" aria-label="Color">
            {p.colors.map((c) => (
              <button
                key={c.name}
                type="button"
                role="radio"
                aria-checked={c.name === color}
                aria-label={c.name}
                title={c.name}
                className="pc__swatch"
                style={{ background: c.hex ?? "#ccc" }}
                onClick={() => setColor(c.name)}
              />
            ))}
          </div>
        )}

        <div className="pc__price">
          {p.price != null && <span className={`pc__now${discount ? " pc__now--sale" : ""}`}>{formatPrice(p.price)}</span>}
          {p.compareAtPrice != null && <s className="pc__was">{formatPrice(p.compareAtPrice)}</s>}
        </div>

        <span className={`pc__stock pc__stock--${p.availability}`}>{AVAILABILITY_LABEL[p.availability]}</span>

        <button
          type="button"
          className={`btn btn--sm btn--block ${soldOut ? "btn--outline" : "btn--dark"} pc__cta`}
          onClick={onPrimary}
          disabled={soldOut}
          aria-expanded={hasSizes ? pickingSize : undefined}
        >
          {soldOut ? "Sin stock" : hasSizes ? (pickingSize ? "Cerrar" : "Añadir al carrito") : "Añadir al carrito"}
        </button>
      </div>
    </article>
  );
}
