import { getPurchaseHistory } from './purchaseHistoryService';

/**
 * Diagnostic tool to show ALL purchase history data
 */
export async function diagnosePurchaseHistory(listId: string) {
  console.log('🔍 DIAGNOSTIC: Loading all purchase history...');

  const history = await getPurchaseHistory(listId);

  console.log(`\n📊 TOTAL ITEMS IN HISTORY: ${history.length}\n`);

  // Show all items with their details
  history.forEach((item, index) => {
    console.log(`\n━━━ Item ${index + 1}: ${item.name} ━━━`);
    console.log(`  Frequency: ${item.frequency}`);
    console.log(`  Last Purchased: ${item.lastPurchased}`);
    console.log(`  First Purchased: ${item.firstPurchased || 'N/A'}`);
    console.log(`  Has prices array: ${!!item.prices}`);
    console.log(`  Prices array length: ${item.prices?.length || 0}`);

    if (item.prices && item.prices.length > 0) {
      console.log(`  📅 Price entries:`);
      item.prices.forEach((priceEntry, i) => {
        console.log(`    ${i + 1}. Date: ${priceEntry.purchaseDate}`);
        console.log(`       Price: ${priceEntry.price || 'No price'}`);
        console.log(`       Store: ${priceEntry.store || 'No store'}`);
        console.log(`       Quantity: ${priceEntry.quantity || 1}`);
      });
    } else {
      console.log(`  ⚠️ NO PRICE ENTRIES!`);
    }

    // Check for mismatch
    if (item.frequency !== (item.prices?.length || 0)) {
      console.log(`  🔴 MISMATCH: Frequency (${item.frequency}) ≠ Price entries (${item.prices?.length || 0})`);
    }
  });

  // Summary
  const totalPriceEntries = history.reduce((sum, item) => sum + (item.prices?.length || 0), 0);
  const totalFrequency = history.reduce((sum, item) => sum + item.frequency, 0);
  const itemsWithMismatch = history.filter(item => item.frequency !== (item.prices?.length || 0));

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 SUMMARY:`);
  console.log(`  Total items: ${history.length}`);
  console.log(`  Total frequency: ${totalFrequency}`);
  console.log(`  Total price entries: ${totalPriceEntries}`);
  console.log(`  Items with mismatch: ${itemsWithMismatch.length}`);

  if (itemsWithMismatch.length > 0) {
    console.log(`\n⚠️ ITEMS WITH FREQUENCY/PRICE MISMATCH:`);
    itemsWithMismatch.forEach(item => {
      console.log(`  - ${item.name}: freq=${item.frequency}, prices=${item.prices?.length || 0}`);
    });
  }

  // Calculate unique shopping days from price entries
  const allDates = new Set<string>();
  history.forEach(item => {
    item.prices?.forEach(priceEntry => {
      const date = new Date(priceEntry.purchaseDate).toISOString().split('T')[0];
      allDates.add(date);
    });
  });

  console.log(`\n📅 UNIQUE SHOPPING DAYS: ${allDates.size}`);
  Array.from(allDates).sort().reverse().forEach(date => {
    console.log(`  - ${date}`);
  });

  return {
    totalItems: history.length,
    totalPriceEntries,
    totalFrequency,
    uniqueDays: allDates.size,
    shoppingDays: Array.from(allDates).sort().reverse(),
    itemsWithMismatch: itemsWithMismatch.length
  };
}

// Make available globally
if (typeof window !== 'undefined') {
  (window as any).diagnosePurchaseHistory = diagnosePurchaseHistory;
}
