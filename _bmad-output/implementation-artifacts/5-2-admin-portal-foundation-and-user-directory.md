---
baseline_commit: 1f66d0370d4613f7b6cfdda9fb571b5f260e530a
---

# Story 5.2: Admin Portal Foundation and User Directory

Status: review

## Story

As an Administrator,
I want a guarded administration portal with a user directory,
so that I can inspect staff accounts before performing sensitive account-management actions.

## Acceptance Criteria

1. **Guarded portal shell and access control**
   - **Given** Story 5.3 authentication and RBAC primitives are complete
   - **When** an authenticated user with role `ADMIN` navigates to `/admin/users`
   - **Then** Angular allows access to the admin routes and the NestJS backend authorizes the corresponding endpoints with `ADMIN` role metadata
   - **And** a user without `ADMIN` (such as `PRODUCT_MANAGER`) receives a `403 Forbidden` response and access-denied UI (navigates to `/forbidden`), while unauthenticated users are redirected to staff login flow `/staff/login?returnUrl=/admin/users`.

2. **User Directory and credentials confidentiality**
   - **Given** the Administrator opens the user directory
   - **When** the directory loads
   - **Then** the system lists user accounts from `users` with username, email, status, and assigned roles
   - **And** the system never returns `users.password_hash`, plaintext passwords, reset tokens, or secret values in directory queries or detail view.

3. **Reusable audit logging and notifications controls**
   - **Given** sensitive administration actions will be implemented
   - **When** the admin module foundation is added
   - **Then** the sprint establishes a reusable audit-log control and affected-user notification control for account creation, role changes, status changes, and password reset events
   - **And** any additive persistence needed for audit logs (`admin_audit_logs`) or password-reset tokens (`password_reset_tokens`) is created in PostgreSQL.

## Tasks / Subtasks

- [x] Task 1: Backend foundation and entities
  - [x] Create `AdminModule` in `backend/src/admin/admin.module.ts` and register it in `AppModule`.
  - [x] Add `AdminAuditLog` entity for `admin_audit_logs` table (fields: `audit_log_id`, `actor_user_id`, `affected_user_id`, `action_type`, `action_time`, `metadata_before`, `metadata_after`, `reason`, `notification_email`, `notification_status`).
  - [x] Add `PasswordResetToken` entity for `password_reset_tokens` table (fields: `reset_token_id`, `user_id`, `token_hash`, `expires_at`, `used_at`, `created_by`, `created_at`).
  - [x] Register new entities in `AdminModule` and `AppModule` for TypeORM auto-synchronization.

- [x] Task 2: Reusable Controls (Audit & Notification)
  - [x] Implement `AdminAuditLogControl` with `recordSensitiveAction` method (writes to `admin_audit_logs`, ensures no sensitive password hash/token plaintext is written to log or database metadata).
  - [x] Implement `AdminNotificationControl` integrating with the existing `EmailBoundary` (methods: `sendAccountCreated`, `sendRolesChanged`, `sendStatusChanged`, `sendPasswordResetTriggered`).
  - [x] Implement `PasswordResetTokenControl` to generate cryptographically secure tokens and store/verify their hashes with expiry and single-use validation.

- [x] Task 3: Backend User Directory APIs
  - [x] Implement `GET /api/admin/users` query with pagination, search, status, and role filters. Ensure role join and distinct user items.
  - [x] Implement `GET /api/admin/users/:userId` to fetch detailed user information.
  - [x] Decorate both endpoints with `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles('ADMIN')`.
  - [x] Exclude `passwordHash` and other secrets from all responses.

- [x] Task 4: Frontend Admin Directory Screen
  - [x] Create `AdminUserService` in `frontend/src/app/admin/control/admin-user.service.ts` to call backend admin APIs.
  - [x] Create `AdminUsersScreen` component in `frontend/src/app/admin/boundary/admin-users-screen/` with search input, status/role filters, and paginated table.
  - [x] Add route `/admin/users` in `app.routes.ts` protected by `authGuard` and `roleGuard` with `roles: ['ADMIN']`.
  - [x] Update login fallback redirect logic to send `ADMIN` user to `/admin/users`.

- [x] Task 5: Testing and validation
  - [x] Write backend unit tests for `AdminAuditLogControl`, `AdminNotificationControl`, and `PasswordResetTokenControl`.
  - [x] Write backend controller and service tests for user directory query and detail endpoints.
  - [x] Write frontend component and service tests for `AdminUsersScreen` and `AdminUserService`.

## Dev Agent Record

### Implementation Plan
- Create entities `AdminAuditLog` and `PasswordResetToken`.
- Implement controls in NestJS: `AdminAuditLogControl`, `AdminNotificationControl`, `PasswordResetTokenControl`.
- Implement API controller `AdminUsersController` and service `AdminUsersService`.
- Build Angular component `AdminUsersScreen` under `frontend/src/app/admin/boundary/admin-users-screen`.
- Add test suites and run build/tests.

### Debug Log
- Fixed NestJS build issue ENOTEMPTY by running build asynchronously.
- Fixed Vitest/Jest mock incompatibility in frontend test specs.
- Fixed Angular HTML syntax for braces.

### Completion Notes
- All backend entities and controllers successfully registered.
- User directory query and detail endpoints authenticated and role-guarded by ADMIN.
- Admin portal shell routing and redirect fallback correctly wired.
- Tests (20 backend, 9 frontend) pass successfully.

### File List
- `backend/src/admin/admin.module.ts`
- `backend/src/admin/entity/admin-audit-log.entity.ts`
- `backend/src/admin/entity/password-reset-token.entity.ts`
- `backend/src/admin/entity/admin-action-types.ts`
- `backend/src/admin/control/admin-audit-log.control.ts`
- `backend/src/admin/control/admin-notification.control.ts`
- `backend/src/admin/control/password-reset-token.control.ts`
- `backend/src/admin/control/admin-users.service.ts`
- `backend/src/admin/boundary/admin-users.controller.ts`
- `backend/src/admin/dto/query-admin-users.dto.ts`
- `frontend/src/app/admin/entity/admin-user.models.ts`
- `frontend/src/app/admin/control/admin-user.service.ts`
- `frontend/src/app/admin/boundary/admin-users-screen/admin-users-screen.ts`
- `frontend/src/app/admin/boundary/admin-users-screen/admin-users-screen.html`
- `frontend/src/app/admin/boundary/admin-users-screen/admin-users-screen.css`
- `frontend/src/app/app.routes.ts`
- `frontend/src/app/auth/boundary/login-screen/login-screen.ts`
- `backend/src/admin/control/admin-audit-log.control.spec.ts`
- `backend/src/admin/control/password-reset-token.control.spec.ts`
- `backend/src/admin/control/admin-notification.control.spec.ts`
- `backend/src/admin/control/admin-users.service.spec.ts`
- `backend/src/admin/boundary/admin-users.controller.spec.ts`
- `frontend/src/app/admin/control/admin-user.service.spec.ts`
- `frontend/src/app/admin/boundary/admin-users-screen/admin-users-screen.spec.ts`

## Story Completion Status
Status: review
