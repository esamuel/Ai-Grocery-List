import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { getFirebaseServices } from './firebaseService';
import { ComparisonBasket, BasketType } from '../types';

const BASKETS_COLLECTION = 'comparisonBaskets';

/**
 * Save basket to Firestore
 */
export const saveBasket = async (
  listId: string,
  basket: ComparisonBasket
): Promise<void> => {
  try {
    const { db } = getFirebaseServices();
    const basketRef = doc(db, BASKETS_COLLECTION, `${listId}_${basket.id}`);
    
    await setDoc(basketRef, {
      ...basket,
      listId, // Associate with grocery list
      updatedAt: new Date().toISOString()
    });
    
    console.log('✅ Basket saved:', basket.id);
  } catch (error) {
    console.error('❌ Error saving basket:', error);
    throw error;
  }
};

/**
 * Load basket from Firestore
 */
export const loadBasket = async (
  listId: string,
  basketId: string
): Promise<ComparisonBasket | null> => {
  try {
    const { db } = getFirebaseServices();
    const basketRef = doc(db, BASKETS_COLLECTION, `${listId}_${basketId}`);
    const basketSnap = await getDoc(basketRef);
    
    if (basketSnap.exists()) {
      const data = basketSnap.data();
      // Remove listId before returning
      const { listId: _, ...basket } = data;
      return basket as ComparisonBasket;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error loading basket:', error);
    return null;
  }
};

/**
 * Load all baskets for a list
 */
export const loadAllBaskets = async (
  listId: string
): Promise<ComparisonBasket[]> => {
  try {
    const { db } = getFirebaseServices();
    const basketsQuery = query(
      collection(db, BASKETS_COLLECTION),
      where('listId', '==', listId)
    );
    
    const querySnapshot = await getDocs(basketsQuery);
    const baskets: ComparisonBasket[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const { listId: _, ...basket } = data;
      baskets.push(basket as ComparisonBasket);
    });
    
    // Sort by type (weekly first, then monthly)
    baskets.sort((a, b) => {
      if (a.type === b.type) return 0;
      return a.type === 'weekly' ? -1 : 1;
    });
    
    console.log(`✅ Loaded ${baskets.length} baskets for list ${listId}`);
    return baskets;
  } catch (error) {
    console.error('❌ Error loading baskets:', error);
    return [];
  }
};

/**
 * Load basket by type (weekly or monthly)
 */
export const loadBasketByType = async (
  listId: string,
  type: BasketType
): Promise<ComparisonBasket | null> => {
  try {
    const { db } = getFirebaseServices();
    const basketsQuery = query(
      collection(db, BASKETS_COLLECTION),
      where('listId', '==', listId),
      where('type', '==', type)
    );
    
    const querySnapshot = await getDocs(basketsQuery);
    
    if (!querySnapshot.empty) {
      // Get the most recent basket of this type
      const baskets = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const { listId: _, ...basket } = data;
        return basket as ComparisonBasket;
      });
      
      baskets.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      
      return baskets[0];
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error loading basket by type:', error);
    return null;
  }
};

/**
 * Delete basket from Firestore
 */
export const deleteBasket = async (
  listId: string,
  basketId: string
): Promise<void> => {
  try {
    const { db } = getFirebaseServices();
    const basketRef = doc(db, BASKETS_COLLECTION, `${listId}_${basketId}`);
    
    await setDoc(basketRef, { deleted: true }, { merge: true });
    console.log('✅ Basket deleted:', basketId);
  } catch (error) {
    console.error('❌ Error deleting basket:', error);
    throw error;
  }
};

