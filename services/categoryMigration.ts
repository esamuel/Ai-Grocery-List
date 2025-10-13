import type { GroceryListData, PurchaseHistoryItem } from '../types';

// Migration to update "אחר" category to "מזווה" for existing items
export async function migrateOtherCategoryToPantry(listId: string, currentHistory: PurchaseHistoryItem[]): Promise<PurchaseHistoryItem[]> {
  if (!listId || !currentHistory) {
    console.warn('No list ID or history provided for category migration');
    return currentHistory;
  }

  let hasChanges = false;
  const updatedHistory = currentHistory.map((item: PurchaseHistoryItem) => {
    if (item.category === 'אחר') {
      hasChanges = true;
      return { ...item, category: 'מזווה' };
    }
    return item;
  });

  if (hasChanges) {
    const migratedCount = updatedHistory.filter((item: PurchaseHistoryItem) => 
      item.category === 'מזווה' && 
      currentHistory.find((orig: PurchaseHistoryItem) => orig.name === item.name && orig.category === 'אחר')
    ).length;
    
    console.log(`✅ Migrated ${migratedCount} items from "אחר" to "מזווה"`);
    return updatedHistory;
  } else {
    console.log('ℹ️ No items found with "אחר" category to migrate');
    return currentHistory;
  }
}

// Helper function to check if migration is needed
export function checkMigrationNeeded(historyItems: PurchaseHistoryItem[]): boolean {
  if (!historyItems) return false;
  return historyItems.some((item: PurchaseHistoryItem) => item.category === 'אחר');
}
