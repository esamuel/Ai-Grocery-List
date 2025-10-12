
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { GroceryItem, Category, PurchaseHistoryItem, GroceryHistoryItem } from './types';
import { ItemInput } from './components/ItemInput';
import { GroceryList } from './components/GroceryList';
import { categorizeGroceries } from './services/geminiService';
import { FavoritesPage } from './components/FavoritesPage';
import { PriceInputModal } from './components/PriceInputModal';
import { SpendingInsights } from './components/SpendingInsights';
import { ListIcon } from './components/icons/ListIcon';
import { StarIcon } from './components/icons/StarIcon';
import { InfoIcon } from './components/icons/InfoIcon';
import { GearIcon } from './components/icons/GearIcon';
import { LoginPage } from './components/LoginPage';
import { OnboardingModal } from './components/OnboardingModal';
import { SmartSuggestions } from './components/SmartSuggestions';
import type { ShoppingSuggestion } from './services/smartSuggestionsService';
import { ImportExportModal } from './components/ImportExportModal';
import { LaunchChecklistPage } from './components/LaunchChecklistPage';
import { Toast } from './components/Toast';
import { useFirestoreSync } from './hooks/useFirestoreSync';
import { onAuthStateChange, signOutUser, getAccessibleListId, addFamilyMember, isListOwner } from './services/firebaseService';
import type { User } from 'firebase/auth';
import { addOrIncrementPurchase } from './services/purchaseHistoryService';
import { isSemanticDuplicate, normalize } from './services/semanticDupService';
type Language = 'en' | 'he' | 'es';
type View = 'list' | 'favorites' | 'insights' | 'checklist';

const translations = {
  en: {
    title: "Aii Grocery list",
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
    favoritesTitle: "Purchase History",
    favoritesSubtitle: "Shop faster by adding your frequent purchases.",
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
    // Onboarding
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
    favoritesTitle: "היסטוריית קניות",
    favoritesSubtitle: "קנה מהר יותר על ידי הוספת הרכישות התכופות שלך.",
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
    // Onboarding
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
    favoritesTitle: "Historial de Compras",
    favoritesSubtitle: "Compra más rápido añadiendo tus compras frecuentes.",
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
    // Onboarding
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
  const [currentView, setCurrentView] = useState<View>('list');
  const [showSwipeHint, setShowSwipeHint] = useState<boolean>(() => {
    try { return localStorage.getItem('swipeHintDismissed') ? false : true; } catch { return true; }
  });
  const [user, setUser] = useState<User | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showSmartSuggestions, setShowSmartSuggestions] = useState(false);
  
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
  type ToastVariant = 'info' | 'success' | 'error' | 'warning';
  const [toast, setToast] = useState<{ message: string; variant?: ToastVariant } | null>(null);
  
  // Firestore sync hook
  const { items, historyItems, setItems, setHistoryItems, isSyncing } = useFirestoreSync(listId);
  
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
            
            // Check if user is the list owner
            const ownerStatus = await isListOwner();
            setIsOwner(ownerStatus);
            
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
    setItems(currentItems => currentItems.filter(item => item.id !== id));
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

  // Define this FIRST since handleClearCompleted depends on it
  const handleCompletedItemsWithPrices = useCallback(async (itemsWithPrices: { name: string; category: string; price?: number }[]) => {
    if (!listId) return;

    console.log('🔄 Processing completed items with prices:', itemsWithPrices);

    try {
      // FIRST: Update history in Firestore (with prices)
      await addOrIncrementPurchase(listId, itemsWithPrices.map(i => ({ 
        name: i.name, 
        category: i.category,
        price: i.price,
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

  // Show login page if user is not authenticated
  if (!user && !isDemoMode) {
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
    <button onClick={() => setCurrentView(view)} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${currentView === view ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
      {children}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans" dir={language === 'he' ? 'rtl' : 'ltr'}>
      <header className="bg-white/90 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="max-w-3xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    <span className="text-3xl">🛒</span>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">{currentText.title}</h1>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                            <span>Welcome, {user?.email}</span>
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
        <div className="max-w-3xl mx-auto border-t border-gray-200 flex">
            <NavButton currentView={currentView} buttonView="list" onClick={() => setCurrentView('list')}><ListIcon className="w-6 h-6 mb-1"/><span>{currentText.list}</span></NavButton>
            <NavButton currentView={currentView} buttonView="favorites" onClick={() => setCurrentView('favorites')}><StarIcon className="w-6 h-6 mb-1"/><span>{currentText.favorites}</span></NavButton>
            <NavButton currentView={currentView} buttonView="insights" onClick={() => setCurrentView('insights')}><span className="text-2xl mb-1">📊</span><span>{currentText.spendingInsights}</span></NavButton>
        </div>
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
        {currentView === 'list' ? (
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
                {hasCompletedItems && (
                  <button onClick={handleClearCompleted} className="px-4 py-2 text-sm font-semibold rounded-lg transition-colors bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm">
                    {currentText.clearCompleted}
                  </button>
                )}
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
            </>
        ) : currentView === 'favorites' ? (
            <FavoritesPage historyItems={sortedHistory} onAddItem={handleAddItemFromHistory} onDeleteItem={handleDeleteHistoryItem} currency={currency} translations={{ title: currentText.favoritesTitle, subtitle: currentText.favoritesSubtitle, purchased: currentText.purchased, times: currentText.times, delete: currentText.deleteFromHistory, add: currentText.addToList }} />
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
        ) : (
            <LaunchChecklistPage onClose={() => setCurrentView('list')} />
        )}
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Settings</h2>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Language</h3>
                <div className="flex gap-2">
                  <LanguageButton lang="en">EN</LanguageButton>
                  <LanguageButton lang="he">עב</LanguageButton>
                  <LanguageButton lang="es">ES</LanguageButton>
                </div>
              </div>

              {/* Price Tracking Toggle */}
              <div className="border-t pt-4">
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => { setShowSettings(false); setCurrentView('checklist'); }}
                  className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                >
                  Launch Checklist
                </button>
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
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Add Family Member</h2>
            <p className="text-gray-600 mb-4">Enter the email address of a family member who has already created an account.</p>
            
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
          <div className="bg-white rounded-2xl p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
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
        }}
      />
    </div>
  );
}

export default App;
