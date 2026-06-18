# Refactor Pay By VietQR Backlog

## Context

The Pay by VietQR use case is already implemented and working, but the current code is spread across multiple backend and frontend paths. Several classes mix Boundary, Control, and Entity responsibilities, especially the VietQR transaction sync callback handling and payment orchestration.

This backlog converts the agreed architecture decision into small, reviewable refactor stories. The refactor goal is to move the use case into dedicated BCE-oriented slices without changing runtime behavior.

Target slice paths:

- Backend: `backend/src/pay-order/pay-by-vietqr/`
- Frontend: `frontend/src/app/pay-order/pay-by-vietqr/`

Shared entities, especially `PaymentTransaction`, remain in their current shared locations because PayPal, refund, and customer-order flows also use them.

## Global Constraints

These constraints apply to every story in this backlog:

- Do not change any public endpoint.
- Do not change business behavior.
- Do not move `PaymentTransaction` out of its shared location.
- Do not optimize order matching in this refactor.
- Do not change the database schema.
- Do not change the VietQR success state transition: successful VietQR payment still updates the order to `PENDING_PROCESSING`.
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

## Target Backend Structure

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
10. `PVQR-4.1` - Extract frontend VietQR API boundary from `OrderService`.
11. `PVQR-4.2` - Move frontend VietQR models into the frontend slice.
12. `PVQR-4.3` - Extract frontend payment state and storage controls.
13. `PVQR-4.4` - Move VietQR screen into the frontend slice UI folder.
14. `PVQR-5.1` - Remove old VietQR files and imports safely.
15. `PVQR-5.2` - Run full regression checklist for Pay by VietQR.

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
- Receipt email success/error handling remains unchanged.

**Tests To Run Or Add**

- Add tests for invalid/missing Basic auth.
- Add tests for invalid/missing Bearer auth.
- Add tests for no matching order.
- Add tests for amount mismatch.
- Add tests for content mismatch.
- Add tests for successful transaction sync.
- Add tests for email failure after transaction persistence.
- Run backend unit and e2e smoke tests.

**Risks**

- This is the largest backend refactor story.
- Splitting persistence, validation, and response handling can accidentally change error timing or response shape.
- Email handling can accidentally become blocking in a different way.

**Do Not Do**

- Do not optimize order matching.
- Do not replace the all-orders query in this story.
- Do not change transaction response JSON shape.
- Do not change notification behavior.
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

## Epic 4: Frontend Slice Refactor

### PVQR-4.1: Extract Frontend VietQR API Boundary From OrderService

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

### PVQR-4.2: Move Frontend VietQR Models Into Frontend Slice

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

Implement after `PVQR-4.1`.

### PVQR-4.3: Extract Frontend Payment State And Storage Controls

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

Implement after `PVQR-4.2`.

### PVQR-4.4: Move VietQR Screen Into Frontend Slice UI Folder

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

Implement after `PVQR-4.3`.

## Epic 5: Cleanup And Verification

### PVQR-5.1: Remove Old VietQR Files And Imports Safely

**Goal**

Remove old VietQR files/imports after backend and frontend slices are fully wired.

**Expected File Scope**

- Old backend files under `backend/src/boundaries/viet-qr/`
- Old backend files under `backend/src/payment/controllers/` and `backend/src/payment/services/` that are fully replaced by the slice.
- Old frontend files under `frontend/src/app/boundaries/vietqr-payment-screen/`
- Import references across backend and frontend.

**Acceptance Criteria**

- No duplicate VietQR classes/providers/controllers remain.
- No imports point to old VietQR paths.
- Shared `PaymentTransaction` remains in its shared location.
- Backend and frontend compile.
- Tests pass.

**Tests To Run Or Add**

- Run `rg` searches for old path/class references.
- Run backend tests.
- Run frontend tests.

**Risks**

- Deleting a file still referenced by module wiring can break startup.
- Removing compatibility exports too early can break imports.

**Do Not Do**

- Do not delete shared entities.
- Do not delete payment/refund/customer-order code outside the VietQR refactor scope.
- Do not cleanup unrelated code.

**Suggested Implementation Order**

Implement after all backend and frontend move stories are complete.

### PVQR-5.2: Full Regression Checklist For Pay By VietQR

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
- Receipt email success behavior remains unchanged.
- Receipt email failure records error and does not roll back payment persistence.
- Frontend success screen displays order details.
- Frontend success screen displays transaction details.
- Cart and ordering drafts are cleared only after confirmed success.
- VietQR manual refund constraint remains unchanged.

**Tests To Run Or Add**

- Run backend unit tests.
- Run backend e2e smoke tests.
- Run frontend unit/component tests.
- Run manual VietQR sandbox flow if environment and public callback URL are available.

**Risks**

- Manual sandbox verification depends on environment variables and public callback/tunnel configuration.
- Passing compile/tests without exercising callback path may miss the most important behavior.

**Do Not Do**

- Do not merge the refactor solely on compile success.
- Do not alter business behavior while fixing regression issues unless a separate story is created.

**Suggested Implementation Order**

Implement last, after cleanup.
