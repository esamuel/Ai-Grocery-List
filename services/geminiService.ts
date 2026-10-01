import { categorizeGroceriesLocally, getCachedCategorization, setCachedCategorization } from './localCategorizationService';
import { normalizeCategory } from './categoryTranslations';
import { detectInputLanguage } from './detectInputLanguage';

// All Gemini calls go through Netlify Functions so the API key never ships in the browser bundle.
const receiptFunctionUrl = import.meta.env.VITE_RECEIPT_FUNCTION_URL || '/.netlify/functions/analyze-receipt';
const aiFunctionUrl = import.meta.env.VITE_AI_FUNCTION_URL || '/.netlify/functions/gemini-categorize';

const callGroceryAiFunction = async (payload: {
  mode: 'categorize' | 'translate';
  text: string;
  existingItems: string[];
  language?: 'en' | 'he' | 'es';
}): Promise<string> => {
  const response = await fetch(aiFunctionUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const raw = await response.text();
  if (!response.ok) {
    let message = raw;
    try {
      message = JSON.parse(raw)?.message || raw;
    } catch {
      // keep raw text
    }
    throw new Error(message || `AI function failed (${response.status})`);
  }

  const { text } = JSON.parse(raw) as { text?: string };
  if (!text) throw new Error('AI function returned no text');
  return text;
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

export const categorizeGroceries = async (newItemText: string, existingItems: string[], uiLanguage: 'en' | 'he' | 'es'): Promise<CategorizedResponse[]> => {
  // Check cache first
  const cachedResult = getCachedCategorization(newItemText, uiLanguage);
  if (cachedResult) {
    return cachedResult;
  }

  // Detect the actual language of the input text
  const inputLanguage = detectInputLanguage(newItemText);

  // The function detects the language itself; we only need it here to normalize categories.
  const responseLanguage = inputLanguage;

  try {
    const jsonText = (await callGroceryAiFunction({
      mode: 'categorize',
      text: newItemText,
      existingItems,
    })).trim();
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
  try {
    const result = await callGroceryAiFunction({
      mode: 'translate',
      text: newItemText,
      existingItems,
      language: targetLanguage,
    });
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

export type { ReceiptItem, ReceiptAnalysisResult } from './receiptOcrShared';
import type { ReceiptAnalysisResult } from './receiptOcrShared';

const callServerlessReceiptAnalysis = async (
  base64Image: string,
  uiLanguage: 'en' | 'he' | 'es'
): Promise<ReceiptAnalysisResult> => {
  if (typeof fetch === 'undefined') {
    throw new Error('fetch not available');
  }

  console.log('Calling serverless receipt function:', receiptFunctionUrl);
  
  const response = await fetch(receiptFunctionUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64Image, language: uiLanguage })
  });

  const text = await response.text();
  console.log('Server response status:', response.status);
  console.log('Server response text:', text);
  
  if (!response.ok) {
    let serverMessage = text;
    try {
      const parsed = JSON.parse(text);
      serverMessage = parsed?.message || text;
      console.error('Server error parsed:', parsed);
    } catch {
      console.error('Could not parse server error, raw text:', text);
    }
    throw new Error(serverMessage || 'Receipt analysis failed on server');
  }

  return JSON.parse(text) as ReceiptAnalysisResult;
};

export const analyzeReceiptImage = async (
  base64Image: string,
  uiLanguage: 'en' | 'he' | 'es'
): Promise<ReceiptAnalysisResult> => {
  try {
    return await callServerlessReceiptAnalysis(base64Image, uiLanguage);
  } catch (serverErr: unknown) {
    const msg = serverErr instanceof Error ? serverErr.message : String(serverErr);
    console.error('Receipt OCR failed:', msg);
    if (msg.includes('API key') || msg.includes('not configured')) {
      throw serverErr instanceof Error ? serverErr : new Error(msg);
    }
    const friendlyMessage =
      uiLanguage === 'he'
        ? 'ניתוח הקבלה נכשל. צלם מקרוב, תאורה טובה, הקבלה שטוחה וללא השתקפות — ונסה שוב.'
        : uiLanguage === 'es'
          ? 'No se pudo leer el ticket. Foto nítida, sin reflejos, todo el texto visible.'
          : 'Receipt analysis failed. Use a sharp, close photo with good light and no glare.';
    throw new Error(friendlyMessage);
  }
};
