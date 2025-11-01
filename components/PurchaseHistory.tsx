import React from 'react';
import type { PurchaseHistoryItem } from '../types';
import { format } from 'date-fns';

interface PurchaseHistoryProps {
  historyItems: PurchaseHistoryItem[];
  onAddItem: (name: string, category?: string) => void;
  translations: {
    title: string;
    noHistory: string;
    name: string;
    category: string;
    lastPurchased: string;
    timesPurchased: string;
    addToList: string;
    dateFormat: string;
  };
}

export const PurchaseHistory: React.FC<PurchaseHistoryProps> = ({
  historyItems,
  onAddItem,
  translations,
}) => {
  // Sort history by last purchased date (newest first)
  const sortedHistory = [...historyItems].sort((a, b) => 
    new Date(b.lastPurchased).getTime() - new Date(a.lastPurchased).getTime()
  );

  // Group history by date
  const historyByDate: Record<string, PurchaseHistoryItem[]> = {};
  
  sortedHistory.forEach(item => {
    if (!item.lastPurchased) return;
    
    const date = new Date(item.lastPurchased);
    const dateKey = format(date, 'yyyy-MM-dd');
    
    if (!historyByDate[dateKey]) {
      historyByDate[dateKey] = [];
    }
    
    historyByDate[dateKey].push(item);
  });

  // Format date for display
  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return format(date, translations.dateFormat || 'MMMM d, yyyy');
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {translations.title || 'Purchase History'}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {sortedHistory.length} {sortedHistory.length === 1 ? 'item' : 'items'} in history
        </p>
      </div>

      {Object.keys(historyByDate).length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            {translations.noHistory || 'No purchase history found.'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(historyByDate).map(([date, items]) => (
            <div key={date} className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {formatDisplayDate(date)}
              </h3>
              <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {items.map((item) => (
                    <li key={`${item.name}-${item.lastPurchased}`} className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {item.name}
                          </p>
                          <div className="flex items-center mt-1 text-xs text-gray-500 dark:text-gray-400 space-x-4">
                            <span>{item.category}</span>
                            {item.lastPurchased && (
                              <span>
                                {translations.lastPurchased || 'Last purchased'}: {format(new Date(item.lastPurchased), 'MMM d, yyyy')}
                              </span>
                            )}
                            <span>
                              {item.frequency} {translations.timesPurchased || 'times'}
                            </span>
                            {item.lastPrice && (
                              <span className="font-medium text-green-600 dark:text-green-400">
                                ${item.lastPrice.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          <button
                            onClick={() => onAddItem(item.name, item.category)}
                            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                          >
                            {translations.addToList || 'Add to List'}
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
