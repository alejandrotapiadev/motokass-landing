-- ============================================================
-- Tienda de equipamiento: productos y variantes
-- Ejecutar en Supabase SQL Editor:
--   Dashboard → SQL Editor → New query → pegar y ejecutar
--
-- La web lee estas tablas desde el servidor (service_role).
-- Mientras equipment_products esté vacía, la tienda muestra estados
-- vacíos en producción (y datos DEMO solo en desarrollo).
-- ============================================================

CREATE TABLE IF NOT EXISTS equipment_products (
  id                UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  slug              TEXT          UNIQUE NOT NULL,
  sku               TEXT,
  ean               TEXT,
  brand             TEXT          NOT NULL,
  name              TEXT          NOT NULL,
  -- slug de la categoría (src/lib/catalog/equipment-categories.ts)
  category          TEXT          NOT NULL,
  subcategory       TEXT,
  -- tipo filtrable: integral, modular, jet, verano, textil, touring…
  type              TEXT,
  description       TEXT          NOT NULL DEFAULT '',
  price             NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  compare_at_price  NUMERIC(10,2) CHECK (compare_at_price IS NULL OR compare_at_price >= 0),
  images            TEXT[]        NOT NULL DEFAULT '{}',
  -- [{ "name": "Negro mate", "hex": "#1a1a1a", "images": ["..."] }]
  colors            JSONB         NOT NULL DEFAULT '[]',
  sizes             TEXT[]        NOT NULL DEFAULT '{}',
  -- stock total cuando el producto no tiene variantes
  stock             INTEGER       NOT NULL DEFAULT 0,
  rating            NUMERIC(2,1)  CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5)),
  review_count      INTEGER       NOT NULL DEFAULT 0,
  features          TEXT[]        NOT NULL DEFAULT '{}',
  materials         TEXT[]        NOT NULL DEFAULT '{}',
  technology        TEXT[]        NOT NULL DEFAULT '{}',
  gender            TEXT          CHECK (gender IS NULL OR gender IN ('hombre','mujer','unisex','infantil')),
  season            TEXT          CHECK (season IS NULL OR season IN ('verano','invierno','entretiempo','todo-el-ano')),
  tags              TEXT[]        NOT NULL DEFAULT '{}',
  -- new | sale | bestseller
  badges            TEXT[]        NOT NULL DEFAULT '{}',
  -- [{ "q": "...", "a": "..." }]
  faq               JSONB         NOT NULL DEFAULT '[]',
  featured          BOOLEAN       NOT NULL DEFAULT FALSE,
  active            BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS equipment_variants (
  id          UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id  UUID          NOT NULL REFERENCES equipment_products(id) ON DELETE CASCADE,
  sku         TEXT          UNIQUE NOT NULL,
  ean         TEXT,
  color       TEXT,
  size        TEXT,
  stock       INTEGER       NOT NULL DEFAULT 0 CHECK (stock >= 0),
  -- NULL = usa el precio del producto
  price       NUMERIC(10,2) CHECK (price IS NULL OR price >= 0),
  UNIQUE (product_id, color, size)
);

CREATE INDEX IF NOT EXISTS equipment_products_category_idx ON equipment_products (category) WHERE active;
CREATE INDEX IF NOT EXISTS equipment_products_featured_idx ON equipment_products (featured) WHERE active;
CREATE INDEX IF NOT EXISTS equipment_variants_product_idx  ON equipment_variants (product_id);

-- updated_at automático
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS equipment_products_updated_at ON equipment_products;
CREATE TRIGGER equipment_products_updated_at
  BEFORE UPDATE ON equipment_products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Row Level Security: lectura pública solo de productos activos.
-- La escritura se hace con service_role (bypass RLS), p.ej. desde /admin.
ALTER TABLE equipment_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "equipment_products_public_read" ON equipment_products;
CREATE POLICY "equipment_products_public_read"
  ON equipment_products FOR SELECT
  USING (active = TRUE);

DROP POLICY IF EXISTS "equipment_variants_public_read" ON equipment_variants;
CREATE POLICY "equipment_variants_public_read"
  ON equipment_variants FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM equipment_products p WHERE p.id = product_id AND p.active = TRUE
  ));
