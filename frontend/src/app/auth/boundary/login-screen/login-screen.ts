import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../control/auth.service.js';

@Component({
  selector: 'app-login-screen',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="login-container">
      <h2>Staff Login</h2>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <input formControlName="identifier" type="text" placeholder="Username or Email" autocomplete="username">
        <input formControlName="password" type="password" placeholder="Password" autocomplete="current-password">
        <button type="submit" [disabled]="isSubmitting()">Login</button>
      </form>
      @if (errorMessage()) {
        <div class="error">{{ errorMessage() }}</div>
      }
    </div>
  `
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
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const { identifier, password } = this.form.getRawValue();

    try {
      await firstValueFrom(this.authService.login(identifier, password));
      const params = new URLSearchParams(window.location.search);
      const returnUrl = params.get('returnUrl') || '/admin/products';
      await this.router.navigateByUrl(returnUrl);
    } catch (err: any) {
      this.errorMessage.set('Invalid credentials.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
