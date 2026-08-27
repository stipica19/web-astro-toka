# Toka — Website Redesign (Astro)

## About the project

Toka is a family-run engraving and souvenir workshop from Bugojno, Bosnia and Herzegovina, active since 2016. This project is a redesign of the existing website.

- **Design**: follows https://nova.toka.ba/ (~90% the same design, same section structure — header, hero, category grid, "how we work", footer)
- **Old site**: toka.ba (WooCommerce) — stays live until the migration is complete, then gets shut down with 301 redirects to the new URLs (category → category)
- **Core of the site**: 12 product categories (engraving, magnets, plaques, keychains, signage, clocks, badges, etc.), each with a name, optional description, header image, gallery, and display order (sort order)
- **Admin**: one admin user, CRUD over categories (create, edit, delete, reorder)
- No cart/checkout — contact goes through WhatsApp/phone/email

## Tech stack

| Layer        | Tool                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------- |
| Framework    | Astro 7                                                                                           |
| Styling      | Tailwind CSS v4.3 (`@tailwindcss/vite` — **not** `@astrojs/tailwind`, which is deprecated for v4) |
| Icons        | `@lucide/astro` (Astro components) + `lucide-react` (React islands)                               |
| Database     | PostgreSQL                                                                                        |
| ORM          | Prisma 7                                                                                          |
| Validation   | Zod 4                                                                                             |
| CRUD backend | `astro:actions` (Zod validation built in, no manual REST routes)                                  |
| Auth         | Better Auth + Prisma adapter (one admin, no public sign-up)                                       |
| Admin UI     | `@astrojs/react` (islands, `client:load`) + `@tanstack/react-query`                               |
| Forms        | `react-hook-form` + `@hookform/resolvers/zod`                                                     |
| Reorder      | `@dnd-kit/core` + `@dnd-kit/sortable`                                                             |
| Images       | `astro-cloudinary` (`CldImage`, `CldUploadWidget`) + `cloudinary` Node SDK                        |
| Adapter      | `@astrojs/node` (VPS) or a Cloudflare/Vercel adapter                                              |

## Data model (Prisma)

```prisma
model Category {
  id          String         @id @default(cuid())
  name        String
  slug        String         @unique
  description String?        @db.Text
  headerImage String
  order       Int            @default(0)
  isPublished Boolean        @default(true)
  gallery     GalleryImage[]
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
}

model GalleryImage {
  id         String   @id @default(cuid())
  url        String
  alt        String?
  order      Int      @default(0)
  category   Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  categoryId String
}
```

`headerImage` and `GalleryImage.url` store the Cloudinary `public_id`, not a direct URL — the real URL and any transformations are generated via `CldImage` at render time.

## Project structure

```
src/
  actions/              # categories.ts, uploads.ts (every action checks auth)
  components/
    admin/                # React islands (client:load)
    ui/                     # Astro components, public-facing part
  layouts/                  # Layout.astro, AdminLayout.astro
  lib/                       # prisma.ts, auth.ts, cloudinary.ts, slugify.ts
  pages/
    index.astro
    kategorija/[slug].astro
    admin/                    # protected by middleware
  middleware.ts
  styles/global.css            # @import "tailwindcss"; @theme {...}
prisma/
  schema.prisma
  seed.ts
```

## Environment variables

`DATABASE_URL`, `BETTER_AUTH_SECRET`, `PUBLIC_CLOUDINARY_CLOUD_NAME`, `PUBLIC_CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — never hardcoded in the code, never committed to git (`.env` listed in `.gitignore`).

## Useful commands (after scaffolding)

```bash
npm run dev                # Astro dev server
npx prisma migrate dev     # new migration + apply to the dev database
npx prisma studio          # GUI for browsing the database
npx prisma generate        # regenerate the Prisma client after a schema change
npm run build               # production build
```

## Rules and development notes

### Design

- Minimum font size: **16px** — never smaller, readability comes first
- **Light color palette**, consistent with nova.toka.ba
- Mobile-first, check responsiveness at every screen width

### Performance

- Goal: a high score on Google PageSpeed Insights (both mobile and desktop)
- Public pages stay static/SSG wherever possible; use `export const prerender = false` only for `/admin` routes and actions that require it
- Minimal JS on public pages — React islands only in the admin, never on public category pages
- Images exclusively through `CldImage` (automatic format and size optimization), never unoptimized full-resolution images
- Watch Core Web Vitals — reserve space for images (prevent layout shift), fonts without a flash of unstyled/invisible text

### Security

- **Special attention to application security** — this is a priority from day one, not an afterthought
- Every admin action (`defineAction`) must independently check `context.locals.user` at the start of the handler and throw `ActionError({code:'UNAUTHORIZED'})` if it's missing — don't rely solely on middleware route protection
- Zod validation on every input, no exceptions — never trust data coming from the client
- Cloudinary upload exclusively through a **signed** upload (the signature is generated only after checking the admin session), never an unsigned preset
- Never expose `CLOUDINARY_API_SECRET`, `BETTER_AUTH_SECRET`, or `DATABASE_URL` to the client or in publicly visible code

### Code

- Write clean, readable, consistently formatted code
- Comment the parts of the code that aren't obvious at a glance — explain _why_, not just _what_
- TypeScript strict mode, avoid `any`
- Variable/function/field names in the code are in English; user-facing content (text, category descriptions) is in Bosnian

### SEO (part of Phase 9, but worth keeping in mind from the start)

- Sitemap (`@astrojs/sitemap`)
- JSON-LD structured data — `LocalBusiness` + `Product`/`Service` per category
- OG meta tags generated from each category's header image
- Alt text required on every gallery image
- 301 redirects from the old toka.ba URLs once the old site is shut down
- NAP (name, address, phone) must be identical across the site, the footer, and the Google Business profile

## Client documentation (separate deliverable)

Alongside all the code, at the end of the project also prepare a **separate document for the client** (Toka) — separate from this CLAUDE.md file, since this one is for development and that one is for someone who doesn't code. Format: Markdown or PDF, professional appearance, avoiding developer jargon wherever possible.

It should contain:

- **Project overview** — in a few sentences, what was built and why, without technical jargon
- **Use cases** — concrete usage scenarios: how the admin adds/edits/deletes a category, how they change the display order, how a visitor browses categories and sends an inquiry via WhatsApp
- **Admin panel guide** — step by step, with screenshots where helpful: logging in, adding a category, uploading the header image and gallery, deleting, reordering
- **Technical overview** — an accessible explanation of what was used and why (e.g. "Astro — displays the site quickly to visitors," "PostgreSQL + Prisma — the database where categories are stored, Prisma is a tool that makes working with the database easier," "Cloudinary — stores and optimizes images"), without assuming the client knows what an ORM or SSR is
- **Maintenance and costs** — hosting, domain, the Cloudinary free-tier limit and what happens if it's exceeded, who has access to the admin account and how to change the password
- **Contact/support** — what to do if something breaks, who is responsible for further changes

The goal is for a non-developer client to understand what they received, how to use it, and what to watch out for — this document is a mark of professionalism, not a technical spec.
