import React, { useState, useEffect } from 'react';

interface PriceRecord {
  itemName: string;
  price: number;
  store: string;
  date: string;
}

interface PriceComparePageProps {
  onBack: () => void;
  translations: {
    priceCompare: string;
    back: string;
    searchPlaceholder: string;
    lowestPrice: string;
    highestPrice: string;
    avgPrice: string;
    lastPurchased: string;
    priceHistory: string;
    noPriceData: string;
    trackNewItem: string;
    bestDeals: string;
    itemName: string;
    store: string;
    price: string;
    date: string;
    trend: string;
    enablePriceTracking: string;
    priceTrackingDesc: string;
  };
  priceHistory: PriceRecord[];
  rtl?: boolean;
  priceTrackingEnabled: boolean;
  onTogglePriceTracking: (enabled: boolean) => void;
  historyItemsCount: number;
}

export const PriceComparePage: React.FC<PriceComparePageProps> = ({
  onBack,
  translations,
  priceHistory,
  rtl = false,
  priceTrackingEnabled,
  onTogglePriceTracking,
  historyItemsCount
}) => {
  // Debug logging
  console.log('🔍 PriceComparePage Debug:');
  console.log('Price tracking enabled:', priceTrackingEnabled);
  console.log('History items count:', historyItemsCount);
  console.log('Price history length:', priceHistory.length);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState<PriceRecord[]>([]);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredItems(priceHistory);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = priceHistory.filter(item =>
        item.itemName.toLowerCase().includes(query)
      );
      setFilteredItems(filtered);
    }
  }, [searchQuery, priceHistory]);

  const getItemStats = (itemName: string) => {
    const itemHistory = priceHistory.filter(p => p.itemName === itemName);
    if (itemHistory.length === 0) return null;

    const prices = itemHistory.map(h => h.price);
    const lowest = Math.min(...prices);
    const highest = Math.max(...prices);
    const average = prices.reduce((a, b) => a + b, 0) / prices.length;
    const lastPurchase = itemHistory.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];

    // Calculate trend (comparing last price to average)
    const lastPrice = lastPurchase.price;
    const trend = lastPrice < average ? 'down' : lastPrice > average ? 'up' : 'stable';

    return {
      lowest,
      highest,
      average,
      lastPurchase,
      history: itemHistory.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
      trend
    };
  };

  // Get unique items
  const uniqueItems = Array.from(new Set(priceHistory.map(p => p.itemName)));

  // Get best deals (items currently at their lowest price)
  const bestDeals = uniqueItems
    .map(itemName => {
      const stats = getItemStats(itemName);
      if (!stats) return null;
      const isLowest = stats.lastPurchase.price === stats.lowest;
      return isLowest ? { itemName, ...stats } : null;
    })
    .filter(Boolean)
    .slice(0, 5);

  return (
    <div className={`max-w-4xl mx-auto p-4 ${rtl ? 'rtl' : ''}`}>
      {/* Header with Back Button */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:opacity-90 transition-opacity shadow-lg"
        >
          <span className={`text-xl ${rtl ? 'inline-block transform rotate-180' : ''}`}>←</span>
        </button>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          {translations.priceCompare} 💰
        </h1>
      </div>

      {/* Price Comparison Disclaimer */}
      <div className="mb-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700">
        <div className="flex items-start gap-2">
          <span className="text-lg flex-shrink-0">ℹ️</span>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {rtl
              ? 'שים לב: השוואת מחירים מדויקת רק כאשר קונים את אותה כמות (למשל 1 ליטר חלב, 1 ק"ג עגבניות). מחירים שונים עשויים להשתנות בגלל כמויות או משקל שונה של המוצר.'
              : 'Note: Price comparisons are only accurate when buying the same quantity (e.g., 1L milk, 1kg tomatoes). Prices may vary due to different product quantities or weights.'
            }
          </p>
        </div>
      </div>

      {/* Price Tracking Disabled Banner - MOVED TO TOP */}
      {!priceTrackingEnabled && (
        <div className="mb-6 p-6 rounded-xl bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-300 dark:border-yellow-700 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="text-4xl">⚠️</div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
                {rtl ? 'מעקב מחירים כבוי!' : 'Price Tracking is Disabled!'}
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                {rtl 
                  ? `יש לך ${historyItemsCount} פריטים בהיסטוריה, אבל מעקב המחירים כבוי. הפעל אותו כדי להתחיל לעקוב אחר מחירים!`
                  : `You have ${historyItemsCount} items in your history, but price tracking is OFF. Enable it to start tracking prices when you complete items!`
                }
              </p>
              <label className="flex items-center gap-3 cursor-pointer bg-white dark:bg-gray-800 p-4 rounded-lg border border-yellow-200 dark:border-yellow-700 hover:bg-yellow-50 dark:hover:bg-gray-700 transition-colors">
                <input
                  type="checkbox"
                  checked={priceTrackingEnabled}
                  onChange={(e) => onTogglePriceTracking(e.target.checked)}
                  className="w-6 h-6 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                />
                <div className="flex-1">
                  <div className="font-semibold text-gray-800 dark:text-white">
                    💰 {translations.enablePriceTracking}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {translations.priceTrackingDesc}
                  </div>
                </div>
              </label>
              <div className="mt-4 text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-700">
                <strong>{rtl ? 'טיפ:' : 'Tip:'}</strong> {rtl 
                  ? 'לאחר הפעלה, תתבקש להוסיף מחירים בכל פעם שתסמן פריטים כהושלמו.'
                  : 'Once enabled, you\'ll be prompted to add prices whenever you complete items.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={translations.searchPlaceholder}
          className={`w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:border-blue-500 transition-colors ${rtl ? 'text-right' : ''}`}
        />
      </div>

      {/* Best Deals Section */}
      {bestDeals.length > 0 && searchQuery === '' && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <span>🔥</span>
            <span>{translations.bestDeals}</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {bestDeals.map((deal: any) => (
              <div
                key={deal.itemName}
                className="p-4 rounded-xl backdrop-blur-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border border-green-200 dark:border-green-700 shadow-lg cursor-pointer hover:scale-105 transition-transform"
                onClick={() => setSelectedItem(deal.itemName)}
              >
                <div className="font-bold text-gray-800 dark:text-white mb-2">
                  {deal.itemName}
                </div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  ₪{deal.lowest.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {deal.lastPurchase.store}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Items List */}
      {priceHistory.length === 0 ? (
        <div className="text-center py-12 px-4">
          <div className="text-6xl mb-4">📊</div>
          <p className="text-gray-700 dark:text-gray-300 text-xl font-bold mb-4">
            {translations.noPriceData}
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-base mb-6">
            {translations.trackNewItem}
          </p>
          
          {/* Step-by-step guide */}
          <div className="max-w-md mx-auto text-left bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700 shadow-lg">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 text-center">
              {rtl ? 'איך להתחיל:' : 'How to Start:'}
            </h3>
            <ol className={`space-y-3 text-sm text-gray-700 dark:text-gray-300 ${rtl ? 'text-right' : 'text-left'}`}>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">1</span>
                <span>{rtl ? 'לחץ על כרטיס "רשימה" בלוח הבקרה' : 'Click "List" card on dashboard'}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">2</span>
                <span>{rtl ? 'הוסף פריטים לרשימה שלך (לדוגמה: "חלב, לחם, ביצים")' : 'Add items to your list (e.g., "milk, bread, eggs")'}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">3</span>
                <span>{rtl ? 'סמן אותם כשקנית' : 'Check them off when you shop'}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">4</span>
                <span>{rtl ? 'הוסף את המחיר והחנות כשתתבקש' : 'Add price and store when prompted'}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">5</span>
                <span>{rtl ? 'חזור לכאן כדי לראות את השוואת המחירים!' : 'Come back here to see price comparisons!'}</span>
              </li>
            </ol>
            
            <button
              onClick={onBack}
              className="mt-6 w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-lg hover:opacity-90 transition-all shadow-md flex items-center justify-center gap-2"
            >
              <span>{rtl ? 'עבור לרשימה →' : '← Go to List'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {uniqueItems
            .filter(itemName =>
              searchQuery === '' || itemName.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map(itemName => {
              const stats = getItemStats(itemName);
              if (!stats) return null;

              const isExpanded = selectedItem === itemName;

              return (
                <div
                  key={itemName}
                  className="rounded-xl backdrop-blur-lg bg-white/70 dark:bg-gray-800/70 border border-white/20 dark:border-gray-700/30 shadow-lg overflow-hidden transition-all"
                  style={{
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                  }}
                >
                  {/* Item Summary */}
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors"
                    onClick={() => setSelectedItem(isExpanded ? null : itemName)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                        {itemName}
                      </h3>
                      <span className="text-2xl">
                        {stats.trend === 'down' ? '📉' : stats.trend === 'up' ? '📈' : '➡️'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          {translations.lowestPrice}
                        </div>
                        <div className="text-lg font-bold text-green-600 dark:text-green-400">
                          ₪{stats.lowest.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          {translations.avgPrice}
                        </div>
                        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          ₪{stats.average.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          {translations.highestPrice}
                        </div>
                        <div className="text-lg font-bold text-red-600 dark:text-red-400">
                          ₪{stats.highest.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 flex items-center justify-between">
                      <span>
                        {translations.lastPurchased}: {new Date(stats.lastPurchase.date).toLocaleDateString()}
                      </span>
                      <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                        ▼
                      </span>
                    </div>
                  </div>

                  {/* Expanded Price History */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50/50 dark:bg-gray-900/50">
                      <h4 className="font-bold text-gray-800 dark:text-white mb-3">
                        {translations.priceHistory}
                      </h4>
                      <div className="space-y-2">
                        {stats.history.map((record, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-800 shadow-sm"
                          >
                            <div className="flex-1">
                              <div className="font-medium text-gray-800 dark:text-white">
                                {record.store}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(record.date).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="text-lg font-bold text-gray-800 dark:text-white">
                              ₪{record.price.toFixed(2)}
                            </div>
                            {record.price === stats.lowest && (
                              <span className="ml-2 text-green-500">🏆</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};

