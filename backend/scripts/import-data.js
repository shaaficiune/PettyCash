/**
 * import-data.js — Import JSON data files into the server database
 * Run on the SERVER after setup.sh:
 *   node scripts/import-data.js
 *
 * Import order respects FK dependencies.
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const DATA_DIR = path.join(__dirname, 'data');

function readJSON(name) {
  const filePath = path.join(DATA_DIR, `${name}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function fixDates(records) {
  return records.map(r => {
    const fixed = { ...r };
    for (const [k, v] of Object.entries(fixed)) {
      if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
        fixed[k] = new Date(v);
      }
    }
    return fixed;
  });
}

async function importTable(modelName, data, upsertKey = 'id') {
  if (!data || data.length === 0) {
    console.log(`  ⏭️  ${modelName}: no data`);
    return;
  }

  const records = fixDates(data);
  let count = 0;
  for (const record of records) {
    try {
      await prisma[modelName].upsert({
        where: { [upsertKey]: record[upsertKey] },
        update: record,
        create: record,
      });
      count++;
    } catch (err) {
      console.log(`  ⚠️  ${modelName} [${record[upsertKey]}]: ${err.message}`);
    }
  }
  console.log(`  ✅ ${modelName}: ${count}/${records.length} records imported`);
}

async function main() {
  console.log('');
  console.log('==============================================');
  console.log('📥 PETTY CASH — DATA IMPORT');
  console.log('==============================================');
  console.log('');

  // Import in FK-safe order:
  // 1. Reference tables first
  await importTable('company',    readJSON('company'),    'id');
  await importTable('role',       readJSON('role'),       'id');
  await importTable('department', readJSON('department'), 'id');

  // 2. Region (may not exist in older versions)
  const regions = readJSON('region');
  if (regions) await importTable('region', regions, 'id');

  // 3. Users
  await importTable('user', readJSON('user'), 'id');

  // 4. Projects & Budget Heads
  const projects = readJSON('project');
  if (projects) await importTable('project', projects, 'id');
  const budgetHeads = readJSON('budgetHead');
  if (budgetHeads) await importTable('budgetHead', budgetHeads, 'id');

  // 5. Funds
  const funds = readJSON('pettyCashFund');
  if (funds) {
    for (const record of fixDates(funds)) {
      try {
        await prisma.pettyCashFund.upsert({
          where: { id: record.id },
          update: record,
          create: record,
        });
      } catch (err) {
        console.log(`  ⚠️  pettyCashFund [${record.id}]: ${err.message}`);
      }
    }
    console.log(`  ✅ pettyCashFund: ${funds.length} records imported`);
  }

  // 6. Requests
  await importTable('pettyCashRequest', readJSON('pettyCashRequest'), 'id');

  // 7. Attachments
  await importTable('pettyCashAttachment', readJSON('pettyCashAttachment'), 'id');

  // 8. Payments
  await importTable('payment', readJSON('payment'), 'id');

  // 9. Settlements
  const settlements = readJSON('settlement');
  if (settlements) await importTable('settlement', settlements, 'id');

  // 10. Ledger
  const ledger = readJSON('pettyCashLedger');
  if (ledger) await importTable('pettyCashLedger', ledger, 'id');

  // 11. Notifications
  await importTable('notification', readJSON('notification'), 'id');

  // Skip refreshToken — sessions not needed on new server

  console.log('');
  console.log('==============================================');
  console.log('✅ DATA IMPORT COMPLETE!');
  console.log('==============================================');
  console.log('');
  console.log('Next steps:');
  console.log('  pm2 restart petty-cash-backend');
}

main()
  .catch(err => {
    console.error('❌ Import failed:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
