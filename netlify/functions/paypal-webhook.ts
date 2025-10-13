import type { Handler, HandlerEvent } from '@netlify/functions';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { UserSubscription, PlanTier } from '../../types';
import crypto from 'crypto';

// Initialize Firebase Admin
if (getApps().length === 0) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : null;

  if (serviceAccount) {
    initializeApp({
      credential: cert(serviceAccount),
    });
  }
}

/**
 * Verify PayPal webhook signature
 * https://developer.paypal.com/api/rest/webhooks/
 */
async function verifyPayPalWebhook(event: HandlerEvent): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.warn('⚠️ PAYPAL_WEBHOOK_ID not set. Skipping signature verification.');
    return true; // Allow for testing
  }

  // PayPal webhook verification headers
  const transmissionId = event.headers['paypal-transmission-id'];
  const transmissionTime = event.headers['paypal-transmission-time'];
  const certUrl = event.headers['paypal-cert-url'];
  const authAlgo = event.headers['paypal-auth-algo'];
  const transmissionSig = event.headers['paypal-transmission-sig'];

  if (!transmissionId || !transmissionTime || !transmissionSig) {
    console.error('❌ Missing PayPal webhook headers');
    return false;
  }

  // For production, implement full verification using PayPal SDK
  // For now, we'll do basic verification
  console.log('ℹ️ PayPal webhook headers present. Full verification should be implemented.');
  return true;
}

/**
 * Map PayPal plan ID to our plan tier
 */
function getPlanFromPayPalPlanId(planId: string): PlanTier | null {
  const planMap: Record<string, PlanTier> = {
    [process.env.VITE_PAYPAL_PLAN_PRO_MONTHLY || '']: 'pro',
    [process.env.VITE_PAYPAL_PLAN_PRO_YEARLY || '']: 'pro',
    [process.env.VITE_PAYPAL_PLAN_FAMILY_MONTHLY || '']: 'family',
    [process.env.VITE_PAYPAL_PLAN_FAMILY_YEARLY || '']: 'family',
  };

  return planMap[planId] || null;
}

/**
 * Update subscription in Firestore
 */
async function updateSubscriptionInFirestore(
  userId: string,
  subscriptionData: Partial<UserSubscription>
): Promise<void> {
  const db = getFirestore();
  const docRef = db.collection('subscriptions').doc(userId);

  const updateData = {
    ...subscriptionData,
    updatedAt: new Date().toISOString(),
  };

  await docRef.set(updateData, { merge: true });
  console.log('✅ Updated subscription in Firestore for user:', userId);
}

/**
 * Handle BILLING.SUBSCRIPTION.ACTIVATED
 */
async function handleSubscriptionActivated(eventData: any): Promise<void> {
  console.log('🔔 Handling PayPal subscription activated');

  const subscription = eventData.resource;
  const subscriptionId = subscription.id;
  const planId = subscription.plan_id;

  // Get user ID from custom_id field (we'll need to set this when creating subscription)
  const userId = subscription.custom_id;

  if (!userId) {
    console.error('❌ No user ID in PayPal subscription custom_id');
    return;
  }

  const plan = getPlanFromPayPalPlanId(planId);
  if (!plan) {
    console.error('❌ Unknown PayPal plan ID:', planId);
    return;
  }

  const billingInfo = subscription.billing_info;
  const nextBillingTime = billingInfo?.next_billing_time;

  const subscriptionData: Partial<UserSubscription> = {
    userId,
    plan,
    status: 'active',
    provider: 'paypal',
    paypalSubscriptionId: subscriptionId,
    currentPeriodStart: new Date().toISOString(),
    currentPeriodEnd: nextBillingTime ? new Date(nextBillingTime).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  };

  await updateSubscriptionInFirestore(userId, subscriptionData);
}

/**
 * Handle BILLING.SUBSCRIPTION.UPDATED
 */
async function handleSubscriptionUpdated(eventData: any): Promise<void> {
  console.log('🔔 Handling PayPal subscription updated');

  const subscription = eventData.resource;
  const userId = subscription.custom_id;

  if (!userId) {
    console.error('❌ No user ID in PayPal subscription');
    return;
  }

  const status = subscription.status.toLowerCase();
  const billingInfo = subscription.billing_info;
  const nextBillingTime = billingInfo?.next_billing_time;

  const subscriptionData: Partial<UserSubscription> = {
    status: status === 'active' ? 'active' : status === 'suspended' ? 'past_due' : 'canceled',
    currentPeriodEnd: nextBillingTime ? new Date(nextBillingTime).toISOString() : undefined,
  };

  await updateSubscriptionInFirestore(userId, subscriptionData);
}

/**
 * Handle BILLING.SUBSCRIPTION.CANCELLED
 */
async function handleSubscriptionCancelled(eventData: any): Promise<void> {
  console.log('🔔 Handling PayPal subscription cancelled');

  const subscription = eventData.resource;
  const userId = subscription.custom_id;

  if (!userId) {
    console.error('❌ No user ID in PayPal subscription');
    return;
  }

  await updateSubscriptionInFirestore(userId, {
    plan: 'free',
    status: 'canceled',
    cancelAtPeriodEnd: false,
  });
}

/**
 * Handle BILLING.SUBSCRIPTION.SUSPENDED (payment failed)
 */
async function handleSubscriptionSuspended(eventData: any): Promise<void> {
  console.log('🔔 Handling PayPal subscription suspended');

  const subscription = eventData.resource;
  const userId = subscription.custom_id;

  if (!userId) {
    console.error('❌ No user ID in PayPal subscription');
    return;
  }

  await updateSubscriptionInFirestore(userId, {
    status: 'past_due',
  });
}

/**
 * Main webhook handler
 */
export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Verify webhook signature
    const isValid = await verifyPayPalWebhook(event);
    if (!isValid) {
      return { statusCode: 401, body: 'Invalid webhook signature' };
    }

    const webhookEvent = JSON.parse(event.body || '{}');
    const eventType = webhookEvent.event_type;

    console.log('📨 Received PayPal webhook:', eventType);

    // Handle different event types
    switch (eventType) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        await handleSubscriptionActivated(webhookEvent);
        break;

      case 'BILLING.SUBSCRIPTION.UPDATED':
        await handleSubscriptionUpdated(webhookEvent);
        break;

      case 'BILLING.SUBSCRIPTION.CANCELLED':
        await handleSubscriptionCancelled(webhookEvent);
        break;

      case 'BILLING.SUBSCRIPTION.SUSPENDED':
        await handleSubscriptionSuspended(webhookEvent);
        break;

      case 'BILLING.SUBSCRIPTION.EXPIRED':
        await handleSubscriptionCancelled(webhookEvent);
        break;

      default:
        console.log('ℹ️ Unhandled PayPal event type:', eventType);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };
  } catch (err: any) {
    console.error('❌ PayPal webhook error:', err.message);
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`,
    };
  }
};
