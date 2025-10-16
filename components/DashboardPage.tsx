import React, { useState } from 'react';

interface FeatureCard {
  id: string;
  icon: string;
  title: string;
  description: string;
  badge?: string | number;
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

  const features: FeatureCard[] = [
    {
      id: 'list',
      icon: '📋',
      title: translations.list,
      description: translations.listDesc,
      badge: itemsCount > 0 ? itemsCount : undefined,
      quickActions: [
        { icon: '➕', label: translations.addItem, action: () => onNavigate('list') },
        { icon: '👁️', label: translations.viewAll, action: () => onNavigate('list') }
      ],
      onClick: () => onNavigate('list')
    },
    {
      id: 'history',
      icon: '⭐',
      title: translations.history,
      description: translations.historyDesc,
      badge: historyCount > 0 ? historyCount : undefined,
      quickActions: [
        { icon: '👁️', label: translations.viewAll, action: () => onNavigate('favorites') }
      ],
      onClick: () => onNavigate('favorites')
    },
    {
      id: 'family',
      icon: '👥',
      title: translations.family,
      description: translations.familyDesc,
      badge: familyMembersCount > 0 ? `${familyMembersCount} ${rtl ? 'פעילים' : 'active'}` : undefined,
      quickActions: [
        { icon: '👁️', label: translations.viewAll, action: () => onNavigate('family') }
      ],
      onClick: () => onNavigate('family')
    },
    {
      id: 'priceCompare',
      icon: '💰',
      title: translations.priceCompare,
      description: translations.priceCompareDesc,
      badge: trackedPricesCount > 0 ? `${trackedPricesCount}` : undefined,
      quickActions: [
        { icon: '🔍', label: translations.quickSearch, action: () => onNavigate('priceCompare') },
        { icon: '⭐', label: translations.bestDeals, action: () => onNavigate('priceCompare') },
        { icon: '👁️', label: translations.viewAll, action: () => onNavigate('priceCompare') }
      ],
      onClick: () => onNavigate('priceCompare')
    },
    {
      id: 'insights',
      icon: '📊',
      title: translations.insights,
      description: translations.insightsDesc,
      quickActions: [
        { icon: '👁️', label: translations.viewAll, action: () => onNavigate('insights') }
      ],
      onClick: () => onNavigate('insights')
    },
    {
      id: 'daily',
      icon: '📅',
      title: translations.daily,
      description: translations.dailyDesc,
      quickActions: [
        { icon: '👁️', label: translations.viewAll, action: () => onNavigate('daily') }
      ],
      onClick: () => onNavigate('daily')
    },
    {
      id: 'voice',
      icon: '🎤',
      title: translations.voice,
      description: translations.voiceDesc,
      onClick: () => onNavigate('list') // Goes to list with voice input ready
    },
    {
      id: 'importExport',
      icon: '📤',
      title: translations.importExport,
      description: translations.importExportDesc,
      onClick: () => onNavigate('list') // Opens import/export modal
    },
    {
      id: 'suggestions',
      icon: '✨',
      title: translations.suggestions,
      description: translations.suggestionsDesc,
      onClick: () => onNavigate('list') // Opens suggestions panel
    }
  ];

  return (
    <div className={`max-w-6xl mx-auto p-4 ${rtl ? 'rtl' : ''}`}>
      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((feature) => {
          const isHovered = hoveredCard === feature.id;
          
          return (
            <div
              key={feature.id}
              className="relative"
              onMouseEnter={() => setHoveredCard(feature.id)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              {/* Main Card - iOS Frosted Glass Style */}
              <div
                onClick={feature.onClick}
                className={`
                  relative overflow-hidden rounded-2xl cursor-pointer
                  backdrop-blur-lg bg-white/70 dark:bg-gray-800/70
                  border border-white/20 dark:border-gray-700/30
                  shadow-lg hover:shadow-2xl
                  transition-all duration-300 ease-out
                  ${isHovered ? 'scale-105 -translate-y-1' : 'scale-100'}
                `}
                style={{
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                }}
              >
                {/* Badge */}
                {feature.badge && (
                  <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full z-10">
                    {feature.badge}
                  </div>
                )}

                {/* Card Content */}
                <div className="p-6">
                  {/* Icon */}
                  <div className="text-5xl mb-3 transform transition-transform duration-300 hover:scale-110">
                    {feature.icon}
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                    {feature.title}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    {feature.description}
                  </p>

                  {/* Arrow Indicator */}
                  <div className={`text-gray-400 dark:text-gray-500 transition-transform duration-300 ${isHovered ? 'translate-x-2' : ''} ${rtl ? 'transform rotate-180' : ''}`}>
                    →
                  </div>
                </div>

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-blue-50/30 dark:to-blue-900/10 pointer-events-none" />
              </div>

              {/* Quick Actions Panel (Appears on Hover) */}
              {feature.quickActions && (
                <div
                  className={`
                    absolute inset-x-0 -bottom-2 z-20
                    backdrop-blur-xl bg-white/90 dark:bg-gray-900/90
                    border border-white/30 dark:border-gray-700/40
                    rounded-b-2xl shadow-2xl
                    transition-all duration-300 ease-out
                    ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}
                  `}
                  style={{
                    backdropFilter: 'blur(30px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                  }}
                >
                  <div className="p-4 pt-6 space-y-2">
                    {feature.quickActions.map((action, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          action.action();
                        }}
                        className={`
                          w-full flex items-center gap-3 px-4 py-2.5 rounded-xl
                          bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30
                          hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-800/40 dark:hover:to-blue-700/40
                          text-gray-800 dark:text-white text-sm font-medium
                          transition-all duration-200
                          hover:scale-105 active:scale-95
                          shadow-sm hover:shadow-md
                          ${rtl ? 'flex-row-reverse' : ''}
                        `}
                      >
                        <span className="text-xl">{action.icon}</span>
                        <span>{action.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Help Text */}
      <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
        {rtl ? 'לחץ על כרטיס כדי לפתוח, רחף לפעולות מהירות' : 'Click a card to open, hover for quick actions'}
      </div>
    </div>
  );
};

