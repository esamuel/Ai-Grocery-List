import React, { useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getFirebaseServices } from '../services/firebaseService';

interface PriceHistory {
  price: number;
  currency: string;
  purchaseDate: string;
  store?: string;
  quantity?: number;
  unitPrice?: number;
  unit?: string;
  estimatedPrice?: boolean;
}

interface PurchaseHistoryItem {
  name: string;
  category: string;
  frequency: number;
  lastPurchased: string;
  firstPurchased?: string;
  prices?: PriceHistory[];
  lastPrice?: number;
  avgPrice?: number;
  lowestPrice?: number;
  highestPrice?: number;
  canonicalName?: string;
  starred?: boolean;
  tags?: string[];
}

interface FixCandidate {
  itemIndex: number;
  priceIndex: number;
  itemName: string;
  priceEntry: PriceHistory;
  newPrice?: number;
  newStore: string;
  status: 'can_fix' | 'no_match';
  matchSource?: string;
}

interface Props {
  listId: string;
  onClose: () => void;
}

export const FixShmoulikItems: React.FC<Props> = ({ listId, onClose }) => {
  const [phase, setPhase] = useState<'idle' | 'analyzing' | 'preview' | 'applying' | 'done'>('idle');
  const [candidates, setCandidates] = useState<FixCandidate[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [manualEdits, setManualEdits] = useState<Record<string, number>>({});

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

  const isOctNov2024or2025 = (dateStr: string): boolean => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return false;
    
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed (9=Oct, 10=Nov)
    
    // Oct or Nov in 2024 or 2025
    return (year === 2024 || year === 2025) && (month === 9 || month === 10);
  };

  const isShmoulikStore = (storeName?: string): boolean => {
    if (!storeName) return false;
    const normalized = storeName.trim().toLowerCase();
    return normalized.includes('שמוליק') || normalized.includes('אשכנזי');
  };

  const findBestPrice = (
    productName: string,
    history: PurchaseHistoryItem[],
    excludeItemIndex: number,
    excludePriceIndex: number
  ): { price: number; source: string } | null => {
    const normalized = normalizeProductName(productName);

    const allPrices: { price: number; date: string; store: string; itemIdx: number; priceIdx: number }[] = [];

    history.forEach((item, itemIdx) => {
      if (normalizeProductName(item.name) !== normalized) return;
      
      item.prices?.forEach((priceEntry, priceIdx) => {
        // Skip the current entry we're trying to fix
        if (itemIdx === excludeItemIndex && priceIdx === excludePriceIndex) return;
        
        // Skip Shmoulik prices
        if (isShmoulikStore(priceEntry.store)) return;
        
        // Skip placeholder prices
        if (priceEntry.price === 12 || priceEntry.price === 12.00) return;
        
        // Skip Oct/Nov 2024/2025 dates
        if (isOctNov2024or2025(priceEntry.purchaseDate)) return;
        
        allPrices.push({
          price: priceEntry.price,
          date: priceEntry.purchaseDate,
          store: priceEntry.store || 'unknown',
          itemIdx,
          priceIdx
        });
      });
    });

    if (allPrices.length === 0) return null;

    // Sort by date descending (most recent first)
    allPrices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const mostRecent = allPrices[0];
    return {
      price: mostRecent.price,
      source: `${mostRecent.date.split('T')[0]} @ ${mostRecent.store} (${mostRecent.price.toFixed(2)} ₪)`
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
      addLog('🔍 Searching for "שמוליק אשכנזי" items in Oct/Nov 2024-2025...');

      const foundCandidates: FixCandidate[] = [];
      let totalPriceEntries = 0;
      let shmoulikCount = 0;

      history.forEach((item, itemIdx) => {
        if (!item.prices || item.prices.length === 0) return;

        item.prices.forEach((priceEntry, priceIdx) => {
          totalPriceEntries++;
          
          // Check if this is Oct/Nov 2024/2025 with Shmoulik store
          if (isOctNov2024or2025(priceEntry.purchaseDate) && 
              isShmoulikStore(priceEntry.store)) {
            
            shmoulikCount++;
            addLog(`🔍 Found: ${item.name} | ${priceEntry.price} ₪ | ${priceEntry.purchaseDate.split('T')[0]} | ${priceEntry.store}`);

            // Find best replacement price
            const bestPrice = findBestPrice(item.name, history, itemIdx, priceIdx);

            if (bestPrice) {
              foundCandidates.push({
                itemIndex: itemIdx,
                priceIndex: priceIdx,
                itemName: item.name,
                priceEntry,
                newPrice: bestPrice.price,
                newStore: 'קורפור',
                status: 'can_fix',
                matchSource: bestPrice.source
              });
            } else {
              foundCandidates.push({
                itemIndex: itemIdx,
                priceIndex: priceIdx,
                itemName: item.name,
                priceEntry,
                newPrice: undefined,
                newStore: 'קורפור',
                status: 'no_match',
                matchSource: undefined
              });
            }
          }
        });
      });

      addLog(`📊 Checked ${totalPriceEntries} price entries`);
      addLog(`🎯 Found ${shmoulikCount} entries with "שמוליק אשכנזי" in Oct/Nov`);

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
      addLog(`❌ Error: ${err.message}`);
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
      const history: PurchaseHistoryItem[] = JSON.parse(JSON.stringify(data.history || []));

      let fixedCount = 0;
      let manualCount = 0;
      let keptCount = 0;

      candidates.forEach(candidate => {
        const item = history[candidate.itemIndex];
        if (!item.prices) return;

        const priceEntry = item.prices[candidate.priceIndex];
        const candidateKey = `${candidate.itemIndex}-${candidate.priceIndex}`;

        if (candidate.status === 'can_fix' && candidate.newPrice) {
          priceEntry.price = candidate.newPrice;
          priceEntry.store = candidate.newStore;
          fixedCount++;
          addLog(`✅ ${candidate.itemName} → ${candidate.newPrice.toFixed(2)} ₪ @ קורפור`);
        } else if (candidate.status === 'no_match') {
          // Check if user manually entered a price
          const manualPrice = manualEdits[candidateKey];
          if (manualPrice && manualPrice > 0) {
            priceEntry.price = manualPrice;
            priceEntry.store = candidate.newStore;
            manualCount++;
            addLog(`✅ ${candidate.itemName} → ${manualPrice.toFixed(2)} ₪ @ קורפור (manual)`);
          } else {
            // Keep existing price, just change store
            priceEntry.store = candidate.newStore;
            keptCount++;
            addLog(`⚠️  ${candidate.itemName} → kept at ${priceEntry.price.toFixed(2)} ₪, changed store to קורפור`);
          }
        }
      });

      addLog('');
      addLog('📤 Updating Firestore...');
      await updateDoc(listRef, { history });

      addLog('');
      addLog('✅ MIGRATION COMPLETE!');
      addLog(`✅ Auto-fixed with real prices: ${fixedCount}`);
      addLog(`✏️  Manually updated: ${manualCount}`);
      addLog(`⚠️  Kept original price: ${keptCount}`);

      setPhase('done');
    } catch (err: any) {
      setError(err.message || 'Failed to apply fixes');
      addLog(`❌ Error: ${err.message}`);
      setPhase('preview');
    }
  };

  const canFix = candidates.filter(c => c.status === 'can_fix');
  const noMatch = candidates.filter(c => c.status === 'no_match');
  
  const manualEditCount = Object.values(manualEdits).filter(price => price > 0).length;
  const totalToFix = canFix.length + manualEditCount;

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
              🔧 Fix "שמוליק אשכנזי" Items
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>
          <p className="text-gray-600 mt-2">
            Fix ALL items from Oct/Nov 2024-2025 with store "שמוליק אשכנזי"
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
                This will find ALL items from <strong>Oct/Nov 2024-2025</strong><br />
                with store name "שמוליק אשכנזי" and update them with real prices + "קורפור"
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
                  <div>✅ Items that can be auto-fixed: <strong>{canFix.length}</strong></div>
                  <div>⚠️ Items needing manual input: <strong>{noMatch.length}</strong></div>
                  <div>📊 Total: <strong>{candidates.length}</strong></div>
                </div>
              </div>

              {canFix.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">✅ Items That Will Be Auto-Fixed:</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {canFix.map((c, idx) => (
                      <div key={idx} className="bg-green-50 border border-green-200 rounded p-3 text-sm">
                        <div className="font-semibold">{c.itemName}</div>
                        <div className="text-gray-600 text-xs">Date: {c.priceEntry.purchaseDate.split('T')[0]}</div>
                        <div className="text-red-600 text-xs">Current: {c.priceEntry.price.toFixed(2)} ₪ @ {c.priceEntry.store}</div>
                        <div className="text-green-600 text-xs">New: {c.newPrice!.toFixed(2)} ₪ @ קורפור</div>
                        <div className="text-xs text-gray-500">Source: {c.matchSource}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {noMatch.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">
                    ⚠️ Items Needing Manual Price: 
                    <span className="text-sm font-normal text-gray-600 ml-2">
                      (Enter new price or leave to keep current)
                    </span>
                  </h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {noMatch.map((c, idx) => {
                      const candidateKey = `${c.itemIndex}-${c.priceIndex}`;
                      const manualPrice = manualEdits[candidateKey];
                      return (
                        <div key={idx} className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="font-semibold">{c.itemName}</div>
                              <div className="text-gray-600 text-xs">Date: {c.priceEntry.purchaseDate.split('T')[0]}</div>
                              <div className="text-yellow-700 text-xs mt-1">
                                Current: {c.priceEntry.price.toFixed(2)} ₪ @ {c.priceEntry.store}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="New price"
                                value={manualPrice || ''}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value);
                                  setManualEdits(prev => ({
                                    ...prev,
                                    [candidateKey]: isNaN(value) ? 0 : value
                                  }));
                                }}
                                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                              <span className="text-gray-600">₪</span>
                            </div>
                          </div>
                          {manualPrice && manualPrice > 0 ? (
                            <div className="text-green-600 text-xs mt-2">
                              → Will update to: {manualPrice.toFixed(2)} ₪ @ קורפור
                            </div>
                          ) : (
                            <div className="text-gray-500 text-xs mt-2">
                              → Will keep: {c.priceEntry.price.toFixed(2)} ₪ @ קורפור
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {manualEditCount > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                    ✏️ You've manually entered <strong>{manualEditCount}</strong> new price{manualEditCount !== 1 ? 's' : ''}
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={applyFixes}
                    disabled={candidates.length === 0}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Apply Fixes ({totalToFix} updated, {noMatch.length - manualEditCount} kept)
                  </button>
                  <button
                    onClick={onClose}
                    className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
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
                All "שמוליק אשכנזי" items have been processed successfully.
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
            <details className="mt-6" open>
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

