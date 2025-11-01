import React, { useMemo } from 'react';
import type { PurchaseHistoryItem } from '../types';
import {
  getMonthlySpending,
  getCategoryBreakdown,
  getWeeklyTrend,
  getMonthlyTrend,
  getCurrencySymbol,
} from '../services/spendingInsightsService';

interface SpendingInsightsProps {
  historyItems: PurchaseHistoryItem[];
  currency: string;
  budget?: number;
  translations: {
    title: string;
    monthlySpending: string;
    itemsPurchased: string;
    avgPerItem: string;
    weeklyTrend: string;
    thisWeek: string;
    lastWeek: string;
    monthlyTrend: string;
    thisMonth: string;
    lastMonth: string;
    categoryBreakdown: string;
    budget: string;
    remaining: string;
    overBudget: string;
    noPriceData: string;
  };
}

export const SpendingInsights: React.FC<SpendingInsightsProps> = ({
  historyItems,
  currency,
  budget,
  translations,
}) => {
  const currencySymbol = getCurrencySymbol(currency);

  const monthlySpending = useMemo(
    () => getMonthlySpending(historyItems, currency),
    [historyItems, currency]
  );

  const weeklyTrend = useMemo(
    () => getWeeklyTrend(historyItems, currency),
    [historyItems, currency]
  );

  const monthlyTrend = useMemo(
    () => getMonthlyTrend(historyItems, currency),
    [historyItems, currency]
  );

  const categoryBreakdown = useMemo(
    () => getCategoryBreakdown(historyItems, currency),
    [historyItems, currency]
  );

  const hasPriceData = monthlySpending.totalSpent > 0;

  if (!hasPriceData) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">📊</div>
        <h2 className="text-2xl font-semibold text-gray-700">{translations.title}</h2>
        <p className="text-gray-500 mt-2">{translations.noPriceData}</p>
      </div>
    );
  }

  const budgetPercent = budget && budget > 0 ? (monthlySpending.totalSpent / budget) * 100 : 0;
  const isOverBudget = budget && budget > 0 && monthlySpending.totalSpent > budget;
  const remaining = budget && budget > 0 ? budget - monthlySpending.totalSpent : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{translations.title}</h2>
        <p className="text-gray-500 mt-1">
          {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Monthly Summary Card */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="text-sm font-medium opacity-90 mb-2">{translations.monthlySpending}</div>
        <div className="text-4xl font-bold mb-4">
          {currencySymbol}{monthlySpending.totalSpent.toFixed(2)}
        </div>
        <div className="flex justify-between text-sm opacity-90">
          <span>{monthlySpending.itemCount} {translations.itemsPurchased}</span>
          <span>{translations.avgPerItem}: {currencySymbol}{monthlySpending.averagePerItem.toFixed(2)}</span>
        </div>
      </div>

      {/* Budget Progress (if set) */}
      {budget && budget > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-gray-800">{translations.budget}</h3>
            <span className={`text-sm font-medium ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
              {isOverBudget ? translations.overBudget : translations.remaining}: {currencySymbol}{Math.abs(remaining).toFixed(2)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all ${
                isOverBudget ? 'bg-red-500' : budgetPercent > 80 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(budgetPercent, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>{currencySymbol}{monthlySpending.totalSpent.toFixed(2)}</span>
            <span>{currencySymbol}{budget.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Weekly Trend */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{translations.weeklyTrend}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-500 mb-1">{translations.thisWeek}</div>
            <div className="text-2xl font-bold text-gray-800">
              {currencySymbol}{weeklyTrend.thisWeek.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">{translations.lastWeek}</div>
            <div className="text-2xl font-bold text-gray-400">
              {currencySymbol}{weeklyTrend.lastWeek.toFixed(2)}
            </div>
          </div>
        </div>
        {weeklyTrend.lastWeek > 0 && (
          <div className="mt-4 flex items-center gap-2">
            {weeklyTrend.change >= 0 ? (
              <>
                <span className="text-2xl">📈</span>
                <span className="text-sm text-red-600 font-medium">
                  +{currencySymbol}{weeklyTrend.change.toFixed(2)} ({weeklyTrend.changePercent.toFixed(1)}%)
                </span>
              </>
            ) : (
              <>
                <span className="text-2xl">📉</span>
                <span className="text-sm text-green-600 font-medium">
                  {currencySymbol}{weeklyTrend.change.toFixed(2)} ({weeklyTrend.changePercent.toFixed(1)}%)
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Monthly Trend */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{translations.monthlyTrend}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-500 mb-1">{translations.thisMonth}</div>
            <div className="text-2xl font-bold text-gray-800">
              {currencySymbol}{monthlyTrend.thisMonth.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">{translations.lastMonth}</div>
            <div className="text-2xl font-bold text-gray-400">
              {currencySymbol}{monthlyTrend.lastMonth.toFixed(2)}
            </div>
          </div>
        </div>
        {monthlyTrend.lastMonth > 0 && (
          <div className="mt-4 flex items-center gap-2">
            {monthlyTrend.change >= 0 ? (
              <>
                <span className="text-2xl">📈</span>
                <span className="text-sm text-red-600 font-medium">
                  +{currencySymbol}{monthlyTrend.change.toFixed(2)} ({monthlyTrend.changePercent.toFixed(1)}%)
                </span>
              </>
            ) : (
              <>
                <span className="text-2xl">📉</span>
                <span className="text-sm text-green-600 font-medium">
                  {currencySymbol}{monthlyTrend.change.toFixed(2)} ({monthlyTrend.changePercent.toFixed(1)}%)
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Category Breakdown */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{translations.categoryBreakdown}</h3>
        <div className="space-y-3">
          {categoryBreakdown.map((cat, index) => (
            <div key={index}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700">{cat.category}</span>
                <span className="text-sm font-semibold text-gray-800">
                  {currencySymbol}{cat.total.toFixed(2)} <span className="text-gray-400">({cat.percentage.toFixed(0)}%)</span>
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
                  style={{ width: `${cat.percentage}%` }}
                />
              </div>
              <div className="text-xs text-gray-400 mt-1">{cat.itemCount} items</div>
            </div>
          ))}
        </div>

        {/* Visual Chart - Pie Chart */}
        {categoryBreakdown.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-600 mb-4 text-center">Visual Breakdown</h4>

            {/* Pie Chart */}
            <div className="flex flex-col items-center">
              <svg viewBox="0 0 200 200" className="w-64 h-64 mb-6">
                {categoryBreakdown.map((cat, index) => {
                  // Generate consistent colors for each category
                  const colors = [
                    '#3B82F6', // blue-500
                    '#10B981', // green-500
                    '#A855F7', // purple-500
                    '#F97316', // orange-500
                    '#EC4899', // pink-500
                    '#EAB308', // yellow-500
                    '#EF4444', // red-500
                    '#6366F1', // indigo-500
                    '#14B8A6', // teal-500
                    '#06B6D4', // cyan-500
                  ];
                  const color = colors[index % colors.length];

                  // Calculate the start and end angles for this slice
                  let startAngle = 0;
                  for (let i = 0; i < index; i++) {
                    startAngle += (categoryBreakdown[i].percentage / 100) * 360;
                  }
                  const endAngle = startAngle + (cat.percentage / 100) * 360;

                  // Convert angles to radians and calculate path
                  const startRad = (startAngle - 90) * (Math.PI / 180);
                  const endRad = (endAngle - 90) * (Math.PI / 180);
                  const radius = 80;
                  const centerX = 100;
                  const centerY = 100;

                  const x1 = centerX + radius * Math.cos(startRad);
                  const y1 = centerY + radius * Math.sin(startRad);
                  const x2 = centerX + radius * Math.cos(endRad);
                  const y2 = centerY + radius * Math.sin(endRad);

                  const largeArcFlag = cat.percentage > 50 ? 1 : 0;

                  const pathData = [
                    `M ${centerX} ${centerY}`,
                    `L ${x1} ${y1}`,
                    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                    'Z',
                  ].join(' ');

                  return (
                    <path
                      key={index}
                      d={pathData}
                      fill={color}
                      stroke="white"
                      strokeWidth="2"
                      className="transition-all duration-300 hover:opacity-80"
                    />
                  );
                })}
              </svg>

              {/* Legend */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 w-full max-w-md">
                {categoryBreakdown.map((cat, index) => {
                  const colors = [
                    'bg-blue-500',
                    'bg-green-500',
                    'bg-purple-500',
                    'bg-orange-500',
                    'bg-pink-500',
                    'bg-yellow-500',
                    'bg-red-500',
                    'bg-indigo-500',
                    'bg-teal-500',
                    'bg-cyan-500',
                  ];
                  const color = colors[index % colors.length];

                  return (
                    <div key={index} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${color} flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-700 truncate">
                          {cat.category}
                        </div>
                        <div className="text-xs text-gray-500">
                          {cat.percentage.toFixed(0)}% · {currencySymbol}{cat.total.toFixed(0)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

