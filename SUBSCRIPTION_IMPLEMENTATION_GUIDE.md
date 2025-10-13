# Subscription System Implementation Guide

## ✅ What's Already Implemented

### 1. Data Model & Types (`types.ts`)
- ✅ `UserSubscription` interface with all required fields
- ✅ `PlanTier`, `SubscriptionStatus`, `PaymentProvider` types

### 2. Subscription Service (`services/subscriptionService.ts`)
- ✅ `getUserSubscription()` - Fetch user's subscription from Firestore
- ✅ `updateUserSubscription()` - Update subscription data
- ✅ `createPaidSubscription()` - Create new paid subscription record
- ✅ `cancelSubscription()` - Cancel subscription
- ✅ `hasFeatureAccess()` - Check if user has access to premium features
- ✅ `incrementAICategorization()` - Track AI usage for free tier
- ✅ `getRemainingAICategorizations()` - Get remaining quota

### 3. Webhook Handlers
- ✅ `netlify/functions/stripe-webhook.ts` - Handle Stripe events
- ✅ `netlify/functions/paypal-webhook.ts` - Handle PayPal events

### 4. Checkout Session
- ✅ Updated `create-checkout-session.ts` to accept and store `userId`
- ✅ Added 7-day free trial
- ✅ Store user ID in subscription metadata

---

## 🔧 Remaining Implementation Tasks

### Task 1: Update App.tsx to Pass User ID and Load Subscription

**File**: `App.tsx`

**Changes needed in `handleSelectPlan` (line ~1114)**:

```typescript
const handleSelectPlan = useCallback(async (planId: string, isYearly: boolean) => {
  if (!authUser?.uid) {
    showToast('Please sign in to upgrade', 'error');
    return;
  }

  try {
    const res = await fetch('/.netlify/functions/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planId,
        isYearly,
        userId: authUser.uid  // ← ADD THIS
      })
    });
    if (!res.ok) throw new Error('Failed to create checkout session');
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      showToast('Checkout session created, but URL missing', 'error');
    }
  } catch (e) {
    console.error(e);
    showToast('Payment integration error. Please try again later.', 'error');
  } finally {
    setShowPaywall(false);
  }
}, [authUser, showToast]);
```

**Add subscription loading after auth (line ~830)**:

```typescript
import { getUserSubscription } from './services/subscriptionService';

// After authUser is set, load subscription
useEffect(() => {
  if (!authUser?.uid) {
    setCurrentPlan('free');
    return;
  }

  getUserSubscription(authUser.uid)
    .then(subscription => {
      if (subscription) {
        setCurrentPlan(subscription.plan);
        console.log('✅ Loaded subscription:', subscription);
      }
    })
    .catch(err => {
      console.error('Failed to load subscription:', err);
    });
}, [authUser]);
```

---

### Task 2: Update PayPalSubscribeButton to Include User ID

**File**: `components/PayPalSubscribeButton.tsx`

**Add props**:
```typescript
interface PayPalSubscribeButtonProps {
  planId?: string | null;
  currency?: string;
  label?: string;
  userId?: string; // ← ADD THIS
  onSuccess?: (subscriptionId: string) => void;
  onError?: (error: any) => void;
}
```

**Update createSubscription to include custom_id** (line ~60):

```typescript
createSubscription: (_data: any, actions: any) => {
  return actions.subscription.create({
    plan_id: planId,
    custom_id: userId || '' // ← ADD THIS - this will be used in webhook
  });
},
```

**Update PaywallModal.tsx to pass userId** (line ~201):

```typescript
<PayPalSubscribeButton
  planId={/* ... */}
  currency="USD"
  label="Or subscribe with PayPal"
  userId={userId} // ← ADD THIS (need to pass it as prop to PaywallModal)
  onSuccess={() => {
    alert('PayPal subscription started successfully.');
  }}
/>
```

---

### Task 3: Enforce Feature Access Control

**File**: `services/geminiService.ts`

**Wrap AI categorization with quota check**:

```typescript
import { getUserSubscription, incrementAICategorization, getRemainingAICategorizations } from './subscriptionService';

export async function categorizeGroceries(items: string[], userId?: string): Promise<...> {
  // Check subscription and enforce limits
  if (userId) {
    const subscription = await getUserSubscription(userId);

    if (subscription.plan === 'free') {
      const canUse = await incrementAICategorization(userId, subscription);

      if (!canUse) {
        const remaining = getRemainingAICategorizations(subscription);
        throw new Error(`AI categorization limit reached. ${remaining} remaining this month. Upgrade to Pro for unlimited.`);
      }
    }
  }

  // Continue with existing categorization logic...
}
```

**Update App.tsx `handleAddItem` to pass userId**:

```typescript
const categories = await categorizeGroceries(
  toCategory,
  authUser?.uid // ← ADD THIS
);
```

---

### Task 4: Add Subscription Management UI

**Create new component**: `components/SubscriptionManager.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { getUserSubscription } from '../services/subscriptionService';
import type { UserSubscription } from '../types';

interface SubscriptionManagerProps {
  userId: string;
  onUpgrade: () => void;
  translations: {
    title: string;
    currentPlan: string;
    status: string;
    renewsOn: string;
    cancelBtn: string;
    upgradeBtn: string;
    manageBilling: string;
  };
}

export const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({
  userId,
  onUpgrade,
  translations
}) => {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserSubscription(userId).then(sub => {
      setSubscription(sub);
      setLoading(false);
    });
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (!subscription) return null;

  const isFreePlan = subscription.plan === 'free';
  const planName = subscription.plan.toUpperCase();
  const renewDate = new Date(subscription.currentPeriodEnd).toLocaleDateString();

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <h3 className="text-xl font-bold mb-4">{translations.title}</h3>

      <div className="space-y-2 mb-4">
        <p>
          <span className="font-medium">{translations.currentPlan}:</span>{' '}
          <span className="text-blue-600 font-bold">{planName}</span>
        </p>
        <p>
          <span className="font-medium">{translations.status}:</span>{' '}
          <span className={subscription.status === 'active' ? 'text-green-600' : 'text-red-600'}>
            {subscription.status}
          </span>
        </p>
        {!isFreePlan && (
          <p>
            <span className="font-medium">{translations.renewsOn}:</span> {renewDate}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        {isFreePlan ? (
          <button
            onClick={onUpgrade}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {translations.upgradeBtn}
          </button>
        ) : (
          <>
            <button
              onClick={() => {
                // Open Stripe Customer Portal or show cancel confirmation
                alert('Cancel subscription feature - integrate with Stripe Customer Portal');
              }}
              className="px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-50"
            >
              {translations.cancelBtn}
            </button>
            <button
              onClick={() => {
                // Redirect to Stripe Customer Portal for billing management
                alert('Manage billing - integrate with Stripe Customer Portal');
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              {translations.manageBilling}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
```

**Add to Settings Modal in App.tsx**:

```typescript
import { SubscriptionManager } from './components/SubscriptionManager';

// Inside settings modal, add:
<SubscriptionManager
  userId={authUser?.uid || ''}
  onUpgrade={() => {
    setShowSettings(false);
    setShowPaywall(true);
  }}
  translations={{
    title: currentText.subscriptionTitle,
    currentPlan: currentText.currentPlan,
    status: currentText.status,
    renewsOn: currentText.renewsOn,
    cancelBtn: currentText.cancelSubscription,
    upgradeBtn: currentText.upgradePlan,
    manageBilling: currentText.manageBilling,
  }}
/>
```

---

### Task 5: Add Environment Variables to Netlify

Go to Netlify Dashboard → Site Settings → Environment Variables and add:

#### Stripe:
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_FAMILY_MONTHLY=price_...
STRIPE_PRICE_FAMILY_YEARLY=price_...
```

#### PayPal:
```
VITE_PAYPAL_CLIENT_ID=your_paypal_client_id
VITE_PAYPAL_PLAN_PRO_MONTHLY=P-...
VITE_PAYPAL_PLAN_PRO_YEARLY=P-...
VITE_PAYPAL_PLAN_FAMILY_MONTHLY=P-...
VITE_PAYPAL_PLAN_FAMILY_YEARLY=P-...
PAYPAL_WEBHOOK_ID=your_webhook_id
```

#### Firebase Admin (for webhooks):
```
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
```

Get Firebase service account JSON from:
Firebase Console → Project Settings → Service Accounts → Generate New Private Key

#### Site URL:
```
SITE_URL=https://cool-flan-309abf.netlify.app
```

---

### Task 6: Configure Webhooks

#### Stripe Webhook:
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://cool-flan-309abf.netlify.app/.netlify/functions/stripe-webhook`
3. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

#### PayPal Webhook:
1. Go to PayPal Developer Dashboard → My Apps → Your App → Webhooks
2. Add webhook URL: `https://cool-flan-309abf.netlify.app/.netlify/functions/paypal-webhook`
3. Select events:
   - `BILLING.SUBSCRIPTION.ACTIVATED`
   - `BILLING.SUBSCRIPTION.UPDATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.SUSPENDED`
   - `BILLING.SUBSCRIPTION.EXPIRED`
4. Copy Webhook ID to `PAYPAL_WEBHOOK_ID`

---

### Task 7: Create Firestore Security Rules

Add to `firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Subscription documents
    match /subscriptions/{userId} {
      // Users can read their own subscription
      allow read: if request.auth != null && request.auth.uid == userId;

      // Only server (via Admin SDK from webhooks) can write
      allow write: if false;
    }
  }
}
```

---

### Task 8: Add Package Dependencies

```bash
npm install firebase-admin @types/node
```

---

## 🧪 Testing the Flow

### Test Stripe Payment:

1. Use Stripe test mode
2. Test card: `4242 4242 4242 4242`, any future expiry, any CVC
3. Complete checkout
4. Check Netlify function logs for webhook receipt
5. Verify subscription created in Firestore

### Test PayPal:

1. Use PayPal Sandbox
2. Create test buyer account in PayPal Developer Dashboard
3. Complete subscription
4. Check webhook logs
5. Verify subscription in Firestore

---

## 📊 Firestore Data Structure

```
subscriptions/
  {userId}/
    userId: "firebase_user_id"
    plan: "pro"
    status: "active"
    provider: "stripe"
    stripeCustomerId: "cus_..."
    stripeSubscriptionId: "sub_..."
    currentPeriodStart: "2025-01-15T00:00:00Z"
    currentPeriodEnd: "2025-02-15T00:00:00Z"
    createdAt: "2025-01-15T10:30:00Z"
    updatedAt: "2025-01-15T10:30:00Z"
    usageStats:
      aiCategorizationsThisMonth: 5
      lastResetDate: "2025-01-01T00:00:00Z"
```

---

## 🚀 Deployment Checklist

- [ ] Install dependencies (`npm install firebase-admin`)
- [ ] Add all environment variables to Netlify
- [ ] Deploy to Netlify (`netlify deploy --prod`)
- [ ] Configure Stripe webhook endpoint
- [ ] Configure PayPal webhook endpoint
- [ ] Test Stripe payment flow (test mode)
- [ ] Test PayPal payment flow (sandbox)
- [ ] Verify Firestore subscription creation
- [ ] Test feature access control
- [ ] Test free tier AI quota
- [ ] Update Firestore security rules
- [ ] Switch to production mode (live keys)

---

## 🐛 Debugging

Check logs at:
- Netlify Functions: https://app.netlify.com/projects/cool-flan-309abf/logs/functions
- Stripe Webhooks: Stripe Dashboard → Developers → Webhooks → Click endpoint → View logs
- PayPal Webhooks: PayPal Developer Dashboard → Webhooks → View activity

Common issues:
- Webhook signature verification fails → Check webhook secret
- No userId in webhook → Ensure userId passed to checkout session
- Firestore permission denied → Check security rules and service account
- AI quota not enforced → Check if userId passed to categorizeGroceries

---

## 💡 Future Enhancements

1. **Stripe Customer Portal** - Let users manage their own billing
2. **Proration** - Allow mid-cycle plan upgrades with proration
3. **Grace Period** - Give users 3 days after payment failure
4. **Email Notifications** - Send receipts and renewal reminders
5. **Referral Program** - Give free month for referrals
6. **Annual Discount Campaigns** - Offer limited-time discounts

