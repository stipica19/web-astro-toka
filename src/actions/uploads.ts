import { ActionError, defineAction } from "astro:actions";
import { v2 as cloudinary } from "cloudinary";
import { z } from "zod";
import { requireAdmin } from "../lib/require-admin";

/**
 * Potpisani upload na Cloudinary.
 *
 * CLAUDE.md: upload ide isključivo kroz potpisani zahtjev, nikad kroz unsigned
 * preset. Potpis se generiše tek nakon provjere admin sesije, pa neprijavljen
 * korisnik ne može dobiti ništa čime bi uploadao na naš nalog.
 *
 * API secret nikad ne napušta server — klijent dobija samo potpis, timestamp,
 * javni api_key i cloud name.
 */

const env = (key: string): string | undefined =>
  import.meta.env?.[key] ?? process.env[key];

/**
 * Folder je zatvorena lista, ne slobodan tekst — inače bi prijavljeni korisnik
 * (ili XSS na admin stranici) mogao pisati bilo gdje po nalogu.
 */
const FOLDERS = {
  header: "toka/headers",
  gallery: "toka/gallery",
} as const;

export const uploads = {
  signature: defineAction({
    accept: "json",
    input: z.object({
      target: z.enum(["header", "gallery"]),
    }),
    handler: async (input, context) => {
      requireAdmin(context);

      const cloudName = env("PUBLIC_CLOUDINARY_CLOUD_NAME");
      const apiKey = env("PUBLIC_CLOUDINARY_API_KEY");
      const apiSecret = env("CLOUDINARY_API_SECRET");

      if (!cloudName || !apiKey || !apiSecret) {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Cloudinary nije podešen. Provjeri .env.",
        });
      }

      const timestamp = Math.round(Date.now() / 1000);
      const folder = FOLDERS[input.target];

      // Potpisuju se svi parametri osim file, api_key i resource_type.
      // Cloudinary odbija upload ako se poslani parametri razlikuju od potpisanih,
      // pa klijent ne može promijeniti folder.
      const signature = cloudinary.utils.api_sign_request({ folder, timestamp }, apiSecret);

      return { cloudName, apiKey, timestamp, folder, signature };
    },
  }),
};
