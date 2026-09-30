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
    // Never export password hashes or session/lockout data.
    { name: 'user',            fn: () => prisma.user.findMany({
      select: {
        id: true, fullName: true, username: true, email: true, phone: true, jobTitle: true,
        companyId: true, departmentId: true, regionId: true, roleId: true, status: true,
        createdAt: true, updatedAt: true,
      },
    }).then(users => users.map(user => ({ ...user, resetPasswordRequired: true }))) },
    { name: 'project',         fn: () => (prisma).project?.findMany?.() },
    { name: 'budgetHead',      fn: () => (prisma).budgetHead?.findMany?.() },
    { name: 'pettyCashFund',   fn: () => (prisma).pettyCashFund.findMany() },
    { name: 'pettyCashRequest',fn: () => prisma.pettyCashRequest.findMany() },
    { name: 'pettyCashAttachment', fn: () => prisma.pettyCashAttachment.findMany() },
    { name: 'payment',         fn: () => prisma.payment.findMany() },
    { name: 'settlement',      fn: () => (prisma).settlement?.findMany?.() },
    { name: 'pettyCashLedger', fn: () => (prisma).pettyCashLedger?.findMany?.() },
    { name: 'notification',    fn: () => prisma.notification.findMany() },
  ];

  let totalRecords = 0;

  // Remove stale session exports left by older versions of this script.
  const oldRefreshTokenFile = path.join(OUTPUT_DIR, 'refreshToken.json');
  if (fs.existsSync(oldRefreshTokenFile)) fs.unlinkSync(oldRefreshTokenFile);

  for (const table of tables) {
    try {
      const data = await table.fn();
      if (data && data.length > 0) {
        const filePath = path.join(OUTPUT_DIR, `${table.name}.json`);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        try { fs.chmodSync(filePath, 0o600); } catch { /* Windows uses inherited ACLs. */ }
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
  console.log('Store the exported records securely. Never commit or share these files.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
