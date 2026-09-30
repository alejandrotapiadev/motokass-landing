import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "../ui/Icon";
import { Stars } from "./ProductCard";
import type { EquipmentProduct } from "../../lib/catalog/types";
import { AVAILABILITY_LABEL, discountPercent, formatPrice } from "../../lib/catalog/types";
import { availabilityFromStock, findVariant, variantStock } from "../../lib/catalog/equipment-mapper";
import { addToCart } from "../../lib/commerce/actions";
import { track } from "../../lib/analytics";
import "./ProductDetail.css";

interface Props {
  product: EquipmentProduct;
  categoryIcon: string;
  /** URL de WhatsApp para dudas de talla (se genera en servidor). */
  sizeHelpUrl: string;
  sizeGuideUrl?: string | null;
}

export default function ProductDetail({ product: p, categoryIcon, sizeHelpUrl, sizeGuideUrl }: Props) {
  // Color inicial: el primero con stock (si lo hay), para no abrir la ficha en una variante agotada.
  const [color, setColor] = useState<string | null>(
    (p.colors.find((c) => variantStock(p, c.name, null) > 0) ?? p.colors[0])?.name ?? null,
  );
  // Talla única: se preselecciona solo si tiene stock.
  const [size, setSize] = useState<string | null>(
    p.sizes.length === 1 && variantStock(p, color, p.sizes[0]) > 0 ? p.sizes[0] : null,
  );
  const [qty, setQty] = useState(1);
  const [imgIndex, setImgIndex] = useState(0);
  const [sizeError, setSizeError] = useState(false);
  const [showSticky, setShowSticky] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  // Barra fija de compra en móvil cuando el botón principal no está visible
  useEffect(() => {
    const el = actionsRef.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => setShowSticky(!e.isIntersecting && e.boundingClientRect.top > 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    track("view_product", {
      item_id: p.sku ?? p.id,
      item_name: p.name,
      item_brand: p.brand,
      item_category: p.category,
      price: p.price,
      currency: "EUR",
    });
  }, [p.id]);

  const images = useMemo(() => {
    const byColor = p.colors.find((c) => c.name === color)?.images;
    return byColor?.length ? byColor : p.images;
  }, [p, color]);
  useEffect(() => setImgIndex(0), [color]);

  function pickColor(name: string) {
    setColor(name);
    setQty(1);
    // La talla elegida puede no tener stock en el nuevo color.
    if (size && variantStock(p, name, size) <= 0) setSize(null);
  }

  const variant = findVariant(p, color, size);
  const price = variant?.price ?? p.price;
  const discount = discountPercent({ price, compareAtPrice: p.compareAtPrice });
  const needsSize = p.sizes.length > 0;
  const stockForSelection = needsSize && !size ? variantStock(p, color, null) : variantStock(p, color, size);
  const availability = p.variants.length ? availabilityFromStock(stockForSelection) : p.availability;
  const soldOut = availability === "out_of_stock";
  const maxQty = Math.max(1, Math.min(10, stockForSelection || 10));
  const hasSoldOutSizes = needsSize && p.sizes.some((s) => variantStock(p, color, s) <= 0);

  function add(goToCart: boolean) {
    if (soldOut) return;
    if (needsSize && !size) {
      setSizeError(true);
      document.getElementById("pd-sizes")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    addToCart(p, { color, size, quantity: qty });
    if (goToCart) {
      track("begin_checkout", { value: (price ?? 0) * qty, currency: "EUR", source: "buy_now" });
      window.location.href = "/carrito";
    }
  }

  return (
    <div className="pd">
      {/* Galería */}
      <div className="pd__gallery">
        <div className="pd__main">
          {images[imgIndex] ? (
            <img key={images[imgIndex]} src={images[imgIndex]} alt={`${p.name}${color ? ` — ${color}` : ""}`} width={900} height={900} fetchPriority="high" />
          ) : (
            <span className="pd__placeholder"><Icon name={categoryIcon} size={120} strokeWidth={1} /></span>
          )}
          {discount && <span className="badge badge--accent pd__discount">-{discount}%</span>}
          {images.length > 1 && (
            <>
              <button type="button" className="pd__nav pd__nav--prev" onClick={() => setImgIndex((i) => (i - 1 + images.length) % images.length)} aria-label="Imagen anterior">
                <Icon name="chevron-left" size={22} />
              </button>
              <button type="button" className="pd__nav pd__nav--next" onClick={() => setImgIndex((i) => (i + 1) % images.length)} aria-label="Imagen siguiente">
                <Icon name="chevron-right" size={22} />
              </button>
            </>
          )}
        </div>
        {images.length > 1 && (
          <div className="pd__thumbs" role="tablist" aria-label="Imágenes del producto">
            {images.map((src, i) => (
              <button key={src} type="button" role="tab" aria-selected={i === imgIndex} onClick={() => setImgIndex(i)} className="pd__thumb">
                <img src={src} alt="" loading="lazy" width={96} height={96} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Compra */}
      <div className="pd__buy">
        <span className="pd__brand">{p.brand}</span>
        <h1 className="pd__name">{p.name}</h1>
        {p.rating != null && p.reviewCount > 0 && (
          <a href="#opiniones" className="pd__rating">
            <Stars rating={p.rating} /> <span>({p.reviewCount} {p.reviewCount === 1 ? "valoración" : "valoraciones"})</span>
          </a>
        )}

        <div className="pd__price">
          {price != null && <span className={`pd__now${discount ? " pd__now--sale" : ""}`}>{formatPrice(price)}</span>}
          {p.compareAtPrice != null && <s>{formatPrice(p.compareAtPrice)}</s>}
          {discount && <span className="badge badge--accent">Ahorras {formatPrice(p.compareAtPrice! - (price ?? 0))}</span>}
        </div>
        <p className="pd__tax">IVA incluido</p>

        {p.colors.length > 0 && (
          <fieldset className="pd__opt">
            <legend>Color: <strong>{color}</strong></legend>
            <div className="pd__colors">
              {p.colors.map((c) => {
                const out = variantStock(p, c.name, null) <= 0;
                return (
                  <button
                    key={c.name}
                    type="button"
                    className={`pd__swatch${out ? " pd__swatch--out" : ""}`}
                    aria-pressed={c.name === color}
                    aria-label={`${c.name}${out ? ", agotado" : ""}`}
                    title={`${c.name}${out ? " (agotado)" : ""}`}
                    onClick={() => pickColor(c.name)}
                    style={{ background: c.hex ?? "#ccc" }}
                  />
                );
              })}
            </div>
          </fieldset>
        )}

        {needsSize && (
          <fieldset className={`pd__opt${sizeError ? " pd__opt--error" : ""}`} id="pd-sizes">
            <legend>
              Talla{size ? <>: <strong>{size}</strong></> : ""}
            </legend>
            <div className="pd__sizes">
              {p.sizes.map((s) => {
                const ok = variantStock(p, color, s) > 0;
                return (
                  <button
                    key={s}
                    type="button"
                    className="pd__size"
                    aria-pressed={s === size}
                    disabled={!ok}
                    aria-label={`Talla ${s}${ok ? "" : ", agotada"}`}
                    title={ok ? undefined : "Agotada"}
                    onClick={() => {
                      setSize(s);
                      setSizeError(false);
                      setQty(1);
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            {sizeError && <p className="pd__error" role="alert">Elige una talla para continuar.</p>}
            {hasSoldOutSizes && <p className="pd__size-note">Las tallas tachadas están agotadas{p.colors.length > 1 ? " en este color" : ""}.</p>}
            <div className="pd__size-help">
              {sizeGuideUrl ? (
                <a href={sizeGuideUrl}>Guía de tallas</a>
              ) : (
                <a href={sizeHelpUrl} target="_blank" rel="noopener noreferrer" data-track="click_whatsapp" data-track-location="pdp_size_help">
                  ¿Dudas con la talla? Te asesoramos
                </a>
              )}
            </div>
          </fieldset>
        )}

        <p className={`pd__stock pd__stock--${availability}`}>
          <span aria-hidden="true" />
          {AVAILABILITY_LABEL[availability]}
          {availability === "low_stock" && stockForSelection > 0 && ` (${stockForSelection} disponibles)`}
        </p>

        <div className="pd__actions" ref={actionsRef}>
          <div className="pd__qty" aria-label="Cantidad">
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Restar una unidad" disabled={qty <= 1}>
              <Icon name="minus" size={16} />
            </button>
            <span aria-live="polite">{qty}</span>
            <button type="button" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} aria-label="Sumar una unidad" disabled={qty >= maxQty}>
              <Icon name="plus" size={16} />
            </button>
          </div>
          <button type="button" className="btn btn--dark pd__add" onClick={() => add(false)} disabled={soldOut}>
            {soldOut ? "Sin stock" : "Añadir al carrito"}
          </button>
        </div>
        {!soldOut && (
          <button type="button" className="btn btn--accent btn--block" onClick={() => add(true)}>
            Comprar ahora
          </button>
        )}
        {soldOut && (
          <a href={sizeHelpUrl} className="btn btn--outline btn--block" target="_blank" rel="noopener noreferrer" data-track="click_whatsapp" data-track-location="pdp_sold_out">
            <Icon name="whatsapp" size={18} /> Consultar disponibilidad
          </a>
        )}
        {p.sku && <p className="pd__sku">Ref.: {variant?.sku ?? p.sku}</p>}
      </div>

      {!soldOut && (
        <div className={`pd__sticky${showSticky ? " is-visible" : ""}`} aria-hidden={!showSticky}>
          <div className="pd__sticky-info">
            <strong>{price != null ? formatPrice(price) : ""}</strong>
            <span>{size ? `Talla ${size}` : needsSize ? "Elige talla" : p.name}</span>
          </div>
          <button type="button" className="btn btn--dark" tabIndex={showSticky ? 0 : -1} onClick={() => add(false)}>
            Añadir al carrito
          </button>
        </div>
      )}
    </div>
  );
}
