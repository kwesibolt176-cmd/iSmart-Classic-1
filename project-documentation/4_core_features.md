> **Tip for easy reading:** We recommend downloading the "Office Viewer (Markdown Editor)" extension in VS Code to view this markdown file as a formatted Word document.

# 4. Core Features

The iSmart Dowo platform is a feature-rich environment. Below is a breakdown of the primary modules and how they function internally.

## 1. Core POS & Inventory Management
This is the foundational feature for merchants to run their daily operations.

- **Products & Categories (`/products`):** Merchants can create, edit, and categorize products. Products can have images (stored in Supabase Storage), variants, and pricing.
- **Cart & Checkout (`/` or `Index.tsx`):** The main POS interface. Staff can add items to a cart, apply discounts or taxes, and proceed to checkout.
- **Order Processing (`/orders`, `/kitchen`, `/deliveries`):** 
  - Once an order is placed, it enters a lifecycle. 
  - If it's a food order, it can be routed to the `Kitchen` display for preparation.
  - If it requires delivery, it moves to the `Deliveries` board where delivery drivers can track and update status.
  - Generates digital receipts (`/receipt`).

## 2. Fintech & Financial Operations
The platform deeply integrates with external financial gateways (primarily the iSmart Financial API and iSmart Collect) to offer a digital wallet experience.

- **Digital Wallet (`/wallet`):** Every business has an associated digital wallet. Merchants can view their current balance, top up via external payment gateways, and see a ledger of transactions.
- **Collections (`/collections`):** Allows merchants to collect payments from customers via Mobile Money (MoMo) or bank transfers. The system generates payment requests that are sent to the customer's phone or displayed as a QR code.
- **Disbursements (`/disbursement`):** Enables merchants to send money *out* of their wallet. This could be paying suppliers, paying staff salaries, or sending money to other wallets. Supports bulk disbursements.
- **Utility Payments (`/utilities`):** A value-added service where merchants (or their customers) can pay for everyday utilities.
  - **Supported Services:** Electricity (ECG), Water (GWCL), Internet Data (MTN, Telecel, AT), Broadband, and TV (DStv, GOtv).
  - **Internal Flow:** The user selects a category and provides an account number. The frontend calls an edge function to *verify* the account (fetching details/balance). Once verified, the user enters an amount and submits the *payment* request.

## 3. Business Management & Administration
Features to manage the operational aspects of the business.

- **Staff Management (`/staff`):** Merchants can invite staff members via email. Staff accounts have specific roles (e.g., Cashier, Manager, Kitchen) which restrict their access in the app using Supabase RLS and frontend UI checks.
- **Accounting & Tax (`/accounting`, `/tax-reports`):** Automated tracking of revenue, expenses, and calculated taxes based on POS transactions.
- **Webhooks (`/webhooks`):** Allows developers or advanced merchants to subscribe to platform events (e.g., `order.created`, `payment.successful`) and receive POST requests to external systems.

## 4. Customer Engagement
Tools for merchants to interact with and retain their customer base.

- **Customer Directory (`/customers`):** A CRM keeping track of customer details, purchase history, and generated loyalty points.
- **Loyalty Program (`/loyalty`):** Merchants can configure rules (e.g., earn 1 point per GHS 10 spent) and allow customers to redeem points for discounts.
- **Public Storefront (`/store/:userId`):** A publicly accessible menu or catalog page for a merchant. Customers can browse products and potentially place self-serve orders.
- **Short URLs (`/campaigns`, `/s/:code`):** A built-in URL shortener used for SMS campaigns or easy sharing of storefront links.

## 5. Super Admin Platform (`control.getdowo.online`)
The overarching management portal for the platform owners.

- **Business Overview:** View all registered merchants on the platform, their active status, and high-level metrics.
- **Global Settings:** Configure platform-wide features, integration keys, and default behaviors.
- **Global Settlements:** Manage and oversee the movement of funds between the platform's master accounts and individual merchant wallets.
