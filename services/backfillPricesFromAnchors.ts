/**
 * Fill missing / estimated prices using real prices from anchor months
 * (typically Apr–May 2026 where the user entered prices at checkout).
 */

import { getPurchaseHistory, setPurchaseHistory } from './purchaseHistoryService';
import { getCanonicalName } from './semanticDupService';
import type { PurchaseHistoryItem, PriceHistory } from '../types';
import { parsePurchaseDate, toMonthKey } from '../utils/parsePurchaseDate';

export interface BackfillPricesResult {
  anchorMonths: string[];
  anchorItems: number;
  entriesUpdated: number;
  fromAnchorMonth: number;
  fromItemHistory: number;
  fromCategoryDefault: number;
  alreadyHadPrice: number;
  noMatchFound: number;
}

import { getCategoryDefaultPrice } from '../utils/priceResolution';

type AnchorPrice = {
  price: number;
  currency: string;
  store?: string;
  unit?: string;
  unitPrice?: number;
  sourceMonth: string;
};

function isRealPrice(p: PriceHistory): boolean {
  return (p.price ?? 0) > 0 && p.estimatedPrice !== true;
}

function needsPrice(p: PriceHistory): boolean {
  return !p.price || p.price <= 0 || p.estimatedPrice === true;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/** Months with the most user-entered (non-estimated) prices — usually Apr/May 2026. */
export function detectAnchorMonths(
  history: PurchaseHistoryItem[],
  explicit?: string[]
): string[] {
  if (explicit?.length) return explicit;

  const counts = new Map<string, number>();
  for (const item of history) {
    for (const p of item.prices || []) {
      if (!isRealPrice(p)) continue;
      const mk = toMonthKey(p.purchaseDate);
      if (mk) counts.set(mk, (counts.get(mk) || 0) + 1);
    }
  }

  return [...counts.entries()]
    .filter(([, n]) => n >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([m]) => m);
}

function buildAnchorCatalog(
  history: PurchaseHistoryItem[],
  anchorMonths: string[]
): Map<string, AnchorPrice> {
  const buckets = new Map<string, PriceHistory[]>();

  for (const item of history) {
    const key = item.canonicalName || getCanonicalName(item.name);
    for (const p of item.prices || []) {
      if (!isRealPrice(p)) continue;
      const mk = toMonthKey(p.purchaseDate);
      if (!mk || !anchorMonths.includes(mk)) continue;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(p);
    }
  }

  const catalog = new Map<string, AnchorPrice>();
  buckets.forEach((entries, key) => {
    const prices = entries.map((e) => e.price!).filter((n) => n > 0);
    const med = median(prices);
    const best = entries.find((e) => e.price === med) || entries[entries.length - 1];
    catalog.set(key, {
      price: med,
      currency: best.currency || 'ILS',
      store: best.store,
      unit: best.unit,
      unitPrice: best.unitPrice,
      sourceMonth: toMonthKey(best.purchaseDate) || anchorMonths[0],
    });
  });

  return catalog;
}

function findAnyRealPriceOnItem(item: PurchaseHistoryItem): PriceHistory | null {
  const reals = (item.prices || []).filter(isRealPrice);
  if (reals.length === 0) return null;
  return reals[reals.length - 1];
}

function recalcItemStats(item: PurchaseHistoryItem): PurchaseHistoryItem {
  const prices = [...(item.prices || [])].sort(
    (a, b) =>
      new Date(a.purchaseDate || 0).getTime() - new Date(b.purchaseDate || 0).getTime()
  );
  const validPrices = prices.map((p) => p.price).filter((p): p is number => p !== undefined && p > 0);
  const first = prices[0]?.purchaseDate;
  const last = prices[prices.length - 1]?.purchaseDate;

  return {
    ...item,
    prices,
    frequency: prices.length,
    firstPurchased: first || item.firstPurchased,
    lastPurchased: last || item.lastPurchased,
    lastPrice: validPrices.length > 0 ? validPrices[validPrices.length - 1] : item.lastPrice,
    avgPrice:
      validPrices.length > 0
        ? validPrices.reduce((s, p) => s + p, 0) / validPrices.length
        : item.avgPrice,
    lowestPrice: validPrices.length > 0 ? Math.min(...validPrices) : item.lowestPrice,
    highestPrice: validPrices.length > 0 ? Math.max(...validPrices) : item.highestPrice,
  };
}

export async function backfillPricesFromAnchors(
  listId: string,
  anchorMonths?: string[]
): Promise<BackfillPricesResult> {
  const history = await getPurchaseHistory(listId);
  const anchors = detectAnchorMonths(history, anchorMonths);
  const catalog = buildAnchorCatalog(history, anchors);

  let entriesUpdated = 0;
  let fromAnchorMonth = 0;
  let fromItemHistory = 0;
  let fromCategoryDefault = 0;
  let alreadyHadPrice = 0;
  let noMatchFound = 0;

  const updated = history.map((item) => {
    const key = item.canonicalName || getCanonicalName(item.name);
    const anchor = catalog.get(key);
    const fallbackReal = findAnyRealPriceOnItem(item);

    const prices = (item.prices || []).map((p) => {
      if (!needsPrice(p)) {
        alreadyHadPrice++;
        return p;
      }

      let filled: PriceHistory | null = null;
      let source: 'anchor' | 'history' | 'category' | null = null;

      if (anchor) {
        filled = {
          ...p,
          price: anchor.price,
          currency: p.currency || anchor.currency,
          store: p.store || anchor.store,
          unit: p.unit || anchor.unit,
          unitPrice: p.unitPrice ?? anchor.unitPrice,
          estimatedPrice: true,
        };
        source = 'anchor';
      } else if (fallbackReal) {
        filled = {
          ...p,
          price: fallbackReal.price,
          currency: p.currency || fallbackReal.currency,
          store: p.store || fallbackReal.store,
          unit: p.unit || fallbackReal.unit,
          unitPrice: p.unitPrice ?? fallbackReal.unitPrice,
          estimatedPrice: true,
        };
        source = 'history';
      } else {
        const catPrice = getCategoryDefaultPrice(item.category);
        filled = {
          ...p,
          price: catPrice,
          currency: p.currency || 'ILS',
          estimatedPrice: true,
        };
        source = 'category';
      }

      entriesUpdated++;
      if (source === 'anchor') fromAnchorMonth++;
      else if (source === 'history') fromItemHistory++;
      else fromCategoryDefault++;

      return filled;
    });

    return recalcItemStats({ ...item, canonicalName: key, prices });
  });

  await setPurchaseHistory(listId, updated);

  return {
    anchorMonths: anchors,
    anchorItems: catalog.size,
    entriesUpdated,
    fromAnchorMonth,
    fromItemHistory,
    fromCategoryDefault,
    alreadyHadPrice,
    noMatchFound,
  };
}

if (typeof window !== 'undefined') {
  (window as any).backfillPricesFromAnchors = backfillPricesFromAnchors;
}
