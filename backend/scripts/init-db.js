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
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    console.error('Database initialization failed. No data-loss override was used.');
    process.exitCode = error.status || 1;
  }
}

main();
