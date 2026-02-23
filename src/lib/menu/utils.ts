/**
 * Canonical menu categories (matches menuCategories in features/menu/constants.ts).
 * Raw strings from the API or URL params are normalised to these values.
 */
const CATEGORY_ALIASES: Record<string, string> = {
  // dish
  dish: "dish",
  food: "dish",
  meal: "dish",
  main: "dish",
  // beverage
  beverage: "beverage",
  beverages: "beverage",
  drink: "beverage",
  drinks: "beverage",
  // combo
  combo: "combo",
  set: "combo",
  bundle: "combo",
  // extra
  extra: "extra",
  extras: "extra",
  side: "extra",
  sides: "extra",
  addon: "extra",
  addons: "extra",
  topping: "extra",
  toppings: "extra",
};

/**
 * Normalise a raw category string to one of the canonical values.
 * Returns `null` for empty / unrecognised input so callers can fall back.
 */
export function normalizeCategory(value: string | null | undefined): string | null {
  if (!value) return null;
  return CATEGORY_ALIASES[value.trim().toLowerCase()] ?? null;
}

/**
 * Coerce an API `response_code` field (number or numeric string) to a number.
 * Returns `null` for absent / non-numeric values.
 */
export function parseResponseCode(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
