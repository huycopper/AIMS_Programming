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
  return newPassword === confirm ? null : { mismatch: true };
}

@Component({
  selector: 'app-change-password-screen',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="change-password-container">
      <h2>Change Password</h2>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <input formControlName="currentPassword" type="password" placeholder="Current Password" autocomplete="current-password">
        <input formControlName="newPassword" type="password" placeholder="New Password" autocomplete="new-password">
        <input formControlName="confirmationPassword" type="password" placeholder="Confirm New Password" autocomplete="new-password">
        <button type="submit" [disabled]="isSubmitting() || form.invalid">Change Password</button>
      </form>
      @if (errorMessage()) {
        <div class="error">{{ errorMessage() }}</div>
      }
    </div>
  `
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
