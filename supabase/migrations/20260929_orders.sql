-- ============================================================
-- Pedidos, pagos (Stripe) y reserva atómica de stock
-- Requiere: 20260928_equipment.sql
-- Ejecutar en Supabase SQL Editor (o `supabase db push`).
--
-- Modelo:
--   orders              → cabecera del pedido (snapshot de cliente, importes)
--   order_items         → líneas (snapshot de producto: nombre, SKU, precio)
--   order_events        → historial/auditoría de cambios de estado
--   stripe_webhook_events → idempotencia de webhooks (sin payload: no guarda PII)
--
-- Estrategia de stock (ver docs/checkout-pagos.md):
--   1. create_checkout_order()  reserva = descuenta stock de forma atómica
--      (UPDATE … WHERE stock >= qty) al crear la sesión de pago.
--   2. confirm_order_payment()  el webhook confirma el pago; el stock ya
--      estaba reservado, no se vuelve a descontar.
--   3. cancel_pending_order()   pago fallido / sesión expirada / cancelación
--      → devuelve el stock reservado una sola vez (flag stock_reserved).
--   4. release_expired_reservations()  red de seguridad si no llega el webhook.
--
-- Transiciones válidas (forzadas por trigger orders_guard):
--   status:          pending → paid | cancelled
--                    cancelled → paid   (cobro tardío tras expirar; queda requires_attention)
--                    paid → completed | refunded
--                    completed → refunded
--   payment_status:  pending | failed → paid | failed
--                    paid → partially_refunded | refunded
--                    partially_refunded → partially_refunded | refunded
--   fulfillment_status (solo pedidos pagados):
--                    unfulfilled → preparing | shipped | ready_for_pickup | delivered
--                    preparing → shipped | ready_for_pickup
--                    shipped | ready_for_pickup → delivered
--
-- Seguridad: RLS activado SIN políticas → anon/authenticated no pueden leer
-- ni escribir. Todo pasa por el servidor (service_role). Las funciones solo
-- son ejecutables por service_role.
-- ============================================================

-- ---------- Integridad del stock existente ----------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'equipment_products_stock_nonnegative'
  ) THEN
    ALTER TABLE equipment_products
      ADD CONSTRAINT equipment_products_stock_nonnegative CHECK (stock >= 0);
  END IF;
END $$;

-- ---------- Número de pedido legible: MK-2026-000123 ----------
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

CREATE OR REPLACE FUNCTION next_order_number() RETURNS TEXT AS $$
  SELECT 'MK-' || to_char(NOW() AT TIME ZONE 'Europe/Madrid', 'YYYY') || '-' ||
         lpad(nextval('order_number_seq')::TEXT, 6, '0');
$$ LANGUAGE sql VOLATILE;

-- ---------- Pedidos ----------
CREATE TABLE IF NOT EXISTS orders (
  id                          UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number                TEXT          UNIQUE NOT NULL DEFAULT next_order_number(),
  status                      TEXT          NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','paid','completed','cancelled','refunded')),
  payment_status              TEXT          NOT NULL DEFAULT 'pending'
                                CHECK (payment_status IN ('pending','paid','failed','refunded','partially_refunded')),
  fulfillment_status          TEXT          NOT NULL DEFAULT 'unfulfilled'
                                CHECK (fulfillment_status IN ('unfulfilled','preparing','shipped','ready_for_pickup','delivered')),
  -- Clave de idempotencia enviada por el cliente (evita pedidos duplicados por doble envío)
  idempotency_key             TEXT          UNIQUE NOT NULL CHECK (length(idempotency_key) BETWEEN 16 AND 64),
  -- SHA-256 del token de acceso a la página de estado (el token no se guarda)
  access_token_hash           TEXT          NOT NULL CHECK (length(access_token_hash) = 64),

  customer_email              TEXT          NOT NULL CHECK (length(customer_email) BETWEEN 3 AND 254),
  customer_name               TEXT          NOT NULL CHECK (length(customer_name) BETWEEN 1 AND 120),
  customer_phone              TEXT          CHECK (customer_phone IS NULL OR length(customer_phone) <= 30),
  delivery_method             TEXT          NOT NULL CHECK (delivery_method IN ('shipping','pickup')),
  -- { line1, line2, city, postal_code, province, country }
  shipping_address            JSONB,
  billing_address             JSONB,
  notes                       TEXT          CHECK (notes IS NULL OR length(notes) <= 500),

  currency                    TEXT          NOT NULL DEFAULT 'eur' CHECK (currency ~ '^[a-z]{3}$'),
  subtotal                    NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  shipping_amount             NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (shipping_amount >= 0),
  discount_amount             NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  -- IVA contenido en el total (precios con IVA incluido). NULL = tipo no configurado.
  tax_amount                  NUMERIC(10,2) CHECK (tax_amount IS NULL OR tax_amount >= 0),
  prices_include_tax          BOOLEAN       NOT NULL DEFAULT TRUE,
  total                       NUMERIC(10,2) NOT NULL CHECK (total >= 0),
  amount_refunded             NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (amount_refunded >= 0),

  stripe_checkout_session_id  TEXT          UNIQUE,
  stripe_checkout_url         TEXT,
  stripe_payment_intent_id    TEXT          UNIQUE,

  stock_reserved              BOOLEAN       NOT NULL DEFAULT FALSE,
  -- Fin de la reserva; NULL mientras se espera un pago asíncrono ya iniciado
  reserved_until              TIMESTAMPTZ,

  -- Situaciones que requieren revisión manual (importe distinto, stock no disponible…)
  requires_attention          BOOLEAN       NOT NULL DEFAULT FALSE,
  attention_reason            TEXT,

  customer_email_sent_at      TIMESTAMPTZ,
  store_email_sent_at         TIMESTAMPTZ,
  paid_at                     TIMESTAMPTZ,
  cancelled_at                TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT orders_total_consistent
    CHECK (total = subtotal - discount_amount + shipping_amount + CASE WHEN prices_include_tax THEN 0 ELSE COALESCE(tax_amount, 0) END),
  CONSTRAINT orders_refund_le_total CHECK (amount_refunded <= total),
  CONSTRAINT orders_shipping_address_required
    CHECK (delivery_method = 'pickup' OR shipping_address IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS orders_created_idx       ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_idx        ON orders (status, payment_status);
CREATE INDEX IF NOT EXISTS orders_email_idx         ON orders (lower(customer_email));
CREATE INDEX IF NOT EXISTS orders_reservation_idx   ON orders (reserved_until) WHERE stock_reserved AND status = 'pending';

CREATE TABLE IF NOT EXISTS order_items (
  id                     UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id               UUID          NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  -- Referencias vivas (pueden quedar a NULL si se borra el producto; el snapshot se conserva)
  product_id             UUID          REFERENCES equipment_products(id) ON DELETE SET NULL,
  variant_id             UUID          REFERENCES equipment_variants(id) ON DELETE SET NULL,
  -- Snapshot inmutable
  sku                    TEXT,
  product_name_snapshot  TEXT          NOT NULL,
  brand_snapshot         TEXT          NOT NULL,
  variant_name_snapshot  TEXT,
  color                  TEXT,
  size                   TEXT,
  image_url              TEXT,
  quantity               INTEGER       NOT NULL CHECK (quantity > 0 AND quantity <= 100),
  unit_price             NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  subtotal               NUMERIC(10,2) NOT NULL,
  -- De dónde se reservó el stock (necesario para devolverlo aunque cambie el producto)
  stock_source           TEXT          NOT NULL CHECK (stock_source IN ('variant','product')),
  created_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT order_items_subtotal_consistent CHECK (subtotal = unit_price * quantity)
);

CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items (order_id);

CREATE TABLE IF NOT EXISTS order_events (
  id          BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id    UUID          NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  type        TEXT          NOT NULL,
  data        JSONB         NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS order_events_order_idx ON order_events (order_id, created_at);

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id            TEXT          PRIMARY KEY,           -- evt_…
  type          TEXT          NOT NULL,
  livemode      BOOLEAN       NOT NULL DEFAULT FALSE,
  attempts      INTEGER       NOT NULL DEFAULT 1,
  last_error    TEXT,
  received_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  processed_at  TIMESTAMPTZ
);

-- ---------- updated_at ----------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- Guardas: importes inmutables y transiciones válidas ----------
CREATE OR REPLACE FUNCTION orders_guard() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.subtotal IS DISTINCT FROM OLD.subtotal
     OR NEW.shipping_amount IS DISTINCT FROM OLD.shipping_amount
     OR NEW.discount_amount IS DISTINCT FROM OLD.discount_amount
     OR NEW.tax_amount IS DISTINCT FROM OLD.tax_amount
     OR NEW.total IS DISTINCT FROM OLD.total
     OR NEW.currency IS DISTINCT FROM OLD.currency
     OR NEW.order_number IS DISTINCT FROM OLD.order_number
     OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key THEN
    RAISE EXCEPTION 'order_amounts_immutable';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
       (OLD.status = 'pending'   AND NEW.status IN ('paid','cancelled'))
    OR (OLD.status = 'cancelled' AND NEW.status = 'paid')      -- cobro tardío (queda en revisión)
    OR (OLD.status = 'paid'      AND NEW.status IN ('completed','refunded'))
    OR (OLD.status = 'completed' AND NEW.status = 'refunded')
  ) THEN
    RAISE EXCEPTION 'invalid_status_transition: % -> %', OLD.status, NEW.status;
  END IF;

  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status AND NOT (
       (OLD.payment_status IN ('pending','failed') AND NEW.payment_status IN ('paid','failed'))
    OR (OLD.payment_status = 'paid' AND NEW.payment_status IN ('partially_refunded','refunded'))
    OR (OLD.payment_status = 'partially_refunded' AND NEW.payment_status = 'refunded')
  ) THEN
    RAISE EXCEPTION 'invalid_payment_transition: % -> %', OLD.payment_status, NEW.payment_status;
  END IF;

  IF NEW.fulfillment_status IS DISTINCT FROM OLD.fulfillment_status THEN
    IF NEW.payment_status NOT IN ('paid','partially_refunded') OR NEW.status NOT IN ('paid','completed') THEN
      RAISE EXCEPTION 'fulfillment_requires_paid_order';
    END IF;
    IF NOT (
         (OLD.fulfillment_status = 'unfulfilled' AND NEW.fulfillment_status IN ('preparing','shipped','ready_for_pickup','delivered'))
      OR (OLD.fulfillment_status = 'preparing' AND NEW.fulfillment_status IN ('shipped','ready_for_pickup'))
      OR (OLD.fulfillment_status IN ('shipped','ready_for_pickup') AND NEW.fulfillment_status = 'delivered')
    ) THEN
      RAISE EXCEPTION 'invalid_fulfillment_transition: % -> %', OLD.fulfillment_status, NEW.fulfillment_status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_guard ON orders;
CREATE TRIGGER orders_guard
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION orders_guard();

-- Las líneas son un snapshot: no se modifican tras crearse.
CREATE OR REPLACE FUNCTION order_items_immutable() RETURNS TRIGGER AS $$
BEGIN
  -- Única modificación permitida: ON DELETE SET NULL de producto/variante.
  IF (NEW.product_id IS NOT DISTINCT FROM OLD.product_id OR NEW.product_id IS NULL)
     AND (NEW.variant_id IS NOT DISTINCT FROM OLD.variant_id OR NEW.variant_id IS NULL)
     AND (NEW.order_id, NEW.sku, NEW.product_name_snapshot, NEW.brand_snapshot, NEW.variant_name_snapshot,
          NEW.quantity, NEW.unit_price, NEW.subtotal, NEW.stock_source)
         IS NOT DISTINCT FROM
         (OLD.order_id, OLD.sku, OLD.product_name_snapshot, OLD.brand_snapshot, OLD.variant_name_snapshot,
          OLD.quantity, OLD.unit_price, OLD.subtotal, OLD.stock_source) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'order_items_immutable';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS order_items_immutable ON order_items;
CREATE TRIGGER order_items_immutable
  BEFORE UPDATE ON order_items
  FOR EACH ROW EXECUTE FUNCTION order_items_immutable();

-- ---------- RLS: sin políticas = sin acceso para anon/authenticated ----------
ALTER TABLE orders                ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON orders, order_items, order_events, stripe_webhook_events FROM anon, authenticated;
REVOKE ALL ON SEQUENCE order_number_seq FROM anon, authenticated;
-- El stock solo se modifica desde servidor (service_role) o las funciones de abajo.
REVOKE INSERT, UPDATE, DELETE ON equipment_products, equipment_variants FROM anon, authenticated;

-- ============================================================
-- Funciones (SECURITY INVOKER; solo service_role puede ejecutarlas)
-- ============================================================

-- Devuelve el stock reservado por un pedido (idempotente vía stock_reserved).
CREATE OR REPLACE FUNCTION _release_order_stock(p_order_id UUID) RETURNS BOOLEAN AS $$
DECLARE
  it RECORD;
BEGIN
  UPDATE orders SET stock_reserved = FALSE, reserved_until = NULL
   WHERE id = p_order_id AND stock_reserved;
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  FOR it IN
    SELECT variant_id, product_id, stock_source, quantity
      FROM order_items WHERE order_id = p_order_id
     ORDER BY COALESCE(variant_id, product_id)
  LOOP
    IF it.stock_source = 'variant' AND it.variant_id IS NOT NULL THEN
      UPDATE equipment_variants SET stock = stock + it.quantity WHERE id = it.variant_id;
    ELSIF it.stock_source = 'product' AND it.product_id IS NOT NULL THEN
      UPDATE equipment_products SET stock = stock + it.quantity WHERE id = it.product_id;
    END IF;
  END LOOP;

  INSERT INTO order_events (order_id, type) VALUES (p_order_id, 'stock_released');
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Reserva stock (descuento condicional) de todas las líneas de un pedido.
-- Lanza 'out_of_stock' si alguna no tiene unidades suficientes.
CREATE OR REPLACE FUNCTION _reserve_order_stock(p_order_id UUID) RETURNS VOID AS $$
DECLARE
  it RECORD;
BEGIN
  FOR it IN
    SELECT variant_id, product_id, stock_source, quantity, sku
      FROM order_items WHERE order_id = p_order_id
     ORDER BY COALESCE(variant_id, product_id)   -- orden fijo: evita deadlocks
  LOOP
    IF it.stock_source = 'variant' THEN
      UPDATE equipment_variants SET stock = stock - it.quantity
       WHERE id = it.variant_id AND stock >= it.quantity;
    ELSE
      UPDATE equipment_products SET stock = stock - it.quantity
       WHERE id = it.product_id AND stock >= it.quantity;
    END IF;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'out_of_stock' USING DETAIL = COALESCE(it.sku, '');
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

/*
 * Crea un pedido pendiente y reserva su stock en una única transacción.
 *
 * p_order: { idempotency_key, access_token_hash, customer_email, customer_name,
 *            customer_phone, delivery_method, shipping_address, notes, currency,
 *            shipping_amount, discount_amount, tax_rate (NULL = no configurado),
 *            prices_include_tax, reservation_minutes }
 * p_items: [{ product_id, variant_id|null, quantity, expected_unit_price }]
 *
 * Precios, nombres y SKU se leen AQUÍ bajo bloqueo de fila. El precio
 * esperado solo sirve para detectar un cambio de precio entre la
 * validación y la creación del pedido ('price_changed').
 *
 * Errores: empty_order, invalid_quantity, product_unavailable,
 *          variant_required, variant_mismatch, price_changed, out_of_stock
 */
CREATE OR REPLACE FUNCTION create_checkout_order(p_order JSONB, p_items JSONB) RETURNS JSONB AS $$
DECLARE
  v_existing orders%ROWTYPE;
  v_order_id UUID;
  v_number   TEXT;
  v_lines    JSONB         := '[]'::JSONB;
  v_subtotal NUMERIC(10,2) := 0;
  v_total    NUMERIC(10,2);
  v_tax      NUMERIC(10,2);
  v_shipping NUMERIC(10,2) := COALESCE((p_order->>'shipping_amount')::NUMERIC, 0);
  v_discount NUMERIC(10,2) := COALESCE((p_order->>'discount_amount')::NUMERIC, 0);
  v_incl_tax BOOLEAN       := COALESCE((p_order->>'prices_include_tax')::BOOLEAN, TRUE);
  v_rate     NUMERIC       := (p_order->>'tax_rate')::NUMERIC;
  v_minutes  INTEGER       := COALESCE((p_order->>'reservation_minutes')::INTEGER, 30);
  v_until    TIMESTAMPTZ;
  it   RECORD;
  prod RECORD;
  v_var_id    UUID;
  v_var_sku   TEXT;
  v_var_color TEXT;
  v_var_size  TEXT;
  v_var_prod  UUID;
  v_var_price NUMERIC(10,2);
  v_price     NUMERIC(10,2);
BEGIN
  -- Idempotencia: misma clave → mismo pedido
  SELECT * INTO v_existing FROM orders WHERE idempotency_key = p_order->>'idempotency_key';
  IF FOUND THEN
    RETURN jsonb_build_object('order_id', v_existing.id, 'order_number', v_existing.order_number,
                              'existing', TRUE, 'status', v_existing.status, 'total', v_existing.total,
                              'stripe_checkout_url', v_existing.stripe_checkout_url);
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'empty_order';
  END IF;

  -- 1) Validar y valorar cada línea con los datos reales (bloqueando filas
  --    en orden fijo para evitar deadlocks entre compras simultáneas).
  FOR it IN
    SELECT * FROM jsonb_to_recordset(p_items)
      AS x(product_id UUID, variant_id UUID, quantity INTEGER, expected_unit_price NUMERIC)
     ORDER BY COALESCE(x.variant_id, x.product_id)
  LOOP
    IF it.quantity IS NULL OR it.quantity < 1 OR it.quantity > 100 THEN
      RAISE EXCEPTION 'invalid_quantity';
    END IF;

    SELECT id, name, brand, price, sku, images, active INTO prod
      FROM equipment_products WHERE id = it.product_id
       FOR UPDATE;
    IF NOT FOUND OR NOT prod.active THEN
      RAISE EXCEPTION 'product_unavailable' USING DETAIL = COALESCE(it.product_id::TEXT, '');
    END IF;

    v_var_id := NULL; v_var_sku := NULL; v_var_color := NULL; v_var_size := NULL;
    IF it.variant_id IS NULL THEN
      IF EXISTS (SELECT 1 FROM equipment_variants WHERE product_id = prod.id) THEN
        RAISE EXCEPTION 'variant_required' USING DETAIL = prod.id::TEXT;
      END IF;
      v_price := prod.price;
    ELSE
      SELECT id, product_id, sku, color, size, price
        INTO v_var_id, v_var_prod, v_var_sku, v_var_color, v_var_size, v_var_price
        FROM equipment_variants WHERE id = it.variant_id
         FOR UPDATE;
      IF NOT FOUND OR v_var_prod <> prod.id THEN
        RAISE EXCEPTION 'variant_mismatch' USING DETAIL = COALESCE(it.variant_id::TEXT, '');
      END IF;
      v_price := COALESCE(v_var_price, prod.price);
    END IF;

    IF it.expected_unit_price IS NULL OR v_price <> it.expected_unit_price THEN
      RAISE EXCEPTION 'price_changed' USING DETAIL = prod.id::TEXT;
    END IF;

    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'product_id', prod.id,
      'variant_id', v_var_id,
      'sku', COALESCE(v_var_sku, prod.sku),
      'name', prod.name,
      'brand', prod.brand,
      'variant_name', NULLIF(concat_ws(' / ', v_var_color, 'Talla ' || v_var_size), ''),
      'color', v_var_color,
      'size', v_var_size,
      'image_url', prod.images[1],
      'quantity', it.quantity,
      'unit_price', v_price,
      'stock_source', CASE WHEN v_var_id IS NULL THEN 'product' ELSE 'variant' END
    ));
    v_subtotal := v_subtotal + v_price * it.quantity;
  END LOOP;

  -- 2) Importes definitivos
  v_discount := LEAST(v_discount, v_subtotal);
  IF v_incl_tax THEN
    v_total := v_subtotal - v_discount + v_shipping;
    v_tax := CASE WHEN v_rate IS NULL THEN NULL ELSE round(v_total - v_total / (1 + v_rate), 2) END;
  ELSE
    v_tax := CASE WHEN v_rate IS NULL THEN NULL ELSE round((v_subtotal - v_discount + v_shipping) * v_rate, 2) END;
    v_total := v_subtotal - v_discount + v_shipping + COALESCE(v_tax, 0);
  END IF;
  v_until := NOW() + make_interval(mins => v_minutes);

  -- 3) Pedido + snapshot de líneas
  INSERT INTO orders (
    idempotency_key, access_token_hash, customer_email, customer_name, customer_phone,
    delivery_method, shipping_address, notes, currency,
    subtotal, shipping_amount, discount_amount, tax_amount, prices_include_tax, total,
    stock_reserved, reserved_until
  ) VALUES (
    p_order->>'idempotency_key', p_order->>'access_token_hash',
    lower(trim(p_order->>'customer_email')), trim(p_order->>'customer_name'),
    NULLIF(trim(COALESCE(p_order->>'customer_phone', '')), ''),
    p_order->>'delivery_method',
    NULLIF(p_order->'shipping_address', 'null'::JSONB),
    NULLIF(trim(COALESCE(p_order->>'notes', '')), ''),
    COALESCE(p_order->>'currency', 'eur'),
    v_subtotal, v_shipping, v_discount, v_tax, v_incl_tax, v_total,
    TRUE, v_until
  ) RETURNING id, order_number INTO v_order_id, v_number;

  INSERT INTO order_items (
    order_id, product_id, variant_id, sku, product_name_snapshot, brand_snapshot,
    variant_name_snapshot, color, size, image_url, quantity, unit_price, subtotal, stock_source
  )
  SELECT v_order_id, l.product_id, l.variant_id, l.sku, l.name, l.brand,
         l.variant_name, l.color, l.size, l.image_url, l.quantity, l.unit_price,
         l.unit_price * l.quantity, l.stock_source
    FROM jsonb_to_recordset(v_lines) AS l(
      product_id UUID, variant_id UUID, sku TEXT, name TEXT, brand TEXT, variant_name TEXT,
      color TEXT, size TEXT, image_url TEXT, quantity INTEGER, unit_price NUMERIC, stock_source TEXT);

  -- 4) Reserva atómica: si falta stock en cualquier línea, se revierte todo.
  PERFORM _reserve_order_stock(v_order_id);

  INSERT INTO order_events (order_id, type, data)
  VALUES (v_order_id, 'created', jsonb_build_object('total', v_total));

  RETURN jsonb_build_object('order_id', v_order_id, 'order_number', v_number, 'existing', FALSE,
                            'status', 'pending', 'subtotal', v_subtotal, 'shipping_amount', v_shipping,
                            'discount_amount', v_discount, 'tax_amount', v_tax, 'total', v_total,
                            'reserved_until', v_until);
END;
$$ LANGUAGE plpgsql;

-- Asocia la sesión de Stripe al pedido (una sola vez).
CREATE OR REPLACE FUNCTION attach_checkout_session(p_order_id UUID, p_session_id TEXT, p_url TEXT) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE orders SET stripe_checkout_session_id = p_session_id, stripe_checkout_url = p_url
   WHERE id = p_order_id AND status = 'pending' AND stripe_checkout_session_id IS NULL;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

/*
 * Confirma el pago (llamada desde el webhook). Idempotente: si ya está
 * pagado devuelve changed=false. Si el pedido se había cancelado (reserva
 * expirada) pero Stripe cobró igualmente, intenta volver a reservar stock y,
 * si no hay, lo marca para revisión manual (reembolso).
 */
CREATE OR REPLACE FUNCTION confirm_order_payment(
  p_order_id UUID, p_session_id TEXT, p_payment_intent_id TEXT,
  p_amount_total_cents BIGINT, p_currency TEXT
) RETURNS JSONB AS $$
DECLARE
  o orders%ROWTYPE;
  v_reasons TEXT[] := '{}';
BEGIN
  SELECT * INTO o FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  IF o.payment_status IN ('paid','partially_refunded','refunded') THEN
    RETURN jsonb_build_object('changed', FALSE, 'order_number', o.order_number);
  END IF;

  IF o.stripe_checkout_session_id IS NOT NULL AND p_session_id IS NOT NULL
     AND o.stripe_checkout_session_id <> p_session_id THEN
    RAISE EXCEPTION 'session_mismatch';
  END IF;

  IF p_amount_total_cents IS DISTINCT FROM round(o.total * 100)::BIGINT
     OR lower(COALESCE(p_currency, '')) <> o.currency THEN
    v_reasons := v_reasons || 'Importe cobrado distinto del total del pedido'::TEXT;
  END IF;

  IF NOT o.stock_reserved THEN
    BEGIN
      PERFORM _reserve_order_stock(o.id);
      UPDATE orders SET stock_reserved = TRUE WHERE id = o.id;
    EXCEPTION WHEN OTHERS THEN
      v_reasons := v_reasons || 'Pago recibido sin stock disponible: revisar y reembolsar si procede'::TEXT;
    END;
  END IF;

  UPDATE orders SET
    status = 'paid',
    payment_status = 'paid',
    paid_at = NOW(),
    reserved_until = NULL,
    stripe_checkout_session_id = COALESCE(stripe_checkout_session_id, p_session_id),
    stripe_payment_intent_id = COALESCE(p_payment_intent_id, stripe_payment_intent_id),
    requires_attention = requires_attention OR cardinality(v_reasons) > 0,
    attention_reason = NULLIF(concat_ws('; ', attention_reason, NULLIF(array_to_string(v_reasons, '; '), '')), '')
  WHERE id = o.id;

  INSERT INTO order_events (order_id, type, data)
  VALUES (o.id, 'paid', jsonb_build_object('amount_cents', p_amount_total_cents, 'attention', to_jsonb(v_reasons)));

  RETURN jsonb_build_object('changed', TRUE, 'order_number', o.order_number,
                            'requires_attention', cardinality(v_reasons) > 0);
END;
$$ LANGUAGE plpgsql;

-- Pago asíncrono iniciado (p.ej. SEPA): se mantiene la reserva hasta que
-- Stripe confirme o rechace el pago.
CREATE OR REPLACE FUNCTION mark_order_awaiting_payment(p_order_id UUID, p_session_id TEXT, p_payment_intent_id TEXT) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE orders SET
    reserved_until = NULL,
    stripe_checkout_session_id = COALESCE(stripe_checkout_session_id, p_session_id),
    stripe_payment_intent_id = COALESCE(stripe_payment_intent_id, p_payment_intent_id)
  WHERE id = p_order_id AND status = 'pending' AND payment_status = 'pending';
  IF FOUND THEN
    INSERT INTO order_events (order_id, type) VALUES (p_order_id, 'awaiting_async_payment');
    RETURN TRUE;
  END IF;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Cancela un pedido pendiente y devuelve su stock. Idempotente.
CREATE OR REPLACE FUNCTION cancel_pending_order(p_order_id UUID, p_reason TEXT, p_payment_failed BOOLEAN DEFAULT FALSE) RETURNS BOOLEAN AS $$
DECLARE
  o orders%ROWTYPE;
BEGIN
  SELECT * INTO o FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR o.status <> 'pending' THEN
    RETURN FALSE;
  END IF;

  UPDATE orders SET
    status = 'cancelled',
    payment_status = CASE WHEN p_payment_failed THEN 'failed' ELSE payment_status END,
    cancelled_at = NOW()
  WHERE id = p_order_id;

  PERFORM _release_order_stock(p_order_id);
  INSERT INTO order_events (order_id, type, data)
  VALUES (p_order_id, 'cancelled', jsonb_build_object('reason', p_reason));
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Red de seguridad: libera reservas vencidas si no llegó checkout.session.expired.
CREATE OR REPLACE FUNCTION release_expired_reservations(p_grace_minutes INTEGER DEFAULT 10) RETURNS INTEGER AS $$
DECLARE
  r RECORD;
  n INTEGER := 0;
BEGIN
  FOR r IN
    SELECT id FROM orders
     WHERE status = 'pending' AND stock_reserved AND reserved_until IS NOT NULL
       AND reserved_until < NOW() - make_interval(mins => p_grace_minutes)
     ORDER BY reserved_until
     LIMIT 200
       FOR UPDATE SKIP LOCKED
  LOOP
    IF cancel_pending_order(r.id, 'reservation_expired', FALSE) THEN
      n := n + 1;
    END IF;
  END LOOP;
  RETURN n;
END;
$$ LANGUAGE plpgsql;

-- Registra un reembolso (importe acumulado) notificado por Stripe.
-- No repone stock: la devolución física se revisa manualmente.
CREATE OR REPLACE FUNCTION record_order_refund(p_payment_intent_id TEXT, p_amount_refunded_cents BIGINT) RETURNS JSONB AS $$
DECLARE
  o orders%ROWTYPE;
  v_refunded NUMERIC(10,2) := p_amount_refunded_cents / 100.0;
  v_full BOOLEAN;
BEGIN
  SELECT * INTO o FROM orders WHERE stripe_payment_intent_id = p_payment_intent_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', FALSE);
  END IF;
  IF v_refunded <= o.amount_refunded THEN
    RETURN jsonb_build_object('found', TRUE, 'changed', FALSE, 'order_id', o.id);
  END IF;
  IF o.payment_status NOT IN ('paid','partially_refunded') THEN
    UPDATE orders SET requires_attention = TRUE,
      attention_reason = concat_ws('; ', attention_reason, 'Reembolso recibido sobre un pedido no pagado')
    WHERE id = o.id;
    RETURN jsonb_build_object('found', TRUE, 'changed', FALSE, 'order_id', o.id);
  END IF;

  v_refunded := LEAST(v_refunded, o.total);
  v_full := v_refunded >= o.total;
  UPDATE orders SET
    amount_refunded = v_refunded,
    payment_status = CASE WHEN v_full THEN 'refunded' ELSE 'partially_refunded' END,
    status = CASE WHEN v_full THEN 'refunded' ELSE status END
  WHERE id = o.id;

  INSERT INTO order_events (order_id, type, data)
  VALUES (o.id, CASE WHEN v_full THEN 'refunded' ELSE 'partially_refunded' END,
          jsonb_build_object('amount_refunded', v_refunded));
  RETURN jsonb_build_object('found', TRUE, 'changed', TRUE, 'order_id', o.id, 'full', v_full);
END;
$$ LANGUAGE plpgsql;

-- Marca atómicamente un email como enviado; solo quien lo "reclama" lo envía.
CREATE OR REPLACE FUNCTION claim_order_email(p_order_id UUID, p_kind TEXT) RETURNS BOOLEAN AS $$
BEGIN
  IF p_kind = 'customer' THEN
    UPDATE orders SET customer_email_sent_at = NOW()
     WHERE id = p_order_id AND customer_email_sent_at IS NULL AND payment_status <> 'pending';
  ELSIF p_kind = 'store' THEN
    UPDATE orders SET store_email_sent_at = NOW()
     WHERE id = p_order_id AND store_email_sent_at IS NULL AND payment_status <> 'pending';
  ELSE
    RAISE EXCEPTION 'invalid_email_kind';
  END IF;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Si el envío falla se libera la marca para reintentarlo en el siguiente webhook.
CREATE OR REPLACE FUNCTION release_order_email_claim(p_order_id UUID, p_kind TEXT) RETURNS VOID AS $$
BEGIN
  IF p_kind = 'customer' THEN
    UPDATE orders SET customer_email_sent_at = NULL WHERE id = p_order_id;
  ELSIF p_kind = 'store' THEN
    UPDATE orders SET store_email_sent_at = NULL WHERE id = p_order_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Idempotencia de webhooks: 'process' si hay que procesarlo, 'duplicate' si ya se procesó.
CREATE OR REPLACE FUNCTION register_stripe_event(p_id TEXT, p_type TEXT, p_livemode BOOLEAN) RETURNS TEXT AS $$
DECLARE
  v_processed TIMESTAMPTZ;
BEGIN
  INSERT INTO stripe_webhook_events (id, type, livemode) VALUES (p_id, p_type, p_livemode)
  ON CONFLICT (id) DO UPDATE SET attempts = stripe_webhook_events.attempts + 1
  RETURNING processed_at INTO v_processed;
  RETURN CASE WHEN v_processed IS NULL THEN 'process' ELSE 'duplicate' END;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION complete_stripe_event(p_id TEXT, p_error TEXT DEFAULT NULL) RETURNS VOID AS $$
BEGIN
  IF p_error IS NULL THEN
    UPDATE stripe_webhook_events SET processed_at = NOW(), last_error = NULL WHERE id = p_id;
  ELSE
    UPDATE stripe_webhook_events SET last_error = left(p_error, 500) WHERE id = p_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Productos (con variantes) necesarios para valorar un checkout.
CREATE OR REPLACE FUNCTION get_checkout_catalog(p_product_ids UUID[]) RETURNS JSONB AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', p.id, 'name', p.name, 'brand', p.brand, 'sku', p.sku, 'price', p.price,
    'stock', p.stock, 'active', p.active, 'images', to_jsonb(p.images),
    'variants', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', v.id, 'sku', v.sku, 'color', v.color,
                                          'size', v.size, 'stock', v.stock, 'price', v.price))
        FROM equipment_variants v WHERE v.product_id = p.id), '[]'::JSONB)
  )), '[]'::JSONB)
  FROM equipment_products p
  WHERE p.id = ANY(p_product_ids);
$$ LANGUAGE sql STABLE;

-- Pedido completo con líneas (uso interno del servidor: emails, página de estado).
CREATE OR REPLACE FUNCTION get_order_details(p_order_id UUID) RETURNS JSONB AS $$
  SELECT to_jsonb(o) || jsonb_build_object('items', COALESCE((
    SELECT jsonb_agg(to_jsonb(i) ORDER BY i.created_at, i.id) FROM order_items i WHERE i.order_id = o.id
  ), '[]'::JSONB))
  FROM orders o WHERE o.id = p_order_id;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION log_order_event(p_order_id UUID, p_type TEXT, p_data JSONB DEFAULT '{}') RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO order_events (order_id, type, data)
  SELECT id, p_type, COALESCE(p_data, '{}'::JSONB) FROM orders WHERE id = p_order_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ---------- Permisos: solo service_role ejecuta las funciones ----------
DO $$
DECLARE
  f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'next_order_number()',
    '_release_order_stock(uuid)',
    '_reserve_order_stock(uuid)',
    'create_checkout_order(jsonb, jsonb)',
    'attach_checkout_session(uuid, text, text)',
    'confirm_order_payment(uuid, text, text, bigint, text)',
    'mark_order_awaiting_payment(uuid, text, text)',
    'cancel_pending_order(uuid, text, boolean)',
    'release_expired_reservations(integer)',
    'record_order_refund(text, bigint)',
    'claim_order_email(uuid, text)',
    'release_order_email_claim(uuid, text)',
    'register_stripe_event(text, text, boolean)',
    'complete_stripe_event(text, text)',
    'get_checkout_catalog(uuid[])',
    'get_order_details(uuid)',
    'log_order_event(uuid, text, jsonb)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f);
  END LOOP;
END $$;

GRANT USAGE ON SEQUENCE order_number_seq TO service_role;

