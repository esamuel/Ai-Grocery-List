# 🎁 PayPal Promo Codes for AI Grocery List

## 📋 How to Create Promo Codes in PayPal

### Method 1: Via PayPal Dashboard (Recommended)

1. **Login to PayPal Business Account**
   - Go to: https://www.paypal.com/businessmanage/account/subscriptions

2. **Navigate to Your Subscription Plans**
   - Click on "Products & Services" → "Subscriptions"
   - Find your plan (Monthly Pro or Yearly Pro)

3. **Create Discount/Coupon**
   - Click on the plan
   - Look for "Discounts" or "Coupons" section
   - Click "Create Discount"

4. **Set Discount Details**
   - **Discount Type**: Percentage or Fixed Amount
   - **Amount**: 100% (free trial), 50% (half price), or $5 off
   - **Duration**: Number of billing cycles
   - **Code**: The promo code users will enter
   - **Usage Limit**: Max number of redemptions

---

## 🎯 Recommended PayPal Promo Codes

### For Beta Testers (100% off for 1 billing cycle)
```
Code: BETA2025
Type: 100% off
Duration: 1 billing cycle
Limit: 50 uses
```

```
Code: EARLYADOPTER
Type: 100% off
Duration: 1 billing cycle
Limit: 100 uses
```

### For Launch (50% off for 3 billing cycles)
```
Code: LAUNCH50
Type: 50% off
Duration: 3 billing cycles
Limit: 200 uses
```

```
Code: NEWYEAR2026
Type: 50% off
Duration: 3 billing cycles
Limit: 500 uses
```

### For Referrals ($5 off first payment)
```
Code: FRIEND5
Type: $5 off
Duration: 1 billing cycle
Limit: Unlimited
```

```
Code: FAMILY5
Type: $5 off
Duration: 1 billing cycle
Limit: Unlimited
```

---

## 🔧 Method 2: Custom Promo Code System (More Flexible)

Since PayPal's built-in coupon system is limited, you can implement a custom system:

### Step 1: Create Promo Codes Database

Add to your Firestore:

```javascript
// Collection: promoCodes
{
  code: "BETA2025",
  type: "percentage", // or "fixed"
  value: 100, // 100% or $5
  duration: 1, // billing cycles
  maxUses: 50,
  currentUses: 0,
  active: true,
  createdAt: timestamp,
  expiresAt: timestamp
}
```

### Step 2: Validate Code Before PayPal Checkout

Modify your checkout flow to:
1. User enters promo code
2. Validate code in Firestore
3. Apply discount to PayPal plan selection
4. Track usage

---

## 💻 Implementation Code

### Add Promo Code Service

Create: `services/promoCodeService.ts`

```typescript
import { doc, getDoc, updateDoc, increment, collection, addDoc, Timestamp } from 'firebase/firestore';
import { getFirebaseServices } from './firebaseService';

export interface PromoCode {
  code: string;
  type: 'percentage' | 'fixed';
  value: number; // 100 for 100%, or dollar amount
  duration: number; // number of billing cycles
  maxUses: number | null; // null = unlimited
  currentUses: number;
  active: boolean;
  createdAt: Timestamp;
  expiresAt: Timestamp | null;
  description?: string;
}

export const validatePromoCode = async (code: string): Promise<{
  valid: boolean;
  promoCode?: PromoCode;
  error?: string;
}> => {
  try {
    const { db } = getFirebaseServices();
    const promoRef = doc(db, 'promoCodes', code.toUpperCase());
    const promoSnap = await getDoc(promoRef);

    if (!promoSnap.exists()) {
      return { valid: false, error: 'Invalid promo code' };
    }

    const promo = promoSnap.data() as PromoCode;

    // Check if active
    if (!promo.active) {
      return { valid: false, error: 'This promo code is no longer active' };
    }

    // Check expiration
    if (promo.expiresAt && promo.expiresAt.toDate() < new Date()) {
      return { valid: false, error: 'This promo code has expired' };
    }

    // Check usage limit
    if (promo.maxUses !== null && promo.currentUses >= promo.maxUses) {
      return { valid: false, error: 'This promo code has reached its usage limit' };
    }

    return { valid: true, promoCode: promo };
  } catch (error) {
    console.error('Error validating promo code:', error);
    return { valid: false, error: 'Error validating promo code' };
  }
};

export const incrementPromoCodeUsage = async (code: string): Promise<void> => {
  try {
    const { db } = getFirebaseServices();
    const promoRef = doc(db, 'promoCodes', code.toUpperCase());
    await updateDoc(promoRef, {
      currentUses: increment(1)
    });
  } catch (error) {
    console.error('Error incrementing promo code usage:', error);
  }
};

export const createPromoCode = async (promo: Omit<PromoCode, 'currentUses' | 'createdAt'>): Promise<void> => {
  try {
    const { db } = getFirebaseServices();
    const promoRef = doc(db, 'promoCodes', promo.code.toUpperCase());
    await setDoc(promoRef, {
      ...promo,
      currentUses: 0,
      createdAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error creating promo code:', error);
    throw error;
  }
};

export const calculateDiscountedPrice = (
  originalPrice: number,
  promoCode: PromoCode
): number => {
  if (promoCode.type === 'percentage') {
    return originalPrice * (1 - promoCode.value / 100);
  } else {
    return Math.max(0, originalPrice - promoCode.value);
  }
};
```

---

## 🎯 Quick Setup for PayPal

### Option A: Use PayPal's Built-in Coupons (Simple)

1. Go to PayPal Dashboard
2. Navigate to your subscription plans
3. Create coupons for each plan
4. Share codes with users

**Pros**: Easy, no coding needed
**Cons**: Limited flexibility, may not support all features

### Option B: Custom System (Recommended)

1. Create promo codes in Firestore
2. Add validation in your app
3. Apply discount before PayPal checkout
4. Track usage automatically

**Pros**: Full control, detailed analytics
**Cons**: Requires implementation

---

## 📊 Promo Codes to Create (Firestore)

### Beta Codes
```json
{
  "code": "BETA2025",
  "type": "percentage",
  "value": 100,
  "duration": 1,
  "maxUses": 50,
  "active": true,
  "expiresAt": null,
  "description": "Beta tester - 100% off first month"
}
```

### Launch Codes
```json
{
  "code": "LAUNCH50",
  "type": "percentage",
  "value": 50,
  "duration": 3,
  "maxUses": 200,
  "active": true,
  "expiresAt": null,
  "description": "Launch special - 50% off for 3 months"
}
```

### Referral Codes
```json
{
  "code": "FRIEND5",
  "type": "fixed",
  "value": 5,
  "duration": 1,
  "maxUses": null,
  "active": true,
  "expiresAt": null,
  "description": "Friend referral - $5 off"
}
```

---

## 🚀 Next Steps

### For Quick Start (PayPal Dashboard):
1. Login to PayPal Business
2. Go to Subscriptions
3. Create coupons manually
4. Share codes with users

### For Full Implementation (Custom System):
1. I'll create the promo code service
2. Add UI for entering codes
3. Integrate with PayPal checkout
4. Add admin panel for managing codes

**Which approach do you prefer?** 🤔

---

## 💡 How Users Will Use Codes

### With PayPal Built-in:
1. User clicks "Upgrade to Pro"
2. Selects PayPal payment
3. On PayPal checkout page, enters promo code
4. Discount applied automatically

### With Custom System:
1. User enters promo code in your app
2. App validates and shows discount
3. User proceeds to PayPal with discounted price
4. Completes payment

---

**Ready to implement! Which method do you want?** 🚀

