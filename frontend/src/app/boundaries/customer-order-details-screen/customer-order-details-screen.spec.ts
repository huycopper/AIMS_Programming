import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomerOrderDetailsScreen } from './customer-order-details-screen';

describe('CustomerOrderDetailsScreen', () => {
  let component: CustomerOrderDetailsScreen;
  let fixture: ComponentFixture<CustomerOrderDetailsScreen>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomerOrderDetailsScreen],
    }).compileComponents();

    fixture = TestBed.createComponent(CustomerOrderDetailsScreen);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
