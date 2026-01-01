import { GoogleGenAI, Type } from "@google/genai";
import { categorizeGroceriesLocally, getCachedCategorization, setCachedCategorization } from './localCategorizationService';
import { normalizeCategory, getCategoryPromptList, type Language } from './categoryTranslations';

let ai: GoogleGenAI | null = null;
const receiptFunctionUrl = import.meta.env.VITE_RECEIPT_FUNCTION_URL || '/.netlify/functions/analyze-receipt';
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


const model = "gemini-1.5-flash";

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

const receiptSchema = {
  type: Type.OBJECT,
  properties: {
    storeName: {
      type: Type.STRING,
      description: "The name of the store (e.g., 'Walmart', 'Rami Levy')"
    },
    purchaseDate: {
      type: Type.STRING,
      description: "The date of purchase in YYYY-MM-DD format if found, otherwise today's date"
    },
    currency: {
      type: Type.STRING,
      description: "The currency code (e.g., 'ILS', 'USD', 'EUR')"
    },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: {
            type: Type.STRING,
            description: "The name of the item"
          },
          category: {
            type: Type.STRING,
            description: "Grocery category for the item"
          },
          price: {
            type: Type.NUMBER,
            description: "The price of the item"
          },
          quantity: {
            type: Type.NUMBER,
            description: "The quantity or weight of the item (default to 1)"
          },
          unit: {
            type: Type.STRING,
            description: "The unit (e.g., 'kg', 'g', 'L', 'piece')"
          }
        },
        required: ["name", "category", "price", "quantity"]
      }
    },
    totalAmount: {
      type: Type.NUMBER,
      description: "The total amount paid on the receipt"
    }
  },
  required: ["storeName", "purchaseDate", "currency", "items", "totalAmount"]
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

export interface ReceiptItem {
  name: string;
  category: string;
  price: number;
  quantity: number;
  unit?: string;
}

export interface ReceiptAnalysisResult {
  storeName: string;
  purchaseDate: string;
  currency: string;
  items: ReceiptItem[];
  totalAmount: number;
}

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

  const parsed = JSON.parse(text) as ReceiptAnalysisResult;
  parsed.items = parsed.items.map(item => ({
    ...item,
    category: normalizeCategory(item.category, uiLanguage)
  }));
  return parsed;
};

export const analyzeReceiptImage = async (
  base64Image: string,
  uiLanguage: 'en' | 'he' | 'es'
): Promise<ReceiptAnalysisResult> => {
  const languageNames = { en: 'English', he: 'Hebrew', es: 'Spanish' };
  const languageName = languageNames[uiLanguage];
  const categoryList = getCategoryPromptList(uiLanguage);

  // Extract MIME type from base64 if available, otherwise default to image/jpeg
  let mimeType = "image/jpeg";
  const mimeMatch = base64Image.match(/^data:([^;]+);base64,/);
  if (mimeMatch) {
    mimeType = mimeMatch[1];
  }

  const prompt = `
    You are an expert OCR and grocery receipt analysis engine specialized in Hebrew and multilingual receipts. 
    Your task is to analyze this receipt image and extract structured data accurately.

    INSTRUCTIONS:
    1. **OCR Extraction**: Carefully read all text on the receipt. Handle potential low-quality, blurry, or rotated images.
    2. **Language Awareness**: This receipt is likely from an Israeli supermarket (e.g., Rami Levy, Shufersal, Victory, Yohananof). It contains Hebrew text and currency (₪ / ILS). Preserve Hebrew characters exactly.
    3. **Ambiguity**: If an item name is truncated or contains internal store codes, clean it up to a human-readable name in Hebrew.
    4. **Layout**: Identify columns for item name, quantity, unit price, and total line price.
    5. **Fields**:
       - **storeName**: The supermarket name at the top (e.g., "רמי לוי", "שופרסל").
       - **purchaseDate**: The date of shopping (Format: YYYY-MM-DD). If not clear, use today: ${new Date().toISOString().split('T')[0]}.
       - **currency**: Default to "ILS" for Hebrew receipts unless stated otherwise.
       - **items**: List each product:
         - **name**: Product name in Hebrew (e.g., "חלב 3%", "עגבניות").
         - **category**: Map to exactly ONE from: ${categoryList}.
         - **price**: The final price for that item line.
         - **quantity**: The quantity or weight.
         - **unit**: e.g., "ק״ג", "יחידה", "L".
       - **totalAmount**: The cumulative total at the bottom.

    CRITICAL RULES:
    - Use ONLY the categories provided: ${categoryList}.
    - If you are unsure about an item's category, use the most logical one or 'Other' (translated to ${languageName}).
    - Return ONLY valid JSON adhering to the schema. 
    - No markdown formatting or extra text.
  `;

  try {
    // Prefer serverless function to avoid client-side CORS/quota hiccups
    try {
      return await callServerlessReceiptAnalysis(base64Image, uiLanguage);
    } catch (serverErr: any) {
      console.error('Server receipt analysis failed:', serverErr);
      console.error('Server error message:', serverErr?.message);
      console.error('Server error details:', JSON.stringify(serverErr, null, 2));
      // If server has API key issues, throw immediately instead of falling back
      if (serverErr?.message?.includes('API key')) {
        throw serverErr;
      }
      console.warn('Falling back to client-side Gemini');
    }

    const geminiClient = getAiClient();

    // Try Gemini 2.0 Flash first (faster, newer, better OCR)
    const result = await geminiClient.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64Image.split(',')[1] || base64Image,
                mimeType: mimeType
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: receiptSchema,
      },
    });

    const jsonText = result.text.trim();
    console.log('Gemini receipt analysis response (Pro):', jsonText);

    const parsed = JSON.parse(jsonText) as ReceiptAnalysisResult;

    // Normalize categories to ensure they match our internal list exactly
    parsed.items = parsed.items.map(item => ({
      ...item,
      category: normalizeCategory(item.category, uiLanguage)
    }));

    return parsed;
  } catch (error) {
    console.error("Error analyzing receipt with Gemini Pro:", error);

    // Fallback to 1.5 Pro if 2.0 Flash fails
    try {
      console.log("Attempting fallback to gemini-1.5-pro...");
      const geminiClient = getAiClient();
      const proResult = await geminiClient.models.generateContent({
        model: "gemini-1.5-pro",
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  data: base64Image.split(',')[1] || base64Image,
                  mimeType: mimeType
                }
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: receiptSchema,
        },
      });
      const proJson = proResult.text.trim();
      const parsed = JSON.parse(proJson) as ReceiptAnalysisResult;
      parsed.items = parsed.items.map(item => ({
        ...item,
        category: normalizeCategory(item.category, uiLanguage)
      }));
      return parsed;
    } catch (fallbackError) {
      // Last resort: try 1.5 Flash
      try {
        console.log("Final fallback to gemini-1.5-flash...");
        const geminiClient = getAiClient();
        const flashResult = await geminiClient.models.generateContent({
          model: "gemini-1.5-flash",
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    data: base64Image.split(',')[1] || base64Image,
                    mimeType: mimeType
                  }
                }
              ]
            }
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: receiptSchema,
          },
        });
        const flashJson = flashResult.text.trim();
        const flashParsed = JSON.parse(flashJson) as ReceiptAnalysisResult;
        flashParsed.items = flashParsed.items.map(item => ({
          ...item,
          category: normalizeCategory(item.category, uiLanguage)
        }));
        return flashParsed;
      } catch (finalError) {
        if (error instanceof Error && error.message.includes("SAFETY")) {
          throw new Error("Receipt was flagged by safety filters. Please try a clearer image.");
        }
        const friendlyMessage =
          uiLanguage === 'he'
            ? "ניתוח הקבלה נכשל. ודא שהתמונה חדה, ללא השתקפויות והטקסט כולו נראה. נסה לצלם שוב מקרוב עם תאורה טובה."
            : uiLanguage === 'es'
              ? "El análisis del recibo falló. Asegúrate de que la foto sea nítida, sin reflejos y que todo el texto sea visible."
              : "Receipt analysis failed. Make sure the photo is sharp, without glare, and all text is visible.";
        throw new Error(friendlyMessage);
      }
    }
  }
};
