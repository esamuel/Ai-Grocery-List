import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';

// Expected env vars set in Netlify dashboard (Site settings → Environment variables)
// - STRIPE_SECRET_KEY
// - SITE_URL (fallback to current origin)
// - STRIPE_PRICE_PRO_MONTHLY
// - STRIPE_PRICE_PRO_YEARLY
// - STRIPE_PRICE_FAMILY_MONTHLY
// - STRIPE_PRICE_FAMILY_YEARLY

const stripeSecret = process.env.STRIPE_SECRET_KEY || '';
const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: '2024-06-20' }) : (null as any);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!stripe) {
    return { statusCode: 500, body: 'Stripe is not configured on the server' };
  }

  try {
    const { planId, isYearly, userId } = JSON.parse(event.body || '{}');
    if (!planId || typeof isYearly !== 'boolean' || !userId) {
      return { statusCode: 400, body: 'Missing planId, isYearly, or userId' };
    }

    const priceMap: Record<string, { monthly?: string; yearly?: string }> = {
      pro: {
        monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
        yearly: process.env.STRIPE_PRICE_PRO_YEARLY,
      },
      family: {
        monthly: process.env.STRIPE_PRICE_FAMILY_MONTHLY,
        yearly: process.env.STRIPE_PRICE_FAMILY_YEARLY,
      },
    };

    const priceId = isYearly ? priceMap[planId]?.yearly : priceMap[planId]?.monthly;
    if (!priceId) {
      return { statusCode: 400, body: `Price not configured for plan ${planId} (${isYearly ? 'yearly' : 'monthly'})` };
    }

    const origin = process.env.SITE_URL || event.headers.origin || 'http://localhost:5173';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancel`,
      allow_promotion_codes: true,
      client_reference_id: userId, // Store user ID for webhook
      subscription_data: {
        metadata: {
          userId: userId, // Also store in subscription metadata
        },
        trial_period_days: 7, // 7-day free trial
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ id: session.id, url: session.url }),
      headers: { 'Content-Type': 'application/json' },
    };
  } catch (err: any) {
    console.error('Stripe create-checkout-session error:', err);
    return { statusCode: 500, body: 'Failed to create checkout session' };
  }
};


