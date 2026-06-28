---
baseline_commit: 1f66d0370d4613f7b6cfdda9fb571b5f260e530a
---

# Story 5.4: Admin User Creation and Initial Access

Status: in-progress

## Story

As an Administrator,
I want to create new staff user accounts and assign their initial roles,
so that new staff members can access their assigned features using secure initial credentials.

## Acceptance Criteria

1. **Transactional user creation and role assignment**
   - **Given** I am an authenticated Administrator
   - **When** I submit the username, email address, and a set of initial roles for a new staff member
   - **Then** the backend validates that:
     - The username is unique and not empty (1 to 100 characters)
     - The email is unique, valid, and not empty (1 to 255 characters)
     - The roles array is not empty and only contains supported role names (e.g. `ADMIN`, `PRODUCT_MANAGER`)
   - **And** the system creates the user account and user-role relations in a single database transaction.

2. **Secure credential establishment**
   - **Given** a new staff user account is created
   - **When** the transaction executes
   - **Then** the user status is set to `ACTIVE` by default
   - **And** the system does not prompt the Administrator for a password, nor does it display any temporary password
   - **And** the user password is set to an unusable random hash, while a temporary password setup token (securely hashed using SHA-256) is generated and stored in `password_reset_tokens`.

3. **Audit logging and user notification**
   - **Given** the database transaction completes successfully
   - **When** the new account is committed
   - **Then** the system writes a `USER_CREATED` audit log to `admin_audit_logs` containing:
     - The administrator who performed the action (`actor_user_id`)
     - The new user (`affected_user_id`)
     - Safe metadata (excluding secret tokens or password hashes)
   - **And** the backend invokes the notification control to send an email to the new user containing a secure password setup link.
   - **And** the audit log is updated with the email delivery result status.

4. **Frontend directory integration**
   - **Given** I am on the Admin User Directory screen
   - **When** I click the "+ Create User" button
   - **Then** a creation dialog or form is displayed capturing username, email, and checkboxes/multi-select for roles
   - **And** clicking "Submit" calls the create user API, handles duplicates/validation errors gracefully, and refreshes the directory listing upon success.

## Tasks / Subtasks

- [ ] Task 1: Backend implementation of `POST /api/admin/users`
  - [ ] Implement `CreateAdminUserDto` validation.
  - [ ] Update `AdminUsersService` with `createUser` method.
    - Transaction: create user (unusable password hash), save roles, generate reset token, write `USER_CREATED` audit log.
    - Post-transaction: send notification email, update notification status in log.
  - [ ] Expose endpoint in `AdminUsersController` guarded by `Roles('ADMIN')`.
- [ ] Task 2: Frontend integration in `AdminUsersScreen`
  - [ ] Implement `createUser` method in `AdminUserService`.
  - [ ] Add creation dialog or form in `AdminUsersScreen`.
  - [ ] Wire up form validation, request submission, and directory refresh.
- [ ] Task 3: Testing and verification
  - [ ] Write unit tests for `createUser` in `AdminUsersService`.
  - [ ] Write controller specs for `POST /api/admin/users`.
  - [ ] Write frontend component and service specs.
  - [ ] Verify build and run regression tests.
