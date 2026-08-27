import { defineMiddleware } from "astro:middleware";
import { auth } from "./lib/auth";

/** Jedina admin stranica dostupna bez prijave. */
const LOGIN_PATH = "/admin/prijava";

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Javne stranice su prerenderovane u build-time — nemaju ni request ni sesiju.
  // Za njih preskačemo upit u bazu; ovo se izvršava i tokom builda.
  if (context.isPrerendered) {
    context.locals.user = null;
    context.locals.session = null;
    return next();
  }

  // Sesija se čita za SVE dinamičke rute, ne samo /admin — pozivi akcija idu
  // na /_actions/*, pa bi im inače `locals.user` uvijek bio null.
  const result = await auth.api.getSession({ headers: context.request.headers });

  context.locals.user = result?.user ?? null;
  context.locals.session = result?.session ?? null;

  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

  if (isAdminRoute) {
    // Zaštita ruta. Ovo NIJE jedina provjera — svaka akcija provjerava sesiju
    // nezavisno, jer middleware štiti rute, a akcije se zovu mimo njih.
    if (!context.locals.user && pathname !== LOGIN_PATH) {
      return context.redirect(LOGIN_PATH);
    }

    // Prijavljen korisnik na stranici za prijavu ide pravo na pregled.
    if (context.locals.user && pathname === LOGIN_PATH) {
      return context.redirect("/admin");
    }
  }

  return next();
});
