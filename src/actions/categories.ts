import { ActionError, defineAction } from "astro:actions";
import { prisma } from "../lib/prisma";
import { requireAdmin } from "../lib/require-admin";
import {
  categoryCreateSchema,
  categoryIdSchema,
  categoryUpdateSchema,
  reorderSchema,
} from "../lib/schemas";

/** Prisma kod za povredu unique ograničenja (kod nas: slug). */
const UNIQUE_VIOLATION = "P2002";

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === UNIQUE_VIOLATION
  );
}

const slugTaken = () =>
  new ActionError({
    code: "CONFLICT",
    message: "Kategorija sa tim slugom već postoji. Promijeni slug.",
  });

export const categories = {
  /** Lista za admin pregled — uključuje i neobjavljene kategorije. */
  list: defineAction({
    handler: async (_input, context) => {
      requireAdmin(context);

      return prisma.category.findMany({
        orderBy: { order: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          headerImage: true,
          isPublished: true,
          order: true,
          _count: { select: { gallery: true } },
        },
      });
    },
  }),

  create: defineAction({
    accept: "json",
    input: categoryCreateSchema,
    handler: async (input, context) => {
      requireAdmin(context);

      // Nova kategorija ide na kraj liste.
      const last = await prisma.category.findFirst({
        orderBy: { order: "desc" },
        select: { order: true },
      });

      try {
        return await prisma.category.create({
          data: {
            name: input.name,
            slug: input.slug,
            description: input.description,
            headerImage: input.headerImage,
            isPublished: input.isPublished,
            order: (last?.order ?? -1) + 1,
            gallery: {
              create: input.gallery.map((image, index) => ({
                url: image.url,
                alt: image.alt,
                order: index,
              })),
            },
          },
          select: { id: true, slug: true },
        });
      } catch (error) {
        if (isUniqueViolation(error)) throw slugTaken();
        throw error;
      }
    },
  }),

  update: defineAction({
    accept: "json",
    input: categoryUpdateSchema,
    handler: async (input, context) => {
      requireAdmin(context);

      const { id, gallery, ...fields } = input;

      try {
        // Galerija se zamjenjuje u cijelosti: redoslijed i sastav dolaze iz forme,
        // pa je brisanje + ponovni upis jednostavnije i pouzdanije od diffanja.
        // Transakcija sprječava da kategorija ostane bez galerije ako drugi upit padne.
        return await prisma.$transaction(async (tx) => {
          await tx.galleryImage.deleteMany({ where: { categoryId: id } });

          return tx.category.update({
            where: { id },
            data: {
              ...fields,
              gallery: {
                create: gallery.map((image, index) => ({
                  url: image.url,
                  alt: image.alt,
                  order: index,
                })),
              },
            },
            select: { id: true, slug: true },
          });
        });
      } catch (error) {
        if (isUniqueViolation(error)) throw slugTaken();
        throw error;
      }
    },
  }),

  remove: defineAction({
    accept: "json",
    input: categoryIdSchema,
    handler: async (input, context) => {
      requireAdmin(context);

      // Slike galerije brišu se kaskadno (onDelete: Cascade u shemi).
      // Fajlovi na Cloudinaryju ostaju — namjerno, da brisanje kategorije
      // ne uništi slike nepovratno.
      await prisma.category.delete({ where: { id: input.id } });

      return { id: input.id };
    },
  }),

  reorder: defineAction({
    accept: "json",
    input: reorderSchema,
    handler: async (input, context) => {
      requireAdmin(context);

      // Sve u jednoj transakciji — djelimično primijenjen redoslijed bi
      // ostavio duplikate u polju `order`.
      await prisma.$transaction(
        input.ids.map((id, index) =>
          prisma.category.update({ where: { id }, data: { order: index } }),
        ),
      );

      return { count: input.ids.length };
    },
  }),
};
