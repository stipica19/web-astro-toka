import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";

// Prisma 7 traži driver adapter — connection string više ne ide u schema.prisma.
//
// .env se čita iz dva različita izvora, ovisno o tome ko pokreće kod:
//   - Astro (dev i build) učitava .env u `import.meta.env`, NE u `process.env`;
//   - `node --env-file=.env prisma/seed.ts` puni `process.env`, a `import.meta.env`
//     tamo uopšte ne postoji (otud `?.`).
// Zato se gleda oboje — inače dev server padne iako .env ima DATABASE_URL.
const connectionString = import.meta.env?.DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL nije postavljen. Provjeri .env (Astro čita import.meta.env, Node process.env).",
  );
}

// U dev modu Astro hot-reloada modul pri svakoj promjeni; bez ovog keša
// svaki reload otvori novi pool konekcija dok baza ne odbije nove.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
