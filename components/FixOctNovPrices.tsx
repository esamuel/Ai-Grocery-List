import React, { useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getFirebaseServices } from '../services/firebaseService';

interface PurchaseHistoryItem {
  name: string;
  category: string;
  purchaseDate: string;
  price?: number;
  storeName?: string;
  quantity?: number;
  unit?: string;
}

interface FixCandidate {
  index: number;
  item: PurchaseHistoryItem;
  newPrice?: number;
  newStoreName: string;
  status: 'can_fix' | 'no_match';
  matchSource?: string;
}

interface Props {
  listId: string;
  onClose: () => void;
}

export const FixOctNovPrices: React.FC<Props> = ({ listId, onClose }) => {
  const [phase, setPhase] = useState<'idle' | 'analyzing' | 'preview' | 'applying' | 'done'>('idle');
  const [candidates, setCandidates] = useState<FixCandidate[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addLog = (message: string) => {
    setLog(prev => [...prev, message]);
  };

  const normalizeProductName = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[״׳]/g, '')
      .replace(/\.$/, '');
  };

  const normalizePrice = (price?: number | string): number | null => {
    if (typeof price === 'number') return price;
    if (typeof price === 'string') {
      const numeric = parseFloat(price.replace(/[^0-9.\-]/g, ''));
      return isNaN(numeric) ? null : numeric;
    }
    return null;
  };

  const isPlaceholder = (item: PurchaseHistoryItem): boolean => {
    const normalized = normalizePrice(item.price);
    return normalized !== null && Math.abs(normalized - 12) < 0.001;
  };

  const isTargetPeriod = (item: PurchaseHistoryItem): { match: boolean; reason?: string } => {
    const rawDate = item.purchaseDate;
    const parsed = new Date(rawDate);

    if (isNaN(parsed.getTime())) {
      return { match: false, reason: `Invalid date format: ${rawDate}` };
    }

    const year = parsed.getFullYear();
    const month = parsed.getMonth(); // 0-indexed (9=Oct)
    const day = parsed.getDate();
    
    // ONLY October 19, 2025
    const match = year === 2025 && month === 9 && day === 19;
    return { match, reason: match ? undefined : `Different date (${parsed.toISOString().slice(0,10)})` };
  };

  const findMostRecentPrice = (
    productName: string,
    history: PurchaseHistoryItem[],
    excludeIndex: number
  ): { price: number; source: string } | null => {
    const normalized = normalizeProductName(productName);

    const matches = history
      .map((item, index) => ({ item, index }))
      .filter(({ item, index }) => {
        if (index === excludeIndex) return false;
        if (isPlaceholder(item)) return false;
        if (!item.price || item.price === 12.00) return false;
        return normalizeProductName(item.name) === normalized;
      })
      .sort((a, b) => {
        const dateA = new Date(a.item.purchaseDate).getTime();
        const dateB = new Date(b.item.purchaseDate).getTime();
        return dateB - dateA;
      });

    if (matches.length === 0) return null;

    const mostRecent = matches[0];
    return {
      price: mostRecent.item.price!,
      source: `${mostRecent.item.purchaseDate} (${mostRecent.item.storeName || 'unknown'})`
    };
  };

  const analyze = async () => {
    try {
      setPhase('analyzing');
      setError(null);
      setLog([]);
      addLog('📊 Loading purchase history...');

      const { db } = getFirebaseServices();
      const listRef = doc(db, 'groceryLists', listId);
      const listSnap = await getDoc(listRef);

      if (!listSnap.exists()) {
        throw new Error(`List ${listId} not found`);
      }

      const data = listSnap.data();
      const history: PurchaseHistoryItem[] = data.history || [];

      addLog(`✅ Loaded ${history.length} items`);
      addLog('🔍 Analyzing October 19, 2025 items...');

      const foundCandidates: FixCandidate[] = [];

      // Debug: Log ALL items from target period with price 12.00
      let targetCount = 0;
      let invalidDates = 0;
      let priceMismatchCount = 0;
      for (let i = 0; i < history.length; i++) {
        const item = history[i];

        const targetCheck = isTargetPeriod(item);
        const numericPrice = normalizePrice(item.price);
        if (targetCheck.match) {
          if (numericPrice !== null && Math.abs(numericPrice - 12) < 0.001) {
            targetCount++;
            addLog(`🔍 TARGET item: ${item.name} | price=${item.price} (${typeof item.price}) | rawDate="${item.purchaseDate}" | parsed="${new Date(item.purchaseDate).toISOString()}" | store="${item.storeName || 'EMPTY'}"`);
          } else {
            priceMismatchCount++;
            addLog(`⚠️ Target date but price != 12: ${item.name} | price=${item.price} (${typeof item.price})`);
          }
        } else if (numericPrice !== null && Math.abs(numericPrice - 12) < 0.001) {
          addLog(`ℹ️ 12₪ but wrong date: ${item.name} | date="${item.purchaseDate}" | reason=${targetCheck.reason}`);
        }

        if (isPlaceholder(item) && targetCheck.match) {
          const priceMatch = findMostRecentPrice(item.name, history, i);

          if (priceMatch) {
            foundCandidates.push({
              index: i,
              item,
              newPrice: priceMatch.price,
              newStoreName: 'קורפור',
              status: 'can_fix',
              matchSource: priceMatch.source
            });
          } else {
            foundCandidates.push({
              index: i,
              item,
              newPrice: undefined,
              newStoreName: 'קורפור',
              status: 'no_match',
              matchSource: undefined
            });
          }
        } else if (numericPrice !== null && Math.abs(numericPrice - 12) < 0.001 && targetCheck.reason?.startsWith('Invalid')) {
          invalidDates++;
        }
      }

      addLog(`📊 Summary: target= ${targetCount}, price mismatch=${priceMismatchCount}`);
      if (invalidDates > 0) {
        addLog(`⚠️ Found ${invalidDates} items with INVALID date format`);
      }

      setCandidates(foundCandidates);

      const canFix = foundCandidates.filter(c => c.status === 'can_fix').length;
      const noMatch = foundCandidates.filter(c => c.status === 'no_match').length;

      addLog('');
      addLog(`✅ Items that CAN be fixed: ${canFix}`);
      addLog(`⚠️  Items with NO match: ${noMatch}`);
      addLog(`📊 Total: ${foundCandidates.length}`);

      setPhase('preview');
    } catch (err: any) {
      setError(err.message || 'Analysis failed');
      setPhase('idle');
    }
  };

  const applyFixes = async () => {
    try {
      setPhase('applying');
      addLog('');
      addLog('🔧 Applying fixes...');

      const { db } = getFirebaseServices();
      const listRef = doc(db, 'groceryLists', listId);
      const listSnap = await getDoc(listRef);

      if (!listSnap.exists()) {
        throw new Error(`List ${listId} not found`);
      }

      const data = listSnap.data();
      const history: PurchaseHistoryItem[] = [...data.history];

      let fixedCount = 0;
      let keptCount = 0;

      for (const candidate of candidates) {
        if (candidate.status === 'can_fix' && candidate.newPrice) {
          history[candidate.index] = {
            ...history[candidate.index],
            price: candidate.newPrice,
            storeName: candidate.newStoreName
          };
          fixedCount++;
          addLog(`✅ ${candidate.item.name} → ${candidate.newPrice.toFixed(2)} ₪`);
        } else if (candidate.status === 'no_match') {
          history[candidate.index] = {
            ...history[candidate.index],
            storeName: candidate.newStoreName
          };
          keptCount++;
          addLog(`⚠️  ${candidate.item.name} → kept at 12.00 ₪`);
        }
      }

      addLog('');
      addLog('📤 Updating Firestore...');
      await updateDoc(listRef, { history });

      addLog('');
      addLog('✅ MIGRATION COMPLETE!');
      addLog(`✅ Fixed: ${fixedCount} items`);
      addLog(`⚠️  Kept at 12.00: ${keptCount} items`);

      setPhase('done');
    } catch (err: any) {
      setError(err.message || 'Failed to apply fixes');
      setPhase('preview');
    }
  };

  const canFix = candidates.filter(c => c.status === 'can_fix');
  const noMatch = candidates.filter(c => c.status === 'no_match');

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-lg">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">
              🔧 Fix October 19, 2025
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>
          <p className="text-gray-600 mt-2">
            Fix ALL items with 12.00 ₪ from October 19, 2025 ONLY
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {phase === 'idle' && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Ready to Analyze
              </h3>
              <p className="text-gray-600 mb-6">
                This will find ALL items with 12.00 ₪ from <strong>October 19, 2025</strong><br />
                and update them with real prices + store name "קורפור"
              </p>
              <button
                onClick={analyze}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
              >
                Start Analysis
              </button>
            </div>
          )}

          {phase === 'analyzing' && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4"></div>
              <p className="text-gray-600">Analyzing purchase history...</p>
            </div>
          )}

          {phase === 'preview' && (
            <div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-blue-900 mb-2">📊 Analysis Complete:</h4>
                <div className="text-sm text-blue-800">
                  <div>✅ Items that can be fixed: <strong>{canFix.length}</strong></div>
                  <div>⚠️ Items with no match: <strong>{noMatch.length}</strong></div>
                  <div>📊 Total: <strong>{candidates.length}</strong></div>
                </div>
              </div>

              {canFix.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">✅ Items That Will Be Fixed:</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {canFix.map((c, idx) => (
                      <div key={idx} className="bg-green-50 border border-green-200 rounded p-3 text-sm">
                        <div className="font-semibold">{c.item.name}</div>
                        <div className="text-gray-600">Date: {c.item.purchaseDate}</div>
                        <div className="text-red-600">Current: 12.00 ₪ @ שמוליק אשכנזי</div>
                        <div className="text-green-600">New: {c.newPrice!.toFixed(2)} ₪ @ קורפור</div>
                        <div className="text-xs text-gray-500">Source: {c.matchSource}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {noMatch.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">⚠️ Items With No Match:</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {noMatch.map((c, idx) => (
                      <div key={idx} className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
                        <div className="font-semibold">{c.item.name}</div>
                        <div className="text-gray-600">Date: {c.item.purchaseDate}</div>
                        <div className="text-yellow-700">Will keep 12.00 ₪ and change store to קורפור</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={applyFixes}
                  disabled={candidates.length === 0}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply Fixes ({candidates.length} items)
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {phase === 'applying' && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent mb-4"></div>
              <p className="text-gray-600">Applying fixes...</p>
            </div>
          )}

          {phase === 'done' && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Migration Complete!
              </h3>
              <p className="text-gray-600 mb-6">
                All fixes have been applied successfully.
              </p>
              <button
                onClick={onClose}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          )}

          {/* Log */}
          {log.length > 0 && (
            <details className="mt-6">
              <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900 font-semibold">
                View Detailed Log
              </summary>
              <div className="mt-2 bg-gray-50 rounded p-4 text-xs font-mono max-h-60 overflow-y-auto">
                {log.map((line, idx) => (
                  <div key={idx}>{line}</div>
                ))}
              </div>
            </details>
          )}

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="font-semibold text-red-900">Error:</div>
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

