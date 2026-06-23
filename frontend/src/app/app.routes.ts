import { Routes } from '@angular/router';
import { ProductListComponent } from './boundaries/product-list/product-list';
import { CartScreen } from './boundaries/cart-screen/cart-screen';
import { DeliveryInfoScreen } from './boundaries/delivery-info-screen/delivery-info-screen';
import { InvoiceScreen } from './boundaries/invoice-screen/invoice-screen';
import { VietQRPaymentScreen } from './pay-order/pay-by-vietqr/boundary/ui/vietqr-payment-screen.component';
import { CustomerOrderDetailsScreen } from './boundaries/customer-order-details-screen/customer-order-details-screen';
import { CancelOrderScreen } from './boundaries/cancel-order-screen/cancel-order-screen';
import { ProductManagementScreen } from './boundaries/product-management-screen/product-management-screen';
import { OrderManagementScreen } from './boundaries/order-management-screen/order-management-screen';
import { LoginScreen } from './auth/boundary/login-screen/login-screen';
import { ChangePasswordScreen } from './auth/boundary/change-password-screen/change-password-screen';
import { authGuard, roleGuard } from './auth/control/auth.guards';
import { ForbiddenScreen } from './auth/boundary/forbidden-screen/forbidden-screen';

export const routes: Routes = [
  { path: '', component: ProductListComponent },
  { path: 'cart', component: CartScreen },
  { path: 'delivery', component: DeliveryInfoScreen },
  { path: 'invoice', component: InvoiceScreen },
  { path: 'vietqr-payment/:orderId', component: VietQRPaymentScreen },
  { path: 'vietqr-payment', component: VietQRPaymentScreen },
  { path: 'orders/view/:viewToken', component: CustomerOrderDetailsScreen }, // Khi người dùng mở đường link này trên FE thì component này sẽ được thực thi
  { path: 'orders/cancel/:cancelToken', component: CancelOrderScreen },
  { path: 'staff/login', component: LoginScreen },
  { path: 'staff/change-password', component: ChangePasswordScreen, canActivate: [authGuard] },
  { path: 'forbidden', component: ForbiddenScreen },
  {
    path: 'admin/products',
    component: ProductManagementScreen,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['PRODUCT_MANAGER'] },
  },
  {
    path: 'admin/orders',
    component: OrderManagementScreen,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['PRODUCT_MANAGER'] },
  },
  { path: '**', redirectTo: '' },
];
