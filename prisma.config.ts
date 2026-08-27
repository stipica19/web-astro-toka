import { defineConfig, env } from "prisma/config";

// Prisma 7 CLI više ne učitava .env automatski — Astro ga učitava za aplikaciju,
// ali `prisma migrate`/`generate` se pokreću izvan Astra pa ga moramo učitati sami.
// Node 22 to zna bez dodatne dotenv zavisnosti.
try {
  process.loadEnvFile(".env");
} catch {
  // .env ne postoji (npr. CI/produkcija) — varijable dolaze iz okruženja.
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    path: "prisma/migrations",
    // Node 22 pokreće .ts direktno (type stripping) — bez tsx zavisnosti.
    seed: "node --env-file=.env prisma/seed.ts",
  },
});
