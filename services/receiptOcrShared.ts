import { normalizeCategory } from './categoryTranslations';

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

/** Best vision models first (Israeli Hebrew receipts). */
export const RECEIPT_OCR_MODELS = [
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
] as const;

export function buildReceiptOcrPrompt(
  language: 'en' | 'he' | 'es',
  categoryList: string,
  today: string
): string {
  const langNote =
    language === 'he'
      ? 'הקבלה בעברית. שמור שמות מוצרים בעברית בדיוק כפי שמופיעים (אותיות עבריות).'
      : language === 'es'
        ? 'El ticket puede estar en español; conserva los nombres originales.'
        : 'Preserve product names exactly as printed on the receipt.';

  return `You are a world-class receipt OCR specialist — as accurate as a human accountant reviewing a supermarket bill.

TASK: Read EVERY product line on this grocery receipt image. ${langNote}

STORE TYPES: Israeli chains (רמי לוי, שופרסל, יוחננוף, ויקטורי, מגה, יינות ביתן, AM:PM, etc.) or international — adapt accordingly.

HOW TO READ THE RECEIPT:
1. Scan top-to-bottom. Skip barcode blocks, ads, club member text, and payment card lines unless they are products.
2. Each PRODUCT LINE usually has: item name | quantity or weight | unit price | LINE TOTAL price.
3. Use the LINE TOTAL (סה"כ שורה / amount for that row) as "price" — NOT the unit price × qty unless only unit price exists.
4. Hebrew receipts: read right-to-left names; numbers may use comma decimals (12,90 = 12.90 NIS).
5. Weight items: quantity = weight (e.g. 0.456 kg), unit = "kg" or "ק״ג".
6. If a name is cut off, infer the full product name from visible letters (e.g. "חלב 3%" not "חלב").
7. Include ALL food/grocery lines — do not stop after a few items.

OUTPUT: Valid JSON ONLY (no markdown). Schema:
{
  "storeName": "string",
  "purchaseDate": "YYYY-MM-DD",
  "currency": "ILS",
  "totalAmount": number,
  "items": [
    { "name": "string", "category": "one from list below", "price": number, "quantity": number, "unit": "optional" }
  ]
}

- purchaseDate: from receipt; if missing use ${today}
- totalAmount: printed total at bottom (סה"כ לתשלום)
- category: pick EXACTLY one translated category from:
${categoryList}

If unsure of category, pick the closest. Never return an empty items array if products are visible.`;
}

export function extractJsonFromModelText(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1].trim() : trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('Model did not return JSON');
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

function parsePrice(value: unknown): number {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  const s = String(value ?? '')
    .replace(/[₪$€]/g, '')
    .replace(/\s/g, '')
    .trim();
  if (!s) return 0;
  // 1.234,56 → 1234.56 ; 12,90 → 12.90
  if (/,\d{1,2}$/.test(s) && s.includes('.')) {
    return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
  }
  if (/,\d{1,2}$/.test(s)) {
    return parseFloat(s.replace(',', '.')) || 0;
  }
  return parseFloat(s) || 0;
}

export function normalizeReceiptPayload(
  parsed: Record<string, unknown>,
  language: 'en' | 'he' | 'es',
  today: string
): ReceiptAnalysisResult {
  const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
  const items: ReceiptItem[] = rawItems
    .map((raw) => {
      const r = raw as Record<string, unknown>;
      const name = String(r.name || '').trim();
      const price = parsePrice(r.price);
      if (!name) return null;
      return {
        name,
        category: normalizeCategory(String(r.category || 'Other'), language),
        price: price > 0 ? price : parsePrice(r.lineTotal ?? r.total),
        quantity: Number(r.quantity) > 0 ? Number(r.quantity) : 1,
        unit: r.unit ? String(r.unit) : undefined,
      };
    })
    .filter((i): i is ReceiptItem => i !== null && i.price > 0);

  const totalAmount =
    parsePrice(parsed.totalAmount) ||
    items.reduce((s, i) => s + i.price, 0);

  return {
    storeName: String(parsed.storeName || 'Unknown Store').trim(),
    purchaseDate: String(parsed.purchaseDate || today).slice(0, 10),
    currency: String(parsed.currency || 'ILS'),
    items,
    totalAmount,
  };
}
