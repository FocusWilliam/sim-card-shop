import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { RedisService } from '../common/redis.service';
import { CreateProductDto, UpdateProductDto, QueryProductDto } from './products.dto';
import { ProductStatus, Prisma } from '@prisma/client';

const CACHE_TTL = 300; // 5 minutes

export interface ProductListItem {
  id: string;
  name: string;
  nameEn: string | null;
  dataAmount: string;
  validityDays: number;
  price: Prisma.Decimal;
  originalPrice: Prisma.Decimal | null;
  currency: string;
  stock: number;
  status: ProductStatus;
  imageUrl: string | null;
}

export interface ProductListResult {
  items: ProductListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

type ProductWithCount = Prisma.ProductGetPayload<{
  include: { _count: { select: { cardInventory: true } } };
}>;

export type ProductDetailResult = ProductWithCount & { availableStock: number };

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async findAll(query: QueryProductDto): Promise<ProductListResult> {
    const { page = 1, limit = 20, status } = query;
    const cacheKey = `products:list:${page}:${limit}:${status || 'all'}`;

    // Check cache
    const cached = await this.redis.getJson<ProductListResult>(cacheKey);
    if (cached) return cached;

    const where = {
      status: status || ProductStatus.ACTIVE,
    };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          name: true,
          nameEn: true,
          dataAmount: true,
          validityDays: true,
          price: true,
          originalPrice: true,
          currency: true,
          stock: true,
          status: true,
          imageUrl: true,
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    const result = {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    // Cache result
    await this.redis.setJson(cacheKey, result, CACHE_TTL);
    return result;
  }

  async findOne(id: string) {
    const cacheKey = `products:${id}`;
    const cached = await this.redis.getJson<ProductDetailResult>(cacheKey);
    if (cached) return cached;

    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            cardInventory: { where: { isSold: false } },
          },
        },
      },
    });

    if (!product) throw new NotFoundException('Product not found');

    const result: ProductDetailResult = {
      ...product,
      availableStock: product._count.cardInventory,
    };

    await this.redis.setJson(cacheKey, result, CACHE_TTL);
    return result;
  }

  async create(dto: CreateProductDto) {
    const product = await this.prisma.product.create({ data: dto });
    await this.invalidateCache();
    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.update({
      where: { id },
      data: dto,
    });
    await this.invalidateCache();
    await this.redis.del(`products:${id}`);
    return product;
  }

  async remove(id: string) {
    await this.prisma.product.update({
      where: { id },
      data: { status: ProductStatus.INACTIVE },
    });
    await this.invalidateCache();
    await this.redis.del(`products:${id}`);
    return { message: 'Product deactivated' };
  }

  private async invalidateCache() {
    // Simple approach: delete known list cache keys
    // In production, use Redis SCAN with pattern matching
    for (let i = 1; i <= 10; i++) {
      await this.redis.del(`products:list:${i}:20:all`);
      await this.redis.del(`products:list:${i}:20:ACTIVE`);
    }
  }
}
