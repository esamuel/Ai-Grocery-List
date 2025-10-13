
import React, { useState } from 'react';
import type { Category } from '../types';
import { GroceryItem } from './GroceryItem';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

interface CategorySectionProps {
  category: Category;
  onToggleItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onAddAllInCategory?: () => void;
  onMoveToFavorites?: (id: string) => void;
  addAllText?: string;
}

export const CategorySection: React.FC<CategorySectionProps> = ({ 
  category, 
  onToggleItem, 
  onDeleteItem, 
  onAddAllInCategory,
  onMoveToFavorites,
  addAllText = "Add All"
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const completedCount = category.items.filter(item => item.completed).length;
  const totalCount = category.items.length;
  const pendingCount = totalCount - completedCount;

  return (
    <div className="mb-6">
      {/* Sticky Category Header */}
      <div className="sticky top-16 bg-gray-50 dark:bg-gray-900 z-10 py-2 -mx-4 px-4 border-b border-gray-200 dark:border-gray-700 rtl:text-right transition-colors">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-between text-left rtl:text-right hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg p-2 transition-colors"
        >
          <div className="flex items-center gap-3 rtl:flex-row-reverse">
            <ChevronDownIcon 
              className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${
                isCollapsed ? '-rotate-90 rtl:rotate-90' : 'rotate-0'
              }`} 
            />
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 capitalize text-left rtl:text-right">{category.name}</h2>
            <div className="flex items-center gap-2">
              {pendingCount > 0 && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {pendingCount} pending
                </span>
              )}
              {completedCount > 0 && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {completedCount} done
                </span>
              )}
            </div>
          </div>
          
          {/* Add All Button */}
          {onAddAllInCategory && pendingCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddAllInCategory();
              }}
              className="text-sm text-blue-600 hover:text-blue-700 px-3 py-1 rounded-md hover:bg-blue-50 transition-colors"
            >
{addAllText} ({pendingCount})
            </button>
          )}
        </button>
      </div>

      {/* Category Items */}
      {!isCollapsed && (
        <div className="space-y-2 mt-4">
          {category.items.map(item => (
            <GroceryItem
              key={item.id}
              item={item}
              onToggle={onToggleItem}
              onDelete={onDeleteItem}
              onMoveToFavorites={onMoveToFavorites}
            />
          ))}
        </div>
      )}
      
      {/* Collapsed State Summary */}
      {isCollapsed && (
        <div className="mt-2 text-sm text-gray-500 px-2">
          {totalCount} items ({pendingCount} pending, {completedCount} completed)
        </div>
      )}
    </div>
  );
};
