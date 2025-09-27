# Aii Grocery list – Go-To-Market and Monetization Plan

Last updated: 2025-09-25

## Overview

This document outlines the go-to-market strategy, platform sequencing, pricing, payments, growth tactics, and operational readiness for launching and scaling the Aii Grocery list app.

## 1) Platforms and Sequencing

- **Web first (PWA)**
  - Fastest to market. Your app is already deployed (Netlify).
  - Add PWA support for installable experience and offline shell.
  - Action: Add Vite PWA plugin, app icons, `manifest.json`, service worker caching strategy.

- **iOS and Android via Capacitor**
  - Wrap the existing React/Vite codebase with Capacitor.
  - Use native bridges primarily for in-app purchases and notifications.
  - Action: Set up Capacitor projects, store assets, and CI builds.

- **Entitlement syncing across platforms**
  - Use RevenueCat as entitlement source of truth for mobile.
  - Sync Web (Stripe) purchases to RevenueCat via backend/API.
  - Identity: Use Firebase Auth `uid` as `app_user_id` consistently.

## 2) Pricing and Packaging

- **Free**
  - Core list, basic categories, 1 shared list, limited favorites.
  - Monthly AI credits (e.g., 50 categorized/translated items) to experience value.

- **Pro (Individual)**
  - Unlimited AI categorization/translation with fair-use controls.
  - Unlimited shared lists, history, smart import with semantic dedupe, priority support.
  - Voice + multilingual features included.
  - Price: $3.99–$4.99/month, $29.99–$39.99/year (40–50% off annually).

- **Family (Up to 5 members)**
  - Everything in Pro plus admin controls, invites, shared favorites, activity feed.
  - Price: $6.99–$8.99/month, $59.99–$69.99/year.

- **Trials and promos**
  - 7-day free trial on Pro/Family.
  - Launch promo: 20% off annual for first 30 days post-launch.
  - Referral: give 1 month Pro, get 1 month Pro upon paid conversion.

## 3) Payment Stack and Implementation

- **Web (Stripe)**
  - Stripe Checkout + Billing + Customer Portal.
  - Store Firebase Auth `uid` in Stripe customer metadata.
  - Webhooks: Update Firestore entitlement + sync to RevenueCat.

- **iOS/Android (RevenueCat)**
  - RevenueCat manages StoreKit/Google Play Billing and receipts.
  - Define entitlements: `pro`, `family`.
  - RevenueCat webhooks notify backend for state changes.

- **Cross-platform sync**
  - If purchased on Web (Stripe), grant entitlement in RevenueCat via API using the same `uid`.
  - If purchased on mobile, reflect entitlement in Firestore for Web access.

## 4) Cost and Stability Guardrails

- **Gemini AI cost controls**
  - Batch requests; cache by normalized item + target language.
  - Rate-limit per user; enforce monthly AI credits on Free tier.
  - Track token usage; soft warnings at thresholds.

- **Firestore performance and security**
  - Tighten security rules; use indexes for common queries.
  - Batched writes; server timestamps.
  - Add Sentry for error monitoring.

## 5) Positioning and Messaging

- **Personas**
  - Busy families, multilingual households, roommates.

- **Value props**
  - Automatic categorization and translation saves time.
  - Voice capture in your language.
  - Real-time shared list; prevents duplicates across languages.

- **Why now**
  - Increasingly collaborative and multilingual shopping workflows.

## 6) Activation and Paywall UX

- **Onboarding checklist**
  - Add 5 items (see AI categorization).
  - Invite 1 family member.
  - Try voice once (auto language selection).
  - Import a sample list (translation + semantic dedupe).

- **Paywall triggers & design**
  - Trigger when hitting Free AI credit limit, inviting >1 member, or accessing premium features.
  - Simple comparison table (Free vs Pro vs Family), testimonials, annual savings emphasis.
  - Keep “Continue free” to reduce abandonment.

## 7) Analytics, Metrics, and Experiments

- **Stack**
  - Product analytics: PostHog or Mixpanel.
  - Error monitoring: Sentry.
  - Optional for mobile: Firebase Analytics.

- **Core events**
  - Signup, onboarding step completion, items added, voice used, import used.
  - AI categorized items count, invites sent/accepted.
  - Paywall viewed, trial started, subscription purchased.
  - Churned, reactivated.

- **KPIs**
  - Activation rate (onboarding completion), D1/D7/D30 retention.
  - Trial start rate, trial-to-paid conversion.
  - ARPU, churn, LTV to CAC.

- **A/B tests**
  - Paywall variants, annual default, testimonial placement.
  - Free AI credit cap (e.g., 30 vs 50), trial length (7 vs 14 days).

## 8) Launch Assets and ASO/SEO

- **Landing site**
  - Hero with 3 core value props and install links.
  - Demo GIF of multilingual categorization + voice.
  - Feature grid, pricing, FAQ, Privacy & Terms, social proof.
  - SEO pages: “Grocery list app Hebrew”, “Spanish grocery list app”, “Family shared grocery list”, “AI grocery list”.

- **App Store Optimization**
  - Localized screenshots (EN/HE/ES) and a short preview video.
  - Keywords: multilingual grocery, family list, shared shopping, Hebrew, Spanish, AI.
  - Localized store copy.

- **Community & partnerships**
  - Food bloggers, parenting/family budgeting blogs.
  - Israeli and Spanish-speaking communities; relevant subreddits.
  - TikTok/Reels demonstrating voice + translation + shared sync.
  - Product Hunt launch narrative: “Speak your list; we translate and organize for your family.”

## 9) Legal and Compliance

- Privacy Policy, Terms of Service, Cookie/Consent banner (Web).
- GDPR/CCPA request flow; data deletion tied to Firebase Auth.
- App store readiness: subscription disclosure, restore purchases, age rating, privacy labels.

## 10) Operational Readiness

- **Support**
  - In-app Help & Feedback, email support, lightweight KB (Notion/HelpKit).
  - Auto-tag feedback by feature for roadmap input.

- **Reliability**
  - Target SLO: 99.9% for list sync.
  - Alerting for Firestore, API latency, and token anomalies.
  - Backups/export option for user trust.

## 11) 90-Day Launch Roadmap

- **Weeks 1–2**
  - PWA setup and install prompts.
  - Paywall + Stripe on Web; plans and trials.
  - Analytics events + Sentry.
  - Onboarding checklist + sample import.
  - Landing site (pricing + localized SEO pages).

- **Weeks 3–4**
  - RevenueCat integration and entitlement sync from Stripe.
  - Capacitor builds and store assets.
  - Legal docs and privacy pages.
  - Referral program MVP.

- **Weeks 5–6**
  - Soft launch on Web; run small paid tests + community posts.
  - Iterate on onboarding and paywall.
  - Prep App Store/Play Store submissions.

- **Weeks 7–8**
  - Mobile launch; PR/community push; Product Hunt.
  - Creators outreach and UGC campaigns.

- **Weeks 9–12**
  - Iterate pricing/paywall; add languages if demand.
  - Scale content/SEO and partnerships.
  - Monitor KPIs; tune AI credits and caching.

## 12) Action Items (High Priority)

- Approve packaging and price points by region.
- Approve analytics stack (PostHog or Mixpanel) and event schema.
- Approve Stripe + RevenueCat approach; scaffold entitlement flow.
- Approve PWA plugin and install UX.

---

## TODO Tracking

- [x] Decide platform sequencing (Web/PWA → iOS/Android via Capacitor) and monetization model
- [ ] Design pricing & packaging (Free, Pro, Family) with annual discounts and free trial
- [ ] Select payments stack (Web: Stripe; iOS/Android: RevenueCat) and tech approach
- [ ] Build landing site with clear CTA, FAQs, and SEO pages
- [ ] Integrate analytics and event tracking (activation, retention, conversion)
- [ ] Implement in-app paywall, free trial flow, upgrade/downgrade screens
- [ ] Add onboarding checklist (invite family, add items, voice, import)
- [ ] Referral program (give/get 1 month Pro) and share links
- [ ] Store readiness: icons, screenshots, videos, store copy, privacy labels
- [ ] Legal & compliance: Privacy, Terms, cookie/consent, GDPR/CCPA
- [ ] Stability & cost: Firestore rules, Sentry, Gemini guardrails
- [ ] Content & SEO plan (blog posts, comparison pages, i18n SEO)
- [ ] Launch roadmap (beta → soft launch → public) with success criteria
- [ ] Growth channels (bloggers, Reddit, TikTok demos, email list)
