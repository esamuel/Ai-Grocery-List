/**
 * CRITICAL FIX: Load purchase history from BOTH 'groceryLists' and 'lists' collections
 * Your Firestore has data in multiple locations!
 */
import type { PurchaseHistoryItem } from '../types';

const docLite = (db: any, collection: string, docId: string) => {
  // Firestore Lite uses getDocLite 
  return { _key: { path: { segments: [collection, docId] } } };
};

async function loadFromFirestore(db: any, collection: string, listId: string): Promise<PurchaseHistoryItem[]> {
  try {
    const { getDocLite } = await import('firebase/firestore/lite');
    const { doc } = await import('firebase/firestore');
    
    const docRef = doc(db, collection, listId);
    const snap = await getDocLite(docRef);
    
    if (!snap.exists()) {
      return [];
    }
    
    const data = snap.data();
    return (data?.history || []) as PurchaseHistoryItem[];
  } catch (error) {
    console.error(`Failed to load from ${collection}:`, error);
    return [];
  }
}

export async function loadFromBothCollections(db: any, listId: string): Promise<{ source: string, items: PurchaseHistoryItem[] }> {
  console.log(`\n🔍 LOADING FROM BOTH COLLECTIONS\n`);
  
  // Try groceryLists first (where app normally reads)
  console.log('📍 Checking collection: groceryLists');
  const groceryListsData = await loadFromFirestore(db, 'groceryLists', listId);
  console.log(`   Found: ${groceryListsData.length} items`);
  
  // Try lists second (where your October/November data is!)
  console.log('📍 Checking collection: lists');
  const listsData = await loadFromFirestore(db, 'lists', listId);
  console.log(`   Found: ${listsData.length} items`);
  
  // Use whichever has more data
  if (listsData.length > groceryListsData.length) {
    console.log(`\n✅ FOUND IT! Using 'lists' collection with ${listsData.length} items`);
    return { source: 'lists', items: listsData };
  }
  
  if (groceryListsData.length > 0) {
    console.log(`\n✅ Using 'groceryLists' collection with ${groceryListsData.length} items`);
    return { source: 'groceryLists', items: groceryListsData };
  }
  
  console.log(`\n❌ No data found in either collection`);
  return { source: 'none', items: [] };
}

