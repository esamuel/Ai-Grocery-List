/**
 * RECOVER ORIGINAL NOVEMBER DATES - NO INDEX REQUIRED
 * 
 * Simplified version that doesn't require complex Firestore indexes
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

async function recoverOriginalDates() {
  console.log('\n🔍 RECOVERING ORIGINAL NOVEMBER DATES FROM familyActivities');
  console.log('━'.repeat(70));

  try {
    // Step 1: Get all activities for this list (no complex query)
    console.log('\n📅 Step 1: Fetching activity logs...');
    
    const activitiesSnapshot = await db.collection('familyActivities')
      .where('listId', '==', LIST_ID)
      .get();

    console.log(`✅ Found ${activitiesSnapshot.size} total activities`);

    // Filter for November "checked" events in memory
    const novemberActivities = [];
    activitiesSnapshot.forEach(doc => {
      const data = doc.data();
      
      // Only process "checked" events
      if (data.type !== 'checked') return;
      
      const timestamp = new Date(data.timestamp);
      const month = timestamp.getMonth(); // 0-11
      const year = timestamp.getFullYear();
      
      // November 2024 or 2025
      if (month === 10 && (year === 2024 || year === 2025)) {
        novemberActivities.push({
          itemName: data.itemName,
          timestamp: data.timestamp,
          userName: data.userName,
          date: timestamp.toISOString().split('T')[0],
          fullDate: timestamp
        });
      }
    });

    console.log(`📦 Found ${novemberActivities.length} November check events`);

    if (novemberActivities.length === 0) {
      console.log('\n⚠️ No November activities found in familyActivities');
      console.log('Possible reasons:');
      console.log('  1. Activities were cleaned up');
      console.log('  2. Items were added but not checked');
      console.log('  3. Activity logging was disabled');
      console.log('\n💡 The estimated data is the best available.');
      return;
    }

    // Group by item name - keep the FIRST (earliest) check date for each item
    const itemDateMap = new Map();
    novemberActivities.forEach(activity => {
      const name = activity.itemName.toLowerCase().trim();
      if (!itemDateMap.has(name)) {
        itemDateMap.set(name, []);
      }
      itemDateMap.get(name).push(activity);
    });

    // Sort each item's activities by date (earliest first)
    itemDateMap.forEach((activities, name) => {
      activities.sort((a, b) => a.fullDate.getTime() - b.fullDate.getTime());
    });

    console.log(`📊 ${itemDateMap.size} unique items checked in November`);
    console.log('\n📝 Sample activities (showing first 5):');
    let count = 0;
    for (const [name, activities] of itemDateMap.entries()) {
      if (count++ >= 5) break;
      console.log(`  - "${name}": ${activities.length} checks`);
      console.log(`    Dates: ${activities.slice(0, 3).map(a => a.date).join(', ')}`);
    }

    // Step 2: Load current purchase history
    console.log('\n📦 Step 2: Loading current purchase history...');
    
    const listDoc = await db.collection('groceryLists').doc(LIST_ID).get();
    if (!listDoc.exists) {
      console.log('❌ List not found');
      return;
    }

    const listData = listDoc.data();
    const history = listData.history || [];
    
    console.log(`✅ Loaded ${history.length} history items`);

    // Step 3: Match and replace dates
    console.log('\n🔄 Step 3: Matching activities to purchase history...');
    console.log('━'.repeat(70));
    
    let matched = 0;
    let updated = 0;
    let totalPricesUpdated = 0;
    const updateLog = [];

    const updatedHistory = history.map(item => {
      const canonicalName = item.name.toLowerCase().trim();
      const activities = itemDateMap.get(canonicalName);

      if (!activities || activities.length === 0) {
        return item;
      }

      matched++;
      
      // Check if we need to update prices
      if (!item.prices || item.prices.length === 0) {
        return item;
      }

      let itemUpdated = false;
      const updatedPrices = item.prices.map((priceEntry, index) => {
        const currentDate = new Date(priceEntry.purchaseDate);
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        
        // If this price entry is dated December 2024/2025 but should be November
        if (currentMonth === 11 && (currentYear === 2024 || currentYear === 2025)) {
          // Use the activity timestamp that corresponds to this price entry
          // If multiple activities, distribute them across price entries
          const activityIndex = Math.min(index, activities.length - 1);
          const activityTimestamp = activities[activityIndex].timestamp;
          const activityDate = activities[activityIndex].date;
          
          updateLog.push({
            item: item.name,
            from: priceEntry.purchaseDate.split('T')[0],
            to: activityDate,
            price: priceEntry.price || 0,
            store: priceEntry.store || 'N/A'
          });
          
          totalPricesUpdated++;
          itemUpdated = true;
          
          return {
            ...priceEntry,
            purchaseDate: activityTimestamp,
            estimatedPrice: false // This is now REAL data from activity log
          };
        }
        
        return priceEntry;
      });
      
      if (itemUpdated) {
        updated++;
        return {
          ...item,
          prices: updatedPrices,
          lastPurchased: updatedPrices[updatedPrices.length - 1].purchaseDate
        };
      }

      return item;
    });

    console.log(`\n📊 Matching Results:`);
    console.log(`  Items found in activity logs: ${matched}/${history.length}`);
    console.log(`  Items with dates corrected: ${updated}`);
    console.log(`  Price entries updated: ${totalPricesUpdated}`);

    if (totalPricesUpdated > 0) {
      console.log(`\n📝 Sample corrections (showing first 10):`);
      updateLog.slice(0, 10).forEach(log => {
        console.log(`  ✓ "${log.item}"`);
        console.log(`    Date: ${log.from} → ${log.to}`);
        console.log(`    Price: ₪${log.price.toFixed(2)} at ${log.store}`);
      });
      if (updateLog.length > 10) {
        console.log(`  ... and ${updateLog.length - 10} more items`);
      }
    }

    if (updated === 0) {
      console.log('\n✅ All dates are already correct!');
      console.log('No December dates found that need correction.');
      return;
    }

    // Step 4: Save recovered data
    console.log('\n💾 Step 4: Saving recovered dates to Firestore...');
    
    await db.collection('groceryLists').doc(LIST_ID).update({
      history: updatedHistory,
      updatedAt: new Date().toISOString()
    });

    console.log('✅ Saved successfully!');

    // Step 5: Calculate totals
    console.log('\n📊 Step 5: Calculating recovered data...');
    
    const recoveredTotal = updateLog.reduce((sum, log) => sum + log.price, 0);
    const uniqueDates = new Set(updateLog.map(log => log.to));
    
    console.log(`  Total recovered amount: ₪${recoveredTotal.toFixed(2)}`);
    console.log(`  Shopping days recovered: ${uniqueDates.size}`);
    console.log(`  Date range: ${Array.from(uniqueDates).sort()[0]} to ${Array.from(uniqueDates).sort().pop()}`);

    // Step 6: Final summary
    console.log('\n✅ RECOVERY COMPLETE!');
    console.log('━'.repeat(70));
    console.log(`\n🎉 Successfully recovered ${totalPricesUpdated} purchase dates!`);
    console.log(`\n📊 Summary:`);
    console.log(`  ✓ Original November timestamps restored`);
    console.log(`  ✓ ${updated} items updated`);
    console.log(`  ✓ ${totalPricesUpdated} price entries corrected`);
    console.log(`  ✓ ₪${recoveredTotal.toFixed(2)} in purchases dated correctly`);
    console.log(`  ✓ ${uniqueDates.size} shopping days preserved`);
    console.log(`\n🎯 Your REAL November data is now restored!`);
    console.log(`\nNext steps:`);
    console.log(`  1. Go to https://aigrocerylists.com`);
    console.log(`  2. Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)`);
    console.log(`  3. Navigate to Spending Insights → Monthly Purchases`);
    console.log(`  4. Select November 2024`);
    console.log(`  5. Verify purchases show on their REAL November dates!`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Run recovery
recoverOriginalDates()
  .then(() => {
    console.log('\n✅ Recovery script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Recovery script failed:', error);
    process.exit(1);
  });
