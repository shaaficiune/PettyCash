/**
 * clean-production-data.js
 * ========================
 * Clears ALL transactional/training data from the database.
 * Keeps: Users, Regions, Budget Heads, Companies, Departments,
 *        Roles, Permissions, Projects, System Settings.
 *
 * Run on server: node scripts/clean-production-data.js
 *
 * Cutoff: Deletes everything created BEFORE 2026-10-04
 *         (i.e. all test/training data)
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Cutoff: delete records created before October 4, 2026
const CUTOFF_DATE = new Date('2026-10-04T00:00:00.000Z');

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║       PETTY CASH — PRODUCTION DATA CLEANUP           ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Cutoff date : ${CUTOFF_DATE.toISOString()}`);
  console.log('Deleting    : Requests, Payments, Settlements, Funds,');
  console.log('              Ledgers, Attachments, Notifications,');
  console.log('              Audit Logs, Refresh Tokens');
  console.log('Keeping     : Users, Regions, Budget Heads, Companies,');
  console.log('              Departments, Roles, Permissions, Settings');
  console.log('');

  // Step 1: Count records before deletion
  const counts = {
    attachments:   await prisma.pettyCashAttachment.count(),
    settlements:   await prisma.expenseSettlement.count(),
    payments:      await prisma.payment.count(),
    ledgers:       await prisma.pettyCashLedger.count(),
    requests:      await prisma.pettyCashRequest.count(),
    funds:         await prisma.pettyCashFund.count(),
    notifications: await prisma.notification.count(),
    auditLogs:     await prisma.auditLog.count(),
    refreshTokens: await prisma.refreshToken.count(),
  };

  console.log('Records found (before deletion):');
  Object.entries(counts).forEach(([table, count]) => {
    console.log(`   ${table.padEnd(16)}: ${count}`);
  });
  console.log('');

  if (Object.values(counts).every(c => c === 0)) {
    console.log('Database is already clean. Nothing to delete.');
    return;
  }

  console.log('Starting deletion (order respects foreign keys)...');
  console.log('');

  // Step 2: Delete in correct FK order

  // 1. Attachments (FK -> PettyCashRequest)
  const d1 = await prisma.pettyCashAttachment.deleteMany({
    where: { request: { createdAt: { lt: CUTOFF_DATE } } },
  });
  console.log(`   Attachments deleted    : ${d1.count}`);

  // 2. Settlements (FK -> PettyCashRequest)
  const d2 = await prisma.expenseSettlement.deleteMany({
    where: { createdAt: { lt: CUTOFF_DATE } },
  });
  console.log(`   Settlements deleted    : ${d2.count}`);

  // 3. Payments (FK -> PettyCashRequest)
  const d3 = await prisma.payment.deleteMany({
    where: { createdAt: { lt: CUTOFF_DATE } },
  });
  console.log(`   Payments deleted       : ${d3.count}`);

  // 4. Ledger entries (FK -> PettyCashRequest, PettyCashFund)
  const d4 = await prisma.pettyCashLedger.deleteMany({
    where: { createdAt: { lt: CUTOFF_DATE } },
  });
  console.log(`   Ledger entries deleted : ${d4.count}`);

  // 5. Requests (FK -> User, Company, Department, Region, BudgetHead)
  const d5 = await prisma.pettyCashRequest.deleteMany({
    where: { createdAt: { lt: CUTOFF_DATE } },
  });
  console.log(`   Requests deleted       : ${d5.count}`);

  // 6. Petty Cash Funds (FK -> Company)
  const d6 = await prisma.pettyCashFund.deleteMany({
    where: { createdAt: { lt: CUTOFF_DATE } },
  });
  console.log(`   Funds deleted          : ${d6.count}`);

  // 7. Notifications (FK -> User)
  const d7 = await prisma.notification.deleteMany({
    where: { createdAt: { lt: CUTOFF_DATE } },
  });
  console.log(`   Notifications deleted  : ${d7.count}`);

  // 8. Audit Logs (FK -> User, nullable)
  const d8 = await prisma.auditLog.deleteMany({
    where: { createdAt: { lt: CUTOFF_DATE } },
  });
  console.log(`   Audit logs deleted     : ${d8.count}`);

  // 9. Refresh Tokens — clear ALL sessions (force re-login for everyone)
  const d9 = await prisma.refreshToken.deleteMany({});
  console.log(`   Refresh tokens cleared : ${d9.count} (all sessions invalidated)`);

  // Step 3: Verify what remains
  console.log('');
  console.log('Deletion complete. Verifying remaining data...');
  console.log('');

  const remaining = {
    companies:   await prisma.company.count(),
    users:       await prisma.user.count(),
    regions:     await prisma.region.count(),
    budgetHeads: await prisma.budgetHead.count(),
    departments: await prisma.department.count(),
    projects:    await prisma.project.count(),
    roles:       await prisma.role.count(),
    settings:    await prisma.systemSetting.count(),
  };

  console.log('Data KEPT (reference tables):');
  Object.entries(remaining).forEach(([table, count]) => {
    const icon = count > 0 ? '[OK]' : '[!!]';
    console.log(`   ${icon} ${table.padEnd(14)}: ${count}`);
  });

  const cleared = {
    requests: await prisma.pettyCashRequest.count(),
    funds:    await prisma.pettyCashFund.count(),
    ledgers:  await prisma.pettyCashLedger.count(),
  };

  console.log('');
  console.log('Transactional tables (should all be 0):');
  Object.entries(cleared).forEach(([table, count]) => {
    const icon = count === 0 ? '[OK]' : '[FAIL]';
    console.log(`   ${icon} ${table.padEnd(14)}: ${count}`);
  });

  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   System is clean and ready for October 2026!        ║');
  console.log('║   Next step: Accountant should initialize Oct fund.  ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');
  console.log('NOTE: All active sessions have been invalidated.');
  console.log('      All users must log in again.');
  console.log('');
}

main()
  .catch((e) => {
    console.error('');
    console.error('ERROR during cleanup:', e.message);
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
