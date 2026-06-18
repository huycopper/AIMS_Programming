# Refactor Pay By VietQR Backlog

## Context

The Pay by VietQR use case is already implemented and working, but the current code is spread across multiple backend and frontend paths. Several classes mix Boundary, Control, and Entity responsibilities, especially the VietQR transaction sync callback handling, payment orchestration, and payment success email notification.

This backlog converts the agreed architecture decision into small, reviewable refactor stories. The refactor goal is to move the use case into dedicated BCE-oriented slices without changing runtime behavior.

Target slice paths:

- Backend: `backend/src/pay-order/pay-by-vietqr/`
- Backend notification: `backend/src/pay-order/notification/`
- Frontend: `frontend/src/app/pay-order/pay-by-vietqr/`

Shared entities, especially `PaymentTransaction`, remain in their current shared locations because PayPal, refund, and customer-order flows also use them.

Payment success email is part of the Pay by VietQR transaction-sync side effect today. The current behavior is spread across:

- `backend/src/notification/notification.service.ts`
- `backend/src/notification/email/email.service.ts`
- `backend/src/notification/email/payment-success-email.builder.ts`
- `backend/src/notification/notification.module.ts`
- `backend/src/customer-order/customer-order.service.ts`
- `backend/src/boundaries/viet-qr/transaction-sync.controller.ts`
- `backend/src/payment/entities/payment-transaction.entity.ts`

The refactor should isolate Pay Order payment success notification under `backend/src/pay-order/notification/` using BCE/OOP. Email transport and nodemailer belong behind a Boundary. Payment success notification orchestration belongs in Control. Email message, payment success email content, and notification result state belong in Entity-style models, with template/content construction in Control when it contains behavior rather than plain state.

## Global Constraints

These constraints apply to every story in this backlog:

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
- Keep existing environment variable names unchanged.
- Keep response JSON field names unchanged.
- For `PVQR-1.1`, the primary acceptance signal is live endpoint / integration characterization against the local backend, not mock-only unit tests.
- Mock tests may be used only as supporting coverage where useful; they do not replace acceptance verification through the real local backend endpoints.
- Agents may read `.env` during test execution and manual verification so the backend and VietQR sandbox use the correct local configuration.
- Never copy, print, commit, or write secret values from `.env` into artifacts, logs, test output, commits, or final responses.
- When VietQR callback behavior is verified, ensure the local backend on port `8080` is publicly reachable through `https://carefully-nectar-gulf.ngrok-free.dev` by running `ngrok http 8080` when needed.

## Test Strategy

`PVQR-1.1` must characterize Pay by VietQR through live endpoint / integration verification against the local backend. The verification should exercise the currently implemented HTTP contract and VietQR sandbox callback path using the project configuration loaded from `.env`, while keeping all secret values out of artifacts, logs, commits, and responses.

Mock-based tests are allowed as supporting checks for hard-to-isolate dependencies, but they are not the acceptance mechanism for `PVQR-1.1`. The acceptance mechanism is evidence that the real local backend endpoints preserve current behavior:

- `POST /api/payment/pay-order/:orderId`
- `POST /api/payment/pay-order/:orderId/confirm`
- `GET /api/payment/pay-order/:orderId/confirmation`
- `POST /vqr/api/token_generate`
- `POST /vqr/bank/api/transaction-sync`

For VietQR callback verification, the backend must listen on local port `8080` and be exposed through `https://carefully-nectar-gulf.ngrok-free.dev`. Start the tunnel with:

```bash
ngrok http 8080
```

Payment success email refactor tests must characterize the current behavior before moving code:

- When a successful VietQR transaction-sync creates and saves a `PaymentTransaction`, payment success notification is attempted afterward.
- When payment success email succeeds, `receiptEmailSentAt` is set, `receiptEmailError` is cleared, and transaction-sync still returns the current success response shape.
- When payment success email throws, `receiptEmailError` is saved, the persisted payment/order changes remain committed, and transaction-sync still returns the current success response shape.
- When delivery email is missing, the current no-recipient behavior is preserved: notification does not throw, and transaction-sync handles it as the current non-error path.
- `EMAIL_ENABLED=false` keeps the current simulated-send behavior.
- The order cancellation email path remains covered by existing tests or smoke checks so the payment success refactor does not break `customer-order`.

## Target Backend Structure

Pay by VietQR slice:

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

Pay Order notification slice:

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

## Target Frontend Structure

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

## Implementation Order

1. `PVQR-1.1` - Live endpoint characterization for backend VietQR flow.
2. `PVQR-1.2` - Frontend characterization tests for VietQR screen.
3. `PVQR-2.1` - Extract VietQR DTO and response models.
4. `PVQR-2.2` - Extract VietQR payment code value object.
5. `PVQR-3.1` - Move VietQR external client into Boundary/Gateway.
6. `PVQR-3.2` - Extract `PayThroughVietQRController` control.
7. `PVQR-3.3` - Move Pay Order HTTP boundary into the backend slice.
8. `PVQR-3.4` - Split Transaction Sync webhook boundary and control.
9. `PVQR-3.5` - Create and wire `PayByVietQrModule`.
10. `PVQR-4.1` - Characterize current payment success email behavior.
11. `PVQR-4.2` - Extract email transport and nodemailer into Boundary.
12. `PVQR-4.3` - Extract payment success email message/template models and template control.
13. `PVQR-4.4` - Extract payment success notification orchestration control.
14. `PVQR-4.5` - Create and wire `PayOrderNotificationModule`.
15. `PVQR-4.6` - Update transaction sync control to call payment success notification control.
16. `PVQR-4.7` - Preserve order cancellation notification compatibility.
17. `PVQR-5.1` - Extract frontend VietQR API boundary from `OrderService`.
18. `PVQR-5.2` - Move frontend VietQR models into the frontend slice.
19. `PVQR-5.3` - Extract frontend payment state and storage controls.
20. `PVQR-5.4` - Move VietQR screen into the frontend slice UI folder.
21. `PVQR-6.1` - Remove old VietQR and payment success notification files/imports safely.
22. `PVQR-6.2` - Run full regression checklist for Pay by VietQR.

## Epic 1: Backend Safety Net Before Refactor

### PVQR-1.1: Live Endpoint Characterization Tests For Backend VietQR Flow

**Goal**

Capture the current backend VietQR behavior through live local backend endpoint characterization and manual integration verification before moving or splitting production files.

**Expected File Scope**

- `backend/src/payment/controllers/pay-order.controller.ts`
- `backend/src/payment/services/pay-through-payment-gateway.service.ts`
- `backend/src/boundaries/viet-qr/viet-qr.service.ts`
- `backend/src/boundaries/viet-qr/transaction-sync.controller.ts`
- New backend test files for VietQR behavior.

**Acceptance Criteria**

- Live endpoint verification covers QR generation through `POST /api/payment/pay-order/:orderId`.
- Live endpoint verification covers payment confirmation through `POST /api/payment/pay-order/:orderId/confirm`.
- Live endpoint verification covers confirmation query/polling behavior through `GET /api/payment/pay-order/:orderId/confirmation`.
- Live endpoint verification covers VietQR token generation through `POST /vqr/api/token_generate`.
- Live endpoint verification covers transaction sync success and basic error paths through `POST /vqr/bank/api/transaction-sync`.
- VietQR sandbox callback behavior is verified with the local backend on port `8080` exposed through `https://carefully-nectar-gulf.ngrok-free.dev`.
- Supporting mock tests may be added for repositories, JWT, notification, QR conversion, or external dependency isolation, but the story is not accepted on mock-only evidence.
- Test and manual verification may read `.env` for configuration, but no `.env` secret value is copied, printed, committed, or written to artifacts, logs, test output, or final responses.
- Production behavior remains unchanged while the live endpoint behavior is characterized.

**Tests To Run Or Add**

- Read `.env` for local backend and VietQR sandbox configuration without exposing secret values.
- Start the backend on local port `8080`.
- Start ngrok with `ngrok http 8080`.
- Verify the public callback URL is `https://carefully-nectar-gulf.ngrok-free.dev`.
- Exercise the five live endpoints listed in the acceptance criteria using current VietQR sandbox callback configuration.
- Add supporting automated tests where useful, but keep the acceptance evidence tied to live endpoint behavior.
- Run the backend test suite with `npm test` from `backend` after adding or updating automated tests.

**Risks**

- Live verification depends on correct `.env` configuration, backend startup, local database state, VietQR sandbox availability, and a working ngrok tunnel.
- Mock-only tests can miss callback, routing, provider wiring, and environment configuration issues.
- Logs or artifacts could accidentally expose secrets if verification output is not scrubbed.

**Do Not Do**

- Do not modify production behavior unless strictly required to make tests possible.
- Do not accept this story based only on mocks.
- Do not expose secret values from `.env`.
- Do not commit `.env` content or verification output containing secrets.
- Do not change endpoints.
- Do not optimize order matching.

**Suggested Implementation Order**

Implement first, before any file movement.

### PVQR-1.2: Frontend Characterization Tests For VietQR Screen

**Goal**

Capture current frontend VietQR UI states before extracting API/control/storage concerns.

**Expected File Scope**

- `frontend/src/app/boundaries/vietqr-payment-screen/vietqr-payment-screen.component.ts`
- `frontend/src/app/boundaries/vietqr-payment-screen/vietqr-payment-screen.component.html`
- `frontend/src/app/boundaries/vietqr-payment-screen/vietqr-payment-screen.component.css`
- New or updated frontend spec files.

**Acceptance Criteria**

- Missing `orderId` displays an error state.
- Successful QR loading displays QR image, amount, and content.
- Successful payment confirmation renders success details.
- Cart and ordering drafts are cleared only after confirmed success.
- Polling timeout displays the existing non-success error state.

**Tests To Run Or Add**

- Add Angular component tests with mocked `OrderService` and `CartService`.
- Use fake timers for polling behavior.
- Run frontend test suite.

**Risks**

- Polling tests can become flaky if real timers are used.
- Component setup may be fragile because the component currently owns state, polling, storage cleanup, and UI.

**Do Not Do**

- Do not change UI text or visual behavior unless required by existing tests.
- Do not change route paths.
- Do not change backend API paths.

**Suggested Implementation Order**

Implement after `PVQR-1.1`.

## Epic 2: Backend Entity, DTO, And Value Object Extraction

### PVQR-2.1: Extract VietQR DTO And Response Models

**Goal**

Move VietQR request/response model definitions out of large controllers and into the new backend slice.

**Expected File Scope**

- Create `backend/src/pay-order/pay-by-vietqr/entity/vietqr-transaction-sync.dto.ts`
- Create `backend/src/pay-order/pay-by-vietqr/entity/payment-confirmation.model.ts`
- Create `backend/src/pay-order/pay-by-vietqr/boundary/webhook/dto/vietqr-token.response.ts`
- Create `backend/src/pay-order/pay-by-vietqr/boundary/webhook/dto/vietqr-transaction-sync.response.ts`
- Create `backend/src/pay-order/pay-by-vietqr/boundary/http/dto/generate-vietqr-payment.response.ts`
- Create `backend/src/pay-order/pay-by-vietqr/boundary/http/dto/payment-confirmation.response.ts`
- Update imports in the current backend VietQR files.

**Acceptance Criteria**

- DTO and response shapes remain unchanged.
- `transaction-sync.controller.ts` no longer defines inline response classes.
- Existing endpoints still return the same JSON field names.
- Backend tests from Epic 1 still pass.

**Tests To Run Or Add**

- Run backend unit tests from `PVQR-1.1`.
- Add lightweight tests for response DTO construction if useful.

**Risks**

- Circular imports between the new slice and shared payment/order entities.
- Response field casing could accidentally change.

**Do Not Do**

- Do not change response JSON field names.
- Do not change endpoint paths.
- Do not move `PaymentTransaction`.

**Suggested Implementation Order**

Implement after Epic 1 safety tests.

### PVQR-2.2: Extract VietQR Payment Code Value Object

**Goal**

Centralize VietQR payment code rules: short order id, payment content, and rounded amount.

**Expected File Scope**

- Create `backend/src/pay-order/pay-by-vietqr/entity/vietqr-payment-code.vo.ts`
- Update `backend/src/boundaries/viet-qr/viet-qr.service.ts`
- Update `backend/src/boundaries/viet-qr/transaction-sync.controller.ts`

**Acceptance Criteria**

- Short order id remains the order UUID without hyphens, truncated to the first 13 characters.
- Payment content remains `AIMS <shortOrderId>`.
- Payment amount remains the rounded numeric `order.totalAmount`.
- QR generation and transaction sync validation use the same value object.

**Tests To Run Or Add**

- Add unit tests for `VietQrPaymentCode`.
- Run backend tests from Epic 1.

**Risks**

- Any mismatch in payment content will break transaction sync matching.
- Any mismatch in amount rounding can reject valid callbacks.

**Do Not Do**

- Do not change payment content format.
- Do not change short order id length or derivation.
- Do not change amount validation semantics.

**Suggested Implementation Order**

Implement after `PVQR-2.1`.

## Epic 3: Backend Control And Boundary Split

### PVQR-3.1: Move VietQR External Client Into Boundary/Gateway

**Goal**

Move external VietQR API calls into the new backend slice while keeping request behavior unchanged.

**Expected File Scope**

- Create `backend/src/pay-order/pay-by-vietqr/boundary/gateway/vietqr.boundary.ts`
- Create `backend/src/pay-order/pay-by-vietqr/boundary/gateway/vietqr-boundary.types.ts`
- Update imports/providers in `backend/src/payment/payment.module.ts`
- Update imports in current payment orchestration code.

**Acceptance Criteria**

- `getAccessToken`, `generateQRCode`, and `handleAPICallback` behavior remains unchanged.
- VietQR token request headers remain unchanged.
- VietQR QR generation request body remains unchanged.
- VietQR Sandbox Test Callback request body remains unchanged.
- QR conversion still uses `qrcode.toDataURL`.

**Tests To Run Or Add**

- Add or update tests that mock `fetch`.
- Run backend tests from Epic 1.

**Risks**

- NestJS provider registration may fail after path movement.
- Environment variable lookup may accidentally change.

**Do Not Do**

- Do not change environment variable names.
- Do not change VietQR request body fields.
- Do not introduce a new HTTP client abstraction unless needed for this move.

**Suggested Implementation Order**

Implement after `PVQR-2.2`.

### PVQR-3.2: Extract PayThroughVietQRController Control

**Goal**

Rename and move payment orchestration into a BCE-aligned VietQR control class.

**Expected File Scope**

- Create `backend/src/pay-order/pay-by-vietqr/control/pay-through-vietqr.controller.ts`
- Optionally create `backend/src/pay-order/pay-by-vietqr/control/vietqr-payment-confirmation.control.ts`
- Update imports in `backend/src/payment/controllers/pay-order.controller.ts`
- Update providers in `backend/src/payment/payment.module.ts`

**Acceptance Criteria**

- `PayThroughPaymentGatewayController` responsibilities are represented by `PayThroughVietQRController`.
- Public control methods preserve current semantics: generate QR, confirm payment, get confirmation.
- Confirmation response remains unchanged.
- The mutable access token behavior is not redesigned in this story.

**Tests To Run Or Add**

- Run backend unit tests.
- Add provider wiring test if dependency injection becomes non-trivial.

**Risks**

- Renaming class/provider can break NestJS dependency injection.
- Splitting confirmation logic too aggressively can change polling behavior.

**Do Not Do**

- Do not change confirmation response shape.
- Do not change polling attempts or delay.
- Do not redesign access token caching in this story.

**Suggested Implementation Order**

Implement after `PVQR-3.1`.

### PVQR-3.3: Move Pay Order HTTP Boundary Into Backend Slice

**Goal**

Move the frontend-facing pay order controller into the VietQR backend slice.

**Expected File Scope**

- Create `backend/src/pay-order/pay-by-vietqr/boundary/http/pay-order.controller.ts`
- Update `backend/src/payment/payment.module.ts`
- Retire or replace imports from `backend/src/payment/controllers/pay-order.controller.ts`

**Acceptance Criteria**

- These endpoints remain exactly unchanged:
  - `POST /api/payment/pay-order/:orderId`
  - `POST /api/payment/pay-order/:orderId/confirm`
  - `GET /api/payment/pay-order/:orderId/confirmation`
- Controller acts as a thin HTTP boundary and delegates to control.
- Order lookup behavior remains unchanged.
- No duplicate route registration exists.

**Tests To Run Or Add**

- Run backend controller tests.
- Add e2e smoke tests for the three endpoints if absent.

**Risks**

- Duplicate controller registration can cause confusing route behavior.
- Missing repository injection can fail at runtime.

**Do Not Do**

- Do not change route path, HTTP method, or response shape.
- Do not move `Order` entity.
- Do not change order-not-found behavior.

**Suggested Implementation Order**

Implement after `PVQR-3.2`.

### PVQR-3.4: Split Transaction Sync Webhook Boundary And Control

**Goal**

Split the large transaction sync controller into thin webhook boundaries and control services.

**Expected File Scope**

- Create `backend/src/pay-order/pay-by-vietqr/boundary/webhook/vietqr-token.boundary.ts`
- Create `backend/src/pay-order/pay-by-vietqr/boundary/webhook/vietqr-transaction-sync.boundary.ts`
- Create `backend/src/pay-order/pay-by-vietqr/control/vietqr-transaction-sync.control.ts`
- Create `backend/src/pay-order/pay-by-vietqr/control/vietqr-callback-validator.control.ts`
- Create `backend/src/pay-order/pay-by-vietqr/control/vietqr-order-matcher.control.ts`
- Create `backend/src/pay-order/pay-by-vietqr/control/vietqr-payment-transaction-factory.ts`
- Update module providers/controllers.

**Acceptance Criteria**

- `POST /vqr/api/token_generate` response behavior remains unchanged.
- `POST /vqr/bank/api/transaction-sync` success and error response shapes remain unchanged.
- Bearer token validation behavior remains unchanged.
- Basic credential validation behavior remains unchanged.
- Order matching still queries all orders and matches using the existing logic.
- Amount and content validation behavior remains unchanged.
- Transaction creation fields remain unchanged.
- Order status update to `PENDING_PROCESSING` remains unchanged.
- Receipt email success/error handling remains unchanged through the current notification dependency until Epic 4 replaces it.
- Transaction sync control exposes a clear seam where payment success notification can be delegated without changing response handling.

**Tests To Run Or Add**

- Add tests for invalid/missing Basic auth.
- Add tests for invalid/missing Bearer auth.
- Add tests for no matching order.
- Add tests for amount mismatch.
- Add tests for content mismatch.
- Add tests for successful transaction sync.
- Add tests for email failure after transaction persistence, or keep equivalent characterization evidence from `PVQR-4.1` if that story is implemented first.
- Run backend unit and e2e smoke tests.

**Risks**

- This is the largest backend refactor story.
- Splitting persistence, validation, and response handling can accidentally change error timing or response shape.
- Email handling can accidentally become blocking in a different way.

**Do Not Do**

- Do not optimize order matching.
- Do not replace the all-orders query in this story.
- Do not change transaction response JSON shape.
- Do not redesign notification behavior in this story.
- Do not change transaction persistence fields.

**Suggested Implementation Order**

Implement after `PVQR-3.3`. Keep the commit focused and review carefully.

### PVQR-3.5: Create And Wire PayByVietQrModule

**Goal**

Create a dedicated NestJS module for the backend VietQR slice and wire it into the existing backend module graph.

**Expected File Scope**

- Create `backend/src/pay-order/pay-by-vietqr/pay-by-vietqr.module.ts`
- Update `backend/src/payment/payment.module.ts`
- Optionally update `backend/src/app.module.ts` if the final module graph requires direct import.

**Acceptance Criteria**

- VietQR controllers/providers are owned by `PayByVietQrModule`.
- `TypeOrmModule.forFeature([PaymentTransaction, Order])` remains available where needed.
- `JwtModule`, `ConfigModule`, and `NotificationModule` dependencies remain available where needed.
- No duplicate routes/providers remain.
- Backend compiles and tests pass.

**Tests To Run Or Add**

- Run backend compile/test suite.
- Run e2e smoke tests for pay-order and transaction-sync endpoints.

**Risks**

- Module dependency wiring may be incomplete.
- Importing both old and new modules can duplicate controllers.

**Do Not Do**

- Do not move shared entities.
- Do not change module behavior unrelated to VietQR.
- Do not introduce circular module imports.

**Suggested Implementation Order**

Implement after `PVQR-3.4`.

## Epic 4: Backend Payment Success Email Notification Refactor

### PVQR-4.1: Characterize Current Payment Success Email Behavior

**Goal**

Capture the current payment success email behavior before moving notification, email transport, template, or transaction-sync orchestration code.

**Expected File Scope**

- `backend/src/boundaries/viet-qr/transaction-sync.controller.ts`
- `backend/src/notification/notification.service.ts`
- `backend/src/notification/email/email.service.ts`
- `backend/src/notification/email/payment-success-email.builder.ts`
- `backend/src/payment/entities/payment-transaction.entity.ts`
- New or updated backend tests for payment success notification behavior.

**Acceptance Criteria**

- Characterization covers successful payment success email after transaction persistence.
- Characterization proves success sets `PaymentTransaction.receiptEmailSentAt` and clears `PaymentTransaction.receiptEmailError`.
- Characterization proves email failure saves `PaymentTransaction.receiptEmailError`.
- Characterization proves email failure does not roll back the saved `PaymentTransaction`.
- Characterization proves email failure does not roll back the order status update to `PENDING_PROCESSING`.
- Characterization proves email failure does not change the VietQR transaction-sync success response shape.
- Characterization covers missing delivery email behavior exactly as today.
- Characterization proves missing delivery email does not throw and preserves the current `receiptEmailSentAt`/`receiptEmailError` outcome.
- Characterization covers `EMAIL_ENABLED=false` simulated-send behavior if practical.
- Characterization records the current payment success email subject, text/html essentials, recipient source, and `APP_PUBLIC_URL` link behavior without exposing secrets.

**Tests To Run Or Add**

- Add unit or integration tests around transaction-sync success with email success.
- Add unit or integration tests around transaction-sync success with email failure.
- Add tests around `NotificationService.sendPaymentSuccessNotification` for missing delivery email.
- Add tests around `EmailService.sendEmail` with `EMAIL_ENABLED=false`, if not already covered.
- Run backend tests from Epic 1.

**Risks**

- Existing transaction-sync code mixes persistence, response handling, and notification, so tests may need careful mocks or a focused integration setup.
- Mocking email too high can miss `receiptEmailSentAt` and `receiptEmailError` persistence behavior.
- Capturing email body assertions too rigidly can make later template refactor painful; assert behaviorally important content rather than every whitespace detail.

**Do Not Do**

- Do not move production notification code in this story.
- Do not change email content, subject, recipient selection, or env variable usage.
- Do not change transaction-sync response shape.
- Do not change database schema.
- Do not expose `.env` secrets in test output or artifacts.

**Suggested Implementation Order**

Implement after `PVQR-3.5` and before moving notification code.

### PVQR-4.2: Extract Email Transport And Nodemailer Into Boundary

**Goal**

Move generic email transport and nodemailer-specific behavior behind a Pay Order notification Boundary while preserving existing SMTP and simulated-send behavior.

**Expected File Scope**

- Create `backend/src/pay-order/notification/boundary/email/email.boundary.ts`
- Create `backend/src/pay-order/notification/boundary/email/nodemailer-email.boundary.ts`
- Create `backend/src/pay-order/notification/boundary/email/email-boundary.types.ts`
- Update or temporarily wrap `backend/src/notification/email/email.service.ts`
- Update provider wiring in the relevant notification modules.

**Acceptance Criteria**

- `EmailBoundary` exposes an OOP boundary interface for sending an `EmailMessage`.
- `NodemailerEmailBoundary` owns `nodemailer.createTransport` and `transporter.sendMail`.
- Existing env variable names and defaults remain unchanged.
- `EMAIL_ENABLED=false` still logs/simulates without sending through SMTP.
- SMTP `from`, `to`, `subject`, `text`, and `html` behavior remains unchanged.
- Existing order cancellation email can still send through the old public API or a compatibility wrapper.
- No payment success email business orchestration is added to the Boundary.

**Tests To Run Or Add**

- Add tests for `NodemailerEmailBoundary` with `EMAIL_ENABLED=false`.
- Add tests that verify SMTP config lookup uses existing env variable names.
- Add tests that mock nodemailer and verify sendMail receives equivalent fields.
- Run existing notification/order cancellation tests if present.

**Risks**

- Moving nodemailer provider wiring can break both payment success and cancellation email.
- `ConfigService.get<boolean>` behavior for `SMTP_SECURE` may differ from string env values; preserve the current lookup behavior unless a separate bugfix story is created.
- A generic Boundary can accidentally become a new abstraction for all notifications; keep this scoped to compatibility and Pay Order notification needs.

**Do Not Do**

- Do not rename email env variables.
- Do not change SMTP behavior.
- Do not put payment success template logic in the Boundary.
- Do not remove the old `EmailService` public API until cancellation compatibility is proven.

**Suggested Implementation Order**

Implement after `PVQR-4.1`.

### PVQR-4.3: Extract Payment Success Email Message, Model, And Template Control

**Goal**

Move payment success email content into BCE-aligned models and a template control without changing the rendered email behavior.

**Expected File Scope**

- Create `backend/src/pay-order/notification/entity/email-message.model.ts`
- Create `backend/src/pay-order/notification/entity/payment-success-email.model.ts`
- Create `backend/src/pay-order/notification/control/payment-success-email-template.control.ts`
- Update or temporarily wrap `backend/src/notification/email/payment-success-email.builder.ts`
- Update imports used by payment success notification code.

**Acceptance Criteria**

- `EmailMessage` represents recipient, subject, text, and html.
- `PaymentSuccessEmail` represents payment success email input/content state derived from `Order`, `PaymentTransaction`, and `APP_PUBLIC_URL`.
- `PaymentSuccessEmailTemplateControl` builds the subject, text, and html.
- Payment success email subject remains `[AIMS] Payment Successful - Order #<orderId>`.
- Recipient remains `order.deliveryInfo?.email`.
- Customer name fallback remains `Customer`.
- View order link remains `${APP_PUBLIC_URL}/orders/view/${order.orderViewToken}`.
- Cancel order link remains `${APP_PUBLIC_URL}/orders/cancel/${order.cancelToken}`.
- Currency formatting remains Vietnamese VND formatting.
- Transaction reference and payment method content remain present.
- Existing payment success email builder can remain as a compatibility wrapper during migration.

**Tests To Run Or Add**

- Add unit tests for `PaymentSuccessEmailTemplateControl`.
- Add tests for recipient selection and missing-recipient model behavior where appropriate.
- Add tests for URL construction using default and configured `APP_PUBLIC_URL`.
- Run characterization tests from `PVQR-4.1`.

**Risks**

- Template refactor can accidentally change whitespace, links, currency formatting, or fallback text.
- Directly passing TypeORM entities into template logic can keep hidden coupling; use models to isolate content state while preserving behavior.

**Do Not Do**

- Do not redesign email copy.
- Do not add new email fields.
- Do not change order view/cancel URL routes.
- Do not change transaction field names used in email content.

**Suggested Implementation Order**

Implement after `PVQR-4.2`.

### PVQR-4.4: Extract Payment Success Notification Orchestration Control

**Goal**

Move payment success notification orchestration into a dedicated Control that coordinates recipient checks, template creation, email Boundary sending, and notification result state.

**Expected File Scope**

- Create `backend/src/pay-order/notification/control/payment-success-notification.control.ts`
- Create `backend/src/pay-order/notification/entity/payment-success-notification-result.model.ts`
- Update or temporarily wrap `backend/src/notification/notification.service.ts`
- Update tests from `PVQR-4.1`.

**Acceptance Criteria**

- `PaymentSuccessNotificationControl` orchestrates payment success notification for an `Order` and `PaymentTransaction`.
- Missing delivery email preserves current behavior, does not throw, and produces a result that lets transaction-sync preserve the current `receiptEmailSentAt`/`receiptEmailError` outcome.
- Successful email send returns a result that lets transaction-sync set `receiptEmailSentAt` and clear `receiptEmailError`.
- Failed email send returns or throws in a way transaction-sync can preserve current `receiptEmailError` behavior.
- The control does not save `PaymentTransaction` directly unless the implementation deliberately keeps the current persistence boundary equivalent and documented in tests.
- The control does not update order status.
- The control does not construct VietQR transaction-sync responses.
- Existing `NotificationService.sendPaymentSuccessNotification` may delegate to the new control temporarily for compatibility.

**Tests To Run Or Add**

- Add unit tests for notification control success, missing recipient, and email boundary failure.
- Add tests for `PaymentSuccessNotificationResult` mapping.
- Run transaction-sync characterization tests from `PVQR-4.1`.

**Risks**

- Putting persistence inside the notification control can blur BCE responsibilities and make transaction-sync rollback behavior harder to reason about.
- Returning result state instead of throwing can accidentally change logging/error handling if transaction-sync is not updated carefully.
- Missing-recipient behavior must be preserved even if a new result model makes it tempting to mark it as a failure.

**Do Not Do**

- Do not let notification failure abort transaction-sync success.
- Do not let notification control own VietQR validation, order matching, transaction creation, or response construction.
- Do not change `receiptEmailSentAt`/`receiptEmailError` semantics.

**Suggested Implementation Order**

Implement after `PVQR-4.3`.

### PVQR-4.5: Create And Wire PayOrderNotificationModule

**Goal**

Create a dedicated NestJS module for Pay Order notification providers and wire it into the backend module graph.

**Expected File Scope**

- Create `backend/src/pay-order/notification/pay-order-notification.module.ts`
- Update `backend/src/pay-order/pay-by-vietqr/pay-by-vietqr.module.ts`
- Optionally update `backend/src/payment/payment.module.ts` or `backend/src/app.module.ts` if the actual module graph requires it.
- Keep or update `backend/src/notification/notification.module.ts` for compatibility.

**Acceptance Criteria**

- `PayOrderNotificationModule` provides and exports payment success notification control.
- The module provides the email Boundary implementation.
- The module imports `ConfigModule` as needed for email config.
- `PayByVietQrModule` or the module that owns transaction-sync can inject `PaymentSuccessNotificationControl`.
- Existing `NotificationModule` remains available for order cancellation email or delegates safely to the new module.
- No circular module imports are introduced.
- Backend compiles.

**Tests To Run Or Add**

- Run backend compile/test suite.
- Add provider wiring test if dependency injection is non-trivial.
- Run order cancellation notification smoke test or existing tests.

**Risks**

- Module graph changes can produce circular dependencies between `payment`, `pay-order`, and `notification`.
- Exporting both old and new providers can create duplicate instances with different config or mocks.

**Do Not Do**

- Do not remove `NotificationModule` while `customer-order` still imports it.
- Do not register duplicate transaction-sync controllers.
- Do not move shared TypeORM entities.

**Suggested Implementation Order**

Implement after `PVQR-4.4`.

### PVQR-4.6: Update Transaction Sync Control To Call Payment Success Notification Control

**Goal**

Replace direct use of the old payment success notification service from transaction-sync with the new Pay Order notification control while preserving all transaction-sync behavior.

**Expected File Scope**

- `backend/src/pay-order/pay-by-vietqr/control/vietqr-transaction-sync.control.ts`
- `backend/src/pay-order/pay-by-vietqr/boundary/webhook/vietqr-transaction-sync.boundary.ts`
- `backend/src/pay-order/notification/control/payment-success-notification.control.ts`
- `backend/src/pay-order/notification/entity/payment-success-notification-result.model.ts`
- Module provider wiring.

**Acceptance Criteria**

- Transaction sync calls `PaymentSuccessNotificationControl` after `PaymentTransaction` is saved.
- Transaction sync still updates order status to `PENDING_PROCESSING`.
- If payment success email succeeds, transaction sync sets `receiptEmailSentAt` to the current time, clears `receiptEmailError`, saves the transaction, and returns the existing success response shape.
- If payment success email fails, transaction sync stores `receiptEmailError`, saves the transaction, and still returns the existing success response shape.
- If delivery email is missing, current non-throwing behavior is preserved, the current `receiptEmailSentAt`/`receiptEmailError` outcome is preserved, and transaction-sync response shape remains unchanged.
- Email failure does not roll back transaction persistence or order status persistence.
- Existing error paths unrelated to email still return the same error response shape.
- No database schema changes are required.

**Tests To Run Or Add**

- Update transaction-sync tests to mock `PaymentSuccessNotificationControl`.
- Add/keep tests for email success persistence.
- Add/keep tests for email failure persistence without rollback.
- Add/keep tests for transaction-sync response shape under email failure.
- Run live endpoint characterization or e2e smoke tests from Epic 1 where practical.

**Risks**

- Moving the call site can accidentally place notification before transaction/order persistence.
- Catching the wrong error scope can convert email errors into transaction-sync failures.
- Saving a stale transaction entity can overwrite fields set earlier in the flow.

**Do Not Do**

- Do not change VietQR transaction-sync response JSON.
- Do not change transaction creation fields.
- Do not change order status transition.
- Do not change payment success email content.
- Do not update database schema.

**Suggested Implementation Order**

Implement after `PVQR-4.5`.

### PVQR-4.7: Preserve Order Cancellation Notification Compatibility

**Goal**

Ensure the Pay Order payment success notification refactor does not break order cancellation email in `customer-order`.

**Expected File Scope**

- `backend/src/notification/notification.service.ts`
- `backend/src/notification/notification.module.ts`
- `backend/src/notification/email/order-cancelled-email.builder.ts`
- `backend/src/customer-order/customer-order.service.ts`
- `backend/src/customer-order/customer-order.module.ts`
- Compatibility wrappers/imports as needed.

**Acceptance Criteria**

- `CustomerOrderService` can still call `sendOrderCancelledNotification` as before.
- Order cancellation email still uses the same recipient source, subject/content builder, and email transport behavior.
- Any compatibility wrapper is clearly temporary and limited to preserving current imports/API.
- Payment success email implementation no longer needs to live in the old generic notification path once transaction-sync uses the new control.
- No unrelated customer-order behavior changes.

**Tests To Run Or Add**

- Run existing customer-order tests.
- Add a focused test or smoke check for `sendOrderCancelledNotification` if none exists.
- Run backend compile/test suite.

**Risks**

- Removing payment success code from `NotificationService` too early can break imports before transaction-sync is fully migrated.
- Moving email transport can unintentionally change cancellation email behavior.

**Do Not Do**

- Do not refactor order cancellation email into `pay-order/notification` unless required only for compatibility.
- Do not change customer-order cancellation behavior.
- Do not change refund transaction behavior.

**Suggested Implementation Order**

Implement after `PVQR-4.6` and before cleanup.

## Epic 5: Frontend Slice Refactor

### PVQR-5.1: Extract Frontend VietQR API Boundary From OrderService

**Goal**

Move frontend VietQR HTTP calls from the broad `OrderService` into a dedicated API boundary.

**Expected File Scope**

- Create `frontend/src/app/pay-order/pay-by-vietqr/boundary/api/vietqr-payment.boundary.ts`
- Update `frontend/src/app/boundaries/vietqr-payment-screen/vietqr-payment-screen.component.ts`
- Optionally keep temporary compatibility wrappers in `frontend/src/app/services/order.service.ts`.

**Acceptance Criteria**

- VietQR API methods live in the new boundary.
- API URL remains `http://localhost:8080/api/payment/pay-order`.
- Component behavior remains unchanged.
- Order placement and customer-order methods in `OrderService` remain unaffected.

**Tests To Run Or Add**

- Add tests for the new API boundary.
- Run frontend component tests from Epic 1.

**Risks**

- Angular dependency injection may fail if the service is not provided correctly.
- A temporary wrapper can hide old imports if not cleaned later.

**Do Not Do**

- Do not change backend API paths.
- Do not change request/response types.
- Do not alter order/customer-order service behavior.

**Suggested Implementation Order**

Implement after backend slice is stable, or in parallel after Epic 1 if the API contract is unchanged.

### PVQR-5.2: Move Frontend VietQR Models Into Frontend Slice

**Goal**

Move VietQR-specific TypeScript interfaces out of the general order model file.

**Expected File Scope**

- Create `frontend/src/app/pay-order/pay-by-vietqr/entity/vietqr-payment.models.ts`
- Update imports in the new VietQR API boundary.
- Update imports in the VietQR payment screen.
- Optionally leave compatibility exports in `frontend/src/app/models/order.model.ts` until cleanup.

**Acceptance Criteria**

- `VietQrPaymentRequest` lives in the VietQR slice.
- `PaymentConfirmationResponse` and related confirmation interfaces live in the VietQR slice.
- TypeScript field names and optionality remain unchanged.
- Existing order-related models remain unaffected.

**Tests To Run Or Add**

- Run frontend compile/test suite.
- Run component tests for VietQR screen.

**Risks**

- Import paths can be missed because models are referenced from multiple files.
- Removing compatibility exports too early can break unrelated code.

**Do Not Do**

- Do not change interface field names.
- Do not change backend response assumptions.
- Do not move non-VietQR order models.

**Suggested Implementation Order**

Implement after `PVQR-5.1`.

### PVQR-5.3: Extract Frontend Payment State And Storage Controls

**Goal**

Move frontend polling, success handling, and localStorage cleanup out of the component into control services.

**Expected File Scope**

- Create `frontend/src/app/pay-order/pay-by-vietqr/control/vietqr-payment.control.ts`
- Create `frontend/src/app/pay-order/pay-by-vietqr/control/vietqr-payment-storage.control.ts`
- Update `frontend/src/app/boundaries/vietqr-payment-screen/vietqr-payment-screen.component.ts`

**Acceptance Criteria**

- Component still displays the same loading, error, QR, confirming, and success states.
- Polling max attempts and delay remain unchanged.
- Current localStorage keys remain unchanged:
  - `aims_current_order_id`
  - `aims_current_invoice`
  - `aims_delivery_draft`
- Cart and draft cleanup still occur only after confirmed success.
- `PaymentConfirmationResponse.status === "SUCCESS"` plus transaction presence remains the success condition.

**Tests To Run Or Add**

- Add unit tests for storage control.
- Add unit tests for payment control using fake timers.
- Run component tests.

**Risks**

- Async state updates can cause UI regressions.
- `ChangeDetectorRef` usage can be lost during extraction.

**Do Not Do**

- Do not change polling window.
- Do not change localStorage key names.
- Do not clear cart earlier than the current behavior.

**Suggested Implementation Order**

Implement after `PVQR-5.2`.

### PVQR-5.4: Move VietQR Screen Into Frontend Slice UI Folder

**Goal**

Move the VietQR payment screen files into the target frontend slice path.

**Expected File Scope**

- Move `frontend/src/app/boundaries/vietqr-payment-screen/vietqr-payment-screen.component.ts`
- Move `frontend/src/app/boundaries/vietqr-payment-screen/vietqr-payment-screen.component.html`
- Move `frontend/src/app/boundaries/vietqr-payment-screen/vietqr-payment-screen.component.css`
- Target path: `frontend/src/app/pay-order/pay-by-vietqr/boundary/ui/`
- Update `frontend/src/app/app.routes.ts`

**Acceptance Criteria**

- Route `/vietqr-payment/:orderId` remains unchanged.
- Route `/vietqr-payment` remains unchanged.
- App routes import the component from the new path.
- No imports remain from the old VietQR payment screen folder.
- UI renders as before.

**Tests To Run Or Add**

- Run frontend compile/test suite.
- Run route/component smoke test.
- Manually navigate to `/vietqr-payment/:orderId` if a running app is available.

**Risks**

- Angular `templateUrl` or `styleUrls` can break after move.
- Route import can point to the old component.

**Do Not Do**

- Do not change route paths.
- Do not change component selector unless unavoidable.
- Do not change UI behavior.

**Suggested Implementation Order**

Implement after `PVQR-5.3`.

## Epic 6: Cleanup And Verification

### PVQR-6.1: Remove Old VietQR And Payment Success Notification Files And Imports Safely

**Goal**

Remove old VietQR and payment success notification files/imports after backend, notification, and frontend slices are fully wired.

**Expected File Scope**

- Old backend files under `backend/src/boundaries/viet-qr/`
- Old backend files under `backend/src/payment/controllers/` and `backend/src/payment/services/` that are fully replaced by the slice.
- Old payment success notification files/imports under `backend/src/notification/` that are fully replaced by `backend/src/pay-order/notification/`.
- Old frontend files under `frontend/src/app/boundaries/vietqr-payment-screen/`
- Import references across backend and frontend.

**Acceptance Criteria**

- No duplicate VietQR classes/providers/controllers remain.
- No imports point to old VietQR paths.
- No transaction-sync imports point to the old payment success notification service/builder.
- Payment success email providers live under `backend/src/pay-order/notification/`.
- Order cancellation email remains compatible through `NotificationService` or another clearly retained compatibility path.
- Shared `PaymentTransaction` remains in its shared location.
- Backend and frontend compile.
- Tests pass.

**Tests To Run Or Add**

- Run `rg` searches for old path/class references.
- Run `rg` searches for old payment success notification references.
- Run backend tests.
- Run frontend tests.

**Risks**

- Deleting a file still referenced by module wiring can break startup.
- Removing compatibility exports too early can break imports.
- Removing old notification exports too early can break order cancellation email.

**Do Not Do**

- Do not delete shared entities.
- Do not delete payment/refund/customer-order code outside the VietQR refactor scope.
- Do not delete order cancellation email code.
- Do not cleanup unrelated code.

**Suggested Implementation Order**

Implement after all backend, notification, and frontend move stories are complete.

### PVQR-6.2: Full Regression Checklist For Pay By VietQR

**Goal**

Verify that the refactor preserved end-to-end Pay by VietQR behavior.

**Expected File Scope**

- Test files and optional verification notes.
- No production code changes expected unless regressions are found.

**Acceptance Criteria**

- QR generation succeeds.
- Payment confirmation triggers VietQR Sandbox Test Callback.
- Transaction Sync persists `PaymentTransaction`.
- Transaction Sync updates order status to `PENDING_PROCESSING`.
- Payment success email uses the new `backend/src/pay-order/notification/` control/boundary/entity slice.
- Payment success email success behavior remains unchanged.
- Payment success email success sets `receiptEmailSentAt` and clears `receiptEmailError`.
- Payment success email failure records `receiptEmailError`.
- Payment success email failure does not roll back payment persistence.
- Payment success email failure does not roll back order status persistence.
- Payment success email failure does not change VietQR transaction-sync success response shape.
- Missing delivery email behavior remains unchanged, including the current non-throwing transaction-sync outcome.
- `EMAIL_ENABLED=false` simulated-send behavior remains unchanged.
- Existing SMTP env variable behavior remains unchanged.
- Order cancellation email in `customer-order` remains functional.
- Frontend success screen displays order details.
- Frontend success screen displays transaction details.
- Cart and ordering drafts are cleared only after confirmed success.
- VietQR manual refund constraint remains unchanged.

**Tests To Run Or Add**

- Run backend unit tests.
- Run backend e2e smoke tests.
- Run payment success notification control tests.
- Run email boundary tests with nodemailer mocked.
- Run transaction-sync tests for email success, email failure, and missing delivery email.
- Run customer-order/order cancellation notification compatibility tests or smoke checks.
- Run frontend unit/component tests.
- Run manual VietQR sandbox flow if environment and public callback URL are available.

**Risks**

- Manual sandbox verification depends on environment variables and public callback/tunnel configuration.
- Passing compile/tests without exercising callback path may miss the most important behavior.
- A green payment flow can still hide email regression unless success, failure, and no-recipient paths are checked.
- Cancellation email can regress if old notification compatibility is removed too early.

**Do Not Do**

- Do not merge the refactor solely on compile success.
- Do not alter business behavior while fixing regression issues unless a separate story is created.
- Do not accept the notification refactor without proving `receiptEmailSentAt` and `receiptEmailError` semantics.
- Do not accept the notification refactor if VietQR transaction-sync response shape changes.
- Do not accept the notification refactor if order cancellation email is broken.

**Suggested Implementation Order**

Implement last, after cleanup.
