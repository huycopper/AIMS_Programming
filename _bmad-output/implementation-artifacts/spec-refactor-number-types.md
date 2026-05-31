---
title: "refactor-number-types"
type: "refactor"
created: "2026-05-31T07:18:21+07:00"
status: "in-progress"
baseline_commit: "72519dacdb8a54e20bd52cd1405ecf08a22e2d94"
---

## Intent

**Problem:** Many numeric variables (e.g., `price`, `weight`, `height`, `width`, `length`) are currently returned as strings from the backend. This happens because TypeORM maps Postgres `numeric` columns to strings by default to prevent precision loss. This forces the frontend to manually cast these fields to numbers (e.g., `Number(price)`) and use `any` types, leading to messy code and potential calculation bugs in the cart.

**Approach:** Implement a TypeORM `ValueTransformer` (`ColumnNumericTransformer`) in the backend to automatically parse `numeric` column values into `number` when reading from the database. Apply this transformer to all `numeric` columns in `Product` and `Order` entities. Refactor the frontend to remove explicit `Number()` casts and strongly type the variables as `number`.

## Boundaries & Constraints

**Always:** Ensure `ColumnNumericTransformer` handles `null` or `undefined` values gracefully.
**Ask First:** If any calculation requires arbitrary precision beyond JS `Number.MAX_SAFE_INTEGER` (unlikely for simple e-commerce).
**Never:** Change the underlying database column types from `numeric`; only change the TypeORM application-level mapping.

## I/O & Edge-Case Matrix

| Scenario     | Input / State            | Expected Output / Behavior           | Error Handling |
| ------------ | ------------------------ | ------------------------------------ | -------------- |
| Valid number | DB returns `"280000.00"` | Entity property is `280000` (number) | N/A            |
| Null value   | DB returns `null`        | Entity property is `null`            | N/A            |

## Code Map

- `backend/src/utils/column-numeric-transformer.ts` -- New transformer to convert string from DB to JS number.
- `backend/src/product/entities/product.entity.ts` -- Apply transformer to height, width, length, weight, originalValue, currentPrice.
- `backend/src/order/entities/order.entity.ts` -- Apply transformer to subtotal, vat, shippingFee, totalAmount, totalWeight, unitPrice, weight.
- `frontend/src/app/boundaries/delivery-info-screen/delivery-info-screen.ts` -- Remove `Number()` casts for weight, quantity, currentPrice.
- `frontend/src/app/boundaries/cart-screen/cart-screen.ts` -- Remove `Number()` casts for price formatting, change `price: any` to `price: number`.

## Tasks & Acceptance

**Execution:**

- [ ] `backend/src/utils/column-numeric-transformer.ts` -- Create `ColumnNumericTransformer` class with `to` and `from` methods to parse float and handle nulls.
- [ ] `backend/src/product/entities/product.entity.ts` -- Apply `{ transformer: new ColumnNumericTransformer() }` to all `numeric` columns.
- [ ] `backend/src/order/entities/order.entity.ts` -- Apply `{ transformer: new ColumnNumericTransformer() }` to all `numeric` columns.
- [ ] `frontend/src/app/boundaries/delivery-info-screen/delivery-info-screen.ts` -- Remove `Number()` casts for `quantity`, `weight`, `currentPrice`.
- [ ] `frontend/src/app/boundaries/cart-screen/cart-screen.ts` -- Update `formatPrice` to accept `number` and remove `Number()` cast.

**Acceptance Criteria:**

- Given a product with a numeric price, when fetched from the backend API, then the price should be of type `number` in the JSON response, not a `string`.
- Given the cart and delivery info screens, when processing items, then the frontend should not need explicit `Number()` casts.

## Spec Change Log

## Design Notes

TypeORM numeric transformer:

```typescript
export class ColumnNumericTransformer {
  to(data: number | null): number | null {
    return data;
  }
  from(data: string | null): number | null {
    return data !== null ? parseFloat(data) : null;
  }
}
```

## Verification

**Commands:**

- `npm run start` -- expected: App compiles successfully in both frontend and backend.

**Manual checks (if no CLI):**

- Inspect the network response from `GET /api/products` or `GET /api/cart` and ensure numeric fields are numbers, not strings.
