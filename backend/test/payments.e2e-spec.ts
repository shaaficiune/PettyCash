import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { PaymentsController } from './../src/payments/payments.controller';
import { PaymentsService } from './../src/payments/payments.service';
import { JwtAuthGuard } from './../src/auth/jwt-auth.guard';
import { RolesGuard } from './../src/auth/roles.guard';
import { CompanyIsolationGuard } from './../src/auth/company-isolation.guard';
import { PrismaService } from './../src/prisma/prisma.service';
import { NotificationsService } from './../src/notifications/notifications.service';

const makeMockPrisma = () => ({
  pettyCashRequest: { findUnique: jest.fn(), update: jest.fn() },
  user: { findUnique: jest.fn() },
  payment: { aggregate: jest.fn(), create: jest.fn(), findMany: jest.fn(), count: jest.fn() }
});

const mockNotifications = { create: jest.fn() };

describe('PaymentsController (e2e)', () => {
  let app: INestApplication;
  let prisma: any;

  beforeAll(async () => {
    prisma = makeMockPrisma();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        PaymentsService,
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
      req.user = { userId: 'actor-id', role: 'ACCOUNTANT', companyId: 'c1' };
      next();
    });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /payments should return 201 when payment recorded', async () => {
    // Arrange
    prisma.pettyCashRequest.findUnique.mockResolvedValue({ id: 'r1', status: 'APPROVED', companyId: 'c1', requestNumber: 'REQ-1', currency: 'USD', approvedAmount: 100 });
    prisma.user.findUnique.mockResolvedValue({ id: 'actor-id', role: { name: 'ACCOUNTANT' }, companyId: 'c1' });
    prisma.payment.aggregate.mockResolvedValue({ _sum: { amountPaid: 0 } });
    prisma.payment.create.mockResolvedValue({ id: 'p1', amountPaid: 100 });
    prisma.pettyCashRequest.update.mockResolvedValue({ id: 'r1', status: 'PAID' });

    const payload = { requestId: 'r1', amountPaid: 100, paymentMethod: 'CASH' };

    const res = await (request as any)(app.getHttpServer())
      .post('/payments')
      .send(payload)
      .set('Accept', 'application/json');

    expect(res.status).toBe(201);
  });
});
