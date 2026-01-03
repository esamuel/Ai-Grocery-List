/**
 * Utility script to dump purchase history items with price 12.00
 * Usage: npm run list-placeholders -- --list=WPEH3I
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

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

const args = process.argv.slice(2);
const listArg = args.find(arg => arg.startsWith('--list='));
if (!listArg) {
  console.error('Usage: npm run list-placeholders -- --list=LIST_ID');
  process.exit(1);
}
const listId = listArg.split('=')[1];

async function main() {
  const listRef = doc(db, 'groceryLists', listId);
  const snap = await getDoc(listRef);
  if (!snap.exists()) {
    throw new Error(`List ${listId} not found`);
  }
  const data = snap.data();
  const history = data.history || [];
  console.log(`Total history items: ${history.length}`);

  const placeholders = history.filter((item: any) => {
    const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
    return price === 12 || price === 12.0 || price === '12.00';
  });

  console.log(`Found ${placeholders.length} items with price 12`);
  placeholders.forEach((item: any, idx: number) => {
    console.log(
      `${idx + 1}. name=${item.name}, price=${item.price} (${typeof item.price}), date=${item.purchaseDate}, store=${item.storeName}`
    );
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});


