---
created: 2026-06-26
project: AIMS_Programming
source_epic: "Epic 1: Product Catalog & Cart Management"
planning_basis:
  - Context/AIMS-ProblemStatement-ver3.1.1.md
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/implementation-artifacts/1-1-browse-and-search-products.md
  - _bmad-output/implementation-artifacts/1-2-add-and-manage-cart-items.md
  - Code review findings from 2026-06-26 customer browse/cart audit
status: ready-for-dev
---

# Customer Catalog and Cart Remediation Sprint Plan

## Sprint Goal

Bring the customer-facing product catalog and cart flow back into compliance with the AIMS Problem Statement for unauthenticated browsing, product search/filtering, product detail viewing, add-to-cart quantities, and cart stock shortage warnings.

## Source Requirement

For customers, no login is required. When starting the software, a list of 20 random products will be displayed. To search for products, customers use product title or category to search. The software will display all related products on each search page. Additionally, customers can filter products by price range, such as under 100,000 VND, 100,000-200,000 VND, 200,000-300,000 VND, and so on. Customers can view all the detailed information of each product when choosing the corresponding product in the list of product screen, depending on the product type. Customers can add products with corresponding quantities to the current cart in the list of product or product detail screen.

When customers ask to view the cart, the software will display cart information, including the total price of products excluding VAT, a list of products with product information (e.g., product name, quantity, price, etc). At the same time, the software will also notify customers if the stock quantity of any product is insufficient and will display the quantity of each product that is lacking. When changing their mind, customers can also remove products from the cart or change the quantity of products in the cart.

## Current Gap Summary

1. Product detail is missing from the customer flow: no frontend route, no product detail boundary, and no public backend endpoint for `GET /api/products/:productId`.
2. Category filtering is inconsistent with stored data. The UI emits product types such as `BOOK`, `CD`, `DVD`, and `NEWSPAPER` through the `category` query field, while persisted categories include values such as `Programming`, `Fiction`, and `Rock`.
3. Category-only filtering calls the random product endpoint, so it does not display all related products with search-page pagination.
4. Multi-category selection emits a comma-joined string while backend filtering performs exact equality on `product.category`.
5. Price filtering is only free-form min/max input and does not expose the required bucket choices such as under 100,000 VND, 100,000-200,000 VND, and 200,000-300,000 VND.
6. Add-to-cart from product listing supports only implicit quantity `1`; product detail add-to-cart is unavailable because product detail is missing.
7. Cart stock warnings are not compliant: cart state caps quantities with `Math.min`, uses stale product snapshots from localStorage, and displays available quantity rather than the quantity lacking.

## Sprint Scope

In scope:

- Customer public product read flow only.
- Product list, search bar, product item, new product detail screen, product service, cart model/service/screen.
- Backend product public read endpoint and search/filter semantics.
- Unit and API tests for the above.

Out of scope:

- Staff authentication, product manager CRUD, payment, delivery, invoice, and order fulfillment.
- Visual redesign beyond the controls required for the missing behavior.
- Changing database schema unless an existing field cannot represent the required behavior.

## Sprint Backlog

### Story R1.1: Repair Customer Search and Filter Semantics

As a Customer,
I want product title, category, and price-range search to return all related products on paginated search pages,
So that I can reliably find products without logging in.

Acceptance criteria:

1. Given the customer opens the application, when the homepage loads, then the system displays 20 random active products without authentication.
2. Given the customer searches by product title, when the search is submitted, then the system returns paginated active products whose title matches the query.
3. Given the customer searches by category, when the search is submitted, then the system returns paginated active products whose `category` matches the query semantics used by stored data.
4. Given the customer selects a price bucket, when the filter is applied, then the system sends the correct `minPrice` and `maxPrice` and displays matching active products.
5. Given the customer combines title/category and price filters, when the search is submitted, then all filters are applied together and pagination preserves them.
6. Given no search or filter is active, when filters are cleared, then the UI returns to the 20 random product homepage state.

Implementation tasks:

- Replace product-type category checkboxes with category search/filter controls that match the persisted `product.category` field, or explicitly introduce a separate `productType` filter if product-type filtering is desired.
- Remove the category-only branch that calls `loadRandomProducts(category)`.
- Ensure all non-empty search/filter interactions use `GET /api/products` with pagination.
- Add fixed price bucket options:
  - under 100000 VND
  - 100000-200000 VND
  - 200000-300000 VND
  - 300000-400000 VND
  - 400000 VND and above
- Preserve `page`, `limit`, search query, category, and price range across pagination.
- Add frontend tests for emitted search params and product-list pagination behavior.
- Add backend tests for title search, category search, price buckets, combined filters, and active-only filtering.

Likely touched files:

- `frontend/src/app/boundaries/search-bar/search-bar.ts`
- `frontend/src/app/boundaries/search-bar/search-bar.html`
- `frontend/src/app/boundaries/product-list/product-list.ts`
- `frontend/src/app/services/product.service.ts`
- `backend/src/product/dto/search-products.dto.ts`
- `backend/src/product/product.service.ts`
- `backend/src/product/product.controller.ts`
- Relevant `*.spec.ts` files

Dependencies:

- None.

Suggested status:

- `ready-for-dev`

### Story R1.2: Add Customer Product Detail Flow

As a Customer,
I want to choose a product from the product list and view all general and type-specific product information,
So that I can decide whether to add it to my cart.

Acceptance criteria:

1. Given a customer selects a product in the product list, when the selection is made, then the application navigates to a product detail screen.
2. Given a customer opens a valid product detail URL, when the screen loads, then the backend returns the active product by `productId` without authentication.
3. Given the product is a book, newspaper, CD, or DVD, when details are displayed, then the screen shows the general product fields and the matching type-specific fields for that product type.
4. Given the product does not exist or is not active, when the detail screen loads, then the customer receives a safe not-found or unavailable state.
5. Given the customer wants to return to the product list, when they use the back action, then they can continue browsing without losing the cart.

Implementation tasks:

- Add public backend endpoint `GET /api/products/:productId` that returns only active products with subtype relations.
- Add `ProductService.getProductById(productId)`.
- Add route `products/:productId`.
- Add `ProductDetailScreen` boundary component.
- Make `ProductItemComponent` navigate to detail when the card or title is selected.
- Keep the add-to-cart button from triggering detail navigation.
- Display subtype fields:
  - Book: authors, cover type, publisher, publication date, optional number of pages, language, genre.
  - Newspaper: editor-in-chief, publisher, publication date, optional issue number, publication frequency, ISSN, language, sections.
  - CD: artists, record label, tracks list with title and length, genre, optional release date.
  - DVD: disc type, director, runtime, studio, language, subtitles, optional release date, genre.
- Add backend controller/service tests and frontend component/service tests.

Likely touched files:

- `backend/src/product/product.controller.ts`
- `backend/src/product/product.service.ts`
- `frontend/src/app/app.routes.ts`
- `frontend/src/app/services/product.service.ts`
- `frontend/src/app/boundaries/product-item/product-item.ts`
- `frontend/src/app/boundaries/product-item/product-item.html`
- New `frontend/src/app/boundaries/product-detail-screen/*`
- Relevant `*.spec.ts` files

Dependencies:

- Can run in parallel with R1.1, but UI polish is easier after R1.1 settles shared product display conventions.

Suggested status:

- `ready-for-dev`

### Story R1.3: Add Quantity-Aware Add to Cart on List and Detail Screens

As a Customer,
I want to add products with the quantities I choose from either the product list or product detail screen,
So that the current cart reflects my intended purchase quantities.

Acceptance criteria:

1. Given the product has stock, when the customer enters a positive quantity and clicks Add to Cart on the product list, then that quantity is added to the current cart.
2. Given the product has stock, when the customer enters a positive quantity and clicks Add to Cart on the product detail screen, then that quantity is added to the current cart.
3. Given the requested quantity exceeds the displayed stock, when the customer attempts to add the item, then the UI shows an inline warning and preserves enough information to tell the customer the shortage.
4. Given the customer adds the same product multiple times, when the cart already contains the product, then the cart reflects the combined requested quantity unless the system explicitly blocks the action with a shortage warning.
5. Given the product is out of stock, when the customer views the list or detail screen, then Add to Cart is disabled or produces a clear unavailable warning.

Implementation tasks:

- Add quantity controls to product cards without causing layout shifts.
- Add quantity controls to product detail screen.
- Decide cart behavior for over-stock requests: preserve requested quantity with shortage metadata, or reject the request and show exact lacking quantity. The cart screen must still be able to display quantity lacking.
- Update `Cart.addItem` so it no longer silently caps requested quantities in a way that hides shortages.
- Add user-facing inline warnings for invalid quantity and insufficient stock.
- Add tests for positive quantity, repeated add, zero/negative quantity, out-of-stock products, and over-stock requested quantity.

Likely touched files:

- `frontend/src/app/models/cart.model.ts`
- `frontend/src/app/services/cart.service.ts`
- `frontend/src/app/boundaries/product-item/product-item.ts`
- `frontend/src/app/boundaries/product-item/product-item.html`
- New `frontend/src/app/boundaries/product-detail-screen/*`
- Relevant `*.spec.ts` files

Dependencies:

- Product detail portion depends on R1.2.
- Product list portion can run after R1.1.

Suggested status:

- `ready-for-dev`

### Story R1.4: Make Cart Stock Shortage Warnings Compliant

As a Customer,
I want the cart screen to tell me exactly which products lack stock and by how many units,
So that I can update the cart before placing an order.

Acceptance criteria:

1. Given the customer views the cart, when any cart item quantity exceeds current stock, then the cart displays a warning for that item.
2. Given a product is short, when the warning is displayed, then it shows the quantity lacking: `requested quantity - available stock`.
3. Given stock has changed after the product was added to cart, when the cart screen opens, then the cart validates against current backend stock rather than relying only on localStorage snapshots.
4. Given the customer changes a quantity, when the quantity is updated, then subtotal excluding VAT and total weight recalculate dynamically.
5. Given the customer removes an item, when the item is removed, then any warning for that product is removed.
6. Given shortages exist, when the customer attempts to proceed to delivery, then the UI blocks or clearly prompts the customer to update the cart before continuing.

Implementation tasks:

- Add a public stock refresh path, either by:
  - reusing `GET /api/products/:productId` per item, or
  - adding a batched public endpoint for active product snapshots by product IDs.
- Refresh cart item product snapshots when `CartScreen` initializes.
- Track requested quantity separately from available quantity.
- Replace `insufficientStockItem[productId] = stockQuantity` with a structure containing requested, available, and lacking quantities.
- Remove silent quantity capping from cart model methods where it prevents shortage reporting.
- Add cart-level shortage summary and item-level shortage warnings.
- Prevent navigation to delivery while unresolved shortages exist.
- Add tests for stale localStorage product stock, insufficient stock, exact lacking quantity, remove/update cleanup, subtotal/weight recalculation, and proceed blocking.

Likely touched files:

- `frontend/src/app/models/cart.model.ts`
- `frontend/src/app/services/cart.service.ts`
- `frontend/src/app/boundaries/cart-screen/cart-screen.ts`
- `frontend/src/app/boundaries/cart-screen/cart-screen.html`
- `frontend/src/app/services/product.service.ts`
- `backend/src/product/product.controller.ts`
- `backend/src/product/product.service.ts`
- Relevant `*.spec.ts` files

Dependencies:

- Depends on R1.2 if using `GET /api/products/:productId`.

Suggested status:

- `ready-for-dev`

### Story R1.5: Acceptance and Regression Test Pass for Customer Catalog and Cart

As a Developer,
I want automated coverage for the repaired customer catalog and cart flow,
So that the team can prove the original Epic 1 acceptance criteria are now satisfied.

Acceptance criteria:

1. Backend tests cover random products, public detail lookup, title search, category search, price range filters, combined filters, active-only visibility, and not-found/unavailable products.
2. Frontend tests cover product list loading, search/filter param emission, pagination preservation, product detail rendering by type, quantity-aware add-to-cart, cart shortage warnings, and blocked checkout with shortages.
3. Existing customer checkout tests continue to pass.
4. The frontend build succeeds.
5. Backend test suite succeeds for affected product/order/cart-related modules.

Implementation tasks:

- Add missing unit tests beside changed frontend components/services/models.
- Add missing backend controller/service tests.
- Run targeted frontend tests.
- Run targeted backend tests.
- Run frontend build.
- Record verification commands and outcomes in the implementing story dev records.

Likely touched files:

- `frontend/src/app/**/*.spec.ts`
- `backend/src/product/*.spec.ts`
- Possibly `backend/test/*.e2e-spec.ts` if an end-to-end path is added.

Dependencies:

- Should close the sprint after R1.1 through R1.4.

Suggested status:

- `ready-for-dev`

## Recommended Sprint Sequence

1. R1.1 - Repair search and filter semantics.
2. R1.2 - Add customer product detail flow.
3. R1.3 - Add quantity-aware add-to-cart on list and detail screens.
4. R1.4 - Make cart stock shortage warnings compliant.
5. R1.5 - Acceptance and regression test pass.

Parallelization notes:

- R1.1 and backend portions of R1.2 can run in parallel.
- R1.3 should wait for the product detail component contract from R1.2.
- R1.4 should reuse the product detail/lookup endpoint from R1.2 unless a batched stock endpoint is chosen.
- R1.5 should be finalized after all behavior stories are implemented.

## Definition of Done

- The customer can use `/` and `/cart` without staff login.
- The application starts with 20 random active products.
- Search by title and category returns matching products through paginated search results.
- Required price buckets are available and mapped to correct backend filters.
- Selecting a product opens a detail screen with general and type-specific information.
- Customers can add explicit quantities from both list and detail screens.
- Cart displays product names, quantities, prices, subtotal excluding VAT, total weight, and current stock shortage warnings.
- Stock shortage warning displays the quantity lacking, not only the available quantity.
- Cart quantity changes and removals update totals and warnings immediately.
- Customer cannot proceed toward delivery with unresolved cart stock shortages.
- Tests and build pass for affected frontend and backend areas.

## Suggested Sprint Status Entries

These entries are proposed for tracking if the team chooses to add remediation stories to the canonical sprint status file:

```yaml
development_status:
  epic-1: in-progress
  r1-1-repair-customer-search-and-filter-semantics: ready-for-dev
  r1-2-add-customer-product-detail-flow: ready-for-dev
  r1-3-add-quantity-aware-add-to-cart-on-list-and-detail-screens: ready-for-dev
  r1-4-make-cart-stock-shortage-warnings-compliant: ready-for-dev
  r1-5-acceptance-and-regression-test-pass-for-customer-catalog-and-cart: ready-for-dev
```

## BMad Next Steps

Recommended next BMad workflow:

1. Use `bmad-create-story` to create Story R1.1 with the context above.
2. Use `bmad-dev-story` to implement it.
3. Use `bmad-code-review` before marking it done.
4. Repeat for R1.2 through R1.5.

