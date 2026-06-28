---
name: AIMS Product Operations
status: draft
sources:
  - Context/AIMS-ProblemStatement-ver3.1.1.md
  - Context/ScreenStandardizationRequirements.md
  - _bmad-output/implementation-artifacts/4-1-product-management-crud.md
updated: 2026-06-23
---

# AIMS Product Operations - Experience Spine

## Foundation

Desktop-only web admin surface for Product Managers. This spine covers `/admin/products`: product list, product create/update, stock adjustment, bulk delete/deactivate, and product history. Visual identity and component appearance are defined in `DESIGN.md`; this document owns structure, behavior, states, and flows.

[ASSUMPTION] The screen uses existing Angular standalone components and project CSS rather than a third-party component system.

## Information Architecture

| Surface | Reached from | Purpose |
|---|---|---|
| Product Management | Staff nav: Products | Search, filter, scan, select, and bulk-act on catalog products |
| Product drawer - Overview | Product row click | Inspect product state before editing |
| Product drawer - Edit | Drawer tab / Add Product | Create or update one product at a time |
| Product drawer - Stock | Drawer tab when product exists | Manually adjust stock with mandatory reason |
| Product drawer - History | Drawer tab when product exists | Query and inspect product operation history |
| Delete/deactivate confirmation | Bulk action bar | Confirm selected products and record reason |
| Pending Orders | Staff nav: Pending Orders | Peer Product Manager responsibility, out of scope for this screen |

Composition reference: `mockups/product-management.html`. The spines win on conflict with mockups.

## Voice and Tone

Microcopy should be direct and operational. Avoid motivational language.

| Do | Don't |
|---|---|
| "Current price must be between 30,000 and 150,000 VND." | "Invalid price." |
| "Stock changed. Add a reason before saving." | "Reason required!" |
| "3 products selected." | "You selected some products." |
| "Products with stock will be deactivated, not deleted." | "Are you sure?" |
| "No history for this product." | "Nothing here yet!" |

## Component Patterns

| Component | Use | Behavioral rules |
|---|---|---|
| Product table | Main surface | Rows open the product drawer. Checkbox selection does not open drawer. Header remains sticky while scrolling. |
| Filter toolbar | Above table | Search runs on Enter and Apply. Type, status, and stock filters update table after Apply. Clear resets all filters. |
| Add Product button | Page header | Opens drawer in create mode with Edit tab active and no selected product. |
| Product drawer | Create/view/edit/history | Drawer remains open while table refreshes. Close returns focus to the row or Add Product button that opened it. |
| Drawer tabs | Overview/Edit/Stock/History | Overview is default for existing products. Edit is default for new product. Stock and History disabled until product exists. |
| Product type selector | Create/Edit | Product type controls which subtype fields are visible. Existing field values for other types are cleared only after user confirms type change. |
| Price range helper | Pricing fields | When original value changes, calculate valid current price range immediately. Show helper text below current price. |
| Stock reason field | Stock tab/Edit tab | Appears only when stock quantity differs from original stock. Save is blocked until non-empty. |
| Bulk action bar | Selected rows | Hidden when no rows selected. Shows selected count, clear selection, and delete/deactivate action. |
| Delete/deactivate dialog | Bulk action | Lists selected count and consequences. Requires confirmation action; reason is optional unless product policy later requires it. |
| History timeline | History tab | Default shows all actions newest first. Filters: action type, from date, to date. |

## State Patterns

| State | Surface | Treatment |
|---|---|---|
| Cold load | Product Management | Skeleton table rows matching expected columns. |
| Empty catalog | Product table | Empty state with single `Add Product` action. |
| No filter results | Product table | "No products match these filters." Keep filters visible. |
| Row selected | Product table | Selected background and visible drawer header with product title. |
| Bulk selected | Product table | Sticky bulk action bar appears; page header primary action remains available. |
| Create success | Drawer | Success banner near drawer header; product table refreshes; drawer switches to Overview for created product. |
| Update success | Drawer | Inline success near Save button and table row updates. |
| Delete/deactivate success | Table | Result summary grouped by Deleted, Deactivated, Rejected. |
| Validation error | Form | Field-level error under affected input. Summary banner only for cross-field or server errors. |
| Price out of range | Pricing | Current price field error includes computed min and max. |
| Missing stock reason | Stock/Edit | Reason field receives focus and field-level error. |
| Auth forbidden | Page | Existing forbidden screen. |
| Backend unavailable | Page | System error banner at top; preserve current local form values. |

## Interaction Primitives

- Click product row to open drawer.
- `Enter` in search input applies search.
- `Esc` closes drawer or dialog, one layer at a time.
- `Tab` order follows: header actions, filters, table controls, selected row actions, drawer controls.
- Selection checkboxes are keyboard-operable and have product-title accessible labels.
- Delete/deactivate requires an explicit confirmation dialog. The danger button is never the default focused action.
- Do not use hover-only actions. Actions visible on hover must also be reachable by keyboard focus and row action menu.
- Do not use infinite scroll; use pagination once backend supports it.

## Accessibility Floor

- WCAG 2.2 AA behavior target.
- Every input has a persistent label, not placeholder-only labeling.
- Field-level errors are programmatically associated with inputs.
- Drawer opening announces context: "Product details: {title}" or "Create product".
- Dialog opening announces selected product count and consequence.
- Focus is trapped inside dialogs and restored after close.
- Tables expose column headers correctly.
- Status badges must not rely on color alone; text states are always visible.

## Responsive & Platform

AIMS standards define desktop web as the target; no mobile layout is required. At widths below 1100 px, the drawer may become full-width overlay to prevent cramped table/form columns during demos.

## Product-Specific Rules

| Rule | UX requirement |
---|---|
| Add/edit one product at a time | Drawer form handles exactly one product. No bulk create or bulk update controls. |
| Delete up to 10 products at once | Selection stops at 10 and explains the limit. |
| Max 20 delete/deactivate operations per day | Server error should show as warning banner with the daily policy language. |
| Stock > 0 means deactivation | Confirmation dialog says stock-positive products will be deactivated. |
| Stock = 0 means deleted | Confirmation dialog says zero-stock products will be marked deleted. |
| Manual stock adjustment requires reason | Save blocked until reason is provided. |
| Current price 30%-150% original value | Price helper and validation use computed numeric bounds. |
| History query available | History tab supports action/date filters. |

## Inspiration & Anti-patterns

- **Lifted from common SaaS admin tools:** table-first list, right-side detail drawer, filter toolbar, sticky bulk selection bar.
- **Lifted from inventory systems:** separate stock adjustment workflow because stock changes need a reason and audit trail.
- **Rejected - permanent create form beside table:** creates too much simultaneous cognitive load.
- **Rejected - delete reason input always visible under the table:** destructive intent should be contextual and confirmed.
- **Rejected - history below the edit form:** history belongs to the selected product context, not the global page layout.

## Key Flows

### Flow 1 - Create a book product (Mai, Product Manager, morning catalog update)

1. Mai opens `/admin/products`.
2. Product table loads with filters and `Add Product` in the header.
3. She clicks `Add Product`.
4. Drawer opens in create mode with Edit tab active.
5. She selects `Book`; Book subtype fields appear.
6. She enters title, category, barcode, original value, current price, stock, dimensions, authors, cover type, publisher, and publication date.
7. Current price helper confirms the allowed range.
8. She clicks `Create`.
9. Climax: the drawer switches to Overview for the new product, the table refreshes, and a success message confirms creation.

Failure: current price is too low. The current price field shows the computed minimum and Save remains blocked.

### Flow 2 - Adjust stock after damaged items (Mai, Product Manager, warehouse update)

1. Mai searches by barcode.
2. She opens the matching product row.
3. Drawer opens on Overview.
4. She opens the Stock tab.
5. She reduces stock quantity.
6. Reason field appears and receives attention.
7. She enters "Damaged items removed from warehouse".
8. She clicks `Save stock`.
9. Climax: stock updates in the table and History tab shows a `STOCK_ADJUST` entry with the reason.

Failure: she tries to save without a reason. Focus moves to the reason field and the field-level error explains the rule.

### Flow 3 - Deactivate products in bulk (An, Product Manager, end-of-day cleanup)

1. An filters products by status Active and low stock.
2. He selects 6 products.
3. Bulk action bar appears: "6 products selected."
4. He clicks `Delete/deactivate`.
5. Confirmation dialog explains that products with stock will be deactivated and zero-stock products will be marked deleted.
6. He enters a reason and confirms.
7. Climax: the table shows a grouped result summary: Deactivated, Deleted, Rejected.

Failure: he selects an 11th product. The checkbox remains unchecked and the page shows the 10-product request limit near the selection bar.

### Flow 4 - Investigate product history (Linh, Product Manager, price audit)

1. Linh opens a product row.
2. Drawer opens on Overview.
3. She opens History.
4. She filters action type to `UPDATE`.
5. History timeline shows newest updates first.
6. Climax: Linh sees the previous and new values entry and can identify when the price changed.

Failure: no history matches filters. The timeline area says "No history for this product and filter."

