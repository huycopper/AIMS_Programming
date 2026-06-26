import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResetPasswordScreen } from './reset-password-screen';
import { of, throwError } from 'rxjs';

describe('ResetPasswordScreen', () => {
  let component: ResetPasswordScreen;
  let activatedRoute: any;
  let authService: any;
  let router: any;

  beforeEach(() => {
    activatedRoute = {
      snapshot: {
        queryParams: { token: 'valid-token' },
      },
    };

    authService = {
      completePasswordReset: vi.fn(),
    };

    router = {
      navigateByUrl: vi.fn(),
    };

    component = new ResetPasswordScreen(activatedRoute, authService, router);
  });

  it('should initialize and read token from route query params', () => {
    component.ngOnInit();
    expect(component.token).toBe('valid-token');
    expect(component.tokenMissing()).toBe(false);
  });

  it('should detect missing token on init', () => {
    activatedRoute.snapshot.queryParams.token = '';
    component.ngOnInit();
    expect(component.tokenMissing()).toBe(true);
  });

  it('should reject invalid password policy', () => {
    component.ngOnInit();
    component.form.setValue({
      newPassword: 'short',
      confirmationPassword: 'short',
    });
    expect(component.form.controls.newPassword.invalid).toBe(true);
  });

  it('should reject mismatching confirmation password', () => {
    component.ngOnInit();
    component.form.setValue({
      newPassword: 'ValidPassword1',
      confirmationPassword: 'DifferentPassword1',
    });
    expect(component.form.errors?.['mismatch']).toBe(true);
    expect(component.form.invalid).toBe(true);
  });

  it('should submit reset password on success and navigate to login', async () => {
    component.ngOnInit();
    authService.completePasswordReset.mockReturnValue(of(undefined));
    vi.useFakeTimers();

    component.form.setValue({
      newPassword: 'NewValidPassword1',
      confirmationPassword: 'NewValidPassword1',
    });

    await component.submit();

    expect(authService.completePasswordReset).toHaveBeenCalledWith('valid-token', 'NewValidPassword1');
    expect(component.successMessage()).toContain('Password reset successfully');

    vi.advanceTimersByTime(2000);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/staff/login');
    vi.useRealTimers();
  });

  it('should handle submission failure errors from backend', async () => {
    component.ngOnInit();
    authService.completePasswordReset.mockReturnValue(
      throwError(() => ({ error: { message: 'Token expired.' } }))
    );

    component.form.setValue({
      newPassword: 'NewValidPassword1',
      confirmationPassword: 'NewValidPassword1',
    });

    await component.submit();

    expect(component.errorMessage()).toBe('Token expired.');
    expect(component.isSubmitting()).toBe(false);
  });
});
