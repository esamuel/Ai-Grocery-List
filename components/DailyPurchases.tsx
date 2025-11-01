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

  const availableDates = useMemo(() => {
    return dailyPurchases.map(daily => daily.date).slice(0, 30); // Last 30 days
  }, [dailyPurchases]);

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

      {/* Date Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">{translations.selectDate}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {availableDates.map(date => (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
              className={`p-2 text-sm rounded-lg border transition-colors ${
                selectedDate === date
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <div className="font-medium">{new Date(date).getDate()}</div>
              <div className="text-xs opacity-75">
                {new Date(date).toLocaleDateString('en-US', { month: 'short' })}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Day Details */}
      {selectedDayPurchases ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
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
                  </div>
                </div>
                <div className="text-right">
                  {item.price ? (
                    <>
                      <div className="font-semibold text-gray-800">
                        {getCurrencySymbol()}{item.price.toFixed(2)}
                      </div>
                      {item.quantity && item.quantity > 1 && (
                        <div className="text-xs text-gray-500">
                          ×{item.quantity}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-xs text-gray-400 italic">
                      {item.quantity && item.quantity > 1 ? `×${item.quantity}` : 'No price'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : selectedDate ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-500">{translations.noPurchases}</p>
        </div>
      ) : null}

      {/* Recent Days Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">📅 {translations.recentShoppingDays}</h3>
        <div className="space-y-2">
          {dailyPurchases.slice(0, 7).map(daily => (
            <div 
              key={daily.date}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
              onClick={() => setSelectedDate(daily.date)}
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-600">
                  {formatDate(daily.date)}
                </span>
                <span className="text-sm text-gray-500">
                  {daily.items.length} {translations.items}
                </span>
              </div>
              <div className="font-semibold text-green-600">
                {getCurrencySymbol()}{daily.totalSpent.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
