import React, { useEffect, useState } from 'react';

export type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

const DEFAULT_ITEMS: ChecklistItem[] = [
  // ✅ COMPLETED
  { id: 'core-features', label: '✅ Core grocery list with AI categorization (EN/HE/ES)', done: true },
  { id: 'firebase-setup', label: '✅ Firebase authentication and family sharing', done: true },
  { id: 'voice-input', label: '✅ Voice recognition with multi-language support', done: true },
  { id: 'price-tracking', label: '✅ Price tracking with currency support (USD/ILS/EUR/GBP)', done: true },
  { id: 'spending-insights', label: '✅ Spending insights and analytics dashboard', done: true },
  { id: 'price-alerts', label: '✅ Price alerts (best deals, price spikes, trends)', done: true },
  { id: 'store-comparison', label: '✅ Store comparison and best store recommendations', done: true },
  { id: 'daily-purchases', label: '✅ Daily purchase tracking with history by date', done: true },
  { id: 'export-reports', label: '✅ Export & reports (CSV, spending reports)', done: true },
  { id: 'smart-suggestions', label: '✅ Smart suggestions with predictive analytics', done: true },
  { id: 'pwa-setup', label: '✅ PWA setup with offline support and install prompts', done: true },
  { id: 'onboarding-checklist', label: '✅ Onboarding modal (family sharing, voice, import guide)', done: true },
  { id: 'pricing-packaging', label: '✅ Pricing & packaging designed (Free, Pro $4.99, Family $7.99)', done: true },
  { id: 'paywall', label: '✅ In-app paywall with 3 tiers and 7-day free trial', done: true },
  
  // 🚧 IN PROGRESS / TODO
  { id: 'payments-stack', label: '🚧 Integrate Stripe payment processing (selected: Stripe + RevenueCat)', done: false },
  { id: 'analytics', label: '🚧 Add analytics tracking (PostHog or Mixpanel for events)', done: false },
  { id: 'landing-site', label: '🚧 Build landing site with pricing, features, and SEO pages', done: false },
  { id: 'legal', label: '🚧 Legal docs: Privacy Policy, Terms of Service, GDPR compliance', done: false },
  { id: 'referral', label: '🚧 Referral program (give/get 1 month Pro) and share links', done: false },
  { id: 'store-readiness', label: '🚧 App Store assets: screenshots, videos, store copy, privacy labels', done: false },
  { id: 'stability-cost', label: '🚧 Production hardening: Firestore rules, Sentry, AI guardrails', done: false },
  { id: 'content-seo', label: '🚧 Content marketing: blog posts, comparison pages, localized SEO', done: false },
  { id: 'launch-roadmap', label: '🚧 Launch plan: beta testing → soft launch → public launch', done: false },
  { id: 'growth-channels', label: '🚧 Growth strategy: bloggers, Reddit, TikTok, email marketing', done: false },
];

const STORAGE_KEY = 'launchChecklistV2'; // Updated to show completed items

export function LaunchChecklistPage({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<ChecklistItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return DEFAULT_ITEMS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const toggleItem = (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, done: !i.done } : i));
  };

  const markAll = (done: boolean) => {
    setItems(prev => prev.map(i => ({ ...i, done })));
  };

  const reset = () => {
    setItems(DEFAULT_ITEMS);
  };

  const completed = items.filter(i => i.done).length;

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Launch Checklist</h1>
        <button onClick={onClose} className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Close</button>
      </div>

      <p className="text-gray-600 mb-4">Track key steps for launching and monetizing the app. Your progress is saved on this device.</p>

      <div className="flex gap-2 mb-4">
        <span className="text-sm text-gray-600">{completed} / {items.length} completed</span>
        <div className="ml-auto flex gap-2">
          <button onClick={() => markAll(true)} className="px-3 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200">Mark all done</button>
          <button onClick={() => markAll(false)} className="px-3 py-1.5 rounded-lg bg-yellow-100 text-yellow-700 hover:bg-yellow-200">Mark all not done</button>
          <button onClick={reset} className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200">Reset</button>
        </div>
      </div>

      <ul className="space-y-2">
        {items.map(item => (
          <li key={item.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200">
            <input
              id={item.id}
              type="checkbox"
              checked={item.done}
              onChange={() => toggleItem(item.id)}
              className="mt-1 h-4 w-4"
            />
            <label htmlFor={item.id} className={`flex-1 ${item.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
              {item.label}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
