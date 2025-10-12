import React, { useState, useEffect } from 'react';
import type { ShoppingSuggestion } from '../services/smartSuggestionsService';
import { getSmartSuggestions, getStarterSuggestions } from '../services/smartSuggestionsService';
import type { PurchaseHistoryItem } from '../types';
import { getPriceTrend, analyzePriceAlert, formatPriceAlertBadge } from '../services/priceAlertService';

interface SmartSuggestionsProps {
  currentItems: string[];
  historyItems: PurchaseHistoryItem[];
  language: 'en' | 'he' | 'es';
  onAddSuggestion: (suggestion: ShoppingSuggestion) => void;
  translations: {
    title: string;
    subtitle: string;
    addButton: string;
    noSuggestions: string;
    timeBased: string;
    frequencyBased: string;
    seasonal: string;
    complementary: string;
    predictive?: string;
    // Price alerts
    bestPriceEver: string;
    greatDeal: string;
    priceIncreased: string;
    higherThanUsual: string;
    // Store comparison
    bestAtStore: string;
    cheaper: string;
  };
}

export const SmartSuggestions: React.FC<SmartSuggestionsProps> = ({
  currentItems,
  historyItems,
  language,
  onAddSuggestion,
  translations
}) => {
  const [suggestions, setSuggestions] = useState<ShoppingSuggestion[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  const localizeName = (name: string): string => {
    const key = name.trim().toLowerCase();
    const maps = {
      en: {
        'חלב': 'milk', 'לחם': 'bread', 'ביצים': 'eggs', 'בננות': 'bananas', 'עגבניות': 'tomatoes', 'קפה': 'coffee', 'סודה': 'soda',
      },
      he: {
        'milk': 'חלב', 'bread': 'לחם', 'eggs': 'ביצים', 'bananas': 'בננות', 'tomatoes': 'עגבניות', 'coffee': 'קפה', 'soda': 'סודה', 'yogurt': 'יוגורט', 'cereal': 'דגנים', 'chicken': 'עוף', 'fish': 'דג', 'rice': 'אורז', 'pasta': 'פסטה', 'olive oil': 'שמן זית', 'lettuce': 'חסה', 'onions': 'בצל', 'garlic': 'שום', 'cheese': 'גבינה', 'soup': 'מרק', 'hot chocolate': 'שוקו חם',
      },
      es: {
        'milk': 'leche', 'bread': 'pan', 'eggs': 'huevos', 'bananas': 'plátanos', 'tomatoes': 'tomates', 'coffee': 'café', 'soda': 'refresco', 'yogurt': 'yogur', 'cereal': 'cereal', 'chicken': 'pollo', 'fish': 'pescado', 'rice': 'arroz', 'pasta': 'pasta', 'olive oil': 'aceite de oliva', 'lettuce': 'lechuga', 'onions': 'cebollas', 'garlic': 'ajo', 'cheese': 'queso', 'soup': 'sopa', 'hot chocolate': 'chocolate caliente',
      },
    } as const;

    if (language === 'he' && (maps.he as any)[key]) return (maps.he as any)[key];
    if (language === 'es' && (maps.es as any)[key]) return (maps.es as any)[key];
    if (language === 'en' && (maps.en as any)[key]) return (maps.en as any)[key];
    return name;
  };

  useEffect(() => {
    const newSuggestions = currentItems.length === 0 
      ? getStarterSuggestions(historyItems, language)
      : getSmartSuggestions(currentItems, historyItems, language);
    
    setSuggestions(newSuggestions);
  }, [currentItems, historyItems, language]);

  if (suggestions.length === 0) {
    return null;
  }

  const getTypeIcon = (type: ShoppingSuggestion['type']) => {
    switch (type) {
      case 'predictive': return '🔮';
      case 'time-based': return '⏰';
      case 'frequency-based': return '🔄';
      case 'seasonal': return '🌟';
      case 'complementary': return '🤝';
      default: return '💡';
    }
  };

  const getTypeLabel = (type: ShoppingSuggestion['type']) => {
    switch (type) {
      case 'predictive': return translations.predictive || 'Smart Prediction';
      case 'time-based': return translations.timeBased;
      case 'frequency-based': return translations.frequencyBased;
      case 'seasonal': return translations.seasonal;
      case 'complementary': return translations.complementary;
      default: return 'Suggestion';
    }
  };

  const displayedSuggestions = isExpanded ? suggestions : suggestions.slice(0, 4);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">{translations.title}</h3>
          <p className="text-sm text-gray-600">{translations.subtitle}</p>
        </div>
        {suggestions.length > 4 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-blue-600 hover:text-blue-700 px-3 py-1 rounded-md hover:bg-blue-50 transition-colors"
          >
            {isExpanded ? 'Show Less' : `Show All (${suggestions.length})`}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {displayedSuggestions.map((suggestion, index) => {
          const priceTrend = getPriceTrend(suggestion.item);
          const priceAlert = analyzePriceAlert(suggestion.item);
          const alertBadge = priceAlert ? formatPriceAlertBadge(priceAlert, {
            bestPriceEver: translations.bestPriceEver,
            greatDeal: translations.greatDeal,
            priceIncreased: translations.priceIncreased,
            higherThanUsual: translations.higherThanUsual,
          }) : null;
          
          return (
          <div
            key={`${suggestion.item.name}-${index}`}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1">
              <span className="text-lg">{getTypeIcon(suggestion.type)}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-800">{localizeName(suggestion.item.name)}</span>
                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                    {suggestion.item.frequency}×
                  </span>
                  {alertBadge && (
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${alertBadge.className}`}>
                      {alertBadge.emoji} {alertBadge.text}
                    </span>
                  )}
                  {priceTrend && priceTrend.badge && !alertBadge && (
                    <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                      {priceTrend.badge}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">{getTypeLabel(suggestion.type)}</span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500">{suggestion.reason}</span>
                </div>
                {/* Confidence indicator */}
                <div className="flex items-center gap-1 mt-1">
                  <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 transition-all duration-300"
                      style={{ width: `${suggestion.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400">
                    {Math.round(suggestion.confidence * 100)}%
                  </span>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => onAddSuggestion(suggestion)}
              className="ml-3 px-3 py-1.5 text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-md transition-colors"
            >
              {translations.addButton}
            </button>
          </div>
          );
        })}
      </div>

      {suggestions.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <span className="text-2xl mb-2 block">🤔</span>
          <p>{translations.noSuggestions}</p>
        </div>
      )}
    </div>
  );
};
