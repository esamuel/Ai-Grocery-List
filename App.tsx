
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { GroceryItem, Category, PurchaseHistoryItem, GroceryHistoryItem } from './types';
import { ItemInput } from './components/ItemInput';
import { GroceryList } from './components/GroceryList';
import { categorizeGroceries } from './services/geminiService';
import { FavoritesPage } from './components/FavoritesPage';
import { PriceInputModal } from './components/PriceInputModal';
import { SpendingInsights } from './components/SpendingInsights';
import { DailyPurchases } from './components/DailyPurchases';
import { ListIcon } from './components/icons/ListIcon';
import { StarIcon } from './components/icons/StarIcon';
import { UsersIcon } from './components/icons/UsersIcon';
import { InfoIcon } from './components/icons/InfoIcon';
import { GearIcon } from './components/icons/GearIcon';
import { LoginPage } from './components/LoginPage';
import { OnboardingModal } from './components/OnboardingModal';
import { SmartSuggestions } from './components/SmartSuggestions';
import type { ShoppingSuggestion } from './services/smartSuggestionsService';
import { ImportExportModal } from './components/ImportExportModal';
import { LegalPage } from './components/LegalPage';
import { Toast } from './components/Toast';
import { InstallPrompt } from './components/InstallPrompt';
import { PaywallModal } from './components/PaywallModal';
import { AdBanner } from './components/AdBanner';
import { LandingPage } from './components/LandingPage';
import { FamilyActivities } from './components/FamilyActivities';
import { DashboardPage } from './components/DashboardPage';
import { PriceComparePage } from './components/PriceComparePage';
import { useFirestoreSync } from './hooks/useFirestoreSync';
import { usePWAInstall } from './hooks/usePWAInstall';
import { onAuthStateChange, signOutUser, getAccessibleListId, addFamilyMember, isListOwner, getUserDisplayName, updateUserDisplayName } from './services/firebaseService';
import { logFamilyActivity } from './services/familyActivityService';
import { migrateListOwnershipFields, checkListNeedsMigration } from './services/listMigration';
import type { User } from 'firebase/auth';

// Helper to get friendly name from user (fallback only)
const getFriendlyUserNameFallback = (user: User | null): string => {
  if (!user) return 'User';
  if (user.displayName) return user.displayName;
  if (user.email) {
    const localPart = user.email.split('@')[0];
    const parts = localPart.split(/[._-]/);
    const capitalized = parts.map(part =>
      part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    );
    return capitalized.join(' ');
  }
  return 'User';
};
import { addOrIncrementPurchase } from './services/purchaseHistoryService';
import { isSemanticDuplicate, normalize } from './services/semanticDupService';
import { getUserSubscription } from './services/subscriptionService';
import { migrateOtherCategoryToPantry, checkMigrationNeeded } from './services/categoryMigration';
type Language = 'en' | 'he' | 'es';
  type View = 'dashboard' | 'list' | 'favorites' | 'insights' | 'daily' | 'legal' | 'family' | 'priceCompare';

const translations = {
  en: {
    title: "AI Grocery list",
    subtitle: "Your smart shopping companion",
    error: "Failed to categorize items. Please try again.",
    inputPlaceholder: "e.g., '2 avocados, milk, bread'",
    adding: "Adding...",
    add: "Add",
    emptyTitle: "Your List is Empty",
    emptySubtitle: "Add items below to get started!",
    uncategorized: "Uncategorized",
    clearCompleted: "Clear Completed",
    list: "List",
    favorites: "History",
    family: "Family",
    favoritesTitle: "Purchase History",
    favoritesSubtitle: "Shop faster by adding your frequent purchases.",
    familyTitle: "Family List",
    familySubtitle: "Shared with family members",
    familyMembersTitle: "Family Members",
    familyOwner: "Owner",
    familyMember: "Member",
    familyActiveNow: "Active now",
    familyRecentActivity: "Recent Activity",
    familyNoActivity: "No recent activity",
    familyCheckedOff: "checked off",
    familyAdded: "added",
    familyRemoved: "removed",
    familyYou: "You",
    familyMinutesAgo: "m ago",
    familyHoursAgo: "h ago",
    familyDaysAgo: "d ago",
    familyJustNow: "Just now",
    purchased: "purchased",
    times: "times",
    deleteFromHistory: "Delete",
    addToList: "Add",
    shareCode: "Share Code",
    leaveList: "Leave List",
    syncing: "Syncing...",
    // Login translations
    loginTitle: "Aii Grocery list",
    loginSubtitle: "Sign in to sync your favorites across devices",
    email: "Email",
    password: "Password",
    signIn: "Sign In",
    signUp: "Create Account",
    switchToSignUp: "Need an account? Sign up",
    switchToSignIn: "Already have an account? Sign in",
    signingIn: "Signing in...",
    signingUp: "Creating account...",
    signOut: "Sign Out",
    help: "Help",
    displayName: "Display Name",
    displayNameDesc: "Set your name to show in Family Activities",
    saveDisplayName: "Save Name",
    savingDisplayName: "Saving...",
    // Onboarding
    welcomeUser: "Welcome",
    welcome: "Welcome to Aii Grocery list!",
    onboardingSubtitle: "Let's get you started with your smart shopping companion",
    step1Title: "Smart Shopping Lists",
    step1Desc: "Add items by typing or speaking. Our AI automatically organizes them by category for efficient shopping.",
    step2Title: "Voice Recognition",
    step2Desc: "Tap the microphone and speak your items naturally. Works in multiple languages including Hebrew and Spanish.",
    step3Title: "AI-Powered Organization",
    step3Desc: "Items are automatically categorized (produce, dairy, etc.) and intelligently organized for your convenience.",
    step4Title: "Family Sharing",
    step4Desc: "Invite family members to collaborate on the same list. Changes sync in real-time across all devices.",
    step5Title: "Smart Favorites",
    step5Desc: "Completed items become favorites. Easily re-add frequently purchased items with one tap.",
    step6Title: "Getting Started Guide",
    step6Desc: "Ready to begin? Here's your quick start guide for account setup and family sharing.",
    next: "Next",
    previous: "Previous",
    getStarted: "Get Started",
    skip: "Skip",
    // Smart Suggestions
    suggestionsTitle: "Smart Suggestions",
    suggestionsSubtitle: "Based on your shopping patterns and time of day",
    addSuggestion: "Add",
    noSuggestions: "No suggestions available",
    predictive: "Smart Prediction",
    timeBased: "Time-based",
    frequencyBased: "Frequent",
    seasonal: "Seasonal",
    complementary: "Goes well together",
    // Import/Export
    importExport: "Import/Export",
    importExportTitle: "Import & Export Lists",
    importTab: "Import",
    exportTab: "Export",
    importFromFile: "Import from File",
    importFromClipboard: "Import from Clipboard",
    exportAsCSV: "Export as CSV",
    exportAsText: "Export as Text",
    selectFile: "Select File",
    pasteFromClipboard: "Paste from Clipboard",
    importing: "Importing...",
    exporting: "Exporting...",
    importSuccess: "Import successful!",
    importError: "Import failed",
    exportSuccess: "Export successful!",
    exportError: "Export failed",
    // Selection
    moveSelectedToFavorites: "Move Selected to Favorites",
    deleteSelected: "Delete Selected",
    selectAll: "Select All",
    deselectAll: "Deselect All",
    selectedCount: "{count} selected",
    addAll: "Add All",
    itemsImported: "{count} items imported",
    itemsSkipped: "{count} items skipped (already exist)",
    noItemsToExport: "No items to export",
    itemAlreadyAdded: "Item already added",
    fileTooBig: "File too large (max 5MB)",
    invalidFileType: "Invalid file type",
    clipboardEmpty: "Clipboard is empty",
    // Hints
    swipeHint: "Swipe right to favorite, left to delete.",
    gotIt: "Got it",
    // Price Tracking
    priceModalTitle: "Add Prices? (Optional)",
    priceModalSubtitle: "Track your spending on completed items",
    priceModalSkip: "Skip",
    priceModalSave: "Save with Prices",
    priceModalTotal: "Total",
    priceModalStore: "Store",
    priceModalStorePlaceholder: "e.g., Rami Levy, Shufersal, Mega...",
    enablePriceTracking: "Enable Price Tracking",
    priceTrackingDesc: "Track what you spend on groceries",
    // Spending Insights
    spendingInsights: "Spending Insights",
    monthlySpending: "Monthly Spending",
    itemsPurchased: "items purchased",
    avgPerItem: "Avg per item",
    weeklyTrend: "Weekly Trend",
    thisWeek: "This Week",
    lastWeek: "Last Week",
    categoryBreakdown: "Category Breakdown",
    budget: "Monthly Budget",
    remaining: "Remaining",
    overBudget: "Over Budget",
    noPriceData: "Complete items with prices to see insights",
    setBudget: "Set Monthly Budget",
    budgetDesc: "Track spending against a monthly budget",
    // Price Alerts
    bestPriceEver: "Best Price Ever",
    greatDeal: "Great Deal",
    priceIncreased: "Price Increased",
    higherThanUsual: "Higher Than Usual",
    // Store Comparison
    bestAtStore: "Best at",
    cheaper: "cheaper",
    // Sort buttons
    mostFrequent: "Most Frequent",
    today: "Today",
    starred: "Starred",
    category: "Category",
    alphabetical: "A-Z",
    
    // Daily Purchases
    dailyPurchases: "Daily Purchases",
    dailyPurchasesSubtitle: "View your shopping history by date",
    date: "Date",
    items: "items",
    totalSpent: "Total Spent",
    store: "Store",
    noPurchases: "No purchases found for this date",
    selectDate: "Select a Date",
    exportCSV: "Export CSV",
    generateReport: "Generate Report",
    copyReport: "Copy Report",
    reportCopied: "Report copied to clipboard!",
    recentShoppingDays: "Recent Shopping Days",
    // Legal
    legal: "Legal",
    privacyPolicy: "Privacy Policy",
    termsOfService: "Terms of Service",
    // PWA Install
    installTitle: "Install AI Grocery List",
    installMessage: "Add to your home screen for quick access and offline support",
    installButton: "Install Now",
    installLater: "Maybe Later",
    // Paywall
    paywallTitle: "Unlock Premium Features",
    paywallSubtitle: "Choose the perfect plan for your shopping needs",
    removeAdsTitle: "Remove Ads",
    removeAdsDescription: "Upgrade to Pro or Family plan for an ad-free experience",
    upgrade: "Upgrade",
    monthly: "Monthly",
    yearly: "Yearly",
    savePercent: "Save 40%",
    freePlan: "Free",
    proPlan: "Pro",
    familyPlan: "Family",
    popularBadge: "MOST POPULAR",
    currentBadge: "Current Plan",
    selectButton: "Start Free Trial",
    continueButton: "Continue Free",
    trialInfo: "7-day free trial, cancel anytime",
    freeFeature1: "Core grocery list",
    freeFeature2: "Basic AI categorization (50/month)",
    freeFeature3: "1 shared list",
    freeFeature4: "Includes ads",
    proFeature1: "Everything in Free",
    proFeature2: "No ads",
    proFeature3: "Unlimited AI categorization",
    proFeature4: "Unlimited shared lists",
    proFeature5: "Full purchase history",
    proFeature6: "Price tracking & alerts",
    proFeature7: "Spending insights",
    proFeature8: "Smart predictions",
    proFeature9: "Priority support",
    familyFeature1: "Everything in Pro",
    familyFeature2: "Up to 5 family members",
    familyFeature3: "Admin controls",
    familyFeature4: "Shared favorites",
    familyFeature5: "Family activity feed",
    familyFeature6: "Budget management",
    // Landing Page
    landingHeroTitle: "Never Forget Items or Overpay Again!",
    landingHeroSubtitle: "AI-powered grocery list that organizes your shopping, tracks prices, and helps you save money",
    landingHeroCta: "Start Free - 7 Days Trial",
    landingHeroSecondaryCta: "See Pricing",
    landingFeaturesTitle: "Everything You Need for Smarter Shopping",
    landingFeaturesSubtitle: "Save time and money with intelligent features",
    landingFeature1Title: "Smart AI Organization",
    landingFeature1Desc: "Items automatically sorted by category - produce, dairy, bakery, and more",
    landingFeature2Title: "Price Tracking",
    landingFeature2Desc: "Track prices across stores and find the best deals automatically",
    landingFeature3Title: "Family Sharing",
    landingFeature3Desc: "Share lists with family members and sync in real-time",
    landingFeature4Title: "Smart Predictions",
    landingFeature4Desc: "AI predicts what you need based on your shopping patterns",
    landingFeature5Title: "Voice Input",
    landingFeature5Desc: "Add items by speaking - works in multiple languages",
    landingFeature6Title: "Works Offline",
    landingFeature6Desc: "Access your lists anywhere, even without internet",
    landingHowItWorksTitle: "How It Works",
    landingHowItWorksStep1: "Add Items",
    landingHowItWorksStep1Desc: "Type or speak your grocery items naturally",
    landingHowItWorksStep2: "AI Organizes",
    landingHowItWorksStep2Desc: "Items are automatically categorized and sorted",
    landingHowItWorksStep3: "Shop & Save",
    landingHowItWorksStep3Desc: "Follow your organized list and track best prices",
    landingPricingTitle: "Simple, Transparent Pricing",
    landingPricingSubtitle: "Choose the plan that's right for you",
    landingPricingFree: "Free",
    landingPricingPro: "Pro",
    landingPricingFamily: "Family",
    landingPricingMostPopular: "MOST POPULAR",
    landingPricingGetStarted: "Get Started",
    landingPricingFreeFeature1: "Core grocery list features",
    landingPricingFreeFeature2: "50 AI categorizations/month",
    landingPricingFreeFeature3: "1 shared list",
    landingPricingFreeFeature4: "Includes ads",
    landingPricingProFeature1: "Everything in Free",
    landingPricingProFeature2: "No ads",
    landingPricingProFeature3: "Unlimited AI categorization",
    landingPricingProFeature4: "Price tracking & alerts",
    landingPricingProFeature5: "Smart predictions & insights",
    landingPricingFamilyFeature1: "Everything in Pro",
    landingPricingFamilyFeature2: "Up to 5 family members",
    landingPricingFamilyFeature3: "Shared favorites & budgets",
    landingCtaTitle: "Start Saving Money Today",
    landingCtaSubtitle: "Join thousands of shoppers who never overpay or forget items",
    landingCtaButton: "Try Free for 7 Days",
    installApp: "Install App",
    installAppDesc: "Add to home screen",
    appInstalled: "App installed successfully!",
    installNotAvailable: "Install not available on this device",
    darkMode: "Dark Mode",
    darkModeDesc: "Switch to dark theme",
    // Dashboard
    dashboard: "Dashboard",
    listDesc: "Manage your shopping list",
    historyDesc: "View purchase history",
    familyDesc: "Family members & activities",
    priceCompare: "Price Compare",
    priceCompareDesc: "Track & compare prices",
    insightsDesc: "View spending insights",
    dailyDesc: "Daily purchase history",
    voiceDesc: "Voice input shopping",
    importExportDesc: "Import & export lists",
    suggestionsDesc: "Smart AI suggestions",
    quickSearch: "Quick Search",
    viewAll: "View All",
    addItem: "Add Item",
    bestDeals: "Best Deals",
    searchPlaceholder: "Search items...",
    lowestPrice: "Lowest",
    highestPrice: "Highest",
    avgPrice: "Average",
    lastPurchased: "Last Purchased",
    priceHistory: "Price History",
    trackNewItem: "Track prices by completing items",
    itemName: "Item",
    trend: "Trend",
    back: "Back",
  },
  he: {
    title: "רשימת קניות חכמה",
    subtitle: "עוזר הקניות החכם שלך",
    error: "נכשל בקטגוריית פריטים. בבקשה נסה שוב.",
    inputPlaceholder: "לדוגמה, '2 אבוקדו, חלב, לחם'",
    adding: "מוסיף...",
    add: "הוסף",
    emptyTitle: "הרשימה שלך ריקה",
    emptySubtitle: "הוסף פריטים למטה כדי להתחיל!",
    uncategorized: "ללא קטגוריה",
    clearCompleted: "נקה פריטים שנקנו",
    list: "רשימה",
    favorites: "היסטוריה",
    family: "משפחה",
    favoritesTitle: "היסטוריית קניות",
    favoritesSubtitle: "קנה מהר יותר על ידי הוספת הרכישות התכופות שלך.",
    familyTitle: "רשימת משפחה",
    familySubtitle: "משותפת עם בני משפחה",
    familyMembersTitle: "בני משפחה",
    familyOwner: "בעלים",
    familyMember: "חבר",
    familyActiveNow: "פעיל כעת",
    familyRecentActivity: "פעילות אחרונה",
    familyNoActivity: "אין פעילות אחרונה",
    familyCheckedOff: "סימן כנרכש",
    familyAdded: "הוסיף",
    familyRemoved: "הסיר",
    familyYou: "אתה",
    familyMinutesAgo: "דק' לפני",
    familyHoursAgo: "שע' לפני",
    familyDaysAgo: "ימים לפני",
    familyJustNow: "ממש עכשיו",
    purchased: "נקנה",
    times: "פעמים",
    deleteFromHistory: "מחק",
    addToList: "הוסף",
    shareCode: "קוד שיתוף",
    leaveList: "עזוב רשימה",
    syncing: "מסנכרן...",
    // Login translations
    loginTitle: "רשימת קניות חכמה",
    loginSubtitle: "התחבר כדי לסנכרן את המועדפים שלך בין מכשירים",
    email: "אימייל",
    password: "סיסמה",
    signIn: "התחבר",
    signUp: "צור חשבון",
    switchToSignUp: "צריך חשבון? הירשם",
    switchToSignIn: "יש לך כבר חשבון? התחבר",
    signingIn: "מתחבר...",
    signingUp: "יוצר חשבון...",
    signOut: "התנתק",
    help: "עזרה",
    displayName: "שם תצוגה",
    displayNameDesc: "הגדר את שמך להצגה בפעילות משפחתית",
    saveDisplayName: "שמור שם",
    savingDisplayName: "שומר...",
    // Onboarding
    welcomeUser: "שלום",
    welcome: "ברוכים הבאים לרשימת קניות חכמה!",
    onboardingSubtitle: "בואו נתחיל עם עוזר הקניות החכם שלכם",
    step1Title: "רשימות קניות חכמות",
    step1Desc: "הוסיפו פריטים על ידי הקלדה או דיבור. הבינה המלאכותית שלנו מארגנת אותם אוטומטית לפי קטגוריות לקנייה יעילה.",
    step2Title: "זיהוי קולי",
    step2Desc: "לחצו על המיקרופון ודברו את הפריטים שלכם באופן טבעי. עובד במספר שפות כולל עברית וספרדית.",
    step3Title: "ארגון מבוסס בינה מלאכותית",
    step3Desc: "פריטים מקוטלגים אוטומטית (ירקות, חלב וכו') ומאורגנים בצורה חכמה לנוחותכם.",
    step4Title: "שיתוף משפחתי",
    step4Desc: "הזמינו בני משפחה לשתף פעולה באותה רשימה. שינויים מסתנכרנים בזמן אמת בכל המכשירים.",
    step5Title: "מועדפים חכמים",
    step5Desc: "פריטים שנקנו הופכים למועדפים. הוסיפו בקלות פריטים שנקנים לעתים קרובות בלחיצה אחת.",
    step6Title: "מדריך התחלה מהירה",
    step6Desc: "מוכנים להתחיל? הנה המדריך המהיר שלכם להקמת חשבון ושיתוף משפחתי.",
    next: "הבא",
    previous: "הקודם",
    getStarted: "בואו נתחיל",
    skip: "דלג",
    // Smart Suggestions
    suggestionsTitle: "הצעות חכמות",
    suggestionsSubtitle: "מבוסס על דפוסי הקנייה שלך ושעת היום",
    addSuggestion: "הוסף",
    noSuggestions: "אין הצעות זמינות",
    predictive: "חיזוי חכם",
    timeBased: "מבוסס זמן",
    frequencyBased: "תכוף",
    seasonal: "עונתי",
    complementary: "משתלבים יחד",
    // Import/Export
    importExport: "יבוא/יצוא",
    importExportTitle: "יבוא ויצוא רשימות",
    importTab: "יבוא",
    exportTab: "יצוא",
    importFromFile: "יבוא מקובץ",
    importFromClipboard: "יבוא מהלוח",
    exportAsCSV: "יצוא כ-CSV",
    exportAsText: "יצוא כטקסט",
    selectFile: "בחר קובץ",
    pasteFromClipboard: "הדבק מהלוח",
    importing: "מייבא...",
    exporting: "מייצא...",
    importSuccess: "יבוא הצליח!",
    importError: "הייבוא נכשל",
    exportSuccess: "הייצוא הצליח!",
    exportError: "הייצוא נכשל",
    // Selection
    moveSelectedToFavorites: "העבר נבחרים למועדפים",
    deleteSelected: "מחק נבחרים",
    selectAll: "בחר הכל",
    deselectAll: "בטל בחירה",
    selectedCount: "{count} נבחרו",
    addAll: "הוסף הכל",
    itemsImported: "{count} פריטים יובאו",
    itemsSkipped: "{count} פריטים דולגו (כבר קיימים)",
    noItemsToExport: "אין פריטים לייצא",
    fileTooBig: "קובץ גדול מדי (מקס 5MB)",
    invalidFileType: "סוג קובץ לא תקין",
    clipboardEmpty: "הלוח ריק",
    // Hints
    swipeHint: "רמז: החלק ימינה למחיקה, שמאלה למועדפים.",
    gotIt: "הבנתי",
    itemAlreadyAdded: "הפריט כבר נוסף",
    // Price Tracking
    priceModalTitle: "להוסיף מחירים? (אופציונלי)",
    priceModalSubtitle: "עקוב אחר ההוצאות שלך על פריטים שנרכשו",
    priceModalSkip: "דלג",
    priceModalSave: "שמור עם מחירים",
    priceModalTotal: "סה״כ",
    priceModalStore: "חנות",
    priceModalStorePlaceholder: "למשל, רמי לוי, שופרסל, מגה...",
    enablePriceTracking: "הפעל מעקב מחירים",
    priceTrackingDesc: "עקוב אחר מה שאתה מוציא על מצרכים",
    // Spending Insights
    spendingInsights: "תובנות הוצאות",
    monthlySpending: "הוצאות חודשיות",
    itemsPurchased: "פריטים נרכשו",
    avgPerItem: "ממוצע לפריט",
    weeklyTrend: "מגמה שבועית",
    thisWeek: "השבוע",
    lastWeek: "שבוע שעבר",
    categoryBreakdown: "פירוט לפי קטגוריה",
    budget: "תקציב חודשי",
    remaining: "נותר",
    overBudget: "חריגה מהתקציב",
    noPriceData: "השלם פריטים עם מחירים כדי לראות תובנות",
    setBudget: "הגדר תקציב חודשי",
    budgetDesc: "עקוב אחר הוצאות מול תקציב חודשי",
    // Price Alerts
    bestPriceEver: "המחיר הכי טוב אי פעם",
    greatDeal: "עסקה מעולה",
    priceIncreased: "מחיר עלה",
    higherThanUsual: "יותר יקר מהרגיל",
    // Store Comparison
    bestAtStore: "הכי זול ב",
    cheaper: "זול יותר",
    // Sort buttons
    mostFrequent: "הכי תכוף",
    today: "היום",
    starred: "מועדפים",
    category: "קטגוריה",
    alphabetical: "א-ת",
    
    // Daily Purchases
    dailyPurchases: "קניות יומיות",
    dailyPurchasesSubtitle: "צפה בהיסטוריית הקניות שלך לפי תאריך",
    date: "תאריך",
    items: "פריטים",
    totalSpent: "סך הכל הוצא",
    store: "חנות",
    noPurchases: "לא נמצאו קניות לתאריך זה",
    selectDate: "בחר תאריך",
    exportCSV: "ייצא CSV",
    generateReport: "צור דוח",
    copyReport: "העתק דוח",
    reportCopied: "הדוח הועתק ללוח!",
    recentShoppingDays: "ימי קניות אחרונים",
    // Legal
    legal: "מידע משפטי",
    privacyPolicy: "מדיניות פרטיות",
    termsOfService: "תנאי שירות",
    // PWA Install
    installTitle: "התקן רשימת קניות חכמה",
    installMessage: "הוסף למסך הבית לגישה מהירה ותמיכה במצב לא מקוון",
    installButton: "התקן עכשיו",
    installLater: "אולי מאוחר יותר",
    // Paywall
    paywallTitle: "פתח תכונות פרימיום",
    paywallSubtitle: "בחר את התוכנית המושלמת לצרכי הקניות שלך",
    removeAdsTitle: "הסר פרסומות",
    removeAdsDescription: "שדרג לתוכנית Pro או Family לחוויה ללא פרסומות",
    upgrade: "שדרג",
    monthly: "חודשי",
    yearly: "שנתי",
    savePercent: "חסוך 40%",
    freePlan: "חינם",
    proPlan: "מקצועי",
    familyPlan: "משפחה",
    popularBadge: "הכי פופולרי",
    currentBadge: "תוכנית נוכחית",
    selectButton: "התחל ניסיון חינם",
    continueButton: "המשך חינם",
    trialInfo: "ניסיון חינם ל-7 ימים, ביטול בכל עת",
    freeFeature1: "רשימת קניות בסיסית",
    freeFeature2: "קטגוריזציה חכמה (50/חודש)",
    freeFeature3: "רשימה משותפת אחת",
    freeFeature4: "כולל פרסומות",
    proFeature1: "כל מה שבחינם",
    proFeature2: "ללא פרסומות",
    proFeature3: "קטגוריזציה בלתי מוגבלת",
    proFeature4: "רשימות משותפות ללא הגבלה",
    proFeature5: "היסטוריית קניות מלאה",
    proFeature6: "מעקב מחירים והתראות",
    proFeature7: "תובנות הוצאות",
    proFeature8: "חיזויים חכמים",
    proFeature9: "תמיכה עדיפות",
    familyFeature1: "כל מה שבמקצועי",
    familyFeature2: "עד 5 בני משפחה",
    familyFeature3: "בקרות מנהל",
    familyFeature4: "מועדפים משותפים",
    familyFeature5: "פיד פעילות משפחתי",
    familyFeature6: "ניהול תקציב",
    // Landing Page
    landingHeroTitle: "לא לשכוח פריטים ולא לשלם יותר מדי!",
    landingHeroSubtitle: "רשימת קניות חכמה שמארגנת את הקניות, עוקבת אחרי מחירים ועוזרת לך לחסוך כסף",
    landingHeroCta: "התחל חינם - 7 ימי ניסיון",
    landingHeroSecondaryCta: "ראה מחירון",
    landingFeaturesTitle: "כל מה שאתה צריך לקניות חכמות יותר",
    landingFeaturesSubtitle: "חסוך זמן וכסף עם תכונות חכמות",
    landingFeature1Title: "ארגון חכם עם בינה מלאכותית",
    landingFeature1Desc: "פריטים ממוינים אוטומטית לפי קטגוריות - ירקות, חלב, לחם ועוד",
    landingFeature2Title: "מעקב מחירים",
    landingFeature2Desc: "מעקב אחר מחירים בחנויות שונות ומציאת העסקאות הטובות ביותר",
    landingFeature3Title: "שיתוף משפחתי",
    landingFeature3Desc: "שתף רשימות עם בני משפחה וסנכרן בזמן אמת",
    landingFeature4Title: "חיזויים חכמים",
    landingFeature4Desc: "בינה מלאכותית מנבאת מה אתה צריך על בסיס דפוסי הקניות שלך",
    landingFeature5Title: "קלט קולי",
    landingFeature5Desc: "הוסף פריטים דרך דיבור - עובד בשפות מרובות",
    landingFeature6Title: "עובד אופליין",
    landingFeature6Desc: "גישה לרשימות בכל מקום, גם בלי אינטרנט",
    landingHowItWorksTitle: "איך זה עובד",
    landingHowItWorksStep1: "הוסף פריטים",
    landingHowItWorksStep1Desc: "הקלד או דבר את הפריטים באופן טבעי",
    landingHowItWorksStep2: "בינה מלאכותית מארגנת",
    landingHowItWorksStep2Desc: "פריטים מסודרים אוטומטית לפי קטגוריות",
    landingHowItWorksStep3: "קנה וחסוך",
    landingHowItWorksStep3Desc: "עקוב אחרי הרשימה המאורגנת ומעקב אחר המחירים הטובים",
    landingPricingTitle: "תמחור פשוט ושקוף",
    landingPricingSubtitle: "בחר את התוכנית המתאימה לך",
    landingPricingFree: "חינם",
    landingPricingPro: "Pro",
    landingPricingFamily: "משפחה",
    landingPricingMostPopular: "הכי פופולרי",
    landingPricingGetStarted: "התחל",
    landingPricingFreeFeature1: "כל התכונות הבסיסיות",
    landingPricingFreeFeature2: "50 קטגוריזציות AI לחודש",
    landingPricingFreeFeature3: "רשימה משותפת אחת",
    landingPricingFreeFeature4: "כולל פרסומות",
    landingPricingProFeature1: "כל מה שבחינם",
    landingPricingProFeature2: "ללא פרסומות",
    landingPricingProFeature3: "קטגוריזציה בלתי מוגבלת",
    landingPricingProFeature4: "מעקב מחירים והתראות",
    landingPricingProFeature5: "חיזויים ותובנות חכמות",
    landingPricingFamilyFeature1: "כל מה שב-Pro",
    landingPricingFamilyFeature2: "עד 5 בני משפחה",
    landingPricingFamilyFeature3: "מועדפים ותקציבים משותפים",
    landingCtaTitle: "התחל לחסוך כסף היום",
    landingCtaSubtitle: "הצטרף לאלפי קונים שלא משלמים יותר מדי ולא שוכחים פריטים",
    landingCtaButton: "נסה חינם ל-7 ימים",
    installApp: "התקן אפליקציה",
    installAppDesc: "הוסף למסך הבית",
    appInstalled: "האפליקציה הותקנה בהצלחה!",
    installNotAvailable: "ההתקנה אינה זמינה במכשיר זה",
    darkMode: "מצב כהה",
    darkModeDesc: "עבור לעיצוב כהה",
    // Dashboard
    dashboard: "לוח בקרה",
    listDesc: "נהל את רשימת הקניות שלך",
    historyDesc: "צפה בהיסטוריית קניות",
    familyDesc: "בני משפחה ופעילויות",
    priceCompare: "השוואת מחירים",
    priceCompareDesc: "עקוב והשווה מחירים",
    insightsDesc: "צפה בתובנות הוצאות",
    dailyDesc: "היסטוריית קניות יומית",
    voiceDesc: "קניות בקלט קולי",
    importExportDesc: "יבוא ויצוא רשימות",
    suggestionsDesc: "הצעות AI חכמות",
    quickSearch: "חיפוש מהיר",
    viewAll: "צפה בהכל",
    addItem: "הוסף פריט",
    bestDeals: "עסקאות מובילות",
    searchPlaceholder: "חפש פריטים...",
    lowestPrice: "הנמוך",
    highestPrice: "הגבוה",
    avgPrice: "ממוצע",
    lastPurchased: "נקנה לאחרונה",
    priceHistory: "היסטוריית מחירים",
    trackNewItem: "עקוב אחר מחירים על ידי השלמת פריטים",
    itemName: "פריט",
    trend: "מגמה",
    back: "חזור",
  },
  es: {
    title: "Lista de Compras con IA",
    subtitle: "Tu compañero de compras inteligente",
    error: "No se pudieron categorizar los artículos. Inténtalo de nuevo.",
    inputPlaceholder: "p. ej., '2 aguacates, leche, pan'",
    adding: "Añadiendo...",
    add: "Añadir",
    emptyTitle: "Tu lista está vacía",
    emptySubtitle: "¡Añade artículos a continuación para empezar!",
    uncategorized: "Sin categoría",
    clearCompleted: "Limpiar Completados",
    list: "Lista",
    favorites: "Historial",
    family: "Familia",
    favoritesTitle: "Historial de Compras",
    favoritesSubtitle: "Compra más rápido añadiendo tus compras frecuentes.",
    familyTitle: "Lista Familiar",
    familySubtitle: "Compartida con miembros de la familia",
    familyMembersTitle: "Miembros de la Familia",
    familyOwner: "Propietario",
    familyMember: "Miembro",
    familyActiveNow: "Activo ahora",
    familyRecentActivity: "Actividad Reciente",
    familyNoActivity: "Sin actividad reciente",
    familyCheckedOff: "marcó como comprado",
    familyAdded: "añadió",
    familyRemoved: "eliminó",
    familyYou: "Tú",
    familyMinutesAgo: "m hace",
    familyHoursAgo: "h hace",
    familyDaysAgo: "d hace",
    familyJustNow: "Justo ahora",
    purchased: "comprado",
    times: "veces",
    deleteFromHistory: "Eliminar",
    addToList: "Añadir",
    shareCode: "Código para Compartir",
    leaveList: "Salir de la Lista",
    syncing: "Sincronizando...",
    // Login translations
    loginTitle: "Lista de Compras con IA",
    loginSubtitle: "Inicia sesión para sincronizar tus favoritos entre dispositivos",
    email: "Correo electrónico",
    password: "Contraseña",
    signIn: "Iniciar sesión",
    signUp: "Crear cuenta",
    switchToSignUp: "¿Necesitas una cuenta? Regístrate",
    switchToSignIn: "¿Ya tienes cuenta? Inicia sesión",
    signingIn: "Iniciando sesión...",
    signingUp: "Creando cuenta...",
    signOut: "Cerrar sesión",
    help: "Ayuda",
    displayName: "Nombre para Mostrar",
    displayNameDesc: "Configure su nombre para mostrar en Actividades Familiares",
    saveDisplayName: "Guardar Nombre",
    savingDisplayName: "Guardando...",
    // Onboarding
    welcomeUser: "Bienvenido",
    welcome: "¡Bienvenido a Lista de Compras con IA!",
    onboardingSubtitle: "Comencemos con tu compañero de compras inteligente",
    step1Title: "Listas de Compras Inteligentes",
    step1Desc: "Añade artículos escribiendo o hablando. Nuestra IA los organiza automáticamente por categorías para compras eficientes.",
    step2Title: "Reconocimiento de Voz",
    step2Desc: "Toca el micrófono y habla tus artículos naturalmente. Funciona en múltiples idiomas incluyendo hebreo y español.",
    step3Title: "Organización con IA",
    step3Desc: "Los artículos se categorizan automáticamente (productos, lácteos, etc.) y se organizan inteligentemente para tu conveniencia.",
    step4Title: "Compartir en Familia",
    step4Desc: "Invita a familiares a colaborar en la misma lista. Los cambios se sincronizan en tiempo real en todos los dispositivos.",
    step5Title: "Favoritos Inteligentes",
    step5Desc: "Los artículos completados se vuelven favoritos. Vuelve a añadir fácilmente artículos comprados frecuentemente con un toque.",
    step6Title: "Guía de Inicio Rápido",
    step6Desc: "¿Listo para comenzar? Aquí tienes tu guía rápida para configurar cuenta y compartir en familia.",
    next: "Siguiente",
    previous: "Anterior",
    getStarted: "Comenzar",
    skip: "Saltar",
    // Smart Suggestions
    suggestionsTitle: "Sugerencias Inteligentes",
    suggestionsSubtitle: "Basado en tus patrones de compra y hora del día",
    addSuggestion: "Añadir",
    noSuggestions: "No hay sugerencias disponibles",
    predictive: "Predicción Inteligente",
    timeBased: "Por tiempo",
    frequencyBased: "Frecuente",
    seasonal: "Estacional",
    complementary: "Van bien juntos",
    // Import/Export
    importExport: "Importar/Exportar",
    importExportTitle: "Importar y Exportar Listas",
    importTab: "Importar",
    exportTab: "Exportar",
    importFromFile: "Importar desde Archivo",
    importFromClipboard: "Importar desde Portapapeles",
    exportAsCSV: "Exportar como CSV",
    exportAsText: "Exportar como Texto",
    selectFile: "Seleccionar Archivo",
    pasteFromClipboard: "Pegar desde Portapapeles",
    importing: "Importando...",
    exporting: "Exportando...",
    importSuccess: "¡Importación exitosa!",
    importError: "Importación falló",
    exportSuccess: "¡Exportación exitosa!",
    exportError: "Exportación falló",
    // Selection
    moveSelectedToFavorites: "Mover Seleccionados a Favoritos",
    deleteSelected: "Eliminar Seleccionados",
    selectAll: "Seleccionar Todo",
    deselectAll: "Deseleccionar Todo",
    selectedCount: "{count} seleccionados",
    addAll: "Agregar Todo",
    itemsImported: "{count} artículos importados",
    itemsSkipped: "{count} artículos omitidos (ya existen)",
    noItemsToExport: "No hay artículos para exportar",
    fileTooBig: "Archivo demasiado grande (máx 5MB)",
    invalidFileType: "Tipo de archivo inválido",
    clipboardEmpty: "Portapapeles vacío",
    // Hints
    swipeHint: "Desliza a la derecha para favorito, a la izquierda para eliminar.",
    gotIt: "Entendido",
    // Price Tracking
    priceModalTitle: "¿Agregar Precios? (Opcional)",
    priceModalSubtitle: "Rastrea tus gastos en artículos completados",
    priceModalSkip: "Saltar",
    priceModalSave: "Guardar con Precios",
    priceModalTotal: "Total",
    priceModalStore: "Tienda",
    priceModalStorePlaceholder: "ej., Rami Levy, Shufersal, Mega...",
    enablePriceTracking: "Habilitar Seguimiento de Precios",
    priceTrackingDesc: "Rastrea lo que gastas en comestibles",
    // Spending Insights
    spendingInsights: "Información de Gastos",
    monthlySpending: "Gasto Mensual",
    itemsPurchased: "artículos comprados",
    avgPerItem: "Promedio por artículo",
    weeklyTrend: "Tendencia Semanal",
    thisWeek: "Esta Semana",
    lastWeek: "Semana Pasada",
    categoryBreakdown: "Desglose por Categoría",
    budget: "Presupuesto Mensual",
    remaining: "Restante",
    overBudget: "Sobre Presupuesto",
    noPriceData: "Completa artículos con precios para ver información",
    setBudget: "Establecer Presupuesto Mensual",
    budgetDesc: "Rastrea gastos contra un presupuesto mensual",
    // Price Alerts
    bestPriceEver: "Mejor Precio Jamás",
    greatDeal: "Gran Oferta",
    priceIncreased: "Precio Aumentó",
    higherThanUsual: "Más Caro que lo Usual",
    // Store Comparison
    bestAtStore: "Mejor en",
    cheaper: "más barato",
    // Sort buttons
    mostFrequent: "Más Frecuente",
    today: "Hoy",
    starred: "Favoritos",
    category: "Categoría",
    alphabetical: "A-Z",
    
    // Daily Purchases
    dailyPurchases: "Compras Diarias",
    dailyPurchasesSubtitle: "Ve tu historial de compras por fecha",
    date: "Fecha",
    items: "artículos",
    totalSpent: "Total Gastado",
    store: "Tienda",
    noPurchases: "No se encontraron compras para esta fecha",
    selectDate: "Seleccionar Fecha",
    exportCSV: "Exportar CSV",
    generateReport: "Generar Reporte",
    copyReport: "Copiar Reporte",
    reportCopied: "¡Reporte copiado al portapapeles!",
    recentShoppingDays: "Días de Compras Recientes",
    // Legal
    legal: "Legal",
    privacyPolicy: "Política de Privacidad",
    termsOfService: "Términos del Servicio",
    // PWA Install
    installTitle: "Instalar Lista de Compras IA",
    installMessage: "Agregar a la pantalla de inicio para acceso rápido y soporte sin conexión",
    installButton: "Instalar Ahora",
    installLater: "Quizás Más Tarde",
    // Paywall
    paywallTitle: "Desbloquea Funciones Premium",
    paywallSubtitle: "Elige el plan perfecto para tus necesidades de compras",
    removeAdsTitle: "Eliminar Anuncios",
    removeAdsDescription: "Actualiza a Pro o Familiar para una experiencia sin anuncios",
    upgrade: "Actualizar",
    monthly: "Mensual",
    yearly: "Anual",
    savePercent: "Ahorra 40%",
    freePlan: "Gratis",
    proPlan: "Pro",
    familyPlan: "Familiar",
    popularBadge: "MÁS POPULAR",
    currentBadge: "Plan Actual",
    selectButton: "Iniciar Prueba Gratis",
    continueButton: "Continuar Gratis",
    trialInfo: "Prueba gratis de 7 días, cancela cuando quieras",
    freeFeature1: "Lista de compras básica",
    freeFeature2: "Categorización IA (50/mes)",
    freeFeature3: "1 lista compartida",
    freeFeature4: "Incluye anuncios",
    proFeature1: "Todo en Gratis",
    proFeature2: "Sin anuncios",
    proFeature3: "Categorización ilimitada",
    proFeature4: "Listas compartidas ilimitadas",
    proFeature5: "Historial completo de compras",
    proFeature6: "Seguimiento y alertas de precios",
    proFeature7: "Información de gastos",
    proFeature8: "Predicciones inteligentes",
    proFeature9: "Soporte prioritario",
    familyFeature1: "Todo en Pro",
    familyFeature2: "Hasta 5 miembros familiares",
    familyFeature3: "Controles de administrador",
    familyFeature4: "Favoritos compartidos",
    familyFeature5: "Feed de actividad familiar",
    familyFeature6: "Gestión de presupuesto",
    // Landing Page
    landingHeroTitle: "¡Nunca Olvides Artículos ni Pagues de Más!",
    landingHeroSubtitle: "Lista de compras con IA que organiza tus compras, rastrea precios y te ayuda a ahorrar dinero",
    landingHeroCta: "Comenzar Gratis - 7 Días de Prueba",
    landingHeroSecondaryCta: "Ver Precios",
    landingFeaturesTitle: "Todo lo que Necesitas para Comprar de Forma Inteligente",
    landingFeaturesSubtitle: "Ahorra tiempo y dinero con funciones inteligentes",
    landingFeature1Title: "Organización Inteligente con IA",
    landingFeature1Desc: "Artículos ordenados automáticamente por categoría - frutas, lácteos, panadería y más",
    landingFeature2Title: "Seguimiento de Precios",
    landingFeature2Desc: "Rastrea precios en diferentes tiendas y encuentra las mejores ofertas automáticamente",
    landingFeature3Title: "Compartir con Familia",
    landingFeature3Desc: "Comparte listas con familiares y sincroniza en tiempo real",
    landingFeature4Title: "Predicciones Inteligentes",
    landingFeature4Desc: "La IA predice lo que necesitas según tus patrones de compra",
    landingFeature5Title: "Entrada por Voz",
    landingFeature5Desc: "Agrega artículos hablando - funciona en múltiples idiomas",
    landingFeature6Title: "Funciona Sin Conexión",
    landingFeature6Desc: "Accede a tus listas en cualquier lugar, incluso sin internet",
    landingHowItWorksTitle: "Cómo Funciona",
    landingHowItWorksStep1: "Agregar Artículos",
    landingHowItWorksStep1Desc: "Escribe o habla tus artículos de forma natural",
    landingHowItWorksStep2: "La IA Organiza",
    landingHowItWorksStep2Desc: "Los artículos se categorizan y ordenan automáticamente",
    landingHowItWorksStep3: "Compra y Ahorra",
    landingHowItWorksStep3Desc: "Sigue tu lista organizada y rastrea los mejores precios",
    landingPricingTitle: "Precios Simples y Transparentes",
    landingPricingSubtitle: "Elige el plan adecuado para ti",
    landingPricingFree: "Gratis",
    landingPricingPro: "Pro",
    landingPricingFamily: "Familiar",
    landingPricingMostPopular: "MÁS POPULAR",
    landingPricingGetStarted: "Comenzar",
    landingPricingFreeFeature1: "Funciones básicas de lista",
    landingPricingFreeFeature2: "50 categorizaciones IA/mes",
    landingPricingFreeFeature3: "1 lista compartida",
    landingPricingFreeFeature4: "Incluye anuncios",
    landingPricingProFeature1: "Todo en Gratis",
    landingPricingProFeature2: "Sin anuncios",
    landingPricingProFeature3: "Categorización ilimitada",
    landingPricingProFeature4: "Seguimiento y alertas de precios",
    landingPricingProFeature5: "Predicciones e insights inteligentes",
    landingPricingFamilyFeature1: "Todo en Pro",
    landingPricingFamilyFeature2: "Hasta 5 miembros familiares",
    landingPricingFamilyFeature3: "Favoritos y presupuestos compartidos",
    landingCtaTitle: "Comienza a Ahorrar Dinero Hoy",
    landingCtaSubtitle: "Únete a miles de compradores que nunca pagan de más ni olvidan artículos",
    landingCtaButton: "Prueba Gratis por 7 Días",
    installApp: "Instalar App",
    installAppDesc: "Agregar a pantalla de inicio",
    appInstalled: "¡Aplicación instalada exitosamente!",
    installNotAvailable: "Instalación no disponible en este dispositivo",
    darkMode: "Modo Oscuro",
    darkModeDesc: "Cambiar a tema oscuro",
    // Dashboard
    dashboard: "Tablero",
    listDesc: "Gestionar tu lista de compras",
    historyDesc: "Ver historial de compras",
    familyDesc: "Miembros y actividades familiares",
    priceCompare: "Comparar Precios",
    priceCompareDesc: "Rastrear y comparar precios",
    insightsDesc: "Ver información de gastos",
    dailyDesc: "Historial de compras diario",
    voiceDesc: "Compras por voz",
    importExportDesc: "Importar y exportar listas",
    suggestionsDesc: "Sugerencias inteligentes de IA",
    quickSearch: "Búsqueda Rápida",
    viewAll: "Ver Todo",
    addItem: "Añadir Artículo",
    bestDeals: "Mejores Ofertas",
    searchPlaceholder: "Buscar artículos...",
    lowestPrice: "Más Bajo",
    highestPrice: "Más Alto",
    avgPrice: "Promedio",
    lastPurchased: "Última Compra",
    priceHistory: "Historial de Precios",
    trackNewItem: "Rastrea precios al completar artículos",
    itemName: "Artículo",
    trend: "Tendencia",
    back: "Atrás",
  }
};

// Detect device language and set initial language
const getInitialLanguage = (): Language => {
  try {
    // Get all available browser languages
    const browserLanguages = navigator.languages || [navigator.language] || ['en'];
    
    // Check saved preference first
    const savedLanguage = localStorage.getItem('groceryListLanguage') as Language;
    if (savedLanguage && ['en', 'he', 'es'].includes(savedLanguage)) {
      return savedLanguage;
    }
    
    // Enhanced language detection
    for (const lang of browserLanguages) {
      const normalizedLang = lang.toLowerCase();
      
      // Hebrew detection (comprehensive)
      if (normalizedLang.includes('he') || 
          normalizedLang.includes('iw') || 
          normalizedLang.includes('hebrew') ||
          normalizedLang.includes('il')) {
        return 'he';
      }
      
      // Spanish detection (comprehensive)
      if (normalizedLang.includes('es') || 
          normalizedLang.includes('spanish') || 
          normalizedLang.includes('español') ||
          normalizedLang.includes('ar') ||  // Argentina
          normalizedLang.includes('mx') ||  // Mexico
          normalizedLang.includes('co') ||  // Colombia
          normalizedLang.includes('cl') ||  // Chile
          normalizedLang.includes('pe') ||  // Peru
          normalizedLang.includes('ve') ||  // Venezuela
          normalizedLang.includes('ec') ||  // Ecuador
          normalizedLang.includes('gt') ||  // Guatemala
          normalizedLang.includes('cu') ||  // Cuba
          normalizedLang.includes('bo') ||  // Bolivia
          normalizedLang.includes('do') ||  // Dominican Republic
          normalizedLang.includes('hn') ||  // Honduras
          normalizedLang.includes('py') ||  // Paraguay
          normalizedLang.includes('sv') ||  // El Salvador
          normalizedLang.includes('ni') ||  // Nicaragua
          normalizedLang.includes('cr') ||  // Costa Rica
          normalizedLang.includes('pa') ||  // Panama
          normalizedLang.includes('uy')) {  // Uruguay
        return 'es';
      }
    }
    
    // Default to English
    return 'en';
  } catch (error) {
    console.warn('Language detection failed, defaulting to English:', error);
    return 'en';
  }
};

function App() {
  const [inputValue, setInputValue] = useState('');
  const [language, setLanguage] = useState<Language>(() => getInitialLanguage());
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [showLandingPage, setShowLandingPage] = useState(true);
  const [showSwipeHint, setShowSwipeHint] = useState<boolean>(() => {
    try { return localStorage.getItem('swipeHintDismissed') ? false : true; } catch { return true; }
  });
  const [user, setUser] = useState<User | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showSmartSuggestions, setShowSmartSuggestions] = useState(false);
  
  // Subscription & Paywall
  const [currentPlan, setCurrentPlan] = useState<'free' | 'pro' | 'family'>('free');
  const [showPaywall, setShowPaywall] = useState(false);
  
  // Dark Mode
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('darkMode');
      if (saved !== null) return saved === 'true';
      // Check system preference
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

        // Apply dark mode class to document
        useEffect(() => {
          console.log('🌙 Dark mode changed to:', darkMode);
          if (darkMode) {
            document.documentElement.classList.add('dark');
            console.log('✅ Added dark class to document');
          } else {
            document.documentElement.classList.remove('dark');
            console.log('✅ Removed dark class from document');
          }
          localStorage.setItem('darkMode', String(darkMode));
        }, [darkMode]);
  
  // Price tracking
  const [enablePriceTracking, setEnablePriceTracking] = useState(() => {
    try {
      return localStorage.getItem('enablePriceTracking') === 'true';
    } catch {
      return false;
    }
  });
  const [currency, setCurrency] = useState(() => {
    try {
      return localStorage.getItem('currency') || 'USD';
    } catch {
      return 'USD';
    }
  });
  const [monthlyBudget, setMonthlyBudget] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('monthlyBudget');
      return saved ? parseFloat(saved) : 0;
    } catch {
      return 0;
    }
  });
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [pendingCompletedItems, setPendingCompletedItems] = useState<GroceryItem[]>([]);
  
  // Get list ID and other states from auth
  const [listId, setListId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  // Use nullable string message for status to avoid showing 'idle' and disabling controls on open
  const [addMemberStatus, setAddMemberStatus] = useState<string | null>(null);
  const [showImportExport, setShowImportExport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [isUpdatingDisplayName, setIsUpdatingDisplayName] = useState(false);
  type ToastVariant = 'info' | 'success' | 'error' | 'warning';
  const [toast, setToast] = useState<{ message: string; variant?: ToastVariant } | null>(null);
  
  // Firestore sync hook
  const { items, historyItems, setItems, setHistoryItems, isSyncing } = useFirestoreSync(listId);
  
  // PWA Install hook
  const { isInstallable, installApp } = usePWAInstall();

  // Category migration effect
  useEffect(() => {
    if (listId && user && historyItems && historyItems.length > 0) {
      if (checkMigrationNeeded(historyItems)) {
        console.log('🔄 Running category migration...');
        migrateOtherCategoryToPantry(listId, historyItems)
          .then(updatedHistory => {
            if (updatedHistory !== historyItems) {
              setHistoryItems(updatedHistory);
              console.log('✅ Category migration completed');
              showToast('Updated Hebrew category names', 'success');
            }
          })
          .catch(error => {
            console.error('❌ Migration failed:', error);
          });
      }
    }
  }, [listId, user, historyItems]);
  
  // Local loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Save language preference when changed
  const handleLanguageChange = (newLanguage: Language) => {
    console.log('Language changed to:', newLanguage);
    setLanguage(newLanguage);
    localStorage.setItem('groceryListLanguage', newLanguage);
  };
  const [showLanguageDetected, setShowLanguageDetected] = useState(false);
  
  const currentText = translations[language];

  // Show language detection notification
  useEffect(() => {
    // Check if this is the first time the language was detected
    const wasAutoDetected = localStorage.getItem('languageAutoDetected');
    if (!wasAutoDetected && language !== 'en') {
      // Language was auto-detected and it's not English (default), show notification
      console.log('Showing language detection notification for:', language);
      setShowLanguageDetected(true);
      localStorage.setItem('languageAutoDetected', 'true');
      setTimeout(() => setShowLanguageDetected(false), 5000);
    }
  }, [language]);

  // Show swipe hint only on list view and when there are items
  useEffect(() => {
    if (currentView !== 'list') return;
    if (items.length === 0) return;
    // keep whatever current state is; this effect simply ensures conditionally visible
  }, [currentView, items.length]);

  // Toast helper
  const showToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    setToast({ message, variant });
    setTimeout(() => setToast(null), 2500);
  }, []);

  // Using shared service isSemanticDuplicate()

  // Handle authentication state changes
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    
    try {
      unsubscribe = onAuthStateChange(async (authUser) => {
        setUser(authUser);
        if (authUser) {
          try {
            const accessibleListId = await getAccessibleListId();
            setListId(accessibleListId);
            
            // Migrate list if needed (add ownerId and members fields)
            const needsMigration = await checkListNeedsMigration(accessibleListId);
            if (needsMigration) {
              console.log('🔄 List needs migration - adding ownership fields');
              await migrateListOwnershipFields(accessibleListId, authUser.uid);
            }
            
            // Check if user is the list owner
            const ownerStatus = await isListOwner();
            setIsOwner(ownerStatus);

            // Load user subscription
            getUserSubscription(authUser.uid)
              .then(subscription => {
                if (subscription) {
                  setCurrentPlan(subscription.plan);
                  console.log('✅ Loaded subscription:', subscription.plan);
                }
              })
              .catch(err => {
                console.error('Failed to load subscription:', err);
              });

            // Load user display name
            getUserDisplayName()
              .then(name => {
                setDisplayName(name);
              })
              .catch(err => {
                console.error('Failed to load display name:', err);
              });

            // Check if this is a new user (show onboarding)
            const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
            if (!hasSeenOnboarding) {
              setShowOnboarding(true);
            }
          } catch (error) {
            console.error('Error getting accessible list:', error);
            const msg = error instanceof Error ? error.message : String(error);
            
            // If quota exceeded, offer offline mode
            if (msg.includes('quota exceeded') || msg.includes('resource-exhausted')) {
              setError(`Firestore quota exceeded. Working in offline mode - your data will sync when quota resets.`);
              // Use offline mode with localStorage
              const offlineListId = 'offline-' + (authUser?.uid || 'anonymous');
              setListId(offlineListId);
              setIsOwner(true);
            } else {
              setError(`Failed to load your grocery list. ${msg}`);
            }
          }
        } else {
          setListId(null);
          setIsOwner(false);
          setCurrentPlan('free'); // Reset to free plan on logout
        }
        setIsLoadingAuth(false);
      });
    } catch (error) {
      console.error('Error setting up auth state listener:', error);
      setError('Authentication service failed to initialize. Please refresh the page.');
      setIsLoadingAuth(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);


  const handleSignOut = async () => {
    try {
      await signOutUser();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleAddFamilyMember = async () => {
    if (!memberEmail.trim()) return;

    setAddMemberStatus('Adding...');
    try {
      const success = await addFamilyMember(memberEmail.trim());
      if (success) {
        setAddMemberStatus('Family member added successfully! They should sign out and back in to see the shared list.');
        setMemberEmail('');
        setTimeout(() => {
          setAddMemberStatus(null);
          setShowAddMember(false);
        }, 3000);
      } else {
        setAddMemberStatus('User not found. Make sure they have created an account first.');
      }
    } catch (error) {
      setAddMemberStatus('Error adding family member. Please try again.');
    }
  };

  const handleUpdateDisplayName = async () => {
    if (!displayName.trim()) {
      showToast('Display name cannot be empty', 'warning');
      return;
    }

    setIsUpdatingDisplayName(true);
    try {
      const success = await updateUserDisplayName(displayName);
      if (success) {
        showToast('Display name updated successfully!', 'success');
      } else {
        showToast('Failed to update display name', 'error');
      }
    } catch (error) {
      showToast('Error updating display name', 'error');
    } finally {
      setIsUpdatingDisplayName(false);
    }
  };

  const handleAddItem = useCallback(async (itemText: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const existingItemNames = items.map(item => item.name);
      const categorizedResult = await categorizeGroceries(itemText, existingItemNames, language);
      
      const newItems: GroceryItem[] = [];
      // Track existing names, prevent duplicates including semantic matches
      const existingLower = items.map(i => normalize(i.name));
      categorizedResult.forEach(cat => {
        cat.items.forEach(parsedItem => {
          if (isSemanticDuplicate(parsedItem.name, existingLower)) return;
          existingLower.push(normalize(parsedItem.name));
          newItems.push({
            id: `${Date.now()}-${parsedItem.name}-${Math.random()}`,
            name: parsedItem.name,
            completed: false,
            category: cat.category || currentText.uncategorized,
            quantity: parsedItem.quantity,
            unit: parsedItem.unit,
            originalText: parsedItem.originalText
          });
        });
      });

      if (newItems.length === 0) {
        showToast(currentText.itemAlreadyAdded, 'warning');
        return true; // nothing to add, still success
      }
      setItems(prevItems => [...prevItems, ...newItems]);

      // Log family activity for each added item
      if (user && listId) {
        // Use Firestore displayName if set, otherwise fall back to friendly name from email
        const userName = displayName || getFriendlyUserNameFallback(user);
        newItems.forEach(item => {
          logFamilyActivity(listId, user.uid, userName, 'added', item.name);
        });
      }

      return true; // Success
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(currentText.error);
      }
      console.error(err);
      return false; // Failure
    } finally {
      setIsLoading(false);
    }
  }, [items, language, currentText.error, currentText.uncategorized, setItems]);

  const handleAddItemFromHistory = useCallback((historyItem: PurchaseHistoryItem) => {
    console.log('Adding item from history:', historyItem.name);
    const itemExists = isSemanticDuplicate(historyItem.name, items.map(i => i.name));
    if (itemExists) {
      console.log('Item already exists in list:', historyItem.name);
      showToast(currentText.itemAlreadyAdded);
      return;
    }

    const newItem: GroceryItem = {
      id: `${Date.now()}-${historyItem.name}`,
      name: historyItem.name,
      completed: false,
      category: historyItem.category || currentText.uncategorized,
    };
    
    console.log('Adding new item to list:', newItem);
    setItems(prevItems => {
      const updatedItems = [newItem, ...prevItems];
      console.log('Updated items list:', updatedItems);
      return updatedItems;
    });
    setCurrentView('list');
  }, [items, currentText.uncategorized, setItems, currentText.itemAlreadyAdded, showToast]);

  const handleDeleteHistoryItem = useCallback((itemName: string) => {
    setHistoryItems(prev => prev.filter(item => item.name.toLowerCase() !== itemName.toLowerCase()));
  }, [setHistoryItems]);
  
  const handleToggleItem = (id: string) => {
    setItems(currentItems => currentItems.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, completed: !item.completed };
        console.log('Toggled item:', updatedItem.name, 'completed:', updatedItem.completed);

        // Log family activity
        if (user && listId) {
          // Use Firestore displayName if set, otherwise fall back to friendly name from email
          const userName = displayName || getFriendlyUserNameFallback(user);
          const activityType = updatedItem.completed ? 'checked' : 'unchecked';
          logFamilyActivity(listId, user.uid, userName, activityType, updatedItem.name);
        }

        return updatedItem;
      }
      return item;
    }));
  };

  const handleSelectItem = (id: string) => {
    setSelectedItems(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return newSelected;
    });
  };

  const handleSelectAll = () => {
    const allItemIds = items.map(item => item.id);
    setSelectedItems(new Set(allItemIds));
  };

  const handleDeselectAll = () => {
    setSelectedItems(new Set());
  };

  const isAllSelected = items.length > 0 && selectedItems.size === items.length;
  const isSomeSelected = selectedItems.size > 0 && selectedItems.size < items.length;

  const handleMoveSelectedToFavorites = () => {
    const selectedItemsArray = items.filter(item => selectedItems.has(item.id));
    
    if (selectedItemsArray.length === 0) return;

    console.log('Moving selected items to favorites:', selectedItemsArray);

    // Add selected items to history
    setHistoryItems(prevHistory => {
      const newHistory = [...prevHistory];
      selectedItemsArray.forEach(item => {
        const historyIndex = newHistory.findIndex(h => h.name.toLowerCase() === item.name.toLowerCase());
        if (historyIndex > -1) {
          newHistory[historyIndex].frequency += 1;
          newHistory[historyIndex].lastAdded = new Date().toISOString();
        } else {
          newHistory.push({
            name: item.name,
            category: item.category,
            frequency: 1,
            lastAdded: new Date().toISOString(),
          });
        }
      });
      return newHistory;
    });

    // Remove selected items from current list
    setItems(prevItems => prevItems.filter(item => !selectedItems.has(item.id)));
    
    // Clear selection
    setSelectedItems(new Set());
  };

  const handleDeleteSelected = () => {
    const selectedItemsArray = items.filter(item => selectedItems.has(item.id));
    
    if (selectedItemsArray.length === 0) return;

    console.log('Deleting selected items:', selectedItemsArray);

    // Remove selected items from current list (no history)
    setItems(prevItems => prevItems.filter(item => !selectedItems.has(item.id)));
    
    // Clear selection
    setSelectedItems(new Set());
  };

  const handleDeleteItem = (id: string) => {
    const itemToDelete = items.find(item => item.id === id);

    setItems(currentItems => currentItems.filter(item => item.id !== id));

    // Log family activity
    if (itemToDelete && user && listId) {
      // Use Firestore displayName if set, otherwise fall back to friendly name from email
      const userName = displayName || getFriendlyUserNameFallback(user);
      logFamilyActivity(listId, user.uid, userName, 'removed', itemToDelete.name);
    }
  };

  // Swipe right: move single item to favorites and remove from list
  const handleMoveItemToFavorites = async (id: string) => {
    const target = items.find(i => i.id === id);
    if (!target || !listId) return;

    console.log('⭐ Moving item to favorites:', target.name);

    try {
      // FIRST: Update history in Firestore
      await addOrIncrementPurchase(listId, [{ name: target.name, category: target.category }]);
      
      // SECOND: Remove from current list
      // The Firestore listener will automatically update historyItems
    setItems(prev => prev.filter(i => i.id !== id));
      
      console.log('✅ Item moved to favorites');
    } catch (e) {
      console.error('❌ Failed to move item to favorites:', e);
    }
  };

  // Paywall handler
  const handleSelectPlan = useCallback(async (planId: string, isYearly: boolean) => {
    if (!user?.uid) {
      showToast('Please sign in to upgrade', 'error');
      setShowPaywall(false);
      return;
    }

    try {
      const res = await fetch('/.netlify/functions/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          isYearly,
          userId: user.uid  // Pass user ID to checkout session
        })
      });
      if (!res.ok) throw new Error('Failed to create checkout session');
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        showToast('Checkout session created, but URL missing', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Payment integration error. Please try again later.', 'error');
    } finally {
      setShowPaywall(false);
    }
  }, [user, showToast]);

  // PWA Install handler
  const handleInstallApp = useCallback(async () => {
    if (!isInstallable) {
      showToast(currentText.installNotAvailable, 'warning');
      return;
    }

    const success = await installApp();
    if (success) {
      showToast(currentText.appInstalled, 'success');
      setShowSettings(false);
    }
  }, [isInstallable, installApp, currentText, showToast]);

  // Define this FIRST since handleClearCompleted depends on it
  const handleCompletedItemsWithPrices = useCallback(async (itemsWithPrices: { name: string; category: string; price?: number; store?: string }[]) => {
    if (!listId) return;

    console.log('🔄 Processing completed items with prices:', itemsWithPrices);

    try {
      // FIRST: Update history in Firestore (with prices and store)
      await addOrIncrementPurchase(listId, itemsWithPrices.map(i => ({
        name: i.name,
        category: i.category,
        price: i.price,
        store: i.store,
        currency: currency
      })));
      
      console.log('✅ Purchase history updated in Firestore');

      // SECOND: Remove completed items from current list
      // The Firestore listener will automatically update historyItems
    setItems(prevItems => {
        const remainingItems = prevItems.filter(item => !item.completed);
        console.log('✅ Removed completed items. Remaining:', remainingItems.length);
        return remainingItems;
    });

    } catch (e) {
      console.error('❌ Failed to process completed items:', e);
    }
  }, [listId, currency, setItems]);

  const handleClearCompleted = useCallback(async () => {
    const completedItems = items.filter(item => item.completed);
    if (completedItems.length === 0) return;

    console.log('🧹 Clearing completed items:', completedItems.length);

    // If price tracking is enabled, show the price modal
    if (enablePriceTracking) {
      setPendingCompletedItems(completedItems);
      setShowPriceModal(true);
      return;
    }

    // Otherwise, add items without prices
    await handleCompletedItemsWithPrices(completedItems.map(i => ({ name: i.name, category: i.category })));
  }, [items, enablePriceTracking, handleCompletedItemsWithPrices]);

  const handleAddAllInCategory = useCallback((categoryName: string) => {
    // Find all items in the specified category from favorites/history
    const categoryItems = historyItems.filter(historyItem => 
      historyItem.category === categoryName
    );
    
    // Add each item from the category that's not already in the current list
    categoryItems.forEach(historyItem => {
      const itemExists = isSemanticDuplicate(historyItem.name, items.map(i => i.name));
      if (!itemExists) {
        const newItem: GroceryItem = {
          id: `${Date.now()}-${historyItem.name}-${Math.random()}`,
          name: historyItem.name,
          completed: false,
          category: historyItem.category,
          quantity: 1,
          originalText: historyItem.name
        };
        
        setItems(prevItems => [newItem, ...prevItems]);
      }
    });
  }, [historyItems, items, setItems]);

  const handleAddSuggestion = useCallback((suggestion: ShoppingSuggestion) => {
    const itemExists = items.some(item => 
      item.name.toLowerCase() === suggestion.item.name.toLowerCase()
    );
    
    if (!itemExists) {
      const newItem: GroceryItem = {
        id: `${Date.now()}-${suggestion.item.name}-${Math.random()}`,
        name: suggestion.item.name,
        completed: false,
        category: suggestion.item.category,
        quantity: 1,
        originalText: suggestion.item.name
      };
      
      setItems(prevItems => [newItem, ...prevItems]);
    }
  }, [items, setItems]);

  const handleImportSuccess = useCallback(async (importedItems: GroceryItem[]) => {
    if (!listId) {
      // No list yet; fallback to adding into current list to avoid data loss
      setItems(prevItems => [...importedItems, ...prevItems]);
      setShowImportExport(false);
      return;
    }

    try {
      // Add imported items directly to purchase history
      await addOrIncrementPurchase(listId, importedItems.map(i => ({
      name: i.name,
      category: i.category,
      })));
      setCurrentView('favorites'); // View purchase history after import
      setShowImportExport(false);
    } catch (e) {
      console.warn('Failed to add items to purchase history, falling back to add to list', e);
      setItems(prevItems => [...importedItems, ...prevItems]);
      setShowImportExport(false);
    }
  }, [listId, setItems]);

  const categorizedList = useMemo<Category[]>(() => {
    const groups: { [key: string]: GroceryItem[] } = items.reduce((acc, item) => {
      const category = item.category || currentText.uncategorized;
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    }, {});

    return Object.entries(groups)
      .map(([name, items]) => ({ name, items }))
      .sort((a, b) => a.name.localeCompare(b.name, language));
  }, [items, language, currentText.uncategorized]);
  
  const sortedHistory = useMemo(() => {
    return [...historyItems].sort((a, b) => b.frequency - a.frequency);
  }, [historyItems]);

  const hasCompletedItems = useMemo(() => items.some(item => item.completed), [items]);

  // Show loading while checking authentication
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const handleDemoMode = () => {
    setIsDemoMode(true);
    setUser({
      uid: 'demo-user',
      email: 'demo@example.com',
      emailVerified: true
    } as User);
    setListId('demo-list');
    setIsOwner(true); // Demo user is always owner
    setIsLoadingAuth(false);
    
    // Show onboarding for demo users
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  };

  const handleCloseOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem('hasSeenOnboarding', 'true');
  };

  const handleShowHelp = () => {
    setShowOnboarding(true);
  };

  // Show landing page or login page if user is not authenticated
  if (!user && !isDemoMode) {
    if (showLandingPage) {
      return (
        <LandingPage
          onGetStarted={() => setShowLandingPage(false)}
          translations={{
            hero: {
              title: currentText.landingHeroTitle,
              subtitle: currentText.landingHeroSubtitle,
              cta: currentText.landingHeroCta,
              secondaryCta: currentText.landingHeroSecondaryCta,
            },
            features: {
              title: currentText.landingFeaturesTitle,
              subtitle: currentText.landingFeaturesSubtitle,
              feature1Title: currentText.landingFeature1Title,
              feature1Desc: currentText.landingFeature1Desc,
              feature2Title: currentText.landingFeature2Title,
              feature2Desc: currentText.landingFeature2Desc,
              feature3Title: currentText.landingFeature3Title,
              feature3Desc: currentText.landingFeature3Desc,
              feature4Title: currentText.landingFeature4Title,
              feature4Desc: currentText.landingFeature4Desc,
              feature5Title: currentText.landingFeature5Title,
              feature5Desc: currentText.landingFeature5Desc,
              feature6Title: currentText.landingFeature6Title,
              feature6Desc: currentText.landingFeature6Desc,
            },
            pricing: {
              title: currentText.landingPricingTitle,
              subtitle: currentText.landingPricingSubtitle,
              free: currentText.landingPricingFree,
              pro: currentText.landingPricingPro,
              family: currentText.landingPricingFamily,
              monthly: currentText.monthly,
              yearly: currentText.yearly,
              mostPopular: currentText.landingPricingMostPopular,
              getStarted: currentText.landingPricingGetStarted,
              feature1: currentText.landingPricingFreeFeature1,
              feature2: currentText.landingPricingFreeFeature2,
              feature3: currentText.landingPricingFreeFeature3,
              feature4: currentText.landingPricingFreeFeature4,
              proFeature1: currentText.landingPricingProFeature1,
              proFeature2: currentText.landingPricingProFeature2,
              proFeature3: currentText.landingPricingProFeature3,
              proFeature4: currentText.landingPricingProFeature4,
              proFeature5: currentText.landingPricingProFeature5,
              familyFeature1: currentText.landingPricingFamilyFeature1,
              familyFeature2: currentText.landingPricingFamilyFeature2,
              familyFeature3: currentText.landingPricingFamilyFeature3,
            },
            howItWorks: {
              title: currentText.landingHowItWorksTitle,
              step1: currentText.landingHowItWorksStep1,
              step1Desc: currentText.landingHowItWorksStep1Desc,
              step2: currentText.landingHowItWorksStep2,
              step2Desc: currentText.landingHowItWorksStep2Desc,
              step3: currentText.landingHowItWorksStep3,
              step3Desc: currentText.landingHowItWorksStep3Desc,
            },
            cta: {
              title: currentText.landingCtaTitle,
              subtitle: currentText.landingCtaSubtitle,
              button: currentText.landingCtaButton,
            },
          }}
        />
      );
    }
    return <LoginPage onLogin={() => {}} onDemoMode={handleDemoMode} translations={currentText} />;
  }

  const LanguageButton: React.FC<{ lang: Language, children: React.ReactNode }> = ({ lang, children }) => (
    <button onClick={() => handleLanguageChange(lang)} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${language === lang ? 'bg-green-500 text-white' : 'text-gray-700 hover:bg-gray-200'}`}>
      {children}
    </button>
  );

  const NavButton: React.FC<{ currentView: View, buttonView: View, children: React.ReactNode, onClick: () => void }> = ({ currentView, buttonView, children, onClick }) => (
    <button onClick={onClick} className={`flex-1 flex flex-col items-center justify-center p-2 text-sm font-medium transition-colors ${currentView === buttonView ? 'text-green-600' : 'text-gray-500 hover:text-green-500'}`}>
        {children}
    </button>
  );

  const ViewButton: React.FC<{ view: View, children: React.ReactNode }> = ({ view, children }) => (
    <button onClick={() => setCurrentView(view)} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${currentView === view ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
      {children}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans transition-colors" dir={language === 'he' ? 'rtl' : 'ltr'}>
      <header className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-sm sticky top-0 z-50 transition-colors">
        <div className="max-w-3xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    <span className="text-3xl">🛒</span>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{currentText.title}</h1>
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-1">
                            <span>{currentText.welcomeUser}: {displayName || getFriendlyUserNameFallback(user)}</span>
                            {isDemoMode && <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">Demo Mode</span>}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                      onClick={handleShowHelp} 
                      className="text-gray-600 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50 transition-colors"
                      title="Show tutorial"
                    >
                      <InfoIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setShowSettings(true)}
                      className="text-gray-600 hover:text-gray-800 p-2 rounded-full hover:bg-gray-100 transition-colors"
                      title="Settings"
                    >
                      <GearIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
            {isSyncing && <div className="text-center text-sm text-green-600 p-1 animate-pulse">{currentText.syncing}</div>}
        </div>
        {/* Back to Dashboard Button - Only show when not on dashboard */}
        {currentView !== 'dashboard' && (
          <div className="max-w-3xl mx-auto border-t border-gray-200 p-3">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:opacity-90 transition-all shadow-lg hover:scale-105"
            >
              <span className={`text-xl ${language === 'he' ? 'inline-block transform rotate-180' : ''}`}>←</span>
              <span className="font-semibold">{currentText.dashboard}</span>
            </button>
          </div>
        )}
      </header>

      {/* Language Detection Notification */}
      {showLanguageDetected && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse">
          <div className="flex items-center gap-2">
            <span>🌍</span>
            <span>Language auto-detected: {language === 'he' ? 'עברית' : language === 'es' ? 'Español' : 'English'}</span>
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto p-4 sm:px-6 lg:px-8 pb-32">
        {currentView === 'dashboard' ? (
            <DashboardPage
              onNavigate={(view) => setCurrentView(view as View)}
              translations={{
                list: currentText.list,
                listDesc: currentText.listDesc,
                history: currentText.favorites,
                historyDesc: currentText.historyDesc,
                family: currentText.family,
                familyDesc: currentText.familyDesc,
                priceCompare: currentText.priceCompare,
                priceCompareDesc: currentText.priceCompareDesc,
                insights: currentText.spendingInsights,
                insightsDesc: currentText.insightsDesc,
                daily: currentText.dailyPurchases,
                dailyDesc: currentText.dailyDesc,
                voice: currentText.inputPlaceholder,
                voiceDesc: currentText.voiceDesc,
                importExport: currentText.importExport,
                importExportDesc: currentText.importExportDesc,
                suggestions: currentText.suggestionsTitle,
                suggestionsDesc: currentText.suggestionsDesc,
                quickSearch: currentText.quickSearch,
                viewAll: currentText.viewAll,
                addItem: currentText.addItem,
                bestDeals: currentText.bestDeals,
              }}
              itemsCount={items.length}
              historyCount={historyItems.length}
              familyMembersCount={0}
              trackedPricesCount={historyItems.filter(item => item.price).length}
              rtl={language === 'he'}
            />
        ) : currentView === 'priceCompare' ? (
            <PriceComparePage
              onBack={() => setCurrentView('dashboard')}
              translations={{
                priceCompare: currentText.priceCompare,
                back: currentText.back,
                searchPlaceholder: currentText.searchPlaceholder,
                lowestPrice: currentText.lowestPrice,
                highestPrice: currentText.highestPrice,
                avgPrice: currentText.avgPrice,
                lastPurchased: currentText.lastPurchased,
                priceHistory: currentText.priceHistory,
                noPriceData: currentText.noPriceData,
                trackNewItem: currentText.trackNewItem,
                bestDeals: currentText.bestDeals,
                itemName: currentText.itemName,
                store: currentText.store,
                price: currentText.priceModalTotal,
                date: currentText.date,
                trend: currentText.trend,
              }}
              priceHistory={(() => {
                console.log('📊 Price Compare Data Debug:');
                console.log('Total history items:', historyItems.length);
                const itemsWithPrice = historyItems.filter(item => item.price);
                console.log('Items with price:', itemsWithPrice.length);
                const priceData = itemsWithPrice.map(item => ({
                  itemName: item.name,
                  price: item.price!,
                  store: item.store || 'Unknown Store',
                  date: item.lastPurchased
                }));
                console.log('Price history data:', priceData);
                return priceData;
              })()}
              rtl={language === 'he'}
            />
        ) : currentView === 'list' ? (
            <>
              {/* Action Buttons */}
              <div className="flex justify-between items-center mb-2 rtl:flex-row-reverse gap-2">
                <button
                  onClick={() => setShowSmartSuggestions(true)}
                  className="px-4 py-2 text-sm font-semibold rounded-lg transition-colors bg-purple-500 text-white hover:bg-purple-600 shadow-sm flex items-center gap-2"
                >
                  <span>✨</span>
                  <span>Smart Suggestions</span>
                </button>
              </div>

              {/* Swipe hint (shown once) */}
              {showSwipeHint && items.length > 0 && (
                <div className="mb-4 p-3 rounded-lg bg-yellow-50 text-yellow-800 border border-yellow-200 flex items-center justify-between gap-3 rtl:flex-row-reverse">
                  <div className="flex items-center gap-2 rtl:flex-row-reverse">
                    <span>👉</span>
                    <span className="text-sm">
                      {currentText.swipeHint}
                    </span>
                  </div>
                  <button
                    onClick={() => { try { localStorage.setItem('swipeHintDismissed', '1'); } catch {} setShowSwipeHint(false); }}
                    className="text-sm px-3 py-1 rounded-md bg-yellow-100 hover:bg-yellow-200 text-yellow-900"
                  >
                    {currentText.gotIt}
                  </button>
                </div>
              )}
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                  <div className="mb-2">{error}</div>
                  <button
                    onClick={async () => {
                      try {
                        setError(null);
                        setIsLoadingAuth(true);
                        const accessibleListId = await getAccessibleListId();
                        setListId(accessibleListId);
                        const ownerStatus = await isListOwner();
                        setIsOwner(ownerStatus);
                      } catch (e) {
                        console.error('Retry failed:', e);
                        const msg = e instanceof Error ? e.message : String(e);
                        setError(`Retry failed: ${msg}`);
                      } finally {
                        setIsLoadingAuth(false);
                      }
                    }}
                    className="inline-flex items-center px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 text-sm"
                  >
                    Retry loading list
                  </button>
                </div>
              )}
              
              <GroceryList
                categories={categorizedList}
                onToggleItem={handleToggleItem}
                onDeleteItem={handleDeleteItem}
                onAddAllInCategory={handleAddAllInCategory}
                onMoveToFavorites={handleMoveItemToFavorites}
                emptyState={{ title: currentText.emptyTitle, subtitle: currentText.emptySubtitle }}
                addAllText={currentText.addAll}
              />

              {/* Ad Banner for Free Users */}
              {currentPlan === 'free' && (
                <>
                  <AdBanner
                    adSlot={import.meta.env.VITE_ADSENSE_SLOT_ID}
                    format="auto"
                    responsive={true}
                    className="my-6"
                  />
                  {/* Remove Ads Banner */}
                  <div className="my-4 p-4 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-700">
                    <div className="flex items-center justify-between gap-4 rtl:flex-row-reverse">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                          {currentText.removeAdsTitle || 'Remove Ads'}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {currentText.removeAdsDescription || 'Upgrade to Pro or Family plan for an ad-free experience'}
                        </p>
                      </div>
                      <button
                        onClick={() => setShowPaywall(true)}
                        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all shadow-md whitespace-nowrap"
                      >
                        {currentText.upgrade || 'Upgrade'}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Clear Completed Button at Bottom */}
              {hasCompletedItems && (
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={handleClearCompleted}
                    className="px-6 py-3 text-sm font-semibold rounded-lg transition-colors bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md"
                  >
                    {currentText.clearCompleted}
                  </button>
                </div>
              )}
            </>
        ) : currentView === 'favorites' ? (
            <FavoritesPage historyItems={sortedHistory} onAddItem={handleAddItemFromHistory} onDeleteItem={handleDeleteHistoryItem} currency={currency} translations={{ title: currentText.favoritesTitle, subtitle: currentText.favoritesSubtitle, purchased: currentText.purchased, times: currentText.times, delete: currentText.deleteFromHistory, add: currentText.addToList, bestPriceEver: currentText.bestPriceEver, greatDeal: currentText.greatDeal, priceIncreased: currentText.priceIncreased, higherThanUsual: currentText.higherThanUsual, bestAtStore: currentText.bestAtStore, cheaper: currentText.cheaper, mostFrequent: currentText.mostFrequent, today: currentText.today, starred: currentText.starred, category: currentText.category, alphabetical: currentText.alphabetical }} />
        ) : currentView === 'family' ? (
            <FamilyActivities
              userId={user?.uid || ''}
              listId={listId || ''}
              translations={{
                title: currentText.familyTitle,
                subtitle: currentText.familySubtitle,
                membersTitle: currentText.familyMembersTitle,
                owner: currentText.familyOwner,
                member: currentText.familyMember,
                activeNow: currentText.familyActiveNow,
                recentActivityTitle: currentText.familyRecentActivity,
                noActivity: currentText.familyNoActivity,
                checkedOff: currentText.familyCheckedOff,
                added: currentText.familyAdded,
                removed: currentText.familyRemoved,
                you: currentText.familyYou,
                minutesAgo: currentText.familyMinutesAgo,
                hoursAgo: currentText.familyHoursAgo,
                daysAgo: currentText.familyDaysAgo,
                justNow: currentText.familyJustNow,
              }}
              rtl={language === 'he'}
            />
        ) : currentView === 'insights' ? (
            <SpendingInsights 
              historyItems={historyItems} 
              currency={currency}
              budget={monthlyBudget > 0 ? monthlyBudget : undefined}
              translations={{
                title: currentText.spendingInsights,
                monthlySpending: currentText.monthlySpending,
                itemsPurchased: currentText.itemsPurchased,
                avgPerItem: currentText.avgPerItem,
                weeklyTrend: currentText.weeklyTrend,
                thisWeek: currentText.thisWeek,
                lastWeek: currentText.lastWeek,
                categoryBreakdown: currentText.categoryBreakdown,
                budget: currentText.budget,
                remaining: currentText.remaining,
                overBudget: currentText.overBudget,
                noPriceData: currentText.noPriceData,
              }}
            />
        ) : currentView === 'daily' ? (
            <DailyPurchases 
              historyItems={historyItems} 
              currency={currency}
              translations={{
                title: currentText.dailyPurchases,
                subtitle: currentText.dailyPurchasesSubtitle,
                date: currentText.date,
                items: currentText.items,
                totalSpent: currentText.totalSpent,
                store: currentText.store,
                noPurchases: currentText.noPurchases,
                selectDate: currentText.selectDate,
                exportCSV: currentText.exportCSV,
                generateReport: currentText.generateReport,
                copyReport: currentText.copyReport,
                reportCopied: currentText.reportCopied,
                recentShoppingDays: currentText.recentShoppingDays,
              }}
            />
        ) : currentView === 'legal' ? (
            <LegalPage
              initialTab={'privacy'}
              translations={{
                legal: currentText.legal,
                privacyPolicy: currentText.privacyPolicy,
                termsOfService: currentText.termsOfService,
              }}
            />
        ) : null}
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md transition-colors">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Settings</h2>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Language</h3>
                <div className="flex gap-2">
                  <LanguageButton lang="en">EN</LanguageButton>
                  <LanguageButton lang="he">עב</LanguageButton>
                  <LanguageButton lang="es">ES</LanguageButton>
                </div>
              </div>

              {/* Dark Mode Toggle */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">🌙 {currentText.darkMode}</h3>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{currentText.darkModeDesc}</span>
                  <button
                    onClick={() => setDarkMode(!darkMode)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      darkMode ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        darkMode ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </label>
              </div>

              {/* Price Tracking Toggle */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">💰 {currentText.enablePriceTracking}</h3>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-gray-600">{currentText.priceTrackingDesc}</span>
                  <input
                    type="checkbox"
                    checked={enablePriceTracking}
                    onChange={(e) => {
                      setEnablePriceTracking(e.target.checked);
                      localStorage.setItem('enablePriceTracking', String(e.target.checked));
                    }}
                    className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                  />
                </label>
                {enablePriceTracking && (
                  <div className="mt-3">
                    <label className="text-sm text-gray-700">Currency:</label>
                    <select
                      value={currency}
                      onChange={(e) => {
                        setCurrency(e.target.value);
                        localStorage.setItem('currency', e.target.value);
                      }}
                      className="ml-2 px-2 py-1 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="USD">$ USD</option>
                      <option value="ILS">₪ ILS</option>
                      <option value="EUR">€ EUR</option>
                      <option value="GBP">£ GBP</option>
                    </select>
                  </div>
                )}
                
                {/* Budget Setting */}
                {enablePriceTracking && (
                  <div className="mt-4 pt-4 border-t">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">📊 {currentText.setBudget}</h3>
                    <p className="text-xs text-gray-500 mb-2">{currentText.budgetDesc}</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={monthlyBudget || ''}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          setMonthlyBudget(value);
                          localStorage.setItem('monthlyBudget', String(value));
                        }}
                        placeholder="0"
                        min="0"
                        step="50"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">{currency}</span>
                    </div>
                  </div>
                )}

                {/* Display Name Setting */}
                {user && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">👤 {currentText.displayName}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{currentText.displayNameDesc}</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder={user.email || ''}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={handleUpdateDisplayName}
                        disabled={isUpdatingDisplayName}
                        className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition-colors disabled:bg-gray-400"
                      >
                        {isUpdatingDisplayName ? currentText.savingDisplayName : currentText.saveDisplayName}
                      </button>
                    </div>
                  </div>
                )}

                {/* Legal Links */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">⚖️ {currentText.legal}</h3>
                <div className="flex items-center gap-3 text-sm">
                  <button onClick={() => { setShowSettings(false); setCurrentView('legal'); }} className="text-blue-600 hover:underline">
                    {currentText.privacyPolicy}
                  </button>
                  <span className="text-gray-400">•</span>
                  <button onClick={() => { setShowSettings(false); setCurrentView('legal'); }} className="text-blue-600 hover:underline">
                    {currentText.termsOfService}
                  </button>
                </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => { setShowSettings(false); setShowPaywall(true); }}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-md"
                >
                  💎 Upgrade to Pro
                </button>
                {isInstallable && (
                  <button
                    onClick={handleInstallApp}
                    className="px-4 py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold rounded-lg hover:from-green-600 hover:to-blue-600 transition-all shadow-md"
                  >
                    📱 {currentText.installApp}
                  </button>
                )}
                <button
                  onClick={() => { setShowSettings(false); setShowImportExport(true); }}
                  className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                >
                  {currentText.importExport}
                </button>
                {isOwner && (
                  <button
                    onClick={() => { setShowSettings(false); setShowAddMember(true); }}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    Add Family
                  </button>
                )}
                <button
                  onClick={() => { setShowSettings(false); handleSignOut(); }}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                >
                  {currentText.signOut}
                </button>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <Toast message={toast.message} onClose={() => setToast(null)} variant={toast.variant || 'info'} rtl={language === 'he'} />
      )}

      {currentView === 'list' && <ItemInput onAddItem={handleAddItem} isProcessing={isLoading} language={language} placeholders={{ main: currentText.inputPlaceholder, adding: currentText.adding, add: currentText.add }} />}
      
      {/* Family Member Addition Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md transition-colors">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Add Family Member</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">Enter the email address of a family member who has already created an account.</p>
            
            {addMemberStatus && (
              <div className={`p-3 rounded-lg mb-4 ${
                addMemberStatus.includes('successfully') 
                  ? 'bg-green-100 text-green-700' 
                  : addMemberStatus.includes('not found') 
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
              }`}>
                {addMemberStatus}
              </div>
            )}
            
            <input
              type="email"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              placeholder="family@example.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              disabled={!!addMemberStatus}
            />
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAddMember(false);
                  setMemberEmail('');
                  setAddMemberStatus(null);
                }}
                className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={!!addMemberStatus}
              >
                Cancel
              </button>
              <button
                onClick={handleAddFamilyMember}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400"
                disabled={!memberEmail.trim() || !!addMemberStatus}
              >
                Add Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Onboarding Modal */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={handleCloseOnboarding}
        language={language}
        translations={{
          welcome: currentText.welcome,
          subtitle: currentText.onboardingSubtitle,
          step1Title: currentText.step1Title,
          step1Desc: currentText.step1Desc,
          step2Title: currentText.step2Title,
          step2Desc: currentText.step2Desc,
          step3Title: currentText.step3Title,
          step3Desc: currentText.step3Desc,
          step4Title: currentText.step4Title,
          step4Desc: currentText.step4Desc,
          step5Title: currentText.step5Title,
          step5Desc: currentText.step5Desc,
          step6Title: currentText.step6Title,
          step6Desc: currentText.step6Desc,
          next: currentText.next,
          previous: currentText.previous,
          getStarted: currentText.getStarted,
          skip: currentText.skip,
        }}
      />

      {/* Import/Export Modal */}
      <ImportExportModal
        isOpen={showImportExport}
        onClose={() => setShowImportExport(false)}
        items={items}
        existingItemNames={items.map(item => item.name)}
        language={language}
        onImportSuccess={handleImportSuccess}
        translations={{
          title: currentText.importExportTitle,
          importTab: currentText.importTab,
          exportTab: currentText.exportTab,
          importFromFile: currentText.importFromFile,
          importFromClipboard: currentText.importFromClipboard,
          exportAsCSV: currentText.exportAsCSV,
          exportAsText: currentText.exportAsText,
          selectFile: currentText.selectFile,
          pasteFromClipboard: currentText.pasteFromClipboard,
          importing: currentText.importing,
          exporting: currentText.exporting,
          close: currentText.signOut, // Reusing close translation
          success: currentText.importSuccess,
          error: currentText.importError,
          itemsImported: currentText.itemsImported,
          itemsSkipped: currentText.itemsSkipped,
          noItemsToExport: currentText.noItemsToExport,
          fileTooBig: currentText.fileTooBig,
          invalidFileType: currentText.invalidFileType,
          clipboardEmpty: currentText.clipboardEmpty,
        }}
      />

      {/* Smart Suggestions Modal */}
      {showSmartSuggestions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowSmartSuggestions(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto transition-colors" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <span>✨</span>
                <span>{currentText.suggestionsTitle}</span>
              </h2>
              <button
                onClick={() => setShowSmartSuggestions(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <SmartSuggestions
              currentItems={items.map(item => item.name)}
              historyItems={historyItems}
              language={language}
              onAddSuggestion={(suggestion) => {
                handleAddSuggestion(suggestion);
                // Optionally close the modal after adding
                // setShowSmartSuggestions(false);
              }}
              translations={{
                title: currentText.suggestionsTitle,
                subtitle: currentText.suggestionsSubtitle,
                addButton: currentText.addSuggestion,
                noSuggestions: currentText.noSuggestions,
                predictive: currentText.predictive,
                timeBased: currentText.timeBased,
                frequencyBased: currentText.frequencyBased,
                seasonal: currentText.seasonal,
                complementary: currentText.complementary,
                bestPriceEver: currentText.bestPriceEver,
                greatDeal: currentText.greatDeal,
                priceIncreased: currentText.priceIncreased,
                higherThanUsual: currentText.higherThanUsual,
                bestAtStore: currentText.bestAtStore,
                cheaper: currentText.cheaper,
              }}
            />
          </div>
        </div>
      )}
      {/* Price Input Modal */}
      <PriceInputModal
        isOpen={showPriceModal}
        completedItems={pendingCompletedItems}
        currency={currency}
        onClose={() => {
          setShowPriceModal(false);
          setPendingCompletedItems([]);
        }}
        onSubmit={(itemsWithPrices) => {
          handleCompletedItemsWithPrices(itemsWithPrices);
          setShowPriceModal(false);
          setPendingCompletedItems([]);
        }}
        translations={{
          title: currentText.priceModalTitle,
          subtitle: currentText.priceModalSubtitle,
          skip: currentText.priceModalSkip,
          save: currentText.priceModalSave,
          total: currentText.priceModalTotal,
          optional: currentText.priceModalSubtitle,
          store: currentText.priceModalStore,
          storePlaceholder: currentText.priceModalStorePlaceholder,
        }}
      />

      {/* PWA Install Prompt */}
      <InstallPrompt
        translations={{
          installTitle: currentText.installTitle,
          installMessage: currentText.installMessage,
          installButton: currentText.installButton,
          installLater: currentText.installLater,
        }}
      />

      {/* Paywall Modal */}
      {showPaywall && (
        <PaywallModal
          onClose={() => setShowPaywall(false)}
          onSelectPlan={handleSelectPlan}
          currentPlan={currentPlan}
          userId={user?.uid}
          translations={{
            title: currentText.paywallTitle,
            subtitle: currentText.paywallSubtitle,
            monthly: currentText.monthly,
            yearly: currentText.yearly,
            savePercent: currentText.savePercent,
            freePlan: currentText.freePlan,
            proPlan: currentText.proPlan,
            familyPlan: currentText.familyPlan,
            popularBadge: currentText.popularBadge,
            currentBadge: currentText.currentBadge,
            selectButton: currentText.selectButton,
            continueButton: currentText.continueButton,
            trialInfo: currentText.trialInfo,
            features: {
              free: [
                currentText.freeFeature1,
                currentText.freeFeature2,
                currentText.freeFeature3,
                currentText.freeFeature4,
              ],
              pro: [
                currentText.proFeature1,
                currentText.proFeature2,
                currentText.proFeature3,
                currentText.proFeature4,
                currentText.proFeature5,
                currentText.proFeature6,
                currentText.proFeature7,
                currentText.proFeature8,
                currentText.proFeature9,
              ],
              family: [
                currentText.familyFeature1,
                currentText.familyFeature2,
                currentText.familyFeature3,
                currentText.familyFeature4,
                currentText.familyFeature5,
                currentText.familyFeature6,
              ],
            },
          }}
        />
      )}
    </div>
  );
}

export default App;
