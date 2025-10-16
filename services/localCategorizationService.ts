import type { ParsedGroceryItem, CategorizedResponse } from './geminiService';
import { CATEGORY_TRANSLATIONS, type Language } from './categoryTranslations';

// Local categorization rules for offline use
interface CategoryRule {
  keywords: string[];
  category: string;
  confidence: number;
}

// Multi-language categorization rules using standardized translations
const categorizationRules: Record<string, CategoryRule[]> = {
  en: [
    // Fruits
    { keywords: ['apple', 'banana', 'orange', 'lemon', 'lime', 'grape', 'strawberry', 'blueberry', 'raspberry', 'pear', 'peach', 'plum', 'cherry', 'kiwi', 'mango', 'pineapple', 'watermelon', 'melon', 'avocado'], category: CATEGORY_TRANSLATIONS['Fruits'].en, confidence: 0.95 },
    
    // Vegetables
    { keywords: ['tomato', 'lettuce', 'carrot', 'onion', 'potato', 'cucumber', 'bell pepper', 'spinach', 'broccoli', 'cauliflower', 'zucchini', 'eggplant', 'garlic', 'ginger', 'cabbage', 'corn', 'peas', 'beans', 'celery', 'mushroom'], category: CATEGORY_TRANSLATIONS['Vegetables'].en, confidence: 0.95 },
    
    // Meat
    { keywords: ['chicken', 'beef', 'pork', 'turkey', 'lamb', 'bacon', 'ham', 'sausage', 'ground beef', 'steak', 'ribs', 'wings'], category: CATEGORY_TRANSLATIONS['Meat'].en, confidence: 0.95 },
    
    // Fish
    { keywords: ['fish', 'salmon', 'tuna', 'shrimp', 'crab', 'lobster', 'cod', 'tilapia', 'sardines', 'anchovies', 'seafood'], category: CATEGORY_TRANSLATIONS['Fish'].en, confidence: 0.95 },
    
    // Dairy
    { keywords: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'sour cream', 'cottage cheese', 'mozzarella', 'cheddar', 'parmesan'], category: CATEGORY_TRANSLATIONS['Dairy'].en, confidence: 0.95 },
    
    // Bread & Bakery
    { keywords: ['bread', 'bagel', 'croissant', 'muffin', 'donut', 'cake', 'cookie', 'pastry', 'baguette', 'roll', 'toast', 'pie', 'pita'], category: CATEGORY_TRANSLATIONS['Bread & Bakery'].en, confidence: 0.95 },
    
    // Grains & Cereals
    { keywords: ['rice', 'pasta', 'flour', 'oats', 'cereal', 'quinoa', 'barley', 'wheat', 'granola', 'muesli'], category: CATEGORY_TRANSLATIONS['Grains & Cereals'].en, confidence: 0.9 },
    
    // Beverages
    { keywords: ['water', 'juice', 'soda', 'coffee', 'tea', 'beer', 'wine', 'smoothie'], category: CATEGORY_TRANSLATIONS['Beverages'].en, confidence: 0.9 },
    
    // Snacks
    { keywords: ['chips', 'crackers', 'nuts', 'popcorn', 'candy', 'chocolate', 'cookies', 'pretzels', 'granola bar'], category: CATEGORY_TRANSLATIONS['Snacks'].en, confidence: 0.9 },
    
    // Frozen
    { keywords: ['frozen', 'ice cream', 'frozen vegetables', 'frozen fruit', 'frozen pizza', 'frozen dinner', 'popsicle'], category: CATEGORY_TRANSLATIONS['Frozen'].en, confidence: 0.95 },
    
    // Household & Cleaning
    { keywords: ['soap', 'detergent', 'bleach', 'toilet paper', 'paper towels', 'cleaning', 'dish soap', 'laundry', 'trash bags'], category: CATEGORY_TRANSLATIONS['Household & Cleaning'].en, confidence: 0.95 },
    
    // Personal Care
    { keywords: ['shampoo', 'toothpaste', 'toothbrush', 'deodorant', 'lotion', 'sunscreen', 'razor', 'makeup'], category: CATEGORY_TRANSLATIONS['Personal Care'].en, confidence: 0.95 }
  ],
  
  he: [
    // Fruits - Hebrew
    { keywords: ['תפוח', 'בננה', 'תפוז', 'לימון', 'ענבים', 'תות', 'אגס', 'אפרסק', 'שזיף', 'דובדבן', 'קיווי', 'מנגו', 'אננס', 'אבטיח', 'מלון', 'אבוקדו'], category: CATEGORY_TRANSLATIONS['Fruits'].he, confidence: 0.95 },
    
    // Vegetables - Hebrew
    { keywords: ['עגבניה', 'חסה', 'גזר', 'בצל', 'תפוח אדמה', 'מלפפון', 'פלפל', 'תרד', 'ברוקולי', 'כרובית', 'קישוא', 'חציל', 'שום', 'זנגביל', 'כרוב', 'תירס', 'אפונה', 'פטריות'], category: CATEGORY_TRANSLATIONS['Vegetables'].he, confidence: 0.95 },
    
    // Meat - Hebrew
    { keywords: ['עוף', 'בקר', 'חזיר', 'הודו', 'כבש', 'בייקון', 'נקניק', 'בשר טחון', 'סטייק'], category: CATEGORY_TRANSLATIONS['Meat'].he, confidence: 0.95 },
    
    // Fish - Hebrew
    { keywords: ['דג', 'סלמון', 'טונה', 'שרימפס', 'סרטן', 'לובסטר', 'בקלה', 'טילפיה', 'פירות ים'], category: CATEGORY_TRANSLATIONS['Fish'].he, confidence: 0.95 },
    
    // Dairy - Hebrew
    { keywords: ['חלב', 'גבינה', 'יוגורט', 'חמאה', 'שמנת', 'שמנת חמוצה', 'גבינת קוטג', 'מוצרלה', 'צ\'דר'], category: CATEGORY_TRANSLATIONS['Dairy'].he, confidence: 0.95 },
    
    // Bread & Bakery - Hebrew
    { keywords: ['לחם', 'בייגל', 'קרואסון', 'מאפין', 'סופגניה', 'עוגה', 'עוגיה', 'מאפה', 'לחמניה', 'פיתה'], category: CATEGORY_TRANSLATIONS['Bread & Bakery'].he, confidence: 0.95 },
    
    // Grains & Cereals - Hebrew
    { keywords: ['אורז', 'פסטה', 'קמח', 'שיבולת שועל', 'דגני בוקר', 'קינואה', 'שעורה', 'חיטה', 'גרנולה'], category: CATEGORY_TRANSLATIONS['Grains & Cereals'].he, confidence: 0.9 },
    
    // Beverages - Hebrew
    { keywords: ['מים', 'מיץ', 'משקה קל', 'קפה', 'תה', 'בירה', 'יין', 'שייק'], category: CATEGORY_TRANSLATIONS['Beverages'].he, confidence: 0.9 },
    
    // Snacks - Hebrew
    { keywords: ['צ\'יפס', 'קרקרים', 'אגוזים', 'פופקורן', 'ממתק', 'שוקולד', 'עוגיות', 'פרצלים'], category: CATEGORY_TRANSLATIONS['Snacks'].he, confidence: 0.9 },
    
    // Frozen - Hebrew
    { keywords: ['קפוא', 'גלידה', 'ירקות קפואים', 'פירות קפואים', 'פיצה קפואה', 'ארוחה קפואה'], category: CATEGORY_TRANSLATIONS['Frozen'].he, confidence: 0.95 },
    
    // Household & Cleaning - Hebrew
    { keywords: ['סבון', 'חומר ניקוי', 'אקונומיקה', 'נייר טואלט', 'מגבות נייר', 'ניקוי', 'סבון כלים', 'כביסה', 'שקיות זבל'], category: CATEGORY_TRANSLATIONS['Household & Cleaning'].he, confidence: 0.95 },
    
    // Personal Care - Hebrew
    { keywords: ['שמפו', 'משחת שיניים', 'מברשת שיניים', 'דאודורנט', 'קרם', 'קרם הגנה', 'סכין גילוח', 'איפור'], category: CATEGORY_TRANSLATIONS['Personal Care'].he, confidence: 0.95 }
  ],
  
  es: [
    // Fruits - Spanish
    { keywords: ['manzana', 'plátano', 'naranja', 'limón', 'uva', 'fresa', 'pera', 'durazno', 'ciruela', 'cereza', 'kiwi', 'mango', 'piña', 'sandía', 'melón', 'aguacate'], category: CATEGORY_TRANSLATIONS['Fruits'].es, confidence: 0.95 },
    
    // Vegetables - Spanish
    { keywords: ['tomate', 'lechuga', 'zanahoria', 'cebolla', 'papa', 'pepino', 'pimiento', 'espinaca', 'brócoli', 'coliflor', 'calabacín', 'berenjena', 'ajo', 'jengibre', 'repollo', 'maíz', 'guisantes', 'hongos'], category: CATEGORY_TRANSLATIONS['Vegetables'].es, confidence: 0.95 },
    
    // Meat - Spanish
    { keywords: ['pollo', 'carne', 'cerdo', 'pavo', 'cordero', 'tocino', 'jamón', 'salchicha', 'carne molida', 'bistec', 'costillas', 'alitas'], category: CATEGORY_TRANSLATIONS['Meat'].es, confidence: 0.95 },
    
    // Fish - Spanish
    { keywords: ['pescado', 'salmón', 'atún', 'camarón', 'cangrejo', 'langosta', 'bacalao', 'tilapia', 'mariscos'], category: CATEGORY_TRANSLATIONS['Fish'].es, confidence: 0.95 },
    
    // Dairy - Spanish
    { keywords: ['leche', 'queso', 'yogur', 'mantequilla', 'crema', 'crema agria', 'queso cottage', 'mozzarella', 'cheddar', 'parmesano'], category: CATEGORY_TRANSLATIONS['Dairy'].es, confidence: 0.95 },
    
    // Bread & Bakery - Spanish
    { keywords: ['pan', 'bagel', 'croissant', 'muffin', 'panecillos', 'pita', 'baguette', 'tostada', 'pastel', 'galletas'], category: CATEGORY_TRANSLATIONS['Bread & Bakery'].es, confidence: 0.95 },
    
    // Grains & Cereals - Spanish
    { keywords: ['arroz', 'pasta', 'harina', 'avena', 'cereal', 'quinoa', 'cebada', 'trigo', 'granola'], category: CATEGORY_TRANSLATIONS['Grains & Cereals'].es, confidence: 0.9 },
    
    // Beverages - Spanish
    { keywords: ['agua', 'jugo', 'refresco', 'café', 'té', 'cerveza', 'vino', 'batido'], category: CATEGORY_TRANSLATIONS['Beverages'].es, confidence: 0.9 },
    
    // Snacks - Spanish
    { keywords: ['papas fritas', 'galletas', 'nueces', 'palomitas', 'dulces', 'chocolate', 'pretzels'], category: CATEGORY_TRANSLATIONS['Snacks'].es, confidence: 0.9 },
    
    // Frozen - Spanish
    { keywords: ['congelado', 'helado', 'verduras congeladas', 'frutas congeladas', 'pizza congelada', 'cena congelada'], category: CATEGORY_TRANSLATIONS['Frozen'].es, confidence: 0.95 },
    
    // Household & Cleaning - Spanish
    { keywords: ['jabón', 'detergente', 'lejía', 'papel higiénico', 'toallas de papel', 'limpieza', 'jabón para platos', 'lavandería', 'bolsas de basura'], category: CATEGORY_TRANSLATIONS['Household & Cleaning'].es, confidence: 0.95 },
    
    // Personal Care - Spanish
    { keywords: ['champú', 'pasta de dientes', 'cepillo de dientes', 'desodorante', 'loción', 'protector solar', 'navaja', 'maquillaje'], category: CATEGORY_TRANSLATIONS['Personal Care'].es, confidence: 0.95 }
  ]
};

// Quantity and unit extraction patterns
const quantityPatterns = [
  // English patterns
  { regex: /(\d+)×?\s*(.+)/i, language: 'en' },
  { regex: /(\d+)\s+(bottles?|cans?|boxes?|bags?|pieces?|items?)\s+(.+)/i, language: 'en' },
  { regex: /(\d+)\s*([a-zA-Z]+)\s+(.+)/i, language: 'en' },
  
  // Hebrew patterns
  { regex: /^(\d+)×?\s*(.+)/i, language: 'he' },
  { regex: /^(\d+)\s+(בקבוקים?|קופסאות?|שקיות?|יחידות?)\s+(.+)/i, language: 'he' },
  
  // Spanish patterns
  { regex: /(\d+)×?\s*(.+)/i, language: 'es' },
  { regex: /(\d+)\s+(botellas?|latas?|cajas?|bolsas?|piezas?)\s+(.+)/i, language: 'es' }
];

// Unit extraction patterns
const unitPatterns = [
  // Weight units
  { regex: /(\d+)\s*(kg|kilogram|kilograms|g|gram|grams|lb|pound|pounds|oz|ounce|ounces)/i, unit: '$2' },
  
  // Volume units
  { regex: /(\d+)\s*(l|liter|liters|ml|milliliter|milliliters|gal|gallon|gallons|fl oz|fluid ounce|fluid ounces)/i, unit: '$2' },
  
  // Hebrew units
  { regex: /(\d+)\s*(ק"ג|קילו|גרם|ליטר|מ"ל)/i, unit: '$2' },
  
  // Spanish units
  { regex: /(\d+)\s*(kg|kilogramo|kilogramos|g|gramo|gramos|l|litro|litros|ml|mililitro|mililitros)/i, unit: '$2' }
];

// Parse quantity and unit from text
function parseQuantityAndUnit(text: string): { quantity: number; unit?: string; cleanName: string } {
  let quantity = 1;
  let unit: string | undefined;
  let cleanName = text.trim();

  console.log('Parsing quantity from:', text);

  // Try quantity patterns
  for (const pattern of quantityPatterns) {
    const match = text.match(pattern.regex);
    if (match) {
      quantity = parseInt(match[1]) || 1;
      cleanName = match[2] || match[3] || text;
      console.log('Quantity pattern matched:', { pattern: pattern.regex, quantity, cleanName, match });
      break;
    }
  }

  // Try unit patterns
  for (const pattern of unitPatterns) {
    const match = text.match(pattern.regex);
    if (match) {
      unit = match[2];
      // Remove unit from clean name
      cleanName = cleanName.replace(pattern.regex, '$1').trim();
      break;
    }
  }

  // Clean up the name
  cleanName = cleanName.replace(/^\d+×?\s*/, '').trim();
  cleanName = cleanName.replace(/\s+/g, ' ').trim();

  return { quantity, unit, cleanName };
}

// Categorize a single item using local rules
function categorizeItem(itemName: string, language: 'en' | 'he' | 'es'): string {
  const rules = categorizationRules[language] || categorizationRules.en;
  const lowerName = itemName.toLowerCase();
  
  let bestMatch = { category: 'Uncategorized', confidence: 0 };
  
  for (const rule of rules) {
    for (const keyword of rule.keywords) {
      if (lowerName.includes(keyword.toLowerCase())) {
        if (rule.confidence > bestMatch.confidence) {
          bestMatch = { category: rule.category, confidence: rule.confidence };
        }
      }
    }
  }
  
  return bestMatch.category;
}

// Main local categorization function
export const categorizeGroceriesLocally = (
  newItemText: string, 
  existingItems: string[], 
  language: 'en' | 'he' | 'es'
): CategorizedResponse[] => {
  console.log('Using local categorization fallback for:', newItemText);
  
  // Split input by common separators
  const items = newItemText.split(/[,;]/).map(item => item.trim()).filter(item => item.length > 0);
  
  const categorizedItems: { [category: string]: ParsedGroceryItem[] } = {};
  
  for (const itemText of items) {
    // Skip if item already exists
    if (existingItems.some(existing => existing.toLowerCase() === itemText.toLowerCase())) {
      continue;
    }
    
    // Parse quantity and unit
    const { quantity, unit, cleanName } = parseQuantityAndUnit(itemText);
    
    // Categorize the clean name
    const category = categorizeItem(cleanName, language);
    
    // Create parsed item
    const parsedItem: ParsedGroceryItem = {
      name: cleanName,
      quantity,
      unit,
      originalText: itemText
    };
    
    // Group by category
    if (!categorizedItems[category]) {
      categorizedItems[category] = [];
    }
    categorizedItems[category].push(parsedItem);
  }
  
  // Convert to expected format
  return Object.entries(categorizedItems).map(([category, items]) => ({
    category,
    items
  }));
};

// Cache for AI responses to reduce API calls
interface CacheEntry {
  input: string;
  language: string;
  result: CategorizedResponse[];
  timestamp: number;
}

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const cache = new Map<string, CacheEntry>();

export const getCachedCategorization = (input: string, language: string): CategorizedResponse[] | null => {
  const key = `${input.toLowerCase()}-${language}`;
  const entry = cache.get(key);
  
  if (entry && Date.now() - entry.timestamp < CACHE_DURATION) {
    console.log('Using cached categorization for:', input);
    return entry.result;
  }
  
  return null;
};

export const setCachedCategorization = (input: string, language: string, result: CategorizedResponse[]): void => {
  const key = `${input.toLowerCase()}-${language}`;
  cache.set(key, {
    input,
    language,
    result,
    timestamp: Date.now()
  });
  
  // Clean old entries
  for (const [cacheKey, entry] of cache.entries()) {
    if (Date.now() - entry.timestamp > CACHE_DURATION) {
      cache.delete(cacheKey);
    }
  }
};

// Get categorization statistics for analytics
export const getCategorizationStats = () => {
  return {
    cacheSize: cache.size,
    supportedLanguages: Object.keys(categorizationRules),
    totalRules: Object.values(categorizationRules).reduce((sum, rules) => sum + rules.length, 0)
  };
};
