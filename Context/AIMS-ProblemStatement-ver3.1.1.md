# AIMS: An Internet Media Store

Lecturer: NGUYEN Thi Thu Trang, trangntt@soict.hust.edu.vn 

AIMS is an e-commerce software (web or desktop application) that operates 24/7, allowing new users to easily familiarize themselves. This software can serve up to 1,000 customers simultaneously without significantly reducing performance and can operate continuously for 300 hours without failure. Additionally, the software can resume normal operation within a maximum of 1 hour after an incident. The maximum response time of the software is 2 seconds under normal conditions or 5 seconds during peak hours. 

Currently, AIMS supports only the buying and selling of physical media products, including books, newspapers, CDs, and DVDs (other types of products may be supported in the future). For each product, the system requires essential information such as title, category, general description (for example, new or used condition, primary color, or return condition), physical attributes like dimensions (height, width, length) and weight, barcode, original value, and current price. Both the original value and the current price are without a 10% value-added tax (VAT). 

In AIMS, product managers can add, view, edit, or delete products. They may add a new product or edit the information of an existing one, but only for one product at a time, while up to ten products may be deleted simultaneously. A product can only be deleted if its stock is equal to zero, otherwise it cannot be deleted; instead, its status will be changed to “deactivated”, meaning it will no longer be available for sale. For security reasons, managers cannot delete more than twenty products per day, although they may add an unlimited number of products. The quantity in stock of a product is automatically updated whenever its items are sold. In cases where stock needs to be adjusted manually, such as when new items are added to the store or when items are removed due to damage, the adjustment must be performed manually by the product manager, and the reason for the stock change must be explicitly recorded. 

When adding a product for sale, the product manager must provide the required information as mentioned above. Moreover, depending on the type of product, further details must also be provided: 

Books require information about author(s), cover type (paperback or hardcover), publisher, and publication date; additional information such as number of pages, language, and genre may be included. 

Newspapers require information about editor-in-chief, publisher, and publication date; additional information such as issue number, publication frequency, ISSN, language, and sections (e.g., politics, business, sports, culture) may be included. 

CDs, including music collections or albums, require information about artists, record label, tracks list (each track should have its own title and length), and genre; additional information such as release date may be included. 

DVDs require information about disc type (Blu-ray, HD-DVD), director, runtime, studio, language, and subtitles; additional information such as release date and genre may be included. 

The current price of the product may change depending on market demand. However, the price of the product must always be between 30% and 150% of the product’s original value to avoid price inflation or undercutting. 

The software will store the history of products addition, editing and deletion. Product managers can query these histories whenever they want. The software will notify the product manager if any operation is invalid, for example, when the input does not comply with the rules or the date format is incorrect. 

Administrators are responsible for managing user accounts in accordance with the principle of least privilege and data protection standards. They can create, view, deactivate, block or unblock user accounts, and assign or modify user roles. Each user can have multiple roles, such as administrator or product manager. Administrators may trigger password reset processes but cannot access users’ actual passwords, as all passwords are securely hashed. Any sensitive administrative actions, such as email updates or password resets, must be logged and automatically notified to the affected users. Administrators and product managers need to log in to access the features corresponding to their roles. They also can change password whenever they want. 

For customers, no login is required. When starting the software, a list of 20 random products will be displayed. To search for products, customers use product title or category to search. The software will display all related products on each search page. Additionally, customers can filter products by price range, such as under 100,000 VND, 100,000–200,000 VND, 200,000–300,000 VND, and so on. Customers can view all the detailed information of each product when choosing the corresponding product in the list of product screen, depending on the product type. Customers can add products with corresponding quantities to the current cart in the list of product or product detail screen. 

When customers ask to view the cart, the software will display cart information, including the total price of products excluding VAT, a list of products with product information (e.g., product name, quantity, price, etc). At the same time, the software will also notify customers if the stock quantity of any product is insufficient and will display the quantity of each product that is lacking. When changing their mind, customers can also remove products from the cart or change the quantity of products in the cart. 

From this point, customers can proceed to place an order. Each time an order request is made, the software checks whether the available stock is sufficient to fulfill the customer’s demand. If the stock is insufficient, the system prompts the customer to update the cart and displays the available quantity for each affected product. Once the cart has been updated, the customer can attempt to place the order again. 

Next, the software will ask customers to set up delivery information. During the process of entering delivery information, customers will still see the products and information as in the cart. At this time, the software will check the input information and ask customers to update if there are any required fields left blank or invalid information. Each time customers enter or update the delivery address, the software will calculate (or recalculate) and display the delivery fee. Customers then can proceed to pay the order. At this point, the software will display and temporarily save invoice information, including the list of products in the cart, quantity, product prices, total product price excluding VAT, total product price including VAT, delivery fee, and total amount to be paid. The total amount that customers need to pay includes the total product price including VAT and the delivery fee. Currently, the default payment method is QR code. The software first displays a QR code for the customer to scan and complete the payment. If the customer does not wish to pay by QR code, they may switch to the alternative payment methods through PayPal gateway (for example, credit card). Other payment gateways may be supported in the future. 

Customers can adjust the delivery method or the items they wish to purchase if necessary. The software recalculates the delivery fees and updates the corresponding invoice. Delivery fees depend on the weight of the products and the delivery location. Shipping fees are not subject to tax. 

Orders with a total value of the items exceeding 100,000 VND will qualify for free shipping, up to a maximum of 25,000 VND per order. 

● Shipping fees are calculated based on the total weight of all the items. 

● For customers located in Ha Noi, Ho Chi Minh City, the initial price for the first 3kg is 22,000 VND. 

● For customers elsewhere in Vietnam, the initial price for the first 0.5kg is 30,000 VND. 

● An additional fee of 2,500 VND is charged for every subsequent 0.5kg. 

After a successful payment, the software will display general information of the order (customer name, phone number, shipping address, province, total amount) and transaction information (transaction ID, transaction content and transaction datetime). The order will be in a pending processing state, and the software will send invoice and payment transaction information to the customer's email. Note that customers can go back to any step or exit the software during the ordering process. Finally, the software records the payment transaction information and the successfully paid order. 

Customers can view order information or cancel orders using the links sent in the email regarding the order and transaction (in the future, additional notification methods such as SMS or push notifications may also be supported). Customers can view all information about the order, including the invoice, shipping information, and payment transaction information. Customers can choose to cancel the order when viewing the order information before the order is approved. After the customer confirms the cancellation, the full amount will be refunded to the payment method used for this order1. 

Orders in the pending processing state will be reviewed by Product Manager. The product managers can see 30 pending orders on each page. From there, they can select a specific order to view the details and approve or reject the order even if there are enough products in stock. There are various reasons such as undelivered items, out of stock while the customer is paying for the order, or simply cannot find the item in stock. Once an order is either accepted or rejected, a notification email will be sent to the customer who placed the order. If the order is rejected, the full amount will be refunded to the original payment method2. 

Within the scope of the course, students will integrate payments using PayPal Sandbox and VietQR (via QR code). These integrations are for demonstration purposes only. The relevant documentation and specifications are provided below. 

# PayPal Sandbox (Payment/Refund):

General document: https://developer.paypal.com/home/ 

Guides: Setting up sandbox and live accounts, obtaining client ID/secret, and configuring business/platform permissions: https://developer.paypal.com/api/rest/ 

● Sandbox testing environment: https://developer.paypal.com/tools/sandbox/ 

● Testing account registration page: https://developer.paypal.com/dashboard/ 

PayPal REST APIs (v2: Payments, Orders, Capture, Refund, etc.): https://developer.paypal.com/api/rest/integration/orders-api/ 

OAuth 2.0 information: How to obtain access tokens for REST API requests: https://developer.paypal.com/api/rest/authentication/ 

# VietQR Sandbox (QR Code Payment):

General document: https://api.vietqr.vn/ 

● Testing account registration page: https://vietqr.vn/merchant/request 

Get access token API document: https://api.vietqr.vn/vi/api-vietqr-callback/goiapi-get-token 

Generate QR code API document: https://api.vietqr.vn/vi/api-vietqr-callback/goiapi-generate-vietqr-code 

Test callback API (simulate successful payment): https://api.vietqr.vn/vi/apivietqr-callback/goi-api-test-callback 

Transaction Sync / Callback specification (for production only): https://api.vietqr.vn/vi/api-vietqr-callback/api-transaction-sync 

A sample GitHub repository (for reference only): https://github.com/trangntt-forstudent/AIMS-Ver2025 