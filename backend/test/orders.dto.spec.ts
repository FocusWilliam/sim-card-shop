import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateOrderDto } from '../src/orders/orders.dto';

/**
 * These tests lock in the contract enforced by the global ValidationPipe:
 * an order cannot be created without a valid contactEmail, because that is
 * the only channel we have to deliver the purchased card keys.
 */
describe('CreateOrderDto validation', () => {
  const validItems = [{ productId: 'prod-1', quantity: 1 }];

  const validateDto = (payload: unknown) =>
    validate(plainToInstance(CreateOrderDto, payload));

  it('accepts a payload with a valid email', async () => {
    const errors = await validateDto({
      items: validItems,
      contactEmail: 'buyer@example.com',
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects a payload with no email', async () => {
    const errors = await validateDto({ items: validItems });

    const emailError = errors.find((e) => e.property === 'contactEmail');
    expect(emailError).toBeDefined();
    expect(emailError?.constraints).toHaveProperty('isEmail');
  });

  it('rejects an empty email string', async () => {
    const errors = await validateDto({
      items: validItems,
      contactEmail: '',
    });

    const emailError = errors.find((e) => e.property === 'contactEmail');
    expect(emailError).toBeDefined();
    expect(emailError?.constraints).toHaveProperty('isEmail');
  });

  it.each(['notanemail', 'foo@', '@bar.com', 'foo@bar', 'a b@c.com'])(
    'rejects the malformed email %p',
    async (contactEmail) => {
      const errors = await validateDto({ items: validItems, contactEmail });

      const emailError = errors.find((e) => e.property === 'contactEmail');
      expect(emailError).toBeDefined();
      expect(emailError?.constraints).toHaveProperty('isEmail');
    },
  );
});
