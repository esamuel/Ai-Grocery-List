/**
 * Compare purchase history across multiple groceryLists documents.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
 *   node scripts/compare-grocery-lists.mjs WPEH3I RCNZMG QM94NW J339F4
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!credPath) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to your Firebase service account JSON path.');
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(credPath, 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const listIds = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['WPEH3I', 'RCNZMG', 'QM94NW', 'J339F4'];

function parseDate(raw) {
  if (!raw) return null;
  const d = raw.toDate ? raw.toDate() : new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function analyzeList(listId, data) {
  const history = data.history || [];
  const months = new Set();
  const days = new Set();
  let priceEntries = 0;
  let oldest = null;
  let newest = null;

  history.forEach((item) => {
    for (const field of [item.firstPurchased, item.lastPurchased, item.lastAdded]) {
      const d = parseDate(field);
      if (d) {
        months.add(monthKey(d));
        if (!oldest || d < oldest) oldest = d;
        if (!newest || d > newest) newest = d;
      }
    }
    (item.prices || []).forEach((p) => {
      priceEntries++;
      const d = parseDate(p.purchaseDate);
      if (!d) return;
      months.add(monthKey(d));
      days.add(d.toISOString().split('T')[0]);
      if (!oldest || d < oldest) oldest = d;
      if (!newest || d > newest) newest = d;
    });
  });

  return {
    listId,
    exists: true,
    owner: data.ownerId || data.owner || '—',
    members: (data.members || []).length,
    historyItems: history.length,
    priceEntries,
    uniqueMonths: [...months].sort().reverse(),
    uniqueDays: days.size,
    oldest: oldest ? oldest.toISOString().split('T')[0] : '—',
    newest: newest ? newest.toISOString().split('T')[0] : '—',
    createdAt: data.createdAt || '—',
  };
}

async function main() {
  console.log('\n📊 GROCERY LIST COMPARISON\n');
  console.log('━'.repeat(90));

  const reports = [];

  for (const listId of listIds) {
    const snap = await db.collection('groceryLists').doc(listId).get();
    if (!snap.exists) {
      console.log(`\n❌ ${listId} — document does not exist`);
      reports.push({ listId, exists: false });
      continue;
    }
    const report = analyzeList(listId, snap.data());
    reports.push(report);

    console.log(`\n📋 ${listId}`);
    console.log(`   Owner: ${report.owner}`);
    console.log(`   Created: ${report.createdAt}`);
    console.log(`   History items: ${report.historyItems}`);
    console.log(`   Price entries: ${report.priceEntries}`);
    console.log(`   Months (${report.uniqueMonths.length}): ${report.uniqueMonths.join(', ') || '—'}`);
    console.log(`   Shopping days: ${report.uniqueDays}`);
    console.log(`   Date range: ${report.oldest} → ${report.newest}`);
  }

  const withData = reports.filter((r) => r.exists && r.historyItems > 0);
  withData.sort((a, b) => b.uniqueMonths.length - a.uniqueMonths.length);

  console.log('\n' + '━'.repeat(90));
  console.log('\n🏆 RANKING (most months first):\n');
  withData.forEach((r, i) => {
    console.log(
      `   ${i + 1}. ${r.listId} — ${r.uniqueMonths.length} months, ${r.historyItems} items, ${r.priceEntries} price rows`
    );
  });

  const best = withData[0];
  const current = reports.find((r) => r.listId === 'WPEH3I');

  console.log('\n💡 CONCLUSION:');
  if (!best) {
    console.log('   No lists with history data found.');
  } else if (best.listId === 'WPEH3I') {
    console.log('   WPEH3I has the most data. Old months are NOT on other lists.');
    console.log('   If WPEH3I only has 2 months, older shopping was never saved with dates.');
  } else {
    console.log(`   ⚠️ List "${best.listId}" has MORE history than WPEH3I!`);
    console.log(`   WPEH3I: ${current?.uniqueMonths?.length || 0} months | ${best.listId}: ${best.uniqueMonths.length} months`);
    console.log(`\n   → Merge into WPEH3I: use mergeHistoricalLists in the app or ask dev to run merge.`);
    console.log(`   Months on ${best.listId}: ${best.uniqueMonths.join(', ')}`);
  }

  console.log('\n');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
