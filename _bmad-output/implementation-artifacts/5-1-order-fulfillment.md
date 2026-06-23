---
baseline_commit: b5db920
created: 2026-06-23
---

# Story 5.1: Order Fulfillment

Status: review

## Story

As a Product Manager,
I want to review pending paid orders and either approve or reject them,
so that I can manage fulfillment, update inventory exactly once, notify customers, and process refunds when fulfillment cannot proceed.

## Acceptance Criteria

1. **Pending order list**
   - **Given** an authenticated staff member with role `PRODUCT_MANAGER`
   - **When** they navigate to the order review screen
   - **Then** AIMS lists only orders with status `PENDING_PROCESSING`
   - **And** the backend paginates the list with a default and maximum limit of 30 orders per page
   - **And** each row includes enough scan data: order id, created date, customer name/email/phone, province/address summary, total amount, item count, latest successful payment method/status, and any refund summary if already present.

2. **Order detail view**
   - **Given** a Product Manager selects a pending order
   - **When** AIMS loads the detail view
   - **Then** the UI shows delivery information, invoice totals, line items, current product stock for each line item, latest successful payment transaction, current order status, and action availability
   - **And** the backend returns `404` for unknown orders and `409`/non-actionable state for non-pending orders without exposing customer token-only APIs.

3. **Approve order**
   - **Given** a Product Manager is viewing a `PENDING_PROCESSING` order
   - **When** they confirm approval
   - **Then** the backend atomically changes the order to `APPROVED`, stores `processedBy` and `processedAt`, deducts purchased quantities from `products.stockQuantity`, records product history/audit for each stock deduction, and sends an approval email to the customer
   - **And** the response returns the approved order summary and updated line-item stock results.

4. **Approve stock integrity**
   - **Given** two managers, repeated clicks, browser retries, or stale detail screens
   - **When** approval is attempted
   - **Then** stock is deducted exactly once per order, no product stock can become negative, and only an order currently in `PENDING_PROCESSING` can be approved
   - **And** if any line item lacks sufficient current stock, approval fails with `409 Conflict`, no stock is deducted, the order remains `PENDING_PROCESSING`, and the response identifies the affected product ids/titles with requested and available quantities.

5. **Reject order**
   - **Given** a Product Manager is viewing a `PENDING_PROCESSING` order
   - **When** they confirm rejection with a reason
   - **Then** the backend atomically changes the order to `REJECTED`, stores `processedBy`, `processedAt`, and the rejection reason/audit note, creates or triggers the required refund handling, and sends a rejection email to the customer
   - **And** rejecting an order never deducts stock.

6. **Refund handling on reject**
   - **Given** the rejected order has a latest successful payment transaction
   - **When** the payment method is `VIETQR`
   - **Then** AIMS creates one `refund_transactions` row using `refundStatus: "MANUAL_REQUIRED"` and `refundMethod: "MANUAL_BANK_TRANSFER"` through the existing refund service behavior
   - **When** the payment method is PayPal/credit card and the PayPal payment implementation is present
   - **Then** AIMS calls the PayPal refund boundary and records a `refund_transactions` row with `refundMethod: "PAYPAL_API"` and `SUCCESS`, `PENDING`, or `FAILED` according to gateway result
   - **And** duplicate reject retries must not create duplicate refunds for the same payment transaction.

7. **Customer notification**
   - **Given** an order is approved or rejected
   - **When** the state change commits
   - **Then** AIMS sends an email to the order's delivery email using the existing `EmailBoundary`/SMTP configuration
   - **And** the email includes order id, final status, customer-facing view link using `APP_PUBLIC_URL` and `orderViewToken`, and refund/manual-refund information when rejected
   - **And** email failure is recorded/logged but must not roll back a committed approval/rejection.

8. **Authorization and route protection**
   - **Given** staff authentication from Story 5.3 exists
   - **When** any order-review API or UI route is accessed
   - **Then** NestJS uses `JwtAuthGuard`, `RolesGuard`, and `@Roles('PRODUCT_MANAGER')`, while Angular uses `authGuard` and `roleGuard`
   - **And** missing/invalid auth returns `401`, wrong active role returns `403`, and customer order view/cancel routes stay public token-based routes.

9. **Regression guardrails**
   - **Given** customer checkout, payment, order view, or cancellation flows run after this story
   - **When** orders move through payment, cancellation, approval, or rejection
   - **Then** payment success still sets only `PENDING_PROCESSING`, customer cancellation remains allowed only before approval/rejection, public catalog stock never goes below zero, and previously approved/rejected/cancelled orders cannot be processed again.

## Source Requirements

- `Context/AIMS-ProblemStatement-ver3.1.1.md`: paid orders enter pending processing; Product Managers see 30 pending orders per page; they select an order to view details and approve/reject; rejection reasons include out-of-stock or unavailable items; approval/rejection sends customer email; rejection refunds the full amount; stock quantity is automatically updated whenever items are sold.
- `_bmad-output/planning-artifacts/epics.md`: FR11 requires Product Managers to review orders 30/page and approve/reject; rejection triggers automatic PayPal refund or manual VietQR refund; FR13 requires audit logging; FR14 requires automated email notifications.
- `Context/DatabaseDescription.md`: `orders` has `processed_by`, `processed_at`, statuses `PENDING_PROCESSING`, `APPROVED`, `REJECTED`, `CANCELLED`; `products.stock_quantity` must be non-negative; `product_histories` stores stock/audit records; `refund_transactions` supports `PAYPAL_API` and `MANUAL_BANK_TRANSFER`.
- `Context/Group20-ClassDesignSpecification.md`: BCE mapping includes `Product`, `ProductHistory`, `Order`, `PaymentTransaction`, and payment/refund operations.
- `_bmad-output/planning-artifacts/ux-designs/ux-AIMS_Programming-2026-06-23/DESIGN.md` and `EXPERIENCE.md`: Product Manager order review is a peer staff nav item, not part of the product table; staff tools should be dense, table-first, operational, and consistent with Product Management.
- `_bmad-output/implementation-artifacts/3-2-pay-with-qr-code-via-vietqr.md`: VietQR payment success updates orders to `PENDING_PROCESSING`; VietQR refunds are manual; receipt email uses `APP_PUBLIC_URL` and email failures do not roll back payment.
- `_bmad-output/implementation-artifacts/4-1-product-management-crud.md`: product writes already use `ProductHistory` and Product Manager JWT identity; `STOCK_ADJUST` records old/new snapshots and reasons.
- `_bmad-output/implementation-artifacts/5-3-staff-authentication-password-management.md`: protected Product Manager endpoints must use JWT auth, roles guard, current DB role intersection, and Angular route guards.

## Developer Context

Current implementation state:

- No backend API or Angular UI exists for Product Manager order review/approval/rejection.
- `backend/src/order/order.controller.ts` places orders with status `PENDING`; it does not deduct stock.
- `backend/src/pay-order/pay-by-vietqr/control/vietqr-transaction-sync.control.ts` creates `PaymentTransaction`, updates the order to `PENDING_PROCESSING`, and sends payment-success email.
- `backend/src/customer-order/customer-order.service.ts` allows customer cancellation for `PENDING` and `PENDING_PROCESSING`, sets `CANCELLED`, creates manual VietQR refund tracking, and sends cancellation email.
- `backend/src/refund/refund.service.ts` currently supports only `createManualRefundForVietQR()` and `getRefundByPaymentTransaction()`.
- `backend/src/product/product.service.ts` records `ProductHistoryActionType.STOCK_ADJUST` when Product Manager manually changes stock; this story should reuse that audit pattern for automatic sale deduction unless an additive enum change is deliberately implemented and tested.
- `backend/src/order/entities/order.entity.ts` does not currently expose `processedBy`, `processedAt`, or rejection reason fields even though the DB description requires processed audit metadata.
- `frontend/src/app/app.routes.ts` already protects `/admin/products`; add a sibling staff route for pending orders.
- `frontend/src/app/services/order.service.ts` has customer checkout/payment/order-token methods only; add Product Manager order-review methods there or in a narrow admin-order service consistent with local Angular patterns.

## Stock Deduction Decision

Deduct `products.stockQuantity` on Product Manager approval, not on order placement and not on payment callback.

Rationale:

- The problem statement says successfully paid orders remain pending processing for Product Manager review.
- Product Managers may reject even if stock is available, so payment success is not final sale/fulfillment.
- Existing payment code already sets `PENDING_PROCESSING` and customer cancellation is allowed before approval.
- The requirement says stock is updated when items are sold; in this workflow the sale is operationally accepted at approval.

Implementation rule:

- Approval is the only path that decrements stock for an order.
- Approval must run inside one database transaction.
- Re-read the order inside the transaction and require `status = PENDING_PROCESSING`.
- Lock product rows for all order items before checking stock. Prefer TypeORM query builder pessimistic write locks against PostgreSQL; if local TypeORM lock behavior is unavailable, use a single conditional `UPDATE products SET stock_quantity = stock_quantity - :qty WHERE product_id = :id AND stock_quantity >= :qty` per line item and require affected row count `1`.
- If any line cannot be deducted, throw `409 Conflict` and rollback the entire transaction.
- Record one `ProductHistory` row per product deduction with:
  - `actionType: STOCK_ADJUST`
  - `performedBy: req.user.userId`
  - old/new product snapshots
  - reason like `Order approved: <orderId>`
- Do not also ask Product Managers for a manual stock adjustment reason during approval.
- Rejecting or customer-cancelling a pending order does not decrement stock and therefore must not restore stock.

## API Contracts

Use these contracts unless existing code has a stronger convention by implementation time.

### `GET /api/admin/orders/pending`

Protected by `JwtAuthGuard`, `RolesGuard`, `@Roles('PRODUCT_MANAGER')`.

Query:

- `page`: positive integer, default `1`
- `limit`: positive integer, default `30`, maximum `30`

Response:

```json
{
  "data": [
    {
      "orderId": "uuid",
      "status": "PENDING_PROCESSING",
      "createdAt": "2026-06-23T00:00:00.000Z",
      "customerName": "Nguyen Van A",
      "customerEmail": "customer@example.com",
      "customerPhone": "0123456789",
      "province": "Ha Noi",
      "address": "Address summary",
      "itemCount": 2,
      "totalAmount": 132000,
      "payment": {
        "paymentTransactionId": "uuid",
        "paymentMethod": "VIETQR",
        "status": "SUCCESS",
        "transactionRef": "gateway-ref",
        "amount": 132000,
        "createdAt": "2026-06-23T00:00:00.000Z"
      }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 30
}
```

### `GET /api/admin/orders/:orderId`

Protected by Product Manager role.

Response includes list-row fields plus:

- `deliveryInfo`
- `items`: order item snapshot plus current product stock/status when product still exists
- invoice totals: `subtotal`, `vat`, `shippingFee`, `totalAmount`, `totalWeight`
- latest successful payment transaction
- existing refund summary if present
- `canApprove`, `canReject`, and stock conflict hints.

### `POST /api/admin/orders/:orderId/approve`

Protected by Product Manager role.

Body can be `{}`.

Success:

- `200 OK`
- order status `APPROVED`
- `processedBy` from JWT principal
- `processedAt`
- line-level stock deduction result.

Errors:

- `404` unknown order
- `409` if order is not `PENDING_PROCESSING`, already processed, cancelled, missing successful payment transaction, product missing/unavailable, or insufficient stock
- `401`/`403` from auth guards.

### `POST /api/admin/orders/:orderId/reject`

Protected by Product Manager role.

Body:

```json
{
  "reason": "Cannot find item in stock."
}
```

Validation:

- `reason` required, non-empty after trim, maximum 1000 characters.

Success:

- `200 OK`
- order status `REJECTED`
- `processedBy`, `processedAt`, rejection reason/audit note
- refund summary
- email notification result summary.

Errors:

- `404` unknown order
- `409` if order is not `PENDING_PROCESSING`, missing successful payment transaction, or refund already conflicts with the requested action
- `401`/`403` from auth guards.

## Technical Requirements and Guardrails

### BCE Mapping

- Backend boundary: add an order-management/admin-order controller under `backend/src/order/` or a sibling `backend/src/admin-order/` module. Keep customer `PlaceOrderController` and token-based `CustomerOrderController` behavior intact.
- Backend control: add an `OrderFulfillmentService`/`OrderManagementService` for list, detail, approve, reject orchestration. Do not put approval/refund/stock logic inside Angular or directly in the controller.
- Backend entities: extend `Order`; reuse `OrderItem`, `Product`, `ProductHistory`, `PaymentTransaction`, `RefundTransaction`, and `User` principal.
- Notification boundary/control: add order approval/rejection notification controls/templates that reuse `PayOrderNotificationModule` and `EmailBoundary`; do not create another SMTP/nodemailer adapter.
- Frontend boundary: add a standalone Product Manager order screen, e.g. `frontend/src/app/boundaries/order-management-screen/*`, with a table and detail drawer/panel.
- Frontend control/service: extend `OrderService` or add `AdminOrderService` under `frontend/src/app/services/` with typed request/response models in `frontend/src/app/models/order.model.ts`.

### Backend Rules

- Only `PENDING_PROCESSING` orders can be approved or rejected.
- Require a latest successful `PaymentTransaction` before approval/rejection. If the order has no successful payment, it is not ready for fulfillment.
- Use order/customer totals already persisted on the order; do not recalculate and mutate invoice totals during fulfillment.
- Preserve the existing payment success behavior: do not change VietQR callback to approve or deduct stock.
- Preserve customer cancellation behavior: after approval or rejection, customer cancellation by token must return conflict.
- Store processor metadata. Add `processedBy` and `processedAt` to `Order`. Add a rejection reason column/field if no suitable audit table exists; with `synchronize: true`, an additive nullable column is acceptable in this codebase, but do not drop/recreate order data.
- Never trust client-provided `processedBy`, stock values, payment method, refund amount, or order status.
- Use numeric conversions consistently for TypeORM numeric fields before arithmetic.
- Maintain idempotency by checking current status first and by checking existing refund rows before creating a new one.

### Refund Rules

- Reuse `RefundService` for all refund tracking.
- Add `createManualRefundForVietQR()` idempotency or a generic `createManualRefundForVietQR(paymentTransaction, reason)` wrapper that first checks `getRefundByPaymentTransaction()`.
- Add PayPal refund support only through a server-side boundary/control, never from Angular. If Story 3.1 has introduced `PayPalBoundary.refundPayment()`, call it. If it has not landed, add a narrow boundary in the refund/payment area and document required environment variables by name only.
- For VietQR, do not call any automatic refund API.
- For email copy, "manual refund required" must be clear for VietQR and "refund is being processed" or gateway status must be clear for PayPal.

### Notification Rules

- Reuse `EmailBoundary` from `backend/src/pay-order/notification/boundary/email/email.boundary.ts`.
- Respect `EMAIL_ENABLED` behavior inside the existing nodemailer boundary.
- Build customer links from `APP_PUBLIC_URL` and `order.orderViewToken`.
- Email send must happen after the transaction commits or be non-transactional after successful DB save. If it fails, persist/log notification error where practical and still return success for the already committed state change.
- Do not log SMTP credentials, tokens, bank account values, JWT secrets, customer card data, or plaintext passwords.

### Frontend UX Requirements

- Add a staff nav peer item for Pending Orders. Do not mix this workflow into Product Management.
- Use the existing operational visual style: compact header, filter/search toolbar if useful, full-width table, stable status badges, right-side drawer or detail panel, explicit confirmation dialogs.
- Pending list shows 30/page and pagination controls.
- Detail view shows order line items and current stock side-by-side so the manager can understand stock conflicts before approving.
- Approve is the primary positive action; reject is a danger/destructive action and requires a reason.
- Disable actions while the request is in flight; prevent double-click duplicate submissions in the UI, while relying on backend idempotency for correctness.
- After approve/reject, remove the order from the pending list or show it as processed before refresh, and provide a concise result message.
- Preserve `401` redirect and `403` forbidden behavior from existing auth interceptor/guards.

## Files Likely Touched

Backend:

- `backend/src/app.module.ts`
- `backend/src/order/order.module.ts`
- `backend/src/order/entities/order.entity.ts`
- `backend/src/order/entities/order-fulfillment-history.entity.ts` (optional only if a separate order audit table is chosen)
- `backend/src/order/dto/query-pending-orders.dto.ts`
- `backend/src/order/dto/reject-order.dto.ts`
- `backend/src/order/order-fulfillment.controller.ts` or `backend/src/order/admin-order.controller.ts`
- `backend/src/order/order-fulfillment.service.ts`
- `backend/src/order/order-fulfillment.service.spec.ts`
- `backend/src/order/order-fulfillment.controller.spec.ts`
- `backend/src/product/entities/product-history.entity.ts` only if adding an enum value beyond `STOCK_ADJUST`
- `backend/src/refund/refund.service.ts`
- `backend/src/refund/refund.service.spec.ts`
- `backend/src/refund/refund.module.ts`
- `backend/src/customer-order/customer-order.service.ts` if shared idempotent refund helper or status conflict behavior needs tightening
- `backend/src/pay-order/notification/pay-order-notification.module.ts`
- `backend/src/order/notification/*` or `backend/src/customer-order/notification/*` for approval/rejection email controls/templates
- PayPal refund boundary/control files if Story 3.1 has not already added them.

Frontend:

- `frontend/src/app/app.routes.ts`
- `frontend/src/app/models/order.model.ts`
- `frontend/src/app/services/order.service.ts` or `frontend/src/app/services/admin-order.service.ts`
- `frontend/src/app/boundaries/order-management-screen/order-management-screen.ts`
- `frontend/src/app/boundaries/order-management-screen/order-management-screen.html`
- `frontend/src/app/boundaries/order-management-screen/order-management-screen.css`
- `frontend/src/app/boundaries/order-management-screen/order-management-screen.spec.ts`

## Tasks / Subtasks

- [x] Task 1: Add backend data model support (AC: 2-7)
  - [x] Add nullable `processedBy`, `processedAt`, and rejection reason/audit field(s) to `Order`.
  - [x] Ensure `Order` loads `items` and `deliveryInfo` needed by manager details.
  - [x] Confirm TypeORM mappings preserve existing order, token, payment, and customer-cancel behavior.

- [x] Task 2: Implement pending-order query and detail APIs (AC: 1, 2, 8)
  - [x] Add DTO validation for page/limit with limit capped at 30.
  - [x] Add Product Manager-protected list endpoint.
  - [x] Add Product Manager-protected detail endpoint.
  - [x] Include latest successful payment transaction and current product stock per line item.

- [x] Task 3: Implement approve transaction and stock deduction (AC: 3, 4, 8, 9)
  - [x] Re-read and lock/condition-update the order and products inside one transaction.
  - [x] Require order status `PENDING_PROCESSING` and latest successful payment.
  - [x] Validate every product exists and has enough stock.
  - [x] Deduct stock exactly once and prevent negative stock.
  - [x] Record `ProductHistory` `STOCK_ADJUST` rows with order approval reason and old/new snapshots.
  - [x] Save `APPROVED`, `processedBy`, and `processedAt`.

- [x] Task 4: Implement reject transaction and refunds (AC: 5, 6, 8, 9)
  - [x] Add reject DTO with required reason.
  - [x] Re-read and require `PENDING_PROCESSING`.
  - [x] Save `REJECTED`, `processedBy`, `processedAt`, and reason.
  - [x] Create idempotent manual refund row for VietQR.
  - [x] Wire PayPal automatic refund through the existing or newly added server-side PayPal refund boundary.
  - [x] Ensure reject never changes stock.

- [x] Task 5: Add approval/rejection notifications (AC: 3, 5, 7)
  - [x] Add email templates for approved and rejected orders.
  - [x] Include order view link and refund details where relevant.
  - [x] Reuse `EmailBoundary`.
  - [x] Make email failure non-fatal after state change.

- [x] Task 6: Add Angular Product Manager order UI (AC: 1, 2, 3, 5, 8)
  - [x] Add protected `/admin/orders` route with `PRODUCT_MANAGER` role data.
  - [x] Add list table with 30/page pagination.
  - [x] Add detail drawer/panel with delivery, invoice, line items, current stock, and payment/refund sections.
  - [x] Add approve confirmation and reject-with-reason dialog.
  - [x] Show loading, empty, conflict, success, `401`, and `403` states using existing auth/UI patterns.

- [x] Task 7: Add automated tests (AC: 1-9)
  - [x] Backend service tests for pagination, detail shape, approve success, insufficient stock rollback, duplicate approve/reject conflict, stock history rows, VietQR manual refund idempotency, PayPal refund delegation, and notification failure behavior.
  - [x] Backend controller tests for auth/role guards, DTO validation, and response contracts.
  - [x] Frontend tests for route guard usage, list pagination, detail rendering, approve/reject dialogs, disabled in-flight actions, conflict display, and service HTTP calls.

## Edge Cases

- List requested with `limit > 30`: backend caps or rejects; choose one behavior and test it. Preferred: cap to 30 and echo `limit: 30`.
- Pending list page after processing last item becomes empty: UI should reload the previous valid page or show the empty state.
- Order has `PENDING` status but no successful payment: not listed and cannot be approved/rejected through admin APIs.
- Order is `CANCELLED` by customer while manager detail screen is open: approve/reject returns `409`; UI refreshes detail/status.
- Two Product Managers approve simultaneously: one succeeds; the other receives `409`; stock decremented once.
- Two Product Managers reject simultaneously: one succeeds; one receives `409`; refund row created once.
- Manager approves with stale stock display: backend stock check wins.
- A product line references a deleted/deactivated product: approval should fail with `409` unless current stock/status rules explicitly allow fulfillment; rejection remains allowed.
- Multiple order items for the same product should not occur because DB spec has `UNIQUE(order_id, product_id)`, but approval code should aggregate quantities defensively before stock deduction.
- Email missing from delivery info: log/record notification skipped and keep committed order state.
- Email service fails: keep committed order/refund/stock state and expose a safe warning in response/logs.
- VietQR rejected order already has refund row from a previous partial attempt: return the existing refund summary instead of inserting another row.
- PayPal refund gateway returns failure after order was marked rejected: record refund `FAILED` and surface it; do not silently pretend refund succeeded.

## Testing Notes

Backend targeted commands:

- `cd backend && npm test -- order-fulfillment --runInBand`
- `cd backend && npm test -- refund --runInBand`
- `cd backend && npm run build`

Frontend targeted commands:

- `cd frontend && npm test -- --watch=false`
- `cd frontend && npm run build`

Manual verification:

- Seed/login as Product Manager.
- Complete VietQR payment so order reaches `PENDING_PROCESSING`.
- Verify `/admin/orders` shows the order in the pending list with 30/page pagination.
- Open detail, approve with sufficient stock, verify:
  - order becomes `APPROVED`
  - stock decreased by ordered quantities
  - product histories contain `STOCK_ADJUST` rows with `Order approved: <orderId>`
  - customer order cancel link now returns conflict
  - approval email is sent/simulated.
- Create a pending order with insufficient current stock, verify approval returns `409` and no stock changes.
- Reject a VietQR order, verify:
  - order becomes `REJECTED`
  - stock is unchanged
  - one manual refund row exists
  - rejection email mentions manual refund.
- If PayPal is implemented, reject a PayPal-paid order and verify PayPal refund boundary call and refund transaction state.

## Sequencing

Recommended backend-first sequence:

1. Add/adjust backend entities and DTOs.
2. Implement list/detail APIs.
3. Implement approve transaction with stock/audit tests before UI work.
4. Implement reject/refund transaction with idempotency tests.
5. Add notification controls/templates.
6. Add Angular service/model contracts.
7. Add Angular `/admin/orders` route and screen.
8. Run targeted backend/frontend tests and builds.

Dependency note:

- Story 5.3 auth patterns are already present in source and must be reused.
- Story 3.1 PayPal payment is not present in source as of this story creation. Do not fake automatic PayPal refunds. Either implement the required server-side PayPal refund boundary as part of this story or sequence Story 3.1 first, then call its `PayPalBoundary.refundPayment()` from `RefundService`.

## Previous Story Intelligence

- Story 3.2 moved VietQR payment code into `backend/src/pay-order/pay-by-vietqr` and uses `PayOrderNotificationModule`; avoid stale `/api/vietqr/webhook` patterns.
- Story 4.1 established Product Manager product-history writes and `PRODUCT_MANAGER` route protection.
- Story 5.3 established JWT/role guard behavior and removed temporary `X-AIMS-User-Id`; do not reintroduce header-based staff identity.

## Git Intelligence Summary

Recent commits show active work on product management and staff auth:

- `b5db920 feat: implement product management screen with full CRUD interface and associated UX documentation`
- `e586a87 docs: document staff authentication and password management story requirements and implement associated frontend login boundary and specs`
- `c65f7d1 feat: implement change password screen with validation and form handling`
- `aad76b1 feat: implement authentication service with JWT and add initial project configuration`
- `e652f63 feat: implement staff authentication system with JWT-based login, password management, and role-based access control guards`

Actionable patterns:

- Keep staff tools route-guarded in Angular and role-guarded in NestJS.
- Keep operational screens dense/table-first.
- Use focused service/controller specs for business rules and explicit frontend specs for guarded flows.

## Environment and Dependency Guardrails

- Use current locked stack: NestJS 11, TypeORM, PostgreSQL via `pg`, Jest/ts-jest, Angular 21 standalone components, Angular Router/HttpClient, RxJS.
- Do not upgrade dependencies for this story unless a failing build proves it necessary.
- Environment variables may be referenced by name only: `EMAIL_ENABLED`, `APP_PUBLIC_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, and any PayPal variables introduced/used by Story 3.1.
- Never copy secret values from `backend/.env` into story text, source logs, tests, or fixtures.

## Project Structure Notes

- `Context/DatabaseDescription.md` and current source diverge: the DB spec uses `delivery_infos`, invoice-linked payment transactions, and order `processed_by`, while source currently uses `delivery_info`, direct order-linked `PaymentTransaction`, and missing processed fields. Implement minimally against current source while moving it closer to required `processedBy`/`processedAt` behavior.
- Because the project uses `synchronize: true`, additive nullable entity fields can be introduced, but do not make destructive schema changes.
- Keep customer public order-token APIs separate from staff order-management APIs.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `backend`: `npm test -- order-fulfillment --runInBand` passed, 2 suites / 5 tests.
- `backend`: `npm run build` passed.
- `frontend`: `npx vitest run src/app/boundaries/order-management-screen/order-management-screen.spec.ts src/app/services/order.service.spec.ts` passed, 2 files / 9 tests.
- `frontend`: `npm run build` passed with Angular budget warnings.
- Full backend Jest was run and still has unrelated existing failures in VietQR sync, order shipping, and PlaceOrderController specs outside this story scope.
- Full frontend Vitest was run and still has unrelated existing failures in app, delivery-info, and invoice specs outside this story scope.

### Completion Notes List

- Added Product Manager protected pending-order list/detail/approve/reject APIs under `api/admin/orders`.
- Approval now re-reads pending orders in a transaction, requires successful payment, locks product rows, rejects insufficient/unavailable stock with `409`, deducts stock exactly once, records `ProductHistory` `STOCK_ADJUST`, and stores `processedBy`/`processedAt`.
- Rejection now stores processor metadata/reason, never changes stock, creates idempotent VietQR manual refund rows, and delegates PayPal refunds through a server-side boundary that records gateway/config failure instead of faking success.
- Approval/rejection email notifications reuse `EmailBoundary`, include customer order view links and refund copy, and keep committed state changes when email fails.
- Added Angular `/admin/orders` Product Manager screen with guarded route, 30/page table, detail panel, stock conflict display, approve confirmation, reject reason dialog, loading/empty/success/error states, and disabled in-flight actions.

### File List

- `_bmad-output/implementation-artifacts/5-1-order-fulfillment.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `backend/src/order/dto/query-pending-orders.dto.ts`
- `backend/src/order/dto/reject-order.dto.ts`
- `backend/src/order/entities/order.entity.ts`
- `backend/src/order/notification/order-fulfillment-notification.control.ts`
- `backend/src/order/order-fulfillment.controller.ts`
- `backend/src/order/order-fulfillment.controller.spec.ts`
- `backend/src/order/order-fulfillment.service.ts`
- `backend/src/order/order-fulfillment.service.spec.ts`
- `backend/src/order/order.module.ts`
- `backend/src/refund/paypal-refund.boundary.ts`
- `backend/src/refund/refund.module.ts`
- `backend/src/refund/refund.service.ts`
- `frontend/src/app/app.routes.ts`
- `frontend/src/app/boundaries/order-management-screen/order-management-screen.css`
- `frontend/src/app/boundaries/order-management-screen/order-management-screen.html`
- `frontend/src/app/boundaries/order-management-screen/order-management-screen.spec.ts`
- `frontend/src/app/boundaries/order-management-screen/order-management-screen.ts`
- `frontend/src/app/models/order.model.ts`
- `frontend/src/app/services/order.service.spec.ts`
- `frontend/src/app/services/order.service.ts`

### Change Log

- 2026-06-23: Implemented Product Manager pending order review, approve/reject fulfillment, automatic stock deduction/audit, refund handling, notifications, Angular UI, and focused tests.

## Story Completion Status

Implementation complete and ready for review.
Status set to `review`.
