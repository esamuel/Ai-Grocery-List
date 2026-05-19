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

  const getCurrentMonth = () => {
    if (dailyPurchases.length === 0) return '';
    const latestDate = new Date(dailyPurchases[0].date);
    return latestDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

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

  // If a date is selected, show detail view
  if (selectedDate && selectedDayPurchases) {
    return (
      <div className="space-y-6">
        {/* Back button */}
        <button
          onClick={() => setSelectedDate('')}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
        >
          <span>←</span>
          Back to {getCurrentMonth()}
        </button>

        {/* Day header */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
          <h2 className="text-2xl font-bold mb-2">{formatDate(selectedDate)}</h2>
          <div className="text-3xl font-bold mb-3">
            {getCurrencySymbol()}{selectedDayPurchases.totalSpent.toFixed(2)}
          </div>
          <div className="text-sm opacity-90">
            {selectedDayPurchases.items.length} {translations.items}
          </div>
        </div>

        {/* Items list */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <div className="space-y-2">
            {selectedDayPurchases.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start text-sm border-t border-gray-100 pt-2 first:border-t-0 first:pt-0">
                <div className="flex-1">
                  <div className="font-medium text-gray-700">{item.name}</div>
                  <div className="text-xs text-gray-500">
                    {item.store && <span>🏪 {item.store}</span>}
                    {item.quantity && item.unit && (
                      <span className="ml-2">{item.quantity}{item.unit}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  {item.price !== undefined ? (
                    <>
                      <div className="text-gray-600 font-medium flex items-center justify-end gap-1">
                        {getCurrencySymbol()}{item.price.toFixed(2)}
                        {item.estimatedPrice && (
                          <span className="text-xs text-amber-600" title="Estimated price based on history">≈</span>
                        )}
                      </div>
                      {item.unitPrice && item.unit && (
                        <div className="text-xs text-gray-500">
                          {getCurrencySymbol()}{item.unitPrice.toFixed(2)}/{item.unit}
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Dashboard view - show card grid
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

      {/* Day Cards Grid */}
      {dailyPurchases.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {dailyPurchases.map(daily => {
            const { weekday, day, month } = formatCardDate(daily.date);
            return (
              <button
                key={daily.date}
                onClick={() => setSelectedDate(daily.date)}
                className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all text-left"
              >
                <div className="text-sm text-gray-500 mb-1">{weekday}</div>
                <div className="text-3xl font-bold text-gray-800 mb-1">{day}</div>
                <div className="text-sm text-gray-600 mb-3">{month}</div>
                <div className="text-xl font-bold text-blue-600">
                  {getCurrencySymbol()}{daily.totalSpent.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  {daily.items.length} {translations.items}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-lg shadow-sm">
          <div className="text-6xl mb-4">📅</div>
          <p className="text-gray-500">{translations.noPurchases}</p>
        </div>
      )}
    </div>
  );
};
