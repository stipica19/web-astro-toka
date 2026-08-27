// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import node from '@astrojs/node';

export default defineConfig({
  // Potreban za kanonske URL-ove, OG tagove i kasnije sitemap.
  site: 'https://toka.ba',

  vite: { plugins: [tailwindcss()] },
  integrations: [react()],

  // Javne stranice ostaju statične (output je i dalje 'static'); adapter služi
  // samo rutama koje eksplicitno postave `prerender = false` — admin i auth API.
  adapter: node({ mode: 'standalone' }),

  // Astro sam skida i hostuje fontove te generiše preload i metrički usklađen
  // fallback — tekst se ne "preskače" pri učitavanju (bez FOIT/FOUT-a).
  // `latin-ext` je obavezan zbog č, ć, š, ž, đ.
  // Sufiks `-family` razdvaja ove varijable od Tailwind `--font-*` tokena
  // u global.css, koji ih omotavaju i generišu `font-display` / `font-body` klase.
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Playfair Display',
      cssVariable: '--font-display-family',
      // Naslovi se koriste samo u regularnoj rezini — svaka dodatna težina
      // je još jedan woff2 fajl po subsetu.
      weights: [400],
      // Bez kurziva — nigdje se ne koristi, a udvostručio bi broj fajlova.
      styles: ['normal'],
      subsets: ['latin', 'latin-ext'],
      fallbacks: ['Georgia', 'serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'Inter',
      cssVariable: '--font-body-family',
      // 400 za tekst, 500 za dugmad (font-medium).
      weights: [400, 500],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
  ],
});
