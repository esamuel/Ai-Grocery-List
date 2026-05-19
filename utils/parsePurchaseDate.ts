/**
 * Normalize purchase dates from ISO strings, Date objects, or Firestore Timestamps.
 */
export function parsePurchaseDate(field: unknown): Date | null {
  if (field == null) return null;

  if (field instanceof Date) {
    return isNaN(field.getTime()) ? null : field;
  }

  if (typeof field === 'string') {
    const trimmed = field.trim();
    if (!trimmed) return null;
    const date = new Date(trimmed);
    return isNaN(date.getTime()) ? null : date;
  }

  if (typeof field === 'object' && field !== null) {
    const obj = field as Record<string, unknown>;
    if (typeof obj.toDate === 'function') {
      try {
        const date = (obj.toDate as () => Date)();
        return isNaN(date.getTime()) ? null : date;
      } catch {
        return null;
      }
    }
    if (typeof obj.seconds === 'number') {
      const date = new Date(obj.seconds * 1000);
      return isNaN(date.getTime()) ? null : date;
    }
  }

  return null;
}

export function parsePurchaseDateISO(field: unknown): string | undefined {
  const date = parsePurchaseDate(field);
  return date ? date.toISOString() : undefined;
}

export function isValidPurchaseDate(field: unknown): boolean {
  const date = parsePurchaseDate(field);
  if (!date) return false;
  const year = date.getFullYear();
  return year >= 2020 && year <= 2100;
}

export function toDateKey(field: unknown): string | null {
  const date = parsePurchaseDate(field);
  if (!date) return null;
  return date.toISOString().split('T')[0];
}

export function toMonthKey(field: unknown): string | null {
  const date = parsePurchaseDate(field);
  if (!date) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}
