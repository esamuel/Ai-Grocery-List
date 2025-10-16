# Category Translations Guide

## Overview

The app now uses a **centralized, standardized category translation system** to ensure category names are **consistent across all languages** (English, Hebrew, Spanish). This prevents issues where AI might generate different variations of the same category (e.g., "Dairy" vs "Milk Products").

## How It Works

### 1. **Standardized Category Mappings** (`services/categoryTranslations.ts`)

All category names are defined in ONE place with exact translations:

```typescript
CATEGORY_TRANSLATIONS = {
  'Fruits': { en: 'Fruits', he: 'פירות', es: 'Frutas' },
  'Vegetables': { en: 'Vegetables', he: 'ירקות', es: 'Verduras' },
  'Dairy': { en: 'Dairy', he: 'חלב', es: 'Lácteos' },
  // ... and 10 more categories
}
```

### 2. **AI Receives Exact Category Names**

When making AI requests, the prompt includes the **exact** category names to use:
- ✅ "Use ONLY these categories: פירות, ירקות, בשר..." (for Hebrew)
- ✅ "Use ONLY these categories: Frutas, Verduras, Carne..." (for Spanish)

### 3. **Category Normalization**

Even if the AI returns a variation or synonym, we normalize it:
- "Dairy Products" → "Dairy" → "חלב" (Hebrew)
- "Fruit" → "Fruits" → "Frutas" (Spanish)
- "פרי" (fruit singular) → "פירות" (fruits plural)

This ensures items are always grouped correctly!

## Supported Languages

| Language | Code | Example Categories |
|----------|------|-------------------|
| **English** | `en` | Fruits, Vegetables, Dairy, Meat |
| **Hebrew** | `he` | פירות, ירקות, חלב, בשר |
| **Spanish** | `es` | Frutas, Verduras, Lácteos, Carne |

## Standard Categories (13 Total)

1. **Fruits** / פירות / Frutas
2. **Vegetables** / ירקות / Verduras
3. **Meat** / בשר / Carne
4. **Fish** / דגים / Pescado
5. **Dairy** / חלב / Lácteos
6. **Bread & Bakery** / לחם ומאפים / Pan y Panadería
7. **Grains & Cereals** / דגנים ודגני בוקר / Granos y Cereales
8. **Beverages** / משקאות / Bebidas
9. **Snacks** / חטיפים / Bocadillos
10. **Frozen** / קפואים / Congelados
11. **Household & Cleaning** / בית וניקוי / Hogar y Limpieza
12. **Personal Care** / טיפוח אישי / Cuidado Personal
13. **Other** / מזווה / Otros

## Benefits

### ✅ Consistency
All items categorized as "Dairy" will always show under the same Hebrew category "חלב", never as "מוצרי חלב" or other variations.

### ✅ Better Grouping
Items added at different times will be grouped together correctly, making your grocery list more organized.

### ✅ Reliable Sorting
Categories maintain their order and structure across languages.

### ✅ Fallback Support
If the AI is unavailable, local categorization uses the **same exact** category names.

## Adding New Languages

To add support for a new language (e.g., French):

1. **Update `categoryTranslations.ts`:**
   ```typescript
   export type Language = 'en' | 'he' | 'es' | 'fr';
   
   CATEGORY_TRANSLATIONS = {
     'Fruits': { en: 'Fruits', he: 'פירות', es: 'Frutas', fr: 'Fruits' },
     // ... add 'fr' to all categories
   }
   ```

2. **Update `localCategorizationService.ts`:**
   ```typescript
   const categorizationRules: Record<string, CategoryRule[]> = {
     // ... existing rules
     fr: [
       { keywords: ['pomme', 'banane', ...], category: CATEGORY_TRANSLATIONS['Fruits'].fr, confidence: 0.95 },
       // ... add all categories
     ]
   }
   ```

3. **Update `geminiService.ts`:**
   ```typescript
   const languageMap = { en: 'English', he: 'Hebrew', es: 'Spanish', fr: 'French' };
   ```

4. **Add normalization synonyms** in `categoryTranslations.ts` → `normalizeCategory()` function:
   ```typescript
   const synonyms = {
     // ... existing
     'fruit': 'Fruits',
     'légumes': 'Vegetables',
     // etc.
   }
   ```

## Category Synonym Handling

The normalization function handles common variations:

### English
- "fruit" → "Fruits"
- "veggies" → "Vegetables"
- "dairy products" → "Dairy"
- "cleaning supplies" → "Household & Cleaning"

### Hebrew
- "פרי" → "פירות"
- "ירק" → "ירקות"
- "חלבי" → "חלב"
- "אחר" → "מזווה"

### Spanish
- "fruta" → "Frutas"
- "verdura" → "Verduras"
- "lácteo" → "Lácteos"
- "otro" → "Otros"

## Testing Categories

To test that categories work correctly:

1. **Test in English:**
   - Add "apples, milk, bread"
   - Should create: Fruits, Dairy, Bread & Bakery

2. **Test in Hebrew:**
   - Add "תפוחים, חלב, לחם"
   - Should create: פירות, חלב, לחם ומאפים

3. **Test in Spanish:**
   - Add "manzanas, leche, pan"
   - Should create: Frutas, Lácteos, Pan y Panadería

4. **Test Mixed Items:**
   - Add items from multiple categories
   - Verify they group correctly and don't create duplicate categories

5. **Test Synonyms:**
   - Add "fruit basket" (should → Fruits)
   - Add "cleaning stuff" (should → Household & Cleaning)

## Troubleshooting

### Problem: Items appear in wrong category
**Solution:** Check if the item keyword exists in `localCategorizationService.ts` rules. If not, add it.

### Problem: Category appears in multiple languages
**Solution:** The category normalization might be failing. Check the console logs for "Unknown category" warnings.

### Problem: New category created instead of using standard one
**Solution:** The AI might be ignoring the prompt. The normalization function should catch this, but you can add more synonyms to `categoryTranslations.ts`.

### Problem: Category shows in wrong language
**Solution:** Ensure the correct language is being passed to `normalizeCategory()` function. Check the `uiLanguage` or `responseLanguage` parameters.

## API Functions

### `getCategoryTranslation(category, language)`
Get a specific category name in a specific language.

```typescript
getCategoryTranslation('Fruits', 'he') // Returns: 'פירות'
```

### `normalizeCategory(categoryName, language)`
Normalize any category variation to the standard name.

```typescript
normalizeCategory('fruit', 'en') // Returns: 'Fruits'
normalizeCategory('פרי', 'he') // Returns: 'פירות'
```

### `getCategoryPromptList(language)`
Get formatted category list for AI prompts.

```typescript
getCategoryPromptList('es')
// Returns:
// - Fruits (Frutas)
// - Vegetables (Verduras)
// - Meat (Carne)
// ...
```

### `getAllCategoriesForLanguage(language)`
Get array of all category names in a specific language.

```typescript
getAllCategoriesForLanguage('he')
// Returns: ['פירות', 'ירקות', 'בשר', 'דגים', ...]
```

## Files Modified

1. **`services/categoryTranslations.ts`** (NEW)
   - Central source of truth for all category translations
   - Normalization and helper functions

2. **`services/geminiService.ts`** (UPDATED)
   - Uses standardized category list in prompts
   - Normalizes AI responses to standard categories

3. **`services/localCategorizationService.ts`** (UPDATED)
   - Uses CATEGORY_TRANSLATIONS for consistency
   - Ensures local fallback uses same categories as AI

## Future Enhancements

### Multi-Region Support
Add regional variations (e.g., US English vs UK English):
- "Chips" (US) vs "Crisps" (UK) → Snacks
- "Cilantro" (US) vs "Coriander" (UK) → Vegetables

### Custom Categories
Allow users to create custom categories that persist across languages:
- User creates "Baby Products" → Auto-translate to "מוצרי תינוקות" / "Productos para bebés"

### Category Icons
Add visual icons to each category:
- 🍎 Fruits
- 🥬 Vegetables
- 🥛 Dairy
- 🍖 Meat

### Smart Category Learning
Learn from user behavior:
- If user often moves "tortillas" from "Other" to "Bread & Bakery", remember this

---

**Last Updated:** October 16, 2025
**Compatible with:** AI Grocery List v2.0+

