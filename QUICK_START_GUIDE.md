# Quick Start: Get Your Subscription System Working (30 Minutes)

## What You'll Accomplish
By the end of this guide, users will be able to subscribe to Pro/Family plans and pay you money via Stripe.

---

## Part 1: Get Your Firebase Service Account (5 minutes)

### Step 1: Download the Firebase Key
1. Open this link: https://console.firebase.google.com
2. Click on your project
3. Click the ⚙️ gear icon (top left) → "Project settings"
4. Click "Service accounts" tab
5. Click "Generate new private key" button (big blue button)
6. Click "Generate key" in the popup
7. A file downloads (like `my-project-firebase-adminsdk-abc123.json`)
8. **Open this file in a text editor** (TextEdit, VS Code, etc.)
9. **Copy EVERYTHING** inside (all the JSON)

### Step 2: Save It Somewhere
Create a new file on your desktop called `firebase-key.txt` and paste the JSON there. We'll use it in a moment.

---

## Part 2: Set Up Stripe (10 minutes)

### Step 1: Get Your Stripe Keys
1. Go to: https://dashboard.stripe.com
2. Sign up or log in
3. Click "Developers" (top menu)
4. Click "API keys" (left sidebar)
5. You'll see two keys:
   - **Publishable key** (starts with `pk_test_...`) - We don't need this
   - **Secret key** (starts with `sk_test_...`) - Click "Reveal" and COPY this

### Step 2: Create Your Products
1. In Stripe Dashboard, click "Products" (left sidebar)
2. Click "+ Add product"

**Product 1:**
- Name: `Pro Plan - Monthly`
- Description: `Unlimited AI, price tracking, spending insights`
- Price: `4.99` USD
- Billing period: `Monthly` (select from dropdown)
- Click "Save product"
- **COPY THE PRICE ID** (you'll see something like `price_1AbCdEfGhIjKlM` - click the copy icon next to it)
- Paste it in a note: `PRO_MONTHLY = price_1AbCdEfGhIjKlM`

**Product 2:**
- Name: `Pro Plan - Yearly`
- Price: `39.99` USD
- Billing period: `Yearly`
- Click "Save product"
- **COPY THE PRICE ID**
- Paste it in a note: `PRO_YEARLY = price_2AbCdEfGhIjKlM`

**Product 3:**
- Name: `Family Plan - Monthly`
- Price: `7.99` USD
- Billing period: `Monthly`
- Click "Save product"
- **COPY THE PRICE ID**
- Paste it in a note: `FAMILY_MONTHLY = price_3AbCdEfGhIjKlM`

**Product 4:**
- Name: `Family Plan - Yearly`
- Price: `69.99` USD
- Billing period: `Yearly`
- Click "Save product"
- **COPY THE PRICE ID**
- Paste it in a note: `FAMILY_YEARLY = price_4AbCdEfGhIjKlM`

Now you should have 5 things written down:
1. Stripe Secret Key (sk_test_...)
2. Pro Monthly Price ID (price_...)
3. Pro Yearly Price ID (price_...)
4. Family Monthly Price ID (price_...)
5. Family Yearly Price ID (price_...)

---

## Part 3: Add Everything to Netlify (10 minutes)

### Step 1: Open Netlify Dashboard
1. Go to: https://app.netlify.com
2. Log in
3. Click on your site: `cool-flan-309abf`

### Step 2: Go to Environment Variables
1. Click "Site configuration" (top menu)
2. Click "Environment variables" (left sidebar)
3. You'll see a button "Add a variable" or "New variable"

### Step 3: Add Variables One by One

Click "Add a variable" and enter:

**Variable 1:**
- Key: `FIREBASE_SERVICE_ACCOUNT`
- Value: [Open that `firebase-key.txt` file you saved, copy EVERYTHING, paste here - it should be ONE long line]
- Click "Create variable"

**Variable 2:**
- Key: `STRIPE_SECRET_KEY`
- Value: [Paste your sk_test_... key]
- Click "Create variable"

**Variable 3:**
- Key: `STRIPE_PRICE_PRO_MONTHLY`
- Value: [Paste your Pro Monthly price ID]
- Click "Create variable"

**Variable 4:**
- Key: `STRIPE_PRICE_PRO_YEARLY`
- Value: [Paste your Pro Yearly price ID]
- Click "Create variable"

**Variable 5:**
- Key: `STRIPE_PRICE_FAMILY_MONTHLY`
- Value: [Paste your Family Monthly price ID]
- Click "Create variable"

**Variable 6:**
- Key: `STRIPE_PRICE_FAMILY_YEARLY`
- Value: [Paste your Family Yearly price ID]
- Click "Create variable"

**Variable 7:**
- Key: `SITE_URL`
- Value: `https://cool-flan-309abf.netlify.app`
- Click "Create variable"

**Variable 8:** (We'll fill this in later)
- Key: `STRIPE_WEBHOOK_SECRET`
- Value: `temp` (just put "temp" for now)
- Click "Create variable"

### Step 4: Redeploy Your Site
1. Click "Deploys" (top menu)
2. Click "Trigger deploy" button (dropdown)
3. Click "Deploy site"
4. Wait 2-3 minutes for it to finish

---

## Part 4: Set Up Stripe Webhook (5 minutes)

### Step 1: Add Webhook in Stripe
1. Back in Stripe Dashboard (https://dashboard.stripe.com)
2. Click "Developers" → "Webhooks"
3. Click "+ Add endpoint" button
4. Endpoint URL: `https://cool-flan-309abf.netlify.app/.netlify/functions/stripe-webhook`
5. Description: `Subscription webhooks`
6. Click "Select events" button
7. In the search box, type `checkout.session.completed` and check it
8. In the search box, type `customer.subscription.updated` and check it
9. In the search box, type `customer.subscription.deleted` and check it
10. In the search box, type `invoice.payment_failed` and check it
11. Click "Add events"
12. Click "Add endpoint"

### Step 2: Copy Webhook Secret
1. You'll now see your webhook endpoint
2. Click on it
3. Look for "Signing secret" - it starts with `whsec_...`
4. Click "Reveal" and copy it

### Step 3: Update Netlify Variable
1. Back to Netlify → Site configuration → Environment variables
2. Find `STRIPE_WEBHOOK_SECRET`
3. Click the three dots (...) next to it → "Edit"
4. Replace "temp" with your `whsec_...` secret
5. Click "Save"

### Step 4: Redeploy Again
1. Click "Deploys" → "Trigger deploy" → "Deploy site"
2. Wait 2-3 minutes

---

## Part 5: TEST IT! (5 minutes)

### Step 1: Test the Payment Flow
1. Go to your app: https://cool-flan-309abf.netlify.app
2. Sign in to your app
3. Click the ⚙️ settings icon
4. Click "💎 Upgrade to Pro"
5. Select "Pro" plan (monthly or yearly)
6. Click "Select" button
7. You should be redirected to Stripe checkout

### Step 2: Use Test Card
On the Stripe checkout page:
- Email: (any email)
- Card number: `4242 4242 4242 4242`
- Expiration: (any future date, like `12/25`)
- CVC: (any 3 digits, like `123`)
- Name: (your name)
- Click "Subscribe"

### Step 3: Verify It Worked
1. You should be redirected back to your app
2. Refresh the page
3. Open browser console (F12)
4. You should see: `✅ Loaded subscription: pro`
5. In Stripe Dashboard → Customers, you should see your new customer

---

## 🎉 Done! You're Now Accepting Payments!

### What Just Happened?
- ✅ Users can now subscribe to Pro/Family plans
- ✅ Stripe handles all the payment processing
- ✅ Your app receives webhooks and updates the user's plan
- ✅ You're earning money! 💰

---

## Next Steps (Optional, Do Later)

1. **Switch to Live Mode** (when ready to accept real money):
   - In Stripe, toggle from "Test mode" to "Live mode" (top right)
   - Get your LIVE secret key (starts with `sk_live_...`)
   - Create products again in LIVE mode
   - Update your Netlify variables with LIVE keys
   - Update webhook to use LIVE endpoint

2. **Add PayPal** (if you want):
   - Follow the PayPal section in SUBSCRIPTION_IMPLEMENTATION_GUIDE.md

3. **Add Subscription Management UI**:
   - Let users cancel, change plans, see billing history
   - Follow the guide to create SubscriptionManager component

4. **Enforce Free Tier Limits**:
   - Limit AI categorization to 50/month for free users
   - Follow the guide to add quota enforcement

---

## 🆘 Something Not Working?

### Problem: "Please sign in to upgrade" error
**Solution:** Make sure you're signed in to your app first

### Problem: Checkout page doesn't load
**Solution:**
1. Check Netlify function logs: https://app.netlify.com/projects/cool-flan-309abf/logs/functions
2. Make sure all variables are added correctly
3. Make sure you redeployed after adding variables

### Problem: Payment succeeds but plan doesn't update
**Solution:**
1. Check if webhook is receiving events: Stripe Dashboard → Developers → Webhooks → Click your endpoint → View logs
2. Check Netlify function logs for errors
3. Make sure `STRIPE_WEBHOOK_SECRET` is correct
4. Make sure `FIREBASE_SERVICE_ACCOUNT` is on ONE line with no line breaks

### Problem: "Stripe is not configured" error
**Solution:**
1. Make sure `STRIPE_SECRET_KEY` variable is added
2. Redeploy the site
3. Check the key starts with `sk_test_` or `sk_live_`

---

## 📞 Need More Help?

If you're stuck on any step:
1. Tell me exactly which step you're on
2. Tell me what error you're seeing (if any)
3. I'll walk you through it!

Remember: You're doing great! This is complex stuff, but we'll get through it together. 🚀
