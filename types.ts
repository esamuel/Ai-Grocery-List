
export interface GroceryItem {
  id: string;
  name: string;
  completed: boolean;
  category: string;
  quantity?: number;
  unit?: string;
  originalText?: string; // Original input like "2× milk 1L"
}

export interface Category {
  name: string;
  items: GroceryItem[];
}

export interface GroceryHistoryItem {
    name: string;
    category: string;
    frequency: number;
    lastAdded: string; // ISO date string
}

export interface GroceryListData {
    items: GroceryItem[];
    history: GroceryHistoryItem[];
}
