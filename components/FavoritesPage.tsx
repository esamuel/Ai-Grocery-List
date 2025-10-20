
import React, { useState, useMemo } from 'react';
import type { PurchaseHistoryItem } from '../types';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { TrashIcon } from './icons/TrashIcon';
import { StarIcon } from './icons/StarIcon';
import { analyzePriceAlert, formatPriceAlertBadge } from '../services/priceAlertService';
import { getCurrencySymbol } from '../services/spendingInsightsService';
import { getStoreBadge } from '../services/storeComparisonService';
import { getStarterItemsByLanguage } from '../data/starterItems';

interface FavoritesPageProps {
  historyItems: PurchaseHistoryItem[];
  onAddItem: (item: PurchaseHistoryItem) => void;
  onDeleteItem: (itemName: string) => void;
  currency: string;
  language: 'en' | 'he' | 'es';
  translations: {
    title: string;
    subtitle: string;
    purchased: string;
    times: string;
    delete: string;
    add: string;
    // Price alerts
    bestPriceEver: string;
    greatDeal: string;
    priceIncreased: string;
    higherThanUsual: string;
    // Store comparison
    bestAtStore: string;
    cheaper: string;
    // Sort buttons
    mostFrequent: string;
    today: string;
    starred: string;
    category: string;
    alphabetical: string;
  };
}

type SortMode = 'frequency' | 'recent' | 'starred' | 'category' | 'alphabetical';

export const FavoritesPage: React.FC<FavoritesPageProps> = ({ historyItems, onAddItem, onDeleteItem, currency, language, translations }) => {
  const currencySymbol = getCurrencySymbol(currency);
  // Default to 'starred' for new users, 'frequency' for users with history
  const [sortMode, setSortMode] = useState<SortMode>(() => historyItems.length === 0 ? 'starred' : 'frequency');
  // Batch selection state for starred items
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isBatchMode, setIsBatchMode] = useState(false);

  // Get starter items for the current language (these are the 200 pre-populated items)
  const starterItems = useMemo(() => {
    const items = getStarterItemsByLanguage(language);
    return items.map(item => ({
      name: item.name,
      category: item.category,
      frequency: 0,
      lastPurchased: new Date().toISOString(),
      starred: true, // Mark starter items as starred
    } as PurchaseHistoryItem));
  }, [language]);

  // Filter and sort items based on selected mode
  const sortedItems = useMemo(() => {
    // For "starred" mode, show pre-populated starter items (200 items)
    if (sortMode === 'starred') {
      return [...starterItems].sort((a, b) => a.name.localeCompare(b.name));
    }

    // For all other modes, use user's purchase history
    let items = [...historyItems];

    // Sort first
    items.sort((a, b) => {
      switch (sortMode) {
        case 'frequency':
          return b.frequency - a.frequency;
        case 'recent':
          return new Date(b.lastPurchased).getTime() - new Date(a.lastPurchased).getTime();
        case 'category':
          // Sort by category first, then by frequency within category
          if (a.category !== b.category) {
            return a.category.localeCompare(b.category);
          }
          return b.frequency - a.frequency;
        case 'alphabetical':
          // Sort by name alphabetically
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    // Then filter/limit based on mode
    if (sortMode === 'recent') {
      // Show only TODAY's purchases
      const today = new Date();
      items = items.filter(item => {
        const lastPurchased = new Date(item.lastPurchased);
        return (
          today.getFullYear() === lastPurchased.getFullYear() &&
          today.getMonth() === lastPurchased.getMonth() &&
          today.getDate() === lastPurchased.getDate()
        );
      });
    } else if (sortMode === 'frequency') {
      // Limit to top 40 most frequent items
      items = items.slice(0, 40);
    }

    return items;
  }, [historyItems, starterItems, sortMode]);

  // Calculate days since last purchase
  const getDaysSince = (lastPurchased: string): number => {
    const now = new Date();
    const last = new Date(lastPurchased);
    return Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Batch selection handlers
  const toggleItemSelection = (itemName: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemName)) {
        newSet.delete(itemName);
      } else {
        newSet.add(itemName);
      }
      return newSet;
    });
  };

  const handleAddSelected = () => {
    // Add all selected items to the shopping list
    sortedItems.forEach(item => {
      if (selectedItems.has(item.name)) {
        onAddItem(item);
      }
    });
    // Clear selection and exit batch mode
    setSelectedItems(new Set());
    setIsBatchMode(false);
  };

  const handleCancelBatchMode = () => {
    setSelectedItems(new Set());
    setIsBatchMode(false);
  };

  return (
    <div>
      <div className="mb-6">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">{translations.title}</h2>
          <p className="text-gray-500 mt-1">{translations.subtitle}</p>
        </div>
        
        {/* Sort Controls */}
        <div className="flex flex-wrap justify-center gap-2">
          <button
            onClick={() => setSortMode('frequency')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              sortMode === 'frequency'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {translations.mostFrequent}
          </button>
          <button
            onClick={() => setSortMode('recent')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              sortMode === 'recent'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📅 {translations.today}
          </button>
          <button
            onClick={() => setSortMode('starred')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              sortMode === 'starred'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ⭐ {translations.starred}
          </button>
          <button
            onClick={() => setSortMode('category')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              sortMode === 'category'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🏷️ {translations.category}
          </button>
          <button
            onClick={() => setSortMode('alphabetical')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              sortMode === 'alphabetical'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🔤 {translations.alphabetical}
          </button>
        </div>

        {/* Item Count Summary */}
        {sortedItems.length > 0 && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              {sortMode === 'starred' && (
                <>⭐ <span className="font-semibold text-blue-600">{sortedItems.length}</span> starter {sortedItems.length === 1 ? 'item' : 'items'}</>
              )}
              {sortMode === 'frequency' && (
                <>📊 Top <span className="font-semibold text-blue-600">{sortedItems.length}</span> most frequent {sortedItems.length === 1 ? 'item' : 'items'} (max 40)</>
              )}
              {sortMode === 'recent' && (
                <>📅 <span className="font-semibold text-blue-600">{sortedItems.length}</span> {sortedItems.length === 1 ? 'item' : 'items'} purchased today</>
              )}
              {sortMode === 'category' && (
                <>🏷️ <span className="font-semibold text-blue-600">{sortedItems.length}</span> {sortedItems.length === 1 ? 'item' : 'items'} (sorted by category)</>
              )}
              {sortMode === 'alphabetical' && (
                <>🔤 <span className="font-semibold text-blue-600">{sortedItems.length}</span> {sortedItems.length === 1 ? 'item' : 'items'} (A-Z)</>
              )}
            </p>
          </div>
        )}

        {/* Batch Mode Controls - Only show for Starred items */}
        {sortMode === 'starred' && sortedItems.length > 0 && (
          <div className="mt-4 flex justify-center gap-2">
            {!isBatchMode ? (
              <button
                onClick={() => setIsBatchMode(true)}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
              >
                ✓ Select Multiple Items
              </button>
            ) : (
              <>
                <button
                  onClick={handleAddSelected}
                  disabled={selectedItems.size === 0}
                  className={`px-4 py-2 text-sm rounded-md font-medium transition-colors ${
                    selectedItems.size === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  Add Selected ({selectedItems.size})
                </button>
                <button
                  onClick={handleCancelBatchMode}
                  className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {sortedItems.length === 0 && sortMode === 'recent' ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <p className="text-lg text-gray-600">📅 No purchases today yet</p>
          <p className="text-sm text-gray-400 mt-2">Items you complete today will appear here</p>
        </div>
      ) : sortedItems.length === 0 && (sortMode === 'frequency' || sortMode === 'category' || sortMode === 'alphabetical') ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <img src="https://picsum.photos/seed/favorites/300/200" alt="Empty favorites" className="mx-auto mb-6 rounded-lg shadow-md" />
          <p className="text-lg text-gray-600">📊 No purchase history yet</p>
          <p className="text-sm text-gray-400 mt-2">Start shopping and your frequently purchased items will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedItems.map((item, index) => {
            const daysSince = getDaysSince(item.lastPurchased);
            const showPredictive = item.avgDaysBetween && item.avgDaysBetween > 0;
            const isOverdue = showPredictive && daysSince > item.avgDaysBetween!;
            const priceAlert = analyzePriceAlert(item);
            const alertBadge = priceAlert ? formatPriceAlertBadge(priceAlert, {
              bestPriceEver: translations.bestPriceEver,
              greatDeal: translations.greatDeal,
              priceIncreased: translations.priceIncreased,
              higherThanUsual: translations.higherThanUsual,
            }) : null;
            const storeBadge = getStoreBadge(item, {
              bestAtStore: translations.bestAtStore,
              cheaper: translations.cheaper,
            });

            const isSelected = selectedItems.has(item.name);
            const showCheckbox = isBatchMode && sortMode === 'starred';

            return (
            <div
              key={`${item.name}-${index}`}
              onClick={() => showCheckbox ? toggleItemSelection(item.name) : null}
              className={`flex items-center justify-between p-3 bg-white hover:bg-gray-50 transition-colors rounded-lg shadow-sm border-2 group ${
                showCheckbox ? 'cursor-pointer' : ''
              } ${
                isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              {/* Checkbox for batch mode */}
              {showCheckbox && (
                <div className="mr-3 flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleItemSelection(item.name)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  />
                </div>
              )}

              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {item.starred && !showCheckbox && <span className="text-yellow-500">⭐</span>}
                  <p className="font-semibold text-gray-800">{item.name}</p>
                  {showPredictive && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      isOverdue ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      🔮 {isOverdue ? `${daysSince - item.avgDaysBetween!}d overdue` : `Every ${item.avgDaysBetween}d`}
                    </span>
                  )}
                  {alertBadge && (
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${alertBadge.className}`}>
                      {alertBadge.emoji} {alertBadge.text}
                    </span>
                  )}
                  {storeBadge && (
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${storeBadge.className}`}>
                      {storeBadge.text}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  {item.category} &middot; {translations.purchased} {item.frequency} {translations.times}
                  {daysSince > 0 && ` · ${daysSince}d ago`}
                  {(() => {
                    // Find the most recent purchase with a store name
                    if (!item.prices || item.prices.length === 0) return null;
                    
                    const sortedPrices = [...item.prices].sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
                    const recentWithStore = sortedPrices.find(p => p.store && p.store.trim() !== '');
                    
                    return recentWithStore ? <> · 🏪 {recentWithStore.store}</> : null;
                  })()}
                </p>
                {item.lastPrice && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-semibold text-green-700">
                      {currencySymbol}{item.lastPrice.toFixed(2)}
                    </span>
                    {item.avgPrice && item.avgPrice !== item.lastPrice && (
                      <span className="text-xs text-gray-500">
                        Avg: {currencySymbol}{item.avgPrice.toFixed(2)}
                      </span>
                    )}
                    {item.lowestPrice && item.lastPrice > item.lowestPrice && (
                      <span className="text-xs text-blue-600">
                        Best: {currencySymbol}{item.lowestPrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Hide Add and Delete buttons in batch mode for starred items */}
                {!showCheckbox && (
                  <>
                    <button
                      onClick={() => onAddItem(item)}
                      className="flex items-center gap-1.5 text-sm bg-green-100 text-green-800 font-medium py-1 px-3 rounded-full hover:bg-green-200 transition-colors"
                      aria-label={`${translations.add} ${item.name}`}
                    >
                      <PlusCircleIcon className="w-5 h-5" />
                      <span>{translations.add}</span>
                    </button>
                    <button
                      onClick={() => onDeleteItem(item.name)}
                      className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label={`${translations.delete} ${item.name}`}
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
