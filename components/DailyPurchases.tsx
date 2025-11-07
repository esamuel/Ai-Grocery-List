import React, { useState, useMemo } from 'react';
import type { PurchaseHistoryItem } from '../types';
import { getDailyPurchases, generateSpendingReport, exportDailyPurchasesToCSV, type DailyPurchase } from '../services/exportService';

interface DailyPurchasesProps {
  historyItems: PurchaseHistoryItem[];
  currency: string;
  translations: {
    title: string;
    subtitle: string;
    date: string;
    items: string;
    totalSpent: string;
    store: string;
    noPurchases: string;
    selectDate: string;
    exportCSV: string;
    generateReport: string;
    copyReport: string;
    reportCopied: string;
    recentShoppingDays: string;
  };
}

export const DailyPurchases: React.FC<DailyPurchasesProps> = ({
  historyItems,
  currency,
  translations
}) => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showReport, setShowReport] = useState(false);

  const dailyPurchases = useMemo(() => {
    return getDailyPurchases(historyItems, currency);
  }, [historyItems, currency]);

  const selectedDayPurchases = useMemo(() => {
    if (!selectedDate) return null;
    return dailyPurchases.find(daily => daily.date === selectedDate) || null;
  }, [dailyPurchases, selectedDate]);

  const handleExportCSV = () => {
    const csv = exportDailyPurchasesToCSV(dailyPurchases);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `grocery-purchases-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerateReport = () => {
    const report = generateSpendingReport(dailyPurchases, 'month');
    navigator.clipboard.writeText(report).then(() => {
      setShowReport(true);
      setTimeout(() => setShowReport(false), 2000);
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  const formatCardDate = (dateString: string) => {
    const date = new Date(dateString);
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    return { weekday, day, month };
  };

  const getCurrencySymbol = () => {
    switch (currency) {
      case 'USD': return '$';
      case 'ILS': return '₪';
      case 'EUR': return '€';
      case 'GBP': return '£';
      default: return currency;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800">{translations.title}</h2>
        <p className="text-gray-500 mt-1">{translations.subtitle}</p>
      </div>

      {/* Export Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
        >
          📊 {translations.exportCSV}
        </button>
        <button
          onClick={handleGenerateReport}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
        >
          📋 {translations.generateReport}
        </button>
      </div>

      {showReport && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <p className="text-green-700">✅ {translations.reportCopied}</p>
        </div>
      )}

      {/* Shopping Days Grid - Card View */}
      {!selectedDate && dailyPurchases.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">📅 {translations.recentShoppingDays}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {dailyPurchases.slice(0, 30).map(daily => {
              const { weekday, day, month } = formatCardDate(daily.date);
              return (
                <button
                  key={daily.date}
                  onClick={() => setSelectedDate(daily.date)}
                  className="bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border-2 border-blue-200 hover:border-blue-400 rounded-xl p-4 transition-all transform hover:scale-105 active:scale-95 text-left"
                >
                  <div className="flex flex-col">
                    <div className="text-xs font-medium text-blue-600 uppercase tracking-wide">{weekday}</div>
                    <div className="flex items-baseline gap-1 mt-1">
                      <div className="text-3xl font-bold text-gray-800">{day}</div>
                      <div className="text-sm font-medium text-gray-600">{month}</div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-blue-200">
                      <div className="text-xs text-gray-500">{daily.items.length} {translations.items}</div>
                      <div className="text-lg font-bold text-green-600 mt-1">
                        {getCurrencySymbol()}{daily.totalSpent.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Day Details */}
      {selectedDayPurchases ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          {/* Back Button */}
          <button
            onClick={() => setSelectedDate('')}
            className="mb-4 flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            <span className="text-xl">←</span>
            <span>Back to calendar</span>
          </button>

          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              📅 {formatDate(selectedDayPurchases.date)}
            </h3>
            <div className="text-lg font-bold text-green-600">
              {getCurrencySymbol()}{selectedDayPurchases.totalSpent.toFixed(2)}
            </div>
          </div>
          
          <div className="space-y-3">
            {selectedDayPurchases.items.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-gray-800">{item.name}</div>
                  <div className="text-sm text-gray-500">
                    {item.category}
                    {item.store && ` • 🏪 ${item.store}`}
                    {item.quantity && item.unit && ` • ${item.quantity}${item.unit}`}
                  </div>
                </div>
                <div className="text-right">
                  {item.price ? (
                    <>
                      <div className="font-semibold text-gray-800">
                        {getCurrencySymbol()}{item.price.toFixed(2)}
                      </div>
                      {item.unitPrice && item.unit && (
                        <div className="text-xs text-gray-500">
                          {getCurrencySymbol()}{item.unitPrice.toFixed(2)}/{item.unit}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-xs text-gray-400 italic">
                      No price
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : selectedDate ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <button
            onClick={() => setSelectedDate('')}
            className="mb-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            <span className="text-xl">←</span>
            <span>Back to calendar</span>
          </button>
          <p className="text-gray-500">{translations.noPurchases}</p>
        </div>
      ) : null}
    </div>
  );
};
