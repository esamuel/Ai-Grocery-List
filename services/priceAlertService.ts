import type { PurchaseHistoryItem } from '../types';

export type PriceAlertType = 'best-deal' | 'good-deal' | 'price-spike' | 'normal';

export interface PriceAlert {
  type: PriceAlertType;
  message: string;
  percentChange?: number;
}

export interface PriceAlertTranslations {
  bestPriceEver: string;
  greatDeal: string;
  priceIncreased: string;
  higherThanUsual: string;
}

/**
 * Analyze price and return alert if needed
 * @param item - Purchase history item with price data
 * @returns PriceAlert or null if no alert needed
 */
export function analyzePriceAlert(item: PurchaseHistoryItem): PriceAlert | null {
  // No price data? No alert
  if (!item.lastPrice || !item.avgPrice || !item.prices || item.prices.length < 2) {
    return null;
  }

  const lastPrice = item.lastPrice;
  const avgPrice = item.avgPrice;
  const lowestPrice = item.lowestPrice || avgPrice;
  const highestPrice = item.highestPrice || avgPrice;

  // Calculate percentage change from average
  const percentFromAvg = ((lastPrice - avgPrice) / avgPrice) * 100;

  // 🎉 BEST DEAL: At or near lowest price ever (within 2%)
  if (lastPrice <= lowestPrice * 1.02) {
    return {
      type: 'best-deal',
      message: 'Best Price Ever!',
      percentChange: percentFromAvg,
    };
  }

  // 💚 GOOD DEAL: Significantly below average (>10% cheaper)
  if (lastPrice < avgPrice * 0.9) {
    return {
      type: 'good-deal',
      message: 'Great Deal!',
      percentChange: percentFromAvg,
    };
  }

  // 📈 PRICE SPIKE: Significantly above average (>15% more expensive)
  if (lastPrice > avgPrice * 1.15) {
    return {
      type: 'price-spike',
      message: 'Price Increased',
      percentChange: percentFromAvg,
    };
  }

  // 🔶 MODERATE SPIKE: Above average but not extreme (10-15% more)
  if (lastPrice > avgPrice * 1.1) {
    return {
      type: 'price-spike',
      message: 'Higher Than Usual',
      percentChange: percentFromAvg,
    };
  }

  // No significant change
  return null;
}

/**
 * Get price trend for Smart Suggestions
 * Returns trend indicator and whether it's a good time to buy
 */
export interface PriceTrend {
  trend: 'rising' | 'falling' | 'stable';
  goodTimeToBuy: boolean;
  badge?: string;
}

export function getPriceTrend(item: PurchaseHistoryItem): PriceTrend | null {
  if (!item.prices || item.prices.length < 3) {
    return null;
  }

  // Look at last 3 purchases to determine trend
  const recentPrices = item.prices.slice(-3).map(p => p.price);
  const oldest = recentPrices[0];
  const newest = recentPrices[recentPrices.length - 1];
  const change = ((newest - oldest) / oldest) * 100;

  // Falling prices (good time to buy)
  if (change < -5) {
    return {
      trend: 'falling',
      goodTimeToBuy: true,
      badge: '📉 Price Dropping',
    };
  }

  // Rising prices (might want to stock up)
  if (change > 5) {
    return {
      trend: 'rising',
      goodTimeToBuy: false,
      badge: '📈 Price Rising',
    };
  }

  // Stable
  return {
    trend: 'stable',
    goodTimeToBuy: true,
    badge: undefined,
  };
}

/**
 * Format price alert badge with emoji and color class
 */
export function formatPriceAlertBadge(alert: PriceAlert, translations?: PriceAlertTranslations): {
  emoji: string;
  text: string;
  className: string;
} {
  // Use translations if provided, otherwise fallback to English
  const getText = (type: PriceAlertType): string => {
    if (!translations) return alert.message;
    
    switch (type) {
      case 'best-deal':
        return translations.bestPriceEver;
      case 'good-deal':
        return translations.greatDeal;
      case 'price-spike':
        return alert.message === 'Price Increased' ? translations.priceIncreased : translations.higherThanUsual;
      default:
        return alert.message;
    }
  };
  
  switch (alert.type) {
    case 'best-deal':
      return {
        emoji: '🎉',
        text: getText('best-deal'),
        className: 'bg-green-100 text-green-800 border-green-300',
      };
    case 'good-deal':
      return {
        emoji: '💚',
        text: getText('good-deal'),
        className: 'bg-green-50 text-green-700 border-green-200',
      };
    case 'price-spike':
      return {
        emoji: '📈',
        text: getText('price-spike'),
        className: 'bg-orange-100 text-orange-800 border-orange-300',
      };
    default:
      return {
        emoji: '',
        text: '',
        className: 'bg-gray-100 text-gray-600',
      };
  }
}

/**
 * Get items with price alerts (sorted by alert priority)
 */
export function getItemsWithAlerts(items: PurchaseHistoryItem[]): Array<{
  item: PurchaseHistoryItem;
  alert: PriceAlert;
}> {
  const alertItems: Array<{ item: PurchaseHistoryItem; alert: PriceAlert }> = [];

  items.forEach(item => {
    const alert = analyzePriceAlert(item);
    if (alert) {
      alertItems.push({ item, alert });
    }
  });

  // Sort by priority: best-deal > good-deal > price-spike
  const priority = { 'best-deal': 1, 'good-deal': 2, 'price-spike': 3, 'normal': 4 };
  alertItems.sort((a, b) => priority[a.alert.type] - priority[b.alert.type]);

  return alertItems;
}

