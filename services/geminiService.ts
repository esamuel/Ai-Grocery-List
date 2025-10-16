import { GoogleGenAI, Type } from "@google/genai";
import { categorizeGroceriesLocally, getCachedCategorization, setCachedCategorization } from './localCategorizationService';
import { normalizeCategory, getCategoryPromptList, type Language } from './categoryTranslations';

let ai: GoogleGenAI | null = null;
// Lazily initialize the AI client on first use to prevent app crash on load.
const getAiClient = (): GoogleGenAI => {
  if (ai) {
    return ai;
  }
  
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("Gemini API key not found. AI features will be disabled.");
    throw new Error("Gemini API key not found. Please set VITE_GEMINI_API_KEY in your environment variables.");
  }
  
  ai = new GoogleGenAI({ apiKey });
  return ai;
};


const model = "gemini-2.5-flash";

const schema = {
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
          required: ["name", "quantity", "originalText"]
        },
        description: "A list of parsed grocery items with quantity and unit information."
      }
    },
    required: ["category", "items"]
  }
};


export interface ParsedGroceryItem {
    name: string;
    quantity: number;
    unit?: string;
    originalText: string;
}

export interface CategorizedResponse {
    category: string;
    items: ParsedGroceryItem[];
}

// Function to detect the language of input text
const detectInputLanguage = (text: string): 'en' | 'he' | 'es' => {
    // Hebrew Unicode range
    if (/[\u0590-\u05FF]/.test(text)) return 'he';
    // Spanish specific characters
    if (/[ñáéíóúüÑÁÉÍÓÚÜ¿¡]/.test(text)) return 'es';
    // Default to English
    return 'en';
};

export const categorizeGroceries = async (newItemText: string, existingItems: string[], uiLanguage: 'en' | 'he' | 'es'): Promise<CategorizedResponse[]> => {
    // Check cache first
    const cachedResult = getCachedCategorization(newItemText, uiLanguage);
    if (cachedResult) {
      return cachedResult;
    }

    // Detect the actual language of the input text
    const inputLanguage = detectInputLanguage(newItemText);
    
    const languageMap = {
      en: 'English',
      he: 'Hebrew',
      es: 'Spanish'
    };
    
    // Use the detected input language for the response, not the UI language
    const responseLanguage = inputLanguage;
    const languageName = languageMap[responseLanguage];

    const categoryList = getCategoryPromptList(responseLanguage);
    
    const prompt = `
      You are an expert grocery list assistant. Your task is to parse and categorize new grocery items with quantity and unit information.
      
      IMPORTANT: The user input is in ${languageName}. You MUST preserve the original language and script of the items exactly as provided. Do NOT translate the item names.
      
      Analyze the new item(s): "${newItemText}".
      Here are the items already on the list: ${existingItems.length > 0 ? existingItems.join(', ') : 'The list is currently empty'}.

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

  try {
    const geminiClient = getAiClient();
    const response = await geminiClient.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const jsonText = response.text.trim();
    console.log('Gemini categorization response:', jsonText);
    
    let parsedResponse: CategorizedResponse[];
    
    try {
      const parsed = JSON.parse(jsonText);
      
      // Handle both array format and object format
      if (Array.isArray(parsed)) {
        parsedResponse = parsed as CategorizedResponse[];
      } else if (parsed.categories && Array.isArray(parsed.categories)) {
        parsedResponse = parsed.categories as CategorizedResponse[];
      } else {
        throw new Error("AI returned unexpected format");
      }
      
      // Normalize category names to ensure consistency
      parsedResponse = parsedResponse.map(item => ({
        ...item,
        category: normalizeCategory(item.category, responseLanguage)
      }));
      
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      throw new Error("AI returned invalid JSON");
    }
    
    // Cache successful result
    setCachedCategorization(newItemText, uiLanguage, parsedResponse);
    
    return parsedResponse;
  } catch (error) {
    console.error("Error calling Gemini API, falling back to local categorization:", error);
    
    // Use local categorization as fallback
    try {
      const localResult = categorizeGroceriesLocally(newItemText, existingItems, responseLanguage);
      console.log("Successfully used local categorization fallback");
      
      // Cache the local result too
      setCachedCategorization(newItemText, uiLanguage, localResult);
      
      return localResult;
    } catch (localError) {
      console.error("Local categorization also failed:", localError);
      
      // Last resort: return uncategorized items
      const fallbackResult: CategorizedResponse[] = [{
        category: responseLanguage === 'he' ? 'מזווה' : responseLanguage === 'es' ? 'Otros' : 'Other',
        items: newItemText.split(/[,;]/).map(item => ({
          name: item.trim(),
          quantity: 1,
          originalText: item.trim()
        }))
      }];
      
      return fallbackResult;
    }
  }
};

// Specialized function for importing items that need translation
export const categorizeAndTranslateImportedItems = async (
  newItemText: string,
  existingItems: string[],
  targetLanguage: 'en' | 'he' | 'es'
): Promise<CategorizedResponse[]> => {
  const languageNames = { en: 'English', he: 'Hebrew', es: 'Spanish' };
  const languageName = languageNames[targetLanguage];
  const categoryList = getCategoryPromptList(targetLanguage);
  
  const prompt = `
      You are an expert grocery list assistant. Your task is to parse, categorize, and translate imported grocery items.
      
      IMPORTANT: The user wants their grocery list in ${languageName}. You MUST translate all item names to ${languageName}.
      
      Analyze and translate these imported items: "${newItemText}".
      Here are the items already on the list: ${existingItems.length > 0 ? existingItems.join(', ') : 'The list is currently empty'}.

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

  try {
    const geminiClient = getAiClient();
    const response = await geminiClient.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const result = response.text;
    console.log('Gemini translation response:', result);
    
    let parsedResponse: CategorizedResponse[];
    
    try {
      const parsed = JSON.parse(result);
      
      // Handle both array format and object format
      if (Array.isArray(parsed)) {
        parsedResponse = parsed as CategorizedResponse[];
      } else if (parsed.categories && Array.isArray(parsed.categories)) {
        parsedResponse = parsed.categories as CategorizedResponse[];
      } else {
        throw new Error("AI returned unexpected format");
      }
      
      // Normalize category names to ensure consistency
      parsedResponse = parsedResponse.map(item => ({
        ...item,
        category: normalizeCategory(item.category, targetLanguage)
      }));
      
    } catch (parseError) {
      console.error("Failed to parse AI translation response:", parseError);
      throw new Error("AI returned invalid JSON for translation");
    }
    
    // Cache the result
    setCachedCategorization(newItemText, targetLanguage, parsedResponse);
    
    return parsedResponse;
  } catch (error) {
    console.error("Gemini translation failed:", error);
    
    // Fallback to local categorization (without translation for now)
    try {
      const localResult = await categorizeGroceriesLocally(newItemText, existingItems, targetLanguage);
      
      // Cache the local result too
      setCachedCategorization(newItemText, targetLanguage, localResult);
      
      return localResult;
    } catch (localError) {
      console.error("Local translation also failed:", localError);
      
      // Last resort: return items in original language with translated categories
      const responseLanguage = targetLanguage === 'he' ? 'he' : targetLanguage === 'es' ? 'es' : 'en';
      const fallbackResult: CategorizedResponse[] = [{
        category: responseLanguage === 'he' ? 'מזווה' : responseLanguage === 'es' ? 'Otros' : 'Other',
        items: newItemText.split(/[,;]/).map(item => ({
          name: item.trim(),
          quantity: 1,
          originalText: item.trim()
        }))
      }];
      
      return fallbackResult;
    }
  }
};
