# Story 5.3 Validation Report

Date: 2026-06-23  
Artifact: `_bmad-output/implementation-artifacts/5-3-staff-authentication-password-management.md`  
Result: **PASS AFTER CORRECTION** — 1 blocker, 8 major findings, and 3 minor findings were corrected in the story. No application code was changed.

## Validation Basis

- `Context/AIMS-ProblemStatement-ver3.1.1.md` (highest business authority)
- `Context/DatabaseDescription.md` (physical user/role schema)
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-23.md`
- `project-context.md`
- Story 4.1 artifact and the current NestJS/Angular source, package manifests, and test configuration

## Findings

### Blocker

1. **Bcrypt prefix-equivalent login was permitted.** The draft accepted login passwords up to 200 characters while bcrypt's input boundary is 72 UTF-8 bytes. A value sharing the first 72 bytes with a stored password could authenticate despite an extra suffix. The story now rejects login inputs over 72 UTF-8 bytes through the same generic `401` path, still executes a dummy comparison, forbids password mutation, and requires 72/73-byte ASCII and multibyte tests.

### Major

1. **Account status and removed roles were not authoritative after token issuance.** Product endpoints could have continued accepting an otherwise-valid JWT after the subject became `BLOCKED`/`DEACTIVATED` or lost a role. The JWT guard must now load current status and assignments for every protected request; missing/non-active subjects receive `401`, and effective roles are the least-privilege intersection of signed and current roles.
2. **The `401`/`403` boundary was incomplete.** The story now includes a decision table: authentication/token/subject failures are `401`; an `ACTIVE` authenticated principal lacking a required role is `403`, and the Angular session is preserved on `403`.
3. **Case-insensitive email lookup conflicted with the schema.** PostgreSQL's documented `UNIQUE(email)` constraint is case-sensitive and can contain case variants, making a case-insensitive query ambiguous. Login now uses exact username/email matching after trimming only the identifier. Case-insensitive identity normalization belongs in a coordinated schema/account-management change.
4. **Password replacement was not concurrency-safe.** “One repository update” did not prevent two concurrent changes from overwriting one another. The story now requires a locked or compare-and-swap update constrained by user, `ACTIVE` status, and the previously read hash, with exactly one affected row.
5. **Seed idempotency could silently rotate credentials or reactivate accounts.** The seed contract now uses a transaction, inserts only missing users, verifies configured credentials against existing hashes, preserves hash/status, repairs role joins only, and fails safely on conflicts, password mismatch, or non-active status.
6. **The Story 4.1 adapter removal was not explicit enough for the current code.** The corrected story names all five protected product endpoints, removes `ProductService.assertProductManagerIdentity()` and its raw SQL query, and requires tests proving `X-AIMS-User-Id` grants nothing with no token or a wrong-role token.
7. **Return URL and post-login behavior were ambiguous.** A leading slash alone allows protocol-relative/open-redirect edge cases, and ADMIN-only users have no Story 5.2 landing screen yet. The story now defines `/staff/login`, `/staff/change-password`, same-origin URL parsing, hostile URL cases, and deterministic fallback routes.
8. **E2E fixture cleanup could target the developer database.** Current e2e tests import `AppModule` and use its configured PostgreSQL connection. The story now requires `NODE_ENV=test`, a dedicated database selected through existing DB configuration, fail-closed destructive setup, unique fixtures, and dependency-aware cleanup.

### Minor

1. **JWT configuration failure was underspecified in tests.** `JWT_SECRET` must now be present and at least 32 UTF-8 bytes in every runtime, with no fallback; sign and verify are restricted to `HS256`.
2. **Sensitive DTO validation output was not fully guarded.** Controller-local validation must suppress rejected password values and DTO targets while preserving the current codebase's validation pattern.
3. **Frontend/API guard wiring lacked exact boundaries.** The story now specifies exact API-origin matching for bearer injection, authenticated-only behavior when no role metadata is declared, explicit role metadata for capability endpoints, and deterministic routes.

## Traceability and Scope Conclusion

- The corrected acceptance criteria cover login, confidentiality, generic denial, session restoration, immediate account-status denial, multi-role union/least privilege, exact `401`/`403` behavior, Story 4.1 adapter replacement, self-service password change, non-mutation, Unicode/bcrypt boundaries, and secure idempotent seeding.
- Public customer catalog, cart, order, cancellation/view-token, and payment flows remain unauthenticated. The product controller must protect only its current admin/history/write endpoints; public `GET /api/products` and `GET /api/products/random` remain open.
- Story 5.3 owns reusable authentication/RBAC primitives and Story 4.1 integration. Story 5.1 retains order fulfillment; Story 5.2 retains account CRUD, role/status administration, administrator-triggered reset, audit, and notification.
- Every corrected task maps to current files and installed frameworks. New auth/user files are required because no auth module or user-role entities currently exist. Existing NestJS 11, `@nestjs/jwt`, TypeORM, class-validator, Angular 21, Jest/Supertest, and Vitest patterns are sufficient; only `bcrypt` and `@types/bcrypt` need adding.

## Role-Change Security Decision

Epic 5 requires all assigned roles in the signed JWT, while least privilege requires stale claims not to preserve a removed capability. The corrected story authorizes with the intersection of signed roles and current database assignments. Role removal, blocking, and deactivation take effect immediately; a newly added role requires a new token. This keeps the JWT contract and gives Story 5.2 deterministic revocation behavior without implementing Story 5.2's management UI or APIs.
