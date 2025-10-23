import type { Handler } from '@netlify/functions'

// Helper to read env vars safely
const env = (name: string): string | undefined =>
  (process.env[name] as string | undefined) || undefined;

async function getAccessToken(envName: 'live' | 'sandbox') {
  const clientId = envName === 'sandbox'
    ? env('PAYPAL_CLIENT_ID_SANDBOX') || env('VITE_PAYPAL_CLIENT_ID_SANDBOX')
    : env('PAYPAL_CLIENT_ID') || env('VITE_PAYPAL_CLIENT_ID');
  const secret = envName === 'sandbox'
    ? env('PAYPAL_CLIENT_SECRET_SANDBOX')
    : env('PAYPAL_CLIENT_SECRET');

  if (!clientId || !secret) {
    throw new Error(`Missing PayPal credentials for ${envName}. Set PAYPAL_CLIENT_ID${envName==='sandbox'?'_SANDBOX':''} and PAYPAL_CLIENT_SECRET${envName==='sandbox'?'_SANDBOX':''} in Netlify env.`);
  }

  const base = envName === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';

  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${clientId}:${secret}`).toString('base64'),
    },
    body: 'grant_type=client_credentials'
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to get token (${res.status}): ${text}`);
  }
  const data = await res.json();
  return { token: data.access_token as string, base };
}

export const handler: Handler = async (event) => {
  // CORS
  const origin = event.headers.origin || '*';
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: ''
    };
  }

  try {
    const params = new URLSearchParams(event.rawQuery || '');
    const envName = (params.get('env') === 'sandbox' ? 'sandbox' : 'live') as 'live' | 'sandbox';
    const plansParam = params.get('plans') || '';
    const planIds = plansParam.split(',').map(s => s.trim()).filter(Boolean);
    if (planIds.length === 0) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': origin },
        body: JSON.stringify({ error: 'Missing plans query parameter: plans=P-XXXX,P-YYYY' })
      };
    }

    const { token, base } = await getAccessToken(envName);

    const results: any[] = [];
    for (const id of planIds) {
      const res = await fetch(`${base}/v1/billing/plans/${encodeURIComponent(id)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      if (!res.ok) {
        const text = await res.text();
        results.push({ id, ok: false, error: `(${res.status}) ${text}` });
        continue;
      }
      const data = await res.json();
      results.push({
        id,
        ok: true,
        status: data.status,
        name: data.name,
        product_id: data.product_id,
        billing_cycles: data.billing_cycles?.map((c: any) => ({
          frequency: `${c.frequency?.interval_count} ${c.frequency?.interval_unit}`,
          tenure_type: c.tenure_type,
          pricing_scheme: c.pricing_scheme?.fixed_price,
        })),
        payment_preferences: data.payment_preferences,
        taxes: data.taxes,
        update_time: data.update_time,
      });
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin,
      },
      body: JSON.stringify({ env: envName, results })
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': event.headers.origin || '*' },
      body: JSON.stringify({ error: String(err?.message || err) })
    };
  }
}

