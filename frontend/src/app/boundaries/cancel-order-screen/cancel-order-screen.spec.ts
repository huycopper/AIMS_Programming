import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CancelOrderScreen } from './cancel-order-screen';

describe('CancelOrderScreen', () => {
  let component: CancelOrderScreen;
  let fixture: ComponentFixture<CancelOrderScreen>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CancelOrderScreen],
    }).compileComponents();

    fixture = TestBed.createComponent(CancelOrderScreen);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
