/**
 * Pretvara naziv kategorije u URL slug.
 *
 * Bosanski dijakritici: č/ć/š/ž se rastavljaju kroz Unicode NFD normalizaciju
 * (č → c + kvačica, koju onda uklonimo), ali đ nije rastavljiv znak pa ga
 * mijenjamo ručno prije normalizacije.
 */
const NON_DECOMPOSABLE: Record<string, string> = {
  đ: "d",
  Đ: "d",
};

export function slugify(input: string): string {
  return input
    .replace(/[đĐ]/g, (char) => NON_DECOMPOSABLE[char])
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // ukloni kombinirajuće dijakritičke znakove
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // sve ostalo (razmaci, zarezi) postaje crtica
    .replace(/^-+|-+$/g, ""); // bez vodeće/prateće crtice
}
