# Namecheap DNS Setup - Visual Guide

## Step-by-Step Instructions with Screenshots

### Current Location
You are correctly on the **Advanced DNS** tab. Good! ✅

### What You Need to Do

**SCROLL DOWN** on the page. The HOST RECORDS section is below the current view.

### What You're Looking For

After scrolling down, you should see:

```
HOST RECORDS
─────────────────────────────────────────────────
| Type  | Host | Value            | TTL      | ⚙️ |
─────────────────────────────────────────────────
| CNAME | www  | parkingpage.name | Automatic| 🗑️ |
| A     | @    | 198.xx.xx.xx     | Automatic| 🗑️ |
─────────────────────────────────────────────────

[+ ADD NEW RECORD] button
```

### DNS Records to Add

**Delete** any existing parking records first (click the trash icon 🗑️)

Then **Add Record #1 - A Record:**
- Type: `A Record`
- Host: `@`
- Value: `75.2.60.5`
- TTL: `Automatic` (default)
- Click ✓ to save

**Add Record #2 - CNAME Record:**
- Type: `CNAME Record`
- Host: `www`
- Value: `cool-flan-309abf.netlify.app`
- TTL: `Automatic` (default)
- Click ✓ to save

### Final Result Should Look Like:

```
HOST RECORDS
─────────────────────────────────────────────────
| Type  | Host | Value                      | TTL      |
─────────────────────────────────────────────────
| A     | @    | 75.2.60.5                  | Automatic|
| CNAME | www  | cool-flan-309abf.netlify.app| Automatic|
─────────────────────────────────────────────────
```

### Alternative: Direct Link Method

If scrolling doesn't work, try this:

1. Go to your Namecheap Domain List: https://ap.www.namecheap.com/domains/list/
2. Find `aigrocerylists.com`
3. Click **MANAGE** button next to your domain
4. Click **Advanced DNS** tab
5. You should now see the HOST RECORDS section directly

### Still Can't Find It?

If you still don't see the HOST RECORDS section after scrolling:
1. Take a screenshot of the ENTIRE page (scroll and capture everything)
2. Or try using a different browser (Chrome, Firefox, Safari)
3. Or try on desktop instead of mobile (if you're on mobile)

### Need More Help?

Send me a screenshot showing:
- The full Advanced DNS page after scrolling all the way down
- Or let me know what you see when you scroll
