# syntax=docker/dockerfile:1

# ---------- 1) zavisnosti ----------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------- 2) build ----------
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma klijent se generiše u src/generated/ i nije u gitu — mora ovdje.
#
# `prisma generate` ne dira bazu, ali prisma.config.ts traži DATABASE_URL pri
# učitavanju, pa se ovdje podmeće lažna vrijednost. Važi samo za ovu naredbu
# (nije ENV), ne završava u slici i nije tajna — prava veza dolazi iz .env-a
# u runtimeu.
RUN DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build" npx prisma generate

# NAMJERNO bez DATABASE_URL-a i ostalih tajni.
#
# Astro/Vite ono što nađe u okruženju tokom builda UGRADI u bundle: sa
# postavljenim DATABASE_URL-om lozinka baze doslovno završi kao string u
# dist/server/chunks/. Bez njega se izraz `import.meta.env?.X ?? process.env.X`
# u lib/prisma.ts razriješi tek u runtimeu, iz okruženja kontejnera.
#
# Zato slika ne sadrži nijednu tajnu i ista se može pokrenuti na bilo kojem
# serveru — sve dolazi iz .env fajla pored docker-compose.yml.
RUN npm run build

# ---------- 3) produkcija ----------
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4321

# Vlasništvo se postavlja u samom COPY-ju. `RUN chown -R` bi napravio novi sloj
# sa kopijom svih fajlova i udvostručio sliku (mjereno: 1,83 GB → 1,02 GB).
#
# Zavisnosti se preuzimaju iz `deps` stepena umjesto novog `npm ci` — brže je,
# a Prisma CLI (jedina dev zavisnost) treba u kontejneru zbog migracija.
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json package-lock.json ./

COPY --from=build --chown=node:node /app/dist ./dist
# src/ nosi generisani Prisma klijent i lib/ koji koristi skripta za admin nalog.
COPY --from=build --chown=node:node /app/src ./src
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node prisma.config.ts ./
COPY --chown=node:node scripts ./scripts
# Fajl je izvršan u repozitoriju, COPY zadržava dozvole — `chmod` ne treba.
COPY --chown=node:node docker-entrypoint.sh ./

USER node

EXPOSE 4321

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "./dist/server/entry.mjs"]
