-- ============================================================
-- Tabla: blog_posts
-- Posts generados automáticamente por IA cada semana.
-- Ejecutar en Supabase SQL Editor:
--   Dashboard → SQL Editor → New query → pegar y ejecutar
-- ============================================================

CREATE TABLE IF NOT EXISTS blog_posts (
  id            UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  slug          TEXT          UNIQUE NOT NULL,
  title         TEXT          NOT NULL,
  description   TEXT          NOT NULL,
  content       TEXT          NOT NULL,          -- HTML generado por Groq
  category      TEXT          NOT NULL
    CHECK (category IN ('Novedades', 'Mantenimiento', 'Rutas', 'Consejos')),
  image         TEXT          NOT NULL,
  image_alt     TEXT          NOT NULL DEFAULT 'Blog MOTOKASS',
  author        TEXT          NOT NULL DEFAULT 'MOTOKASS',
  tags          TEXT[]        DEFAULT '{}',
  featured      BOOLEAN       DEFAULT FALSE,
  source_urls   TEXT[]        DEFAULT '{}',      -- URLs de los artículos fuente (RSS)
  published_at  TIMESTAMPTZ   DEFAULT NOW(),
  created_at    TIMESTAMPTZ   DEFAULT NOW()
);

-- Índices para paginación y filtrado
CREATE INDEX IF NOT EXISTS blog_posts_published_at_idx ON blog_posts (published_at DESC);
CREATE INDEX IF NOT EXISTS blog_posts_category_idx     ON blog_posts (category);
CREATE INDEX IF NOT EXISTS blog_posts_slug_idx         ON blog_posts (slug);

-- Row Level Security
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Lectura pública (cualquiera puede leer los posts)
CREATE POLICY "blog_posts_public_read"
  ON blog_posts FOR SELECT
  USING (true);

-- Escritura solo desde service_role (el cron usa SUPABASE_SERVICE_ROLE_KEY)
-- No se necesita policy adicional: service_role bypasses RLS por defecto.
