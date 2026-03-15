import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

interface CardKey {
  cardNumber: string;
  cardSecret: string;
}

interface OrderEmailData {
  orderNo: string;
  contactEmail: string;
  items: { name: string; quantity: number; subtotal: number }[];
  totalAmount: number;
  cardKeys: CardKey[];
}

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user, pass },
      });
      console.log('📧 Email service initialized');
    } else {
      console.log('📧 Email service not configured (set SMTP_HOST/USER/PASS)');
    }
  }

  async sendOrderFulfilled(data: OrderEmailData): Promise<boolean> {
    if (!this.transporter) {
      console.log(`📧 [MOCK] Would send card keys to ${data.contactEmail} for order ${data.orderNo}`);
      return false;
    }

    const cardKeysHtml = data.cardKeys
      .map(
        (c) =>
          `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;margin:8px 0;font-family:monospace;">
            <div><strong>Card:</strong> ${c.cardNumber}</div>
            <div><strong>Secret:</strong> ${c.cardSecret}</div>
          </div>`,
      )
      .join('');

    const itemsHtml = data.items
      .map((i) => `<tr><td style="padding:8px;border-bottom:1px solid #eee;">${i.name} × ${i.quantity}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">¥${i.subtotal}</td></tr>`)
      .join('');

    const html = `
      <div style="max-width:600px;margin:0 auto;font-family:sans-serif;color:#333;">
        <h2 style="color:#16a34a;">🎉 Order Fulfilled!</h2>
        <p>Your order <strong>${data.orderNo}</strong> has been completed.</p>

        <h3>Order Items</h3>
        <table style="width:100%;border-collapse:collapse;">
          ${itemsHtml}
          <tr><td style="padding:8px;font-weight:bold;">Total</td><td style="padding:8px;text-align:right;font-weight:bold;color:#ef4444;">¥${data.totalAmount}</td></tr>
        </table>

        <h3 style="color:#16a34a;">Your Card Keys</h3>
        ${cardKeysHtml}

        <p style="margin-top:24px;color:#888;font-size:12px;">
          Please keep your card keys safe. If you have any issues, contact our support team.
        </p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: data.contactEmail,
        subject: `✅ Order ${data.orderNo} - Your Card Keys Are Ready!`,
        html,
      });
      console.log(`📧 Email sent to ${data.contactEmail} for order ${data.orderNo}`);
      return true;
    } catch (err) {
      console.error('📧 Email send failed:', err);
      return false;
    }
  }
}
