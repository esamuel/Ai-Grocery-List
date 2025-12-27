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

async function check() {
  console.log('\n🔍 Checking for November 2025 data...\n');
  
  // Check activities for November 2025
  const activities = await db.collection('familyActivities')
    .where('listId', '==', LIST_ID)
    .get();
  
  let nov2025Count = 0;
  const nov2025Activities = [];
  activities.forEach(doc => {
    const data = doc.data();
    const date = new Date(data.timestamp);
    if (date.getMonth() === 10 && date.getFullYear() === 2025 && data.type === 'checked') {
      nov2025Count++;
      nov2025Activities.push({
        item: data.itemName,
        date: date.toISOString().split('T')[0],
        timestamp: data.timestamp
      });
    }
  });
  
  console.log(`📅 November 2025 check activities: ${nov2025Count}`);
  
  // Check purchase history for November 2025
  const list = await db.collection('groceryLists').doc(LIST_ID).get();
  const history = list.data().history || [];
  
  const nov2025Purchases = [];
  history.forEach(item => {
    if (!item.prices) return;
    item.prices.forEach(p => {
      const d = new Date(p.purchaseDate);
      if (d.getMonth() === 10 && d.getFullYear() === 2025) {
        nov2025Purchases.push({
          item: item.name,
          date: p.purchaseDate.split('T')[0],
          price: p.price,
          store: p.store,
          quantity: p.quantity,
          unit: p.unit,
          estimated: p.estimatedPrice
        });
      }
    });
  });
  
  console.log(`📦 November 2025 purchase entries: ${nov2025Purchases.length}`);
  
  if (nov2025Purchases.length > 0) {
    console.log('\n📝 Sample November 2025 purchase data:');
    console.log('━'.repeat(80));
    nov2025Purchases.slice(0, 5).forEach((entry, i) => {
      console.log(`\n[${i + 1}] "${entry.item}"`);
      console.log(`    Date: ${entry.date}`);
      console.log(`    Price: ₪${entry.price || 0}`);
      console.log(`    Store: "${entry.store || 'N/A'}"`);
      console.log(`    Qty: ${entry.quantity || 'N/A'} ${entry.unit || ''}`);
      console.log(`    Estimated?: ${entry.estimated ? 'YES ≈' : 'NO (Real data)'}`);
    });
    
    // Check for real vs estimated
    const realPrices = nov2025Purchases.filter(p => !p.estimated && p.price > 0);
    const estimatedPrices = nov2025Purchases.filter(p => p.estimated);
    
    console.log('\n\n📊 Data Quality Analysis:');
    console.log(`   Real (non-estimated) entries: ${realPrices.length}`);
    console.log(`   Estimated entries: ${estimatedPrices.length}`);
    
    if (realPrices.length > 0) {
      console.log('\n✅ Found real price data! Examples:');
      realPrices.slice(0, 3).forEach(p => {
        console.log(`   "${p.item}" - ₪${p.price} at "${p.store || 'N/A'}"`);
      });
    }
  }
  
  console.log('\n━'.repeat(80));
  console.log('\n💡 Conclusion:');
  if (nov2025Purchases.length === 0) {
    console.log('   ⚠️ No November 2025 data found');
    console.log('   All your data might be in a different month/year');
  } else {
    const realCount = nov2025Purchases.filter(p => !p.estimated && p.price > 0).length;
    if (realCount > 0) {
      console.log(`   ✅ Found ${realCount} entries with REAL (not estimated) prices`);
      console.log('   ⚠️ But store names may still be estimated if "Samuel Eskenasy" appears');
    } else {
      console.log('   ❌ All entries are estimated - original data was lost');
    }
  }
  
  process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });




