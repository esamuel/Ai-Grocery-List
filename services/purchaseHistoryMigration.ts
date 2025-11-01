import { getPurchaseHistory, setPurchaseHistory } from './purchaseHistoryService';
import type { PurchaseHistoryItem } from '../types';

// Make migration available globally for manual triggering
if (typeof window !== 'undefined') {
  (window as any).forcePurchaseHistoryMigration = async (listId: string) => {
    console.log('🔧 MANUAL MIGRATION TRIGGERED for list:', listId);
    const result = await migrateMissingPriceEntries(listId);
    console.log('📊 Migration result:', result);
    return result;
  };
}

/**
 * Migration script to fix missing prices[] entries in purchase history
 *
 * PROBLEM: Items that were checked off without entering prices have:
 * - frequency > 0
 * - lastPurchased date
 * BUT no entries in the prices[] array
 *
 * This causes them to disappear from Daily Purchases view
 *
 * SOLUTION: For each item with missing prices entries, create price entries
 * based on frequency and lastPurchased date, estimating purchase dates
 */
export async function migrateMissingPriceEntries(listId: string): Promise<{
  migrated: number;
  skipped: number;
  errors: string[];
}> {
  console.log('🔄 Starting purchase history migration for list:', listId);

  const errors: string[] = [];
  let migrated = 0;
  let skipped = 0;

  try {
    const history = await getPurchaseHistory(listId);
    console.log(`📊 Found ${history.length} items in purchase history`);

    // Debug: show first item structure
    if (history.length > 0) {
      console.log('📋 Sample item structure:', {
        name: history[0].name,
        frequency: history[0].frequency,
        hasPrices: !!history[0].prices,
        pricesLength: history[0].prices?.length || 0,
        lastPurchased: history[0].lastPurchased
      });
    }

    const updatedHistory = history.map(item => {
      // Check if item needs migration
      const needsMigration = item.frequency > 0 && (!item.prices || item.prices.length === 0);

      if (!needsMigration) {
        skipped++;
        return item;
      }

      console.log(`🔧 Migrating "${item.name}" - frequency: ${item.frequency}, no price entries`);

      // Create price entries based on frequency and dates
      const prices = [];
      const lastPurchased = new Date(item.lastPurchased);
      const firstPurchased = item.firstPurchased ? new Date(item.firstPurchased) : lastPurchased;

      // If frequency is 1, create a single entry
      if (item.frequency === 1) {
        prices.push({
          purchaseDate: item.lastPurchased,
          quantity: 1,
          // Note: price is omitted because we don't have historical price data
        });
      } else {
        // If frequency > 1, distribute purchases evenly between first and last purchase
        const timeDiff = lastPurchased.getTime() - firstPurchased.getTime();
        const interval = timeDiff / (item.frequency - 1);

        for (let i = 0; i < item.frequency; i++) {
          const purchaseDate = new Date(firstPurchased.getTime() + (interval * i));
          prices.push({
            purchaseDate: purchaseDate.toISOString(),
            quantity: 1,
          });
        }
      }

      migrated++;
      console.log(`  ✅ Created ${prices.length} price entries`);

      return {
        ...item,
        prices
      };
    });

    // Save updated history back to Firestore
    if (migrated > 0) {
      console.log(`💾 Saving updated history with ${migrated} migrated items...`);
      await setPurchaseHistory(listId, updatedHistory);
      console.log('✅ Migration complete!');
    } else {
      console.log('✅ No items needed migration');
    }

    return { migrated, skipped, errors };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Migration failed:', errorMsg);
    errors.push(errorMsg);
    return { migrated, skipped, errors };
  }
}

/**
 * Check if migration is needed
 */
export async function checkPurchaseHistoryNeedsMigration(listId: string): Promise<boolean> {
  try {
    const history = await getPurchaseHistory(listId);
    console.log(`🔍 Checking ${history.length} purchase history items for migration...`);

    // Check if any items have frequency but no prices
    const itemsNeedingMigration = history.filter(item =>
      item.frequency > 0 && (!item.prices || item.prices.length === 0)
    );

    const needsMigration = itemsNeedingMigration.length > 0;

    if (needsMigration) {
      console.log(`⚠️ Purchase history needs migration - ${itemsNeedingMigration.length} items missing price entries:`,
        itemsNeedingMigration.map(i => `${i.name} (freq: ${i.frequency})`));
    } else {
      console.log('✅ Purchase history migration not needed - all items have price entries');
    }

    return needsMigration;
  } catch (error) {
    console.error('❌ Failed to check if migration needed:', error);
    return false;
  }
}
