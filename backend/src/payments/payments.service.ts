import { Injectable, BadRequestException } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../common/prisma.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(private readonly prisma: PrismaService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
  }

  /**
   * Create a Stripe Checkout Session for an order
   */
  async createCheckoutSession(orderId: string, successUrl: string, cancelUrl: string) {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { orderItems: { include: { product: true } } },
    });

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Order is not in PENDING status');
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
      order.orderItems.map((item) => ({
        price_data: {
          currency: 'cny',
          product_data: {
            name: item.product.name,
            description: item.product.nameEn || undefined,
          },
          unit_amount: Math.round(Number(item.unitPrice) * 100), // Stripe uses cents
        },
        quantity: item.quantity,
      }));

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${successUrl}?orderNo=${order.orderNo}`,
      cancel_url: `${cancelUrl}?orderNo=${order.orderNo}`,
      metadata: {
        orderId: order.id,
        orderNo: order.orderNo,
      },
    });

    // Save Stripe session ID to order
    await this.prisma.order.update({
      where: { id: orderId },
      data: { paymentId: session.id, paymentMethod: 'stripe' },
    });

    return { checkoutUrl: session.url, sessionId: session.id };
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(payload: Buffer, signature: string) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      throw new BadRequestException(`Webhook signature verification failed: ${message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;

      if (orderId) {
        await this.fulfillOrder(orderId);
      }
    }

    return { received: true };
  }

  /**
   * Mark order as paid and assign card keys
   */
  private async fulfillOrder(orderId: string) {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { orderItems: true },
    });

    if (order.status !== OrderStatus.PENDING) return;

    await this.prisma.$transaction(async (tx) => {
      // Mark as paid
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.PAID, paidAt: new Date() },
      });

      // Assign card keys for each item
      for (const item of order.orderItems) {
        const cards = await tx.cardInventory.findMany({
          where: { productId: item.productId, isSold: false },
          take: item.quantity,
        });

        if (cards.length >= item.quantity) {
          await tx.cardInventory.updateMany({
            where: { id: { in: cards.map((c) => c.id) } },
            data: {
              isSold: true,
              orderId: order.id,
              soldAt: new Date(),
            },
          });

          // Update order to fulfilled
          await tx.order.update({
            where: { id: orderId },
            data: { status: OrderStatus.FULFILLED },
          });
        }
      }
    });
  }

  /**
   * For testing: simulate payment without Stripe
   */
  async simulatePayment(orderId: string) {
    await this.fulfillOrder(orderId);
    return this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: {
        orderItems: { include: { product: true } },
        cardInventory: {
          select: { cardNumber: true, cardSecret: true, productId: true },
        },
      },
    });
  }
}
