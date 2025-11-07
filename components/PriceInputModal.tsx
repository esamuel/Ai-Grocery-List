import React, { useState } from 'react';
import type { GroceryItem } from '../types';

interface UnitOption {
  value: string;
  label: string;
}

interface PriceInputModalProps {
  isOpen: boolean;
  completedItems: GroceryItem[];
  currency: string;
  onClose: () => void;
  onSubmit: (itemsWithPrices: {
    name: string;
    category: string;
    price?: number;
    store?: string;
    quantity?: number;
    unit?: string;
    unitPrice?: number;
  }[]) => void;
  translations: {
    title: string;
    subtitle: string;
    skip: string;
    save: string;
    total: string;
    optional: string;
    store?: string;
    storePlaceholder?: string;
    quantity?: string;
    unit?: string;
    unitPrice?: string;
    totalPrice?: string;
    units?: UnitOption[];
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
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [units, setUnits] = useState<Record<string, string>>({});
  const [unitPrices, setUnitPrices] = useState<Record<string, string>>({});
  const [storeName, setStoreName] = useState<string>('');

  if (!isOpen) return null;

  const handlePriceChange = (itemName: string, value: string) => {
    // Only allow numbers and one decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setPrices(prev => ({ ...prev, [itemName]: value }));

      // Auto-calculate unit price if quantity and unit exist
      if (quantities[itemName] && units[itemName] && value) {
        const quantity = parseFloat(quantities[itemName]);
        const totalPrice = parseFloat(value);
        if (quantity > 0) {
          const unitPrice = totalPrice / quantity;
          setUnitPrices(prev => ({ ...prev, [itemName]: unitPrice.toFixed(2) }));
        }
      }
    }
  };

  const handleQuantityChange = (itemName: string, value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setQuantities(prev => ({ ...prev, [itemName]: value }));
      // Auto-calculate total if unit price exists
      if (unitPrices[itemName] && value) {
        const total = parseFloat(value) * parseFloat(unitPrices[itemName]);
        setPrices(prev => ({ ...prev, [itemName]: total.toFixed(2) }));
      }
    }
  };

  const handleUnitChange = (itemName: string, value: string) => {
    setUnits(prev => ({ ...prev, [itemName]: value }));
  };

  const handleUnitPriceChange = (itemName: string, value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setUnitPrices(prev => ({ ...prev, [itemName]: value }));
      // Auto-calculate total if quantity exists
      if (quantities[itemName] && value) {
        const total = parseFloat(quantities[itemName]) * parseFloat(value);
        setPrices(prev => ({ ...prev, [itemName]: total.toFixed(2) }));
      }
    }
  };

  const handleSkip = () => {
    const itemsWithoutPrices = completedItems.map(item => ({
      name: item.name,
      category: item.category,
      store: storeName || undefined,
    }));
    onSubmit(itemsWithoutPrices);
    setPrices({});
    setQuantities({});
    setUnits({});
    setUnitPrices({});
    setStoreName('');
    onClose();
  };

  const handleSave = () => {
    const itemsWithPrices = completedItems.map(item => ({
      name: item.name,
      category: item.category,
      price: prices[item.name] ? parseFloat(prices[item.name]) : undefined,
      store: storeName || undefined,
      quantity: quantities[item.name] ? parseFloat(quantities[item.name]) : undefined,
      unit: units[item.name] || undefined,
      unitPrice: unitPrices[item.name] ? parseFloat(unitPrices[item.name]) : undefined,
    }));
    onSubmit(itemsWithPrices);
    setPrices({});
    setQuantities({});
    setUnits({});
    setUnitPrices({});
    setStoreName('');
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

        {/* Store Name Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            🏪 {translations.store || 'Store'} <span className="text-gray-400 font-normal">({translations.optional})</span>
          </label>
          <input
            type="text"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder={translations.storePlaceholder || 'e.g., Rami Levy, Shufersal...'}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-4 mb-4">
          {completedItems.map((item) => (
            <div key={item.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.category}</p>
                </div>
              </div>

              {/* Quantity, Unit, and Unit Price Row */}
              <div className="grid grid-cols-3 gap-2 mb-2">
                <div>
                  <label className="text-xs text-gray-600 block mb-1">
                    {translations.quantity || 'Qty'} <span className="text-gray-400">({translations.optional})</span>
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={quantities[item.name] || ''}
                    onChange={(e) => handleQuantityChange(item.name, e.target.value)}
                    placeholder="2"
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 block mb-1">
                    {translations.unit || 'Unit'} <span className="text-gray-400">({translations.optional})</span>
                  </label>
                  <select
                    value={units[item.name] || ''}
                    onChange={(e) => handleUnitChange(item.name, e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">-</option>
                    {translations.units?.map((unitOpt) => (
                      <option key={unitOpt.value} value={unitOpt.value}>
                        {unitOpt.label}
                      </option>
                    )) || (
                      <>
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                        <option value="lb">lb</option>
                        <option value="oz">oz</option>
                        <option value="l">liter</option>
                        <option value="ml">ml</option>
                        <option value="piece">piece</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600 block mb-1">
                    {translations.unitPrice || 'Unit Price'} <span className="text-gray-400">({translations.optional})</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-600">{symbol}</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={unitPrices[item.name] || ''}
                      onChange={(e) => handleUnitPriceChange(item.name, e.target.value)}
                      placeholder="6.00"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Total Price Row */}
              <div>
                <label className="text-xs text-gray-600 block mb-1">
                  {translations.totalPrice || 'Total Price'} {symbol}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={prices[item.name] || ''}
                  onChange={(e) => handlePriceChange(item.name, e.target.value)}
                  placeholder="12.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
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

