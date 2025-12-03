/**
 * CRITICAL: Repair all historical data to ensure months show up properly
 * This ensures the app's main feature (price history & month comparison) works
 */

import { getPurchaseHistory, setPurchaseHistory } from './purchaseHistoryService';
import type { PurchaseHistoryItem } from '../types';

/**
 * Main repair function - ensures ALL months visible in spending insights
 */
export async function repairHistoricalDataForMonths(listId: string): Promise<{
  success: boolean;
  itemsFixed: number;
  monthsFound: string[];
  message: string;
}> {
  console.log('🔧 CRITICAL FIX: Repairing historical data for month visibility...');
  
  try {
    const history = await getPurchaseHistory(listId);
    console.log(`📊 Scanning ${history.length} items in purchase history...`);
    
    let itemsFixed = 0;
    const monthsSet = new Set<string>();
    
    // FIX: Ensure every item has proper price entries with dates
    const repaired = history.map((item, idx) => {
      const updated = { ...item };
      
      // CRITICAL: If NO prices array, create one from lastPurchased
      if (!updated.prices || updated.prices.length === 0) {
        console.log(`  🆘 [${idx + 1}/${history.length}] FIXING: "${item.name}" - NO PRICES`);
        
        if (!updated.prices) {
          updated.prices = [];
        }
        
        // Create price entry from lastPurchased date
        if (item.lastPurchased) {
          updated.prices.push({
            purchaseDate: item.lastPurchased,
            price: item.lastPrice || 0,
            currency: 'USD',
            quantity: 1
          });
          
          // Extract month
          const date = new Date(item.lastPurchased);
          const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          monthsSet.add(month);
          
          itemsFixed++;
          console.log(`     ✅ Created price entry for ${month}`);
        }
      } else {
        // Item has prices - ensure all have purchaseDate and extract months
        updated.prices = updated.prices.map((price, priceIdx) => {
          let fixed = { ...price };
          
          // If price missing purchaseDate, use item's lastPurchased
          if (!fixed.purchaseDate && item.lastPurchased) {
            console.log(`  🆘 [${idx + 1}] FIXING price entry ${priceIdx}: "${item.name}" - MISSING DATE`);
            fixed.purchaseDate = item.lastPurchased;
            itemsFixed++;
          }
          
          // Extract month from this price entry
          if (fixed.purchaseDate) {
            try {
              const date = new Date(fixed.purchaseDate);
              const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
              monthsSet.add(month);
            } catch (e) {
              console.warn(`Invalid date: ${fixed.purchaseDate}`);
            }
          }
          
          return fixed;
        });
      }
      
      return updated;
    });
    
    const monthsFound = Array.from(monthsSet).sort().reverse();
    console.log(`\n📅 Months found: ${monthsFound.join(', ')}`);
    
    // Save the repaired data
    if (itemsFixed > 0) {
      console.log(`\n💾 Saving ${itemsFixed} fixed items...`);
      await setPurchaseHistory(listId, repaired);
      console.log(`✅ SUCCESS! Fixed ${itemsFixed} items - all months now visible!`);
      
      return {
        success: true,
        itemsFixed,
        monthsFound,
        message: `✅ Fixed ${itemsFixed} items - ${monthsFound.length} months visible!`
      };
    } else {
      console.log('✅ All items already properly formatted');
      return {
        success: true,
        itemsFixed: 0,
        monthsFound,
        message: `✅ All ${monthsFound.length} months are visible!`
      };
    }
  } catch (error) {
    console.error('❌ FAILED to repair historical data:', error);
    return {
      success: false,
      itemsFixed: 0,
      monthsFound: [],
      message: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Verify the fix worked - show what months are visible
 */
export async function verifyMonthsVisible(listId: string): Promise<{
  success: boolean;
  totalItems: number;
  monthsVisible: string[];
  itemsPerMonth: Record<string, number>;
}> {
  try {
    const history = await getPurchaseHistory(listId);
    const monthMap = new Map<string, number>();
    
    history.forEach(item => {
      if (item.prices) {
        item.prices.forEach(price => {
          if (price.purchaseDate) {
            const date = new Date(price.purchaseDate);
            const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthMap.set(month, (monthMap.get(month) || 0) + 1);
          }
        });
      }
    });
    
    const monthsVisible = Array.from(monthMap.keys()).sort().reverse();
    const itemsPerMonth: Record<string, number> = {};
    monthMap.forEach((count, month) => {
      itemsPerMonth[month] = count;
    });
    
    console.log('📊 VERIFICATION RESULTS:');
    console.log(`Total items: ${history.length}`);
    console.log(`Months visible: ${monthsVisible.length}`);
    console.log(`Months: ${monthsVisible.join(', ')}`);
    monthsVisible.forEach(month => {
      console.log(`  ${month}: ${itemsPerMonth[month]} items`);
    });
    
    return {
      success: true,
      totalItems: history.length,
      monthsVisible,
      itemsPerMonth
    };
  } catch (error) {
    console.error('Verification failed:', error);
    return {
      success: false,
      totalItems: 0,
      monthsVisible: [],
      itemsPerMonth: {}
    };
  }
}

