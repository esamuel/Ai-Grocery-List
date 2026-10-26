/**
 * INSPECT NOVEMBER DATA - Deep dive into what's actually stored
 * 
 * This will show us exactly what data exists in:
 * 1. familyActivities (activity logs)
 * 2. purchaseHistory (prices, stores, etc.)
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
  readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const LIST_ID = 'WPEH3I';

async function inspectNovemberData() {
  console.log('\n🔍 DEEP INSPECTION OF NOVEMBER DATA');
  console.log('━'.repeat(80));

  try {
    // Step 1: Inspect familyActivities collection
    console.log('\n📅 STEP 1: Inspecting familyActivities collection...\n');
    
    const activitiesSnapshot = await db.collection('familyActivities')
      .where('listId', '==', LIST_ID)
      .get();

    console.log(`Total activities found: ${activitiesSnapshot.size}`);

    // Get November "checked" events
    const novemberChecks = [];
    activitiesSnapshot.forEach(doc => {
      const data = doc.data();
      const timestamp = new Date(data.timestamp);
      const month = timestamp.getMonth();
      const year = timestamp.getFullYear();
      
      if (data.type === 'checked' && month === 10 && year === 2024) {
        novemberChecks.push({
          id: doc.id,
          ...data,
          dateFormatted: timestamp.toISOString().split('T')[0]
        });
      }
    });

    console.log(`\nNovember 2024 "checked" events: ${novemberChecks.length}`);
    
    if (novemberChecks.length > 0) {
      console.log('\n📦 Sample activity logs (first 5):');
      console.log('━'.repeat(80));
      novemberChecks.slice(0, 5).forEach((activity, i) => {
        console.log(`\n[${i + 1}] Activity ID: ${activity.id}`);
        console.log(`    Item: "${activity.itemName}"`);
        console.log(`    Date: ${activity.dateFormatted} (${activity.timestamp})`);
        console.log(`    User: ${activity.userName}`);
        console.log(`    Type: ${activity.type}`);
        console.log(`    Raw data:`, JSON.stringify(activity, null, 2));
      });

      console.log('\n🔍 What data does familyActivities have?');
      const sampleActivity = novemberChecks[0];
      console.log('Available fields:', Object.keys(sampleActivity));
      console.log('\n❌ familyActivities does NOT store:');
      console.log('   - Prices');
      console.log('   - Store names');
      console.log('   - Quantities');
      console.log('   - Weights');
      console.log('\n✅ familyActivities ONLY stores:');
      console.log('   - Item name');
      console.log('   - Timestamp (when checked)');
      console.log('   - User who checked it');
      console.log('   - Action type (checked/added/removed)');
    }

    // Step 2: Inspect purchase history
    console.log('\n\n📦 STEP 2: Inspecting purchaseHistory in groceryLists...\n');
    console.log('━'.repeat(80));
    
    const listDoc = await db.collection('groceryLists').doc(LIST_ID).get();
    if (!listDoc.exists) {
      console.log('❌ List not found');
      return;
    }

    const listData = listDoc.data();
    const history = listData.history || [];
    
    console.log(`Total purchase history items: ${history.length}`);

    // Find items with November dates
    const novemberPurchases = history.filter(item => {
      if (!item.prices || item.prices.length === 0) return false;
      
      return item.prices.some(price => {
        const date = new Date(price.purchaseDate);
        return date.getMonth() === 10 && date.getFullYear() === 2024;
      });
    });

    console.log(`Items with November 2024 dates: ${novemberPurchases.length}`);

    if (novemberPurchases.length > 0) {
      console.log('\n📝 Sample purchase history items (first 5 with November dates):');
      console.log('━'.repeat(80));
      
      novemberPurchases.slice(0, 5).forEach((item, i) => {
        console.log(`\n[${i + 1}] "${item.name}"`);
        console.log(`    Category: ${item.category}`);
        console.log(`    Frequency: ${item.frequency} purchases`);
        console.log(`    Last purchased: ${item.lastPurchased?.split('T')[0]}`);
        console.log(`    Price entries (${item.prices.length}):`);
        
        item.prices.forEach((price, j) => {
          const date = new Date(price.purchaseDate);
          if (date.getMonth() === 10 && date.getFullYear() === 2024) {
            console.log(`\n    [${j + 1}] November 2024 entry:`);
            console.log(`        Date: ${price.purchaseDate.split('T')[0]}`);
            console.log(`        Price: ₪${price.price || 0}`);
            console.log(`        Store: "${price.store || 'N/A'}"`);
            console.log(`        Quantity: ${price.quantity || 'N/A'}`);
            console.log(`        Unit: ${price.unit || 'N/A'}`);
            console.log(`        Unit Price: ${price.unitPrice ? '₪' + price.unitPrice : 'N/A'}`);
            console.log(`        Currency: ${price.currency || 'N/A'}`);
            console.log(`        Estimated?: ${price.estimatedPrice ? 'YES ≈' : 'NO (Real)'}`);
            console.log(`        Full entry:`, JSON.stringify(price, null, 2));
          }
        });
      });
    }

    // Step 3: Analysis
    console.log('\n\n📊 STEP 3: Analysis & Recovery Possibilities\n');
    console.log('━'.repeat(80));

    console.log('\n🔍 What CAN be recovered from familyActivities:');
    console.log('   ✅ Original purchase DATES (timestamps when items were checked)');
    console.log('   ✅ Item names');
    console.log('   ✅ Who checked the items');

    console.log('\n❌ What CANNOT be recovered from familyActivities:');
    console.log('   ❌ Prices (never stored in activity logs)');
    console.log('   ❌ Store names (never stored in activity logs)');
    console.log('   ❌ Quantities/weights (never stored in activity logs)');

    console.log('\n🤔 Where is YOUR original price/store data?');
    console.log('   It should be in purchaseHistory.prices array');
    console.log('   Let me check if it still exists...\n');

    // Check for November items with REAL (non-estimated) prices
    const novemberRealPrices = [];
    novemberPurchases.forEach(item => {
      item.prices.forEach(price => {
        const date = new Date(price.purchaseDate);
        if (date.getMonth() === 10 && date.getFullYear() === 2024) {
          if (!price.estimatedPrice && price.price > 0) {
            novemberRealPrices.push({
              item: item.name,
              date: price.purchaseDate.split('T')[0],
              price: price.price,
              store: price.store,
              quantity: price.quantity,
              unit: price.unit
            });
          }
        }
      });
    });

    console.log(`📊 November items with REAL (non-estimated) prices: ${novemberRealPrices.length}`);
    
    if (novemberRealPrices.length > 0) {
      console.log('\n✅ GOOD NEWS! Found real November price data:');
      novemberRealPrices.slice(0, 10).forEach((entry, i) => {
        console.log(`\n  [${i + 1}] "${entry.item}"`);
        console.log(`      Date: ${entry.date}`);
        console.log(`      Price: ₪${entry.price}`);
        console.log(`      Store: "${entry.store || 'Not recorded'}"`);
        console.log(`      Qty: ${entry.quantity || 'N/A'} ${entry.unit || ''}`);
      });

      console.log('\n💡 If store name looks wrong, possible reasons:');
      console.log('   1. It was estimated/auto-filled (not your original entry)');
      console.log('   2. It was the default store at that time');
      console.log('   3. The original entry was overwritten by estimation');
    } else {
      console.log('\n⚠️ All November prices appear to be estimated');
      console.log('   Original price/store data may have been lost in the corruption');
    }

    // Step 4: Check for December-dated entries that might be corrupted November
    console.log('\n\n🔍 STEP 4: Checking for corrupted dates (December that should be November)...\n');
    console.log('━'.repeat(80));

    const suspiciousDecemberEntries = [];
    history.forEach(item => {
      if (!item.prices || item.prices.length === 0) return;
      
      item.prices.forEach(price => {
        const date = new Date(price.purchaseDate);
        const month = date.getMonth();
        const year = date.getFullYear();
        
        // December 2024 entries (might be corrupted November)
        if (month === 11 && year === 2024) {
          suspiciousDecemberEntries.push({
            item: item.name,
            date: price.purchaseDate.split('T')[0],
            price: price.price,
            store: price.store,
            estimated: price.estimatedPrice
          });
        }
      });
    });

    console.log(`Found ${suspiciousDecemberEntries.length} December 2024 entries`);
    
    if (suspiciousDecemberEntries.length > 0) {
      console.log('\n📋 Sample December entries (might be corrupted November data):');
      suspiciousDecemberEntries.slice(0, 5).forEach((entry, i) => {
        console.log(`\n  [${i + 1}] "${entry.item}"`);
        console.log(`      Current date: ${entry.date} (December)`);
        console.log(`      Price: ₪${entry.price || 0}`);
        console.log(`      Store: "${entry.store || 'N/A'}"`);
        console.log(`      Estimated?: ${entry.estimated ? 'YES' : 'NO'}`);
      });
    }

    // Final summary
    console.log('\n\n✅ INSPECTION COMPLETE\n');
    console.log('━'.repeat(80));
    console.log('\n📊 Summary:');
    console.log(`   Total activities: ${activitiesSnapshot.size}`);
    console.log(`   November check events: ${novemberChecks.length}`);
    console.log(`   Purchase history items: ${history.length}`);
    console.log(`   Items with November dates: ${novemberPurchases.length}`);
    console.log(`   Items with REAL November prices: ${novemberRealPrices.length}`);
    console.log(`   Suspicious December entries: ${suspiciousDecemberEntries.length}`);

    console.log('\n💡 Conclusion:');
    if (novemberRealPrices.length > 0) {
      console.log('   ✅ Some real November data exists with prices/stores');
      console.log('   ⚠️ But stores might be estimated, not your original entries');
    } else {
      console.log('   ⚠️ No real November price data found');
      console.log('   📝 All prices appear to be estimated');
    }

    console.log('\n🔧 What the previous recovery did:');
    console.log('   ✅ Copied DATES from familyActivities (accurate timestamps)');
    console.log('   ✅ Kept PRICES from purchaseHistory (may be estimated)');
    console.log('   ⚠️ Kept STORES from purchaseHistory (may be estimated)');

    console.log('\n❌ What CANNOT be recovered:');
    console.log('   If the original price/store data was overwritten with estimates,');
    console.log('   those original values are permanently lost.');
    console.log('   familyActivities only logs timestamps, not transaction details.');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Run inspection
inspectNovemberData()
  .then(() => {
    console.log('\n✅ Inspection complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Inspection failed:', error);
    process.exit(1);
  });






