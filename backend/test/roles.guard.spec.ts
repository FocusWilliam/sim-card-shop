import { RolesGuard, ROLES_KEY } from '../src/auth/roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const createMockContext = (role: string): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user: { sub: 'user-1', email: 'test@test.com', role } }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  it('should allow access when no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const context = createMockContext('CUSTOMER');
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow ADMIN to access ADMIN-only routes', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);

    const context = createMockContext('ADMIN');
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny CUSTOMER from ADMIN-only routes', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);

    const context = createMockContext('CUSTOMER');
    expect(guard.canActivate(context)).toBe(false);
  });

  it('should allow access when user has one of multiple required roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN', 'CUSTOMER']);

    const context = createMockContext('CUSTOMER');
    expect(guard.canActivate(context)).toBe(true);
  });
});
