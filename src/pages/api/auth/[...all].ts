import type { APIRoute } from "astro";
import { auth } from "../../../lib/auth";

// Auth endpointi moraju raditi u runtimeu, ne smiju se prerenderovati.
export const prerender = false;

export const ALL: APIRoute = (context) => auth.handler(context.request);
