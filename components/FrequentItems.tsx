
import React from 'react';
import type { GroceryHistoryItem } from '../types';
import { PlusCircleIcon } from './icons/PlusCircleIcon';

interface FrequentItemsProps {
  title: string;
  items: GroceryHistoryItem[];
  onAddItem: (name: string) => void;
}

export const FrequentItems: React.FC<FrequentItemsProps> = ({ title, items, onAddItem }) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-gray-700 mb-3">{title}</h2>
      <div className="flex flex-wrap gap-2">
        {items.map(item => (
          <button
            key={item.name}
            onClick={() => onAddItem(item.name)}
            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-full hover:bg-green-50 hover:border-green-400 hover:text-green-700 transition-all duration-200 text-sm shadow-sm"
            aria-label={`Add ${item.name} to list`}
          >
            <PlusCircleIcon className="w-5 h-5" />
            <span>{item.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
