import type { Handler, HandlerEvent } from '@netlify/functions';
import Stripe from 'stripe';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { UserSubscription, PlanTier } from '../../types';

// Initialize Firebase Admin (only once)
if (getApps().length === 0) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : null;

  if (serviceAccount) {
    initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT not configured. Webhook will not work in production.');
  }
}

const stripeSecret = process.env.STRIPE_SECRET_KEY || '';
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: '2024-06-20' }) : null;

/**
 * Map Stripe price ID to plan tier
 */
function getPlanFromPriceId(priceId: string): PlanTier | null {
  const priceMap: Record<string, PlanTier> = {
    [process.env.STRIPE_PRICE_PRO_MONTHLY || '']: 'pro',
    [process.env.STRIPE_PRICE_PRO_YEARLY || '']: 'pro',
    [process.env.STRIPE_PRICE_FAMILY_MONTHLY || '']: 'family',
    [process.env.STRIPE_PRICE_FAMILY_YEARLY || '']: 'family',
  };

  return priceMap[priceId] || null;
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
 * Handle checkout.session.completed event
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  console.log('🔔 Handling checkout.session.completed:', session.id);

  const subscriptionId = session.subscription as string;
  if (!subscriptionId) {
    console.error('❌ No subscription ID in session');
    return;
  }

  // Get the subscription details
  const subscription = await stripe!.subscriptions.retrieve(subscriptionId);
  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price.id;

  if (!priceId) {
    console.error('❌ No price ID found');
    return;
  }

  const plan = getPlanFromPriceId(priceId);
  if (!plan) {
    console.error('❌ Unknown price ID:', priceId);
    return;
  }

  // Get user ID from customer metadata
  const customer = await stripe!.customers.retrieve(customerId) as Stripe.Customer;
  const userId = customer.metadata?.userId || session.client_reference_id;

  if (!userId) {
    console.error('❌ No user ID found in customer metadata or session');
    return;
  }

  // Create subscription record
  const subscriptionData: Partial<UserSubscription> = {
    userId,
    plan,
    status: subscription.status === 'trialing' ? 'trialing' : 'active',
    provider: 'stripe',
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  };

  if (subscription.trial_end) {
    subscriptionData.trialStart = new Date(subscription.trial_start! * 1000).toISOString();
    subscriptionData.trialEnd = new Date(subscription.trial_end * 1000).toISOString();
  }

  await updateSubscriptionInFirestore(userId, subscriptionData);
}

/**
 * Handle customer.subscription.updated event
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  console.log('🔔 Handling customer.subscription.updated:', subscription.id);

  const customerId = subscription.customer as string;
  const customer = await stripe!.customers.retrieve(customerId) as Stripe.Customer;
  const userId = customer.metadata?.userId;

  if (!userId) {
    console.error('❌ No user ID in customer metadata');
    return;
  }

  const priceId = subscription.items.data[0]?.price.id;
  const plan = priceId ? getPlanFromPriceId(priceId) : null;

  const subscriptionData: Partial<UserSubscription> = {
    status: subscription.status as any,
    currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };

  if (plan) {
    subscriptionData.plan = plan;
  }

  await updateSubscriptionInFirestore(userId, subscriptionData);
}

/**
 * Handle customer.subscription.deleted event
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  console.log('🔔 Handling customer.subscription.deleted:', subscription.id);

  const customerId = subscription.customer as string;
  const customer = await stripe!.customers.retrieve(customerId) as Stripe.Customer;
  const userId = customer.metadata?.userId;

  if (!userId) {
    console.error('❌ No user ID in customer metadata');
    return;
  }

  // Revert to free plan
  await updateSubscriptionInFirestore(userId, {
    plan: 'free',
    status: 'canceled',
    cancelAtPeriodEnd: false,
  });
}

/**
 * Main webhook handler
 */
export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!stripe) {
    return { statusCode: 500, body: 'Stripe not configured' };
  }

  const sig = event.headers['stripe-signature'];
  if (!sig || !webhookSecret) {
    return { statusCode: 400, body: 'Missing stripe-signature header or webhook secret' };
  }

  try {
    // Verify webhook signature
    const stripeEvent = stripe.webhooks.constructEvent(
      event.body!,
      sig,
      webhookSecret
    );

    console.log('📨 Received Stripe webhook:', stripeEvent.type);

    // Handle different event types
    switch (stripeEvent.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(stripeEvent.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(stripeEvent.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(stripeEvent.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_failed':
        // Handle failed payment - mark subscription as past_due
        const invoice = stripeEvent.data.object as Stripe.Invoice;
        const sub = invoice.subscription as string;
        if (sub) {
          const subscription = await stripe.subscriptions.retrieve(sub);
          const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
          const userId = customer.metadata?.userId;
          if (userId) {
            await updateSubscriptionInFirestore(userId, { status: 'past_due' });
          }
        }
        break;

      default:
        console.log('ℹ️ Unhandled event type:', stripeEvent.type);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };
  } catch (err: any) {
    console.error('❌ Webhook error:', err.message);
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`,
    };
  }
};
