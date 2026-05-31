import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuccessfulScreen } from './successful-screen';

describe('SuccessfulScreen', () => {
  let component: SuccessfulScreen;
  let fixture: ComponentFixture<SuccessfulScreen>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuccessfulScreen],
    }).compileComponents();

    fixture = TestBed.createComponent(SuccessfulScreen);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
