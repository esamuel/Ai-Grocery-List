
import React from 'react';
import type { Category } from '../types';
import { CategorySection } from './CategorySection';

interface GroceryListProps {
  categories: Category[];
  onToggleItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onAddAllInCategory?: (categoryName: string) => void;
  onMoveToFavorites?: (id: string) => void;
  emptyState: {
    title: string;
    subtitle: string;
  };
  addAllText?: string;
}

export const GroceryList: React.FC<GroceryListProps> = ({ categories, onToggleItem, onDeleteItem, onAddAllInCategory, onMoveToFavorites, emptyState, addAllText }) => {
  if (categories.length === 0) {
    return (
      <div className="text-center py-20">
        <img src="https://picsum.photos/seed/groceries/300/200" alt="Empty grocery bag" className="mx-auto mb-6 rounded-lg shadow-md" />
        <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300">{emptyState.title}</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">{emptyState.subtitle}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {categories.map(category => (
        <CategorySection
          key={category.name}
          category={category}
          onToggleItem={onToggleItem}
          onDeleteItem={onDeleteItem}
          onAddAllInCategory={onAddAllInCategory ? () => onAddAllInCategory(category.name) : undefined}
          onMoveToFavorites={onMoveToFavorites}
          addAllText={addAllText}
        />
      ))}
    </div>
  );
};
