/**
 * Migration service to fix existing grocery lists that don't have
 * ownerId and members fields
 */

import { getApp } from 'firebase/app';
import { getFirestore as getFirestoreLite } from 'firebase/firestore/lite';
import { doc as docLite, getDoc as getDocLite, setDoc as setDocLite } from 'firebase/firestore/lite';

const listsCollection = 'groceryLists';

// Get Firebase Firestore instance
const getFirebaseDb = () => {
  try {
    const app = getApp();
    return getFirestoreLite(app);
  } catch (error) {
    console.error('Firebase not initialized:', error);
    throw new Error('Firebase must be initialized before using list migration');
  }
};

/**
 * Migrate a list to add ownerId and members fields if missing
 */
export const migrateListOwnershipFields = async (listId: string, userId: string): Promise<boolean> => {
  try {
    console.log(`🔄 Migrating list ${listId} for user ${userId}`);
    const dbLite = getFirebaseDb();
    
    const listDocRef = docLite(dbLite, listsCollection, listId);
    const listDoc = await getDocLite(listDocRef);
    
    if (!listDoc.exists()) {
      console.error('List does not exist');
      return false;
    }
    
    const listData = listDoc.data();
    
    // Check if migration is needed
    const needsOwner = !listData.ownerId && !listData.owner;
    const needsMembers = !listData.members || listData.members.length === 0;
    
    if (!needsOwner && !needsMembers) {
      console.log('✅ List already has ownership fields');
      return true;
    }
    
    // Perform migration
    const updates: any = {
      ...listData,
      updatedAt: new Date().toISOString()
    };
    
    if (needsOwner) {
      updates.ownerId = userId;
      console.log('➕ Adding ownerId field');
    }
    
    if (needsMembers) {
      updates.members = [userId];
      console.log('➕ Adding members array');
    }
    
    await setDocLite(listDocRef, updates);
    console.log('✅ List migration completed successfully');
    
    return true;
  } catch (error) {
    console.error('❌ Error migrating list:', error);
    return false;
  }
};

/**
 * Check if a list needs migration
 */
export const checkListNeedsMigration = async (listId: string): Promise<boolean> => {
  try {
    const dbLite = getFirebaseDb();
    const listDocRef = docLite(dbLite, listsCollection, listId);
    const listDoc = await getDocLite(listDocRef);
    
    if (!listDoc.exists()) {
      return false;
    }
    
    const listData = listDoc.data();
    const needsOwner = !listData.ownerId && !listData.owner;
    const needsMembers = !listData.members || listData.members.length === 0;
    
    return needsOwner || needsMembers;
  } catch (error) {
    console.error('Error checking migration status:', error);
    return false;
  }
};

