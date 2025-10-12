
export interface GroceryItem {
  id: string;
  name: string;
  completed: boolean;
  category: string;
  quantity?: number;
  unit?: string;
  originalText?: string; // Original input like "2× milk 1L"
  addedAt?: string; // When added to current list
}

export interface Category {
  name: string;
  items: GroceryItem[];
}

// Unified Purchase History (replaces GroceryHistoryItem and SuggestedItem)
export interface PurchaseHistoryItem {
  name: string;
  category: string;
  frequency: number; // Total times purchased
  lastPurchased: string; // ISO date string
  firstPurchased?: string; // ISO date string
  avgDaysBetween?: number; // Average days between purchases (for predictions)
  starred?: boolean; // User can manually star favorite items
  tags?: string[]; // e.g., ['staple', 'seasonal', 'weekly']
}

// Legacy type - will be migrated to PurchaseHistoryItem
export interface GroceryHistoryItem {
    name: string;
    category: string;
    frequency: number;
    lastAdded: string; // ISO date string
}

export interface GroceryListData {
    items: GroceryItem[];
    history: PurchaseHistoryItem[]; // Updated to use new unified type
}
