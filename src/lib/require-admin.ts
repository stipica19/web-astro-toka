import { ActionError } from "astro:actions";
import type { ActionAPIContext } from "astro:actions";

/**
 * Provjera sesije unutar akcije.
 *
 * CLAUDE.md: svaka akcija provjerava `context.locals.user` samostalno i ne
 * oslanja se samo na middleware — middleware štiti rute, a akcije se pozivaju
 * mimo njih (na /_actions/*).
 */
export function requireAdmin(context: ActionAPIContext) {
  const user = context.locals.user;

  if (!user) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "Potrebna je prijava.",
    });
  }

  return user;
}
