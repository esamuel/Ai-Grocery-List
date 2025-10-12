import React, { useState } from 'react';

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
  translations
}) => {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');

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
                  <div className="text-4xl font-bold text-gray-900">{tier.price}</div>
                  {tier.yearlyPrice && billingPeriod === 'yearly' && (
                    <div className="text-sm text-gray-500 mt-1">
                      ({tier.yearlyPrice} {translations.monthly.toLowerCase()})
                    </div>
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

                {/* CTA Button */}
                <button
                  onClick={() => {
                    if (tier.id !== 'free' && !tier.current) {
                      onSelectPlan(tier.id, billingPeriod === 'yearly');
                    }
                  }}
                  disabled={tier.current || tier.id === 'free'}
                  className={`w-full py-3 rounded-lg font-bold transition-colors ${
                    tier.current
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : tier.id === 'free'
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : tier.popular
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}
                >
                  {tier.current
                    ? translations.currentBadge
                    : tier.id === 'free'
                    ? translations.continueButton
                    : translations.selectButton}
                </button>

                {/* Trial Info */}
                {tier.id !== 'free' && !tier.current && (
                  <p className="text-xs text-gray-500 text-center mt-3">{translations.trialInfo}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

