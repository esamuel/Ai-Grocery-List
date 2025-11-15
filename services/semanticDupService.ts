// Shared semantic duplicate detection across EN/HE/ES
// Centralizes translation equivalences and normalization helpers

export type Lang = 'en' | 'he' | 'es';

type TranslationGroup = {
  labels: Record<Lang, string>;
  synonyms: string[];
};

// Expanded map of common grocery items across English, Hebrew, Spanish
const TRANSLATION_GROUPS: Record<string, TranslationGroup> = {
  milk: {
    labels: { en: 'milk', he: 'חלב', es: 'leche' },
    synonyms: ['milk', 'חלב', 'leche']
  },
  cheese: {
    labels: { en: 'cheese', he: 'גבינה', es: 'queso' },
    synonyms: ['cheese', 'גבינה', 'queso']
  },
  butter: {
    labels: { en: 'butter', he: 'חמאה', es: 'mantequilla' },
    synonyms: ['butter', 'חמאה', 'mantequilla']
  },
  yogurt: {
    labels: { en: 'yogurt', he: 'יוגורט', es: 'yogur' },
    synonyms: ['yogurt', 'יוגורט', 'yogur']
  },
  cream: {
    labels: { en: 'cream', he: 'שמנת', es: 'crema' },
    synonyms: ['cream', 'שמנת', 'crema']
  },
  egg: {
    labels: { en: 'egg', he: 'ביצה', es: 'huevo' },
    synonyms: ['egg', 'eggs', 'ביצה', 'ביצים', 'huevo', 'huevos']
  },
  apple: {
    labels: { en: 'apple', he: 'תפוח', es: 'manzana' },
    synonyms: ['apple', 'apples', 'תפוח', 'תפוחים', 'manzana', 'manzanas']
  },
  banana: {
    labels: { en: 'banana', he: 'בננה', es: 'plátano' },
    synonyms: ['banana', 'bananas', 'בננה', 'בננות', 'plátano', 'plátanos']
  },
  orange: {
    labels: { en: 'orange', he: 'תפוז', es: 'naranja' },
    synonyms: ['orange', 'oranges', 'תפוז', 'תפוזים', 'naranja', 'naranjas']
  },
  lemon: {
    labels: { en: 'lemon', he: 'לימון', es: 'limón' },
    synonyms: ['lemon', 'lemons', 'לימון', 'לימונים', 'limón', 'limones']
  },
  tomato: {
    labels: { en: 'tomato', he: 'עגבניה', es: 'tomate' },
    synonyms: ['tomato', 'tomatoes', 'עגבניה', 'עגבניות', 'tomate', 'tomates']
  },
  onion: {
    labels: { en: 'onion', he: 'בצל', es: 'cebolla' },
    synonyms: ['onion', 'onions', 'בצל', 'בצלים', 'cebolla', 'cebollas']
  },
  carrot: {
    labels: { en: 'carrot', he: 'גזר', es: 'zanahoria' },
    synonyms: ['carrot', 'carrots', 'גזר', 'גזרים', 'zanahoria', 'zanahorias']
  },
  potato: {
    labels: { en: 'potato', he: 'תפוח אדמה', es: 'papa' },
    synonyms: ['potato', 'potatoes', 'תפוח אדמה', 'תפוחי אדמה', 'papa', 'papas']
  },
  garlic: {
    labels: { en: 'garlic', he: 'שום', es: 'ajo' },
    synonyms: ['garlic', 'שום', 'ajo']
  },
  lettuce: {
    labels: { en: 'lettuce', he: 'חסה', es: 'lechuga' },
    synonyms: ['lettuce', 'חסה', 'lechuga']
  },
  chicken: {
    labels: { en: 'chicken', he: 'עוף', es: 'pollo' },
    synonyms: ['chicken', 'עוף', 'pollo']
  },
  beef: {
    labels: { en: 'beef', he: 'בקר', es: 'carne' },
    synonyms: ['beef', 'בקר', 'carne']
  },
  fish: {
    labels: { en: 'fish', he: 'דג', es: 'pescado' },
    synonyms: ['fish', 'דג', 'pescado']
  },
  bread: {
    labels: { en: 'bread', he: 'לחם', es: 'pan' },
    synonyms: ['bread', 'לחם', 'pan']
  },
  rice: {
    labels: { en: 'rice', he: 'אורז', es: 'arroz' },
    synonyms: ['rice', 'אורז', 'arroz']
  },
  pasta: {
    labels: { en: 'pasta', he: 'פסטה', es: 'pasta' },
    synonyms: ['pasta', 'פסטה', 'pasta']
  },
  flour: {
    labels: { en: 'flour', he: 'קמח', es: 'harina' },
    synonyms: ['flour', 'קמח', 'harina']
  },
  water: {
    labels: { en: 'water', he: 'מים', es: 'agua' },
    synonyms: ['water', 'מים', 'agua']
  },
  salt: {
    labels: { en: 'salt', he: 'מלח', es: 'sal' },
    synonyms: ['salt', 'מלח', 'sal']
  },
  sugar: {
    labels: { en: 'sugar', he: 'סוכר', es: 'azúcar' },
    synonyms: ['sugar', 'סוכר', 'azúcar']
  },
  oil: {
    labels: { en: 'oil', he: 'שמן', es: 'aceite' },
    synonyms: ['oil', 'שמן', 'aceite']
  },
  'olive oil': {
    labels: { en: 'olive oil', he: 'שמן זית', es: 'aceite de oliva' },
    synonyms: ['olive oil', 'שמן זית', 'aceite de oliva']
  },
  coffee: {
    labels: { en: 'coffee', he: 'קפה', es: 'café' },
    synonyms: ['coffee', 'קפה', 'café']
  },
  tea: {
    labels: { en: 'tea', he: 'תה', es: 'té' },
    synonyms: ['tea', 'תה', 'té']
  },
  soda: {
    labels: { en: 'soda', he: 'סודה', es: 'refresco' },
    synonyms: ['soda', 'סודה', 'refresco']
  },
};

// Build reverse lookup for O(1) equivalence checks
const TRANSLATION_LOOKUP: Map<string, Set<string>> = new Map();
Object.values(TRANSLATION_GROUPS).forEach((group) => {
  const norm = group.synonyms.map((t) => normalize(t));
  norm.forEach((term) => {
    if (!TRANSLATION_LOOKUP.has(term)) TRANSLATION_LOOKUP.set(term, new Set());
    norm.forEach((t) => TRANSLATION_LOOKUP.get(term)!.add(t));
  });
});

export function getCanonicalName(text: string): string {
  const normalized = normalize(text);
  for (const [key, group] of Object.entries(TRANSLATION_GROUPS)) {
    if (group.synonyms.some((syn) => normalize(syn) === normalized)) {
      return key;
    }
  }
  return normalized;
}

export function getDisplayNameForCanonical(canonical: string, language: Lang): string {
  const group = TRANSLATION_GROUPS[canonical];
  if (!group) {
    return canonical;
  }
  return group.labels[language] || group.labels.en;
}

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
