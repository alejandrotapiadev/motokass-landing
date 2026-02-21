// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless'; // si usas Vercel

import react from '@astrojs/react';

export default defineConfig({
  output: "server",
  adapter: vercel({}),
  integrations: [react()],
});