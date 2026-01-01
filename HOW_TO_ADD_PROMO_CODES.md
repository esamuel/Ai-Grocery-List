# 🎁 How to Add Promo Codes to Your App

## ✅ Quick Setup (3 Steps)

### Step 1: Go to Firebase Console
Open: https://console.firebase.google.com/project/grocery-list-ai-1e7a5/firestore/data

### Step 2: Create Collection
1. Click **"Start collection"** (if first time) or **"Add collection"**
2. Collection ID: `promoCodes`
3. Click **"Next"**

### Step 3: Add Promo Codes
For each code below, click **"Add document"** and enter:

---

## 📋 Promo Codes to Add

### 1. BETA2025 (Beta Tester - 100% off, 1 month, 50 uses)
```
Document ID: BETA2025

Fields:
- code: "BETA2025" (string)
- type: "percentage" (string)
- value: 100 (number)
- duration: 1 (number)
- maxUses: 50 (number)
- currentUses: 0 (number)
- active: true (boolean)
- expiresAt: null
- description: "Beta tester - 100% off first month" (string)
- createdAt: [Click "timestamp" and select current time]
```

### 2. EARLYADOPTER (Early Adopter - 100% off, 1 month, 100 uses)
```
Document ID: EARLYADOPTER

Fields:
- code: "EARLYADOPTER" (string)
- type: "percentage" (string)
- value: 100 (number)
- duration: 1 (number)
- maxUses: 100 (number)
- currentUses: 0 (number)
- active: true (boolean)
- expiresAt: null
- description: "Early adopter - 100% off first month" (string)
- createdAt: [timestamp - current time]
```

### 3. TESTDRIVE (Test Drive - 100% off, 1 month, 25 uses)
```
Document ID: TESTDRIVE

Fields:
- code: "TESTDRIVE" (string)
- type: "percentage" (string)
- value: 100 (number)
- duration: 1 (number)
- maxUses: 25 (number)
- currentUses: 0 (number)
- active: true (boolean)
- expiresAt: null
- description: "Test drive - 100% off first month" (string)
- createdAt: [timestamp - current time]
```

### 4. LAUNCH50 (Launch Special - 50% off, 3 months, 200 uses)
```
Document ID: LAUNCH50

Fields:
- code: "LAUNCH50" (string)
- type: "percentage" (string)
- value: 50 (number)
- duration: 3 (number)
- maxUses: 200 (number)
- currentUses: 0 (number)
- active: true (boolean)
- expiresAt: null
- description: "Launch special - 50% off for 3 months" (string)
- createdAt: [timestamp - current time]
```

### 5. NEWYEAR2026 (New Year - 50% off, 3 months, 500 uses)
```
Document ID: NEWYEAR2026

Fields:
- code: "NEWYEAR2026" (string)
- type: "percentage" (string)
- value: 50 (number)
- duration: 3 (number)
- maxUses: 500 (number)
- currentUses: 0 (number)
- active: true (boolean)
- expiresAt: null
- description: "New Year 2026 - 50% off for 3 months" (string)
- createdAt: [timestamp - current time]
```

### 6. WELCOME50 (Welcome Offer - 50% off, 3 months, unlimited)
```
Document ID: WELCOME50

Fields:
- code: "WELCOME50" (string)
- type: "percentage" (string)
- value: 50 (number)
- duration: 3 (number)
- maxUses: null
- currentUses: 0 (number)
- active: true (boolean)
- expiresAt: null
- description: "Welcome offer - 50% off for 3 months" (string)
- createdAt: [timestamp - current time]
```

### 7. FRIEND5 (Friend Referral - $5 off, 1 month, unlimited)
```
Document ID: FRIEND5

Fields:
- code: "FRIEND5" (string)
- type: "fixed" (string)
- value: 5 (number)
- duration: 1 (number)
- maxUses: null
- currentUses: 0 (number)
- active: true (boolean)
- expiresAt: null
- description: "Friend referral - $5 off first month" (string)
- createdAt: [timestamp - current time]
```

### 8. FAMILY5 (Family Referral - $5 off, 1 month, unlimited)
```
Document ID: FAMILY5

Fields:
- code: "FAMILY5" (string)
- type: "fixed" (string)
- value: 5 (number)
- duration: 1 (number)
- maxUses: null
- currentUses: 0 (number)
- active: true (boolean)
- expiresAt: null
- description: "Family referral - $5 off first month" (string)
- createdAt: [timestamp - current time]
```

### 9. INSTAGRAM50 (Instagram - 50% off, 3 months, 100 uses)
```
Document ID: INSTAGRAM50

Fields:
- code: "INSTAGRAM50" (string)
- type: "percentage" (string)
- value: 50 (number)
- duration: 3 (number)
- maxUses: 100 (number)
- currentUses: 0 (number)
- active: true (boolean)
- expiresAt: null
- description: "Instagram followers - 50% off for 3 months" (string)
- createdAt: [timestamp - current time]
```

### 10. FACEBOOK50 (Facebook - 50% off, 3 months, 100 uses)
```
Document ID: FACEBOOK50

Fields:
- code: "FACEBOOK50" (string)
- type: "percentage" (string)
- value: 50 (number)
- duration: 3 (number)
- maxUses: 100 (number)
- currentUses: 0 (number)
- active: true (boolean)
- expiresAt: null
- description: "Facebook community - 50% off for 3 months" (string)
- createdAt: [timestamp - current time]
```

### 11. VIP-INFLUENCER (VIP - 100% off, 6 months, 10 uses)
```
Document ID: VIP-INFLUENCER

Fields:
- code: "VIP-INFLUENCER" (string)
- type: "percentage" (string)
- value: 100 (number)
- duration: 6 (number)
- maxUses: 10 (number)
- currentUses: 0 (number)
- active: true (boolean)
- expiresAt: null
- description: "VIP Influencer - 100% off for 6 months" (string)
- createdAt: [timestamp - current time]
```

### 12. PRESS-REVIEW (Press/Media - 100% off, 6 months, 5 uses)
```
Document ID: PRESS-REVIEW

Fields:
- code: "PRESS-REVIEW" (string)
- type: "percentage" (string)
- value: 100 (number)
- duration: 6 (number)
- maxUses: 5 (number)
- currentUses: 0 (number)
- active: true (boolean)
- expiresAt: null
- description: "Press/Media review - 100% off for 6 months" (string)
- createdAt: [timestamp - current time]
```

---

## 📊 Summary

| Code | Discount | Duration | Max Uses | Best For |
|------|----------|----------|----------|----------|
| BETA2025 | 100% off | 1 month | 50 | Beta testers |
| EARLYADOPTER | 100% off | 1 month | 100 | Early adopters |
| TESTDRIVE | 100% off | 1 month | 25 | Trial users |
| LAUNCH50 | 50% off | 3 months | 200 | Launch campaign |
| NEWYEAR2026 | 50% off | 3 months | 500 | New Year promo |
| WELCOME50 | 50% off | 3 months | Unlimited | General welcome |
| FRIEND5 | $5 off | 1 month | Unlimited | Friend referrals |
| FAMILY5 | $5 off | 1 month | Unlimited | Family referrals |
| INSTAGRAM50 | 50% off | 3 months | 100 | Instagram |
| FACEBOOK50 | 50% off | 3 months | 100 | Facebook |
| VIP-INFLUENCER | 100% off | 6 months | 10 | Major influencers |
| PRESS-REVIEW | 100% off | 6 months | 5 | Press/Media |

---

## 🎯 Next Steps

1. **Add codes to Firestore** (follow steps above)
2. **Test a code** - try BETA2025 yourself
3. **Share codes** with your target audience
4. **Monitor usage** in Firebase Console

---

## 📱 How Users Will Use Codes

**Note:** You'll need to add a promo code input field to your checkout flow.

The `promoCodeService.ts` is already created with these functions:
- `validatePromoCode(code, price)` - Check if code is valid
- `calculateDiscountedPrice(price, promoCode)` - Calculate discount
- `incrementPromoCodeUsage(code)` - Track usage

---

## 🔧 To Add Promo Code Input to Checkout

You'll need to modify your PayPal checkout flow to:
1. Add an input field for promo code
2. Validate the code when entered
3. Show the discounted price
4. Apply discount to PayPal plan selection
5. Track usage after successful payment

Would you like me to implement this UI next?

---

**Your promo code system is ready! Just add the codes to Firestore and start sharing!** 🚀

