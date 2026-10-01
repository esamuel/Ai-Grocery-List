import type { Handler } from '@netlify/functions';
import { GoogleGenAI } from '@google/genai';
import {
  GROCERY_AI_MODEL,
  buildCategorizePrompt,
  buildTranslatePrompt,
  detectInputLanguage,
  groceryResponseSchema,
  type AiLanguage,
} from '../../services/groceryAiShared';

// Same-origin only: the site calls this on its own domain, so no CORS headers are sent.
const jsonHeaders = { 'Content-Type': 'application/json' };

// Hard limits so this endpoint can't be used as a free general-purpose Gemini proxy.
const MAX_TEXT_LENGTH = 2000;
const MAX_EXISTING_ITEMS = 300;
const MAX_EXISTING_ITEM_LENGTH = 100;

const respond = (statusCode: number, payload: unknown) => ({
  statusCode,
  headers: jsonHeaders,
  body: JSON.stringify(payload),
});

const isLanguage = (value: unknown): value is AiLanguage =>
  value === 'en' || value === 'he' || value === 'es';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return respond(500, {
      message: 'AI is not configured. Set GEMINI_API_KEY in Netlify environment variables.',
    });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return respond(400, { message: 'Invalid JSON body' });
  }

  const { mode, text, existingItems, language } = body;

  if (mode !== 'categorize' && mode !== 'translate') {
    return respond(400, { message: "mode must be 'categorize' or 'translate'" });
  }
  if (typeof text !== 'string' || !text.trim() || text.length > MAX_TEXT_LENGTH) {
    return respond(400, { message: `text must be a non-empty string up to ${MAX_TEXT_LENGTH} characters` });
  }
  if (
    !Array.isArray(existingItems) ||
    existingItems.length > MAX_EXISTING_ITEMS ||
    !existingItems.every((i) => typeof i === 'string' && i.length <= MAX_EXISTING_ITEM_LENGTH)
  ) {
    return respond(400, { message: 'existingItems must be an array of short strings' });
  }
  if (mode === 'translate' && !isLanguage(language)) {
    return respond(400, { message: "language must be 'en', 'he' or 'es'" });
  }

  const prompt =
    mode === 'translate'
      ? buildTranslatePrompt(text, existingItems, language as AiLanguage)
      : buildCategorizePrompt(text, existingItems, detectInputLanguage(text));

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: GROCERY_AI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: groceryResponseSchema,
      },
    });

    const resultText = response.text?.trim();
    if (!resultText) {
      return respond(502, { message: 'Empty response from AI' });
    }
    return respond(200, { text: resultText });
  } catch (error: unknown) {
    console.error('gemini-categorize error:', error instanceof Error ? error.message : error);
    return respond(502, { message: 'AI request failed' });
  }
};
