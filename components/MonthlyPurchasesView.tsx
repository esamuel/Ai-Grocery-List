import React, { useState, useMemo } from 'react';
import type { PurchaseHistoryItem } from '../types';
import { getDailyPurchases, type DailyPurchase } from '../services/exportService';
import { getPurchaseHistory, setPurchaseHistory } from '../services/purchaseHistoryService';

interface MonthlyPurchasesViewProps {
  historyItems: PurchaseHistoryItem[];
  currency: string;
  listId: string;
  onDataChange: () => void;
  translations: {
    selectMonth: string;
    noMonths: string;
    items: string;
    totalSpent: string;
    shoppingDays: string;
    backToMonths: string;
    deletePurchase: string;
    confirmDelete: string;
    deleteDay: string;
    confirmDeleteDay: string;
  };
}

interface MonthData {
  monthKey: string; // YYYY-MM
  monthLabel: string; // "October 2025"
  totalSpent: number;
  itemCount: number;
  shoppingDays: number;
  dailyPurchases: DailyPurchase[];
}

export const MonthlyPurchasesView: React.FC<MonthlyPurchasesViewProps> = ({
  historyItems,
  currency,
  listId,
  onDataChange,
  translations
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] = useState<string | null>(null);
  const [deletingDay, setDeletingDay] = useState<string | null>(null);

  // Get all daily purchases
  const dailyPurchases = useMemo(() => {
    return getDailyPurchases(historyItems, currency);
  }, [historyItems, currency]);

  // Group by month
  const monthlyData = useMemo(() => {
    const monthMap = new Map<string, MonthData>();

    dailyPurchases.forEach(daily => {
      const date = new Date(daily.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {
          monthKey,
          monthLabel,
          totalSpent: 0,
          itemCount: 0,
          shoppingDays: 0,
          dailyPurchases: []
        });
      }

      const monthData = monthMap.get(monthKey)!;
      monthData.totalSpent += daily.totalSpent;
      monthData.itemCount += daily.items.length;
      monthData.shoppingDays += 1;
      monthData.dailyPurchases.push(daily);
    });

    // Convert to array and sort by month (newest first)
    return Array.from(monthMap.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [dailyPurchases]);

  const getCurrencySymbol = () => {
    switch (currency) {
      case 'USD': return '$';
      case 'ILS': return '₪';
      case 'EUR': return '€';
      case 'GBP': return '£';
      default: return currency;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  const handleDeletePurchase = async (itemName: string, purchaseDate: string, itemPrice?: number, itemStore?: string) => {
    if (!window.confirm(translations.confirmDelete)) {
      return;
    }

    setDeletingItem(`${itemName}-${purchaseDate}`);

    try {
      // Load current history
      const history = await getPurchaseHistory(listId);

      // Find the item and remove the specific price entry
      const updatedHistory = history.map(item => {
        if (item.name === itemName && item.prices) {
          // Filter out the first matching price entry for this specific date/price/store
          // Compare dates by converting both to YYYY-MM-DD format
          const targetDate = purchaseDate; // Already in YYYY-MM-DD format
          let foundMatch = false;
          const updatedPrices = item.prices.filter(p => {
            if (!p.purchaseDate) return true; // Keep entries without dates
            const entryDate = new Date(p.purchaseDate).toISOString().split('T')[0];

            // Only remove the first matching entry
            if (!foundMatch && entryDate === targetDate && p.price === itemPrice && p.store === itemStore) {
              foundMatch = true;
              return false; // Remove this entry
            }
            return true; // Keep this entry
          });

          // Update frequency to match price entries
          const newFrequency = updatedPrices.length;

          // If no more purchases, we can optionally remove the item entirely
          // or keep it with frequency 0
          if (newFrequency === 0) {
            return {
              ...item,
              frequency: 0,
              prices: [],
              lastPurchased: '',
              firstPurchased: '',
              lastPrice: undefined,
              avgPrice: undefined,
              lowestPrice: undefined,
              highestPrice: undefined
            };
          }

          // Recalculate statistics
          const validPrices = updatedPrices.filter(p => p.price !== undefined).map(p => p.price!);
          const newLastPurchased = updatedPrices[updatedPrices.length - 1]?.purchaseDate || item.lastPurchased;
          const newFirstPurchased = updatedPrices[0]?.purchaseDate || item.firstPurchased;

          return {
            ...item,
            frequency: newFrequency,
            prices: updatedPrices,
            lastPurchased: newLastPurchased,
            firstPurchased: newFirstPurchased,
            lastPrice: validPrices.length > 0 ? validPrices[validPrices.length - 1] : undefined,
            avgPrice: validPrices.length > 0 ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length : undefined,
            lowestPrice: validPrices.length > 0 ? Math.min(...validPrices) : undefined,
            highestPrice: validPrices.length > 0 ? Math.max(...validPrices) : undefined
          };
        }
        return item;
      });

      // Save updated history
      await setPurchaseHistory(listId, updatedHistory);

      // Notify parent to refresh
      onDataChange();

      console.log(`✅ Deleted purchase: ${itemName} on ${purchaseDate}`);
    } catch (error) {
      console.error('❌ Failed to delete purchase:', error);
      alert('Failed to delete purchase. Please try again.');
    } finally {
      setDeletingItem(null);
    }
  };

  const handleDeleteDay = async (date: string, itemsToDelete: Array<{ name: string; price?: number; store?: string }>) => {
    if (!window.confirm(translations.confirmDeleteDay)) {
      return;
    }

    setDeletingDay(date);

    try {
      const history = await getPurchaseHistory(listId);

      // Delete all items for this specific date
      const updatedHistory = history.map(item => {
        if (!item.prices) return item;

        // Find all purchases for this item on this date
        const targetDate = date; // Already in YYYY-MM-DD format
        const updatedPrices = item.prices.filter(p => {
          if (!p.purchaseDate) return true;
          const entryDate = new Date(p.purchaseDate).toISOString().split('T')[0];
          // Keep prices that are NOT from this date
          return entryDate !== targetDate;
        });

        const newFrequency = updatedPrices.length;

        // If no more purchases, reset the item
        if (newFrequency === 0) {
          return {
            ...item,
            frequency: 0,
            prices: [],
            lastPurchased: '',
            firstPurchased: '',
            lastPrice: undefined,
            avgPrice: undefined,
            lowestPrice: undefined,
            highestPrice: undefined
          };
        }

        // Recalculate statistics
        const validPrices = updatedPrices.filter(p => p.price !== undefined).map(p => p.price!);
        const newLastPurchased = updatedPrices[updatedPrices.length - 1]?.purchaseDate || item.lastPurchased;
        const newFirstPurchased = updatedPrices[0]?.purchaseDate || item.firstPurchased;

        return {
          ...item,
          frequency: newFrequency,
          prices: updatedPrices,
          lastPurchased: newLastPurchased,
          firstPurchased: newFirstPurchased,
          lastPrice: validPrices.length > 0 ? validPrices[validPrices.length - 1] : undefined,
          avgPrice: validPrices.length > 0 ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length : undefined,
          lowestPrice: validPrices.length > 0 ? Math.min(...validPrices) : undefined,
          highestPrice: validPrices.length > 0 ? Math.max(...validPrices) : undefined
        };
      });

      await setPurchaseHistory(listId, updatedHistory);
      onDataChange();

      console.log(`✅ Deleted all purchases for ${date}`);
    } catch (error) {
      console.error('❌ Failed to delete day:', error);
      alert('Failed to delete day. Please try again.');
    } finally {
      setDeletingDay(null);
    }
  };

  // If a month is selected, show its daily purchases
  if (selectedMonth) {
    const monthData = monthlyData.find(m => m.monthKey === selectedMonth);
    if (!monthData) return null;

    return (
      <div className="space-y-6">
        {/* Back button */}
        <button
          onClick={() => setSelectedMonth(null)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
        >
          <span>←</span>
          {translations.backToMonths}
        </button>

        {/* Month header */}
        <div className="text-center bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
          <h2 className="text-2xl font-bold mb-2">{monthData.monthLabel}</h2>
          <div className="text-3xl font-bold mb-3">
            {getCurrencySymbol()}{monthData.totalSpent.toFixed(2)}
          </div>
          <div className="flex justify-center gap-6 text-sm opacity-90">
            <span>{monthData.shoppingDays} {translations.shoppingDays}</span>
            <span>{monthData.itemCount} {translations.items}</span>
          </div>
        </div>

        {/* Daily purchases list */}
        <div className="space-y-4">
          {monthData.dailyPurchases.map(daily => {
            const isDeletingThisDay = deletingDay === daily.date;

            return (
              <div key={daily.date} className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 group">
                <div className="flex justify-between items-center mb-3">
                  <div className="text-lg font-semibold text-gray-800">
                    {formatDate(daily.date)}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xl font-bold text-blue-600">
                      {getCurrencySymbol()}{daily.totalSpent.toFixed(2)}
                    </div>
                    <button
                      onClick={() => handleDeleteDay(daily.date, daily.items)}
                      disabled={isDeletingThisDay}
                      className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded border border-red-300 disabled:opacity-50"
                      title={translations.deleteDay}
                    >
                      {isDeletingThisDay ? '⏳' : '🗑️ Delete Day'}
                    </button>
                  </div>
                </div>

              <div className="space-y-2">
                {daily.items.map((item, idx) => {
                  const itemKey = `${item.name}-${daily.date}`;
                  const isDeleting = deletingItem === itemKey;

                  return (
                    <div key={idx} className="flex justify-between items-start text-sm border-t border-gray-100 pt-2 group">
                      <div className="flex-1">
                        <div className="font-medium text-gray-700">{item.name}</div>
                        <div className="text-xs text-gray-500">
                          {item.store && <span>{item.store}</span>}
                          {item.quantity && item.quantity > 1 && (
                            <span className="ml-2">× {item.quantity}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-gray-600 font-medium">
                          {item.price !== undefined ? (
                            <span>{getCurrencySymbol()}{(item.price * (item.quantity || 1)).toFixed(2)}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeletePurchase(item.name, daily.date, item.price, item.store)}
                          disabled={isDeleting}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded disabled:opacity-50"
                          title={translations.deletePurchase}
                        >
                          {isDeleting ? '⏳' : '🗑️'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Show month selection grid
  if (monthlyData.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">📅</div>
        <p className="text-gray-500">{translations.noMonths}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800">{translations.selectMonth}</h2>
      </div>

      {/* Month cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {monthlyData.map(month => (
          <button
            key={month.monthKey}
            onClick={() => setSelectedMonth(month.monthKey)}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all text-left"
          >
            <div className="text-lg font-bold text-gray-800 mb-2">
              {month.monthLabel}
            </div>
            <div className="text-2xl font-bold text-blue-600 mb-3">
              {getCurrencySymbol()}{month.totalSpent.toFixed(2)}
            </div>
            <div className="flex gap-4 text-sm text-gray-600">
              <span>📅 {month.shoppingDays} days</span>
              <span>🛒 {month.itemCount} items</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
