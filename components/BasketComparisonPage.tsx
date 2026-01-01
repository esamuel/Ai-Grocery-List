import React, { useState, useEffect } from 'react';
import { 
  ComparisonBasket, 
  BasketType, 
  BasketComparisonResult,
  BasketItem,
  PurchaseHistoryItem 
} from '../types';
import {
  getTopPurchasedItems,
  createBasket,
  calculateStoreComparison,
  updateItemPrice,
  addItemToBasket,
  removeItemFromBasket,
  updateBasketFromHistory
} from '../services/basketComparisonService';
import {
  saveBasket,
  loadBasketByType
} from '../services/basketStorageService';

interface BasketComparisonPageProps {
  listId: string;
  history: PurchaseHistoryItem[];
  currency: string;
  language: 'en' | 'he' | 'es';
  userId: string;
}

export const BasketComparisonPage: React.FC<BasketComparisonPageProps> = ({
  listId,
  history,
  currency,
  language,
  userId
}) => {
  const [selectedBasketType, setSelectedBasketType] = useState<BasketType>('weekly');
  const [weeklyBasket, setWeeklyBasket] = useState<ComparisonBasket | null>(null);
  const [monthlyBasket, setMonthlyBasket] = useState<ComparisonBasket | null>(null);
  const [comparison, setComparison] = useState<BasketComparisonResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<{ itemName: string; store: string } | null>(null);
  const [manualPrice, setManualPrice] = useState('');

  const currentBasket = selectedBasketType === 'weekly' ? weeklyBasket : monthlyBasket;
  const currencySymbol = currency === 'ILS' ? '₪' : currency === 'USD' ? '$' : '€';

  const t = {
    he: {
      title: 'השוואת סלים',
      subtitle: 'השווה מחירים בין סופרמרקטים',
      weekly: 'סל שבועי',
      monthly: 'סל חודשי',
      createBasket: 'צור סל חדש',
      updateBasket: 'עדכן סל',
      autoUpdate: 'עדכון אוטומטי',
      items: 'מוצרים',
      stores: 'חנויות',
      total: 'סה"כ',
      cheapest: 'הזול ביותר',
      savings: 'חיסכון',
      missingPrices: 'מחירים חסרים',
      addPrice: 'הוסף מחיר',
      editPrice: 'ערוך מחיר',
      store: 'חנות',
      price: 'מחיר',
      save: 'שמור',
      cancel: 'ביטול',
      recommendations: 'המלצות',
      noData: 'אין מספיק נתונים ליצירת סל',
      loading: 'טוען...',
      itemsInBasket: 'מוצרים בסל',
      quantity: 'כמות',
      unit: 'יחידה',
      addItem: 'הוסף מוצר',
      removeItem: 'הסר מוצר'
    },
    en: {
      title: 'Basket Comparison',
      subtitle: 'Compare prices across supermarkets',
      weekly: 'Weekly Basket',
      monthly: 'Monthly Basket',
      createBasket: 'Create Basket',
      updateBasket: 'Update Basket',
      autoUpdate: 'Auto Update',
      items: 'Items',
      stores: 'Stores',
      total: 'Total',
      cheapest: 'Cheapest',
      savings: 'Savings',
      missingPrices: 'Missing Prices',
      addPrice: 'Add Price',
      editPrice: 'Edit Price',
      store: 'Store',
      price: 'Price',
      save: 'Save',
      cancel: 'Cancel',
      recommendations: 'Recommendations',
      noData: 'Not enough data to create basket',
      loading: 'Loading...',
      itemsInBasket: 'Items in Basket',
      quantity: 'Quantity',
      unit: 'Unit',
      addItem: 'Add Item',
      removeItem: 'Remove Item'
    },
    es: {
      title: 'Comparación de Cestas',
      subtitle: 'Compara precios entre supermercados',
      weekly: 'Cesta Semanal',
      monthly: 'Cesta Mensual',
      createBasket: 'Crear Cesta',
      updateBasket: 'Actualizar Cesta',
      autoUpdate: 'Actualización Automática',
      items: 'Artículos',
      stores: 'Tiendas',
      total: 'Total',
      cheapest: 'Más Barato',
      savings: 'Ahorro',
      missingPrices: 'Precios Faltantes',
      addPrice: 'Agregar Precio',
      editPrice: 'Editar Precio',
      store: 'Tienda',
      price: 'Precio',
      save: 'Guardar',
      cancel: 'Cancelar',
      recommendations: 'Recomendaciones',
      noData: 'No hay suficientes datos para crear cesta',
      loading: 'Cargando...',
      itemsInBasket: 'Artículos en la Cesta',
      quantity: 'Cantidad',
      unit: 'Unidad',
      addItem: 'Agregar Artículo',
      removeItem: 'Eliminar Artículo'
    }
  }[language];

  // Load baskets on mount
  useEffect(() => {
    loadBaskets();
  }, [listId]);

  // Recalculate comparison when basket changes
  useEffect(() => {
    if (currentBasket) {
      const result = calculateStoreComparison(currentBasket);
      setComparison(result);
    }
  }, [currentBasket]);

  const loadBaskets = async () => {
    setIsLoading(true);
    try {
      const [weekly, monthly] = await Promise.all([
        loadBasketByType(listId, 'weekly'),
        loadBasketByType(listId, 'monthly')
      ]);
      
      setWeeklyBasket(weekly);
      setMonthlyBasket(monthly);
    } catch (error) {
      console.error('Error loading baskets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBasket = async (type: BasketType) => {
    const daysBack = type === 'weekly' ? 7 : 30;
    const topItems = getTopPurchasedItems(history, 12, daysBack);
    
    if (topItems.length === 0) {
      alert(t.noData);
      return;
    }

    const newBasket = createBasket(type, topItems, userId, true);
    
    if (type === 'weekly') {
      setWeeklyBasket(newBasket);
    } else {
      setMonthlyBasket(newBasket);
    }

    await saveBasket(listId, newBasket);
  };

  const handleUpdateBasket = async () => {
    if (!currentBasket) return;

    const updatedBasket = updateBasketFromHistory(currentBasket, history);
    
    if (selectedBasketType === 'weekly') {
      setWeeklyBasket(updatedBasket);
    } else {
      setMonthlyBasket(updatedBasket);
    }

    await saveBasket(listId, updatedBasket);
  };

  const handleSavePrice = async () => {
    if (!currentBasket || !editingItem || !manualPrice) return;

    const price = parseFloat(manualPrice);
    if (isNaN(price)) return;

    const updatedBasket = updateItemPrice(
      currentBasket,
      editingItem.itemName,
      editingItem.store,
      price
    );

    if (selectedBasketType === 'weekly') {
      setWeeklyBasket(updatedBasket);
    } else {
      setMonthlyBasket(updatedBasket);
    }

    await saveBasket(listId, updatedBasket);
    setEditingItem(null);
    setManualPrice('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl text-gray-600">{t.loading}</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">{t.title}</h1>
        <p className="text-gray-600">{t.subtitle}</p>
      </div>

      {/* Basket Type Selector */}
      <div className="flex gap-4 justify-center">
        <button
          onClick={() => setSelectedBasketType('weekly')}
          className={`px-6 py-3 rounded-xl font-bold transition-all ${
            selectedBasketType === 'weekly'
              ? 'bg-blue-500 text-white shadow-lg'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          📅 {t.weekly}
        </button>
        <button
          onClick={() => setSelectedBasketType('monthly')}
          className={`px-6 py-3 rounded-xl font-bold transition-all ${
            selectedBasketType === 'monthly'
              ? 'bg-blue-500 text-white shadow-lg'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          📆 {t.monthly}
        </button>
      </div>

      {/* Create/Update Basket */}
      {!currentBasket ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl">
          <p className="text-gray-600 mb-4">{t.noData}</p>
          <button
            onClick={() => handleCreateBasket(selectedBasketType)}
            className="px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            ✨ {t.createBasket}
          </button>
        </div>
      ) : (
        <>
          {/* Update Button */}
          <div className="flex justify-end">
            <button
              onClick={handleUpdateBasket}
              className="px-6 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors"
            >
              🔄 {t.updateBasket}
            </button>
          </div>

          {/* Store Comparison Cards */}
          {comparison && comparison.stores.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {comparison.stores.map((store) => (
                <div
                  key={store.storeName}
                  className={`p-6 rounded-2xl shadow-lg ${
                    store.isCheapest
                      ? 'bg-gradient-to-br from-green-400 to-green-600 text-white'
                      : 'bg-white border-2 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">
                      {store.isCheapest && '⭐ '}
                      {store.storeName}
                    </h3>
                    {store.isCheapest && (
                      <span className="text-sm font-semibold bg-white/20 px-3 py-1 rounded-full">
                        {t.cheapest}
                      </span>
                    )}
                  </div>

                  <div className="text-3xl font-black mb-2">
                    {currencySymbol}{store.totalPrice.toFixed(2)}
                  </div>

                  {store.savings !== undefined && store.savings > 0 && (
                    <div className={`text-sm ${store.isCheapest ? 'text-white/90' : 'text-green-600'}`}>
                      💰 {t.savings}: {currencySymbol}{store.savings.toFixed(2)} ({store.savingsPercent?.toFixed(1)}%)
                    </div>
                  )}

                  <div className={`text-sm mt-2 ${store.isCheapest ? 'text-white/80' : 'text-gray-600'}`}>
                    {store.itemsWithPrices}/{currentBasket.items.length} {t.items}
                  </div>

                  {store.missingItems.length > 0 && (
                    <div className="mt-3 text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                      {t.missingPrices}: {store.missingItems.length}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {comparison && comparison.recommendations && comparison.recommendations.length > 0 && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-blue-900 mb-3">💡 {t.recommendations}</h3>
              <ul className="space-y-2">
                {comparison.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-blue-800">
                    • {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Items List */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              🛒 {t.itemsInBasket} ({currentBasket.items.length})
            </h3>
            <div className="space-y-3">
              {currentBasket.items.map((item) => (
                <div key={item.name} className="border-2 border-gray-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-bold text-gray-800">{item.name}</h4>
                      <p className="text-sm text-gray-500">
                        {item.quantity} {item.unit} • {item.category}
                      </p>
                    </div>
                  </div>

                  {/* Store Prices */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {Object.entries(item.storePrices).map(([storeName, priceData]) => (
                      <div
                        key={storeName}
                        className="bg-gray-50 p-2 rounded-lg text-sm"
                      >
                        <div className="font-semibold text-gray-700">{storeName}</div>
                        <div className="text-lg font-bold text-green-600">
                          {currencySymbol}{priceData.price.toFixed(2)}
                        </div>
                        {priceData.isManual && (
                          <span className="text-xs text-blue-600">✏️ ידני</span>
                        )}
                      </div>
                    ))}
                    
                    {/* Add Price Button */}
                    <button
                      onClick={() => {
                        setEditingItem({ itemName: item.name, store: 'חנות חדשה' });
                        setManualPrice('');
                      }}
                      className="bg-blue-50 hover:bg-blue-100 p-2 rounded-lg text-sm text-blue-600 font-semibold transition-colors"
                    >
                      + {t.addPrice}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Edit Price Modal */}
          {editingItem && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full">
                <h3 className="text-xl font-bold mb-4">{t.editPrice}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t.store}
                    </label>
                    <input
                      type="text"
                      value={editingItem.store}
                      onChange={(e) => setEditingItem({ ...editingItem, store: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t.price} ({currencySymbol})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={manualPrice}
                      onChange={(e) => setManualPrice(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleSavePrice}
                      className="flex-1 px-6 py-3 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      {t.save}
                    </button>
                    <button
                      onClick={() => {
                        setEditingItem(null);
                        setManualPrice('');
                      }}
                      className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      {t.cancel}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

