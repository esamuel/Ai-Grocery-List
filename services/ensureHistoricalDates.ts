/**
 * Ensure all historical items have purchase dates
 * This fixes missing November data and ensures months show up properly
 */

import { getPurchaseHistory, setPurchaseHistory } from './purchaseHistoryService';
import type { PurchaseHistoryItem } from '../types';

/**
 * Fix missing dates in purchase history
 * - Items without prices array get one created
 * - Items without purchaseDate get lastPurchased used as fallback
 * - Ensures November and all past months show up
 */
export async function ensureHistoricalDates(listId: string): Promise<{
  fixed: number;
  updated: PurchaseHistoryItem[];
}> {
  console.log('🔧 Ensuring all historical items have dates...');
  
  try {
    const history = await getPurchaseHistory(listId);
    let fixedCount = 0;
    
    const updated = history.map(item => {
      let needsUpdate = false;
      const updatedItem = { ...item };
      
      // If no prices array, create one with current lastPurchased
      if (!updatedItem.prices || updatedItem.prices.length === 0) {
        console.log(`  📝 Adding price entry to: ${item.name}`);
        updatedItem.prices = [{
          purchaseDate: item.lastPurchased,
          price: item.lastPrice || 0,
          currency: 'USD',
          quantity: 1
        }];
        needsUpdate = true;
        fixedCount++;
      }
      
      // Ensure each price has a purchaseDate
      if (updatedItem.prices) {
        updatedItem.prices = updatedItem.prices.map((price, idx) => {
          if (!price.purchaseDate) {
            console.log(`  📅 Adding date to price entry ${idx} of: ${item.name}`);
            needsUpdate = true;
            fixedCount++;
            return {
              ...price,
              purchaseDate: item.lastPurchased
            };
          }
          return price;
        });
      }
      
      return updatedItem;
    });
    
    // Save if anything was fixed
    if (fixedCount > 0) {
      console.log(`✅ Fixed ${fixedCount} items - saving to database...`);
      await setPurchaseHistory(listId, updated);
      console.log(`✅ Historical dates ensured! November and past months should now show up.`);
    } else {
      console.log('✅ All items already have proper dates');
    }
    
    return {
      fixed: fixedCount,
      updated
    };
  } catch (error) {
    console.error('❌ Failed to ensure historical dates:', error);
    return {
      fixed: 0,
      updated: []
    };
  }
}

/**
 * Check which months have data
 */
export async function getAvailableMonths(listId: string): Promise<string[]> {
  try {
    const history = await getPurchaseHistory(listId);
    const months = new Set<string>();
    
    history.forEach(item => {
      if (item.prices) {
        item.prices.forEach(price => {
          try {
            const date = new Date(price.purchaseDate);
            const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            months.add(month);
          } catch (e) {
            // Skip invalid dates
          }
        });
      }
    });
    
    // Return sorted (newest first)
    return Array.from(months).sort().reverse();
  } catch (error) {
    console.error('Failed to get available months:', error);
    return [];
  }
}

/**
 * Get items from a specific month
 */
export async function getMonthItems(listId: string, monthStr: string): Promise<PurchaseHistoryItem[]> {
  try {
    const history = await getPurchaseHistory(listId);
    const [yearStr, monthStr2] = monthStr.split('-');
    const targetYear = parseInt(yearStr);
    const targetMonth = parseInt(monthStr2);
    
    return history.filter(item => {
      if (!item.prices) return false;
      
      return item.prices.some(price => {
        const date = new Date(price.purchaseDate);
        return date.getFullYear() === targetYear && 
               date.getMonth() + 1 === targetMonth;
      });
    });
  } catch (error) {
    console.error('Failed to get month items:', error);
    return [];
  }
}

