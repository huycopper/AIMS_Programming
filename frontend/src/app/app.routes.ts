import { Routes } from '@angular/router';
import { ProductListComponent } from './boundaries/product-list/product-list';
import { CartScreen } from './boundaries/cart-screen/cart-screen';

export const routes: Routes = [
  { path: '', component: ProductListComponent },
  { path: 'cart', component: CartScreen },
  { path: '**', redirectTo: '' },
];
