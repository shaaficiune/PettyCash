#!/usr/bin/env bash
# Safe login diagnostics. This script never prints the database URL or resets
# passwords unless one username is explicitly selected and confirmed.
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$APP_DIR/backend"

if [[ ! -f "$BACKEND_DIR/.env" ]]; then
  echo "backend/.env is missing. Configure it from backend/.env.example first."
  exit 1
fi

if [[ ! -d "$BACKEND_DIR/node_modules" ]]; then
  echo "Backend dependencies are missing. Run npm install in backend first."
  exit 1
fi

if [[ "${1:-}" == "--reset-user" ]]; then
  USERNAME="${2:-}"
  if [[ -z "$USERNAME" ]]; then
    echo "Usage: bash fix-login.sh --reset-user USERNAME"
    exit 2
  fi
  read -r -p "Generate a one-time password for '$USERNAME'? [y/N] " CONFIRM
  if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
    echo "No password changed."
    exit 0
  fi

  cd "$BACKEND_DIR"
  node - "$USERNAME" <<'NODE'
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { randomBytes } = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const username = process.argv[2];
  const temporaryPassword = randomBytes(24).toString('base64url');
  await prisma.user.update({
    where: { username },
    data: {
      passwordHash: await bcrypt.hash(temporaryPassword, 12),
      status: 'ACTIVE',
      resetPasswordRequired: true,
      failedLoginAttempts: 0,
      lockoutUntil: null,
      lockoutStage: 0,
    },
  });
  console.log(`One-time password for ${username}: ${temporaryPassword}`);
  console.log('The user must change it at first login.');
}

main().catch((error) => {
  console.error('Could not reset that user. Check the username and database connection.');
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
NODE
  exit $?
fi

if [[ "${1:-}" != "" && "${1:-}" != "--diagnose" ]]; then
  echo "Usage: bash fix-login.sh [--diagnose | --reset-user USERNAME]"
  exit 2
fi

cd "$BACKEND_DIR"
node <<'NODE'
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const [total, disabled, pendingReset] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: 'DISABLED' } }),
    prisma.user.count({ where: { resetPasswordRequired: true } }),
  ]);
  console.log('Database connection: available');
  console.log(`User accounts: ${total}; disabled: ${disabled}; password reset required: ${pendingReset}`);
}

main().catch(() => {
  console.error('Database connection failed. Check backend/.env without sharing its contents.');
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
NODE

if command -v pm2 >/dev/null; then
  pm2 status petty-cash-backend
fi
