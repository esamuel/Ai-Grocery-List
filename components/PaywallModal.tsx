import React, { useState } from 'react';
import { PayPalSubscribeButton } from './PayPalSubscribeButton';
import { validatePromoCode, type PromoCode } from '../services/promoCodeService';

interface PricingTier {
  id: 'free' | 'pro' | 'family';
  name: string;
  price: string;
  yearlyPrice?: string;
  features: string[];
  popular?: boolean;
  current?: boolean;
}

interface PaywallModalProps {
  onClose: () => void;
  onSelectPlan: (planId: string, isYearly: boolean) => void;
  currentPlan: 'free' | 'pro' | 'family';
  userId?: string; // Add userId for PayPal
  translations: {
    title: string;
    subtitle: string;
    monthly: string;
    yearly: string;
    savePercent: string;
    freePlan: string;
    proPlan: string;
    familyPlan: string;
    popularBadge: string;
    currentBadge: string;
    selectButton: string;
    continueButton: string;
    trialInfo: string;
    promoCode: string;
    promoCodePlaceholder: string;
    applyPromoCode: string;
    promoCodeApplied: string;
    promoCodeInvalid: string;
    discount: string;
    features: {
      free: string[];
      pro: string[];
      family: string[];
    };
  };
}

export const PaywallModal: React.FC<PaywallModalProps> = ({
  onClose,
  onSelectPlan,
  currentPlan,
  userId,
  translations
}) => {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromoCode, setAppliedPromoCode] = useState<PromoCode | null>(null);
  const [promoError, setPromoError] = useState('');
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

  // Handle promo code application
  const handleApplyPromoCode = async () => {
    if (!promoCodeInput.trim()) {
      setPromoError(translations.promoCodeInvalid);
      return;
    }

    setIsValidatingPromo(true);
    setPromoError('');

    try {
      // Get base price based on current selection
      const basePrice = billingPeriod === 'monthly' ? 4.99 : 39.99;
      const validation = await validatePromoCode(promoCodeInput, basePrice);

      if (validation.valid && validation.promoCode) {
        setAppliedPromoCode(validation.promoCode);
        setPromoError('');
      } else {
        setPromoError(validation.error || translations.promoCodeInvalid);
        setAppliedPromoCode(null);
      }
    } catch (error) {
      console.error('Error validating promo code:', error);
      setPromoError(translations.promoCodeInvalid);
      setAppliedPromoCode(null);
    } finally {
      setIsValidatingPromo(false);
    }
  };

  // Calculate discounted price
  const calculateDiscountedPrice = (originalPrice: number): number => {
    if (!appliedPromoCode) return originalPrice;

    if (appliedPromoCode.type === 'percentage') {
      const discount = originalPrice * (appliedPromoCode.value / 100);
      return Math.max(0, originalPrice - discount);
    } else {
      return Math.max(0, originalPrice - appliedPromoCode.value);
    }
  };

  // Get discount text
  const getDiscountText = (): string => {
    if (!appliedPromoCode) return '';

    if (appliedPromoCode.type === 'percentage') {
      return `${appliedPromoCode.value}% ${translations.discount}`;
    } else {
      return `$${appliedPromoCode.value} ${translations.discount}`;
    }
  };

  const tiers: PricingTier[] = [
    {
      id: 'free',
      name: translations.freePlan,
      price: '$0',
      features: translations.features.free,
      current: currentPlan === 'free'
    },
    {
      id: 'pro',
      name: translations.proPlan,
      price: billingPeriod === 'monthly' ? '$4.99/mo' : '$39.99/yr',
      yearlyPrice: '$3.33/mo',
      features: translations.features.pro,
      popular: true,
      current: currentPlan === 'pro'
    },
    {
      id: 'family',
      name: translations.familyPlan,
      price: billingPeriod === 'monthly' ? '$7.99/mo' : '$69.99/yr',
      yearlyPrice: '$5.83/mo',
      features: translations.features.family,
      current: currentPlan === 'family'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors text-2xl"
          >
            ×
          </button>
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{translations.title}</h2>
            <p className="text-gray-600">{translations.subtitle}</p>
          </div>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                billingPeriod === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {translations.monthly}
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                billingPeriod === 'yearly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {translations.yearly}
              <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                {translations.savePercent}
              </span>
            </button>
          </div>

          {/* Promo Code Input */}
          <div className="mt-6 max-w-md mx-auto">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🎁 {translations.promoCode}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={promoCodeInput}
                onChange={(e) => {
                  setPromoCodeInput(e.target.value.toUpperCase());
                  setPromoError('');
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleApplyPromoCode();
                  }
                }}
                placeholder={translations.promoCodePlaceholder}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isValidatingPromo}
              />
              <button
                onClick={handleApplyPromoCode}
                disabled={isValidatingPromo || !promoCodeInput.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                {isValidatingPromo ? '...' : translations.applyPromoCode}
              </button>
            </div>

            {/* Promo Code Status */}
            {appliedPromoCode && (
              <div className="mt-2 flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                <span className="text-lg">✅</span>
                <span className="font-medium">
                  {translations.promoCodeApplied}: {getDiscountText()}
                  {appliedPromoCode.duration > 1 && ` (${appliedPromoCode.duration} months)`}
                </span>
              </div>
            )}

            {promoError && (
              <div className="mt-2 flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                <span className="text-lg">❌</span>
                <span>{promoError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="p-6">
          <div className="grid md:grid-cols-3 gap-6">
            {tiers.map((tier) => (
              <div
                key={tier.id}
                className={`relative rounded-xl p-6 border-2 transition-all ${
                  tier.popular
                    ? 'border-blue-600 shadow-xl scale-105'
                    : 'border-gray-200 hover:border-blue-300'
                } ${tier.current ? 'bg-blue-50' : 'bg-white'}`}
              >
                {/* Badges */}
                <div className="flex gap-2 mb-4">
                  {tier.popular && (
                    <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      {translations.popularBadge}
                    </span>
                  )}
                  {tier.current && (
                    <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                      {translations.currentBadge}
                    </span>
                  )}
                </div>

                {/* Plan Name */}
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{tier.name}</h3>

                {/* Price */}
                <div className="mb-4">
                  {appliedPromoCode && tier.id !== 'free' ? (
                    <>
                      <div className="text-2xl text-gray-400 line-through">{tier.price}</div>
                      <div className="text-4xl font-bold text-green-600">
                        ${calculateDiscountedPrice(
                          billingPeriod === 'monthly' 
                            ? (tier.id === 'pro' ? 4.99 : 7.99)
                            : (tier.id === 'pro' ? 39.99 : 69.99)
                        ).toFixed(2)}/{billingPeriod === 'monthly' ? 'mo' : 'yr'}
                      </div>
                      <div className="text-sm text-green-600 font-medium mt-1">
                        🎉 {getDiscountText()}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-4xl font-bold text-gray-900">{tier.price}</div>
                      {tier.yearlyPrice && billingPeriod === 'yearly' && (
                        <div className="text-sm text-gray-500 mt-1">
                          ({tier.yearlyPrice} {translations.monthly.toLowerCase()})
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-6">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-green-500 font-bold mt-0.5">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* PayPal Subscribe Button (Only Payment Option) */}
                {tier.id !== 'free' && !tier.current && (
                  <div className="space-y-3">
                    <PayPalSubscribeButton
                      planId={
                        tier.id === 'pro'
                          ? (billingPeriod === 'yearly' ? (import.meta as any).env.VITE_PAYPAL_PLAN_PRO_YEARLY : (import.meta as any).env.VITE_PAYPAL_PLAN_PRO_MONTHLY)
                          : (billingPeriod === 'yearly' ? (import.meta as any).env.VITE_PAYPAL_PLAN_FAMILY_YEARLY : (import.meta as any).env.VITE_PAYPAL_PLAN_FAMILY_MONTHLY)
                      }
                      currency="USD"
                      label={translations.selectButton}
                      userId={userId}
                      onSuccess={() => {
                        alert('PayPal subscription started successfully. Your plan will be activated shortly.');
                        onClose();
                      }}
                    />
                    <p className="text-xs text-gray-500 text-center">{translations.trialInfo}</p>
                  </div>
                )}

                {/* Current Plan or Free Plan Button */}
                {(tier.current || tier.id === 'free') && (
                  <button
                    disabled={true}
                    className="w-full py-3 rounded-lg font-bold bg-gray-100 text-gray-400 cursor-not-allowed"
                  >
                    {tier.current ? translations.currentBadge : translations.continueButton}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

