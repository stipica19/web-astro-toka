import { prisma } from "./prisma.ts";

/**
 * Upiti nad kategorijama, na jednom mjestu jer ih koriste i početna,
 * i stranica kategorije, i (kasnije) sitemap.
 *
 * Neobjavljene kategorije se nigdje javno ne dohvaćaju.
 */
export function getPublishedCategories() {
  return prisma.category.findMany({
    where: { isPublished: true },
    orderBy: { order: "asc" },
    select: {
      name: true,
      slug: true,
      description: true,
      headerImage: true,
    },
  });
}

/**
 * Sve objavljene kategorije zajedno s galerijama — jedan upit za cijelu
 * `/kategorija/[slug]` rutu umjesto zasebnog upita po generisanoj stranici.
 */
export function getPublishedCategoriesWithGallery() {
  return prisma.category.findMany({
    where: { isPublished: true },
    orderBy: { order: "asc" },
    include: {
      gallery: { orderBy: { order: "asc" } },
    },
  });
}
