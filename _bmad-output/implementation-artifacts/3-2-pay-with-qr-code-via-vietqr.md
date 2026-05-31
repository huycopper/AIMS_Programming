# Story 3.2: Pay with QR Code via VietQR

**Epic:** Epic 3: Payment Processing Integration
**Story ID:** 3.2
**Status:** ready-for-dev

## Story Requirements

**User Story:**
As a Customer,
I want to pay for my order by scanning a VietQR code,
So that I can pay easily from my mobile banking app.

**Acceptance Criteria:**
- **Given** the customer is on the invoice screen and selects VietQR
- **When** they request payment
- **Then** the system fetches a VietQR access token and generates a QR code image to display with a waiting spinner (FR8, UX-DR5)

- **Given** the QR code is displayed
- **When** the banking system sends a payment callback to AIMS
- **Then** the system validates the callback, records the transaction, updates the order status to `PENDING_PROCESSING`, empties the cart, and displays the success screen (FR8, UX-DR6)

## Developer Context

This story implements VietQR payment integration. The implementation must follow the BCE architecture and handle the async nature of a webhook/callback payment. The UI will display a generated QR code and wait for payment confirmation via polling or a socket connection (or simply a "waiting" state).

## Technical Requirements & Architecture Compliance

**BCE Class Mapping (Must adhere strictly):**
- **Boundary:** `InvoiceScreen` (select method), `VietQRPaymentScreen` (UI), `VietQRBoundary` (System Interface)
- **Control:** `PayOrderController`, `PayThroughVietQRController`
- **Entity:** `Order`, `Invoice`, `PaymentTransaction`

**Key Operations to Implement/Modify:**
- `VietQRBoundary.getAccessToken()`, `generateQRCode()`, `verifyPaymentCallback()`
- `PayThroughVietQRController.processPayment(invoice)`, `requestAccessToken()`, `generateQRCode()`, `handleCallback()`, `createPaymentTransaction()`
- `InvoiceScreen` allows selecting VietQR, and transitions to a waiting screen with the QR code.

## File Structure Requirements

- **Frontend (Angular):** Add/update `VietQRPaymentScreen` component to display the generated QR code and a loading spinner. Need a mechanism to poll or listen for payment success, then navigate to `SuccessfulScreen`.
- **Backend (NestJS):** Implement `PayThroughVietQRController` service, `VietQRBoundary` service for calling VietQR APIs and handling their webhook. Define a webhook endpoint for VietQR to POST to. Update `PaymentTransaction` handling.
- **Database:** Ensure `PaymentTransaction` stores VietQR transaction reference IDs securely.

## Library & Framework Requirements

- Use Node's built-in `fetch` or `axios`/`@nestjs/axios` for calling VietQR APIs.
- Angular components for the QR Code display and spinner.

## Testing Requirements

- Unit test the `PayThroughVietQRController` logic.
- Mock `VietQRBoundary` in tests to simulate QR generation and payment callback webhook handling.

## Latest Technical Information (VietQR API)

For VietQR:
- Generating QR typically uses VietQR or Napas APIs. The payload usually includes bank account number, bank code, amount, and order description.
- Implement a public webhook URL to receive the callback from the banking system or a payment gateway that supports VietQR, confirming the transaction. The endpoint must handle verification of the request's authenticity.

## Project Context Reference

As stated in `project-context.md`, `Context/AIMS-ProblemStatement-ver3.1.1.md` is the ultimate source of truth. The application architecture must map strictly to the BCE classes defined in `Group20-ClassDesignSpecification.md` and the DB schema in `DatabaseDescription.md`.

## Tasks/Subtasks

- [x] Task 1: Create VietQRPaymentScreen UI and configure navigation from InvoiceScreen
  - [x] Implement the screen to display the generated QR Code and a waiting spinner
  - [x] Update `InvoiceScreen` to allow selection of VietQR
  - [x] Implement a polling/listening mechanism to wait for backend confirmation
  - [x] Navigate to `SuccessfulScreen` upon successful confirmation
- [x] Task 2: Implement VietQRBoundary in the backend
  - [x] Implement `getAccessToken()` or equivalent auth API call
  - [x] Implement `generateQRCode()` API call to VietQR/Napas
  - [x] Implement webhook payload verification
- [x] Task 3: Implement PayThroughVietQRController
  - [x] Create service `processPayment(invoice)` to initiate payment and fetch QR code
  - [x] Create `handleCallback(payload)` to process the webhook notification
  - [x] Implement `createPaymentTransaction()` and update `Order` status
- [x] Task 4: Expose Webhook Endpoint
  - [x] Create route/controller for receiving VietQR callback
  - [x] Wire endpoint to `handleCallback()`
- [ ] Task 5: Testing
  - [x] Write unit tests for `PayThroughVietQRController`
  - [x] Write tests mocking `VietQRBoundary`
  - [ ] Perform E2E manual test with mocked frontend to backend to VietQR flow

## Dev Agent Record

### Debug Log
- N/A

### Completion Notes
- N/A

## File List
- N/A

## Change Log
- **[2026-05-31]** - Created VietQRPaymentScreen UI and configured navigation.
- **[2026-05-31]** - Implemented SuccessfulScreen component.
- **[2026-05-31]** - Created PayThroughVietQrService, VietQrService, and OrderService createOrder.
- **[2026-05-31]** - Implemented process-payment endpoint and webhook handleCallback.
- **[2026-05-31]** - Mocked and tested backend controllers and services.

## Previous Story Intelligence

- Review `3-1-pay-with-credit-card-via-paypal.md` for payment flow setup and `PaymentTransaction` entity structure. The overall integration into `InvoiceScreen` and navigating to `SuccessfulScreen` should follow similar patterns.

## Story Completion Status

Ultimate context engine analysis completed - comprehensive developer guide created.
Status set to `ready-for-dev`.
