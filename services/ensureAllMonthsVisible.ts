/**
 * Ensure ALL historical months appear in Monthly/Daily purchase views.
 */

import { getPurchaseHistory, setPurchaseHistory } from './purchaseHistoryService';
import type { PurchaseHistoryItem, PriceHistory } from '../types';
import {
  isValidPurchaseDate,
  parsePurchaseDate,
  parsePurchaseDateISO,
  toMonthKey,
} from '../utils/parsePurchaseDate';

export interface FixResult {
  success: boolean;
  itemsChecked: number;
  itemsFixed: number;
  pricesFixed: number;
  monthsFound: string[];
  uniqueShoppingDays: number;
  errors: string[];
}

function getUniqueMonths(prices: PriceHistory[]): Set<string> {
  const months = new Set<string>();
  prices.forEach((p) => {
    const m = toMonthKey(p.purchaseDate);
    if (m) months.add(m);
  });
  return months;
}

/** Best estimate of first / last purchase from all fields on the item */
function getDateSpan(item: PurchaseHistoryItem): { first: Date; last: Date } {
  let first: Date | null = parsePurchaseDate(item.firstPurchased);
  let last: Date | null = parsePurchaseDate(item.lastPurchased);

  (item.prices || []).forEach((p) => {
    const d = parsePurchaseDate(p.purchaseDate);
    if (!d) return;
    if (!first || d < first) first = d;
    if (!last || d > last) last = d;
  });

  if (!last) last = first;
  if (!first && last) {
    const stepDays = item.avgDaysBetween && item.avgDaysBetween > 0 ? item.avgDaysBetween : 7;
    const lookback = Math.max((item.frequency - 1) * stepDays, item.frequency > 1 ? 30 : 0);
    first = new Date(last);
    first.setDate(first.getDate() - lookback);
  }
  if (!last && first) last = first;

  const now = new Date();
  return { first: first || now, last: last || now };
}

function inferPurchaseDate(
  priceEntry: PriceHistory,
  item: PurchaseHistoryItem,
  priceIndex: number
): string {
  if (isValidPurchaseDate(priceEntry.purchaseDate)) {
    return parsePurchaseDateISO(priceEntry.purchaseDate)!;
  }
  const { first } = getDateSpan(item);
  const d = new Date(first);
  d.setDate(d.getDate() + priceIndex * 7);
  return d.toISOString();
}

/** Dates exist but all cluster in 1–2 months while span is much longer */
function shouldRedistributeClusteredDates(item: PurchaseHistoryItem): boolean {
  if (!item.prices?.length || item.frequency < 2) return false;

  const { first, last } = getDateSpan(item);
  const spanDays = (last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24);
  if (spanDays < 45) return false;

  const uniqueMonths = getUniqueMonths(item.prices).size;
  if (uniqueMonths <= 2 && item.prices.length >= 1) return true;

  const uniqueDays = new Set(
    item.prices.map((p) => toMonthKey(p.purchaseDate)).filter(Boolean)
  ).size;
  if (spanDays > 90 && uniqueDays <= 2 && item.frequency >= 3) return true;

  return false;
}

/** Spread price entries evenly from first → last (keeps price, store, qty) */
function redistributePriceDates(item: PurchaseHistoryItem): PriceHistory[] {
  const { first, last } = getDateSpan(item);
  const count = Math.max(item.frequency, item.prices?.length || 0, 1);
  const existing = item.prices || [];

  const stepMs = count > 1 ? (last.getTime() - first.getTime()) / (count - 1) : 0;

  if (existing.length === 0) {
    const out: PriceHistory[] = [];
    for (let i = 0; i < count; i++) {
      out.push({
        purchaseDate: new Date(first.getTime() + stepMs * i).toISOString(),
        price: item.lastPrice || item.avgPrice,
        currency: 'ILS',
        quantity: 1,
        estimatedPrice: !item.lastPrice,
      });
    }
    return out;
  }

  return existing.map((p, i) => {
    const slot = count > 1 ? Math.round((i / Math.max(existing.length - 1, 1)) * (count - 1)) : 0;
    return {
      ...p,
      purchaseDate: new Date(first.getTime() + stepMs * slot).toISOString(),
    };
  });
}

function backfillMissingPriceEntries(item: PurchaseHistoryItem): PriceHistory[] {
  if (shouldRedistributeClusteredDates(item)) {
    return redistributePriceDates(item);
  }

  const existing: PriceHistory[] = (item.prices || []).map((p, i) => ({
    ...p,
    purchaseDate: isValidPurchaseDate(p.purchaseDate)
      ? parsePurchaseDateISO(p.purchaseDate)
      : inferPurchaseDate(p, item, i),
  }));

  const targetCount = Math.max(item.frequency || 0, existing.length);
  if (targetCount <= existing.length) return existing;

  const { first, last } = getDateSpan(item);
  const stepMs =
    targetCount > 1 ? (last.getTime() - first.getTime()) / (targetCount - 1) : 0;

  const backfilled: PriceHistory[] = [...existing];
  for (let i = 0; i < targetCount - existing.length; i++) {
    const idx = existing.length + i;
    backfilled.push({
      purchaseDate: new Date(first.getTime() + stepMs * idx).toISOString(),
      price: item.lastPrice || item.avgPrice,
      currency: existing[0]?.currency || 'ILS',
      quantity: 1,
      estimatedPrice: !item.lastPrice,
    });
  }
  return backfilled;
}

function collectMonthsFromHistory(history: PurchaseHistoryItem[]): string[] {
  const monthsSet = new Set<string>();
  history.forEach((item) => {
    item.prices?.forEach((p) => {
      const month = toMonthKey(p.purchaseDate);
      if (month) monthsSet.add(month);
    });
  });
  return Array.from(monthsSet).sort().reverse();
}

function countUniqueShoppingDays(history: PurchaseHistoryItem[]): number {
  const days = new Set<string>();
  history.forEach((item) => {
    item.prices?.forEach((p) => {
      const d = parsePurchaseDate(p.purchaseDate);
      if (d) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        days.add(key);
      }
    });
  });
  return days.size;
}

export async function ensureAllMonthsVisible(listId: string): Promise<FixResult> {
  const result: FixResult = {
    success: false,
    itemsChecked: 0,
    itemsFixed: 0,
    pricesFixed: 0,
    monthsFound: [],
    uniqueShoppingDays: 0,
    errors: [],
  };

  try {
    const history = await getPurchaseHistory(listId);
    if (history.length === 0) {
      result.success = true;
      return result;
    }

    result.itemsChecked = history.length;
    let needsSave = false;

    const fixedHistory = history.map((item) => {
      let updatedItem = { ...item };
      let itemChanged = false;

      const span = getDateSpan(item);
      if (!updatedItem.firstPurchased || parsePurchaseDate(updatedItem.firstPurchased)! > span.first) {
        updatedItem.firstPurchased = span.first.toISOString();
        itemChanged = true;
      }

      const needsPrices =
        !updatedItem.prices?.length ||
        updatedItem.prices.length < updatedItem.frequency ||
        updatedItem.prices.some((p) => !isValidPurchaseDate(p.purchaseDate)) ||
        shouldRedistributeClusteredDates(updatedItem);

      if (needsPrices && updatedItem.frequency > 0) {
        const before = getUniqueMonths(updatedItem.prices || []).size;
        updatedItem.prices = backfillMissingPriceEntries(updatedItem);
        const after = getUniqueMonths(updatedItem.prices).size;
        if (after > before || needsPrices) {
          itemChanged = true;
          result.pricesFixed++;
        }
      } else if (updatedItem.prices?.length) {
        updatedItem.prices = updatedItem.prices.map((p, i) => {
          if (isValidPurchaseDate(p.purchaseDate)) return p;
          itemChanged = true;
          result.pricesFixed++;
          return { ...p, purchaseDate: inferPurchaseDate(p, item, i) };
        });
      }

      if (itemChanged) result.itemsFixed++;
      if (itemChanged) needsSave = true;
      return updatedItem;
    });

    if (needsSave) {
      await setPurchaseHistory(listId, fixedHistory);
    }

    result.monthsFound = collectMonthsFromHistory(fixedHistory);
    result.uniqueShoppingDays = countUniqueShoppingDays(fixedHistory);
    result.success = true;
    return result;
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : String(error));
    return result;
  }
}

export async function verifyMonthsVisible(listId: string): Promise<string[]> {
  const history = await getPurchaseHistory(listId);
  return collectMonthsFromHistory(history);
}

if (typeof window !== 'undefined') {
  (window as any).ensureAllMonthsVisible = ensureAllMonthsVisible;
  (window as any).verifyMonthsVisible = verifyMonthsVisible;
}
