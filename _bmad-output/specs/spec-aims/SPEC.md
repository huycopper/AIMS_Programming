---
id: SPEC-aims
companions:
  - "../../../Context/AIMS-ProblemStatement-ver3.1.1.md"
  - "../../../Context/TEAM-20SoftwareRequirementSpecification-Ver1.2.md"
  - "../../../Context/Group20-ClassDesignSpecification.md"
  - "../../../Context/DatabaseDescription.md"
  - "../../../Context/ScreenSpecifications.md"
  - "../../../Context/ScreenStandardizationRequirements.md"
sources: []
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability only — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# Internet Media Store (AIMS)

## Why

AIMS (An Internet Media Store) exists to address the need for a modern, reliable, and user-friendly e-commerce platform dedicated to physical media (books, newspapers, CDs, DVDs). The system replaces manual sales workflows with an automated, 24/7 web-based ordering and management flow. It enables customers to browse and buy physical products with accurate inventory and shipping fee calculations while providing store staff (Product Managers, Admins) with secure tools to manage catalog data, orders, and user roles.

## Capabilities

- id: CAP-1
  intent: Customers can search, filter, and view physical products (books, newspapers, CDs, DVDs) without authentication.
  success: Product catalog page retrieves and displays up to 20 random products initially, and correctly displays type-specific details (e.g. authors for books, artists for CDs, director for DVDs, editor-in-chief for newspapers).

- id: CAP-2
  intent: Customers can add products to a shopping cart and manage cart item quantities.
  success: Cart correctly updates subtotal (excluding VAT) and total weight, validates stock in real-time, and rejects quantities exceeding available stock.

- id: CAP-3
  intent: Customers can place an order by entering delivery information.
  success: The system calculates the shipping fee dynamically based on location (Hanoi/HCM vs elsewhere) and weight, applies shipping discounts if the order is > 100,000 VND, and displays an invoice page showing subtotal, 10% VAT, shipping fee, and total amount to pay.

- id: CAP-4
  intent: Customers can pay for their order via VietQR.
  success: System retrieves an access token, generates a QR code, monitors the transaction via callback, updates the order status to "PENDING_PROCESSING", and sends a confirmation email to the customer.

- id: CAP-5
  intent: Customers can pay for their order via credit card (PayPal Sandbox).
  success: System collects credit card information, captures the payment synchronously through PayPal checkout API, updates order status to "PENDING_PROCESSING", empty cart, and displays the success screen.

- id: CAP-6
  intent: Product Managers can create, update, and delete products (books, CDs, DVDs, newspapers) with validation.
  success: New products are validated (price must be between 30% and 150% of original value). Deletions are limited to 10 at once and 20 per day. Product is deactivated if stock > 0, deleted from DB if stock = 0. All operations are logged in product histories.

- id: CAP-7
  intent: Product Managers can review, approve, or reject orders.
  success: Product Managers see pending orders (30 per page). Approving or rejecting updates the order status. Rejection triggers automatic refund for PayPal or manual refund notification for VietQR, and sends an email to the customer.

- id: CAP-8
  intent: Administrators can manage user accounts and assign roles.
  success: Administrators can create, deactivate, block, or unblock user accounts and assign roles (e.g. PRODUCT_MANAGER, ADMIN). All sensitive admin actions are logged.

## Constraints

- **Technical Stack:** Frontend: Angular. Backend: NestJS. Database: PostgreSQL 18.
- **Architectural Pattern (OOAD Adherence):** The source code MUST strictly follow the design. The design is complete and correctly applies Object-Oriented Analysis and Design (OOAD) steps. Implementation agents are FORBIDDEN from inventing new classes, attributes, or methods that bypass the Boundary-Control-Entity structure defined in `Context/Group20-ClassDesignSpecification.md`.
- **Database Schema:** Tables and constraints must match `Context/DatabaseDescription.md` (e.g. JSONB for multi-valued and complex properties like authors, artists, tracks, subtitles).
- **Taxation Policy:** A flat 10% VAT is applied to all physical media items. Shipping fees are not subject to VAT.
- **Shipping Fee Policy:**
  - Hanoi/HCM: First 3kg is 22,000 VND.
  - Other locations: First 0.5kg is 30,000 VND.
  - Each additional 0.5kg is +2,500 VND.
  - Orders > 100,000 VND receive a shipping discount up to 25,000 VND.
- **Product Deletion Policy:** Maximum 10 products deleted simultaneously. Maximum 20 products deleted per day.
- **Security:** Hashed passwords using bcrypt. Role-based access control (RBAC) on NestJS backend.

## Non-goals

- Support for digital media files or downloads.
- Support for payment methods other than VietQR API and PayPal Sandbox.
- Real-time chat support or customer reviews.

## Success signal

- Fully integrated full-stack application (Angular + NestJS + PostgreSQL) successfully running end-to-end customer checkout flow, automated shipping calculation, QR/Card payment validation, order fulfillment by managers, and user management by administrators in line with all constraint validations.
