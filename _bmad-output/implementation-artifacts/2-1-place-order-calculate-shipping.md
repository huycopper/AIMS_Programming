---
baseline_commit: 72519dacdb8a54e20bd52cd1405ecf08a22e2d94
---
# Story 2.1: Place Order & Calculate Shipping

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Customer,
I want to submit delivery details and view my invoice,
So that I can see the final cost break-down including shipping before payment.

## Acceptance Criteria

1. **Given** the customer has items in the cart
   **When** they click "Place Order"
   **Then** the system checks if available stock is sufficient. If insufficient, it prompts to update the cart and shows available quantities; if sufficient, it prompts them to enter delivery information (FR5)

2. **Given** the customer is on the delivery form
   **When** they change their province or address
   **Then** the system calculates the shipping fee dynamically: Hanoi/HCM (first 3kg = 22,000 VND), elsewhere (first 0.5kg = 30,000 VND), with an additional fee of 2,500 VND for every subsequent 0.5kg, and applies up to 25,000 VND discount if total is > 100,000 VND (FR6, UX-DR3)

3. **Given** the customer submits valid delivery info
   **When** the invoice loads
   **Then** it displays the list of products in the cart, quantity, product prices, total product price excluding VAT (subtotal), 10% VAT, shipping fee, and total amount to pay (FR7, UX-DR4)

4. **Given** an order is successfully placed and its items are sold
   **When** the transaction is completed
   **Then** the quantity in stock of each purchased product is automatically updated (decreased)

## Tasks / Subtasks

- [x] Task 1: Backend API for Shipping & Order Management (NestJS)
  - [x] Subtask 1.1: Create `PlaceOrderController` and `OrderService` for handling Place Order flows.
  - [x] Subtask 1.2: Implement `calculateShippingFee(deliveryInfo, cart)` endpoint in backend taking into account weights and provinces (Hanoi/HCM vs others).
  - [x] Subtask 1.3: Define Entity models for `Order`, `Invoice`, `DeliveryInfo` on the backend using TypeORM to connect to PostgreSQL.
- [x] Task 2: Frontend UI & State Implementation (Angular)
  - [x] Subtask 2.1: Create `DeliveryInfoScreen` boundary component (Delivery form) allowing customers to enter Name, Phone, Email, Province, Address, Note.
  - [x] Subtask 2.2: Integrate the form to trigger shipping fee recalculation in real-time by calling the backend endpoint on province/address change.
  - [x] Subtask 2.3: Create `InvoiceScreen` boundary component to display full invoice breakdown (List of products, quantities, prices, Subtotal, 10% VAT, Shipping fee, Total) as specified in UX-DR4.
  - [x] Subtask 2.4: Update routing to navigate from `CartScreen` -> `DeliveryInfoScreen` -> `InvoiceScreen`.

## Dev Notes

- **Business Rules Compliance:**
  - Before proceeding to delivery form, the system MUST verify that requested quantities do not exceed available stock.
  - The quantity in stock of a product MUST be automatically updated whenever its items are sold.
- **Architecture Compliance:**
  - `PlaceOrderController` handles the orchestration.
  - Shipping fee logic MUST strictly adhere to the business rules:
    - Hanoi/HCM: Base 22,000 VND for first 3kg.
    - Other provinces: Base 30,000 VND for first 0.5kg.
    - Additional fee: 2,500 VND for every subsequent 0.5kg.
    - Discount: Up to 25,000 VND if the cart total > 100,000 VND.
  - The calculation should ideally be implemented securely on the Backend and called by the Frontend.
  - Ensure UI forms apply real-time updates and properly handle loading states (`isLoading`).
- **Constraints:**
  - Delivery Info validations: Phone number format, email format, required fields (Name, Province, Address, Phone, Email).
- **Previous Story Intelligence (Story 1.2):**
  - Frontend uses Angular 21 with TailwindCSS v4.
  - Cart state is already managed in `CartService`.
  - Use `CartService` to retrieve items and weights for shipping calculation.
- **Git Intelligence & Project Pattern:**
  - Make sure backend code is put under `backend/src/` and frontend under `frontend/src/app/`.
  - Ensure entity mappings align with `DatabaseDescription.md`.

### Project Structure Notes

- **Backend Paths:**
  - Controllers/Services: `backend/src/order/` or `backend/src/place-order/`
  - Entities: `backend/src/entities/`
- **Frontend Paths:**
  - Components: `frontend/src/app/boundaries/delivery-info-screen/`, `frontend/src/app/boundaries/invoice-screen/`
  - Services: `frontend/src/app/services/order.service.ts`

### References

- [Source: Context/TEAM-20SoftwareRequirementSpecification-Ver1.2.md]
- [Source: Context/Group20-ClassDesignSpecification.md]
- [Source: Context/ScreenSpecifications.md]
- [Source: _bmad-output/planning-artifacts/epics.md]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (Thinking)

### Debug Log References

- Pre-existing test failure in `product.service.spec.ts`: category filter test expects old query format. Not related to this story.
- Pre-existing test failure in `app.spec.ts`: "should render title" expects h1 with "Hello, frontend" but the app template only has `<router-outlet>`. Not related to this story.
- Fixed pre-existing TypeScript narrowing issue in `cart.service.spec.ts` where `cartState` was inferred as `never`.

### Completion Notes List

- ✅ Task 1.1: Created `PlaceOrderController` (Boundary) and `OrderService` (Control) following BCE pattern in `backend/src/order/`
- ✅ Task 1.2: Implemented `calculateShippingFee()` with full business rules — Hanoi/HCM base 22,000 VND (first 3kg), other provinces base 30,000 VND (first 0.5kg), additional 2,500 VND per 0.5kg, discount up to 25,000 VND when subtotal > 100,000 VND. 31 unit tests all pass.
- ✅ Task 1.3: Created TypeORM entities for `Order`, `OrderItem`, `DeliveryInfo` with proper column mappings and relationships, registered in OrderModule with TypeORM.
- ✅ Task 2.1: Created `DeliveryInfoScreen` with form fields (Name, Phone, Email, Province dropdown, Address, Note), validation, and shipping fee preview panel. 15 unit tests all pass.
- ✅ Task 2.2: Integrated debounced shipping fee recalculation — calls backend `POST /api/orders/calculate-shipping` on province/address change with 300ms debounce.
- ✅ Task 2.3: Created `InvoiceScreen` displaying full invoice breakdown: product list table, subtotal, 10% VAT, shipping fee, discount, and total amount. 6 unit tests all pass.
- ✅ Task 2.4: Updated routing: CartScreen → DeliveryInfoScreen (`/delivery`) → InvoiceScreen (`/invoice`). Wired CartScreen's `askToPlaceOrder()` to navigate to `/delivery`. 1 new navigation test added.

### Change Log

- 2026-05-31: Updated constraints and implementation to make Email field mandatory across UI, frontend models, backend DTOs, and database entities.
- 2026-05-29: Implemented Story 2.1 — Place Order & Calculate Shipping. Backend order module with shipping fee calculation API, frontend delivery form and invoice display with full navigation flow.

### File List

**New files:**
- `backend/src/order/order.module.ts` — OrderModule registration
- `backend/src/order/order.controller.ts` — PlaceOrderController (Boundary)
- `backend/src/order/order.service.ts` — OrderService (Control) with shipping fee logic
- `backend/src/order/dto/calculate-shipping.dto.ts` — DTOs for shipping calculation and order placement
- `backend/src/order/entities/order.entity.ts` — Order, OrderItem, DeliveryInfo entities
- `backend/src/order/order.service.spec.ts` — 24 unit tests for OrderService
- `backend/src/order/order.controller.spec.ts` — 7 unit tests for PlaceOrderController
- `frontend/src/app/models/order.model.ts` — Order-related TypeScript interfaces
- `frontend/src/app/services/order.service.ts` — Frontend OrderService for API calls
- `frontend/src/app/boundaries/delivery-info-screen/delivery-info-screen.ts` — DeliveryInfoScreen component
- `frontend/src/app/boundaries/delivery-info-screen/delivery-info-screen.html` — Delivery form template
- `frontend/src/app/boundaries/delivery-info-screen/delivery-info-screen.css` — Delivery form styles
- `frontend/src/app/boundaries/delivery-info-screen/delivery-info-screen.spec.ts` — 15 unit tests
- `frontend/src/app/boundaries/invoice-screen/invoice-screen.ts` — InvoiceScreen component
- `frontend/src/app/boundaries/invoice-screen/invoice-screen.html` — Invoice display template
- `frontend/src/app/boundaries/invoice-screen/invoice-screen.css` — Invoice styles
- `frontend/src/app/boundaries/invoice-screen/invoice-screen.spec.ts` — 6 unit tests

**Modified files:**
- `backend/src/app.module.ts` — Added OrderModule import
- `frontend/src/app/app.routes.ts` — Added /delivery and /invoice routes
- `frontend/src/app/boundaries/cart-screen/cart-screen.ts` — Wired askToPlaceOrder() to navigate to /delivery
- `frontend/src/app/boundaries/cart-screen/cart-screen.spec.ts` — Added Router mock and navigation test
- `frontend/src/app/services/cart.service.spec.ts` — Fixed pre-existing TypeScript type narrowing issue
