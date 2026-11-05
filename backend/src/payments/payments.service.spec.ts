import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

const mockNotifications = {
  create: jest.fn()
};

const mockFundsService = {
  recordPayment: jest.fn().mockResolvedValue(true),
  getOrCreateCurrentMonthFund: jest.fn().mockResolvedValue({ id: 'f1', remainingBalance: 1000 }),
  recordPaymentInTransaction: jest.fn().mockResolvedValue(true),
};

const makeMockPrisma = () => {
  const mock: any = {
    pettyCashRequest: {
      findUnique: jest.fn(),
      update: jest.fn()
    },
    user: {
      findUnique: jest.fn()
    },
    payment: {
      aggregate: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn()
    },
    $executeRawUnsafe: jest.fn().mockResolvedValue(true),
  };
  mock.$transaction = jest.fn(async (cb) => cb(mock));
  return mock;
};

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: any;

  beforeEach(async () => {
    // Bypass Nest DI and create service with mocked dependencies
    prisma = makeMockPrisma();
    service = new PaymentsService(prisma as any, mockNotifications as any, mockFundsService as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('throws NotFoundException when request not found', async () => {
    prisma.pettyCashRequest.findUnique.mockResolvedValue(null);
    await expect(service.recordPayment('actor-id', { requestId: 'r1', amountPaid: 50, paymentMethod: 'CASH' } as any)).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException for non-positive amount', async () => {
    prisma.pettyCashRequest.findUnique.mockResolvedValue({ id: 'r1', status: 'APPROVED', companyId: 'c1' });
    await expect(service.recordPayment('actor-id', { requestId: 'r1', amountPaid: 0, paymentMethod: 'CASH' } as any)).rejects.toThrow(BadRequestException);
  });

  it('throws ForbiddenException if actor not found', async () => {
    prisma.pettyCashRequest.findUnique.mockResolvedValue({ id: 'r1', status: 'APPROVED', companyId: 'c1', requestNumber: 'REQ-1', currency: 'USD', approvedAmount: 100 });
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.recordPayment('actor-id', { requestId: 'r1', amountPaid: 50, paymentMethod: 'CASH' } as any)).rejects.toThrow(ForbiddenException);
  });

  it('creates payment and updates status to PAYMENT_PROCESSING for partial payments', async () => {
    prisma.pettyCashRequest.findUnique.mockResolvedValue({ id: 'r1', status: 'APPROVED', companyId: 'c1', requestNumber: 'REQ-1', currency: 'USD', approvedAmount: 50 });
    prisma.user.findUnique.mockResolvedValue({ id: 'actor-id', role: { name: 'ACCOUNTANT' }, companyId: 'c1' });
    prisma.payment.aggregate.mockResolvedValue({ _sum: { amountPaid: 0 } });
    prisma.payment.create.mockResolvedValue({ id: 'p1', amountPaid: 20 });
    prisma.pettyCashRequest.update.mockResolvedValue({ id: 'r1', status: 'PAYMENT_PROCESSING' });

    const res = await service.recordPayment('actor-id', { requestId: 'r1', amountPaid: 20, paymentMethod: 'CASH' } as any);
    expect(prisma.payment.create).toHaveBeenCalled();
    expect(prisma.pettyCashRequest.update).toHaveBeenCalledWith({ where: { id: 'r1' }, data: { status: 'PAYMENT_PROCESSING' } });
    expect(res).toBeDefined();
  });

  it('creates payment and updates status to PAID when fully paid', async () => {
    prisma.pettyCashRequest.findUnique.mockResolvedValue({ id: 'r1', status: 'APPROVED', companyId: 'c1', requestNumber: 'REQ-1', currency: 'USD', approvedAmount: 50 });
    prisma.user.findUnique.mockResolvedValue({ id: 'actor-id', role: { name: 'ACCOUNTANT' }, companyId: 'c1' });
    prisma.payment.aggregate.mockResolvedValue({ _sum: { amountPaid: 0 } });
    prisma.payment.create.mockResolvedValue({ id: 'p2', amountPaid: 50 });
    prisma.pettyCashRequest.update.mockResolvedValue({ id: 'r1', status: 'PAID' });

    const res = await service.recordPayment('actor-id', { requestId: 'r1', amountPaid: 50, paymentMethod: 'BANK_TRANSFER' } as any);
    expect(res).toBeDefined();
  });
});
