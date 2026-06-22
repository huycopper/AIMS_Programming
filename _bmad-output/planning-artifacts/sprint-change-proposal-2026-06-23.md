# Sprint Change Proposal: Staff Authentication and Password Management

## 1. Issue Summary

Epic 5 covers Order Processing and User Management, and the project requirements state that Administrators and Product Managers must log in and may change their passwords. However, the epic currently has no independently implementable story for those flows. Story 5.2 combines account management and generic RBAC but does not specify login identifiers, JWT issuance, account-status checks, multi-role authorization behavior, or self-service password changes.

Evidence:

- `Context/AIMS-ProblemStatement-ver3.1.1.md` requires Administrators and Product Managers to log in, permits each account to have multiple roles, requires secure password hashing, and permits staff to change passwords at any time.
- `Context/DatabaseDescription.md` defines unique `username` and `email`, bcrypt `password_hash`, `ACTIVE`, `DEACTIVATED`, and `BLOCKED` account states, and a many-to-many `users`/`roles` relationship with role examples `ADMIN` and `PRODUCT_MANAGER`.
- `_bmad-output/planning-artifacts/epics.md` assigns bcrypt and RBAC to Epic 5 but lacks a dedicated authentication/password story.

## 2. Impact Analysis

### Epic and Story Impact

- Epic 5 remains valid and gains one story, Story 5.3.
- Story 5.1 Order Fulfillment is retained without modification.
- Story 5.2 User Management & RBAC is retained without modification.
- Story 4.1 remains the source of Product Manager product-administration permissions.
- No epic is added, removed, renumbered, or reordered.

### Artifact Impact

- `epics.md`: add FR15 for staff login/password change, NFR7 for JWT, update Epic 5 traceability and description, and add Story 5.3.
- `sprint-status.yaml`: add the new Story 5.3 identifier with `backlog` status.
- Problem Statement and Database Description: no change; the proposal aligns the plan to these source documents.
- Architecture and UX artifacts: no planning artifact matching those categories was available under `_bmad-output/planning-artifacts`; detailed API/UI design remains a create-story concern.
- Code, database schema, deployment, and CI/CD: no changes in this course-correction workflow.

## 3. Recommended Approach

Use a direct backlog adjustment within Epic 5. This is the smallest change that makes authentication and password management independently implementable while preserving existing Order Fulfillment and User Management content.

- Scope classification: Minor
- Planning effort: Low
- Implementation risk: Medium because authentication and authorization are security-sensitive
- Timeline impact: One additional backlog story; no completed or in-progress work is rolled back
- MVP impact: No change to product goals; this closes a missing decomposition of existing requirements

Rollback and MVP reduction are not appropriate because no existing implementation must be reverted and the requirement already belongs to the stated system scope.

## 4. Detailed Change Proposals

### Requirements and Coverage

Add FR15 for login by username/email and self-service password change. Add NFR7 for signed JWT access tokens. Add both to the Epic 5 coverage map and extend the Epic 5 description to mention staff authentication and password management.

### New Story

Add `Story 5.3: Staff Authentication & Password Management` with acceptance criteria covering:

- login using unique username or email;
- bcrypt password verification and hashing, with no plaintext password storage, response, or logging;
- signed, expiring JWT access tokens containing the user identity and all assigned roles;
- denial of login for `DEACTIVATED` and `BLOCKED` accounts;
- multi-role RBAC with union-of-role permissions and least-privilege denial;
- `ADMIN` permissions for Story 5.2 user/account/role management;
- `PRODUCT_MANAGER` permissions for Story 4.1 product administration/history and Story 5.1 order processing;
- authenticated self-service password change requiring the correct current password;
- no password update when validation fails.

### Sprint Tracking

Add `5-3-staff-authentication-password-management: backlog` beneath the existing Epic 5 stories. The epic remains `backlog` until a story is created by the create-story workflow.

## 5. Implementation Handoff

Handoff to the Product Owner/Developer workflow:

1. Run `bmad-create-story` for `5-3-staff-authentication-password-management`.
2. During story creation, cross-reference the class design and screen specifications for exact BCE classes, endpoint contracts, UI fields, password policy, and JWT configuration.
3. Keep Story 5.3 separate from Administrator-triggered password reset and sensitive-action notification behavior owned by User Management.
4. Do not implement code until the created story is reviewed and marked ready for development.

Success criteria: the new story is traceable, present in sprint tracking, preserves Stories 5.1 and 5.2, and provides testable acceptance criteria for authentication, password changes, account status, JWT, bcrypt, and multi-role RBAC.

## Checklist Result

- [x] Trigger and evidence identified.
- [x] Epic and future-story impact assessed.
- [x] Artifact conflicts assessed; no source requirement or schema conflict found.
- [x] Direct adjustment selected; rollback and MVP reduction rejected.
- [x] Detailed proposal and handoff produced.
- [x] `epics.md` and `sprint-status.yaml` updated as explicitly requested.
- [x] No code implemented.
