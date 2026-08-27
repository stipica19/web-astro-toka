import { createAuthClient } from "better-auth/react";

/**
 * Klijentski Better Auth — koristi se samo u admin islandima (prijava/odjava).
 * baseURL se ne postavlja: klijent gađa isti origin sa kojeg je stranica učitana.
 */
export const authClient = createAuthClient();
