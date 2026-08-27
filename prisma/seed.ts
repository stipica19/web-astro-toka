import { prisma } from "../src/lib/prisma.ts";
import { slugify } from "../src/lib/slugify.ts";
// Kategorije se seed-aju bez slika — slike tek treba prebaciti na Cloudinary.
import { PLACEHOLDER_IMAGE } from "../src/lib/images.ts";

type SeedCategory = {
  name: string;
  /** Ručni slug samo tamo gdje bi automatski bio predugačak za URL. */
  slug?: string;
};

/** Redoslijed je isti kao u meniju na nova.toka.ba. */
const CATEGORIES: SeedCategory[] = [
  { name: "Graviranje i modeliranje" },
  { name: "Magneti za frižidere" },
  { name: "Plakete i znamenja" },
  { name: "Privjesci za ključeve" },
  { name: "Reklame" },
  { name: "Reklamni materijal" },
  { name: "Rezanje, graviranje metala i nemetala" },
  { name: "Satovi" },
  {
    name: "Vizuelne komunikacijske oznake, tablice za označavanje, natpisne ploče",
    // Automatski slug bi bio 68 znakova — predugačak za URL i dijeljenje.
    slug: "natpisne-ploce-i-oznake",
  },
  { name: "Vrući žig" },
  { name: "Značke" },
  { name: "Značke i logo pločice" },
];

async function main() {
  for (const [index, category] of CATEGORIES.entries()) {
    const slug = category.slug ?? slugify(category.name);

    // Upsert po slugu: seed se smije pokrenuti više puta bez duplikata,
    // a ne dira opis i sliku ako ih je admin već postavio.
    await prisma.category.upsert({
      where: { slug },
      update: { name: category.name, order: index },
      create: {
        name: category.name,
        slug,
        order: index,
        headerImage: PLACEHOLDER_IMAGE,
      },
    });
  }

  const total = await prisma.category.count();
  console.log(`Seed gotov — ${total} kategorija u bazi.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
