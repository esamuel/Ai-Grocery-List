
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
  canonicalName?: string;
  
  // 💰 Price tracking
  prices?: PriceHistory[]; // Historical prices
  lastPrice?: number; // Last paid price
  avgPrice?: number; // Average price
  lowestPrice?: number; // Best deal ever
  highestPrice?: number; // Most expensive
}

// Price history entry
export interface PriceHistory {
  price: number; // Total price paid
  currency: string;
  purchaseDate: string; // ISO date string
  store?: string; // Optional: which store
  quantity?: number; // How many bought at this price (e.g., 2kg)

  // NEW: Unit price tracking (for accurate store comparison)
  unitPrice?: number; // Price per unit (e.g., ₪6/kg)
  unit?: string; // Unit type: 'kg', 'lb', 'g', 'piece', 'liter', 'ml', etc.
  
  // IMPORTANT: Price estimation flag
  estimatedPrice?: boolean; // True if price was auto-estimated (not user-entered)
}

// User settings for price tracking
export interface UserSettings {
  enablePriceTracking: boolean;
  currency: string; // USD, ILS, EUR, etc.
  budgetAlerts: boolean;
  monthlyBudget?: number;
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

// Subscription types
export type PlanTier = 'free' | 'pro' | 'family';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';
export type PaymentProvider = 'stripe' | 'paypal';

export interface UserSubscription {
  userId: string; // Firebase UID
  plan: PlanTier;
  status: SubscriptionStatus;
  provider: PaymentProvider;

  // Provider-specific IDs
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  paypalSubscriptionId?: string;

  // Billing info
  currentPeriodStart: string; // ISO date
  currentPeriodEnd: string; // ISO date
  cancelAtPeriodEnd?: boolean;

  // Trial info
  trialStart?: string;
  trialEnd?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;

  // Usage tracking (for free tier limits)
  usageStats?: {
    aiCategorizationsThisMonth?: number;
    lastResetDate?: string;
  };
}

// 🛒 Basket Comparison Types
export type BasketType = 'weekly' | 'monthly';

export interface BasketItem {
  name: string; // Product name
  category: string;
  quantity: number; // How many units
  unit?: string; // kg, piece, liter, etc.
  
  // Price per store (from history or manual entry)
  storePrices: {
    [storeName: string]: {
      price: number; // Total price for this quantity
      unitPrice?: number; // Price per unit
      lastUpdated: string; // ISO date
      isManual: boolean; // True if manually entered, false if from history
    };
  };
}

export interface ComparisonBasket {
  id: string; // Unique basket ID
  type: BasketType; // 'weekly' or 'monthly'
  name: string; // User-friendly name
  items: BasketItem[];
  
  // Auto-update settings
  autoUpdate: boolean; // If true, basket updates based on purchase history
  lastAutoUpdate?: string; // ISO date of last auto-update
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string; // User ID
}

// Store comparison result
export interface StoreComparison {
  storeName: string;
  totalPrice: number;
  itemsWithPrices: number; // How many items have prices for this store
  missingItems: string[]; // Items without prices
  savings?: number; // Compared to most expensive store
  savingsPercent?: number;
  isCheapest?: boolean;
  isMostExpensive?: boolean;
}

// Full basket comparison result
export interface BasketComparisonResult {
  basket: ComparisonBasket;
  stores: StoreComparison[];
  cheapestStore?: string;
  mostExpensiveStore?: string;
  maxSavings?: number; // Maximum possible savings
  recommendations?: string[]; // Smart recommendations
}
