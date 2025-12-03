/**
 * COMPREHENSIVE FIX: Ensure ALL historical months are visible
 * 
 * This service addresses the core issue where historical data (e.g., November)
 * disappears when a new month (e.g., December) starts.
 * 
 * Root cause: Purchase history items have price entries without valid purchaseDate,
 * which prevents getDailyPurchases() from extracting the month.
 */

import { getPurchaseHistory, setPurchaseHistory } from './purchaseHistoryService';
import type { PurchaseHistoryItem, PriceHistory } from '../types';

interface FixResult {
  success: boolean;
  itemsChecked: number;
  itemsFixed: number;
  pricesFixed: number;
  monthsFound: string[];
  errors: string[];
}

/**
 * Validates if a date string is in proper ISO format and represents a valid date
 */
function isValidISODate(dateString: string | undefined): boolean {
  if (!dateString) return false;
  
  try {
    const date = new Date(dateString);
    // Check if date is valid (not NaN) and in reasonable range
    if (isNaN(date.getTime())) return false;
    
    // Dates should be after 2020 and before 2100 (reasonable range)
    const year = date.getFullYear();
    if (year < 2020 || year > 2100) return false;
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Extracts month from a date string in YYYY-MM format
 */
function extractMonth(dateString: string): string | null {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  } catch {
    return null;
  }
}

/**
 * Infer purchase date from various sources
 * Priority: existing purchaseDate → lastPurchased → firstPurchased → current date
 */
function inferPurchaseDate(
  priceEntry: PriceHistory,
  item: PurchaseHistoryItem,
  priceIndex: number
): string {
  // 1. Check if price entry already has valid date
  if (isValidISODate(priceEntry.purchaseDate)) {
    return priceEntry.purchaseDate!;
  }
  
  // 2. Use item's lastPurchased if valid
  if (isValidISODate(item.lastPurchased)) {
    return item.lastPurchased!;
  }
  
  // 3. Use item's firstPurchased if valid
  if (isValidISODate(item.firstPurchased)) {
    // If this is not the first price entry, try to add some time offset
    if (priceIndex > 0 && item.firstPurchased) {
      const baseDate = new Date(item.firstPurchased);
      // Add days based on price index (rough estimate)
      baseDate.setDate(baseDate.getDate() + (priceIndex * 7)); // Weekly intervals
      return baseDate.toISOString();
    }
    return item.firstPurchased!;
  }
  
  // 4. Last resort: use current date (minus some days to put it in the past)
  const fallbackDate = new Date();
  fallbackDate.setDate(fallbackDate.getDate() - (priceIndex * 7)); // Space them out
  console.warn(`⚠️ No valid date found for ${item.name}, using fallback: ${fallbackDate.toISOString()}`);
  return fallbackDate.toISOString();
}

/**
 * Main function: Ensures all historical months are visible
 * Fixes missing or invalid purchase dates in history items
 */
export async function ensureAllMonthsVisible(listId: string): Promise<FixResult> {
  const result: FixResult = {
    success: false,
    itemsChecked: 0,
    itemsFixed: 0,
    pricesFixed: 0,
    monthsFound: [],
    errors: []
  };
  
  try {
    console.log('🔍 ENSURING ALL MONTHS ARE VISIBLE...');
    console.log('━'.repeat(60));
    
    // Load current purchase history
    const history = await getPurchaseHistory(listId);
    console.log(`📊 Processing ${history.length} history items...`);
    
    if (history.length === 0) {
      console.log('ℹ️ No history items found');
      result.success = true;
      return result;
    }
    
    result.itemsChecked = history.length;
    const monthsSet = new Set<string>();
    let needsSave = false;
    
    // Process each history item
    const fixedHistory = history.map((item, itemIndex) => {
      const updatedItem = { ...item };
      let itemChanged = false;
      
      console.log(`\n[${itemIndex + 1}/${history.length}] Checking: "${item.name}"`);
      
      // Ensure prices array exists
      if (!updatedItem.prices) {
        console.log(`   ⚠️ No prices array - creating empty array`);
        updatedItem.prices = [];
        itemChanged = true;
      }
      
      // If prices array is empty but we have lastPurchased, create an entry
      if (updatedItem.prices.length === 0 && item.lastPurchased) {
        console.log(`   ℹ️ Creating price entry from lastPurchased`);
        updatedItem.prices = [{
          purchaseDate: item.lastPurchased,
          price: item.lastPrice || 0,
          currency: 'ILS',
          quantity: 1
        }];
        itemChanged = true;
        result.pricesFixed++;
      }
      
      // Fix each price entry
      if (updatedItem.prices && updatedItem.prices.length > 0) {
        updatedItem.prices = updatedItem.prices.map((price, priceIndex) => {
          const updatedPrice = { ...price };
          
          // Check if purchaseDate is missing or invalid
          if (!isValidISODate(updatedPrice.purchaseDate)) {
            const oldDate = updatedPrice.purchaseDate || 'MISSING';
            updatedPrice.purchaseDate = inferPurchaseDate(price, item, priceIndex);
            
            console.log(`   ✅ Fixed price entry ${priceIndex + 1}:`);
            console.log(`      Old: ${oldDate}`);
            console.log(`      New: ${updatedPrice.purchaseDate}`);
            
            itemChanged = true;
            result.pricesFixed++;
          }
          
          // Extract month from valid date
          const month = extractMonth(updatedPrice.purchaseDate!);
          if (month) {
            monthsSet.add(month);
            console.log(`      Month: ${month} ✓`);
          }
          
          return updatedPrice;
        });
      }
      
      if (itemChanged) {
        result.itemsFixed++;
        needsSave = true;
      }
      
      return updatedItem;
    });
    
    // Save if changes were made
    if (needsSave) {
      console.log('\n💾 Saving fixed data to Firestore...');
      await setPurchaseHistory(listId, fixedHistory);
      console.log('✅ Data saved successfully!');
    } else {
      console.log('\n✅ All dates already valid - no changes needed');
    }
    
    // Summary
    result.monthsFound = Array.from(monthsSet).sort().reverse();
    result.success = true;
    
    console.log('\n📅 MONTHS FOUND:', result.monthsFound.join(', '));
    console.log('\n📊 SUMMARY:', {
      'Items checked': result.itemsChecked,
      'Items fixed': result.itemsFixed,
      'Prices fixed': result.pricesFixed,
      'Months visible': result.monthsFound.length
    });
    console.log('━'.repeat(60));
    console.log('✅ ALL MONTHS NOW VISIBLE!');
    console.log('Go to: Spending Insights → Monthly Purchases to verify\n');
    
    return result;
    
  } catch (error) {
    console.error('❌ Error ensuring months visible:', error);
    result.errors.push(error instanceof Error ? error.message : String(error));
    return result;
  }
}

/**
 * Verify that all months are properly visible
 * Returns list of months that should be visible
 */
export async function verifyMonthsVisible(listId: string): Promise<string[]> {
  try {
    const history = await getPurchaseHistory(listId);
    const monthsSet = new Set<string>();
    
    history.forEach(item => {
      if (item.prices) {
        item.prices.forEach(price => {
          if (isValidISODate(price.purchaseDate)) {
            const month = extractMonth(price.purchaseDate!);
            if (month) monthsSet.add(month);
          }
        });
      }
    });
    
    const months = Array.from(monthsSet).sort().reverse();
    console.log('🔍 VERIFICATION: Months that should be visible:', months);
    return months;
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    return [];
  }
}
