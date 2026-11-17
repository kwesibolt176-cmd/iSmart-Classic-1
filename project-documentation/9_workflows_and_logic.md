> **Tip for easy reading:** We recommend downloading the "Office Viewer (Markdown Editor)" extension in VS Code to view this markdown file as a formatted Word document.

# 9. Workflows and Logic

Understanding the core business workflows is essential for modifying or extending the iSmart Dowo platform. Here are step-by-step breakdowns of the most critical flows.

## 1. User Registration & Business Onboarding
When a new merchant signs up to use the platform:
1. **Sign Up (`/auth`):** The user submits their email and password. Supabase Auth creates a new user.
2. **Profile Creation:** A database trigger automatically creates a record in the `profiles` table linked to the new Auth UUID.
3. **Onboarding (`/onboarding`):** The user is redirected to an onboarding flow where they provide their business name, type, and location.
4. **Business Initialization:** The frontend inserts a new record into the `businesses` table, setting the user as the `owner_id`. It also creates an initial `location` and assigns the user an "Admin" role in the `staff_members` table.

## 2. Point of Sale (POS) Checkout Flow
When a cashier processes a sale for a customer:
1. **Cart Construction (`/` or `Index.tsx`):** The cashier taps products. The `CartContext` manages the current cart state (items, quantities, applied discounts).
2. **Checkout Initiation:** The cashier clicks "Checkout" and selects a payment method (e.g., Cash, Mobile Money, Card).
3. **Order Creation:** The frontend inserts a record into the `orders` table with status `pending`, along with the associated `order_items`.
4. **Payment Processing:**
   - *If Cash:* The order status is immediately updated to `completed`.
   - *If Mobile Money (via iSmart Gateway):* The frontend calls the `ismart-collect-payment` edge function. This triggers a prompt on the customer's phone. The system must poll or wait for a webhook to confirm payment before marking the order `completed`.
5. **Receipt Generation:** Upon completion, a receipt is generated (`/receipt`) and optionally sent via SMS or email using the `send-payment-receipt` edge function.

## 3. Utility Payment Flow (Fintech)
When a merchant uses their wallet balance to pay a utility bill (e.g., Water):
1. **Selection (`/utilities`):** The merchant selects the utility category (e.g., Water).
2. **Verification:**
   - The merchant enters the account/meter number.
   - The frontend calls the `ismart-utilities` edge function with the `action: 'queryWater'`.
   - The edge function calls the iSmart Gateway to fetch the account details (customer name, amount due).
   - The frontend displays these details to ensure the merchant is paying the correct account.
3. **Payment Initiation:**
   - The merchant enters the payment amount and confirms.
   - The frontend calls `ismart-utilities` again, this time with `action: 'buyWater'`.
4. **Backend Processing & Ledger Update:**
   - The edge function first checks if the merchant has sufficient `wallet_balance` in the `businesses` table.
   - It deducts the amount from the local `wallet_balance` (optimistic/provisional deduction).
   - It sends the final payment request to the iSmart Gateway.
   - *If successful:* A record is created in the `transactions` and `utility_payments` tables.
   - *If failed:* The local wallet deduction is reverted, and an error is returned to the frontend.

## 4. Disbursements (Sending Money)
1. **Request (`/disbursement`):** The merchant enters recipient details (e.g., an MTN Mobile Money number) and an amount.
2. **Verification:** Similar to utilities, the system may verify the recipient name first.
3. **Execution:** The frontend invokes the `process-disbursement` edge function.
4. **Ledger Update:** The edge function handles wallet deduction, calls the external banking gateway to perform the transfer, and records the transaction.
