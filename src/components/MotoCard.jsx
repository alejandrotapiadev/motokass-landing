export default function MotoCard({ marca, nombre, precio, imagen }) {
  return (
    <>
      <div class="moto-card">
        {/* Imagen opcional */}
        {imagen && <img src={imagen} alt={nombre} />}

        <div class="moto-info">
          <span class={`moto-brand ${marca.toLowerCase()}`}>
            {marca}
          </span>

          <h3>{nombre}</h3>

          <span class="price">
            {precio} €
          </span>
        </div>
      </div>

      <style>
        {`
        .moto-card {
          background: white;
          border-radius: 1rem;
          overflow: hidden;
          box-shadow: 0 10px 24px rgba(0,0,0,0.08);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 350px; /* Alto fijo para todas las tarjetas */
        }

        .moto-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.12);
        }

        .moto-card img {
          width: 100%;
          height: 220px;
          object-fit: cover;
        }

        .moto-info {
          padding: 1rem;
          flex: 1; /* Ocupa todo el espacio restante */
          display: flex;
          flex-direction: column;
          justify-content: space-between; /* Mantiene separación uniforme */
        }

        .moto-info h3 {
          font-size: 1.2rem;
          margin: 0.25rem 0;
        }

        .moto-brand {
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          display: inline-block;
          margin-bottom: 0.5rem;
          padding: 0.2rem 0.5rem;
          border-radius: 0.25rem;
          color: white;
        }

        .moto-brand.yamaha { background: #1e40af; }
        .moto-brand.kawasaki { background: #059669; }
        .moto-brand.honda { background: #dc2626; }
        .moto-brand.suzuki { background: #f59e0b; }
        .moto-brand.sherco { background: #0d9488; }
        .moto-brand.rieju { background: #dc2626; }

        .price {
          font-weight: 700;
          color: var(--color-secondary);
        }
        `}
      </style>
    </>
  );
}
