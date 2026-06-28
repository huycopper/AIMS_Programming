# Remediation Sprint Plan: Automatic Stock Deduction When Items Are Sold

**Project:** AIMS_Programming  
**Date:** 2026-06-28  
**Sprint type:** Remediation sprint  
**Primary source of truth:** `Context/AIMS-ProblemStatement-ver3.1.1.md`

## Business Requirement

The Problem Statement requires two separate stock-change paths:

1. Manual stock adjustment: when new items are added or damaged items are removed, the Product Manager manually adjusts stock and records the reason.
2. Automatic sale deduction: "The quantity in stock of a product is automatically updated whenever its items are sold."

The current code already covers manual stock changes through Product Manager product updates and `ProductHistoryActionType.STOCK_ADJUST`. The missing remediation is to deduct product stock automatically when a successful sale is recorded.

## Current Gap

Current implementation deducts stock in the Product Manager approval flow:

- `backend/src/order/order-fulfillment.service.ts` deducts stock during `approveOrder`.
- VietQR payment success currently records a `PaymentTransaction` and moves the order to `PENDING_PROCESSING`, but does not deduct stock at the sale/payment-success point.
- Story `5-1-order-fulfillment.md` intentionally preserved payment success without stock deduction, which conflicts with the Problem Statement sentence that stock is updated whenever items are sold.

This sprint corrects the business timing: successful payment is the system event that records a sold order; Product Manager approval should review/approve/reject fulfillment and must not be the first stock-deduction point.

## Sprint Goal

When an order payment succeeds, AIMS automatically decrements each sold product's `stock_quantity` exactly once, records auditable `ProductHistory` rows, prevents negative stock, and keeps Product Manager approval/rejection/cancellation flows consistent.

## Design Principles

- **Single Responsibility:** create one stock-movement control for sale deduction and restoration. Payment, cancellation, and fulfillment services call it instead of owning product stock mutation logic.
- **Open/Closed:** expose intent-based methods such as `deductSoldItems` and `restoreSoldItems`; future payment methods can reuse them without editing inventory internals.
- **Liskov/Interface Segregation:** keep call sites dependent on a narrow stock-movement API, not on product repository details.
- **Dependency Inversion:** controllers depend on services/controls, not TypeORM repositories for stock mutation.
- **Low coupling:** payment modules should not know `ProductHistory` persistence details.
- **High cohesion:** product stock mutation, pessimistic product locking, snapshot creation, and audit history live together.
- **Transaction safety:** stock changes, order state changes, and payment success handling must occur within one database transaction where possible.

## Proposed Architecture

Add a cohesive stock movement control under the product domain:

- `backend/src/product/control/product-stock-movement.control.ts`
- Export it from `ProductModule`.
- Inject it into payment success, customer cancellation, and order fulfillment services.

Public methods:

- `deductSoldItems(manager, order, source): Promise<StockMovementResult>`
- `restoreSoldItems(manager, order, source): Promise<StockMovementResult>`
- `getSaleDeductionStatus(manager, order): Promise<SaleDeductionStatus>`

Implementation rules:

- Aggregate duplicate order item product ids before mutation.
- Lock each product row with pessimistic write before checking stock.
- If any product is missing, inactive, or insufficient, do not partially deduct stock.
- Use `ProductHistoryActionType.STOCK_ADJUST` with old/new snapshots.
- Standardize reasons:
  - `Automatic sale deduction: order <orderId>`
  - `Automatic sale restoration: order <orderId>`
- Treat `Order.status` as the main idempotency guard:
  - `PENDING` means not yet sold.
  - Successful payment transitions `PENDING` to `PENDING_PROCESSING` after stock deduction is attempted.
  - Duplicate payment callbacks for a non-`PENDING` order must not deduct stock again.
- Use product history lookup only inside the stock-movement control to determine whether restoration is required for cancellation/rejection.

## Stories

### Story ASD-1: Create Product Stock Movement Control

**As a developer,**  
I want a dedicated stock movement control,  
So that automatic sale deduction, restoration, locking, and audit history stay cohesive and reusable.

**Acceptance Criteria**

- Given an order with one or more items, when `deductSoldItems` is called in a transaction, then it aggregates quantities by product id.
- Given all products are active and have enough stock, when deduction succeeds, then each product stock decreases by the ordered quantity.
- Given any product is missing, inactive, or insufficient, when deduction is attempted, then no product stock is changed.
- Given stock changes, when deduction or restoration succeeds, then `ProductHistory` rows are recorded with old/new snapshots and standardized reasons.
- Given duplicate product ids in order items, when stock is deducted, then stock changes once per product with the total requested quantity.

**Implementation Tasks**

- Add stock movement result and conflict types.
- Move snapshot logic out of `OrderFulfillmentService` or duplicate it privately inside the new cohesive control if extracting from `ProductService` would widen the API too much.
- Export the control from `ProductModule`.
- Add unit tests for successful deduction, insufficient rollback, duplicate line aggregation, missing product, inactive product, and history creation.

### Story ASD-2: Deduct Stock on Successful Payment

**As AIMS,**  
I want product stock to decrease automatically when payment succeeds,  
So that stock reflects sold items immediately.

**Acceptance Criteria**

- Given a `PENDING` order and a successful VietQR transaction-sync callback, when AIMS records the successful `PaymentTransaction`, then AIMS attempts stock deduction before moving the order to `PENDING_PROCESSING`.
- Given stock deduction succeeds, then products are decremented, history rows are stored, and the order becomes `PENDING_PROCESSING`.
- Given stock deduction fails due to insufficient or unavailable stock, then no product stock is changed, the successful payment transaction remains recorded, the order becomes `PENDING_PROCESSING`, and the Product Manager can reject/refund the paid order.
- Given the same callback is received again, then no additional stock is deducted.
- Given `PayThroughVietQRController.getPaymentConfirmation` sees a successful transaction, then it must not bypass the same stock-sale transition.
- Given a future PayPal success path records `PaymentTransaction.status = SUCCESS`, then it can call the same stock-movement control without duplicating stock logic.

**Implementation Tasks**

- Wrap VietQR transaction sync in a database transaction.
- Lock the order before payment-success transition.
- Call `deductSoldItems` only when the locked order is still `PENDING`.
- Keep payment success email behavior after transaction commit; email failure must not roll back stock or payment persistence.
- Update VietQR unit/e2e tests to assert product stock changes on success and remains unchanged on duplicate callbacks.

### Story ASD-3: Remove Approval-Time Stock Deduction

**As a Product Manager,**  
I want approval to approve fulfillment, not perform the first stock deduction,  
So that order review aligns with the sale timing required by the Problem Statement.

**Acceptance Criteria**

- Given a paid order already has sale stock deduction history, when Product Manager approves it, then approval updates order status to `APPROVED` and sends notification without decreasing stock again.
- Given a paid order has no sale deduction because stock was insufficient at payment time, when Product Manager views it, then the UI/API shows stock conflicts and approval is disabled or returns `409 Conflict`.
- Given two Product Managers approve the same order concurrently, then only one approval succeeds and stock is not changed by approval.
- Given rejection is chosen, then approval-time stock deduction code is not called.

**Implementation Tasks**

- Remove or retire `deductStock` from `OrderFulfillmentService`.
- Use `ProductStockMovementControl.getSaleDeductionStatus` in pending-order detail and approval validation.
- Update `canApprove` and stock conflict calculation so already-deducted sold items are not falsely reported as insufficient just because current stock is lower after deduction.
- Update fulfillment tests that currently expect approval to deduct stock.

### Story ASD-4: Restore Stock on Paid Order Cancellation or Rejection

**As AIMS,**  
I want stock restored when a paid order that already deducted stock is cancelled or rejected,  
So that inventory remains accurate after refunds or failed fulfillment.

**Acceptance Criteria**

- Given a customer cancels a `PENDING` unpaid order, then no stock restoration occurs.
- Given a customer cancels a `PENDING_PROCESSING` paid order with sale deduction history, then stock is restored exactly once and a `STOCK_ADJUST` history row is recorded.
- Given a Product Manager rejects a `PENDING_PROCESSING` paid order with sale deduction history, then stock is restored exactly once before or within the same transaction as rejection/refund tracking.
- Given the order had no sale deduction history, then cancellation/rejection does not increase stock.
- Given duplicate cancellation or rejection attempts occur, then stock is not restored twice.

**Implementation Tasks**

- Update `CustomerOrderService.cancelOrderByToken` to use the stock movement control inside a transaction.
- Update `OrderFulfillmentService.rejectOrder` to restore only previously deducted stock.
- Keep VietQR manual refund behavior unchanged.
- Add tests for paid cancellation restoration, unpaid cancellation no-op, rejection restoration, and duplicate restoration no-op.

### Story ASD-5: Regression and Integration Verification

**As the team,**  
I want focused tests around inventory lifecycle edges,  
So that the remediation does not break payment, cancellation, fulfillment, or manual stock adjustment.

**Acceptance Criteria**

- Manual Product Manager stock adjustment still requires `stockAdjustmentReason`.
- Product creation/update/delete history behavior remains unchanged.
- Payment success with sufficient stock produces one sale deduction per product.
- Payment success with insufficient stock never makes stock negative.
- Cancellation/rejection restore only previously deducted stock.
- Approval never deducts stock.
- Existing order notification and refund behavior remains intact.

**Recommended Test Commands**

- `npm test -- --runInBand product.service.spec.ts`
- `npm test -- --runInBand order-fulfillment.service.spec.ts`
- `npm test -- --runInBand vietqr-transaction-sync.control.spec.ts`
- Add `customer-order.service.spec.ts`, then run `npm test -- --runInBand customer-order.service.spec.ts`
- `npm run test:e2e -- --runInBand vietqr-characterization.e2e-spec.ts`
- `npm run build`

## Sprint Sequence

1. Implement ASD-1 first. This creates the reusable inventory control and protects SOLID boundaries before touching payment or fulfillment.
2. Implement ASD-2 next. Move the sale deduction trigger to payment success.
3. Implement ASD-3 after payment success is safe. Remove double-deduction risk from Product Manager approval.
4. Implement ASD-4 after the new deduction timing exists. Add compensating restoration for cancellation/rejection.
5. Run ASD-5 regression verification and update affected story docs/status.

## Definition of Done

- Stock decreases automatically when a successful payment records sold items.
- Stock is never negative.
- Stock deduction is idempotent across duplicate callbacks or repeated confirmation checks.
- Product Manager manual stock adjustment behavior remains unchanged.
- Approval no longer performs the initial sale deduction.
- Cancellation/rejection restores only stock that this sold-order flow previously deducted.
- Product history contains clear reasons for automatic sale deduction and automatic restoration.
- Focused backend unit tests and VietQR characterization tests pass.
- Backend build passes.

## Sprint Tracking Recommendation

Add a new implementation story after this plan is accepted:

- Suggested key: `3-3-automatic-stock-deduction-on-successful-sale`
- Suggested epic placement: Epic 3, because the trigger is successful payment and future payment methods should reuse the same stock movement control.
- A companion fulfillment adjustment can be tracked under Epic 5 if the team prefers to keep Product Manager review changes separate.

Recommended next BMad actions in fresh contexts:

- `[CS] Create Story` with `bmad-create-story create 3.3 automatic stock deduction on successful sale`
- `[VS] Validate Story`
- `[DS] Dev Story`
- `[CR] Code Review`
