# 🔧 Fix October/November 2024 Placeholder Prices

## 📋 What This Script Does:

1. **Finds** all items with:
   - Price = `12.00 ₪`
   - Store = `שמוליק אשכנזי`
   - Date = October or November 2024

2. **For each item**:
   - Searches for the **same product** in other months
   - Uses the **most recent real price** found
   - Updates to real price + store name `קורפור`

3. **If no match found**:
   - Keeps `12.00 ₪`
   - Changes store to `קורפור`
   - Logs for manual review

---

## 🚀 How to Use:

### **Step 1: Preview (Safe - No Changes)**

First, see what would be changed:

```bash
npm run fix-prices -- --preview --list=YOUR_LIST_ID
```

Replace `YOUR_LIST_ID` with your actual list ID (e.g., `WPEH3I`)

This will show you:
- ✅ Items that will be fixed (with new prices)
- ⚠️ Items with no match (will keep 12.00)
- 📊 Total count

**Review the preview carefully!**

---

### **Step 2: Apply Changes (If Preview Looks Good)**

If you're happy with the preview:

```bash
npm run fix-prices -- --apply --list=YOUR_LIST_ID
```

This will:
1. 💾 Create a backup file (in `backups/` folder)
2. 🔧 Apply all the fixes
3. 📤 Update Firestore
4. ✅ Show summary report

---

## 🛡️ Safety Features:

- ✅ **Automatic backup** before any changes
- ✅ **Preview mode** to review first
- ✅ **Detailed logging** of all changes
- ✅ **No deletion** - only updates prices/store names
- ✅ **Rollback possible** from backup

---

## 📊 Example Output:

### Preview Mode:
```
📋 PREVIEW REPORT: October/November 2024 Price Fixes
═══════════════════════════════════════════════════════════

✅ Items that CAN be fixed: 45
⚠️  Items with NO match: 3
📊 Total items to process: 48

✅ Items That Will Be Fixed:
───────────────────────────────────────────────────────────
1. חלב 3%
   Date: 2024-10-15
   Current: 12.00 ₪ @ שמוליק אשכנזי
   New:     6.90 ₪ @ קורפור
   Source:  2024-12-10 (קורפור)

2. לחם שיפון
   Date: 2024-10-20
   Current: 12.00 ₪ @ שמוליק אשכנזי
   New:     8.50 ₪ @ קורפור
   Source:  2024-12-05 (קורפור)

...
```

---

## ⚠️ Important Notes:

1. **Your List ID**: You can find it in the browser URL when viewing your list
2. **Backup Location**: `backups/backup-{listId}-{timestamp}.json`
3. **Firestore Update**: Changes are applied to your live data
4. **No Undo**: Make sure to review preview first!

---

## 🔍 How to Find Your List ID:

1. Open your app: https://aigrocerylists.com
2. Look at the URL - it will be something like: `https://aigrocerylists.com/#list-WPEH3I`
3. Your list ID is the part after `list-` (e.g., `WPEH3I`)

---

## 📞 Questions?

- Check the preview first - it's safe!
- Review all changes before applying
- Backup is automatic
- Ask if anything looks wrong!

---

**Ready? Run the preview command above!** 😊

