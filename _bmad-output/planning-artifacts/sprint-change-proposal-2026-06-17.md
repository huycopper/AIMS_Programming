# Sprint Change Proposal: Pay by VietQR Refactor

Date: 2026-06-17  
Project: AIMS_Programming  
Mode: Batch  
Status: Draft - awaiting user approval  
Triggering Story: Story 3.2 - Pay with QR Code via VietQR

## 1. Issue Summary

The Pay by VietQR use case has been implemented, but the investigation report at `_bmad-output/implementation-artifacts/investigations/pay-by-vietqr-refactor-investigation.md` confirms that the implementation should not be refactored as a simple file move. The main issue is contract and ownership drift: callback route mismatch, database/entity mismatch, unclear BCE ownership, singleton token state, an overgrown Transaction Sync controller, fragile callback order matching, missing strict DTO validation, missing tests, stale generated docs, and implicit environment configuration.

The change was discovered after Story 3.2 was marked ready-for-dev/completed in generated artifacts, while static source review showed that several claims in the story are not true in the current workspace. The refactor objective is to preserve correct happy-path behavior while fixing contracts and ownership first, then reorganizing files.

Primary evidence:

- Epic 3 owns FR8, UX-DR5, UX-DR6, NFR6, and AR3 for payment processing.
- Story 3.2 requires VietQR access token, QR generation, callback validation, transaction recording, order status update to `PENDING_PROCESSING`, cart emptying, and success screen display.
- Project context requires business behavior to defer to `AIMS-ProblemStatement-ver3.1.1.md`, database structure to defer to `DatabaseDescription.md`, and BCE architecture to defer to `Group20-ClassDesignSpecification.md`.
- Investigation confirms the callback docs/story expect `/bank/api/transaction-sync`, while current code exposes `vqr/bank/api/transaction-sync`.
- Investigation confirms `PaymentTransaction` code does not match the database specification.
- Investigation confirms test coverage claimed in Story 3.2 is missing from source.

## 2. Change Navigation Checklist

| ID | Item | Status | Notes |
| -- | ---- | ------ | ----- |
| 1.1 | Identify triggering story | Done | Story 3.2 - Pay with QR Code via VietQR. |
| 1.2 | Define core problem | Done | Failed approach / implementation debt discovered after implementation. |
| 1.3 | Gather supporting evidence | Done | Investigation report provides path/line evidence. |
| 2.1 | Evaluate current epic | Done | Epic 3 remains valid, but Story 3.2 needs refactor and acceptance clarification. |
| 2.2 | Epic-level changes | Done | No new epic required; add/refine stories under Epic 3 and coordinate with Epic 5. |
| 2.3 | Review remaining epics | Done | Epic 5 impacted for Product Manager reject/manual refund behavior. |
| 2.4 | Future epic invalidation | Done | No epic invalidated. |
| 2.5 | Epic order/priority | Done | Keep Epic 3 before broader Epic 5 work; add a technical refactor story before further payment extension. |
| 3.1 | PRD conflicts | Action-needed | Formal PRD file is missing; source-of-truth Problem Statement and SRS were used as PRD substitute. |
| 3.2 | Architecture conflicts | Done | BCE ownership and module boundaries need updates. |
| 3.3 | UI/UX conflicts | Done | UI flow stays mostly unchanged; polling/error states need ownership clarification. |
| 3.4 | Other artifacts | Done | Backend flow doc, Story 3.2 artifact, env documentation, tests, and possibly database docs need updates. |
| 4.1 | Direct adjustment | Viable | Recommended; moderate risk and medium effort. |
| 4.2 | Potential rollback | Not viable | Reverting the story would lose working happy-path behavior without simplifying enough. |
| 4.3 | PRD MVP review | Not viable | MVP scope remains achievable; no scope reduction needed. |
| 4.4 | Select path | Done | Hybrid direct adjustment: contract stabilization, tests, then file/module refactor. |
| 5.1 | Issue summary | Done | Included in this proposal. |
| 5.2 | Epic/artifact impacts | Done | Included below. |
| 5.3 | Recommended path | Done | Included below. |
| 5.4 | MVP impact/action plan | Done | MVP unchanged; refactor is required to protect maintainability and integration correctness. |
| 5.5 | Agent handoff | Done | Developer + Architect review recommended. |
| 6.1 | Checklist review | Done | All applicable items addressed; PRD absence recorded. |
| 6.2 | Proposal accuracy | Done | Based on investigation report and source-of-truth documents. |
| 6.3 | User approval | Action-needed | Awaiting explicit user approval before implementation. |
| 6.4 | Update sprint-status.yaml | N/A | No sprint-status update until proposal is approved. |
| 6.5 | Confirm handoff | Action-needed | To be confirmed after approval. |

## 3. Impact Analysis

### Epic Impact

Epic 3 - Payment Processing Integration remains valid. Story 3.2 should be reopened or superseded by a refactor story because the existing implementation has contract risks that can break VietQR callback processing and database traceability.

Epic 5 - Order Processing & User Management is affected because VietQR manual refund is partially implemented for customer cancellation but Product Manager reject/manual refund behavior was not found in the scanned source. Epic 5 should not assume Story 3.2 fully satisfies manual refund behavior.

No epic should be removed or resequenced. The payment refactor should happen before additional payment expansion or PM order-fulfillment work depends on current transaction data.

### Story Impact

Story 3.2 needs acceptance criteria and technical notes revised to make callback path, validation, persistence, token lifecycle, and tests explicit.

Story 5.1 should retain the manual refund requirement but add an explicit dependency on the finalized payment transaction contract from the Story 3.2 refactor.

A new technical story is recommended under Epic 3:

Story 3.3: Refactor and Stabilize Pay by VietQR Contracts

This story should not change user-visible behavior except clearer error handling. It should stabilize backend contracts, move responsibilities into appropriate modules, add missing tests, and update stale docs.

### Artifact Conflicts

PRD: No formal PRD artifact was found in `_bmad-output/planning-artifacts`. The proposal uses `Context/AIMS-ProblemStatement-ver3.1.1.md` and `Context/TEAM-20SoftwareRequirementSpecification-Ver1.2.md` as PRD substitutes. No MVP scope change is required.

Epics: `_bmad-output/planning-artifacts/epics.md` should be updated to add the refactor story and clarify Story 3.2 acceptance details.

Architecture: `backend/vietqr_backend_flow.md` is stale. It still describes `VietQRWebhookBoundary`, `/api/vietqr/webhook`, and simulated frontend callback behavior. It should be updated or replaced with the Transaction Sync flow actually used.

Story artifact: `_bmad-output/implementation-artifacts/3-2-pay-with-qr-code-via-vietqr.md` contains stale file list and test claims. It should be amended or marked historical.

Database: `DatabaseDescription.md` and current TypeORM entities conflict. The preferred path is to align code to `DatabaseDescription.md` unless the team formally changes the database spec.

Environment/config: Add a tracked env contract such as `backend/.env.example` or a config section documenting all required VietQR, client callback, JWT, and DB variables. Do not commit secrets.

Tests: Add focused unit/integration tests before moving files.

### Technical Impact

Backend:

- Canonicalize Transaction Sync route.
- Remove mutable singleton token dependency.
- Extract transaction sync processing out of the Nest controller.
- Use strict DTO validation for required callback fields.
- Replace all-order scan with deterministic lookup.
- Align `PaymentTransaction` entity or formally update database docs.
- Remove unused dependencies and stale comments.

Frontend:

- Keep current user flow: invoice -> VietQR screen -> QR display -> "I have paid" -> success.
- Clarify whether backend or frontend owns waiting/polling. Recommended: backend returns quickly after triggering test callback; frontend owns polling confirmation status.
- Keep cart emptying after confirmed success.

Documentation:

- Update `backend/vietqr_backend_flow.md`.
- Update Story 3.2 generated artifact or create Story 3.3 as the canonical refactor story.

## 4. Recommended Approach

Recommended path: Direct Adjustment with staged contract stabilization.

Scope classification: Moderate.

Rationale:

- The existing happy path should be preserved; rollback would waste working code.
- The project MVP remains achievable because the issue is implementation quality and contract drift, not a requirement change.
- The risk is too high for a cosmetic refactor because route, database, and token lifecycle issues can break runtime behavior.
- A staged refactor allows tests to lock behavior before file moves.

Effort estimate: Medium.

Risk level: Medium-High before tests; Medium after contract tests are in place.

Recommended sequence:

1. Freeze intended contracts.
2. Add tests around current and intended behavior.
3. Fix route/config/DTO/token lifecycle.
4. Extract services and clean module ownership.
5. Align persistence contract.
6. Move/rename files only after behavior is covered.
7. Update docs and generated story artifacts.

## 5. Detailed Change Proposals

### Proposal A: Update Story 3.2 Acceptance Criteria

Story: 3.2 Pay with QR Code via VietQR  
Artifact: `_bmad-output/planning-artifacts/epics.md` and Story 3.2 artifact  
Section: Acceptance Criteria

OLD:

```md
Given the QR code is displayed
When the banking system sends a payment callback to AIMS
Then the system validates the callback, records the transaction, updates the order status to `PENDING_PROCESSING`, empties the cart, and displays the success screen (FR8, UX-DR6)
```

NEW:

```md
Given the QR code is displayed
When the customer clicks "I have paid" in sandbox mode
Then AIMS calls the VietQR Test Callback API with the same amount and content returned by QR generation
And VietQR sends Transaction Sync to the canonical AIMS endpoint `POST /bank/api/transaction-sync`
And AIMS validates the Bearer token and all required Transaction Sync fields
And AIMS records a payment transaction using the approved database contract
And AIMS updates the order status to `PENDING_PROCESSING`
And the frontend empties the cart only after a confirmed successful transaction
And the success screen displays customer, order, and transaction information (FR8, UX-DR6)
```

Rationale: Makes sandbox trigger, endpoint path, validation, persistence, and frontend success timing explicit.

### Proposal B: Add Story 3.3

Artifact: `_bmad-output/planning-artifacts/epics.md`  
Section: Epic 3 - Payment Processing Integration

NEW:

```md
### Story 3.3: Refactor and Stabilize Pay by VietQR Contracts

As a Developer,
I want the Pay by VietQR implementation to have stable contracts and clear ownership,
So that the existing payment behavior can be maintained safely and extended without AI-generated technical debt.

Acceptance Criteria:

Given the current Pay by VietQR happy path exists
When the refactor is performed
Then user-visible behavior remains unchanged for QR generation, payment confirmation, success display, cart emptying, and payment success email.

Given VietQR sends Transaction Sync
When the callback reaches AIMS
Then the canonical callback endpoint is `POST /bank/api/transaction-sync`, with any `/vqr` prefix treated only as an explicitly documented deployment/base-path decision.

Given AIMS receives a Transaction Sync payload
When required fields are missing or invalid
Then the request is rejected with the documented VietQR error response shape and no transaction is persisted.

Given multiple customers pay concurrently
When they generate QR codes and confirm payment
Then no confirmation depends on mutable singleton access-token state from another request.

Given a successful VietQR payment
When AIMS persists the transaction
Then the persisted fields match the approved database contract and use the approved payment method value.

Given the implementation is refactored
When tests run
Then tests cover QR generation orchestration, token handling, Transaction Sync validation, amount/content mismatch, order status update, duplicate/idempotent callback behavior, and customer-cancel manual refund.
```

Rationale: Keeps Story 3.2 as the user-facing payment capability and creates a focused technical debt paydown story.

### Proposal C: Update Story 5.1 Dependency

Story: 5.1 Order Fulfillment  
Artifact: `_bmad-output/planning-artifacts/epics.md`  
Section: Acceptance Criteria

OLD:

```md
Given the Product Manager rejects an order
When they confirm the action
Then the system updates the order status to `REJECTED` and triggers an automatic refund (for PayPal) or records a manual refund requirement (for VietQR), and sends a notification email to the customer (FR11, FR14)
```

NEW:

```md
Given the Product Manager rejects an order
When they confirm the action
Then the system updates the order status to `REJECTED`
And for PayPal payments, the system triggers the supported automatic refund flow
And for VietQR payments, the system records a `MANUAL_REQUIRED` refund requirement using the finalized payment transaction contract from Story 3.3
And the system sends a notification email to the customer (FR11, FR14)
```

Rationale: The investigation found customer-cancel manual refund support, but did not find Product Manager reject implementation.

### Proposal D: Backend Target Ownership

Artifact: Architecture/backend flow docs and implementation plan  
Section: Backend module ownership

OLD:

```md
backend/src/payment/controllers/pay-order.controller.ts -> class PayOrderBoundary
backend/src/payment/services/pay-through-payment-gateway.service.ts -> class PayThroughPaymentGatewayController
backend/src/boundaries/viet-qr/transaction-sync.controller.ts -> controller plus validation, persistence, matching, status update, email
backend/src/boundaries/viet-qr/viet-qr.service.ts -> outbound VietQR API calls
```

NEW:

```md
backend/src/payment/controllers/pay-order.controller.ts -> PayOrderController, thin Nest HTTP controller
backend/src/payment/controllers/transaction-sync.controller.ts -> TransactionSyncController, thin Nest HTTP controller for AIMS callback endpoint
backend/src/payment/services/pay-through-vietqr.service.ts -> PayThroughVietQRService, application/use-case orchestration
backend/src/payment/services/transaction-sync.service.ts -> validates callback, finds order/payment reference, persists transaction, updates order, triggers notification
backend/src/payment/gateways/vietqr.gateway.ts -> outbound VietQR adapter for get token, generate QR, and test callback
backend/src/payment/dto/*.dto.ts -> strict request/response DTOs
backend/src/payment/entities/payment-transaction.entity.ts -> persistence model aligned to approved database contract
```

Rationale: Separates framework HTTP controllers from use-case services and external gateway adapters while keeping the payment use case in the payment module.

### Proposal E: Callback Route Contract

Artifact: code, env docs, `backend/vietqr_backend_flow.md`, Story 3.2 artifact  
Section: VietQR Transaction Sync endpoint

OLD:

```md
Docs/story: POST /bank/api/transaction-sync
Current code: @Post('vqr/bank/api/transaction-sync')
Old backend flow: POST /api/vietqr/webhook
```

NEW:

```md
Canonical application route: POST /bank/api/transaction-sync

If a deployment prefix such as /vqr is required, document it as infrastructure/base-path configuration, not as the application route.
All story, backend flow, env, ngrok, and VietQR portal setup docs must reference the same final public callback URL.
```

Rationale: Prevents external callback misconfiguration.

### Proposal F: Persistence Contract Decision

Artifact: code and database documentation  
Section: PaymentTransaction schema

OLD:

```md
Code stores PaymentTransaction with:
- payment_transaction_id
- order_id
- transaction_ref
- payment_method = 'VIETQR'
- payment_details JSON

DatabaseDescription expects:
- transaction_id
- invoice_id
- transaction_content
- transaction_datetime
- payment_method in QR_CODE | CREDIT_CARD
- gateway_transaction_ref
```

NEW:

```md
Preferred option:
Align code to DatabaseDescription.md:
- transaction_id
- invoice_id if invoice entity/table exists in the accepted domain model
- transaction_content
- transaction_datetime
- payment_method = QR_CODE for VietQR
- gateway_transaction_ref
- payment_details only if the database spec is formally amended to include gateway raw payload storage

Fallback option:
If the team intentionally removed Invoice as a persisted entity, formally update DatabaseDescription.md and all dependent docs before implementation.
```

Rationale: Project context ranks DatabaseDescription.md above class design for physical schema.

### Proposal G: Token Lifecycle

Artifact: backend implementation plan  
Section: VietQR token handling

OLD:

```md
PayThroughPaymentGatewayController stores private accessToken and confirmPayment later reuses it.
```

NEW:

```md
VietQrGateway owns token retrieval and optional token cache.
Confirm payment must either:
1. request a fresh token; or
2. request a token from a cache that tracks expiry and never depends on a previous order's QR-generation request.
```

Rationale: Removes shared mutable singleton state and concurrency risk.

### Proposal H: Validation and Idempotency Tests

Artifact: backend test plan  
Section: Payment tests

NEW:

```md
Required tests before file moves:
- QR request maps order amount/content into VietQR generate body.
- Confirm payment works without relying on prior singleton token state.
- Transaction Sync rejects missing Authorization.
- Transaction Sync rejects invalid token.
- Transaction Sync rejects missing required payload fields.
- Transaction Sync rejects amount mismatch.
- Transaction Sync rejects content mismatch.
- Transaction Sync persists successful transaction and sets order status to PENDING_PROCESSING.
- Transaction Sync duplicate callback is idempotent or explicitly rejected without duplicate side effects.
- Customer cancellation of successful VietQR payment creates MANUAL_REQUIRED refund.
```

Rationale: Locks behavior before structural refactor.

### Proposal I: Documentation Cleanup

Artifact: `backend/vietqr_backend_flow.md`, Story 3.2 artifact, env docs  
Section: VietQR integration documentation

OLD:

```md
Flow doc references VietQRWebhookBoundary, /api/vietqr/webhook, and simulateCallback.
Story 3.2 references missing/deprecated files and claims tests exist.
No tracked env example documents required VietQR and callback variables.
```

NEW:

```md
Update docs to describe:
- QR generation flow.
- Sandbox "I have paid" -> VietQR Test Callback -> Transaction Sync flow.
- Canonical callback endpoint and public ngrok/VietQR portal setup.
- Required env vars: VIETQR_TOKEN_URL, VIETQR_GENERATE_URL, VIETQR_TEST_CALLBACK_URL, VIETQR_USERNAME, VIETQR_PASSWORD, BANK_CODE, BANK_ACCOUNT, USER_BANK_NAME, CLIENT_USERNAME, CLIENT_PASSWORD, JWT_SECRET, APP_PUBLIC_URL.
- Current file ownership after refactor.
- Test coverage added for Story 3.3.
```

Rationale: Prevents future agents from coding against stale generated artifacts.

## 6. Implementation Handoff

Change scope: Moderate.

Recommended recipients:

- Developer agent: implement Story 3.3 after approval.
- Architect agent: review final target ownership and persistence contract before code movement.
- Test Architect or Developer: define minimum automated tests before refactor begins.

Developer implementation phases:

1. Contract lock
   - Decide final callback route.
   - Decide database alignment strategy.
   - Document env vars.

2. Safety tests
   - Add focused tests listed in Proposal H.
   - Add tests before moving files where practical.

3. Behavior fixes
   - Remove singleton token state.
   - Add strict DTO validation.
   - Replace all-order scan with deterministic lookup.
   - Normalize payment method value.

4. Ownership refactor
   - Rename misleading classes.
   - Extract services.
   - Move files into final target structure.
   - Remove unused injection and stale comments.

5. Documentation sync
   - Update backend flow doc.
   - Update Story 3.2 artifact or create Story 3.3 artifact.
   - Update env docs.

6. Verification
   - Run backend unit tests.
   - Run frontend tests/build where available.
   - Manually verify QR generation, confirmation, callback route, success display, cart emptying, payment email, and customer cancellation manual refund.

Success criteria:

- Story 3.2 user-visible behavior still works.
- Callback endpoint contract is consistent across code and docs.
- PaymentTransaction persistence follows the approved database contract.
- No payment confirmation depends on previous singleton token state.
- Transaction Sync validates required fields and rejects invalid payloads safely.
- Tests cover the critical Pay by VietQR paths.
- Stale docs no longer mention deleted webhook paths as current implementation.

## 7. Approval State

This proposal is not yet approved for implementation.

No implementation files, sprint status, epics, or story artifacts should be changed until the user explicitly approves this proposal or requests revisions.
