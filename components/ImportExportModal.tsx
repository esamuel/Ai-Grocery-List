import React, { useState, useRef } from 'react';
import type { GroceryItem } from '../types';
import { 
  importFromFile, 
  importFromClipboard, 
  exportToCSV, 
  exportToText, 
  downloadFile, 
  getSupportedFileTypes, 
  
  validateImportFile,
  type ImportResult 
} from '../services/importService';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: GroceryItem[];
  existingItemNames: string[];
  language: 'en' | 'he' | 'es';
  onImportSuccess: (items: GroceryItem[]) => void;
  translations: {
    title: string;
    importTab: string;
    exportTab: string;
    importFromFile: string;
    importFromClipboard: string;
    exportAsCSV: string;
    exportAsText: string;
    selectFile: string;
    pasteFromClipboard: string;
    importing: string;
    exporting: string;
    close: string;
    success: string;
    error: string;
    itemsImported: string;
    itemsSkipped: string;
    noItemsToExport: string;
    fileTooBig: string;
    invalidFileType: string;
    clipboardEmpty: string;
  };
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  items,
  existingItemNames,
  language,
  onImportSuccess,
  translations
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateImportFile(file);
    if (!validation.valid) {
      setImportError(validation.error || 'Invalid file');
      return;
    }

    setIsImporting(true);
    setImportError(null);
    setImportResult(null);

    try {
      const result = await importFromFile(file, existingItemNames, language);
      setImportResult(result);
      
      if (result.success && result.items.length > 0) {
        onImportSuccess(result.items);
      }
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClipboardImport = async () => {
    setIsImporting(true);
    setImportError(null);
    setImportResult(null);

    try {
      const result = await importFromClipboard(existingItemNames, language);
      setImportResult(result);
      
      if (result.success && result.items.length > 0) {
        onImportSuccess(result.items);
      }
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportCSV = () => {
    if (items.length === 0) {
      setImportError(translations.noItemsToExport);
      return;
    }

    setIsExporting(true);
    try {
      const csvContent = exportToCSV(items);
      const filename = `grocery-list-${new Date().toISOString().split('T')[0]}.csv`;
      downloadFile(csvContent, filename, 'text/csv');
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportText = () => {
    if (items.length === 0) {
      setImportError(translations.noItemsToExport);
      return;
    }

    setIsExporting(true);
    try {
      const textContent = exportToText(items);
      const filename = `grocery-list-${new Date().toISOString().split('T')[0]}.txt`;
      downloadFile(textContent, filename, 'text/plain');
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const resetModal = () => {
    setImportResult(null);
    setImportError(null);
    setActiveTab('import');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">{translations.title}</h2>
          <button
            onClick={() => {
              onClose();
              resetModal();
            }}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'import'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {translations.importTab}
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'export'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {translations.exportTab}
          </button>
        </div>

        {/* Import Tab */}
        {activeTab === 'import' && (
          <div className="space-y-4">
            {/* File Import */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {translations.importFromFile}
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept={getSupportedFileTypes()}
                onChange={handleFileImport}
                disabled={isImporting}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                Supports .txt and .csv files (max 5MB)
              </p>
            </div>

            {/* Clipboard Import */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {translations.importFromClipboard}
              </label>
              <button
                onClick={handleClipboardImport}
                disabled={isImporting}
                className="w-full py-2 px-4 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-400 transition-colors"
              >
                {isImporting ? translations.importing : translations.pasteFromClipboard}
              </button>
              <p className="text-xs text-gray-500 mt-1">
                Paste grocery list from clipboard (line or comma separated)
              </p>
            </div>
          </div>
        )}

        {/* Export Tab */}
        {activeTab === 'export' && (
          <div className="space-y-4">
            <div className="text-sm text-gray-600 mb-4">
              Export your current grocery list ({items.length} items)
            </div>

            <button
              onClick={handleExportCSV}
              disabled={isExporting || items.length === 0}
              className="w-full py-3 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {isExporting ? translations.exporting : translations.exportAsCSV}
            </button>

            <button
              onClick={handleExportText}
              disabled={isExporting || items.length === 0}
              className="w-full py-3 px-4 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {isExporting ? translations.exporting : translations.exportAsText}
            </button>
          </div>
        )}

        {/* Results and Errors */}
        {importResult && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800 font-medium mb-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {translations.success}
            </div>
            <div className="text-sm text-green-700">
              {importResult.items.length > 0 && (
                <p>{translations.itemsImported.replace('{count}', importResult.items.length.toString())}</p>
              )}
              {importResult.skipped.length > 0 && (
                <p>{translations.itemsSkipped.replace('{count}', importResult.skipped.length.toString())}</p>
              )}
            </div>
          </div>
        )}

        {importError && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800 font-medium mb-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {translations.error}
            </div>
            <p className="text-sm text-red-700">{importError}</p>
          </div>
        )}
      </div>
    </div>
  );
};
