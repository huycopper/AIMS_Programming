---
baseline_commit: NO_VCS
---
# Story 1.1: Browse and Search Products

Status: in-progress

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
   **When** they enter a search query (by product title or category) or filter by price range (e.g., under 100,000 VND, 100,000–200,000 VND, etc.)
   **Then** the system displays all matching products on each page and retrieves general and type-specific information (FR1, FR2)

## Tasks / Subtasks

- [ ] Task 1: Setup Angular Frontend structure (AC: 1, 2)
  - [ ] Subtask 1.1: Initialize Angular components for Product List, Product Item, and Search Bar acting as Boundary classes.
  - [ ] Subtask 1.2: Implement Angular services to call backend APIs.
- [ ] Task 2: Setup NestJS Backend & Database (AC: 1, 2)
  - [ ] Subtask 2.1: Initialize NestJS structure (`ProductController`, `ProductService`) following the Boundary-Control-Entity logic.
  - [ ] Subtask 2.2: Setup TypeORM with PostgreSQL 18. Implement `products`, `books`, `cds`, `dvds`, `newspapers` entities precisely as defined in `DatabaseDescription.md`.
  - [ ] Subtask 2.3: Implement `GET /api/products/random` (20 items) and `GET /api/products` (search/filter) endpoints.

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



### Debug Log References

### Completion Notes List

### File List
