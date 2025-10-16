# Quick Start: PayPal Setup for Israel (30 Minutes)

## Good News!
PayPal works perfectly in Israel and accepts payments from worldwide customers. We'll set this up instead of Stripe.

---

## Part 1: Get Your Firebase Service Account (5 minutes)

### Step 1: Download the Firebase Key
1. Open this link: https://console.firebase.google.com
2. Click on your project
3. Click the ⚙️ gear icon (top left) → "Project settings"
4. Click "Service accounts" tab
5. Click "Generate new private key" button
6. Click "Generate key" in the popup
7. A file downloads (like `my-project-firebase-adminsdk-abc123.json`)
8. **Open this file in a text editor** and **copy EVERYTHING**
9. Save it in a file called `firebase-key.txt` on your desktop

---

## Part 2: Set Up PayPal Business Account (10 minutes)

### Step 1: Create PayPal Business Account
1. Go to: https://www.paypal.com/il/business
2. Click "Sign Up" (הירשם)
3. Select **"Business Account"** (חשבון עסקי)
4. Follow the steps:
   - Email address
   - Phone number (Israeli number works)
   - Business information
   - Link your Israeli bank account or credit card

### Step 2: Access PayPal Developer Dashboard
1. Once logged in, go to: https://developer.paypal.com
2. Click "Log in to Dashboard" (top right)
3. Make sure you're in **"Live"** mode (toggle at top right)

### Step 3: Create an App
1. Click "Apps & Credentials" (left sidebar)
2. Click "Create App" button
3. App Name: `AI Grocery List`
4. App Type: Select **"Merchant"**
5. Click "Create App"

### Step 4: Get Your Client ID
1. You'll see your app details
2. **Copy the "Client ID"** (starts with something like `AZabc123...`)
3. Save it in your notes: `CLIENT_ID = AZabc123...`

### Step 5: Enable Subscriptions
1. On the same page, scroll down to "Features"
2. Make sure **"Subscriptions"** is checked/enabled
3. If not, check it and click "Save"

---

## Part 3: Create Subscription Plans in PayPal (10 minutes)

### Step 1: Go to Subscriptions
1. In PayPal Business account (not developer), go to: https://www.paypal.com/billing/plans
2. Or: PayPal Dashboard → Products & Services → Subscriptions
3. Click "Create Plan" button

### Plan 1: Pro Monthly
1. Plan name: `Pro Plan - Monthly`
2. Product type: `Digital Goods` (מוצרים דיגיטליים)
3. Billing cycle:
   - Frequency: `Monthly` (חודשי)
   - Price: `4.99 USD`
4. Setup fee: Leave empty
5. Trial period:
   - Enable: Yes (כן)
   - Duration: `7 days` (7 ימים)
   - Price: `0.00` (free trial)
6. Click "Save" / "Create Plan"
7. **Copy the Plan ID** (looks like `P-12ABC34DEF567GHI890`)
8. Save it: `PRO_MONTHLY = P-12ABC34DEF567GHI890`

### Plan 2: Pro Yearly
1. Click "Create Plan" again
2. Plan name: `Pro Plan - Yearly`
3. Billing cycle:
   - Frequency: `Yearly` (שנתי)
   - Price: `39.99 USD`
4. Trial period: 7 days, free
5. Click "Save"
6. **Copy the Plan ID**
7. Save it: `PRO_YEARLY = P-23ABC45DEF678GHI901`

### Plan 3: Family Monthly
1. Click "Create Plan" again
2. Plan name: `Family Plan - Monthly`
3. Billing cycle:
   - Frequency: `Monthly`
   - Price: `7.99 USD`
4. Trial period: 7 days, free
5. Click "Save"
6. **Copy the Plan ID**
7. Save it: `FAMILY_MONTHLY = P-34ABC56DEF789GHI012`

### Plan 4: Family Yearly
1. Click "Create Plan" again
2. Plan name: `Family Plan - Yearly`
3. Billing cycle:
   - Frequency: `Yearly`
   - Price: `69.99 USD`
4. Trial period: 7 days, free
5. Click "Save"
6. **Copy the Plan ID**
7. Save it: `FAMILY_YEARLY = P-45ABC67DEF890GHI123`

Now you should have 5 things:
1. PayPal Client ID
2. Pro Monthly Plan ID
3. Pro Yearly Plan ID
4. Family Monthly Plan ID
5. Family Yearly Plan ID

---

## Part 4: Add Everything to Netlify (10 minutes)

### Step 1: Open Netlify Dashboard
1. Go to: https://app.netlify.com
2. Log in
3. Click on your site: `cool-flan-309abf`

### Step 2: Go to Environment Variables
1. Click "Site configuration" (top menu)
2. Click "Environment variables" (left sidebar)
3. Click "Add a variable"

### Step 3: Add Variables

**Variable 1:**
- Key: `FIREBASE_SERVICE_ACCOUNT`
- Value: [Paste the entire Firebase JSON from firebase-key.txt - ONE line]
- Click "Create variable"

**Variable 2:**
- Key: `VITE_PAYPAL_CLIENT_ID`
- Value: [Paste your PayPal Client ID]
- Click "Create variable"

**Variable 3:**
- Key: `VITE_PAYPAL_PLAN_PRO_MONTHLY`
- Value: [Paste your Pro Monthly Plan ID]
- Click "Create variable"

**Variable 4:**
- Key: `VITE_PAYPAL_PLAN_PRO_YEARLY`
- Value: [Paste your Pro Yearly Plan ID]
- Click "Create variable"

**Variable 5:**
- Key: `VITE_PAYPAL_PLAN_FAMILY_MONTHLY`
- Value: [Paste your Family Monthly Plan ID]
- Click "Create variable"

**Variable 6:**
- Key: `VITE_PAYPAL_PLAN_FAMILY_YEARLY`
- Value: [Paste your Family Yearly Plan ID]
- Click "Create variable"

**Variable 7:**
- Key: `SITE_URL`
- Value: `https://cool-flan-309abf.netlify.app`
- Click "Create variable"

**Variable 8:** (We'll fill this later)
- Key: `PAYPAL_WEBHOOK_ID`
- Value: `temp` (just put "temp" for now)
- Click "Create variable"

### Step 4: Redeploy Your Site
1. Click "Deploys" (top menu)
2. Click "Trigger deploy" → "Deploy site"
3. Wait 2-3 minutes

---

## Part 5: Set Up PayPal Webhook (5 minutes)

### Step 1: Create Webhook
1. Go to: https://developer.paypal.com/dashboard
2. Click "Apps & Credentials"
3. Click on your app name ("AI Grocery List")
4. Scroll down to "Webhooks"
5. Click "Add Webhook"

### Step 2: Configure Webhook
1. Webhook URL: `https://cool-flan-309abf.netlify.app/.netlify/functions/paypal-webhook`
2. Event types - Select these:
   - ✅ `BILLING.SUBSCRIPTION.ACTIVATED`
   - ✅ `BILLING.SUBSCRIPTION.UPDATED`
   - ✅ `BILLING.SUBSCRIPTION.CANCELLED`
   - ✅ `BILLING.SUBSCRIPTION.SUSPENDED`
   - ✅ `BILLING.SUBSCRIPTION.EXPIRED`
3. Click "Save"

### Step 3: Get Webhook ID
1. You'll see your webhook in the list
2. Click on it
3. Look for "Webhook ID" (at the top)
4. **Copy the Webhook ID**

### Step 4: Update Netlify
1. Back to Netlify → Environment variables
2. Find `PAYPAL_WEBHOOK_ID`
3. Click "Edit" (three dots)
4. Replace "temp" with your Webhook ID
5. Click "Save"
6. Go to "Deploys" → "Trigger deploy" → "Deploy site"
7. Wait 2-3 minutes

---

## Part 6: TEST IT! (5 minutes)

### Step 1: Test in Sandbox First (Recommended)
1. In PayPal Developer Dashboard, switch to **"Sandbox"** mode (toggle at top)
2. Repeat Part 2-5 steps but in Sandbox mode
3. Use sandbox test accounts to test payments

### Step 2: Test the Payment Flow
1. Go to your app: https://cool-flan-309abf.netlify.app
2. Sign in
3. Click ⚙️ settings
4. Click "💎 Upgrade to Pro"
5. Select "Pro" plan
6. You should see a PayPal button appear below the Stripe button
7. Click the PayPal button
8. Log in with PayPal and approve the subscription

### Step 3: Verify
1. You should be redirected back to your app
2. The alert should say "PayPal subscription started successfully"
3. Refresh the page
4. Open console (F12) - you should see: `✅ Loaded subscription: pro` (may take a minute for webhook)

---

## 🎉 Done! You're Accepting PayPal Payments in Israel!

### What Just Happened?
- ✅ Israeli users can subscribe via PayPal
- ✅ International users can subscribe via PayPal
- ✅ PayPal handles all payment processing
- ✅ Money goes to your Israeli PayPal account
- ✅ You can withdraw to your Israeli bank account

---

## 💰 Getting Paid in Israel

### How to Receive Money
1. PayPal payments arrive in your PayPal account immediately
2. To withdraw to your Israeli bank:
   - Go to PayPal → Wallet → Transfer to Bank
   - Link your Israeli bank account (Bank Leumi, Hapoalim, etc.)
   - Transfer funds (takes 3-5 business days)
   - PayPal charges a small fee (~1-2%)

### Currency Exchange
- Payments are in USD
- PayPal converts to ILS (שקלים) when you withdraw
- Exchange rate is competitive with banks

---

## 🔒 Israeli Legal Requirements

### Tax Reporting
- Register as a business (עוסק מורשה) with מס הכנסה
- Report PayPal income in your annual tax return
- Keep records of all transactions
- Consult with an Israeli accountant (רואה חשבון)

### VAT (מע"מ)
- If you exceed ₪100,000/year in revenue, register for VAT
- Add VAT to prices for Israeli customers
- PayPal can collect VAT automatically

### Invoices (חשבוניות)
- Israeli law requires invoices for business transactions
- You can integrate Israeli invoice systems like:
  - Green Invoice (גרין אינבויס)
  - iCount
  - HoraatKeva (הוראת קבע)

---

## 📱 PayPal is Better for You Because:

1. ✅ **Works in Israel** - Stripe doesn't
2. ✅ **Popular worldwide** - 400+ million users
3. ✅ **Multiple currencies** - Accepts USD, EUR, ILS, etc.
4. ✅ **Easy withdrawals** - Direct to Israeli banks
5. ✅ **Mobile-friendly** - Most users have PayPal app
6. ✅ **Buyer protection** - Builds trust

---

## Alternative: Stripe via Third-Party

If you really want Stripe, you can use:

### Option 1: Stripe Atlas
- Create a US company through Stripe Atlas
- Costs ~$500 to set up
- File US taxes annually
- More complex but gives you access to Stripe

### Option 2: Israeli Payment Processors
- **Tranzila** (טרנזילה)
- **Yaad Sarig** (יעד שריג)
- **CardCom** (קארדקום)
- These are Israeli alternatives but require more integration work

---

## 🆘 Troubleshooting

### Problem: PayPal button doesn't appear
**Solution:**
1. Make sure `VITE_PAYPAL_CLIENT_ID` is set in Netlify
2. Make sure it starts with `VITE_` (this makes it available to the browser)
3. Redeploy after adding variables
4. Check browser console (F12) for errors

### Problem: "PayPal subscription started" but plan doesn't update
**Solution:**
1. Check PayPal webhook logs: Developer Dashboard → Webhooks → Click your webhook → Activity
2. Check Netlify function logs: https://app.netlify.com/projects/cool-flan-309abf/logs/functions
3. Make sure webhook URL is correct
4. Wait 1-2 minutes - webhooks aren't instant

### Problem: "Failed to load PayPal SDK"
**Solution:**
1. Check your Client ID is correct
2. Make sure you're using LIVE mode Client ID for production
3. Check browser console for specific error

---

## 🌍 Going Live

When ready to accept real payments:

1. Make sure you're in PayPal **"Live"** mode (not Sandbox)
2. All Plan IDs should be from Live mode
3. Client ID should be from Live mode
4. Test with a real PayPal account
5. Make sure webhook is pointing to Live endpoint

---

## 📞 Need Help?

If you get stuck:
1. Tell me which step you're on
2. Tell me what error you see
3. I'll help you fix it!

**זה יעבוד! 🚀** (This will work!)
