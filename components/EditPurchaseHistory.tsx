import React, { useState, useEffect } from 'react';
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

interface EditableEntry {
  itemIndex: number;
  priceIndex: number;
  itemName: string;
  originalPrice: PriceHistory;
  editedPrice?: number;
  editedStore?: string;
  editedDate?: string;
  markedForDeletion?: boolean;
}

interface Props {
  listId: string;
  onClose: () => void;
}

export const EditPurchaseHistory: React.FC<Props> = ({ listId, onClose }) => {
  const [phase, setPhase] = useState<'loading' | 'editing' | 'saving' | 'done'>('loading');
  const [history, setHistory] = useState<PurchaseHistoryItem[]>([]);
  const [editedEntries, setEditedEntries] = useState<Map<string, EditableEntry>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPrice, setFilterPrice] = useState('');
  const [filterStore, setFilterStore] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addLog = (message: string) => {
    setLog(prev => [...prev, message]);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setPhase('loading');
      setError(null);
      addLog('📊 Loading purchase history...');

      const { db } = getFirebaseServices();
      const listRef = doc(db, 'groceryLists', listId);
      const listSnap = await getDoc(listRef);

      if (!listSnap.exists()) {
        throw new Error(`List ${listId} not found`);
      }

      const data = listSnap.data();
      const loadedHistory: PurchaseHistoryItem[] = data.history || [];

      setHistory(loadedHistory);
      addLog(`✅ Loaded ${loadedHistory.length} items`);
      
      // Count total price entries
      const totalEntries = loadedHistory.reduce((sum, item) => sum + (item.prices?.length || 0), 0);
      addLog(`📊 Total price entries: ${totalEntries}`);
      
      setPhase('editing');
    } catch (err: any) {
      setError(err.message || 'Failed to load history');
      addLog(`❌ Error: ${err.message}`);
    }
  };

  const getEntryKey = (itemIndex: number, priceIndex: number) => `${itemIndex}-${priceIndex}`;

  const handleEdit = (itemIndex: number, priceIndex: number, field: 'price' | 'store' | 'date', value: string) => {
    const key = getEntryKey(itemIndex, priceIndex);
    const item = history[itemIndex];
    const originalPrice = item.prices![priceIndex];

    const existing = editedEntries.get(key) || {
      itemIndex,
      priceIndex,
      itemName: item.name,
      originalPrice,
      editedPrice: originalPrice.price,
      editedStore: originalPrice.store,
      editedDate: originalPrice.purchaseDate.split('T')[0]
    };

    if (field === 'price') {
      existing.editedPrice = parseFloat(value) || 0;
    } else if (field === 'store') {
      existing.editedStore = value;
    } else if (field === 'date') {
      existing.editedDate = value;
    }

    const newMap = new Map(editedEntries);
    newMap.set(key, existing);
    setEditedEntries(newMap);
  };

  const handleDelete = (itemIndex: number, priceIndex: number) => {
    const key = getEntryKey(itemIndex, priceIndex);
    const item = history[itemIndex];
    const originalPrice = item.prices![priceIndex];

    const existing = editedEntries.get(key) || {
      itemIndex,
      priceIndex,
      itemName: item.name,
      originalPrice,
      editedPrice: originalPrice.price,
      editedStore: originalPrice.store,
      editedDate: originalPrice.purchaseDate.split('T')[0]
    };

    existing.markedForDeletion = !existing.markedForDeletion;

    const newMap = new Map(editedEntries);
    newMap.set(key, existing);
    setEditedEntries(newMap);
  };

  const applyChanges = async () => {
    try {
      setPhase('saving');
      addLog('');
      addLog('💾 Saving changes...');
      addLog('📥 Loading fresh data from Firestore...');

      const { db } = getFirebaseServices();
      const listRef = doc(db, 'groceryLists', listId);
      const listSnap = await getDoc(listRef);

      if (!listSnap.exists()) {
        throw new Error(`List ${listId} not found`);
      }

      const data = listSnap.data();
      const freshHistory: PurchaseHistoryItem[] = JSON.parse(JSON.stringify(data.history || []));

      addLog(`✅ Loaded ${freshHistory.length} items`);

      let editCount = 0;
      let deleteCount = 0;

      // Apply all edits and deletions
      const entriesToDelete: Array<{itemIndex: number; priceIndex: number}> = [];

      editedEntries.forEach((entry, key) => {
        const item = freshHistory[entry.itemIndex];
        if (!item || !item.prices) return;

        const priceEntry = item.prices[entry.priceIndex];
        if (!priceEntry) return;

        if (entry.markedForDeletion) {
          entriesToDelete.push({ itemIndex: entry.itemIndex, priceIndex: entry.priceIndex });
          deleteCount++;
          addLog(`🗑️  Marked for deletion: ${entry.itemName} (${entry.originalPrice.price} ₪)`);
        } else {
          // Apply edits
          let changed = false;
          if (entry.editedPrice !== entry.originalPrice.price) {
            priceEntry.price = entry.editedPrice!;
            changed = true;
          }
          if (entry.editedStore !== entry.originalPrice.store) {
            priceEntry.store = entry.editedStore;
            changed = true;
          }
          if (entry.editedDate && entry.editedDate !== entry.originalPrice.purchaseDate.split('T')[0]) {
            priceEntry.purchaseDate = new Date(entry.editedDate).toISOString();
            changed = true;
          }

          if (changed) {
            editCount++;
            addLog(`✏️  Edited: ${entry.itemName} → ${entry.editedPrice} ₪ @ ${entry.editedStore || 'N/A'}`);
          }
        }
      });

      // Delete entries (in reverse order to avoid index shifting)
      const deletionsByItem = new Map<number, number[]>();
      entriesToDelete.forEach(({ itemIndex, priceIndex }) => {
        if (!deletionsByItem.has(itemIndex)) {
          deletionsByItem.set(itemIndex, []);
        }
        deletionsByItem.get(itemIndex)!.push(priceIndex);
      });

      deletionsByItem.forEach((priceIndices, itemIndex) => {
        const item = freshHistory[itemIndex];
        if (!item.prices) return;

        const sortedIndices = priceIndices.sort((a, b) => b - a);
        sortedIndices.forEach(priceIdx => {
          item.prices!.splice(priceIdx, 1);
        });

        // Recalculate statistics
        if (item.prices.length === 0) {
          item.frequency = 0;
          item.lastPurchased = '';
          item.firstPurchased = '';
          item.lastPrice = undefined;
          item.avgPrice = undefined;
          item.lowestPrice = undefined;
          item.highestPrice = undefined;
        } else {
          item.frequency = item.prices.length;
          const validPrices = item.prices.filter(p => p.price !== undefined).map(p => p.price!);
          
          if (validPrices.length > 0) {
            item.lastPrice = item.prices[item.prices.length - 1]?.price;
            item.avgPrice = validPrices.reduce((sum, p) => sum + p, 0) / validPrices.length;
            item.lowestPrice = Math.min(...validPrices);
            item.highestPrice = Math.max(...validPrices);
          }

          const sortedByDate = [...item.prices].sort((a, b) => 
            new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime()
          );
          item.firstPurchased = sortedByDate[0]?.purchaseDate;
          item.lastPurchased = sortedByDate[sortedByDate.length - 1]?.purchaseDate;
        }
      });

      // Remove items with frequency 0
      const cleanedHistory = freshHistory.filter(item => item.frequency > 0);

      addLog('');
      addLog('📤 Updating Firestore...');
      await updateDoc(listRef, { history: cleanedHistory });

      addLog('');
      addLog('✅ CHANGES SAVED!');
      addLog(`✏️  Edited: ${editCount} entries`);
      addLog(`🗑️  Deleted: ${deleteCount} entries`);
      addLog(`📊 Total items: ${cleanedHistory.length}`);

      setPhase('done');
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
      addLog(`❌ Error: ${err.message}`);
      setPhase('editing');
    }
  };

  // Filter items based on search and filters
  const getFilteredEntries = () => {
    const entries: Array<{itemIndex: number; priceIndex: number; item: PurchaseHistoryItem; price: PriceHistory}> = [];

    history.forEach((item, itemIndex) => {
      if (!item.prices) return;

      // Search filter
      if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return;
      }

      item.prices.forEach((priceEntry, priceIndex) => {
        // Price filter
        if (filterPrice && priceEntry.price !== parseFloat(filterPrice)) {
          return;
        }

        // Store filter
        if (filterStore && (!priceEntry.store || !priceEntry.store.toLowerCase().includes(filterStore.toLowerCase()))) {
          return;
        }

        // Date range filter
        const entryDate = new Date(priceEntry.purchaseDate);
        if (filterDateFrom && entryDate < new Date(filterDateFrom)) {
          return;
        }
        if (filterDateTo && entryDate > new Date(filterDateTo)) {
          return;
        }

        entries.push({ itemIndex, priceIndex, item, price: priceEntry });
      });
    });

    return entries;
  };

  const filteredEntries = getFilteredEntries();
  const hasChanges = editedEntries.size > 0;
  const changesCount = Array.from(editedEntries.values()).filter(e => 
    e.markedForDeletion || 
    e.editedPrice !== e.originalPrice.price || 
    e.editedStore !== e.originalPrice.store ||
    (e.editedDate && e.editedDate !== e.originalPrice.purchaseDate.split('T')[0])
  ).length;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-lg z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">
              ✏️ Edit Purchase History
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>
          <p className="text-gray-600 mt-2">
            Edit or delete any purchase entry from your history
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {phase === 'loading' && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4"></div>
              <p className="text-gray-600">Loading purchase history...</p>
            </div>
          )}

          {phase === 'editing' && (
            <div>
              {/* Filters */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">🔍 Filters:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                  <input
                    type="text"
                    placeholder="Search product name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Filter by price..."
                    value={filterPrice}
                    onChange={(e) => setFilterPrice(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Filter by store..."
                    value={filterStore}
                    onChange={(e) => setFilterStore(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="date"
                    placeholder="From date..."
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="date"
                    placeholder="To date..."
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  Showing {filteredEntries.length} entries
                  {hasChanges && <span className="ml-2 text-blue-600 font-semibold">({changesCount} changes pending)</span>}
                </div>
              </div>

              {/* Entries List */}
              <div className="space-y-2 max-h-96 overflow-y-auto mb-6">
                {filteredEntries.map(({ itemIndex, priceIndex, item, price }) => {
                  const key = getEntryKey(itemIndex, priceIndex);
                  const edited = editedEntries.get(key);
                  const isDeleted = edited?.markedForDeletion;
                  const isEdited = edited && !isDeleted && (
                    edited.editedPrice !== price.price ||
                    edited.editedStore !== price.store ||
                    (edited.editedDate && edited.editedDate !== price.purchaseDate.split('T')[0])
                  );

                  return (
                    <div 
                      key={key} 
                      className={`border rounded-lg p-4 ${
                        isDeleted ? 'bg-red-50 border-red-300 opacity-50' : 
                        isEdited ? 'bg-blue-50 border-blue-300' : 
                        'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 mb-2">{item.name}</div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Price (₪)</label>
                              <input
                                type="number"
                                step="0.01"
                                disabled={isDeleted}
                                value={edited?.editedPrice ?? price.price}
                                onChange={(e) => handleEdit(itemIndex, priceIndex, 'price', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Store</label>
                              <input
                                type="text"
                                disabled={isDeleted}
                                value={edited?.editedStore ?? price.store ?? ''}
                                onChange={(e) => handleEdit(itemIndex, priceIndex, 'store', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Date</label>
                              <input
                                type="date"
                                disabled={isDeleted}
                                value={edited?.editedDate ?? price.purchaseDate.split('T')[0]}
                                onChange={(e) => handleEdit(itemIndex, priceIndex, 'date', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                              />
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(itemIndex, priceIndex)}
                          className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                            isDeleted 
                              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          {isDeleted ? '↩️ Undo' : '🗑️ Delete'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={applyChanges}
                  disabled={!hasChanges || changesCount === 0}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  💾 Save Changes ({changesCount})
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

          {phase === 'saving' && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent mb-4"></div>
              <p className="text-gray-600">Saving changes...</p>
            </div>
          )}

          {phase === 'done' && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Changes Saved!
              </h3>
              <p className="text-gray-600 mb-6">
                Your purchase history has been updated successfully.
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

