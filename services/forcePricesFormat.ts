/**
 * AGGRESSIVE FIX: Ensure ALL history items have prices array with purchaseDate
 * This is required for getDailyPurchases to work, which is what shows months
 */

import { getPurchaseHistory, setPurchaseHistory } from './purchaseHistoryService';
import type { PurchaseHistoryItem } from '../types';

export async function forceCorrectPricesFormat(listId: string): Promise<boolean> {
  try {
    console.log('🔴 AGGRESSIVE FIX: Forcing prices format...');
    
    const history = await getPurchaseHistory(listId);
    console.log(`📦 Checking ${history.length} items...`);
    
    let needsSave = false;
    const fixed: PurchaseHistoryItem[] = history.map((item, idx) => {
      const updated = { ...item };
      
      // CRITICAL: Every item MUST have prices array
      if (!updated.prices || !Array.isArray(updated.prices)) {
        console.log(`  ❌ Item ${idx + 1} "${item.name}" - NO PRICES ARRAY - CREATING`);
        updated.prices = [];
        needsSave = true;
      }
      
      // CRITICAL: If prices array is empty, create entry from lastPurchased
      if (updated.prices.length === 0 && item.lastPurchased) {
        console.log(`  ❌ Item ${idx + 1} "${item.name}" - EMPTY PRICES - ADDING DATE: ${item.lastPurchased}`);
        updated.prices = [{
          purchaseDate: item.lastPurchased,
          price: item.lastPrice || 0,
          currency: 'USD',
          quantity: 1
        }];
        needsSave = true;
      }
      
      // CRITICAL: Every price entry MUST have purchaseDate
      if (updated.prices && updated.prices.length > 0) {
        updated.prices = updated.prices.map((price, priceIdx) => {
          if (!price.purchaseDate) {
            console.log(`  ❌ Item ${idx + 1} "${item.name}" price ${priceIdx + 1} - NO DATE - USING: ${item.lastPurchased}`);
            needsSave = true;
            return {
              ...price,
              purchaseDate: item.lastPurchased || new Date().toISOString()
            };
          }
          return price;
        });
      }
      
      return updated;
    });
    
    if (needsSave) {
      console.log(`\n💾 Saving ${history.length} items with proper prices format...`);
      await setPurchaseHistory(listId, fixed);
      console.log('✅ SAVED! All items now have prices with dates!');
      console.log('   getDailyPurchases should now extract all months!');
      return true;
    } else {
      console.log('✅ All items already have proper prices format');
      return false;
    }
  } catch (error) {
    console.error('❌ AGGRESSIVE FIX FAILED:', error);
    return false;
  }
}

/**
 * Verify what months can be extracted from current data
 */
export async function verifyExtractableMonths(listId: string): Promise<{
  months: string[];
  itemsPerMonth: Record<string, number>;
}> {
  try {
    const history = await getPurchaseHistory(listId);
    const monthMap = new Map<string, number>();
    
    console.log(`\n📊 VERIFYING: Checking ${history.length} items for extractable months...`);
    
    history.forEach((item, idx) => {
      if (!item.prices || item.prices.length === 0) {
        console.log(`  ⚠️ Item ${idx + 1} "${item.name}" - NO PRICES - CANNOT EXTRACT`);
        return;
      }
      
      item.prices.forEach((price, priceIdx) => {
        if (!price.purchaseDate) {
          console.log(`  ⚠️ Item ${idx + 1} "${item.name}" price ${priceIdx + 1} - NO DATE`);
          return;
        }
        
        try {
          const date = new Date(price.purchaseDate);
          if (isNaN(date.getTime())) {
            console.log(`  ⚠️ Item ${idx + 1} "${item.name}" - INVALID DATE: ${price.purchaseDate}`);
            return;
          }
          
          const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          monthMap.set(month, (monthMap.get(month) || 0) + 1);
          console.log(`  ✅ Item ${idx + 1} "${item.name}" - DATE: ${price.purchaseDate} - MONTH: ${month}`);
        } catch (e) {
          console.warn(`  ❌ Error processing date for ${item.name}:`, e);
        }
      });
    });
    
    const months = Array.from(monthMap.keys()).sort().reverse();
    const itemsPerMonth: Record<string, number> = {};
    monthMap.forEach((count, month) => {
      itemsPerMonth[month] = count;
    });
    
    console.log(`\n📅 EXTRACTABLE MONTHS: ${months.length}`);
    months.forEach(month => {
      console.log(`   ${month}: ${itemsPerMonth[month]} items`);
    });
    
    return { months, itemsPerMonth };
  } catch (error) {
    console.error('Verification failed:', error);
    return { months: [], itemsPerMonth: {} };
  }
}

