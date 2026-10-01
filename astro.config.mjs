// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: "https://motokass.com",
  output: "server",
  // Imágenes de astro:assets servidas por la optimización de imágenes de Vercel
  // (/_vercel/image). El endpoint propio de Astro (/_image) descarga el original
  // por HTTP desde el despliegue y en las previews protegidas recibe una
  // redirección al login, así que respondía 404 (logo y portadas rotos).
  // `sizes` incluye anchos pequeños para que el logo y las miniaturas no se
  // sirvan a 640 px, el mínimo por defecto.
  adapter: vercel({
    imageService: true,
    imagesConfig: {
      sizes: [64, 96, 128, 256, 320, 384, 480, 640, 750, 828, 1080, 1200, 1920, 2048],
      domains: [],
    },
  }),
  integrations: [react()],
  security: {
    checkOrigin: false,
  },
  vite: {
    optimizeDeps: {
      include: ["@ai-sdk/react"],
    },
  },
});
