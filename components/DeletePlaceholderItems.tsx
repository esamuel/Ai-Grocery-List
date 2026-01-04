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

interface DeleteCandidate {
  itemIndex: number;
  priceIndex: number;
  itemName: string;
  priceEntry: PriceHistory;
}

interface Props {
  listId: string;
  onClose: () => void;
}

export const DeletePlaceholderItems: React.FC<Props> = ({ listId, onClose }) => {
  const [phase, setPhase] = useState<'idle' | 'analyzing' | 'preview' | 'deleting' | 'done'>('idle');
  const [candidates, setCandidates] = useState<DeleteCandidate[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addLog = (message: string) => {
    setLog(prev => [...prev, message]);
  };

  const isOctober19_2025 = (dateStr: string): boolean => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return false;
    
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed (9=Oct)
    const day = date.getDate();
    
    return year === 2025 && month === 9 && day === 19;
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
      addLog('🔍 Searching for 12.00 ₪ items on October 19, 2025...');

      const foundCandidates: DeleteCandidate[] = [];

      history.forEach((item, itemIdx) => {
        if (!item.prices || item.prices.length === 0) return;

        item.prices.forEach((priceEntry, priceIdx) => {
          // Check if this is Oct 19, 2025 with price 12.00
          if (isOctober19_2025(priceEntry.purchaseDate) && 
              (priceEntry.price === 12 || priceEntry.price === 12.00)) {
            
            foundCandidates.push({
              itemIndex: itemIdx,
              priceIndex: priceIdx,
              itemName: item.name,
              priceEntry
            });
            
            addLog(`🗑️  Found: ${item.name} | ${priceEntry.price} ₪ | ${priceEntry.purchaseDate.split('T')[0]} | ${priceEntry.store || 'no store'}`);
          }
        });
      });

      addLog(`🎯 Found ${foundCandidates.length} items with 12.00 ₪ on Oct 19, 2025`);

      setCandidates(foundCandidates);
      setPhase('preview');
    } catch (err: any) {
      setError(err.message || 'Analysis failed');
      addLog(`❌ Error: ${err.message}`);
      setPhase('idle');
    }
  };

  const deleteItems = async () => {
    try {
      setPhase('deleting');
      addLog('');
      addLog('🗑️  Deleting placeholder items...');
      addLog('📥 Loading FRESH data from Firestore...');

      const { db } = getFirebaseServices();
      const listRef = doc(db, 'groceryLists', listId);
      const listSnap = await getDoc(listRef);

      if (!listSnap.exists()) {
        throw new Error(`List ${listId} not found`);
      }

      const data = listSnap.data();
      const history: PurchaseHistoryItem[] = JSON.parse(JSON.stringify(data.history || []));
      
      addLog(`✅ Loaded ${history.length} items from Firestore`);

      // Track which items to delete (by index, in reverse order to avoid index shifting)
      const itemsToDelete: Array<{itemIndex: number; priceIndex: number; itemName: string}> = [];

      // Find all current 12.00 items on Oct 19
      history.forEach((item, itemIdx) => {
        if (!item.prices || item.prices.length === 0) return;
        item.prices.forEach((priceEntry, priceIdx) => {
          if (isOctober19_2025(priceEntry.purchaseDate) && 
              (priceEntry.price === 12 || priceEntry.price === 12.00)) {
            itemsToDelete.push({
              itemIndex: itemIdx,
              priceIndex: priceIdx,
              itemName: item.name
            });
          }
        });
      });

      addLog(`🗑️  Deleting ${itemsToDelete.length} price entries...`);

      let deletedCount = 0;
      let itemsRemovedCompletely = 0;

      // Group deletions by item index
      const deletionsByItem = new Map<number, number[]>();
      itemsToDelete.forEach(({ itemIndex, priceIndex }) => {
        if (!deletionsByItem.has(itemIndex)) {
          deletionsByItem.set(itemIndex, []);
        }
        deletionsByItem.get(itemIndex)!.push(priceIndex);
      });

      // Process each item
      deletionsByItem.forEach((priceIndices, itemIndex) => {
        const item = history[itemIndex];
        if (!item.prices) return;

        // Sort indices in descending order to delete from end to start
        const sortedIndices = priceIndices.sort((a, b) => b - a);

        // Delete each price entry
        sortedIndices.forEach(priceIdx => {
          item.prices!.splice(priceIdx, 1);
          deletedCount++;
          addLog(`✅ Deleted: ${item.name} (Oct 19, 12.00 ₪)`);
        });

        // Update item statistics
        if (item.prices.length === 0) {
          // Mark item for complete removal
          item.frequency = 0;
          item.lastPurchased = '';
          item.firstPurchased = '';
          item.lastPrice = undefined;
          item.avgPrice = undefined;
          item.lowestPrice = undefined;
          item.highestPrice = undefined;
          itemsRemovedCompletely++;
        } else {
          // Recalculate statistics
          item.frequency = item.prices.length;
          const validPrices = item.prices.filter(p => p.price !== undefined).map(p => p.price!);
          
          if (validPrices.length > 0) {
            item.lastPrice = item.prices[item.prices.length - 1]?.price;
            item.avgPrice = validPrices.reduce((sum, p) => sum + p, 0) / validPrices.length;
            item.lowestPrice = Math.min(...validPrices);
            item.highestPrice = Math.max(...validPrices);
          }

          // Update dates
          const sortedByDate = [...item.prices].sort((a, b) => 
            new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime()
          );
          item.firstPurchased = sortedByDate[0]?.purchaseDate;
          item.lastPurchased = sortedByDate[sortedByDate.length - 1]?.purchaseDate;
        }
      });

      // Remove items with frequency 0
      const cleanedHistory = history.filter(item => item.frequency > 0);

      addLog('');
      addLog('📤 Updating Firestore...');
      await updateDoc(listRef, { history: cleanedHistory });

      addLog('');
      addLog('✅ DELETION COMPLETE!');
      addLog(`🗑️  Deleted ${deletedCount} price entries`);
      addLog(`📦 Removed ${itemsRemovedCompletely} items completely`);
      addLog(`📊 Remaining items: ${cleanedHistory.length}`);

      setPhase('done');
    } catch (err: any) {
      setError(err.message || 'Failed to delete items');
      addLog(`❌ Error: ${err.message}`);
      setPhase('preview');
    }
  };

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
              🗑️ Delete 12.00 ₪ Placeholders
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>
          <p className="text-gray-600 mt-2">
            Delete ALL remaining 12.00 ₪ items from October 19, 2025
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {phase === 'idle' && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🗑️</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Ready to Clean Up
              </h3>
              <p className="text-gray-600 mb-6">
                This will <strong className="text-red-600">permanently delete</strong> ALL items with 12.00 ₪<br />
                from <strong>October 19, 2025</strong> that you haven't fixed yet
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-left max-w-md mx-auto">
                <div className="font-semibold text-yellow-900 mb-2">⚠️ Warning:</div>
                <div className="text-sm text-yellow-800">
                  This action <strong>cannot be undone</strong>. Make sure you've fixed all the items you want to keep first!
                </div>
              </div>
              <button
                onClick={analyze}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
              >
                Find Items to Delete
              </button>
            </div>
          )}

          {phase === 'analyzing' && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent mb-4"></div>
              <p className="text-gray-600">Analyzing purchase history...</p>
            </div>
          )}

          {phase === 'preview' && (
            <div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-red-900 mb-2">🗑️ Items to Delete:</h4>
                <div className="text-sm text-red-800">
                  <div>Found <strong>{candidates.length}</strong> items with 12.00 ₪ on Oct 19, 2025</div>
                </div>
              </div>

              {candidates.length > 0 ? (
                <>
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-3">Items that will be deleted:</h4>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {candidates.map((c, idx) => (
                        <div key={idx} className="bg-red-50 border border-red-200 rounded p-3 text-sm">
                          <div className="font-semibold text-red-900">{c.itemName}</div>
                          <div className="text-gray-600 text-xs">
                            Date: {c.priceEntry.purchaseDate.split('T')[0]} | 
                            Price: {c.priceEntry.price} ₪ | 
                            Store: {c.priceEntry.store || 'Unknown'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                      ⚠️ This will <strong>permanently delete {candidates.length} price entries</strong>. This cannot be undone!
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={deleteItems}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                      >
                        🗑️ Delete {candidates.length} Items
                      </button>
                      <button
                        onClick={onClose}
                        className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">✅</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    All Clean!
                  </h3>
                  <p className="text-gray-600 mb-6">
                    No 12.00 ₪ items found on October 19, 2025
                  </p>
                  <button
                    onClick={onClose}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          )}

          {phase === 'deleting' && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent mb-4"></div>
              <p className="text-gray-600">Deleting items...</p>
            </div>
          )}

          {phase === 'done' && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Cleanup Complete!
              </h3>
              <p className="text-gray-600 mb-6">
                All 12.00 ₪ placeholder items have been deleted.
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

