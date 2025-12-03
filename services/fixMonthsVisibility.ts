/**
 * DIRECT FIX: Ensure all months are visible by properly formatting dates
 * This runs FIRST before anything else
 */

import { getPurchaseHistory, setPurchaseHistory } from './purchaseHistoryService';
import type { PurchaseHistoryItem, PriceHistory } from '../types';

/**
 * Ensure ALL price entries have proper purchaseDate for month extraction
 */
export async function fixMonthsVisibility(listId: string): Promise<{
  fixed: boolean;
  itemsProcessed: number;
  monthsFound: string[];
}> {
  try {
    console.log('🔨 DIRECT FIX: Ensuring all months are visible...');
    
    const history = await getPurchaseHistory(listId);
    console.log(`📊 Processing ${history.length} items...`);
    
    if (history.length === 0) {
      console.log('✅ No history to fix');
      return { fixed: false, itemsProcessed: 0, monthsFound: [] };
    }
    
    const months = new Set<string>();
    let needsSave = false;
    
    const fixed = history.map(item => {
      const updated = { ...item };
      
      // ENSURE prices array exists
      if (!updated.prices) {
        updated.prices = [];
        needsSave = true;
      }
      
      // ENSURE each price has purchaseDate
      if (updated.prices && updated.prices.length > 0) {
        updated.prices = updated.prices.map(price => {
          const fixed = { ...price };
          
          // If no purchaseDate, use lastPurchased
          if (!fixed.purchaseDate && item.lastPurchased) {
            fixed.purchaseDate = item.lastPurchased;
            needsSave = true;
            console.log(`  ✅ Added date to ${item.name}: ${item.lastPurchased}`);
          }
          
          // Extract month
          if (fixed.purchaseDate) {
            try {
              const date = new Date(fixed.purchaseDate);
              if (!isNaN(date.getTime())) {
                const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                months.add(month);
              }
            } catch (e) {
              console.warn(`Invalid date: ${fixed.purchaseDate}`);
            }
          }
          
          return fixed;
        });
      } else if (!updated.prices || updated.prices.length === 0) {
        // Create a price entry from lastPurchased
        if (item.lastPurchased) {
          updated.prices = [{
            purchaseDate: item.lastPurchased,
            price: item.lastPrice || 0,
            currency: 'USD',
            quantity: 1
          }];
          needsSave = true;
          
          const date = new Date(item.lastPurchased);
          if (!isNaN(date.getTime())) {
            const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            months.add(month);
            console.log(`  ✅ Created price entry for ${item.name}: ${month}`);
          }
        }
      }
      
      return updated;
    });
    
    const monthsList = Array.from(months).sort().reverse();
    console.log(`📅 Months found: ${monthsList.join(', ')}`);
    
    if (needsSave) {
      console.log('💾 Saving fixed data...');
      await setPurchaseHistory(listId, fixed);
      console.log(`✅ FIXED! All months should now be visible!`);
    } else {
      console.log(`✅ Already formatted correctly - ${monthsList.length} months visible`);
    }
    
    return {
      fixed: needsSave,
      itemsProcessed: history.length,
      monthsFound: monthsList
    };
  } catch (error) {
    console.error('❌ Fix failed:', error);
    return { fixed: false, itemsProcessed: 0, monthsFound: [] };
  }
}

/**
 * Verify that months are properly extracted
 */
export async function verifyMonthsAreExtracted(listId: string): Promise<string[]> {
  try {
    const history = await getPurchaseHistory(listId);
    const months = new Set<string>();
    
    history.forEach(item => {
      if (item.prices) {
        item.prices.forEach(price => {
          if (price.purchaseDate) {
            try {
              const date = new Date(price.purchaseDate);
              const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
              months.add(month);
            } catch (e) {
              // Skip invalid dates
            }
          }
        });
      }
    });
    
    const monthsList = Array.from(months).sort().reverse();
    console.log(`✅ VERIFICATION: ${monthsList.length} months extracted`);
    console.log(`   Months: ${monthsList.join(', ')}`);
    
    return monthsList;
  } catch (error) {
    console.error('Verification failed:', error);
    return [];
  }
}

