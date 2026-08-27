#!/bin/sh
set -e

# Migracije se primjenjuju pri svakom startu kontejnera — tako shema baze i
# verzija koda uvijek idu zajedno, bez ručnog koraka nakon deploya.
# Ako migracija padne, kontejner se ne pokrene (razlog je u `docker compose logs`).
echo "→ Primjenjujem migracije..."
npx prisma migrate deploy

echo "→ Pokrećem aplikaciju..."
exec "$@"
