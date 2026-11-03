/**
 * Official chain prices (חוק שקיפות מחירים), loaded into Supabase by collector/.
 * Read-only from the app: three RPCs defined in supabase/migrations/20261103_market_prices.sql.
 */
import { getSupabase } from './supabaseClient';

export interface MarketCity {
  city: string;
  stores: number;
}

export interface MarketProduct {
  barcode: string;
  name: string;
  manufacturer: string | null;
  quantity: number | null;
  unit: string | null;
  min_price: number;
  max_price: number;
  stores: number;
  similarity: number;
}

export interface BasketLine {
  barcode: string;
  qty: number;
  price: number | null;
  line_total: number | null;
}

export interface StoreQuote {
  chain_id: string;
  chain_name: string;
  store_id: string;
  store_name: string;
  address: string | null;
  items_found: number;
  items_total: number;
  total: number;
  prices_updated_at: string | null;
  lines: BasketLine[];
}

export interface BasketRequestItem {
  barcode: string;
  qty: number;
}

export async function listCities(): Promise<MarketCity[]> {
  const { data, error } = await getSupabase().rpc('mp_cities');
  if (error) throw error;
  return (data ?? []) as MarketCity[];
}

export async function searchProducts(query: string, city: string, limit = 15): Promise<MarketProduct[]> {
  const q = query.trim();
  if (q.length < 2 || !city) return [];
  const { data, error } = await getSupabase().rpc('mp_search_products', { q, p_city: city, p_limit: limit });
  if (error) throw error;
  return ((data ?? []) as MarketProduct[]).map(p => ({
    ...p,
    min_price: Number(p.min_price),
    max_price: Number(p.max_price),
    stores: Number(p.stores),
  }));
}

export async function compareBasket(city: string, items: BasketRequestItem[]): Promise<StoreQuote[]> {
  if (!city || items.length === 0) return [];
  const { data, error } = await getSupabase().rpc('mp_compare_basket', { p_city: city, p_items: items });
  if (error) throw error;
  return ((data ?? []) as StoreQuote[]).map(s => ({
    ...s,
    total: Number(s.total),
    lines: (s.lines ?? []).map(l => ({
      ...l,
      qty: Number(l.qty),
      price: l.price === null ? null : Number(l.price),
      line_total: l.line_total === null ? null : Number(l.line_total),
    })),
  }));
}

/** True when the collector has loaded anything at all (used to show a friendly "no data yet" state). */
export async function hasMarketData(): Promise<boolean> {
  const { count, error } = await getSupabase().from('mp_stores').select('*', { count: 'exact', head: true });
  if (error) return false;
  return (count ?? 0) > 0;
}
