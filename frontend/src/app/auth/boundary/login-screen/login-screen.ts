import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { sanitizeReturnUrl } from '../../control/auth.guards.js';
import { AuthService } from '../../control/auth.service.js';

@Component({
  selector: 'app-login-screen',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <main class="login-shell">
      <section class="brand-panel" aria-label="AIMS staff portal">
        <a class="brand-link" href="/">AIMS</a>
        <div>
          <p class="eyebrow">Staff workspace</p>
          <h1>Manage products with a secure staff session.</h1>
        </div>
      </section>

      <section class="login-panel">
        <div class="panel-heading">
          <p class="eyebrow">Staff access</p>
          <h2>Sign in</h2>
        </div>

        @if (errorMessage()) {
          <div class="error-banner" role="alert">{{ errorMessage() }}</div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <label>
            <span>Username or email</span>
            <input
              formControlName="identifier"
              type="text"
              placeholder="staff@example.com"
              autocomplete="username"
              [class.invalid]="form.controls.identifier.invalid && form.controls.identifier.touched"
            />
          </label>
          @if (form.controls.identifier.invalid && form.controls.identifier.touched) {
            <p class="field-error">Username or email is required.</p>
          }

          <label>
            <span>Password</span>
            <input
              formControlName="password"
              type="password"
              placeholder="Enter your password"
              autocomplete="current-password"
              [class.invalid]="form.controls.password.invalid && form.controls.password.touched"
            />
          </label>
          @if (form.controls.password.invalid && form.controls.password.touched) {
            <p class="field-error">Password is required.</p>
          }

          <button type="submit" [disabled]="isSubmitting()">
            {{ isSubmitting() ? 'Signing in...' : 'Login' }}
          </button>
        </form>
      </section>
    </main>
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

      .login-shell {
        min-height: 100vh;
        display: grid;
        grid-template-columns: minmax(320px, 0.9fr) minmax(360px, 440px);
        align-items: stretch;
      }

      .brand-panel {
        min-height: 100vh;
        padding: 40px 48px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        background:
          linear-gradient(135deg, rgba(15, 118, 110, 0.95), rgba(23, 32, 42, 0.94)), #0f766e;
        color: #ffffff;
      }

      .brand-link {
        width: fit-content;
        color: #ffffff;
        text-decoration: none;
        font-size: 24px;
        font-weight: 800;
      }

      .brand-panel h1,
      .panel-heading h2,
      .eyebrow,
      .field-error {
        margin: 0;
      }

      .brand-panel h1 {
        max-width: 560px;
        margin-top: 12px;
        font-size: 40px;
        line-height: 1.08;
        font-weight: 800;
      }

      .eyebrow {
        color: #0f766e;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      .brand-panel .eyebrow {
        color: #b7fff5;
      }

      .login-panel {
        min-height: 100vh;
        padding: 48px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        background: #ffffff;
        border-left: 1px solid #dfe4ea;
      }

      .panel-heading {
        margin-bottom: 24px;
      }

      .panel-heading h2 {
        margin-top: 6px;
        font-size: 28px;
        line-height: 1.2;
      }

      form {
        display: grid;
        gap: 12px;
      }

      label {
        display: grid;
        gap: 7px;
        font-size: 13px;
        font-weight: 700;
        color: #4b5563;
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
          box-shadow 150ms ease;
      }

      input:focus {
        border-color: #0f766e;
        box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.16);
      }

      input.invalid {
        border-color: #dc2626;
        background: #fffafa;
      }

      button {
        min-height: 44px;
        margin-top: 6px;
        border: 0;
        border-radius: 6px;
        padding: 0 16px;
        background: #0f766e;
        color: #ffffff;
        font: inherit;
        font-weight: 800;
        cursor: pointer;
        transition:
          background 150ms ease,
          transform 150ms ease;
      }

      button:hover:not(:disabled) {
        background: #115e59;
        transform: translateY(-1px);
      }

      button:disabled {
        opacity: 0.58;
        cursor: not-allowed;
      }

      .error-banner {
        margin-bottom: 16px;
        border: 1px solid #fecaca;
        border-radius: 6px;
        padding: 10px 12px;
        background: #fee2e2;
        color: #991b1b;
        font-weight: 700;
      }

      .field-error {
        margin-top: -6px;
        color: #b91c1c;
        font-size: 12px;
        font-weight: 700;
      }

      @media (max-width: 760px) {
        .login-shell {
          grid-template-columns: 1fr;
        }

        .brand-panel {
          min-height: auto;
          padding: 24px;
          gap: 36px;
        }

        .brand-panel h1 {
          font-size: 28px;
        }

        .login-panel {
          min-height: auto;
          padding: 28px 24px 36px;
          border-left: 0;
        }
      }
    `,
  ],
})
export class LoginScreen {
  form = new FormGroup({
    identifier: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  async submit() {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const { identifier, password } = this.form.getRawValue();

    try {
      await firstValueFrom(this.authService.login(identifier, password));
      const params = new URLSearchParams(window.location.search);
      let returnUrl = sanitizeReturnUrl(params.get('returnUrl'));

      if (!returnUrl) {
        if (this.authService.hasRole('ADMIN')) {
          returnUrl = '/admin/users';
        } else if (this.authService.hasRole('PRODUCT_MANAGER')) {
          returnUrl = '/admin/products';
        } else {
          returnUrl = '/';
        }
      }

      await this.router.navigateByUrl(returnUrl);
    } catch (err: any) {
      this.errorMessage.set('Invalid credentials.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
