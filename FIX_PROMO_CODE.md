# 🔧 תיקון קוד הפרומו BETA2025

## הבעיה שמצאתי:
ב-Firestore חסר השדה **`value`** שמציין את גודל ההנחה!

## ✅ הפתרון (2 דקות):

### אופציה 1: הוסף את השדה החסר ידנית

1. **פתח את ה-document BETA2025 ב-Firestore:**
   https://console.firebase.google.com/project/grocery-list-ai-1e7a5/firestore/data/promoCodes/BETA2025

2. **לחץ על "+ Add field"**

3. **הוסף:**
   ```
   Field: value
   Type: number
   Value: 100
   ```

4. **לחץ "Update"**

5. **רענן את האפליקציה ונסה שוב!**

---

### אופציה 2: מחק והוסף מחדש (מהיר יותר)

1. **מחק את ה-document BETA2025**

2. **צור document חדש עם כל השדות:**

```
Document ID: BETA2025

Fields:
active = true (boolean)
code = BETA2025 (string)
type = percentage (string)
value = 100 (number) ← זה החסר!
duration = 1 (number)
maxUses = 50 (number)
currentUses = 0 (number)
expiresAt = null
description = Beta tester - 100% off first month (string)
createdAt = [timestamp - now]
```

---

## 📋 רשימת שדות מלאה (copy-paste):

### שדות חובה לכל קוד פרומו:

1. **active** (boolean) = `true`
2. **code** (string) = `BETA2025`
3. **type** (string) = `percentage` או `fixed`
4. **value** (number) = `100` (למשל: 100 = 100% או 5 = $5)
5. **duration** (number) = `1` (מספר חודשים)
6. **maxUses** (number או null) = `50` או `null`
7. **currentUses** (number) = `0`
8. **expiresAt** (timestamp או null) = `null`
9. **description** (string) = `Beta tester - 100% off first month`
10. **createdAt** (timestamp) = זמן נוכחי

---

## ✅ אחרי התיקון:

הקוד **BETA2025** יעבוד מיד!
- ✅ 100% הנחה
- ✅ לחודש אחד
- ✅ 50 שימושים

---

## 🎯 קודים נוספים להוספה (עם כל השדות):

### LAUNCH50 (50% הנחה ל-3 חודשים):
```
Document ID: LAUNCH50

active = true (boolean)
code = LAUNCH50 (string)
type = percentage (string)
value = 50 (number)
duration = 3 (number)
maxUses = 200 (number)
currentUses = 0 (number)
expiresAt = null
description = Launch special - 50% off for 3 months (string)
createdAt = [timestamp - now]
```

### FRIEND5 ($5 הנחה):
```
Document ID: FRIEND5

active = true (boolean)
code = FRIEND5 (string)
type = fixed (string) ← שים לב! fixed ולא percentage
value = 5 (number)
duration = 1 (number)
maxUses = null ← null = unlimited
currentUses = 0 (number)
expiresAt = null
description = Friend referral - $5 off first month (string)
createdAt = [timestamp - now]
```

---

**תקן את השדה החסר והכל יעבוד!** ✨

