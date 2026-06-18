# Refactor Pay By VietQR Backlog

## Context

The Pay by VietQR use case is already implemented and working. This backlog is intentionally lean because the current 15-story plan is too fine-grained for the actual goal.

This is a code organization refactor, not a feature rewrite. The objective is to move the existing Pay by VietQR code into the correct ECB/OOP-oriented folders while preserving the current endpoint contract, route behavior, runtime behavior, and business logic.

Target slice paths:

- Backend: `backend/src/pay-order/pay-by-vietqr/`
- Frontend: `frontend/src/app/pay-order/pay-by-vietqr/`

Shared entities, especially `PaymentTransaction`, remain in their current shared locations because PayPal, refund, and customer-order flows also use them.

## Global Constraints

These constraints apply to every story in this backlog:

- Do not change any public endpoint, route, HTTP method, or response JSON field name.
- Do not change business behavior.
- Do not rewrite the Pay by VietQR feature.
- Do not optimize order matching.
- Do not move `PaymentTransaction` out of its shared entity location.
- Do not change the database schema.
- Do not change the VietQR success state transition: successful VietQR payment still updates the order to `PENDING_PROCESSING`.
- Do not change cart cleanup behavior: the frontend clears cart and ordering drafts only after confirmed success with a transaction.
- Do not change VietQR Sandbox Test Callback behavior.
- Do not implement automatic VietQR refund behavior.
- Keep VietQR manual refund behavior unchanged.
- Keep existing environment variable names unchanged.
- Agents may read `.env` during backend/test execution so local backend and VietQR sandbox configuration are correct.
- Never copy, print, commit, or write secret values from `.env` into artifacts, logs, test output, commits, or final responses.
- For callback verification, expose the local backend on port `8080` through ngrok when needed:

```bash
ngrok http 8080
```

Expected public callback URL:

```text
https://carefully-nectar-gulf.ngrok-free.dev
```

## Lean Implementation Order

1. `PVQR-1` - Baseline & Live Smoke Check
2. `PVQR-2` - Backend Restructure
3. `PVQR-3` - Frontend Restructure
4. `PVQR-4` - Cleanup & Regression

## PVQR-1: Baseline & Live Smoke Check

### Goal

Establish a reliable baseline for the already-working Pay by VietQR flow before moving files. This story characterizes current behavior; it should not modify production code unless a test harness or verification script is strictly necessary.

### File Scope

- Existing backend VietQR/payment files, read-only for behavior inspection:
  - `backend/src/payment/`
  - `backend/src/boundaries/viet-qr/`
- Existing frontend VietQR screen/service files, read-only for behavior inspection:
  - `frontend/src/app/boundaries/vietqr-payment-screen/`
  - `frontend/src/app/services/order.service.ts`
  - `frontend/src/app/models/order.model.ts`
- Optional supporting test or verification files if the repository already has a suitable test location.
- No production refactor in this story.

### Main Tasks

- Identify the current backend endpoints and frontend routes used by Pay by VietQR.
- Run a live local backend smoke check for the current VietQR flow.
- Read `.env` only as needed to run backend/test configuration; do not expose secret values.
- Start the backend on port `8080`.
- Start ngrok with `ngrok http 8080` when callback verification is needed.
- Verify that the callback public URL is `https://carefully-nectar-gulf.ngrok-free.dev`.
- Record only non-secret observations needed to protect behavior during the refactor.

### Acceptance Criteria

- Current behavior is understood and documented sufficiently for the refactor.
- These existing backend contracts are confirmed unchanged as the baseline:
  - `POST /api/payment/pay-order/:orderId`
  - `POST /api/payment/pay-order/:orderId/confirm`
  - `GET /api/payment/pay-order/:orderId/confirmation`
  - `POST /vqr/api/token_generate`
  - `POST /vqr/bank/api/transaction-sync`
- VietQR callback behavior is verified through the local backend exposed by ngrok when the environment is available.
- No production code is restructured in this story.
- No `.env` secret value appears in artifacts, logs, commits, or final responses.

### Test / Verification

- Run the backend with `.env` configuration.
- Exercise the five baseline endpoints listed above.
- Verify the VietQR sandbox callback path through `https://carefully-nectar-gulf.ngrok-free.dev` when available.
- Run existing backend tests if they are available and practical.
- Run existing frontend tests if they are available and practical.

## PVQR-2: Backend Restructure

### Goal

Move the existing backend Pay by VietQR implementation into `backend/src/pay-order/pay-by-vietqr/` using ECB/OOP organization while preserving the current endpoint contract and business behavior.

This story is a file and responsibility restructure, not a backend feature rewrite.

### File Scope

- Target backend slice:
  - `backend/src/pay-order/pay-by-vietqr/`
- Existing backend sources to move, split, or rewire as needed:
  - `backend/src/payment/controllers/pay-order.controller.ts`
  - `backend/src/payment/services/pay-through-payment-gateway.service.ts`
  - `backend/src/boundaries/viet-qr/`
  - `backend/src/payment/payment.module.ts`
  - Related NestJS module imports/providers/controllers.
- Shared entities stay where they are:
  - `PaymentTransaction`
  - `Order`
  - Other shared payment/order entities.

### Main Tasks

- Create the backend target folder structure under `backend/src/pay-order/pay-by-vietqr/`.
- Move VietQR-specific HTTP/webhook boundary responsibilities into boundary classes.
- Move VietQR orchestration and validation responsibilities into control classes.
- Move VietQR-specific DTOs, value objects, and models into entity/model files inside the slice where appropriate.
- Keep shared persistence entities in their current shared locations.
- Wire the new slice through NestJS modules without duplicate route registration.
- Update imports to point to the new slice.
- Preserve existing endpoint paths, request shapes, response shapes, and provider behavior.

### Acceptance Criteria

- Backend VietQR code lives under `backend/src/pay-order/pay-by-vietqr/` where it is specific to the Pay by VietQR use case.
- Existing public backend endpoints remain exactly the same:
  - `POST /api/payment/pay-order/:orderId`
  - `POST /api/payment/pay-order/:orderId/confirm`
  - `GET /api/payment/pay-order/:orderId/confirmation`
  - `POST /vqr/api/token_generate`
  - `POST /vqr/bank/api/transaction-sync`
- Response JSON field names remain unchanged.
- VietQR token generation, QR generation, payment confirmation, and transaction sync behavior remain unchanged.
- Order matching behavior remains unchanged and is not optimized.
- `PaymentTransaction` remains in its shared entity location.
- Successful VietQR payment still updates the order to `PENDING_PROCESSING`.
- No duplicate NestJS controllers/providers/routes remain after wiring.

### Test / Verification

- Run backend compile/type checks if available.
- Run backend unit/e2e tests if available.
- Repeat the PVQR-1 live smoke endpoints after the move.
- Verify callback behavior through ngrok when the environment is available:
  - local backend port: `8080`
  - public URL: `https://carefully-nectar-gulf.ngrok-free.dev`
- Search for stale imports pointing to old VietQR backend paths.

## PVQR-3: Frontend Restructure

### Goal

Move the existing frontend Pay by VietQR UI, API boundary, models, and control logic into `frontend/src/app/pay-order/pay-by-vietqr/` using ECB/OOP organization while preserving current routes and UI behavior.

This story is a frontend code organization refactor, not a redesign.

### File Scope

- Target frontend slice:
  - `frontend/src/app/pay-order/pay-by-vietqr/`
- Existing frontend sources to move, split, or rewire as needed:
  - `frontend/src/app/boundaries/vietqr-payment-screen/`
  - `frontend/src/app/services/order.service.ts`
  - `frontend/src/app/models/order.model.ts`
  - `frontend/src/app/app.routes.ts`
- Shared frontend services and models remain shared when they are used outside Pay by VietQR.

### Main Tasks

- Create the frontend target folder structure under `frontend/src/app/pay-order/pay-by-vietqr/`.
- Move VietQR-specific UI files into a boundary UI folder.
- Move VietQR-specific API calls into a boundary API service.
- Move VietQR-specific models into an entity/model file inside the slice.
- Move payment polling, success handling, and local storage cleanup into control classes/services where appropriate.
- Update routes and imports to use the new slice paths.
- Preserve existing route paths, API paths, UI states, polling behavior, and cleanup timing.

### Acceptance Criteria

- Frontend VietQR-specific code lives under `frontend/src/app/pay-order/pay-by-vietqr/`.
- Existing frontend routes remain unchanged:
  - `/vietqr-payment/:orderId`
  - `/vietqr-payment`
- Existing backend API usage remains unchanged.
- QR loading, error, confirming, timeout, and success UI behavior remain unchanged.
- Cart and ordering drafts are still cleared only after confirmed success with a transaction.
- Current local storage keys remain unchanged:
  - `aims_current_order_id`
  - `aims_current_invoice`
  - `aims_delivery_draft`
- Shared order/customer-order behavior outside Pay by VietQR remains unaffected.

### Test / Verification

- Run frontend compile/type checks if available.
- Run frontend unit/component tests if available.
- Manually navigate to the VietQR payment route if the frontend app is running.
- Verify QR generation and confirmation polling still call the same backend endpoints.
- Search for stale imports pointing to old VietQR frontend paths.

## PVQR-4: Cleanup & Regression

### Goal

Remove obsolete VietQR-specific files/imports after the backend and frontend slices are wired, then verify that the full Pay by VietQR flow still behaves exactly as before.

This story closes the refactor; it should not introduce new business behavior.

### File Scope

- Old backend VietQR-specific files that are fully replaced by the new backend slice.
- Old frontend VietQR-specific files that are fully replaced by the new frontend slice.
- Import references across backend and frontend.
- Test files or verification notes as needed.
- Shared entities and shared services remain untouched unless an import update is required.

### Main Tasks

- Remove old VietQR-specific files only after confirming no imports still depend on them.
- Remove temporary compatibility exports or wrappers if they are no longer needed.
- Search backend and frontend for stale old-path imports.
- Run backend and frontend regression checks.
- Re-run the live Pay by VietQR smoke flow.
- Verify callback behavior through ngrok when the environment is available.
- Confirm no production behavior changed during the refactor.

### Acceptance Criteria

- No duplicate VietQR backend controllers, providers, or routes remain.
- No duplicate VietQR frontend screens, API services, models, or controls remain.
- No imports point to old VietQR-specific paths.
- `PaymentTransaction` remains in its shared entity location.
- Backend and frontend compile.
- Pay by VietQR still supports QR generation, confirmation, callback transaction sync, order status update, and success display.
- Receipt email success/error behavior remains unchanged.
- VietQR manual refund behavior remains unchanged.
- No `.env` secret value appears in artifacts, logs, commits, or final responses.

### Test / Verification

- Run backend compile/type checks and tests if available.
- Run frontend compile/type checks and tests if available.
- Run repository searches for old VietQR paths/classes.
- Run manual or scripted smoke checks for:
  - QR generation.
  - Payment confirmation.
  - VietQR Sandbox Test Callback.
  - Transaction sync persistence.
  - Order status update to `PENDING_PROCESSING`.
  - Frontend success screen.
  - Cart and draft cleanup after confirmed success.
- Use ngrok for callback verification when needed:
  - command: `ngrok http 8080`
  - public URL: `https://carefully-nectar-gulf.ngrok-free.dev`
