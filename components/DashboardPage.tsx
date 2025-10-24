import React, { useState } from 'react';

interface FeatureCard {
  id: string;
  icon: string;
  title: string;
  description: string;
  badge?: string | number;
  color: string; // Tailwind color class for the card background
  iconBg: string; // Background gradient for the icon
  quickActions?: Array<{
    icon: string;
    label: string;
    action: () => void;
  }>;
  onClick: () => void;
}

interface DashboardPageProps {
  onNavigate: (view: string) => void;
  translations: {
    list: string;
    listDesc: string;
    history: string;
    historyDesc: string;
    family: string;
    familyDesc: string;
    priceCompare: string;
    priceCompareDesc: string;
    insights: string;
    insightsDesc: string;
    daily: string;
    dailyDesc: string;
    voice: string;
    voiceDesc: string;
    importExport: string;
    importExportDesc: string;
    suggestions: string;
    suggestionsDesc: string;
    quickSearch: string;
    viewAll: string;
    addItem: string;
    bestDeals: string;
    dashboardHelpText: string;
  };
  itemsCount?: number;
  historyCount?: number;
  familyMembersCount?: number;
  trackedPricesCount?: number;
  rtl?: boolean;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  translations,
  itemsCount = 0,
  historyCount = 0,
  familyMembersCount = 0,
  trackedPricesCount = 0,
  rtl = false
}) => {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [showInfoFor, setShowInfoFor] = useState<string | null>(null);

  const features: FeatureCard[] = [
    {
      id: 'list',
      icon: '📋',
      title: translations.list,
      description: translations.listDesc,
      color: 'from-blue-400 to-blue-600',
      iconBg: 'bg-gradient-to-br from-blue-400 to-blue-600',
      badge: itemsCount > 0 ? itemsCount : undefined,
      onClick: () => onNavigate('list')
    },
    {
      id: 'history',
      icon: '⭐',
      title: translations.history,
      description: translations.historyDesc,
      color: 'from-yellow-400 to-yellow-600',
      iconBg: 'bg-gradient-to-br from-yellow-400 to-yellow-600',
      badge: historyCount > 0 ? historyCount : undefined,
      onClick: () => onNavigate('favorites')
    },
    {
      id: 'family',
      icon: '👥',
      title: translations.family,
      description: translations.familyDesc,
      color: 'from-purple-400 to-purple-600',
      iconBg: 'bg-gradient-to-br from-purple-400 to-purple-600',
      badge: familyMembersCount > 0 ? `${familyMembersCount}` : undefined,
      onClick: () => onNavigate('family')
    },
    {
      id: 'priceCompare',
      icon: '💰',
      title: translations.priceCompare,
      description: translations.priceCompareDesc,
      color: 'from-green-400 to-green-600',
      iconBg: 'bg-gradient-to-br from-green-400 to-green-600',
      badge: trackedPricesCount > 0 ? `${trackedPricesCount}` : undefined,
      onClick: () => onNavigate('priceCompare')
    },
    {
      id: 'insights',
      icon: '📊',
      title: translations.insights,
      description: translations.insightsDesc,
      color: 'from-pink-400 to-pink-600',
      iconBg: 'bg-gradient-to-br from-pink-400 to-pink-600',
      onClick: () => onNavigate('insights')
    },
    {
      id: 'daily',
      icon: '📅',
      title: translations.daily,
      description: translations.dailyDesc,
      color: 'from-orange-400 to-orange-600',
      iconBg: 'bg-gradient-to-br from-orange-400 to-orange-600',
      onClick: () => onNavigate('daily')
    }
  ];

  return (
    <div className={`w-full h-full overflow-y-auto bg-white dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-black ${rtl ? 'rtl' : ''}`}>
      {/* Header - matching screenshot style */}
      <div className="px-4 pt-6 pb-2">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white text-center">
          {rtl ? 'פעולות מהירות' : 'Quick Actions'}
        </h1>
      </div>

      {/* Dashboard Grid */}
      <div className="px-4 pb-4 grid grid-cols-2 gap-4 max-w-2xl mx-auto">
        {features.map((feature) => {
          const isInfoShown = showInfoFor === feature.id;

          return (
            <div
              key={feature.id}
              className="relative cursor-pointer group"
            >
              {/* Card Container */}
              <div
                onClick={feature.onClick}
                className="relative rounded-3xl overflow-visible bg-gray-50 dark:bg-gradient-to-br dark:from-gray-800/90 dark:to-gray-900/90 backdrop-blur-xl border border-gray-200 dark:border-white/10 shadow-lg dark:shadow-2xl transform transition-all duration-300 active:scale-95"
              >
                {/* Badge */}
                {feature.badge && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full z-10">
                    {feature.badge}
                  </div>
                )}

                {/* Info Button (Mobile - Top Left) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowInfoFor(isInfoShown ? null : feature.id);
                  }}
                  className="md:hidden absolute top-2 left-2 w-6 h-6 rounded-full bg-white/80 dark:bg-gray-700/80 flex items-center justify-center text-gray-600 dark:text-gray-300 text-xs font-bold z-20 hover:bg-white dark:hover:bg-gray-700 transition-colors"
                >
                  ℹ️
                </button>

                {/* Mobile Info Popup */}
                {isInfoShown && (
                  <div className="md:hidden absolute top-10 left-2 right-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-3 z-30 border-2 border-blue-500 dark:border-blue-400">
                    <p className="text-xs text-gray-700 dark:text-gray-200">
                      {feature.description}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowInfoFor(null);
                      }}
                      className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-semibold"
                    >
                      {rtl ? 'סגור' : 'Close'}
                    </button>
                  </div>
                )}

                {/* Desktop Tooltip (Hover) */}
                <div className="hidden md:block absolute -top-2 left-1/2 transform -translate-x-1/2 -translate-y-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-30">
                  <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg py-2 px-3 shadow-xl max-w-[200px] text-center">
                    {feature.description}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                      <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                    </div>
                  </div>
                </div>

                {/* Card Content */}
                <div className="flex flex-col items-center justify-center p-6 min-h-[160px]">
                  {/* Icon Circle */}
                  <div className={`w-20 h-20 rounded-3xl ${feature.iconBg} shadow-lg flex items-center justify-center mb-4 transform transition-transform duration-300 group-active:scale-90`}>
                    <span className="text-4xl filter drop-shadow-lg">
                      {feature.icon}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className={`text-sm font-semibold text-center ${
                    feature.id === 'list' ? 'text-blue-600 dark:text-blue-300' :
                    feature.id === 'history' ? 'text-yellow-600 dark:text-yellow-300' :
                    feature.id === 'family' ? 'text-purple-600 dark:text-purple-300' :
                    feature.id === 'priceCompare' ? 'text-green-600 dark:text-green-300' :
                    feature.id === 'insights' ? 'text-pink-600 dark:text-pink-300' :
                    feature.id === 'daily' ? 'text-orange-600 dark:text-orange-300' :
                    'text-gray-600 dark:text-gray-300'
                  }`}>
                    {feature.title}
                  </h3>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Help Text */}
      <div className="px-4 pb-6 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {translations.dashboardHelpText}
        </p>
      </div>
    </div>
  );
};

