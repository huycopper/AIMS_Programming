import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AdminUserService } from '../../control/admin-user.service';
import { AdminUserResponse } from '../../entity/admin-user.models';
import { AuthService } from '../../../auth/control/auth.service';

@Component({
  selector: 'app-admin-users-screen',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-users-screen.html',
  styleUrl: './admin-users-screen.css',
})
export class AdminUsersScreen implements OnInit {
  users: AdminUserResponse[] = [];
  search = '';
  statusFilter = '';
  roleFilter = '';
  page = 1;
  limit = 20;
  total = 0;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  isCreateModalOpen = false;
  createModel = { username: '', email: '', roleAdmin: false, rolePM: false };
  isSubmitting = false;
  modalErrorMessage = '';

  isEditRolesModalOpen = false;
  editRolesModel = { user: null as AdminUserResponse | null, roleAdmin: false, rolePM: false };

  constructor(
    private readonly adminUserService: AdminUserService,
    public readonly authService: AuthService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.adminUserService
      .getUsersList({
        page: this.page,
        limit: this.limit,
        search: this.search || undefined,
        status: this.statusFilter || undefined,
        role: this.roleFilter || undefined,
      })
      .subscribe({
        next: (result) => {
          this.users = result.items;
          this.page = result.page;
          this.limit = result.limit;
          this.total = result.total;
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.errorMessage = this.readError(error);
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  applyFilters(): void {
    this.page = 1;
    this.loadUsers();
  }

  clearFilters(): void {
    this.search = '';
    this.statusFilter = '';
    this.roleFilter = '';
    this.page = 1;
    this.loadUsers();
  }

  onPageChange(newPage: number): void {
    this.page = newPage;
    this.loadUsers();
  }

  get totalPages(): number {
    return Math.ceil(this.total / this.limit) || 1;
  }

  openCreateUser(): void {
    this.isCreateModalOpen = true;
    this.createModel = { username: '', email: '', roleAdmin: false, rolePM: false };
    this.modalErrorMessage = '';
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeCreateUser(): void {
    this.isCreateModalOpen = false;
  }

  submitCreateUser(event: Event): void {
    event.preventDefault();
    if (this.isSubmitting) return;

    const roles: string[] = [];
    if (this.createModel.roleAdmin) roles.push('ADMIN');
    if (this.createModel.rolePM) roles.push('PRODUCT_MANAGER');

    if (roles.length === 0) {
      this.modalErrorMessage = 'At least one role must be selected.';
      return;
    }

    this.isSubmitting = true;
    this.modalErrorMessage = '';

    this.adminUserService
      .createUser({
        username: this.createModel.username,
        email: this.createModel.email,
        roles,
      })
      .subscribe({
        next: (response) => {
          this.successMessage = `Staff account "${response.username}" created successfully. An email has been sent to ${response.email} to set up their password.`;
          this.isCreateModalOpen = false;
          this.isSubmitting = false;
          this.cdr.markForCheck();
          this.loadUsers();
        },
        error: (error) => {
          this.modalErrorMessage = this.readError(error);
          this.isSubmitting = false;
          this.cdr.markForCheck();
        },
      });
  }

  selectUser(user: AdminUserResponse): void {
    // Stub
  }

  editRoles(user: AdminUserResponse): void {
    this.editRolesModel = {
      user,
      roleAdmin: user.roles.includes('ADMIN'),
      rolePM: user.roles.includes('PRODUCT_MANAGER'),
    };
    this.isEditRolesModalOpen = true;
    this.modalErrorMessage = '';
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeEditRoles(): void {
    this.isEditRolesModalOpen = false;
  }

  submitEditRoles(event: Event): void {
    event.preventDefault();
    if (this.isSubmitting || !this.editRolesModel.user) return;

    const roles: string[] = [];
    if (this.editRolesModel.roleAdmin) roles.push('ADMIN');
    if (this.editRolesModel.rolePM) roles.push('PRODUCT_MANAGER');

    if (roles.length === 0) {
      this.modalErrorMessage = 'At least one role must be selected.';
      return;
    }

    this.isSubmitting = true;
    this.modalErrorMessage = '';

    this.adminUserService
      .updateUserRoles(this.editRolesModel.user.userId, roles)
      .subscribe({
        next: (response) => {
          this.successMessage = `Roles for user "${response.username}" updated successfully.`;
          this.isEditRolesModalOpen = false;
          this.isSubmitting = false;
          this.cdr.markForCheck();
          this.loadUsers();
        },
        error: (error) => {
          this.modalErrorMessage = this.readError(error);
          this.isSubmitting = false;
          this.cdr.markForCheck();
        },
      });
  }

  triggerPasswordReset(user: AdminUserResponse): void {
    const confirm = window.confirm(`Are you sure you want to trigger a password reset for user "${user.username}"?`);
    if (!confirm) return;

    this.errorMessage = '';
    this.successMessage = '';
    this.isLoading = true;

    this.adminUserService.triggerPasswordReset(user.userId).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.resetEmailQueued) {
          this.successMessage = `A password reset link has been successfully sent to ${response.email}.`;
        } else {
          this.successMessage = `Password reset token was generated, but the notification email failed to send to ${response.email}.`;
        }
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.errorMessage = this.readError(error);
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  toggleBlockUser(user: AdminUserResponse, block: boolean): void {
    const actionText = block ? 'block' : 'unblock';
    const confirm = window.confirm(`Are you sure you want to ${actionText} the user account "${user.username}"?`);
    if (!confirm) return;

    this.errorMessage = '';
    this.successMessage = '';
    this.isLoading = true;

    this.adminUserService
      .updateUserStatus(user.userId, block ? 'BLOCKED' : 'ACTIVE')
      .subscribe({
        next: (response) => {
          this.successMessage = `User account "${response.username}" has been ${block ? 'blocked' : 'unblocked'}.`;
          this.isLoading = false;
          this.cdr.markForCheck();
          this.loadUsers();
        },
        error: (error) => {
          this.errorMessage = this.readError(error);
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  toggleDeactivateUser(user: AdminUserResponse, deactivate: boolean): void {
    const actionText = deactivate ? 'deactivate' : 'activate';
    const confirm = window.confirm(`Are you sure you want to ${actionText} the user account "${user.username}"?`);
    if (!confirm) return;

    this.errorMessage = '';
    this.successMessage = '';
    this.isLoading = true;

    this.adminUserService
      .updateUserStatus(user.userId, deactivate ? 'DEACTIVATED' : 'ACTIVE')
      .subscribe({
        next: (response) => {
          this.successMessage = `User account "${response.username}" has been ${deactivate ? 'deactivated' : 'activated'}.`;
          this.isLoading = false;
          this.cdr.markForCheck();
          this.loadUsers();
        },
        error: (error) => {
          this.errorMessage = this.readError(error);
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  logout(): void {
    this.authService.logout();
  }

  private readError(error: any): string {
    const message = error?.error?.message;
    if (Array.isArray(message)) {
      return message.join(' ');
    }
    return message || 'Failed to fetch user directory.';
  }
}
