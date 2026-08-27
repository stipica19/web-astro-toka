import { cloudinaryUrl, cloudinarySrcSet } from "./cloudinary.ts";

/**
 * Cloudinary public_id koji stoji dok admin ne uploada pravu sliku.
 * Dijele ga seed i prikazne komponente, pa mora biti na jednom mjestu.
 */
export const PLACEHOLDER_IMAGE = "toka/placeholder";

/**
 * Fotografija u pozadini heroja na početnoj. Mijenja se tako što se ovdje
 * upiše public_id druge slike sa Cloudinaryja — hero nije dio admina jer se
 * mijenja jednom u par godina, za razliku od kategorija.
 */
export const HERO_IMAGE = "toka/headers/w6nbxlrjjeovhyyka4kp";

/**
 * Hero ide u dva kadra jer je pravougaonik bitno drugačiji na mobitelu
 * (uspravan) nego na desktopu (vrlo širok). Kad bi se koristio jedan kadar,
 * mobitel bi morao povući široku sliku i odbaciti joj dvije trećine piksela.
 *
 * Kvalitet je namjerno fiksiran na 50: slika stoji ispod tamnog prekrivača,
 * gdje se razlika prema `q_auto` ne vidi, a fajl je otprilike upola manji.
 * Iz istog razloga mobilni kadar staje na 600px — na gustom ekranu je to
 * blago mekše, što kroz prekrivač nije primjetno, a ušteda je oko 20 KB.
 */
const HERO_QUALITY = "50";

/**
 * Blago zamućenje: pozadina prestaje biti "fotografija konkretne plakete" i
 * postaje tekstura, pa naslov preko nje ima čist prostor. Uz to se zamućena
 * slika komprimuje skoro upola manje.
 */
const HERO_BLUR = 120;

export const HERO_SIZES = "100vw";

export interface HeroSource {
  media: string;
  srcset: string;
  /** Fallback za <img src> kad browser ne podržava <picture>. */
  src: string;
}

export function heroSources(): HeroSource[] {
  return [
    { media: "(max-width: 639px)", ratio: "4:5", widths: [400, 600] },
    { media: "(min-width: 640px)", ratio: "5:2", widths: [1200, 1600, 2000] },
  ].map(({ media, ratio, widths }) => ({
    media,
    srcset: cloudinarySrcSet(HERO_IMAGE, ratio, widths, {
      quality: HERO_QUALITY,
      blur: HERO_BLUR,
    }),
    src: cloudinaryUrl(HERO_IMAGE, {
      width: widths[widths.length - 1]!,
      aspectRatio: ratio,
      quality: HERO_QUALITY,
      blur: HERO_BLUR,
    }),
  }));
}
