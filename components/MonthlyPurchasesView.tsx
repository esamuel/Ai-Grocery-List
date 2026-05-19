import React, { useState, useMemo } from 'react';
import type { PurchaseHistoryItem } from '../types';
import { getDailyPurchases, type DailyPurchase } from '../services/exportService';
import { getPurchaseHistory, setPurchaseHistory } from '../services/purchaseHistoryService';
import { ensureAllMonthsVisible } from '../services/ensureAllMonthsVisible';
import { auditFirebaseHistory } from '../services/auditFirebaseHistory';
import { recoverHistoryFromActivities } from '../services/recoverHistoryFromActivities';
import { backfillPricesFromAnchors } from '../services/backfillPricesFromAnchors';
import { format } from 'date-fns';
import { he, es } from 'date-fns/locale';

interface MonthlyPurchasesViewProps {
  historyItems: PurchaseHistoryItem[];
  currency: string;
  listId: string;
  onDataChange: () => void;
  language?: 'en' | 'he' | 'es';
  isOwner?: boolean;
  translations: {
    selectMonth: string;
    noMonths: string;
    items: string;
    totalSpent: string;
    shoppingDays: string;
    backToMonths: string;
    backTo: string;
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
  language = 'en',
  isOwner = false,
  translations
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [deletingItem, setDeletingItem] = useState<string | null>(null);
  const [deletingDay, setDeletingDay] = useState<string | null>(null);
  const [repairing, setRepairing] = useState(false);
  const [recoveringActivities, setRecoveringActivities] = useState(false);
  const [backfillingPrices, setBackfillingPrices] = useState(false);

  const handleBackfillPrices = async () => {
    if (!listId || backfillingPrices) return;
    const confirmMsg =
      language === 'he'
        ? 'למלא מחירים חסרים לפי המחירים האמיתיים מאפריל–מאי 2026 (לכל פריט)? מחירים יסומנו ≈'
        : 'Fill missing prices using real Apr–May 2026 prices per item? Filled amounts will show ≈';
    if (!window.confirm(confirmMsg)) return;

    setBackfillingPrices(true);
    try {
      const result = await backfillPricesFromAnchors(listId, ['2026-04', '2026-05']);
      onDataChange();
      const msg =
        language === 'he'
          ? `עודכנו ${result.entriesUpdated} רשומות.\nמאפריל–מאי: ${result.fromAnchorMonth}\nמהיסטוריית פריט: ${result.fromItemHistory}\nברירת מחדל לפי קטגוריה: ${result.fromCategoryDefault}\n\nחודשי עוגן: ${result.anchorMonths.join(', ') || '—'} (${result.anchorItems} פריטים)`
          : `Updated ${result.entriesUpdated} entries.\nFrom Apr–May anchors: ${result.fromAnchorMonth}\nFrom item history: ${result.fromItemHistory}\nCategory default: ${result.fromCategoryDefault}\n\nAnchor months: ${result.anchorMonths.join(', ') || '—'} (${result.anchorItems} items)`;
      alert(msg);
    } catch (e) {
      console.error(e);
      alert(language === 'he' ? 'מילוי מחירים נכשל.' : 'Price backfill failed.');
    } finally {
      setBackfillingPrices(false);
    }
  };

  const handleRecoverFromActivities = async () => {
    if (!listId || recoveringActivities) return;
    const confirmMsg =
      language === 'he'
        ? 'לשחזר חודשים מיומן הפעילות (אוקטובר 2025 ואילך)? מחירים יסומנו כמשוערים אם חסרים.'
        : 'Recover months from your activity log (Oct 2025+)? Missing prices will be marked as estimated.';
    if (!window.confirm(confirmMsg)) return;

    setRecoveringActivities(true);
    try {
      const result = await recoverHistoryFromActivities(listId, currency);
      localStorage.removeItem(`monthsVisibleFix_v4:${listId}`);
      onDataChange();
      const msg =
        language === 'he'
          ? `נוספו ${result.priceEntriesAdded} רשומות מ-${result.activitiesScanned} פעילויות.\n${result.monthsFound.length} חודשים, ${result.uniqueShoppingDays} ימי קניות.\n\n${result.monthsFound.join('\n')}`
          : `Added ${result.priceEntriesAdded} entries from ${result.activitiesScanned} check-offs.\n${result.monthsFound.length} months, ${result.uniqueShoppingDays} shopping days.\n\n${result.monthsFound.join('\n')}`;
      alert(msg);
    } catch (e) {
      console.error(e);
      alert(
        language === 'he'
          ? 'שחזור מיומן הפעילות נכשל. נסה שוב או בדוק חיבור.'
          : 'Activity log recovery failed. Try again or check connection.'
      );
    } finally {
      setRecoveringActivities(false);
    }
  };

  const handleRepairHistory = async () => {
    if (!listId || repairing) return;
    setRepairing(true);
    try {
      localStorage.removeItem(`monthsVisibleFix_v4:${listId}`);
      const audit = await auditFirebaseHistory();
      const result = await ensureAllMonthsVisible(listId);
      onDataChange();
      const otherLists = audit.lists.filter(
        (l) => l.exists && l.listId !== listId && l.uniqueMonths.length > result.monthsFound.length
      );
      let msg =
        language === 'he'
          ? `תוקנו ${result.itemsFixed} פריטים. ${result.monthsFound.length} חודשים, ${result.uniqueShoppingDays} ימי קניות.\n\nחודשים: ${result.monthsFound.join(', ') || '—'}`
          : `Fixed ${result.itemsFixed} items. ${result.monthsFound.length} months, ${result.uniqueShoppingDays} shopping days.\n\nMonths: ${result.monthsFound.join(', ') || '—'}`;
      if (otherLists.length > 0) {
        msg +=
          language === 'he'
            ? `\n\nנמצאה היסטוריה ברשימה אחרת: ${otherLists.map((l) => `${l.listId} (${l.uniqueMonths.length} חודשים)`).join(', ')}`
            : `\n\nMore history on other list(s): ${otherLists.map((l) => `${l.listId} (${l.uniqueMonths.length} mo)`).join(', ')}`;
      }
      msg += `\n\n${audit.recommendation}`;
      alert(msg);
    } catch (e) {
      console.error(e);
      alert(language === 'he' ? 'תיקון ההיסטוריה נכשל' : 'History repair failed');
    } finally {
      setRepairing(false);
    }
  };

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
      const locale = language === 'he' ? he : language === 'es' ? es : undefined;
      const monthLabel = format(date, 'MMMM yyyy', { locale });

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
    const locale = language === 'he' ? he : language === 'es' ? es : undefined;
    const showYear = date.getFullYear() !== new Date().getFullYear();
    const formatStr = showYear ? 'EEE, MMM d, yyyy' : 'EEE, MMM d';
    return format(date, formatStr, { locale });
  };

  const formatCardDate = (dateString: string) => {
    const date = new Date(dateString);
    const locale = language === 'he' ? he : language === 'es' ? es : undefined;
    const weekday = format(date, 'EEE', { locale });
    const day = date.getDate();
    const month = format(date, 'MMM', { locale });
    return { weekday, day, month };
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

  // Level 3: If a specific date is selected, show day detail view
  if (selectedMonth && selectedDate) {
    const monthData = monthlyData.find(m => m.monthKey === selectedMonth);
    if (!monthData) return null;

    const selectedDayPurchases = monthData.dailyPurchases.find(daily => daily.date === selectedDate);
    if (!selectedDayPurchases) return null;

    return (
      <div className="space-y-6">
        {/* Back button */}
        <button
          onClick={() => setSelectedDate('')}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
        >
          <span>←</span>
          {translations.backTo} {monthData.monthLabel}
        </button>

        {/* Day header */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
          <h2 className="text-2xl font-bold mb-2">{formatDate(selectedDate)}</h2>
          <div className="text-3xl font-bold mb-3">
            {getCurrencySymbol()}{selectedDayPurchases.totalSpent.toFixed(2)}
          </div>
          <div className="text-sm opacity-90">
            {selectedDayPurchases.items.length} {translations.items}
          </div>
        </div>

        {/* Items list with delete buttons */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <div className="space-y-2">
            {selectedDayPurchases.items.map((item, idx) => {
              const itemKey = `${item.name}-${selectedDate}`;
              const isDeleting = deletingItem === itemKey;

              return (
                <div key={idx} className="flex justify-between items-start text-sm border-t border-gray-100 pt-3 pb-2 first:border-t-0 first:pt-0 group">
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="font-medium text-gray-700">{item.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {item.store && <span>🏪 {item.store}</span>}
                      {item.quantity && item.unit && (
                        <span className={item.store ? 'ml-2' : ''}>{item.quantity}{item.unit}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right min-w-[80px]">
                      {item.price !== undefined ? (
                        <>
                          <div className="text-gray-800 font-semibold text-base flex items-center justify-end gap-1">
                            {getCurrencySymbol()}{item.price.toFixed(2)}
                            {item.estimatedPrice && (
                              <span className="text-xs text-amber-600" title="Estimated price based on history">≈</span>
                            )}
                          </div>
                          {item.unitPrice && item.unit && (
                            <div className="text-xs text-gray-500 mt-0.5">
                              {getCurrencySymbol()}{item.unitPrice.toFixed(2)}/{item.unit}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                    {isOwner && (
                      <button
                        onClick={() => handleDeletePurchase(item.name, selectedDate, item.price, item.store)}
                        disabled={isDeleting}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded disabled:opacity-50"
                        title={translations.deletePurchase}
                      >
                        {isDeleting ? '⏳' : '🗑️'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Delete entire day button - Only for owners */}
        {isOwner && (
          <button
            onClick={() => {
              handleDeleteDay(selectedDate, selectedDayPurchases.items);
              setSelectedDate(''); // Go back to day grid after deleting
            }}
            disabled={deletingDay === selectedDate}
            className="w-full px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-red-300 transition-colors"
          >
            {deletingDay === selectedDate ? '⏳ Deleting...' : '🗑️ ' + translations.deleteDay}
          </button>
        )}
      </div>
    );
  }

  // Level 2: If a month is selected, show day cards grid
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

        {/* Day Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {monthData.dailyPurchases.map(daily => {
            const { weekday, day, month } = formatCardDate(daily.date);
            return (
              <button
                key={daily.date}
                onClick={() => setSelectedDate(daily.date)}
                className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all text-left"
              >
                <div className="text-sm text-gray-500 mb-1">{weekday}</div>
                <div className="text-3xl font-bold text-gray-800 mb-1">{day}</div>
                <div className="text-sm text-gray-600 mb-3">{month}</div>
                <div className="text-xl font-bold text-blue-600">
                  {getCurrencySymbol()}{daily.totalSpent.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  {daily.items.length} {translations.items}
                </div>
              </button>
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
        <p className="text-gray-500 mb-4">{translations.noMonths}</p>
        {historyItems.length > 0 && (
          <button
            type="button"
            onClick={handleRepairHistory}
            disabled={repairing}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {repairing
              ? (language === 'he' ? 'מתקן...' : 'Repairing...')
              : (language === 'he' ? 'שחזר היסטוריית קניות' : 'Restore purchase history')}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">{translations.selectMonth}</h2>
        {historyItems.length > 0 && (
          <div className="flex flex-col gap-2 w-full max-w-xs">
            <button
              type="button"
              onClick={handleBackfillPrices}
              disabled={backfillingPrices || recoveringActivities || repairing}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {backfillingPrices
                ? (language === 'he' ? 'ממלא מחירים...' : 'Filling prices...')
                : (language === 'he' ? '💰 מלא מחירים מאפריל–מאי 2026' : '💰 Fill prices from Apr–May 2026')}
            </button>
            {monthlyData.length <= 3 && (
              <>
                <button
                  type="button"
                  onClick={handleRecoverFromActivities}
                  disabled={recoveringActivities || repairing || backfillingPrices}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {recoveringActivities
                    ? (language === 'he' ? 'משחזר מיומן...' : 'Recovering from log...')
                    : (language === 'he' ? '📅 שחזר מיומן קניות (אוק׳ 2025+)' : '📅 Recover from activity log (Oct 2025+)')}
                </button>
                <button
                  type="button"
                  onClick={handleRepairHistory}
                  disabled={repairing || recoveringActivities || backfillingPrices}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 disabled:opacity-50"
                >
                  {repairing
                    ? (language === 'he' ? 'מתקן היסטוריה...' : 'Repairing history...')
                    : (language === 'he' ? '🔄 תיקון תאריכים' : '🔄 Fix dates')}
                </button>
              </>
            )}
          </div>
        )}
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
