---
created: 2026-06-26
project: AIMS_Programming
purpose: "One-shot execution plan for customer catalog/cart remediation"
primary_execution_skill: bmad-quick-dev
source_plan: _bmad-output/implementation-artifacts/customer-catalog-cart-remediation-sprint-plan.md
status: ready-for-one-shot-dev
---

# Customer Catalog and Cart One-Shot Execution Plan

## Execution Intent

Use this document when the implementer should repair the full customer-facing catalog and cart workflow in one continuous development pass, instead of running the full BMad story-by-story cycle.

This is intentionally more directive than the sprint plan. The implementer must preserve existing architecture, avoid unrelated refactors, and stop only for a real blocker.

## Scope Lock

Implement only the missing or incorrect behavior for:

1. Public customer product browsing, searching, filtering, and pagination.
2. Product detail viewing with general and type-specific product data.
3. Quantity-aware add-to-cart from product list and product detail screens.
4. Cart stock refresh and shortage warning that displays quantity lacking.
5. Focused backend/frontend tests and build verification.

Do not change:

- Staff authentication, admin screens, product manager CRUD, payment, invoice, delivery fee rules, order fulfillment, refund, or notification flows unless a compile error directly requires a local compatibility adjustment.
- Database schema unless the existing product/cart data model cannot represent the required behavior.

## Required Source of Truth

Before editing code, read:

- `project-context.md`
- `Context/AIMS-ProblemStatement-ver3.1.1.md`
- `_bmad-output/implementation-artifacts/customer-catalog-cart-remediation-sprint-plan.md`
- Existing frontend files under `frontend/src/app/boundaries/product-list`, `product-item`, `search-bar`, `cart-screen`
- Existing frontend services/models: `frontend/src/app/services/product.service.ts`, `frontend/src/app/services/cart.service.ts`, `frontend/src/app/models/product.model.ts`, `frontend/src/app/models/cart.model.ts`
- Existing backend product files: `backend/src/product/product.controller.ts`, `backend/src/product/product.service.ts`, `backend/src/product/dto/search-products.dto.ts`, `backend/src/product/entities/product.entity.ts`

## Phase 1: Repair Product Search and Filtering

Goal: make all active search/filter interactions use paginated `GET /api/products` and align category behavior with the persisted `product.category` field.

Implementation requirements:

- In `frontend/src/app/boundaries/search-bar/search-bar.ts` and `.html`, replace the current product-type category checkboxes with controls that search/filter actual product categories, or add a clearly separate `productType` filter if keeping media-type filtering is necessary.
- Add price bucket controls for:
  - under 100000 VND
  - 100000-200000 VND
  - 200000-300000 VND
  - 300000-400000 VND
  - 400000 VND and above
- Preserve manual min/max behavior only if it does not conflict with the bucket controls.
- In `frontend/src/app/boundaries/product-list/product-list.ts`, remove the category-only branch that calls `loadRandomProducts(category)`.
- Ensure search, category, price filter, and pagination all call `ProductService.searchProducts`.
- Ensure clearing all filters returns to the homepage random-products state.
- In backend search code, keep public reads unauthenticated and limited to `ACTIVE` products.
- If multi-category support is kept, backend must support it explicitly with `IN (:...categories)` rather than exact-matching a comma-joined string.

Acceptance checks:

- Homepage still loads 20 random active products.
- Search by title returns paginated matching active products.
- Search/filter by actual category returns paginated matching active products.
- Price bucket filters send correct min/max values.
- Pagination keeps the active filters.

## Phase 2: Add Product Detail Flow

Goal: allow customers to select a product and view all general and type-specific information without login.

Implementation requirements:

- Add public backend endpoint `GET /api/products/:productId`.
- Endpoint must return only active products and include subtype relations.
- Add `ProductService.getProductById(productId)` in Angular.
- Add route `products/:productId` in `frontend/src/app/app.routes.ts`.
- Add standalone boundary component directory:
  - `frontend/src/app/boundaries/product-detail-screen/product-detail-screen.ts`
  - `frontend/src/app/boundaries/product-detail-screen/product-detail-screen.html`
  - `frontend/src/app/boundaries/product-detail-screen/product-detail-screen.css`
  - `frontend/src/app/boundaries/product-detail-screen/product-detail-screen.spec.ts`
- Make product cards navigate to detail when selected, while the add-to-cart button still stops propagation.
- Detail screen must display:
  - General fields: title, category, general description, dimensions, weight, barcode, original value, current price, stock quantity.
  - Book fields: authors, cover type, publisher, publication date, optional number of pages, language, genre.
  - Newspaper fields: editor-in-chief, publisher, publication date, optional issue number, publication frequency, ISSN, language, sections.
  - CD fields: artists, record label, tracks list with title and length, genre, optional release date.
  - DVD fields: disc type, director, runtime, studio, language, subtitles, optional release date, genre.
- Detail screen must show a safe not-found/unavailable state for missing or inactive products.

Acceptance checks:

- Clicking a product opens `/products/:productId`.
- Public backend detail lookup does not require JWT.
- Each product type renders its matching subtype fields.

## Phase 3: Quantity-Aware Add to Cart

Goal: customers can add explicit quantities from product cards and product detail.

Implementation requirements:

- Add stable quantity controls to product cards.
- Add matching quantity controls to the product detail screen.
- Reject zero, negative, null, or non-numeric quantities with an inline warning.
- When adding the same product repeatedly, combine quantities.
- Do not silently hide an over-stock request by capping without warning.
- Choose one consistent behavior for over-stock add:
  - Preferred: allow the requested quantity into the cart, then cart shortage logic displays requested, available, and lacking.
  - Acceptable alternative: block add and display the exact lacking quantity immediately.
- Preserve cart state in localStorage.

Acceptance checks:

- Adding quantity `3` from list creates or updates a cart item with quantity `3`.
- Adding quantity `2` again for the same product results in quantity `5`.
- Out-of-stock products cannot be added without a clear warning.
- Product detail add-to-cart works the same as list add-to-cart.

## Phase 4: Compliant Cart Stock Warning

Goal: when viewing cart, customers see exact stock shortages based on current backend stock.

Implementation requirements:

- On cart screen initialization, refresh product snapshots from backend.
- Prefer reusing `GET /api/products/:productId` unless a small batch endpoint is cleaner and tested.
- Update `Cart` / `CartService` so requested quantity is preserved.
- Replace `insufficientStockItem[productId] = stockQuantity` with a typed structure containing:
  - productId
  - title
  - requested
  - available
  - lacking
- Warning text must display quantity lacking, not only available stock.
- Recalculate subtotal excluding VAT and total weight after any quantity change or product snapshot refresh.
- Removing an item removes its warning.
- Block navigation to delivery when unresolved shortages exist.

Acceptance checks:

- If requested `5` and available `3`, cart warning displays lacking `2`.
- If backend stock changed after localStorage save, cart uses current backend stock.
- Cart subtotal excluding VAT remains based on current price and requested quantity.
- Customer cannot proceed to delivery while shortages remain.

## Phase 5: Tests and Verification

Add or update focused tests:

- Backend product service/controller:
  - random products active-only
  - search by title
  - search by actual category
  - price range/bucket min/max
  - combined filters
  - public product detail success
  - missing/inactive product detail rejection
- Frontend:
  - search bar emits correct params
  - product list preserves filters across pagination
  - product detail renders general and subtype fields
  - product item quantity add-to-cart
  - cart model/service preserves requested quantity
  - cart screen refreshes stock and displays lacking quantity
  - cart blocks delivery with unresolved shortages

Run verification from the relevant directories:

```powershell
cd backend
npm test -- product
npm run build
cd ../frontend
npm test -- --run
npm run build
```

If the frontend test command is incompatible with the current Angular/Vitest setup, inspect existing test conventions and run the closest supported focused command. Always report exactly what ran and what failed.

## Definition of Done

- Customer catalog and cart behavior satisfies the quoted Problem Statement requirement.
- Public customer browse/search/detail/cart paths do not require staff login.
- Product detail exists and renders type-specific data.
- Search/filter is aligned with actual stored categories and price buckets.
- Add-to-cart supports explicit quantities from list and detail.
- Cart displays exact lacking quantity for insufficient stock.
- Cart blocks delivery while shortages remain.
- All affected tests pass or any remaining failures are documented with concrete blocker details.
- Frontend and backend builds pass, unless an existing unrelated build failure is clearly identified.

## One-Shot Prompt To Execute

Use this exact prompt in a fresh context window when you want implementation to begin:

```text
bmad-quick-dev. Execute the full customer catalog/cart remediation sprint in one continuous pass using _bmad-output/implementation-artifacts/customer-catalog-cart-one-shot-execution-plan.md as the execution contract.

Treat Context/AIMS-ProblemStatement-ver3.1.1.md as the highest source of truth and preserve the existing BCE architecture. Implement Phases 1-5 in order: repair product search/filter semantics, add public product detail flow, add quantity-aware add-to-cart from list and detail, make cart stock shortage warnings display exact lacking quantity from current backend stock, and add focused tests/build verification.

Do not modify staff auth, admin, product-manager CRUD, payment, delivery, invoice, order fulfillment, refund, or notification flows unless required by a direct compile/test compatibility issue. Do not silently cap cart quantities in a way that hides shortages. Keep changes scoped, update or add tests beside affected files, run the verification commands from the plan, and finish with a concise implementation summary listing changed files, tests run, and any remaining risk.
```

## Safer Alternative Prompt

Use this if you want stricter BMad gates instead of one-shot implementation:

```text
bmad-create-story. Create story R1.1 from _bmad-output/implementation-artifacts/customer-catalog-cart-one-shot-execution-plan.md, then stop for my review.
```

After R1.1 is done and reviewed, repeat for R1.2 through R1.5.

