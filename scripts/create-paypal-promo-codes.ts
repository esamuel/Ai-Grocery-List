/**
 * Script to create promo codes in Firestore for PayPal subscriptions
 * Run with: npx tsx scripts/create-paypal-promo-codes.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, Timestamp } from 'firebase/firestore';

// Firebase config (same as your app)
const firebaseConfig = {
  apiKey: "AIzaSyCqSv-CKJqITLqWcJvHKZ0Gg3yNRpZJTOo",
  authDomain: "grocery-list-ai-1e7a5.firebaseapp.com",
  projectId: "grocery-list-ai-1e7a5",
  storageBucket: "grocery-list-ai-1e7a5.firebasestorage.app",
  messagingSenderId: "1077031234571",
  appId: "1:1077031234571:web:e1e8b8eea1c8b6f0e5e5e5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface PromoCode {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  duration: number;
  maxUses: number | null;
  currentUses: number;
  active: boolean;
  createdAt: any;
  expiresAt: any;
  description: string;
}

const promoCodes: PromoCode[] = [
  // Beta Tester Codes (100% off for 1 month)
  {
    code: 'BETA2025',
    type: 'percentage',
    value: 100,
    duration: 1,
    maxUses: 50,
    currentUses: 0,
    active: true,
    createdAt: Timestamp.now(),
    expiresAt: null,
    description: 'Beta tester - 100% off first month'
  },
  {
    code: 'EARLYADOPTER',
    type: 'percentage',
    value: 100,
    duration: 1,
    maxUses: 100,
    currentUses: 0,
    active: true,
    createdAt: Timestamp.now(),
    expiresAt: null,
    description: 'Early adopter - 100% off first month'
  },
  {
    code: 'TESTDRIVE',
    type: 'percentage',
    value: 100,
    duration: 1,
    maxUses: 25,
    currentUses: 0,
    active: true,
    createdAt: Timestamp.now(),
    expiresAt: null,
    description: 'Test drive - 100% off first month'
  },

  // Launch Codes (50% off for 3 months)
  {
    code: 'LAUNCH50',
    type: 'percentage',
    value: 50,
    duration: 3,
    maxUses: 200,
    currentUses: 0,
    active: true,
    createdAt: Timestamp.now(),
    expiresAt: null,
    description: 'Launch special - 50% off for 3 months'
  },
  {
    code: 'NEWYEAR2026',
    type: 'percentage',
    value: 50,
    duration: 3,
    maxUses: 500,
    currentUses: 0,
    active: true,
    createdAt: Timestamp.now(),
    expiresAt: null,
    description: 'New Year 2026 - 50% off for 3 months'
  },
  {
    code: 'WELCOME50',
    type: 'percentage',
    value: 50,
    duration: 3,
    maxUses: null, // unlimited
    currentUses: 0,
    active: true,
    createdAt: Timestamp.now(),
    expiresAt: null,
    description: 'Welcome offer - 50% off for 3 months'
  },

  // Referral Codes ($5 off)
  {
    code: 'FRIEND5',
    type: 'fixed',
    value: 5,
    duration: 1,
    maxUses: null, // unlimited
    currentUses: 0,
    active: true,
    createdAt: Timestamp.now(),
    expiresAt: null,
    description: 'Friend referral - $5 off first month'
  },
  {
    code: 'FAMILY5',
    type: 'fixed',
    value: 5,
    duration: 1,
    maxUses: null, // unlimited
    currentUses: 0,
    active: true,
    createdAt: Timestamp.now(),
    expiresAt: null,
    description: 'Family referral - $5 off first month'
  },

  // Social Media Codes (50% off for 3 months)
  {
    code: 'INSTAGRAM50',
    type: 'percentage',
    value: 50,
    duration: 3,
    maxUses: 100,
    currentUses: 0,
    active: true,
    createdAt: Timestamp.now(),
    expiresAt: null,
    description: 'Instagram followers - 50% off for 3 months'
  },
  {
    code: 'FACEBOOK50',
    type: 'percentage',
    value: 50,
    duration: 3,
    maxUses: 100,
    currentUses: 0,
    active: true,
    createdAt: Timestamp.now(),
    expiresAt: null,
    description: 'Facebook community - 50% off for 3 months'
  },

  // VIP Codes (100% off for 6 months)
  {
    code: 'VIP-INFLUENCER',
    type: 'percentage',
    value: 100,
    duration: 6,
    maxUses: 10,
    currentUses: 0,
    active: true,
    createdAt: Timestamp.now(),
    expiresAt: null,
    description: 'VIP Influencer - 100% off for 6 months'
  },
  {
    code: 'PRESS-REVIEW',
    type: 'percentage',
    value: 100,
    duration: 6,
    maxUses: 5,
    currentUses: 0,
    active: true,
    createdAt: Timestamp.now(),
    expiresAt: null,
    description: 'Press/Media review - 100% off for 6 months'
  }
];

async function createPromoCodes() {
  console.log('🎁 Creating PayPal Promo Codes in Firestore...');
  console.log('═══════════════════════════════════════════════\n');

  let successCount = 0;
  let errorCount = 0;

  for (const promo of promoCodes) {
    try {
      const promoRef = doc(db, 'promoCodes', promo.code);
      await setDoc(promoRef, promo);
      
      const usageText = promo.maxUses === null ? 'unlimited' : `${promo.maxUses} uses`;
      const discountText = promo.type === 'percentage' 
        ? `${promo.value}% off` 
        : `$${promo.value} off`;
      
      console.log(`✅ ${promo.code.padEnd(20)} - ${discountText.padEnd(12)} for ${promo.duration} month(s) (${usageText})`);
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to create ${promo.code}:`, error);
      errorCount++;
    }
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log(`🎉 Created ${successCount} promo codes successfully!`);
  if (errorCount > 0) {
    console.log(`⚠️  ${errorCount} codes failed to create`);
  }

  console.log('\n📋 Summary by Type:');
  console.log('───────────────────────────────────────────────');
  console.log('Beta Testers (100% off, 1 month):');
  console.log('  • BETA2025 (50 uses)');
  console.log('  • EARLYADOPTER (100 uses)');
  console.log('  • TESTDRIVE (25 uses)');
  console.log('');
  console.log('Launch Special (50% off, 3 months):');
  console.log('  • LAUNCH50 (200 uses)');
  console.log('  • NEWYEAR2026 (500 uses)');
  console.log('  • WELCOME50 (unlimited)');
  console.log('');
  console.log('Referrals ($5 off, 1 month):');
  console.log('  • FRIEND5 (unlimited)');
  console.log('  • FAMILY5 (unlimited)');
  console.log('');
  console.log('Social Media (50% off, 3 months):');
  console.log('  • INSTAGRAM50 (100 uses)');
  console.log('  • FACEBOOK50 (100 uses)');
  console.log('');
  console.log('VIP (100% off, 6 months):');
  console.log('  • VIP-INFLUENCER (10 uses)');
  console.log('  • PRESS-REVIEW (5 uses)');
  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('\n✨ Promo codes are ready to use!');
  console.log('📊 View in Firebase Console:');
  console.log('   https://console.firebase.google.com/project/grocery-list-ai-1e7a5/firestore/data/promoCodes');
  console.log('');
}

// Run the script
createPromoCodes()
  .then(() => {
    console.log('✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

