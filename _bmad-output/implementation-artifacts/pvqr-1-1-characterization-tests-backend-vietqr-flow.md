---
baseline_commit: 2a02342393ccac3de17c8c15374a6ed4913c5567
---

# Story PVQR-1.1: Live Endpoint Characterization For Backend VietQR Flow

Status: in-progress

## Story

As a developer refactoring the VietQR payment slice,
I want live endpoint characterization tests and manual integration verification around the current backend VietQR behavior,
so that later BCE-oriented file moves and splits can be done with confidence and without changing runtime behavior.

## Context

The Pay by VietQR backend flow is already implemented and working, but responsibilities are currently spread across broad payment and boundary files. This story creates a safety net before any production refactor. The safety net must capture current behavior through the real local backend endpoints, including existing response shapes, endpoint paths, callback validation, order matching, transaction persistence, order status updates, and email error handling.

This story is not a mock-only unit-test story. Mock tests may support hard-to-isolate behavior, but acceptance depends on live endpoint / integration characterization against the local backend. Agents may read `.env` to start and verify the backend with the correct configuration, but must never copy, print, commit, or write secret values from `.env` into artifacts, logs, test output, or final responses.

For VietQR callback verification, the local backend must run on port `8080` and be publicly reachable through:

```text
https://carefully-nectar-gulf.ngrok-free.dev
```

Use `ngrok http 8080` when the tunnel is needed.

Source context:

- Refactor backlog: `_bmad-output/implementation-artifacts/refactor-pay-by-vietqr-backlog.md`
- Global project context: `project-context.md`
- Current backend implementation:
  - `backend/src/payment/controllers/pay-order.controller.ts`
  - `backend/src/payment/services/pay-through-payment-gateway.service.ts`
  - `backend/src/boundaries/viet-qr/viet-qr.service.ts`
  - `backend/src/boundaries/viet-qr/transaction-sync.controller.ts`
  - `backend/src/payment/payment.module.ts`
- Shared entities that must stay shared:
  - `backend/src/payment/entities/payment-transaction.entity.ts`
  - `backend/src/order/entities/order.entity.ts`
- Existing test patterns:
  - `backend/src/order/order.service.spec.ts`
  - `backend/src/order/order.controller.spec.ts`
  - Jest config in `backend/package.json`

## Files Involved

### Production Files To Read, Not Refactor

- `backend/src/payment/controllers/pay-order.controller.ts`
  - Current frontend-facing endpoints:
    - `POST /api/payment/pay-order/:orderId`
    - `POST /api/payment/pay-order/:orderId/confirm`
    - `GET /api/payment/pay-order/:orderId/confirmation`
  - Current behavior: loads `Order` by `orderId`; throws `BadRequestException('Order not found')` for missing orders on pay/confirm; delegates to `PayThroughPaymentGatewayController`.

- `backend/src/payment/services/pay-through-payment-gateway.service.ts`
  - Current orchestration behavior:
    - `generateQRCode(order)` obtains a VietQR access token, stores it in the mutable `accessToken` field, calls `VietQRBoundary.generateQRCode`, and returns `{ qrDataURL, amount, content }`.
    - `confirmPayment(order)` calls the VietQR Sandbox Test Callback through `handleAPICallback(order, accessToken)`.
    - Non-`SUCCESS` callback status returns a payment confirmation response with no transaction.
    - `SUCCESS` callback status waits up to 10 attempts with 500 ms delay for transaction sync persistence.
    - `getPaymentConfirmation(orderId)` returns current order status when no successful transaction exists.
    - If a successful transaction exists and the order is not `PENDING_PROCESSING`, it updates and saves the order.
    - Response shape is defined by `PaymentConfirmationResponse` and must stay unchanged.

- `backend/src/boundaries/viet-qr/viet-qr.service.ts`
  - Current external VietQR boundary behavior:
    - `getAccessToken()` calls `process.env.VIETQR_TOKEN_URL` with Basic auth built from `VIETQR_USERNAME` and `VIETQR_PASSWORD`.
    - `generateQRCode(order, accessToken)` calls `process.env.VIETQR_GENERATE_URL` with Bearer auth and body fields `bankCode`, `bankAccount`, `userBankName`, `content`, `qrType`, `amount`, `orderId`, `transType`.
    - The short order id is `order.orderId` with hyphens removed and truncated to 13 characters.
    - Payment content is `AIMS <shortOrderId>`.
    - Payment amount is `Math.round(Number(order.totalAmount))`.
    - QR output uses `qrcode.toDataURL(data.qrCode)` and returns `{ qrDataURL, amount, content }`.
    - `handleAPICallback(order, accessToken)` calls `process.env.VIETQR_TEST_CALLBACK_URL` with Bearer auth and body fields `bankAccount`, `content`, `amount`, `transType`, `bankCode`.

- `backend/src/boundaries/viet-qr/transaction-sync.controller.ts`
  - Current webhook behavior:
    - `POST /vqr/api/token_generate` requires `Authorization: Basic <base64 username:password>`.
    - Valid credentials are `CLIENT_USERNAME` and `CLIENT_PASSWORD`; generated JWT uses `JWT_SECRET`, `HS512`, and `expiresIn: '5m'`.
    - Token response fields are `access_token`, `token_type`, `expires_in`.
    - `POST /vqr/bank/api/transaction-sync` requires Bearer auth.
    - Invalid/missing Bearer auth returns HTTP 401 with `{ error: true, errorReason, toastMessage, object: null }`.
    - Valid Bearer token is verified using `JWT_SECRET`.
    - Order matching currently loads all orders with `orderRepo.find()` and matches by exact `orderId`, short order id, or `content` containing `AIMS <shortOrderId>`.
    - Amount validation compares rounded callback amount to rounded `order.totalAmount`.
    - Content validation requires callback content to include `AIMS <shortOrderId>`.
    - Successful sync creates a `PaymentTransaction` with payment method `VIETQR`, status `SUCCESS`, callback details, and generated `reftransactionid`.
    - Successful sync updates order status to `PENDING_PROCESSING`.
    - Receipt email success sets `receiptEmailSentAt` and clears `receiptEmailError`.
    - Receipt email failure stores `receiptEmailError` and still returns success to VietQR after persistence.
    - Processing errors return HTTP 400 with `errorReason: 'TRANSACTION_FAILED'`.

### Test And Verification Files To Add

Add focused live endpoint / integration characterization coverage and verification notes in the backend test/documentation locations that best match the existing project structure. The dev agent may also add supporting unit specs under `backend/src` where useful, but those specs are supporting evidence only.

Recommended automated test targets, if the current backend test setup supports them:

- A live/local integration or e2e spec that exercises:
  - `POST /api/payment/pay-order/:orderId`
  - `POST /api/payment/pay-order/:orderId/confirm`
  - `GET /api/payment/pay-order/:orderId/confirmation`
  - `POST /vqr/api/token_generate`
  - `POST /vqr/bank/api/transaction-sync`
- Supporting focused unit specs only for behavior that cannot be reliably exercised through live endpoint verification.

Recommended manual verification artifact:

- A short verification note or checklist under `_bmad-output/implementation-artifacts/` or the relevant backend test documentation area that records which live endpoints were exercised, which non-secret configuration assumptions were used, and whether VietQR callback verification used `https://carefully-nectar-gulf.ngrok-free.dev`.

## Acceptance Criteria

1. Live endpoint setup is reproducible and secret-safe.
   - Given the agent needs to verify Pay by VietQR behavior, when setup begins, then the agent may read `.env` for runtime configuration without copying, printing, committing, or writing secret values anywhere.
   - Given callback behavior must be verified, when the backend is started, then it listens on local port `8080`.
   - Given VietQR sandbox callback needs a public backend URL, when the tunnel is started with `ngrok http 8080`, then the public backend URL is verified as `https://carefully-nectar-gulf.ngrok-free.dev`.

2. QR generation is characterized through the real local backend endpoint.
   - Given an existing order id, when `POST /api/payment/pay-order/:orderId` is called against the local backend, then the current response shape preserves `qrDataURL`, `amount`, and `content`.
   - Given a missing order id, when `POST /api/payment/pay-order/:orderId` is called, then the existing missing-order behavior is preserved.
   - Given the live endpoint returns QR data, when the response is inspected, then the payment content, rounded amount, and short-order-id behavior match the current implementation.

3. Payment confirmation is characterized through the real local backend endpoint and current VietQR sandbox callback configuration.
   - Given an existing order id with a generated VietQR payment, when `POST /api/payment/pay-order/:orderId/confirm` is called, then the current confirmation response shape is preserved.
   - Given the VietQR sandbox callback returns non-success, when confirmation is requested, then the current non-success confirmation behavior is preserved.
   - Given the VietQR sandbox callback returns success and transaction sync is observed, when confirmation is requested, then the flow reaches the existing `SUCCESS` confirmation behavior.
   - Given transaction sync is not observed during the current polling window, when confirmation is requested, then the existing pending-confirmation behavior is preserved.

4. Confirmation polling/query behavior is characterized through the real local backend endpoint.
   - Given an order id, when `GET /api/payment/pay-order/:orderId/confirmation` is called, then the current confirmation response shape is preserved.
   - Given no successful transaction exists, when confirmation is queried, then the current no-transaction response is preserved.
   - Given a successful transaction exists, when confirmation is queried, then the response includes the existing order summary fields and transaction summary fields.
   - Given a successful transaction exists while the order is not `PENDING_PROCESSING`, when confirmation is queried, then the current order status transition to `PENDING_PROCESSING` is preserved.

5. VietQR token generation is characterized through the real local backend endpoint.
   - Given valid configured Basic credentials, when `POST /vqr/api/token_generate` is called, then the current token response fields remain `access_token`, `token_type`, and `expires_in`.
   - Given missing, non-Basic, or invalid credentials, when `POST /vqr/api/token_generate` is called, then the existing error behavior is preserved.
   - Given token verification requires configured secrets, when evidence is recorded, then no secret values are included in the artifact or output.

6. VietQR transaction sync is characterized through the real local backend endpoint.
   - Given missing or invalid Bearer auth, when `POST /vqr/bank/api/transaction-sync` is called, then the current HTTP 401 response shape is preserved.
   - Given a valid token and no matching order, when transaction sync is called, then the current `TRANSACTION_FAILED` behavior is preserved.
   - Given a valid token and invalid amount, amount mismatch, or content mismatch, when transaction sync is called, then the current `TRANSACTION_FAILED` behavior is preserved.
   - Given a valid callback for a matching order, when transaction sync is called, then `PaymentTransaction` persistence, order status update to `PENDING_PROCESSING`, receipt email attempt, and the current success response shape are preserved.
   - Given receipt email fails after transaction persistence, when transaction sync completes, then the transaction sync response still succeeds and the existing email-error recording behavior is preserved.

7. Supporting mocks are optional and secondary.
   - Given a behavior is difficult to isolate through the live endpoint path, when supporting tests are added, then mocks may be used for repositories, JWT, notification, QR conversion, or external dependency isolation.
   - Given supporting mock tests exist, when story acceptance is evaluated, then they do not replace live endpoint verification.

8. Production behavior remains unchanged.
   - Given this is a characterization story, when implementation is complete, then public endpoints, response field names, status transitions, environment variable names, database schema, migration order, and existing VietQR Sandbox Test Callback behavior are unchanged.
   - Given production code changes are not part of this story, when changes are reviewed, then production code is untouched unless the user explicitly approves a separate minimal testability change.

## Tasks / Subtasks

- [ ] Task 1: Prepare live endpoint verification setup. (AC: 1)
  - [ ] Read `.env` for backend, database, VietQR sandbox, callback, JWT, and notification configuration without exposing values.
  - [ ] Start the backend locally on port `8080`.
  - [ ] Start ngrok with `ngrok http 8080`.
  - [ ] Verify the public backend URL is `https://carefully-nectar-gulf.ngrok-free.dev`.
  - [ ] Confirm VietQR sandbox callback or current endpoint configuration points to the public backend URL when callback verification is required.

- [ ] Task 2: Characterize pay-order QR generation through the live backend. (AC: 2)
  - [ ] Call `POST /api/payment/pay-order/:orderId` for an existing order.
  - [ ] Record non-secret evidence that the response shape preserves `qrDataURL`, `amount`, and `content`.
  - [ ] Verify current payment content, rounded amount, and short-order-id behavior from the endpoint response.
  - [ ] Call the same endpoint for a missing order and verify the existing missing-order behavior.

- [ ] Task 3: Characterize payment confirmation through the live backend and VietQR sandbox callback path. (AC: 3)
  - [ ] Call `POST /api/payment/pay-order/:orderId/confirm` after QR generation.
  - [ ] Verify the current confirmation response shape for success, non-success, or pending-confirmation outcomes according to sandbox behavior.
  - [ ] Verify the callback path uses the public backend URL when VietQR needs to reach localhost.
  - [ ] Preserve evidence without copying tokens, credentials, or secret-bearing request/response headers.

- [ ] Task 4: Characterize confirmation query through the live backend. (AC: 4)
  - [ ] Call `GET /api/payment/pay-order/:orderId/confirmation`.
  - [ ] Verify the no-transaction response shape when no successful transaction exists.
  - [ ] Verify successful transaction response fields when a transaction exists.
  - [ ] Verify the existing `PENDING_PROCESSING` status transition behavior.

- [ ] Task 5: Characterize VietQR token generation through the live backend. (AC: 5)
  - [ ] Call `POST /vqr/api/token_generate` with valid configured Basic auth without exposing credentials.
  - [ ] Verify response fields `access_token`, `token_type`, and `expires_in` without recording the token value.
  - [ ] Verify missing, non-Basic, or invalid credential error behavior without recording secret values.

- [ ] Task 6: Characterize VietQR transaction sync through the live backend. (AC: 6)
  - [ ] Call `POST /vqr/bank/api/transaction-sync` with missing or invalid Bearer auth and verify the current 401 response shape.
  - [ ] Call transaction sync with no matching order and verify current `TRANSACTION_FAILED` behavior.
  - [ ] Call transaction sync with invalid amount, amount mismatch, or content mismatch and verify current `TRANSACTION_FAILED` behavior.
  - [ ] Call transaction sync with a valid callback payload for a matching order and verify transaction persistence, order status update, receipt email attempt, and success response shape.
  - [ ] Verify receipt email failure behavior if the current environment can safely exercise it.

- [ ] Task 7: Add supporting automated tests only where they strengthen the live endpoint safety net. (AC: 7, 8)
  - [ ] Add focused supporting specs for behavior that cannot be safely or deterministically covered through live endpoint verification.
  - [ ] Use mocks only for supporting coverage, not as the main acceptance evidence.
  - [ ] Ensure any test-local env setup records variable names only, never values.

- [ ] Task 8: Verify and record results. (AC: 1, 7, 8)
  - [ ] Run focused live endpoint checks.
  - [ ] Run the full backend test suite if automated tests were added.
  - [ ] Record non-secret verification notes showing which endpoints were exercised and whether ngrok/public callback verification was used.
  - [ ] Fix only test artifacts or verification notes in this story; do not refactor VietQR production behavior.

## Test Commands

Setup commands:

```bash
# Backend must listen on local port 8080.
npm run start:dev
```

```bash
ngrok http 8080
```

Manual/live endpoint verification must use:

```text
https://carefully-nectar-gulf.ngrok-free.dev
```

Run automated tests from `backend` when tests are added or updated:

```bash
npm test
```

Focused command examples depend on the final spec filenames chosen by the dev agent:

```bash
npm test -- <focused-vietqr-spec-name>
```

Optional verification:

```bash
npm run test:cov
npm run build
```

## Constraints

- Do not change any public endpoint.
- Do not change business behavior.
- Do not move `PaymentTransaction` out of `backend/src/payment/entities/payment-transaction.entity.ts`.
- Do not change the database schema.
- Do not optimize order matching.
- Do not change successful VietQR payment order status transition: it remains `PENDING_PROCESSING`.
- Do not change VietQR Sandbox Test Callback behavior.
- Do not implement automatic VietQR refund behavior.
- Keep manual VietQR refund behavior unchanged.
- Keep environment variable names unchanged.
- Keep response JSON field names unchanged.
- Use live local backend endpoints as the primary acceptance path for this story.
- Mock tests are supporting coverage only and must not replace live endpoint verification.
- `.env` may be read to run backend/test/manual verification with the correct configuration.
- Do not copy, print, commit, or write secret values from `.env` into tests, documentation, artifacts, logs, test output, commits, or final responses.
- When callback verification needs public localhost, expose backend port `8080` with `ngrok http 8080`.
- Public callback/backend URL for this story is `https://carefully-nectar-gulf.ngrok-free.dev`.
- Do not change migration order.
- Do not copy secret values from `backend/.env` into tests or documentation.
- Follow current NestJS/Jest patterns and TypeScript import style already used by the backend.

## Out Of Scope

- Refactoring production code into `backend/src/pay-order/pay-by-vietqr/`.
- Creating DTO/value object files planned for PVQR-2.1 or PVQR-2.2.
- Moving the VietQR external client to a new gateway boundary.
- Splitting transaction sync into separate boundary/control classes.
- Creating `PayByVietQrModule`.
- Changing frontend code or frontend tests.
- Changing `.env` secret values or committing any `.env` content.
- Printing or storing real tokens, credentials, or secret-bearing headers in verification evidence.
- Changing polling attempts or delay.
- Redesigning mutable access-token storage.
- Changing email notification behavior.

## Rollback Notes

- This story should add test and verification artifacts only. If rollback is needed, remove the new PVQR-1.1 test files and verification notes.
- If the agent started the backend or ngrok for verification, stop those local processes after verification.
- No production rollback is expected because production code, database schema, seed data, and migration order must not change.
- No environment rollback is expected because `.env` values may be read but must not be edited, copied, committed, or printed.

## Dev Notes

- The objective is characterization, not ideal design. Tests should encode current behavior even where the current design mixes Boundary, Control, and Entity responsibilities.
- Prefer live endpoint / integration characterization as the primary evidence for this story.
- Use direct class unit tests with explicit mocks only as supporting coverage when the live endpoint path cannot safely or deterministically isolate a behavior.
- Use `@nestjs/testing` only where it helps catch provider wiring mistakes or support integration coverage without hiding live endpoint behavior.
- Because `backend/package.json` sets Jest `rootDir` to `src`, place new supporting unit specs under `backend/src` if they are added.
- Existing tests use straightforward `describe` and `it` blocks. Match that style.
- For private helper behavior, test through public methods unless direct access is the only practical way to characterize a critical path.
- Be careful with fake timers around polling. The service currently waits 10 attempts with 500 ms delay; tests must not spend real time waiting.
- If mutating `process.env` in supporting tests, save and restore original values in `beforeEach`/`afterEach`.
- If mocking global `fetch`, restore it after each test to avoid leaking into other specs.
- For generated `reftransactionid`, assert the stable prefix/pattern or use a deterministic mock for time/UUID if needed. Do not assert an exact live timestamp unless time is mocked.

## Environment Variables Referenced

Document variable names only. Do not copy real values.

- `VIETQR_TOKEN_URL`
- `VIETQR_GENERATE_URL`
- `VIETQR_TEST_CALLBACK_URL`
- `VIETQR_USERNAME`
- `VIETQR_PASSWORD`
- `BANK_CODE`
- `BANK_ACCOUNT`
- `USER_BANK_NAME`
- `CLIENT_USERNAME`
- `CLIENT_PASSWORD`
- `JWT_SECRET`
- `APP_PUBLIC_URL`

## Dev Agent Record

### Agent Model Used

TBD by dev agent.

### Debug Log References

TBD by dev agent.

### Completion Notes List

TBD by dev agent.

### File List

TBD by dev agent.
