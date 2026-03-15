import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const [
      totalProducts,
      totalOrders,
      totalRevenue,
      totalCards,
      soldCards,
      ordersByStatus,
      recentOrders,
    ] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.order.count(),
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { status: { in: ['PAID', 'FULFILLED'] } },
      }),
      this.prisma.cardInventory.count(),
      this.prisma.cardInventory.count({ where: { isSold: true } }),
      this.prisma.order.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          orderItems: { include: { product: true } },
        },
      }),
    ]);

    return {
      stats: {
        totalProducts,
        totalOrders,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        totalCards,
        soldCards,
        availableCards: totalCards - soldCards,
      },
      ordersByStatus: ordersByStatus.map((o) => ({
        status: o.status,
        count: o._count,
      })),
      recentOrders,
    };
  }

  async getInventory() {
    const products = await this.prisma.product.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: {
            cardInventory: true,
          },
        },
      },
    });

    const inventory = await Promise.all(
      products.map(async (p) => {
        const sold = await this.prisma.cardInventory.count({
          where: { productId: p.id, isSold: true },
        });
        const available = await this.prisma.cardInventory.count({
          where: { productId: p.id, isSold: false },
        });
        return {
          id: p.id,
          name: p.name,
          dataAmount: p.dataAmount,
          validityDays: p.validityDays,
          price: p.price,
          totalCards: p._count.cardInventory,
          soldCards: sold,
          availableCards: available,
          status: p.status,
        };
      }),
    );

    return inventory;
  }

  async getOrders(query: {
    page?: number;
    limit?: number;
    status?: string;
    email?: string;
  }) {
    const { page = 1, limit = 20, status, email } = query;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (email) where.contactEmail = { contains: email, mode: 'insensitive' };

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          orderItems: { include: { product: true } },
          cardInventory: {
            select: { cardNumber: true, cardSecret: true, productId: true },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getCustomers() {
    const customers = await this.prisma.order.groupBy({
      by: ['contactEmail'],
      _count: true,
      _sum: { totalAmount: true },
      where: { contactEmail: { not: null } },
      orderBy: { _sum: { totalAmount: 'desc' } },
    });

    return customers.map((c) => ({
      email: c.contactEmail,
      orderCount: c._count,
      totalSpent: c._sum.totalAmount || 0,
    }));
  }
}
