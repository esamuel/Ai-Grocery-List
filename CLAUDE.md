# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Grocery List is a multi-language (English/Hebrew/Spanish) React PWA that uses Google Gemini AI for intelligent grocery item categorization. The app features real-time Firebase sync, family list sharing, purchase history tracking, price comparison, and subscription-based monetization (Stripe/PayPal).

## Commands

### Development
```bash
npm run dev          # Start Vite dev server (http://localhost:5173)
npm run build        # Build for production (outputs to dist/)
npm run preview      # Preview production build locally
```

### Deployment
```bash
netlify deploy --prod --dir=dist    # Deploy to production
npx firebase deploy --only firestore:rules  # Deploy Firestore security rules
```

## Environment Setup

Required environment variables in `.env.local` (see [.env.local.example](.env.local.example)):
- `VITE_GEMINI_API_KEY` - Google Gemini AI API key
- `VITE_FIREBASE_*` - Firebase client config (7 variables)

**Important**: All client-side env vars MUST be prefixed with `VITE_` for Vite to expose them.

## Architecture

### Core Data Flow

1. **Authentication & List Access**
   - Firebase Auth handles user login/signup
   - Each user gets a personal grocery list (document ID = user UID)
   - Lists support family sharing via `ownerId` and `members` array fields
   - [firebaseService.ts](services/firebaseService.ts) manages auth and list access logic

2. **Item Categorization Pipeline**
   - User adds items via [ItemInput.tsx](components/ItemInput.tsx) (text or voice)
   - Voice input auto-segments on commas/conjunctions and removes duplicate tokens
   - [semanticDupService.ts](services/semanticDupService.ts) checks for cross-language duplicates (milk=חלב=leche)
   - [geminiService.ts](services/geminiService.ts) categorizes items via Gemini AI with local fallback
   - [localCategorizationService.ts](services/localCategorizationService.ts) provides offline categorization
   - Items added to Firestore and synced via [useFirestoreSync.ts](hooks/useFirestoreSync.ts)

3. **Firestore Sync Strategy**
   - Real-time bidirectional sync between local state and Firestore
   - Uses `onSnapshot` for live updates from other family members
   - Debounced writes (300ms) to avoid excessive API calls
   - Optimistic updates for responsive UI

4. **Purchase History & Suggestions**
   - When items are checked off, [purchaseHistoryService.ts](services/purchaseHistoryService.ts) increments frequency counters
   - Purchase history stored per user with frequency, last purchased date, price tracking
   - [FavoritesPage.tsx](components/FavoritesPage.tsx) shows:
     - **Most Frequent**: Top 40 items dynamically based on user's actual purchases
     - **Starred**: 200 pre-populated starter items from [data/starterItems.ts](data/starterItems.ts) (language-specific)
     - **Today/Category/Alphabetical**: Other sorting views
   - [SmartSuggestions.tsx](components/SmartSuggestions.tsx) uses purchase patterns for contextual suggestions

### Multi-Language Support

- Languages: English (en), Hebrew (he), Spanish (es)
- Auto-detected on first visit from browser locale
- RTL layout support for Hebrew in CSS
- Category translations in [services/categoryTranslations.ts](services/categoryTranslations.ts)
- Starter items localized per market (USA/Israel/Latin America)
- Semantic duplicate detection works across all languages

### Subscription & Monetization

- Free tier with basic features
- Pro/Family tiers via Stripe or PayPal
- Netlify Functions handle webhooks:
  - [netlify/functions/stripe-webhook.ts](netlify/functions/stripe-webhook.ts)
  - [netlify/functions/paypal-webhook.ts](netlify/functions/paypal-webhook.ts)
  - [netlify/functions/create-checkout-session.ts](netlify/functions/create-checkout-session.ts)
- Subscription data stored in Firestore `/subscriptions/{userId}`
- [subscriptionService.ts](services/subscriptionService.ts) manages subscription state

### Family Sharing

- List owner can add family members by email via [firebaseService.ts](services/firebaseService.ts):`addFamilyMember()`
- Family members get real-time access to shared list
- Activity feed shows who added/removed/checked items ([familyActivityService.ts](services/familyActivityService.ts))
- Firestore security rules in [firestore.rules](firestore.rules) enforce owner/member access

## Key Architecture Patterns

### State Management
- React local state in [App.tsx](App.tsx) (main orchestrator)
- No Redux/Context - props drilled from App to components
- Firestore is source of truth, synced via custom hook [useFirestoreSync.ts](hooks/useFirestoreSync.ts)

### Component Structure
- [App.tsx](App.tsx) - Main shell, view routing, settings modal, toast notifications
- [GroceryList.tsx](components/GroceryList.tsx) - Current shopping list view
- [FavoritesPage.tsx](components/FavoritesPage.tsx) - Purchase history with sorting
- [DashboardPage.tsx](components/DashboardPage.tsx) - Insights and family activity
- [ItemInput.tsx](components/ItemInput.tsx) - Voice/text input with auto-add on mic stop
- [Toast.tsx](components/Toast.tsx) - Reusable snackbar notifications

### Service Layer
- `services/` contains all business logic, AI integration, Firestore operations
- Key services:
  - [geminiService.ts](services/geminiService.ts) - AI categorization + caching
  - [firebaseService.ts](services/firebaseService.ts) - Auth, list access, family members
  - [semanticDupService.ts](services/semanticDupService.ts) - Cross-language duplicate detection
  - [purchaseHistoryService.ts](services/purchaseHistoryService.ts) - Frequency tracking
  - [importService.ts](services/importService.ts) / [exportService.ts](services/exportService.ts) - Data portability

### Migration Utilities
- [listMigration.ts](services/listMigration.ts) - Migrates legacy lists to add `ownerId`/`members` fields
- [categoryMigration.ts](services/categoryMigration.ts) - Migrates "Other/אחר" to "Pantry/מזווה"
- Migrations run automatically on app load if needed

## Firestore Schema

### Collections

**`/groceryLists/{userId}`**
```typescript
{
  items: GroceryItem[],
  history: PurchaseHistoryItem[],
  ownerId: string,           // User UID of list owner
  members: string[],         // Array of member UIDs
  lastModified: string       // ISO timestamp
}
```

**`/users/{userId}`**
```typescript
{
  email: string,
  displayName: string,
  listId: string,            // Points to accessible grocery list
  createdAt: string
}
```

**`/subscriptions/{userId}`**
```typescript
{
  userId: string,
  plan: 'free' | 'pro' | 'family',
  status: 'active' | 'canceled' | 'past_due' | 'trialing',
  provider: 'stripe' | 'paypal',
  stripeCustomerId?: string,
  stripeSubscriptionId?: string,
  paypalSubscriptionId?: string,
  currentPeriodStart: string,
  currentPeriodEnd: string
}
```

**`/familyActivities/{activityId}`**
```typescript
{
  userId: string,
  listId: string,
  action: 'added' | 'removed' | 'checked_off',
  itemName: string,
  timestamp: string
}
```

## Types

Central type definitions in [types.ts](types.ts):
- `GroceryItem` - Individual grocery item with category, completion status
- `PurchaseHistoryItem` - Historical purchase with frequency, price tracking
- `UserSubscription` - Subscription details and billing info
- `Category` - Grouped items for display

## Common Tasks

### Adding a New Category
1. Add to category list in [localCategorizationService.ts](services/localCategorizationService.ts)
2. Add translations to [categoryTranslations.ts](services/categoryTranslations.ts)
3. Update Gemini prompt in [geminiService.ts](services/geminiService.ts) if needed

### Modifying Firestore Rules
1. Edit [firestore.rules](firestore.rules)
2. Deploy: `npx firebase deploy --only firestore:rules`
3. Test in Firebase Console Simulator

### Adding Netlify Functions
1. Create `.ts` file in [netlify/functions/](netlify/functions/)
2. Use `@netlify/functions` for handler wrapper
3. Functions auto-bundled via esbuild (configured in [package.json](package.json))
4. Add env vars in Netlify dashboard

### Working with Voice Input
- Speech recognition via [useSpeechRecognition.ts](hooks/useSpeechRecognition.ts)
- Supports EN/HE/ES with Web Speech API
- Auto-segments input in [ItemInput.tsx](components/ItemInput.tsx):`segmentAndClean()`
- Removes duplicate consecutive tokens and trims punctuation

### Price Tracking Features
- Price history stored in `PurchaseHistoryItem.prices` array
- [PriceInputModal.tsx](components/PriceInputModal.tsx) captures prices after purchase
- [SpendingInsights.tsx](components/SpendingInsights.tsx) shows trends
- [PriceComparePage.tsx](components/PriceComparePage.tsx) compares stores

## Build & Deployment Notes

- Vite build outputs to `dist/`
- PWA manifest and service worker configured in [vite.config.ts](vite.config.ts)
- Netlify deploys from `dist/` directory (see [netlify.toml](netlify.toml))
- SPA routing handled via Netlify redirects (catch-all to `index.html`)
- Static pages: `/privacy.html`, `/terms.html`, `/landing.html`
- Functions bundled with esbuild, require Node 18+

## Critical Implementation Details

### Firestore Security
- [firestore.rules](firestore.rules) enforces owner/member access
- Temporary permissive rules for authenticated users during migration phase (line 59)
- Subscriptions writable by unauthenticated requests (for webhook updates)

### Gemini AI Integration
- API key loaded from `VITE_GEMINI_API_KEY`
- Response cached in localStorage (15min TTL) to reduce API costs
- Falls back to local categorization if API fails
- Prompt engineering optimized for multi-language support

### PWA Offline Support
- Workbox service worker caches static assets
- Firebase and Gemini API requests cached with network-first strategy
- Manifest defined in [vite.config.ts](vite.config.ts)
- Install prompt in [InstallPrompt.tsx](components/InstallPrompt.tsx)
