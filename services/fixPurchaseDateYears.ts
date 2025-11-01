import { getPurchaseHistory, setPurchaseHistory } from './purchaseHistoryService';
import type { PurchaseHistoryItem } from '../types';

/**
 * Fix incorrect year in purchase dates (2025 -> 2024)
 *
 * This fixes dates that were accidentally saved with year 2025
 * when they should be 2024
 */
export async function fixPurchaseDateYears(listId: string): Promise<{
  fixed: number;
  errors: string[];
}> {
  console.log('🔧 Starting date year correction for list:', listId);

  const errors: string[] = [];
  let fixed = 0;

  try {
    const history = await getPurchaseHistory(listId);
    console.log(`📊 Checking ${history.length} items for date year errors...`);

    // Fix dates that have year 2024 but should be 2025
    // (Shopping happened in October-November 2025, not 2024)
    const wrongYear = 2024;
    const correctYear = 2025;

    const updatedHistory = history.map(item => {
      let itemFixed = false;

      // Fix lastPurchased if it's in wrong year (2024)
      if (item.lastPurchased) {
        const lastDate = new Date(item.lastPurchased);
        if (lastDate.getFullYear() === wrongYear) {
          lastDate.setFullYear(correctYear);
          item.lastPurchased = lastDate.toISOString();
          itemFixed = true;
          console.log(`  📅 Fixed lastPurchased for "${item.name}": ${wrongYear} -> ${correctYear}`);
        }
      }

      // Fix firstPurchased if it's in wrong year
      if (item.firstPurchased) {
        const firstDate = new Date(item.firstPurchased);
        if (firstDate.getFullYear() === wrongYear) {
          firstDate.setFullYear(correctYear);
          item.firstPurchased = firstDate.toISOString();
          itemFixed = true;
          console.log(`  📅 Fixed firstPurchased for "${item.name}": ${wrongYear} -> ${correctYear}`);
        }
      }

      // Fix all price entries
      if (item.prices && item.prices.length > 0) {
        item.prices = item.prices.map(priceEntry => {
          if (priceEntry.purchaseDate) {
            const purchaseDate = new Date(priceEntry.purchaseDate);
            if (purchaseDate.getFullYear() === wrongYear) {
              purchaseDate.setFullYear(correctYear);
              priceEntry.purchaseDate = purchaseDate.toISOString();
              itemFixed = true;
            }
          }
          return priceEntry;
        });
      }

      if (itemFixed) {
        fixed++;
        console.log(`  ✅ Fixed all dates for "${item.name}"`);
      }

      return item;
    });

    if (fixed > 0) {
      console.log(`💾 Saving ${fixed} corrected items...`);
      await setPurchaseHistory(listId, updatedHistory);
      console.log('✅ Date correction complete!');
    } else {
      console.log('✅ No date corrections needed');
    }

    return { fixed, errors };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Date correction failed:', errorMsg);
    errors.push(errorMsg);
    return { fixed, errors };
  }
}

// Make available globally for manual triggering
if (typeof window !== 'undefined') {
  (window as any).fixPurchaseDateYears = fixPurchaseDateYears;
}
