---
baseline_commit: 1f66d0370d4613f7b6cfdda9fb571b5f260e530a
---

# Story 5.5: Admin Account Status and Role Management

Status: in-progress

## Story

As an Administrator,
I want to modify the assigned roles of staff user accounts and manage their account status (deactivate, block, unblock),
so that I can enforce security policies and assign appropriate access privileges to staff members.

## Acceptance Criteria

1. **Modify assigned user roles**
   - **Given** I am an authenticated Administrator
   - **When** I submit an updated list of roles for a user
   - **Then** the backend validates that:
     - The roles array is not empty
     - Only supported roles (`ADMIN`, `PRODUCT_MANAGER`) are specified
   - **And** updates the user roles in a single database transaction
   - **And** records a `USER_ROLES_CHANGED` audit log
   - **And** sends an email notification to the user detailing their previous and new roles.
   - **And** the user's role removal takes effect immediately for protected requests, while new roles require a new login token.

2. **Manage user account status**
   - **Given** I am an authenticated Administrator
   - **When** I change a user account status (to `ACTIVE`, `DEACTIVATED`, or `BLOCKED`)
   - **Then** the backend updates the status in a transaction
   - **And** records the appropriate action type (`USER_DEACTIVATED`, `USER_BLOCKED`, or `USER_UNBLOCKED`) and optional reason in `admin_audit_logs`
   - **And** sends a status update notification email to the user.
   - **And** deactivated or blocked users are immediately rejected by backend auth guards and cannot log in or make request calls.

3. **Last Active Administrator Lockout Protection**
   - **Given** the system requires at least one active administrator
   - **When** I attempt to deactivate/block the last active administrator, or remove their `ADMIN` role
   - **Then** the backend rejects the request with a `BadRequestException` to prevent accidental system lockout.

4. **Frontend integration**
   - **Given** I am on the Admin User Directory screen
   - **When** I click "Edit Roles" for a user, a dialog allows me to select/deselect checkboxes and submit the changes
   - **When** I click "Block", "Unblock", "Deactivate", or "Activate" for a user, a confirmation dialog appears
   - **Then** submitting the request invokes the backend API, displays success/error banners, and refreshes the directory listing.

## Tasks / Subtasks

- [ ] Task 1: Backend implementation of role update API (`PUT /api/admin/users/:userId/roles`)
  - [ ] Implement `UpdateUserRolesDto` validation.
  - [ ] Update `AdminUsersService` with `updateUserRoles` method (transaction, audit log, email notification, lockout check).
  - [ ] Expose endpoint in `AdminUsersController` guarded by `Roles('ADMIN')`.
- [ ] Task 2: Backend implementation of status update API (`PATCH /api/admin/users/:userId/status`)
  - [ ] Implement `UpdateUserStatusDto` validation.
  - [ ] Update `AdminUsersService` with `updateUserStatus` method (transaction, audit log, email notification, lockout check).
  - [ ] Expose endpoint in `AdminUsersController` guarded by `Roles('ADMIN')`.
- [ ] Task 3: Frontend components and integration
  - [ ] Add `updateUserRoles` and `updateUserStatus` methods in `AdminUserService` (HttpClient calls).
  - [ ] Implement Edit Roles modal dialog in `AdminUsersScreen`.
  - [ ] Implement confirmation handling for status toggle actions.
- [ ] Task 4: Testing and validation
  - [ ] Add unit tests for lockout check, status transition, and role change methods.
  - [ ] Add controller specs.
  - [ ] Add frontend component specs.
  - [ ] Verify regression.
