import { 
  ComparisonBasket, 
  BasketItem, 
  BasketType, 
  StoreComparison, 
  BasketComparisonResult,
  PurchaseHistoryItem 
} from '../types';

/**
 * Identify top N most frequently purchased items from history
 */
export const getTopPurchasedItems = (
  history: PurchaseHistoryItem[],
  count: number = 12,
  daysBack: number = 30
): BasketItem[] => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);
  const cutoffISO = cutoffDate.toISOString();

  // Filter items purchased within the time window
  const recentItems = history.filter(item => 
    item.lastPurchased >= cutoffISO
  );

  // Sort by frequency (most purchased first)
  const sorted = recentItems.sort((a, b) => b.frequency - a.frequency);

  // Take top N items and convert to BasketItem format
  return sorted.slice(0, count).map(item => {
    const basketItem: BasketItem = {
      name: item.name,
      category: item.category,
      quantity: 1, // Default quantity
      unit: 'piece',
      storePrices: {}
    };

    // Extract store prices from price history
    if (item.prices && item.prices.length > 0) {
      const storeMap: { [store: string]: typeof item.prices } = {};
      
      // Group prices by store
      item.prices.forEach(priceEntry => {
        if (priceEntry.store) {
          if (!storeMap[priceEntry.store]) {
            storeMap[priceEntry.store] = [];
          }
          storeMap[priceEntry.store].push(priceEntry);
        }
      });

      // Calculate average price per store
      Object.entries(storeMap).forEach(([storeName, prices]) => {
        // Get most recent price
        const sortedPrices = prices.sort((a, b) => 
          new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
        );
        const latestPrice = sortedPrices[0];

        basketItem.storePrices[storeName] = {
          price: latestPrice.price,
          unitPrice: latestPrice.unitPrice,
          lastUpdated: latestPrice.purchaseDate,
          isManual: latestPrice.estimatedPrice || false
        };

        // Update quantity and unit from latest purchase
        if (latestPrice.quantity) {
          basketItem.quantity = latestPrice.quantity;
        }
        if (latestPrice.unit) {
          basketItem.unit = latestPrice.unit;
        }
      });
    }

    return basketItem;
  });
};

/**
 * Create a new comparison basket
 */
export const createBasket = (
  type: BasketType,
  items: BasketItem[],
  userId: string,
  autoUpdate: boolean = true
): ComparisonBasket => {
  const now = new Date().toISOString();
  const name = type === 'weekly' ? 'סל שבועי' : 'סל חודשי';

  return {
    id: `basket_${type}_${Date.now()}`,
    type,
    name,
    items,
    autoUpdate,
    lastAutoUpdate: autoUpdate ? now : undefined,
    createdAt: now,
    updatedAt: now,
    createdBy: userId
  };
};

/**
 * Update basket items from purchase history
 */
export const updateBasketFromHistory = (
  basket: ComparisonBasket,
  history: PurchaseHistoryItem[]
): ComparisonBasket => {
  if (!basket.autoUpdate) {
    return basket;
  }

  const daysBack = basket.type === 'weekly' ? 7 : 30;
  const topItems = getTopPurchasedItems(history, basket.items.length, daysBack);

  // Merge new prices with existing manual entries
  const updatedItems = basket.items.map(existingItem => {
    const newItem = topItems.find(item => item.name === existingItem.name);
    
    if (!newItem) {
      return existingItem; // Keep item as-is if not in top items
    }

    // Merge store prices, keeping manual entries
    const mergedPrices = { ...existingItem.storePrices };
    
    Object.entries(newItem.storePrices).forEach(([store, priceData]) => {
      // Only update if not manually entered or if newer
      if (!mergedPrices[store] || 
          (!mergedPrices[store].isManual && 
           new Date(priceData.lastUpdated) > new Date(mergedPrices[store].lastUpdated))) {
        mergedPrices[store] = priceData;
      }
    });

    return {
      ...existingItem,
      storePrices: mergedPrices,
      quantity: newItem.quantity,
      unit: newItem.unit
    };
  });

  return {
    ...basket,
    items: updatedItems,
    lastAutoUpdate: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
};

/**
 * Calculate store comparison for a basket
 */
export const calculateStoreComparison = (
  basket: ComparisonBasket
): BasketComparisonResult => {
  // Get all unique stores
  const allStores = new Set<string>();
  basket.items.forEach(item => {
    Object.keys(item.storePrices).forEach(store => allStores.add(store));
  });

  // Calculate total for each store
  const storeComparisons: StoreComparison[] = Array.from(allStores).map(storeName => {
    let totalPrice = 0;
    let itemsWithPrices = 0;
    const missingItems: string[] = [];

    basket.items.forEach(item => {
      const storePrice = item.storePrices[storeName];
      if (storePrice) {
        totalPrice += storePrice.price;
        itemsWithPrices++;
      } else {
        missingItems.push(item.name);
      }
    });

    return {
      storeName,
      totalPrice,
      itemsWithPrices,
      missingItems
    };
  });

  // Sort by total price (cheapest first)
  storeComparisons.sort((a, b) => {
    // Prioritize stores with more items
    if (a.itemsWithPrices !== b.itemsWithPrices) {
      return b.itemsWithPrices - a.itemsWithPrices;
    }
    return a.totalPrice - b.totalPrice;
  });

  // Mark cheapest and most expensive
  if (storeComparisons.length > 0) {
    const validStores = storeComparisons.filter(s => s.itemsWithPrices > 0);
    
    if (validStores.length > 0) {
      validStores[0].isCheapest = true;
      validStores[validStores.length - 1].isMostExpensive = true;

      const cheapestPrice = validStores[0].totalPrice;
      const mostExpensivePrice = validStores[validStores.length - 1].totalPrice;

      // Calculate savings for each store
      validStores.forEach(store => {
        store.savings = mostExpensivePrice - store.totalPrice;
        store.savingsPercent = mostExpensivePrice > 0 
          ? ((store.savings / mostExpensivePrice) * 100) 
          : 0;
      });
    }
  }

  // Generate recommendations
  const recommendations: string[] = [];
  const cheapestStore = storeComparisons.find(s => s.isCheapest);
  const mostExpensiveStore = storeComparisons.find(s => s.isMostExpensive);

  if (cheapestStore && mostExpensiveStore && cheapestStore !== mostExpensiveStore) {
    const savings = mostExpensiveStore.totalPrice - cheapestStore.totalPrice;
    const savingsPercent = (savings / mostExpensiveStore.totalPrice) * 100;
    
    recommendations.push(
      `חיסכון של ₪${savings.toFixed(2)} (${savingsPercent.toFixed(1)}%) אם תקנה ב-${cheapestStore.storeName} במקום ב-${mostExpensiveStore.storeName}`
    );
  }

  // Check for missing items
  const storesWithMissingItems = storeComparisons.filter(s => s.missingItems.length > 0);
  if (storesWithMissingItems.length > 0) {
    recommendations.push(
      `הוסף מחירים חסרים כדי לקבל השוואה מדויקת יותר`
    );
  }

  return {
    basket,
    stores: storeComparisons,
    cheapestStore: cheapestStore?.storeName,
    mostExpensiveStore: mostExpensiveStore?.storeName,
    maxSavings: cheapestStore && mostExpensiveStore 
      ? mostExpensiveStore.totalPrice - cheapestStore.totalPrice 
      : undefined,
    recommendations
  };
};

/**
 * Add or update manual price for an item in a basket
 */
export const updateItemPrice = (
  basket: ComparisonBasket,
  itemName: string,
  storeName: string,
  price: number,
  unitPrice?: number
): ComparisonBasket => {
  const updatedItems = basket.items.map(item => {
    if (item.name === itemName) {
      return {
        ...item,
        storePrices: {
          ...item.storePrices,
          [storeName]: {
            price,
            unitPrice,
            lastUpdated: new Date().toISOString(),
            isManual: true
          }
        }
      };
    }
    return item;
  });

  return {
    ...basket,
    items: updatedItems,
    updatedAt: new Date().toISOString()
  };
};

/**
 * Add a new item to basket
 */
export const addItemToBasket = (
  basket: ComparisonBasket,
  item: BasketItem
): ComparisonBasket => {
  // Check if item already exists
  const existingIndex = basket.items.findIndex(i => i.name === item.name);
  
  if (existingIndex >= 0) {
    // Update existing item
    const updatedItems = [...basket.items];
    updatedItems[existingIndex] = item;
    return {
      ...basket,
      items: updatedItems,
      updatedAt: new Date().toISOString()
    };
  }

  // Add new item
  return {
    ...basket,
    items: [...basket.items, item],
    updatedAt: new Date().toISOString()
  };
};

/**
 * Remove item from basket
 */
export const removeItemFromBasket = (
  basket: ComparisonBasket,
  itemName: string
): ComparisonBasket => {
  return {
    ...basket,
    items: basket.items.filter(item => item.name !== itemName),
    updatedAt: new Date().toISOString()
  };
};

