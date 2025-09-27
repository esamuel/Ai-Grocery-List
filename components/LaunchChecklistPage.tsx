import React, { useEffect, useState } from 'react';

export type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

const DEFAULT_ITEMS: ChecklistItem[] = [
  { id: 'pricing-packaging', label: 'Design pricing & packaging (Free, Pro, Family) with annual discounts and free trial', done: false },
  { id: 'payments-stack', label: 'Select payments stack (Web: Stripe; iOS/Android: RevenueCat) and tech approach', done: false },
  { id: 'landing-site', label: 'Build landing site with clear CTA, FAQs, and SEO pages', done: false },
  { id: 'analytics', label: 'Integrate analytics and event tracking (activation, retention, conversion)', done: false },
  { id: 'paywall', label: 'Implement in-app paywall, free trial flow, upgrade/downgrade screens', done: false },
  { id: 'onboarding-checklist', label: 'Add onboarding checklist (invite family, add items, voice, import)', done: false },
  { id: 'referral', label: 'Referral program (give/get 1 month Pro) and share links', done: false },
  { id: 'store-readiness', label: 'Store readiness: icons, screenshots, videos, store copy, privacy labels', done: false },
  { id: 'legal', label: 'Legal & compliance: Privacy, Terms, cookie/consent, GDPR/CCPA', done: false },
  { id: 'stability-cost', label: 'Stability & cost: Firestore rules, Sentry, Gemini guardrails', done: false },
  { id: 'content-seo', label: 'Content & SEO plan (blog posts, comparison pages, i18n SEO)', done: false },
  { id: 'launch-roadmap', label: 'Launch roadmap (beta → soft launch → public) with success criteria', done: false },
  { id: 'growth-channels', label: 'Growth channels (bloggers, Reddit, TikTok demos, email list)', done: false },
];

const STORAGE_KEY = 'launchChecklistV1';

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
