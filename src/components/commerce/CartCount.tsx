import { useCart } from "../../lib/commerce/useCart";

/** Contador de unidades del carrito (header y barra inferior). */
export default function CartCount({ variant = "badge" }: { variant?: "badge" | "inline" }) {
  const { totals } = useCart();
  const n = totals.itemCount;
  return (
    <>
      <span className="sr-only" aria-live="polite">{n === 1 ? "1 artículo" : `${n} artículos`} en el carrito</span>
      {n > 0 && (
        <span
          aria-hidden="true"
          style={{
            position: variant === "badge" ? "absolute" : "static",
            top: 4,
            right: 2,
            minWidth: 18,
            height: 18,
            padding: "0 5px",
            borderRadius: 9,
            background: "var(--accent)",
            color: "#fff",
            fontSize: 11,
            fontWeight: 800,
            lineHeight: "18px",
            textAlign: "center",
          }}
        >
          {n > 99 ? "99+" : n}
        </span>
      )}
    </>
  );
}
