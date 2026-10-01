# Checkout y pagos online (Stripe)

Estado: **código implementado y probado en local, pago online DESACTIVADO** hasta que el
negocio complete la configuración (ver «Configuración pendiente»). Mientras tanto la web
funciona exactamente igual que antes: el carrito envía el pedido por WhatsApp.

## Flujo

```
Carrito (/carrito)
  └─ «Tramitar pedido» ─► /checkout  (datos, entrega, notas, aceptar condiciones)
        │  POST /api/checkout/quote   → precios/stock/envío reales (solo lectura)
        │  POST /api/checkout         → valida en servidor, crea pedido `pending`,
        │                               RESERVA stock (atómico) y crea la sesión Stripe
        ▼
  Stripe Checkout (alojado por Stripe: la tarjeta nunca pasa por nuestro servidor)
        ├─ paga ───────► /checkout/success?order=…&t=…  (consulta estado con sondeo limitado)
        └─ cancela ────► /checkout/cancel?order=…&t=…   (expira la sesión y libera el stock)

Stripe ──► POST /api/webhooks/stripe  (firma verificada, idempotente)
        checkout.session.completed (paid)        → pedido `paid` + emails cliente/tienda
        checkout.session.completed (unpaid)      → pago asíncrono en curso (reserva mantenida)
        checkout.session.async_payment_succeeded → pedido `paid` + emails
        checkout.session.async_payment_failed    → pedido `cancelled` / `failed`, libera stock
        checkout.session.expired                 → pedido `cancelled`, libera stock
        payment_intent.payment_failed            → solo se registra (el cliente puede reintentar)
        charge.refunded                          → `partially_refunded` / `refunded`
```

La página de éxito **no** confirma nada: muestra lo que haya fijado el webhook.

## Stock: estrategia elegida

**Reserva al crear el checkout** (`create_checkout_order`): en una sola transacción se
bloquean las filas, se comprueba precio/estado y se descuenta el stock con
`UPDATE … SET stock = stock - n WHERE id = … AND stock >= n`. Si una línea falla se revierte
todo. Dos compradores de la última unidad: solo uno consigue la reserva; el otro recibe
«La cantidad solicitada supera el stock disponible» **antes** de pagar.

- La reserva dura `checkoutReservationMinutes` (30, el mínimo de Stripe); la sesión de Stripe
  caduca 1 min después.
- Se libera (una sola vez, flag `stock_reserved`) si el pago falla, la sesión expira, el
  cliente cancela o vuelve atrás y reintenta.
- Red de seguridad: `release_expired_reservations()` se ejecuta en cada checkout y en el cron
  diario `/api/cron/liberar-reservas` (10 min de margen).
- Pago confirmado: el stock ya estaba descontado; no se vuelve a tocar. Un cobro que llegue
  tras liberar la reserva intenta reservar de nuevo y, si no hay stock, el pedido queda
  `requires_attention` y el email a la tienda llega con «[REVISAR]».
- Reembolsos: **no** reponen stock automáticamente (hay que revisar el producto devuelto).

## Modelo de datos (`supabase/migrations/20260929_orders.sql`)

| Tabla | Contenido |
|---|---|
| `orders` | Cabecera: `order_number` (MK-AAAA-000123), estados, cliente, dirección, importes, ids de Stripe, reserva, marcas de email |
| `order_items` | Snapshot inmutable: nombre, marca, SKU, variante, precio unitario, cantidad |
| `order_events` | Historial (creado, pagado, cancelado, stock liberado, intentos fallidos…) |
| `stripe_webhook_events` | Idempotencia de webhooks (sin payload: no guarda datos personales) |

Estados y transiciones (forzadas por el trigger `orders_guard`):

- `status`: `pending → paid | cancelled`, `cancelled → paid` (cobro tardío, queda en revisión),
  `paid → completed | refunded`, `completed → refunded`.
- `payment_status`: `pending|failed → paid|failed`, `paid → partially_refunded|refunded`,
  `partially_refunded → refunded`.
- `fulfillment_status` (solo pedidos pagados): `unfulfilled → preparing | shipped | ready_for_pickup | delivered`,
  `preparing → shipped | ready_for_pickup`, `shipped | ready_for_pickup → delivered`.

Los importes de un pedido y sus líneas no se pueden modificar tras crearse (triggers).
RLS activado sin políticas: `anon`/`authenticated` no pueden leer ni escribir pedidos, ni
modificar productos/stock, ni ejecutar las funciones. Todo pasa por el servidor
(`service_role`).

## Seguridad

- El navegador solo envía producto/variante/cantidad; precios, envío, IVA y total se
  calculan en servidor con datos de Supabase y se vuelven a verificar dentro de la
  transacción SQL (`price_changed`). La sesión de Stripe se construye con esos importes y
  se comprueba que suma el total del pedido.
- Validación con Zod (`astro/zod`), límites de cantidad (1–10 por línea, 50 líneas) y tamaño
  de petición.
- Comprobación de `Origin` en las rutas POST (el proyecto tiene `checkOrigin: false`),
  rate limit por IP, idempotencia por clave del cliente y por pedido en Stripe.
- Webhook: firma verificada sobre el cuerpo RAW, eventos deduplicados, transiciones con
  bloqueo de fila, emails reclamados en BD (nunca duplicados).
- Acceso al estado de un pedido con token aleatorio de 256 bits (solo se guarda su SHA-256);
  páginas success/cancel con `no-store` y `no-referrer`.
- Logs sin datos personales ni de tarjeta.

## Configuración pendiente (negocio)

En `src/lib/commerce/store-config.ts`:

| Campo | Qué falta |
|---|---|
| `shipping` | Coste fijo, envío gratis desde, plazo, zonas y países (`countries: ["ES"]`) — o `null` si solo recogida |
| `pickupInStore` | ¿Se permite recoger en tienda? |
| `tax.rate` | Tipo de IVA a desglosar (hoy los precios se muestran «IVA incluido» sin desglose) |
| `returns` | Días, gratuidad y detalle de la política de devoluciones |
| `paymentMethods` | Métodos activados en Stripe (solo texto informativo) |
| `legalTermsReviewed` | `true` cuando `/condiciones-venta` esté completa (sin «PENDIENTE») |
| `onlinePaymentEnabled` | `true` para activar la venta online |

Además: completar los bloques «PENDIENTE» de `/condiciones-venta` con un asesor
(desistimiento, garantía, reclamaciones, legislación, fecha), el plazo de conservación de
datos de pedidos en `/privacidad`, y cuenta Stripe verificada (datos fiscales y bancarios).

## Variables de entorno

`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SITE_URL`, `STORE_ORDERS_EMAIL` (opcional),
`CRON_SECRET`, más las existentes `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`RESEND_API_KEY`, `RESEND_FROM`, `TALLER_EMAIL`. No se usa clave publicable de Stripe.

## Probar en Stripe TEST MODE (local)

1. Aplicar las migraciones en un proyecto Supabase **de pruebas** (`20260928_equipment.sql`
   y `20260929_orders.sql`) y crear un producto con stock:
   ```sql
   INSERT INTO equipment_products (slug, sku, brand, name, category, price, stock)
   VALUES ('casco-test', 'TEST-1', 'Test', 'Casco de prueba', 'cascos', 25.00, 2);
   ```
2. `.env` con claves `sk_test_…` y, en `store-config.ts` **sin commitear**:
   `onlinePaymentEnabled: true`, `legalTermsReviewed: true` y `pickupInStore: true`
   (o un `shipping` de prueba).
3. `npm run dev` y en otra terminal:
   `stripe listen --forward-to localhost:4321/api/webhooks/stripe`
   → copiar el `whsec_…` que imprime a `STRIPE_WEBHOOK_SECRET` y reiniciar `npm run dev`.
4. Casos:
   - **Pago correcto**: tarjeta `4242 4242 4242 4242`, fecha futura, CVC cualquiera →
     `/checkout/success` pasa de «confirmando» a «¡Gracias!», llegan 2 emails, stock −1.
   - **Pago rechazado**: `4000 0000 0000 0002` → Stripe muestra el error; el pedido sigue
     `pending` (el cliente puede reintentar) y queda `payment_attempt_failed` en `order_events`.
   - **3D Secure**: `4000 0025 0000 3155`.
   - **Cancelación**: botón «volver» en Stripe → `/checkout/cancel`, pedido `cancelled`,
     stock repuesto, carrito intacto.
   - **Expiración**: `stripe checkout sessions expire cs_test_…` (o esperar 31 min) →
     `checkout.session.expired` libera el stock.
   - **Webhook duplicado**: en el Dashboard → Webhooks → reenviar el evento → responde
     `duplicate: true`, sin segundo email ni segundo descuento.
   - **Pago asíncrono** (si se activa SEPA en el Dashboard): IBAN `AT611904300234573201`
     (éxito diferido) y `AT861904300235473202` (fallo).
   - **Reembolso**: Dashboard → Pagos → Reembolsar (total o parcial), o
     `stripe refunds create --payment-intent pi_…` → `partially_refunded` / `refunded`.
5. Tests automáticos: `npm test` (incluye PostgreSQL real en memoria con PGlite para la
   migración, reservas, concurrencia, RLS y el webhook con firmas reales de Stripe).

## Producción

1. Ejecutar `20260929_orders.sql` en Supabase (producción).
2. Variables en Vercel (Production): claves **live** de Stripe, `SITE_URL=https://motokass.com`,
   `CRON_SECRET`, `STORE_ORDERS_EMAIL`.
3. Stripe Dashboard (live) → Webhooks → endpoint `https://motokass.com/api/webhooks/stripe`
   con los eventos: `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed`, `checkout.session.expired`,
   `payment_intent.payment_failed`, `charge.refunded` → copiar su `whsec_…`.
4. Completar la configuración comercial y legal, y activar `onlinePaymentEnabled`.
5. Hacer un pedido real de importe bajo y reembolsarlo.

## Lo que no incluye (siguiente fase)

- Backoffice de pedidos (hoy: emails + Supabase Table Editor). Para completarlo: listado en
  `/admin/pedidos`, cambio de `fulfillment_status` (ya validado por el trigger), reembolsos
  desde el panel vía API de Stripe y reposición manual de stock en devoluciones.
- Códigos promocionales (`discount_amount` existe; falta validar códigos en servidor).
- Stripe Tax / facturas.
