import type { Handler } from '@netlify/functions';
import { GoogleGenAI, Type } from '@google/genai';
import { normalizeCategory, getCategoryPromptList } from '../../services/categoryTranslations';

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
          unit: { type: Type.STRING },
        },
        required: ['name', 'category', 'price', 'quantity'],
      },
    },
    totalAmount: { type: Type.NUMBER },
  },
  required: ['storeName', 'purchaseDate', 'currency', 'items', 'totalAmount'],
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' };
  }

  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message:
          'Receipt OCR is not configured. Set GEMINI_API_KEY in Netlify environment variables.',
      }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const image: string = body.image;
    const language: 'en' | 'he' | 'es' = body.language || 'he';

    if (!image || typeof image !== 'string') {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Missing image (base64 data URL)' }),
      };
    }

    let mimeType = 'image/jpeg';
    const mimeMatch = image.match(/^data:([^;]+);base64,/);
    const base64Data = mimeMatch ? image.replace(/^data:[^;]+;base64,/, '') : image;
    if (mimeMatch) mimeType = mimeMatch[1];

    const categoryList = getCategoryPromptList(language);
    const today = new Date().toISOString().split('T')[0];

    const prompt = `You are an expert grocery receipt OCR engine for Israeli supermarkets (Hebrew receipts).
Extract every product line with name, category, price, quantity, and unit.
Store name at top. purchaseDate as YYYY-MM-DD (use ${today} if unclear). currency usually ILS.
Categories MUST be exactly one of:
${categoryList}
Return JSON only. Preserve Hebrew item names exactly.`;

    const ai = new GoogleGenAI({ apiKey });
    const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
    let parsed: Record<string, unknown> | null = null;
    let lastError: unknown;

    for (const model of models) {
      try {
        const result = await ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                { inlineData: { data: base64Data, mimeType } },
              ],
            },
          ],
          config: {
            responseMimeType: 'application/json',
            responseSchema: receiptSchema,
          },
        });
        const text = result.text?.trim();
        if (!text) throw new Error('Empty model response');
        parsed = JSON.parse(text);
        break;
      } catch (err) {
        lastError = err;
        console.warn(`Receipt OCR model ${model} failed:`, err);
      }
    }

    if (!parsed) {
      throw lastError || new Error('All OCR models failed');
    }

    const items = Array.isArray(parsed.items) ? parsed.items : [];
    const normalized = {
      storeName: String(parsed.storeName || 'Unknown Store'),
      purchaseDate: String(parsed.purchaseDate || today),
      currency: String(parsed.currency || 'ILS'),
      totalAmount: Number(parsed.totalAmount) || 0,
      items: items.map((raw: Record<string, unknown>) => ({
        name: String(raw.name || '').trim(),
        category: normalizeCategory(String(raw.category || 'Other'), language),
        price: Number(raw.price) || 0,
        quantity: Number(raw.quantity) || 1,
        unit: raw.unit ? String(raw.unit) : undefined,
      })).filter((i: { name: string; price: number }) => i.name && i.price > 0),
    };

    if (normalized.items.length === 0) {
      return {
        statusCode: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'No items could be read from the receipt. Try a clearer photo.',
        }),
      };
    }

    if (!normalized.totalAmount) {
      normalized.totalAmount = normalized.items.reduce(
        (s: number, i: { price: number }) => s + i.price,
        0
      );
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(normalized),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Receipt analysis failed';
    console.error('analyze-receipt error:', error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    };
  }
};
