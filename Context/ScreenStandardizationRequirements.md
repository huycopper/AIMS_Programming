# Screen Layout

The screen layout defines the arrangement of interface components across all screens in AIMS. A consistent layout ensures users can navigate the application intuitively without relearning structure on each page.

## 1.1 RESOLUTION & VIEWPORT

- **Minimum resolution:** 1366 × 768 px (Target for most desktop/laptop screens)
- **Optimal resolution:** 1440 × 900 px (Design reference resolution)
- **Max content width:** 1280 px (Content area is centered with auto margins)
- **Horizontal padding:** 32 px (Applied on both sides of the content area)
- **Target platform:** Desktop web browser (AIMS is a desktop-only web application; no responsive/mobile layout is required)

## 1.2 GLOBAL LAYOUT STRUCTURE

- **Header:** Top, full width, fixed. 60 px. Contents: Logo, navigation links, search bar, cart button.
- **Sidebar:** Left of content area. 200 px wide. Contents: Category filters, price range filter (homepage only).
- **Main content:** Right of sidebar / full width. Flexible. Contents: Primary screen content.
- **Page title:** Top of main content area, left-aligned. 22 px font. Contents: Name of the current screen; left-aligned to align with body content.

## 1.3 STANDARD ELEMENT POSITIONS

- **Logo:** Top-left corner of the header.
- **Navigation links:** Inline in the header, immediately right of the logo (left-center zone).
- **Search bar:** Center of the header, flexible width.
- **Cart button:** Top-right corner of the header.
- **Primary action buttons** (Add to Cart, Place Order, Confirm): Bottom-right of the form or content card, full-width inside summary panels.
- **Back/Cancel buttons:** Left of or below primary action buttons.
- **Close button (X):** Top-right corner of any popup or modal dialog.

# 2 UI Kit

The UI Kit defines all visual design tokens used across AIMS screens.

## 2.1 TYPOGRAPHY

**Font family:** Inter (Google Fonts). Fallback: system-ui, sans-serif.

- **Page Title:** 22 px · Bold 700
- **Section Title:** 15 px · Bold 700
- **Subsection:** 14 px · SemiBold 600
- **Body:** 13 px · Regular 400
- **Caption:** 12 px · Regular 400
- **Label / Badge:** 11 px · SemiBold 600

## 2.2 COLOR PALETTE

- **Primary Blue:** #1D4ED8
- **Price / Accent:** #DC2626
- **Text Primary:** #111827
- **Text Secondary:** #374151
- **Text Muted:** #6B7280
- **Background:** #F9FAFB
- **Border:** #E5E7EB
- **Success / Stock:** #059669

## 2.3 SPACING SCALE

- **XS:** 4 px (Gap between icon and label, tight inline elements)
- **S:** 8 px (Gap between form label and input, badge padding)
- **M:** 12 px (Card internal padding (tight), between list items)
- **L:** 16 px (Card internal padding (standard), section gap)
- **XL:** 24 px (Between major layout sections)
- **XXL:** 32 px (Page horizontal padding)

## 2.4 BUTTONS

- **Primary:** Background #1D4ED8, Text #FFFFFF · 14 px Bold. Usage: Main actions (Add to Cart, Place Order, Confirm)
- **Secondary:** Background #FFFFFF, Text #374151 · 14 px Regular, Border 1 px #D1D5DB. Usage: Back, Cancel, Continue Shopping
- **Small:** Background #FFFFFF, Text #374151 · 12 px Regular, Border 1 px #D1D5DB. Usage: Detail, inline actions on product cards

**General Button Rules:**

- Border radius: 6 px for all buttons.
- Padding: 12 px top/bottom for primary; 6 px top/bottom for small.
- Disabled state: opacity 0.4, cursor not-allowed.

## 2.5 ICONS

- **Icon set:** Heroicons (outline style) or equivalent stroke-based icon set.
- **Size:** 16 × 16 px for inline icons; 20 × 20 px for standalone icons.
- **Stroke width:** 2 px.
- **Color:** Inherits from surrounding text color; primary actions use #1D4ED8.

## 2.6 FORM INPUTS

- **Default:** Border 1 px #D1D5DB, Background #FFFFFF, Placeholder text: #D1D5DB
- **Focus:** Border 1 px #1D4ED8, Background #FFFFFF, Box shadow: 0 0 0 2px #DBEAFE
- **Error:** Border 1 px #EF4444, Background #FEF2F2, Error message shown below input
- **Disabled:** Border 1 px #E5E7EB, Background #F9FAFB, Text: #9CA3AF, cursor not-allowed

# 3 Data Formatting

## 3.1 CURRENCY

- **Unit:** VND, shown as suffix (e.g., 229,000 VND)
- **Thousands separator:** Comma (,)
- **Decimal places:** None (whole numbers only)
- **Price color:** #DC2626 (red)

## 3.2 NUMBERS

- **Large numbers:** Comma separator every 3 digits (e.g., 1,280 pages)
- **Quantity:** Integer, no separator needed (e.g., 20, 3, 142)
- **Percentage:** Integer followed by % (e.g., 10%)

## 3.3 DATE & TIME

- **Publication year:** YYYY (e.g., 2015)
- **Order date:** DD/MM/YYYY (e.g., 20/04/2026)
- **Timestamp:** DD/MM/YYYY HH:mm (e.g., 20/04/2026 14:30)

## 3.4 TEXT

- **Product title (card):** Display up to 2 lines, Overflow: ellipsis (...)
- **Author name:** Display up to 1 line, Overflow: ellipsis (...)
- **Delivery note:** 100 words, Counter shown, input blocked at limit
- **Search input:** 200 characters, Hard limit on input

_Note: Only UTF-8 characters are accepted in all input fields. HTML tags and script injections must be stripped before display._

# 4 Control Rules

## 4.1 INPUT VALIDATION

- **Full Name:** Required. Non-empty, text only, max 100 chars. Error: "Please enter your full name."
- **Phone Number:** Required. 10 digits, starts with 0. Error: "Please enter a valid Vietnamese phone number."
- **Delivery Address:** Required. Non-empty, max 200 chars. Error: "Please enter a delivery address."
- **Quantity (cart):** Required. Integer >= 1, <= stock available. Error: "Quantity must be between 1 and [stock]."
- **Search input:** Optional. Max 200 chars.

_Validation Rules:_

- Error messages are displayed directly below the corresponding input field in red (#EF4444).
- The form submission button is not disabled while inputs are invalid — validation triggers on submit click.
- After a failed submit, the first invalid field receives focus automatically.

## 4.2 NAVIGATION & FOCUS

- **Tab order:** Follows the visual top-to-bottom, left-to-right reading order on all forms.
- **Back button:** Every screen (except Homepage) provides a visible "<- Back" button.
- **Keyboard shortcuts:** None required.
- **Browser back button:** Supported.
- **Application startup flow:** User lands directly on the Homepage. Initial data is fetched silently with a loading indicator.
- **Secondary / dependent screens:** Displayed as modal popups overlaying the parent.

## 4.3 SCREEN INVENTORY

- `01_Homepage.html`: Landing page; links to Product List
- `01_Homepage.html`: Browsable product grid with sidebar filters and search
- `02_ProductDetail.html`: Modal popup over Product List showing full item info
- `03_Cart.html`: Item list with quantities, subtotal, and Place Order action
- `04_PlaceOrder.html`: Form for name, phone, address, and delivery note
- `05_Invoice.html`: Read-only order review combining cart items and delivery info
- `06_Payment.html`: Payment method selection and card details entry
- `07_PaymentFail.html`: Error state after failed payment; offers retry or return to Cart
- `08_OrderSuccessful.html`: Confirmation of placed order

## 4.4 SCREEN TRANSITIONS

- **Open application:** -> Homepage / Product List
- **Click "Detail" on product card:** Product List -> Product Details (Modal popup)
- **Click "Add to Cart":** Product Details -> Cart
- **Click "Place Order":** Cart -> Delivery Info
- **Click "Proceed to Invoice":** Delivery Info -> Invoice
- **Click "Proceed to Payment":** Invoice -> Payment
- **Payment succeeds:** Payment -> Order Successful
- **Payment fails:** Payment -> Payment Fail
- **Click "Try Again":** Payment Fail -> Payment
- **Click "Return to Cart":** Payment Fail -> Cart
- **Click "<- Back":** Any (except Homepage) -> Previous screen
- **Click "Continue Shopping":** Cart or Order Successful -> Homepage / Product List

## 4.5 ERROR HANDLING

- **Field-level errors:** Shown inline, below the affected input, in red text (12 px).
- **System errors:** Shown as a banner at the top of the page with a neutral background (#FEF3C7) and warning text.
- **Empty states:** Displayed in the main content area with a short descriptive message.
- **Out-of-stock:** "Add to Cart" button is disabled; stock badge changes to red with text "Out of Stock".

## 4.6 LOADING & FEEDBACK

- Buttons show a loading indicator (spinner) while an async operation is in progress.
- Successful actions show a brief status update (e.g. cart count increments).
