import {
  Controller,
  Post,
  Body,
  Param,
  Headers,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { Request } from 'express';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('checkout/:orderId')
  @ApiOperation({ summary: 'Create Stripe Checkout session for an order' })
  createCheckout(
    @Param('orderId') orderId: string,
    @Body() body: { successUrl: string; cancelUrl: string },
  ) {
    return this.paymentsService.createCheckoutSession(
      orderId,
      body.successUrl,
      body.cancelUrl,
    );
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Stripe webhook handler' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) {
      return { error: 'Missing raw body' };
    }
    return this.paymentsService.handleWebhook(rawBody, signature);
  }

  @Post('simulate/:orderId')
  @ApiOperation({
    summary: '[Test] Simulate payment completion without Stripe',
  })
  simulatePayment(@Param('orderId') orderId: string) {
    return this.paymentsService.simulatePayment(orderId);
  }
}
