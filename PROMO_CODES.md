# 🎁 Promo Codes for AI Grocery List

## How to Create Promo Codes in Stripe

### Option 1: Via Stripe Dashboard (Recommended)
1. Go to: https://dashboard.stripe.com/coupons
2. Click **"Create coupon"**
3. Set the discount:
   - **100% off** for 1 month (free trial extension)
   - **50% off** for 3 months (half price)
   - **$5 off** first month
4. Add a **Promotion Code** (the code users will enter)
5. Set redemption limits (e.g., 100 uses)

### Option 2: Via Stripe CLI
```bash
# Create a 100% off coupon for 1 month
stripe coupons create \
  --percent-off 100 \
  --duration repeating \
  --duration-in-months 1 \
  --name "Free Month Trial"

# Create promotion code
stripe promotion_codes create \
  --coupon <COUPON_ID> \
  --code "AIGROCERY2025" \
  --max-redemptions 100
```

---

## 🎯 Suggested Promo Codes

### For Beta Testers (100% off for 1 month)
```
BETA2025        - 100% off, 1 month, 50 uses
EARLYADOPTER    - 100% off, 1 month, 100 uses
TESTDRIVE       - 100% off, 1 month, 25 uses
```

### For Launch (50% off for 3 months)
```
LAUNCH50        - 50% off, 3 months, 200 uses
NEWYEAR2026     - 50% off, 3 months, 500 uses
WELCOME50       - 50% off, 3 months, unlimited
```

### For Referrals ($5 off first month)
```
FRIEND5         - $5 off, 1 month, unlimited
FAMILY5         - $5 off, 1 month, unlimited
```

### For Influencers (100% off for 6 months)
```
INFLUENCER6M    - 100% off, 6 months, 10 uses
CREATOR2025     - 100% off, 6 months, 5 uses
```

---

## 📊 Tracking Promo Code Usage

### Via Stripe Dashboard:
1. Go to: https://dashboard.stripe.com/promotion_codes
2. Click on a promo code to see:
   - How many times it was used
   - Who used it
   - Revenue impact

### Via API:
```typescript
// Check promo code usage
const promoCode = await stripe.promotionCodes.retrieve('promo_xxxxx');
console.log('Times redeemed:', promoCode.times_redeemed);
console.log('Max redemptions:', promoCode.max_redemptions);
```

---

## 🔧 How Users Redeem Codes

### In Your App:
When creating checkout session, Stripe automatically shows promo code input:

```typescript
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{ price: priceId, quantity: 1 }],
  allow_promotion_codes: true, // ← This enables promo codes!
  // ... rest of config
});
```

**Already enabled in your app!** ✅ (see `netlify/functions/create-checkout-session.ts`)

---

## 💡 Marketing Ideas

### Email Campaign:
```
Subject: Get 50% off AI Grocery List! 🎁

Use code: LAUNCH50
Save 50% for 3 months!

[Start Free Trial]
```

### Social Media:
```
🎉 New Year Special! 🎉
Try AI Grocery List FREE for a month
Code: NEWYEAR2026
Limited to first 500 users!
```

### Landing Page Banner:
```
🎁 Special Offer: Use code WELCOME50 for 50% off!
```

---

## 🚀 Quick Start: Create Your First Promo Codes

### Step 1: Create Coupons in Stripe
```bash
# 100% off for 1 month (Beta testers)
stripe coupons create \
  --percent-off 100 \
  --duration repeating \
  --duration-in-months 1 \
  --name "Beta Tester - Free Month"

# 50% off for 3 months (Launch offer)
stripe coupons create \
  --percent-off 50 \
  --duration repeating \
  --duration-in-months 3 \
  --name "Launch Special - 50% Off"
```

### Step 2: Create Promotion Codes
```bash
# Beta code
stripe promotion_codes create \
  --coupon <COUPON_ID_FROM_STEP1> \
  --code "BETA2025" \
  --max-redemptions 50

# Launch code
stripe promotion_codes create \
  --coupon <COUPON_ID_FROM_STEP1> \
  --code "LAUNCH50" \
  --max-redemptions 200
```

### Step 3: Share with Users!
Give them the code and your checkout URL:
```
https://aigrocerylists.com
Code: BETA2025
```

---

## 📝 Sample Promo Code List for Distribution

### For Beta Testers (50 codes):
```
BETA2025-001
BETA2025-002
BETA2025-003
...
BETA2025-050
```

### For Friends & Family (unlimited):
```
FRIEND5
FAMILY5
```

### For Social Media Campaign:
```
INSTAGRAM50
FACEBOOK50
TWITTER50
TIKTOK50
```

---

## ⚠️ Important Notes

1. **Promo codes are case-insensitive** in Stripe
2. **Set expiration dates** for time-limited offers
3. **Track usage** to prevent abuse
4. **Limit redemptions** per customer (1 per customer recommended)
5. **Test codes** before distributing widely

---

## 🎯 Next Steps

1. **Create coupons** in Stripe Dashboard
2. **Generate promo codes** for each coupon
3. **Test** a code yourself to ensure it works
4. **Distribute** to your target audience
5. **Monitor usage** and adjust as needed

---

**Your app already supports promo codes!** Just create them in Stripe and share with users. 🚀

