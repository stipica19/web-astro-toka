/**
 * Kreira ili resetuje admin nalog.
 *
 * Javna registracija je isključena (`disableSignUp` u lib/auth.ts), pa se
 * jedini nalog pravi ovom skriptom.
 *
 * Lozinka se ne hešira ručno nego kroz `auth.$context` — tako je zagarantovano
 * isti algoritam i parametri koje Better Auth koristi pri prijavi. Isto vrijedi
 * za `issuer`: Better Auth traži nalog po (providerId, issuer, accountId), pa
 * vrijednost uzimamo iz njihovog helpera umjesto da je prepisujemo.
 *
 * Pokretanje:
 *   npm run admin:create -- admin@primjer.ba "lozinka od bar 12 znakova"
 */
import { randomUUID } from "node:crypto";
import { createLocalAccountIssuer } from "@better-auth/core/db";
import { auth } from "../src/lib/auth.ts";
import { prisma } from "../src/lib/prisma.ts";

const MIN_PASSWORD_LENGTH = 12; // mora se poklapati sa lib/auth.ts

const [emailArg, password] = process.argv.slice(2);

if (!emailArg || !password) {
  console.error('Upotreba: npm run admin:create -- <email> "<lozinka>"');
  process.exit(1);
}

// Better Auth traži email malim slovima; ako ga upišemo drugačije, prijava ne prolazi.
const email = emailArg.toLowerCase();

if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error("Email nije ispravan.");
  process.exit(1);
}

if (password.length < MIN_PASSWORD_LENGTH) {
  console.error(`Lozinka mora imati bar ${MIN_PASSWORD_LENGTH} znakova.`);
  process.exit(1);
}

const ctx = await auth.$context;
const hash = await ctx.password.hash(password);
const now = new Date();

const existing = await prisma.user.findUnique({ where: { email } });

if (existing) {
  // Nalog postoji — ovo je reset lozinke, ne duplikat.
  await prisma.account.updateMany({
    where: { userId: existing.id, providerId: "credential" },
    data: { password: hash, updatedAt: now },
  });
  // Postojeće sesije se poništavaju da stara lozinka ne ostane upotrebljiva.
  const revoked = await prisma.session.deleteMany({ where: { userId: existing.id } });
  console.log(`Lozinka za ${email} je promijenjena. Poništenih sesija: ${revoked.count}.`);
} else {
  const userId = randomUUID();

  await prisma.user.create({
    data: {
      id: userId,
      email,
      name: "Admin",
      // Nema slanja mailova — nalog ručno pravi administrator sistema.
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
      accounts: {
        create: {
          id: randomUUID(),
          accountId: userId,
          providerId: "credential",
          issuer: createLocalAccountIssuer("credential"),
          password: hash,
          createdAt: now,
          updatedAt: now,
        },
      },
    },
  });

  console.log(`Admin nalog ${email} je kreiran.`);
}

await prisma.$disconnect();
