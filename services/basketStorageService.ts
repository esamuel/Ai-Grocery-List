import { getSupabase, nowIso } from './supabaseClient';
import { ComparisonBasket, BasketType } from '../types';

// Table: gl_baskets(id = `${listId}_${basketId}`, list_id, data jsonb, deleted)

export const saveBasket = async (listId: string, basket: ComparisonBasket): Promise<void> => {
  const { error } = await getSupabase().from('gl_baskets').upsert(
    { id: `${listId}_${basket.id}`, list_id: listId, data: { ...basket, updatedAt: nowIso() }, deleted: false },
    { onConflict: 'id' }
  );
  if (error) {
    console.error('❌ Error saving basket:', error);
    throw error;
  }
  console.log('✅ Basket saved:', basket.id);
};

export const loadBasket = async (listId: string, basketId: string): Promise<ComparisonBasket | null> => {
  try {
    const { data, error } = await getSupabase()
      .from('gl_baskets').select('data').eq('id', `${listId}_${basketId}`).eq('deleted', false).maybeSingle();
    if (error) throw error;
    return (data?.data as ComparisonBasket) ?? null;
  } catch (error) {
    console.error('❌ Error loading basket:', error);
    return null;
  }
};

export const loadAllBaskets = async (listId: string): Promise<ComparisonBasket[]> => {
  try {
    const { data, error } = await getSupabase()
      .from('gl_baskets').select('data').eq('list_id', listId).eq('deleted', false);
    if (error) throw error;
    const baskets = (data || []).map((r: any) => r.data as ComparisonBasket);
    baskets.sort((a, b) => (a.type === b.type ? 0 : a.type === 'weekly' ? -1 : 1));
    console.log(`✅ Loaded ${baskets.length} baskets for list ${listId}`);
    return baskets;
  } catch (error) {
    console.error('❌ Error loading baskets:', error);
    return [];
  }
};

export const loadBasketByType = async (listId: string, type: BasketType): Promise<ComparisonBasket | null> => {
  try {
    const { data, error } = await getSupabase()
      .from('gl_baskets').select('data').eq('list_id', listId).eq('deleted', false).eq('data->>type', type);
    if (error) throw error;
    const baskets = (data || []).map((r: any) => r.data as ComparisonBasket);
    if (!baskets.length) return null;
    baskets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return baskets[0];
  } catch (error) {
    console.error('❌ Error loading basket by type:', error);
    return null;
  }
};

export const deleteBasket = async (listId: string, basketId: string): Promise<void> => {
  const { error } = await getSupabase().from('gl_baskets').update({ deleted: true }).eq('id', `${listId}_${basketId}`);
  if (error) {
    console.error('❌ Error deleting basket:', error);
    throw error;
  }
  console.log('✅ Basket deleted:', basketId);
};
