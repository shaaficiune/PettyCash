const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const newPassword = process.argv[2];

  const admin = await prisma.user.findUnique({
    where: { username: 'admin' },
  });

  if (!admin) {
    console.error('Admin user not found in database!');
    process.exit(1);
  }

  const updateData = {
    status: 'ACTIVE',
    failedLoginAttempts: 0,
    lockoutUntil: null,
    lockoutStage: 0,
    resetPasswordRequired: false,
  };

  if (newPassword) {
    updateData.passwordHash = await bcrypt.hash(newPassword, 10);
    console.log(`Password for 'admin' has been reset.`);
  }

  await prisma.user.update({
    where: { username: 'admin' },
    data: updateData,
  });

  console.log('Admin account is ACTIVE and all lockouts have been cleared.');
}

main()
  .catch((err) => {
    console.error('Error unlocking admin:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
