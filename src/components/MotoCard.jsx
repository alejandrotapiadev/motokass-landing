export default function MotoCard({ marca, nombre, precio, imagen, stock = true }) {
  return (
    <>
      <div className={`moto-card${!stock ? " moto-card--agotada" : ""}`}>
        <div className="moto-card__img-wrapper">
          {imagen && (
            <img
              src={imagen}
              alt={nombre}
              loading="lazy"
              decoding="async"
              width="400"
              height="220"
            />
          )}
          {!stock && <span className="badge-agotada">Sin stock</span>}
        </div>

        <div className="moto-info">
          <span className={`moto-brand ${marca.toLowerCase()}`}>{marca}</span>
          <h3>{nombre}</h3>
          <span className="price">{precio.toLocaleString("es-ES")} €</span>
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
          height: 350px;
        }

        .moto-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.12);
        }

        .moto-card--agotada {
          opacity: 0.75;
        }

        .moto-card--agotada:hover {
          transform: none;
          box-shadow: 0 10px 24px rgba(0,0,0,0.08);
        }

        .moto-card__img-wrapper {
          position: relative;
          height: 220px;
          overflow: hidden;
          background: #f1f5f9;
        }

        .moto-card__img-wrapper img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .badge-agotada {
          position: absolute;
          top: 10px;
          right: 10px;
          background: #6b7280;
          color: white;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          padding: 0.25rem 0.65rem;
          border-radius: 999px;
          letter-spacing: 0.5px;
        }

        .moto-info {
          padding: 1rem;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .moto-info h3 {
          font-size: 1.1rem;
          margin: 0.25rem 0;
          color: #1e293b;
        }

        .moto-brand {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          display: inline-block;
          margin-bottom: 0.4rem;
          padding: 0.2rem 0.5rem;
          border-radius: 0.25rem;
          color: white;
          letter-spacing: 0.5px;
        }

        .moto-brand.sherco { background: #0d9488; }
        .moto-brand.rieju  { background: #dc2626; }

        .price {
          font-weight: 700;
          font-size: 1.1rem;
          color: #1F3F7A;
        }
        `}
      </style>
    </>
  );
}
