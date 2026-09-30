const path = require('path');
const dotenv = require('dotenv');

// Try loading from backend/.env or parent .env
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const targetPassword = process.argv[2];
  if (!targetPassword) {
    console.log('Usage: node reset-admin-password.js "YourNewPassword"');
    console.log('No password provided. Only checking and unlocking admin account...');
  }

  const admin = await prisma.user.findUnique({
    where: { username: 'admin' },
    include: { role: true },
  });

  if (!admin) {
    console.error('❌ User "admin" not found in database!');
    process.exit(1);
  }

  console.log(`Found user: ${admin.username} (${admin.fullName || 'No name'}), Role: ${admin.role?.name}`);

  const updateData = {
    status: 'ACTIVE',
    failedLoginAttempts: 0,
    lockoutUntil: null,
    lockoutStage: 0,
    resetPasswordRequired: false,
  };

  if (targetPassword) {
    updateData.passwordHash = await bcrypt.hash(targetPassword, 10);
    console.log(`Hashing and setting new password...`);
  }

  const updated = await prisma.user.update({
    where: { username: 'admin' },
    data: updateData,
  });

  console.log(`✅ SUCCESS: Admin account is now ACTIVE.`);
  if (targetPassword) {
    console.log(`✅ Password has been updated to the one you specified.`);
  }
  console.log(`All lockout flags have been cleared.`);
}

main()
  .catch((err) => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
