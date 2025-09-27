import React from 'react';
import type { SuggestedItem } from '../services/suggestionsService';

type Language = 'en' | 'he' | 'es';

interface SuggestionsListProps {
  suggestions: SuggestedItem[];
  language: Language;
  onAdd: (name: string, category?: string) => void;
}

const labels: Record<Language, { title: string; subtitle: string; add: string; empty: string } > = {
  en: { title: 'Suggestions', subtitle: 'Items you often use. Tap to add to your list.', add: 'Add', empty: 'No suggestions yet' },
  he: { title: 'הצעות', subtitle: 'פריטים שאתה משתמש בהם לעיתים קרובות. לחץ להוספה לרשימה.', add: 'הוסף', empty: 'עדיין אין הצעות' },
  es: { title: 'Sugerencias', subtitle: 'Artículos que usas a menudo. Toca para agregar a tu lista.', add: 'Añadir', empty: 'Aún no hay sugerencias' },
};

export const SuggestionsList: React.FC<SuggestionsListProps> = ({ suggestions, language, onAdd }) => {
  const t = labels[language];
  type SortMode = 'alpha' | 'category';
  const PREF_KEY = 'suggestions_sort_mode_v1';
  const [sortMode, setSortMode] = React.useState<SortMode>(() => {
    const saved = localStorage.getItem(PREF_KEY) as SortMode | null;
    return saved === 'category' ? 'category' : 'alpha';
  });

  const sortLabels: Record<Language, { alpha: string; category: string }> = {
    en: { alpha: 'Alphabetical', category: 'By Category' },
    he: { alpha: 'אלפביתי', category: 'לפי קטגוריה' },
    es: { alpha: 'Alfabético', category: 'Por categoría' },
  };

  const changeMode = (mode: SortMode) => {
    setSortMode(mode);
    localStorage.setItem(PREF_KEY, mode);
  };

  // Track items added from this view to disable 'Add' buttons
  const [added, setAdded] = React.useState<Set<string>>(new Set());
  const addedKey = (name: string) => name.trim().toLowerCase();
  const markAdded = (name: string) => setAdded(prev => {
    const n = new Set(prev);
    n.add(addedKey(name));
    return n;
  });

  const addedLabel: Record<Language, string> = {
    en: 'Added',
    he: 'נוסף',
    es: 'Añadido',
  };

  // Total count of suggestions
  const totalCount = suggestions.length;

  const sorted = React.useMemo(() => {
    if (sortMode === 'alpha') {
      return [...suggestions].sort((a, b) => a.name.localeCompare(b.name, language));
    }
    // Group by category
    const groups: Record<string, SuggestedItem[]> = {};
    for (const s of suggestions) {
      const key = s.category || '';
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    }
    const orderedCategories = Object.keys(groups).sort((a, b) => a.localeCompare(b || '', language));
    orderedCategories.forEach(cat => groups[cat].sort((a, b) => a.name.localeCompare(b.name, language)));
    return { groups, orderedCategories } as const;
  }, [suggestions, sortMode, language]);

  return (
    <section>
      <div className="max-w-sm sm:max-w-md md:max-w-lg mx-auto w-full">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
            {t.title}
            <span className="ml-2 align-middle text-xs sm:text-sm font-medium text-gray-500">({totalCount})</span>
          </h2>
          <p className="text-gray-600 text-sm sm:text-base">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => changeMode('alpha')}
            className={`px-2.5 py-1 text-xs sm:text-sm rounded-md border ${sortMode === 'alpha' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-300'}`}
          >
            {sortLabels[language].alpha}
          </button>
          <button
            onClick={() => changeMode('category')}
            className={`px-2.5 py-1 text-xs sm:text-sm rounded-md border ${sortMode === 'category' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-300'}`}
          >
            {sortLabels[language].category}
          </button>
        </div>
      </div>

      {suggestions.length === 0 ? (
        <div className="text-gray-500 bg-white rounded-xl p-6 text-center border">{t.empty}</div>
      ) : sortMode === 'alpha' ? (
        <ul className="space-y-1">
          {(sorted as SuggestedItem[]).map((s) => (
            <li key={s.name} className="bg-white rounded-xl p-1 flex items-center justify-between border">
              <div className="flex-1 min-w-0">
                <div className="text-gray-800 font-medium truncate text-xs sm:text-sm leading-5">{s.name}</div>
                <div className="text-[10px] sm:text-[11px] text-gray-500 leading-4">
                  {s.category || ''}{s.category ? ' · ' : ''}{s.frequency}x
                </div>
              </div>
              <button
                onClick={() => { onAdd(s.name, s.category); markAdded(s.name); }}
                disabled={added.has(addedKey(s.name))}
                aria-disabled={added.has(addedKey(s.name))}
                className={`px-2 py-0.5 rounded-lg text-[11px] sm:text-xs transition-colors ${
                  added.has(addedKey(s.name))
                    ? 'bg-gray-200 text-gray-500 cursor-default'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {added.has(addedKey(s.name)) ? addedLabel[language] : t.add}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="space-y-4">
          {(sorted as { groups: Record<string, SuggestedItem[]>; orderedCategories: string[] }).orderedCategories.map(cat => (
            <div key={cat || 'uncategorized'}>
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                  {(() => {
                    if (!cat) return language === 'he' ? 'ללא קטגוריה' : language === 'es' ? 'Sin categoría' : 'Uncategorized';
                    if (language === 'he') {
                      const normalized = cat.replace(/["״]/g, '').trim();
                      if (['אחר', 'Other'].includes(normalized)) return 'מזווה';
                    }
                    return cat;
                  })()}
                  <span className="ml-2 align-middle text-xs sm:text-sm font-medium text-gray-500">
                    ({(sorted as { groups: Record<string, SuggestedItem[]>; orderedCategories: string[] }).groups[cat].length})
                  </span>
                </h3>
              </div>
              <ul className="space-y-1">
                {(sorted as { groups: Record<string, SuggestedItem[]>; orderedCategories: string[] }).groups[cat].map(s => (
                  <li key={`${cat}-${s.name}`} className="bg-white rounded-xl p-1 flex items-center justify-between border">
                    <div className="flex-1 min-w-0">
                      <div className="text-gray-800 font-medium truncate text-xs sm:text-sm leading-5">{s.name}</div>
                      <div className="text-[10px] sm:text-[11px] text-gray-500 leading-4">
                        {s.frequency}x
                      </div>
                    </div>
                    <button
                      onClick={() => { onAdd(s.name, s.category); markAdded(s.name); }}
                      disabled={added.has(addedKey(s.name))}
                      aria-disabled={added.has(addedKey(s.name))}
                      className={`px-2 py-0.5 rounded-lg text-[11px] sm:text-xs transition-colors ${
                        added.has(addedKey(s.name))
                          ? 'bg-gray-200 text-gray-500 cursor-default'
                          : 'bg-green-500 text-white hover:bg-green-600'
                      }`}
                    >
                      {added.has(addedKey(s.name)) ? addedLabel[language] : t.add}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      </div>
    </section>
  );
}
;
