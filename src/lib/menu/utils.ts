/**
 * Shared utility functions for menu-related operations.
 */

/**
 * Parses a response code value from various formats.
 */
export function parseResponseCode(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Normalizes a category string to a standard format.
 */
export function normalizeCategory(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  switch (normalized) {
    case "dish":
    case "extra":
    case "beverage":
    case "combo":
      return normalized;
    case "coffee":
    case "tea":
      return "beverage";
    case "dessert":
    case "food":
      return "dish";
    case "other":
      return "extra";
    default:
      return normalized;
  }
}
