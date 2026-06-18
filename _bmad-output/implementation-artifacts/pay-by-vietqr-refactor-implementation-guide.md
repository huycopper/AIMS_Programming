# Pay by VietQR Refactor Implementation Guide

Generated: 2026-06-18T17:30:32+07:00

Source backlog: `_bmad-output/implementation-artifacts/refactor-pay-by-vietqr-backlog.md`

This guide consolidates the full Pay by VietQR refactor into one implementation document. Treat `PVQR-1.1` through `PVQR-6.2` as ordered checklist tasks, not separate story files.

## Objective

Move the existing Pay by VietQR use case into dedicated BCE-oriented slices without changing runtime behavior.

Target backend slice:

```text
backend/src/pay-order/pay-by-vietqr/
```

Target backend notification slice:

```text
backend/src/pay-order/notification/
```

Target frontend slice:

```text
frontend/src/app/pay-order/pay-by-vietqr/
```

Shared entities, especially `PaymentTransaction`, stay in their current shared locations because PayPal, refund, and customer-order flows also use them.

## Global Constraints

- Do not change any public endpoint.
- Do not change business behavior.
- Do not move `PaymentTransaction` out of its shared location.
- Do not optimize order matching in this refactor.
- Do not change the database schema.
- Do not change the VietQR success state transition: successful VietQR payment still updates the order to `PENDING_PROCESSING`.
- Do not change the payment success email business behavior.
- Do not change the VietQR transaction-sync response shape, status codes, JSON field names, or success/error semantics.
- Do not change existing email environment variable names or defaults, including `EMAIL_ENABLED`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, and `APP_PUBLIC_URL`.
- Do not remove or rename `PaymentTransaction.receiptEmailSentAt` or `PaymentTransaction.receiptEmailError`.
- Preserve receipt email persistence semantics: successful email send sets `receiptEmailSentAt` and clears `receiptEmailError`; failed email send stores `receiptEmailError`.
- Receipt email failure must not roll back or prevent `PaymentTransaction` persistence, order status persistence, or the successful VietQR transaction-sync response.
- A missing delivery email address must preserve the existing payment success notification behavior.
- Do not change order cancellation email behavior in `customer-order`; keep compatibility wrappers/imports temporarily if needed.
- Do not change cart cleanup behavior: the frontend clears cart and ordering drafts only after confirmed success with a transaction.
- Do not change the VietQR Sandbox Test Callback behavior.
- Do not implement automatic VietQR refund behavior.
- Keep VietQR manual refund behavior unchanged.
- Keep response JSON field names unchanged.
- For `PVQR-1.1`, the primary acceptance signal is live endpoint/integration characterization against the local backend, not mock-only unit tests.
- Mock tests may be used only as supporting coverage where useful; they do not replace acceptance verification through the real local backend endpoints.
- Agents may read `.env` during test execution and manual verification so the backend and VietQR sandbox use the correct local configuration.
- Never copy, print, commit, or write secret values from `.env` into artifacts, logs, test output, commits, or final responses.
- When VietQR callback behavior is verified, ensure the local backend on port `8080` is publicly reachable through `https://carefully-nectar-gulf.ngrok-free.dev` by running `ngrok http 8080` when needed.

## Test Strategy

`PVQR-1.1` must characterize Pay by VietQR through live endpoint/integration verification against the local backend. The verification should exercise the currently implemented HTTP contract and VietQR sandbox callback path using the project configuration loaded from `.env`, while keeping all secret values out of artifacts, logs, commits, and responses.

Mock-based tests are allowed as supporting checks for hard-to-isolate dependencies, but they are not the acceptance mechanism for `PVQR-1.1`.

Required live endpoints:

- `POST /api/payment/pay-order/:orderId`
- `POST /api/payment/pay-order/:orderId/confirm`
- `GET /api/payment/pay-order/:orderId/confirmation`
- `POST /vqr/api/token_generate`
- `POST /vqr/bank/api/transaction-sync`

Payment success email characterization must prove:

- Successful VietQR transaction-sync creates and saves a `PaymentTransaction`, then attempts payment success notification.
- Successful email send sets `receiptEmailSentAt`, clears `receiptEmailError`, and transaction-sync still returns the current success response shape.
- Failed email send stores `receiptEmailError`, leaves persisted payment/order changes committed, and transaction-sync still returns the current success response shape.
- Missing delivery email preserves the current no-recipient behavior.
- `EMAIL_ENABLED=false` keeps the current simulated-send behavior.
- Order cancellation email remains covered by existing tests or smoke checks so the payment success refactor does not break `customer-order`.

## Target Structure

Backend Pay by VietQR slice:

```text
backend/src/pay-order/pay-by-vietqr/
  pay-by-vietqr.module.ts

  entity/
    vietqr-payment-code.vo.ts
    vietqr-transaction-sync.dto.ts
    vietqr-payment-details.vo.ts
    payment-confirmation.model.ts

  control/
    pay-through-vietqr.controller.ts
    vietqr-qr-generation.control.ts
    vietqr-payment-confirmation.control.ts
    vietqr-transaction-sync.control.ts
    vietqr-callback-validator.control.ts
    vietqr-order-matcher.control.ts
    vietqr-payment-transaction-factory.ts

  boundary/
    http/
      pay-order.controller.ts
      dto/
        generate-vietqr-payment.response.ts
        payment-confirmation.response.ts

    webhook/
      vietqr-token.boundary.ts
      vietqr-transaction-sync.boundary.ts
      dto/
        vietqr-token.response.ts
        vietqr-transaction-sync.response.ts

    gateway/
      vietqr.boundary.ts
      vietqr-boundary.types.ts
```

Backend Pay Order notification slice:

```text
backend/src/pay-order/notification/
  pay-order-notification.module.ts

  entity/
    email-message.model.ts
    payment-success-email.model.ts
    payment-success-notification-result.model.ts

  control/
    payment-success-notification.control.ts
    payment-success-email-template.control.ts

  boundary/
    email/
      email.boundary.ts
      nodemailer-email.boundary.ts
      email-boundary.types.ts
```

Frontend Pay by VietQR slice:

```text
frontend/src/app/pay-order/pay-by-vietqr/
  entity/
    vietqr-payment.models.ts

  control/
    vietqr-payment.control.ts
    vietqr-payment-storage.control.ts

  boundary/
    api/
      vietqr-payment.boundary.ts

    ui/
      vietqr-payment-screen.component.ts
      vietqr-payment-screen.component.html
      vietqr-payment-screen.component.css
```

## Implementation Checklist

### Phase 1: Backend and Frontend Safety Net

#### [ ] PVQR-1.1: Live Endpoint Characterization Tests For Backend VietQR Flow

Goal: Capture current backend VietQR behavior through live local backend endpoint characterization and manual integration verification before moving or splitting production files.

Expected file scope:

- `backend/src/payment/controllers/pay-order.controller.ts`
- `backend/src/payment/services/pay-through-payment-gateway.service.ts`
- `backend/src/boundaries/viet-qr/viet-qr.service.ts`
- `backend/src/boundaries/viet-qr/transaction-sync.controller.ts`
- New backend test files for VietQR behavior.

Acceptance checklist:

- [ ] Live endpoint verification covers QR generation through `POST /api/payment/pay-order/:orderId`.
- [ ] Live endpoint verification covers payment confirmation through `POST /api/payment/pay-order/:orderId/confirm`.
- [ ] Live endpoint verification covers confirmation query/polling through `GET /api/payment/pay-order/:orderId/confirmation`.
- [ ] Live endpoint verification covers VietQR token generation through `POST /vqr/api/token_generate`.
- [ ] Live endpoint verification covers transaction sync success and basic error paths through `POST /vqr/bank/api/transaction-sync`.
- [ ] VietQR sandbox callback behavior is verified with backend port `8080` exposed through `https://carefully-nectar-gulf.ngrok-free.dev`.
- [ ] Supporting mock tests are only supporting coverage, not the acceptance mechanism.
- [ ] `.env` may be read for configuration, but secret values are never copied, printed, committed, or written to artifacts/logs/output.
- [ ] Production behavior remains unchanged.

Tests/checks:

- [ ] Start backend on local port `8080`.
- [ ] Start tunnel with `ngrok http 8080` when callback verification is needed.
- [ ] Exercise the five live endpoints above.
- [ ] Run `npm test` from `backend` after automated test updates.

Do not:

- Do not modify production behavior unless strictly required to make tests possible.
- Do not accept this task based only on mocks.
- Do not expose `.env` secrets.
- Do not change endpoints.
- Do not optimize order matching.

#### [ ] PVQR-1.2: Frontend Characterization Tests For VietQR Screen

Goal: Capture current frontend VietQR UI states before extracting API/control/storage concerns.

Expected file scope:

- `frontend/src/app/boundaries/vietqr-payment-screen/vietqr-payment-screen.component.ts`
- `frontend/src/app/boundaries/vietqr-payment-screen/vietqr-payment-screen.component.html`
- `frontend/src/app/boundaries/vietqr-payment-screen/vietqr-payment-screen.component.css`
- New or updated frontend spec files.

Acceptance checklist:

- [ ] Missing `orderId` displays an error state.
- [ ] Successful QR loading displays QR image, amount, and content.
- [ ] Successful payment confirmation renders success details.
- [ ] Cart and ordering drafts are cleared only after confirmed success.
- [ ] Polling timeout displays the existing non-success error state.

Tests/checks:

- [ ] Add Angular component tests with mocked `OrderService` and `CartService`.
- [ ] Use fake timers for polling behavior.
- [ ] Run frontend test suite.

Do not:

- Do not change UI text or visual behavior unless required by existing tests.
- Do not change route paths.
- Do not change backend API paths.

### Phase 2: Backend Entity, DTO, And Value Object Extraction

#### [ ] PVQR-2.1: Extract VietQR DTO And Response Models

Goal: Move VietQR request/response model definitions out of large controllers and into the new backend slice.

Expected file scope:

- Create `backend/src/pay-order/pay-by-vietqr/entity/vietqr-transaction-sync.dto.ts`
- Create `backend/src/pay-order/pay-by-vietqr/entity/payment-confirmation.model.ts`
- Create `backend/src/pay-order/pay-by-vietqr/boundary/webhook/dto/vietqr-token.response.ts`
- Create `backend/src/pay-order/pay-by-vietqr/boundary/webhook/dto/vietqr-transaction-sync.response.ts`
- Create `backend/src/pay-order/pay-by-vietqr/boundary/http/dto/generate-vietqr-payment.response.ts`
- Create `backend/src/pay-order/pay-by-vietqr/boundary/http/dto/payment-confirmation.response.ts`
- Update imports in current backend VietQR files.

Acceptance checklist:

- [ ] DTO and response shapes remain unchanged.
- [ ] `transaction-sync.controller.ts` no longer defines inline response classes.
- [ ] Existing endpoints still return the same JSON field names.
- [ ] Backend tests from Phase 1 still pass.

Do not:

- Do not change response JSON field names.
- Do not change endpoint paths.
- Do not move `PaymentTransaction`.

#### [ ] PVQR-2.2: Extract VietQR Payment Code Value Object

Goal: Centralize VietQR payment code rules: short order id, payment content, and rounded amount.

Expected file scope:

- Create `backend/src/pay-order/pay-by-vietqr/entity/vietqr-payment-code.vo.ts`
- Update `backend/src/boundaries/viet-qr/viet-qr.service.ts`
- Update `backend/src/boundaries/viet-qr/transaction-sync.controller.ts`

Acceptance checklist:

- [ ] Short order id remains the order UUID without hyphens, truncated to the first 13 characters.
- [ ] Payment content remains `AIMS <shortOrderId>`.
- [ ] Payment amount remains the rounded numeric `order.totalAmount`.
- [ ] QR generation and transaction sync validation use the same value object.

Tests/checks:

- [ ] Add unit tests for `VietQrPaymentCode`.
- [ ] Run backend tests from Phase 1.

Do not:

- Do not change payment content format.
- Do not change short order id length or derivation.
- Do not change amount validation semantics.

### Phase 3: Backend Control And Boundary Split

#### [ ] PVQR-3.1: Move VietQR External Client Into Boundary/Gateway

Goal: Move external VietQR API calls into the new backend slice while keeping request behavior unchanged.

Expected file scope:

- Create `backend/src/pay-order/pay-by-vietqr/boundary/gateway/vietqr.boundary.ts`
- Create `backend/src/pay-order/pay-by-vietqr/boundary/gateway/vietqr-boundary.types.ts`
- Update imports/providers in `backend/src/payment/payment.module.ts`
- Update imports in current payment orchestration code.

Acceptance checklist:

- [ ] `getAccessToken`, `generateQRCode`, and `handleAPICallback` behavior remains unchanged.
- [ ] VietQR token request headers remain unchanged.
- [ ] VietQR QR generation request body remains unchanged.
- [ ] VietQR Sandbox Test Callback request body remains unchanged.
- [ ] QR conversion still uses `qrcode.toDataURL`.

Tests/checks:

- [ ] Add or update tests that mock `fetch`.
- [ ] Run backend tests from Phase 1.

Do not:

- Do not change environment variable names.
- Do not change VietQR request body fields.
- Do not introduce a new HTTP client abstraction unless needed for this move.

#### [ ] PVQR-3.2: Extract PayThroughVietQRController Control

Goal: Rename and move payment orchestration into a BCE-aligned VietQR control class.

Expected file scope:

- Create `backend/src/pay-order/pay-by-vietqr/control/pay-through-vietqr.controller.ts`
- Optionally create `backend/src/pay-order/pay-by-vietqr/control/vietqr-payment-confirmation.control.ts`
- Update imports in `backend/src/payment/controllers/pay-order.controller.ts`
- Update providers in `backend/src/payment/payment.module.ts`

Acceptance checklist:

- [ ] `PayThroughPaymentGatewayController` responsibilities are represented by `PayThroughVietQRController`.
- [ ] Public control methods preserve current semantics: generate QR, confirm payment, get confirmation.
- [ ] Confirmation response remains unchanged.
- [ ] Mutable access token behavior is not redesigned.

Do not:

- Do not change confirmation response shape.
- Do not change polling attempts or delay.
- Do not redesign access token caching.

#### [ ] PVQR-3.3: Move Pay Order HTTP Boundary Into Backend Slice

Goal: Move the frontend-facing pay order controller into the VietQR backend slice.

Expected file scope:

- Create `backend/src/pay-order/pay-by-vietqr/boundary/http/pay-order.controller.ts`
- Update `backend/src/payment/payment.module.ts`
- Retire or replace imports from `backend/src/payment/controllers/pay-order.controller.ts`

Acceptance checklist:

- [ ] `POST /api/payment/pay-order/:orderId` remains exactly unchanged.
- [ ] `POST /api/payment/pay-order/:orderId/confirm` remains exactly unchanged.
- [ ] `GET /api/payment/pay-order/:orderId/confirmation` remains exactly unchanged.
- [ ] Controller acts as a thin HTTP boundary and delegates to control.
- [ ] Order lookup behavior remains unchanged.
- [ ] No duplicate route registration exists.

Do not:

- Do not change route path, HTTP method, or response shape.
- Do not move `Order` entity.
- Do not change order-not-found behavior.

#### [ ] PVQR-3.4: Split Transaction Sync Webhook Boundary And Control

Goal: Split the large transaction sync controller into thin webhook boundaries and control services.

Expected file scope:

- Create `backend/src/pay-order/pay-by-vietqr/boundary/webhook/vietqr-token.boundary.ts`
- Create `backend/src/pay-order/pay-by-vietqr/boundary/webhook/vietqr-transaction-sync.boundary.ts`
- Create `backend/src/pay-order/pay-by-vietqr/control/vietqr-transaction-sync.control.ts`
- Create `backend/src/pay-order/pay-by-vietqr/control/vietqr-callback-validator.control.ts`
- Create `backend/src/pay-order/pay-by-vietqr/control/vietqr-order-matcher.control.ts`
- Create `backend/src/pay-order/pay-by-vietqr/control/vietqr-payment-transaction-factory.ts`
- Update module providers/controllers.

Acceptance checklist:

- [ ] `POST /vqr/api/token_generate` response behavior remains unchanged.
- [ ] `POST /vqr/bank/api/transaction-sync` success and error response shapes remain unchanged.
- [ ] Bearer token validation behavior remains unchanged.
- [ ] Basic credential validation behavior remains unchanged.
- [ ] Order matching still queries all orders and matches using existing logic.
- [ ] Amount and content validation behavior remains unchanged.
- [ ] Transaction creation fields remain unchanged.
- [ ] Order status update to `PENDING_PROCESSING` remains unchanged.
- [ ] Receipt email success/error handling remains unchanged through current notification dependency until Phase 4 replaces it.
- [ ] Transaction sync control exposes a clear delegation point for payment success notification.

Tests/checks:

- [ ] Add tests for invalid/missing Basic auth.
- [ ] Add tests for invalid/missing Bearer auth.
- [ ] Add tests for no matching order, amount mismatch, content mismatch, and successful transaction sync.
- [ ] Add tests for email failure after transaction persistence, or preserve equivalent evidence from `PVQR-4.1` if implemented first.
- [ ] Run backend unit and e2e smoke tests.

Do not:

- Do not optimize order matching.
- Do not replace the all-orders query.
- Do not change transaction response JSON shape.
- Do not redesign notification behavior.
- Do not change transaction persistence fields.

#### [ ] PVQR-3.5: Create And Wire PayByVietQrModule

Goal: Create a dedicated NestJS module for the backend VietQR slice and wire it into the existing backend module graph.

Expected file scope:

- Create `backend/src/pay-order/pay-by-vietqr/pay-by-vietqr.module.ts`
- Update `backend/src/payment/payment.module.ts`
- Optionally update `backend/src/app.module.ts` if the final module graph requires direct import.

Acceptance checklist:

- [ ] VietQR controllers/providers are owned by `PayByVietQrModule`.
- [ ] `TypeOrmModule.forFeature([PaymentTransaction, Order])` remains available where needed.
- [ ] `JwtModule`, `ConfigModule`, and `NotificationModule` dependencies remain available where needed.
- [ ] No duplicate routes/providers remain.
- [ ] Backend compiles and tests pass.

Do not:

- Do not move shared entities.
- Do not change module behavior unrelated to VietQR.
- Do not introduce circular module imports.

### Phase 4: Backend Payment Success Email Notification Refactor

#### [ ] PVQR-4.1: Characterize Current Payment Success Email Behavior

Goal: Capture current payment success email behavior before moving notification, email transport, template, or transaction-sync orchestration code.

Expected file scope:

- `backend/src/boundaries/viet-qr/transaction-sync.controller.ts`
- `backend/src/notification/notification.service.ts`
- `backend/src/notification/email/email.service.ts`
- `backend/src/notification/email/payment-success-email.builder.ts`
- `backend/src/payment/entities/payment-transaction.entity.ts`
- New or updated backend tests for payment success notification behavior.

Acceptance checklist:

- [ ] Characterization covers successful payment success email after transaction persistence.
- [ ] Success sets `PaymentTransaction.receiptEmailSentAt` and clears `PaymentTransaction.receiptEmailError`.
- [ ] Email failure saves `PaymentTransaction.receiptEmailError`.
- [ ] Email failure does not roll back saved `PaymentTransaction`.
- [ ] Email failure does not roll back order status update to `PENDING_PROCESSING`.
- [ ] Email failure does not change VietQR transaction-sync success response shape.
- [ ] Missing delivery email behavior is covered exactly as today.
- [ ] Missing delivery email does not throw and preserves the current `receiptEmailSentAt`/`receiptEmailError` outcome.
- [ ] `EMAIL_ENABLED=false` simulated-send behavior is covered if practical.
- [ ] Current payment success email subject, text/html essentials, recipient source, and `APP_PUBLIC_URL` link behavior are recorded without exposing secrets.

Do not:

- Do not move production notification code.
- Do not change email content, subject, recipient selection, or env variable usage.
- Do not change transaction-sync response shape.
- Do not change database schema.
- Do not expose `.env` secrets.

#### [ ] PVQR-4.2: Extract Email Transport And Nodemailer Into Boundary

Goal: Move generic email transport and nodemailer-specific behavior behind a Pay Order notification Boundary while preserving existing SMTP and simulated-send behavior.

Expected file scope:

- Create `backend/src/pay-order/notification/boundary/email/email.boundary.ts`
- Create `backend/src/pay-order/notification/boundary/email/nodemailer-email.boundary.ts`
- Create `backend/src/pay-order/notification/boundary/email/email-boundary.types.ts`
- Update or temporarily wrap `backend/src/notification/email/email.service.ts`
- Update provider wiring in relevant notification modules.

Acceptance checklist:

- [ ] `EmailBoundary` exposes an OOP boundary interface for sending an `EmailMessage`.
- [ ] `NodemailerEmailBoundary` owns `nodemailer.createTransport` and `transporter.sendMail`.
- [ ] Existing env variable names and defaults remain unchanged.
- [ ] `EMAIL_ENABLED=false` still logs/simulates without SMTP.
- [ ] SMTP `from`, `to`, `subject`, `text`, and `html` behavior remains unchanged.
- [ ] Existing order cancellation email can still send through the old public API or compatibility wrapper.
- [ ] No payment success email business orchestration is added to the Boundary.

Do not:

- Do not rename email env variables.
- Do not change SMTP behavior.
- Do not put payment success template logic in the Boundary.
- Do not remove the old `EmailService` public API until cancellation compatibility is proven.

#### [ ] PVQR-4.3: Extract Payment Success Email Message, Model, And Template Control

Goal: Move payment success email content into BCE-aligned models and a template control without changing rendered email behavior.

Expected file scope:

- Create `backend/src/pay-order/notification/entity/email-message.model.ts`
- Create `backend/src/pay-order/notification/entity/payment-success-email.model.ts`
- Create `backend/src/pay-order/notification/control/payment-success-email-template.control.ts`
- Update or temporarily wrap `backend/src/notification/email/payment-success-email.builder.ts`
- Update imports used by payment success notification code.

Acceptance checklist:

- [ ] `EmailMessage` represents recipient, subject, text, and html.
- [ ] `PaymentSuccessEmail` represents input/content state derived from `Order`, `PaymentTransaction`, and `APP_PUBLIC_URL`.
- [ ] `PaymentSuccessEmailTemplateControl` builds subject, text, and html.
- [ ] Subject remains `[AIMS] Payment Successful - Order #<orderId>`.
- [ ] Recipient remains `order.deliveryInfo?.email`.
- [ ] Customer name fallback remains `Customer`.
- [ ] View order link remains `${APP_PUBLIC_URL}/orders/view/${order.orderViewToken}`.
- [ ] Cancel order link remains `${APP_PUBLIC_URL}/orders/cancel/${order.cancelToken}`.
- [ ] Currency formatting remains Vietnamese VND formatting.
- [ ] Transaction reference and payment method content remain present.
- [ ] Existing builder can remain as a compatibility wrapper during migration.

Do not:

- Do not redesign email copy.
- Do not add new email fields.
- Do not change order view/cancel URL routes.
- Do not change transaction field names used in email content.

#### [ ] PVQR-4.4: Extract Payment Success Notification Orchestration Control

Goal: Move payment success notification orchestration into a dedicated Control that coordinates recipient checks, template creation, email Boundary sending, and notification result state.

Expected file scope:

- Create `backend/src/pay-order/notification/control/payment-success-notification.control.ts`
- Create `backend/src/pay-order/notification/entity/payment-success-notification-result.model.ts`
- Update or temporarily wrap `backend/src/notification/notification.service.ts`
- Update tests from `PVQR-4.1`.

Acceptance checklist:

- [ ] `PaymentSuccessNotificationControl` orchestrates payment success notification for an `Order` and `PaymentTransaction`.
- [ ] Missing delivery email preserves current behavior, does not throw, and produces a result that lets transaction-sync preserve current `receiptEmailSentAt`/`receiptEmailError` outcome.
- [ ] Successful email send returns a result that lets transaction-sync set `receiptEmailSentAt` and clear `receiptEmailError`.
- [ ] Failed email send returns or throws in a way transaction-sync can preserve current `receiptEmailError` behavior.
- [ ] Control does not save `PaymentTransaction` directly unless deliberately keeping an equivalent persistence boundary documented in tests.
- [ ] Control does not update order status.
- [ ] Control does not construct VietQR transaction-sync responses.
- [ ] Existing `NotificationService.sendPaymentSuccessNotification` may delegate to the new control temporarily.

Do not:

- Do not let notification failure abort transaction-sync success.
- Do not let notification control own VietQR validation, order matching, transaction creation, or response construction.
- Do not change `receiptEmailSentAt`/`receiptEmailError` semantics.

#### [ ] PVQR-4.5: Create And Wire PayOrderNotificationModule

Goal: Create a dedicated NestJS module for Pay Order notification providers and wire it into the backend module graph.

Expected file scope:

- Create `backend/src/pay-order/notification/pay-order-notification.module.ts`
- Update `backend/src/pay-order/pay-by-vietqr/pay-by-vietqr.module.ts`
- Optionally update `backend/src/payment/payment.module.ts` or `backend/src/app.module.ts` if required.
- Keep or update `backend/src/notification/notification.module.ts` for compatibility.

Acceptance checklist:

- [ ] `PayOrderNotificationModule` provides and exports payment success notification control.
- [ ] Module provides the email Boundary implementation.
- [ ] Module imports `ConfigModule` as needed for email config.
- [ ] `PayByVietQrModule` or the module owning transaction-sync can inject `PaymentSuccessNotificationControl`.
- [ ] Existing `NotificationModule` remains available for order cancellation email or delegates safely.
- [ ] No circular module imports are introduced.
- [ ] Backend compiles.

Do not:

- Do not remove `NotificationModule` while `customer-order` still imports it.
- Do not register duplicate transaction-sync controllers.
- Do not move shared TypeORM entities.

#### [ ] PVQR-4.6: Update Transaction Sync Control To Call Payment Success Notification Control

Goal: Replace direct use of the old payment success notification service from transaction-sync with the new Pay Order notification control while preserving all transaction-sync behavior.

Expected file scope:

- `backend/src/pay-order/pay-by-vietqr/control/vietqr-transaction-sync.control.ts`
- `backend/src/pay-order/pay-by-vietqr/boundary/webhook/vietqr-transaction-sync.boundary.ts`
- `backend/src/pay-order/notification/control/payment-success-notification.control.ts`
- `backend/src/pay-order/notification/entity/payment-success-notification-result.model.ts`
- Module provider wiring.

Acceptance checklist:

- [ ] Transaction sync calls `PaymentSuccessNotificationControl` after `PaymentTransaction` is saved.
- [ ] Transaction sync still updates order status to `PENDING_PROCESSING`.
- [ ] Email success sets `receiptEmailSentAt` to current time, clears `receiptEmailError`, saves transaction, and returns existing success response shape.
- [ ] Email failure stores `receiptEmailError`, saves transaction, and still returns existing success response shape.
- [ ] Missing delivery email preserves current non-throwing behavior and current receipt field outcome.
- [ ] Email failure does not roll back transaction persistence or order status persistence.
- [ ] Existing non-email error paths return the same error response shape.
- [ ] No database schema changes are required.

Do not:

- Do not change VietQR transaction-sync response JSON.
- Do not change transaction creation fields.
- Do not change order status transition.
- Do not change payment success email content.
- Do not update database schema.

#### [ ] PVQR-4.7: Preserve Order Cancellation Notification Compatibility

Goal: Ensure the Pay Order payment success notification refactor does not break order cancellation email in `customer-order`.

Expected file scope:

- `backend/src/notification/notification.service.ts`
- `backend/src/notification/notification.module.ts`
- `backend/src/notification/email/order-cancelled-email.builder.ts`
- `backend/src/customer-order/customer-order.service.ts`
- `backend/src/customer-order/customer-order.module.ts`
- Compatibility wrappers/imports as needed.

Acceptance checklist:

- [ ] `CustomerOrderService` can still call `sendOrderCancelledNotification` as before.
- [ ] Order cancellation email still uses the same recipient source, subject/content builder, and email transport behavior.
- [ ] Any compatibility wrapper is temporary and limited to preserving current imports/API.
- [ ] Payment success email implementation no longer needs to live in the old generic notification path once transaction-sync uses the new control.
- [ ] No unrelated customer-order behavior changes.

Do not:

- Do not refactor order cancellation email into `pay-order/notification` unless required only for compatibility.
- Do not change customer-order cancellation behavior.
- Do not change refund transaction behavior.

### Phase 5: Frontend Slice Refactor

#### [ ] PVQR-5.1: Extract Frontend VietQR API Boundary From OrderService

Goal: Move frontend VietQR HTTP calls from the broad `OrderService` into a dedicated API boundary.

Expected file scope:

- Create `frontend/src/app/pay-order/pay-by-vietqr/boundary/api/vietqr-payment.boundary.ts`
- Update `frontend/src/app/boundaries/vietqr-payment-screen/vietqr-payment-screen.component.ts`
- Optionally keep temporary compatibility wrappers in `frontend/src/app/services/order.service.ts`.

Acceptance checklist:

- [ ] VietQR API methods live in the new boundary.
- [ ] API URL remains `http://localhost:8080/api/payment/pay-order`.
- [ ] Component behavior remains unchanged.
- [ ] Order placement and customer-order methods in `OrderService` remain unaffected.

Do not:

- Do not change backend API paths.
- Do not change request/response types.
- Do not alter order/customer-order service behavior.

#### [ ] PVQR-5.2: Move Frontend VietQR Models Into Frontend Slice

Goal: Move VietQR-specific TypeScript interfaces out of the general order model file.

Expected file scope:

- Create `frontend/src/app/pay-order/pay-by-vietqr/entity/vietqr-payment.models.ts`
- Update imports in the new VietQR API boundary.
- Update imports in the VietQR payment screen.
- Optionally leave compatibility exports in `frontend/src/app/models/order.model.ts` until cleanup.

Acceptance checklist:

- [ ] `VietQrPaymentRequest` lives in the VietQR slice.
- [ ] `PaymentConfirmationResponse` and related confirmation interfaces live in the VietQR slice.
- [ ] TypeScript field names and optionality remain unchanged.
- [ ] Existing order-related models remain unaffected.

Do not:

- Do not change interface field names.
- Do not change backend response assumptions.
- Do not move non-VietQR order models.

#### [ ] PVQR-5.3: Extract Frontend Payment State And Storage Controls

Goal: Move frontend polling, success handling, and localStorage cleanup out of the component into control services.

Expected file scope:

- Create `frontend/src/app/pay-order/pay-by-vietqr/control/vietqr-payment.control.ts`
- Create `frontend/src/app/pay-order/pay-by-vietqr/control/vietqr-payment-storage.control.ts`
- Update `frontend/src/app/boundaries/vietqr-payment-screen/vietqr-payment-screen.component.ts`

Acceptance checklist:

- [ ] Component still displays the same loading, error, QR, confirming, and success states.
- [ ] Polling max attempts and delay remain unchanged.
- [ ] Local storage key `aims_current_order_id` remains unchanged.
- [ ] Local storage key `aims_current_invoice` remains unchanged.
- [ ] Local storage key `aims_delivery_draft` remains unchanged.
- [ ] Cart and draft cleanup still occur only after confirmed success.
- [ ] `PaymentConfirmationResponse.status === "SUCCESS"` plus transaction presence remains the success condition.

Do not:

- Do not change polling window.
- Do not change localStorage key names.
- Do not clear cart earlier than current behavior.

#### [ ] PVQR-5.4: Move VietQR Screen Into Frontend Slice UI Folder

Goal: Move the VietQR payment screen files into the target frontend slice path.

Expected file scope:

- Move `frontend/src/app/boundaries/vietqr-payment-screen/vietqr-payment-screen.component.ts`
- Move `frontend/src/app/boundaries/vietqr-payment-screen/vietqr-payment-screen.component.html`
- Move `frontend/src/app/boundaries/vietqr-payment-screen/vietqr-payment-screen.component.css`
- Target path: `frontend/src/app/pay-order/pay-by-vietqr/boundary/ui/`
- Update `frontend/src/app/app.routes.ts`

Acceptance checklist:

- [ ] Route `/vietqr-payment/:orderId` remains unchanged.
- [ ] Route `/vietqr-payment` remains unchanged.
- [ ] App routes import the component from the new path.
- [ ] No imports remain from the old VietQR payment screen folder.
- [ ] UI renders as before.

Do not:

- Do not change route paths.
- Do not change component selector unless unavoidable.
- Do not change UI behavior.

### Phase 6: Cleanup And Verification

#### [ ] PVQR-6.1: Remove Old VietQR And Payment Success Notification Files And Imports Safely

Goal: Remove old VietQR and payment success notification files/imports after backend, notification, and frontend slices are fully wired.

Expected file scope:

- Old backend files under `backend/src/boundaries/viet-qr/`
- Old backend files under `backend/src/payment/controllers/` and `backend/src/payment/services/` that are fully replaced by the slice.
- Old payment success notification files/imports under `backend/src/notification/` that are fully replaced by `backend/src/pay-order/notification/`.
- Old frontend files under `frontend/src/app/boundaries/vietqr-payment-screen/`
- Import references across backend and frontend.

Acceptance checklist:

- [ ] No duplicate VietQR classes/providers/controllers remain.
- [ ] No imports point to old VietQR paths.
- [ ] No transaction-sync imports point to old payment success notification service/builder.
- [ ] Payment success email providers live under `backend/src/pay-order/notification/`.
- [ ] Order cancellation email remains compatible through `NotificationService` or another retained compatibility path.
- [ ] Shared `PaymentTransaction` remains in its shared location.
- [ ] Backend and frontend compile.
- [ ] Tests pass.

Tests/checks:

- [ ] Run `rg` searches for old path/class references.
- [ ] Run `rg` searches for old payment success notification references.
- [ ] Run backend tests.
- [ ] Run frontend tests.

Do not:

- Do not delete shared entities.
- Do not delete payment/refund/customer-order code outside the VietQR refactor scope.
- Do not delete order cancellation email code.
- Do not cleanup unrelated code.

#### [ ] PVQR-6.2: Full Regression Checklist For Pay By VietQR

Goal: Verify that the refactor preserved end-to-end Pay by VietQR behavior.

Expected file scope:

- Test files and optional verification notes.
- No production code changes expected unless regressions are found.

Acceptance checklist:

- [ ] QR generation succeeds.
- [ ] Payment confirmation triggers VietQR Sandbox Test Callback.
- [ ] Transaction Sync persists `PaymentTransaction`.
- [ ] Transaction Sync updates order status to `PENDING_PROCESSING`.
- [ ] Payment success email uses the new `backend/src/pay-order/notification/` control/boundary/entity slice.
- [ ] Payment success email success behavior remains unchanged.
- [ ] Payment success email success sets `receiptEmailSentAt` and clears `receiptEmailError`.
- [ ] Payment success email failure records `receiptEmailError`.
- [ ] Payment success email failure does not roll back payment persistence.
- [ ] Payment success email failure does not roll back order status persistence.
- [ ] Payment success email failure does not change VietQR transaction-sync success response shape.
- [ ] Missing delivery email behavior remains unchanged, including the current non-throwing transaction-sync outcome.
- [ ] `EMAIL_ENABLED=false` simulated-send behavior remains unchanged.
- [ ] Existing SMTP env variable behavior remains unchanged.
- [ ] Order cancellation email in `customer-order` remains functional.
- [ ] Frontend success screen displays order details.
- [ ] Frontend success screen displays transaction details.
- [ ] Cart and ordering drafts are cleared only after confirmed success.
- [ ] VietQR manual refund constraint remains unchanged.

Tests/checks:

- [ ] Run backend unit tests.
- [ ] Run backend e2e smoke tests.
- [ ] Run payment success notification control tests.
- [ ] Run email boundary tests with nodemailer mocked.
- [ ] Run transaction-sync tests for email success, email failure, and missing delivery email.
- [ ] Run customer-order/order cancellation notification compatibility tests or smoke checks.
- [ ] Run frontend unit/component tests.
- [ ] Run manual VietQR sandbox flow if environment and public callback URL are available.

Do not:

- Do not merge the refactor solely on compile success.
- Do not alter business behavior while fixing regression issues unless a separate story is created.
- Do not accept the notification refactor without proving `receiptEmailSentAt` and `receiptEmailError` semantics.
- Do not accept the notification refactor if VietQR transaction-sync response shape changes.
- Do not accept the notification refactor if order cancellation email is broken.

