import { getFirestore } from 'firebase/firestore/lite';
import { doc as docLite, getDoc as getDocLite } from 'firebase/firestore/lite';

/**
 * Check all possible data sources for purchase history
 */
export async function checkAllDataSources(userId: string, listIds: string[]) {
  console.log('🔍 COMPREHENSIVE DATA CHECK');
  console.log('=' .repeat(50));

  const anyFirebase: any = (globalThis as any);
  const db = anyFirebase.__firebase_db_lite || getFirestore();

  // 1. Check /purchaseHistory/{userId}
  console.log('\n📊 Checking /purchaseHistory/' + userId);
  try {
    const purchaseHistoryRef = docLite(db, 'purchaseHistory', userId);
    const purchaseHistorySnap = await getDocLite(purchaseHistoryRef);

    if (purchaseHistorySnap.exists()) {
      const data = purchaseHistorySnap.data();
      console.log('✅ Found purchaseHistory document!');
      console.log('   Data:', data);
    } else {
      console.log('❌ No purchaseHistory document found');
    }
  } catch (error) {
    console.error('❌ Error checking purchaseHistory:', error);
  }

  // 2. Check /priceHistory/{userId}
  console.log('\n💰 Checking /priceHistory/' + userId);
  try {
    const priceHistoryRef = docLite(db, 'priceHistory', userId);
    const priceHistorySnap = await getDocLite(priceHistoryRef);

    if (priceHistorySnap.exists()) {
      const data = priceHistorySnap.data();
      console.log('✅ Found priceHistory document!');
      console.log('   Data:', data);
    } else {
      console.log('❌ No priceHistory document found');
    }
  } catch (error) {
    console.error('❌ Error checking priceHistory:', error);
  }

  // 3. Check each grocery list's history array
  console.log('\n📋 Checking grocery lists history arrays...');
  for (const listId of listIds.slice(0, 5)) { // Check first 5 to avoid too much output
    console.log(`\n  List ${listId}:`);
    try {
      const listRef = docLite(db, 'groceryLists', listId);
      const listSnap = await getDocLite(listRef);

      if (listSnap.exists()) {
        const data = listSnap.data();
        const history = data.history || [];
        console.log(`    ✅ ${history.length} items in history array`);

        if (history.length > 0) {
          const sampleItem = history[0];
          console.log('    Sample item:', {
            name: sampleItem.name,
            hasPrices: !!sampleItem.prices,
            pricesCount: sampleItem.prices?.length || 0,
            frequency: sampleItem.frequency
          });
        }
      } else {
        console.log('    ❌ List does not exist');
      }
    } catch (error) {
      console.error(`    ❌ Error:`, error);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ Data check complete!');
}

// Make available globally
if (typeof window !== 'undefined') {
  (window as any).checkAllDataSources = checkAllDataSources;
}
