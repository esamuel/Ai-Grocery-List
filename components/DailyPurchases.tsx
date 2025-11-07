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

      {/* Daily Purchases List - All Days */}
      {dailyPurchases.length > 0 ? (
        <div className="space-y-4">
          {dailyPurchases.slice(0, 30).map(daily => (
            <div key={daily.date} className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-3">
                <div className="text-lg font-semibold text-gray-800">
                  {formatDate(daily.date)}
                </div>
                <div className="text-xl font-bold text-blue-600">
                  {getCurrencySymbol()}{daily.totalSpent.toFixed(2)}
                </div>
              </div>

              <div className="space-y-2">
                {daily.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start text-sm border-t border-gray-100 pt-2">
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
                          <div className="text-gray-600 font-medium">
                            {getCurrencySymbol()}{item.price.toFixed(2)}
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
          ))}
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
