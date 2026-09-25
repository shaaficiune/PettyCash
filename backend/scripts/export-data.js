/**
 * export-data.js — Export all production data to JSON files
 * Run: node scripts/export-data.js
 * 
 * This creates JSON files in scripts/data/ that can be imported
 * on any server regardless of PostgreSQL version.
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const OUTPUT_DIR = path.join(__dirname, 'data');

async function main() {
  console.log('📦 Starting data export...\n');
  
  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const tables = [
    { name: 'company',         fn: () => prisma.company.findMany() },
    { name: 'role',            fn: () => prisma.role.findMany() },
    { name: 'department',      fn: () => prisma.department.findMany() },
    { name: 'region',          fn: () => (prisma).region.findMany() },
    { name: 'user',            fn: () => prisma.user.findMany() },
    { name: 'project',         fn: () => (prisma).project?.findMany?.() },
    { name: 'budgetHead',      fn: () => (prisma).budgetHead?.findMany?.() },
    { name: 'pettyCashFund',   fn: () => (prisma).pettyCashFund.findMany() },
    { name: 'pettyCashRequest',fn: () => prisma.pettyCashRequest.findMany() },
    { name: 'pettyCashAttachment', fn: () => prisma.pettyCashAttachment.findMany() },
    { name: 'payment',         fn: () => prisma.payment.findMany() },
    { name: 'settlement',      fn: () => (prisma).settlement?.findMany?.() },
    { name: 'pettyCashLedger', fn: () => (prisma).pettyCashLedger?.findMany?.() },
    { name: 'notification',    fn: () => prisma.notification.findMany() },
    { name: 'refreshToken',    fn: () => prisma.refreshToken.findMany() },
  ];

  let totalRecords = 0;

  for (const table of tables) {
    try {
      const data = await table.fn();
      if (data && data.length > 0) {
        const filePath = path.join(OUTPUT_DIR, `${table.name}.json`);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`  ✅ ${table.name}: ${data.length} records → ${table.name}.json`);
        totalRecords += data.length;
      } else {
        console.log(`  ⏭️  ${table.name}: empty / skipped`);
      }
    } catch (err) {
      console.log(`  ⚠️  ${table.name}: skipped (${err.message})`);
    }
  }

  console.log(`\n✅ Export complete! ${totalRecords} total records saved to scripts/data/`);
  console.log('📁 Files ready to be imported on the server.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
