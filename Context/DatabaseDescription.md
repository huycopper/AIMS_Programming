# Group 18 - Database Description

Decision of the Database Management System (DBMS): We use PostgreSQL 18 because it
is an open-source relational DBMS suitable for server-side e-commerce applications. It
supports relational modelling, primary keys, foreign keys, check constraints, enum types,
indexing, JSONB data, transaction-safe operations, etc. PostgreSQL 18 is really appropriate
for this project, where product, order, invoice, payment, refund, and user-role data must be
stored consistently and queried reliably.

## users

| # | PK | FK | Column name | Data type | Mandatory | Description |
|---|---|---|---|---|---|---|
| 1 | x | | user_id | UUID | Yes | Auto-generated unique identifier for each user account |
| 2 | | | username | VARCHAR(100) | Yes | Login username used by administrators or product managers. Must be unique across the system |
| 3 | | | email | VARCHAR(255) | Yes | User email address. Must be unique. Used for login and notifications. |
| 4 | | | password_hash | TEXT | Yes | Bcrypt-hashed password. Plain text password is never stored |
| 5 | | | status | user_status_enum | Yes | Account status: ACTIVE, DEACTIVATED, BLOCKED. Default: ACTIVE. |

Constraints:
- PRIMARY KEY (user_id)
- UNIQUE (username)
- UNIQUE (email)
- status must be one of ACTIVE, DEACTIVATED, BLOCKED

## roles

| # | PK | FK | Column name | Data type | Mandatory | Description |
|---|---|---|---|---|---|---|
| 1 | x | | role_id | UUID | Yes | Auto-generated unique identifier for a role |
| 2 | | | role_name | VARCHAR(100) | Yes | Role name. Must be unique. Examples: ADMIN, PRODUCT_MANAGER. |
| 3 | | | description | TEXT | No | Description of the role and its responsiblity |

Constraints:
- PRIMARY KEY (role_id)
- UNIQUE (role_name)

## user_roles

| # | PK | FK | Column name | Data type | Mandatory | Description |
|---|---|---|---|---|---|---|
| 1 | x | x | user_id | UUID | Yes | References the user assigned to a role: users.user_id. Part of composite primary key |
| 2 | x | x | role_id | UUID | Yes | Reference to roles.role_id. Part of composite primary key |

Constraints:
- PRIMARY KEY (user_id, role_id)
- FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
- FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE
- This table implements the many-to-many relationship between users and roles

## products

| # | PK | FK | Column name | Data type | Mandatory | Description |
|---|---|---|---|---|---|---|
| 1 | x | | product_id | UUID | Yes | Unique identifier of a product. |
| 2 | | | product_type | product_type_enum | Yes | Type of product: BOOK, CD, DVD, or NEWSPAPER. |
| 3 | | | title | VARCHAR(255) | Yes | Product title |
| 4 | | | category | VARCHAR(100) | Yes | Product category |
| 5 | | | general_description | TEXT | No | General product description, such as condition or return condition. |
| 6 | | | height | NUMERIC(10,2) | Yes | Product height |
| 7 | | | width | NUMERIC(10,2) | Yes | Product width |
| 8 | | | length | NUMERIC(10,2) | Yes | Product length |
| 9 | | | weight | NUMERIC(10,2) | Yes | Product weight |
| 10| | | barcode | VARCHAR(100) | Yes | Product barcode |
| 11| | | original_value | NUMERIC(14,2) | Yes | Original product value before VAT |
| 12| | | current_price | NUMERIC(14,2) | Yes | Current product price before VAT |
| 13| | | stock_quantity | INTEGER | Yes | Available quantity in stock |
| 14| | | status | product_status_enum | Yes | Product status: ACTIVE, DEACTIVATED, or DELETED. |
| 15| | | created_at | TIMESTAMP | Yes | Product creation timestamp |
| 16| | | updated_at | TIMESTAMP | Yes | Last product update timestamp |

Constraints:
- PRIMARY KEY (product_id)
- UNIQUE (barcode)
- CHECK (height >= 0 AND width >= 0 AND length >= 0 AND weight >= 0)
- CHECK (original_value >= 0)
- CHECK (current_price >= 0)
- CHECK (current_price >= original_value * 0.30)
- CHECK (current_price <= original_value * 1.50)
- CHECK (stock_quantity >= 0)
- CHECK (status <> 'DELETED' OR stock_quantity = 0)
- updated_at is automatically maintained by trigger trg_products_updated_at

## books

| # | PK | FK | Column name | Data type | Mandatory | Description |
|---|---|---|---|---|---|---|
| 1 | x | x | product_id | UUID | Yes | ID of the corresponding product. |
| 2 | | | authors | JSONB | Yes | List of book authors. |
| 3 | | | cover_type | VARCHAR(50) | Yes | Book cover type: PAPERBACK or HARDCOVER. |
| 4 | | | publisher | VARCHAR(255) | Yes | Book publisher. |
| 5 | | | publication_date | DATE | Yes | Book publication date. |
| 6 | | | number_of_pages | INTEGER | No | Number of pages. |
| 7 | | | language | VARCHAR(100) | No | Book language. |
| 8 | | | genre | VARCHAR(100) | No | Book genre. |

Constraints:
- PRIMARY KEY (product_id)
- FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
- CHECK (number_of_pages IS NULL OR number_of_pages > 0)
- CHECK (cover_type IN ('PAPERBACK', 'HARDCOVER'))
- authors is stored as JSONB because authors are treated as product attributes in the final ERD rather than separate entities.

## cds

| # | PK | FK | Column name | Data type | Mandatory | Description |
|---|---|---|---|---|---|---|
| 1 | x | x | product_id | UUID | Yes | ID of the corresponding product. |
| 2 | | | artists | JSONB | Yes | List of CD artists. |
| 3 | | | record_label | VARCHAR(255) | Yes | CD record label. |
| 4 | | | tracks | JSONB | Yes | Track list. Each track may include title and length. |
| 5 | | | genre | VARCHAR(100) | Yes | CD genre. |
| 6 | | | release_date | DATE | No | CD release date. |

Constraints:
- PRIMARY KEY (product_id)
- FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
- artists and tracks are stored as JSONB to keep the physical schema consistent with the simplified final ERD.

## dvds

| # | PK | FK | Column name | Data type | Mandatory | Description |
|---|---|---|---|---|---|---|
| 1 | x | x | product_id | UUID | Yes | ID of the corresponding product |
| 2 | | | disc_type | VARCHAR(50) | Yes | DVD disc type: BLU_RAY or HD_DVD. |
| 3 | | | director | VARCHAR(255) | Yes | DVD director |
| 4 | | | runtime | INTEGER | Yes | DVD runtime |
| 5 | | | studio | VARCHAR(255) | Yes | DVD studio |
| 6 | | | language | VARCHAR(100) | Yes | DVD language |
| 7 | | | subtitles | JSONB | Yes | DVD subtitles |
| 8 | | | release_date | DATE | No | DVD release date |
| 9 | | | genre | VARCHAR(100) | No | DVD genre |

Constraints:
- PRIMARY KEY (product_id)
- FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
- CHECK (runtime > 0)
- CHECK (disc_type IN ('BLU_RAY', 'HD_DVD'))
- subtitles is stored as JSONB to support multiple subtitle values

## newspapers

| # | PK | FK | Column name | Data type | Mandatory | Description |
|---|---|---|---|---|---|---|
| 1 | x | x | product_id | UUID | Yes | ID of the corresponding product |
| 2 | | | editor_in_chief | VARCHAR(255) | Yes | Newspaper editor-in-chief |
| 3 | | | publisher | VARCHAR(255) | Yes | Newspaper publisher |
| 4 | | | publication_date | DATE | Yes | Newspaper publication date |
| 5 | | | issue_number | VARCHAR(100) | No | Newspaper issue number |
| 6 | | | publication_frequency | VARCHAR(100) | No | Publication frequency |
| 7 | | | issn | VARCHAR(100) | No | ISSN code |
| 8 | | | language | VARCHAR(100) | No | Newspaper language |
| 9 | | | sections | JSONB | No | Newspaper sections, such as politics, business, sports, or culture. |

Constraints:
- PRIMARY KEY (product_id)
- FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
- sections is stored as JSONB because sections are treated as multivalued product attributes

## product_histories

| # | PK | FK | Column name | Data type | Mandatory | Description |
|---|---|---|---|---|---|---|
| 1 | x | | history_id | UUID | Yes | Unique identifier of a product history record. |
| 2 | | x | product_id | UUID | Yes | Product affected by the operation |
| 3 | | x | performed_by | UUID | Yes | User who performed the operation |
| 4 | | | action_type | history_action_type_enum | Yes | Type of action: CREATE, UPDATE, DELETE, DEACTIVATE, or STOCK_ADJUST. |
| 5 | | | action_time | TIMESTAMP | Yes | Time when the action was performed |
| 6 | | | old_value_snapshot | JSONB | No | Snapshot of product data before the operation |
| 7 | | | new_value_snapshot | JSONB | No | Snapshot of product data after the operation. |
| 8 | | | reason | TEXT | No | Additional note; also used to record stock adjustment reason if applicable. |

Constraints:
- PRIMARY KEY (history_id)
- FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
- FOREIGN KEY (performed_by) REFERENCES users(user_id) ON DELETE RESTRICT
- action_type must be one of CREATE, UPDATE, DELETE, DEACTIVATE, STOCK_ADJUST

## orders

| # | PK | FK | Column name | Data type | Mandatory | Description |
|---|---|---|---|---|---|---|
| 1 | x | | order_id | UUID | Yes | Unique identifier of an order |
| 2 | | x | processed_by | UUID | No | Product manager who processes, approves, or rejects the order. |
| 3 | | | status | order_status_enum | Yes | Current order status |
| 4 | | | total_amount | NUMERIC(14,2) | Yes | Total amount of the order |
| 5 | | | order_view_token | UUID | Yes | Token used in customer order-view link |
| 6 | | | cancel_token | UUID | Yes | Token used in customer order-cancellation link |
| 7 | | | processed_at | TIMESTAMP | No | Time when the order was processed by a product manager |
| 8 | | | created_at | TIMESTAMP | Yes | Order creation timestamp |
| 9 | | | updated_at | TIMESTAMP | Yes | Last order update timestamp |

Constraints:
- PRIMARY KEY (order_id)
- FOREIGN KEY (processed_by) REFERENCES users(user_id) ON DELETE SET NULL
- CHECK (total_amount >= 0)
- UNIQUE (order_view_token)
- UNIQUE (cancel_token)
- status must be one of PENDING_PROCESSING, APPROVED, REJECTED, CANCELLED.

## order_items

| # | PK | FK | Column name | Data type | Mandatory | Description |
|---|---|---|---|---|---|---|
| 1 | x | | order_item_id | UUID | Yes | Unique identifier of an order item |
| 2 | | x | order_id | UUID | Yes | Order containing this item |
| 3 | | x | product_id | UUID | Yes | Product referenced by this order item |
| 4 | | | product_title | VARCHAR(255) | Yes | Product title snapshot at ordering time |
| 5 | | | unit_price | NUMERIC(14,2) | Yes | Product unit price snapshot at ordering time |
| 6 | | | quantity | INTEGER | Yes | Quantity ordered |
| 7 | | | line_amount_excl_vat | NUMERIC(14,2) | Yes | Line amount excluding VAT |
| 8 | | | line_amount_incl_vat | NUMERIC(14,2) | Yes | Line amount including VAT |

Constraints:
- PRIMARY KEY (order_item_id)
- FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
- FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE RESTRICT
- CHECK (unit_price >= 0)
- CHECK (quantity > 0)
- CHECK (line_amount_excl_vat >= 0)
- CHECK (line_amount_incl_vat >= 0)
- UNIQUE (order_id, product_id)

## delivery_infos

| # | PK | FK | Column name | Data type | Mandatory | Description |
|---|---|---|---|---|---|---|
| 1 | x | | delivery_info_id | UUID | Yes | Unique identifier of delivery information |
| 2 | | x | order_id | UUID | Yes | Order associated with this delivery information |
| 3 | | | customer_name | VARCHAR(255) | Yes | Customer name |
| 4 | | | phone_number | VARCHAR(30) | Yes | Customer phone number |
| 5 | | | email | VARCHAR(255) | Yes | Customer email |
| 6 | | | delivery_address | TEXT | Yes | Delivery address |
| 7 | | | delivery_province | VARCHAR(100) | Yes | Delivery province or city |
| 8 | | | delivery_instructions | TEXT | No | Optional delivery instructions |
| 9 | | | expected_date | DATE | No | Expected delivery date |
| 10| | | shipping_fee | NUMERIC(14,2) | Yes | Shipping fee |

Constraints:
- PRIMARY KEY (delivery_info_id)
- FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
- UNIQUE (order_id)
- CHECK (shipping_fee >= 0)

## invoices

| # | PK | FK | Column name | Data type | Mandatory | Description |
|---|---|---|---|---|---|---|
| 1 | x | | invoice_id | UUID | Yes | Unique identifier of an invoice |
| 2 | | x | order_id | UUID | Yes | Order associated with this invoice |
| 3 | | | total_product_price_excl_vat | NUMERIC(14,2) | Yes | Total product price excluding VAT |
| 4 | | | vat_amount | NUMERIC(14,2) | Yes | VAT amount |
| 5 | | | total_product_price_incl_vat | NUMERIC(14,2) | Yes | Total product price including VAT |
| 6 | | | delivery_fee | NUMERIC(14,2) | Yes | Delivery fee |
| 7 | | | total_amount_to_pay | NUMERIC(14,2) | Yes | Final amount to be paid by the customer |
| 8 | | | created_at | TIMESTAMP | Yes | Invoice creation timestamp |
| 9 | | | updated_at | TIMESTAMP | Yes | Last invoice update timestamp |

Constraints:
- PRIMARY KEY (invoice_id)
- FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
- UNIQUE (order_id)
- CHECK (total_product_price_excl_vat >= 0)
- CHECK (vat_amount >= 0)
- CHECK (total_product_price_incl_vat >= 0)
- CHECK (delivery_fee >= 0)
- CHECK (total_amount_to_pay >= 0)
- CHECK (total_product_price_incl_vat = total_product_price_excl_vat + vat_amount)
- CHECK (total_amount_to_pay = total_product_price_incl_vat + delivery_fee)

## payment_transactions

| # | PK | FK | Column name | Data type | Mandatory | Description |
|---|---|---|---|---|---|---|
| 1 | x | | transaction_id | UUID | Yes | Unique identifier of a payment transaction |
| 2 | | x | invoice_id | UUID | Yes | Invoice paid by this payment transaction |
| 3 | | | transaction_content | TEXT | No | Payment transaction content or message |
| 4 | | | transaction_datetime | TIMESTAMP | Yes | Time of the payment transaction |
| 5 | | | amount | NUMERIC(14,2) | Yes | Paid amount |
| 6 | | | status | payment_status_enum | Yes | Payment status |
| 7 | | | payment_method | payment_method_enum | Yes | Payment method: QR_CODE or CREDIT_CARD |
| 8 | | | error_code | VARCHAR(100) | No | Error code returned by payment gateway if payment fails |
| 9 | | | gateway_transaction_ref | VARCHAR(255) | No | Transaction reference returned by the payment gateway |
| 10| | | created_at | TIMESTAMP | Yes | Record creation timestamp |

Constraints:
- PRIMARY KEY (transaction_id)
- FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE CASCADE
- CHECK (amount >= 0)
- status must be one of PENDING, SUCCESS, FAILED, CANCELLED, REFUNDED.
- payment_method must be one of QR_CODE, CREDIT_CARD

## refund_transactions

| # | PK | FK | Column name | Data type | Mandatory | Description |
|---|---|---|---|---|---|---|
| 1 | x | | refund_id | UUID | Yes | Unique identifier of a refund transaction |
| 2 | | x | payment_transaction_id | UUID | Yes | Payment transaction being refunded. |
| 3 | | | refund_amount | NUMERIC(14,2) | Yes | Refund amount |
| 4 | | | refund_reason | TEXT | Yes | Reason for refund |
| 5 | | | refund_datetime | TIMESTAMP | Yes | Time of refund transaction |
| 6 | | | refund_status | refund_status_enum | Yes | Refund status |
| 7 | | | refund_method | refund_method_enum | Yes | Refund method |
| 8 | | | manual_refund_note | TEXT | No | Required note when refund is handled manually |
| 9 | | | created_at | TIMESTAMP | Yes | Record creation timestamp |

Constraints:
- PRIMARY KEY (refund_id)
- FOREIGN KEY (payment_transaction_id) REFERENCES payment_transactions(transaction_id) ON DELETE CASCADE
- CHECK (refund_amount >= 0)
- CHECK (refund_method <> 'MANUAL_BANK_TRANSFER' OR manual_refund_note IS NOT NULL)
- refund_status must be one of PENDING, SUCCESS, FAILED, MANUAL_REQUIRED.
- refund_method must be one of PAYPAL_API, MANUAL_BANK_TRANSFER
