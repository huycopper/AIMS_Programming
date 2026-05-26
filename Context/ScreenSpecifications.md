# Screen specification

| AIMS Software | Date of creation | Approved by | Reviewed by | Person in charge |
|---|---|---|---|---|
| Screen specification: **Homepage** | 20/4/2026 | AnND | HuyDD | AnhTV |

## Homepage

### CONTROLS / OPERATIONS / FUNCTIONS
| Control | Operation | Function |
|---|---|---|
| Logo "AIMS" | Click | Navigate to Homepage |
| Navigation links (Books / DVDs / CDs) | Click | Filter product list by selected media type |
| Search input | Type | Enter keywords to search by title, author, or keyword |
| Search button | Click | Submit search query and reload product grid |
| Cart button (header) | Click | Navigate to Cart screen; badge shows item count |
| Category checkboxes | Check / Uncheck | Filter product list by selected categories |
| Price Min / Max inputs | Type | Enter price range in VND |
| Apply button (price filter) | Click | Apply price range filter to product grid |
| Sort dropdown | Select | Sort products: Default / Price Low–High / Price High–Low / Newest |
| Product card – Detail button | Click | Navigate to Product Detail screen |
| Product card – "+ Cart" button | Click | Add 1 unit to cart; cart badge increments |
| Pagination buttons | Click | Navigate to the selected page of results |

### FIELD ATTRIBUTES
| No. | Item | Max Length | Type | Color | Remarks |
|---|---|---|---|---|---|
| 1 | Search input | 200 chars | Text | #111827 text, #D1D5DB border | Placeholder: "Search by title, author, keyword…" |
| 2 | Price Min input | 10 chars | Number (integer) | #111827 text, #D1D5DB border | Digits only; placeholder "Min" |
| 3 | Price Max input | 10 chars | Number (integer) | #111827 text, #D1D5DB border | Must be ≥ Min; placeholder "Max" |
| 4 | Product title (card) | 80 chars display | Text (read-only) | #111827, weight 600 | Truncated with ellipsis if overflows |
| 5 | Product author (card) | 60 chars display | Text (read-only) | #9CA3AF | Secondary label below title |
| 6 | Product price (card) | — | Currency (read-only) | #DC2626, weight 700 | Format: #,### VND |
| 7 | Sort dropdown | — | Enum (select) | #374151, #D1D5DB border | Options: Default / Price: Low to High / Price: High to Low / Newest First |

---

| AIMS Software | Date of creation | Approved by | Reviewed by | Person in charge |
|---|---|---|---|---|
| Screen specification: **Product Detail** | 20/4/2026 | AnhTV | AnhNT | MinhHN |

## Product Detail

### CONTROLS / OPERATIONS / FUNCTIONS
| Control | Operation | Function |
|---|---|---|
| Header (Logo / Nav / Search / Cart) | Click | Global navigation — same as Homepage |
| Breadcrumb (Home › Category › Title) | Click link | Navigate back to Homepage or category listing |
| Product image area | Display only | Shows media type badge (BOOK / DVD / CD) |
| Quantity "−" button | Click | Decrease quantity by 1; minimum is 1 |
| Quantity input field | Type | Manually enter desired quantity; validated against stock |
| Quantity "+" button | Click | Increase quantity by 1; maximum is current stock |
| "Add to Cart" button | Click | Add selected quantity to cart; cart badge increments |
| "← Back" button | Click | Return to previous screen |

### FIELD ATTRIBUTES
| No. | Item | Max Length | Type | Color | Remarks |
|---|---|---|---|---|---|
| 1 | Product category badge | — | Text (read-only) | #1D4ED8 text, #EFF6FF bg | E.g., "Book · Science" |
| 2 | Product title | 150 chars | Text (read-only) | #111827, 22 px, weight 700 | Main heading of the page |
| 3 | Author / Director / Artist | 100 chars | Text (read-only) | #6B7280, 13 px | Prefixed with "by" |
| 4 | Price | — | Currency (read-only) | #DC2626, 28 px, weight 700 | Format: #,### VND |
| 5 | Publisher / Studio / Label | 80 chars | Text (read-only) | #374151 | Shown in meta grid |
| 6 | Publication Year | 4 chars | Year (read-only) | #374151 | 4-digit year, e.g. 2015 |
| 7 | Stock availability | — | Integer (read-only) | #059669 text, #ECFDF5 bg | Badge "In Stock (n)" |
| 8 | Quantity input | 4 chars | Integer (1 – stock) | #111827 text, #D1D5DB border | Default 1; cannot exceed available stock |
| 9 | Description text | 1000 chars display | Text (read-only) | #6B7280, line-height 1.7 | Shown in description card block |

---

| AIMS Software | Date of creation | Approved by | Reviewed by | Person in charge |
|---|---|---|---|---|
| Screen specification: **Cart** | 20/4/2026 | MinhHN | AnND | HuyDD |

## Cart

### CONTROLS / OPERATIONS / FUNCTIONS
| Control | Operation | Function |
|---|---|---|
| Header (Logo / Nav / Search / Cart) | Click | Global navigation; cart badge shows total items |
| Item "−" quantity button | Click | Decrease item quantity by 1; if 0, item is removed |
| Item quantity input | Type | Manually set quantity; recalculates item total and summary |
| Item "+" quantity button | Click | Increase item quantity by 1; capped at available stock |
| Delete "×" button (per row) | Click | Remove item from cart; summary recalculates |
| "← Continue Shopping" button | Click | Navigate back to Homepage |
| "Place Order →" button | Click | Navigate to Place Order screen; disabled if cart is empty |

### FIELD ATTRIBUTES
| No. | Item | Max Length | Type | Color | Remarks |
|---|---|---|---|---|---|
| 1 | Item title (cart row) | 80 chars display | Text (read-only) | #111827, weight 600 | Truncated if overflows column |
| 2 | Item sub-label (author/director) | 60 chars display | Text (read-only) | #9CA3AF, 12 px | Secondary label below title |
| 3 | Unit price (cart row) | — | Currency (read-only) | #374151 | Format: #,### VND |
| 4 | Quantity input (cart row) | 4 chars | Integer (1–stock) | #111827 text, #D1D5DB border | Real-time update of item total on change |
| 5 | Item total (cart row) | — | Currency (read-only) | #DC2626, weight 700 | = unit price × quantity; format: #,### VND |
| 6 | Subtotal (summary) | — | Currency (read-only) | #374151 | Sum of all item totals |
| 7 | Shipping fee (summary) | — | Currency (read-only) | #374151 | Fixed 30,000 VND |
| 8 | VAT (summary) | — | Currency (read-only) | #374151 | 10% of subtotal |
| 9 | Total (summary) | — | Currency (read-only) | #DC2626, 18 px, weight 700 | Subtotal + shipping + VAT; format: #,### VND |

---

| AIMS Software | Date of creation | Approved by | Reviewed by | Person in charge |
|---|---|---|---|---|
| Screen specification: **Delivery Info** | 20/4/2026 | HuyDD | AnhTV | AnhNT |

## Delivery Info

### CONTROLS / OPERATIONS / FUNCTIONS
| Control | Operation | Function |
|---|---|---|
| Header (Logo / Nav / Search / Cart) | Click | Global navigation — same as other screens |
| Full Name input | Type | Enter recipient's full name for delivery |
| Phone Number input | Type | Enter contact phone number for delivery |
| Delivery Address input | Type | Enter street, district, and city |
| Note input (optional) | Type | Delivery instructions or landmark; max 100 words |
| "Proceed to Invoice →" button | Click | Validate required fields; if valid, navigate to Invoice screen |
| "← Back to Cart" button | Click | Return to Cart without saving changes |

### FIELD ATTRIBUTES
| No. | Item | Max Length | Type | Color | Remarks |
|---|---|---|---|---|---|
| 1 | Full Name | 100 chars | Text | #111827 text, #D1D5DB border (focus: #1D4ED8) | Required (*); letters and spaces only |
| 2 | Phone Number | 15 chars | Text (phone) | #111827 text, #D1D5DB border (focus: #1D4ED8) | Required (*); 10 digits; starts with 0 |
| 3 | Delivery Address | 200 chars | Text | #111827 text, #D1D5DB border (focus: #1D4ED8) | Required (*); street, district, city |
| 4 | Note | 100 words | Text | #111827 text, #D1D5DB border (focus: #1D4ED8) | Optional; word counter shown; blocked at limit |
| 5 | Order item name (summary) | 60 chars display | Text (read-only) | #111827, weight 500 | Truncated if overflows |
| 6 | Order item price (summary) | — | Currency (read-only) | #374151, weight 600 | Format: #,### VND |
| 7 | Total (summary) | — | Currency (read-only) | #DC2626, 18 px, weight 700 | Subtotal + shipping + VAT; format: #,### VND |

---

| AIMS Software | Date of creation | Approved by | Reviewed by | Person in charge |
|---|---|---|---|---|
| Screen specification: **Invoice** | 20/4/2026 | AnND | HuyDD | AnhTV |

## Invoice

### CONTROLS / OPERATIONS / FUNCTIONS
| Control | Operation | Function |
|---|---|---|
| Header (Logo / Nav / Search / Cart) | Click | Global navigation — same as other screens |
| Progress steps indicator | Display only | Shows current step (Invoice = step 3 of 4); steps 1–2 marked done |
| Invoice banner (No. / Date) | Display only | Shows auto-generated invoice number and creation timestamp |
| Delivery info block | Display only | Read-only summary of name, phone, address, note from Delivery Info screen |
| Items table | Display only | Lists each item: product name, unit price, quantity, subtotal |
| Totals block | Display only | Shows subtotal, shipping fee, VAT (10%), and grand total |
| "Proceed to Payment →" button | Click | Navigate to Payment screen; passes invoice data |
| "← Back to Delivery Info" button | Click | Return to Delivery Info screen; delivery data is preserved |

### FIELD ATTRIBUTES
| No. | Item | Max Length | Type | Color | Remarks |
|---|---|---|---|---|---|
| 1 | Invoice number | — | Text (read-only) | #1D4ED8, weight 700 | Format: #INV-YYYYMMDD-NNNN; system-generated |
| 2 | Invoice date | — | Timestamp (read-only) | #6B7280 | Format: DD/MM/YYYY HH:mm |
| 3 | Recipient name | 100 chars | Text (read-only) | #111827, weight 500 | Carried over from Delivery Info |
| 4 | Phone number | 15 chars | Text (read-only) | #111827, weight 500 | Carried over from Delivery Info |
| 5 | Delivery address | 200 chars | Text (read-only) | #111827, weight 500 | Carried over from Delivery Info |
| 6 | Item name (table row) | 80 chars display | Text (read-only) | #111827, weight 500 | Truncated with ellipsis if overflows |
| 7 | Item unit price (table row) | — | Currency (read-only) | #374151 | Format: #,### VND |
| 8 | Item quantity (table row) | — | Integer (read-only) | #374151, center-aligned | As set in Cart |
| 9 | Item subtotal (table row) | — | Currency (read-only) | #DC2626, weight 600, right-aligned | unit price × quantity; format: #,### VND |
| 10 | Grand total (sidebar) | — | Currency (read-only) | #DC2626, 20 px, weight 700 | Subtotal + shipping + VAT; format: #,### VND |

---

| AIMS Software | Date of creation | Approved by | Reviewed by | Person in charge |
|---|---|---|---|---|
| Screen specification: **Payment** | 20/4/2026 | AnhTV | AnhNT | MinhHN |

## Payment

### CONTROLS / OPERATIONS / FUNCTIONS
| Control | Operation | Function |
|---|---|---|
| Header (Logo / Nav / Search / Cart) | Click | Global navigation — same as other screens |
| Progress steps indicator | Display only | Shows current step (Payment = step 4 of 4); steps 1–3 marked done |
| Credit/Debit Card tab | Select | Switch to card payment mode; reveals card detail fields |
| Cash on Delivery tab | Select | Switch to COD mode; card fields are hidden |
| Card Number input | Type | Enter 16-digit card number |
| Cardholder Name input | Type | Enter name as it appears on card |
| Expiry Date input | Type | Enter MM/YY expiry |
| CVV input | Type | Enter 3-digit security code |
| Order summary sidebar | Display only | Read-only recap of items, invoice reference, and grand total |
| "Pay [amount]" button | Click | Submit payment; shows spinner while processing; navigates to Order Successful or Payment Fail |
| "← Back to Invoice" button | Click | Return to Invoice screen; payment data is cleared |

### FIELD ATTRIBUTES
| No. | Item | Max Length | Type | Color | Remarks |
|---|---|---|---|---|---|
| 1 | Payment method tab | — | Enum (radio group) | Active: #1D4ED8 border, #EFF6FF bg | Options: Credit/Debit Card \| Cash on Delivery |
| 2 | Card Number | 19 chars (16 digits + spaces) | Text (card) | #111827 text, #D1D5DB border (focus: #1D4ED8) | Required for card payment; digits only with space grouping |
| 3 | Cardholder Name | 60 chars | Text | #111827 text, #D1D5DB border (focus: #1D4ED8) | Required for card payment; uppercase letters and spaces |
| 4 | Expiry Date | 5 chars (MM/YY) | Text (date) | #111827 text, #D1D5DB border (focus: #1D4ED8) | Required for card payment; must be a future date |
| 5 | CVV | 3 chars | Text (password masked) | #111827 text, #D1D5DB border (focus: #1D4ED8) | Required for card payment; 3 digits |
| 6 | Invoice reference (sidebar) | — | Text (read-only) | #1D4ED8, weight 600 | Format: #INV-YYYYMMDD-NNNN |
| 7 | Grand total (sidebar) | — | Currency (read-only) | #DC2626, 20 px, weight 700 | Matches Invoice screen total; format: #,### VND |

---

| AIMS Software | Date of creation | Approved by | Reviewed by | Person in charge |
|---|---|---|---|---|
| Screen specification: **Payment Fail** | 20/4/2026 | MinhHN | AnND | HuyDD |

## Payment Fail

### CONTROLS / OPERATIONS / FUNCTIONS
| Control | Operation | Function |
|---|---|---|
| Header (Logo / Nav / Search / Cart) | Click | Global navigation — same as other screens |
| Fail icon (×) | Display only | Visual indicator of failed state; red circle with × |
| Error reason card | Display only | Shows the decline reason returned by the payment processor |
| Invoice reference block | Display only | Shows invoice number and total amount of the failed attempt |
| "Try Again" button | Click | Navigate back to Payment screen; retains invoice data |
| "← Return to Cart" button | Click | Navigate to Cart screen; cart items are preserved |
| "Contact support" link | Click | Opens support contact page or email client |

### FIELD ATTRIBUTES
| No. | Item | Max Length | Type | Color | Remarks |
|---|---|---|---|---|---|
| 1 | Fail icon | — | Icon (read-only) | #DC2626, #FEF2F2 bg circle | 80×80 px circle; stroke-based × icon |
| 2 | Error reason message | 200 chars display | Text (read-only) | #7F1D1D text, #FEF2F2 bg card | System-provided decline reason; e.g. "Insufficient funds" |
| 3 | Invoice number | — | Text (read-only) | #111827, weight 600 | Format: #INV-YYYYMMDD-NNNN |
| 4 | Failed amount | — | Currency (read-only) | #DC2626, 16 px, weight 700 | Amount that was attempted; format: #,### VND |

---

| AIMS Software | Date of creation | Approved by | Reviewed by | Person in charge |
|---|---|---|---|---|
| Screen specification: **Order Successful** | 20/4/2026 | AnhTV | MinhHN | AnhNT |

## Order Successful

### CONTROLS / OPERATIONS / FUNCTIONS
| Control | Operation | Function |
|---|---|---|
| Header (Logo / Nav / Search / Cart) | Click | Global navigation; cart badge resets to 0 |
| Success icon (✓) | Display only | Visual confirmation of successful order; green circle with checkmark |
| Order number banner | Display only | Shows the confirmed order number and order date |
| Delivery info card | Display only | Read-only summary of recipient name, phone, address, note, and payment method |
| Items ordered card | Display only | Read-only list of all items with type, quantity, subtotal, and grand total paid |
| "Continue Shopping →" button | Click | Navigate to Homepage / Product List; cart is cleared |

### FIELD ATTRIBUTES
| No. | Item | Max Length | Type | Color | Remarks |
|---|---|---|---|---|---|
| 1 | Success icon | — | Icon (read-only) | #059669, #ECFDF5 bg circle | 80×80 px circle; stroke-based ✓ icon |
| 2 | Order number | — | Text (read-only) | #111827, 16 px, weight 700 | Format: #ORD-YYYYMMDD-NNNN; system-generated |
| 3 | Order date | — | Timestamp (read-only) | #374151 | Format: DD/MM/YYYY HH:mm |
| 4 | Recipient name | 100 chars | Text (read-only) | #111827, weight 500 | Carried over from Delivery Info |
| 5 | Phone number | 15 chars | Text (read-only) | #111827, weight 500 | Carried over from Delivery Info |
| 6 | Delivery address | 200 chars | Text (read-only) | #111827, weight 500 | Carried over from Delivery Info |
| 7 | Payment method | — | Text (read-only) | #111827, weight 500 | E.g. "Credit / Debit Card" or "Cash on Delivery" |
| 8 | Item name (row) | 80 chars display | Text (read-only) | #111827, weight 500 | Truncated with ellipsis if overflows |
| 9 | Item type & quantity (row) | — | Text (read-only) | #9CA3AF, 12 px | E.g. "Book · ×2" |
| 10 | Item subtotal (row) | — | Currency (read-only) | #374151, weight 600 | Format: #,### VND |
| 11 | Total paid | — | Currency (read-only) | #DC2626, 22 px, weight 700 | Final paid amount; format: #,### VND |
