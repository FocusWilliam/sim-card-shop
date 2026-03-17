import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from '../src/products/products.service';
import { PrismaService } from '../src/common/prisma.service';
import { RedisService } from '../src/common/redis.service';
import { NotFoundException } from '@nestjs/common';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: Partial<Record<string, any>>;
  let redis: Partial<Record<string, any>>;

  const mockProduct = {
    id: 'prod-1',
    name: '12G / 15天',
    nameEn: '12G / 15 days',
    dataAmount: '12G',
    validityDays: 15,
    price: '131',
    originalPrice: '145',
    currency: 'CNY',
    stock: 100,
    status: 'ACTIVE',
    sortOrder: 1,
    imageUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      product: {
        findMany: jest.fn().mockResolvedValue([mockProduct]),
        findUnique: jest.fn().mockResolvedValue(mockProduct),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue(mockProduct),
        update: jest.fn().mockResolvedValue(mockProduct),
      },
    };

    redis = {
      getJson: jest.fn().mockResolvedValue(null),
      setJson: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  describe('findAll', () => {
    it('should return paginated products', async () => {
      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('12G / 15天');
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it('should return cached data when available', async () => {
      const cachedData = { items: [mockProduct], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } };
      (redis.getJson as jest.Mock).mockResolvedValue(cachedData);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result).toEqual(cachedData);
      expect(prisma.product!.findMany).not.toHaveBeenCalled();
    });

    it('should cache results after fetching from database', async () => {
      await service.findAll({ page: 1, limit: 20 });

      expect(redis.setJson).toHaveBeenCalledWith(
        expect.stringContaining('products:list:'),
        expect.objectContaining({ items: expect.any(Array) }),
        300,
      );
    });
  });

  describe('findOne', () => {
    it('should return a product by id', async () => {
      (prisma.product!.findUnique as jest.Mock).mockResolvedValue({
        ...mockProduct,
        _count: { cardInventory: 10 },
      });

      const result = await service.findOne('prod-1');

      expect(result.id).toBe('prod-1');
      expect(result.availableStock).toBe(10);
    });

    it('should throw NotFoundException for invalid id', async () => {
      (prisma.product!.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a product and invalidate cache', async () => {
      const dto = {
        name: '5G / 15天',
        dataAmount: '5G',
        validityDays: 15,
        price: 89,
      };

      await service.create(dto);

      expect(prisma.product!.create).toHaveBeenCalledWith({ data: dto });
      expect(redis.del).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should soft-delete by setting status to INACTIVE', async () => {
      await service.remove('prod-1');

      expect(prisma.product!.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { status: 'INACTIVE' },
      });
    });
  });
});
