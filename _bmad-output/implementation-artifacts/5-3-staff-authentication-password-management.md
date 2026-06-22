---
baseline_commit: 3fa1d0336ef6a3981b269f6b622e963ad2ab9ea8
---

# Story 5.3: Staff Authentication & Password Management

Status: review

## Story

As an Administrator or Product Manager,
I want to authenticate with my staff account and change my own password,
so that I can securely access only the administration capabilities granted by all of my assigned roles.

## Acceptance Criteria

1. **Active staff login by username or email**
   - **Given** an `ACTIVE` staff account with a bcrypt password hash and at least one assigned supported role
   - **When** the staff member submits the correct password and either their unique username or unique email
   - **Then** AIMS authenticates the password with bcrypt and returns a signed, expiring JWT access token
   - **And** the token contains `sub` equal to `users.user_id`, `roles` containing every assigned role name, and standard `iat`/`exp` claims
   - **And** the response includes the non-sensitive current-user projection needed by the Angular application.

2. **Credentials and passwords remain confidential**
   - **Given** any login or password-change attempt
   - **When** AIMS processes or reports the request
   - **Then** plaintext passwords are never persisted, returned, placed in JWT claims, or written to application/test logs
   - **And** every newly stored password uses bcrypt with the configured work factor.

3. **Generic login denial**
   - **Given** an unknown identifier, wrong password, password input exceeding bcrypt's 72 UTF-8-byte boundary, account with no supported staff role, or account status `DEACTIVATED` or `BLOCKED`
   - **When** login is attempted
   - **Then** AIMS returns the same `401 Unauthorized` security response and issues no token
   - **And** neither the status code, response body, nor observable password-comparison path reveals which condition failed.

4. **Authenticated session restoration and expiry**
   - **Given** a valid, unexpired bearer token
   - **When** Angular restores the session after a page reload or requests the current principal
   - **Then** the application restores the user identity and all assigned roles
   - **And** protected requests include `Authorization: Bearer <token>`
   - **And** each protected backend request rejects a now-`DEACTIVATED` or `BLOCKED` token subject even when the JWT is otherwise valid
   - **And** an absent, malformed, invalid-signature, expired, or non-active-subject token results in `401`, clears client authentication state, and redirects protected navigation to login with a safe return URL.

5. **Multi-role RBAC and least privilege**
   - **Given** an authenticated staff member with one or more roles
   - **When** they access a protected NestJS endpoint or Angular administration route
   - **Then** the NestJS JWT guard authenticates the request and the roles guard authorizes against all roles on the principal
   - **And** a route that accepts multiple roles uses any-match semantics, while the user's effective capability set is the union of all assigned role capabilities
   - **And** `ADMIN` is the role required by Story 5.2 user/account/status/role-management endpoints
   - **And** `PRODUCT_MANAGER` is the role required by Story 4.1 product administration/history endpoints and Story 5.1 order processing endpoints
   - **And** a user with both roles can access both sets, a user lacking the required role receives `403 Forbidden`, and Angular hiding/guarding a route never substitutes for backend authorization.
   - **And** an `ACTIVE` authenticated user whose effective roles lack the required role receives `403`; effective roles are the intersection of signed JWT roles and current database assignments, so removals take effect immediately while additions require a newly issued token.

6. **Replace the Story 4.1 temporary identity adapter**
   - **Given** the existing product administration APIs use `X-AIMS-User-Id`
   - **When** this story is complete
   - **Then** every product administration/history operation obtains `performedBy` from the verified JWT principal (`sub`) and requires `PRODUCT_MANAGER`
   - **And** the Angular product service and product management screen no longer ask for, persist, or send `aims_product_manager_user_id` or `X-AIMS-User-Id`
   - **And** `X-AIMS-User-Id` is ignored as an identity source: without a valid bearer token the operation returns `401`, and with a valid wrong-role token it returns `403`, regardless of the header value
   - **And** unauthenticated customer product browse/search routes remain public and unchanged.

7. **Self-service password change**
   - **Given** an authenticated `ACTIVE` Administrator or Product Manager
   - **When** they submit the correct current password and a valid new password
   - **Then** AIMS hashes and atomically replaces `users.password_hash`
   - **And** the old password fails subsequent login while the new password succeeds
   - **And** Angular clears the existing session after success and redirects to login so the staff member authenticates with the new password.

8. **Password-change failure is non-mutating**
   - **Given** an incorrect current password, invalid new password, unchanged password, non-active account, or invalid/expired bearer token
   - **When** a password change is requested
   - **Then** AIMS rejects the request using the API error contract below
   - **And** `users.password_hash` is not changed and no partial write occurs.

9. **Password policy is consistent on both tiers**
   - **Given** a new password
   - **When** frontend or backend validation runs
   - **Then** it must contain at least 8 Unicode code points and at most 72 UTF-8 bytes, contain at least one ASCII uppercase letter, one ASCII lowercase letter, and one digit, contain no leading/trailing Unicode whitespace, and differ from the current password
   - **And** neither tier trims, normalizes, truncates, or otherwise mutates a password before policy validation, comparison, or hashing
   - **And** the backend remains authoritative and reports validation failures without echoing either password
   - **And** the confirmation field is required and matched by Angular before submission but is not sent to the API.

10. **Deterministic staff seed for development and tests**
    - **Given** a developer or automated test initializes the database
    - **When** the staff seed is run with configured seed credentials
    - **Then** roles `ADMIN` and `PRODUCT_MANAGER` exist and one active account for each role exists with bcrypt-hashed passwords
    - **And** rerunning the seed is idempotent, unique username/email constraints remain valid, and no plaintext/default production credential is committed or logged
    - **And** an idempotent rerun preserves existing account password hashes and statuses rather than silently rotating credentials or reactivating an account
    - **And** tests may create an additional active dual-role account to prove union-of-role authorization.

## Tasks / Subtasks

- [x] Task 1: Add user/role persistence mappings and staff seed support (AC: 1-3, 7-10)
  - [x] Add TypeORM `User`, `Role`, and `UserRole` mappings for the existing `users`, `roles`, and `user_roles` schema, preserving snake_case column names, UUID keys, enum values, unique constraints, composite key, and many-to-many semantics.
  - [x] Register only the entities required by authentication. Do not add unrelated Story 5.2 account-management/audit behavior.
  - [x] Extend the existing seed entry point or add an auth-focused seed invoked by `npm run seed`. Run staff seeding only when all six staff seed variables are present; otherwise preserve product seeding and skip staff seeding with a credential-free message.
  - [x] In one transaction, upsert the two roles, insert a missing configured user with a bcrypt hash, and ensure the composite role join exists. On rerun, verify the configured password against the existing hash without replacing it and require the account to remain `ACTIVE`. Fail and roll back—without logging credentials—on password mismatch, non-active status, partial configuration, duplicate configured usernames/emails, or username/email ownership conflicts.
  - [x] Do not introduce a migration framework solely for this story: the repository currently uses `synchronize: true`. If migrations are introduced independently before implementation, create an additive migration instead and do not recreate/drop populated tables.

- [x] Task 2: Implement the NestJS auth boundary and control layer (AC: 1-4, 7-9)
  - [x] Add validated login and change-password DTOs. Trim only the identifier and match username/email exactly, because the current PostgreSQL `UNIQUE` constraints are case-sensitive and do not guarantee a unique case-insensitive match. Never trim or normalize passwords.
  - [x] Query the user with all roles in one authentication flow, perform bcrypt comparison, require `ACTIVE` plus at least one supported role, and build the safe response/principal.
  - [x] Reject login passwords over 72 UTF-8 bytes through the same generic `401` path; do not pass them to bcrypt or permit prefix-equivalent authentication. Use a startup-created dummy bcrypt hash at the configured cost so every denied login still performs one bcrypt comparison without generating a hash per request.
  - [x] Configure `JwtModule` asynchronously from `ConfigService`, sign only the approved claims, and implement login, current-principal, and change-password endpoints.
  - [x] Re-read the user/account status for password change rather than trusting roles/status solely from the token.
  - [x] Make password replacement a compare-and-swap/locked transactional update after all validation succeeds (`user_id`, `ACTIVE`, and the previously read hash must still match); require exactly one affected row so concurrent changes cannot overwrite a newer password.

- [x] Task 3: Implement reusable JWT authentication and multi-role authorization (AC: 3-6, 8)
  - [x] Add a bearer-token JWT guard that verifies signature/expiration, loads the token subject's current account status and role assignments on every protected request, rejects missing/non-active subjects with `401`, and exposes a typed principal whose effective roles are the intersection of signed roles and current assignments.
  - [x] Add role metadata/decorator and a roles guard with any-match authorization semantics. An authenticated route with no role metadata (for example `/api/auth/me`) remains authenticated-only; every capability endpoint must declare its required role(s), and a declared non-match denies with `403`.
  - [x] Standardize missing/malformed/expired/wrong-signature token and missing/non-active subject as `401`; use `403` only when an `ACTIVE`, authenticated principal lacks required role metadata. Never turn role denial into logout.
  - [x] Apply `PRODUCT_MANAGER` authorization to `GET /api/products/admin`, `GET /api/products/:productId/histories`, `POST /api/products`, `PATCH /api/products/:productId`, and `POST /api/products/bulk-delete`; replace header-derived `performedBy` with `principal.userId`.
  - [x] Remove `ProductService.assertProductManagerIdentity()` and its raw `users` SQL query. Authorization belongs to guards; product controls retain the `performedBy` UUID only for history/audit writes.
  - [x] Keep `GET /api/products` and `GET /api/products/random` public; do not apply a global guard that accidentally protects customer flows.

- [x] Task 4: Implement Angular authentication state and API integration (AC: 1-4, 7-9)
  - [x] Add typed auth models and a root-provided auth service/control for login, logout, session restoration, current principal, role checks, and password change.
  - [x] Store the access token in `sessionStorage` under one auth-owned key; never store passwords. Treat malformed/expired stored data as logged out.
  - [x] Register a functional HTTP interceptor with `withInterceptors`; attach the bearer token only when the request URL has the exact configured AIMS API origin (not substring/prefix lookalikes). Clear/redirect on protected API `401` without creating redirect loops for login or repeated redirects.
  - [x] Keep `403` distinct from authentication expiry so the UI can show an access-denied state without destroying a valid session.

- [x] Task 5: Add Angular login, password-change, and route-guard boundaries (AC: 1, 3-9)
  - [x] Add standalone login and change-password screens using reactive forms, masked password inputs, submit loading state, field validation, generic login failure messaging, and accessible error summaries.
  - [x] Add `/staff/login` and authenticated `/staff/change-password` routes plus functional authentication/role guards. Accept a return URL only when URL parsing proves it is a same-origin application path; reject protocol-relative (`//...`), absolute, encoded, backslash, and other external/open-redirect forms.
  - [x] Protect `/admin/products` with `PRODUCT_MANAGER`, remove its manual manager-ID field/storage behavior, and send its requests through the interceptor.
  - [x] Reserve guard metadata patterns for Story 5.1 `PRODUCT_MANAGER` and Story 5.2 `ADMIN` routes; do not create those stories' screens or business APIs here.
  - [x] Expose a reachable change-password action for authenticated staff and a logout action; successful password change must clear the session.
  - [x] After login, use a valid saved return URL; otherwise send principals with `PRODUCT_MANAGER` to `/admin/products` and ADMIN-only principals to `/staff/change-password` until Story 5.2 supplies its landing page.

- [x] Task 6: Add security-focused backend tests (AC: 1-10)
  - [x] Unit-test exact identifier lookup (including case variants), all-role loading/deduplication, bcrypt success/failure, over-72-byte and dummy-hash paths, account statuses, no-role accounts, token claims/expiry/configuration failure, and sanitized responses.
  - [x] Unit-test password policy boundaries, correct/incorrect current password, unchanged password, hash replacement, and no update on every failure path.
  - [x] Unit-test JWT guard and roles guard for missing/malformed/expired/wrong-signature tokens, deleted/non-active subjects, role match/mismatch, dual-role union, current-role removal, newly added role absent from the token, no required-role metadata, and the exact `401` versus `403` matrix.
  - [x] Update product controller/service tests to use an authenticated principal and prove the temporary header cannot grant access.

- [x] Task 7: Add backend integration/e2e tests (AC: 1-10)
  - [x] Run destructive e2e setup only with `NODE_ENV=test` against a dedicated test database selected through the existing DB configuration; fail closed rather than cleaning a development database. Seed uniquely named active ADMIN, PRODUCT_MANAGER, dual-role, BLOCKED, DEACTIVATED, wrong-password, and no-role fixtures, and clean dependent product/history rows before user fixtures.
  - [x] Exercise login by username and email, generic denial cases, JWT-protected `GET /api/auth/me`, role-protected product administration, and public product regressions.
  - [x] Exercise successful/failed password changes and verify the stored hash changes only after success, contains no plaintext, and old/new login behavior is correct.
  - [x] Verify idempotent seed execution preserves existing hashes/statuses and uniqueness behavior without printing configured passwords.

- [x] Task 8: Add Angular tests (AC: 1, 3-9)
  - [x] Test auth-state login/logout/restore/expiry and role-union helpers.
  - [x] Test interceptor inclusion/exclusion, protected-request `401`, login `401`, and `403` handling.
  - [x] Test auth guard and role guard redirects, safe return URL, ADMIN-only, PRODUCT_MANAGER-only, dual-role, and unassigned-role paths.
  - [x] Test login and change-password form validation, loading, generic/specific safe errors, success navigation, and session clearing.
  - [x] Update product management tests to prove bearer auth is used and the legacy manager-ID input/header/storage is absent.

## Dev Notes

### API Contracts

All endpoints use JSON. Password fields must be marked sensitive in any logging/serialization tooling.

`POST /api/auth/login` (public)

```json
{
  "identifier": "admin-or-email@example.com",
  "password": "<redacted>"
}
```

- `identifier`: required string, trimmed, 1-255 characters; exact match against unique `username` or `email`.
- `password`: required string, accepted without trimming/normalization. Reject values over 72 UTF-8 bytes through the generic invalid-credentials path while still performing the dummy comparison. A character-count-only DTO decorator is insufficient for this byte boundary.
- `200 OK`:

```json
{
  "accessToken": "<signed JWT>",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "user": {
    "userId": "uuid",
    "username": "staff-name",
    "email": "staff@example.com",
    "roles": ["ADMIN", "PRODUCT_MANAGER"]
  }
}
```

- `401 Unauthorized` for every credential/status/no-supported-role denial:

```json
{ "statusCode": 401, "code": "INVALID_CREDENTIALS", "message": "Invalid credentials." }
```

`GET /api/auth/me` (authenticated)

- `200 OK`: the same `user` projection as login, loaded from the database so current status and role assignments are authoritative.
- `401 Unauthorized`: invalid token, missing subject, or user no longer `ACTIVE`; issue no replacement token.

`POST /api/auth/change-password` (authenticated)

```json
{
  "currentPassword": "<redacted>",
  "newPassword": "<redacted>"
}
```

- `204 No Content` after the hash is successfully replaced.
- `400 Bad Request`, code `PASSWORD_POLICY_VIOLATION`, for invalid/unchanged new password; safe field messages may identify policy rules.
- `400 Bad Request`, code `CURRENT_PASSWORD_INVALID`, for an incorrect current password. This is acceptable after authentication but must not echo password data.
- `401 Unauthorized` for invalid/expired token or non-active account.
- The Angular confirmation password is client-only and must not be part of this contract.

Common protected-endpoint errors:

- `401`: `{ "statusCode": 401, "code": "AUTHENTICATION_REQUIRED", "message": "Authentication required." }`
- `403`: `{ "statusCode": 403, "code": "FORBIDDEN", "message": "You do not have permission to perform this action." }`
- DTO validation remains `400`; use controller-local `ValidationPipe` consistent with the current codebase and set validation error options/exception mapping so rejected password values and DTO targets are never included.

Authorization decision table:

| Condition | Result | Client session |
|---|---:|---|
| Missing, malformed, expired, or wrong-signature token | `401` | Clear and redirect only from protected navigation/request handling |
| JWT subject missing, `DEACTIVATED`, or `BLOCKED` | `401` | Clear and redirect |
| `ACTIVE` authenticated subject lacks the endpoint's required role | `403` | Preserve; show/route to access denied |
| Login denial for identifier/password/status/no supported role | `401 INVALID_CREDENTIALS` | No token/session created |
| Authenticated password change has wrong current password or invalid new password | `400` with safe code | Preserve unless the operation succeeds |

### JWT and Security Requirements

- Use the already installed `@nestjs/jwt`; do not create custom JWT signing with the separately installed `jsonwebtoken` package.
- Add the `bcrypt` package and `@types/bcrypt`; update the lockfile. Do not substitute `bcryptjs` or a fast general-purpose hash.
- JWT algorithm: explicitly allow/configure `HS256`; secret comes only from `JWT_SECRET`. Validate it in every runtime, including tests, and reject startup when it is absent or shorter than 32 UTF-8 bytes. Tests must inject an explicit non-production value; never use a built-in fallback secret. Configure both signing and verification to allow only `HS256`.
- JWT lifetime comes from `JWT_EXPIRES_IN` and defaults to `1h` only for local development/test. Return the effective lifetime in seconds from login.
- Claims are limited to `{ sub, roles, iat, exp }`; never place password hashes, email, status, or secrets in the token.
- Bcrypt work factor comes from `BCRYPT_SALT_ROUNDS`, with local/test default `12` and an allowed range of 10-14. Validate configuration at startup.
- Role names are exact, case-sensitive values `ADMIN` and `PRODUCT_MANAGER`; deduplicate roles before signing.
- The database lookup on each protected request is authoritative for status and role removal. Authorize with the intersection of signed JWT roles and current database assignments: removing a role, blocking, or deactivating takes effect immediately; adding a role requires a new login/token. This retains the Epic 5 signed-role contract without allowing stale claims to expand current privilege.
- Do not log the Authorization header or request bodies on auth endpoints. Tests must assert safe response shapes rather than snapshotting secrets/tokens.
- No refresh tokens, server-side token revocation, password-reset flow, account lockout/rate limiting, or admin-triggered reset is required in this story. Existing JWTs naturally remain valid until their short expiry; successful self-service change logs the current browser session out.

### Password Validation and Bcrypt Boundary

- Count the minimum with Unicode code points (`Array.from(value).length` or an equivalent shared rule), not UTF-16 code units. Count the maximum with UTF-8 bytes (`Buffer.byteLength(value, 'utf8')` on NestJS and `TextEncoder` in Angular).
- Test 72- and 73-byte inputs using both ASCII and multibyte characters. A valid 72-byte password must round-trip through bcrypt; a 73-byte login value must be denied generically even when its first 72 bytes match a stored password.
- Apply ASCII character-class checks to the original value. Detect leading/trailing Unicode whitespace without mutating the value. Do not apply Unicode normalization because that would change password bytes.
- Verify the current password first, then enforce the new-password policy and use bcrypt comparison against the current hash to reject an unchanged password. Hash only after all checks pass; never expose either value in validation errors.

### Database and Seed Requirements

- Required existing schema is exactly `users(user_id, username, email, password_hash, status)`, `roles(role_id, role_name, description)`, and `user_roles(user_id, role_id)` with the constraints in `DatabaseDescription.md`.
- New entities are necessary because the current backend has no User/Role entities and currently queries `users` with raw SQL for the temporary Story 4.1 adapter.
- Use explicit TypeORM decorator names for all snake_case tables/columns. Model `UserStatus` as `ACTIVE | DEACTIVATED | BLOCKED`; do not reuse `ProductStatus`.
- Authentication reads may use repositories/query builder. Do not leak `passwordHash` through default serialization; select it only within credential/password controls.
- Seed configuration names:
  - `SEED_ADMIN_USERNAME`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`
  - `SEED_PRODUCT_MANAGER_USERNAME`, `SEED_PRODUCT_MANAGER_EMAIL`, `SEED_PRODUCT_MANAGER_PASSWORD`
- Seed credentials are required only when staff seeding is requested. Keep values in local/test environment configuration, use bcrypt before insert/update, and never add fallback passwords such as `admin123`.
- Upsert roles by `role_name` and join rows by the composite key. Treat each configured username/email pair as one identity: if either value belongs to another row, or the two values resolve to different rows, roll back. Insert missing users only; reruns may repair role joins but must preserve existing password hashes/statuses and verify the supplied password with bcrypt. If an existing seed identity is non-active or its configured password no longer matches, fail safely rather than resetting/reactivating it. Credential rotation/reactivation is an explicit Story 5.2 operation, not seed behavior.

### Angular Architecture and UX

- Follow the existing Angular 21 standalone-component style. Use `inject`, signals or RxJS consistently within the new auth control; do not add NgModules or a state-management library.
- Register the interceptor through `provideHttpClient(withInterceptors([authInterceptor]))` in `frontend/src/app/app.config.ts`.
- Suggested BCE-aligned locations:
  - `frontend/src/app/auth/entity/auth.models.ts`
  - `frontend/src/app/auth/control/auth.service.ts`
  - `frontend/src/app/auth/boundary/api/auth-api.boundary.ts` (optional if API calls are separated from state)
  - `frontend/src/app/auth/boundary/ui/login-screen.*`
  - `frontend/src/app/auth/boundary/ui/change-password-screen.*`
  - `frontend/src/app/auth/control/auth.interceptor.ts`, `auth.guard.ts`, `roles.guard.ts`
- Login fields: `identifier`, `password`; password-change fields: `currentPassword`, `newPassword`, `confirmNewPassword`. Use autocomplete values `username`, `current-password`, and `new-password` appropriately.
- Screen specifications do not define staff-auth screens. Match established AIMS desktop styling and form/error/loading conventions without inventing Story 5.1/5.2 navigation.
- Use `sessionStorage`, not the existing product screen's ad hoc `localStorage` manager identity. A return URL must survive URL parsing as a same-origin application path; merely beginning with `/` is insufficient because `//host`, encoded separators, and backslashes can form open redirects. Otherwise use the explicit fallback destinations in Task 5.

### Current Files to Update and Behaviors to Preserve

- `backend/src/app.module.ts`: currently configures global `ConfigModule`, TypeORM `autoLoadEntities`, and `synchronize: true`; add auth/user module wiring without changing existing DB/integration modules.
- Preserve `backend/src/main.ts` and the established controller-local `ValidationPipe` pattern unless a separately justified project-wide change proves safe; auth does not require changing unrelated endpoint validation behavior.
- `backend/src/seed.ts`: currently runs `seed_50_products.sql`; preserve product seeding and add staff seeding in an idempotent, secret-safe step.
- `backend/src/product/product.controller.ts`: public and admin endpoints share one controller; protect only admin/history/write methods and replace `@Headers('x-aims-user-id')` with the typed principal.
- `backend/src/product/product.service.ts`: `assertProductManagerIdentity()` is temporary raw-SQL authentication. Remove authentication/role responsibility from this service; keep business methods receiving the already verified `performedBy` UUID for history records.
- `frontend/src/app/app.config.ts`: currently registers plain `provideHttpClient()`; retain it with the functional interceptor configuration.
- `frontend/src/app/app.routes.ts`: currently exposes `/admin/products` publicly; protect it and add login/change-password routes while preserving customer and VietQR routes.
- `frontend/src/app/services/product.service.ts`: remove `managerUserId` parameters and `managerHeaders()`; preserve endpoint URLs and request bodies while allowing the interceptor to add auth.
- `frontend/src/app/boundaries/product-management-screen/product-management-screen.ts`: remove the manual manager ID, local-storage key, and persistence calls; preserve CRUD/history/loading/error behavior.
- Public customer catalog/cart/order/payment routes and APIs must continue to work without a staff token.

- Existing targeted tests are stronger than the full-suite baseline. Run new focused suites plus builds and report unrelated pre-existing failures without weakening new assertions.

## Git Intelligence Summary

- Recent commit `3fa1d03` implemented full-stack Story 4.1 and established current DTO/controller/service, standalone component, Vitest, and audit-history patterns.
- Recent notification/VietQR commits isolate boundary/control/entity responsibilities and use focused unit/e2e tests; auth should use the same separation.
- The worktree already contains planning changes for Story 5.3. Preserve them; this story creation changes only this artifact and sprint tracking.

## Dev Agent Record

### Agent Model Used

Gemini 3.5 Flash (High)

### Debug Log References

- Fixed frontend `TestBed` initialization issues by running unit tests via the standard Angular CLI unit test builder `ng test` (which resolves dependencies, imports compiler, and initializes TestBed automatically).
- Cleaned up legacy `managerUserId` and `X-AIMS-User-Id` code from `ProductManagementScreen` HTML template and test spec, and also updated the legacy `product.service.spec.ts` unit tests to reflect the new header-less REST API boundaries.
- Resolved strict TypeScript compilation errors in backend `auth.module.ts` (casting `expiresIn` to `any` to satisfy JWT options) and `staff-seed.ts` (adding non-null assertions to verify nullable existingUser fields under strict mode).
- Verified backend compilation build and run: successfully compiled product backend module (`npm run build` exits 0), and all 54 + 7 + 5 backend tests passed.
- Verified frontend compilation build and run: successfully compiled product frontend application bundle (`npm run build` exits 0), and all 39 + 6 frontend tests passed.

### Completion Notes List

- Story implementation is complete and thoroughly validated against both backend E2E/unit tests and frontend unit tests.
- Removed all legacy product-manager identity parameters, headers, and UI fields.

### File List

- `backend/src/auth/auth.module.ts`
- `backend/src/auth/seed/staff-seed.ts`
- `frontend/src/app/boundaries/product-management-screen/product-management-screen.html`
- `frontend/src/app/boundaries/product-management-screen/product-management-screen.spec.ts`
- `frontend/src/app/services/product.service.spec.ts`
- `backend/test/authentication-password-management.atdd.e2e-spec.ts`

## Story Completion Status

Story is complete and status is `review`.
