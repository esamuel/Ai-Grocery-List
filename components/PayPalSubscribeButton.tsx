import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    paypal?: any;
  }
}

interface PayPalSubscribeButtonProps {
  planId?: string | null;
  currency?: string; // default USD
  label?: string; // optional label above button
  onSuccess?: (subscriptionId: string) => void;
  onError?: (error: any) => void;
}

// Lightweight loader for PayPal JS SDK when needed
function loadPayPalSdk(clientId: string, currency: string = 'USD') {
  return new Promise<void>((resolve, reject) => {
    if (window.paypal) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&vault=true&intent=subscription&components=buttons&currency=${currency}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load PayPal SDK'));
    document.head.appendChild(script);
  });
}

export const PayPalSubscribeButton: React.FC<PayPalSubscribeButtonProps> = ({
  planId,
  currency = 'USD',
  label,
  onSuccess,
  onError,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const clientId = (import.meta as any).env.VITE_PAYPAL_CLIENT_ID as string | undefined;
    if (!clientId) return; // hidden if not configured
    loadPayPalSdk(clientId, currency)
      .then(() => setReady(true))
      .catch((e) => {
        console.error(e);
        onError?.(e);
      });
  }, [currency, onError]);

  useEffect(() => {
    if (!ready || !planId || !window.paypal || !containerRef.current) return;
    containerRef.current.innerHTML = '';
    try {
      window.paypal.Buttons({
        style: { layout: 'horizontal', color: 'gold', shape: 'pill', height: 40 },
        createSubscription: (_data: any, actions: any) => {
          return actions.subscription.create({ plan_id: planId });
        },
        onApprove: (data: any) => {
          if (data && data.subscriptionID) {
            onSuccess?.(data.subscriptionID);
          }
        },
        onError: (err: any) => {
          console.error('PayPal error:', err);
          onError?.(err);
        },
      }).render(containerRef.current);
    } catch (e) {
      console.error('Failed to render PayPal button', e);
      onError?.(e);
    }
  }, [ready, planId, onSuccess, onError]);

  const clientConfigured = Boolean((import.meta as any).env.VITE_PAYPAL_CLIENT_ID);
  if (!clientConfigured || !planId) return null;

  return (
    <div>
      {label && <div className="text-xs text-center text-gray-500 mb-2">{label}</div>}
      <div ref={containerRef} />
    </div>
  );
};


