/**
 * Generisanje Cloudinary URL-ova za prikaz.
 *
 * `astro-cloudinary` (CldImage) nije upotrebljiv — zadnja verzija podržava
 * Astro do 5, a projekat je na Astru 7. URL format je stabilan i javno
 * dokumentovan, pa ga gradimo sami: nema dodatne zavisnosti, nema klijentskog
 * JS-a i imamo punu kontrolu nad srcset-om.
 *
 * Ovdje se koristi SAMO cloud name (javni podatak). API ključ i secret nikad
 * ne smiju doći na klijent — oni se koriste isključivo serverski, za potpisivanje
 * uploada u admin dijelu.
 */

// Astro drži .env u import.meta.env; Node skripte u process.env (vidi lib/prisma.ts).
const cloudName =
  import.meta.env?.PUBLIC_CLOUDINARY_CLOUD_NAME ??
  process.env.PUBLIC_CLOUDINARY_CLOUD_NAME;

export interface ImageTransform {
  width: number;
  /** Npr. "4:3". Bez njega se zadržava originalni omjer slike. */
  aspectRatio?: string;
  /**
   * Cloudinary vrijednost kvaliteta ("auto", "auto:eco", "50"...). Podrazumijevano
   * "auto"; niža fiksna vrijednost ima smisla samo tamo gdje slika stoji ispod
   * prekrivača, pa se razlika ne vidi (hero).
   */
  quality?: string;
  /**
   * Cloudinary jačina zamućenja (1-2000). Koristi se samo za pozadinske slike:
   * mekša slika ne otima pažnju tekstu preko sebe i znatno se bolje komprimuje.
   */
  blur?: number;
}

/**
 * `f_auto` bira najbolji format za browser (AVIF/WebP), `q_auto` kvalitet,
 * `c_fill` + `g_auto` kadrira na traženi omjer i zadržava bitan dio slike.
 */
function transformations({
  width,
  aspectRatio,
  quality = "auto",
  blur,
}: ImageTransform): string {
  const parts = ["f_auto", `q_${quality}`, `w_${width}`];

  if (aspectRatio) {
    parts.push(`ar_${aspectRatio}`, "c_fill", "g_auto");
  } else {
    parts.push("c_limit");
  }

  if (blur) parts.push(`e_blur:${blur}`);

  return parts.join(",");
}

export function cloudinaryUrl(publicId: string, transform: ImageTransform): string {
  if (!cloudName) {
    throw new Error(
      "PUBLIC_CLOUDINARY_CLOUD_NAME nije postavljen. Provjeri .env.",
    );
  }

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformations(transform)}/${publicId}`;
}

/** Širine za srcset — pokrivaju mobitel, tablet i retina desktop. */
export const RESPONSIVE_WIDTHS = [400, 600, 800, 1200, 1600] as const;

export function cloudinarySrcSet(
  publicId: string,
  aspectRatio?: string,
  widths: readonly number[] = RESPONSIVE_WIDTHS,
  extra?: Pick<ImageTransform, "quality" | "blur">,
): string {
  return widths
    .map(
      (width) =>
        `${cloudinaryUrl(publicId, { width, aspectRatio, ...extra })} ${width}w`,
    )
    .join(", ");
}
