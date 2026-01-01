import type { Handler } from '@netlify/functions';
import { GoogleGenAI, Type } from '@google/genai';
import { getCategoryPromptList, normalizeCategory, type Language } from '../../services/categoryTranslations';

interface ReceiptItem {
  name: string;
  category: string;
  price: number;
  quantity: number;
  unit?: string;
}

interface ReceiptAnalysisResult {
  storeName: string;
  purchaseDate: string;
  currency: string;
  items: ReceiptItem[];
  totalAmount: number;
}

const receiptSchema = {
  type: Type.OBJECT,
  properties: {
    storeName: { type: Type.STRING },
    purchaseDate: { type: Type.STRING },
    currency: { type: Type.STRING },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          category: { type: Type.STRING },
          price: { type: Type.NUMBER },
          quantity: { type: Type.NUMBER },
          unit: { type: Type.STRING }
        },
        required: ['name', 'category', 'price', 'quantity']
      }
    },
    totalAmount: { type: Type.NUMBER }
  },
  required: ['storeName', 'purchaseDate', 'currency', 'items', 'totalAmount']
};

let ai: GoogleGenAI | null = null;
const getAiClient = () => {
  if (ai) return ai;
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key missing on server');
  }
  ai = new GoogleGenAI({ apiKey });
  return ai;
};

const buildPrompt = (uiLanguage: Language) => {
  const languageNames = { en: 'English', he: 'Hebrew', es: 'Spanish' };
  const languageName = languageNames[uiLanguage] || 'English';
  const categoryList = getCategoryPromptList(uiLanguage);
  const today = new Date().toISOString().split('T')[0];

  return `
    You are an expert OCR and grocery receipt analysis engine specialized in Hebrew and multilingual receipts. 
    Your task is to analyze this receipt image and extract structured data accurately.

    INSTRUCTIONS:
    1. OCR Extraction: Carefully read all text on the receipt. Handle low-quality, blurry, or rotated images.
    2. Language Awareness: The receipt may be from an Israeli supermarket (Rami Levy, Shufersal, Victory, Yohananof). Preserve Hebrew characters exactly.
    3. Ambiguity: If an item name is truncated or contains store codes, clean it up to a human-readable name in ${languageName}.
    4. Layout: Identify columns for item name, quantity, unit price, and total line price.
    5. Fields:
       - storeName: The supermarket name at the top.
       - purchaseDate: The date of shopping (Format: YYYY-MM-DD). If not clear, use today's date ${today}.
       - currency: Default to "ILS" for Hebrew receipts unless stated otherwise.
       - items: List each product:
         - name: Product name in ${languageName}.
         - category: Map to exactly ONE from: ${categoryList}.
         - price: The final price for that item line.
         - quantity: The quantity or weight.
         - unit: e.g., "ק״ג", "יחידה", "L".
       - totalAmount: The cumulative total at the bottom.

    CRITICAL RULES:
    - Use ONLY the categories provided: ${categoryList}.
    - If unsure about an item's category, use the most logical one or 'Other' (translated to ${languageName}).
    - Return ONLY valid JSON adhering to the schema. 
    - No markdown formatting or extra text.
  `;
};

const parseBase64 = (image: string) => {
  const mimeMatch = image.match(/^data:([^;]+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const data = image.includes(',') ? image.split(',')[1] : image;
  const byteSize = Math.ceil((data.length * 3) / 4);
  return { mimeType, data, byteSize };
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { image, language }: { image?: string; language?: Language } = JSON.parse(event.body || '{}');
    if (!image || !language) {
      return { statusCode: 400, body: 'Missing image or language' };
    }

    const { mimeType, data, byteSize } = parseBase64(image);
    if (byteSize > 4_500_000) {
      return {
        statusCode: 413,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Image too large for analysis. Please retake closer or under 4MB.'
        })
      };
    }

    const client = getAiClient();
    const prompt = buildPrompt(language);

    const runModel = async (model: string) => {
      const response = await client.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  data,
                  mimeType
                }
              }
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: receiptSchema
        }
      });
      return response.text.trim();
    };

    let jsonText: string;
    try {
      jsonText = await runModel('gemini-1.5-pro');
    } catch (err) {
      console.warn('Pro model failed, retrying with flash', err);
      jsonText = await runModel('gemini-1.5-flash');
    }

    const parsed = JSON.parse(jsonText) as ReceiptAnalysisResult;
    parsed.items = parsed.items.map((item) => ({
      ...item,
      category: normalizeCategory(item.category, language)
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed)
    };
  } catch (error: any) {
    console.error('Server receipt analysis failed:', error);
    const message = error?.message || 'Receipt analysis failed on server';
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    };
  }
};

