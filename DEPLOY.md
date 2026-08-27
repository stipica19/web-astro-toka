# Deploy

Kratko: `git push` na `main` → GitHub Actions izgradi Docker sliku → objavi je na
GHCR → preko SSH-a na VPS-u povuče novu sliku i restartuje kontejner. Migracije
baze se primjenjuju automatski pri startu kontejnera.

**Postgres nije u Dockeru** — radi direktno na serveru, kao servis. Kontejner mu
pristupa preko `host.docker.internal` (postavljeno u `docker-compose.yml`).

```
GitHub (push na main)
   └─ Actions: docker build  →  ghcr.io/stipica19/web-astro-toka:latest + :<sha>
        └─ ssh VPS:  docker compose pull && docker compose up -d
              └─ kontejner:  prisma migrate deploy  →  node dist/server/entry.mjs
                    └─ Postgres na hostu (127.0.0.1:5432)
```

---

## 1. Postgres na serveru

### 1.1 Baza i korisnik

```bash
sudo -u postgres psql
```

```sql
CREATE ROLE toka_app LOGIN PASSWORD 'ovdje-jaka-lozinka';
CREATE DATABASE toka OWNER toka_app;
\q
```

### 1.2 Da kontejner može do baze

Kontejner ima svoj `localhost` — Postgres na hostu za njega nije dostupan dok se
ne otvori prema Docker mrežnom mostu. Prvo provjeri IP mosta (skoro uvijek
`172.17.0.1`):

```bash
ip -4 addr show docker0 | grep inet
```

**`postgresql.conf`** (putanja je obično `/etc/postgresql/16/main/postgresql.conf`):

```conf
listen_addresses = 'localhost,172.17.0.1'
```

**`pg_hba.conf`** — dodaj red **iznad** postojećih `host` redova. Raspon
`172.16.0.0/12` pokriva sve podrazumijevane Docker mreže, pa pravilo ostaje
tačno i ako se most jednom promijeni:

```conf
host    toka    toka_app    172.16.0.0/12    scram-sha-256
```

```bash
sudo systemctl restart postgresql
```

Ako je `ufw` aktivan:

```bash
sudo ufw allow from 172.16.0.0/12 to any port 5432 proto tcp
```

> Port 5432 se **nikad** ne otvara prema internetu — samo prema Docker mreži.

### 1.3 Provjera veze iz kontejnera

```bash
docker run --rm --add-host=host.docker.internal:host-gateway postgres:16 \
  psql "postgresql://toka_app:LOZINKA@host.docker.internal:5432/toka" -c "select 1"
```

Vrati li `1`, veza radi i `DATABASE_URL` je ispravan.

### 1.4 Jednostavnija alternativa

Ako ti se ne dira konfiguracija Postgresa, u `docker-compose.yml` umjesto
`ports` i `extra_hosts` može stajati:

```yaml
network_mode: host
```

Tada kontejner dijeli mrežu sa serverom, `localhost:5432` radi bez ikakve
izmjene u Postgresu, a aplikacija sluša direktno na `PORT` hosta. Cijena je
manja izolacija kontejnera i gubitak mapiranja portova — za jedan sajt na
vlastitom VPS-u je to sasvim uobičajeno rješenje.

---

## 2. Priprema VPS-a

```bash
# Docker + compose plugin (Debian/Ubuntu)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # pa se odjavi i prijavi ponovo

mkdir -p ~/apps/toka
cd ~/apps/toka
```

U `~/apps/toka/` idu **dva** fajla:

- `docker-compose.yml` — kopiraj iz repozitorija
- `.env` — po uzoru na `.env.example`

```bash
chmod 600 .env
```

`.env` na serveru — **vrijednosti idu bez navodnika**:

```env
DATABASE_URL=postgresql://toka_app:LOZINKA@host.docker.internal:5432/toka
BETTER_AUTH_SECRET=rezultat-naredbe-openssl-rand-base64-32
BETTER_AUTH_URL=https://toka.ba
PUBLIC_CLOUDINARY_CLOUD_NAME=...
PUBLIC_CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

> Docker `env_file` **ne skida navodnike** kao shell. Sa `BETTER_AUTH_URL="https://toka.ba"`
> u aplikaciju stignu i navodnici, pa Better Auth sruši svaki zahtjev sa
> `Invalid base URL`. Lokalni `.env` koji čita Astro navodnike podnosi — ovaj na
> serveru ne.

---

## 3. GitHub secrets

`Settings → Secrets and variables → Actions → New repository secret`:

| Secret        | Šta je                                 | Kako doći do njega                                                                   |
| ------------- | -------------------------------------- | ------------------------------------------------------------------------------------ |
| `VPS_HOST`    | IP ili domena servera                  | —                                                                                    |
| `VPS_USER`    | korisnik za SSH (npr. `deploy`)        | —                                                                                    |
| `VPS_SSH_KEY` | **privatni** ključ, cijeli PEM sadržaj | `ssh-keygen -t ed25519 -f deploy_key`, javni dio u `~/.ssh/authorized_keys` na VPS-u |
| `GHCR_TOKEN`  | GitHub classic PAT sa `read:packages`  | `Settings → Developer settings → Personal access tokens (classic)`                   |

`GITHUB_TOKEN` u workflowu je automatski i vrijedi samo unutar Actions runnera —
VPS mora imati svoj token za `docker login`, otud `GHCR_TOKEN`.

Ako paket na GHCR-u postaviš kao javan (`Package settings → Change visibility`),
`docker login` na VPS-u više ne treba, ali `GHCR_TOKEN` može ostati.

---

## 4. Prvi deploy

1. Pushaj na `main` (ili pokreni workflow ručno iz **Actions** taba).
2. Prati na serveru:

   ```bash
   cd ~/apps/toka
   docker compose logs -f app
   ```

   Prvo se ispisuje `→ Primjenjujem migracije...`, pa `Server listening on http://0.0.0.0:4321`.

3. Napravi admin nalog (samo prvi put — javna registracija je zatvorena):

   ```bash
   docker compose exec app node scripts/create-admin.ts admin@toka.ba "lozinka-od-bar-12-znakova"
   ```

---

## 5. Reverse proxy i HTTPS

Aplikacija sluša samo na `127.0.0.1:4321`. Ispred nje ide nginx ili Caddy koji
radi HTTPS. Kolačić sesije se u produkciji šalje sa `Secure` zastavicom, pa
**bez HTTPS-a prijava u admin neće raditi**.

nginx:

```nginx
server {
    server_name toka.ba www.toka.ba;

    location / {
        proxy_pass http://127.0.0.1:4321;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        # Bez ovog zaglavlja Better Auth misli da je veza HTTP i odbija kolačić.
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Certifikat: `sudo certbot --nginx -d toka.ba -d www.toka.ba`.

Caddy je kraći i sam vadi certifikat:

```caddy
toka.ba {
    reverse_proxy 127.0.0.1:4321
}
```

---

## 6. Vraćanje na prethodnu verziju

Svaki deploy objavi i tag sa SHA commita, pa se rollback radi bez novog builda:

```bash
cd ~/apps/toka
IMAGE_TAG=<sha-commita> docker compose up -d
```

Povratak na najnovije: `docker compose up -d` (bez `IMAGE_TAG`).

> Rollback koda **ne poništava migraciju baze**. Ako je problematični deploy
> mijenjao shemu, prvo provjeri `prisma/migrations/` prije vraćanja.

---

## 7. Zašto je tako posloženo

**Tajne se ne smiju naći u buildu.** Astro tokom builda ugradi vrijednosti iz
okruženja direktno u bundle — sa postavljenim `DATABASE_URL`-om lozinka baze
doslovno završi kao string u `dist/server/chunks/`. Zato Docker build namjerno
ide **bez** ijedne tajne, a sve varijable se čitaju iz okruženja kontejnera u
runtimeu. Nikad ne prosljeđuj `DATABASE_URL` kao `build-arg`.

**Javne stranice su SSR, ne statične.** Početna, stranice kategorija i 404 imaju
`export const prerender = false`. Dva razloga:

1. Sadržaj dolazi iz baze koju klijent mijenja kroz admin. Da su stranice
   statične, izmjena kategorije bila bi vidljiva tek nakon novog deploya.
2. Statične stranice se generišu u build-time, što znači da bi **build tražio
   pristup bazi** — a baza je na VPS-u i ne smije biti dostupna GitHub runneru.

Slike i dalje idu preko Cloudinaryja i keširaju se na njegovom CDN-u, JS-a na
javnim stranicama nema, pa je razlika u brzini prema statičnoj verziji svega
nekoliko milisekundi po zahtjevu.

---

## 8. Kad nešto ne radi

| Simptom                                        | Uzrok                                                                      |
| ---------------------------------------------- | -------------------------------------------------------------------------- |
| `Can't reach database server` u logovima       | `listen_addresses` ili `pg_hba.conf` ne pokrivaju Docker mrežu (korak 1.2) |
| Kontejner se vrti u krug pri startu            | migracija pukla — `docker compose logs app` pokazuje koja                  |
| Prijava u admin ne prolazi, a lozinka je tačna | nedostaje HTTPS ili `X-Forwarded-Proto` u reverse proxyju (korak 5)        |
| `DATABASE_URL nije postavljen`                 | `.env` nije pored `docker-compose.yml` ili nije naveden u `env_file`       |
| Slike se ne prikazuju                          | `PUBLIC_CLOUDINARY_CLOUD_NAME` nije u `.env` na serveru                    |
| `PUBLIC_CLOUDINARY_CLOUD_NAME nije postavljen` | ista varijabla — `PUBLIC_*` se ne ugrađuje u sliku, čita se u runtimeu     |
| `Invalid base URL` u logovima                  | vrijednosti u `.env` su pod navodnicima (korak 2)                          |
| Deploy prođe, ali sajt je stari                | `image:` u compose fajlu ne odgovara `IMAGE` iz workflowa                  |
