# Firebase → Supabase migration (Oct 2026)

**Why:** Google suspended the Firebase project `family-grocery-list-ee6d3` (leaked API key, Sep 2026).
The app now runs on Supabase. Old Firestore data could not be exported while suspended.

## Supabase project
- Project ref: `xqseuuohoznfqtzdkslk` (was "puzzle_game" — rename it to **grocery-list** in the dashboard)
- Region: eu-central-1
- Schema: `supabase/migrations/20261026_grocery_schema.sql` (applied)

## Tables (all `gl_` prefixed, RLS on)
| Table | Mirrors (Firestore) | Notes |
|---|---|---|
| `gl_users` | `users/{uid}` | auto-created by trigger on sign-up; `data` jsonb = displayName, favorites, mainListId, sharedListId |
| `gl_lists` | `groceryLists/{id}` | `owner_id`, `members uuid[]`, `data` jsonb = items, history, stores |
| `gl_family_activities` | `familyActivities` | activity feed |
| `gl_trips`, `gl_purchases` | `groceryLists/{id}/trips|purchases` | checkout pipeline |
| `gl_baskets` | `comparisonBaskets` | basket comparison |
| `gl_suggestions` | `groceryLists/{id}/suggestions/{lang}` | smart suggestions cache |

RPCs: `gl_add_family_member(list_id, email)` (owner only), `gl_list_members(list_id)`, `gl_is_member(list_id)`.
Realtime is enabled on `gl_lists` (live sync between family members).

## Env vars (local `.env.local` and Netlify)
```
VITE_SUPABASE_URL=https://xqseuuohoznfqtzdkslk.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key from Supabase → Settings → API>
GEMINI_API_KEY=<unchanged, server-side>
```
Remove all `VITE_FIREBASE_*` vars from Netlify.

## Supabase dashboard settings to check
- Authentication → Providers → Email: enabled. **Turn OFF "Confirm email"** if you want family members to log in immediately after sign-up (otherwise they must click the email link first).
- Authentication → URL Configuration → Site URL: `https://aigrocerylists.com`

## What was dropped
- Stripe / PayPal subscriptions, promo codes, PaywallModal logic (everyone has the full "family" plan — `services/subscriptionService.ts` is a stub)
- Firebase-only diagnostic scripts → `scripts/_legacy-firebase/` (don't run; kept for reference)

## Code map
- `services/supabaseClient.ts` — the client + `AppUser` type
- `services/supabaseService.ts` — auth, lists, favorites, family members (replaces `firebaseService.ts`, which now just re-exports)
- Other services (`purchaseHistoryService`, `familyActivityService`, `shoppingTripService`, `basketStorageService`, `suggestionsFirestoreService`, `storeListService`) ported in place.
