import React, { useState } from 'react';
import type { GroceryItem } from '../types';

interface PriceInputModalProps {
  isOpen: boolean;
  completedItems: GroceryItem[];
  currency: string;
  onClose: () => void;
  onSubmit: (itemsWithPrices: { name: string; category: string; price?: number }[]) => void;
  translations: {
    title: string;
    subtitle: string;
    skip: string;
    save: string;
    total: string;
    optional: string;
  };
}

export const PriceInputModal: React.FC<PriceInputModalProps> = ({
  isOpen,
  completedItems,
  currency,
  onClose,
  onSubmit,
  translations
}) => {
  const [prices, setPrices] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handlePriceChange = (itemName: string, value: string) => {
    // Only allow numbers and one decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setPrices(prev => ({ ...prev, [itemName]: value }));
    }
  };

  const handleSkip = () => {
    const itemsWithoutPrices = completedItems.map(item => ({
      name: item.name,
      category: item.category,
    }));
    onSubmit(itemsWithoutPrices);
    setPrices({});
    onClose();
  };

  const handleSave = () => {
    const itemsWithPrices = completedItems.map(item => ({
      name: item.name,
      category: item.category,
      price: prices[item.name] ? parseFloat(prices[item.name]) : undefined,
    }));
    onSubmit(itemsWithPrices);
    setPrices({});
    onClose();
  };

  const calculateTotal = () => {
    return Object.values(prices)
      .filter(p => p !== '')
      .reduce((sum, price) => sum + parseFloat(price || '0'), 0)
      .toFixed(2);
  };

  const getCurrencySymbol = (curr: string) => {
    switch (curr) {
      case 'USD': return '$';
      case 'ILS': return '₪';
      case 'EUR': return '€';
      case 'GBP': return '£';
      default: return curr;
    }
  };

  const symbol = getCurrencySymbol(currency);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={handleSkip}>
      <div 
        className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-800">{translations.title}</h2>
          <p className="text-sm text-gray-600 mt-1">{translations.subtitle}</p>
        </div>

        <div className="space-y-3 mb-4">
          {completedItems.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <div className="flex-1">
                <p className="font-medium text-gray-800">{item.name}</p>
                <p className="text-xs text-gray-500">{item.category}</p>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-600">{symbol}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={prices[item.name] || ''}
                  onChange={(e) => handlePriceChange(item.name, e.target.value)}
                  placeholder="0.00"
                  className="w-20 px-2 py-1.5 border border-gray-300 rounded-md text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          ))}
        </div>

        {Object.keys(prices).length > 0 && (
          <div className="border-t pt-3 mb-4">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-800">{translations.total}:</span>
              <span className="text-xl font-bold text-green-600">
                {symbol}{calculateTotal()}
              </span>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleSkip}
            className="flex-1 px-4 py-2.5 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {translations.skip}
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
          >
            {translations.save}
          </button>
        </div>
      </div>
    </div>
  );
};

