---
baseline_commit: NO_VCS
---
# Story 1.2: Add and Manage Cart Items

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Customer,
I want to add products to my cart and modify their quantities,
so that I can prepare my purchase.

## Acceptance Criteria

1. **Given** the customer is viewing a product page or listing
   **When** they enter a quantity and click "Add to Cart"
   **Then** the system validates stock availability, adds the item, and updates the cart (FR3)
   **And** displays an inline error banner if the requested quantity exceeds stock (UX-DR2)

2. **Given** the customer is viewing the Cart screen
   **When** they update item quantities or remove items
   **Then** the system recalculates the subtotal (excluding VAT) and total weight dynamically (FR4, UX-DR2)

## Tasks / Subtasks

- [x] Task 1: Cart State Management (Frontend)
  - [x] Subtask 1.1: Create `Cart` and `CartItem` models in Angular according to the class design spec.
  - [x] Subtask 1.2: Implement `CartService` to manage cart state (preferably with `localStorage`), add/remove items, update quantity, and calculate subtotal/weight.
- [x] Task 2: UI Implementation (Frontend)
  - [x] Subtask 2.1: Create `CartScreen` component (Boundary) to display the cart list, subtotal, and total weight.
  - [x] Subtask 2.2: Implement inline error banners for insufficient stock when updating quantities, ensuring the banner displays the exact lacking/remaining quantity (e.g., "Only 3 items left in stock") as per UX-DR2.
  - [x] Subtask 2.3: Add "Add to Cart" functionality to `ProductItemComponent` and `ProductListComponent` integrating with `CartService`.

## Dev Notes

- **Architecture Compliance:**
  - `Cart` and `CartItem` are defined in `Group20-ClassDesignSpecification.md` as entity classes. Since there is no database representation in `DatabaseDescription.md`, implement these as Frontend Models and State (e.g. Angular service).
  - Cart UI (`CartScreen` boundary) needs to display `totalExclVAT`, `isLoading` (if any async calls), and `insufficientStockItem` warnings.
- **Constraints:**
  - `CartItem` quantity must be > 0.
  - `CartItem` quantity must be <= `Product.stockQuantity`.
- **Previous Story Intelligence (Story 1.1):**
  - Frontend uses Angular 21 with TailwindCSS v4.
  - UI components belong in `src/app/boundaries/`.
  - Models belong in `src/app/models/`.
  - `Product` entity has `currentPrice`, `weight`, `stockQuantity`. Use these fields for calculations.
  - SEO best practices applied in previous story (index.html), continue keeping good semantic HTML.

### Project Structure Notes

- **Frontend Paths:**
  - Models: `frontend/src/app/models/cart.model.ts`
  - Services: `frontend/src/app/services/cart.service.ts`
  - Boundaries: `frontend/src/app/boundaries/cart-screen/`

### References

- [Source: Context/Group20-ClassDesignSpecification.md#1.1 CartScreen]
- [Source: Context/Group20-ClassDesignSpecification.md#3.1 CartItem]
- [Source: Context/Group20-ClassDesignSpecification.md#3.2 Cart]
- [Source: _bmad-output/planning-artifacts/epics.md]

## Dev Agent Record

### Agent Model Used

Gemini 3.1 Pro (High)

### Debug Log References

### Completion Notes List

### File List
