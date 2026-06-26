---
source_of_truth:
  highest: Context/AIMS-ProblemStatement-ver3.1.1.md
  references:
    - project-context.md
    - _bmad-output/planning-artifacts/epics.md
    - Context/DatabaseDescription.md
    - Context/Group20-ClassDesignSpecification.md
    - Context/ScreenSpecifications.md
    - Context/ScreenStandardizationRequirements.md
generated: 2026-06-26
project: AIMS_Programming
scope: Administrator use case implementation plan
---

# Administrator Use Case Implementation Plan

## Source Priority and Planning Notes

The highest authority is `Context/AIMS-ProblemStatement-ver3.1.1.md`. Derived files are used only when they do not conflict with the problem statement.

Administrator requirements from the problem statement:

- Administrators manage user accounts according to least privilege and data protection standards.
- Administrators can create, view, deactivate, block, unblock user accounts, and assign or modify roles.
- Each user can have multiple roles, such as administrator or product manager.
- Administrators may trigger password reset processes but cannot access users' actual passwords, because all passwords are securely hashed.
- Sensitive administrative actions, such as email updates or password resets, must be logged and automatically notified to affected users.
- Administrators and product managers must log in to access role-specific features and can change their own passwords.

Current implementation context:

- Story 5.3 exists and is marked `in-progress` in `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- The backend already has `AuthModule`, `JwtAuthGuard`, `RolesGuard`, auth endpoints, and `User`, `Role`, `UserRole` entities.
- Angular already has login, change-password, forbidden screen, auth service, interceptor, and route guards.
- Product and order admin routes already use `PRODUCT_MANAGER`.
- There is no dedicated admin module, user directory UI, user management API, sensitive admin audit entity, or password reset token entity yet.
- `DatabaseDescription.md` defines `users`, `roles`, and `user_roles`, but does not define admin audit or reset-token tables. Because the problem statement explicitly requires sensitive admin action logging and password reset processes, additive persistence is required and must be documented in implementation notes.

## Target Implementation Order

1. Close the Story 5.3 auth/RBAC gate or verify it is already clean.
2. Add admin foundation: module, shared DTO conventions, audit log persistence, affected-user notification control, and reset-token persistence.
3. Add backend user directory APIs.
4. Add frontend admin portal shell and user directory screen.
5. Add create-user backend API and frontend form.
6. Add role-management backend API and frontend controls.
7. Add account-status backend API and frontend controls.
8. Add admin-triggered password reset and user-facing reset completion.
9. Add cross-flow audit and notification hardening, then run full focused regression.

## Story ADM-00: Auth/RBAC Completion Gate

### Goal

Ensure the existing staff authentication and RBAC foundation is stable before implementing administrator user management.

### Dependencies

- Existing Story 5.3 implementation.
- Existing auth and product/order guarded routes.

### Expected Files or Modules

- `backend/src/auth/auth.module.ts`
- `backend/src/auth/boundary/auth.controller.ts`
- `backend/src/auth/control/auth.service.ts`
- `backend/src/auth/control/jwt-auth.guard.ts`
- `backend/src/auth/control/roles.guard.ts`
- `backend/src/auth/control/roles.decorator.ts`
- `backend/src/user/entities/user.entity.ts`
- `backend/src/user/entities/role.entity.ts`
- `backend/src/user/entities/user-role.entity.ts`
- `frontend/src/app/auth/control/auth.service.ts`
- `frontend/src/app/auth/control/auth.interceptor.ts`
- `frontend/src/app/auth/control/auth.guards.ts`
- `frontend/src/app/app.routes.ts`
- Existing auth, product admin, and order admin tests.

### Tasks

1. Review `_bmad-output/implementation-artifacts/5-3-staff-authentication-password-management.md` and confirm whether all review findings are truly patched in code.
2. Verify `JwtAuthGuard` rejects inactive, blocked, malformed-subject, and removed-role cases using current database state.
3. Verify `RolesGuard` returns `403` only for active authenticated users lacking the required role.
4. Verify frontend auth restoration happens before guarded admin navigation.
5. Confirm `ADMIN` and `PRODUCT_MANAGER` role names are exact and case-sensitive.
6. Confirm protected product and order APIs no longer accept identity from `X-AIMS-User-Id`.
7. Update `sprint-status.yaml` only after tests prove Story 5.3 is ready for review or done.

### Acceptance Criteria

- Login by username or email works for active staff with at least one supported role.
- Inactive or blocked users cannot log in and cannot use existing tokens.
- Role removal takes effect immediately for protected requests because the backend intersects JWT roles with current database roles.
- `ADMIN` can be used as route/API role metadata for subsequent admin stories.
- Frontend route guard can protect `/admin/users` with `ADMIN`.

### Tests to Run

- Backend:
  - `cd backend && npm test -- auth`
  - `cd backend && npm run test:e2e -- authentication-password-management`
  - `cd backend && npm run build`
- Frontend:
  - `cd frontend && npm test -- --include "**/auth/**/*.spec.ts"`
  - `cd frontend && npm run build`

### Risks to Check

- Story 5.3 status is still `in-progress`; do not build admin management on an unverified guard.
- `synchronize: true` may hide schema drift in development but can still break tests if enum names or join tables are wrong.
- A user with newly added roles must log in again to get an expanded JWT.

## Story ADM-01: Admin Backend Foundation, Audit Log, and Notification Controls

### Goal

Create the reusable backend foundation for all administrator actions: module boundaries, safe DTO/error conventions, sensitive audit logging, affected-user email notification, and secure reset-token persistence.

### Dependencies

- ADM-00.
- Existing `users`, `roles`, and `user_roles` schema.
- Existing email boundary in `backend/src/pay-order/notification/boundary/email`.

### Expected Files or Modules

- Add `backend/src/admin/admin.module.ts`
- Add `backend/src/admin/boundary/admin-users.controller.ts`
- Add `backend/src/admin/control/admin-users.service.ts`
- Add `backend/src/admin/control/admin-audit-log.control.ts`
- Add `backend/src/admin/control/admin-notification.control.ts`
- Add `backend/src/admin/control/password-reset-token.control.ts`
- Add `backend/src/admin/entity/admin-audit-log.entity.ts`
- Add `backend/src/admin/entity/password-reset-token.entity.ts`
- Add `backend/src/admin/entity/admin-action-types.ts`
- Add `backend/src/admin/dto/*.dto.ts`
- Update `backend/src/app.module.ts`
- Reuse `backend/src/pay-order/notification/boundary/email/email.boundary.ts`
- Reuse/export `PayOrderNotificationModule` or extract a shared notification module if needed.

### Proposed Additive Persistence

Add `admin_audit_logs`:

- `audit_log_id UUID primary key`
- `actor_user_id UUID not null references users(user_id) on delete restrict`
- `affected_user_id UUID references users(user_id) on delete set null`
- `action_type VARCHAR(100) not null`
- `action_time TIMESTAMP not null`
- `metadata_before JSONB null`
- `metadata_after JSONB null`
- `reason TEXT null`
- `notification_email VARCHAR(255) null`
- `notification_status VARCHAR(50) not null default 'NOT_ATTEMPTED'`

Add `password_reset_tokens`:

- `reset_token_id UUID primary key`
- `user_id UUID not null references users(user_id) on delete cascade`
- `token_hash TEXT not null`
- `expires_at TIMESTAMP not null`
- `used_at TIMESTAMP null`
- `created_by UUID references users(user_id) on delete set null`
- `created_at TIMESTAMP not null`
- `unique(token_hash)`

These tables are justified by the problem statement's admin audit and password reset requirements, because the current database reference does not provide equivalent tables.

### Tasks

1. Create `AdminModule` and import `TypeOrmModule.forFeature([User, Role, UserRole, AdminAuditLog, PasswordResetToken])`.
2. Register `AdminModule` in `AppModule`.
3. Add action type constants:
   - `USER_CREATED`
   - `USER_ROLES_CHANGED`
   - `USER_DEACTIVATED`
   - `USER_BLOCKED`
   - `USER_UNBLOCKED`
   - `PASSWORD_RESET_TRIGGERED`
   - `USER_EMAIL_UPDATED` reserved for future email-update behavior.
4. Implement `AdminAuditLogControl.recordSensitiveAction(input)` with safe metadata only:
   - actor user id
   - affected user id
   - action type
   - before and after snapshots that exclude `password_hash`, reset tokens, JWTs, Authorization headers, and plaintext passwords
   - timestamp
5. Implement `AdminNotificationControl` using existing `EmailBoundary`.
6. Design notification methods:
   - `sendAccountCreated`
   - `sendRolesChanged`
   - `sendStatusChanged`
   - `sendPasswordResetTriggered`
7. Implement `PasswordResetTokenControl`:
   - generate cryptographically random token
   - store only a hash
   - apply expiration from config, default local/test value only
   - single-use semantics through `used_at`
8. Define common admin response projections:
   - `AdminUserSummary`
   - `AdminUserDetail`
   - `AdminAuditLogSummary`
9. Ensure all admin endpoints use `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles('ADMIN')`.

### Acceptance Criteria

- `AdminModule` can be imported without breaking existing auth/product/order/customer flows.
- Sensitive admin actions can be recorded transactionally by later stories.
- Affected-user notification can be attempted without exposing secrets.
- Password reset tokens are never stored or logged in plaintext.
- No admin projection includes `passwordHash`, reset token hashes, JWTs, or secret values.

### Tests to Add or Update

- `backend/src/admin/control/admin-audit-log.control.spec.ts`
- `backend/src/admin/control/admin-notification.control.spec.ts`
- `backend/src/admin/control/password-reset-token.control.spec.ts`
- `backend/src/admin/entity/*.spec.ts` only if entity mapping needs targeted verification.

### Tests to Run

- `cd backend && npm test -- admin`
- `cd backend && npm test -- auth`
- `cd backend && npm run build`

### Risks to Check

- Email sending currently can throw if `EMAIL_ENABLED=true` and SMTP is unavailable; admin actions should decide whether notification failure rolls back or is recorded as failed. Recommended: user/account state commits only after audit is recorded; email failure is captured in audit metadata/status and surfaced safely, unless a course requirement demands strict rollback.
- `synchronize: true` can create new tables automatically in dev, but implementation should still document the additive schema.
- Avoid circular dependency between `AdminModule`, `AuthModule`, and notification modules.

## Story ADM-02: Backend User Directory APIs

### Goal

Allow administrators to view staff accounts and roles without exposing credentials or secrets.

### Dependencies

- ADM-00.
- ADM-01.

### Expected Files or Modules

- `backend/src/admin/boundary/admin-users.controller.ts`
- `backend/src/admin/control/admin-users.service.ts`
- `backend/src/admin/dto/query-admin-users.dto.ts`
- `backend/src/admin/dto/admin-user.response.ts`
- Existing `backend/src/user/entities/user.entity.ts`
- Existing `backend/src/user/entities/role.entity.ts`

### API Contract

`GET /api/admin/users`

Query parameters:

- `page` optional, default `1`
- `limit` optional, default `20`, max `100`
- `search` optional, matches username or email
- `status` optional: `ACTIVE`, `DEACTIVATED`, `BLOCKED`
- `role` optional: `ADMIN`, `PRODUCT_MANAGER`

Response:

```json
{
  "items": [
    {
      "userId": "uuid",
      "username": "staff",
      "email": "staff@example.com",
      "status": "ACTIVE",
      "roles": ["ADMIN"]
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1
}
```

`GET /api/admin/users/:userId`

Response:

```json
{
  "userId": "uuid",
  "username": "staff",
  "email": "staff@example.com",
  "status": "ACTIVE",
  "roles": ["ADMIN", "PRODUCT_MANAGER"]
}
```

### Tasks

1. Add query DTO with explicit validation and safe default pagination.
2. Add response mapper that whitelists fields.
3. Implement directory query with role join and deterministic sort by username/email.
4. Implement detail lookup by UUID.
5. Return `404` for missing user detail.
6. Return `401` for unauthenticated and `403` for non-admin authenticated users.
7. Ensure `passwordHash` remains `select: false` and never added to directory queries.

### Acceptance Criteria

- Admin can list users with username, email, status, and roles.
- Admin can filter/search the directory.
- Non-admin staff receives `403`; anonymous requests receive `401`.
- Responses never include `password_hash`, `passwordHash`, reset token data, or secret fields.

### Tests to Add or Update

- `backend/src/admin/boundary/admin-users.controller.spec.ts`
- `backend/src/admin/control/admin-users.service.spec.ts`
- `backend/test/admin-user-directory.e2e-spec.ts`

### Tests to Run

- `cd backend && npm test -- admin-users`
- `cd backend && npm run test:e2e -- admin-user-directory`
- `cd backend && npm run build`

### Risks to Check

- Case-sensitive username/email uniqueness means search should not imply case-insensitive identity rules.
- Directory filters must not accidentally return duplicate rows for multi-role users.
- Do not implement customer login; customers remain unauthenticated.

## Story ADM-03: Frontend Admin Portal Shell and User Directory

### Goal

Add the administrator-facing route and user directory UI.

### Dependencies

- ADM-00.
- ADM-02 backend API.

### Expected Files or Modules

- Add `frontend/src/app/admin/entity/admin-user.models.ts`
- Add `frontend/src/app/admin/control/admin-user.service.ts`
- Add `frontend/src/app/admin/boundary/admin-users-screen/admin-users-screen.ts`
- Add `frontend/src/app/admin/boundary/admin-users-screen/admin-users-screen.html`
- Add `frontend/src/app/admin/boundary/admin-users-screen/admin-users-screen.css`
- Add optional child components:
  - `admin-user-detail-panel`
  - `admin-user-role-editor`
  - `admin-user-status-actions`
- Update `frontend/src/app/app.routes.ts`
- Update login fallback in `frontend/src/app/auth/boundary/login-screen/login-screen.ts` if necessary.

### UX Tasks

1. Add `/admin/users` route protected by `authGuard` and `roleGuard` with `roles: ['ADMIN']`.
2. Add an admin directory screen with:
   - search input
   - status filter
   - role filter
   - paginated table/list
   - clear empty/loading/error states
   - per-user action affordances reserved for later stories
3. Use existing styling conventions from product/order management screens.
4. Display roles as readable labels while preserving exact backend values.
5. Add a reachable navigation path after admin login:
   - Admin-only users should land on `/admin/users`.
   - Product-manager-only users should land on existing product or order admin route.
   - Dual-role users may land on `/admin/users` or a simple admin hub; choose `/admin/users` for this scope.
6. Ensure `403` navigates to `/forbidden` without clearing session.

### Acceptance Criteria

- `ADMIN` can open `/admin/users` and see a user directory.
- `PRODUCT_MANAGER` without `ADMIN` is blocked from `/admin/users`.
- Anonymous users are redirected to `/staff/login?returnUrl=/admin/users`.
- Directory UI never renders password, reset token, or secret fields.
- Loading, empty, validation, and backend error states are visible and accessible.

### Tests to Add or Update

- `frontend/src/app/admin/control/admin-user.service.spec.ts`
- `frontend/src/app/admin/boundary/admin-users-screen/admin-users-screen.spec.ts`
- `frontend/src/app/auth/control/auth.guards.atdd.spec.ts`
- Existing login-screen tests for role-aware fallback.

### Tests to Run

- `cd frontend && npm test -- --include "**/admin/**/*.spec.ts"`
- `cd frontend && npm test -- --include "**/auth/**/*.spec.ts"`
- `cd frontend && npm run build`

### Risks to Check

- Do not create a marketing/landing page. First admin screen should be the usable directory.
- Text in tables/actions must remain readable at common desktop widths.
- Frontend hiding actions is not authorization; backend `ADMIN` guards remain mandatory.

## Story ADM-04: Create User Account and Initial Access

### Goal

Allow administrators to create staff users, assign initial roles, notify the affected user, and audit the sensitive action.

### Dependencies

- ADM-01.
- ADM-02.
- ADM-03 for UI.

### Expected Files or Modules

Backend:

- `backend/src/admin/dto/create-admin-user.dto.ts`
- `backend/src/admin/boundary/admin-users.controller.ts`
- `backend/src/admin/control/admin-users.service.ts`
- `backend/src/admin/control/admin-audit-log.control.ts`
- `backend/src/admin/control/admin-notification.control.ts`
- `backend/src/admin/control/password-reset-token.control.ts`
- `backend/src/user/entities/user.entity.ts`
- `backend/src/user/entities/role.entity.ts`
- `backend/src/user/entities/user-role.entity.ts`

Frontend:

- `frontend/src/app/admin/boundary/create-admin-user-dialog/*` or embed in `admin-users-screen`
- `frontend/src/app/admin/control/admin-user.service.ts`
- `frontend/src/app/admin/entity/admin-user.models.ts`

### API Contract

`POST /api/admin/users`

Request:

```json
{
  "username": "new-manager",
  "email": "new-manager@example.com",
  "roles": ["PRODUCT_MANAGER"]
}
```

Response `201 Created`:

```json
{
  "userId": "uuid",
  "username": "new-manager",
  "email": "new-manager@example.com",
  "status": "ACTIVE",
  "roles": ["PRODUCT_MANAGER"]
}
```

Recommended initial credential flow:

- Generate a random unusable internal password hash or create the account with a generated secret that is never exposed.
- Generate a password setup/reset token.
- Store only the reset token hash.
- Email a setup link to the affected user.
- Do not display temporary passwords to administrators.

### Tasks

1. Validate username:
   - required
   - 1 to 100 characters
   - exact uniqueness according to database rules
2. Validate email:
   - required
   - valid email shape
   - 1 to 255 characters
   - exact uniqueness according to database rules
3. Validate roles:
   - required non-empty array
   - exact role values from supported roles
   - deduplicate before persistence
4. In one transaction:
   - create `users` row
   - create `user_roles` rows
   - create reset/setup token hash
   - record `USER_CREATED` audit log with safe metadata
5. After transaction:
   - send account-created/setup email to affected user
   - update audit notification status or record notification result safely
6. Refresh frontend directory after success.
7. Show safe validation errors for duplicates, invalid email, missing roles, unsupported roles, or persistence failure.

### Acceptance Criteria

- Administrator can create a unique staff account with at least one role.
- The user receives only selected roles.
- Creation and initial role assignment are transactional.
- No plaintext password is stored, returned, logged, or displayed.
- Affected user receives email notification for initial access.
- Sensitive action is logged with actor, affected user, timestamp, action type, and safe metadata.

### Tests to Add or Update

- Backend unit tests for DTO validation and transaction behavior.
- Backend e2e tests for admin create user success/failure.
- Frontend service/component tests for create-user form validation and success refresh.

### Tests to Run

- `cd backend && npm test -- admin-users`
- `cd backend && npm run test:e2e -- admin-user-management`
- `cd frontend && npm test -- --include "**/admin/**/*.spec.ts"`
- `cd backend && npm run build`
- `cd frontend && npm run build`

### Risks to Check

- The problem statement says administrators cannot access actual passwords. Temporary passwords shown to admins would violate this.
- If email is disabled locally, tests should assert email boundary invocation or simulated log behavior without requiring SMTP.
- Decide and document whether account creation succeeds when email notification fails. Recommended: account creation succeeds, audit records notification failure, and UI shows a warning.

## Story ADM-05: Assign and Modify User Roles

### Goal

Allow administrators to add or remove supported roles for existing users while preserving least privilege, auditability, and affected-user notification.

### Dependencies

- ADM-01.
- ADM-02.
- ADM-03.

### Expected Files or Modules

Backend:

- `backend/src/admin/dto/update-user-roles.dto.ts`
- `backend/src/admin/boundary/admin-users.controller.ts`
- `backend/src/admin/control/admin-users.service.ts`
- `backend/src/admin/control/admin-audit-log.control.ts`
- `backend/src/admin/control/admin-notification.control.ts`

Frontend:

- `frontend/src/app/admin/boundary/admin-user-role-editor/*`
- `frontend/src/app/admin/control/admin-user.service.ts`
- `frontend/src/app/admin/entity/admin-user.models.ts`

### API Contract

`PUT /api/admin/users/:userId/roles`

Request:

```json
{
  "roles": ["ADMIN", "PRODUCT_MANAGER"]
}
```

Response:

```json
{
  "userId": "uuid",
  "username": "staff",
  "email": "staff@example.com",
  "status": "ACTIVE",
  "roles": ["ADMIN", "PRODUCT_MANAGER"]
}
```

### Tasks

1. Validate target user exists.
2. Validate requested roles are non-empty, supported, exact values.
3. Load current role set.
4. Compute added and removed roles for audit metadata.
5. In one transaction:
   - replace join rows in `user_roles`
   - record `USER_ROLES_CHANGED` audit log
6. Send affected-user notification after commit.
7. Refresh frontend detail/directory state.
8. Make current role removal effective immediately through existing guard role intersection.
9. Document token behavior: newly added roles require the affected user to obtain a new token.

### Acceptance Criteria

- Admin can assign `ADMIN`, `PRODUCT_MANAGER`, or both.
- Multi-role users receive union of permissions after re-login for added roles.
- Removed roles stop working immediately on protected backend requests.
- Audit log records before and after role sets without secrets.
- Affected user receives email notification.

### Tests to Add or Update

- Backend service tests for role replacement and role diff metadata.
- Backend e2e tests:
  - admin changes roles
  - non-admin cannot change roles
  - removed role loses access immediately
  - added role requires new token
- Frontend role editor tests.

### Tests to Run

- `cd backend && npm test -- admin-users`
- `cd backend && npm run test:e2e -- admin-user-management`
- `cd backend && npm run test:e2e -- authentication-password-management`
- `cd frontend && npm test -- --include "**/admin/**/*.spec.ts"`
- `cd frontend && npm run build`

### Risks to Check

- Last-admin lockout is not explicitly specified in the problem statement, but is operationally dangerous. Recommended guardrail: prevent removing the last active `ADMIN` role and prevent an admin from removing their own last `ADMIN` role unless another active admin remains.
- Existing JWTs do not gain added roles until re-login; frontend should not imply instant added access.
- Role names must remain exact and case-sensitive.

## Story ADM-06: Deactivate, Block, and Unblock User Accounts

### Goal

Allow administrators to change account status and have the change enforced immediately by authentication and authorization guards.

### Dependencies

- ADM-00.
- ADM-01.
- ADM-02.
- ADM-03.

### Expected Files or Modules

Backend:

- `backend/src/admin/dto/update-user-status.dto.ts`
- `backend/src/admin/boundary/admin-users.controller.ts`
- `backend/src/admin/control/admin-users.service.ts`
- `backend/src/admin/control/admin-audit-log.control.ts`
- `backend/src/admin/control/admin-notification.control.ts`
- `backend/src/user/entities/user.entity.ts`

Frontend:

- `frontend/src/app/admin/boundary/admin-user-status-actions/*`
- `frontend/src/app/admin/control/admin-user.service.ts`
- `frontend/src/app/admin/entity/admin-user.models.ts`

### API Contract

`PATCH /api/admin/users/:userId/status`

Request:

```json
{
  "status": "BLOCKED",
  "reason": "Policy violation"
}
```

Supported statuses:

- `ACTIVE`
- `DEACTIVATED`
- `BLOCKED`

Response:

```json
{
  "userId": "uuid",
  "username": "staff",
  "email": "staff@example.com",
  "status": "BLOCKED",
  "roles": ["PRODUCT_MANAGER"]
}
```

### Tasks

1. Validate target user exists.
2. Validate requested status is one of `ACTIVE`, `DEACTIVATED`, `BLOCKED`.
3. Treat unblock as status transition to `ACTIVE`.
4. Optionally require or capture `reason` for audit clarity.
5. In one transaction:
   - update `users.status`
   - record `USER_DEACTIVATED`, `USER_BLOCKED`, or `USER_UNBLOCKED` audit log
6. Send affected-user notification after commit.
7. Frontend:
   - show status badge
   - show actions appropriate to current status
   - use confirm dialogs for sensitive changes
   - refresh directory/detail after success

### Acceptance Criteria

- Admin can deactivate, block, and unblock user accounts.
- Blocked or deactivated users cannot log in.
- Existing tokens for blocked or deactivated users are rejected on subsequent protected requests.
- Audit log records actor, affected user, old status, new status, timestamp, action type, and reason if supplied.
- Affected user receives email notification.

### Tests to Add or Update

- Backend unit tests for valid and invalid status transitions.
- Backend e2e tests for login and protected-request rejection after block/deactivate.
- Frontend tests for visible actions and confirmation flow.

### Tests to Run

- `cd backend && npm test -- admin-users`
- `cd backend && npm run test:e2e -- admin-user-management`
- `cd backend && npm run test:e2e -- authentication-password-management`
- `cd frontend && npm test -- --include "**/admin/**/*.spec.ts"`
- `cd frontend && npm run build`

### Risks to Check

- Self-block or self-deactivation can strand the current admin session. Recommended guardrail: reject status changes that would disable the acting administrator unless another active admin can reverse it.
- Deactivation vs blocking semantics are not deeply defined by the problem statement. Keep both as access-denying statuses, with labels explaining operational intent only in UI.
- Role changes and status changes should be separate actions to keep audit trail clear.

## Story ADM-07: Admin-Triggered Password Reset

### Goal

Allow administrators to trigger a password reset process without exposing the user's current password, a temporary plaintext password, or reusable secrets.

### Dependencies

- ADM-00.
- ADM-01.
- ADM-02.
- ADM-03.

### Expected Files or Modules

Backend:

- `backend/src/admin/dto/trigger-password-reset.dto.ts`
- `backend/src/admin/boundary/admin-users.controller.ts`
- `backend/src/admin/control/admin-users.service.ts`
- `backend/src/admin/control/password-reset-token.control.ts`
- `backend/src/admin/control/admin-audit-log.control.ts`
- `backend/src/admin/control/admin-notification.control.ts`
- `backend/src/auth/boundary/auth.controller.ts`
- `backend/src/auth/boundary/dto/complete-password-reset.dto.ts`
- `backend/src/auth/control/auth.service.ts` or a dedicated reset control exported from `AdminModule`
- `backend/src/admin/entity/password-reset-token.entity.ts`

Frontend:

- `frontend/src/app/admin/boundary/admin-user-password-reset-action/*`
- `frontend/src/app/admin/control/admin-user.service.ts`
- Add `frontend/src/app/auth/boundary/reset-password-screen/reset-password-screen.ts`
- Add reset route in `frontend/src/app/app.routes.ts`
- Update auth models/service for reset completion.

### API Contracts

Admin trigger:

`POST /api/admin/users/:userId/password-reset`

Response:

```json
{
  "userId": "uuid",
  "email": "staff@example.com",
  "resetEmailQueued": true
}
```

User completion:

`POST /api/auth/password-reset/complete`

Request:

```json
{
  "token": "opaque-token-from-email",
  "newPassword": "ValidPassword1"
}
```

Response:

- `204 No Content` on success.

### Tasks

1. Admin trigger:
   - validate target user exists
   - generate random reset token
   - store token hash with expiry and `used_at = null`
   - invalidate or supersede prior unused tokens for the same user if simpler
   - record `PASSWORD_RESET_TRIGGERED` audit log
   - email reset link to affected user
2. User completion:
   - hash incoming token and find unused, unexpired token
   - load associated active user
   - validate new password using the Story 5.3 policy
   - bcrypt-hash new password
   - atomically update password and mark token used
   - do not authenticate automatically unless explicitly chosen; recommended: redirect to login
3. Frontend admin:
   - expose reset action on user detail/list
   - confirm before triggering
   - show success/warning result without showing token
4. Frontend user:
   - add reset-password screen with new password and confirmation
   - never log or store token outside route/form state
   - redirect to login after success

### Acceptance Criteria

- Admin can trigger password reset for a user.
- Admin never sees current password, temporary password, raw token, token hash, or reusable secret.
- Reset token is hashed at rest, expires, and can be used only once.
- Affected user receives email notification.
- Audit log records actor, affected user, timestamp, action type, and safe metadata.
- User can complete reset with valid token and policy-compliant password.
- Old password fails and new password succeeds after reset.

### Tests to Add or Update

- Backend unit tests for token generation, hashing, expiry, single-use behavior.
- Backend e2e tests for trigger and completion flows.
- Frontend admin reset-action tests.
- Frontend reset-password screen tests.

### Tests to Run

- `cd backend && npm test -- password-reset`
- `cd backend && npm run test:e2e -- admin-password-reset`
- `cd backend && npm run test:e2e -- authentication-password-management`
- `cd frontend && npm test -- --include "**/auth/**/*.spec.ts"`
- `cd frontend && npm test -- --include "**/admin/**/*.spec.ts"`
- `cd backend && npm run build`
- `cd frontend && npm run build`

### Risks to Check

- Password reset completion endpoint is public by necessity; token entropy, hashing, expiry, and single-use semantics are critical.
- Do not reuse JWT secret as token hash secret. Use a dedicated hash approach or HMAC secret from config.
- Avoid leaking whether a token exists, expired, or was used through overly specific public errors.

## Story ADM-08: Audit Log Visibility for Admin Actions

### Goal

Expose sensitive admin action audit logs to administrators for traceability and verification.

### Dependencies

- ADM-01.
- At least one mutating story ADM-04, ADM-05, ADM-06, or ADM-07.

### Expected Files or Modules

Backend:

- `backend/src/admin/boundary/admin-audit.controller.ts`
- `backend/src/admin/control/admin-audit-query.service.ts`
- `backend/src/admin/dto/query-admin-audit-logs.dto.ts`
- `backend/src/admin/entity/admin-audit-log.entity.ts`

Frontend:

- Optional for first pass: embed recent audit entries in user detail panel.
- Or add `frontend/src/app/admin/boundary/admin-audit-log-screen/*`.
- Update `frontend/src/app/admin/control/admin-user.service.ts` or add `admin-audit.service.ts`.

### API Contract

`GET /api/admin/audit-logs`

Query parameters:

- `page`
- `limit`
- `actorUserId`
- `affectedUserId`
- `actionType`

Response includes safe metadata only.

### Tasks

1. Add admin-only audit query endpoint.
2. Support filtering by actor, affected user, and action type.
3. Return safe metadata and notification result.
4. Add recent audit log panel to user detail or a dedicated route.
5. Ensure no secret fields can enter audit metadata through mapper tests.

### Acceptance Criteria

- Admin can inspect sensitive admin actions.
- Audit entries include actor, affected user, timestamp, action type, safe before/after metadata, and notification status.
- Non-admin receives `403`; anonymous receives `401`.
- Password hashes, raw tokens, JWTs, and plaintext passwords never appear.

### Tests to Add or Update

- Backend audit query unit/e2e tests.
- Frontend audit log component/service tests if UI is included in this story.

### Tests to Run

- `cd backend && npm test -- admin-audit`
- `cd backend && npm run test:e2e -- admin-user-management`
- `cd frontend && npm test -- --include "**/admin/**/*.spec.ts"`
- `cd backend && npm run build`
- `cd frontend && npm run build`

### Risks to Check

- Audit metadata can accidentally become a secret sink. All audit writes should pass through one sanitizer.
- Audit logs should not be editable through admin APIs.
- Avoid overloading product histories; admin audit is a separate concern.

## Cross-Story Backend API Summary

Protected by `JwtAuthGuard` and `RolesGuard` with `ADMIN`:

- `GET /api/admin/users`
- `GET /api/admin/users/:userId`
- `POST /api/admin/users`
- `PUT /api/admin/users/:userId/roles`
- `PATCH /api/admin/users/:userId/status`
- `POST /api/admin/users/:userId/password-reset`
- `GET /api/admin/audit-logs`

Public but token-protected by reset token:

- `POST /api/auth/password-reset/complete`

Existing:

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/change-password`

## Cross-Story Frontend Route Summary

Existing:

- `/staff/login`
- `/staff/change-password`
- `/forbidden`
- `/admin/products` with `PRODUCT_MANAGER`
- `/admin/orders` with `PRODUCT_MANAGER`

Add:

- `/admin/users` with `ADMIN`
- Optional `/admin/audit-logs` with `ADMIN`
- `/staff/reset-password` or `/staff/reset-password/:token` for reset completion

Recommended login fallback:

- Saved safe `returnUrl` first.
- Else if user has `ADMIN`, route to `/admin/users`.
- Else if user has `PRODUCT_MANAGER`, route to `/admin/products` or `/admin/orders`.
- Else route to `/forbidden` or `/`.

## Global Acceptance Criteria for the Administrator Use Case

- Administrators can access a guarded admin portal.
- Non-admin users cannot access admin user-management APIs or screens.
- Administrators can view the user directory without secrets.
- Administrators can create staff accounts and assign initial roles.
- Administrators can modify roles for existing users.
- Administrators can deactivate, block, and unblock accounts.
- Administrators can trigger password reset without seeing or generating visible passwords.
- Affected users receive email notifications for sensitive admin actions.
- Sensitive admin actions are audit logged.
- Backend RBAC remains authoritative even when frontend hides or shows controls incorrectly.
- Public customer catalog/cart/order/payment flows remain unauthenticated.

## Global Regression Test Plan

Backend focused:

- `cd backend && npm test -- auth`
- `cd backend && npm test -- admin`
- `cd backend && npm run test:e2e -- authentication-password-management`
- `cd backend && npm run test:e2e -- admin-user-directory`
- `cd backend && npm run test:e2e -- admin-user-management`
- `cd backend && npm run test:e2e -- admin-password-reset`
- `cd backend && npm run build`

Frontend focused:

- `cd frontend && npm test -- --include "**/auth/**/*.spec.ts"`
- `cd frontend && npm test -- --include "**/admin/**/*.spec.ts"`
- `cd frontend && npm run build`

Regression guardrails:

- Product admin still requires `PRODUCT_MANAGER`.
- Order admin still requires `PRODUCT_MANAGER`.
- Customer `GET /api/products`, `GET /api/products/random`, cart, order placement, payment, and customer order links remain public where previously public.
- Email-disabled local mode should not fail tests that do not require real SMTP.

## Implementation Risks and Decisions to Validate

1. Story 5.3 is still marked `in-progress`; verify or complete it first.
2. Admin audit and password reset token persistence is absent from `DatabaseDescription.md`; implementation must document the additive schema and trace it to the problem statement.
3. Notification failure semantics must be chosen consistently. Recommended: commit the admin state change and audit record, capture notification failure, and show safe warning.
4. Last-admin lockout is not explicitly specified but should be prevented for operational safety.
5. Self-disable, self-block, and self-role-removal can strand the acting administrator; implement guardrails or document intentional behavior.
6. Added roles require new tokens under current RBAC design; removed roles take effect immediately.
7. Public password-reset completion endpoint must avoid token enumeration and secret leakage.
8. Audit metadata must be sanitized centrally.
9. `synchronize: true` is acceptable for current repo pattern, but new entities should be designed so migrations can be added later without schema ambiguity.
10. Use exact database column names from `DatabaseDescription.md` for existing tables: `user_id`, `username`, `email`, `password_hash`, `status`, `role_id`, `role_name`.

## Suggested Codex Dev Sequence

Use these as direct implementation prompts:

1. "Implement ADM-00 verification and fix any failing Story 5.3 auth/RBAC tests without changing admin user-management scope."
2. "Implement ADM-01 admin backend foundation, audit log entity/control, notification control, and password reset token control."
3. "Implement ADM-02 backend admin user directory APIs with ADMIN-only guards and tests."
4. "Implement ADM-03 frontend admin user directory route/screen/service with ADMIN-only guard tests."
5. "Implement ADM-04 create user account flow with transactional roles, reset/setup email, audit log, and UI form."
6. "Implement ADM-05 assign/modify user roles with audit, notification, immediate role-removal enforcement, and UI controls."
7. "Implement ADM-06 deactivate/block/unblock user with audit, notification, guard enforcement, and UI controls."
8. "Implement ADM-07 admin-triggered password reset and user reset completion flow."
9. "Implement ADM-08 audit log query/view and run the full global regression plan."
