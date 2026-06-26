import { Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../control/auth.service';

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
  const errors: ValidationErrors = {};
  if (newPassword && confirm && newPassword !== confirm) {
    errors['mismatch'] = true;
  }
  return Object.keys(errors).length > 0 ? errors : null;
}

@Component({
  selector: 'app-reset-password-screen',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="reset-password-container">
      <section class="password-panel" aria-labelledby="reset-password-title">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Staff security</p>
            <h2 id="reset-password-title">Reset Password</h2>
          </div>
        </div>

        @if (tokenMissing()) {
          <div class="error" role="alert">
            Invalid or missing password reset token. Please request a new password reset link from your administrator.
          </div>
        } @else {
          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <label>
              <span>New Password</span>
              <input formControlName="newPassword" type="password" placeholder="New Password" autocomplete="new-password" aria-describedby="error-summary">
            </label>
            <div class="policy-hint">
              Password must be 8+ characters, include at least one uppercase letter, one lowercase letter, and one digit. No leading/trailing spaces.
            </div>
            @if (form.get('newPassword')?.hasError('passwordPolicy') && form.get('newPassword')?.dirty) {
              <div class="field-error">Password does not meet the requirements above.</div>
            }

            <label>
              <span>Confirm New Password</span>
              <input formControlName="confirmationPassword" type="password" placeholder="Confirm New Password" autocomplete="new-password" aria-describedby="error-summary">
            </label>
            @if (form.errors?.['mismatch'] && form.get('confirmationPassword')?.dirty) {
              <div class="field-error">Passwords do not match.</div>
            }

            <button class="submit-button" type="submit" [disabled]="isSubmitting() || form.invalid">
              {{ isSubmitting() ? 'Resetting...' : 'Reset Password' }}
            </button>
          </form>
        }

        <div id="error-summary" class="error-summary" role="alert">
        @if (errorMessage()) {
          <div class="error">{{ errorMessage() }}</div>
        }
        @if (successMessage()) {
          <div class="success">{{ successMessage() }}</div>
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

      .reset-password-container {
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
      .error,
      .success {
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

      .submit-button {
        margin-top: 6px;
        background: #0f766e;
        color: #ffffff;
      }

      .submit-button:hover:not(:disabled) {
        background: #115e59;
      }

      .policy-hint {
        font-size: 12px;
        color: #6b7280;
        line-height: 1.4;
        margin-top: -4px;
      }

      .field-error {
        font-size: 12px;
        color: #dc2626;
        font-weight: 600;
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

      .success {
        border: 1px solid #a7f3d0;
        border-radius: 6px;
        padding: 10px 12px;
        background: #ecfdf5;
        color: #065f46;
        font-size: 13px;
        font-weight: 700;
      }

      @media (max-width: 560px) {
        .reset-password-container {
          align-items: start;
          padding: 20px 14px;
        }

        .password-panel {
          padding: 24px 18px;
        }

        h2 {
          font-size: 24px;
        }
      }
    `,
  ]
})
export class ResetPasswordScreen implements OnInit {
  form = new FormGroup({
    newPassword: new FormControl('', { nonNullable: true, validators: [Validators.required, passwordPolicyValidator] }),
    confirmationPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  }, { validators: passwordMatchValidator });

  token = '';
  tokenMissing = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParams['token'] || '';
    if (!this.token) {
      this.tokenMissing.set(true);
    }
  }

  async submit() {
    if (this.form.invalid || this.isSubmitting() || !this.token) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const { newPassword } = this.form.getRawValue();

    try {
      await firstValueFrom(this.authService.completePasswordReset(this.token, newPassword));
      this.successMessage.set('Password reset successfully. Redirecting to login page...');
      setTimeout(() => {
        this.router.navigateByUrl('/staff/login');
      }, 2000);
    } catch (err: any) {
      this.errorMessage.set(err.error?.message || 'Failed to reset password. The link may have expired.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
