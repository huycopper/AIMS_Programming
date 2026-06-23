// @vitest-environment jsdom

import '@angular/compiler';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../control/auth.service';
import { ChangePasswordScreen } from './change-password-screen/change-password-screen';
import { LoginScreen } from './login-screen/login-screen';

describe('staff authentication forms (Story 5.3 ATDD)', () => {
  const auth = {
    login: vi.fn(),
    changePassword: vi.fn(),
    hasRole: vi.fn(),
  };
  const router = { navigateByUrl: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, '', '/staff/login');
  });

  it('[P1] login shows one generic denial and never exposes backend account details', async () => {
    auth.login.mockReturnValue(
      throwError(() => ({ status: 401, error: { message: 'Account is BLOCKED' } })),
    );
    const screen = new LoginScreen(auth as unknown as AuthService, router as unknown as Router);
    screen.form.setValue({ identifier: 'staff', password: 'WrongPassword1' });

    await screen.submit();

    expect(screen.errorMessage()).toBe('Invalid credentials.');
    expect(screen.errorMessage()).not.toContain('BLOCKED');
  });

  it('[P1] login disables duplicate submission while the request is pending', () => {
    const pending = new Subject<unknown>();
    auth.login.mockReturnValue(pending);
    const screen = new LoginScreen(auth as unknown as AuthService, router as unknown as Router);
    screen.form.setValue({ identifier: 'staff', password: 'ValidPassword1' });
    void screen.submit();
    void screen.submit();
    expect(screen.isSubmitting()).toBe(true);
    expect(auth.login).toHaveBeenCalledTimes(1);
  });

  it('[P1] login sends product managers to product administration by default', async () => {
    auth.login.mockReturnValue(of(undefined));
    auth.hasRole.mockImplementation((role: string) => role === 'PRODUCT_MANAGER');
    const screen = new LoginScreen(auth as unknown as AuthService, router as unknown as Router);
    screen.form.setValue({ identifier: 'pm', password: 'ValidPassword1' });

    await screen.submit();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/admin/products');
  });

  it('[P1] login does not force admin-only staff to change password by default', async () => {
    auth.login.mockReturnValue(of(undefined));
    auth.hasRole.mockImplementation((role: string) => role === 'ADMIN');
    const screen = new LoginScreen(auth as unknown as AuthService, router as unknown as Router);
    screen.form.setValue({ identifier: 'admin', password: 'ValidPassword1' });

    await screen.submit();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
    expect(router.navigateByUrl).not.toHaveBeenCalledWith('/staff/change-password');
  });

  it('[P1] login still honors a sanitized return URL before role fallback', async () => {
    window.history.pushState({}, '', '/staff/login?returnUrl=/staff/change-password');
    auth.login.mockReturnValue(of(undefined));
    auth.hasRole.mockReturnValue(false);
    const screen = new LoginScreen(auth as unknown as AuthService, router as unknown as Router);
    screen.form.setValue({ identifier: 'staff', password: 'ValidPassword1' });

    await screen.submit();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/staff/change-password');
  });

  it.each([
    ['7 code points', 'Aa1aaaa'],
    ['73 UTF-8 bytes', `A1${'é'.repeat(35)}a`],
    ['no uppercase', 'lowercase1'],
    ['no lowercase', 'UPPERCASE1'],
    ['no digit', 'NoDigitsHere'],
    ['leading whitespace', ' ValidPassword1'],
    ['trailing whitespace', 'ValidPassword1 '],
  ])('[P1] rejects new-password policy boundary: %s', async (_case, newPassword) => {
    const screen = new ChangePasswordScreen(
      auth as unknown as AuthService,
      router as unknown as Router,
    );
    screen.form.setValue({
      currentPassword: 'CurrentPassword1',
      newPassword,
      confirmationPassword: newPassword,
    });
    await screen.submit();
    expect(screen.form.controls.newPassword.invalid).toBe(true);
    expect(auth.changePassword).not.toHaveBeenCalled();
  });

  it('[P1] requires matching confirmation but never sends confirmation to the API', async () => {
    auth.changePassword.mockReturnValue(of(undefined));
    const screen = new ChangePasswordScreen(
      auth as unknown as AuthService,
      router as unknown as Router,
    );
    screen.form.setValue({
      currentPassword: 'CurrentPassword1',
      newPassword: 'NewValidPassword2',
      confirmationPassword: 'NewValidPassword2',
    });

    await screen.submit();

    expect(auth.changePassword).toHaveBeenCalledWith('CurrentPassword1', 'NewValidPassword2');
    expect(auth.changePassword.mock.calls[0]).not.toContain('confirmationPassword');
  });
});
