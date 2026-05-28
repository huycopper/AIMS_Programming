---
baseline_commit: NO_VCS
---

# Story 1.1: Browse and Search Products

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Customer,
I want to browse, search, and filter physical media products,
so that I can find products of interest without logging in.

## Acceptance Criteria

1. **Given** the customer is on the homepage
   **When** the homepage loads
   **Then** the system displays 20 random products (books, newspapers, CDs, DVDs) (UX-DR1)
2. **Given** the customer wants to search or filter products
   **When** they enter a search query (by product title or category) or filter by price range (e.g., under 100,000 VND, 100,000â€“200,000 VND, etc.)
   **Then** the system displays all matching products on each page and retrieves general and type-specific information (FR1, FR2)

## Tasks / Subtasks

- [x] Task 1: Setup Angular Frontend structure (AC: 1, 2)
  - [x] Subtask 1.1: Initialize Angular components for Product List, Product Item, and Search Bar acting as Boundary classes.
  - [x] Subtask 1.2: Implement Angular services to call backend APIs.
- [x] Task 2: Setup NestJS Backend & Database (AC: 1, 2)
  - [x] Subtask 2.1: Initialize NestJS structure (`ProductController`, `ProductService`) following the Boundary-Control-Entity logic.
  - [x] Subtask 2.2: Setup TypeORM with PostgreSQL 18. Implement `products`, `books`, `cds`, `dvds`, `newspapers` entities precisely as defined in `DatabaseDescription.md`.
  - [x] Subtask 2.3: Implement `GET /api/products/random` (20 items) and `GET /api/products` (search/filter) endpoints.

## Dev Notes

- **CRITICAL REQUIREMENT:** Strict OOAD Adherence. Do not deviate from the entity definitions in `DatabaseDescription.md`.
- **Database Schema:** Use PostgreSQL `JSONB` for `authors`, `artists`, `tracks`, `subtitles`, `sections` as strictly mandated by `DatabaseDescription.md`.
- **Entity Model:**
  - `Product`: productId (UUID), productType, title, category, generalDescription, dimensions (height, width, length, weight), barcode, originalValue, currentPrice, stockQuantity, status, createdAt, updatedAt.
- **Constraints:**
  - `currentPrice` must be between `originalValue * 0.3` and `originalValue * 1.5`.
  - No authentication required for these read-only operations.

### Project Structure Notes

- **Angular (Frontend):**
  - Create boundaries (UI Components) in `src/app/boundaries/`.
- **NestJS (Backend):**
  - Group files by module, implementing Controllers, Services (Controls), and Entities.
  - All DB entities must be strictly typed according to the design docs.

### References

- [Source: Context/DatabaseDescription.md#products]
- [Source: Context/Group20-ClassDesignSpecification.md#3.3 Product]
- [Source: project-context.md]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (Thinking)

### Debug Log References

- Fixed Jest `moduleNameMapper` to handle `.js` import extensions used by `nodenext` module resolution.

### Completion Notes List

- âœ… Task 1.1: Created 3 Angular Boundary components: `ProductListComponent` (homepage grid + pagination), `ProductItemComponent` (product card with type-specific rendering), `SearchBarComponent` (search input, category checkboxes, price range filters).
- âœ… Task 1.2: Created `ProductService` Angular service with `getRandomProducts()` and `searchProducts()` methods calling backend REST API.
- âœ… Task 2.1: Backend `ProductController` (Boundary) and `ProductService` (Control) already existed. Verified correct BCE pattern mapping.
- âœ… Task 2.2: All 5 TypeORM entities (`Product`, `Book`, `Cd`, `Dvd`, `Newspaper`) already existed matching `DatabaseDescription.md` exactly with JSONB columns.
- âœ… Task 2.3: Both endpoints (`GET /api/products/random` and `GET /api/products`) already existed with search, category, price range filters, and pagination.
- âœ… All 14 backend tests pass (3 suites: AppController + ProductController + ProductService).
- âœ… Frontend builds successfully with Angular 21 and TailwindCSS v4.
- âœ… SEO: Updated index.html with proper title and meta description.
- âœ… Updated `app.config.ts` with `provideHttpClient()`, set up routing.
- âœ… Created `product.model.ts` with all TypeScript interfaces matching backend entities.

### File List

**New files:**

- frontend/src/app/models/product.model.ts
- frontend/src/app/services/product.service.ts
- frontend/src/app/boundaries/product-item/product-item.ts
- frontend/src/app/boundaries/product-item/product-item.html
- frontend/src/app/boundaries/product-item/product-item.css
- frontend/src/app/boundaries/search-bar/search-bar.ts
- frontend/src/app/boundaries/search-bar/search-bar.html
- frontend/src/app/boundaries/search-bar/search-bar.css
- frontend/src/app/boundaries/product-list/product-list.ts
- frontend/src/app/boundaries/product-list/product-list.html
- frontend/src/app/boundaries/product-list/product-list.css
- backend/src/product/product.service.spec.ts
- backend/src/product/product.controller.spec.ts

**Modified files:**

- frontend/src/app/app.config.ts (added provideHttpClient)
- frontend/src/app/app.routes.ts (added homepage route)
- frontend/src/app/app.html (replaced boilerplate with router-outlet)
- frontend/src/app/app.ts (simplified root component)
- frontend/src/index.html (SEO title/meta)
- frontend/src/styles.css (added Inter font, global reset)
- backend/package.json (added Jest moduleNameMapper for .js extension mapping)

## Change Log

- 2026-05-28: Implemented Story 1.1 â€” full frontend (Angular Boundary components, service, routing) and backend tests (14 tests, all pass). Frontend builds successfully.

### Review Findings

- [ ] [Review][Dismissed] Unnecessary addition of @nestjs/config (Kept intentionally) — backend/package.json adds @nestjs/config and AppModule imports it. The original spec does not require it. Should it be removed?
- [ ] [Review][Patch] Missing "random 20 products" endpoint (AC 1) — The diff only adds DTOs and entity classes; no controller method for GET /api/products/random.
- [ ] [Review][Patch] No validation of currentPrice range constraint — currentPrice must be between originalValue × 0.3 and originalValue × 1.5. No code checks this.
- [ ] [Review][Patch] Incompatible TypeORM version — package.json adds typeorm ^1.0.0 which is incompatible with NestJS 11 @nestjs/typeorm.
- [ ] [Review][Patch] Import paths switched to .js extensions — app.module.ts imports use .js extension breaking TS build.
- [ ] [Review][Patch] Potential typo / garbled comment in AppModule — corrupted text in comment reduces readability.
