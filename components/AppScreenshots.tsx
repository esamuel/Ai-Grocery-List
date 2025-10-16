import React from 'react';

interface AppScreenshotProps {
  type: 'list' | 'price-tracking' | 'family-sharing' | 'ai-categorization' | 'family-activities';
}

export const AppScreenshot: React.FC<AppScreenshotProps> = ({ type }) => {
  // iPhone-style frame
  const Frame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="relative mx-auto" style={{ width: '375px', height: '667px' }}>
      {/* Phone frame */}
      <div className="absolute inset-0 bg-gray-900 rounded-[3rem] shadow-2xl p-3">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-6 bg-black rounded-b-3xl z-10"></div>
        {/* Screen */}
        <div className="relative w-full h-full bg-white rounded-[2.5rem] overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );

  if (type === 'list') {
    return (
      <Frame>
        <div className="h-full bg-gray-50">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-teal-600 px-6 py-8 text-white">
            <h1 className="text-2xl font-bold">AI Grocery List</h1>
            <p className="text-sm opacity-90 mt-1">Your smart shopping companion</p>
          </div>

          {/* Input */}
          <div className="px-4 py-4 bg-white shadow-sm">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g., '2 avocados, milk, bread'"
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg text-sm"
                value="2 avocados, milk, bread"
                readOnly
              />
              <button className="bg-green-500 text-white px-6 py-3 rounded-lg font-semibold text-sm">
                Add
              </button>
            </div>
          </div>

          {/* Categories */}
          <div className="px-4 py-4 space-y-4">
            {/* Produce */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <span>🥬</span> Produce
                </h3>
                <button className="text-xs text-green-600 font-semibold">Add All</button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
                  <input type="checkbox" className="w-5 h-5" />
                  <span className="text-gray-700">2 Avocados</span>
                </div>
                <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
                  <input type="checkbox" className="w-5 h-5" checked readOnly />
                  <span className="text-gray-400 line-through">Tomatoes</span>
                </div>
              </div>
            </div>

            {/* Dairy */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <span>🥛</span> Dairy
                </h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
                  <input type="checkbox" className="w-5 h-5" />
                  <span className="text-gray-700">Milk</span>
                </div>
              </div>
            </div>

            {/* Bakery */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <span>🍞</span> Bakery
                </h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
                  <input type="checkbox" className="w-5 h-5" />
                  <span className="text-gray-700">Bread</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Frame>
    );
  }

  if (type === 'price-tracking') {
    return (
      <Frame>
        <div className="h-full bg-gray-50">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-8 text-white">
            <h1 className="text-2xl font-bold">Price Tracking</h1>
            <p className="text-sm opacity-90 mt-1">Find the best deals</p>
          </div>

          {/* Price Comparisons */}
          <div className="px-4 py-4 space-y-4">
            {/* Item 1 */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-gray-800">Milk 1L</h3>
                  <p className="text-xs text-gray-500 mt-1">Tracked at 3 stores</p>
                </div>
                <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">
                  BEST DEAL
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg border-2 border-green-200">
                  <span className="text-sm font-semibold text-gray-700">Walmart</span>
                  <span className="text-lg font-bold text-green-600">$3.99</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Target</span>
                  <span className="text-sm text-gray-700">$4.49</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Kroger</span>
                  <span className="text-sm text-gray-700">$4.79</span>
                </div>
              </div>
              <div className="mt-3 text-xs text-green-600 font-semibold">
                💰 Save $0.80 by shopping at Walmart
              </div>
            </div>

            {/* Item 2 */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-gray-800">Bread</h3>
                  <p className="text-xs text-gray-500 mt-1">Tracked at 2 stores</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg border-2 border-green-200">
                  <span className="text-sm font-semibold text-gray-700">Kroger</span>
                  <span className="text-lg font-bold text-green-600">$2.49</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Walmart</span>
                  <span className="text-sm text-gray-700">$2.99</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Frame>
    );
  }

  if (type === 'family-sharing') {
    return (
      <Frame>
        <div className="h-full bg-gray-50">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-8 text-white">
            <h1 className="text-2xl font-bold">Family List</h1>
            <p className="text-sm opacity-90 mt-1">Shared with 3 members</p>
          </div>

          {/* Members */}
          <div className="px-4 py-4">
            <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
              <h3 className="font-bold text-gray-800 mb-3">Family Members</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                    S
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">Sarah (You)</p>
                    <p className="text-xs text-gray-500">Owner</p>
                  </div>
                  <span className="text-green-500 text-xs">● Active now</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">
                    J
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">John</p>
                    <p className="text-xs text-gray-500">Member</p>
                  </div>
                  <span className="text-gray-400 text-xs">5m ago</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-pink-500 flex items-center justify-center text-white font-bold">
                    E
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">Emma</p>
                    <p className="text-xs text-gray-500">Member</p>
                  </div>
                  <span className="text-gray-400 text-xs">2h ago</span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="font-bold text-gray-800 mb-3">Recent Activity</h3>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="text-2xl">✅</div>
                  <div className="flex-1">
                    <p className="text-sm"><span className="font-semibold">John</span> checked off Milk</p>
                    <p className="text-xs text-gray-500">5 minutes ago</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="text-2xl">➕</div>
                  <div className="flex-1">
                    <p className="text-sm"><span className="font-semibold">Emma</span> added Eggs</p>
                    <p className="text-xs text-gray-500">2 hours ago</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="text-2xl">✅</div>
                  <div className="flex-1">
                    <p className="text-sm"><span className="font-semibold">You</span> checked off Bread</p>
                    <p className="text-xs text-gray-500">3 hours ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Frame>
    );
  }

  if (type === 'ai-categorization') {
    return (
      <Frame>
        <div className="h-full bg-gray-50">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-red-600 px-6 py-8 text-white">
            <h1 className="text-2xl font-bold">AI Magic ✨</h1>
            <p className="text-sm opacity-90 mt-1">Smart categorization</p>
          </div>

          {/* AI Processing */}
          <div className="px-4 py-6">
            <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
              <div className="text-center mb-4">
                <div className="inline-block p-4 bg-orange-100 rounded-full mb-3">
                  <div className="text-4xl animate-bounce">🤖</div>
                </div>
                <h3 className="font-bold text-gray-800 text-lg">AI is organizing...</h3>
                <p className="text-sm text-gray-500 mt-1">Categorizing your items</p>
              </div>

              {/* Progress */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-sm text-gray-700">Analyzing items</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-sm text-gray-700">Detecting categories</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm text-gray-700">Organizing list...</span>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="space-y-3">
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🥬</span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">Produce</p>
                    <p className="text-xs text-gray-600">Avocados, Tomatoes</p>
                  </div>
                  <span className="text-green-600 font-bold">✓</span>
                </div>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🥛</span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">Dairy</p>
                    <p className="text-xs text-gray-600">Milk, Yogurt</p>
                  </div>
                  <span className="text-blue-600 font-bold">✓</span>
                </div>
              </div>

              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🍞</span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">Bakery</p>
                    <p className="text-xs text-gray-600">Bread</p>
                  </div>
                  <span className="text-yellow-600 font-bold">✓</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Frame>
    );
  }

  return null;
};
