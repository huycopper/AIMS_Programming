# Investigation: Pay by VietQR Refactor Readiness

## Hand-off Brief

1. **What happened.** The Pay by VietQR implementation exists and covers the broad happy path, but static evidence confirms several refactor blockers: route/document drift, database/entity mismatch, BCE naming/ownership confusion, stateful token coupling, missing tests, and stale generated artifacts.
2. **Where the case stands.** Concluded for refactor planning; the code should not be refactored by moving files only, because several behavior and schema contracts need to be made explicit first.
3. **What's needed next.** Run `bmad-correct-course` to turn these findings into a staged refactor/change proposal, starting with contract decisions for route paths, entity schema, and payment orchestration ownership.

## Case Info

| Field | Value |
| ----- | ----- |
| Ticket | N/A |
| Date opened | 2026-06-17 |
| Status | Concluded |
| System | AIMS_Programming; NestJS backend and Angular frontend |
| Evidence sources | `project-context.md`, `Context/`, `backend/vietqr_backend_flow.md`, Story 3.2 artifact, VietQR docs, backend/frontend source, tests, route/module wiring |

## Problem Statement

User requested an investigation before refactoring the completed Pay by VietQR use case. The stated concerns were disorganized file placement, possible overengineering from AI-generated implementation, duplicate/deprecated logic, incorrect Boundary-Control-Entity separation, incorrect module ownership, and possible mismatch with business, architecture, database, and VietQR flow documentation. The investigation did not edit implementation code.

## Evidence Inventory

| Source | Status | Notes |
| ------ | ------ | ----- |
| `project-context.md` | Available | Defines source-of-truth hierarchy and BCE constraints: Problem Statement first, DatabaseDescription second, ClassDesign third (`project-context.md:5`, `project-context.md:17`). |
| `Context/AIMS-ProblemStatement-ver3.1.1.md` | Available | Defines default QR payment, post-payment pending processing, email, and VietQR sandbox scope (`Context/AIMS-ProblemStatement-ver3.1.1.md:33`, `Context/AIMS-ProblemStatement-ver3.1.1.md:47`, `Context/AIMS-ProblemStatement-ver3.1.1.md:53`). |
| `Context/Group20-ClassDesignSpecification.md` | Available | Defines InvoiceScreen, VietQRPaymentScreen, VietQRBoundary, PayOrderController, and PayThroughVietQRController contracts (`Context/Group20-ClassDesignSpecification.md:47`, `Context/Group20-ClassDesignSpecification.md:116`, `Context/Group20-ClassDesignSpecification.md:154`, `Context/Group20-ClassDesignSpecification.md:222`, `Context/Group20-ClassDesignSpecification.md:238`). |
| `Context/DatabaseDescription.md` | Available | Defines order status enum, payment transaction table, and refund transaction table (`Context/DatabaseDescription.md:199`, `Context/DatabaseDescription.md:271`, `Context/DatabaseDescription.md:293`). |
| `Context/vietqr-docs/` | Available | Defines token, QR generation, test callback, and Transaction Sync contracts (`Context/vietqr-docs/3-CallAPIGetToken.md:6`, `Context/vietqr-docs/4-CallAPIGenerateQRCode.md:21`, `Context/vietqr-docs/5-CallAPITestCallback.md:14`, `Context/vietqr-docs/2-APITransactionSync.md:6`). |
| `backend/vietqr_backend_flow.md` | Available but stale | Describes old webhook boundary and `/api/vietqr/webhook`, while current source uses `TransactionSyncController` (`backend/vietqr_backend_flow.md:49`, `backend/vietqr_backend_flow.md:101`). |
| Story 3.2 artifact | Available, partial/stale | User warned it is incomplete; evidence confirms stale file list and callback route mismatch (`_bmad-output/implementation-artifacts/3-2-pay-with-qr-code-via-vietqr.md:181`). |
| Backend source | Available | Main files mapped below. |
| Frontend source | Available | Main files mapped below. |
| Tests | Partial | Backend e2e only asserts Hello World (`backend/test/app.e2e-spec.ts:19`); claimed payment service spec is absent from workspace. |
| Build check | Partial | `npm run build` in `backend` timed out after 120s; no pass/fail conclusion. |

## Source Code Map

### Backend Pay by VietQR

| File | Role observed | Evidence |
| ---- | ------------- | -------- |
| `backend/src/payment/controllers/pay-order.controller.ts` | HTTP entrypoint for generate QR, confirm payment, and confirmation status. Class is named `PayOrderBoundary`. | Routes at `backend/src/payment/controllers/pay-order.controller.ts:18`, `backend/src/payment/controllers/pay-order.controller.ts:31`, `backend/src/payment/controllers/pay-order.controller.ts:46`; class at `backend/src/payment/controllers/pay-order.controller.ts:8`. |
| `backend/src/payment/services/pay-through-payment-gateway.service.ts` | Payment orchestration service, but class is named `PayThroughPaymentGatewayController`. Holds access token state, calls VietQR boundary, polls DB for confirmation, builds response DTO. | Class at `backend/src/payment/services/pay-through-payment-gateway.service.ts:36`; token state at `backend/src/payment/services/pay-through-payment-gateway.service.ts:39`; generate at `backend/src/payment/services/pay-through-payment-gateway.service.ts:80`; confirm at `backend/src/payment/services/pay-through-payment-gateway.service.ts:89`; DB polling at `backend/src/payment/services/pay-through-payment-gateway.service.ts:141`. |
| `backend/src/boundaries/viet-qr/viet-qr.service.ts` | Outbound VietQR API wrapper. Gets token, generates QR, triggers VietQR test callback. | Env config at `backend/src/boundaries/viet-qr/viet-qr.service.ts:9`; token call at `backend/src/boundaries/viet-qr/viet-qr.service.ts:19`; QR generation body at `backend/src/boundaries/viet-qr/viet-qr.service.ts:60`; test callback at `backend/src/boundaries/viet-qr/viet-qr.service.ts:121`. |
| `backend/src/boundaries/viet-qr/transaction-sync.controller.ts` | Inbound callback controller plus partner token endpoint. Also performs order matching, validation, transaction persistence, order status update, and email notification. | Token endpoint at `backend/src/boundaries/viet-qr/transaction-sync.controller.ts:107`; callback route at `backend/src/boundaries/viet-qr/transaction-sync.controller.ts:171`; all-order scan at `backend/src/boundaries/viet-qr/transaction-sync.controller.ts:205`; transaction save/status update/email at `backend/src/boundaries/viet-qr/transaction-sync.controller.ts:226`, `backend/src/boundaries/viet-qr/transaction-sync.controller.ts:231`, `backend/src/boundaries/viet-qr/transaction-sync.controller.ts:238`. |
| `backend/src/payment/entities/payment-transaction.entity.ts` | TypeORM entity for payment records. | Entity/table at `backend/src/payment/entities/payment-transaction.entity.ts:12`; FK to order at `backend/src/payment/entities/payment-transaction.entity.ts:17`; payment fields at `backend/src/payment/entities/payment-transaction.entity.ts:21`. |
| `backend/src/payment/payment.module.ts` | Wires payment HTTP controller, TransactionSyncController, gateway service, VietQR boundary, repositories, JWT, notification. | Imports at `backend/src/payment/payment.module.ts:5`; controllers/providers at `backend/src/payment/payment.module.ts:28`. |
| `backend/src/customer-order/customer-order.service.ts` | Customer self-service order view/cancel; creates manual refund for successful VietQR payments on customer cancellation. | Transaction lookup at `backend/src/customer-order/customer-order.service.ts:37`; cancel flow at `backend/src/customer-order/customer-order.service.ts:85`; manual refund trigger at `backend/src/customer-order/customer-order.service.ts:118`. |
| `backend/src/refund/refund.service.ts` | Creates manual refund records for VietQR. | Method at `backend/src/refund/refund.service.ts:16`; `MANUAL_REQUIRED` and `MANUAL_BANK_TRANSFER` at `backend/src/refund/refund.service.ts:27`. |
| `backend/src/notification/notification.service.ts` and email builders | Sends payment success and cancellation/refund emails. | Payment success at `backend/src/notification/notification.service.ts:19`; cancelled/refund at `backend/src/notification/notification.service.ts:32`. |

### Frontend Pay by VietQR

| File | Role observed | Evidence |
| ---- | ------------- | -------- |
| `frontend/src/app/boundaries/invoice-screen/invoice-screen.ts` | Defaults invoice confirmation to VietQR route. | `confirmOrder()` routes to `/vietqr-payment/:orderId` at `frontend/src/app/boundaries/invoice-screen/invoice-screen.ts:55`. |
| `frontend/src/app/boundaries/vietqr-payment-screen/vietqr-payment-screen.component.ts` | Generates QR, confirms payment, polls confirmation, renders success, empties cart. | Request QR at `frontend/src/app/boundaries/vietqr-payment-screen/vietqr-payment-screen.component.ts:57`; confirm at `frontend/src/app/boundaries/vietqr-payment-screen/vietqr-payment-screen.component.ts:81`; polling at `frontend/src/app/boundaries/vietqr-payment-screen/vietqr-payment-screen.component.ts:142`; cart emptying at `frontend/src/app/boundaries/vietqr-payment-screen/vietqr-payment-screen.component.ts:173`. |
| `frontend/src/app/boundaries/vietqr-payment-screen/vietqr-payment-screen.component.html` | QR UI, loading state, "I have paid", success screen with order and transaction info. | Loading at `frontend/src/app/boundaries/vietqr-payment-screen/vietqr-payment-screen.component.html:5`; QR at `frontend/src/app/boundaries/vietqr-payment-screen/vietqr-payment-screen.component.html:17`; confirm button at `frontend/src/app/boundaries/vietqr-payment-screen/vietqr-payment-screen.component.html:37`; success details at `frontend/src/app/boundaries/vietqr-payment-screen/vietqr-payment-screen.component.html:52`. |
| `frontend/src/app/services/order.service.ts` | Client API wrapper for order and VietQR payment endpoints. | Payment URLs at `frontend/src/app/services/order.service.ts:21`; methods at `frontend/src/app/services/order.service.ts:59`. |
| `frontend/src/app/app.routes.ts` | Registers VietQR payment routes. | Routes at `frontend/src/app/app.routes.ts:15`. |
| `frontend/src/app/boundaries/cancel-order-screen/cancel-order-screen.html` | Displays manual refund information after cancellation. | Manual refund note at `frontend/src/app/boundaries/cancel-order-screen/cancel-order-screen.html:38`. |

## Confirmed Findings

### Finding 1: Callback route contract is inconsistent across VietQR docs, story, backend flow doc, and implementation.

**Severity:** High

**Evidence:** VietQR Transaction Sync docs specify `/bank/api/transaction-sync` (`Context/vietqr-docs/2-APITransactionSync.md:6`). Story 3.2 also says VietQR calls `POST /bank/api/transaction-sync` (`_bmad-output/implementation-artifacts/3-2-pay-with-qr-code-via-vietqr.md:66`, `_bmad-output/implementation-artifacts/3-2-pay-with-qr-code-via-vietqr.md:121`). Current code exposes `@Post('vqr/bank/api/transaction-sync')` (`backend/src/boundaries/viet-qr/transaction-sync.controller.ts:171`). The older backend flow doc still describes `POST /api/vietqr/webhook` and `VietQRWebhookBoundary` (`backend/vietqr_backend_flow.md:49`, `backend/vietqr_backend_flow.md:109`).

**Detail:** This is not just a placement issue. If the VietQR sandbox callback URL is configured from docs/story as `/bank/api/transaction-sync`, current backend will not receive it unless an external base path rewrites `/vqr`. Conversely, the old backend flow doc describes a file/route that no longer exists in current inventory.

### Finding 2: PaymentTransaction entity does not match the database specification.

**Severity:** High

**Evidence:** Database spec defines `payment_transactions.transaction_id`, FK `invoice_id`, `transaction_content`, `transaction_datetime`, `gateway_transaction_ref`, and `payment_method` enum `QR_CODE` or `CREDIT_CARD` (`Context/DatabaseDescription.md:275`, `Context/DatabaseDescription.md:276`, `Context/DatabaseDescription.md:277`, `Context/DatabaseDescription.md:278`, `Context/DatabaseDescription.md:281`, `Context/DatabaseDescription.md:283`, `Context/DatabaseDescription.md:291`). Code defines `payment_transaction_id`, FK `order_id`, `transaction_ref`, `payment_details` JSON, and arbitrary `paymentMethod` string (`backend/src/payment/entities/payment-transaction.entity.ts:14`, `backend/src/payment/entities/payment-transaction.entity.ts:17`, `backend/src/payment/entities/payment-transaction.entity.ts:21`, `backend/src/payment/entities/payment-transaction.entity.ts:27`, `backend/src/payment/entities/payment-transaction.entity.ts:38`). Transaction creation stores `paymentMethod: 'VIETQR'` (`backend/src/boundaries/viet-qr/transaction-sync.controller.ts:345`).

**Detail:** This conflicts with the project context hierarchy, where `DatabaseDescription.md` is the source of truth for physical schema (`project-context.md:17`). Refactoring only file paths would preserve a schema mismatch.

### Finding 3: BCE naming and module ownership are confused.

**Severity:** Medium-High

**Evidence:** Project context says boundaries handle presentation, controls orchestrate business logic, and entities represent persistence (`project-context.md:12`). Class design names `PayOrderController` and `PayThroughVietQRController` as controls (`Context/Group20-ClassDesignSpecification.md:222`, `Context/Group20-ClassDesignSpecification.md:238`). Current HTTP controller class is named `PayOrderBoundary` while located under `payment/controllers` (`backend/src/payment/controllers/pay-order.controller.ts:7`). Current orchestration service class is named `PayThroughPaymentGatewayController` while located under `payment/services` (`backend/src/payment/services/pay-through-payment-gateway.service.ts:35`). `TransactionSyncController` lives in `backend/src/boundaries/viet-qr` but is registered as a Nest controller by `PaymentModule` (`backend/src/payment/payment.module.ts:9`, `backend/src/payment/payment.module.ts:28`).

**Detail:** The architecture labels are partially semantic and partially NestJS framework concepts, which makes refactor planning risky. A cleaner target should separate Nest HTTP controllers, use-case services, external gateway adapters, and entities without overloading "Boundary" and "Controller".

### Finding 4: Payment confirmation depends on mutable singleton service state.

**Severity:** High

**Evidence:** `PayThroughPaymentGatewayController` has `private accessToken: string` (`backend/src/payment/services/pay-through-payment-gateway.service.ts:39`). It is assigned during QR generation (`backend/src/payment/services/pay-through-payment-gateway.service.ts:83`) and later reused during confirmation (`backend/src/payment/services/pay-through-payment-gateway.service.ts:92`). Frontend exposes confirmation as a normal API call through `confirmVietQrPayment(orderId)` (`frontend/src/app/services/order.service.ts:63`) and the backend exposes `POST /api/payment/pay-order/:orderId/confirm` (`backend/src/payment/controllers/pay-order.controller.ts:31`).

**Detail:** In NestJS default singleton providers, this state is shared across requests. Confirming an order without a prior QR request in the same process, after token expiry, or during concurrent order flows can use undefined/stale token state. This is a behavior risk and a tech-debt hotspot.

### Finding 5: Transaction Sync controller mixes boundary, control, persistence, matching, notification, and response formatting.

**Severity:** Medium-High

**Evidence:** The controller validates auth (`backend/src/boundaries/viet-qr/transaction-sync.controller.ts:180`), loads all orders (`backend/src/boundaries/viet-qr/transaction-sync.controller.ts:205`), matches an order (`backend/src/boundaries/viet-qr/transaction-sync.controller.ts:208`), validates amount/content (`backend/src/boundaries/viet-qr/transaction-sync.controller.ts:217`), creates and saves a payment transaction (`backend/src/boundaries/viet-qr/transaction-sync.controller.ts:226`), updates order status (`backend/src/boundaries/viet-qr/transaction-sync.controller.ts:231`), and sends email (`backend/src/boundaries/viet-qr/transaction-sync.controller.ts:238`). It also injects `PayThroughPaymentGatewayController` but does not use it (`backend/src/boundaries/viet-qr/transaction-sync.controller.ts:98`).

**Detail:** This confirms an overgrown boundary/controller and an unused dependency. Refactor should extract transaction-sync processing into a payment application service and leave the Nest controller thin.

### Finding 6: Order matching is fragile and O(n) over all orders.

**Severity:** Medium

**Evidence:** Transaction Sync loads all orders with `this.orderRepo.find()` (`backend/src/boundaries/viet-qr/transaction-sync.controller.ts:205`) and then matches by full order id, shortened order id, or `content.includes(expectedContent)` (`backend/src/boundaries/viet-qr/transaction-sync.controller.ts:284`). QR generation truncates order id to 13 chars (`backend/src/boundaries/viet-qr/viet-qr.service.ts:168`) because VietQR docs cap `orderId` at 13 chars (`Context/vietqr-docs/4-CallAPIGenerateQRCode.md:21`).

**Detail:** The 13-character constraint is real, but scanning all orders is not necessary. A refactor should persist or derive a deterministic VietQR reference for lookup, then query directly.

### Finding 7: Transaction Sync DTO is not strict despite the story requirement.

**Severity:** Medium-High

**Evidence:** Story requires strict DTOs and validation for missing/invalid Transaction Sync payload (`_bmad-output/implementation-artifacts/3-2-pay-with-qr-code-via-vietqr.md:107`, `_bmad-output/implementation-artifacts/3-2-pay-with-qr-code-via-vietqr.md:112`). VietQR docs mark `bankaccount`, `amount`, `transType`, `content`, `transactionid`, `transactiontime`, `referencenumber`, and `orderId` required (`Context/vietqr-docs/2-APITransactionSync.md:15`). Code defines a plain class without class-validator decorators (`backend/src/boundaries/viet-qr/transaction-sync.controller.ts:22`) and accepts `@Body()` without a validation pipe (`backend/src/boundaries/viet-qr/transaction-sync.controller.ts:173`). Runtime validation checks only amount finite/equal and content includes expected content (`backend/src/boundaries/viet-qr/transaction-sync.controller.ts:302`).

**Detail:** Missing required fields such as `transactionid`, `transactiontime`, `referencenumber`, or `bankaccount` can flow into `paymentDetails` as undefined.

### Finding 8: Backend and frontend both implement payment confirmation polling/waiting.

**Severity:** Medium

**Evidence:** Backend `confirmPayment()` calls `waitForSuccessfulPayment()` (`backend/src/payment/services/pay-through-payment-gateway.service.ts:100`), which loops 10 attempts with 500ms delay (`backend/src/payment/services/pay-through-payment-gateway.service.ts:141`). Frontend also polls confirmation 12 attempts with 500ms delay (`frontend/src/app/boundaries/vietqr-payment-screen/vietqr-payment-screen.component.ts:142`).

**Detail:** The duplication may be intentional for sandbox latency, but ownership is unclear. It increases response latency and makes user-visible timeout behavior split across backend and frontend.

### Finding 9: Test coverage claimed by story is missing from source.

**Severity:** High

**Evidence:** Story lists `backend/src/payment/services/pay-through-payment-gateway.service.spec.ts` as a file and claims unit tests were created (`_bmad-output/implementation-artifacts/3-2-pay-with-qr-code-via-vietqr.md:189`, `_bmad-output/implementation-artifacts/3-2-pay-with-qr-code-via-vietqr.md:178`). Workspace inventory did not contain that file. The only backend e2e test currently asserts the default Hello World route (`backend/test/app.e2e-spec.ts:19`). Backend Jest config only looks for `*.spec.ts` under `src` (`backend/package.json:72`), and no VietQR spec file was found in the source inventory.

**Detail:** This is a concrete story/source drift and a refactor risk. Before moving behavior, add tests around QR generation orchestration, token handling, Transaction Sync validation, idempotency/duplicates, order status update, and manual refund trigger.

### Finding 10: Manual refund is implemented for customer cancellation, but Product Manager reject flow is missing from the scanned source.

**Severity:** Medium

**Evidence:** Story requires manual refund handling/notification when a Product Manager rejects a paid VietQR order (`_bmad-output/implementation-artifacts/3-2-pay-with-qr-code-via-vietqr.md:43`). Code creates manual refund records when a customer cancels an order with a successful `VIETQR` transaction (`backend/src/customer-order/customer-order.service.ts:117`, `backend/src/customer-order/customer-order.service.ts:118`). No product-manager approve/reject source file was found under `backend/src` or `frontend/src` during inventory.

**Detail:** This may be out of the current use-case implementation scope, but it is a business-rule gap if Story 3.2 is treated as complete.

### Finding 11: Generated/story docs are stale relative to current source.

**Severity:** Medium

**Evidence:** Story file list includes deprecated `backend/src/boundaries/viet-qr/viet-qr-webhook.boundary.ts` and payment service spec (`_bmad-output/implementation-artifacts/3-2-pay-with-qr-code-via-vietqr.md:184`, `_bmad-output/implementation-artifacts/3-2-pay-with-qr-code-via-vietqr.md:189`). Current inventory did not include those files. `backend/vietqr_backend_flow.md` also describes `VietQRWebhookBoundary` and `simulateCallback()` (`backend/vietqr_backend_flow.md:105`, `backend/vietqr_backend_flow.md:110`), while current frontend has `confirmPayment()` and backend uses `TransactionSyncController`.

**Detail:** Use story/backend_flow as historical references only until corrected.

### Finding 12: Environment contract is implicit.

**Severity:** Medium

**Evidence:** VietQR outbound config is read directly from env vars (`backend/src/boundaries/viet-qr/viet-qr.service.ts:9`). Transaction Sync token endpoint uses `CLIENT_USERNAME`, `CLIENT_PASSWORD`, and `JWT_SECRET` (`backend/src/boundaries/viet-qr/transaction-sync.controller.ts:135`, `backend/src/boundaries/viet-qr/transaction-sync.controller.ts:149`). Inventory found `backend/.env` ignored by git, but no `.env.example` or sample config file.

**Detail:** Refactor should add a documented env contract or typed config provider before moving code, otherwise behavior depends on local secret state.

### Finding 13: Story says no additional npm packages are required, but QR rendering uses `qrcode`.

**Severity:** Low-Medium

**Evidence:** Story states "No additional npm packages required" (`_bmad-output/implementation-artifacts/3-2-pay-with-qr-code-via-vietqr.md:108`). Code imports `qrcode` (`backend/src/boundaries/viet-qr/viet-qr.service.ts:3`) and backend package includes it (`backend/package.json:35`).

**Detail:** This may be acceptable if the backend intentionally converts VietQR's QR string to a data URL, but it is a docs/source inconsistency and should be decided explicitly.

## Deduced Conclusions

### Deduction 1: This should be planned as a contract refactor, not just file reorganization.

**Based on:** Findings 1, 2, 3, 4, 7, 9.

**Reasoning:** Route mismatch can break external callbacks; entity mismatch can break database traceability; singleton token state can break concurrent/late confirmation; tests are missing. Moving files first would preserve hidden behavior risks.

**Conclusion:** The first refactor stage should define and test stable contracts: endpoint paths, payload validation, persistence schema, method/status enums, and service ownership.

### Deduction 2: The user's premise about AI-generated tech debt is confirmed.

**Based on:** Findings 3, 5, 8, 11, 13.

**Reasoning:** There are stale docs, a controller-named service, a boundary-named HTTP controller, unused injection, very long explanatory comments, duplicate polling, and artifact/source drift.

**Conclusion:** The code has clear signs of AI-generated implementation debt.

### Deduction 3: The happy path is present but fragile.

**Based on:** Source code map and Findings 4, 6, 7, 8.

**Reasoning:** QR generation, test callback, Transaction Sync, transaction persistence, status update, success screen, cart emptying, and payment email all exist. However, several assumptions are implicit: token state exists, callback URL matches config, required callback fields are present, and matching by content finds the right order.

**Conclusion:** Refactor should preserve happy-path behavior while making those assumptions explicit and testable.

## Hypothesized Paths

### Hypothesis 1: Pay by VietQR implementation contains AI-generated technical debt.

**Status:** Confirmed

**Theory:** Implementation may include scattered files, extra abstractions, deprecated leftovers, duplicate logic, and weak ownership boundaries.

**Supporting indicators:** User report; Story 3.2 file list mentions deprecated/missing files; source confirms naming/ownership drift and duplicate polling.

**Would confirm:** Source evidence showing dead paths, unused abstractions, duplicated flow, misplaced classes, or docs/architecture mismatch.

**Would refute:** Source evidence showing cohesive ownership, no unused/deprecated code, and direct traceability to docs.

**Resolution:** Confirmed by Findings 3, 5, 8, 9, 11, and 13.

### Hypothesis 2: Current implementation is behaviorally complete for the full business rule set.

**Status:** Refuted

**Theory:** Story tasks marked complete imply all relevant business rules are implemented.

**Supporting indicators:** Story task list is checked off and current code has the main happy path.

**Would confirm:** Tests or source showing callback path, successful payment, customer cancellation/manual refund, and Product Manager reject/manual refund all implemented.

**Would refute:** Missing source or tests for one of those paths.

**Resolution:** Refuted by missing payment tests and no scanned Product Manager reject implementation.

## Missing Evidence

| Gap | Impact | How to Obtain |
| --- | ------ | ------------- |
| Runtime integration evidence with real/sandbox VietQR callback | Cannot confirm external callback behavior end-to-end. | Run backend with public callback URL and sandbox credentials, or inspect recorded integration logs if available. |
| Product Manager approve/reject implementation | Cannot confirm reject-triggered manual refund requirement. | Provide PM module/branch if it exists, or implement as separate story. |
| Final intended database contract | Entity code and DatabaseDescription conflict. | Decide whether to align code to `DatabaseDescription.md` or update the database doc through a formal change. |
| Env/config contract | Refactor cannot safely preserve deployment assumptions. | Add `.env.example` or typed config documentation. |
| Build result | Backend build timed out after 120s during investigation. | Re-run build with more time or inspect local Node/Nest process behavior. |

## Source Code Trace

| Element | Detail |
| ------- | ------ |
| Trigger | Customer confirms order on invoice; frontend routes to VietQR payment screen (`frontend/src/app/boundaries/invoice-screen/invoice-screen.ts:55`). |
| QR generation | Frontend calls `requestVietQrPayment`; backend `PayOrderBoundary.payOrder` fetches order and calls gateway service; service gets token and generates QR (`frontend/src/app/services/order.service.ts:59`, `backend/src/payment/controllers/pay-order.controller.ts:18`, `backend/src/payment/services/pay-through-payment-gateway.service.ts:80`). |
| Test callback | Frontend calls confirm; backend service calls `VietQRBoundary.handleAPICallback` with stored access token (`frontend/src/app/services/order.service.ts:63`, `backend/src/payment/services/pay-through-payment-gateway.service.ts:89`, `backend/src/boundaries/viet-qr/viet-qr.service.ts:121`). |
| Transaction Sync | VietQR is expected to call callback endpoint; current code exposes `vqr/bank/api/transaction-sync` and processes callback in the controller (`backend/src/boundaries/viet-qr/transaction-sync.controller.ts:171`). |
| Persistence | Transaction Sync creates `PaymentTransaction`, sets order to `PENDING_PROCESSING`, saves both, and sends email (`backend/src/boundaries/viet-qr/transaction-sync.controller.ts:226`, `backend/src/boundaries/viet-qr/transaction-sync.controller.ts:231`, `backend/src/boundaries/viet-qr/transaction-sync.controller.ts:238`). |
| Frontend success | Frontend accepts `SUCCESS` with transaction, empties cart, clears drafts, and shows success details (`frontend/src/app/boundaries/vietqr-payment-screen/vietqr-payment-screen.component.ts:186`, `frontend/src/app/boundaries/vietqr-payment-screen/vietqr-payment-screen.component.ts:173`, `frontend/src/app/boundaries/vietqr-payment-screen/vietqr-payment-screen.component.html:52`). |
| Manual refund on customer cancel | Customer cancel flow creates manual VietQR refund record and sends notification (`backend/src/customer-order/customer-order.service.ts:118`, `backend/src/refund/refund.service.ts:16`). |

## Conclusion

**Confidence:** High

The Pay by VietQR happy path exists, but the implementation is not refactor-ready as a simple file-layout cleanup. Evidence confirms multiple AI-generated tech-debt patterns and contract risks: route drift, stale docs, schema mismatch, stateful singleton token handling, overgrown callback controller, fragile order matching, duplicate polling, missing strict validation, and missing tests. The highest-risk items are callback route/schema contracts, persistence contract, token lifecycle, and test coverage.

## Recommended Next Steps

### Fix direction

1. Run `bmad-correct-course` with this investigation report as input.
2. Decide the canonical endpoint contract: `/bank/api/transaction-sync` vs `/vqr/bank/api/transaction-sync`, and update code/docs/config together.
3. Decide whether code must align to `DatabaseDescription.md` or whether the database doc must be formally revised.
4. Split current responsibilities into thin HTTP controllers, payment use-case services, VietQR adapter, transaction-sync service, and persistence entities.
5. Remove singleton `accessToken` state; request/cache token inside the VietQR adapter with expiry awareness, or fetch token per operation.
6. Replace all-order scan with deterministic lookup based on stored VietQR order reference/content.
7. Add validation DTOs and tests before moving files.
8. Update or retire stale `backend/vietqr_backend_flow.md` and stale sections of Story 3.2.

### Diagnostic

- Add tests for: QR request success/failure, confirm without prior QR, expired/missing token, Transaction Sync missing fields, amount mismatch, content mismatch, duplicate callback/idempotency, customer cancellation manual refund, and endpoint path.
- Re-run backend build with a longer timeout or inspect why `nest build` did not finish within 120s.

## Reproduction / Verification Plan

1. Create an order through the current frontend or backend API.
2. Open `/vietqr-payment/:orderId` and verify QR generation calls `POST /api/payment/pay-order/:orderId`.
3. Click "I have paid" and verify backend calls VietQR Test Callback.
4. Trigger Transaction Sync against the exact configured route and verify transaction persistence, order status `PENDING_PROCESSING`, email side effect, frontend success, and cart emptying.
5. Cancel the paid order through the cancel token and verify `MANUAL_REQUIRED` refund.

## Side Findings

- Confirmed: BMad config points `project_knowledge` to `{project-root}/docs`, but repository documentation is under `Context/` and `project-context.md`; no `docs/` directory was found during inventory.
- Confirmed: `backend/src/app.module.ts` uses `synchronize: true` for TypeORM (`backend/src/app.module.ts:30`), which can hide schema drift during development.
- Confirmed: `orders.status` defaults to `PENDING` in code (`backend/src/order/entities/order.entity.ts:68`, `backend/src/order/order.controller.ts:84`), while `DatabaseDescription.md` says order status must be one of `PENDING_PROCESSING`, `APPROVED`, `REJECTED`, `CANCELLED` (`Context/DatabaseDescription.md:199`). This is broader than Pay by VietQR but directly touches the payment transition.
