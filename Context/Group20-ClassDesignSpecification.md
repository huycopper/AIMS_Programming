# AIMS — Class Design Specification

Use Case: Place Order
Lab 06 — Class Design | ISD.20252
SOICT – HUST | Lecturer: NGUYEN Thi Thu Trang

## Overview
This document provides the detailed class design specification for the Place Order use case in AIMS (An Internet Media Store). It covers all boundary, control, and entity classes identified in the analysis class diagram and sequence diagram for this use case.

## 1. Boundary

### 1.1 CartScreen
Stereotype: <<boundary>>
Displays cart contents and initiates the place order flow. Communicates stock warnings to the customer.

**1.1.1 Attributes**
- `cart` (Cart): The current cart object bound to this screen.
- `totalExclVAT` (double): Subtotal of all cart items, excluding 10% VAT.
- `isLoading` (boolean): Controls loading spinner during async order submission.
- `insufficientStockItem` (Map<String,int>): Maps productId with insufficient stock.

**1.1.2 Operations**
- `askToPlaceOrder()`: Triggered when customer clicks "Place Order". Validates cart is non-empty, then calls `PlaceOrderController.placeOrder(cart)`.
- `showInvalidQuantityException(items: Map<string,number>)`: Displays inline error banners for each product that has insufficient stock.
- `displayCart(cart: Cart)`: Renders the cart product list.
- `updateTotalDisplay()`: Recalculates and re-renders the subtotal.

### 1.2 DeliveryInfoScreen
Stereotype: <<boundary>>
Renders the delivery information form. Recalculates shipping fee on address change. Customers still see cart summary alongside the form.

**1.2.1 Attributes**
- `deliveryInfo` (DeliveryInfo): Two-way bound form model.
- `shippingFee` (double): Calculated shipping fee displayed.
- `cartSummary` (CartItem[]): Cart items shown alongside form.
- `validationErrors` (Map<String, String>): Maps field name to error message.
- `isSubmitting` (boolean): Disables submit button during async submission.

**1.2.2 Operations**
- `showDeliveryForm()`: Renders the delivery form UI.
- `setDeliveryInfo(deliveryInfo: DeliveryInfo)`: Handles real-time customer input.
- `calculateShippingFee()`: Adds error message and highlights invalid form control.
- `saveOrder(invoice: Invoice)`: Called whenever province/address changes.
- `submitDeliveryInfo()`: Validates form locally.
- `updateShippingFeeDisplay(fee: double)`: Updates the shippingFee property.

### 1.3 InvoiceScreen
Stereotype: <<boundary>>
Displays the full invoice with all costs. Allows customer to choose a payment method (VietQR default, PayPal alternative) and initiate payment.

**1.3.1 Attributes**
- `invoice` (Invoice): The invoice object to render.
- `order` (Order): The current order being paid.
- `selectedPaymentMethod` (PaymentMethod): Current selected payment method.
- `qrCodeData` (String): QR code image data returned from VIETQR gateway.
- `isProcessingPayment` (boolean): Shows loading state while awaiting payment gateway response.

**1.3.2 Operations**
- `showInvoice()`: Renders invoice details.
- `askToPay()`: Triggered by customer clicking "Pay". Sets `isProcessingPayment = true`.
- `switchPaymentMethod(method: PaymentMethod)`: Updates selectedPaymentMethod.
- `displayQRCode(qrCode: string)`: Sets qrCodeData and renders the VietQR QR code image.

### 1.4 SuccessfulScreen
Stereotype: <<boundary>>
Displays order confirmation with customer info, shipping address, and payment transaction details after successful payment.

**1.4.1 Attributes**
- `order` (Order): Successfully placed order.
- `paymentTransaction` (PaymentTransaction): Transaction details.

**1.4.2 Operations**
- `showSuccessScreen(order: Order)`: Shows customer info, shipping address, transaction details.
- `viewOrderDetail(orderId: String)`: Navigates to the order detail page.

### 1.5 CreateProductScreen
Stereotype: <<boundary>>
Represents the screen where the product manager starts the Create Product use case.

**1.5.1 Attributes**
- `currentProductInfo` (ProductInfo): Product information currently entered.
- `isCreated` (boolean): Indicates whether the product has been created.

**1.5.2 Operations**
- `requestToCreateProduct()`: Triggered when the product manager starts the create product process.
- `showCreateSuccess()`: Displays a success message.
- `displayInvalidNotification(msg: String)`: Displays validation or processing error messages.

### 1.6 UpdateProductScreen
Stereotype: <<boundary>>
Represents the screen used by the product manager to update an existing product.

**1.6.1 Attributes**
- `selectedProduct` (Product): The product selected for update.
- `updatedInfo` (ProductInfo): The updated product information entered.
- `isUpdated` (boolean): Indicates whether the update action completed successfully.

**1.6.2 Operations**
- `requestToUpdateProduct()`: Triggered when the product manager starts the update process.
- `displaySuccessConfirmation()`: Displays a confirmation message.
- `displayInvalidNotification(msg: String)`: Displays validation or processing error messages.

### 1.7 DeleteProductScreen
Stereotype: <<boundary>>
Represents the screen used by the product manager to select products for deletion.

**1.7.1 Attributes**
- `selectedProducts` (String): The selected product or group of products submitted for deletion.
- `deleteResult` (boolean): Indicates whether the delete/deactivate action completed successfully.

**1.7.2 Operations**
- `requestToDeleteProducts()`: Triggered when the product manager initiates the delete product process.
- `displayDeletionResult()`: Displays the final result.
- `displayInvalidNotification(msg: String)`: Displays validation or business-rule error messages.

### 1.8 VietQRPaymentScreen
Stereotype: <<boundary>>
The User Interface displaying the QR code alongside a waiting spinner.

**1.8.1 Attributes**
- `currentInvoice` (Invoice): The current displayed Invoice data model.
- `qrCodeData` (String): Base64 URI String for the tag.
- `isPaymentComplete` (boolean): Status flag indicating if payment has completed.
- `paymentStatus` (String): Local status tracking: waiting / processing / success / failed.

**1.8.2 Operations**
- `displayQRCode(invoice: Invoice, qrCode: String)`: Updates the screen to render the invoice details and QR image.
- `showPaymentProcessing()`: Disables interactions and shows a loading spinner.
- `showPaymentResult(success: boolean)`: Renders the success or failure UI sequence.
- `showPaymentError(errorMsg: String)`: Displays an error message on the UI.

### 1.9 CreditCardPaymentForm
Stereotype: <<boundary>> (UI)
The UI form prompting the Customer to input Credit Card information.

**1.9.1 Attributes**
- `currentInvoice` (Invoice)
- `cardNumberInput` (String)
- `expiryInput` (String)
- `cvvInput` (String)
- `cardHolderInput` (String)
- `isProcessing` (boolean)
- `paymentStatus` (String)

**1.9.2 Operations**
- `displayPaymentForm(invoice: Invoice)`
- `submitCardInfo(cardInfo: CreditCard)`
- `showPaymentProcessing()`
- `showPaymentResult(success: boolean)`
- `showPaymentError(errorMsg: String)`
- `validateFormInput()`
- `getPaymentStatus()`

### 1.10 VietQRBoundary
Stereotype: <<boundary>> (System Interface)
System Interface responsible for external VietQR API integration.

**1.10.1 Attributes**
- `apiBaseUrl` (String): "https://api.vietqr.vn"
- `clientId` (String)
- `clientSecret` (String)
- `currentToken` (String)
- `tokenExpiry` (Date)

**1.10.2 Operations**
- `getAccessToken()`: Manages token lifecycle.
- `generateQRCode(invoice: Invoice, accessToken: String)`: Invokes the VietQR endpoint to generate a QR code image.
- `paymentCallback(transactionResult: String)`: The endpoint mapping handler for incoming VietQR webhook callbacks.

### 1.11 PayPalBoundary
Stereotype: <<boundary>> (System Interface)
System Interface handling PayPal Sandbox API integration.

**1.11.1 Attributes**
- `apiBaseUrl` (String): "https://api.sandbox.paypal.com"
- `clientId` (String)
- `clientSecret` (String)
- `currentToken` (String)
- `tokenExpiry` (Date)

**1.11.2 Operations**
- `getAccessToken()`: Performs OAuth2 client_credentials grant.
- `processPayment(cardInfo: CreditCard, amount: double, accessToken: String)`: Posts card info to PayPal checkout captures endpoint.
- `refundPayment(transactionId: String, amount: double)`: Posts a refund request for an existing captured payment.

## 2. Controller

### 2.1 PlaceOrderController
Stereotype: <<control>>
Orchestrates the entire Place Order flow.

**2.1.1 Attributes**
- `order` (Order): The Order object being built.

**2.1.2 Operations**
- `placeOrder(cart: Cart)`
- `validateStock(cart: Cart)`
- `submitDeliveryInfo(deliveryInfo: DeliveryInfo)`
- `checkDeliveryInfoValidity(deliveryInfo: DeliveryInfo)`
- `calculateShippingFee(deliveryInfo: DeliveryInfo, cart: Cart)`
- `payOrder(order: Order)`
- `createInvoice(order: Order)`
- `sendEmailToCustomer(invoice: Invoice)`

### 2.2 Product Controller
Stereotype: <<control>>
Coordinates the Create Product, Update Product, and Delete Product use cases.

**2.2.1 Attributes**
- `selectedProduct` (Product)
- `ProductInfo` (ProductInfo)
- `actionResult` (boolean)

**2.2.2 Operations**
- `createProduct(productInfo: ProductInfo)`
- `updateProduct(product: Product, productInfo: ProductInfo)`
- `deleteProduct(product: Product)`
- `validateProductInfo(productInfo: ProductInfo)`
- `returnResult(result: boolean)`
- `getProductStatus()`

### 2.3 PayOrderController
Stereotype: <<control>> | Package: controls
The entry point controller for the Pay Order use case. Routes the execution flow.

**2.3.1 Attributes**
- `invoice` (Invoice)
- `paymentResult` (boolean)
- `paymentMethod` (PaymentMethod)

**2.3.2 Operations**
- `PayOrder(invoice: Invoice)`
- `returnPaymentResult(paymentResult: boolean)`
- `initiateVietQRPayment(invoice: Invoice)`
- `initiateCreditCardPayment(invoice: Invoice)`
- `getPaymentStatus()`

### 2.4 PayThroughVietQRController
Stereotype: <<control>> | Package: controls
Handles business logic exclusively for the asynchronous VietQR payment flow.

**2.4.1 Attributes**
- `accessToken` (String)
- `callbackVerified` (boolean)
- `transactionData` (String)

**2.4.2 Operations**
- `generateQRCode(invoice: Invoice)`
- `handlePaymentCallback(transactionResult: String)`
- `verifyCallbackData(transactionResult: String)`
- `requestAccessToken()`
- `requestQRCodeGeneration(invoice: Invoice, accessToken: String)`
- `createPaymentTransaction(transactionResult: String)`

### 2.5 PayThroughCreditCardController
Stereotype: <<control>> | Package: controls
Handles the business logic for verifying and processing synchronous payments via the PayPal gateway.

**2.5.1 Attributes**
- `creditCard` (CreditCard)
- `accessToken` (String)

**2.5.2 Operations**
- `processPayment(cardInfo: CreditCard, invoice: Invoice)`
- `validateCardInfo(card: CreditCard)`
- `refundPayment(transaction: PaymentTransaction)`
- `requestAccessToken()`
- `sendPaymentRequest(cardInfo: CreditCard, amount: double, accessToken: String)`
- `createPaymentTransaction(cardInfo: CreditCard, invoice: Invoice, success: boolean)`

## 3. Entity

### 3.1 CartItem
Stereotype: <<entity>>
Holds a product reference and the quantity.

**3.1.1 Attributes**
- `product` (Product)
- `quantity` (int)

**3.1.2 Operations**
- `CartItem(product: Product, quantity: int)`
- `getSubtotal()`
- `getWeight()`

### 3.2 Cart
Stereotype: <<entity>>
Holds the collection of CartItems representing the customer's current shopping session.

**3.2.1 Attributes**
- `items` (CartItem[])

**3.2.2 Operations**
- `calculateSubTotal()`
- `getTotalWeight()`
- `emptyCart()`
- `addItem(product: Product, quantity: number)`
- `removeItem(productId: string)`
- `updateQuantity(productId: string, quantity: number)`
- `getItem(productId: string)`

### 3.3 Product
Stereotype: <<entity>>
Represents a media product managed in AIMS.

**3.3.1 Attributes**
- `productId` (String)
- `productName` (String)
- `category` (String)
- `price` (double)
- `originalValue` (double)
- `quantity` (int)
- `description` (String)
- `barcode` (String)
- `imgUrl` (String)
- `status` (String)
- `createdAt` (LocalDateTime)
- `updatedAt` (LocalDateTime)

**3.3.2 Operations**
- `Product(productName, category, price, quantity, description)`
- `updateInfo(...)`
- `changeStatus(status: ProductStatus)`
- `getQuantityInStock(id: string)`
- `isAvailable(requestedQty: number)`
- `getCostWithVAT()`
- `isDeletable()`
- `deactivate()`

### 3.4 ProductHistory
Stereotype: <<entity>>
Represents a history record of product-related actions.

**3.4.1 Attributes**
- `historyId` (String)
- `productId` (String)
- `action` (String)
- `actionTime` (Date)

**3.4.2 Operations**
- `ProductHistory(productId, action, actionTime)`
- `save()`
- `getHistoryInfo()`
- `recordAction(action: String)`

### 3.5 Order
Stereotype: <<entity>>
Represents a customer's order.

**3.5.1 Attributes**
- `orderId` (String)
- `cart` (Cart)
- `deliveryInfo` (DeliveryInfo)
- `Invoice` (Invoice)
- `totalAmount` (double)
- `status` (OrderStatus)
- `shippingFee` (double)
- `createdAt` (Date)

**3.5.2 Operations**
- `Order(cart: Cart)`
- `setDeliveryInfo(deliveryInfo: DeliveryInfo)`
- `calculateShippingFee()`
- `updateTotalAmount()`
- `getOrderId()`
- `getTotalAmount()`
- `updateStatus(newStatus: OrderStatus)`
- `saveOrder()`

### 3.6 Invoice
Stereotype: <<entity>>
Represents the billing information generated for an order.

**3.6.1 Attributes**
- `invoiceId` (String)
- `totalCostExclVAT` (double)
- `totalCostInclVAT` (double)
- `shippingFee` (double)
- `issueDate` (Date)
- `totalAmount` (double)
- `status` (String)

**3.6.2 Operations**
- `Invoice()`
- `saveInvoice()`
- `setPaymentTransaction(txn: PaymentTransaction)`
- `calculateTotalAmount()`

### 3.7 CreditCard
Stereotype: <<entity>>
Represents the credit card information.

**3.7.1 Attributes**
- `cardNumber` (String)
- `expiryDate` (String)
- `cvv` (String)
- `cardHolderName` (String)

**3.7.2 Operations**
- `validateCard()`
- `isExpired()`
- `maskCardNumber()`

### 3.8 DeliveryInfo
Stereotype: <<entity>>
Holds the recipient's delivery details.

**3.8.1 Attributes**
- `receiverName` (String)
- `email` (String)
- `phoneNumber` (String)
- `province` (String)
- `address` (String)
- `ward` (String)
- `note` (String)

**3.8.2 Operations**
- `submitDeliveryInfo()`
- `validate()`
- `isHanoiOrHCMC()`

### 3.9 PaymentTransaction
Stereotype: <<entity>>
Records payment transaction data.

**3.9.1 Attributes**
- `transactionId` (String)
- `orderId` (String)
- `amount` (double)
- `method` (PaymentMethod)
- `status` (TransactionStatus)
- `transactionContent` (String)
- `transactionDate` (Date)
- `createdAt` (Date)
- `rawCallbackData` (String)
- `paypalOrderId` (String)
- `cardLastFour` (String)
- `refundId` (String)
- `refundDate` (Date)
- `refundAmount` (double)

**3.9.2 Operations**
- `paymentTransaction()`
- `save()`
- `updateStatus(newStatus: TransactionStatus)`
- `getTransactionInfo()`
- `parseResponseString(response: string)`
