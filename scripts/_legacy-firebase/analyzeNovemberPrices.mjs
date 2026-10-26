import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(
  readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const LIST_ID = 'WPEH3I';

async function analyzeNovemberPrices() {
  console.log('\n💰 ANALYZING NOVEMBER 2025 PRICES\n');
  console.log('━'.repeat(80));

  const list = await db.collection('groceryLists').doc(LIST_ID).get();
  const history = list.data().history || [];
  
  const november2025 = [];
  const byDate = new Map();
  const byStore = new Map();
  
  history.forEach(item => {
    if (!item.prices) return;
    item.prices.forEach(p => {
      const d = new Date(p.purchaseDate);
      if (d.getMonth() === 10 && d.getFullYear() === 2025) {
        const entry = {
          item: item.name,
          date: p.purchaseDate.split('T')[0],
          price: p.price || 0,
          store: p.store || 'Unknown',
          quantity: p.quantity || 1,
          unit: p.unit || '',
          estimated: p.estimatedPrice
        };
        november2025.push(entry);
        
        // Group by date
        if (!byDate.has(entry.date)) {
          byDate.set(entry.date, []);
        }
        byDate.get(entry.date).push(entry);
        
        // Group by store
        if (!byStore.has(entry.store)) {
          byStore.set(entry.store, []);
        }
        byStore.get(entry.store).push(entry);
      }
    });
  });

  console.log(`📦 Total November 2025 entries: ${november2025.length}`);
  console.log(`📅 Shopping days: ${byDate.size}`);
  console.log(`🏪 Stores: ${byStore.size}`);
  
  // Calculate totals
  const totalAmount = november2025.reduce((sum, e) => sum + e.price, 0);
  const avgPerItem = totalAmount / november2025.length;
  const avgPerDay = totalAmount / byDate.size;
  
  console.log(`\n💰 Price Analysis:`);
  console.log(`   Total spent: ₪${totalAmount.toFixed(2)}`);
  console.log(`   Average per item: ₪${avgPerItem.toFixed(2)}`);
  console.log(`   Average per shopping day: ₪${avgPerDay.toFixed(2)}`);
  
  // By store
  console.log(`\n🏪 Spending by Store:`);
  for (const [store, entries] of byStore.entries()) {
    const storeTotal = entries.reduce((sum, e) => sum + e.price, 0);
    console.log(`   ${store}: ₪${storeTotal.toFixed(2)} (${entries.length} items)`);
  }
  
  // By date
  console.log(`\n📅 Spending by Date:`);
  const dates = Array.from(byDate.keys()).sort();
  dates.forEach(date => {
    const entries = byDate.get(date);
    const dayTotal = entries.reduce((sum, e) => sum + e.price, 0);
    const stores = [...new Set(entries.map(e => e.store))];
    console.log(`   ${date}: ₪${dayTotal.toFixed(2)} (${entries.length} items, stores: ${stores.join(', ')})`);
  });
  
  // Show items with zero prices
  const zeroPrices = november2025.filter(e => e.price === 0);
  if (zeroPrices.length > 0) {
    console.log(`\n⚠️ Items with ZERO prices: ${zeroPrices.length}`);
    console.log('━'.repeat(80));
    zeroPrices.slice(0, 10).forEach((e, i) => {
      console.log(`   [${i + 1}] "${e.item}" - ${e.date} at ${e.store}`);
    });
    if (zeroPrices.length > 10) {
      console.log(`   ... and ${zeroPrices.length - 10} more`);
    }
  }
  
  // Show highest prices
  const sorted = [...november2025].sort((a, b) => b.price - a.price);
  console.log(`\n💎 Top 10 Most Expensive Items:`);
  console.log('━'.repeat(80));
  sorted.slice(0, 10).forEach((e, i) => {
    console.log(`   [${i + 1}] "${e.item}" - ₪${e.price.toFixed(2)} (${e.date} at ${e.store})`);
  });
  
  // Show sample items
  console.log(`\n📝 Random Sample of Items:`);
  console.log('━'.repeat(80));
  const sample = november2025.sort(() => Math.random() - 0.5).slice(0, 10);
  sample.forEach((e, i) => {
    console.log(`   [${i + 1}] "${e.item}"`);
    console.log(`       Price: ₪${e.price.toFixed(2)}`);
    console.log(`       Date: ${e.date}`);
    console.log(`       Store: ${e.store}`);
    console.log(`       Qty: ${e.quantity} ${e.unit}`);
  });
  
  console.log('\n━'.repeat(80));
  console.log('\n🔍 Does this match what you remember?');
  console.log(`   Total: ₪${totalAmount.toFixed(2)}`);
  console.log(`   Items: ${november2025.length}`);
  console.log(`   Days: ${byDate.size}`);
  console.log(`   Zero-price items: ${zeroPrices.length}`);
  
  if (zeroPrices.length > 0) {
    console.log(`\n⚠️ WARNING: ${zeroPrices.length} items have ₪0.00 prices!`);
    console.log('   This would make the total appear incorrect.');
  }
  
  process.exit(0);
}

analyzeNovemberPrices().catch(e => { console.error(e); process.exit(1); });






