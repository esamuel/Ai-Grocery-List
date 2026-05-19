import type { Handler } from '@netlify/functions';
import { GoogleGenAI } from '@google/genai';
import { getCategoryPromptList } from '../../services/categoryTranslations';
import {
  RECEIPT_OCR_MODELS,
  buildReceiptOcrPrompt,
  extractJsonFromModelText,
  normalizeReceiptPayload,
} from '../../services/receiptOcrShared';

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

    const today = new Date().toISOString().split('T')[0];
    const categoryList = getCategoryPromptList(language);
    const prompt = buildReceiptOcrPrompt(language, categoryList, today);

    const ai = new GoogleGenAI({ apiKey });
    let normalized: ReturnType<typeof normalizeReceiptPayload> | null = null;
    const errors: string[] = [];

    for (const model of RECEIPT_OCR_MODELS) {
      try {
        console.log(`Receipt OCR trying model: ${model}`);
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
            temperature: 0.1,
          },
        });

        const text = result.text?.trim();
        if (!text) throw new Error('Empty response');
        const parsed = extractJsonFromModelText(text);
        const candidate = normalizeReceiptPayload(parsed, language, today);
        if (candidate.items.length === 0) {
          throw new Error('No line items parsed');
        }
        normalized = candidate;
        console.log(`Receipt OCR success with ${model}: ${candidate.items.length} items`);
        break;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${model}: ${msg}`);
        console.warn(`Receipt OCR ${model} failed:`, msg);
      }
    }

    if (!normalized) {
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message:
            language === 'he'
              ? 'לא הצלחנו לקרוא את הקבלה. נסה תמונה חדה יותר או צילום מקרוב.'
              : 'Could not read receipt. Try a sharper, closer photo.',
          details: errors.slice(0, 3),
        }),
      };
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
