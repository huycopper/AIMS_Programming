import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../control/auth.service.js';

export function passwordPolicyValidator(control: AbstractControl): ValidationErrors | null {
  const val = control.value || '';
  if (!val) return null;

  const codePoints = Array.from(val).length;
  if (codePoints < 8) {
    return { passwordPolicy: true };
  }

  const bytes = new TextEncoder().encode(val).length;
  if (bytes > 72) {
    return { passwordPolicy: true };
  }

  if (!/[A-Z]/.test(val)) {
    return { passwordPolicy: true };
  }

  if (!/[a-z]/.test(val)) {
    return { passwordPolicy: true };
  }

  if (!/[0-9]/.test(val)) {
    return { passwordPolicy: true };
  }

  if (/^\s/.test(val) || /\s$/.test(val)) {
    return { passwordPolicy: true };
  }

  return null;
}

export function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const newPassword = group.get('newPassword')?.value;
  const confirm = group.get('confirmationPassword')?.value;
  const current = group.get('currentPassword')?.value;
  const errors: ValidationErrors = {};
  if (newPassword && confirm && newPassword !== confirm) {
    errors['mismatch'] = true;
  }
  if (newPassword && current && newPassword === current) {
    errors['samePassword'] = true;
  }
  return Object.keys(errors).length > 0 ? errors : null;
}

@Component({
  selector: 'app-change-password-screen',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="change-password-container">
      <section class="password-panel" aria-labelledby="change-password-title">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Staff account</p>
            <h2 id="change-password-title">Change Password</h2>
          </div>
          <button class="logout-button" type="button" (click)="logout()">Logout</button>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <label>
            <span>Current Password</span>
            <input formControlName="currentPassword" type="password" placeholder="Current Password" autocomplete="current-password" aria-describedby="error-summary">
          </label>

          <label>
            <span>New Password</span>
            <input formControlName="newPassword" type="password" placeholder="New Password" autocomplete="new-password" aria-describedby="error-summary">
          </label>

          <label>
            <span>Confirm New Password</span>
            <input formControlName="confirmationPassword" type="password" placeholder="Confirm New Password" autocomplete="new-password" aria-describedby="error-summary">
          </label>

          <button class="submit-button" type="submit" [disabled]="isSubmitting() || form.invalid">
            {{ isSubmitting() ? 'Changing...' : 'Change Password' }}
          </button>
        </form>

        <div id="error-summary" class="error-summary" role="alert">
        @if (form.errors?.['samePassword']) {
          <div class="error">New password must be different from current password.</div>
        }
        @if (form.errors?.['mismatch']) {
          <div class="error">Passwords do not match.</div>
        }
        @if (errorMessage()) {
          <div class="error">{{ errorMessage() }}</div>
        }
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        background: #f6f7f9;
        color: #17202a;
        font-family: Inter, Arial, sans-serif;
      }

      .change-password-container {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 32px 20px;
      }

      .password-panel {
        width: min(100%, 520px);
        border: 1px solid #dfe4ea;
        border-radius: 8px;
        padding: 32px;
        background: #ffffff;
        box-shadow: 0 18px 45px rgba(23, 32, 42, 0.08);
      }

      .panel-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 26px;
      }

      .eyebrow,
      h2,
      .error {
        margin: 0;
      }

      .eyebrow {
        color: #0f766e;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      h2 {
        margin-top: 6px;
        font-size: 28px;
        line-height: 1.2;
        font-weight: 800;
      }

      form {
        display: grid;
        gap: 14px;
      }

      label {
        display: grid;
        gap: 7px;
        color: #4b5563;
        font-size: 13px;
        font-weight: 700;
      }

      input {
        width: 100%;
        min-height: 44px;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 10px 12px;
        background: #ffffff;
        color: #17202a;
        font: inherit;
        outline: none;
        transition:
          border-color 150ms ease,
          box-shadow 150ms ease,
          background 150ms ease;
      }

      input:focus {
        border-color: #0f766e;
        box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.16);
      }

      input::placeholder {
        color: #94a3b8;
      }

      button {
        min-height: 42px;
        border: 0;
        border-radius: 6px;
        padding: 0 16px;
        font: inherit;
        font-weight: 800;
        cursor: pointer;
        transition:
          background 150ms ease,
          border-color 150ms ease,
          color 150ms ease,
          transform 150ms ease;
      }

      button:hover:not(:disabled) {
        transform: translateY(-1px);
      }

      button:disabled {
        opacity: 0.58;
        cursor: not-allowed;
      }

      .logout-button {
        border: 1px solid #cbd5e1;
        background: #ffffff;
        color: #334155;
      }

      .logout-button:hover {
        border-color: #94a3b8;
        background: #f8fafc;
      }

      .submit-button {
        margin-top: 6px;
        background: #0f766e;
        color: #ffffff;
      }

      .submit-button:hover:not(:disabled) {
        background: #115e59;
      }

      .error-summary {
        display: grid;
        gap: 8px;
        margin-top: 16px;
      }

      .error {
        border: 1px solid #fecaca;
        border-radius: 6px;
        padding: 10px 12px;
        background: #fee2e2;
        color: #991b1b;
        font-size: 13px;
        font-weight: 700;
      }

      @media (max-width: 560px) {
        .change-password-container {
          align-items: start;
          padding: 20px 14px;
        }

        .password-panel {
          padding: 24px 18px;
        }

        .panel-header {
          display: grid;
          gap: 14px;
        }

        h2 {
          font-size: 24px;
        }

        .logout-button {
          width: 100%;
        }
      }
    `,
  ]
})
export class ChangePasswordScreen {
  form = new FormGroup({
    currentPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    newPassword: new FormControl('', { nonNullable: true, validators: [Validators.required, passwordPolicyValidator] }),
    confirmationPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  }, { validators: passwordMatchValidator });

  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  logout() {
    this.authService.logout();
  }

  async submit() {
    if (this.form.invalid || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const { currentPassword, newPassword } = this.form.getRawValue();

    try {
      await firstValueFrom(this.authService.changePassword(currentPassword, newPassword));
      await this.router.navigateByUrl('/staff/login');
    } catch (err: any) {
      this.errorMessage.set(err.error?.message || 'Failed to change password.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
