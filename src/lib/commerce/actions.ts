/**
 * Acciones de carrito de alto nivel (cliente): actualizan el store,
 * disparan analytics y muestran la confirmación.
 */
import { cart, type CartLine } from "./cart";
import { track } from "../analytics";
import type { EquipmentProduct } from "../catalog/types";
import { findVariant, variantStock } from "../catalog/equipment-mapper";

export function addToCart(product: EquipmentProduct, opts: { color: string | null; size: string | null; quantity?: number }) {
  const { color, size, quantity = 1 } = opts;
  const variant = findVariant(product, color, size);
  const unitPrice = variant?.price ?? product.price ?? 0;
  const colorImage = product.colors.find((c) => c.name === color)?.images?.[0];

  cart.add({
    productId: product.id,
    sku: variant?.sku ?? product.sku,
    slug: product.slug,
    url: product.url,
    name: product.name,
    brand: product.brand,
    image: colorImage ?? product.images[0] ?? null,
    color,
    size,
    unitPrice,
    compareAtPrice: product.compareAtPrice,
    quantity,
    maxQuantity: product.variants.length ? variantStock(product, color, size) : product.stock || null,
  });

  track("add_to_cart", {
    item_id: variant?.sku ?? product.sku ?? product.id,
    item_name: product.name,
    item_brand: product.brand,
    item_category: product.category,
    item_variant: [color, size].filter(Boolean).join(" / ") || null,
    price: unitPrice,
    quantity,
    currency: "EUR",
  });

  window.dispatchEvent(
    new CustomEvent("mk:cart-added", {
      detail: { name: product.name, variant: [color, size && `Talla ${size}`].filter(Boolean).join(" · "), image: product.images[0] ?? null },
    }),
  );
}

export function removeFromCart(line: CartLine) {
  cart.remove(line.lineId);
  track("remove_from_cart", {
    item_id: line.sku ?? line.productId,
    item_name: line.name,
    price: line.unitPrice,
    quantity: line.quantity,
    currency: "EUR",
  });
}
