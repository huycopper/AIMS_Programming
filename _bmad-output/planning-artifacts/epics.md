---
stepsCompleted:
  - "Step 1: Validate Prerequisites and Extract Requirements"
  - "Step 2: Design Epics"
  - "Step 3: Create Stories"
  - "Step 4: Final Validation"
inputDocuments:
  - "Context/AIMS-ProblemStatement-ver3.1.1.md"
  - "Context/TEAM-20SoftwareRequirementSpecification-Ver1.2.md"
  - "Context/Group20-ClassDesignSpecification.md"
  - "Context/DatabaseDescription.md"
  - "Context/ScreenSpecifications.md"
  - "Context/ScreenStandardizationRequirements.md"
---

# AIMS_Programming - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for AIMS_Programming, decomposing the requirements from the PRD, UX Design, and Architecture specifications into implementable stories.

## Requirements Inventory

### Functional Requirements

- **FR1:** Allow customers to browse, search, and filter physical products (books, newspapers, CDs, DVDs) without authentication.
- **FR2:** Retrieve general and type-specific information and display details when a product is selected.
- **FR3:** Enable customers to add products to a shopping cart with specific quantities.
- **FR4:** Support viewing the shopping cart, updating quantities, and removing items, updating the subtotal and weight.
- **FR5:** Enable placing orders checking stock availability, entering delivery details (name, email, phone, province, address, note).
- **FR6:** Calculate shipping fee dynamically based on weight and location: Hanoi/HCM (first 3kg = 22,000 VND), elsewhere (first 0.5kg = 30,000 VND), and an additional fee of 2,500 VND for every subsequent 0.5kg. Orders with total items exceeding 100,000 VND qualify for free shipping up to 25,000 VND.
- **FR7:** Display an invoice showing a detailed breakdown (subtotal, 10% VAT, shipping fee, total amount).
- **FR8:** Allow payment via VietQR (retrieve access token, generate QR, receive callback, record transaction, update status).
- **FR9:** Allow payment via Credit Card (PayPal Sandbox API) (display card form, process payment, record transaction, update status).
- **FR10:** Enable Product Managers to Create, Update, and Delete products. Check price constraints (30% to 150% of original value). Delete up to 10 products simultaneously, limit 20 per day. Product is deactivated if stock > 0, deleted if stock = 0.
- **FR11:** Enable Product Managers to review orders (30/page) and approve/reject. Rejection triggers automatic refund (PayPal) or manual refund notification (VietQR).
- **FR12:** Enable Administrators to manage user accounts (create, view, deactivate, block, unblock) and assign roles.
- **FR13:** Support audit logging: history logs for product additions/edits/deletions, sensitive admin actions, and payment transactions.
- **FR14:** Support automated email notifications for successful payment, order approval/rejection, and sensitive admin actions.

### NonFunctional Requirements

- **NFR1:** Serve up to 1,000 concurrent customers.
- **NFR2:** Maximum response time of 2 seconds (5 seconds peak).
- **NFR3:** Operate continuously for 300 hours.
- **NFR4:** Securely hash passwords (bcrypt).
- **NFR5:** Role-Based Access Control (RBAC) on the backend.
- **NFR6:** Transaction integrity maintained on payment failure.

### Additional Requirements

- **AR1:** Use PostgreSQL 18 with the schema defined in `DatabaseDescription.md`.
- **AR2:** Store complex attributes (authors, artists, tracks, subtitles, sections) as JSONB columns in the products extension tables.
- **AR3:** Use Boundary-Control-Entity architectural pattern as defined in `Group20-ClassDesignSpecification.md`.

### UX Design Requirements

- **UX-DR1:** Homepage displays 20 random products initially.
- **UX-DR2:** Cart screen displays subtotal, weight, and inline stock warning banners for insufficient quantities.
- **UX-DR3:** Delivery form recalculates shipping fee in real-time when the province or address changes.
- **UX-DR4:** Invoice screen displays payment selection (VietQR default, PayPal alternative) and full breakdown.
- **UX-DR5:** VietQR payment displays a QR code overlay with a waiting spinner.
- **UX-DR6:** Success screen shows order confirmation and payment transaction details.

### FR Coverage Map

- **Epic 1:** FR1, FR2, FR3, FR4, UX-DR1, UX-DR2, AR3
- **Epic 2:** FR5, FR6, FR7, UX-DR3, AR3
- **Epic 3:** FR8, FR9, UX-DR4, UX-DR5, UX-DR6, NFR6, AR3
- **Epic 4:** FR10, FR13, AR1, AR2, AR3
- **Epic 5:** FR11, FR12, FR13, FR14, NFR4, NFR5, AR1, AR3

---

## Epic List

- **Epic 1:** Product Catalog & Cart Management
- **Epic 2:** Checkout & Delivery Fee Calculation
- **Epic 3:** Payment Processing Integration
- **Epic 4:** Product Catalog Administration
- **Epic 5:** Order Processing & User Management

---

## Epic 1: Product Catalog & Cart Management

This epic covers browsing products, searching and filtering, viewing product details, and managing the shopping cart session.

### Story 1.1: Browse and Search Products
As a Customer,
I want to browse, search, and filter physical media products,
So that I can find products of interest without logging in.

**Acceptance Criteria:**

**Given** the customer is on the homepage
**When** the homepage loads
**Then** the system displays 20 random products (books, newspapers, CDs, DVDs) (UX-DR1)

**Given** the customer wants to search or filter products
**When** they enter a search query (by product title or category) or filter by price range (e.g., under 100,000 VND, 100,000–200,000 VND, etc.)
**Then** the system displays all matching products on each page and retrieves general and type-specific information (FR1, FR2)

---

### Story 1.2: Add and Manage Cart Items
As a Customer,
I want to add products to my cart and modify their quantities,
So that I can prepare my purchase.

**Acceptance Criteria:**

**Given** the customer is viewing a product page or listing
**When** they enter a quantity and click "Add to Cart"
**Then** the system validates stock availability, adds the item, and updates the cart (FR3)
**And** displays an inline error banner if the requested quantity exceeds stock (UX-DR2)

**Given** the customer is viewing the Cart screen
**When** they update item quantities or remove items
**Then** the system recalculates the subtotal (excluding VAT) and total weight dynamically (FR4, UX-DR2)

---

## Epic 2: Checkout & Delivery Fee Calculation

This epic covers order creation, entering delivery information, and dynamic shipping calculations.

### Story 2.1: Place Order & Calculate Shipping
As a Customer,
I want to submit delivery details and view my invoice,
So that I can see the final cost break-down including shipping before payment.

**Acceptance Criteria:**

**Given** the customer has items in the cart
**When** they click "Place Order"
**Then** the system prompts them to enter delivery information (FR5)

**Given** the customer is on the delivery form
**When** they change their province or address
**Then** the system calculates the shipping fee dynamically: Hanoi/HCM (first 3kg = 22,000 VND), elsewhere (first 0.5kg = 30,000 VND), with an additional fee of 2,500 VND for every subsequent 0.5kg, and applies up to 25,000 VND discount if total is > 100,000 VND (FR6, UX-DR3)

**Given** the customer submits valid delivery info
**When** the invoice loads
**Then** it displays subtotal, 10% VAT, shipping fee, and total amount to pay (FR7, UX-DR4)

---

## Epic 3: Payment Processing Integration

This epic covers the integration of PayPal Sandbox (Credit Card) and VietQR payment methods.

### Story 3.1: Pay with Credit Card via PayPal
As a Customer,
I want to pay for my order securely using my credit card via PayPal,
So that my payment is captured instantly and my order is placed.

**Acceptance Criteria:**

**Given** the customer is on the invoice screen and chooses Credit Card
**When** they enter credit card details and confirm payment
**Then** the system processes the capture synchronously with PayPal Sandbox API (FR9)
**And** updates the order status to `PENDING_PROCESSING`, records the payment transaction in the DB, empties the cart, and displays the success screen showing transaction details (FR9, UX-DR6)

---

### Story 3.2: Pay with QR Code via VietQR
As a Customer,
I want to pay for my order by scanning a VietQR code,
So that I can pay easily from my mobile banking app.

**Acceptance Criteria:**

**Given** the customer is on the invoice screen and selects VietQR
**When** they request payment
**Then** the system fetches a VietQR access token and generates a QR code image to display with a waiting spinner (FR8, UX-DR5)

**Given** the QR code is displayed
**When** the banking system sends a payment callback to AIMS
**Then** the system validates the callback, records the transaction, updates the order status to `PENDING_PROCESSING`, empties the cart, and displays the success screen (FR8, UX-DR6)

---

### Story 3.3: Refactor and Stabilize Pay by VietQR Contracts
As a Developer,
I want the Pay by VietQR implementation to have stable contracts and clear ownership,
So that the existing payment behavior can be maintained safely and extended without AI-generated technical debt.

**Acceptance Criteria:**

**Given** the current Pay by VietQR happy path exists
**When** the refactor is performed
**Then** user-visible behavior remains unchanged for QR generation, payment confirmation, success display, cart emptying, and payment success email.

**Given** VietQR sends Transaction Sync
**When** the callback reaches AIMS
**Then** the canonical callback endpoint is `POST /bank/api/transaction-sync`, with any `/vqr` prefix treated only as an explicitly documented deployment/base-path decision.

**Given** AIMS receives a Transaction Sync payload
**When** required fields are missing or invalid
**Then** the request is rejected with the documented VietQR error response shape and no transaction is persisted.

**Given** multiple customers pay concurrently
**When** they generate QR codes and confirm payment
**Then** no confirmation depends on mutable singleton access-token state from another request.

**Given** a successful VietQR payment
**When** AIMS persists the transaction
**Then** the persisted fields match the approved database contract and use the approved payment method value.

**Given** the implementation is refactored
**When** tests run
**Then** tests cover QR generation orchestration, token handling, Transaction Sync validation, amount/content mismatch, order status update, duplicate/idempotent callback behavior, and customer-cancel manual refund.

---

## Epic 4: Product Catalog Administration

This epic covers product management actions and logging for Product Managers.

### Story 4.1: Product Management CRUD
As a Product Manager,
I want to create, update, and delete products,
So that the online store catalog stays current and accurate.

**Acceptance Criteria:**

**Given** the Product Manager is logged in
**When** they create or update a product
**Then** the system validates that the current price is between 30% and 150% of the original value (FR10)
**And** stores CD/DVD/book/newspaper specific properties in JSONB columns (AR2)
**And** records the action details in the product histories log table (FR13)

**Given** the Product Manager wants to delete products
**When** they submit a deletion request
**Then** the system enforces a limit of 10 products per request and 20 per day (FR10)
**And** deactivates the product if stock > 0, or deletes it from the database if stock = 0 (FR10)

---

## Epic 5: Order Processing & User Management

This epic covers backend administration of orders, refund handling, user account management, and role-based access control.

### Story 5.1: Order Fulfillment
As a Product Manager,
I want to review pending orders and either approve or reject them,
So that I can manage order fulfillment and process refunds.

**Acceptance Criteria:**

**Given** the Product Manager is logged in
**When** they navigate to order review
**Then** the system lists pending orders with pagination (30 per page) (FR11)

**Given** the Product Manager approves an order
**When** they confirm the action
**Then** the system updates the order status to `APPROVED` and sends a notification email to the customer (FR11, FR14)

**Given** the Product Manager rejects an order
**When** they confirm the action
**Then** the system updates the order status to `REJECTED` and triggers an automatic refund (for PayPal) or records a manual refund requirement (for VietQR), and sends a notification email to the customer (FR11, FR14)

---

### Story 5.2: User Management & RBAC
As an Administrator,
I want to manage user accounts and assign roles,
So that I can control access to the administration portal.

**Acceptance Criteria:**

**Given** the Administrator is logged in
**When** they create or modify user accounts or assign roles
**Then** the system encrypts passwords using bcrypt and saves changes in the PostgreSQL DB (NFR4, AR1)
**And** logs sensitive administration actions in the audit log (FR13)

**Given** a user is logged in
**When** they attempt to access backend endpoints or UI pages
**Then** the NestJS backend and Angular router enforce RBAC permissions based on the user's roles (NFR5)
