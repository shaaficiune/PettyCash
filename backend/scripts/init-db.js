const { execSync } = require('child_process');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required. Create the database before applying the Prisma schema.');
  process.exit(1);
}

async function main() {
  try {
    // Refuse destructive schema changes. Review and migrate them explicitly instead.
    execSync('npx prisma db push', { stdio: 'inherit' });

    // Previous releases stored signed refresh JWTs as plaintext. New releases
    // store hashes, so revoke the legacy JWT-shaped rows during deployment.
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    try {
      const count = await prisma.$executeRawUnsafe(
        'DELETE FROM "RefreshToken" WHERE "token" LIKE \'%.%.%\'',
      );
      console.log(`Revoked ${count} legacy plaintext refresh session(s).`);

      // Ensure all standard system roles exist in the Role table
      const systemRoles = [
        { name: 'SUPER_ADMIN', description: 'Super administrator with access to all modules and configurations.' },
        { name: 'ACCOUNTANT', description: 'Accountant responsible for reviewing and paying petty cash requests.' },
        { name: 'EMPLOYEE', description: 'General employee who can create petty cash requests and settle expenses.' },
        { name: 'APPROVAL_TWO', description: 'Head of Finance / Authorized Approver. Performs Stage 2 final approval of petty cash requests. Cannot record cash disbursements (Separation of Duties).' },
      ];
      for (const r of systemRoles) {
        await prisma.role.upsert({
          where: { name: r.name },
          update: {},
          create: r,
        });
      }
      console.log('Ensured all system roles (including APPROVAL_TWO) exist in the Role database table.');
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    console.error('Database initialization failed. No data-loss override was used.');
    process.exitCode = error.status || 1;
  }
}

main();
