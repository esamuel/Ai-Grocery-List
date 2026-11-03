import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  compareBasket,
  hasMarketData,
  listCities,
  searchProducts,
  type MarketCity,
  type MarketProduct,
  type StoreQuote,
} from '../services/marketPricesService';

/**
 * השוואת מחירים בסופרים — official chain prices (Price Transparency law).
 * User picks a city, builds a basket (search or import from the current list), gets every
 * branch in that city priced for the whole basket.
 */

interface BasketEntry {
  barcode: string;
  name: string;
  qty: number;
  fromListItem?: string;    // the list item this was matched from (for "swap" UX)
}

interface Props {
  onBack: () => void;
  currentItems: string[];   // names on the user's current grocery list
  language: 'en' | 'he' | 'es' | 'ru';
  rtl?: boolean;
}

const TEXT = {
  he: {
    title: 'השוואת מחירים בסופרים',
    subtitle: 'מחירים רשמיים שהרשתות מחויבות לפרסם לפי חוק שקיפות מחירים',
    back: 'חזרה',
    city: 'עיר / אזור מגורים',
    cityPlaceholder: 'למשל תל אביב',
    search: 'מה לקנות?',
    searchPlaceholder: 'חלב 3%, ביצים, לחם…',
    addFromList: 'הוסף מהרשימה שלי',
    basket: 'הסל שלי',
    emptyBasket: 'הסל ריק — חפש מוצר או ייבא מהרשימה',
    compare: 'השווה מחירים',
    comparing: 'משווה…',
    results: 'תוצאות',
    stores: 'סניפים',
    found: 'נמצאו',
    of: 'מתוך',
    total: 'סה"כ',
    cheapest: 'הכי זול',
    fullBasket: 'סל מלא',
    missing: 'חסר',
    updated: 'עודכן',
    noResults: 'לא נמצאו סניפים בעיר הזו עם המוצרים שבחרת',
    noData: 'עדיין אין נתוני מחירים. צריך להריץ את ה-collector (ראה collector/README.md).',
    notMatched: 'לא נמצאה התאמה עבור',
    perItem: 'לפי מוצר',
    byStore: 'לפי סניף',
    item: 'מוצר',
    inStores: 'ב-',
    remove: 'הסר',
    qty: 'כמות',
    error: 'שגיאה בטעינת הנתונים',
  },
  en: {
    title: 'Supermarket price comparison',
    subtitle: 'Official prices the chains must publish under the Price Transparency law',
    back: 'Back',
    city: 'City / area',
    cityPlaceholder: 'e.g. Tel Aviv',
    search: 'What to buy?',
    searchPlaceholder: 'milk 3%, eggs, bread…',
    addFromList: 'Add from my list',
    basket: 'My basket',
    emptyBasket: 'Basket is empty — search a product or import your list',
    compare: 'Compare prices',
    comparing: 'Comparing…',
    results: 'Results',
    stores: 'stores',
    found: 'found',
    of: 'of',
    total: 'Total',
    cheapest: 'Cheapest',
    fullBasket: 'Full basket',
    missing: 'missing',
    updated: 'updated',
    noResults: 'No stores in this city carry the products you picked',
    noData: 'No price data yet. Run the collector first (see collector/README.md).',
    notMatched: 'No match found for',
    perItem: 'By product',
    byStore: 'By store',
    item: 'Product',
    inStores: 'in ',
    remove: 'Remove',
    qty: 'Qty',
    error: 'Could not load data',
  },
} as const;

const fmt = (n: number | null | undefined) => (n === null || n === undefined ? '—' : `₪${n.toFixed(2)}`);
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('he-IL') : '');

export const MarketComparePage: React.FC<Props> = ({ onBack, currentItems, language, rtl = false }) => {
  const t = language === 'he' ? TEXT.he : TEXT.en;

  const [dataReady, setDataReady] = useState<boolean | null>(null);
  const [cities, setCities] = useState<MarketCity[]>([]);
  const [city, setCity] = useState<string>(() => localStorage.getItem('mp_city') || '');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<MarketProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [basket, setBasket] = useState<BasketEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem('mp_basket') || '[]'); } catch { return []; }
  });
  const [quotes, setQuotes] = useState<StoreQuote[] | null>(null);
  const [comparing, setComparing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [view, setView] = useState<'store' | 'item'>('store');
  const [openStore, setOpenStore] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounce = useRef<number | undefined>(undefined);

  useEffect(() => {
    hasMarketData().then(ok => {
      setDataReady(ok);
      if (ok) listCities().then(setCities).catch(() => setCities([]));
    });
  }, []);

  useEffect(() => { localStorage.setItem('mp_city', city); }, [city]);
  useEffect(() => { localStorage.setItem('mp_basket', JSON.stringify(basket)); }, [basket]);

  // live product search
  useEffect(() => {
    window.clearTimeout(debounce.current);
    if (query.trim().length < 2 || !city) { setSuggestions([]); return; }
    debounce.current = window.setTimeout(async () => {
      setSearching(true);
      try { setSuggestions(await searchProducts(query, city)); }
      catch { setSuggestions([]); }
      finally { setSearching(false); }
    }, 250);
    return () => window.clearTimeout(debounce.current);
  }, [query, city]);

  const addProduct = (p: MarketProduct, fromListItem?: string) => {
    setBasket(b => b.some(x => x.barcode === p.barcode)
      ? b.map(x => (x.barcode === p.barcode ? { ...x, qty: x.qty + 1 } : x))
      : [...b, { barcode: p.barcode, name: p.name, qty: 1, fromListItem }]);
    setQuery('');
    setSuggestions([]);
    setQuotes(null);
  };

  const setQty = (barcode: string, qty: number) =>
    setBasket(b => b.map(x => (x.barcode === barcode ? { ...x, qty: Math.max(1, qty) } : x)));
  const remove = (barcode: string) => { setBasket(b => b.filter(x => x.barcode !== barcode)); setQuotes(null); };

  /** Match each item on the user's list to the best-scoring product in this city. */
  const importFromList = async () => {
    if (!city || currentItems.length === 0) return;
    setImporting(true);
    setError(null);
    const miss: string[] = [];
    try {
      for (const name of currentItems) {
        if (basket.some(x => x.fromListItem === name)) continue;
        const hits = await searchProducts(name, city, 3);
        const best = hits[0];
        if (best && best.similarity >= 0.35) addProduct(best, name);
        else miss.push(name);
      }
      setUnmatched(miss);
    } catch (e) {
      setError(t.error);
    } finally {
      setImporting(false);
    }
  };

  const runCompare = async () => {
    if (!city || basket.length === 0) return;
    setComparing(true);
    setError(null);
    try {
      setQuotes(await compareBasket(city, basket.map(b => ({ barcode: b.barcode, qty: b.qty }))));
      setOpenStore(null);
    } catch (e) {
      setError(t.error);
      setQuotes([]);
    } finally {
      setComparing(false);
    }
  };

  // per-item view: for each basket line, the cheapest store(s)
  const perItem = useMemo(() => {
    if (!quotes) return [];
    return basket.map(b => {
      const offers = quotes
        .map(q => ({ q, line: q.lines.find(l => l.barcode === b.barcode) }))
        .filter(x => x.line && x.line.price !== null)
        .map(x => ({ store: `${x.q.chain_name} · ${x.q.store_name}`, price: x.line!.price as number }))
        .sort((a, b2) => a.price - b2.price);
      return { entry: b, offers };
    });
  }, [quotes, basket]);

  const bestTotal = quotes && quotes.length ? Math.min(...quotes.filter(q => q.items_found === q.items_total).map(q => q.total)) : null;

  return (
    <div className="space-y-5" dir={rtl ? 'rtl' : 'ltr'}>
      <button onClick={onBack} className="flex items-center gap-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 transition-colors">
        <span className={rtl ? 'inline-block rotate-180' : ''}>←</span> {t.back}
      </button>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🏪 {t.title}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t.subtitle}</p>
      </div>

      {dataReady === false && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-700 p-4 text-amber-800 dark:text-amber-200 text-sm">
          {t.noData}
        </div>
      )}

      {/* city */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 space-y-2">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">📍 {t.city}</label>
        <input
          list="mp-cities"
          value={city}
          onChange={e => { setCity(e.target.value); setQuotes(null); }}
          placeholder={t.cityPlaceholder}
          className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
        />
        <datalist id="mp-cities">
          {cities.map(c => <option key={c.city} value={c.city}>{`${c.stores} ${t.stores}`}</option>)}
        </datalist>
      </div>

      {/* search + import */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 space-y-3 relative">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">🔎 {t.search}</label>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t.searchPlaceholder}
          disabled={!city}
          className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none disabled:opacity-50"
        />
        {(suggestions.length > 0 || searching) && (
          <ul className="absolute inset-x-4 top-full -mt-2 z-20 max-h-72 overflow-auto rounded-xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
            {searching && suggestions.length === 0 && <li className="p-3 text-sm text-gray-500">…</li>}
            {suggestions.map(p => (
              <li key={p.barcode}>
                <button onClick={() => addProduct(p)} className="w-full text-start p-3 hover:bg-green-50 dark:hover:bg-gray-700 transition-colors">
                  <div className="font-medium text-gray-900 dark:text-white">{p.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-3">
                    {p.manufacturer && <span>{p.manufacturer}</span>}
                    <span>{fmt(p.min_price)}{p.max_price > p.min_price ? ` – ${fmt(p.max_price)}` : ''}</span>
                    <span>{t.inStores}{p.stores} {t.stores}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
        {currentItems.length > 0 && (
          <button
            onClick={importFromList}
            disabled={!city || importing}
            className="text-sm font-semibold text-green-700 dark:text-green-400 hover:underline disabled:opacity-50"
          >
            {importing ? '…' : `📋 ${t.addFromList} (${currentItems.length})`}
          </button>
        )}
        {unmatched.length > 0 && (
          <p className="text-xs text-amber-700 dark:text-amber-300">{t.notMatched}: {unmatched.join(', ')}</p>
        )}
      </div>

      {/* basket */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">🧺 {t.basket} ({basket.length})</h2>
        {basket.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t.emptyBasket}</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {basket.map(b => (
              <li key={b.barcode} className="flex items-center gap-3 py-2">
                <div className="flex-1 min-w-0">
                  <div className="truncate text-gray-900 dark:text-white">{b.name}</div>
                  {b.fromListItem && <div className="text-xs text-gray-400">← {b.fromListItem}</div>}
                </div>
                <input
                  type="number" min={1} value={b.qty} aria-label={t.qty}
                  onChange={e => setQty(b.barcode, parseInt(e.target.value) || 1)}
                  className="w-16 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-2 py-1 text-center text-gray-900 dark:text-white"
                />
                <button onClick={() => remove(b.barcode)} aria-label={t.remove} className="text-red-500 hover:text-red-700 px-2">✕</button>
              </li>
            ))}
          </ul>
        )}
        <button
          onClick={runCompare}
          disabled={!city || basket.length === 0 || comparing}
          className="w-full rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 shadow hover:opacity-95 disabled:opacity-40 transition"
        >
          {comparing ? t.comparing : `💰 ${t.compare}`}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {/* results */}
      {quotes && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t.results} ({quotes.length})</h2>
            <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 text-sm">
              <button onClick={() => setView('store')} className={`px-3 py-1 ${view === 'store' ? 'bg-green-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200'}`}>{t.byStore}</button>
              <button onClick={() => setView('item')} className={`px-3 py-1 ${view === 'item' ? 'bg-green-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200'}`}>{t.perItem}</button>
            </div>
          </div>

          {quotes.length === 0 && <p className="text-sm text-gray-500">{t.noResults}</p>}

          {view === 'store' && quotes.map(q => {
            const key = `${q.chain_id}-${q.store_id}`;
            const full = q.items_found === q.items_total;
            const isBest = full && bestTotal !== null && q.total === bestTotal;
            return (
              <div key={key} className={`bg-white dark:bg-gray-800 rounded-2xl shadow p-4 ${isBest ? 'ring-2 ring-green-500' : ''}`}>
                <button onClick={() => setOpenStore(openStore === key ? null : key)} className="w-full text-start">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-bold text-gray-900 dark:text-white truncate">
                        {isBest && <span className="me-1">🏆</span>}{q.chain_name} · {q.store_name}
                      </div>
                      {q.address && <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{q.address}</div>}
                      <div className="text-xs mt-1">
                        {full
                          ? <span className="text-green-600 dark:text-green-400">✓ {t.fullBasket}</span>
                          : <span className="text-amber-600 dark:text-amber-400">{t.found} {q.items_found} {t.of} {q.items_total} · {q.items_total - q.items_found} {t.missing}</span>}
                        {q.prices_updated_at && <span className="text-gray-400"> · {t.updated} {fmtDate(q.prices_updated_at)}</span>}
                      </div>
                    </div>
                    <div className="text-end shrink-0">
                      <div className={`text-xl font-extrabold ${isBest ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>{fmt(q.total)}</div>
                      {isBest && <div className="text-xs text-green-600 dark:text-green-400">{t.cheapest}</div>}
                    </div>
                  </div>
                </button>
                {openStore === key && (
                  <ul className="mt-3 border-t border-gray-100 dark:border-gray-700 pt-2 text-sm divide-y divide-gray-50 dark:divide-gray-700/50">
                    {basket.map(b => {
                      const line = q.lines.find(l => l.barcode === b.barcode);
                      return (
                        <li key={b.barcode} className="flex justify-between py-1.5 gap-3">
                          <span className="truncate text-gray-700 dark:text-gray-200">{b.name}{b.qty > 1 ? ` ×${b.qty}` : ''}</span>
                          <span className={line?.price === null || line?.price === undefined ? 'text-gray-400' : 'text-gray-900 dark:text-white'}>
                            {line?.price === null || line?.price === undefined ? t.missing : fmt(line.line_total)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}

          {view === 'item' && perItem.map(({ entry, offers }) => (
            <div key={entry.barcode} className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4">
              <div className="font-bold text-gray-900 dark:text-white">{entry.name}</div>
              {offers.length === 0 ? (
                <div className="text-sm text-gray-400">{t.missing}</div>
              ) : (
                <ul className="mt-2 text-sm space-y-1">
                  {offers.slice(0, 5).map((o, i) => (
                    <li key={o.store} className="flex justify-between gap-3">
                      <span className="truncate text-gray-700 dark:text-gray-200">{i === 0 ? '🏆 ' : ''}{o.store}</span>
                      <span className={i === 0 ? 'font-bold text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}>{fmt(o.price)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MarketComparePage;
