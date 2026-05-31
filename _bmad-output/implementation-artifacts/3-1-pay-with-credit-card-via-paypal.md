# Story 3.1: Pay with Credit Card via PayPal

**Epic:** Epic 3: Payment Processing Integration
**Story ID:** 3.1
**Status:** ready-for-dev

## Story Requirements

**User Story:**
As a Customer,
I want to pay for my order securely using my credit card via PayPal,
So that my payment is captured instantly and my order is placed.

**Acceptance Criteria:**
- **Given** the customer is on the invoice screen and chooses Credit Card
- **When** they enter credit card details and confirm payment
- **Then** the system processes the capture synchronously with PayPal Sandbox API (FR9)
- **And** updates the order status to `PENDING_PROCESSING`, records the payment transaction in the DB, empties the cart, and displays the success screen showing transaction details (FR9, UX-DR6)

## Developer Context

This story implements the PayPal Sandbox REST API v2 for credit card payments. The implementation must follow the BCE architecture and ensure transaction integrity if the payment fails (NFR6). The UI will display a card form for the user to input details.

## Technical Requirements & Architecture Compliance

**BCE Class Mapping (Must adhere strictly):**
- **Boundary:** `InvoiceScreen` (select method), `CreditCardPaymentForm` (UI), `PayPalBoundary` (System Interface)
- **Control:** `PayOrderController`, `PayThroughCreditCardController`
- **Entity:** `Order`, `Invoice`, `CreditCard`, `PaymentTransaction`

**Key Operations to Implement/Modify:**
- `PayPalBoundary.getAccessToken()`, `processPayment()`, `refundPayment()`
- `PayThroughCreditCardController.processPayment(cardInfo, invoice)`, `validateCardInfo(card)`, `requestAccessToken()`, `sendPaymentRequest()`, `createPaymentTransaction()`
- `InvoiceScreen` must allow selecting between VietQR (default) and PayPal, then display `CreditCardPaymentForm`.

## File Structure Requirements

- **Frontend (Angular):** Add/update `CreditCardPaymentForm` component. Integrate into `InvoiceScreen`. Updates to routing to navigate to `SuccessfulScreen` after payment.
- **Backend (NestJS):** Implement `PayThroughCreditCardController` service, `PayPalBoundary` service for calling PayPal REST API. Define DTOs/Entities for `CreditCard` and `PaymentTransaction`.
- **Database:** Ensure `PaymentTransaction` fields (`paypalOrderId`, `cardLastFour`) are saved to PostgreSQL via TypeORM correctly.

## Library & Framework Requirements

- Use Node's built-in `fetch` or `axios`/`@nestjs/axios` for calling PayPal APIs.
- Angular Reactive Forms for the credit card inputs.

## Testing Requirements

- Unit test the `PayThroughCreditCardController` logic.
- Mock `PayPalBoundary` in tests to simulate successful and failed captures.

## Latest Technical Information (PayPal Sandbox API v2)

For PayPal Orders v2 API:
- Create Order endpoint: `POST https://api-m.sandbox.paypal.com/v2/checkout/orders` with `"intent": "CAPTURE"`.
- Use a Server-Side Only integration for these API calls to protect credentials.
- Capture Payment endpoint: `POST https://api-m.sandbox.paypal.com/v2/checkout/orders/{order_id}/capture`.
- Ensure appropriate headers: `Content-Type: application/json` and `Authorization: Bearer <ACCESS_TOKEN>`.

## Project Context Reference

As stated in `project-context.md`, `Context/AIMS-ProblemStatement-ver3.1.1.md` is the ultimate source of truth. The application architecture must map strictly to the BCE classes defined in `Group20-ClassDesignSpecification.md` and the DB schema in `DatabaseDescription.md`.

## Story Completion Status

Ultimate context engine analysis completed - comprehensive developer guide created.
Status set to `ready-for-dev`.
