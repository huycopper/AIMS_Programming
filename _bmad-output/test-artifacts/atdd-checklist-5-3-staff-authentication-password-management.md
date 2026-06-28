---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-06-23'
storyId: '5.3'
storyKey: '5-3-staff-authentication-password-management'
storyFile: '_bmad-output/implementation-artifacts/5-3-staff-authentication-password-management.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-5-3-staff-authentication-password-management.md'
generatedTestFiles:
  - 'backend/test/authentication-password-management.atdd.e2e-spec.ts'
  - 'backend/test/staff-seed.atdd.e2e-spec.ts'
  - 'backend/src/auth/guards/roles.guard.atdd.spec.ts'
  - 'backend/test/support/test-database.guard.spec.ts'
  - 'frontend/src/app/auth/control/auth.service.atdd.spec.ts'
  - 'frontend/src/app/auth/control/auth.interceptor.atdd.spec.ts'
  - 'frontend/src/app/auth/control/auth.guards.atdd.spec.ts'
  - 'frontend/src/app/auth/boundary/auth-forms.atdd.spec.ts'
  - 'frontend/src/app/services/product-auth-boundary.atdd.spec.ts'
inputDocuments:
  - '_bmad-output/implementation-artifacts/5-3-staff-authentication-password-management.md'
  - '_bmad-output/implementation-artifacts/5-3-staff-authentication-password-management-validation-report.md'
  - 'project-context.md'
  - 'backend/package.json'
  - 'backend/test/jest-e2e.json'
  - 'frontend/package.json'
  - 'frontend/angular.json'
---

# ATDD Checklist: Story 5.3 Staff Authentication & Password Management

## Preflight and Context

- Detected stack: full-stack NestJS 11 / Angular 21.
- Backend acceptance stack: Jest 30, Nest testing utilities, and Supertest.
- Frontend component/control stack: Vitest 4 with JSDOM through Angular's unit-test builder.
- Story status: `ready-for-dev`; validation result: `PASS AFTER CORRECTION`.
- Test-generation order: security-critical backend API/database behavior first, Angular state and boundary behavior second.
- Database rule: destructive setup must require `NODE_ENV=test` and a dedicated database name containing `test`; otherwise it fails closed before application bootstrap or cleanup.
- This is a red-phase artifact. Application code is intentionally absent and must not be added by this workflow.

## Generation Mode

- AI generation selected. The API and security contracts are explicit, while the authentication UI does not yet exist for useful browser recording.
- Backend tests exercise externally observable HTTP/database behavior; frontend tests exercise Angular controls, interceptor/guard functions, and standalone form boundaries using current Vitest/JSDOM conventions.

## Risk-Based Test Strategy

| Priority | Level | Scenarios / acceptance coverage |
|---|---|---|
| P0 | Backend API + PostgreSQL integration | Exact username/email login; indistinguishable `401`; bcrypt UTF-8 72/73-byte boundary; JWT signature/expiry/claim allow-list; current status/role intersection; `401`/`403`; ADMIN/PRODUCT_MANAGER/dual-role; legacy-header bypass; protected admin versus public catalog routes (AC 1-6). |
| P0 | Backend API + PostgreSQL integration | Successful password rotation; wrong-current/policy/unchanged/non-active failures; compare-and-swap concurrency; stored-hash non-mutation and old/new login behavior (AC 7-9). |
| P1 | Backend seed integration | Complete configuration, bcrypt storage, transaction rollback, idempotency, conflict rejection, and preservation of existing hash/status without credential leakage (AC 2, 10). |
| P1 | Angular Vitest/JSDOM | Session restoration/expiry, exact-origin interceptor, protected `401` versus `403`, guard role union, safe return URLs, login/password forms, session clearing, and removal of legacy product-manager identity (AC 1, 3-9). |

Red-phase rule: every scenario is an active `it`/`test` case with no `.skip`, `.todo`, or weakened assertion. The initial failures must point to missing Story 5.3 application seams or absent behavior.

## Red-Phase Acceptance Checklist

All boxes below are implementation handoff items. They remain unchecked until the corresponding active test is green.

### P0 — Authentication and credential denial

- [ ] Exact, case-sensitive username login returns the safe user projection and token.
- [ ] Exact, case-sensitive email login returns the same contract.
- [ ] Username/email case variants, unknown identifiers, wrong passwords, unsupported/no roles, `BLOCKED`, and `DEACTIVATED` all return exactly `401 INVALID_CREDENTIALS` without a token.
- [ ] Successful responses contain neither plaintext passwords nor hash fields.
- [ ] Valid 72-byte ASCII and multibyte passwords authenticate.
- [ ] Prefix-equivalent 73-byte ASCII and multibyte passwords receive the same generic `401`.

### P0 — JWT, current state, and authorization

- [ ] JWT uses HS256, expires in the configured interval, and payload keys are exactly `sub`, `roles`, `iat`, and `exp`.
- [ ] Missing, malformed, wrong-signature, and expired bearer tokens return `401 AUTHENTICATION_REQUIRED`.
- [ ] Already-issued tokens stop working when the database subject becomes `BLOCKED` or `DEACTIVATED`.
- [ ] Removing a signed role takes effect immediately; adding a database role does not grant access until a new token is issued.
- [ ] Active authenticated role mismatch returns `403 FORBIDDEN` without becoming a `401`.
- [ ] ADMIN, PRODUCT_MANAGER, dual-role, any-match, and authenticated-only/no-role-metadata paths are covered.
- [ ] All five product administration/history/write endpoints reject `X-AIMS-User-Id` without a token and reject header-assisted elevation with a wrong-role token.
- [ ] Public `GET /api/products` and `GET /api/products/random` remain unauthenticated.

### P0 — Password change

- [ ] Success replaces the bcrypt hash atomically, stores no plaintext, rejects the old password, and accepts the new password.
- [ ] Wrong current password, unchanged/invalid new password, whitespace edges, missing character classes, and 73-byte input leave the hash unchanged.
- [ ] A status change before mutation returns `401` and preserves the hash.
- [ ] Two concurrent compare-and-swap attempts yield exactly one `204`; only the winning password works.

### P1 — Transactional seed

- [ ] Zero credential variables skips staff seed; partial configuration fails.
- [ ] Complete configuration creates both roles and two active accounts with bcrypt hashes and no logged credentials.
- [ ] Rerun is idempotent and preserves hashes/statuses.
- [ ] Password mismatch and non-active existing accounts fail without mutation.
- [ ] Username/email ownership conflict rolls back both staff inserts and role joins.

### P1 — Angular session and boundaries

- [ ] Login stores only the token/current-user projection in `sessionStorage`; logout and failed restore clear it.
- [ ] `/api/auth/me` restores all roles from the authoritative backend.
- [ ] Interceptor attaches a bearer token only to the exact configured API origin, never lookalikes.
- [ ] Protected API `401` clears/redirects once; login `401` does not loop; `403` preserves the session.
- [ ] Auth and role guards cover ADMIN-only, PRODUCT_MANAGER-only, dual-role, unassigned-role, and any-match behavior.
- [ ] Return URLs reject absolute, protocol-relative, encoded, backslash, and script-like external forms.
- [ ] Login uses a generic denial, prevents duplicate submissions, and never mutates password input.
- [ ] Password form enforces Unicode-code-point/UTF-8-byte policy, matching confirmation, and omits confirmation from the API request.
- [ ] Successful password change clears the session and returns to login.
- [ ] Product service/screen no longer accept, store, display, or send a manager UUID; bearer authentication is interceptor-owned.

## Generated Coverage

- 105 active parameterized scenarios across 9 test files (66 backend, 39 frontend).
- Shared backend fixture and safety guard: `backend/test/support/auth-atdd-fixture.ts`, `backend/test/support/test-database.guard.ts`.
- No skipped/todo tests and no placeholder assertions.
- No production/application code was created or modified.

## Red-Phase Execution Evidence

- `npx vitest run src/app/services/product-auth-boundary.atdd.spec.ts --reporter=verbose` — **RED**, 2/2 tests failed because the legacy header and `managerUserId` state still exist.
- `npx vitest run src/app/auth/control/auth.service.atdd.spec.ts --reporter=verbose` — **RED**, suite cannot resolve the not-yet-created `auth.service`.
- `npx jest --runInBand src/auth/guards/roles.guard.atdd.spec.ts` — **RED**, suite cannot resolve the not-yet-created `roles.guard`.
- `npx jest --config ./test/jest-e2e.json --runInBand test/authentication-password-management.atdd.e2e-spec.ts` — **RED**, suite stops at missing `bcrypt`, the story's required but not-yet-installed dependency. No database setup or cleanup ran.
- The database-backed suites must be rerun only with `NODE_ENV=test` and a dedicated `DB_DATABASE` containing `test`. The fixture also rejects equality with `DB_DEVELOPMENT_DATABASE` before Nest application bootstrap.

## Green-Phase Commands

```powershell
cd backend
$env:NODE_ENV='test'
$env:DB_DATABASE='<dedicated_test_database>'
npx jest --config ./test/jest-e2e.json --runInBand test/authentication-password-management.atdd.e2e-spec.ts test/staff-seed.atdd.e2e-spec.ts
npx jest --runInBand src/auth/guards/roles.guard.atdd.spec.ts

cd ../frontend
npx vitest run src/app/auth src/app/services/product-auth-boundary.atdd.spec.ts
```

Do not point these commands at a shared or development database. Implement one vertical slice at a time, keep its test active, and turn each checklist item green without weakening the assertion.

## Validation Summary

- Story, validation report, current source, Jest/Supertest configuration, Angular/Vitest configuration, and project context were loaded.
- Paths and naming follow the repository's co-located frontend spec and backend Jest/e2e conventions. The generic Playwright checklist items are not applicable because this repository has no Playwright/Cypress framework and the requested frontend convention is Vitest/JSDOM.
- The workflow template's skipped-scaffold convention was intentionally overridden by the explicit requirement that skipped tests must not substitute for red coverage. All generated scenarios are active.
- `git diff --check` passed; static scan found no `.skip`, `.todo`, placeholder assertion, hard sleep, or timer wait in generated artifacts.
- The database guard's five safety cases pass independently. Full database-backed scenarios were not started because the required `bcrypt` package and Story 5.3 application code are absent; the recorded red failure occurred before any DB connection or mutation.
- No browser session was opened and no temporary artifacts were left outside `_bmad-output/test-artifacts`.
- External service mocks and `data-testid` requirements are N/A: this story's frontend coverage uses existing Vitest/JSDOM control/component conventions and mocked HttpClient seams, not browser E2E.
- Recommended next workflow: `bmad-dev-story` for Story 5.3, using this checklist as the red-to-green handoff.
