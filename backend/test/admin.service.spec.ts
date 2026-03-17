import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from '../src/admin/admin.service';
import { PrismaService } from '../src/common/prisma.service';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      product: {
        count: jest.fn().mockResolvedValue(8),
        findMany: jest.fn().mockResolvedValue([
          { id: 'p1', name: '3G / 7天', dataAmount: '3G', validityDays: 7, price: '49', status: 'ACTIVE', _count: { cardInventory: 20 } },
          { id: 'p2', name: '12G / 15天', dataAmount: '12G', validityDays: 15, price: '131', status: 'ACTIVE', _count: { cardInventory: 20 } },
        ]),
      },
      order: {
        count: jest.fn().mockResolvedValue(15),
        aggregate: jest.fn().mockResolvedValue({ _sum: { totalAmount: 3500 } }),
        groupBy: jest.fn().mockResolvedValue([
          { status: 'FULFILLED', _count: 10, contactEmail: 'a@test.com', _sum: { totalAmount: 2000 } },
          { status: 'PENDING', _count: 5, contactEmail: 'b@test.com', _sum: { totalAmount: 1500 } },
        ]),
        findMany: jest.fn().mockResolvedValue([]),
      },
      cardInventory: {
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  describe('getDashboard', () => {
    it('should return complete dashboard stats', async () => {
      (prisma.cardInventory.count as jest.Mock)
        .mockResolvedValueOnce(160) // totalCards
        .mockResolvedValueOnce(40); // soldCards

      const result = await service.getDashboard();

      expect(result.stats.totalProducts).toBe(8);
      expect(result.stats.totalOrders).toBe(15);
      expect(result.stats.totalRevenue).toBe(3500);
      expect(result.stats.totalCards).toBe(160);
      expect(result.stats.soldCards).toBe(40);
      expect(result.stats.availableCards).toBe(120);
    });

    it('should include orders by status breakdown', async () => {
      (prisma.cardInventory.count as jest.Mock)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(30);

      const result = await service.getDashboard();

      expect(result.ordersByStatus).toHaveLength(2);
      expect(result.ordersByStatus[0]).toEqual(
        expect.objectContaining({ status: 'FULFILLED', count: 10 }),
      );
    });
  });

  describe('getInventory', () => {
    it('should return per-product inventory with sold/available counts', async () => {
      (prisma.cardInventory.count as jest.Mock)
        .mockResolvedValueOnce(5)   // p1 sold
        .mockResolvedValueOnce(15)  // p1 available
        .mockResolvedValueOnce(8)   // p2 sold
        .mockResolvedValueOnce(12); // p2 available

      const result = await service.getInventory();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(
        expect.objectContaining({
          name: '3G / 7天',
          soldCards: 5,
          availableCards: 15,
          totalCards: 20,
        }),
      );
    });
  });

  describe('getCustomers', () => {
    it('should return customer list ranked by spending', async () => {
      const result = await service.getCustomers();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(
        expect.objectContaining({
          email: 'a@test.com',
          orderCount: 10,
          totalSpent: 2000,
        }),
      );
    });

    it('should handle customers with zero orders gracefully', async () => {
      (prisma.order.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await service.getCustomers();

      expect(result).toEqual([]);
    });
  });

  describe('getOrders', () => {
    it('should filter orders by status', async () => {
      await service.getOrders({ status: 'FULFILLED' });

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'FULFILLED' }),
        }),
      );
    });

    it('should filter orders by email (case insensitive)', async () => {
      await service.getOrders({ email: 'Test@Example.com' });

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            contactEmail: { contains: 'Test@Example.com', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('should paginate results correctly', async () => {
      (prisma.order.count as jest.Mock).mockResolvedValue(50);

      const result = await service.getOrders({ page: 2, limit: 15 });

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 15, take: 15 }),
      );
      expect(result.pagination.totalPages).toBe(4); // ceil(50/15)
    });
  });
});
