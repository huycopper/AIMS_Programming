# Order Notification and Customer Self-Service Plan

## Purpose

This document captures the implementation context and plan for two related AIMS business requirements:

1. After a customer presses **I have paid** and the payment is confirmed successfully, AIMS sends an invoice and payment transaction information to the customer's email.
2. The customer can use links from that notification to view order details or cancel the order before it is approved.

The design should also leave room for future notification channels such as SMS and push notifications.

## Current System Context

The current payment flow is centered around the VietQR payment screen and backend callback handling:

- Frontend payment confirmation starts from `frontend/src/app/boundaries/vietqr-payment-screen/vietqr-payment-screen.component.ts`.
- The **I have paid** button calls `POST /api/payment/pay-order/:orderId/confirm`.
- Backend confirmation is handled by `backend/src/payment/controllers/pay-order.controller.ts`.
- VietQR test callback eventually calls `POST /vqr/bank/api/transaction-sync`.
- `backend/src/boundaries/viet-qr/transaction-sync.controller.ts` validates the callback, saves `PaymentTransaction`, updates `Order.status` to `PENDING_PROCESSING`, and currently calls `simulateSendEmail(...)`.
- `Order` already stores delivery information, invoice-like totals, and order items.
- `PaymentTransaction` already stores payment method, amount, status, transaction reference, and raw payment details.

The existing `simulateSendEmail(...)` method is the best integration point to replace with real notification behavior.

## Target Capabilities

### Payment Success Notification

When payment is confirmed successfully:

- Send an email to the customer.
- Include invoice information.
- Include shipping/delivery information.
- Include payment transaction information.
- Include a secure order view link.
- Include a secure order cancellation link.

### Customer Order View

Using the secure view link, the customer can see:

- Order ID and current status.
- Delivery/shipping information.
- Invoice breakdown.
- Ordered items.
- Latest successful payment transaction information.
- Whether the order is still cancellable.

### Customer Order Cancellation

Using the secure cancel link, the customer can cancel the order only before the order is approved.

Allowed cancellation states:

- `PENDING`
- `PENDING_PROCESSING`

Rejected cancellation states:

- `APPROVED`
- `REJECTED`
- `CANCELLED`

After successful cancellation:

- Update `Order.status` to `CANCELLED`.
- Record cancellation time and optional reason.
- Create refund tracking data.
- For VietQR, mark refund as manual-required because the current VietQR flow does not support automatic refund.
- Send customer notification confirming cancellation.
- Optionally notify product managers/manual refund handlers.

## Recommended Technologies

### Backend

- **NestJS modules and providers**
  - Keep notification and customer self-service logic modular and injectable.
- **Nodemailer**
  - SMTP email delivery.
  - Supports HTML and plain-text messages.
  - Supports reusable transporters and standard SMTP providers.
- **@nestjs/config**
  - Read SMTP, app URL, and notification settings from `.env`.
  - The project already uses global `ConfigModule`.
- **TypeORM**
  - Extend existing entities.
  - Add notification/refund tracking data.
- **Node crypto**
  - Generate secure public tokens for view/cancel links.
  - Optionally hash tokens before storing them.
- **Nest Logger**
  - Log email success/failure and cancellation/refund events.
- **Optional future production upgrade: BullMQ + Redis**
  - Queue notification jobs.
  - Retry failed notifications without blocking payment callback handling.

### Frontend

- **Angular routing**
  - Add public token-based customer routes.
- **Angular service layer**
  - Add customer order view and cancel API calls to `OrderService`.
- **Standalone Angular screens**
  - Add customer order details screen.
  - Add cancel confirmation/result state.

## Environment Configuration

Add email/app URL settings to backend `.env`:

```env
EMAIL_ENABLED=true
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=example-user
SMTP_PASS=example-password
SMTP_FROM="AIMS <no-reply@aims.local>"
APP_PUBLIC_URL=http://localhost:4200
```

Optional future queue settings:

```env
NOTIFICATION_QUEUE_ENABLED=false
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Backend Architecture

### New Modules

```text
backend/src/notification/
  notification.module.ts
  notification.service.ts
  notification-message.type.ts
  channels/
    email-notification.channel.ts
  email/
    email.service.ts
    payment-success-email.builder.ts
    order-cancelled-email.builder.ts

backend/src/customer-order/
  customer-order.module.ts
  customer-order.controller.ts
  customer-order.service.ts
  dto/
    customer-order-details.dto.ts
    cancel-order.dto.ts

backend/src/refund/
  refund.module.ts
  refund.service.ts
  entities/
    refund-transaction.entity.ts
```

For a smaller first implementation, `CustomerOrderController` and `CustomerOrderService` can live inside the existing `order` module, but a separate module keeps the public customer-token use case clearer.

### Notification Abstraction

Use a channel abstraction so the business flow does not depend directly on email.

```ts
export interface NotificationChannel {
  send(message: NotificationMessage): Promise<NotificationDeliveryResult>;
}
```

Initial implementation:

- `EmailNotificationChannel`

Future implementations:

- `SmsNotificationChannel`
- `PushNotificationChannel`

`NotificationService` exposes business-oriented methods:

```ts
sendPaymentSuccessNotification(order, transaction)
sendOrderCancelledNotification(order, transaction, refund)
sendRefundRequiredNotification(order, refund)
```

### Email Sending

`EmailService` owns the Nodemailer transporter.

Responsibilities:

- Read SMTP config from `ConfigService`.
- Create and reuse one transporter.
- Send `to`, `subject`, `html`, and `text`.
- If `EMAIL_ENABLED=false`, log the message instead of sending it.

### Email Content Builders

Keep email content generation out of controllers.

`payment-success-email.builder.ts` should build:

- Subject.
- Plain text body.
- HTML body.
- View order URL.
- Cancel order URL.

Suggested links:

```text
${APP_PUBLIC_URL}/orders/view/:orderViewToken
${APP_PUBLIC_URL}/orders/cancel/:cancelToken
```

## Data Model Changes

### Order Entity

Add secure link fields:

```ts
@Column({ name: 'order_view_token', type: 'varchar', length: 255, unique: true })
orderViewToken: string;

@Column({ name: 'cancel_token', type: 'varchar', length: 255, unique: true })
cancelToken: string;

@Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
cancelledAt: Date | null;

@Column({ name: 'cancel_reason', type: 'text', nullable: true })
cancelReason: string | null;
```

Recommended security improvement:

- Generate raw tokens for links.
- Store only token hashes in DB.
- Compare by hashing the incoming token.

For the course project, plain UUID tokens are acceptable if we document the tradeoff.

### PaymentTransaction Entity

Add receipt notification tracking:

```ts
@Column({ name: 'receipt_email_sent_at', type: 'timestamp', nullable: true })
receiptEmailSentAt: Date | null;

@Column({ name: 'receipt_email_error', type: 'text', nullable: true })
receiptEmailError: string | null;
```

This prevents duplicate emails if VietQR sends the transaction sync callback multiple times.

### RefundTransaction Entity

Add an entity for refund tracking:

```ts
refundTransactionId: string;
paymentTransaction: PaymentTransaction;
refundAmount: number;
refundReason: string;
refundDatetime: Date;
refundStatus: 'PENDING' | 'SUCCESS' | 'FAILED' | 'MANUAL_REQUIRED';
refundMethod: 'PAYPAL_API' | 'MANUAL_BANK_TRANSFER';
manualRefundNote: string | null;
```

For VietQR cancellations:

- `refundMethod = 'MANUAL_BANK_TRANSFER'`
- `refundStatus = 'MANUAL_REQUIRED'`
- `manualRefundNote` describes that a product manager must manually refund the customer.

## Backend API Design

### View Order By Token

```http
GET /api/customer/orders/view/:viewToken
```

Response:

```json
{
  "orderId": "uuid",
  "status": "PENDING_PROCESSING",
  "canCancel": true,
  "deliveryInfo": {
    "name": "Customer Name",
    "phone": "0123456789",
    "email": "customer@example.com",
    "province": "Ha Noi",
    "address": "Address",
    "note": "Optional note"
  },
  "items": [
    {
      "productId": "uuid",
      "productTitle": "Book",
      "quantity": 1,
      "unitPrice": 100000,
      "weight": 0.5
    }
  ],
  "invoice": {
    "subtotal": 100000,
    "vat": 10000,
    "shippingFee": 22000,
    "totalAmount": 132000
  },
  "paymentTransaction": {
    "paymentTransactionId": "uuid",
    "transactionReference": "VQR123",
    "transactionContent": "AIMS ...",
    "transactionDatetime": "2026-06-12T00:00:00.000Z",
    "amount": 132000,
    "paymentMethod": "VIETQR",
    "status": "SUCCESS"
  }
}
```

### Cancel Order By Token

```http
POST /api/customer/orders/cancel/:cancelToken
Content-Type: application/json

{
  "reason": "Customer changed mind"
}
```

Success response:

```json
{
  "orderId": "uuid",
  "status": "CANCELLED",
  "refund": {
    "refundStatus": "MANUAL_REQUIRED",
    "refundMethod": "MANUAL_BANK_TRANSFER",
    "refundAmount": 132000
  }
}
```

Business errors:

- `404`: token invalid.
- `409`: order already approved/rejected/cancelled.
- `400`: missing or invalid request body.

## Payment Success Integration Flow

1. Customer presses **I have paid**.
2. Frontend calls `POST /api/payment/pay-order/:orderId/confirm`.
3. Backend calls VietQR test callback.
4. VietQR calls `POST /vqr/bank/api/transaction-sync`.
5. `TransactionSyncController` validates the callback.
6. Backend saves `PaymentTransaction`.
7. Backend updates `Order.status` to `PENDING_PROCESSING`.
8. Backend sends payment success notification:
   - Invoice.
   - Shipping info.
   - Payment transaction info.
   - View order link.
   - Cancel order link.
9. Backend records `receiptEmailSentAt` on `PaymentTransaction`.
10. If email fails, backend records `receiptEmailError` and still returns success to VietQR.

## Customer View/Cancel Flow

### View Flow

1. Customer opens view link from email.
2. Angular route reads `viewToken`.
3. Frontend calls `GET /api/customer/orders/view/:viewToken`.
4. Backend validates token.
5. Backend returns order, invoice, shipping, payment transaction, and `canCancel`.
6. Frontend renders details and optionally shows **Cancel order**.

### Cancel Flow

1. Customer opens cancel link or presses **Cancel order** from the order details page.
2. Angular route reads `cancelToken`.
3. Frontend displays confirmation.
4. Customer confirms cancellation.
5. Frontend calls `POST /api/customer/orders/cancel/:cancelToken`.
6. Backend validates token and order status.
7. Backend updates order to `CANCELLED`.
8. Backend creates refund tracking record.
9. Backend sends order cancelled notification.
10. Frontend shows cancellation result.

## Frontend Implementation Plan

### Routes

Update `frontend/src/app/app.routes.ts`:

```ts
{ path: 'orders/view/:viewToken', component: CustomerOrderDetailsScreen },
{ path: 'orders/cancel/:cancelToken', component: CancelOrderScreen },
```

### Service Methods

Update `frontend/src/app/services/order.service.ts`:

```ts
getCustomerOrderByToken(viewToken: string)
cancelCustomerOrder(cancelToken: string, reason?: string)
```

### Screens

Add:

```text
frontend/src/app/boundaries/customer-order-details-screen/
frontend/src/app/boundaries/cancel-order-screen/
```

Customer order details screen:

- Order status.
- Delivery information.
- Invoice breakdown.
- Payment transaction summary.
- Cancel button when `canCancel=true`.

Cancel order screen:

- Summary of the order.
- Confirmation action.
- Success/error state.

## Idempotency and Failure Handling

### Duplicate Transaction Sync

VietQR may send callback more than once.

Mitigation:

- Add unique constraint or query check by order + transaction reference.
- If transaction already exists and email was sent, do not send again.
- If transaction exists but email failed before, retry email.

### Email Failure

Payment success must not depend on SMTP success.

Behavior:

- Log error.
- Store error on `PaymentTransaction`.
- Return HTTP success to VietQR if payment persistence succeeded.
- Optionally retry later using a queue.

### Cancellation Race Conditions

Order approval and customer cancellation could happen close together.

Mitigation:

- Re-read order inside cancellation operation.
- Only update if current status is cancellable.
- Prefer a database transaction around:
  - status check,
  - order update,
  - refund record creation.

## Security Considerations

- Tokens must be long, random, and unguessable.
- Tokens should not expose order ID directly.
- Do not allow order lookup by raw `orderId` for public customer pages.
- Prefer storing token hashes instead of raw tokens.
- Never log full tokens.
- Cancel operation should require explicit customer confirmation.
- Public APIs should return generic errors for invalid tokens.

## Testing Plan

### Backend Unit Tests

- Payment success calls notification service once.
- Payment success email contains invoice and transaction details.
- Duplicate callback does not send duplicate email.
- Email failure does not fail payment callback.
- View token returns full order details.
- Invalid view token returns 404.
- Cancel token cancels `PENDING_PROCESSING` order.
- Approved order cannot be cancelled.
- Cancelled order cannot be cancelled again.
- VietQR cancellation creates `MANUAL_REQUIRED` refund transaction.

### Frontend Unit Tests

- Order details page loads by token.
- Cancel button appears only when `canCancel=true`.
- Cancel confirmation calls backend.
- Error message appears when order cannot be cancelled.

### Manual Test Flow

1. Place order.
2. Generate VietQR QR code.
3. Press **I have paid**.
4. Confirm transaction sync created payment transaction.
5. Confirm email/log contains view and cancel links.
6. Open view link.
7. Verify invoice, shipping info, and transaction info.
8. Cancel before approval.
9. Verify order becomes `CANCELLED`.
10. Verify refund tracking is `MANUAL_REQUIRED` for VietQR.

## Suggested Implementation Order

1. Add order tokens and cancellation fields.
2. Generate tokens when placing an order.
3. Add customer order view API.
4. Add customer order cancel API.
5. Add refund tracking for VietQR manual refund.
6. Add notification abstraction and email implementation.
7. Replace `simulateSendEmail(...)` in transaction sync.
8. Add frontend customer order details screen.
9. Add frontend cancel order screen.
10. Add tests for backend and frontend.

## Open Questions

- Should order view and cancel use separate tokens or one token with different permissions?
- Should tokens expire after a certain time?
- Should cancellation require customer email confirmation or only the link?
- Should a cancelled VietQR order notify an admin/product manager immediately?
- Should the email include a PDF invoice attachment, or is HTML invoice content enough for the first version?
- Should `PENDING` orders be cancellable before payment, or only `PENDING_PROCESSING` paid orders?

## First-Version Scope Recommendation

For the next implementation phase, keep the scope focused:

- Use email only.
- Use Nodemailer SMTP directly, no queue yet.
- Use token-protected public links.
- Use HTML/text email content, no PDF attachment.
- Support VietQR manual refund tracking.
- Ensure email failure does not break payment success.

This gives the project the full required business behavior while keeping the implementation small enough to fit the current NestJS and Angular architecture.
