import { Type } from '@google/genai';
import { getCategoryPromptList } from './categoryTranslations';
export { detectInputLanguage } from './detectInputLanguage';

export type AiLanguage = 'en' | 'he' | 'es';

export const GROCERY_AI_MODEL = 'gemini-1.5-flash';

export const groceryResponseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      category: {
        type: Type.STRING,
        description: "A detailed category for grocery items, e.g., 'Fresh Produce', 'Dairy & Eggs', 'Pantry Staples'."
      },
      items: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: "The clean item name without quantity or unit (e.g., 'milk', 'tomatoes')"
            },
            quantity: {
              type: Type.NUMBER,
              description: "The numeric quantity if specified (e.g., 2 from '2× milk'). Use 1 if no quantity specified."
            },
            unit: {
              type: Type.STRING,
              description: "The unit if specified (e.g., 'L', 'kg', 'pieces', 'bottles'). Leave empty if no unit."
            },
            originalText: {
              type: Type.STRING,
              description: "The original text as provided by user (e.g., '2× milk 1L')"
            }
          },
          required: ['name', 'quantity', 'originalText']
        },
        description: 'A list of parsed grocery items with quantity and unit information.'
      }
    },
    required: ['category', 'items']
  }
};

const languageNames: Record<AiLanguage, string> = {
  en: 'English',
  he: 'Hebrew',
  es: 'Spanish'
};

const describeExistingItems = (existingItems: string[]): string =>
  existingItems.length > 0 ? existingItems.join(', ') : 'The list is currently empty';

export const buildCategorizePrompt = (
  newItemText: string,
  existingItems: string[],
  responseLanguage: AiLanguage
): string => {
  const languageName = languageNames[responseLanguage];
  const categoryList = getCategoryPromptList(responseLanguage);

  return `
      You are an expert grocery list assistant. Your task is to parse and categorize new grocery items with quantity and unit information.

      IMPORTANT: The user input is in ${languageName}. You MUST preserve the original language and script of the items exactly as provided. Do NOT translate the item names.

      Analyze the new item(s): "${newItemText}".
      Here are the items already on the list: ${describeExistingItems(existingItems)}.

      For each item, extract:
      1. **name**: Clean item name without quantity/unit (e.g., "milk" from "2× milk 1L")
      2. **quantity**: Numeric quantity (e.g., 2 from "2× milk", 1 if not specified)
      3. **unit**: Unit if specified (e.g., "L", "kg", "pieces", "bottles") - leave empty if none
      4. **originalText**: Exact original text as provided

      Quantity parsing examples:
      - "2× milk 1L" → name: "milk", quantity: 2, unit: "L", originalText: "2× milk 1L"
      - "3 tomatoes" → name: "tomatoes", quantity: 3, unit: "pieces", originalText: "3 tomatoes"
      - "bread" → name: "bread", quantity: 1, unit: "", originalText: "bread"
      - "2 חלב 1 ליטר" → name: "חלב", quantity: 2, unit: "ליטר", originalText: "2 חלב 1 ליטר"

      Please categorize ONLY the new item(s) into detailed and specific grocery categories:
      - Keep the item names in their ORIGINAL language (${languageName})
      - Use ONLY the ${languageName} category names provided below
      - Do NOT translate or modify the actual grocery item names

      Use ONLY these category names (in ${languageName}):
      ${categoryList}

      CRITICAL: You must use the EXACT category names listed above, in ${languageName}. Do not create new categories or use variations.

      Return the result as a JSON object that adheres to the provided schema. Do not include existing items in your response.
    `;
};

export const buildTranslatePrompt = (
  newItemText: string,
  existingItems: string[],
  targetLanguage: AiLanguage
): string => {
  const languageName = languageNames[targetLanguage];
  const categoryList = getCategoryPromptList(targetLanguage);

  return `
      You are an expert grocery list assistant. Your task is to parse, categorize, and translate imported grocery items.

      IMPORTANT: The user wants their grocery list in ${languageName}. You MUST translate all item names to ${languageName}.

      Analyze and translate these imported items: "${newItemText}".
      Here are the items already on the list: ${describeExistingItems(existingItems)}.

      For each item:
      1. **Translate the item name to ${languageName}**
      2. **name**: Translated item name (e.g., "milk" → "חלב" for Hebrew, "leche" for Spanish)
      3. **quantity**: Numeric quantity (default 1 if not specified)
      4. **unit**: Unit if specified, translated to ${languageName}
      5. **originalText**: Keep the original imported text

      Translation examples:
      - English "milk" → Hebrew "חלב", Spanish "leche"
      - English "bread" → Hebrew "לחם", Spanish "pan"
      - English "apples" → Hebrew "תפוחים", Spanish "manzanas"

      Use ONLY these category names (in ${languageName}):
      ${categoryList}

      CRITICAL: You must use the EXACT category names listed above, in ${languageName}. Do not create new categories or use variations.

      Return the result as a JSON object that adheres to the provided schema.
    `;
};
