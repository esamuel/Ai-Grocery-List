/**
 * Script to fix missing ownerId/members fields in existing grocery lists
 * Run with: node fix-list-permissions.js
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixListPermissions() {
  console.log('🔍 Checking for lists without proper ownership fields...');

  try {
    // Get all users
    const usersSnapshot = await getDocs(collection(db, 'users'));
    console.log(`Found ${usersSnapshot.size} users`);

    let fixed = 0;
    let skipped = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      const userEmail = userData.email || 'unknown';

      console.log(`\n👤 Checking user: ${userEmail} (${userId})`);

      // Check if user has a main list
      if (userData.mainListId) {
        const listId = userData.mainListId;
        console.log(`  📋 Main list: ${listId}`);

        try {
          const listRef = doc(db, 'groceryLists', listId);
          const listDoc = await getDoc(listRef);

          if (listDoc.exists()) {
            const listData = listDoc.data();

            // Check if ownerId and members are missing
            if (!listData.ownerId && !listData.members) {
              console.log(`  ⚠️  Missing ownership fields! Fixing...`);

              await updateDoc(listRef, {
                ownerId: userId,
                members: [userId],
                updatedAt: new Date().toISOString()
              });

              console.log(`  ✅ Fixed list ${listId}`);
              fixed++;
            } else {
              console.log(`  ✓ List already has ownership fields`);
              skipped++;
            }
          } else {
            console.log(`  ⚠️  List ${listId} not found`);
          }
        } catch (err) {
          console.error(`  ❌ Error checking list ${listId}:`, err.message);
        }
      }

      // Check if user has a shared list
      if (userData.sharedListId) {
        const listId = userData.sharedListId;
        console.log(`  🔗 Shared list: ${listId}`);

        try {
          const listRef = doc(db, 'groceryLists', listId);
          const listDoc = await getDoc(listRef);

          if (listDoc.exists()) {
            const listData = listDoc.data();

            // Check if this user is in members array
            const members = listData.members || [];
            if (!members.includes(userId)) {
              console.log(`  ⚠️  User not in members array! Adding...`);

              await updateDoc(listRef, {
                members: [...members, userId],
                updatedAt: new Date().toISOString()
              });

              console.log(`  ✅ Added user to members of list ${listId}`);
              fixed++;
            } else {
              console.log(`  ✓ User already in members array`);
              skipped++;
            }
          } else {
            console.log(`  ⚠️  Shared list ${listId} not found`);
          }
        } catch (err) {
          console.error(`  ❌ Error checking shared list ${listId}:`, err.message);
        }
      }
    }

    console.log(`\n✅ Done! Fixed: ${fixed}, Skipped: ${skipped}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixListPermissions();
