# Investigation: Search and Filter Bug

## Hand-off Brief

1. **What happened.** The user reports that products are successfully returned when searching and filtering by price, but no products appear when clearing all filters or filtering by categories.
2. **Where the case stands.** Initial case opened. The entry point has been identified as `frontend/src/app/boundaries/search-bar/search-bar.ts` which handles the `onClearFilters()` action.
3. **What's needed next.** Map the evidence perimeter (Outcome 2) to inventory how the frontend requests are constructed and how the backend handles these filters.

## Case Info

| Field            | Value                                                                      |
| ---------------- | -------------------------------------------------------------------------- |
| Ticket           | N/A                                                       |
| Date opened      | 2026-05-29                                                                     |
| Status           | Active                                                                     |
| System           | Windows                                |
| Evidence sources | User description, Source Code        |

## Problem Statement

"Khi tôi search và lọc theo giá thì các sản phẩm xuất hiện nhưng khi tôi clear all filter hoặc filter by categories thì không có sản phẩm nào hiện." (When I search and filter by price, products appear, but when I clear all filters or filter by categories, no products appear).

## Evidence Inventory

| Source   | Status                          | Notes     |
| -------- | ------------------------------- | --------- |
| User description | Available | Reported symptom |
| Source Code | Available | Identified frontend component: `search-bar.ts` |

## Investigation Backlog

| # | Path to Explore | Priority              | Status                                | Notes     |
| - | --------------- | --------------------- | ------------------------------------- | --------- |
| 1 | `search-bar.ts` filter construction | High | Open | Check how category filter and clear filter actions update the query state. |
| 2 | Backend filter API | High | Open | Check how backend handles empty filters and category filters. |

## Timeline of Events

| Time        | Event               | Source                | Confidence            |
| ----------- | ------------------- | --------------------- | --------------------- |
| 2026-05-29 | Investigation started | User request | Confirmed |

## Confirmed Findings

### Finding 1: Frontend Search Component
**Evidence:** `frontend/src/app/boundaries/search-bar/search-bar.ts:60` (`onClearFilters()`)
**Detail:** The "Clear All Filters" button is wired to `onClearFilters()` in the `search-bar` component.

## Deduced Conclusions
(Empty)

## Hypothesized Paths

### Hypothesis 1: Frontend State Not Resetting Or Emitting Incorrectly
**Status:** Open
**Theory:** The `onClearFilters` method may not be properly clearing the filter state or emitting the reset event correctly, causing an invalid query to be sent to the backend.

### Hypothesis 2: Backend Filter Logic Fails on Category or Empty Filters
**Status:** Open
**Theory:** The backend might require specific parameters or fail when `category` is used, or it might treat empty filters as a "match none" condition instead of "match all".

## Missing Evidence

| Gap              | Impact                               | How to Obtain   |
| ---------------- | ------------------------------------ | --------------- |
| Frontend request payload | Confirms what is sent to the backend | Inspect `search-bar.ts` emission and the HTTP service call |
| Backend query logic | Confirms how filters are applied to DB | Inspect backend search/filter controller and service |

## Source Code Trace

| Element       | Detail                                      |
| ------------- | ------------------------------------------- |
| Error origin  | Unknown (Frontend vs Backend)                  |
| Trigger       | User clicks "Clear All Filters" or selects a Category |
| Condition     | Unknown |
| Related files | `frontend/src/app/boundaries/search-bar/search-bar.ts`, `search-bar.html` |

## Root Cause Analysis
1. **Category Filter Backend Bug**: When filtering by categories, the frontend sends enum strings like `'BOOK'` or `'CD'`. The backend `ProductService.searchProducts` was executing `qb.andWhere('product.category = :category')`. However, the `category` column in the database stores genres (e.g. "Programming"), while the enum values correspond to the `productType` column. This caused the query to return 0 products.
2. **Multiple Category Selection Frontend Bug**: The frontend `search-bar.ts` contained a bug where it only attached the category parameter if exactly one category was selected (`if (selectedCategories.length === 1)`). Selecting multiple categories omitted the parameter entirely, leading the system to either fetch random products or perform an unfiltered search.
3. **Empty/Clear All Filters Issue**: Because of the bugs above, the user experienced "no products appearing" when trying to use categories. The "Clear All Filters" button functions as intended in returning the UI to random products, but the failure of the category system led to confusion and the perception that clearing filters broke the state if combined with category operations.

## Resolutions Implemented
- Modified `backend/src/product/product.service.ts` to query `product.productType IN (:...categories)` instead of `product.category = :category`.
- Modified `frontend/src/app/boundaries/search-bar/search-bar.ts` to join multiple selected categories by a comma, passing them all to the backend instead of ignoring selections > 1.
- Validated fixes using test scripts and a browser subagent simulation.

## Recommendations
No further action needed. The bugs have been isolated and resolved. The search/filter system now correctly handles both single and multiple category selections, as well as clearing filters. Next Steps

### Fix direction
TBD

### Diagnostic
Proceed to Outcome 2: Map the evidence perimeter. I need to inspect `search-bar.ts` to see what it emits, and identify the backend controller that handles product search/filtering.
