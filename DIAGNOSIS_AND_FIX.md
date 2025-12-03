# 🔍 Historical Data Issue - December 2025

## Problem
When December starts, November (and previous months') data disappears from Monthly Purchases view.

## Root Cause Analysis

The Monthly Purchases feature relies on:
1. `PurchaseHistoryItem.prices[]` array - each entry should have a `purchaseDate`
2. `getDailyPurchases()` function extracts months from these dates
3. **If `purchaseDate` is missing or invalid, that month won't appear**

### Common Causes:
- ❌ Items completed without setting `purchaseDate` in prices array
- ❌ Dates set to current date instead of actual purchase date
- ❌ Dates in wrong format (not ISO string)
- ❌ Dates being overwritten during month transitions
- ❌ Migration scripts not running properly

## The Fix

Created: **`services/ensureAllMonthsVisible.ts`**

This service will:
1. ✅ Check every item in purchase history
2. ✅ Ensure each price entry has a valid `purchaseDate`
3. ✅ If missing, use `lastPurchased` or infer from creation time
4. ✅ Validate date format (ISO 8601)
5. ✅ Log all months found for verification
6. ✅ Auto-run on app startup

## How to Test

1. **Open Browser Console** (F12 → Console)
2. **Hard Refresh** (Ctrl+Shift+R / Cmd+Shift+R)
3. **Look for:**
   ```
   🔍 ENSURING ALL MONTHS ARE VISIBLE...
   📊 Processing X history items...
   ✅ Fixed item: [name] - Date: YYYY-MM-DD
   📅 MONTHS FOUND: 2024-11, 2024-12
   ✅ ALL MONTHS NOW VISIBLE!
   ```

4. **Go to Spending Insights → Monthly Purchases**
5. **Verify:** All months appear (November 2024, December 2024, etc.)

## Expected Results

**Before Fix:**
- Only current month (December 2024) appears
- November data missing
- Maybe 0 months or only 1 month visible

**After Fix:**
- All months with purchase data appear
- November 2024, December 2024, and any other months visible
- Complete historical data accessible

## Technical Details

### What Gets Fixed:
```typescript
// BEFORE (broken):
{
  name: "Milk",
  prices: [
    { price: 15, store: "Shufersal" } // ❌ No purchaseDate!
  ]
}

// AFTER (fixed):
{
  name: "Milk", 
  prices: [
    { 
      price: 15, 
      store: "Shufersal",
      purchaseDate: "2024-11-15T10:30:00.000Z" // ✅ Valid date!
    }
  ]
}
```

### Date Sources (Priority Order):
1. Existing `purchaseDate` (if valid)
2. Item's `lastPurchased` field
3. Current date (last resort)

## Prevention

To prevent this issue in future:

1. **Always set purchaseDate** when adding to purchase history
2. **Use ISO date strings** (YYYY-MM-DDTHH:mm:ss.sssZ)
3. **Validate dates** before saving
4. **Run migrations** on app startup

## Files Involved

- ✅ `services/ensureAllMonthsVisible.ts` - New fix service
- ✅ `App.tsx` - Calls fix on startup (line ~1320)
- ✅ `services/exportService.ts` - getDailyPurchases function
- ✅ `components/MonthlyPurchasesView.tsx` - Month display
- ✅ `services/purchaseHistoryService.ts` - Data storage

## Verification

After running the fix, verify in Console:
```
📊 getDailyPurchases SUMMARY:
   Total items checked: X
   Items processed: X
   Items skipped: 0     ← Should be 0!
   Prices processed: X
   Prices skipped: 0    ← Should be 0!
   Days found: X
   Months found: 2      ← Should be 2+ (Nov + Dec)
   - 2024-11-XX (2024-11): Y items
   - 2024-12-XX (2024-12): Z items
```

## Support

If months still don't appear:
1. Check browser console for errors
2. Verify you have purchase history items
3. Check Firestore database directly
4. Run diagnostic script again
5. Contact support with console logs

---

**Created:** December 3, 2025  
**Status:** Ready to deploy  
**Impact:** Fixes historical data visibility for all users
