import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { RedisService } from '../common/redis.service';
import { CreateOrderDto } from './orders.dto';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async create(dto: CreateOrderDto, userId?: string) {
    // Create order with items in a transaction
    const order = await this.prisma.$transaction(async (tx) => {
      // Calculate totals and validate products exist
      const orderItems = await Promise.all(
        dto.items.map(async (item) => {
          const product = await tx.product.findUniqueOrThrow({
            where: { id: item.productId },
          });
          return {
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: product.price,
            subtotal: Number(product.price) * item.quantity,
          };
        }),
      );

      const totalAmount = orderItems.reduce((sum, i) => sum + i.subtotal, 0);

      return tx.order.create({
        data: {
          orderNo: this.generateOrderNo(),
          userId,
          contactEmail: dto.contactEmail,
          contactPhone: dto.contactPhone,
          totalAmount,
          orderItems: { create: orderItems },
        },
        include: { orderItems: true },
      });
    });

    return order;
  }

  async findByOrderNo(orderNo: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNo },
      include: {
        orderItems: { include: { product: true } },
        cardInventory: {
          select: {
            cardNumber: true,
            cardSecret: true,
            productId: true,
          },
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async findByEmail(email: string) {
    if (!email) throw new NotFoundException('Email required');
    const orders = await this.prisma.order.findMany({
      where: { contactEmail: { equals: email, mode: 'insensitive' } },
      orderBy: { createdAt: 'desc' },
      include: {
        orderItems: { include: { product: true } },
        cardInventory: {
          select: {
            cardNumber: true,
            cardSecret: true,
            productId: true,
          },
        },
      },
    });
    return orders;
  }

  /**
   * Called after payment confirmation (e.g., from Stripe/Alipay webhook).
   * Assigns card keys to the order.
   */
  async fulfillOrder(orderId: string) {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { orderItems: true },
    });

    if (order.status !== OrderStatus.PAID) {
      throw new BadRequestException('Order is not in PAID status');
    }

    await this.prisma.$transaction(async (tx) => {
      for (const item of order.orderItems) {
        // Grab unsold cards
        const cards = await tx.cardInventory.findMany({
          where: { productId: item.productId, isSold: false },
          take: item.quantity,
        });

        if (cards.length < item.quantity) {
          throw new BadRequestException(
            `Not enough cards for product ${item.productId}`,
          );
        }

        // Mark cards as sold
        await tx.cardInventory.updateMany({
          where: { id: { in: cards.map((c) => c.id) } },
          data: {
            isSold: true,
            orderId: order.id,
            soldAt: new Date(),
          },
        });
      }

      // Update order status
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.FULFILLED },
      });
    });

    return this.findByOrderNo(order.orderNo);
  }

  async markAsPaid(orderId: string, paymentId: string, method: string) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.PAID,
        paymentId,
        paymentMethod: method,
        paidAt: new Date(),
      },
    });
  }

  private generateOrderNo(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `ORD-${date}-${rand}`;
  }
}
