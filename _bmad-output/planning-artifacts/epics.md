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
- **FR15:** Enable Administrators and Product Managers to log in using either username or email and to change their own password.

### NonFunctional Requirements

- **NFR1:** Serve up to 1,000 concurrent customers.
- **NFR2:** Maximum response time of 2 seconds (5 seconds peak).
- **NFR3:** Operate continuously for 300 hours.
- **NFR4:** Securely hash passwords (bcrypt).
- **NFR5:** Role-Based Access Control (RBAC) on the backend.
- **NFR6:** Transaction integrity maintained on payment failure.
- **NFR7:** Use signed JWT access tokens for authenticated staff sessions.

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
- **Epic 5:** FR11, FR12, FR13, FR14, FR15, NFR4, NFR5, NFR7, AR1, AR3

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

This epic covers staff authentication, password management, backend administration of orders, refund handling, user account management, and role-based access control.

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

### Story 5.2: Admin Portal Foundation and User Directory
As an Administrator,
I want a guarded administration portal with a user directory,
So that I can inspect staff accounts before performing sensitive account-management actions.

**Acceptance Criteria:**

**Given** Story 5.3 authentication and RBAC primitives are complete
**When** an authenticated user with role `ADMIN` navigates to the administration portal
**Then** Angular allows access to the admin routes and the NestJS backend authorizes the corresponding endpoints with `ADMIN` role metadata (NFR5)
**And** a user without `ADMIN` receives an access-denied UI state and a backend `403 Forbidden`, while unauthenticated users are redirected through the staff login flow.

**Given** the Administrator opens the user directory
**When** the directory loads
**Then** the system lists user accounts from `users` with username, email, status, assigned roles, and non-sensitive identifiers only
**And** the system never returns `users.password_hash`, plaintext passwords, reset tokens, or secret values.

**Given** sensitive administration actions will be implemented by later admin stories
**When** the admin module foundation is added
**Then** the sprint establishes a reusable audit-log control and affected-user notification control for email update, password reset, status change, role change, and account creation events (FR13, FR14)
**And** any additive persistence needed for audit logs or password-reset tokens is justified against the Problem Statement as the highest authority when the derived database description is incomplete.

---

### Story 5.3: Staff Authentication & Password Management
As an Administrator or Product Manager,
I want to authenticate with my staff account and change my own password,
So that I can securely access only the administration capabilities granted by all of my assigned roles.

**Acceptance Criteria:**

**Given** an active staff account with a bcrypt password hash
**When** the staff member submits a valid password and either their unique username or unique email
**Then** the system authenticates the credentials against `users.password_hash` using bcrypt and returns a signed, expiring JWT access token (FR15, NFR4, NFR7)
**And** the token identifies the user and includes all roles assigned through `user_roles`
**And** the system never stores, returns, or logs the plaintext password

**Given** invalid credentials or an account whose status is `DEACTIVATED` or `BLOCKED`
**When** a login is attempted
**Then** the system denies authentication and does not issue a JWT
**And** the response does not reveal whether the username/email, password, or account status caused the failure

**Given** an authenticated staff member with one or more assigned roles
**When** they access a protected backend endpoint or administration UI route
**Then** both the NestJS backend and Angular router enforce RBAC using all roles in the JWT (NFR5)
**And** `ADMIN` grants user-account management, account-status management, and role-assignment capabilities defined in Story 5.2
**And** `PRODUCT_MANAGER` grants product administration and history capabilities defined in Story 4.1 and order-review, approval, and rejection capabilities defined in Story 5.1
**And** a staff member with both roles receives the union of those permissions, while an unassigned permission is denied according to the principle of least privilege

**Given** an authenticated Administrator or Product Manager
**When** they submit their correct current password and a valid new password that meets the configured password policy
**Then** the system replaces `users.password_hash` with a bcrypt hash of the new password (FR15, NFR4)
**And** the old password can no longer be used for subsequent authentication

**Given** an incorrect current password or an invalid new password
**When** the staff member requests a password change
**Then** the system rejects the request without changing `users.password_hash`

---

### Story 5.4: Admin User Creation and Initial Access
As an Administrator,
I want to create staff user accounts and assign their initial roles,
So that new staff members can access only the administration capabilities they need.

**Acceptance Criteria:**

**Given** the Administrator submits a unique username, unique email, and at least one supported role
**When** the create-user request is accepted
**Then** the backend creates a `users` record and `user_roles` records transactionally in PostgreSQL (AR1)
**And** the account receives only the selected roles, with each role name validated against supported roles such as `ADMIN` and `PRODUCT_MANAGER` (FR12)
**And** every stored credential secret is bcrypt-hashed or token-hashed; plaintext passwords are never stored, returned, logged, or displayed to the Administrator (NFR4).

**Given** a new user is created
**When** the system provisions initial access
**Then** the affected user receives an automatic email notification with the appropriate login or password-setup/reset process (FR14)
**And** the creation and role assignment are written to the sensitive admin audit log with actor, affected user, timestamp, action type, and safe before/after metadata (FR13).

**Given** duplicate identity data, unsupported roles, invalid email format, missing roles, or persistence failure
**When** the Administrator submits the create-user form
**Then** the system rejects the request without partial user or role writes and shows safe validation feedback without leaking secrets.

---

### Story 5.5: Admin Account Status and Role Management
As an Administrator,
I want to deactivate, block, unblock, and modify roles for user accounts,
So that access can be changed according to least privilege and operational needs.

**Acceptance Criteria:**

**Given** an authenticated Administrator views a user account
**When** they deactivate, block, or unblock the account
**Then** the backend updates `users.status` to `DEACTIVATED`, `BLOCKED`, or `ACTIVE` according to the requested action (FR12)
**And** Story 5.3's backend guards immediately reject `DEACTIVATED` or `BLOCKED` users on subsequent protected requests (NFR5).

**Given** an authenticated Administrator modifies a user's roles
**When** they add or remove `ADMIN` and/or `PRODUCT_MANAGER`
**Then** the backend updates `user_roles` transactionally and preserves the many-to-many relationship that allows each user to have multiple roles (FR12)
**And** role removals take effect immediately according to Story 5.3's current-database role intersection, while newly added roles require the affected user to obtain a new token.

**Given** a status or role change succeeds
**When** the transaction commits
**Then** the system writes a sensitive admin audit log entry and automatically notifies the affected user (FR13, FR14)
**And** the UI refreshes the user detail and directory state without exposing passwords or secret values.

---

### Story 5.6: Admin Password Reset Trigger
As an Administrator,
I want to trigger a password reset process for a user account,
So that the affected user can regain access without exposing their password to administrators.

**Acceptance Criteria:**

**Given** an authenticated Administrator selects password reset for an existing user
**When** the reset request is accepted
**Then** the backend creates a secure reset process without returning or displaying the user's current password, a plaintext temporary password, or any reusable secret to the Administrator (FR12, NFR4)
**And** any reset token or temporary secret stored by the backend is hashed and bounded by expiration and single-use semantics.

**Given** a password reset is triggered
**When** the reset process is recorded
**Then** the affected user is automatically notified by email (FR14)
**And** the action is written to the sensitive admin audit log with actor, affected user, timestamp, action type, and safe metadata (FR13).

**Given** the affected user completes the reset process
**When** they choose a new password
**Then** the backend enforces the same bcrypt hashing and password policy primitives established by Story 5.3 (NFR4)
**And** the Administrator still cannot view, retrieve, or infer the user's actual password.
