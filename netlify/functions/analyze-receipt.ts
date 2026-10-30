import type { Handler } from '@netlify/functions';
import { GoogleGenAI, MediaResolution } from '@google/genai';
import { getCategoryPromptList } from '../../services/categoryTranslations';
import {
  RECEIPT_OCR_MODELS,
  buildReceiptOcrPrompt,
  extractJsonFromModelText,
  normalizeReceiptPayload,
} from '../../services/receiptOcrShared';

// Only allow the site's own origins (Netlify-provided URLs) plus any
// explicitly configured via ALLOWED_ORIGINS (comma-separated).
const allowedOrigins = new Set(
  [
    process.env.URL,
    process.env.DEPLOY_PRIME_URL,
    process.env.DEPLOY_URL,
    ...(process.env.ALLOWED_ORIGINS || '').split(','),
  ]
    .map((o) => (o || '').trim().replace(/\/+$/, ''))
    .filter(Boolean),
);

const buildCorsHeaders = (origin: string | undefined): Record<string, string> => {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
  if (origin && allowedOrigins.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
};

// Provider error texts can contain the API key itself (Google: "Consumer 'api_key:AIza...' has been suspended").
// Never send them to the browser: the client gets only the model, HTTP code and status word; logs get a redacted text.
const redactSecrets = (s: string): string =>
  s.replace(/AIza[0-9A-Za-z_-]{20,}/g, 'AIza…[redacted]')
    .replace(/((?:api[_-]?key|key|token|secret)["'=: ]+)[^\s"',}]{8,}/gi, '$1[redacted]');

const summarizeProviderError = (msg: string): { short: string; config: boolean } => {
  const code = msg.match(/"code"\s*:\s*(\d{3})/)?.[1] ?? msg.match(/\b(4\d\d|5\d\d)\b/)?.[1];
  const status = msg.match(/"status"\s*:\s*"([A-Z_]+)"/)?.[1];
  // 401/403 or a key/permission problem is OUR configuration, not the user's photo.
  const config = code === '401' || code === '403' || /PERMISSION_DENIED|UNAUTHENTICATED|API_KEY_INVALID|suspended/i.test(msg);
  const short = code || status ? [code, status].filter(Boolean).join(' ') : redactSecrets(msg).slice(0, 80);
  return { short, config };
};

export const handler: Handler = async (event) => {
  const corsHeaders = buildCorsHeaders(event.headers?.origin || event.headers?.Origin);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' };
  }

  const apiKey =
    process.env.GEMINI_API_KEY ||
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
    let configProblem = false;

    // Netlify synchronous functions are killed at ~10s (26s if raised by support).
    // Keep a hard budget so a slow model never eats the whole request.
    const TOTAL_BUDGET_MS = Number(process.env.RECEIPT_OCR_BUDGET_MS || 9000);
    const startedAt = Date.now();
    console.log(`Receipt OCR start: ${Math.round(base64Data.length * 0.75 / 1024)} KB image, lang=${language}`);

    for (const model of RECEIPT_OCR_MODELS) {
      const remaining = TOTAL_BUDGET_MS - (Date.now() - startedAt);
      if (remaining < 2500) {
        errors.push(`${model}: skipped (out of time)`);
        break;
      }
      const t0 = Date.now();
      try {
        console.log(`Receipt OCR trying model: ${model} (budget ${remaining}ms)`);
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
            mediaResolution: MediaResolution.MEDIA_RESOLUTION_HIGH,
            httpOptions: { timeout: remaining },
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
        console.log(`Receipt OCR success with ${model}: ${candidate.items.length} items in ${Date.now() - t0}ms`);
        break;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const { short, config } = summarizeProviderError(msg);
        if (config) configProblem = true;
        errors.push(`${model}: ${short}`);
        console.warn(`Receipt OCR ${model} failed after ${Date.now() - t0}ms:`, redactSecrets(msg).slice(0, 500));
      }
    }

    if (!normalized) {
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: configProblem
            ? language === 'he'
              ? 'שירות קריאת הקבלות לא זמין כרגע. זו תקלה אצלנו, לא בתמונה שלך. נסה שוב מאוחר יותר.'
              : 'Receipt reading is unavailable right now. This is a problem on our side, not your photo. Please try again later.'
            : language === 'he'
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
    const raw = error instanceof Error ? error.message : 'Receipt analysis failed';
    const message = redactSecrets(raw).slice(0, 200);
    console.error('analyze-receipt error:', message);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    };
  }
};
