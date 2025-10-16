import React from 'react';
import { ImageCarousel } from './ImageCarousel';
import { AppScreenshot } from './AppScreenshots';

interface LandingPageProps {
  onGetStarted: () => void;
  translations: {
    hero: {
      title: string;
      subtitle: string;
      cta: string;
      secondaryCta: string;
    };
    features: {
      title: string;
      subtitle: string;
      feature1Title: string;
      feature1Desc: string;
      feature2Title: string;
      feature2Desc: string;
      feature3Title: string;
      feature3Desc: string;
      feature4Title: string;
      feature4Desc: string;
      feature5Title: string;
      feature5Desc: string;
      feature6Title: string;
      feature6Desc: string;
    };
    pricing: {
      title: string;
      subtitle: string;
      free: string;
      pro: string;
      family: string;
      monthly: string;
      yearly: string;
      mostPopular: string;
      getStarted: string;
      feature1: string;
      feature2: string;
      feature3: string;
      feature4: string;
      proFeature1: string;
      proFeature2: string;
      proFeature3: string;
      proFeature4: string;
      proFeature5: string;
      familyFeature1: string;
      familyFeature2: string;
      familyFeature3: string;
    };
    howItWorks: {
      title: string;
      step1: string;
      step1Desc: string;
      step2: string;
      step2Desc: string;
      step3: string;
      step3Desc: string;
    };
    cta: {
      title: string;
      subtitle: string;
      button: string;
    };
  };
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, translations }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
          {translations.hero.title}
        </h1>
        <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
          {translations.hero.subtitle}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onGetStarted}
            className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-lg font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all shadow-lg"
          >
            {translations.hero.cta}
          </button>
          <button
            onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-lg font-semibold rounded-lg border-2 border-gray-300 dark:border-gray-600 hover:border-blue-500 transition-all"
          >
            {translations.hero.secondaryCta}
          </button>
        </div>

        {/* App Screenshots Carousel */}
        <div className="mt-16 max-w-6xl mx-auto">
          {/* Screenshots displayed in a grid/carousel */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="transform hover:scale-105 transition-transform">
              <AppScreenshot type="list" />
              <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-3 font-semibold">
                Smart Organization
              </p>
            </div>
            <div className="transform hover:scale-105 transition-transform">
              <AppScreenshot type="ai-categorization" />
              <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-3 font-semibold">
                AI Categorization
              </p>
            </div>
            <div className="transform hover:scale-105 transition-transform">
              <AppScreenshot type="price-tracking" />
              <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-3 font-semibold">
                Price Tracking
              </p>
            </div>
            <div className="transform hover:scale-105 transition-transform">
              <AppScreenshot type="family-sharing" />
              <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-3 font-semibold">
                Family Sharing
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {translations.features.title}
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            {translations.features.subtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md hover:shadow-xl transition-shadow">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {translations.features.feature1Title}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              {translations.features.feature1Desc}
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md hover:shadow-xl transition-shadow">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {translations.features.feature2Title}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              {translations.features.feature2Desc}
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md hover:shadow-xl transition-shadow">
            <div className="text-4xl mb-4">👨‍👩‍👧‍👦</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {translations.features.feature3Title}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              {translations.features.feature3Desc}
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md hover:shadow-xl transition-shadow">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {translations.features.feature4Title}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              {translations.features.feature4Desc}
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md hover:shadow-xl transition-shadow">
            <div className="text-4xl mb-4">🎤</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {translations.features.feature5Title}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              {translations.features.feature5Desc}
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md hover:shadow-xl transition-shadow">
            <div className="text-4xl mb-4">📱</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {translations.features.feature6Title}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              {translations.features.feature6Desc}
            </p>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="bg-gray-50 dark:bg-gray-900 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {translations.howItWorks.title}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-500 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {translations.howItWorks.step1}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {translations.howItWorks.step1Desc}
              </p>
            </div>

            <div className="text-center">
              <div className="bg-purple-500 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {translations.howItWorks.step2}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {translations.howItWorks.step2Desc}
              </p>
            </div>

            <div className="text-center">
              <div className="bg-green-500 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {translations.howItWorks.step3}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {translations.howItWorks.step3Desc}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {translations.pricing.title}
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            {translations.pricing.subtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Free Plan */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border-2 border-gray-200 dark:border-gray-700">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {translations.pricing.free}
            </h3>
            <div className="mb-6">
              <span className="text-4xl font-bold text-gray-900 dark:text-white">$0</span>
              <span className="text-gray-600 dark:text-gray-400">/month</span>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-gray-600 dark:text-gray-300">{translations.pricing.feature1}</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-gray-600 dark:text-gray-300">{translations.pricing.feature2}</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-gray-600 dark:text-gray-300">{translations.pricing.feature3}</span>
              </li>
              <li className="flex items-start">
                <span className="text-gray-400 mr-2">•</span>
                <span className="text-gray-600 dark:text-gray-300">{translations.pricing.feature4}</span>
              </li>
            </ul>
            <button
              onClick={onGetStarted}
              className="w-full px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              {translations.pricing.getStarted}
            </button>
          </div>

          {/* Pro Plan */}
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-2xl p-8 border-2 border-blue-400 relative transform scale-105">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-gray-900 px-4 py-1 rounded-full text-sm font-bold">
              {translations.pricing.mostPopular}
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              {translations.pricing.pro}
            </h3>
            <div className="mb-6">
              <span className="text-4xl font-bold text-white">$4.99</span>
              <span className="text-blue-100">/month</span>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start">
                <span className="text-yellow-300 mr-2">✓</span>
                <span className="text-white">{translations.pricing.proFeature1}</span>
              </li>
              <li className="flex items-start">
                <span className="text-yellow-300 mr-2">✓</span>
                <span className="text-white">{translations.pricing.proFeature2}</span>
              </li>
              <li className="flex items-start">
                <span className="text-yellow-300 mr-2">✓</span>
                <span className="text-white">{translations.pricing.proFeature3}</span>
              </li>
              <li className="flex items-start">
                <span className="text-yellow-300 mr-2">✓</span>
                <span className="text-white">{translations.pricing.proFeature4}</span>
              </li>
              <li className="flex items-start">
                <span className="text-yellow-300 mr-2">✓</span>
                <span className="text-white">{translations.pricing.proFeature5}</span>
              </li>
            </ul>
            <button
              onClick={onGetStarted}
              className="w-full px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
            >
              {translations.pricing.getStarted}
            </button>
          </div>

          {/* Family Plan */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border-2 border-gray-200 dark:border-gray-700">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {translations.pricing.family}
            </h3>
            <div className="mb-6">
              <span className="text-4xl font-bold text-gray-900 dark:text-white">$7.99</span>
              <span className="text-gray-600 dark:text-gray-400">/month</span>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-gray-600 dark:text-gray-300">{translations.pricing.familyFeature1}</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-gray-600 dark:text-gray-300">{translations.pricing.familyFeature2}</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-gray-600 dark:text-gray-300">{translations.pricing.familyFeature3}</span>
              </li>
            </ul>
            <button
              onClick={onGetStarted}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-colors"
            >
              {translations.pricing.getStarted}
            </button>
          </div>
        </div>
      </div>

      {/* Final CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            {translations.cta.title}
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            {translations.cta.subtitle}
          </p>
          <button
            onClick={onGetStarted}
            className="px-8 py-4 bg-white text-blue-600 text-lg font-semibold rounded-lg hover:bg-gray-100 transform hover:scale-105 transition-all shadow-lg"
          >
            {translations.cta.button}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm">
            © 2025 AI Grocery Lists. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};
