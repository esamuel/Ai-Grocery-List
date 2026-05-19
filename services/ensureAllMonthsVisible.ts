/**
 * Ensure ALL historical months appear in Monthly/Daily purchase views.
 *
 * Fixes:
 * - Missing or invalid purchaseDate on price entries (Firestore Timestamps, etc.)
 * - Empty prices[] when frequency > 0
 * - Fewer price entries than frequency (spread across firstPurchased → lastPurchased)
 */

import { getPurchaseHistory, setPurchaseHistory } from './purchaseHistoryService';
import type { PurchaseHistoryItem, PriceHistory } from '../types';
import {
  isValidPurchaseDate,
  parsePurchaseDateISO,
  toMonthKey,
} from '../utils/parsePurchaseDate';

interface FixResult {
  success: boolean;
  itemsChecked: number;
  itemsFixed: number;
  pricesFixed: number;
  monthsFound: string[];
  errors: string[];
}

function inferFirstPurchased(item: PurchaseHistoryItem): string {
  if (isValidPurchaseDate(item.firstPurchased)) {
    return parsePurchaseDateISO(item.firstPurchased)!;
  }
  if (isValidPurchaseDate(item.lastPurchased) && item.frequency > 1) {
    const last = new Date(parsePurchaseDateISO(item.lastPurchased)!);
    const stepDays =
      item.avgDaysBetween && item.avgDaysBetween > 0 ? item.avgDaysBetween : 7;
    const first = new Date(last);
    first.setDate(first.getDate() - stepDays * (item.frequency - 1));
    return first.toISOString();
  }
  if (isValidPurchaseDate(item.lastPurchased)) {
    return parsePurchaseDateISO(item.lastPurchased)!;
  }
  return new Date().toISOString();
}

function inferPurchaseDate(
  priceEntry: PriceHistory,
  item: PurchaseHistoryItem,
  priceIndex: number
): string {
  if (isValidPurchaseDate(priceEntry.purchaseDate)) {
    return parsePurchaseDateISO(priceEntry.purchaseDate)!;
  }
  if (isValidPurchaseDate(item.lastPurchased)) {
    return parsePurchaseDateISO(item.lastPurchased)!;
  }
  if (isValidPurchaseDate(item.firstPurchased)) {
    const base = new Date(parsePurchaseDateISO(item.firstPurchased)!);
    base.setDate(base.getDate() + priceIndex * 7);
    return base.toISOString();
  }
  const fallback = new Date();
  fallback.setDate(fallback.getDate() - priceIndex * 7);
  return fallback.toISOString();
}

/** Spread extra purchase entries between first and last dates when frequency > prices.length */
function backfillMissingPriceEntries(item: PurchaseHistoryItem): PriceHistory[] {
  const existing: PriceHistory[] = (item.prices || []).map((p) => ({
    ...p,
    purchaseDate: isValidPurchaseDate(p.purchaseDate)
      ? parsePurchaseDateISO(p.purchaseDate)
      : undefined,
  }));

  const targetCount = Math.max(item.frequency || 0, existing.length);
  if (targetCount <= existing.length) {
    return existing.map((p, i) => ({
      ...p,
      purchaseDate: p.purchaseDate || inferPurchaseDate(p, item, i),
    }));
  }

  const first = new Date(inferFirstPurchased(item));
  const last = isValidPurchaseDate(item.lastPurchased)
    ? new Date(parsePurchaseDateISO(item.lastPurchased)!)
    : first;
  const missing = targetCount - existing.length;
  const stepMs =
    targetCount > 1
      ? (last.getTime() - first.getTime()) / Math.max(targetCount - 1, 1)
      : 0;

  const backfilled: PriceHistory[] = [...existing];
  for (let i = 0; i < missing; i++) {
    const d = new Date(first.getTime() + stepMs * (existing.length + i));
    backfilled.push({
      purchaseDate: d.toISOString(),
      price: item.lastPrice || item.avgPrice,
      currency: existing[0]?.currency || 'ILS',
      quantity: 1,
      estimatedPrice: !item.lastPrice,
    });
  }

  return backfilled;
}

export async function ensureAllMonthsVisible(listId: string): Promise<FixResult> {
  const result: FixResult = {
    success: false,
    itemsChecked: 0,
    itemsFixed: 0,
    pricesFixed: 0,
    monthsFound: [],
    errors: [],
  };

  try {
    const history = await getPurchaseHistory(listId);
    if (history.length === 0) {
      result.success = true;
      return result;
    }

    result.itemsChecked = history.length;
    const monthsSet = new Set<string>();
    let needsSave = false;

    const fixedHistory = history.map((item) => {
      let updatedItem = { ...item };
      let itemChanged = false;

      if (!updatedItem.firstPurchased && updatedItem.frequency > 1) {
        updatedItem.firstPurchased = inferFirstPurchased(item);
        itemChanged = true;
      }

      if (!updatedItem.prices || updatedItem.prices.length === 0) {
        if (item.frequency > 0 && isValidPurchaseDate(item.lastPurchased)) {
          updatedItem.prices = backfillMissingPriceEntries({
            ...updatedItem,
            prices: [],
          });
          itemChanged = true;
          result.pricesFixed += updatedItem.prices.length;
        }
      } else if ((updatedItem.prices.length < updatedItem.frequency) || updatedItem.prices.some((p) => !isValidPurchaseDate(p.purchaseDate))) {
        updatedItem.prices = backfillMissingPriceEntries(updatedItem);
        itemChanged = true;
        result.pricesFixed++;
      }

      if (updatedItem.prices?.length) {
        updatedItem.prices = updatedItem.prices.map((price, priceIndex) => {
          const updatedPrice = { ...price };
          if (!isValidPurchaseDate(updatedPrice.purchaseDate)) {
            updatedPrice.purchaseDate = inferPurchaseDate(price, item, priceIndex);
            itemChanged = true;
            result.pricesFixed++;
          }
          const month = toMonthKey(updatedPrice.purchaseDate);
          if (month) monthsSet.add(month);
          return updatedPrice;
        });
      }

      if (itemChanged) result.itemsFixed++;
      if (itemChanged) needsSave = true;
      return updatedItem;
    });

    if (needsSave) {
      await setPurchaseHistory(listId, fixedHistory);
    }

    fixedHistory.forEach((item) => {
      item.prices?.forEach((p) => {
        const month = toMonthKey(p.purchaseDate);
        if (month) monthsSet.add(month);
      });
    });

    result.monthsFound = Array.from(monthsSet).sort().reverse();
    result.success = true;
    return result;
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : String(error));
    return result;
  }
}

export async function verifyMonthsVisible(listId: string): Promise<string[]> {
  try {
    const history = await getPurchaseHistory(listId);
    const monthsSet = new Set<string>();
    history.forEach((item) => {
      item.prices?.forEach((price) => {
        const month = toMonthKey(price.purchaseDate);
        if (month) monthsSet.add(month);
      });
    });
    return Array.from(monthsSet).sort().reverse();
  } catch {
    return [];
  }
}

if (typeof window !== 'undefined') {
  (window as any).ensureAllMonthsVisible = ensureAllMonthsVisible;
  (window as any).verifyMonthsVisible = verifyMonthsVisible;
}
