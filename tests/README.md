# Tests — MOTOKASS

Suite de tests unitarios y de componentes. Cubre las funcionalidades críticas de la tienda web: utilidades, validación de formularios, integridad del catálogo y comportamiento de los componentes React.

---

## Cómo ejecutar

```bash
# Ejecutar todos los tests una vez (modo CI)
npm test

# Modo watch — re-ejecuta al guardar ficheros (ideal durante desarrollo)
npm run test:watch

# Interfaz visual en el navegador con historial y detalles
npm run test:ui
```

---

## Estructura

```
tests/
├── setup.ts                          # Configuración global (jest-dom matchers)
├── unit/
│   ├── slug.test.ts                  # Función toSlug()
│   ├── filtros.test.ts               # Lógica de filtros del catálogo
│   ├── validacion.test.ts            # Validación de formularios (citas, contacto)
│   └── catalogo.test.ts              # Integridad de los datos JSON del catálogo
└── components/
    ├── MotoCard.test.tsx             # Componente tarjeta de moto
    └── FilteredMotoList.test.tsx     # Componente catálogo con filtros
```

---

## Qué testea cada fichero

### `unit/slug.test.ts`
Prueba la función `toSlug()` de `src/lib/slug.ts`, que convierte nombres de motos en URLs amigables.

| Caso | Ejemplo |
|------|---------|
| Convierte a minúsculas | `"RIEJU MR PRO"` → `"rieju-mr-pro"` |
| Elimina acentos | `"Eléctrico"` → `"electrico"` |
| Reemplaza espacios por guiones | `"MR PRO 300i 2026"` → `"mr-pro-300i-2026"` |
| Sin guiones al inicio/final | `" moto "` → `"moto"` |
| Colapsa separadores múltiples | `"Rieju  --  MR"` → `"rieju-mr"` |
| Maneja números y puntos | `"E-City 1.2KW"` → `"e-city-1-2kw"` |

---

### `unit/filtros.test.ts`
Prueba las tres funciones puras de `src/lib/filtros.ts` que alimentan los filtros del catálogo.

**`getTipoMotor(moto)`** — clasifica el motor de una moto:
- Detecta `2T`, `4T` o `Eléctrico` a partir del campo `specs.tipo_motor`
- Detecta eléctrico también si existe `specs.potencia_kw`
- Devuelve `null` si no se puede clasificar

**`getRangoCilindrada(moto)`** — devuelve el rango de cilindrada:
- `50cc` (hasta 50 cc), `125cc` (51–125), `250-500cc` (126–500), `mas500cc` (>500)
- `electrico` si el motor es eléctrico (independiente de cilindrada)
- `null` si no hay datos

**`getPaginas(total, actual)`** — genera la lista de páginas para el paginador:
- Sin elipsis si hay 7 páginas o menos
- Añade `'…'` al inicio/final cuando la página actual está lejos de los extremos
- Siempre incluye la primera y la última página

---

### `unit/validacion.test.ts`
Prueba las funciones de validación de `src/lib/validacion.ts`, usadas por los endpoints `/api/agendar-cita` y `/api/contacto`.

**`isValidEmail(email)`**
- Acepta: `cliente@gmail.com`, `info@motokass.com`
- Rechaza: sin arroba, sin dominio, con espacios, cadena vacía

**`isFechaFutura(fecha)`**
- Acepta hoy y fechas futuras
- Rechaza fechas pasadas
- Usa `vi.useFakeTimers()` para fijar la fecha en los tests

**`validarCita(body)`** — valida el formulario de cita previa:
- Detecta campos obligatorios vacíos: nombre, email, fecha, hora, vehículo, motivo
- Devuelve mensaje de error específico o `null` si todo es correcto

**`validarContacto(body)`** — valida el formulario de contacto:
- Detecta nombre, email o mensaje vacíos
- Rechaza mensajes de menos de 10 caracteres

---

### `unit/catalogo.test.ts`
Verifica la integridad de los datos JSON del catálogo (`RiejuCatalogo.json` y `ShercoCatalogo.json`).

| Test | Qué comprueba |
|------|---------------|
| Número de modelos | 35 Rieju + 32 Sherco = 67 en total |
| Campo `modelo` | Todos los modelos tienen nombre no vacío |
| Campo `imagen` | Todos tienen URL de imagen |
| Campo `categoria` | Todos están categorizados |
| Campo `stock` | Si existe, es booleano |
| Slugs únicos | Los 67 slugs generados son todos distintos entre sí |
| Slugs válidos | Formato correcto: solo letras, números y guiones |
| Specs en Rieju | Todos los modelos Rieju tienen specs técnicas |

> Este test actúa como **guardia de integridad**: si alguien añade un modelo al JSON con datos incorrectos o un nombre duplicado que genere el mismo slug, el test fallará antes del deploy.

---

### `components/MotoCard.test.tsx`
Prueba el componente `MotoCard` que renderiza cada tarjeta en el catálogo.

| Test | Comportamiento verificado |
|------|--------------------------|
| Nombre del modelo | Se muestra correctamente |
| Marca | Aparece el nombre de la marca |
| Precio | Muestra siempre "Consultar precio" |
| Badge "Sin stock" | Aparece cuando `stock=false` |
| Badge "Nuevo" | Aparece cuando `nuevo=true` y hay stock |
| Badge "Nuevo" + sin stock | No aparece si no hay stock, aunque `nuevo=true` |
| Clase CSS agotada | La tarjeta tiene clase `moto-card--agotada` sin stock |
| Imagen | Renderiza con `src` y `alt` correctos |
| Color de marca | Badge tiene clase CSS `rieju` o `sherco` según corresponda |

---

### `components/FilteredMotoList.test.tsx`
Prueba el componente principal del catálogo con todos sus filtros.

| Test | Comportamiento verificado |
|------|--------------------------|
| Render inicial | Muestra todos los modelos sin filtros activos |
| Contador | Muestra el número correcto de resultados |
| Búsqueda por texto | Filtra por nombre o marca al escribir |
| Solo disponibles | Oculta motos sin stock |
| Solo novedades | Muestra solo modelos con `nuevo=true` |
| Sin resultados | Muestra mensaje cuando ningún modelo coincide |
| Botón limpiar | Aparece solo cuando hay filtros activos |
| Limpiar filtros | Resetea todos los filtros y muestra todos los modelos |

---

## Tecnologías usadas

| Librería | Versión | Para qué |
|----------|---------|---------|
| [Vitest](https://vitest.dev) | ^4 | Framework de tests, compatible con Vite/Astro |
| [@testing-library/react](https://testing-library.com/react) | ^16 | Render y queries de componentes React |
| [@testing-library/jest-dom](https://github.com/testing-library/jest-dom) | ^6 | Matchers extra: `toBeInTheDocument`, `toHaveClass`… |
| [happy-dom](https://github.com/capricorn86/happy-dom) | ^20 | Entorno DOM ligero (alternativa a jsdom) |

---

## Añadir nuevos tests

1. Crea el fichero en `tests/unit/` (lógica pura) o `tests/components/` (React).
2. Importa desde `@/` que apunta a `src/` (configurado en `vitest.config.ts`).
3. Ejecuta `npm run test:watch` para ver los resultados en tiempo real.

```ts
// Ejemplo mínimo
import { describe, it, expect } from 'vitest';
import { miFuncion } from '@/lib/miModulo';

describe('miFuncion', () => {
  it('hace lo que se espera', () => {
    expect(miFuncion('input')).toBe('output esperado');
  });
});
```
