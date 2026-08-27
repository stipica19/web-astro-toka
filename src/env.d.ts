/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    /** Popunjava middleware iz Better Auth sesije; `null` kad korisnik nije prijavljen. */
    user: import("better-auth").User | null;
    session: import("better-auth").Session | null;
  }
}
