import type { PurchaseHistoryItem } from '../types';

export interface DailyPurchase {
  date: string; // YYYY-MM-DD format
  items: Array<{
    name: string;
    category: string;
    price?: number;
    currency?: string;
    store?: string;
    quantity?: number;
    unit?: string;
    unitPrice?: number;
  }>;
  totalSpent: number;
  currency: string;
}

export interface MonthlySummary {
  month: string; // YYYY-MM format
  totalSpent: number;
  totalItems: number;
  uniqueStores: string[];
  topCategories: Array<{ category: string; count: number; spent: number }>;
  dailyBreakdown: DailyPurchase[];
}

// Get all purchases grouped by date
export function getDailyPurchases(
  historyItems: PurchaseHistoryItem[], 
  currency: string = 'ILS'
): DailyPurchase[] {
  const dailyMap = new Map<string, DailyPurchase>();
  
  console.log('📋 getDailyPurchases called with', historyItems.length, 'items');
  let itemsProcessed = 0;
  let itemsSkipped = 0;
  let pricesProcessed = 0;
  let pricesSkipped = 0;
  
  historyItems.forEach((item, idx) => {
    console.log(`\n[${idx + 1}/${historyItems.length}] Item: "${item.name}"`);
    console.log(`    prices array: ${item.prices ? `YES (${item.prices.length} entries)` : 'NO'}`);
    
    if (!item.prices) {
      console.log(`    ❌ NO PRICES ARRAY - SKIPPING`);
      itemsSkipped++;
      return;
    }
    
    itemsProcessed++;

    item.prices.forEach((priceEntry, priceIdx) => {
      console.log(`    Price entry ${priceIdx + 1}: purchaseDate = ${priceEntry.purchaseDate || 'MISSING'}`);
      
      // Validate date before processing
      if (!priceEntry.purchaseDate) {
        console.log(`    ❌ NO PURCHASEDATE - SKIPPING`);
        pricesSkipped++;
        return;
      }

      const purchaseDate = new Date(priceEntry.purchaseDate);

      // Check if date is valid
      if (isNaN(purchaseDate.getTime())) {
        console.log(`    ❌ INVALID DATE - SKIPPING`);
        pricesSkipped++;
        return;
      }
      
      pricesProcessed++;
      const date = purchaseDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const month = purchaseDate.toISOString().substring(0, 7); // YYYY-MM
      console.log(`    ✅ VALID: ${date} (Month: ${month})`);

      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          items: [],
          totalSpent: 0,
          currency: priceEntry.currency || currency
        });
      }

      const daily = dailyMap.get(date)!;
      const itemPrice = priceEntry.price; // IMPORTANT: This is already the TOTAL price paid, not unit price
      const quantity = priceEntry.quantity || 1;
      
      // Price is the TOTAL paid, so we add it directly (not multiply by quantity)
      const totalPrice = itemPrice || 0;

      daily.items.push({
        name: item.name,
        category: item.category,
        price: itemPrice, // Can be undefined
        currency: priceEntry.currency || currency,
        store: priceEntry.store,
        quantity,
        unit: priceEntry.unit,
        unitPrice: priceEntry.unitPrice
      });

      daily.totalSpent += totalPrice;
    });
  });
  
  // Sort by date (newest first)
  const result = Array.from(dailyMap.values())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  console.log(`\n📊 getDailyPurchases SUMMARY:`);
  console.log(`   Total items checked: ${historyItems.length}`);
  console.log(`   Items processed: ${itemsProcessed}`);
  console.log(`   Items skipped: ${itemsSkipped}`);
  console.log(`   Prices processed: ${pricesProcessed}`);
  console.log(`   Prices skipped: ${pricesSkipped}`);
  console.log(`   Days found: ${result.length}`);
  console.log(`   Months found: ${new Set(result.map(d => d.date.substring(0, 7))).size}`);
  result.forEach(day => {
    const month = day.date.substring(0, 7);
    console.log(`   - ${day.date} (${month}): ${day.items.length} items`);
  });
  
  return result;
}

// Get monthly summary
export function getMonthlySummary(
  historyItems: PurchaseHistoryItem[],
  year: number,
  month: number, // 0-11
  currency: string = 'ILS'
): MonthlySummary {
  const dailyPurchases = getDailyPurchases(historyItems, currency);
  
  // Filter for the specific month
  const targetMonth = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthlyPurchases = dailyPurchases.filter(daily => 
    daily.date.startsWith(targetMonth)
  );
  
  // Calculate statistics
  const totalSpent = monthlyPurchases.reduce((sum, daily) => sum + daily.totalSpent, 0);
  const totalItems = monthlyPurchases.reduce((sum, daily) => sum + daily.items.length, 0);
  
  // Get unique stores
  const stores = new Set<string>();
  monthlyPurchases.forEach(daily => {
    daily.items.forEach(item => {
      if (item.store) stores.add(item.store);
    });
  });
  
  // Get top categories
  // IMPORTANT: price is the TOTAL paid, not unit price
  const categoryMap = new Map<string, { count: number; spent: number }>();
  monthlyPurchases.forEach(daily => {
    daily.items.forEach(item => {
      const existing = categoryMap.get(item.category) || { count: 0, spent: 0 };
      categoryMap.set(item.category, {
        count: existing.count + 1,
        spent: existing.spent + (item.price || 0) // Price is already total, don't multiply
      });
    });
  });
  
  const topCategories = Array.from(categoryMap.entries())
    .map(([category, data]) => ({ category, ...data }))
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 5);
  
  return {
    month: targetMonth,
    totalSpent,
    totalItems,
    uniqueStores: Array.from(stores),
    topCategories,
    dailyBreakdown: monthlyPurchases
  };
}

// Export daily purchases to CSV
export function exportDailyPurchasesToCSV(dailyPurchases: DailyPurchase[]): string {
  const headers = ['Date', 'Item', 'Category', 'Price', 'Currency', 'Store', 'Quantity', 'Total'];
  const rows = [headers.join(',')];
  
  dailyPurchases.forEach(daily => {
    daily.items.forEach(item => {
      // Price is already the TOTAL paid, so use it directly (not multiply by quantity)
      const total = item.price || 0;
      rows.push([
        daily.date,
        `"${item.name}"`,
        `"${item.category}"`,
        item.price || '',
        item.currency || '',
        `"${item.store || ''}"`,
        item.quantity || 1,
        total
      ].join(','));
    });
  });
  
  return rows.join('\n');
}

// Export monthly summary to CSV
export function exportMonthlySummaryToCSV(summary: MonthlySummary): string {
  const headers = ['Month', 'Total Spent', 'Total Items', 'Unique Stores', 'Top Category', 'Top Category Spent'];
  const rows = [headers.join(',')];
  
  const topCategory = summary.topCategories[0];
  rows.push([
    summary.month,
    summary.totalSpent,
    summary.totalItems,
    summary.uniqueStores.join('; '),
    `"${topCategory?.category || ''}"`,
    topCategory?.spent || 0
  ].join(','));
  
  return rows.join('\n');
}

// Generate spending report text
export function generateSpendingReport(
  dailyPurchases: DailyPurchase[],
  period: 'week' | 'month' | 'year' = 'month'
): string {
  const now = new Date();
  const periodStart = new Date();
  
  switch (period) {
    case 'week':
      periodStart.setDate(now.getDate() - 7);
      break;
    case 'month':
      periodStart.setMonth(now.getMonth() - 1);
      break;
    case 'year':
      periodStart.setFullYear(now.getFullYear() - 1);
      break;
  }
  
  const recentPurchases = dailyPurchases.filter(daily => 
    new Date(daily.date) >= periodStart
  );
  
  const totalSpent = recentPurchases.reduce((sum, daily) => sum + daily.totalSpent, 0);
  const totalItems = recentPurchases.reduce((sum, daily) => sum + daily.items.length, 0);
  const avgPerDay = totalSpent / Math.max(recentPurchases.length, 1);
  
  const stores = new Set<string>();
  recentPurchases.forEach(daily => {
    daily.items.forEach(item => {
      if (item.store) stores.add(item.store);
    });
  });
  
  let report = `📊 Spending Report (Last ${period})\n`;
  report += `================================\n\n`;
  report += `💰 Total Spent: ${getCurrencySymbol(recentPurchases[0]?.currency || 'ILS')}${totalSpent.toFixed(2)}\n`;
  report += `🛒 Total Items: ${totalItems}\n`;
  report += `📅 Shopping Days: ${recentPurchases.length}\n`;
  report += `📈 Average per Day: ${getCurrencySymbol(recentPurchases[0]?.currency || 'ILS')}${avgPerDay.toFixed(2)}\n`;
  report += `🏪 Stores Visited: ${stores.size}\n\n`;
  
  if (recentPurchases.length > 0) {
    report += `📅 Recent Shopping Days:\n`;
    recentPurchases.slice(0, 7).forEach(daily => {
      report += `• ${formatDate(daily.date)}: ${getCurrencySymbol(daily.currency)}${daily.totalSpent.toFixed(2)} (${daily.items.length} items)\n`;
    });
  }
  
  return report;
}

// Helper functions
function getCurrencySymbol(currency: string): string {
  switch (currency) {
    case 'USD': return '$';
    case 'ILS': return '₪';
    case 'EUR': return '€';
    case 'GBP': return '£';
    default: return currency;
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  });
}
