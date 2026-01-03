/**
 * Script to fix placeholder prices and store names from October/November 2024
 * 
 * What it does:
 * 1. Finds all items with price=12.00 and storeName="שמוליק אשכנזי" from Oct/Nov 2024
 * 2. For each item, finds the most recent real price from other months
 * 3. Updates with real price and storeName="קורפור"
 * 4. Creates backup and detailed reports
 * 
 * Usage:
 *   Phase 1 - Preview: npm run fix-prices -- --preview
 *   Phase 2 - Apply:   npm run fix-prices -- --apply
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Firebase config
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface PurchaseHistoryItem {
  name: string;
  category: string;
  purchaseDate: string;
  price?: number;
  storeName?: string;
  quantity?: number;
  unit?: string;
}

interface FixCandidate {
  index: number;
  item: PurchaseHistoryItem;
  newPrice?: number;
  newStoreName: string;
  status: 'can_fix' | 'no_match' | 'already_correct';
  matchSource?: string; // Which month/date the price came from
}

// Normalize product names for matching (handle typos, plurals, etc.)
function normalizeProductName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[״׳]/g, '') // Remove Hebrew quotes
    .replace(/\.$/, ''); // Remove trailing period
}

// Check if item is a placeholder
function isPlaceholder(item: PurchaseHistoryItem): boolean {
  return (
    item.price === 12.00 &&
    item.storeName === 'שמוליק אשכנזי'
  );
}

// Check if date is in Oct/Nov 2024
function isOctNov2024(dateStr: string): boolean {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed (0=Jan, 9=Oct, 10=Nov)
  
  return year === 2024 && (month === 9 || month === 10); // Oct=9, Nov=10
}

// Find most recent real price for a product
function findMostRecentPrice(
  productName: string,
  history: PurchaseHistoryItem[],
  excludeIndex: number
): { price: number; source: string } | null {
  const normalized = normalizeProductName(productName);
  
  // Find all matching items with real prices (not placeholders)
  const matches = history
    .map((item, index) => ({ item, index }))
    .filter(({ item, index }) => {
      if (index === excludeIndex) return false;
      if (isPlaceholder(item)) return false;
      if (!item.price || item.price === 12.00) return false;
      
      return normalizeProductName(item.name) === normalized;
    })
    .sort((a, b) => {
      // Sort by date descending (most recent first)
      const dateA = new Date(a.item.purchaseDate).getTime();
      const dateB = new Date(b.item.purchaseDate).getTime();
      return dateB - dateA;
    });
  
  if (matches.length === 0) return null;
  
  // Return most recent price
  const mostRecent = matches[0];
  return {
    price: mostRecent.item.price!,
    source: `${mostRecent.item.purchaseDate} (${mostRecent.item.storeName || 'unknown store'})`
  };
}

// Analyze and generate preview report
async function analyzeData(listId: string): Promise<FixCandidate[]> {
  console.log('📊 Loading purchase history...');
  
  const listRef = doc(db, 'groceryLists', listId);
  const listSnap = await getDoc(listRef);
  
  if (!listSnap.exists()) {
    throw new Error(`List ${listId} not found`);
  }
  
  const data = listSnap.data();
  const history: PurchaseHistoryItem[] = data.history || [];
  
  console.log(`✅ Loaded ${history.length} purchase history items`);
  console.log('');
  
  // Find all placeholder items from Oct/Nov 2024
  const candidates: FixCandidate[] = [];
  
  for (let i = 0; i < history.length; i++) {
    const item = history[i];
    
    if (isPlaceholder(item) && isOctNov2024(item.purchaseDate)) {
      // Find real price for this item
      const priceMatch = findMostRecentPrice(item.name, history, i);
      
      if (priceMatch) {
        candidates.push({
          index: i,
          item,
          newPrice: priceMatch.price,
          newStoreName: 'קורפור',
          status: 'can_fix',
          matchSource: priceMatch.source
        });
      } else {
        candidates.push({
          index: i,
          item,
          newPrice: undefined,
          newStoreName: 'קורפור',
          status: 'no_match',
          matchSource: undefined
        });
      }
    }
  }
  
  return candidates;
}

// Generate preview report
function generatePreviewReport(candidates: FixCandidate[]): void {
  const canFix = candidates.filter(c => c.status === 'can_fix');
  const noMatch = candidates.filter(c => c.status === 'no_match');
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📋 PREVIEW REPORT: October/November 2024 Price Fixes');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  
  console.log(`✅ Items that CAN be fixed: ${canFix.length}`);
  console.log(`⚠️  Items with NO match: ${noMatch.length}`);
  console.log(`📊 Total items to process: ${candidates.length}`);
  console.log('');
  
  if (canFix.length > 0) {
    console.log('✅ Items That Will Be Fixed:');
    console.log('───────────────────────────────────────────────────────────');
    
    canFix.forEach((c, idx) => {
      console.log(`${idx + 1}. ${c.item.name}`);
      console.log(`   Date: ${c.item.purchaseDate}`);
      console.log(`   Current: 12.00 ₪ @ שמוליק אשכנזי`);
      console.log(`   New:     ${c.newPrice!.toFixed(2)} ₪ @ קורפור`);
      console.log(`   Source:  ${c.matchSource}`);
      console.log('');
    });
  }
  
  if (noMatch.length > 0) {
    console.log('⚠️  Items With NO Match (Will Keep 12.00):');
    console.log('───────────────────────────────────────────────────────────');
    
    noMatch.forEach((c, idx) => {
      console.log(`${idx + 1}. ${c.item.name}`);
      console.log(`   Date: ${c.item.purchaseDate}`);
      console.log(`   Status: No other purchases found for this product`);
      console.log(`   Action: Will keep 12.00 ₪ and change store to קורפור`);
      console.log('');
    });
  }
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('💡 Next Steps:');
  console.log('   1. Review the changes above');
  console.log('   2. If everything looks good, run:');
  console.log('      npm run fix-prices -- --apply');
  console.log('');
  console.log('⚠️  WARNING: This will modify your Firestore data!');
  console.log('   A backup will be created automatically.');
  console.log('═══════════════════════════════════════════════════════════');
}

// Save backup before applying changes
async function saveBackup(listId: string): Promise<void> {
  console.log('💾 Creating backup...');
  
  const listRef = doc(db, 'groceryLists', listId);
  const listSnap = await getDoc(listRef);
  
  if (!listSnap.exists()) {
    throw new Error(`List ${listId} not found`);
  }
  
  const data = listSnap.data();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'backups');
  
  // Create backups directory if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const backupPath = path.join(backupDir, `backup-${listId}-${timestamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
  
  console.log(`✅ Backup saved: ${backupPath}`);
  console.log('');
}

// Apply the fixes
async function applyFixes(listId: string, candidates: FixCandidate[]): Promise<void> {
  console.log('🔧 Applying fixes...');
  console.log('');
  
  // Create backup first
  await saveBackup(listId);
  
  // Load current data
  const listRef = doc(db, 'groceryLists', listId);
  const listSnap = await getDoc(listRef);
  
  if (!listSnap.exists()) {
    throw new Error(`List ${listId} not found`);
  }
  
  const data = listSnap.data();
  const history: PurchaseHistoryItem[] = [...data.history];
  
  let fixedCount = 0;
  let keptCount = 0;
  
  // Apply fixes
  for (const candidate of candidates) {
    if (candidate.status === 'can_fix' && candidate.newPrice) {
      history[candidate.index] = {
        ...history[candidate.index],
        price: candidate.newPrice,
        storeName: candidate.newStoreName
      };
      fixedCount++;
      console.log(`✅ Fixed: ${candidate.item.name} → ${candidate.newPrice.toFixed(2)} ₪`);
    } else if (candidate.status === 'no_match') {
      history[candidate.index] = {
        ...history[candidate.index],
        storeName: candidate.newStoreName
      };
      keptCount++;
      console.log(`⚠️  Kept: ${candidate.item.name} → 12.00 ₪ (no match found)`);
    }
  }
  
  // Update Firestore
  console.log('');
  console.log('📤 Updating Firestore...');
  await updateDoc(listRef, { history });
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ MIGRATION COMPLETE!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`✅ Fixed with real prices: ${fixedCount}`);
  console.log(`⚠️  Kept at 12.00 (no match): ${keptCount}`);
  console.log(`📊 Total processed: ${candidates.length}`);
  console.log('═══════════════════════════════════════════════════════════');
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const isPreview = args.includes('--preview');
  const isApply = args.includes('--apply');
  const listIdArg = args.find(arg => arg.startsWith('--list='));
  
  if (!isPreview && !isApply) {
    console.error('❌ Error: Must specify --preview or --apply');
    console.log('');
    console.log('Usage:');
    console.log('  Preview: npm run fix-prices -- --preview --list=YOUR_LIST_ID');
    console.log('  Apply:   npm run fix-prices -- --apply --list=YOUR_LIST_ID');
    process.exit(1);
  }
  
  if (!listIdArg) {
    console.error('❌ Error: Must specify --list=YOUR_LIST_ID');
    console.log('');
    console.log('Example: npm run fix-prices -- --preview --list=WPEH3I');
    process.exit(1);
  }
  
  const listId = listIdArg.split('=')[1];
  
  try {
    console.log('🚀 Starting migration script...');
    console.log(`📋 List ID: ${listId}`);
    console.log(`🔍 Mode: ${isPreview ? 'PREVIEW' : 'APPLY'}`);
    console.log('');
    
    // Analyze data
    const candidates = await analyzeData(listId);
    
    if (candidates.length === 0) {
      console.log('✅ No items need fixing! All good!');
      process.exit(0);
    }
    
    if (isPreview) {
      // Generate preview report
      generatePreviewReport(candidates);
    } else if (isApply) {
      // Apply fixes
      await applyFixes(listId, candidates);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run main
main();

