import { PrismaClient, RoleName, Priority, RequestStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Companies
  const bluekom = await prisma.company.upsert({
    where: { name: 'Bluekom' },
    update: {},
    create: {
      name: 'Bluekom',
      status: 'ACTIVE',
    },
  });

  const somtel = await prisma.company.upsert({
    where: { name: 'Somtel' },
    update: {},
    create: {
      name: 'Somtel',
      status: 'ACTIVE',
    },
  });

  console.log('Companies seeded.');

  // 2. Create Roles
  const superAdminRole = await prisma.role.upsert({
    where: { name: RoleName.SUPER_ADMIN },
    update: {},
    create: {
      name: RoleName.SUPER_ADMIN,
      description: 'Super administrator with access to all modules and configurations.',
    },
  });

  const accountantRole = await prisma.role.upsert({
    where: { name: RoleName.ACCOUNTANT },
    update: {},
    create: {
      name: RoleName.ACCOUNTANT,
      description: 'Accountant responsible for reviewing and paying petty cash requests.',
    },
  });

  const employeeRole = await prisma.role.upsert({
    where: { name: RoleName.EMPLOYEE },
    update: {},
    create: {
      name: RoleName.EMPLOYEE,
      description: 'General employee who can create petty cash requests and settle expenses.',
    },
  });

  console.log('Roles seeded.');

  // 3. Create Permissions
  const permissionsList = [
    { action: 'manage', subject: 'all' },
    { action: 'read', subject: 'request' },
    { action: 'create', subject: 'request' },
    { action: 'update', subject: 'request' },
    { action: 'approve', subject: 'request' },
    { action: 'pay', subject: 'request' },
    { action: 'settle', subject: 'request' },
    { action: 'read', subject: 'report' },
    { action: 'manage', subject: 'user' },
  ];

  const dbPermissions = [];
  for (const perm of permissionsList) {
    const existing = await prisma.permission.findFirst({
      where: { action: perm.action, subject: perm.subject },
    });
    if (!existing) {
      const created = await prisma.permission.create({
        data: perm,
      });
      dbPermissions.push(created);
    } else {
      dbPermissions.push(existing);
    }
  }

  // Bind permissions to roles
  // Super Admin gets all permissions
  for (const perm of dbPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superAdminRole.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: superAdminRole.id,
        permissionId: perm.id,
      },
    });
  }

  // Accountant gets read, update, approve, pay, read report, settle permissions
  const accountantPerms = dbPermissions.filter(p => 
    ['read', 'update', 'approve', 'pay', 'settle'].includes(p.action) && p.subject === 'request' ||
    (p.action === 'read' && p.subject === 'report')
  );
  for (const perm of accountantPerms) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: accountantRole.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: accountantRole.id,
        permissionId: perm.id,
      },
    });
  }

  // Employee gets read, create, update request and settle permissions
  const employeePerms = dbPermissions.filter(p => 
    ['read', 'create', 'update', 'settle'].includes(p.action) && p.subject === 'request'
  );
  for (const perm of employeePerms) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: employeeRole.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: employeeRole.id,
        permissionId: perm.id,
      },
    });
  }

  console.log('Permissions seeded.');

  // 4. Create Departments
  const somtelFinance = await prisma.department.upsert({
    where: { name_companyId: { name: 'Finance', companyId: somtel.id } },
    update: {},
    create: { name: 'Finance', companyId: somtel.id },
  });

  const somtelNetwork = await prisma.department.upsert({
    where: { name_companyId: { name: 'Network Operations', companyId: somtel.id } },
    update: {},
    create: { name: 'Network Operations', companyId: somtel.id },
  });

  const bluekomFinance = await prisma.department.upsert({
    where: { name_companyId: { name: 'Finance', companyId: bluekom.id } },
    update: {},
    create: { name: 'Finance', companyId: bluekom.id },
  });

  const bluekomEngineering = await prisma.department.upsert({
    where: { name_companyId: { name: 'Engineering', companyId: bluekom.id } },
    update: {},
    create: { name: 'Engineering', companyId: bluekom.id },
  });

  console.log('Departments seeded.');

  // 5. Create Projects
  const somtelProject = await prisma.project.upsert({
    where: { name_companyId: { name: 'Somtel 5G Rollout', companyId: somtel.id } },
    update: {},
    create: {
      name: 'Somtel 5G Rollout',
      description: 'Expansion of 5G cellular coverage nationwide',
      companyId: somtel.id,
    },
  });

  const bluekomProject = await prisma.project.upsert({
    where: { name_companyId: { name: 'Fiber Expansion Project', companyId: bluekom.id } },
    update: {},
    create: {
      name: 'Fiber Expansion Project',
      description: 'Laying down metropolitan fiber lines',
      companyId: bluekom.id,
    },
  });

  console.log('Projects seeded.');

  // 6. Create Regions
  const regionsData = [
    { name: 'Banaadir (Mogadishu)', companyId: somtel.id },
    { name: 'Somaliland (Hargeisa)', companyId: somtel.id },
    { name: 'Puntland (Garowe)', companyId: somtel.id },
    { name: 'Jubbaland (Kismayo)', companyId: somtel.id },
    { name: 'HQ Region (Mogadishu)', companyId: bluekom.id },
    { name: 'Coastal Region', companyId: bluekom.id },
  ];

  for (const reg of regionsData) {
    await (prisma as any).region.upsert({
      where: { name_companyId: { name: reg.name, companyId: reg.companyId } },
      update: {},
      create: reg,
    });
  }
  console.log('Regions seeded.');

  // 7. Create Budget Heads
  const budgetHeadsData = [
    { code: 'BH-101', name: 'Tasliix', description: 'Tasliix expenses', monthlyLimit: 5000, companyId: somtel.id },
    { code: 'BH-102', name: 'Transportation', description: 'Local transportation and travel', monthlyLimit: 5000, companyId: somtel.id },
    { code: 'BH-103', name: 'Repair of Vehicles', description: 'Vehicle maintenance and repairs', monthlyLimit: 5000, companyId: somtel.id },
    { code: 'BH-104', name: 'Repair of Buildings', description: 'Building and facility maintenance', monthlyLimit: 5000, companyId: somtel.id },
    { code: 'BH-105', name: 'Repair of Generators', description: 'Generator maintenance and repairs', monthlyLimit: 5000, companyId: somtel.id },
    { code: 'BH-106', name: 'Refreshment', description: 'Refreshments, meetings and hospitality', monthlyLimit: 3000, companyId: somtel.id },
    { code: 'BH-107', name: 'Miscellaneous expenses', description: 'Other general and miscellaneous expenses', monthlyLimit: 3000, companyId: somtel.id },

    { code: 'BH-201', name: 'Tasliix', description: 'Tasliix expenses', monthlyLimit: 5000, companyId: bluekom.id },
    { code: 'BH-202', name: 'Transportation', description: 'Local transportation and travel', monthlyLimit: 5000, companyId: bluekom.id },
    { code: 'BH-203', name: 'Repair of Vehicles', description: 'Vehicle maintenance and repairs', monthlyLimit: 5000, companyId: bluekom.id },
    { code: 'BH-204', name: 'Repair of Buildings', description: 'Building and facility maintenance', monthlyLimit: 5000, companyId: bluekom.id },
    { code: 'BH-205', name: 'Repair of Generators', description: 'Generator maintenance and repairs', monthlyLimit: 5000, companyId: bluekom.id },
    { code: 'BH-206', name: 'Refreshment', description: 'Refreshments, meetings and hospitality', monthlyLimit: 3000, companyId: bluekom.id },
    { code: 'BH-207', name: 'Miscellaneous expenses', description: 'Other general and miscellaneous expenses', monthlyLimit: 3000, companyId: bluekom.id },
  ];

  for (const bh of budgetHeadsData) {
    await (prisma as any).budgetHead.upsert({
      where: { code_companyId: { code: bh.code, companyId: bh.companyId } },
      update: { name: bh.name, description: bh.description },
      create: bh,
    });
  }
  console.log('Budget Heads seeded.');

  // 6. Create Seed Users
  const defaultPasswordHash = bcrypt.hashSync('Welcome@2026', 10);

  // Fetch seeded regions for user assignment
  const bdrRegion = await (prisma as any).region.findFirst({ where: { companyId: somtel.id, name: { contains: 'Banaadir' } } });
  const hqRegion = await (prisma as any).region.findFirst({ where: { companyId: bluekom.id, name: { contains: 'HQ' } } });

  // Super Admin: admin (belongs to Somtel Finance)
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: { regionId: bdrRegion?.id },
    create: {
      fullName: 'System Administrator',
      username: 'admin',
      passwordHash: defaultPasswordHash,
      email: 'admin@somtel.com',
      phone: '+252610000001',
      employeeNumber: 'EMP-001',
      companyId: somtel.id,
      departmentId: somtelFinance.id,
      regionId: bdrRegion?.id,
      roleId: superAdminRole.id,
      status: 'ACTIVE',
      resetPasswordRequired: true,
    },
  });

  // Accountant: accountant (belongs to Somtel Finance, manages cross-company approvals)
  await prisma.user.upsert({
    where: { username: 'accountant' },
    update: { regionId: bdrRegion?.id },
    create: {
      fullName: 'Lead Accountant',
      username: 'accountant',
      passwordHash: defaultPasswordHash,
      email: 'accountant@somtel.com',
      phone: '+252610000002',
      employeeNumber: 'EMP-002',
      companyId: somtel.id,
      departmentId: somtelFinance.id,
      regionId: bdrRegion?.id,
      roleId: accountantRole.id,
      status: 'ACTIVE',
      resetPasswordRequired: true,
    },
  });

  // Somtel Employee: employee
  await prisma.user.upsert({
    where: { username: 'employee' },
    update: { regionId: bdrRegion?.id },
    create: {
      fullName: 'Somtel Field Engineer',
      username: 'employee',
      passwordHash: defaultPasswordHash,
      email: 'employee@somtel.com',
      phone: '+252610000003',
      employeeNumber: 'EMP-003',
      companyId: somtel.id,
      departmentId: somtelNetwork.id,
      regionId: bdrRegion?.id,
      roleId: employeeRole.id,
      status: 'ACTIVE',
      resetPasswordRequired: true,
    },
  });

  // Bluekom Employee: employee_bk
  await prisma.user.upsert({
    where: { username: 'employee_bk' },
    update: { regionId: hqRegion?.id },
    create: {
      fullName: 'Bluekom Lead Developer',
      username: 'employee_bk',
      passwordHash: defaultPasswordHash,
      email: 'dev@bluekom.com',
      phone: '+252610000004',
      employeeNumber: 'EMP-004',
      companyId: bluekom.id,
      departmentId: bluekomEngineering.id,
      regionId: hqRegion?.id,
      roleId: employeeRole.id,
      status: 'ACTIVE',
      resetPasswordRequired: true,
    },
  });

  // 7. Seed System Settings
  const settings = [
    { key: 'MAX_ATTACHMENT_SIZE_MB', value: '20', description: 'Maximum upload size limit per file in MB' },
    { key: 'MAX_ATTACHMENTS_COUNT', value: '10', description: 'Maximum allowed attachment files count per request' },
    { key: 'CURRENCY_OPTIONS', value: 'USD,SOS,SLS', description: 'Comma-separated list of supported currencies' },
    { key: 'AUTO_APPROVE_LIMIT', value: '50.00', description: 'Threshold below which request skips manager review if configured' }
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }

  console.log('System settings seeded.');
  console.log('Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
