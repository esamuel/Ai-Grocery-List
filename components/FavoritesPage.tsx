
import React from 'react';
import type { GroceryHistoryItem } from '../types';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { TrashIcon } from './icons/TrashIcon';

interface FavoritesPageProps {
  historyItems: GroceryHistoryItem[];
  onAddItem: (item: GroceryHistoryItem) => void;
  onDeleteItem: (itemName: string) => void;
  translations: {
    title: string;
    subtitle: string;
    purchased: string;
    times: string;
    delete: string;
    add: string;
  };
}

export const FavoritesPage: React.FC<FavoritesPageProps> = ({ historyItems, onAddItem, onDeleteItem, translations }) => {
  if (historyItems.length === 0) {
    return (
      <div className="text-center py-20">
        <img src="https://picsum.photos/seed/favorites/300/200" alt="Empty favorites" className="mx-auto mb-6 rounded-lg shadow-md" />
        <h2 className="text-2xl font-semibold text-gray-700">{translations.title}</h2>
        <p className="text-gray-500 mt-2">{translations.subtitle}</p>
      </div>
    );
  }
  
  return (
    <div>
      <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800">{translations.title}</h2>
          <p className="text-gray-500 mt-1">{translations.subtitle}</p>
      </div>
      <div className="space-y-3">
        {historyItems.map(item => (
          <div key={item.name} className="flex items-center justify-between p-3 bg-white hover:bg-gray-50 transition-colors rounded-lg shadow-sm border border-gray-200 group">
            <div>
                <p className="font-semibold text-gray-800">{item.name}</p>
                <p className="text-sm text-gray-500">
                    {item.category} &middot; {translations.purchased} {item.frequency} {translations.times}
                </p>
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
        ))}
      </div>
    </div>
  );
};
