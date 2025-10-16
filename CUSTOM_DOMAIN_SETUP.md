# How to Connect aigrocerylist.com to Your Netlify Site

## Overview
You'll point your domain `aigrocerylist.com` to your Netlify site so people can access it at your custom domain instead of `cool-flan-309abf.netlify.app`.

**Time needed:** 15-30 minutes (DNS can take up to 24 hours to fully propagate)

---

## Step 1: Buy the Domain (If You Haven't Already)

If you don't own `aigrocerylist.com` yet:

### Option A: Buy Through Netlify (Easiest)
1. Go to: https://app.netlify.com
2. Click on your site: `cool-flan-309abf`
3. Click "Domain management" or "Domains" (top menu)
4. Click "Add a domain"
5. Type: `aigrocerylist.com`
6. If available, Netlify will let you buy it directly (~$15-20/year)
7. **Benefit:** Everything is automatic - no DNS setup needed!

### Option B: Buy from Domain Registrar
Popular registrars that work in Israel:
- **Namecheap** - https://www.namecheap.com (~$10/year)
- **GoDaddy** - https://www.godaddy.com (~$15/year)
- **Google Domains** - https://domains.google
- **Israeli:** **IID.co.il** - https://www.iid.co.il (Israeli registrar)

1. Go to one of these sites
2. Search for `aigrocerylist.com`
3. Add to cart and purchase
4. You'll get login credentials to manage your domain

---

## Step 2: Add Domain to Netlify

### If you bought through Netlify:
✅ Skip to Step 4 - it's already done!

### If you bought from another registrar:

1. Go to: https://app.netlify.com
2. Click on your site: `cool-flan-309abf`
3. Click **"Domain management"** or **"Domains"** (in top menu)
4. Click **"Add a domain"** or **"Add custom domain"** button
5. Type: `aigrocerylist.com`
6. Click "Verify"
7. Netlify will ask: "Do you own this domain?" → Click **"Yes, add domain"**
8. You'll see it added but with a warning ⚠️ "Awaiting DNS propagation"

---

## Step 3: Configure DNS Records

Now you need to tell your domain registrar to point to Netlify.

### Get Netlify's DNS Information

In Netlify (Domain management page), you'll see instructions. You need to add these DNS records:

**Primary domain (aigrocerylist.com):**
- Type: `A` record
- Name/Host: `@` (or leave blank)
- Value: Netlify's IP (they'll show you, usually something like `75.2.60.5`)

**WWW subdomain (www.aigrocerylist.com):**
- Type: `CNAME` record
- Name/Host: `www`
- Value: `cool-flan-309abf.netlify.app` (your Netlify subdomain)

---

## Step 4: Update DNS at Your Registrar

The exact steps depend on where you bought the domain:

### For Namecheap:
1. Log in to https://www.namecheap.com
2. Go to "Domain List"
3. Click "Manage" next to `aigrocerylist.com`
4. Click "Advanced DNS" tab
5. Click "Add New Record"

**Record 1:**
- Type: `A Record`
- Host: `@`
- Value: `75.2.60.5` (Netlify's IP - check Netlify for current IP)
- TTL: `Automatic`
- Click ✓ (checkmark)

**Record 2:**
- Type: `CNAME Record`
- Host: `www`
- Value: `cool-flan-309abf.netlify.app`
- TTL: `Automatic`
- Click ✓ (checkmark)

6. **Remove** any other A or CNAME records that might conflict

### For GoDaddy:
1. Log in to https://www.godaddy.com
2. Go to "My Products" → "Domains"
3. Click on `aigrocerylist.com`
4. Click "Manage DNS"
5. Scroll to "Records" section

**Record 1:**
- Type: `A`
- Name: `@`
- Value: `75.2.60.5` (Netlify's IP)
- TTL: `1 hour` (default)
- Click "Add"

**Record 2:**
- Type: `CNAME`
- Name: `www`
- Value: `cool-flan-309abf.netlify.app`
- TTL: `1 hour`
- Click "Add"

6. **Delete** conflicting records (old A records pointing elsewhere)

### For Google Domains:
1. Log in to https://domains.google.com
2. Click on `aigrocerylist.com`
3. Click "DNS" in left sidebar
4. Scroll to "Custom resource records"

**Record 1:**
- Name: `@`
- Type: `A`
- TTL: `1H`
- Data: `75.2.60.5`
- Click "Add"

**Record 2:**
- Name: `www`
- Type: `CNAME`
- TTL: `1H`
- Data: `cool-flan-309abf.netlify.app.` (note the period at the end)
- Click "Add"

### For IID.co.il (Israeli):
1. Log in to https://www.iid.co.il
2. Go to domain management (ניהול דומיינים)
3. Click on `aigrocerylist.com`
4. Look for "DNS Records" or "רשומות DNS"
5. Add the same A and CNAME records as above

---

## Step 5: Wait for DNS Propagation

### How Long?
- **Minimum:** 30 minutes
- **Typical:** 2-4 hours
- **Maximum:** 24-48 hours (rare)

### Check Status
While waiting, you can check if DNS is working:

**Method 1: Netlify Dashboard**
- Go to your site in Netlify
- Domain management page
- The ⚠️ warning will turn to ✅ green checkmark when ready

**Method 2: Online DNS Checker**
- Go to: https://www.whatsmydns.net
- Enter: `aigrocerylist.com`
- Select: `A` record type
- Click "Search"
- You should see Netlify's IP (`75.2.60.5`) appear worldwide

**Method 3: Terminal (Mac)**
```bash
dig aigrocerylist.com
```
Look for the A record pointing to Netlify's IP.

---

## Step 6: Enable HTTPS (Free SSL Certificate)

Once DNS is working:

1. In Netlify → Domain management
2. Scroll to "HTTPS" section
3. Click **"Verify DNS configuration"**
4. Click **"Provision certificate"**
5. Wait 1-2 minutes
6. You'll see: ✅ "Your site has HTTPS enabled"

Now your site is accessible at:
- ✅ `https://aigrocerylist.com`
- ✅ `https://www.aigrocerylist.com`

Netlify automatically:
- Redirects HTTP → HTTPS (secure)
- Redirects `www.aigrocerylist.com` → `aigrocerylist.com` (or vice versa, you can choose)

---

## Step 7: Update Your App's Environment Variables

After domain is working, update your environment variables in Netlify:

1. Go to Site configuration → Environment variables
2. Find `SITE_URL`
3. Click "Edit"
4. Change from: `https://cool-flan-309abf.netlify.app`
5. Change to: `https://aigrocerylist.com`
6. Click "Save"
7. **Important:** Trigger a new deploy (Deploys → Trigger deploy → Deploy site)

Also update webhooks:

**PayPal Webhook:**
- Change URL to: `https://aigrocerylist.com/.netlify/functions/paypal-webhook`

**Stripe Webhook** (if you set it up later):
- Change URL to: `https://aigrocerylist.com/.netlify/functions/stripe-webhook`

---

## Step 8: Test Everything

1. Visit: `https://aigrocerylist.com`
2. Your app should load! 🎉
3. Try: `http://aigrocerylist.com` → Should redirect to HTTPS
4. Try: `https://www.aigrocerylist.com` → Should work
5. Test sign-in, subscription, all features

---

## Common Issues & Solutions

### Problem: "Domain is already registered with Netlify"
**Solution:**
- Someone else owns this domain
- Choose a different domain name
- Or buy it from the current owner

### Problem: DNS not propagating after 24 hours
**Solution:**
1. Check DNS records are correct (no typos)
2. Make sure there are no conflicting records
3. Try flushing your computer's DNS cache:
   ```bash
   # Mac
   sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder

   # Windows
   ipconfig /flushdns
   ```

### Problem: "SSL Certificate Failed to Provision"
**Solution:**
1. Make sure DNS is fully propagated (wait 24 hours)
2. Make sure both `@` (root) and `www` records are set
3. Try clicking "Provision certificate" again
4. Contact Netlify support if still failing

### Problem: Site works on old URL but not new domain
**Solution:**
1. Clear browser cache
2. Try incognito/private browsing mode
3. Check DNS propagation at whatsmydns.net
4. Wait a bit longer for DNS to propagate

### Problem: "Too many redirects" error
**Solution:**
1. In Netlify → Domain settings
2. Make sure "Force HTTPS" is enabled
3. Check there are no redirect loops in your DNS settings

---

## Domain Preferences in Netlify

You can choose which is your primary domain:

1. Netlify → Domain management
2. Under "Custom domains" you'll see both:
   - `aigrocerylist.com`
   - `www.aigrocerylist.com`
3. Click "Options" (three dots) next to your preferred one
4. Click "Set as primary domain"

**Recommendation:** Use `aigrocerylist.com` (without www) as primary - it's shorter and modern.

---

## Email Setup (Bonus)

Want to have `contact@aigrocerylist.com` email?

### Option 1: Google Workspace (Paid, ~$6/month)
1. Go to: https://workspace.google.com
2. Sign up using your domain
3. Get professional email: `you@aigrocerylist.com`
4. Includes Gmail, Calendar, Drive, etc.

### Option 2: Zoho Mail (Free for 1 user)
1. Go to: https://www.zoho.com/mail
2. Sign up with your domain
3. Free for up to 5 users
4. Add MX records to your DNS (they'll guide you)

### Option 3: Forwarder (Free, Simple)
1. In your domain registrar (Namecheap, GoDaddy, etc.)
2. Look for "Email forwarding" settings
3. Forward `contact@aigrocerylist.com` → your personal email
4. No inbox, but you can receive emails

---

## Yearly Costs

**Domain renewal:** ~$10-20/year (varies by registrar)

**That's it!** Everything else is free:
- ✅ Netlify hosting: Free
- ✅ SSL certificate: Free (auto-renewed)
- ✅ Bandwidth: Free (100GB/month)
- ✅ CDN: Free (global)

---

## Quick Reference Card

**What to do:**
1. Buy `aigrocerylist.com` (if you haven't)
2. Add domain to Netlify
3. Update DNS records at registrar:
   - `A` record: `@` → `75.2.60.5`
   - `CNAME` record: `www` → `cool-flan-309abf.netlify.app`
4. Wait for DNS (check at whatsmydns.net)
5. Enable HTTPS in Netlify
6. Update `SITE_URL` env variable
7. Test at `https://aigrocerylist.com`

**Done!** 🎉

---

## Need Help?

Tell me:
1. Where did you buy the domain? (or planning to buy)
2. Which step are you stuck on?
3. What error do you see (if any)?

I'll help you through it! 🚀
