import React, { useRef, useState } from 'react';
import {
  analyzeReceiptImage,
  type ReceiptAnalysisResult,
  type ReceiptItem,
} from '../services/geminiService';
import { commitReceiptScan, enrichReceiptItems } from '../services/receiptCommitService';
import type { PurchaseHistoryItem } from '../types';
import { CATEGORY_TRANSLATIONS, type Language, type StandardCategory } from '../services/categoryTranslations';

type Step = 'pick' | 'analyzing' | 'review' | 'saving';

export interface ReceiptScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  listId: string;
  userId?: string;
  language: Language;
  currency: string;
  historyItems: PurchaseHistoryItem[];
  onSuccess: () => void;
  translations: {
    title: string;
    pickHint: string;
    takePhoto: string;
    chooseFile: string;
    analyzing: string;
    reviewTitle: string;
    store: string;
    date: string;
    total: string;
    item: string;
    category: string;
    price: string;
    qty: string;
    confirm: string;
    cancel: string;
    back: string;
    errorGeneric: string;
    success: string;
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Shrink large photos so the API stays fast and under size limits. */
async function compressImage(dataUrl: string, maxDim = 1600): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width <= maxDim && height <= maxDim) {
        resolve(dataUrl);
        return;
      }
      const scale = maxDim / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export const ReceiptScanModal: React.FC<ReceiptScanModalProps> = ({
  isOpen,
  onClose,
  listId,
  userId,
  language,
  currency,
  historyItems,
  onSuccess,
  translations: t,
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('pick');
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptAnalysisResult | null>(null);

  if (!isOpen) return null;

  const reset = () => {
    setStep('pick');
    setError(null);
    setReceipt(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const processImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError(t.errorGeneric);
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError(language === 'he' ? 'הקובץ גדול מדי (מקס 12MB)' : 'File too large (max 12MB)');
      return;
    }

    setError(null);
    setStep('analyzing');
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const compressed = await compressImage(dataUrl);
      const result = await analyzeReceiptImage(compressed, language);
      const enriched = enrichReceiptItems(result, historyItems);
      setReceipt(enriched);
      setStep('review');
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : t.errorGeneric);
      setStep('pick');
    }
  };

  const updateItem = (index: number, patch: Partial<ReceiptItem>) => {
    if (!receipt) return;
    const items = [...receipt.items];
    items[index] = { ...items[index], ...patch };
    setReceipt({ ...receipt, items });
  };

  const removeItem = (index: number) => {
    if (!receipt) return;
    const items = receipt.items.filter((_, i) => i !== index);
    setReceipt({
      ...receipt,
      items,
      totalAmount: items.reduce((s, i) => s + i.price, 0),
    });
  };

  const handleConfirm = async () => {
    if (!receipt || !listId) return;
    setStep('saving');
    setError(null);
    try {
      await commitReceiptScan(listId, receipt, { userId, historyItems });
      alert(t.success);
      onSuccess();
      handleClose();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : t.errorGeneric);
      setStep('review');
    }
  };

  const symbol = currency === 'ILS' ? '₪' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  const categories = [
    ...new Set(
      (Object.keys(CATEGORY_TRANSLATIONS) as StandardCategory[]).map(
        (k) => CATEGORY_TRANSLATIONS[k][language]
      )
    ),
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-800 w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t.title}</h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-800 dark:hover:text-white text-2xl leading-none"
            aria-label={t.cancel}
          >
            ×
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {error && (
            <div className="mb-3 p-3 rounded-lg bg-red-50 text-red-800 text-sm border border-red-200">
              {error}
            </div>
          )}

          {step === 'pick' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">{t.pickHint}</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) processImage(f);
                  e.target.value = '';
                }}
              />
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) processImage(f);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className="w-full py-4 rounded-xl bg-cyan-600 text-white font-semibold hover:bg-cyan-700"
              >
                📷 {t.takePhoto}
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full py-4 rounded-xl border-2 border-cyan-600 text-cyan-700 dark:text-cyan-300 font-semibold hover:bg-cyan-50 dark:hover:bg-cyan-900/30"
              >
                🖼️ {t.chooseFile}
              </button>
            </div>
          )}

          {step === 'analyzing' && (
            <div className="py-12 text-center">
              <div className="animate-spin text-4xl mb-4">⏳</div>
              <p className="text-gray-700 dark:text-gray-200 font-medium">{t.analyzing}</p>
            </div>
          )}

          {step === 'review' && receipt && (
            <div className="space-y-4">
              <p className="font-semibold text-gray-800 dark:text-white">{t.reviewTitle}</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <label className="text-gray-500">{t.store}</label>
                <input
                  className="border rounded-lg px-2 py-1 dark:bg-gray-700 dark:border-gray-600"
                  value={receipt.storeName}
                  onChange={(e) => setReceipt({ ...receipt, storeName: e.target.value })}
                />
                <label className="text-gray-500">{t.date}</label>
                <input
                  type="date"
                  className="border rounded-lg px-2 py-1 dark:bg-gray-700 dark:border-gray-600"
                  value={receipt.purchaseDate.slice(0, 10)}
                  onChange={(e) => setReceipt({ ...receipt, purchaseDate: e.target.value })}
                />
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.total}: {symbol}
                {receipt.items.reduce((s, i) => s + i.price, 0).toFixed(2)}
              </p>
              <div className="space-y-3 max-h-[40vh] overflow-y-auto">
                {receipt.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="border border-gray-200 dark:border-gray-600 rounded-lg p-2 space-y-1"
                  >
                    <div className="flex gap-2">
                      <input
                        className="flex-1 text-sm border rounded px-2 py-1 dark:bg-gray-700"
                        value={item.name}
                        onChange={(e) => updateItem(idx, { name: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="text-red-500 px-2"
                        title={t.cancel}
                      >
                        🗑️
                      </button>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <select
                        className="flex-1 min-w-[120px] text-xs border rounded px-1 py-1 dark:bg-gray-700"
                        value={item.category}
                        onChange={(e) => updateItem(idx, { category: e.target.value })}
                      >
                        {categories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        className="w-20 text-sm border rounded px-2 py-1 dark:bg-gray-700"
                        value={item.price}
                        onChange={(e) =>
                          updateItem(idx, { price: parseFloat(e.target.value) || 0 })
                        }
                      />
                      <input
                        type="number"
                        step="0.01"
                        className="w-14 text-sm border rounded px-2 py-1 dark:bg-gray-700"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(idx, { quantity: parseFloat(e.target.value) || 1 })
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'saving' && (
            <div className="py-12 text-center">
              <div className="animate-spin text-4xl mb-4">💾</div>
              <p className="text-gray-700 dark:text-gray-200">{t.analyzing}</p>
            </div>
          )}
        </div>

        {step === 'review' && receipt && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
            <button
              type="button"
              onClick={() => setStep('pick')}
              className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-700 dark:text-gray-200"
            >
              {t.back}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={receipt.items.length === 0}
              className="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50"
            >
              ✓ {t.confirm}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
