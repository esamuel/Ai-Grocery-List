// Shared semantic duplicate detection across EN/HE/ES
// Centralizes translation equivalences and normalization helpers

export type Lang = 'en' | 'he' | 'es';

// Expanded map of common grocery items across English, Hebrew, Spanish
const COMMON_TRANSLATIONS: Record<string, string[]> = {
  // Dairy
  milk: ['milk', 'חלב', 'leche'],
  cheese: ['cheese', 'גבינה', 'queso'],
  butter: ['butter', 'חמאה', 'mantequilla'],
  yogurt: ['yogurt', 'יוגורט', 'yogur'],
  cream: ['cream', 'שמנת', 'crema'],
  eggs: ['eggs', 'ביצים', 'huevos'],
  egg: ['egg', 'ביצה', 'huevo'],

  // Fruits
  apple: ['apple', 'תפוח', 'manzana'],
  apples: ['apples', 'תפוחים', 'manzanas'],
  banana: ['banana', 'בננה', 'plátano'],
  bananas: ['bananas', 'בננות', 'plátanos'],
  orange: ['orange', 'תפוז', 'naranja'],
  oranges: ['oranges', 'תפוזים', 'naranjas'],
  lemon: ['lemon', 'לימון', 'limón'],
  lemons: ['lemons', 'לימונים', 'limones'],

  // Vegetables
  tomato: ['tomato', 'עגבניה', 'tomate'],
  tomatoes: ['tomatoes', 'עגבניות', 'tomates'],
  onion: ['onion', 'בצל', 'cebolla'],
  onions: ['onions', 'בצלים', 'cebollas'],
  carrot: ['carrot', 'גזר', 'zanahoria'],
  carrots: ['carrots', 'גזרים', 'zanahorias'],
  potato: ['potato', 'תפוח אדמה', 'papa'],
  potatoes: ['potatoes', 'תפוחי אדמה', 'papas'],
  garlic: ['garlic', 'שום', 'ajo'],
  lettuce: ['lettuce', 'חסה', 'lechuga'],

  // Meat & Fish
  chicken: ['chicken', 'עוף', 'pollo'],
  beef: ['beef', 'בקר', 'carne'],
  fish: ['fish', 'דג', 'pescado'],

  // Bread & Grains
  bread: ['bread', 'לחם', 'pan'],
  rice: ['rice', 'אורז', 'arroz'],
  pasta: ['pasta', 'פסטה', 'pasta'],
  flour: ['flour', 'קמח', 'harina'],

  // Pantry / Other
  water: ['water', 'מים', 'agua'],
  salt: ['salt', 'מלח', 'sal'],
  sugar: ['sugar', 'סוכר', 'azúcar'],
  oil: ['oil', 'שמן', 'aceite'],
  'olive oil': ['olive oil', 'שמן זית', 'aceite de oliva'],
  coffee: ['coffee', 'קפה', 'café'],
  tea: ['tea', 'תה', 'té'],
  soda: ['soda', 'סודה', 'refresco'],
};

// Build reverse lookup for O(1) equivalence checks
const TRANSLATION_LOOKUP: Map<string, Set<string>> = new Map();
Object.values(COMMON_TRANSLATIONS).forEach((group) => {
  const norm = group.map((t) => normalize(t));
  norm.forEach((term) => {
    if (!TRANSLATION_LOOKUP.has(term)) TRANSLATION_LOOKUP.set(term, new Set());
    norm.forEach((t) => TRANSLATION_LOOKUP.get(term)!.add(t));
  });
});

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // remove bidi marks
    .replace(/[\u200e\u200f]/g, '')
    // remove repeated spaces
    .replace(/\s+/g, ' ');
}

export function isSemanticDuplicate(candidateName: string, existingNames: string[]): boolean {
  const n = normalize(candidateName);
  // exact
  if (existingNames.some((e) => normalize(e) === n)) return true;
  // cross-language group
  const group = TRANSLATION_LOOKUP.get(n);
  if (!group) return false;
  return existingNames.some((e) => group.has(normalize(e)));
}
