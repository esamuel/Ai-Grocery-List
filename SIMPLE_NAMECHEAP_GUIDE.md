# Simple Namecheap DNS Setup - aigrocerylists.com

## 🎯 Your Mission
Add 2 DNS records to connect your domain to Netlify

## 📍 Where to Start
1. Go to: **https://ap.www.namecheap.com/domains/list/**
2. Find: **aigrocerylists.com**
3. Click: **MANAGE** button (blue button on the right)
4. Click: **Advanced DNS** tab (at the top)

## 🗑️ Step 1: Delete Old Records (if any)
Look for any records with "parking" or old IP addresses
- Click the **trash icon** 🗑️ next to each one
- Click **Yes, Remove it**

## ➕ Step 2: Add Record #1 (A Record)

**Click the big button that says: "ADD NEW RECORD"**

Fill in:
- **Type**: Select `A Record` from dropdown
- **Host**: Type `@`
- **Value**: Type `75.2.60.5`
- **TTL**: Leave as `Automatic`
- Click the **green checkmark** ✓ to save

## ➕ Step 3: Add Record #2 (CNAME Record)

**Click "ADD NEW RECORD" again**

Fill in:
- **Type**: Select `CNAME Record` from dropdown
- **Host**: Type `www`
- **Value**: Type `cool-flan-309abf.netlify.app`
- **TTL**: Leave as `Automatic`
- Click the **green checkmark** ✓ to save

## ✅ Final Result
You should see this:

```
HOST RECORDS
Type    | Host | Value                        | TTL
--------|------|------------------------------|----------
A       | @    | 75.2.60.5                    | Automatic
CNAME   | www  | cool-flan-309abf.netlify.app | Automatic
```

## ⏱️ Wait Time
- DNS changes take 5-30 minutes to work
- Sometimes up to 24 hours

## 🧪 Test Your Domain
After 30 minutes, try:
- http://aigrocerylists.com
- http://www.aigrocerylists.com

Both should open your Netlify site!

---

## 🆘 STILL CAN'T FIND "ADD NEW RECORD" BUTTON?

### Option A: Use Namecheap Live Chat Support (EASIEST!)
1. Go to: https://www.namecheap.com/support/live-chat/
2. Say: "Please add DNS records for aigrocerylists.com"
3. Give them:
   - A Record: Host = @, Value = 75.2.60.5
   - CNAME: Host = www, Value = cool-flan-309abf.netlify.app
4. They'll do it for you in 5 minutes! ⚡

### Option B: Try a Different Browser
- If you're using Safari, try Chrome
- If you're using Chrome, try Firefox
- Sometimes the interface loads differently

### Option C: Use the Mobile App
Download the Namecheap app on your phone - sometimes it's easier!

### Option D: Desktop vs Mobile
If you're on mobile, try using a desktop computer - the interface is clearer

---

## 📞 Need Help?
Namecheap Support is available 24/7:
- **Live Chat**: https://www.namecheap.com/support/live-chat/
- **Phone**: Show your local Namecheap support number
- They are VERY helpful and will do this for you!

**Don't be shy - their job is to help you! 😊**
