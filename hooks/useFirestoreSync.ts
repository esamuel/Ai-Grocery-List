import { useState, useEffect, useCallback } from 'react';
import { subscribeToList, updateList } from '../services/firebaseService';
import type { GroceryItem, PurchaseHistoryItem, GroceryListData } from '../types';

/**
 * Sanitizes raw data from Firestore or application state to ensure it is a
 * plain JavaScript object that can be safely serialized and stored in React state.
 * This prevents "circular structure" errors by converting complex Firestore types
 * (like Timestamps) into plain, serializable equivalents.
 * @param data The potentially complex data object.
 * @returns A clean, serializable GroceryListData object.
 */
const sanitizeListData = (data: any): GroceryListData => {
    // Ensure we start with a clean slate.
    const cleanData: GroceryListData = {
        items: [],
        history: [],
    };

    if (data && Array.isArray(data.items)) {
        cleanData.items = data.items.map((item: any) => ({
            id: item && item.id ? String(item.id) : '',
            name: item && item.name ? String(item.name) : '',
            completed: item ? !!item.completed : false,
            category: item && item.category ? String(item.category) : 'Uncategorized',
        }));
    }

    if (data && Array.isArray(data.history)) {
        cleanData.history = data.history.map((historyItem: any) => {
            const now = new Date().toISOString();
            
            // Helper to convert various date formats to ISO string
            const parseDateField = (field: any): string => {
                if (!field) return now;
                if (typeof field === 'string') return field;
                if (field instanceof Date) return field.toISOString();
                if (typeof field === 'object' && field !== null && typeof field.toDate === 'function') {
                    return field.toDate().toISOString();
                }
                if (typeof field === 'object' && field !== null && typeof field.seconds === 'number') {
                    return new Date(field.seconds * 1000).toISOString();
                }
                return now;
            };

            // Handle legacy data (lastAdded) and new data (lastPurchased/firstPurchased)
            const lastPurchased = parseDateField(historyItem?.lastPurchased || historyItem?.lastAdded);
            const firstPurchased = parseDateField(historyItem?.firstPurchased || historyItem?.lastAdded);

            return {
                name: historyItem && historyItem.name ? String(historyItem.name) : '',
                category: historyItem && historyItem.category ? String(historyItem.category) : '',
                frequency: historyItem && historyItem.frequency ? Number(historyItem.frequency) : 0,
                lastPurchased,
                firstPurchased,
                avgDaysBetween: historyItem && historyItem.avgDaysBetween ? Number(historyItem.avgDaysBetween) : undefined,
                starred: historyItem ? !!historyItem.starred : undefined,
                tags: historyItem && Array.isArray(historyItem.tags) ? historyItem.tags : undefined,
            };
        });
    }

    return cleanData;
};


export const useFirestoreSync = (listId: string | null) => {
    const [data, setData] = useState<GroceryListData>({ items: [], history: [] });
    const [isSyncing, setIsSyncing] = useState(true);

    useEffect(() => {
        if (!listId) {
            setData({ items: [], history: [] });
            setIsSyncing(false);
            return;
        }

        // Handle offline mode
        if (listId.startsWith('offline-')) {
            console.log('Using offline mode for list ID:', listId);
            const savedData = localStorage.getItem(`groceryList:${listId}`);
            if (savedData) {
                try {
                    const parsedData = JSON.parse(savedData);
                    setData(sanitizeListData(parsedData));
                } catch (e) {
                    console.warn('Failed to parse offline data:', e);
                    setData({ items: [], history: [] });
                }
            } else {
                setData({ items: [], history: [] });
            }
            setIsSyncing(false);
            return;
        }

        console.log('Setting up sync for list ID:', listId);
        setIsSyncing(true);
        const unsubscribe = subscribeToList(listId, (listData) => {
            // Sanitize all incoming data from Firestore before setting state.
            const plainData = sanitizeListData(listData);
            console.log('Received list data:', plainData);
            setData(plainData);
            setIsSyncing(false);
        });

        return () => unsubscribe();
    }, [listId]);
    
    const updateData = useCallback((updater: (prev: GroceryListData) => GroceryListData) => {
        if (!listId) return;
        
        setData(currentData => {
            const newData = updater(currentData);
            
            // Before updating Firestore or the local state, ensure the new data is clean.
            // This is crucial for optimistic updates to prevent state contamination.
            const cleanNewData = sanitizeListData(newData);

            // Handle offline mode
            if (listId.startsWith('offline-')) {
                localStorage.setItem(`groceryList:${listId}`, JSON.stringify(cleanNewData));
                console.log('Saved to offline storage:', listId);
            } else {
                updateList(listId, cleanNewData).catch(error => {
                    console.error("Failed to update list in Firestore:", error);
                    // Note: In a real app, you might want to revert the optimistic update on failure.
                });
            }

            return cleanNewData;
        });
    }, [listId]);

    const setItems = useCallback((itemsUpdater: GroceryItem[] | ((prev: GroceryItem[]) => GroceryItem[])) => {
        updateData(prevData => ({
            ...prevData,
            items: typeof itemsUpdater === 'function' ? itemsUpdater(prevData.items) : itemsUpdater,
        }));
    }, [updateData]);



    const setHistoryItems = useCallback((historyUpdater: PurchaseHistoryItem[] | ((prev: PurchaseHistoryItem[]) => PurchaseHistoryItem[])) => {
        updateData(prevData => ({
            ...prevData,
            history: typeof historyUpdater === 'function' ? historyUpdater(prevData.history) : historyUpdater,
        }));
    }, [updateData]);


    return {
        items: data.items,
        historyItems: data.history,
        setItems,
        setHistoryItems,
        isSyncing
    };
};