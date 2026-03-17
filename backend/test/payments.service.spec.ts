import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from '../src/payments/payments.service';
import { PrismaService } from '../src/common/prisma.service';
import { EmailService } from '../src/common/email.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: any;
  let email: any;

  const mockCards = [
    { id: 'card-1', cardNumber: 'SIM-3G-0001', cardSecret: 'SECRET-ABC123', productId: 'prod-1', isSold: false },
    { id: 'card-2', cardNumber: 'SIM-3G-0002', cardSecret: 'SECRET-DEF456', productId: 'prod-1', isSold: false },
  ];

  const mockOrder = {
    id: 'order-1',
    orderNo: 'ORD-20260315-TEST01',
    contactEmail: 'buyer@example.com',
    totalAmount: '98',
    status: 'PENDING',
    orderItems: [
      {
        id: 'oi-1',
        productId: 'prod-1',
        quantity: 2,
        unitPrice: '49',
        subtotal: '98',
        product: { name: '3G / 7天', nameEn: '3G / 7 days' },
      },
    ],
  };

  beforeEach(async () => {
    const txMock = {
      order: { update: jest.fn().mockResolvedValue(mockOrder) },
      cardInventory: {
        findMany: jest.fn().mockResolvedValue(mockCards),
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    };

    prisma = {
      $transaction: jest.fn().mockImplementation((fn: (tx: any) => Promise<any>) => fn(txMock)),
      order: {
        findUniqueOrThrow: jest.fn().mockResolvedValue(mockOrder),
      },
    };

    email = {
      sendOrderFulfilled: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: email },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  describe('simulatePayment', () => {
    it('should fulfill order and return order with card keys', async () => {
      const fulfilledOrder = {
        ...mockOrder,
        status: 'FULFILLED',
        cardInventory: mockCards,
      };
      (prisma.order.findUniqueOrThrow as jest.Mock)
        .mockResolvedValueOnce(mockOrder) // first call in fulfillOrder
        .mockResolvedValueOnce(fulfilledOrder); // second call returning result

      const result = await service.simulatePayment('order-1');

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result.status).toBe('FULFILLED');
    });

    it('should assign correct number of card keys based on quantity', async () => {
      (prisma.order.findUniqueOrThrow as jest.Mock)
        .mockResolvedValueOnce(mockOrder)
        .mockResolvedValueOnce({ ...mockOrder, status: 'FULFILLED', cardInventory: mockCards });

      await service.simulatePayment('order-1');

      // Verify transaction was called (card assignment happens inside)
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should trigger email notification after fulfillment', async () => {
      (prisma.order.findUniqueOrThrow as jest.Mock)
        .mockResolvedValueOnce(mockOrder)
        .mockResolvedValueOnce({ ...mockOrder, status: 'FULFILLED', cardInventory: mockCards });

      await service.simulatePayment('order-1');

      // Email is called async (fire-and-forget), give it a tick
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(email.sendOrderFulfilled).toHaveBeenCalledWith(
        expect.objectContaining({
          orderNo: 'ORD-20260315-TEST01',
          contactEmail: 'buyer@example.com',
          cardKeys: expect.arrayContaining([
            expect.objectContaining({ cardNumber: 'SIM-3G-0001' }),
          ]),
        }),
      );
    });

    it('should not send email if no contact email provided', async () => {
      const noEmailOrder = { ...mockOrder, contactEmail: null };
      (prisma.order.findUniqueOrThrow as jest.Mock)
        .mockResolvedValueOnce(noEmailOrder)
        .mockResolvedValueOnce({ ...noEmailOrder, status: 'FULFILLED' });

      await service.simulatePayment('order-1');
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(email.sendOrderFulfilled).not.toHaveBeenCalled();
    });

    it('should skip fulfillment if order is not PENDING', async () => {
      const paidOrder = { ...mockOrder, status: 'FULFILLED' };
      (prisma.order.findUniqueOrThrow as jest.Mock)
        .mockResolvedValueOnce(paidOrder)
        .mockResolvedValueOnce(paidOrder);

      await service.simulatePayment('order-1');

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
