/**
 * Subscriptions — DISABLED (Oct 2026 Supabase migration).
 * The paid layer (Stripe/PayPal/promo codes) was dropped; the app is free for the family.
 * Every user gets the full "family" plan. Kept as a module so existing callers compile unchanged.
 * To bring payments back, store plans in a gl_subscriptions table and restore the webhooks.
 */
import type { UserSubscription } from '../types';

function fullAccessSubscription(userId: string): UserSubscription {
  const now = new Date().toISOString();
  return {
    userId,
    plan: 'family',
    status: 'active',
    provider: 'stripe',
    currentPeriodStart: now,
    currentPeriodEnd: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: now,
    updatedAt: now,
    usageStats: { aiCategorizationsThisMonth: 0, lastResetDate: now },
  };
}

export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  return fullAccessSubscription(userId);
}

export async function updateUserSubscription(userId: string, _updates: Partial<UserSubscription>): Promise<void> {
  void userId;
}

export async function createPaidSubscription(userId: string): Promise<UserSubscription> {
  return fullAccessSubscription(userId);
}

export async function cancelSubscription(_userId: string): Promise<void> {}

export function hasFeatureAccess(
  _subscription: UserSubscription | null,
  _feature: 'price_tracking' | 'unlimited_ai' | 'unlimited_lists' | 'spending_insights' | 'family_sharing'
): boolean {
  return true;
}

export async function incrementAICategorization(_userId: string, _subscription: UserSubscription): Promise<boolean> {
  return true;
}

export function getRemainingAICategorizations(_subscription: UserSubscription): number | null {
  return null; // unlimited
}
