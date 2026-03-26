# Owner Testing Code

## Special Pro Bypass Code

As the app owner, you can now unlock pro features for testing without purchasing a subscription.

### How to Use:

1. **Open the app** and log in as the owner
2. **Go to Settings** (click your profile icon or open the settings menu)
3. **Scroll down** to the "🔑 Owner Testing Code" section (only visible to the list owner)
4. **Enter the code**: `OWNER-PRO-2026`
5. **Click "Unlock"** or press Enter

### What Happens:

- ✅ All pro features become available
- ✅ Ads are hidden
- ✅ The app behaves as if you have a Pro subscription
- ✅ Your current plan shows as "Pro" in the paywall modal
- ✅ The bypass persists across sessions (stored in localStorage)

### To Disable:

In the same settings section, click **"Disable Pro Bypass"** to return to normal mode.

### Changing the Code:

If you want to change the owner code, edit the `OWNER_PRO_VALID_CODE` constant in `App.tsx`:

```typescript
const OWNER_PRO_VALID_CODE = 'OWNER-PRO-2026'; // Change this to any code you want
```

### Security Notes:

- This code only appears for the **list owner** (not family members)
- The code is stored in the client-side source code, so it's meant for your testing only
- For production, this feature is only accessible to users marked as `isOwner`
- The bypass is stored in localStorage under `ownerProBypassEnabled` and persists until manually disabled or cleared

## Testing the Problem

Now that you have pro features unlocked, you can:
1. Access all spending insights
2. View price tracking features  
3. See monthly purchases and comparisons
4. Test if the issue you're investigating is related to pro feature access

If the problem still exists with pro features unlocked, you'll know it's not related to the subscription tier.
