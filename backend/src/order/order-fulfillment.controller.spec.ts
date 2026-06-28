import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '../auth/control/roles.decorator.js';
import { JwtAuthGuard } from '../auth/control/jwt-auth.guard.js';
import { RolesGuard } from '../auth/control/roles.guard.js';
import { OrderFulfillmentController } from './order-fulfillment.controller.js';

describe('OrderFulfillmentController', () => {
  it('protects Product Manager order routes with JWT and roles guards', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      OrderFulfillmentController,
    );
    const roles = Reflect.getMetadata(ROLES_KEY, OrderFulfillmentController);

    expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
    expect(roles).toEqual(['PRODUCT_MANAGER']);
  });
});
