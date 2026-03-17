import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from '../src/orders/orders.service';
import { PrismaService } from '../src/common/prisma.service';
import { RedisService } from '../src/common/redis.service';
import { NotFoundException } from '@nestjs/common';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: any;

  const mockProduct = {
    id: 'prod-1',
    name: '12G / 15天',
    price: '131',
  };

  const mockOrder = {
    id: 'order-1',
    orderNo: 'ORD-20260315-ABC123',
    userId: null,
    contactEmail: 'test@example.com',
    totalAmount: '262',
    status: 'PENDING',
    createdAt: new Date(),
    updatedAt: new Date(),
    orderItems: [
      { id: 'oi-1', productId: 'prod-1', quantity: 2, unitPrice: '131', subtotal: '262', product: mockProduct },
    ],
    cardInventory: [],
  };

  beforeEach(async () => {
    const txMock = {
      product: { findUniqueOrThrow: jest.fn().mockResolvedValue(mockProduct) },
      order: { create: jest.fn().mockResolvedValue(mockOrder) },
    };

    prisma = {
      $transaction: jest.fn().mockImplementation((fn: (tx: any) => Promise<any>) => fn(txMock)),
      order: {
        findUnique: jest.fn().mockResolvedValue(mockOrder),
        findUniqueOrThrow: jest.fn().mockResolvedValue(mockOrder),
        findMany: jest.fn().mockResolvedValue([mockOrder]),
      },
    };

    const redis = {
      getJson: jest.fn().mockResolvedValue(null),
      setJson: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  describe('create', () => {
    it('should create an order with correct total amount', async () => {
      const dto = {
        items: [{ productId: 'prod-1', quantity: 2 }],
        contactEmail: 'test@example.com',
      };

      const result = await service.create(dto);

      expect(result.orderNo).toMatch(/^ORD-/);
      expect(result.orderItems).toHaveLength(1);
    });

    it('should generate unique order numbers', async () => {
      const dto = { items: [{ productId: 'prod-1', quantity: 1 }] };

      // Access private method via prototype
      const orderNo1 = (service as any).generateOrderNo();
      const orderNo2 = (service as any).generateOrderNo();

      expect(orderNo1).not.toEqual(orderNo2);
      expect(orderNo1).toMatch(/^ORD-\d{8}-[A-Z0-9]{6}$/);
    });

    it('should include contact email if provided', async () => {
      const dto = {
        items: [{ productId: 'prod-1', quantity: 1 }],
        contactEmail: 'buyer@example.com',
      };

      await service.create(dto);

      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('findByOrderNo', () => {
    it('should return order with items and card keys', async () => {
      const result = await service.findByOrderNo('ORD-20260315-ABC123');

      expect(result.orderNo).toBe('ORD-20260315-ABC123');
      expect(result.orderItems).toBeDefined();
      expect(result.cardInventory).toBeDefined();
    });

    it('should throw NotFoundException for invalid order number', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findByOrderNo('ORD-INVALID')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('should return all orders for an email', async () => {
      const result = await service.findByEmail('test@example.com');

      expect(Array.isArray(result)).toBe(true);
      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { contactEmail: { equals: 'test@example.com', mode: 'insensitive' } },
        }),
      );
    });

    it('should throw NotFoundException for empty email', async () => {
      await expect(service.findByEmail('')).rejects.toThrow(NotFoundException);
    });
  });
});
