---
baseline_commit: 18d9dc6aa176ce4e198b4b6acb3a3f462553e0e4
---

# Story 4.1: Product Management CRUD

**Epic:** Epic 4: Product Catalog Administration  
**Story ID:** 4.1  
**Status:** review

## Story

As a Product Manager,  
I want to create, update, and delete products,  
so that the online store catalog stays current and accurate.

## Acceptance Criteria

1. **Create or update one product at a time**
   - **Given** the Product Manager is logged in
   - **When** they create or update a product
   - **Then** AIMS validates all required base product fields and the selected subtype fields before saving.
   - **And** a create/update request handles exactly one product; bulk create/update is out of scope.

2. **Price integrity**
   - **Given** a product has `originalValue`
   - **When** the Product Manager enters `currentPrice`
   - **Then** the backend rejects the request unless `currentPrice >= originalValue * 0.30` and `currentPrice <= originalValue * 1.50`.
   - **And** the UI displays the invalid operation message inline or as the standard system error banner.

3. **Subtype persistence**
   - **Given** the Product Manager selects a product type
   - **When** the product is saved
   - **Then** AIMS stores base fields in `products` and stores only the matching subtype row in `books`, `cds`, `dvds`, or `newspapers`.
   - **And** JSONB-backed attributes are persisted as structured JSON arrays/objects, not comma-joined strings.

4. **Product history logging**
   - **Given** a create, update, delete, deactivate, or manual stock adjustment succeeds
   - **When** the database transaction commits
   - **Then** AIMS records a `product_histories` row with `product_id`, `performed_by`, `action_type`, `action_time`, old/new snapshots where applicable, and a reason when required.

5. **Product history query**
   - **Given** the Product Manager wants to inspect product operation history
   - **When** they query histories by product, action type, or date range
   - **Then** AIMS returns product history rows with action time, performer, action type, old/new snapshots where applicable, and the recorded reason.

6. **Manual stock adjustment reason**
   - **Given** an update changes `stockQuantity`
   - **When** the Product Manager submits the update
   - **Then** the backend requires a non-empty stock adjustment reason and records it in product history.

7. **Bulk delete/deactivate limits**
   - **Given** the Product Manager wants to delete products
   - **When** they submit a deletion request
   - **Then** the backend rejects requests containing more than 10 product ids.
   - **And** the backend rejects the request if the manager has already deleted/deactivated 20 products on the current `Asia/Saigon` calendar day or if the request would exceed that daily count.

8. **Delete versus deactivate behavior**
   - **Given** a deletion request is valid
   - **When** a selected product has `stockQuantity > 0`
   - **Then** AIMS changes its status to `DEACTIVATED` and removes it from customer-facing product browsing/search results.
   - **When** a selected product has `stockQuantity = 0`
   - **Then** AIMS changes its status to `DELETED` and removes it from customer-facing product browsing/search results while preserving the product row, subtype row, and deletion audit record.

9. **Regression guard for customer catalog**
   - **Given** customers browse or search products through existing public endpoints
   - **When** products are created, updated, deactivated, or deleted
   - **Then** public catalog endpoints still return only `ACTIVE` products and still include subtype details for books, CDs, DVDs, and newspapers.

## Source Requirements

- `Context/AIMS-ProblemStatement-ver3.1.1.md`: Product managers can add, view, edit, or delete products; add/edit is one product at a time; up to ten products may be deleted simultaneously; managers cannot delete more than twenty products per day; stock-positive products are deactivated instead of deleted; manual stock adjustments require an explicit reason; current price must be 30%-150% of original value; product addition/edit/deletion history must be stored and queryable by Product Managers; invalid operations must notify the product manager.
- `_bmad-output/planning-artifacts/epics.md`: Epic 4 covers FR10, FR13, AR1, AR2, AR3; Story 4.1 requires CRUD, price validation, JSONB subtype properties, product history logging, delete request limits, and delete/deactivate behavior. No separate Correct Course proposal file was found under `_bmad-output`; this Epic 4 entry is the available proposal-level planning source.
- `Context/DatabaseDescription.md`: Base product columns and constraints live in `products`; zero-stock deletion is represented with `products.status = DELETED`; subtype tables are `books`, `cds`, `dvds`, and `newspapers`; audit records live in `product_histories` with action types `CREATE`, `UPDATE`, `DELETE`, `DEACTIVATE`, and `STOCK_ADJUST`.
- `Context/Group20-ClassDesignSpecification.md`: BCE mapping includes `CreateProductScreen`, `UpdateProductScreen`, `DeleteProductScreen`, `Product Controller`, `Product`, and `ProductHistory`.
- `Context/ScreenStandardizationRequirements.md`: Desktop web layout, Inter typography, standard buttons/forms, inline field errors, warning banners, loading indicators, and empty states apply to admin screens even though no detailed product-admin screen spec exists.
- `project-context.md`: `Context/AIMS-ProblemStatement-ver3.1.1.md` is the highest authority; map implementation to BCE and use `DatabaseDescription.md` as physical schema source unless it conflicts with the problem statement.

## Developer Context

Story 4.1 extends the existing catalog implementation from customer-facing reads into Product Manager write workflows. Do not create a parallel product stack. Reuse and extend the current `ProductModule`, `ProductService`, product entities, frontend product model, and Angular service patterns.

Current implementation state:

- `backend/src/product/product.controller.ts` exposes unauthenticated read-only endpoints:
  - `GET /api/products/random`
  - `GET /api/products`
- `backend/src/product/product.service.ts` filters public reads by `ProductStatus.ACTIVE` and left-joins `book`, `cd`, `dvd`, and `newspaper`.
- `backend/src/product/entities/product.entity.ts` maps the `products` table and enums `ProductType` and `ProductStatus`.
- `backend/src/product/entities/book.entity.ts`, `cd.entity.ts`, `dvd.entity.ts`, and `newspaper.entity.ts` already map subtype tables with JSONB fields.
- No `ProductHistory` entity exists yet.
- No auth/RBAC/user module exists yet in source, although the story precondition says the Product Manager is logged in.
- `backend/src/app.module.ts` currently uses TypeORM with `autoLoadEntities: true` and `synchronize: true`.

## Technical Requirements and Guardrails

### BCE Mapping

- Frontend boundaries:
  - Add Product Manager-facing boundary screens/components for create, update, and delete workflows.
  - Names should align with design intent, e.g. `CreateProductScreen`, `UpdateProductScreen`, `DeleteProductScreen`, or a cohesive `ProductManagementScreen` with clear create/update/delete sections.
- Frontend control/service:
  - Extend `frontend/src/app/services/product.service.ts` for manager write APIs.
  - Extend `frontend/src/app/models/product.model.ts` with create/update/delete DTO types instead of using loose `any`.
- Backend boundary:
  - Extend `backend/src/product/product.controller.ts` or add a product-admin controller under `backend/src/product/`.
  - Keep public read endpoints unauthenticated and behavior-compatible.
- Backend control:
  - Extend `backend/src/product/product.service.ts` or split admin orchestration into a product admin service inside the same module.
  - Use one database transaction for base product, subtype row, and history record.
- Entities:
  - Reuse `Product`, `Book`, `Cd`, `Dvd`, `Newspaper`.
  - Add `ProductHistory` mapped to `product_histories`.

### API Contract

Use these contracts unless the implementation finds a stronger existing convention:

- `POST /api/products`
  - Creates one product.
  - Body contains base fields plus exactly one subtype payload matching `productType`.
  - Requires Product Manager identity from the authenticated request context, or from the temporary identity adapter below until Epic 5 RBAC exists.
- `PATCH /api/products/:productId`
  - Updates one product.
  - Body contains changed base fields, optional matching subtype payload, and `stockAdjustmentReason` when `stockQuantity` changes.
  - Requires Product Manager identity from the authenticated request context, or from the temporary identity adapter below until Epic 5 RBAC exists.
- `POST /api/products/bulk-delete`
  - Body: `{ productIds: string[], reason?: string }`.
  - Enforces max 10 ids per request and max 20 deleted/deactivated products per Product Manager per `Asia/Saigon` calendar day.
  - Returns per-product results so the UI can show which products were deleted, deactivated, or rejected.
- `GET /api/products/admin`
  - Lists manager-visible products for view/update/delete workflows.
  - Can include `ACTIVE`, `DEACTIVATED`, and `DELETED` products behind the manager-only boundary.
  - Must not weaken existing public reads.
- `GET /api/products/:productId/histories`
  - Returns product history rows for a Product Manager query.
  - Supports filters for `actionType`, `from`, and `to` when practical in the current service pattern.

Auth/RBAC integration:

- If an auth/RBAC module exists by implementation time, take `performedBy` and role from the authenticated request principal and require `PRODUCT_MANAGER`.
- If auth/RBAC is still absent, do not implement full user management in this story. Add a narrow, replaceable Product Manager identity adapter for manager endpoints only:
  - Accept `X-AIMS-User-Id` as a temporary UUID source.
  - Validate that the UUID exists in `users.user_id` before writing history.
  - Do not accept `performedBy` in request bodies.
  - Do not hardcode a permanent manager id or bypass audit data.

### Data and Validation Rules

Base product fields required by the problem statement and DB schema:

- `productType`: `BOOK`, `CD`, `DVD`, or `NEWSPAPER`
- `title`
- `category`
- `generalDescription` optional
- `height`, `width`, `length`, `weight`: numeric and `>= 0`
- `barcode`: unique
- `originalValue`: numeric and `>= 0`
- `currentPrice`: numeric, `>= 0`, and within 30%-150% of `originalValue`
- `stockQuantity`: integer and `>= 0`
- `status`: defaults to `ACTIVE`

Subtype requirements:

- Book: `authors` JSONB array, `coverType` (`PAPERBACK` or `HARDCOVER`), `publisher`, `publicationDate`; optional `numberOfPages > 0`, `language`, `genre`.
- CD: `artists` JSONB array, `recordLabel`, `tracks` JSONB array where each track has a title and optional length, `genre`; optional `releaseDate`.
- DVD: `discType` (`BLU_RAY` or `HD_DVD`), `director`, `runtime > 0`, `studio`, `language`, `subtitles` JSONB array; optional `releaseDate`, `genre`.
- Newspaper: `editorInChief`, `publisher`, `publicationDate`; optional `issueNumber`, `publicationFrequency`, `issn`, `language`, `sections` JSONB array.

History logging:

- `CREATE`: old snapshot null, new snapshot full saved product including subtype.
- `UPDATE`: old snapshot full product before update, new snapshot full product after update.
- `STOCK_ADJUST`: record when `stockQuantity` changes; `reason` is mandatory.
- `DEACTIVATE`: old snapshot active product, new snapshot with `status: DEACTIVATED`.
- `DELETE`: old snapshot full product before status change, new snapshot with `status: DELETED`.

Deletion and audit preservation:

- The problem statement requires product deletion history to be stored and queryable.
- `DatabaseDescription.md` includes `products.status = DELETED` and `product_histories.product_id ON DELETE CASCADE`.
- Therefore, for zero-stock deletion, set `products.status = DELETED` instead of physically removing the `products` row. This preserves `product_histories` and keeps the schema FK valid.
- Public customer queries must treat both `DEACTIVATED` and `DELETED` as unavailable.

### File Structure Requirements

Expected backend files to add or update:

- `backend/src/product/product.controller.ts`
- `backend/src/product/product.service.ts`
- `backend/src/product/product.module.ts`
- `backend/src/product/dto/create-product.dto.ts`
- `backend/src/product/dto/update-product.dto.ts`
- `backend/src/product/dto/bulk-delete-products.dto.ts`
- `backend/src/product/dto/query-product-histories.dto.ts`
- `backend/src/product/entities/product-history.entity.ts`
- `backend/src/product/entities/index.ts`
- `backend/src/product/product.service.spec.ts`
- `backend/src/product/product.controller.spec.ts`

Expected frontend files to add or update:

- `frontend/src/app/models/product.model.ts`
- `frontend/src/app/services/product.service.ts`
- `frontend/src/app/app.routes.ts`
- Product Manager boundary component files under `frontend/src/app/boundaries/` or a similarly established local folder.

Do not move or rename existing customer catalog components as part of this story unless required by tests.

### UI Requirements

- Follow the existing Angular standalone component style.
- Follow the project desktop layout and UI kit: max content width 1280 px, Inter, standard form inputs, field-level errors, system error banners, loading indicators, and desktop-first layout.
- The Product Manager UI must support:
  - Admin product list/search sufficient to choose products for update/delete.
  - Create form with product type selection and type-specific fields.
  - Update form for one selected product.
  - Multi-select delete request up to 10 products.
  - Product history query/view for selected products.
  - Clear result state distinguishing deleted versus deactivated products.
  - Inline validation for price range, required fields, JSON array fields, and stock adjustment reason.

### Environment and Dependency Guardrails

- `backend/.env` is used for DB and integration configuration. Do not copy secret values into code, generated docs, logs, tests, or story updates.
- Required DB env variable names: `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`.
- Current package lock indicates NestJS 11, Angular 21, TypeScript 5.9.3, PostgreSQL driver `pg`, and TypeORM `1.0.0`.
- Do not upgrade framework/database dependencies for this story unless a failing build proves it is necessary and the change is explicitly scoped.
- Use `class-validator` and `class-transformer` DTO validation patterns already present in `SearchProductsDto`.

### Regression Requirements

- Preserve `GET /api/products/random` behavior: returns up to 20 random active products and still supports category filtering.
- Preserve `GET /api/products` behavior: returns paginated active products with subtype joins.
- Do not allow `DEACTIVATED` or `DELETED` products to appear in public browse/search.
- Do not break cart/order flows that consume `Product` shape.

## Tasks / Subtasks

- [x] Task 1: Add backend DTOs and validation (AC: 1, 2, 3, 5, 6)
  - [x] Create DTOs for create/update/delete requests using `class-validator`.
  - [x] Validate price integrity in backend service even if DB checks also exist.
  - [x] Validate exactly one subtype payload matching `productType`.
  - [x] Require stock adjustment reason when `stockQuantity` changes.
  - [x] Create history query DTO/filter validation for product history lookup.

- [x] Task 2: Add product history persistence and query support (AC: 4, 5, 6, 8)
  - [x] Add `ProductHistory` entity mapped to `product_histories`.
  - [x] Record snapshots for create/update/delete/deactivate/stock adjustment.
  - [x] Implement Product Manager history query by product with optional action/date filters.
  - [x] Preserve deletion audit records by using `status: DELETED` for zero-stock deletion.

- [x] Task 3: Implement create/update transactional service methods (AC: 1, 2, 3, 4, 6)
  - [x] Save base product and matching subtype row in one transaction.
  - [x] On product type changes, remove stale subtype rows and create the new matching subtype row in the same transaction.
  - [x] Return the saved product with subtype details.

- [x] Task 4: Implement bulk delete/deactivate service method (AC: 4, 7, 8, 9)
  - [x] Enforce max 10 ids per request.
  - [x] Count Product Manager delete/deactivate actions for the current `Asia/Saigon` calendar day and enforce max 20 products per day.
  - [x] Deactivate stock-positive products.
  - [x] Mark zero-stock products as `DELETED` while preserving deletion history and subtype rows.
  - [x] Return per-product results.

- [x] Task 5: Expose manager API endpoints (AC: 1-9)
  - [x] Add create endpoint.
  - [x] Add update endpoint.
  - [x] Add bulk delete endpoint.
  - [x] Add manager product list/view endpoint.
  - [x] Add product history query endpoint.
  - [x] Keep public read endpoints unchanged.
  - [x] Wire authenticated Product Manager identity or the temporary `X-AIMS-User-Id` adapter until Epic 5 RBAC is available.

- [x] Task 6: Add Product Manager UI (AC: 1-9)
  - [x] Add route(s) for product management.
  - [x] Add product list/search for manager workflows.
  - [x] Add create/update forms with subtype-specific sections.
  - [x] Add multi-select delete UI with limit messaging and result display.
  - [x] Add product history query/view UI for selected products.
  - [x] Surface validation and system errors using standard UI patterns.

- [x] Task 7: Add automated tests (AC: 1-9)
  - [x] Backend service tests for price validation, subtype persistence, stock reason requirement, history snapshots, history query filters, delete limits, deactivate versus `DELETED`, and public-read regression.
  - [x] Backend controller tests for request validation, temporary identity adapter behavior, and delegation.
  - [x] Frontend unit tests for Product Manager form validation, API calls, delete selection limits, loading/error states, and result rendering.

## Testing Notes

Minimum automated coverage:

- Creating each subtype persists base and subtype data correctly.
- Invalid price below 30% or above 150% is rejected.
- Updating stock without reason is rejected.
- Updating stock with reason records `STOCK_ADJUST`.
- Updating non-stock fields records `UPDATE`.
- Product history query returns matching rows by product and filters by action/date where supplied.
- Manager write endpoints reject missing or invalid Product Manager identity when RBAC is absent.
- Delete request with 11 product ids is rejected.
- Delete/deactivate request that would exceed 20 products for the current manager/day is rejected.
- Stock-positive product becomes `DEACTIVATED` and disappears from public reads.
- Zero-stock product becomes `DELETED`, remains available to manager history queries, and disappears from public reads.
- Existing public random/search product tests still pass.

Manual verification:

- Create Book, CD, DVD, and Newspaper from the UI.
- Update price at valid and invalid boundaries: 30%, 150%, just below 30%, just above 150%.
- Update stock with and without reason.
- Query product history after create, update, stock adjustment, deactivate, and delete actions.
- Select 10 products for delete/deactivate and verify mixed result display.
- Attempt an 11-product delete request and verify UI/backend rejection.
- Verify customer homepage/search does not show deactivated or deleted products.

## Previous Story Intelligence

No previous story exists in Epic 4. Relevant established patterns come from earlier implemented stories:

- Product catalog code already uses the BCE naming style in comments and source layout.
- Existing backend product tests mock TypeORM query builders; new write tests should mock repositories and transaction behavior deliberately.
- Story 3.2 shows that environment values must be documented by variable name only; do not copy secret or credential values from `backend/.env`.

## Git Intelligence Summary

Recent commits focus on VietQR transaction synchronization and notification flow:

- `18d9dc6 feat: implement order cancellation notification system and add VietQR e2e characterization tests`
- `dbfab4a feat: implement VietQR transaction synchronization webhook and processing logic`

Actionable pattern for this story:

- Keep external/integration concerns isolated behind boundary/control classes.
- Add focused unit tests around business rules instead of relying on manual verification.
- Treat notification/email/env values carefully and do not leak secrets.

## Latest Technical Information

No dependency upgrade is required for this story. Implement against the versions already locked in this repository:

- Backend: NestJS 11, TypeORM as installed by `backend/package-lock.json`, PostgreSQL via `pg`, Jest/ts-jest.
- Frontend: Angular 21 standalone components, Angular Router, Angular `HttpClient`, Vitest/JSDOM test setup.

Use official local package APIs already present in the codebase. If a framework issue is encountered, fix within current patterns before proposing a dependency upgrade.

## Project Structure Notes

- Planning artifacts did not include a separate architecture or UX document under `_bmad-output/planning-artifacts`; architecture/UX guidance was loaded from `Context/*` files and existing source.
- Product admin screens are not listed in `Context/ScreenSpecifications.md`; use `ScreenStandardizationRequirements.md` and current Angular component patterns for UI consistency.
- `Context/DatabaseDescription.md` uses snake_case database names, while code uses camelCase TypeScript properties mapped through TypeORM decorators. Continue that mapping style.

## File List

- `_bmad-output/implementation-artifacts/4-1-product-management-crud.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `backend/src/product/dto/bulk-delete-products.dto.ts`
- `backend/src/product/dto/create-product.dto.ts`
- `backend/src/product/dto/query-product-histories.dto.ts`
- `backend/src/product/dto/update-product.dto.ts`
- `backend/src/product/entities/index.ts`
- `backend/src/product/entities/product-history.entity.ts`
- `backend/src/product/product.controller.spec.ts`
- `backend/src/product/product.controller.ts`
- `backend/src/product/product.module.ts`
- `backend/src/product/product.service.spec.ts`
- `backend/src/product/product.service.ts`
- `frontend/src/app/app.routes.ts`
- `frontend/src/app/boundaries/product-management-screen/product-management-screen.css`
- `frontend/src/app/boundaries/product-management-screen/product-management-screen.html`
- `frontend/src/app/boundaries/product-management-screen/product-management-screen.spec.ts`
- `frontend/src/app/boundaries/product-management-screen/product-management-screen.ts`
- `frontend/src/app/models/product.model.ts`
- `frontend/src/app/services/product.service.spec.ts`
- `frontend/src/app/services/product.service.ts`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm test -- product --runInBand` (backend): passed, 19 tests.
- `npm run build` (backend): passed.
- `npx vitest run src/app/services/product.service.spec.ts src/app/boundaries/product-management-screen/product-management-screen.spec.ts` (frontend targeted): passed, 8 tests.
- `npx ng build --configuration development` (frontend): passed.
- `npm run build` (frontend production): blocked by restricted network while Angular tried to inline Google Fonts from `fonts.googleapis.com`.
- `npm test -- --watch=false` (frontend full): existing non-Story-4.1 failures in `app`, delivery-info, and invoice specs.
- `npm test -- --runInBand` (backend full): existing non-Story-4.1 failures in order and VietQR tests.

### Completion Notes List

- Added Product Manager CRUD API surface under `ProductModule` while preserving public browse/search endpoints as customer-facing `ACTIVE`-only reads with subtype joins.
- Added validated create/update/bulk-delete/history DTOs and transactional service methods for one-product create/update, subtype persistence, price guardrails, mandatory stock adjustment reason, audit snapshots, and history query filters.
- Added `ProductHistory` entity mapped to `product_histories` and history writes for create/update/stock adjustment/delete/deactivate.
- Implemented temporary `X-AIMS-User-Id` manager identity adapter that validates the UUID against `users.user_id` before write/history operations.
- Implemented bulk delete/deactivate rules: max 10 ids per request, max 20 delete/deactivate actions per Product Manager per Asia/Saigon day, `DEACTIVATED` for stock-positive products, `DELETED` for zero-stock products without physical deletion.
- Added `/admin/products` Angular boundary with manager product search/list, create/update form, subtype-specific sections, delete multi-select/result display, history query, inline validation, loading/error/success states.
- Added backend and frontend tests for Story 4.1 business rules and API/UI contract. Full regression suites still contain unrelated baseline failures outside Story 4.1 and were not modified per instruction.

### Change Log

- 2026-06-22: Implemented Story 4.1 Product Management CRUD backend, frontend UI, tests, and story/sprint tracking updates.

## Story Completion Status

Implementation complete and ready for review.
