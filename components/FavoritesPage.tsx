
import React, { useState } from 'react';
import type { PurchaseHistoryItem } from '../types';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { TrashIcon } from './icons/TrashIcon';
import { StarIcon } from './icons/StarIcon';
import { analyzePriceAlert, formatPriceAlertBadge } from '../services/priceAlertService';
import { getCurrencySymbol } from '../services/spendingInsightsService';

interface FavoritesPageProps {
  historyItems: PurchaseHistoryItem[];
  onAddItem: (item: PurchaseHistoryItem) => void;
  onDeleteItem: (itemName: string) => void;
  currency: string;
  translations: {
    title: string;
    subtitle: string;
    purchased: string;
    times: string;
    delete: string;
    add: string;
  };
}

type SortMode = 'frequency' | 'recent' | 'starred';

export const FavoritesPage: React.FC<FavoritesPageProps> = ({ historyItems, onAddItem, onDeleteItem, currency, translations }) => {
  const currencySymbol = getCurrencySymbol(currency);
  const [sortMode, setSortMode] = useState<SortMode>('frequency');

  if (historyItems.length === 0) {
    return (
      <div className="text-center py-20">
        <img src="https://picsum.photos/seed/favorites/300/200" alt="Empty favorites" className="mx-auto mb-6 rounded-lg shadow-md" />
        <h2 className="text-2xl font-semibold text-gray-700">{translations.title}</h2>
        <p className="text-gray-500 mt-2">{translations.subtitle}</p>
      </div>
    );
  }

  // Filter and sort items based on selected mode
  const sortedItems = [...historyItems]
    .filter(item => {
      // For "recent" mode, show only TODAY's purchases
      if (sortMode === 'recent') {
        const today = new Date();
        const lastPurchased = new Date(item.lastPurchased);
        return (
          today.getFullYear() === lastPurchased.getFullYear() &&
          today.getMonth() === lastPurchased.getMonth() &&
          today.getDate() === lastPurchased.getDate()
        );
      }
      return true; // Show all items for other modes
    })
    .sort((a, b) => {
      if (sortMode === 'frequency') {
        return b.frequency - a.frequency;
      } else if (sortMode === 'recent') {
        return new Date(b.lastPurchased).getTime() - new Date(a.lastPurchased).getTime();
      } else if (sortMode === 'starred') {
        if (a.starred && !b.starred) return -1;
        if (!a.starred && b.starred) return 1;
        return b.frequency - a.frequency;
      }
      return 0;
    });

  // Calculate days since last purchase
  const getDaysSince = (lastPurchased: string): number => {
    const now = new Date();
    const last = new Date(lastPurchased);
    return Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  };
  
  return (
    <div>
      <div className="mb-6">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">{translations.title}</h2>
          <p className="text-gray-500 mt-1">{translations.subtitle}</p>
        </div>
        
        {/* Sort Controls */}
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setSortMode('frequency')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              sortMode === 'frequency'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Most Frequent
          </button>
          <button
            onClick={() => setSortMode('recent')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              sortMode === 'recent'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📅 Today
          </button>
          <button
            onClick={() => setSortMode('starred')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              sortMode === 'starred'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ⭐ Starred
          </button>
        </div>
      </div>

      {sortedItems.length === 0 && sortMode === 'recent' ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <p className="text-lg text-gray-600">📅 No purchases today yet</p>
          <p className="text-sm text-gray-400 mt-2">Items you complete today will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedItems.map(item => {
            const daysSince = getDaysSince(item.lastPurchased);
            const showPredictive = item.avgDaysBetween && item.avgDaysBetween > 0;
            const isOverdue = showPredictive && daysSince > item.avgDaysBetween!;
            const priceAlert = analyzePriceAlert(item);
            const alertBadge = priceAlert ? formatPriceAlertBadge(priceAlert) : null;
            
            return (
            <div key={item.name} className="flex items-center justify-between p-3 bg-white hover:bg-gray-50 transition-colors rounded-lg shadow-sm border border-gray-200 group">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {item.starred && <span className="text-yellow-500">⭐</span>}
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
                </div>
                <p className="text-sm text-gray-500">
                  {item.category} &middot; {translations.purchased} {item.frequency} {translations.times}
                  {daysSince > 0 && ` · ${daysSince}d ago`}
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
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
