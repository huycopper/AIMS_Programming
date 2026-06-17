---
source_change_proposal: _bmad-output/planning-artifacts/sprint-change-proposal-2026-06-17.md
source_investigation: _bmad-output/implementation-artifacts/investigations/pay-by-vietqr-refactor-investigation.md
created_at: 2026-06-17
baseline_commit: 087a8a50fdee2dec502d526be41b46fbb345c4bd
---

# Story 3.3: Refactor and Stabilize Pay by VietQR Contracts

Status: review

## Story

As a Developer,
I want the Pay by VietQR implementation to have stable contracts and clear ownership,
so that the existing payment behavior can be maintained safely and extended without AI-generated technical debt.

## Goal

Refactor the Pay by VietQR implementation in a contract-first order. The developer must stabilize callback route, DTO validation, token lifecycle, persistence contract, ownership boundaries, and regression tests before moving or renaming files. File moves and class renames are the final cleanup phase, not the first implementation step.

This story preserves the current happy path from Story 3.2: invoice opens the VietQR payment screen, QR is generated, customer clicks "I have paid" in sandbox mode, VietQR Test Callback triggers Transaction Sync, AIMS records the payment, order becomes `PENDING_PROCESSING`, cart is emptied only after confirmed success, success screen shows order and transaction information, and payment success email is sent.

## Source of Truth and Precedence

1. `project-context.md`: `Context/AIMS-ProblemStatement-ver3.1.1.md` is the highest business authority; `Context/DatabaseDescription.md` is the physical schema authority; `Context/Group20-ClassDesignSpecification.md` guides BCE structure.
2. `Context/AIMS-ProblemStatement-ver3.1.1.md`: QR code is the default payment method; successful payment records transaction information, shows order and transaction details, sends email, and leaves the order pending processing.
3. `Context/DatabaseDescription.md`: `payment_transactions` must use `transaction_id`, `invoice_id`, `transaction_content`, `transaction_datetime`, `amount`, `status`, `payment_method`, `error_code`, `gateway_transaction_ref`, and `created_at`; `payment_method` values are `QR_CODE` or `CREDIT_CARD`.
4. `Context/Group20-ClassDesignSpecification.md`: preserve BCE intent by keeping UI boundaries thin, payment controls/use-case services responsible for orchestration, VietQR boundary/gateway responsible for external API calls, and entities responsible for persistence.
5. `Context/vietqr-docs/`: canonical Transaction Sync endpoint is `POST /bank/api/transaction-sync`; required Transaction Sync fields include `bankaccount`, `amount`, `transType`, `content`, `transactionid`, `transactiontime`, `referencenumber`, and `orderId`; response shape must follow VietQR docs.
6. `_bmad-output/implementation-artifacts/3-2-pay-with-qr-code-via-vietqr.md` is historical/reference only. Do not treat its file list, test claims, or stale route notes as source of truth.

## Acceptance Criteria

1. Current User Behavior Preserved
   - Given the existing Pay by VietQR happy path exists,
   - When this refactor is complete,
   - Then user-visible behavior remains unchanged for QR generation, waiting/confirmation states, "I have paid", success display, cart emptying timing, payment success email, and order transition to `PENDING_PROCESSING`.

2. Callback Route Contract Stabilized
   - Given VietQR sends Transaction Sync,
   - When the callback reaches AIMS,
   - Then the canonical application route is `POST /bank/api/transaction-sync`.
   - And any `/vqr` prefix is treated only as an explicitly documented infrastructure/base-path deployment decision, not as the application route.
   - And code, tests, `backend/vietqr_backend_flow.md`, env docs, ngrok/VietQR setup notes, and generated story references all name the same final public callback URL.

3. Transaction Sync Authorization and DTO Validation
   - Given AIMS receives a Transaction Sync payload,
   - When `Authorization` is missing, not `Bearer`, invalid, or expired,
   - Then AIMS rejects the request with the documented VietQR error response shape and persists no transaction.
   - When any required Transaction Sync field is missing or invalid (`bankaccount`, `amount`, `transType`, `content`, `transactionid`, `transactiontime`, `referencenumber`, `orderId`),
   - Then AIMS rejects the request with the documented VietQR error response shape and persists no transaction.
   - And DTO validation uses NestJS/class-validator patterns already available in `backend/package.json`.

4. Token Lifecycle Is Request-Safe
   - Given multiple customers generate QR codes and confirm payments concurrently,
   - When each confirmation calls VietQR Test Callback,
   - Then no confirmation depends on mutable singleton access-token state from another request or a previous QR-generation request.
   - And token retrieval or caching is owned by the VietQR gateway/boundary layer with expiry awareness based on the VietQR 300-second token lifetime.
   - And confirm payment works even if the server process has no stored token from a previous `generateQRCode` call.

5. Persistence Contract Aligned or Formally Decided
   - Given a successful VietQR payment is persisted,
   - When AIMS writes `payment_transactions`,
   - Then persisted fields match the approved database contract from `Context/DatabaseDescription.md`.
   - And VietQR payments use `payment_method = QR_CODE`, not `VIETQR`, unless the database documentation is formally updated in the same change.
   - And `gateway_transaction_ref` stores the VietQR transaction reference (`referencenumber` or `transactionid` as decided), while the AIMS-generated `reftransactionid` remains the response receipt returned to VietQR.
   - And any decision to keep order-based persistence instead of invoice-based persistence must be explicitly documented because `DatabaseDescription.md` currently requires `invoice_id`.

6. Deterministic Payment Matching and Idempotency
   - Given Transaction Sync includes a VietQR `orderId` and content derived from QR generation,
   - When AIMS matches the callback to an order/payment reference,
   - Then matching is deterministic and does not scan all orders as the primary lookup strategy.
   - And QR generation preserves VietQR constraints: `orderId` maximum 13 characters and transfer `content` maximum 23 characters, no special characters.
   - And duplicate callbacks are idempotent or explicitly rejected without duplicate transaction records, duplicate emails, or repeated status side effects.

7. Ownership Refactor Completed After Contracts Are Covered
   - Given tests lock the intended route, validation, token, persistence, matching, and idempotency behavior,
   - When files/classes are moved or renamed,
   - Then Nest HTTP controllers remain thin, transaction sync processing is extracted into a payment application service, outbound VietQR calls are isolated in a gateway/boundary adapter, and TypeORM entities remain in the payment persistence layer.
   - And unused dependencies and stale comments are removed.

8. Test Coverage Added Before Structural Moves
   - Given backend tests run,
   - When `npm test` is executed from `backend`,
   - Then tests cover QR generation orchestration, token handling without singleton state, Transaction Sync missing/invalid Authorization, missing required fields, amount mismatch, content mismatch, successful persistence/status update/email trigger boundary, duplicate/idempotent callback behavior, and customer-cancel manual refund compatibility.
   - And the existing Hello World-only e2e coverage is no longer the only backend verification for payment behavior.

9. Documentation Updated
   - Given this story is complete,
   - When a developer reads payment docs,
   - Then `backend/vietqr_backend_flow.md` describes the current Transaction Sync flow, not stale `VietQRWebhookBoundary`, `/api/vietqr/webhook`, or frontend-simulated webhook behavior.
   - And a tracked env contract documents required variables without secrets: `VIETQR_TOKEN_URL`, `VIETQR_GENERATE_URL`, `VIETQR_TEST_CALLBACK_URL`, `VIETQR_USERNAME`, `VIETQR_PASSWORD`, `BANK_CODE`, `BANK_ACCOUNT`, `USER_BANK_NAME`, `CLIENT_USERNAME`, `CLIENT_PASSWORD`, `JWT_SECRET`, and `APP_PUBLIC_URL` or equivalent public callback URL variable.

## Tasks / Subtasks

- [x] Task 1: Freeze intended contracts before editing behavior (AC: 2, 3, 5, 6, 9)
  - [x] Confirm final application callback route is `POST /bank/api/transaction-sync`.
  - [x] Decide persistence alignment path: align code to `DatabaseDescription.md` or formally update database docs in the same change.
  - [x] Define canonical VietQR payment reference fields: short `orderId`, `content`, VietQR `referencenumber`/`transactionid`, AIMS `reftransactionid`.
  - [x] Document required env variables and public callback URL rules before relying on local `.env`.

- [x] Task 2: Add safety tests around current and intended behavior before moving files (AC: 1, 2, 3, 4, 5, 6, 8)
  - [x] Add unit tests for QR generation request mapping: amount, content, bank fields, `qrType = 0`, `transType = C`, and short order id.
  - [x] Add unit tests proving confirm payment obtains a valid token without depending on previous singleton state.
  - [x] Add Transaction Sync tests for missing Authorization, invalid token, missing required fields, amount mismatch, content mismatch, successful callback, and duplicate callback.
  - [x] Add or adjust tests for customer cancellation after successful QR payment to ensure manual refund behavior still works.

- [x] Task 3: Stabilize callback route and strict DTO validation (AC: 2, 3)
  - [x] Replace or alias the current `vqr/bank/api/transaction-sync` application route according to the canonical route decision.
  - [x] Move Transaction Sync request/response DTOs into payment DTO files.
  - [x] Use class-validator/class-transformer validation for all required Transaction Sync fields.
  - [x] Preserve VietQR response shape for success and errors.

- [x] Task 4: Fix token lifecycle and VietQR gateway responsibility (AC: 4)
  - [x] Remove `private accessToken` request coupling from the payment orchestration singleton.
  - [x] Make the VietQR boundary/gateway responsible for fetching or caching tokens with expiry.
  - [x] Ensure Test Callback always uses a fresh or non-expired token.

- [x] Task 5: Stabilize deterministic matching, persistence, and idempotency (AC: 5, 6)
  - [x] Replace all-order scan with deterministic lookup based on stored or derivable payment reference.
  - [x] Persist successful transactions using the approved payment transaction contract or update docs formally if schema cannot match.
  - [x] Use `QR_CODE` as the approved VietQR payment method value unless formal schema docs are changed.
  - [x] Ensure duplicate callback handling prevents duplicate transaction rows, duplicate emails, and repeated side effects.

- [x] Task 6: Extract ownership boundaries after contract tests pass (AC: 7)
  - [x] Make payment HTTP controller class naming match its Nest/controller role.
  - [x] Extract Transaction Sync processing out of the Nest controller into a payment service.
  - [x] Keep outbound VietQR API calls in a gateway/boundary adapter.
  - [x] Register moved files in `PaymentModule` and remove unused injections.
  - [x] Move/rename files only after the test suite protects behavior.

- [x] Task 7: Preserve frontend behavior and contracts (AC: 1)
  - [x] Keep existing Angular routes and visible payment flow unless a backend response contract requires a minimal type adjustment.
  - [x] Ensure cart emptying remains after confirmed successful transaction only.
  - [x] Ensure success screen still has order and transaction details required by the Problem Statement.

- [x] Task 8: Update docs and generated artifacts (AC: 2, 9)
  - [x] Update `backend/vietqr_backend_flow.md` to the final Transaction Sync flow.
  - [x] Add/update tracked env documentation or `backend/.env.example` without secrets.
  - [x] Mark Story 3.2 artifact as historical/reference-only if touched, or avoid relying on it.

- [x] Task 9: Final verification (AC: 1-9)
  - [x] Run backend unit tests.
  - [x] Run backend build if practical.
  - [x] Run frontend build/tests only if frontend response contracts were changed.
  - [x] Manually verify the sandbox flow if credentials/public callback URL are available.

## Files Likely Affected

Contract and backend implementation:

- `backend/src/payment/controllers/pay-order.controller.ts`
- `backend/src/payment/services/pay-through-payment-gateway.service.ts`
- `backend/src/boundaries/viet-qr/transaction-sync.controller.ts`
- `backend/src/boundaries/viet-qr/viet-qr.service.ts`
- `backend/src/payment/entities/payment-transaction.entity.ts`
- `backend/src/payment/payment.module.ts`
- New likely files under `backend/src/payment/dto/`
- New likely files under `backend/src/payment/services/`
- New likely files under `backend/src/payment/gateways/`

Related behavior and compatibility:

- `backend/src/customer-order/customer-order.service.ts`
- `backend/src/refund/refund.service.ts`
- `backend/src/refund/entities/refund-transaction.entity.ts`
- `backend/src/order/entities/order.entity.ts`
- `backend/src/notification/notification.service.ts`
- `backend/src/notification/email/payment-success-email.builder.ts`

Tests:

- New or updated `backend/src/payment/**/*.spec.ts`
- New or updated `backend/src/customer-order/**/*.spec.ts`
- Optional e2e coverage under `backend/test/` if integration behavior is practical to test there.

Frontend should usually remain behaviorally unchanged, but may need type-only or endpoint-contract adjustments:

- `frontend/src/app/boundaries/vietqr-payment-screen/vietqr-payment-screen.component.ts`
- `frontend/src/app/boundaries/vietqr-payment-screen/vietqr-payment-screen.component.html`
- `frontend/src/app/services/order.service.ts`
- `frontend/src/app/models/order.model.ts`

Documentation and configuration:

- `backend/vietqr_backend_flow.md`
- `backend/.env.example` or equivalent tracked env contract doc
- `_bmad-output/implementation-artifacts/3-2-pay-with-qr-code-via-vietqr.md` only if marking stale sections as historical

## Current State Notes for Dev Agent

- Current route drift: docs/story expect `POST /bank/api/transaction-sync`; current source exposes `@Post('vqr/bank/api/transaction-sync')`; old backend flow doc still references `/api/vietqr/webhook`.
- Current token risk: `PayThroughPaymentGatewayController` stores `private accessToken` in a singleton provider and reuses it during confirm.
- Current validation risk: `TransactionCallbackDto` is a plain class without strict class-validator decorators, and runtime checks only cover amount/content matching.
- Current ownership drift: `TransactionSyncController` performs auth, matching, validation, persistence, order update, email side effect, and response formatting; it should become a thin controller delegating to a service.
- Current matching risk: Transaction Sync scans all orders and matches by order id/short id/content includes; replace with deterministic lookup.
- Current persistence drift: `PaymentTransaction` code uses `payment_transaction_id`, `order_id`, `transaction_ref`, `payment_method = VIETQR`, and `payment_details`; database docs require `transaction_id`, `invoice_id`, `transaction_content`, `transaction_datetime`, `gateway_transaction_ref`, and `payment_method = QR_CODE`.
- Current test gap: Story 3.2 claims payment tests exist, but backend inventory only showed a default Hello World e2e and no payment service spec.
- Current docs gap: `backend/vietqr_backend_flow.md` is stale and must not be used as current implementation truth until updated.

## Testing Requirements

Minimum backend automated tests:

- QR generation maps order amount/content into VietQR generate body.
- QR generation respects `content` length <= 23 and `orderId` length <= 13.
- Confirm payment works without relying on previous singleton token state.
- Token cache, if implemented, refreshes expired tokens and does not leak between concurrent confirmations.
- Transaction Sync rejects missing Authorization.
- Transaction Sync rejects invalid/expired Bearer token.
- Transaction Sync rejects missing required payload fields.
- Transaction Sync rejects invalid amount.
- Transaction Sync rejects amount mismatch.
- Transaction Sync rejects content mismatch.
- Transaction Sync persists a successful payment and sets order status to `PENDING_PROCESSING`.
- Transaction Sync returns VietQR success response shape with `object.reftransactionid`.
- Duplicate Transaction Sync callback is idempotent or rejected without duplicate persistence/email/status side effects.
- Customer cancellation after successful QR payment still creates a `MANUAL_REQUIRED` manual bank transfer refund.

Manual/integration verification when sandbox credentials and public callback URL are available:

- Start backend and frontend.
- Configure public callback URL ending in `/bank/api/transaction-sync`.
- Create/place an order and open VietQR screen.
- Generate QR.
- Click "I have paid".
- Confirm VietQR Test Callback reaches Transaction Sync.
- Verify success screen, cart emptying, order status `PENDING_PROCESSING`, transaction record, and payment email behavior.

## Non-Goals

- Do not change UI behavior or visible customer flow beyond preserving existing success/error behavior.
- Do not expand PayPal or Credit Card functionality.
- Do not implement Product Manager reject/manual refund flow unless a shared payment/refund contract must be touched for this story.
- Do not add new payment gateways.
- Do not perform a cosmetic file move before contracts and tests are stabilized.
- Do not commit real secrets or credentials.

## References

- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-17.md`
- `_bmad-output/implementation-artifacts/investigations/pay-by-vietqr-refactor-investigation.md`
- `project-context.md`
- `Context/AIMS-ProblemStatement-ver3.1.1.md`
- `Context/DatabaseDescription.md`
- `Context/Group20-ClassDesignSpecification.md`
- `backend/vietqr_backend_flow.md`
- `Context/vietqr-docs/1-APIGetToken.md`
- `Context/vietqr-docs/2-APITransactionSync.md`
- `Context/vietqr-docs/3-CallAPIGetToken.md`
- `Context/vietqr-docs/4-CallAPIGenerateQRCode.md`
- `Context/vietqr-docs/5-CallAPITestCallback.md`
- `Context/vietqr-docs/mô tả luồng nghiệp vụ API.md`
- `_bmad-output/implementation-artifacts/3-2-pay-with-qr-code-via-vietqr.md` (reference only; not source of truth)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm test -- --runTestsByPath src/boundaries/viet-qr/viet-qr.service.spec.ts src/payment/services/pay-through-payment-gateway.service.spec.ts src/payment/services/transaction-sync.service.spec.ts src/customer-order/customer-order.service.spec.ts` failed in red phase, then passed after implementation.
- `npm test` passed: 9 test suites, 60 tests.
- `npm run build` passed.

### Completion Notes List

- Stabilized the canonical Transaction Sync application route as `POST /bank/api/transaction-sync`.
- Added class-validator DTO validation and a dedicated `TransactionSyncService` for authorization, validation, deterministic matching, persistence, idempotency, order update, and email side effects.
- Moved VietQR access-token ownership into the VietQR boundary/gateway with expiry-aware caching and removed payment orchestration singleton token coupling.
- Aligned successful VietQR persistence to `payment_method = QR_CODE`, `transaction_id`, `transaction_content`, `transaction_datetime`, `gateway_transaction_ref`, and documented the temporary order-based relation because persisted invoices do not exist yet.
- Preserved frontend routes and visible flow; no frontend contract changes were required.
- Updated env and backend flow docs to describe the current Transaction Sync setup.
- Fixed small pre-existing backend regression test mismatches in order/product specs and behavior so the full backend suite passes.

### File List

- `_bmad-output/implementation-artifacts/3-3-refactor-and-stabilize-pay-by-vietqr-contracts.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `backend/.env.example`
- `backend/src/boundaries/viet-qr/transaction-sync.controller.ts`
- `backend/src/boundaries/viet-qr/viet-qr.service.ts`
- `backend/src/boundaries/viet-qr/viet-qr.service.spec.ts`
- `backend/src/customer-order/customer-order.service.ts`
- `backend/src/customer-order/customer-order.service.spec.ts`
- `backend/src/order/order.controller.spec.ts`
- `backend/src/order/order.service.ts`
- `backend/src/payment/controllers/pay-order.controller.ts`
- `backend/src/payment/dto/transaction-sync.dto.ts`
- `backend/src/payment/entities/payment-transaction.entity.ts`
- `backend/src/payment/payment.module.ts`
- `backend/src/payment/services/pay-through-payment-gateway.service.ts`
- `backend/src/payment/services/pay-through-payment-gateway.service.spec.ts`
- `backend/src/payment/services/transaction-sync.service.ts`
- `backend/src/payment/services/transaction-sync.service.spec.ts`
- `backend/src/product/product.controller.ts`
- `backend/src/product/product.service.ts`
- `backend/vietqr_backend_flow.md`

## Change Log

- 2026-06-18: Refactored and stabilized Pay by VietQR contracts; added route, DTO, token lifecycle, persistence, idempotency, refund compatibility tests; updated docs and env contract.
