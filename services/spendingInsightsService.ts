import type { PurchaseHistoryItem } from '../types';
import { normalizeCategory } from './categoryTranslations';

export interface SpendingInsight {
  totalSpent: number;
  itemCount: number;
  averagePerItem: number;
  currency: string;
}

export interface CategorySpending {
  category: string;
  total: number;
  itemCount: number;
  percentage: number;
}

export interface WeeklyTrend {
  thisWeek: number;
  lastWeek: number;
  change: number;
  changePercent: number;
}

export interface MonthlyTrend {
  thisMonth: number;
  lastMonth: number;
  change: number;
  changePercent: number;
}

// Get start and end of current month
function getCurrentMonthRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return { start, end };
}

// Get last month range
function getLastMonthRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  return { start, end };
}

// Get start and end of current week (Sunday to Saturday)
function getCurrentWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - dayOfWeek);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
}

// Get last week range
function getLastWeekRange(): { start: Date; end: Date } {
  const thisWeek = getCurrentWeekRange();
  const start = new Date(thisWeek.start);
  start.setDate(start.getDate() - 7);
  
  const end = new Date(thisWeek.start);
  end.setTime(end.getTime() - 1);
  
  return { start, end };
}

// Calculate total spending for items within a date range
function calculateSpendingInRange(
  items: PurchaseHistoryItem[],
  start: Date,
  end: Date,
  currency: string
): number {
  let total = 0;

  items.forEach(item => {
    if (!item.prices || item.prices.length === 0) return;

    // Sum up all purchases within the date range
    item.prices.forEach(priceEntry => {
      // Skip entries without purchaseDate
      if (!priceEntry.purchaseDate) return;

      const purchaseDate = new Date(priceEntry.purchaseDate);

      // Skip entries with invalid dates
      if (isNaN(purchaseDate.getTime())) return;

      // Only count entries with price data and matching currency
      if (purchaseDate >= start && purchaseDate <= end &&
          priceEntry.price !== undefined &&
          priceEntry.currency === currency) {
        total += priceEntry.price * (priceEntry.quantity || 1);
      }
    });
  });

  return total;
}

// Count items purchased in range
function countItemsInRange(
  items: PurchaseHistoryItem[],
  start: Date,
  end: Date
): number {
  let count = 0;

  items.forEach(item => {
    if (!item.prices || item.prices.length === 0) return;

    item.prices.forEach(priceEntry => {
      // Skip entries without purchaseDate
      if (!priceEntry.purchaseDate) return;

      const purchaseDate = new Date(priceEntry.purchaseDate);

      // Skip entries with invalid dates
      if (isNaN(purchaseDate.getTime())) return;

      if (purchaseDate >= start && purchaseDate <= end) {
        count += priceEntry.quantity || 1;
      }
    });
  });

  return count;
}

// Get monthly spending summary
export function getMonthlySpending(
  historyItems: PurchaseHistoryItem[],
  currency: string
): SpendingInsight {
  const { start, end } = getCurrentMonthRange();
  const totalSpent = calculateSpendingInRange(historyItems, start, end, currency);
  const itemCount = countItemsInRange(historyItems, start, end);
  const averagePerItem = itemCount > 0 ? totalSpent / itemCount : 0;
  
  return {
    totalSpent,
    itemCount,
    averagePerItem,
    currency,
  };
}

// Detect language from category names
function detectLanguage(items: PurchaseHistoryItem[]): 'en' | 'he' | 'es' {
  for (const item of items) {
    if (item.category) {
      // Hebrew Unicode range
      if (/[\u0590-\u05FF]/.test(item.category)) return 'he';
      // Spanish specific characters
      if (/[ñáéíóúüÑÁÉÍÓÚÜ¿¡]/.test(item.category)) return 'es';
    }
  }
  return 'en';
}

// Get spending by category for current month
export function getCategoryBreakdown(
  historyItems: PurchaseHistoryItem[],
  currency: string
): CategorySpending[] {
  const { start, end } = getCurrentMonthRange();
  const categoryTotals = new Map<string, { total: number; count: number }>();
  let grandTotal = 0;

  // Detect the language from items
  const language = detectLanguage(historyItems);

  historyItems.forEach(item => {
    if (!item.prices || item.prices.length === 0) return;

    let itemTotal = 0;
    let itemCount = 0;

    item.prices.forEach(priceEntry => {
      // Skip entries without purchaseDate
      if (!priceEntry.purchaseDate) return;

      const purchaseDate = new Date(priceEntry.purchaseDate);

      // Skip entries with invalid dates
      if (isNaN(purchaseDate.getTime())) return;

      // Only count entries with price data
      if (purchaseDate >= start && purchaseDate <= end &&
          priceEntry.price !== undefined &&
          priceEntry.currency === currency) {
        const amount = priceEntry.price * (priceEntry.quantity || 1);
        itemTotal += amount;
        itemCount += priceEntry.quantity || 1;
        grandTotal += amount;
      }
    });

    if (itemTotal > 0) {
      // Normalize the category name to combine similar categories
      const rawCategory = item.category || 'Uncategorized';
      const category = normalizeCategory(rawCategory, language);
      const existing = categoryTotals.get(category) || { total: 0, count: 0 };
      categoryTotals.set(category, {
        total: existing.total + itemTotal,
        count: existing.count + itemCount,
      });
    }
  });
  
  // Convert to array and calculate percentages
  const breakdown: CategorySpending[] = [];
  categoryTotals.forEach((value, category) => {
    breakdown.push({
      category,
      total: value.total,
      itemCount: value.count,
      percentage: grandTotal > 0 ? (value.total / grandTotal) * 100 : 0,
    });
  });
  
  // Sort by total (highest first)
  breakdown.sort((a, b) => b.total - a.total);
  
  return breakdown;
}

// Get weekly spending trend
export function getWeeklyTrend(
  historyItems: PurchaseHistoryItem[],
  currency: string
): WeeklyTrend {
  const thisWeek = getCurrentWeekRange();
  const lastWeek = getLastWeekRange();

  const thisWeekSpending = calculateSpendingInRange(historyItems, thisWeek.start, thisWeek.end, currency);
  const lastWeekSpending = calculateSpendingInRange(historyItems, lastWeek.start, lastWeek.end, currency);

  const change = thisWeekSpending - lastWeekSpending;
  const changePercent = lastWeekSpending > 0 ? (change / lastWeekSpending) * 100 : 0;

  return {
    thisWeek: thisWeekSpending,
    lastWeek: lastWeekSpending,
    change,
    changePercent,
  };
}

// Get monthly spending trend
export function getMonthlyTrend(
  historyItems: PurchaseHistoryItem[],
  currency: string
): MonthlyTrend {
  const thisMonth = getCurrentMonthRange();
  const lastMonth = getLastMonthRange();

  const thisMonthSpending = calculateSpendingInRange(historyItems, thisMonth.start, thisMonth.end, currency);
  const lastMonthSpending = calculateSpendingInRange(historyItems, lastMonth.start, lastMonth.end, currency);

  const change = thisMonthSpending - lastMonthSpending;
  const changePercent = lastMonthSpending > 0 ? (change / lastMonthSpending) * 100 : 0;

  return {
    thisMonth: thisMonthSpending,
    lastMonth: lastMonthSpending,
    change,
    changePercent,
  };
}

// Get currency symbol
export function getCurrencySymbol(currency: string): string {
  switch (currency) {
    case 'USD': return '$';
    case 'ILS': return '₪';
    case 'EUR': return '€';
    case 'GBP': return '£';
    default: return currency;
  }
}

