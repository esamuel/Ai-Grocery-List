import type { ReceiptAnalysisResult } from './geminiService';
import type { PurchaseHistoryItem } from '../types';
import { getCanonicalName } from './semanticDupService';
import { commitShoppingTrip } from './shoppingTripService';
import { addStoreToList } from './storeListService';

function toPurchaseIso(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  if (dateStr.includes('T')) return dateStr;
  return `${dateStr}T12:00:00.000Z`;
}

/** Match OCR lines to existing history for category / display name. */
export function enrichReceiptItems(
  receipt: ReceiptAnalysisResult,
  historyItems: PurchaseHistoryItem[]
): ReceiptAnalysisResult {
  const byCanonical = new Map<string, PurchaseHistoryItem>();
  historyItems.forEach((h) => {
    byCanonical.set(h.canonicalName || getCanonicalName(h.name), h);
  });

  return {
    ...receipt,
    items: receipt.items.map((item) => {
      const key = getCanonicalName(item.name);
      const existing = byCanonical.get(key);
      return {
        ...item,
        name: existing?.name || item.name,
        category: existing?.category || item.category,
      };
    }),
  };
}

export async function commitReceiptScan(
  listId: string,
  receipt: ReceiptAnalysisResult,
  options: { userId?: string; historyItems?: PurchaseHistoryItem[] } = {}
): Promise<{ tripId: string; itemCount: number; totalAmount: number }> {
  const enriched = options.historyItems?.length
    ? enrichReceiptItems(receipt, options.historyItems)
    : receipt;

  if (enriched.storeName?.trim()) {
    await addStoreToList(listId, enriched.storeName.trim());
  }

  const purchasedAt = toPurchaseIso(enriched.purchaseDate);

  const result = await commitShoppingTrip(
    listId,
    enriched.items.map((item) => ({
      name: item.name,
      category: item.category,
      price: item.price,
      currency: enriched.currency || 'ILS',
      store: enriched.storeName,
      quantity: item.quantity ?? 1,
      unit: item.unit,
      purchaseDate: purchasedAt,
    })),
    {
      source: 'receipt_ocr',
      store: enriched.storeName,
      purchasedAt,
      currency: enriched.currency || 'ILS',
      userId: options.userId,
    }
  );

  return {
    tripId: result.tripId,
    itemCount: result.itemCount,
    totalAmount: result.totalAmount,
  };
}
