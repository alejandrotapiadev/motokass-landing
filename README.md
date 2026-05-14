<div align="center">

# MOTOKASS

### Tienda y Taller de Motos · Ávila, España

![Astro](https://img.shields.io/badge/Astro-5.16-FF5D01?style=flat-square&logo=astro&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-SSR-000000?style=flat-square&logo=vercel&logoColor=white)

**Distribuidor oficial Rieju y Sherco · Catálogo online · Sistema de citas · Panel de administración**

[motokass.com](https://motokass.com) · [Ver en GitHub](https://github.com/alejandrotapiadev/motokass-landing)

</div>

---

## Descripción

Sitio web completo de **MOTOKASS**, concesionario y taller mecánico de motos en Ávila. Construido con **Astro 5 en modo SSR** y desplegado en **Vercel**. Incluye catálogo de motos filtrable con fichas individuales, sistema de citas integrado con Supabase, formularios de contacto con notificaciones por email vía Resend, página de ofertas, panel de administración protegido y optimizaciones SEO.

---

## Funcionalidades

| Área | Funcionalidad |
|------|---------------|
| **Catálogo** | Listado de motos Rieju y Sherco con filtros por marca, precio y disponibilidad de stock |
| **Ficha de moto** | Página individual `/tienda/[slug]` con specs técnicas, precio y formulario de interés |
| **Cita previa** | Formulario completo guardado en Supabase + email de confirmación al cliente y al taller |
| **Contacto** | Formulario con validación client-side + envío de email al taller vía Resend |
| **Ofertas** | Página de promociones con servicios de taller y motos destacadas |
| **Admin** | Panel protegido `/admin/citas` para gestionar y cambiar el estado de las citas |
| **SEO** | JSON-LD schema (LocalBusiness + MotorcycleDealer), sitemap.xml, robots.txt, meta OG |
| **UX** | Botón WhatsApp flotante, Google Maps embed, sección de testimonios, scroll-to-top |

---

## Stack tecnológico

```
Frontend     → Astro 5 (SSR) + React 19 + TypeScript
Estilos      → CSS Vanilla con variables (sin framework CSS)
Base de datos → Supabase (PostgreSQL)
Emails       → Resend
Hosting      → Vercel (adaptador oficial @astrojs/vercel)
Analytics    → Vercel Analytics + Speed Insights
Mapas        → Google Maps embed (sin API key)
```

---

## Estructura del proyecto

```
motokass-landing/
├── public/
│   ├── sitemap.xml          # Sitemap estático (actualizar al añadir motos)
│   ├── robots.txt           # Desautoriza /admin/ y /api/
│   └── fachada.png          # Imagen del negocio (usada en JSON-LD)
│
├── src/
│   ├── assets/              # Imágenes y logos locales
│   ├── components/
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── ServiceSelector.astro   # Cards Tienda/Taller en home
│   │   ├── FilteredMotoList.jsx    # Catálogo filtrable (client:load)
│   │   ├── MotoCard.jsx            # Tarjeta de moto
│   │   ├── Map.astro               # Google Maps embed
│   │   ├── Testimonios.astro       # Sección de reseñas
│   │   ├── WhatsApp.astro          # Botón flotante WhatsApp
│   │   └── ScrollTop.astro
│   │
│   ├── layouts/
│   │   └── MainLayout.astro        # Layout global (SEO, analytics, header/footer)
│   │
│   ├── lib/
│   │   ├── supabase.ts             # Cliente Supabase (service role)
│   │   ├── resend.ts               # Cliente Resend
│   │   └── slug.ts                 # Utilidad toSlug() para rutas de motos
│   │
│   ├── pages/
│   │   ├── index.astro             # Home: ServiceSelector + Testimonios + Mapa
│   │   ├── tienda.astro            # Catálogo completo
│   │   ├── tienda/
│   │   │   └── [slug].astro        # Ficha individual de moto (SSR dinámico)
│   │   ├── taller.astro            # Servicios del taller
│   │   ├── CitaPrevia.astro        # Formulario de cita
│   │   ├── contacto.astro          # Formulario de contacto
│   │   ├── Ofertas.astro           # Promociones y motos destacadas
│   │   ├── 404.astro
│   │   ├── under-construction.astro
│   │   ├── admin/
│   │   │   ├── index.astro         # Login del panel admin
│   │   │   └── citas.astro         # Gestión de citas (tabla + cambio de estado)
│   │   └── api/
│   │       ├── agendar-cita.ts     # POST: guarda cita en Supabase + emails
│   │       ├── contacto.ts         # POST: envía email al taller
│   │       ├── subscribe.ts        # POST: suscripción al newsletter
│   │       └── send-launch-emails.ts  # POST: envía emails a suscriptores
│   │
│   ├── resources/
│   │   ├── RiejuCatalogo.json      # Catálogo de motos Rieju (con campo stock)
│   │   └── ShercoCatalogo.json     # Catálogo de motos Sherco (con campo stock)
│   │
│   └── styles/
│       └── global.css              # Variables CSS, reset, utilidades globales
│
├── .env.example                    # Plantilla de variables de entorno
├── listadoTareas.txt               # Pendientes y detalles para v2
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

---

## Configuración local

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` con los valores reales (ver sección [Variables de entorno](#variables-de-entorno)).

### 3. Crear tablas en Supabase

Ejecutar en el editor SQL de Supabase:

```sql
-- Suscriptores del newsletter
CREATE TABLE subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  notified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Citas del taller
CREATE TABLE citas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  telefono TEXT,
  fecha DATE NOT NULL,
  hora TEXT NOT NULL,
  vehiculo TEXT NOT NULL,
  motivo TEXT NOT NULL,
  resumen TEXT,
  estado TEXT DEFAULT 'pendiente',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. Iniciar servidor de desarrollo

```bash
npm run dev
# → http://localhost:4321
```

---

## Variables de entorno

Todas las variables necesarias están documentadas en `.env.example`.

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `SUPABASE_URL` | URL del proyecto Supabase | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio de Supabase | ✅ |
| `RESEND_API_KEY` | API key de Resend para enviar emails | ✅ |
| `RESEND_FROM` | Email remitente verificado (ej: `noreply@motokass.com`) | ✅ |
| `TALLER_EMAIL` | Email donde llegan notificaciones de citas y contacto | ✅ |
| `ADMIN_PASSWORD` | Contraseña de acceso al panel `/admin` | ✅ |
| `WHATSAPP_NUMBER` | Número de móvil para el botón WhatsApp (ej: `34612345678`) | ⚙️ |

> **Nota:** Los emails no funcionan hasta tener el dominio `motokass.com` verificado en [Resend](https://resend.com). Mientras tanto, las citas se guardan igualmente en Supabase.

---

## Comandos

| Comando | Acción |
|---------|--------|
| `npm run dev` | Servidor local en `localhost:4321` |
| `npm run build` | Build de producción en `./dist/` |
| `npm run preview` | Vista previa del build local |
| `npm run astro check` | Comprobación de tipos TypeScript |

---

## Rutas principales

| Ruta | Descripción |
|------|-------------|
| `/` | Home con selector de servicios, testimonios y mapa |
| `/tienda` | Catálogo filtrable de motos (React, client:load) |
| `/tienda/[slug]` | Ficha individual de moto con specs y formulario |
| `/taller` | Servicios del taller mecánico |
| `/citaPrevia` | Formulario de cita (guarda en Supabase + emails) |
| `/contacto` | Formulario de contacto (envía email al taller) |
| `/Ofertas` | Promociones de servicios y motos destacadas |
| `/admin` | Login del panel de administración |
| `/admin/citas` | Tabla de citas con gestión de estado |
| `/404` | Página de error personalizada |

### Endpoints API

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/agendar-cita` | POST | Crea cita en Supabase y envía emails |
| `/api/contacto` | POST | Envía mensaje de contacto al taller |
| `/api/subscribe` | POST | Suscribe email al newsletter |
| `/api/send-launch-emails` | POST | Envía emails a suscriptores pendientes |

---

## Panel de administración

Acceso en `/admin` con la contraseña configurada en `ADMIN_PASSWORD`.

- Sesión persistida en cookie `httpOnly` durante 8 horas
- Vista de todas las citas ordenadas por fecha
- Filtro por estado: `pendiente` / `confirmada` / `completada` / `cancelada`
- Cambio de estado inline con actualización en Supabase
- Estadísticas de citas por estado en la cabecera

> ⚠️ El panel es de uso exclusivo del propietario. No compartir la URL ni la contraseña.

---

## Catálogo de motos

Los catálogos se gestionan mediante archivos JSON en `src/resources/`:

```json
{
  "catalogo": {
    "marca": "Rieju",
    "modelos": [
      {
        "modelo": "Rieju Century 125",
        "specs": { "cilindrada_cc": 125, "tipo_motor": "4T monocilíndrico", ... },
        "precio_eur": 3999,
        "imagen": "https://...",
        "stock": true
      }
    ]
  }
}
```

Al añadir o modificar motos, actualizar también `public/sitemap.xml` con las nuevas rutas `/tienda/[slug]`.

---

## Flujo de ramas (Git)

```
main          → Producción (motokass.com via Vercel)
develop       → Integración de features
feature/xyz   → Desarrollo de funcionalidades
```

Flujo de trabajo:

```bash
git checkout develop
git checkout -b feature/nueva-funcionalidad

# ... desarrollo y commits ...

git checkout develop
git merge feature/nueva-funcionalidad --no-ff

# Cuando develop está listo para producción:
git checkout main
git merge develop --no-ff
git push origin main
```

---

## SEO

- **JSON-LD** completo: `MotorcycleDealer` + `LocalBusiness` con dirección, coordenadas, horario y teléfono
- **Meta tags** Open Graph en todas las páginas
- **sitemap.xml** en `/public/sitemap.xml` (actualización manual por ahora)
- **robots.txt** desautoriza `/admin/` y `/api/`
- **Google Site Verification** configurado en `MainLayout.astro`

---

## Pendientes y hoja de ruta

Consultar [`listadoTareas.txt`](./listadoTareas.txt) en la raíz del proyecto.

Contiene **34 tareas** organizadas en 9 categorías orientadas a la segunda versión en producción:
variables de entorno pendientes, correcciones de contenido, deuda técnica, mejoras SEO, panel admin, UX y notas importantes a tener en cuenta.

---

## Licencia

Proyecto privado · © 2026 MOTOKASS · Todos los derechos reservados.
