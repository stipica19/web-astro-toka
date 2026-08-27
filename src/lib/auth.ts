import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma.ts";

// Isti razlog kao u lib/prisma.ts: Astro puni import.meta.env, Node process.env.
const env = (key: string): string | undefined =>
  import.meta.env?.[key] ?? process.env[key];

const secret = env("BETTER_AUTH_SECRET");

if (!secret) {
  throw new Error("BETTER_AUTH_SECRET nije postavljen. Provjeri .env.");
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret,
  baseURL: env("BETTER_AUTH_URL"),

  emailAndPassword: {
    enabled: true,
    // Sajt ima tačno jednog admina — javna registracija je zatvorena.
    // Nalog se pravi skriptom (scripts/create-admin.ts), ne kroz web.
    disableSignUp: true,
    minPasswordLength: 12,
  },

  session: {
    // Sedam dana; kolačić se osvježava jednom dnevno dok je admin aktivan.
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },

  advanced: {
    // Bez ovoga bi kolačić u produkciji išao preko HTTP-a ako reverse proxy
    // ne proslijedi ispravno zaglavlje.
    useSecureCookies: import.meta.env?.PROD ?? process.env.NODE_ENV === "production",
  },
});
