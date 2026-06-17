# VietQR Backend Flow

This document describes the current backend contract for the AIMS VietQR sandbox payment flow.

## Public Callback Route

The canonical AIMS application route for VietQR Transaction Sync is:

```http
POST /bank/api/transaction-sync
```

If a deployment exposes the backend under a public base path such as `/vqr`, that prefix belongs to infrastructure or reverse-proxy configuration only. It is not part of the Nest application route.

The public URL configured in VietQR/ngrok should therefore end with:

```text
/bank/api/transaction-sync
```

## Environment Contract

Tracked example configuration lives in `backend/.env.example`. Required variables are:

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
- `AIMS_PUBLIC_CALLBACK_URL`

Do not commit real secrets.

## BCE Ownership

- `backend/src/payment/controllers/pay-order.controller.ts`
  Receives frontend payment requests and delegates orchestration to the payment service.

- `backend/src/payment/services/pay-through-payment-gateway.service.ts`
  Coordinates the customer-facing QR generation, sandbox confirmation, and payment confirmation polling.

- `backend/src/boundaries/viet-qr/viet-qr.service.ts`
  Owns outbound VietQR API calls and the VietQR access-token lifecycle. Tokens are cached with expiry awareness based on the VietQR 300-second lifetime.

- `backend/src/boundaries/viet-qr/transaction-sync.controller.ts`
  Receives VietQR HTTP callbacks and delegates processing to the application service.

- `backend/src/payment/services/transaction-sync.service.ts`
  Validates callback authorization and DTO fields, performs deterministic payment matching, persists the successful transaction, updates order status, and triggers the payment success email.

- `backend/src/payment/entities/payment-transaction.entity.ts`
  Represents persisted payment transaction data.

## QR Generation Flow

1. Frontend calls `POST /api/payment/pay-order/:orderId`.
2. `PayOrderController` loads the order and delegates to `PayThroughPaymentGatewayController.generateQRCode`.
3. `PayThroughPaymentGatewayController` delegates to `VietQRBoundary.generateQRCode`.
4. `VietQRBoundary` obtains a valid VietQR token if no non-expired token is cached.
5. `VietQRBoundary` calls VietQR Generate QR with:
   - `bankCode`
   - `bankAccount`
   - `userBankName`
   - `content = AIMS {shortOrderId}`
   - `qrType = 0`
   - `amount`
   - `orderId = first 13 characters of orderId without hyphens`
   - `transType = C`
6. Backend returns QR data plus the payment amount/content to the frontend.

VietQR constraints preserved by the backend:

- `orderId` is at most 13 characters.
- `content` is at most 23 characters with the current `AIMS {shortOrderId}` format.

## Sandbox Confirmation Flow

1. Frontend calls `POST /api/payment/pay-order/:orderId/confirm`.
2. `PayThroughPaymentGatewayController.confirmPayment` calls `VietQRBoundary.handleAPICallback`.
3. `VietQRBoundary` obtains a valid token independently of any previous QR-generation request.
4. `VietQRBoundary` calls the VietQR Test Callback endpoint with bank account, content, amount, `transType = C`, and bank code.
5. VietQR sandbox calls AIMS back at `POST /bank/api/transaction-sync`.
6. The frontend polls `GET /api/payment/pay-order/:orderId/confirmation` until the transaction is recorded.

## Transaction Sync Flow

`TransactionSyncService` processes `POST /bank/api/transaction-sync` as follows:

1. Reject missing or non-Bearer `Authorization` headers with VietQR error shape.
2. Verify the Bearer JWT using `JWT_SECRET`.
3. Validate required Transaction Sync fields with `class-validator`:
   - `bankaccount`
   - `amount`
   - `transType`
   - `content`
   - `transactionid`
   - `transactiontime`
   - `referencenumber`
   - `orderId`
4. Check for an existing successful transaction by `gateway_transaction_ref` using `referencenumber` or `transactionid`.
5. Find the order deterministically by direct `orderId` or by the stored UUID-derived short order id. The code does not load all orders and scan them in memory.
6. Reject amount/content mismatches before persistence.
7. Persist a successful transaction with:
   - `payment_method = QR_CODE`
   - `status = SUCCESS`
   - `transaction_content`
   - `transaction_datetime`
   - `gateway_transaction_ref`
8. Set the order status to `PENDING_PROCESSING`.
9. Send the payment success email.
10. Return VietQR success response shape with `object.reftransactionid`.

Duplicate successful callbacks are idempotent: AIMS returns success for the existing transaction and does not create duplicate transaction rows, duplicate emails, or repeated status side effects.

## Persistence Decision

`Context/DatabaseDescription.md` defines `payment_transactions.invoice_id`. The current backend codebase does not yet have a persisted `Invoice` entity or invoice repository. For this story, AIMS keeps the existing order-based payment link to preserve the working Pay by VietQR flow, while aligning the payment transaction fields and method value with the approved database contract:

- `transaction_id`
- `transaction_content`
- `transaction_datetime`
- `amount`
- `status`
- `payment_method`
- `error_code`
- `gateway_transaction_ref`
- `created_at`

Future invoice persistence work should replace the temporary `order_id` relation with the documented `invoice_id` relation once invoices are implemented as persisted entities.

## Customer Cancellation Compatibility

Successful VietQR payments use `payment_method = QR_CODE`. Customer cancellation still creates a manual bank-transfer refund requirement through `RefundService.createManualRefundForVietQR`, preserving the current manual refund behavior.
