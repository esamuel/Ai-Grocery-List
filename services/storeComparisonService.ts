import type { PurchaseHistoryItem, PriceHistory } from '../types';

export interface StorePrice {
  store: string;
  avgPrice: number;
  lastPrice?: number;
  purchaseCount: number;
}

export interface BestStoreResult {
  bestStore: string;
  avgPrice: number;
  savingsPercent?: number;
}

/**
 * Get average price per store for an item
 */
export function getPricesByStore(item: PurchaseHistoryItem): StorePrice[] {
  if (!item.prices || item.prices.length === 0) {
    return [];
  }

  const storeMap = new Map<string, { total: number; count: number; lastPrice?: number; lastDate?: string }>();

  item.prices.forEach(priceEntry => {
    const storeName = priceEntry.store || 'Unknown Store';
    const existing = storeMap.get(storeName) || { total: 0, count: 0 };
    
    existing.total += priceEntry.price * (priceEntry.quantity || 1);
    existing.count += priceEntry.quantity || 1;
    
    // Track most recent price
    if (!existing.lastDate || priceEntry.purchaseDate > existing.lastDate) {
      existing.lastPrice = priceEntry.price;
      existing.lastDate = priceEntry.purchaseDate;
    }
    
    storeMap.set(storeName, existing);
  });

  // Convert to array and calculate averages
  const storePrices: StorePrice[] = [];
  storeMap.forEach((data, store) => {
    storePrices.push({
      store,
      avgPrice: data.total / data.count,
      lastPrice: data.lastPrice,
      purchaseCount: data.count,
    });
  });

  // Sort by average price (cheapest first)
  storePrices.sort((a, b) => a.avgPrice - b.avgPrice);

  return storePrices;
}

/**
 * Find the best store for a specific item
 */
export function getBestStore(item: PurchaseHistoryItem): BestStoreResult | null {
  const storePrices = getPricesByStore(item);
  
  if (storePrices.length === 0) {
    return null;
  }

  const bestStore = storePrices[0];
  
  // Calculate savings compared to most expensive store
  if (storePrices.length > 1) {
    const mostExpensive = storePrices[storePrices.length - 1];
    const savingsPercent = ((mostExpensive.avgPrice - bestStore.avgPrice) / mostExpensive.avgPrice) * 100;
    
    return {
      bestStore: bestStore.store,
      avgPrice: bestStore.avgPrice,
      savingsPercent: savingsPercent > 1 ? savingsPercent : undefined,
    };
  }

  return {
    bestStore: bestStore.store,
    avgPrice: bestStore.avgPrice,
  };
}

/**
 * Get overall best stores across all items
 */
export function getOverallBestStores(items: PurchaseHistoryItem[]): Array<{
  store: string;
  avgSavings: number;
  itemCount: number;
}> {
  const storeStats = new Map<string, { totalSavings: number; itemCount: number }>();

  items.forEach(item => {
    const storePrices = getPricesByStore(item);
    if (storePrices.length < 2) return; // Need at least 2 stores to compare

    const avgMarketPrice = storePrices.reduce((sum, sp) => sum + sp.avgPrice, 0) / storePrices.length;

    storePrices.forEach(sp => {
      const savings = ((avgMarketPrice - sp.avgPrice) / avgMarketPrice) * 100;
      const existing = storeStats.get(sp.store) || { totalSavings: 0, itemCount: 0 };
      existing.totalSavings += savings;
      existing.itemCount += 1;
      storeStats.set(sp.store, existing);
    });
  });

  // Convert to array and calculate average savings
  const results: Array<{ store: string; avgSavings: number; itemCount: number }> = [];
  storeStats.forEach((stats, store) => {
    results.push({
      store,
      avgSavings: stats.totalSavings / stats.itemCount,
      itemCount: stats.itemCount,
    });
  });

  // Sort by average savings (best first)
  results.sort((a, b) => b.avgSavings - a.avgSavings);

  return results.slice(0, 5); // Top 5 stores
}

/**
 * Get store recommendation badge for display
 */
export function getStoreBadge(item: PurchaseHistoryItem): {
  text: string;
  className: string;
} | null {
  const bestStore = getBestStore(item);
  
  if (!bestStore) return null;

  // Only show badge if there's significant savings
  if (bestStore.savingsPercent && bestStore.savingsPercent > 5) {
    return {
      text: `🏪 Best at ${bestStore.store} (${bestStore.savingsPercent.toFixed(0)}% cheaper)`,
      className: 'bg-blue-50 text-blue-700 border-blue-200',
    };
  }

  return null;
}

