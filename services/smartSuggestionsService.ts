import type { GroceryHistoryItem } from '../types';

interface ShoppingSuggestion {
  item: GroceryHistoryItem;
  reason: string;
  confidence: number;
  type: 'time-based' | 'frequency-based' | 'seasonal' | 'complementary';
}

interface TimeBasedRule {
  timeRange: { start: number; end: number }; // Hours in 24h format
  categories: string[];
  items: string[];
  reason: string;
}

// Time-based shopping patterns
const timeBasedRules: TimeBasedRule[] = [
  {
    timeRange: { start: 6, end: 10 },
    categories: ['Dairy & Eggs', 'Bakery', 'Beverages'],
    items: ['milk', 'bread', 'eggs', 'coffee', 'cereal', 'yogurt', 'orange juice'],
    reason: 'Morning breakfast essentials'
  },
  {
    timeRange: { start: 11, end: 14 },
    categories: ['Fresh Produce', 'Meat & Seafood', 'Pantry Staples'],
    items: ['lettuce', 'tomatoes', 'chicken', 'rice', 'pasta', 'olive oil'],
    reason: 'Lunch preparation items'
  },
  {
    timeRange: { start: 15, end: 19 },
    categories: ['Fresh Produce', 'Meat & Seafood', 'Dairy & Eggs'],
    items: ['vegetables', 'meat', 'cheese', 'onions', 'garlic', 'herbs'],
    reason: 'Dinner preparation essentials'
  },
  {
    timeRange: { start: 19, end: 23 },
    categories: ['Snacks', 'Beverages', 'Frozen Foods'],
    items: ['chips', 'ice cream', 'wine', 'beer', 'popcorn', 'chocolate'],
    reason: 'Evening snacks and treats'
  }
];

const timeBasedReasons = {
  en: {
    morning: 'Morning breakfast essentials',
    lunch: 'Lunch preparation items',
    dinner: 'Dinner preparation essentials',
    evening: 'Evening snacks and treats',
  },
  he: {
    morning: 'מובסס בוקר',
    lunch: 'פריטי הכנת צהריים',
    dinner: 'חיוניים להכנת ערב',
    evening: 'חטיפי ערב ופינוקים',
  },
  es: {
    morning: 'Esenciales del desayuno',
    lunch: 'Artículos para preparar el almuerzo',
    dinner: 'Esenciales para la cena',
    evening: 'Aperitivos y antojos nocturnos',
  },
} as const;

// Seasonal suggestions (month-based)
const seasonalRules: Record<number, { items: string[]; reason: string }> = {
  0: { items: ['soup', 'hot chocolate', 'citrus fruits', 'winter vegetables'], reason: 'January winter comfort foods' },
  1: { items: ['soup', 'hot tea', 'citrus fruits', 'root vegetables'], reason: 'February winter essentials' },
  2: { items: ['spring vegetables', 'fresh herbs', 'lighter meals'], reason: 'March spring transition' },
  3: { items: ['spring vegetables', 'fresh fruits', 'salad ingredients'], reason: 'April spring freshness' },
  4: { items: ['berries', 'asparagus', 'spring onions', 'fresh herbs'], reason: 'May spring produce' },
  5: { items: ['summer fruits', 'grilling items', 'salad ingredients'], reason: 'June summer preparation' },
  6: { items: ['berries', 'corn', 'tomatoes', 'grilling meat'], reason: 'July summer peak' },
  7: { items: ['summer fruits', 'vegetables', 'cold beverages'], reason: 'August summer harvest' },
  8: { items: ['apples', 'pumpkin', 'back-to-school snacks'], reason: 'September autumn transition' },
  9: { items: ['pumpkin', 'squash', 'apples', 'warm spices'], reason: 'October autumn flavors' },
  10: { items: ['turkey', 'cranberries', 'sweet potatoes', 'stuffing'], reason: 'November holiday preparation' },
  11: { items: ['holiday baking', 'festive drinks', 'party snacks'], reason: 'December holiday season' }
};

const seasonalReasonMap = {
  en: (reason: string) => reason,
  he: (reason: string) => reason
    .replace('January winter comfort foods', 'מזון מנחם לחורף (ינואר)')
    .replace('February winter essentials', 'חיוני חורף (פברואר)')
    .replace('March spring transition', 'מעבר לאביב (מרץ)')
    .replace('April spring freshness', 'רעננות האביב (אפריל)')
    .replace('May spring produce', 'תוצרת אביב (מאי)')
    .replace('June summer preparation', 'הכנה לקיץ (יוני)')
    .replace('July summer peak', 'שיא הקיץ (יולי)')
    .replace('August summer harvest', 'קציר הקיץ (אוגוסט)')
    .replace('September autumn transition', 'מעבר לסתיו (ספטמבר)')
    .replace('October autumn flavors', 'טעמי הסתיו (אוקטובר)')
    .replace('November holiday preparation', 'הכנות לחגים (נובמבר)')
    .replace('December holiday season', 'עונת החגים (דצמבר)'),
  es: (reason: string) => reason
    .replace('January winter comfort foods', 'Comidas reconfortantes de invierno (enero)')
    .replace('February winter essentials', 'Esenciales de invierno (febrero)')
    .replace('March spring transition', 'Transición de primavera (marzo)')
    .replace('April spring freshness', 'Frescura de primavera (abril)')
    .replace('May spring produce', 'Productos de primavera (mayo)')
    .replace('June summer preparation', 'Preparación de verano (junio)')
    .replace('July summer peak', 'Pico de verano (julio)')
    .replace('August summer harvest', 'Cosecha de verano (agosto)')
    .replace('September autumn transition', 'Transición de otoño (septiembre)')
    .replace('October autumn flavors', 'Sabores de otoño (octubre)')
    .replace('November holiday preparation', 'Preparación de festividades (noviembre)')
    .replace('December holiday season', 'Temporada de fiestas (diciembre)'),
} as const;

// Complementary item suggestions
const complementaryItems: Record<string, string[]> = {
  'pasta': ['tomato sauce', 'parmesan cheese', 'garlic', 'olive oil'],
  'bread': ['butter', 'jam', 'peanut butter', 'honey'],
  'coffee': ['milk', 'sugar', 'cream'],
  'cereal': ['milk', 'bananas', 'berries'],
  'chicken': ['rice', 'vegetables', 'herbs', 'olive oil'],
  'fish': ['lemon', 'herbs', 'vegetables', 'olive oil'],
  'salad': ['dressing', 'tomatoes', 'cucumber', 'cheese'],
  'pizza': ['cheese', 'tomato sauce', 'pepperoni', 'vegetables'],
  'tacos': ['tortillas', 'cheese', 'lettuce', 'tomatoes', 'avocado'],
  'soup': ['bread', 'crackers', 'cheese'],
  'wine': ['cheese', 'crackers', 'grapes'],
  'beer': ['chips', 'nuts', 'pretzels']
};

// Hebrew complementary items
const complementaryItemsHe: Record<string, string[]> = {
  'פסטה': ['רטב עגבניות', 'גבינת פרמזן', 'שום', 'שמן זית'],
  'לחם': ['חמאה', 'ריבה', 'חמאת בוטנים', 'דבש'],
  'קפה': ['חלב', 'סוכר', 'שמנת'],
  'דגנים': ['חלב', 'בננות', 'פירות יער'],
  'עוף': ['אורז', 'ירקות', 'תבלינים', 'שמן זית'],
  'דג': ['לימון', 'תבלינים', 'ירקות', 'שמן זית'],
  'סלט': ['רטב', 'עגבניות', 'מלפפון', 'גבינה']
};

// Spanish complementary items
const complementaryItemsEs: Record<string, string[]> = {
  'pasta': ['salsa de tomate', 'queso parmesano', 'ajo', 'aceite de oliva'],
  'pan': ['mantequilla', 'mermelada', 'mantequilla de maní', 'miel'],
  'café': ['leche', 'azúcar', 'crema'],
  'cereal': ['leche', 'plátanos', 'bayas'],
  'pollo': ['arroz', 'verduras', 'hierbas', 'aceite de oliva'],
  'pescado': ['limón', 'hierbas', 'verduras', 'aceite de oliva'],
  'ensalada': ['aderezo', 'tomates', 'pepino', 'queso']
};

// Get time-based suggestions
function getTimeBasedSuggestions(historyItems: GroceryHistoryItem[], language: 'en' | 'he' | 'es'): ShoppingSuggestion[] {
  const currentHour = new Date().getHours();
  const suggestions: ShoppingSuggestion[] = [];
  
  for (const rule of timeBasedRules) {
    if (currentHour >= rule.timeRange.start && currentHour <= rule.timeRange.end) {
      // Find matching items from history
      const matchingItems = historyItems.filter(item => 
        rule.categories.includes(item.category) || 
        rule.items.some(ruleItem => item.name.toLowerCase().includes(ruleItem.toLowerCase()))
      );
      
      // Sort by frequency and take top items
      const topItems = matchingItems
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 3);
      
      for (const item of topItems) {
        let reason = rule.reason;
        if (rule.reason === 'Morning breakfast essentials') reason = timeBasedReasons[language].morning;
        else if (rule.reason === 'Lunch preparation items') reason = timeBasedReasons[language].lunch;
        else if (rule.reason === 'Dinner preparation essentials') reason = timeBasedReasons[language].dinner;
        else if (rule.reason === 'Evening snacks and treats') reason = timeBasedReasons[language].evening;
        suggestions.push({
          item,
          reason,
          confidence: 0.8,
          type: 'time-based'
        });
      }
    }
  }
  
  return suggestions;
}

// Get frequency-based suggestions
function getFrequencyBasedSuggestions(historyItems: GroceryHistoryItem[], language: 'en' | 'he' | 'es'): ShoppingSuggestion[] {
  const suggestions: ShoppingSuggestion[] = [];
  const now = new Date();
  
  // Find items that are frequently purchased and haven't been bought recently
  const frequentItems = historyItems
    .filter(item => item.frequency >= 3) // Items bought at least 3 times
    .sort((a, b) => b.frequency - a.frequency);
  
  for (const item of frequentItems.slice(0, 5)) {
    const daysSinceLastPurchase = Math.floor(
      (now.getTime() - new Date(item.lastAdded).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Suggest if it's been more than a week since last purchase
    if (daysSinceLastPurchase > 7) {
      const confidence = Math.min(0.9, item.frequency / 10);
      const reason = language === 'he'
        ? `נרכש בממוצע ${item.frequency} פעמים`
        : language === 'es'
          ? `Lo compras en promedio ${item.frequency} veces`
          : `You buy this ${item.frequency} times on average`;
      suggestions.push({
        item,
        reason,
        confidence,
        type: 'frequency-based'
      });
    }
  }
  
  return suggestions;
}

// Get seasonal suggestions
function getSeasonalSuggestions(historyItems: GroceryHistoryItem[], language: 'en' | 'he' | 'es'): ShoppingSuggestion[] {
  const currentMonth = new Date().getMonth();
  const seasonalRule = seasonalRules[currentMonth];
  const suggestions: ShoppingSuggestion[] = [];
  
  if (seasonalRule) {
    const matchingItems = historyItems.filter(item =>
      seasonalRule.items.some(seasonalItem => 
        item.name.toLowerCase().includes(seasonalItem.toLowerCase())
      )
    );
    
    for (const item of matchingItems.slice(0, 3)) {
      const localized = seasonalReasonMap[language](seasonalRule.reason);
      suggestions.push({
        item,
        reason: localized,
        confidence: 0.7,
        type: 'seasonal'
      });
    }
  }
  
  return suggestions;
}

// Get complementary suggestions based on current list
function getComplementarySuggestions(
  currentItems: string[], 
  historyItems: GroceryHistoryItem[], 
  language: 'en' | 'he' | 'es'
): ShoppingSuggestion[] {
  const suggestions: ShoppingSuggestion[] = [];
  const complementaryMap = language === 'he' ? complementaryItemsHe : 
                          language === 'es' ? complementaryItemsEs : 
                          complementaryItems;
  
  for (const currentItem of currentItems) {
    const lowerItem = currentItem.toLowerCase();
    
    for (const [baseItem, complements] of Object.entries(complementaryMap)) {
      if (lowerItem.includes(baseItem.toLowerCase())) {
        // Find complementary items in history
        const matchingComplements = historyItems.filter(historyItem =>
          complements.some(complement => 
            historyItem.name.toLowerCase().includes(complement.toLowerCase())
          ) && !currentItems.some(current => 
            current.toLowerCase() === historyItem.name.toLowerCase()
          )
        );
        
        for (const complement of matchingComplements.slice(0, 2)) {
          const reason = language === 'he'
            ? `משתלב היטב עם ${currentItem}`
            : language === 'es'
              ? `Va bien con ${currentItem}`
              : `Goes well with ${currentItem}`;
          suggestions.push({
            item: complement,
            reason,
            confidence: 0.6,
            type: 'complementary'
          });
        }
      }
    }
  }
  
  return suggestions;
}

// Main smart suggestions function
export const getSmartSuggestions = (
  currentItems: string[],
  historyItems: GroceryHistoryItem[],
  language: 'en' | 'he' | 'es' = 'en'
): ShoppingSuggestion[] => {
  const allSuggestions: ShoppingSuggestion[] = [
    ...getTimeBasedSuggestions(historyItems, language),
    ...getFrequencyBasedSuggestions(historyItems, language),
    ...getSeasonalSuggestions(historyItems, language),
    ...getComplementarySuggestions(currentItems, historyItems, language)
  ];
  
  // Remove duplicates and items already in current list
  const uniqueSuggestions = allSuggestions.filter((suggestion, index, arr) => {
    const isDuplicate = arr.findIndex(s => s.item.name === suggestion.item.name) !== index;
    const isAlreadyInList = currentItems.some(item => 
      item.toLowerCase() === suggestion.item.name.toLowerCase()
    );
    return !isDuplicate && !isAlreadyInList;
  });
  
  // Sort by confidence and return top suggestions
  return uniqueSuggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 8); // Return top 8 suggestions
};

// Get suggestions for empty list (first-time users or new shopping trip)
export const getStarterSuggestions = (
  historyItems: GroceryHistoryItem[],
  language: 'en' | 'he' | 'es' = 'en'
): ShoppingSuggestion[] => {
  if (historyItems.length === 0) {
    // Default starter items for new users
    const starterItems = language === 'he' ? 
      ['חלב', 'לחם', 'ביצים', 'בננות', 'עגבניות'] :
      language === 'es' ?
      ['leche', 'pan', 'huevos', 'plátanos', 'tomates'] :
      ['milk', 'bread', 'eggs', 'bananas', 'tomatoes'];
    
    return starterItems.map(item => ({
      item: {
        name: item,
        category: language === 'he' ? 'מוצרי יסוד' : language === 'es' ? 'Esenciales' : 'Essentials',
        frequency: 1,
        lastAdded: new Date().toISOString()
      },
      reason: language === 'he' ? 'פריטים בסיסיים' : language === 'es' ? 'Elementos básicos' : 'Basic essentials',
      confidence: 0.5,
      type: 'frequency-based'
    }));
  }
  
  // For users with history, show most frequent items
  return historyItems
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 5)
    .map(item => ({
      item,
      reason: language === 'he' ? 'פריט פופולרי' : language === 'es' ? 'Artículo popular' : 'Popular item',
      confidence: Math.min(0.8, item.frequency / 10),
      type: 'frequency-based' as const
    }));
};

export type { ShoppingSuggestion };
