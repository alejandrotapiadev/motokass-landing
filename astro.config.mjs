// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless'; // si usas Vercel

export default defineConfig({
  output: "server", 
  adapter: vercel({}),
});
