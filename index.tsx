import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Import tools to make them available globally
import './services/diagnosticTools';
import './services/mergeHistoricalLists';
import './services/purchaseHistoryMigration';
import './services/fixPurchaseDateYears';
import './services/checkAllDataSources';
import './services/fixMissingPurchaseDates';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
