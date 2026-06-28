---
name: AIMS Product Operations
description: Desktop-first admin interface for Product Manager catalog operations in AIMS.
status: draft
sources:
  - Context/AIMS-ProblemStatement-ver3.1.1.md
  - Context/ScreenStandardizationRequirements.md
  - _bmad-output/implementation-artifacts/4-1-product-management-crud.md
updated: 2026-06-23
colors:
  surface-base: '#F6F7F9'
  surface-panel: '#FFFFFF'
  surface-muted: '#F8FAFC'
  ink-primary: '#17202A'
  ink-secondary: '#4B5563'
  ink-muted: '#64748B'
  border: '#DFE4EA'
  border-subtle: '#EDF0F3'
  primary: '#0F766E'
  primary-hover: '#115E59'
  primary-soft: '#E6F4F1'
  warning: '#B45309'
  warning-soft: '#FEF3C7'
  danger: '#B91C1C'
  danger-soft: '#FEE2E2'
  success: '#166534'
  success-soft: '#DCFCE7'
  neutral-soft: '#F1F5F9'
typography:
  page-title:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: 24px
    fontWeight: '800'
    lineHeight: '1.2'
    letterSpacing: '0'
  section-title:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: 17px
    fontWeight: '800'
    lineHeight: '1.3'
    letterSpacing: '0'
  body:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: '0'
  table:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.4'
    letterSpacing: '0'
  label:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1.4'
    letterSpacing: '0'
rounded:
  sm: 4px
  md: 6px
  lg: 8px
  full: 9999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 20px
  '6': 24px
  '8': 32px
  page-x: 24px
  page-y: 20px
components:
  primary-button:
    background: '{colors.primary}'
    foreground: '#FFFFFF'
    radius: '{rounded.md}'
  secondary-button:
    background: '#334155'
    foreground: '#FFFFFF'
    radius: '{rounded.md}'
  danger-button:
    background: '{colors.danger}'
    foreground: '#FFFFFF'
    radius: '{rounded.md}'
  panel:
    background: '{colors.surface-panel}'
    border: '1px solid {colors.border}'
    radius: '{rounded.lg}'
  status-active:
    background: '{colors.success-soft}'
    foreground: '{colors.success}'
    radius: '{rounded.full}'
  status-unavailable:
    background: '{colors.neutral-soft}'
    foreground: '{colors.ink-muted}'
    radius: '{rounded.full}'
---

# AIMS Product Operations - Design Spine

## Brand & Style

AIMS Product Operations is a staff-facing operational tool. It should feel efficient, stable, and legible rather than promotional. The visual language favors dense but orderly information: clear tables, restrained panels, visible state badges, and predictable controls.

The interface should not use decorative hero areas, large marketing typography, or illustration. Product Managers come here to find a product, inspect its state, update it correctly, and leave an audit trail.

## Colors

- **Primary Teal (`#0F766E`)** is the existing AIMS staff action color. Use it for the main positive action: create, save, apply filters.
- **Danger Red (`#B91C1C`)** is reserved for destructive workflows such as delete/deactivate confirmation. Never use it for ordinary warnings.
- **Warning Amber (`#B45309` / `#FEF3C7`)** is for policy constraints and recoverable issues: daily delete limit, missing stock reason, price out of range.
- **Success Green (`#166534` / `#DCFCE7`)** is for successful operations and active status.
- **Neutral Slate (`#F1F5F9`, `#64748B`)** is for deactivated/deleted states, secondary metadata, empty states, and disabled controls.

Avoid one-note palettes. The page should read as a neutral work surface with teal actions, not as an all-teal dashboard.

## Typography

Use Inter throughout, matching the project standard. Page titles are compact; admin tools should not use hero-scale typography. Table text is 13 px for density, while form body text is 14 px for readability.

Labels use 12 px bold text. Do not use negative letter spacing. Do not scale type with viewport width.

## Layout & Spacing

Target desktop web at 1366 x 768 and above. The primary layout is:

- Top staff navigation, 60 px high.
- Page header with title, count summary, and primary action.
- Filter toolbar.
- Full-width product table.
- Right-side drawer for create, detail, edit, stock, and history workflows.

The max content width remains 1280 px unless the app shell later adopts a wider operational layout. Use 24 px page gutters, 12-16 px internal panel spacing, and sticky table headers.

## Elevation & Depth

Depth should be minimal. Use borders and tonal surface changes before shadows. Drawers and dialogs may use a subtle shadow to show layering above the table; product table rows should rely on hover/selection background rather than elevation.

## Shapes

Use 6 px radius for buttons, inputs, selects, and small panels. Use 8 px for larger panels, drawers, and dialogs. Pills are allowed only for compact status badges.

## Components

- **Product table**: full-width, sticky header, stable columns, row hover, selected row background, checkbox column fixed at the left.
- **Filter toolbar**: search input plus type, status, and stock filters. Filters should be compact controls, not large cards.
- **Right drawer**: 420-520 px wide on desktop. Contains selected product title, status badge, tab list, and tab content.
- **Tabbed editor**: Overview, Edit, Stock, History. The active tab has a clear border or primary underline.
- **Field group**: Form sections use small headings and grouped fields: Basic, Pricing, Inventory, Dimensions, Type-specific details.
- **Status badge**: Active is green. Deactivated and Deleted are neutral. Low stock uses warning treatment in the stock column only.
- **Bulk action bar**: appears only when rows are selected. It is sticky above or below the table and contains selected count plus the delete/deactivate action.
- **Confirmation dialog**: required before delete/deactivate. Uses danger action styling and includes a reason field.
- **History timeline**: compact chronological list with action type, actor, time, reason, and snapshot affordance if available.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Make the product table the default work surface | Show a long create/edit form as the default page content |
| Use drawers/tabs to stage detail work | Put list, form, delete, and history at equal visual priority |
| Use field-level errors below inputs | Rely only on one global error banner |
| Explain destructive consequences in the confirmation dialog | Put the delete reason input permanently under the table |
| Keep density high but organized | Use marketing-style cards or oversized page sections |
| Keep Product Manager order review as a peer nav item | Mix pending order review into the product table |

