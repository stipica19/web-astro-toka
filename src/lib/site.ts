/**
 * Jedinstveni izvor podataka o firmi.
 *
 * NAP (naziv, adresa, telefon) mora biti identičan na sajtu, u footeru,
 * u JSON-LD strukturiranim podacima i na Google Business profilu — zato
 * stoji na jednom mjestu i nigdje se ne prepisuje ručno.
 */
export const site = {
  name: "Toka",
  legalName: "Toka Bugojno",
  tagline: "Zanat koji traje · Bugojno, BiH",
  description:
    "Suveniri, plakete, graviranje i reklamni materijal. Bugojno, Bosna i Hercegovina.",
  foundedYear: 2016,

  address: {
    street: "Donjići I bb",
    postalCode: "70230",
    city: "Bugojno",
    country: "Bosna i Hercegovina",
    countryCode: "BA",
  },

  /** Za prikaz. */
  phone: "+387 62 482 068",
  /** Za `tel:` i `wa.me` linkove — bez razmaka. */
  phoneRaw: "+38762482068",
  email: "tokabugojno@gmail.com",
} as const;

export const fullAddress = `${site.address.street}, ${site.address.postalCode} ${site.address.city}, ${site.address.country}`;

/**
 * WhatsApp link sa unaprijed popunjenom porukom.
 * Kad se zove sa stranice kategorije, poruka već sadrži naziv kategorije
 * pa klijent odmah zna na šta se upit odnosi.
 */
export function whatsappLink(subject?: string): string {
  const message = subject
    ? `Poštovani, zanima me ponuda za: ${subject}.`
    : "Poštovani, zanima me vaša ponuda.";

  return `https://wa.me/${site.phoneRaw.replace("+", "")}?text=${encodeURIComponent(message)}`;
}
