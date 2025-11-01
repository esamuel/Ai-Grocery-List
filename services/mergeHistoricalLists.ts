import { getPurchaseHistory, setPurchaseHistory } from './purchaseHistoryService';
import type { PurchaseHistoryItem } from '../types';

/**
 * Merge purchase history from multiple old list IDs into the current list
 *
 * This handles the case where a user has historical data spread across
 * multiple grocery list documents in Firestore
 */
export async function mergeHistoricalLists(
  currentListId: string,
  oldListIds: string[]
): Promise<{
  merged: number;
  totalItems: number;
  errors: string[];
}> {
  console.log(`🔄 Starting merge of ${oldListIds.length} historical lists into ${currentListId}...`);

  const errors: string[] = [];
  let totalItemsMerged = 0;

  try {
    // Get current list's history
    const currentHistory = await getPurchaseHistory(currentListId);
    console.log(`📊 Current list has ${currentHistory.length} items`);

    // Create a map for merging (keyed by item name, lowercase)
    const mergedMap = new Map<string, PurchaseHistoryItem>();

    // Add current items to map
    currentHistory.forEach(item => {
      mergedMap.set(item.name.toLowerCase(), item);
    });

    // Load and merge each old list
    for (const oldListId of oldListIds) {
      console.log(`\n📥 Loading history from list: ${oldListId}`);

      try {
        const oldHistory = await getPurchaseHistory(oldListId);
        console.log(`  Found ${oldHistory.length} items`);

        if (oldHistory.length === 0) {
          console.log(`  ⚠️ Skipping empty list ${oldListId}`);
          continue;
        }

        // Merge each item
        oldHistory.forEach(oldItem => {
          const key = oldItem.name.toLowerCase();
          const existing = mergedMap.get(key);

          if (existing) {
            // Merge: combine price entries and update stats
            console.log(`  🔗 Merging "${oldItem.name}" (existing freq: ${existing.frequency}, adding: ${oldItem.frequency})`);

            const merged: PurchaseHistoryItem = {
              ...existing,
              frequency: existing.frequency + oldItem.frequency,
              // Keep the oldest firstPurchased
              firstPurchased: (existing.firstPurchased && oldItem.firstPurchased)
                ? (new Date(existing.firstPurchased) < new Date(oldItem.firstPurchased)
                    ? existing.firstPurchased
                    : oldItem.firstPurchased)
                : (existing.firstPurchased || oldItem.firstPurchased),
              // Keep the newest lastPurchased
              lastPurchased: new Date(existing.lastPurchased) > new Date(oldItem.lastPurchased)
                ? existing.lastPurchased
                : oldItem.lastPurchased,
              // Combine price arrays
              prices: [
                ...(existing.prices || []),
                ...(oldItem.prices || [])
              ].sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime()),
            };

            // Recalculate price statistics
            if (merged.prices && merged.prices.length > 0) {
              const allPrices = merged.prices.map(p => p.price).filter(p => p !== undefined) as number[];
              if (allPrices.length > 0) {
                merged.avgPrice = allPrices.reduce((a, b) => a + b, 0) / allPrices.length;
                merged.lowestPrice = Math.min(...allPrices);
                merged.highestPrice = Math.max(...allPrices);
                merged.lastPrice = merged.prices[merged.prices.length - 1].price;
              }
            }

            mergedMap.set(key, merged);
          } else {
            // New item - just add it
            console.log(`  ➕ Adding new item "${oldItem.name}" (freq: ${oldItem.frequency})`);
            mergedMap.set(key, oldItem);
          }
        });

        totalItemsMerged += oldHistory.length;
      } catch (error) {
        const errorMsg = `Failed to load list ${oldListId}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(`  ❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    // Save merged history
    const finalHistory = Array.from(mergedMap.values());
    console.log(`\n💾 Saving ${finalHistory.length} merged items to ${currentListId}...`);
    await setPurchaseHistory(currentListId, finalHistory);

    console.log(`✅ Merge complete!`);
    console.log(`  - Started with: ${currentHistory.length} items`);
    console.log(`  - Merged from: ${oldListIds.length} old lists`);
    console.log(`  - Total in merged list: ${finalHistory.length} items`);
    console.log(`  - New items added: ${finalHistory.length - currentHistory.length}`);

    return {
      merged: finalHistory.length - currentHistory.length,
      totalItems: finalHistory.length,
      errors
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Merge failed:', errorMsg);
    errors.push(errorMsg);
    return { merged: 0, totalItems: 0, errors };
  }
}

// Make available globally for manual triggering
if (typeof window !== 'undefined') {
  (window as any).mergeHistoricalLists = mergeHistoricalLists;
}
