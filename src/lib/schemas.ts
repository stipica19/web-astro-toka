import { z } from "zod";

/**
 * Zajedničke Zod sheme za akcije (server) i forme (klijent).
 *
 * Namjerno na jednom mjestu: da validacija u formi i validacija na serveru ne
 * mogu razići. Server ipak validira nezavisno — klijentskoj validaciji se ne vjeruje.
 */

/** Mala slova, brojevi i crtice; bez vodeće/prateće crtice i bez dvostrukih. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const galleryImageSchema = z.object({
  /** Cloudinary public_id. */
  url: z.string().trim().min(1, "Slika nedostaje."),
  // CLAUDE.md traži alt tekst na svakoj slici galerije — zbog SEO-a i čitača ekrana.
  alt: z
    .string()
    .trim()
    .min(3, "Opis slike mora imati bar 3 znaka.")
    .max(200, "Opis slike je predugačak."),
});

export const categoryInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Naziv mora imati bar 2 znaka.")
    .max(120, "Naziv je predugačak."),

  slug: z
    .string()
    .trim()
    .min(2, "Slug mora imati bar 2 znaka.")
    .max(140, "Slug je predugačak.")
    .regex(SLUG_PATTERN, "Slug smije sadržavati samo mala slova, brojeve i crtice."),

  // Prazan textarea stiže kao "" — pretvaramo ga u null da baza ne čuva prazne stringove.
  description: z
    .string()
    .trim()
    .max(2000, "Opis je predugačak.")
    .nullish()
    .transform((value) => (value ? value : null)),

  headerImage: z.string().trim().min(1, "Header slika je obavezna."),

  isPublished: z.boolean(),

  gallery: z.array(galleryImageSchema).max(60, "Najviše 60 slika po kategoriji."),
});

export const categoryCreateSchema = categoryInputSchema;

export const categoryUpdateSchema = categoryInputSchema.extend({
  id: z.string().min(1),
});

export const categoryIdSchema = z.object({ id: z.string().min(1) });

export const reorderSchema = z.object({
  /** Id-evi u željenom redoslijedu prikaza. */
  ids: z.array(z.string().min(1)).min(1),
});

/**
 * Rezultat validacije — ono što akcija dobije nakon Zod transformacija
 * (`description` je tu uvijek `string | null`).
 */
export type CategoryInput = z.infer<typeof categoryInputSchema>;

/**
 * Ono što forma drži PRIJE transformacija (`description` smije biti i
 * `undefined`). Razlikuje se od `CategoryInput` zbog `.nullish().transform()`
 * iznad — react-hook-form traži oba tipa, vidi CategoryForm.tsx.
 */
export type CategoryFormInput = z.input<typeof categoryInputSchema>;
export type GalleryImageInput = z.infer<typeof galleryImageSchema>;
