import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import type { UserSubscription, PlanTier, SubscriptionStatus, PaymentProvider } from '../types';

// Get Firestore instance
function getDb() {
  const anyFirebase: any = (globalThis as any);
  if (!anyFirebase.__firebase_db) {
    try {
      const db = getFirestore();
      anyFirebase.__firebase_db = db;
    } catch (e) {
      throw new Error('Firestore not initialized yet.');
    }
  }
  return anyFirebase.__firebase_db;
}

/**
 * Get user's subscription data from Firestore
 */
export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  try {
    const db = getDb();
    const docRef = doc(db, 'subscriptions', userId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      // No subscription doc = free tier
      return createDefaultSubscription(userId);
    }

    return docSnap.data() as UserSubscription;
  } catch (e) {
    console.error('Failed to get user subscription:', e);
    return createDefaultSubscription(userId);
  }
}

/**
 * Create default free tier subscription
 */
function createDefaultSubscription(userId: string): UserSubscription {
  const now = new Date().toISOString();
  return {
    userId,
    plan: 'free',
    status: 'active',
    provider: 'stripe', // default, not actually used for free
    currentPeriodStart: now,
    currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
    createdAt: now,
    updatedAt: now,
    usageStats: {
      aiCategorizationsThisMonth: 0,
      lastResetDate: now,
    },
  };
}

/**
 * Update user's subscription in Firestore
 */
export async function updateUserSubscription(
  userId: string,
  updates: Partial<UserSubscription>
): Promise<void> {
  try {
    const db = getDb();
    const docRef = doc(db, 'subscriptions', userId);

    // Check if document exists
    const docSnap = await getDoc(docRef);

    const dataToSave = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (!docSnap.exists()) {
      // Create new subscription document
      const newSub = {
        ...createDefaultSubscription(userId),
        ...dataToSave,
      };
      await setDoc(docRef, newSub);
    } else {
      // Update existing document
      await updateDoc(docRef, dataToSave);
    }

    console.log('✅ Subscription updated for user:', userId);
  } catch (e) {
    console.error('Failed to update user subscription:', e);
    throw e;
  }
}

/**
 * Create a new paid subscription (called after successful payment)
 */
export async function createPaidSubscription(
  userId: string,
  plan: PlanTier,
  provider: PaymentProvider,
  providerData: {
    customerId?: string;
    subscriptionId: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    trialEnd?: Date;
  }
): Promise<void> {
  const now = new Date().toISOString();
  const subscription: UserSubscription = {
    userId,
    plan,
    status: providerData.trialEnd ? 'trialing' : 'active',
    provider,
    currentPeriodStart: providerData.currentPeriodStart.toISOString(),
    currentPeriodEnd: providerData.currentPeriodEnd.toISOString(),
    createdAt: now,
    updatedAt: now,
  };

  if (provider === 'stripe') {
    subscription.stripeCustomerId = providerData.customerId;
    subscription.stripeSubscriptionId = providerData.subscriptionId;
  } else if (provider === 'paypal') {
    subscription.paypalSubscriptionId = providerData.subscriptionId;
  }

  if (providerData.trialEnd) {
    subscription.trialStart = now;
    subscription.trialEnd = providerData.trialEnd.toISOString();
  }

  const db = getDb();
  const docRef = doc(db, 'subscriptions', userId);
  await setDoc(docRef, subscription);

  console.log('✅ Created paid subscription for user:', userId, 'plan:', plan);
}

/**
 * Cancel subscription (set to cancel at period end)
 */
export async function cancelSubscription(userId: string): Promise<void> {
  await updateUserSubscription(userId, {
    cancelAtPeriodEnd: true,
    status: 'canceled',
  });
}

/**
 * Check if user has access to a feature based on their plan
 */
export function hasFeatureAccess(
  subscription: UserSubscription | null,
  feature: 'price_tracking' | 'unlimited_ai' | 'unlimited_lists' | 'spending_insights' | 'family_sharing'
): boolean {
  if (!subscription || subscription.status !== 'active') {
    return false; // No active subscription = free tier only
  }

  const plan = subscription.plan;

  // Feature access matrix
  const featureAccess = {
    free: [] as string[],
    pro: ['price_tracking', 'unlimited_ai', 'unlimited_lists', 'spending_insights'],
    family: ['price_tracking', 'unlimited_ai', 'unlimited_lists', 'spending_insights', 'family_sharing'],
  };

  // Free tier has no premium features
  if (plan === 'free') {
    return false;
  }

  return featureAccess[plan].includes(feature);
}

/**
 * Increment AI categorization usage for free tier users
 */
export async function incrementAICategorization(userId: string, subscription: UserSubscription): Promise<boolean> {
  // Pro and Family plans have unlimited
  if (subscription.plan !== 'free') {
    return true;
  }

  const now = new Date();
  const stats = subscription.usageStats || { aiCategorizationsThisMonth: 0, lastResetDate: now.toISOString() };
  const lastReset = new Date(stats.lastResetDate || 0);

  // Reset counter if it's a new month
  if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
    stats.aiCategorizationsThisMonth = 0;
    stats.lastResetDate = now.toISOString();
  }

  // Check if user has exceeded limit (50 per month for free tier)
  const FREE_TIER_LIMIT = 50;
  if (stats.aiCategorizationsThisMonth >= FREE_TIER_LIMIT) {
    return false; // Limit exceeded
  }

  // Increment counter
  stats.aiCategorizationsThisMonth += 1;

  await updateUserSubscription(userId, {
    usageStats: stats,
  });

  return true; // Success
}

/**
 * Get remaining AI categorizations for free tier users
 */
export function getRemainingAICategorizations(subscription: UserSubscription): number | null {
  if (subscription.plan !== 'free') {
    return null; // Unlimited for paid plans
  }

  const FREE_TIER_LIMIT = 50;
  const used = subscription.usageStats?.aiCategorizationsThisMonth || 0;
  return Math.max(0, FREE_TIER_LIMIT - used);
}
