import type { GroceryItem } from '../types';
import { categorizeAndTranslateImportedItems } from './geminiService';

// Common grocery item translations for semantic duplicate detection
const commonTranslations: Record<string, string[]> = {
  // Dairy
  'milk': ['milk', 'חלב', 'leche'],
  'cheese': ['cheese', 'גבינה', 'queso'],
  'butter': ['butter', 'חמאה', 'mantequilla'],
  'yogurt': ['yogurt', 'יוגורט', 'yogur'],
  
  // Fruits
  'apple': ['apple', 'תפוח', 'manzana'],
  'apples': ['apples', 'תפוחים', 'manzanas'],
  'banana': ['banana', 'בננה', 'plátano'],
  'orange': ['orange', 'תפוז', 'naranja'],
  'lemon': ['lemon', 'לימון', 'limón'],
  
  // Vegetables
  'tomato': ['tomato', 'עגבניה', 'tomate'],
  'tomatoes': ['tomatoes', 'עגבניות', 'tomates'],
  'onion': ['onion', 'בצל', 'cebolla'],
  'carrot': ['carrot', 'גזר', 'zanahoria'],
  'potato': ['potato', 'תפוח אדמה', 'papa'],
  'potatoes': ['potatoes', 'תפוחי אדמה', 'papas'],
  
  // Meat
  'chicken': ['chicken', 'עוף', 'pollo'],
  'beef': ['beef', 'בקר', 'carne'],
  'fish': ['fish', 'דג', 'pescado'],
  
  // Bread & Grains
  'bread': ['bread', 'לחם', 'pan'],
  'rice': ['rice', 'אורז', 'arroz'],
  'pasta': ['pasta', 'פסטה', 'pasta'],
  
  // Common items
  'egg': ['egg', 'ביצה', 'huevo'],
  'eggs': ['eggs', 'ביצים', 'huevos'],
  'water': ['water', 'מים', 'agua'],
  'salt': ['salt', 'מלח', 'sal'],
  'sugar': ['sugar', 'סוכר', 'azúcar']
};

// Create reverse lookup for faster searching
const translationLookup = new Map<string, string[]>();
Object.entries(commonTranslations).forEach(([key, translations]) => {
  translations.forEach(translation => {
    const normalized = translation.toLowerCase().trim();
    if (!translationLookup.has(normalized)) {
      translationLookup.set(normalized, []);
    }
    translationLookup.get(normalized)!.push(...translations.map(t => t.toLowerCase().trim()));
  });
});

// Smart duplicate detection that understands translations
function isSemanticDuplicate(newItem: string, existingItems: string[]): boolean {
  const normalizedNew = newItem.toLowerCase().trim();
  
  // First check exact match
  if (existingItems.some(existing => existing.toLowerCase().trim() === normalizedNew)) {
    return true;
  }
  
  // Then check semantic matches
  const possibleTranslations = translationLookup.get(normalizedNew);
  if (possibleTranslations) {
    return existingItems.some(existing => {
      const normalizedExisting = existing.toLowerCase().trim();
      return possibleTranslations.includes(normalizedExisting);
    });
  }
  
  return false;
}

export interface ImportResult {
  success: boolean;
  items: GroceryItem[];
  errors: string[];
  skipped: string[];
}

// Parse CSV content
function parseCSV(csvContent: string): string[] {
  const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const items: string[] = [];
  
  for (const line of lines) {
    // Handle both comma and semicolon separators
    const values = line.split(/[,;]/).map(val => val.trim().replace(/^["']|["']$/g, ''));
    
    // Take the first non-empty value as the item name
    const itemName = values.find(val => val.length > 0);
    if (itemName && !items.includes(itemName)) {
      items.push(itemName);
    }
  }
  
  return items;
}

// Parse plain text content (line-separated or comma-separated)
function parseText(textContent: string): string[] {
  // First try line-separated
  let items = textContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // If we only got one item but it contains commas, try comma-separated
  if (items.length === 1 && items[0].includes(',')) {
    items = items[0].split(',').map(item => item.trim()).filter(item => item.length > 0);
  }
  
  // Remove duplicates and empty items
  return [...new Set(items)].filter(item => item.length > 0);
}

// Parse Apple Reminders format (simple text list)
function parseAppleReminders(content: string): string[] {
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      // Remove common prefixes like "- ", "• ", "* ", numbers, etc.
      return line.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, '').trim();
    })
    .filter(item => item.length > 0);
}

// Import from file
export const importFromFile = async (
  file: File,
  existingItems: string[],
  language: 'en' | 'he' | 'es'
): Promise<ImportResult> => {
  const result: ImportResult = {
    success: false,
    items: [],
    errors: [],
    skipped: []
  };

  try {
    const content = await file.text();
    let itemNames: string[] = [];

    // Determine file type and parse accordingly
    const fileName = file.name.toLowerCase();
    const fileType = file.type.toLowerCase();

    if (fileName.endsWith('.csv') || fileType.includes('csv')) {
      itemNames = parseCSV(content);
    } else if (fileName.endsWith('.txt') || fileType.includes('text')) {
      itemNames = parseText(content);
    } else {
      // Try to auto-detect format
      if (content.includes(',') && content.split('\n').length < content.split(',').length) {
        itemNames = parseCSV(content);
      } else {
        itemNames = parseText(content);
      }
    }

    if (itemNames.length === 0) {
      result.errors.push('No valid items found in the file');
      return result;
    }

    // Filter out existing items using semantic duplicate detection
    const newItems = itemNames.filter(item => {
      const exists = isSemanticDuplicate(item, existingItems);
      if (exists) {
        result.skipped.push(item);
      }
      return !exists;
    });

    if (newItems.length === 0) {
      result.errors.push('All items already exist in your list');
      return result;
    }

    // Categorize items in batches to avoid overwhelming the API
    const batchSize = 10;
    const categorizedItems: GroceryItem[] = [];

    for (let i = 0; i < newItems.length; i += batchSize) {
      const batch = newItems.slice(i, i + batchSize);
      const batchText = batch.join(', ');

      try {
        // Only translate if not in English - English is the default
        const shouldTranslate = language !== 'en';
        
        if (shouldTranslate) {
          // Use translation for Hebrew/Spanish
          const categorizedResult = await categorizeAndTranslateImportedItems(batchText, existingItems, language);
          
          categorizedResult.forEach(cat => {
            cat.items.forEach(parsedItem => {
              categorizedItems.push({
                id: `${Date.now()}-${parsedItem.name}-${Math.random()}`,
                name: parsedItem.name,
                completed: false,
                category: cat.category,
                quantity: parsedItem.quantity,
                unit: parsedItem.unit,
                originalText: parsedItem.originalText
              });
            });
          });
        } else {
          // For English, use regular categorization without translation
          const { categorizeGroceries } = await import('./geminiService');
          const categorizedResult = await categorizeGroceries(batchText, existingItems, language);
          
          categorizedResult.forEach(cat => {
            cat.items.forEach(parsedItem => {
              categorizedItems.push({
                id: `${Date.now()}-${parsedItem.name}-${Math.random()}`,
                name: parsedItem.name,
                completed: false,
                category: cat.category,
                quantity: parsedItem.quantity,
                unit: parsedItem.unit,
                originalText: parsedItem.originalText || parsedItem.name
              });
            });
          });
        }
      } catch (error) {
        console.error('Error categorizing batch:', error);
        // Add items without categorization as fallback
        batch.forEach(item => {
          categorizedItems.push({
            id: `${Date.now()}-${item}-${Math.random()}`,
            name: item,
            completed: false,
            category: language === 'he' ? 'ללא קטגוריה' : language === 'es' ? 'Sin categoría' : 'Uncategorized',
            quantity: 1,
            originalText: item
          });
        });
      }
    }

    result.items = categorizedItems;
    result.success = true;

  } catch (error) {
    result.errors.push(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
};

// Import from clipboard text
export const importFromClipboard = async (
  existingItems: string[],
  language: 'en' | 'he' | 'es'
): Promise<ImportResult> => {
  const result: ImportResult = {
    success: false,
    items: [],
    errors: [],
    skipped: []
  };

  try {
    if (!navigator.clipboard) {
      result.errors.push('Clipboard access not available in this browser');
      return result;
    }

    const clipboardText = await navigator.clipboard.readText();
    
    if (!clipboardText.trim()) {
      result.errors.push('Clipboard is empty');
      return result;
    }

    // Parse clipboard content
    const itemNames = parseText(clipboardText);
    
    if (itemNames.length === 0) {
      result.errors.push('No valid items found in clipboard');
      return result;
    }

    // Filter out existing items using semantic duplicate detection
    const newItems = itemNames.filter(item => {
      const exists = isSemanticDuplicate(item, existingItems);
      if (exists) {
        result.skipped.push(item);
      }
      return !exists;
    });

    if (newItems.length === 0) {
      result.errors.push('All items already exist in your list');
      return result;
    }

    // Categorize items - only translate if not in English
    const batchText = newItems.join(', ');
    const shouldTranslate = language !== 'en';
    
    const categorizedItems: GroceryItem[] = [];
    
    try {
      if (shouldTranslate) {
        // Use translation for Hebrew/Spanish
        const categorizedResult = await categorizeAndTranslateImportedItems(batchText, existingItems, language);
        
        categorizedResult.forEach(cat => {
          cat.items.forEach(parsedItem => {
            categorizedItems.push({
              id: `${Date.now()}-${parsedItem.name}-${Math.random()}`,
              name: parsedItem.name,
              completed: false,
              category: cat.category,
              quantity: parsedItem.quantity,
              unit: parsedItem.unit,
              originalText: parsedItem.originalText
            });
          });
        });
      } else {
        // For English, use regular categorization without translation
        const { categorizeGroceries } = await import('./geminiService');
        const categorizedResult = await categorizeGroceries(batchText, existingItems, language);
        
        categorizedResult.forEach(cat => {
          cat.items.forEach(parsedItem => {
            categorizedItems.push({
              id: `${Date.now()}-${parsedItem.name}-${Math.random()}`,
              name: parsedItem.name,
              completed: false,
              category: cat.category,
              quantity: parsedItem.quantity,
              unit: parsedItem.unit,
              originalText: parsedItem.originalText || parsedItem.name
            });
          });
        });
      }
    } catch (error) {
      console.error('Error categorizing clipboard items:', error);
      // Add items without categorization as fallback
      newItems.forEach(item => {
        categorizedItems.push({
          id: `${Date.now()}-${item}-${Math.random()}`,
          name: item,
          completed: false,
          category: language === 'he' ? 'ללא קטגוריה' : language === 'es' ? 'Sin categoría' : 'Uncategorized',
          quantity: 1,
          originalText: item
        });
      });
    }

    result.items = categorizedItems;
    result.success = true;

  } catch (error) {
    result.errors.push(`Failed to read clipboard: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
};

// Export list to CSV
export const exportToCSV = (items: GroceryItem[]): string => {
  const headers = ['Item Name', 'Category', 'Quantity', 'Unit', 'Completed'];
  const rows = items.map(item => [
    `"${item.name}"`,
    `"${item.category}"`,
    item.quantity?.toString() || '1',
    `"${item.unit || ''}"`,
    item.completed ? 'Yes' : 'No'
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
};

// Export list to plain text
export const exportToText = (items: GroceryItem[]): string => {
  return items.map(item => {
    let text = item.name;
    if (item.quantity && item.quantity > 1) {
      text = `${item.quantity}× ${text}`;
    }
    if (item.unit) {
      text += ` (${item.unit})`;
    }
    return text;
  }).join('\n');
};

// Download file helper
export const downloadFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

// Get supported file types
export const getSupportedFileTypes = (): string => {
  return '.txt,.csv';
};

// Validate file before import
export const validateImportFile = (file: File): { valid: boolean; error?: string } => {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['text/plain', 'text/csv', 'application/csv'];
  const allowedExtensions = ['.txt', '.csv'];

  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 5MB' };
  }

  const fileName = file.name.toLowerCase();
  const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
  const hasValidType = allowedTypes.some(type => file.type.includes(type));

  if (!hasValidExtension && !hasValidType) {
    return { valid: false, error: 'Only .txt and .csv files are supported' };
  }

  return { valid: true };
};
