/**
 * Centralized category translations for all supported languages
 * This ensures AI-generated categories are standardized and consistent
 */

export type StandardCategory =
  | 'Produce' // Fruits & Vegetables combined
  | 'Fruits'
  | 'Vegetables'
  | 'Meat'
  | 'Fish'
  | 'Dairy'
  | 'Bread & Bakery'
  | 'Grains & Cereals'
  | 'Beverages'
  | 'Snacks'
  | 'Frozen'
  | 'Household & Cleaning'
  | 'Personal Care'
  | 'Other';

export type Language = 'en' | 'he' | 'es';

// Standard category translations
export const CATEGORY_TRANSLATIONS: Record<StandardCategory, Record<Language, string>> = {
  'Produce': {
    en: 'Produce',
    he: 'פירות וירקות',
    es: 'Frutas y Verduras'
  },
  'Fruits': {
    en: 'Fruits',
    he: 'פירות וירקות', // Map to combined category in Hebrew
    es: 'Frutas y Verduras'
  },
  'Vegetables': {
    en: 'Vegetables',
    he: 'פירות וירקות', // Map to combined category in Hebrew
    es: 'Frutas y Verduras'
  },
  'Meat': {
    en: 'Meat & Seafood',
    he: 'בשר ודגים',
    es: 'Carnes y Pescados'
  },
  'Fish': {
    en: 'Meat & Seafood',
    he: 'בשר ודגים', // Map to combined category in Hebrew
    es: 'Carnes y Pescados'
  },
  'Dairy': {
    en: 'Dairy & Eggs',
    he: 'חלב וביצים',
    es: 'Lácteos y Huevos'
  },
  'Bread & Bakery': {
    en: 'Pantry',
    he: 'מוצרי מזווה',
    es: 'Despensa'
  },
  'Grains & Cereals': {
    en: 'Breakfast & Snacks',
    he: 'דגני בוקר וחטיפים',
    es: 'Desayuno y Bocadillos'
  },
  'Beverages': {
    en: 'Beverages',
    he: 'משקאות',
    es: 'Bebidas'
  },
  'Snacks': {
    en: 'Breakfast & Snacks',
    he: 'דגני בוקר וחטיפים',
    es: 'Desayuno y Bocadillos'
  },
  'Frozen': {
    en: 'Frozen',
    he: 'קפואים',
    es: 'Congelados'
  },
  'Household & Cleaning': {
    en: 'Household & Cleaning',
    he: 'בית וניקוי',
    es: 'Limpieza del Hogar'
  },
  'Personal Care': {
    en: 'Personal Care',
    he: 'טיפוח אישי',
    es: 'Cuidado Personal'
  },
  'Other': {
    en: 'Pantry',
    he: 'מוצרי מזווה',
    es: 'Despensa'
  }
};

/**
 * Get a translated category name for a given language
 */
export const getCategoryTranslation = (category: StandardCategory, language: Language): string => {
  return CATEGORY_TRANSLATIONS[category][language];
};

/**
 * Get all category translations for a specific language
 * Useful for prompts and documentation
 */
export const getAllCategoriesForLanguage = (language: Language): string[] => {
  return Object.keys(CATEGORY_TRANSLATIONS).map(cat => 
    CATEGORY_TRANSLATIONS[cat as StandardCategory][language]
  );
};

/**
 * Normalize a category name from AI response to standard category
 * Handles variations, misspellings, and language differences
 */
export const normalizeCategory = (categoryName: string, language: Language): string => {
  if (!categoryName) return CATEGORY_TRANSLATIONS['Other'][language];
  
  const normalized = categoryName.toLowerCase().trim();
  
  // Create reverse mapping for quick lookup
  const categoryMap: Record<string, StandardCategory> = {};
  
  // Add all translations for all languages to the map
  Object.entries(CATEGORY_TRANSLATIONS).forEach(([stdCat, translations]) => {
    const key = stdCat as StandardCategory;
    categoryMap[translations.en.toLowerCase()] = key;
    categoryMap[translations.he.toLowerCase()] = key;
    categoryMap[translations.es.toLowerCase()] = key;
  });
  
  // Add common variations and synonyms
  const synonyms: Record<string, StandardCategory> = {
    // English variations
    'fruit': 'Fruits',
    'vegetable': 'Vegetables',
    'veggies': 'Vegetables',
    'produce': 'Fruits', // Often used for both
    'meat & poultry': 'Meat',
    'poultry': 'Meat',
    'seafood': 'Fish',
    'dairy & eggs': 'Dairy',
    'dairy products': 'Dairy',
    'eggs': 'Dairy',
    'bakery': 'Bread & Bakery',
    'breads': 'Bread & Bakery',
    'grains': 'Grains & Cereals',
    'cereals': 'Grains & Cereals',
    'pasta': 'Grains & Cereals',
    'drinks': 'Beverages',
    'beverages & drinks': 'Beverages',
    'snack': 'Snacks',
    'frozen foods': 'Frozen',
    'frozen items': 'Frozen',
    'cleaning': 'Household & Cleaning',
    'household': 'Household & Cleaning',
    'cleaning supplies': 'Household & Cleaning',
    'personal hygiene': 'Personal Care',
    'hygiene': 'Personal Care',
    'toiletries': 'Personal Care',
    'other': 'Other',
    'miscellaneous': 'Other',
    'misc': 'Other',
    
    // Hebrew variations
    'פרי': 'Produce',
    'ירק': 'Produce',
    'פירות וירקות': 'Produce', // Combined category from starter items
    'פירות טריים': 'Produce',
    'ירקות טריים': 'Produce',
    'פירות': 'Produce',
    'ירקות': 'Produce',
    'בשרים': 'Meat',
    'דג': 'Fish',
    'חלבי': 'Dairy',
    'מוצרי חלב': 'Dairy',
    'חלב וביצים': 'Dairy',
    'לחמים': 'Bread & Bakery',
    'מאפים': 'Bread & Bakery',
    'דגן': 'Grains & Cereals',
    'משקה': 'Beverages',
    'חטיף': 'Snacks',
    'קפוא': 'Frozen',
    'ניקיון': 'Household & Cleaning',
    'טיפוח': 'Personal Care',
    'אחר': 'Other',
    'בשר ודגים': 'Meat',
    'מוצרי מזווה': 'Other',
    
    // Spanish variations
    'fruta': 'Fruits',
    'verdura': 'Vegetables',
    'vegetales': 'Vegetables',
    'carnes': 'Meat',
    'pescados': 'Fish',
    'mariscos': 'Fish',
    'lácteo': 'Dairy',
    'lacteos': 'Dairy',
    'productos lácteos': 'Dairy',
    'panadería': 'Bread & Bakery',
    'pan': 'Bread & Bakery',
    'granos': 'Grains & Cereals',
    'cereales': 'Grains & Cereals',
    'bebida': 'Beverages',
    'bocadillo': 'Snacks',
    'congelado': 'Frozen',
    'limpieza': 'Household & Cleaning',
    'hogar': 'Household & Cleaning',
    'cuidado': 'Personal Care',
    'higiene': 'Personal Care',
    'otro': 'Other',
    'otros': 'Other'
  };
  
  // Try exact match first
  if (categoryMap[normalized]) {
    return CATEGORY_TRANSLATIONS[categoryMap[normalized]][language];
  }
  
  // Try synonyms
  if (synonyms[normalized]) {
    return CATEGORY_TRANSLATIONS[synonyms[normalized]][language];
  }
  
  // Try partial match (contains)
  for (const [key, stdCat] of Object.entries(categoryMap)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return CATEGORY_TRANSLATIONS[stdCat][language];
    }
  }
  
  // Fallback to "Other" category
  console.warn(`Unknown category "${categoryName}" - defaulting to Other`);
  return CATEGORY_TRANSLATIONS['Other'][language];
};

/**
 * Format categories list for AI prompts with exact translations
 */
export const getCategoryPromptList = (language: Language): string => {
  const categories = Object.keys(CATEGORY_TRANSLATIONS) as StandardCategory[];
  return categories.map(cat => 
    `- ${cat} (${CATEGORY_TRANSLATIONS[cat][language]})`
  ).join('\n      ');
};

/**
 * Get category examples for AI prompts
 */
export const getCategoryExamples = (language: Language): string => {
  const examples: Record<Language, string[]> = {
    en: [
      'Fruits → apples, bananas, oranges',
      'Vegetables → tomatoes, lettuce, carrots',
      'Dairy → milk, cheese, yogurt',
      'Meat → chicken, beef, pork'
    ],
    he: [
      'פירות → תפוחים, בננות, תפוזים',
      'ירקות → עגבניות, חסה, גזר',
      'חלב → חלב, גבינה, יוגורט',
      'בשר → עוף, בקר, חזיר'
    ],
    es: [
      'Frutas → manzanas, plátanos, naranjas',
      'Verduras → tomates, lechuga, zanahorias',
      'Lácteos → leche, queso, yogur',
      'Carne → pollo, res, cerdo'
    ]
  };
  
  return examples[language].join('\n      ');
};

