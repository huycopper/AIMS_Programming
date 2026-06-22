import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../control/roles.guard.js';

type Principal = {
  userId: string;
  roles: string[];
};

describe('RolesGuard any-match authorization (Story 5.3 ATDD)', () => {
  const reflector = { getAllAndOverride: jest.fn() };
  const guard = new RolesGuard(reflector as unknown as Reflector);

  afterEach(() => jest.clearAllMocks());

  it('[P0] allows an authenticated route with no role metadata', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(context({ roles: ['ADMIN'] }))).toBe(true);
  });

  it.each([
    [['ADMIN'], ['ADMIN']],
    [['PRODUCT_MANAGER'], ['PRODUCT_MANAGER']],
    [['ADMIN', 'PRODUCT_MANAGER'], ['ADMIN']],
    [['ADMIN', 'PRODUCT_MANAGER'], ['PRODUCT_MANAGER']],
    [
      ['ADMIN', 'PRODUCT_MANAGER'],
      ['ADMIN', 'PRODUCT_MANAGER'],
    ],
  ])(
    '[P0] allows principal roles %j for any required role in %j',
    (roles, required) => {
      reflector.getAllAndOverride.mockReturnValue(required);
      expect(guard.canActivate(context({ roles }))).toBe(true);
    },
  );

  it('[P0] throws 403 for an authenticated principal with no required role', () => {
    reflector.getAllAndOverride.mockReturnValue(['PRODUCT_MANAGER']);
    expect(() => guard.canActivate(context({ roles: ['ADMIN'] }))).toThrow(
      ForbiddenException,
    );
  });

  function context(principal: Pick<Principal, 'roles'>): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user: principal }),
      }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as unknown as ExecutionContext;
  }
});
