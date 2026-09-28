import ProductCard from "./ProductCard";
import type { EquipmentProduct } from "../../lib/catalog/types";

interface Props {
  products: EquipmentProduct[];
  /** slug de categoría → icono, para placeholders sin imagen. */
  icons?: Record<string, string>;
  priorityCount?: number;
}

export default function ProductGrid({ products, icons = {}, priorityCount = 0 }: Props) {
  return (
    <div className="product-grid">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} categoryIcon={icons[p.category]} priority={i < priorityCount} />
      ))}
    </div>
  );
}
