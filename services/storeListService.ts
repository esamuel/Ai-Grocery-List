import { getListDoc, patchListDoc } from './supabaseService';

/** Add store name to the list's `stores` array if not already present. */
export async function addStoreToList(listId: string, storeName: string): Promise<void> {
  const name = storeName?.trim();
  if (!listId || !name) return;
  const data = await getListDoc(listId);
  if (!data) return;
  const existing: string[] = Array.isArray(data.stores) ? data.stores : [];
  const lower = name.toLowerCase();
  if (existing.some((s) => String(s).toLowerCase() === lower)) return;
  await patchListDoc(listId, { stores: [...existing, name] });
}

export async function getStoresForList(listId: string): Promise<string[]> {
  if (!listId) return [];
  const data = await getListDoc(listId);
  const stores = data?.stores;
  return Array.isArray(stores) ? stores.map(String) : [];
}
