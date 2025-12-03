import { getPurchaseHistory } from './purchaseHistoryService';
import type { PurchaseHistoryItem } from '../types';

/**
 * Load ALL purchase history data - handles Firestore size limits
 * This uses the existing purchase history service which handles the full load
 */
export async function loadAllHistoryData(listId: string): Promise<PurchaseHistoryItem[]> {
  console.log(`\n🔍 LOADING ALL HISTORY DATA for list: ${listId}\n`);
  
  try {
    
    // Use the existing purchase history service which loads ALL data
    console.log('📍 Loading all purchase history from Firestore...');
    const history = await getPurchaseHistory(listId);
    console.log(`✅ Found ${history.length} items in purchase history`);
    
    if (history.length > 0) {
      // Log sample of what we got
      console.log(`📦 Sample items:`);
      history.slice(0, 3).forEach((item: any, idx: number) => {
        const months = item.prices?.map((p: any) => p.purchaseDate?.substring(0, 7)).filter(Boolean) || [];
        console.log(`   [${idx + 1}] "${item.name}" - Months: ${months.join(', ')}`);
      });
    }
    
    return history;
    
  } catch (error) {
    console.error('❌ Error loading all history data:', error);
    return [];
  }
}

/**
 * Verify and fix history data load
 * This runs after the main sync to ensure we have all data
 */
export async function verifyHistoryDataLoad(listId: string, currentHistory: PurchaseHistoryItem[]): Promise<PurchaseHistoryItem[]> {
  console.log(`\n🔍 VERIFYING HISTORY DATA LOAD\n`);
  console.log(`   Current items loaded: ${currentHistory.length}`);
  
  // Get all history again to compare
  const fullHistory = await loadAllHistoryData(listId);
  
  if (fullHistory.length > currentHistory.length) {
    console.log(`\n🚨 CRITICAL: Missing data detected!`);
    console.log(`   Expected: ${fullHistory.length} items`);
    console.log(`   Got: ${currentHistory.length} items`);
    console.log(`   Missing: ${fullHistory.length - currentHistory.length} items\n`);
    
    return fullHistory;
  }
  
  if (fullHistory.length === currentHistory.length) {
    console.log(`✅ All history data loaded correctly!`);
  }
  
  return currentHistory;
}

