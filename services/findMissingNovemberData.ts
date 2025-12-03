import type { PurchaseHistoryItem } from '../types';

/**
 * This service searches the already-loaded history items
 * to find where November data went
 */
export async function findMissingNovemberData(historyItems: PurchaseHistoryItem[]): Promise<void> {
  console.log('\n🔍🔍🔍 SEARCHING FOR MISSING NOVEMBER DATA 🔍🔍🔍\n');
  
  try {
    // Check the items already loaded in state
    console.log('📍 Checking: Currently loaded purchase history');
    const allHistory = historyItems;
    
    console.log(`   Total items in purchase history: ${allHistory.length}`);
    
    let novemberCount = 0;
    let decemberCount = 0;
    let noDateCount = 0;
    const foundMonths = new Set<string>();
    
    allHistory.forEach((item) => {
      console.log(`\n   📦 Item: "${item.name}"`);
      
      if (!item.prices || item.prices.length === 0) {
        console.log(`      ⚠️  NO prices array or empty!`);
        noDateCount++;
        return;
      }
      
      console.log(`      Prices: ${item.prices.length} entries`);
      
      item.prices.forEach((price, idx) => {
        const dateStr = price.purchaseDate || 'MISSING';
        console.log(`        [${idx + 1}] purchaseDate: ${dateStr}`);
        
        if (price.purchaseDate) {
          try {
            const date = new Date(price.purchaseDate);
            const monthYear = date.toISOString().substring(0, 7); // YYYY-MM
            foundMonths.add(monthYear);
            
            if (monthYear.includes('2024-11')) {
              novemberCount++;
              console.log(`            ✅ NOVEMBER FOUND: ${monthYear}`);
            } else if (monthYear.includes('2024-12')) {
              decemberCount++;
              console.log(`            ✅ December: ${monthYear}`);
            }
          } catch (e) {
            console.log(`            ❌ Invalid date format`);
          }
        }
      });
    });
    
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 SEARCH RESULTS:`);
    console.log(`   Total items: ${allHistory.length}`);
    console.log(`   November prices found: ${novemberCount}`);
    console.log(`   December prices found: ${decemberCount}`);
    console.log(`   Items with NO dates: ${noDateCount}`);
    console.log(`   Months found: ${Array.from(foundMonths).join(', ')}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
    if (novemberCount === 0 && noDateCount > 0) {
      console.log(`🔴 PROBLEM: Found ${noDateCount} items with NO dates!`);
      console.log(`   These are likely November items that lost their dates\n`);
    }
    
    if (novemberCount === 0 && noDateCount === 0) {
      console.log(`🔴 PROBLEM: No November data found in purchaseHistory!`);
      console.log(`   November items might be stored differently\n`);
    }
    
  } catch (error) {
    console.error('❌ Error searching for November data:', error);
  }
}

