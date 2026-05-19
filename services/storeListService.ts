import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getFirebaseServices } from './firebaseService';

/** Add store name to groceryLists/{listId}.stores if not already present. */
export async function addStoreToList(listId: string, storeName: string): Promise<void> {
  const name = storeName?.trim();
  if (!listId || !name) return;

  const { db } = getFirebaseServices();
  const ref = doc(db, 'groceryLists', listId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const existing: string[] = Array.isArray(snap.data().stores) ? snap.data().stores : [];
  const lower = name.toLowerCase();
  if (existing.some((s) => String(s).toLowerCase() === lower)) return;

  await updateDoc(ref, { stores: [...existing, name] });
}

export async function getStoresForList(listId: string): Promise<string[]> {
  if (!listId) return [];
  const { db } = getFirebaseServices();
  const snap = await getDoc(doc(db, 'groceryLists', listId));
  if (!snap.exists()) return [];
  const stores = snap.data().stores;
  return Array.isArray(stores) ? stores.map(String) : [];
}
