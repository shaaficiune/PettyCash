import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { RequestsController } from './../src/requests/requests.controller';
import { PaymentsController } from './../src/payments/payments.controller';
import { SettlementsController } from './../src/settlements/settlements.controller';
import { RequestsService } from './../src/requests/requests.service';
import { PaymentsService } from './../src/payments/payments.service';
import { SettlementsService } from './../src/settlements/settlements.service';
import { JwtAuthGuard } from './../src/auth/jwt-auth.guard';
import { RolesGuard } from './../src/auth/roles.guard';
import { CompanyIsolationGuard } from './../src/auth/company-isolation.guard';
import { PrismaService } from './../src/prisma/prisma.service';
import { NotificationsService } from './../src/notifications/notifications.service';

const makeMockPrisma = () => ({
  pettyCashRequest: {
    count: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  pettyCashAttachment: {
    deleteMany: jest.fn(),
  },
  expenseSettlement: {
    findFirst: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  payment: {
    aggregate: jest.fn(),
    create: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
});

const mockNotifications = {
  create: jest.fn(),
};

describe('Petty Cash Workflow (e2e)', () => {
  let app: INestApplication;
  let prisma: any;

  beforeAll(async () => {
    prisma = makeMockPrisma();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [RequestsController, PaymentsController, SettlementsController],
      providers: [
        RequestsService,
        PaymentsService,
        SettlementsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .overrideGuard(CompanyIsolationGuard).useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.use((req, res, next) => {
      req.user = {
        userId: 'actor-id',
        role: 'ACCOUNTANT',
        companyId: 'c1',
        departmentId: 'd1',
      };
      next();
    });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create request, approve it, process payment, submit and approve settlement', async () => {
    let currentRequest: any = null;
    let currentSettlement: any = null;

    prisma.pettyCashRequest.count.mockResolvedValue(0);
    prisma.pettyCashRequest.create.mockImplementation(async ({ data }) => {
      currentRequest = {
        id: 'r1',
        requestNumber: 'PC-20260719-0001',
        status: data.status,
        userId: 'actor-id',
        companyId: data.companyId,
        departmentId: data.departmentId,
        requestedAmount: data.requestedAmount,
        currency: data.currency,
        approvedAmount: data.approvedAmount ?? null,
        user: { fullName: 'Actor Name' },
        ...data,
      };
      return currentRequest;
    });

    prisma.pettyCashRequest.findUnique.mockImplementation(async ({ where }) => {
      if (where.id === 'r1') {
        return currentRequest;
      }
      return null;
    });

    prisma.pettyCashRequest.update.mockImplementation(async ({ where, data }) => {
      if (where.id === 'r1') {
        currentRequest = { ...currentRequest, ...data };
        return currentRequest;
      }
      return null;
    });

    prisma.user.findUnique.mockResolvedValue({ id: 'actor-id', role: { name: 'ACCOUNTANT' }, companyId: 'c1' });
    prisma.payment.aggregate.mockResolvedValue({ _sum: { amountPaid: 0 } });
    prisma.payment.create.mockResolvedValue({ id: 'p1', amountPaid: 100 });

    prisma.expenseSettlement.findFirst.mockResolvedValue(null);
    prisma.expenseSettlement.create.mockImplementation(async ({ data }) => {
      currentSettlement = {
        id: 's1',
        requestId: data.requestId,
        companyId: data.companyId,
        actualExpenseAmount: data.actualExpenseAmount,
        remainingBalance: data.remainingBalance,
        status: data.status,
        approvedById: null,
      };
      return currentSettlement;
    });
    prisma.expenseSettlement.findUnique.mockImplementation(async ({ where }) => {
      if (where.id === 's1') {
        return {
          ...currentSettlement,
          request: currentRequest,
        };
      }
      return null;
    });
    prisma.expenseSettlement.update.mockImplementation(async ({ where, data }) => {
      if (where.id === 's1') {
        currentSettlement = { ...currentSettlement, ...data };
        return currentSettlement;
      }
      return null;
    });

    prisma.user.findMany.mockResolvedValue([{ id: 'accountant-1' }]);

    // 1) Create request
    const createDto = {
      projectId: null,
      costCenter: 'CC-101',
      purpose: 'Office supplies',
      description: 'Purchase printer ink and paper',
      requestedAmount: 100,
      currency: 'USD',
      priority: 'NORMAL',
      requiredDate: new Date().toISOString(),
      status: 'PENDING_APPROVAL',
    };

    const createRes = await (request as any)(app.getHttpServer())
      .post('/requests')
      .send(createDto)
      .set('Accept', 'application/json');

    expect(createRes.status).toBe(201);
    expect(createRes.body).toMatchObject({ id: 'r1', status: 'PENDING_APPROVAL' });

    // 2) Approve request
    const reviewDto = { status: 'APPROVED', approvedAmount: 100 };
    const reviewRes = await (request as any)(app.getHttpServer())
      .post('/requests/r1/review')
      .send(reviewDto)
      .set('Accept', 'application/json');

    expect(reviewRes.status).toBe(201);
    expect(reviewRes.body.status).toBe('APPROVED');

    // 3) Record payment
    currentRequest = { ...currentRequest, status: 'APPROVED', approvedAmount: 100 };
    const paymentPayload = { requestId: 'r1', amountPaid: 100, paymentMethod: 'CASH' };
    const paymentRes = await (request as any)(app.getHttpServer())
      .post('/payments')
      .send(paymentPayload)
      .set('Accept', 'application/json');

    expect(paymentRes.status).toBe(201);

    // 4) Submit settlement
    currentRequest = { ...currentRequest, status: 'PAID' };
    const settlementPayload = { requestId: 'r1', actualExpenseAmount: 95, remainingBalance: 5, notes: 'Change from budget' };
    const settlementRes = await (request as any)(app.getHttpServer())
      .post('/settlements')
      .send(settlementPayload)
      .set('Accept', 'application/json');

    expect(settlementRes.status).toBe(201);
    expect(settlementRes.body).toMatchObject({ id: 's1', status: 'PENDING' });

    // 5) Approve settlement
    const approvalPayload = { status: 'APPROVED' };
    const approvalRes = await (request as any)(app.getHttpServer())
      .post('/settlements/s1/review')
      .send(approvalPayload)
      .set('Accept', 'application/json');

    expect(approvalRes.status).toBe(201);
    expect(approvalRes.body.status).toBe('APPROVED');
    expect(currentRequest.status).toBe('COMPLETED');
  });
});
