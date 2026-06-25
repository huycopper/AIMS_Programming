---
baseline_commit: c5cddc30dbd284949859067975ddeb51aee9bd60
---
# Story 3.2: Pay with QR Code via VietQR

**Epic:** Epic 3: Payment Processing Integration  
**Story ID:** 3.2  
**Status:** review

## Story

As a Customer,  
I want to pay for my order by scanning a VietQR code,  
so that I can complete payment from my mobile banking app and have AIMS record the paid order.

## Acceptance Criteria

1. **Default VietQR payment path**
   - **Given** the customer has placed an order and is on the invoice screen
   - **When** the customer confirms the invoice
   - **Then** AIMS navigates to the VietQR payment screen as the default QR-code payment method, preserves the current `orderId`, and can recover the invoice/order context from browser state or local storage.

2. **QR generation through VietQR**
   - **Given** the VietQR payment screen has a valid `orderId`
   - **When** it requests payment from `POST /api/payment/pay-order/:orderId`
   - **Then** the backend loads the order, obtains a VietQR access token, calls the VietQR dynamic QR generation API, converts the returned `qrCode` string into a data URL image, and returns `{ qrDataURL, amount, content }`.
   - **And** the QR request uses `qrType: 0`, `transType: "C"`, bank configuration from environment variables, the rounded order total as `amount`, a 13-character maximum short order id, and a payment content string `AIMS <shortOrderId>` that is short enough for VietQR content limits.

3. **Payment UI state**
   - **Given** QR generation is in progress
   - **When** the customer is waiting
   - **Then** the screen shows a spinner and disables completion-sensitive actions.
   - **And** after QR generation succeeds, the screen displays the QR image, total amount, and transfer content.
   - **And** if the order id is missing or QR generation fails, the screen shows an actionable error and does not mark payment as successful.

4. **Customer confirmation triggers VietQR Sandbox Test Callback**
   - **Given** the QR code has been displayed and the customer clicks "I have paid"
   - **When** the frontend calls `POST /api/payment/pay-order/:orderId/confirm`
   - **Then** the backend calls the VietQR Sandbox Test Callback API with the same `bankAccount`, `bankCode`, `amount`, `content`, and `transType` used for QR reconciliation.
   - **And** if VietQR does not return `status: "SUCCESS"`, the order is not marked paid and the frontend continues to show a non-success state.

5. **AIMS token endpoint for VietQR callbacks**
   - **Given** VietQR needs a Bearer token before calling AIMS Transaction Sync
   - **When** VietQR calls `POST /vqr/api/token_generate` with Basic credentials
   - **Then** AIMS validates `CLIENT_USERNAME` and `CLIENT_PASSWORD`, signs a JWT with `JWT_SECRET` using HS512, and returns `{ access_token, token_type: "Bearer", expires_in: 300 }`.
   - **And** invalid or missing Basic credentials return a 400/401 error without generating a token.

6. **Transaction Sync callback processing**
   - **Given** VietQR sends a Transaction Sync callback to `POST /vqr/bank/api/transaction-sync`
   - **When** the request has a valid Bearer JWT and a callback payload
   - **Then** AIMS matches the order by full `orderId`, short order id, or payment content, validates that callback amount equals the order total, and validates that callback content contains the expected `AIMS <shortOrderId>` content.
   - **And** AIMS persists a `PaymentTransaction` with `paymentMethod: "VIETQR"`, `status: "SUCCESS"`, gateway reference, paid amount, raw VietQR payload details, and the generated AIMS `reftransactionid`.
   - **And** AIMS updates the order status to `PENDING_PROCESSING`, never directly to approved/completed.
   - **And** AIMS responds to VietQR with the documented success shape `{ error: false, errorReason: null, toastMessage, object: { reftransactionid } }`, or a documented error shape on validation failure.

7. **Frontend confirmation polling and success screen**
   - **Given** the customer has triggered payment confirmation
   - **When** the Transaction Sync callback is asynchronous
   - **Then** the frontend polls `GET /api/payment/pay-order/:orderId/confirmation` until a successful transaction is available or the retry window expires.
   - **And** once confirmed, the success screen displays customer/order details and transaction details: transaction id, payment transaction id, gateway reference, transaction content, transaction datetime, amount, method, and status.
   - **And** only after confirmed success, the cart is emptied and ordering drafts (`aims_current_order_id`, `aims_current_invoice`, `aims_delivery_draft`) are cleared.

8. **Receipt email and order links**
   - **Given** a VietQR payment transaction is saved successfully
   - **When** the order has a customer email
   - **Then** AIMS sends a payment success email with invoice/payment information and view/cancel links generated from `orderViewToken` and `cancelToken`.
   - **And** the email flow uses `APP_PUBLIC_URL` to build customer-facing links, and `EMAIL_ENABLED` controls whether delivery is simulated or sent through SMTP.
   - **And** AIMS records `receiptEmailSentAt` on success or `receiptEmailError` on failure without rolling back the recorded payment.

9. **VietQR refund constraint**
   - **Given** a paid VietQR order is later cancelled by the customer or rejected by a Product Manager
   - **When** refund handling is required
   - **Then** AIMS must not attempt an automatic VietQR refund API because this project only supports manual VietQR refund handling; downstream order-cancellation/order-review stories must record or surface the manual refund requirement for Product Manager action.

## Source Requirements

- `Context/AIMS-ProblemStatement-ver3.1.1.md`: QR code is the default payment method; after successful payment AIMS displays order and transaction information, puts the order in pending processing state, emails invoice/payment information, and records the paid order.
- `Context/TEAM-20SoftwareRequirementSpecification-Ver1.2.md`: UC001 requires access-token retrieval, QR generation, QR display, customer-triggered VietQR test callback, VietQR callback to AIMS, callback verification, and transaction recording. It also states default VietQR, alternative PayPal, VietQR manual refund, payment transaction logging, automated notifications, and transaction integrity on payment failure.
- `Context/DatabaseDescription.md`: orders use statuses `PENDING_PROCESSING`, `APPROVED`, `REJECTED`, `CANCELLED`; payment transactions must record amount, status, payment method, gateway reference, and transaction details; refund transactions support manual bank transfer with manual notes.
- `Context/Group20-ClassDesignSpecification.md`: BCE mapping includes `InvoiceScreen`, `VietQRPaymentScreen`, `VietQRBoundary`, `PayOrderController`, `PayThroughVietQRController`, and `PaymentTransaction`.
- `Context/ScreenSpecifications.md`: invoice/payment/success screens must show invoice totals, spinner while processing, back navigation, success order details, transaction details, and cart reset on success.
- `Context/vietqr-docs/*.md`: VietQR integration requires external token generation, dynamic QR generation, Sandbox Test Callback, AIMS token generation for VietQR, and Transaction Sync callback handling.
- `backend/vietqr_backend_flow.md`: Useful for backend flow orientation, but it contains an older webhook path and deprecated boundary references. Code is the source of truth for the implemented flow.

## Implemented Flow

1. `InvoiceScreen.confirmOrder()` routes to `/vietqr-payment/:orderId` and stores invoice/order context.
2. `VietQRPaymentScreen.ngOnInit()` resolves the order id from route, navigation state, or local storage.
3. `VietQRPaymentScreen.loadPaymentState()` first checks existing confirmation; if already paid, it renders success without regenerating QR.
4. `OrderService.requestVietQrPayment()` calls `POST /api/payment/pay-order/:orderId`.
5. `PayOrderBoundary.payOrder()` loads the order and delegates to `PayThroughPaymentGatewayController.generateQRCode()`.
6. `PayThroughPaymentGatewayController.generateQRCode()` calls `VietQRBoundary.getAccessToken()` and `VietQRBoundary.generateQRCode()`.
7. `VietQRBoundary.generateQRCode()` sends the dynamic QR request to VietQR and converts the returned QR payload to a data URL with the `qrcode` package.
8. The frontend displays QR, amount, transfer content, loading/error states, and the "I have paid" action.
9. `OrderService.confirmVietQrPayment()` calls `POST /api/payment/pay-order/:orderId/confirm`.
10. `PayThroughPaymentGatewayController.confirmPayment()` calls `VietQRBoundary.handleAPICallback()` to invoke the VietQR Sandbox Test Callback API, then waits briefly for Transaction Sync to create the transaction.
11. VietQR obtains an AIMS Bearer token through `POST /vqr/api/token_generate`.
12. VietQR sends the callback to `POST /vqr/bank/api/transaction-sync`.
13. `TransactionSyncController.transactionSync()` validates Bearer JWT, finds the matching order, validates amount/content, creates `PaymentTransaction`, updates order status to `PENDING_PROCESSING`, sends receipt email, and returns `reftransactionid`.
14. If the transaction arrives after the confirm call returns, the frontend polls `GET /api/payment/pay-order/:orderId/confirmation`.
15. When confirmation is successful, the frontend shows order and transaction information, empties the cart, and clears local ordering drafts.

## Technical Requirements and Guardrails

- Preserve the BCE split:
  - Frontend boundary: `frontend/src/app/boundaries/invoice-screen/*`, `frontend/src/app/boundaries/vietqr-payment-screen/*`.
  - Frontend control/service: `frontend/src/app/services/order.service.ts`.
  - Backend boundary: `backend/src/payment/controllers/pay-order.controller.ts`, `backend/src/boundaries/viet-qr/viet-qr.service.ts`, `backend/src/boundaries/viet-qr/transaction-sync.controller.ts`.
  - Backend control: `backend/src/payment/services/pay-through-payment-gateway.service.ts`.
  - Entity: `backend/src/payment/entities/payment-transaction.entity.ts`, `backend/src/order/entities/order.entity.ts`.
- Do not reintroduce the old `/api/vietqr/webhook` flow or a `viet-qr-webhook.boundary.ts` dependency. The implemented callback endpoint is `POST /vqr/bank/api/transaction-sync`.
- Do not clear the cart when QR is generated or when the customer merely clicks confirm. Clear it only after `PaymentConfirmationResponse.status === "SUCCESS"` and a transaction exists.
- Do not set a paid order to `APPROVED` or any final state. VietQR payment success moves it to `PENDING_PROCESSING` for Product Manager review.
- Keep payment content and short order id compatible with VietQR constraints: `orderId` max 13 characters and content max 23 characters, no special characters. Current code uses the hyphenless first 13 characters of the UUID and `AIMS <shortOrderId>`.
- The callback must validate both amount and content before saving a transaction. A failed validation must not save a transaction, must not update the order to pending processing, and must not clear the cart.
- Email failures are non-fatal after payment is saved. Store the error in `receiptEmailError`.
- `NotificationService.sendPaymentSuccessNotification()` must build receipt emails with `APP_PUBLIC_URL` so the email includes working order view and cancel links.
- `EmailService.sendEmail()` must respect `EMAIL_ENABLED`: when it is not exactly `"true"`, log/simulate the email and do not require SMTP delivery; when it is `"true"`, send through the configured SMTP transport.
- Do not log or document actual SMTP credentials, VietQR credentials, JWT secrets, bank account numbers, or database passwords. Story and docs may list variable names and purposes only, using `<configured in backend/.env>` for sensitive values.
- VietQR refund is manual. Do not implement automatic VietQR refund behavior in this story.
- For local Sandbox testing, the backend Transaction Sync endpoint must be reachable by VietQR through a public tunnel or deployed URL. Configure VietQR to call the public URL path `/vqr/bank/api/transaction-sync`.

## Environment and Dependencies

Backend environment variables used by this flow:

Configuration source: `backend/.env`. The story may document variable names and purposes, but must not copy secret values.

| Variable | Required for this story? | Purpose | Value handling |
|---|---:|---|---|
| `VIETQR_TOKEN_URL` | Yes | VietQR endpoint for obtaining the VietQR access token. | Document endpoint variable only; value is `<configured in backend/.env>`. |
| `VIETQR_GENERATE_URL` | Yes | VietQR endpoint for dynamic QR generation. | Document endpoint variable only; value is `<configured in backend/.env>`. |
| `VIETQR_TEST_CALLBACK_URL` | Yes | VietQR Sandbox Test Callback endpoint called after the customer clicks "I have paid". | Document endpoint variable only; value is `<configured in backend/.env>`. |
| `VIETQR_USERNAME` | Yes | Username for AIMS-to-VietQR Basic auth token request. | Sensitive; never copy value. |
| `VIETQR_PASSWORD` | Yes | Password for AIMS-to-VietQR Basic auth token request. | Sensitive; never copy value. |
| `BANK_CODE` | Yes | Bank code included in QR generation and Test Callback payloads. | Treat as configured value. |
| `BANK_ACCOUNT` | Yes | Receiving bank account included in QR generation and Test Callback payloads. | Sensitive/payment data; never copy value. |
| `USER_BANK_NAME` | Yes | Account holder name sent to VietQR QR generation. | Treat as configured value; avoid copying if it identifies a real account owner. |
| `CLIENT_USERNAME` | Yes | Username VietQR uses when requesting an AIMS Bearer token from `/vqr/api/token_generate`. | Sensitive integration credential; never copy value. |
| `CLIENT_PASSWORD` | Yes | Password VietQR uses when requesting an AIMS Bearer token from `/vqr/api/token_generate`. | Sensitive integration credential; never copy value. |
| `JWT_SECRET` | Yes | Secret used to sign/verify AIMS Bearer tokens for VietQR Transaction Sync. | Secret; never copy value. |
| `APP_PUBLIC_URL` | Yes for receipt links | Base URL used by payment success email builders to create `/orders/view/:orderViewToken` and `/orders/cancel/:cancelToken` links. | Document variable only; value is `<configured in backend/.env>`. |
| `EMAIL_ENABLED` | Yes for mail behavior | Exact string `"true"` enables real SMTP sending; any other value makes `EmailService` simulate/log the email. | Non-secret flag; document behavior, not current value. |
| `SMTP_HOST` | Required when `EMAIL_ENABLED=true` | SMTP host used by `nodemailer.createTransport()`. | Document variable only; value is `<configured in backend/.env>`. |
| `SMTP_PORT` | Required when `EMAIL_ENABLED=true` | SMTP port used by `nodemailer.createTransport()`. Default in code is `1025` if not configured. | Document variable only; value is `<configured in backend/.env>`. |
| `SMTP_SECURE` | Required when `EMAIL_ENABLED=true` | Whether SMTP uses a secure connection. Default in code is `false` if not configured. | Document variable only; value is `<configured in backend/.env>`. |
| `SMTP_USER` | Required when SMTP auth is needed | SMTP auth username. | Sensitive; never copy value. |
| `SMTP_PASS` | Required when SMTP auth is needed | SMTP auth password. | Secret; never copy value. |
| `SMTP_FROM` | Required for production-quality email | Sender address/name for receipt emails. Default in code is `"AIMS Store" <no-reply@aims.com>` if not configured. | Document variable only; value is `<configured in backend/.env>`. |

Runtime dependencies already used by the code:

- Backend: NestJS 11, TypeORM, PostgreSQL, `@nestjs/jwt`, `qrcode`, `nodemailer`, Node built-in `fetch`.
- Frontend: Angular 21 standalone components, Angular `HttpClient`, Angular Router, `DomSanitizer`, RxJS.

Dependency guardrail: `backend/src/notification/email/email.service.ts` imports `nodemailer`; ensure `nodemailer` and its TypeScript types are declared in backend dependencies/devDependencies before relying on real email delivery or backend builds.

## Data Model Notes

- Current implementation stores payment records in `payment_transactions` with:
  - `payment_transaction_id`
  - relation to `Order` through `order_id`
  - `transaction_ref`
  - `amount`
  - `payment_method`
  - `status`
  - `payment_details`
  - `receipt_email_sent_at`
  - `receipt_email_error`
  - `created_at`
  - `updated_at`
- Current implementation variance from `Context/DatabaseDescription.md`:
  - The DB spec describes payment transactions as linked to `invoice_id`; the implemented entity links directly to `Order`.
  - The DB spec names the method enum value as `QR_CODE`; the implemented code stores `VIETQR`.
  - The DB spec describes `transaction_content` and `transaction_datetime` as first-class columns; the implemented code stores those details inside `payment_details` and exposes them through the confirmation DTO.
  - These differences must be considered before future DB hardening or migrations.

## API Contracts

### Frontend to AIMS

- `POST /api/payment/pay-order/:orderId`
  - Response: `{ qrDataURL: string, amount: number, content: string }`
- `POST /api/payment/pay-order/:orderId/confirm`
  - Response: `PaymentConfirmationResponse`
- `GET /api/payment/pay-order/:orderId/confirmation`
  - Response: `PaymentConfirmationResponse`

### VietQR to AIMS

- `POST /vqr/api/token_generate`
  - Header: `Authorization: Basic Base64[username:password]`
  - Success response: `{ access_token: string, token_type: "Bearer", expires_in: 300 }`
- `POST /vqr/bank/api/transaction-sync`
  - Header: `Authorization: Bearer <AIMS token>`
  - Body fields handled by code: `transactionid`, `transactiontime`, `referencenumber`, `amount`, `content`, `bankaccount`, optional `bankAccount`, optional `orderId`, optional `sign`, `terminalCode`, `urlLink`, `serviceCode`, `subTerminalCode`, `transType`.
  - Success response: `{ error: false, errorReason: null, toastMessage: "Transaction processed successfully", object: { reftransactionid } }`
  - Error responses: 401 for missing/invalid Bearer token, 400 for transaction validation/processing errors.

### AIMS to VietQR

- Token request: `POST <VIETQR_TOKEN_URL>` with Basic auth built from `VIETQR_USERNAME:VIETQR_PASSWORD`.
- QR generation request: `POST <VIETQR_GENERATE_URL>` with Bearer VietQR token and body `{ bankCode, bankAccount, userBankName, content, qrType: 0, amount, orderId, transType: "C" }`.
- Sandbox Test Callback: `POST <VIETQR_TEST_CALLBACK_URL>` with Bearer VietQR token and body `{ bankAccount, content, amount, transType: "C", bankCode }`.

## Tasks / Subtasks

- [x] Task 1: Connect invoice flow to VietQR as default payment method (AC: 1)
  - [x] Route invoice confirmation to `/vietqr-payment/:orderId`.
  - [x] Persist current invoice and order id for refresh/back recovery.
- [x] Task 2: Generate VietQR payment QR code (AC: 2, 3)
  - [x] Add backend endpoint `POST /api/payment/pay-order/:orderId`.
  - [x] Fetch VietQR access token using Basic credentials.
  - [x] Generate dynamic VietQR QR using environment-configured bank details.
  - [x] Convert VietQR `qrCode` payload to a frontend-safe data URL.
  - [x] Render QR, amount, content, loading, back, and error states in Angular.
- [x] Task 3: Implement payment confirmation and asynchronous callback flow (AC: 4, 5, 6, 7)
  - [x] Add backend endpoint `POST /api/payment/pay-order/:orderId/confirm`.
  - [x] Call VietQR Sandbox Test Callback with matching amount/content.
  - [x] Add AIMS token generation endpoint `POST /vqr/api/token_generate`.
  - [x] Add Transaction Sync endpoint `POST /vqr/bank/api/transaction-sync`.
  - [x] Validate Bearer token, order match, amount, and content.
  - [x] Save `PaymentTransaction` and update `Order.status` to `PENDING_PROCESSING`.
  - [x] Add confirmation polling endpoint `GET /api/payment/pay-order/:orderId/confirmation`.
  - [x] Poll from frontend and render success only after a transaction exists.
- [x] Task 4: Receipt email and post-payment cleanup (AC: 7, 8)
  - [x] Send payment success email with order view/cancel links.
  - [x] Use `APP_PUBLIC_URL` when building order view and cancel links.
  - [x] Respect `EMAIL_ENABLED` so local/test runs can simulate email without SMTP delivery.
  - [x] Configure SMTP through `.env` variables without exposing secret values in documentation.
  - [x] Track receipt email success/error fields on the payment transaction.
  - [x] Empty cart and clear ordering drafts only on confirmed success.
- [x] Task 5: Document VietQR refund constraint (AC: 9)
  - [x] Capture that VietQR refund is manual and must not use automatic refund APIs.
  - [x] Leave downstream cancellation/rejection refund execution to later order-management stories.
- [ ] Task 6: Add/restore automated tests for this story
  - [ ] Backend unit tests for QR generation orchestration, Test Callback handling, confirmation polling, Transaction Sync token validation, amount/content validation, and email-error handling.
  - [ ] Frontend tests for QR loading/error states, confirmation polling, success rendering, and cart/draft cleanup.

## Testing Notes

- No VietQR-specific spec files currently exist in the repository. Existing story text previously referenced `backend/src/payment/services/pay-through-payment-gateway.service.spec.ts`, but that file is not present.
- Manual Sandbox verification should cover:
  - Missing order id on frontend.
  - Invalid backend order id.
  - VietQR token failure.
  - VietQR QR generation failure.
  - Test Callback returns non-`SUCCESS`.
  - Transaction Sync missing/invalid Bearer token.
  - Transaction Sync amount mismatch.
  - Transaction Sync content mismatch.
  - Successful transaction with delayed callback and frontend polling.
  - `EMAIL_ENABLED` not equal to `"true"`: receipt email is simulated/logged and payment still records `receiptEmailSentAt`.
  - `EMAIL_ENABLED=true` with valid SMTP configuration: receipt email is sent, links use `APP_PUBLIC_URL`, and `receiptEmailSentAt` is persisted.
  - `EMAIL_ENABLED=true` with invalid SMTP configuration: payment remains saved, order remains `PENDING_PROCESSING`, and `receiptEmailError` is persisted.
  - Missing customer email: notification logs a warning and does not throw; payment processing continues.
  - Receipt email content includes order id, transaction reference, payment method, view-order link, and cancel-order link.

## Project Structure Notes

- The implemented class name `PayOrderBoundary` lives in `backend/src/payment/controllers/pay-order.controller.ts`; it acts as the backend boundary for the pay-order endpoints even though the design names the control as `PayOrderController`.
- The implemented class name `PayThroughPaymentGatewayController` lives in a service file and covers the VietQR payment control responsibilities from `PayThroughVietQRController`.
- `backend/vietqr_backend_flow.md` is partially stale: it still describes `VietQRWebhookBoundary` and `/api/vietqr/webhook`. Do not use that old path for future implementation work.

## File List

- `backend/package.json`
- `backend/src/app.module.ts`
- `backend/.env`
- `backend/src/order/entities/order.entity.ts`
- `backend/src/payment/payment.module.ts`
- `backend/src/payment/entities/payment-transaction.entity.ts`
- `backend/src/payment/controllers/pay-order.controller.ts`
- `backend/src/payment/services/pay-through-payment-gateway.service.ts`
- `backend/src/boundaries/viet-qr/viet-qr.service.ts`
- `backend/src/boundaries/viet-qr/transaction-sync.controller.ts`
- `backend/src/notification/notification.service.ts`
- `backend/src/notification/notification.module.ts`
- `backend/src/notification/email/email.service.ts`
- `backend/src/notification/email/payment-success-email.builder.ts`
- `frontend/src/app/app.routes.ts`
- `frontend/src/app/models/order.model.ts`
- `frontend/src/app/services/order.service.ts`
- `frontend/src/app/boundaries/invoice-screen/invoice-screen.ts`
- `frontend/src/app/boundaries/invoice-screen/invoice-screen.html`
- `frontend/src/app/boundaries/vietqr-payment-screen/vietqr-payment-screen.component.ts`
- `frontend/src/app/boundaries/vietqr-payment-screen/vietqr-payment-screen.component.html`
- `frontend/src/app/boundaries/vietqr-payment-screen/vietqr-payment-screen.component.css`
- `backend/vietqr_backend_flow.md`
- `Context/vietqr-docs/1-APIGetToken.md`
- `Context/vietqr-docs/2-APITransactionSync.md`
- `Context/vietqr-docs/3-CallAPIGetToken.md`
- `Context/vietqr-docs/4-CallAPIGenerateQRCode.md`
- `Context/vietqr-docs/5-CallAPITestCallback.md`
- `Context/vietqr-docs/mô tả luồng nghiệp vụ API.md`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Reviewed story `3-2-pay-with-qr-code-via-vietqr.md`, `backend/vietqr_backend_flow.md`, BMad epics, previous story 3.1, Context docs, VietQR docs, and implemented frontend/backend code.
- Found that the old story mixed deprecated webhook guidance with the newer Transaction Sync flow.
- Found that the previously listed backend unit test file does not exist.

### Completion Notes List

- Story updated to reflect the implemented VietQR flow instead of the older direct webhook simulation.
- Added missing AIMS token generation endpoint, Transaction Sync validation, confirmation polling, receipt email, local storage recovery, cart cleanup timing, environment variables, dependency notes, and DB variance notes.
- Kept status aligned with sprint tracking as `review` because implementation exists and this update prepares the story for review/verification rather than first-time development.

### Change Log

- Replaced stale/deprecated callback path references with `POST /vqr/bank/api/transaction-sync`.
- Added full acceptance criteria for QR generation, Test Callback, AIMS token generation, Transaction Sync, polling, success UI, email, and manual refund constraints.
- Added implementation flow, API contracts, environment variables, data model notes, and testing gaps.
- Corrected file list to match files currently present in the repository.
