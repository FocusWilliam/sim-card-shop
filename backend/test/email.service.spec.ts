import { EmailService } from '../src/common/email.service';

describe('EmailService', () => {
  describe('without SMTP configuration', () => {
    let service: EmailService;

    beforeEach(() => {
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;
      service = new EmailService();
    });

    it('should initialize without error when SMTP is not configured', () => {
      expect(service).toBeDefined();
    });

    it('should return false when sending without SMTP config (mock mode)', async () => {
      const result = await service.sendOrderFulfilled({
        orderNo: 'ORD-TEST',
        contactEmail: 'test@example.com',
        items: [{ name: '3G / 7天', quantity: 1, subtotal: 49 }],
        totalAmount: 49,
        cardKeys: [{ cardNumber: 'SIM-001', cardSecret: 'SECRET-123' }],
      });

      expect(result).toBe(false);
    });
  });

  describe('email content generation', () => {
    it('should handle multiple card keys in email data', async () => {
      delete process.env.SMTP_HOST;
      const service = new EmailService();

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.sendOrderFulfilled({
        orderNo: 'ORD-MULTI',
        contactEmail: 'multi@example.com',
        items: [
          { name: '3G / 7天', quantity: 2, subtotal: 98 },
          { name: '12G / 15天', quantity: 1, subtotal: 131 },
        ],
        totalAmount: 229,
        cardKeys: [
          { cardNumber: 'SIM-3G-0001', cardSecret: 'SECRET-AAA' },
          { cardNumber: 'SIM-3G-0002', cardSecret: 'SECRET-BBB' },
          { cardNumber: 'SIM-12G-0001', cardSecret: 'SECRET-CCC' },
        ],
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[MOCK]'),
      );

      consoleSpy.mockRestore();
    });
  });
});
