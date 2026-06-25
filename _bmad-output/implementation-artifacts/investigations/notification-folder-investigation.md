# Investigation: backend/src/notification usage

## Hand-off Brief

1. **What happened.** The user suspected `backend/src/notification` is useless; evidence shows it is still imported and used for customer order cancellation notification.
2. **Where the case stands.** Concluded: the folder is not dead, but it is mostly a legacy/compatibility facade after payment success notification moved to `backend/src/pay-order/notification`.
3. **What's needed next.** If cleanup is desired, keep or relocate order-cancellation behavior first, then remove only the obsolete payment-success compatibility method and old test dependency.

## Case Info

| Field            | Value                                                                 |
| ---------------- | --------------------------------------------------------------------- |
| Ticket           | N/A                                                                   |
| Date opened      | 2026-06-20                                                            |
| Status           | Concluded                                                             |
| System           | Windows / PowerShell / NestJS backend                                 |
| Evidence sources | Static references, source code, backend build, focused Jest unit test |

## Problem Statement

User-reported hypothesis: `backend/src/notification` may be useless.

## Evidence Inventory

| Source | Status | Notes |
| ------ | ------ | ----- |
| Source references | Available | `NotificationModule`, `NotificationService`, `EmailService`, and cancellation email builder are still referenced. |
| Tests/build | Available | Backend build passed; focused payment success notification unit test passed. |
| Runtime E2E DB behavior | Partial | E2E test was inspected but not run because it starts the app and depends on broader environment. |

## Confirmed Findings

### Finding 1: The old notification module is still wired into NestJS

**Evidence:** `backend/src/app.module.ts:10`, `backend/src/app.module.ts:37`, `backend/src/customer-order/customer-order.module.ts:8`, `backend/src/customer-order/customer-order.module.ts:15`

**Detail:** `AppModule` imports `NotificationModule`, and `CustomerOrderModule` imports it to make `NotificationService` injectable.

### Finding 2: Customer order cancellation still calls `NotificationService`

**Evidence:** `backend/src/customer-order/customer-order.service.ts:13`, `backend/src/customer-order/customer-order.service.ts:26`, `backend/src/customer-order/customer-order.service.ts:138`

**Detail:** When a VietQR-paid order is cancelled, `CustomerOrderService` calls `sendOrderCancelledNotification(order, refund)` asynchronously.

### Finding 3: The folder still owns order-cancellation email composition and dispatch

**Evidence:** `backend/src/notification/notification.service.ts:6`, `backend/src/notification/notification.service.ts:7`, `backend/src/notification/notification.service.ts:33`, `backend/src/notification/notification.service.ts:49`, `backend/src/notification/email/order-cancelled-email.builder.ts:4`

**Detail:** `NotificationService` uses `EmailService` and `buildOrderCancelledEmail` to send cancellation emails.

### Finding 4: Payment-success notification has moved elsewhere

**Evidence:** `backend/src/notification/notification.service.ts:8`, `backend/src/notification/notification.service.ts:20`, `backend/src/notification/notification.service.ts:24`, `backend/src/pay-order/pay-by-vietqr/control/vietqr-transaction-sync.control.ts:10`, `backend/src/pay-order/pay-by-vietqr/control/vietqr-transaction-sync.control.ts:57`

**Detail:** The old `sendPaymentSuccessNotification` method delegates to `PaymentSuccessNotificationControl`; VietQR transaction sync directly imports the new control from `backend/src/pay-order/notification`.

### Finding 5: A characterization E2E test still depends on the old `EmailService`

**Evidence:** `backend/test/vietqr-characterization.e2e-spec.ts:11`, `backend/test/vietqr-characterization.e2e-spec.ts:40`, `backend/test/vietqr-characterization.e2e-spec.ts:41`

**Detail:** The test retrieves both old `EmailService` and new `EmailBoundary`, which keeps the old provider observable in tests.

## Deduced Conclusions

### Deduction 1: The folder is not currently removable as-is

**Based on:** Findings 1, 2, and 3

**Reasoning:** Removing `backend/src/notification` would break module imports, constructor injection in `CustomerOrderService`, and the customer cancellation email flow.

**Conclusion:** The folder is not useless in the current codebase.

### Deduction 2: The folder is a legacy compatibility layer for part of notification behavior

**Based on:** Findings 3 and 4

**Reasoning:** Payment success notification moved to `pay-order/notification`; the old service delegates or wraps newer infrastructure, while retaining cancellation email behavior.

**Conclusion:** The folder is partly legacy and could be reduced, but only after order-cancellation notification is moved or intentionally dropped.

## Hypothesized Paths

### Hypothesis 1: `backend/src/notification` is useless

**Status:** Refuted

**Theory:** The folder has no active imports or runtime role.

**Supporting indicators:** Payment success notification has been moved to `backend/src/pay-order/notification`.

**Would confirm:** No source or test references to `NotificationModule`, `NotificationService`, `EmailService`, or the cancellation email builder.

**Would refute:** Active imports or runtime call sites.

**Resolution:** Refuted by active imports and cancellation call site in `CustomerOrderService`.

### Hypothesis 2: The folder can be cleaned up after migration

**Status:** Confirmed

**Theory:** The folder is now a compatibility area, not the main payment success notification implementation.

**Supporting indicators:** Direct VietQR transaction sync uses `PaymentSuccessNotificationControl` from `pay-order/notification`.

**Would confirm:** Payment success implementation and tests live under the new folder, while old folder only delegates or supports cancellation.

**Would refute:** Core payment success behavior still implemented only in old folder.

**Resolution:** Confirmed by source references and focused unit test.

## Source Code Trace

| Element | Detail |
| ------- | ------ |
| Trigger | Customer cancels an order by token in `CustomerOrderService.cancelOrderByToken`. |
| Condition | The cancelled order has a successful `VIETQR` payment transaction. |
| Related files | `backend/src/customer-order/customer-order.service.ts`, `backend/src/notification/notification.service.ts`, `backend/src/notification/email/order-cancelled-email.builder.ts`, `backend/src/pay-order/notification/pay-order-notification.module.ts` |

## Conclusion

**Confidence:** High

`backend/src/notification` is not useless today. It is still required for the customer cancellation email flow and for current NestJS module/test wiring. However, it is no longer the main implementation home for payment success notification; that responsibility now belongs under `backend/src/pay-order/notification`.

## Recommended Next Steps

### Fix direction

If cleanup is desired, first decide the target design:

- Keep `backend/src/notification` as the generic cross-order notification facade, and remove only obsolete payment-success delegation later.
- Or move order-cancellation notification into a more specific module, update `CustomerOrderService` and tests, then delete the old folder.

### Diagnostic

Before deleting anything, run reference checks for `NotificationModule`, `NotificationService`, `EmailService`, and `buildOrderCancelledEmail`, then run backend build and cancellation-flow tests.

## Verification

- `npm run build` in `backend`: passed.
- `npm test -- payment-success-notification.control.spec.ts --runInBand` in `backend`: passed.
