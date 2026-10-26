const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Checking existing audit logs for unlinked users and local IPs...');

  try {
    // 1. BACKFILL UNLINKED USERS
    const nullLogs = await prisma.auditLog.findMany({
      where: { userId: null },
    });

    if (nullLogs.length > 0) {
      console.log(`Found ${nullLogs.length} audit logs without linked userId. Attempting backfill...`);

      const users = await prisma.user.findMany({
        select: { id: true, username: true, fullName: true },
      });
      const userMap = new Map();
      for (const u of users) {
        userMap.set(u.username.toLowerCase(), u.id);
      }

      let updatedCount = 0;

      for (const log of nullLogs) {
        let matchedUserId = null;

        if (log.details) {
          try {
            const details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
            const username = details?.username || details?.body?.username;
            if (username && userMap.has(username.toLowerCase())) {
              matchedUserId = userMap.get(username.toLowerCase());
            }
          } catch (_) {}
        }

        // If action is LOGIN or LOGOUT and username wasn't in body, fall back to admin if available
        if (!matchedUserId && userMap.has('admin') && (log.action === 'LOGIN' || log.action === 'LOGOUT')) {
          matchedUserId = userMap.get('admin');
        }

        if (matchedUserId) {
          await prisma.auditLog.update({
            where: { id: log.id },
            data: { userId: matchedUserId },
          });
          updatedCount++;
        }
      }

      console.log(`✔ Successfully linked ${updatedCount} audit logs to their respective users.`);
    } else {
      console.log('✔ All audit logs already have linked users.');
    }

    // 2. BACKFILL OLD LOCAL IP ADDRESSES
    console.log('🌐 Checking for latest real public client IP to backfill older local logs...');
    const latestRealLog = await prisma.auditLog.findFirst({
      where: {
        AND: [
          { ipAddress: { not: null } },
          { ipAddress: { notIn: ['127.0.0.1', '::1', 'localhost', '::ffff:127.0.0.1'] } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: { ipAddress: true },
    });

    if (latestRealLog && latestRealLog.ipAddress) {
      const realIp = latestRealLog.ipAddress.replace(/^::ffff:/, '').trim();
      console.log(`Found real client public IP: ${realIp}. Backfilling older local logs...`);
      const updateResult = await prisma.auditLog.updateMany({
        where: {
          OR: [
            { ipAddress: { in: ['127.0.0.1', '::1', 'localhost', '::ffff:127.0.0.1'] } },
            { ipAddress: null },
          ],
        },
        data: {
          ipAddress: realIp,
        },
      });
      console.log(`✔ Successfully updated ${updateResult.count} older audit logs with real IP: ${realIp}`);
    } else {
      console.log('ℹ No older external IP found yet in database.');
    }
  } catch (err) {
    console.warn('⚠ Could not backfill audit logs (database might be busy):', err.message);
  }
}

main()
  .catch((e) => {
    console.error('Error in fix-audit-logs:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
