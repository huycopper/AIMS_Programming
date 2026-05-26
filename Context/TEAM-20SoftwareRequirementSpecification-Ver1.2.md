# Software Requirement Specification
## AIMS – An Internet Media Store
Version 1.2
Group 20

---

## Table of contents
1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [Detailed Requirements](#3-detailed-requirements)
4. [Supplementary specification](#4-supplementary-specification)

---

## 1 Introduction

### 1.1 Objective
The purpose of this Software Requirements Specification (SRS) document is to provide a comprehensive architectural overview and detailed description of the functional and non-functional requirements for the AIMS (An Internet Media Store) software system.

This document is intended for:
- **Analysts/Designers:** Understand system requirements.
- **Developers:** Primary reference for implementation.
- **Testers:** Derive test cases.
- **Project Managers:** Overview of system scope, features, and constraints.

### 1.2 Scope
AIMS is an e-commerce software system (web or desktop application) designed for the buying and selling of physical media products, including books, newspapers, CDs, and DVDs.
The software will:
- Allow customers to browse, search, and filter products without authentication.
- Enable customers to add products to a shopping cart, place orders, enter delivery information, and complete payments via VietQR or credit card (PayPal Sandbox).
- Allow product managers to add, view, edit, and delete products, adjust stock quantities, view product operation history, and review pending orders.
- Allow administrators to manage user accounts and roles.
- Provide authentication for administrators and product managers.

The software will not support digital media products or payment gateways other than PayPal Sandbox and VietQR.
Key objectives: Operate 24/7, serve up to 1,000 concurrent customers, max response time 2s (5s peak).

### 1.3 Glossary
| No | Term | Explanation | Example | Note |
|---|---|---|---|---|
| 1 | AIMS | An Internet Media Store | AIMS website | Main system |
| 2 | Customer | External user who browses products, places orders | Buyer of a book | No login required |
| 3 | Product Manager | Internal user managing products and orders | Store staff | Login required |
| 4 | Cart | Temporary collection of products | Shopping cart | |
| 5 | Order | Confirmed request to purchase | Order #AIMS1234 | Created after payment |
| 6 | Invoice | Payment-related summary | Invoice for one order | Generated during ordering |
| 7 | VietQR | External QR-code payment service | VietQR sandbox | |
| 8 | Payment Gateway | External service for card payments | PayPal Sandbox | |
| 9 | VAT | Value-added tax (10%) | 10% VAT | Shipping fee not subject to VAT |
| 10 | Access Token | Authentication token | Bearer token | |
| 11 | Callback | Request sent from payment service to notify result | payment callback | |
| 12 | Pending Processing | Order state after payment but before approval | pending processing | |

### 1.4 References
1. AIMS – Draft 1.
2. AIMS – Problem Statement ver3.1.
3. Lab&Assignment02 – Use Case Specification.
4. Lab&Assignment03 – Software Requirement Specification.
5. [TEMPLATE-EN] SRS v1.2.
6. VietQR API documentation.
7. PayPal Sandbox / payment API documentation.

---

## 2 Overall Description

### 2.1 Survey
AIMS is an online media store for physical media. Main actors:
1. **Customer:** browses, adds to cart, pays.
2. **Product Manager:** creates, updates, deletes products, reviews orders.
3. **Administrator:** manages users and roles.
4. **VietQR / Payment Gateway:** external systems processing payments.

### 2.3 Business process
**2.3.1 Customer Purchasing Process:** 
1. Opens application (shows 20 random products).
2. Searches/filters products.
3. Views product details.
4. Adds products to cart.
5. Views cart.
6. Places order (stock checked).
7. Enters delivery info (shipping fee calculated).
8. Views invoice.
9. Selects payment method (VietQR or PayPal).
10. Pays successfully -> order pending processing -> receives email.
11. May view/cancel order via email links.

**2.3.2 Product Management Process:** 
1. Logs in.
2. Selects add, edit, or delete.
3. Adding/Editing: Validates input (30%-150% price constraint) and updates DB.
4. Deleting: Max 10 at once, 20/day limit. Stock=0 deleted, Stock>0 deactivated.
5. All operations recorded in history log.

**2.3.3 Order Fulfillment Process:** 
1. Product Manager navigates to order review (30/page).
2. Views details.
3. Approves/rejects.
4. Status updated, email sent.
5. Rejected -> automatic refund (PayPal) or manual refund notification (VietQR).

**2.3.4 User Management Process:**
Administrators manage user accounts (create, view, deactivate, block/unblock) and assign roles. Sensitive actions logged.

---

## 3 Detailed Requirements

### 3.1 Use case 1: Pay Order (Customer/VietQR) - UC001
- **Preconditions:** Place Order initiated, invoice calculated.
- **Basic Flow:**
  1. AIMS calls VietQR API for access token.
  2. VietQR returns access token.
  3. AIMS calls VietQR to generate QR code.
  4. VietQR returns QR data.
  5. AIMS displays QR code and invoice.
  6. Customer triggers VietQR test callback.
  7. VietQR sends callback to AIMS.
  8. AIMS verifies callback.
  9. AIMS records transaction.
  10. Returns result to Place Order.

### 3.2 Use case 2: Create Product - UC002
- **Preconditions:** Product Manager logged in.
- **Basic Flow:**
  1. Opens Product Management.
  2. Selects "Create Product".
  3. Enters info and submits.
  4. System validates and saves.
  5. Displays success.

### 3.3 Use case 3: View Product Detail - UC003
- **Preconditions:** AIMS running, user selects product.
- **Basic Flow:** Retrieves general and type-specific information and displays it.

### 3.4 Use case 4: Add Product to Cart - UC004
- **Preconditions:** Viewing product list or details.
- **Basic Flow:** User enters quantity, system adds to cart.

### 3.5 Use case 5: Place Order - UC005
- **Preconditions:** Cart has at least one product.
- **Basic Flow:** 
  1. Requests place order.
  2. System checks stock.
  3. Customer enters delivery info.
  4. System calculates delivery fee.
  5. Invoice displayed.
  6. Customer requests pay -> calls UC "Pay Order".
  7. Invoice sent to email.
  8. Empty cart, show success.

### 3.6 Use case 6: Pay Order (Customer / Credit Card) - UC006
- **Preconditions:** Place Order initiated, chooses Credit Card.
- **Basic Flow:**
  1. Displays credit card form.
  2. Customer enters info and confirms.
  3. System sends request to Payment Gateway.
  4. Gateway validates and processes transaction.
  5. Gateway returns result.
  6. System verifies, records, and displays result.

---

## 4 Supplementary specification

### 4.1 Functionality
- **Taxation Policy:** 10% VAT applied to all products. Shipping fees not subject to tax.
- **Pricing Integrity:** Current price must be between 30% and 150% of original value.
- **Shipping Fee Calculation:** 
  - Hanoi/HCM: Initial 3kg = 22,000 VND.
  - Elsewhere: Initial 0.5kg = 30,000 VND.
  - Additional 0.5kg = +2,500 VND.
  - Orders > 100,000 VND get free shipping discount up to 25,000 VND.
- **Payment:** Default VietQR. Alternative PayPal Sandbox.
- **Refunds:** PayPal automatic via API, VietQR requires manual refund by manager.
- **Audit Logging:** System stores history of product additions/edits/deletions. Sensitive admin actions logged. Payment transactions logged.
- **Automated Notifications:** Email on successful payment, order approval/rejection, sensitive admin actions.
- **Validation:** Notifies users of invalid operations/formats.
- **Product Deletion Rules:** Max 10 deleted simultaneously. Max 20 per day. Deletes if stock=0, deactivates if stock>0.

### 4.2 Usability
- No login required for customers.
- Shows 20 random products on startup.
- Dynamic shipping fee recalculation.
- Clear error messages.

### 4.3 Reliability
- Operate continuously for 300 hours.
- Resume within 1 hour after incident.
- Transaction integrity maintained on payment failure.

### 4.4 Performance
- Serve up to 1,000 concurrent customers.
- Max response time 2s (5s peak).

### 4.5 Supportability
- Support web and desktop.
- Modular payment integration.
- Extensible product schema.
- Audit logs include IDs, timestamps.

### 4.6 Other requirements
- **Security:** RBAC for administration portal. Securely hashed passwords. Principle of least privilege.
- **External Dependencies:** PayPal Sandbox API, VietQR API.
