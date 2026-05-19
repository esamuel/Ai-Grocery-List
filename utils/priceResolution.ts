import type { PurchaseHistoryItem, PriceHistory, PriceSource } from '../types';

export const CATEGORY_DEFAULTS: Record<string, number> = {
  'פירות וירקות': 10,
  'מוצרי חלב וביצים': 12,
  'בשר ועוף': 45,
  'מאפים': 8,
  'משקאות': 7,
  'מוצרי מזווה': 15,
  'קפואים': 18,
  'חטיפים וממתקים': 10,
  Fruits: 10,
  Vegetables: 10,
  Dairy: 12,
  Meat: 45,
  Bakery: 8,
  Beverages: 7,
  Pantry: 15,
  Frozen: 18,
  Snacks: 10,
  Uncategorized: 12,
};

export function getCategoryDefaultPrice(category?: string): number {
  if (!category) return CATEGORY_DEFAULTS.Uncategorized;
  return CATEGORY_DEFAULTS[category] ?? CATEGORY_DEFAULTS.Uncategorized;
}

export interface ResolvedPrice {
  price: number;
  currency: string;
  priceSource: PriceSource;
  estimated: boolean;
}

export function resolvePurchasePrice(input: {
  userPrice?: number;
  category?: string;
  currency?: string;
  existingItem?: PurchaseHistoryItem | null;
}): ResolvedPrice {
  const currency = input.currency || 'ILS';

  if (input.userPrice !== undefined && input.userPrice > 0) {
    return {
      price: input.userPrice,
      currency,
      priceSource: 'user',
      estimated: false,
    };
  }

  const item = input.existingItem;
  if (item?.lastPrice && item.lastPrice > 0) {
    return {
      price: item.lastPrice,
      currency,
      priceSource: 'last_known',
      estimated: true,
    };
  }

  const realFromHistory = (item?.prices || []).filter(
    (p) => (p.price ?? 0) > 0 && p.estimatedPrice !== true
  );
  if (realFromHistory.length > 0) {
    const last = realFromHistory[realFromHistory.length - 1];
    return {
      price: last.price,
      currency: last.currency || currency,
      priceSource: 'last_known',
      estimated: true,
    };
  }

  if (item?.avgPrice && item.avgPrice > 0) {
    return {
      price: item.avgPrice,
      currency,
      priceSource: 'last_known',
      estimated: true,
    };
  }

  return {
    price: getCategoryDefaultPrice(input.category || item?.category),
    currency,
    priceSource: 'category',
    estimated: true,
  };
}

export function priceSourceToEstimatedFlag(source: PriceSource): boolean {
  return source !== 'user' && source !== 'receipt_ocr';
}

export function buildPriceHistoryEntry(
  purchaseDate: string,
  resolved: { price: number; currency: string; priceSource: PriceSource; tripId?: string },
  extras: {
    store?: string;
    quantity?: number;
    unit?: string;
    unitPrice?: number;
  } = {}
): PriceHistory {
  return {
    purchaseDate,
    price: resolved.price,
    currency: resolved.currency,
    priceSource: resolved.priceSource,
    estimatedPrice: priceSourceToEstimatedFlag(resolved.priceSource),
    tripId: resolved.tripId,
    quantity: extras.quantity ?? 1,
    store: extras.store,
    unit: extras.unit,
    unitPrice: extras.unitPrice,
  };
}
