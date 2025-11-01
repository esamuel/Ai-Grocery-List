import { getPurchaseHistory, setPurchaseHistory } from './purchaseHistoryService';
import type { PurchaseHistoryItem } from '../types';

/**
 * Fix price entries that are missing purchaseDate field
 *
 * This handles cases where price/store data exists but purchaseDate is missing,
 * causing the entries to be skipped in Daily Purchases view
 */
export async function fixMissingPurchaseDates(listId: string): Promise<{
  itemsFixed: number;
  priceEntriesFixed: number;
  errors: string[];
}> {
  console.log(`🔧 Fixing missing purchaseDate fields in list ${listId}...`);

  const errors: string[] = [];
  let itemsFixed = 0;
  let priceEntriesFixed = 0;

  try {
    const history = await getPurchaseHistory(listId);
    console.log(`📊 Loaded ${history.length} items from history`);

    const updatedHistory: PurchaseHistoryItem[] = [];
    let hasChanges = false;

    for (const item of history) {
      if (!item.prices || item.prices.length === 0) {
        updatedHistory.push(item);
        continue;
      }

      let itemHadChanges = false;
      const updatedPrices = item.prices.map((priceEntry, index) => {
        // Check if purchaseDate is missing or invalid
        if (!priceEntry.purchaseDate || priceEntry.purchaseDate === '' || priceEntry.purchaseDate === 'undefined') {
          console.log(`  🔧 Fixing missing purchaseDate for "${item.name}" (entry ${index + 1}/${item.prices!.length})`);

          let reconstructedDate: string;

          // Strategy 1: Use lastPurchased if this is the most recent entry
          if (index === item.prices!.length - 1 && item.lastPurchased) {
            reconstructedDate = item.lastPurchased;
            console.log(`    → Using lastPurchased: ${reconstructedDate}`);
          }
          // Strategy 2: Use firstPurchased if this is the first entry
          else if (index === 0 && item.firstPurchased) {
            reconstructedDate = item.firstPurchased;
            console.log(`    → Using firstPurchased: ${reconstructedDate}`);
          }
          // Strategy 3: Distribute dates between first and last purchase
          else if (item.firstPurchased && item.lastPurchased && item.prices!.length > 1) {
            const firstDate = new Date(item.firstPurchased);
            const lastDate = new Date(item.lastPurchased);
            const timeDiff = lastDate.getTime() - firstDate.getTime();
            const timePerEntry = timeDiff / (item.prices!.length - 1);
            const estimatedDate = new Date(firstDate.getTime() + (timePerEntry * index));
            reconstructedDate = estimatedDate.toISOString();
            console.log(`    → Estimated date (${index + 1}/${item.prices!.length}): ${reconstructedDate}`);
          }
          // Strategy 4: Fall back to lastPurchased
          else if (item.lastPurchased) {
            reconstructedDate = item.lastPurchased;
            console.log(`    → Fallback to lastPurchased: ${reconstructedDate}`);
          }
          // Strategy 5: Use current date as last resort
          else {
            reconstructedDate = new Date().toISOString();
            console.log(`    ⚠️ No date available, using current date: ${reconstructedDate}`);
          }

          priceEntriesFixed++;
          itemHadChanges = true;

          return {
            ...priceEntry,
            purchaseDate: reconstructedDate
          };
        }

        return priceEntry;
      });

      if (itemHadChanges) {
        itemsFixed++;
        hasChanges = true;
        updatedHistory.push({
          ...item,
          prices: updatedPrices
        });
      } else {
        updatedHistory.push(item);
      }
    }

    if (hasChanges) {
      console.log(`💾 Saving updated history with ${priceEntriesFixed} fixed price entries...`);
      await setPurchaseHistory(listId, updatedHistory);
      console.log(`✅ Fixed ${itemsFixed} items with ${priceEntriesFixed} price entries`);
    } else {
      console.log(`✅ No missing purchaseDate fields found`);
    }

    return {
      itemsFixed,
      priceEntriesFixed,
      errors
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Failed to fix missing purchaseDates:', errorMsg);
    errors.push(errorMsg);
    return { itemsFixed: 0, priceEntriesFixed: 0, errors };
  }
}

// Make available globally for manual triggering
if (typeof window !== 'undefined') {
  (window as any).fixMissingPurchaseDates = fixMissingPurchaseDates;
}
