import React, { useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { createPromoCode } from '../services/promoCodeService';
import promoCodesData from '../promo-codes-data.json';

interface PromoCodeAdminProps {
  onClose: () => void;
}

export const PromoCodeAdmin: React.FC<PromoCodeAdminProps> = ({ onClose }) => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ code: string; success: boolean; error?: string }[]>([]);
  const [completed, setCompleted] = useState(false);

  const handleAddAllCodes = async () => {
    setLoading(true);
    setResults([]);
    
    const newResults: { code: string; success: boolean; error?: string }[] = [];
    
    for (const promo of promoCodesData.promoCodes) {
      try {
        await createPromoCode({
          code: promo.code,
          type: promo.type as 'percentage' | 'fixed',
          value: promo.value,
          duration: promo.duration,
          maxUses: promo.maxUses,
          active: promo.active,
          expiresAt: promo.expiresAt ? Timestamp.fromDate(new Date(promo.expiresAt)) : null,
          description: promo.description
        });
        
        newResults.push({ code: promo.code, success: true });
        setResults([...newResults]);
        
        // Small delay to avoid overwhelming Firestore
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error: any) {
        newResults.push({ 
          code: promo.code, 
          success: false, 
          error: error.message || 'Unknown error' 
        });
        setResults([...newResults]);
      }
    }
    
    setLoading(false);
    setCompleted(true);
  };

  const successCount = results.filter(r => r.success).length;
  const errorCount = results.filter(r => !r.success).length;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-lg">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">🎁 Promo Code Admin</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>
          <p className="text-gray-600 mt-2">
            Add all {promoCodesData.promoCodes.length} promo codes to Firestore with one click
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {!completed && results.length === 0 && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🚀</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Ready to Add Promo Codes
              </h3>
              <p className="text-gray-600 mb-6">
                This will add {promoCodesData.promoCodes.length} promo codes to your Firestore database:
              </p>
              
              <div className="bg-blue-50 rounded-lg p-4 text-left max-w-md mx-auto mb-6">
                <div className="text-sm text-gray-700 space-y-1">
                  <div className="flex justify-between">
                    <span>• Beta Codes (100% off):</span>
                    <span className="font-semibold">3 codes</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• Launch Codes (50% off):</span>
                    <span className="font-semibold">3 codes</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• Referral Codes ($5 off):</span>
                    <span className="font-semibold">2 codes</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• Social Media (50% off):</span>
                    <span className="font-semibold">2 codes</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• VIP Codes (100% off):</span>
                    <span className="font-semibold">2 codes</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleAddAllCodes}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Adding Codes...' : '✨ Add All Promo Codes'}
              </button>
            </div>
          )}

          {loading && (
            <div className="space-y-2">
              <div className="text-center mb-4">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
                <p className="mt-2 text-gray-600">Adding promo codes...</p>
              </div>
              
              {results.map((result, index) => (
                <div 
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    result.success ? 'bg-green-50' : 'bg-red-50'
                  }`}
                >
                  <span className="font-mono font-semibold">
                    {result.success ? '✅' : '❌'} {result.code}
                  </span>
                  {result.error && (
                    <span className="text-xs text-red-600">{result.error}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {completed && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">
                {errorCount === 0 ? '🎉' : '⚠️'}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {errorCount === 0 ? 'All Codes Added Successfully!' : 'Completed with Errors'}
              </h3>
              
              <div className="bg-gray-50 rounded-lg p-4 max-w-md mx-auto mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">{successCount}</div>
                    <div className="text-sm text-gray-600">Successful</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-600">{errorCount}</div>
                    <div className="text-sm text-gray-600">Failed</div>
                  </div>
                </div>
              </div>

              {errorCount === 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left max-w-md mx-auto mb-6">
                  <h4 className="font-semibold text-green-900 mb-2">🎁 Promo Codes Ready:</h4>
                  <div className="text-sm text-green-800 space-y-1">
                    <div>• BETA2025 - 100% off first month</div>
                    <div>• LAUNCH50 - 50% off for 3 months</div>
                    <div>• WELCOME50 - 50% off for 3 months</div>
                    <div>• FRIEND5 - $5 off first month</div>
                    <div>• VIP-INFLUENCER - 100% off for 6 months</div>
                    <div className="pt-2 text-xs text-green-700">...and 7 more codes!</div>
                  </div>
                </div>
              )}

              {errorCount > 0 && (
                <div className="space-y-2 mb-6 max-w-md mx-auto">
                  <h4 className="font-semibold text-red-900 mb-2">Failed Codes:</h4>
                  {results.filter(r => !r.success).map((result, index) => (
                    <div key={index} className="bg-red-50 border border-red-200 rounded p-3 text-left">
                      <div className="font-mono font-semibold text-red-900">{result.code}</div>
                      <div className="text-xs text-red-700 mt-1">{result.error}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={onClose}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
                >
                  Done
                </button>
                
                {errorCount === 0 && (
                  <div className="text-sm text-gray-600">
                    <a 
                      href="https://console.firebase.google.com/project/family-grocery-list-ee6d3/firestore/data/promoCodes"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      View in Firebase Console →
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Results List */}
          {completed && results.length > 0 && (
            <details className="mt-6">
              <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
                View All Results
              </summary>
              <div className="mt-2 space-y-1 max-h-60 overflow-y-auto">
                {results.map((result, index) => (
                  <div 
                    key={index}
                    className={`flex items-center justify-between p-2 rounded text-sm ${
                      result.success ? 'bg-green-50' : 'bg-red-50'
                    }`}
                  >
                    <span className="font-mono">
                      {result.success ? '✅' : '❌'} {result.code}
                    </span>
                    {result.error && (
                      <span className="text-xs text-red-600">{result.error}</span>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
};

