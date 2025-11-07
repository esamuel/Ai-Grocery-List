import React, { useState, useEffect, useRef } from 'react';
import type { GroceryItem, PurchaseHistoryItem } from '../types';

interface InlinePriceEntryProps {
  completedItems: GroceryItem[];
  purchaseHistory: PurchaseHistoryItem[];
  currency: string;
  onSave: (itemsWithPrices: {
    name: string;
    category: string;
    price?: number;
    store?: string;
    quantity?: number;
    unit?: string;
    unitPrice?: number;
  }[]) => void;
  onCancel: () => void;
  translations: {
    storeName: string;
    storePlaceholder: string;
    price: string;
    lastPrice: string;
    saveAll: string;
    cancel: string;
    optional: string;
    at: string;
    quantity?: string;
    unit?: string;
    unitPrice?: string;
    totalPrice?: string;
    units?: { value: string; label: string }[];
  };
}

export const InlinePriceEntry: React.FC<InlinePriceEntryProps> = ({
  completedItems,
  purchaseHistory,
  currency,
  onSave,
  onCancel,
  translations
}) => {
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [units, setUnits] = useState<Record<string, string>>({});
  const [unitPrices, setUnitPrices] = useState<Record<string, string>>({});
  const [storeName, setStoreName] = useState<string>('');
  const storeInputRef = useRef<HTMLInputElement>(null);

  console.log('🎨 InlinePriceEntry rendered with', completedItems.length, 'items');
  console.log('📦 Completed items:', completedItems.map(i => i.name));

  // Load last used store from localStorage
  useEffect(() => {
    const lastStore = localStorage.getItem('lastUsedStore');
    if (lastStore) {
      console.log('🏪 Loading last store:', lastStore);
      setStoreName(lastStore);
    }
    // Focus store input on mount
    setTimeout(() => storeInputRef.current?.focus(), 100);
  }, []);

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

  // Unit conversion helper - converts quantity to base unit
  const convertToBaseUnit = (quantity: number, unit: string): number => {
    switch (unit.toLowerCase()) {
      // Weight conversions (base: kg)
      case 'g': return quantity / 1000;
      case 'kg': return quantity;
      case 'lb': return quantity * 0.453592;
      case 'oz': return quantity * 0.0283495;

      // Volume conversions (base: liter)
      case 'ml': return quantity / 1000;
      case 'l': return quantity;

      // No conversion for pieces
      case 'piece':
      default: return quantity;
    }
  };

  // Get the base unit for a given unit
  const getBaseUnit = (unit: string): string => {
    switch (unit.toLowerCase()) {
      case 'g':
      case 'kg':
      case 'lb':
      case 'oz':
        return 'kg';
      case 'ml':
      case 'l':
        return 'l';
      default:
        return unit;
    }
  };

  const getLastPriceInfo = (itemName: string) => {
    const historyItem = purchaseHistory.find(
      h => h.name.toLowerCase() === itemName.toLowerCase()
    );

    if (!historyItem?.prices || historyItem.prices.length === 0) {
      return null;
    }

    // Get most recent price with actual price data
    const pricesWithData = historyItem.prices.filter(p => p.price !== undefined && p.price > 0);
    if (pricesWithData.length === 0) return null;

    const lastPrice = pricesWithData[pricesWithData.length - 1];
    return {
      price: lastPrice.price!,
      store: lastPrice.store,
    };
  };

  const handlePriceChange = (itemName: string, value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setPrices(prev => ({ ...prev, [itemName]: value }));

      // Auto-calculate unit price if quantity and unit exist
      if (quantities[itemName] && units[itemName] && value) {
        const quantity = parseFloat(quantities[itemName]);
        const unit = units[itemName];
        const totalPrice = parseFloat(value);

        if (quantity > 0) {
          // Convert quantity to base unit for unit price calculation
          const baseQuantity = convertToBaseUnit(quantity, unit);
          const unitPrice = totalPrice / baseQuantity;
          const baseUnit = getBaseUnit(unit);

          console.log(`💰 Price calc: ${quantity}${unit} = ${baseQuantity}${baseUnit} at ${symbol}${totalPrice} → ${symbol}${unitPrice.toFixed(2)}/${baseUnit}`);
          setUnitPrices(prev => ({ ...prev, [itemName]: unitPrice.toFixed(2) }));
        }
      }
    }
  };

  const handleQuantityChange = (itemName: string, value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setQuantities(prev => ({ ...prev, [itemName]: value }));

      // Auto-calculate total if unit price exists
      if (unitPrices[itemName] && units[itemName] && value) {
        const quantity = parseFloat(value);
        const unit = units[itemName];
        const unitPrice = parseFloat(unitPrices[itemName]);

        // Convert quantity to base unit for price calculation
        const baseQuantity = convertToBaseUnit(quantity, unit);
        const total = baseQuantity * unitPrice;

        console.log(`💰 Total calc: ${quantity}${unit} = ${baseQuantity}kg × ${symbol}${unitPrice}/kg → ${symbol}${total.toFixed(2)}`);
        setPrices(prev => ({ ...prev, [itemName]: total.toFixed(2) }));
      }
    }
  };

  const handleUnitChange = (itemName: string, value: string) => {
    setUnits(prev => ({ ...prev, [itemName]: value }));

    // Recalculate prices when unit changes
    if (quantities[itemName] && unitPrices[itemName] && value) {
      const quantity = parseFloat(quantities[itemName]);
      const unitPrice = parseFloat(unitPrices[itemName]);

      // Convert with new unit
      const baseQuantity = convertToBaseUnit(quantity, value);
      const total = baseQuantity * unitPrice;

      console.log(`🔄 Unit changed: Recalculating ${quantity}${value} = ${baseQuantity}kg × ${symbol}${unitPrice}/kg → ${symbol}${total.toFixed(2)}`);
      setPrices(prev => ({ ...prev, [itemName]: total.toFixed(2) }));
    } else if (quantities[itemName] && prices[itemName] && value) {
      // If we have total price but no unit price, recalculate unit price with new unit
      const quantity = parseFloat(quantities[itemName]);
      const totalPrice = parseFloat(prices[itemName]);

      const baseQuantity = convertToBaseUnit(quantity, value);
      const unitPrice = totalPrice / baseQuantity;

      console.log(`🔄 Unit changed: Recalculating unit price ${quantity}${value} at ${symbol}${totalPrice} → ${symbol}${unitPrice.toFixed(2)}/kg`);
      setUnitPrices(prev => ({ ...prev, [itemName]: unitPrice.toFixed(2) }));
    }
  };

  const handleUnitPriceChange = (itemName: string, value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setUnitPrices(prev => ({ ...prev, [itemName]: value }));

      // Auto-calculate total if quantity exists
      if (quantities[itemName] && units[itemName] && value) {
        const quantity = parseFloat(quantities[itemName]);
        const unit = units[itemName];
        const unitPrice = parseFloat(value);

        // Convert quantity to base unit for price calculation
        const baseQuantity = convertToBaseUnit(quantity, unit);
        const total = baseQuantity * unitPrice;

        console.log(`💰 Total from unit price: ${quantity}${unit} = ${baseQuantity}kg × ${symbol}${unitPrice}/kg → ${symbol}${total.toFixed(2)}`);
        setPrices(prev => ({ ...prev, [itemName]: total.toFixed(2) }));
      }
    }
  };

  const useLastPrice = (itemName: string) => {
    const lastPriceInfo = getLastPriceInfo(itemName);
    if (lastPriceInfo) {
      setPrices(prev => ({ ...prev, [itemName]: lastPriceInfo.price.toFixed(2) }));
      if (lastPriceInfo.store && !storeName) {
        setStoreName(lastPriceInfo.store);
      }
    }
  };

  const handleSave = () => {
    // Save store to localStorage for next time
    if (storeName) {
      localStorage.setItem('lastUsedStore', storeName);
    }

    const itemsWithPrices = completedItems.map(item => ({
      name: item.name,
      category: item.category,
      price: prices[item.name] ? parseFloat(prices[item.name]) : undefined,
      store: storeName || undefined,
      quantity: quantities[item.name] ? parseFloat(quantities[item.name]) : undefined,
      unit: units[item.name] || undefined,
      unitPrice: unitPrices[item.name] ? parseFloat(unitPrices[item.name]) : undefined,
    }));

    onSave(itemsWithPrices);
  };

  const handleKeyPress = (e: React.KeyboardEvent, itemIndex: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Move to next price input or save
      if (itemIndex < completedItems.length - 1) {
        const nextInput = document.getElementById(`price-${itemIndex + 1}`);
        nextInput?.focus();
      } else {
        handleSave();
      }
    }
  };

  const calculateTotal = () => {
    return Object.values(prices)
      .filter(p => p !== '')
      .reduce((sum, price) => sum + parseFloat(price || '0'), 0)
      .toFixed(2);
  };

  const hasAnyPrice = Object.values(prices).some(p => p !== '');

  return (
    <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-blue-900">💰 Quick Price Entry</h3>
          <p className="text-xs text-blue-700">Add prices for checked items (optional)</p>
        </div>
        <button
          onClick={onCancel}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          ✕
        </button>
      </div>

      {/* Store Input */}
      <div className="mb-3">
        <label className="block text-sm font-medium text-blue-900 mb-1">
          🏪 {translations.storeName}
          <span className="text-blue-600 font-normal ml-1">({translations.optional})</span>
        </label>
        <input
          ref={storeInputRef}
          type="text"
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          placeholder={translations.storePlaceholder}
          className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {/* Price Inputs */}
      <div className="space-y-2 mb-3">
        {completedItems.map((item, index) => {
          const lastPriceInfo = getLastPriceInfo(item.name);

          return (
            <div key={item.id} className="bg-white rounded-lg p-3 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{item.name}</p>
                  {lastPriceInfo && (
                    <button
                      onClick={() => useLastPrice(item.name)}
                      className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {translations.lastPrice}: {symbol}{lastPriceInfo.price.toFixed(2)}
                      {lastPriceInfo.store && ` ${translations.at} ${lastPriceInfo.store}`}
                    </button>
                  )}
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
                    {translations.unitPrice || 'Unit Price'}
                    {units[item.name] && (
                      <span className="text-blue-600 font-medium ml-1">
                        /{getBaseUnit(units[item.name])}
                      </span>
                    )}
                    {' '}<span className="text-gray-400">({translations.optional})</span>
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
                  id={`price-${index}`}
                  type="text"
                  inputMode="decimal"
                  value={prices[item.name] || ''}
                  onChange={(e) => handlePriceChange(item.name, e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  placeholder="12.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Total */}
      {hasAnyPrice && (
        <div className="bg-green-50 rounded-lg p-3 mb-3 border border-green-200">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-800">Total:</span>
            <span className="text-xl font-bold text-green-600">
              {symbol}{calculateTotal()}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {translations.cancel}
        </button>
        <button
          onClick={handleSave}
          className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
        >
          {translations.saveAll}
        </button>
      </div>
    </div>
  );
};
