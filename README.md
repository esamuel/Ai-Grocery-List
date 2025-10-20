<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1cD0q1XwbhXf0YPie_TZGmGODvHC_-sGW

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

---

# Feature Overview & Recent Enhancements

This AI Grocery List app is a React + TypeScript + Vite application with Google Gemini AI for categorization, Firebase/Firestore for sync, and speech recognition with multi-language support (EN/HE/ES).

## Core Features

- Modern, responsive UI with RTL support for Hebrew.
- AI categorization of items using Gemini, with local fallback and caching.
- Multi-language UI and speech recognition (English, Hebrew, Spanish) with auto-detection on first visit.
- Real-time sync with Firebase/Firestore and persistent authentication.
- Purchase history with smart features:
  - **Most Frequent**: Shows user's actual purchase history (top 40 most frequent items, dynamically updated based on shopping activity)
  - **Starred**: Pre-populated starter items (200 grocery items per language/market: Hebrew/Israel, English/USA, Spanish/Latin America)
  - **Today**: Items purchased today
  - **Category**: Sorted by category
  - **Alphabetical**: A-Z sorting

## New: Settings (Gear) Modal

- Centralized settings in a gear icon at the header.
- Consolidated actions:
  - Language selector (EN / עבר / ES)
  - Import / Export
  - Add Family (visible to list owners)
  - Sign Out
- Files/Components:
  - `App.tsx` (header gear, modal wiring)
  - `components/icons/GearIcon.tsx`

## New: Toast (Snackbar) Notifications

- Reusable, bottom-centered toast for feedback.
- Variants: info, success, error, warning.
- Localized duplicate message: "Item already added" / "הפריט כבר נוסף" / "Artículo ya agregado".
- Uses a portal with high z-index to avoid being hidden on mobile.
- Files/Components:
  - `components/Toast.tsx`
  - Wiring in `App.tsx` (state + render)

## Voice Input Improvements

- Auto-add on mic stop (no need to press Add).
- Comma/conjunction splitting into multiple items (and / ו / y), and punctuation trimming.
- Duplicate token collapse to avoid repeated words from recognition.
- Implemented in `components/ItemInput.tsx` with a `segmentAndClean()` helper.

## Suggestions UI Updates

- Sorting control with persistence (Alphabetical / By Category).
- Narrower cards and reduced height for a compact mobile-friendly look.
- Add button now dims and changes label to localized "Added" after click.
- Hebrew category label fix: "אחר״" shown as "מזווה" in grouped view.
- Implemented in `components/SuggestionsList.tsx`.

## Semantic Duplicate Detection (Cross-Language)

- Centralized service detects duplicates across EN/HE/ES (e.g., milk=חלב=leche).
- Applied to all add paths:
  - Manual/voice add (`handleAddItem` in `App.tsx`)
  - Add from Suggestions
  - Add from Favorites
  - Add All in Category
- Shows a localized warning toast and skips insert when a duplicate is detected.
- Files:
  - `services/semanticDupService.ts` (normalize + isSemanticDuplicate)
  - Usage in `App.tsx`

## Smart Suggestions

- Sorting (alpha/category) with `localStorage` persistence.
- Localized category headings.
- Item name localization in Smart Suggestions cards.

## Family Members & Auth (Persistent)

- Email-based auth and persistent lists for the main user.
- Add family members by email (owners only).
- Family members automatically get access to the shared list.

## Environment & Deployment

- Environment: Vite expects `VITE_` prefix for client env vars.
  - Set `VITE_GEMINI_API_KEY` in `.env.local`.
- Deploy target: Netlify
  - Build: `npm run build`
  - Deploy: `netlify deploy --prod --dir=dist`

## Tech Stack

- React 19, TypeScript, Vite
- Firebase Auth + Firestore
- Google Gemini (@google/genai)
- Tailwind-style utility classes for styling

## Key Paths

- `App.tsx`: App shell, views, settings modal, toasts, add handlers
- `components/ItemInput.tsx`: Voice input and auto-submit logic
- `components/FavoritesPage.tsx`: Purchase history with Most Frequent (max 40) and Starred (200 pre-populated items)
- `components/SuggestionsList.tsx`: Suggestions view and UI
- `components/Toast.tsx`: Toast (snackbar)
- `data/starterItems.ts`: Pre-populated starter items for Hebrew/Israel, English/USA, and Spanish/Latin America markets
- `services/semanticDupService.ts`: Cross-language dedup
- `services/geminiService.ts`: AI categorization and translation (import path)
- `services/importService.ts`: Import/export and semantic dedup on import

---

If you need additional improvements (e.g., more translations for duplicates, branded colors for toasts, or extended analytics), open an issue or create a feature request.
