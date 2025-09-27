export interface SuggestedItem {
  name: string;
  category?: string;
  frequency: number; // number of times seen in past shopping
  lastAdded?: string; // ISO date
}

const STORAGE_KEY = 'grocery_suggestions_v1';

type Language = 'en' | 'he' | 'es';

type SuggestionsState = {
  [lang in Language]?: SuggestedItem[];
};

function readState(): SuggestionsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeState(state: SuggestionsState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function getSuggestions(language: Language): SuggestedItem[] {
  const state = readState();
  return [...(state[language] || [])].sort((a, b) => (b.frequency - a.frequency) || a.name.localeCompare(b.name));
}

export function upsertSuggestions(language: Language, items: SuggestedItem[]) {
  const state = readState();
  const current = state[language] || [];
  const map = new Map<string, SuggestedItem>();
  current.forEach(i => map.set(i.name.toLowerCase(), i));
  items.forEach(i => {
    const key = i.name.toLowerCase();
    const existing = map.get(key);
    if (existing) {
      map.set(key, {
        ...existing,
        category: i.category || existing.category,
        frequency: Math.max(existing.frequency, i.frequency || 1),
        lastAdded: i.lastAdded || existing.lastAdded,
      });
    } else {
      map.set(key, { name: i.name, category: i.category, frequency: i.frequency || 1, lastAdded: i.lastAdded });
    }
  });
  state[language] = Array.from(map.values());
  writeState(state);
}

export function addOrIncrementFromPurchased(language: Language, purchased: { name: string; category?: string }[]) {
  const state = readState();
  const arr = state[language] || [];
  const map = new Map<string, SuggestedItem>();
  arr.forEach(i => map.set(i.name.toLowerCase(), i));

  const now = new Date().toISOString();
  purchased.forEach(p => {
    const key = p.name.toLowerCase();
    const found = map.get(key);
    if (found) {
      found.frequency += 1;
      found.lastAdded = now;
      if (p.category && !found.category) found.category = p.category;
    } else {
      map.set(key, { name: p.name, category: p.category, frequency: 1, lastAdded: now });
    }
  });

  state[language] = Array.from(map.values());
  writeState(state);
}

export function removeSuggestion(language: Language, name: string) {
  const state = readState();
  const arr = state[language] || [];
  state[language] = arr.filter(i => i.name.toLowerCase() !== name.toLowerCase());
  writeState(state);
}
