import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VietqrPaymentScreen } from './vietqr-payment-screen';

describe('VietqrPaymentScreen', () => {
  let component: VietqrPaymentScreen;
  let fixture: ComponentFixture<VietqrPaymentScreen>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VietqrPaymentScreen],
    }).compileComponents();

    fixture = TestBed.createComponent(VietqrPaymentScreen);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
